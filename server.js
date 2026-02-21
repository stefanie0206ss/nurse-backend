const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());

// 数据存储路径（Railway Volume 挂载点）
const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || '/data';
const dbPath = path.join(dataDir, 'database.sqlite');
const sessionsDbPath = path.join(dataDir, 'sessions.sqlite');

// 如果目录不存在则创建（本地开发时使用当前目录）
const finalDbPath = fs.existsSync(dataDir) ? dbPath : './database.sqlite';
const finalSessionsDbPath = fs.existsSync(dataDir) ? sessionsDbPath : './sessions.sqlite';

// 配置 session 存储
app.use(session({
    store: new SQLiteStore({ 
        db: 'sessions.sqlite', 
        dir: path.dirname(finalSessionsDbPath) 
    }),
    secret: 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false // 生产环境如果使用 https 设为 true
    }
}));

// 连接主数据库
const db = new sqlite3.Database(finalDbPath, (err) => {
    if (err) {
        console.error('❌ 数据库连接失败:', err);
    } else {
        console.log('✅ 数据库连接成功，路径:', finalDbPath);
        initDb();
    }
});

// 初始化数据库表
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

        // 医生排班表
        db.run(`CREATE TABLE IF NOT EXISTS doctor_schedules (
            date TEXT PRIMARY KEY,
            amDoctor INTEGER,
            pmDoctor INTEGER,
            FOREIGN KEY (amDoctor) REFERENCES doctors(id),
            FOREIGN KEY (pmDoctor) REFERENCES doctors(id)
        )`);

        // 用户表
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'admin'
        )`);

        // 系统设置表
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )`);

        // 插入默认超级管理员（密码: admin123）
        const saltRounds = 10;
        const defaultPassword = bcrypt.hashSync('admin123', saltRounds);
        db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
            if (row.count === 0) {
                db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, 
                    ['super', defaultPassword, 'super']);
                console.log('✅ 创建默认超级管理员 super / admin123');
            }
        });

        // 插入默认设置（提前预约天数，默认7天）
        db.get(`SELECT COUNT(*) as count FROM settings WHERE key = 'max_advance_days'`, (err, row) => {
            if (row.count === 0) {
                db.run(`INSERT INTO settings (key, value) VALUES ('max_advance_days', '7')`);
                console.log('✅ 初始化默认设置：max_advance_days = 7');
            }
        });

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

// 创建 API 路由组
const apiRouter = express.Router();

// ==================== 用户认证 ====================
apiRouter.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: '用户不存在' });

        bcrypt.compare(password, user.password, (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!result) return res.status(401).json({ error: '密码错误' });

            req.session.userId = user.id;
            req.session.role = user.role;
            res.json({ id: user.id, username: user.username, role: user.role });
        });
    });
});

apiRouter.get('/current-user', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: '未登录' });
    db.get(`SELECT id, username, role FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: '用户不存在' });
        res.json(user);
    });
});

apiRouter.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// ==================== 系统设置 ====================
apiRouter.get('/settings', (req, res) => {
    db.get(`SELECT value FROM settings WHERE key = 'max_advance_days'`, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ maxAdvanceDays: parseInt(row?.value || '7') });
    });
});

apiRouter.put('/settings', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: '未登录' });
    db.get(`SELECT role FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (user.role !== 'super') return res.status(403).json({ error: '权限不足' });

        const { maxAdvanceDays } = req.body;
        if (maxAdvanceDays === undefined || maxAdvanceDays < 0) return res.status(400).json({ error: '无效天数' });
        db.run(`UPDATE settings SET value = ? WHERE key = 'max_advance_days'`, [maxAdvanceDays], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// ==================== 用户管理 ====================
apiRouter.get('/users', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: '未登录' });
    db.get(`SELECT role FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (user.role !== 'super') return res.status(403).json({ error: '权限不足' });
        db.all(`SELECT id, username, role FROM users`, (err, users) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(users);
        });
    });
});

apiRouter.post('/users', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: '未登录' });
    db.get(`SELECT role FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (user.role !== 'super') return res.status(403).json({ error: '权限不足' });

        const { username, password, role = 'admin' } = req.body;
        if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
        const hashed = bcrypt.hashSync(password, 10);
        db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, [username, hashed, role], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, username, role });
        });
    });
});

apiRouter.delete('/users/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: '未登录' });
    db.get(`SELECT role FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (user.role !== 'super') return res.status(403).json({ error: '权限不足' });

        const id = req.params.id;
        if (id == req.session.userId) return res.status(400).json({ error: '不能删除自己' });
        db.run(`DELETE FROM users WHERE id = ?`, [id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// ==================== 医生管理 ====================
apiRouter.get('/doctors/list', (req, res) => {
    db.all(`SELECT id, name FROM doctors ORDER BY id`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

apiRouter.post('/doctors', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: '未登录' });
    db.get(`SELECT role FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (user.role !== 'super') return res.status(403).json({ error: '权限不足' });

        const { name } = req.body;
        if (!name) return res.status(400).json({ error: '医生姓名不能为空' });
        db.run(`INSERT INTO doctors (name) VALUES (?)`, [name], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, name });
        });
    });
});

apiRouter.delete('/doctors/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: '未登录' });
    db.get(`SELECT role FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (user.role !== 'super') return res.status(403).json({ error: '权限不足' });

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
});

// ==================== 每日限额 ====================
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
    if (!req.session.userId) return res.status(401).json({ error: '未登录' });
    db.get(`SELECT role FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (user.role !== 'super') return res.status(403).json({ error: '权限不足' });

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
});

// ==================== 医生排班 ====================
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
    if (!req.session.userId) return res.status(401).json({ error: '未登录' });
    db.get(`SELECT role FROM users WHERE id = ?`, [req.session.userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (user.role !== 'super') return res.status(403).json({ error: '权限不足' });

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
});

// 兼容旧接口（返回医生姓名）
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

// ==================== 预约相关 ====================
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
    if (!req.session.userId) return res.status(401).json({ error: '未登录' });
    const { id } = req.params;
    db.run(`DELETE FROM appointments WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

// 挂载 API 路由
app.use('/api', apiRouter);

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 后端服务运行在端口 ${PORT}`);
});