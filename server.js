const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 数据存储路径
const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || '/data';
const dbPath = path.join(dataDir, 'database.sqlite');
const finalDbPath = fs.existsSync(dataDir) ? dbPath : './database.sqlite';

const db = new sqlite3.Database(finalDbPath, (err) => {
    if (err) {
        console.error('❌ 数据库连接失败:', err);
    } else {
        console.log('✅ 数据库连接成功，路径:', finalDbPath);
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS appointments (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            age INTEGER,
            gender TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS doctors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS daily_limits (
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            max INTEGER NOT NULL,
            PRIMARY KEY (date, time)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS doctor_schedules (
            date TEXT PRIMARY KEY,
            amDoctor INTEGER,
            pmDoctor INTEGER,
            FOREIGN KEY (amDoctor) REFERENCES doctors(id),
            FOREIGN KEY (pmDoctor) REFERENCES doctors(id)
        )`);

        db.get(`SELECT COUNT(*) as count FROM doctors`, (err, row) => {
            if (row.count === 0) {
                const stmt = db.prepare(`INSERT INTO doctors (name) VALUES (?)`);
                stmt.run('张医生');
                stmt.run('李医生');
                stmt.run('王医生');
                stmt.finalize();
                console.log('✅ 插入默认医生');
            }
        });

        console.log('✅ 数据表初始化完成');
    });
}

// 健康检查（不带 /api 前缀，方便唤醒）
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 创建 API 路由组，所有接口加上 /api 前缀
const apiRouter = express.Router();

// 医生管理
apiRouter.get('/doctors/list', (req, res) => {
    db.all(`SELECT id, name FROM doctors ORDER BY id`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

apiRouter.post('/doctors', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '医生姓名不能为空' });
    db.run(`INSERT INTO doctors (name) VALUES (?)`, [name], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name });
    });
});

apiRouter.delete('/doctors/:id', (req, res) => {
    const id = req.params.id;
    db.get(`SELECT COUNT(*) as count FROM doctor_schedules WHERE amDoctor = ? OR pmDoctor = ?`, [id, id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row.count > 0) return res.status(400).json({ error: '该医生已被排班，不能删除' });
        db.run(`DELETE FROM doctors WHERE id = ?`, [id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// 每日限额
apiRouter.get('/daily-limits', (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: '日期不能为空' });
    db.all(`SELECT time, max FROM daily_limits WHERE date = ?`, [date], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const result = { am: 10, pm: 10 };
        rows.forEach(row => { result[row.time] = row.max; });
        res.json(result);
    });
});

apiRouter.put('/daily-limits', (req, res) => {
    const { date, am, pm } = req.body;
    if (!date) return res.status(400).json({ error: '日期不能为空' });
    const stmt = db.prepare(`INSERT OR REPLACE INTO daily_limits (date, time, max) VALUES (?, ?, ?)`);
    stmt.run(date, 'am', am, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        stmt.run(date, 'pm', pm, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            stmt.finalize();
            res.json({ success: true });
        });
    });
});

// 医生排班
apiRouter.get('/doctors/schedule', (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: '日期不能为空' });
    db.get(`
        SELECT d1.name as amDoctor, d2.name as pmDoctor
        FROM doctor_schedules ds
        LEFT JOIN doctors d1 ON ds.amDoctor = d1.id
        LEFT JOIN doctors d2 ON ds.pmDoctor = d2.id
        WHERE ds.date = ?
    `, [date], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || { amDoctor: '', pmDoctor: '' });
    });
});

apiRouter.put('/doctors/schedule', (req, res) => {
    const { date, amDoctor, pmDoctor } = req.body;
    if (!date) return res.status(400).json({ error: '日期不能为空' });
    db.run(`
        INSERT INTO doctor_schedules (date, amDoctor, pmDoctor) VALUES (?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET amDoctor = ?, pmDoctor = ?
    `, [date, amDoctor, pmDoctor, amDoctor, pmDoctor], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// 兼容旧版接口（供前端 getDoctorForDateTime 使用）
apiRouter.get('/doctors', (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: '日期不能为空' });
    db.get(`
        SELECT d1.name as amDoctor, d2.name as pmDoctor
        FROM doctor_schedules ds
        LEFT JOIN doctors d1 ON ds.amDoctor = d1.id
        LEFT JOIN doctors d2 ON ds.pmDoctor = d2.id
        WHERE ds.date = ?
    `, [date], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || { amDoctor: '', pmDoctor: '' });
    });
});

// 预约相关
apiRouter.get('/appointments/count', (req, res) => {
    const { date, time } = req.query;
    if (!date || !time) return res.status(400).json({ error: '日期和时段不能为空' });
    db.get(`SELECT COUNT(*) as count FROM appointments WHERE date = ? AND time = ?`, [date, time], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ count: row.count });
    });
});

apiRouter.get('/appointments', (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: '日期不能为空' });
    db.all(`SELECT * FROM appointments WHERE date = ? ORDER BY time`, [date], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

apiRouter.post('/appointments', (req, res) => {
    const { id, date, time, name, phone, age, gender } = req.body;
    if (!id || !date || !time || !name || !phone) {
        return res.status(400).json({ error: '缺少必要字段' });
    }

    db.get(`SELECT max FROM daily_limits WHERE date = ? AND time = ?`, [date, time], (err, limitRow) => {
        if (err) return res.status(500).json({ error: err.message });
        const max = limitRow ? limitRow.max : 10;

        db.get(`SELECT COUNT(*) as count FROM appointments WHERE date = ? AND time = ?`, [date, time], (err, countRow) => {
            if (err) return res.status(500).json({ error: err.message });
            if (countRow.count >= max) {
                return res.status(400).json({ error: '该时段已满' });
            }

            db.run(
                `INSERT INTO appointments (id, date, time, name, phone, age, gender) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [id, date, time, name, phone, age, gender],
                function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, id });
                }
            );
        });
    });
});

apiRouter.delete('/appointments/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM appointments WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

// 将所有 /api 路由挂载到 app 上
app.use('/api', apiRouter);

app.listen(PORT, () => {
    console.log(`🚀 后端服务运行在端口 ${PORT}`);
});