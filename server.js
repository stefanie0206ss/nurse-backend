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
const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || '/data'; // Railway Volume 挂载点
const dbPath = path.join(dataDir, 'database.sqlite');

// 本地开发时使用当前目录
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
        // 预约表
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

        // 医生表
        db.run(`CREATE TABLE IF NOT EXISTS doctors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )`);

        // 每日限额表
        db.run(`CREATE TABLE IF NOT EXISTS daily_limits (
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            max INTEGER NOT NULL,
            PRIMARY KEY (date, time)
        )`);

        // 医生排班表（存储医生ID）
        db.run(`CREATE TABLE IF NOT EXISTS doctor_schedules (
            date TEXT PRIMARY KEY,
            amDoctor INTEGER,
            pmDoctor INTEGER,
            FOREIGN KEY (amDoctor) REFERENCES doctors(id),
            FOREIGN KEY (pmDoctor) REFERENCES doctors(id)
        )`);

        // 插入默认医生（示例）
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

// 健康检查
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ==================== 医生管理 API ====================
app.get('/doctors/list', (req, res) => {
    db.all(`SELECT id, name FROM doctors ORDER BY id`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/doctors', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '医生姓名不能为空' });
    db.run(`INSERT INTO doctors (name) VALUES (?)`, [name], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name });
    });
});

app.delete('/doctors/:id', (req, res) => {
    const id = req.params.id;
    // 先检查是否有排班引用该医生
    db.get(`SELECT COUNT(*) as count FROM doctor_schedules WHERE amDoctor = ? OR pmDoctor = ?`, [id, id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row.count > 0) return res.status(400).json({ error: '该医生已被排班，不能删除' });
        db.run(`DELETE FROM doctors WHERE id = ?`, [id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// ==================== 每日限额 API ====================
app.get('/daily-limits', (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: '日期不能为空' });
    db.all(`SELECT time, max FROM daily_limits WHERE date = ?`, [date], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const result = { am: 10, pm: 10 }; // 默认值
        rows.forEach(row => {
            result[row.time] = row.max;
        });
        res.json(result);
    });
});

app.put('/daily-limits', (req, res) => {
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

// ==================== 医生排班 API ====================
// 获取某日期的医生排班（返回医生姓名）
app.get('/doctors/schedule', (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: '日期不能为空' });
    db.get(`
        SELECT 
            d1.name as amDoctor,
            d2.name as pmDoctor
        FROM doctor_schedules ds
        LEFT JOIN doctors d1 ON ds.amDoctor = d1.id
        LEFT JOIN doctors d2 ON ds.pmDoctor = d2.id
        WHERE ds.date = ?
    `, [date], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || { amDoctor: '', pmDoctor: '' });
    });
});

// 保存某日期的医生排班（接收医生ID）
app.put('/doctors/schedule', (req, res) => {
    const { date, amDoctor, pmDoctor } = req.body;
    if (!date) return res.status(400).json({ error: '日期不能为空' });
    db.run(`
        INSERT INTO doctor_schedules (date, amDoctor, pmDoctor)
        VALUES (?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET amDoctor = ?, pmDoctor = ?
    `, [date, amDoctor, pmDoctor, amDoctor, pmDoctor], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// 兼容旧版：保留原 /doctors 接口（按日期返回医生姓名），方便前端直接使用
app.get('/doctors', (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: '日期不能为空' });
    db.get(`
        SELECT 
            d1.name as amDoctor,
            d2.name as pmDoctor
        FROM doctor_schedules ds
        LEFT JOIN doctors d1 ON ds.amDoctor = d1.id
        LEFT JOIN doctors d2 ON ds.pmDoctor = d2.id
        WHERE ds.date = ?
    `, [date], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || { amDoctor: '', pmDoctor: '' });
    });
});

// ==================== 预约相关 API（保持原有逻辑，但限额需从 daily_limits 获取）====================
// 获取某日期某时段的预约数量
app.get('/appointments/count', (req, res) => {
    const { date, time } = req.query;
    if (!date || !time) return res.status(400).json({ error: '日期和时段不能为空' });
    db.get(`SELECT COUNT(*) as count FROM appointments WHERE date = ? AND time = ?`, [date, time], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ count: row.count });
    });
});

// 获取某日期的预约列表
app.get('/appointments', (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: '日期不能为空' });
    db.all(`SELECT * FROM appointments WHERE date = ? ORDER BY time`, [date], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 提交新预约（检查当日该时段限额）
app.post('/appointments', (req, res) => {
    const { id, date, time, name, phone, age, gender } = req.body;
    if (!id || !date || !time || !name || !phone) {
        return res.status(400).json({ error: '缺少必要字段' });
    }

    // 获取当日该时段限额
    db.get(`SELECT max FROM daily_limits WHERE date = ? AND time = ?`, [date, time], (err, limitRow) => {
        if (err) return res.status(500).json({ error: err.message });
        const max = limitRow ? limitRow.max : 10; // 如果没有设置，默认10

        // 检查当前预约数
        db.get(`SELECT COUNT(*) as count FROM appointments WHERE date = ? AND time = ?`, [date, time], (err, countRow) => {
            if (err) return res.status(500).json({ error: err.message });
            if (countRow.count >= max) {
                return res.status(400).json({ error: '该时段已满' });
            }

            // 插入预约
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

// 取消预约
app.delete('/appointments/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM appointments WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 后端服务运行在端口 ${PORT}`);
});