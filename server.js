// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors()); // 允许前端跨域访问
app.use(express.json());

// 确保数据目录存在（Railway Volume 会挂载到这里）
const dataDir = '/data'; // Railway 默认的 Volume 挂载点
const dbPath = path.join(dataDir, 'database.sqlite');

// 本地开发时使用当前目录
const finalDbPath = fs.existsSync(dataDir) ? dbPath : './database.sqlite';

// 连接数据库
const db = new sqlite3.Database(finalDbPath, (err) => {
    if (err) {
        console.error('数据库连接失败:', err);
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

        // 限额表（只有一条记录）
        db.run(`CREATE TABLE IF NOT EXISTS limits (
            id TEXT PRIMARY KEY,
            am INTEGER DEFAULT 10,
            pm INTEGER DEFAULT 10
        )`);

        // 医生排班表
        db.run(`CREATE TABLE IF NOT EXISTS doctor_schedules (
            date TEXT PRIMARY KEY,
            amDoctor TEXT,
            pmDoctor TEXT
        )`);

        // 初始化默认限额（如果不存在）
        db.get(`SELECT * FROM limits WHERE id = 'global'`, (err, row) => {
            if (!row) {
                db.run(`INSERT INTO limits (id, am, pm) VALUES ('global', 10, 10)`);
                console.log('✅ 初始化默认限额');
            }
        });

        console.log('✅ 数据表初始化完成');
    });
}

// ==================== API 接口 ====================

// 健康检查（用于 Railway 零停机部署）
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// ---------- 预约相关 ----------
// 获取某日期的预约列表
app.get('/api/appointments', (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: '日期不能为空' });
    
    db.all(`SELECT * FROM appointments WHERE date = ? ORDER BY time`, [date], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 获取某日期某时段的预约数量
app.get('/api/appointments/count', (req, res) => {
    const { date, time } = req.query;
    if (!date || !time) return res.status(400).json({ error: '日期和时段不能为空' });
    
    db.get(`SELECT COUNT(*) as count FROM appointments WHERE date = ? AND time = ?`, [date, time], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ count: row.count });
    });
});

// 提交新预约
app.post('/api/appointments', (req, res) => {
    const { id, date, time, name, phone, age, gender } = req.body;
    
    if (!id || !date || !time || !name || !phone) {
        return res.status(400).json({ error: '缺少必要字段' });
    }
    
    // 先检查是否已满
    db.get(`SELECT am, pm FROM limits WHERE id = 'global'`, (err, limits) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.get(`SELECT COUNT(*) as count FROM appointments WHERE date = ? AND time = ?`, [date, time], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const max = time === 'am' ? limits.am : limits.pm;
            if (row.count >= max) {
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
app.delete('/api/appointments/:id', (req, res) => {
    const { id } = req.params;
    
    db.run(`DELETE FROM appointments WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

// ---------- 限额相关 ----------
app.get('/api/limits', (req, res) => {
    db.get(`SELECT am, pm FROM limits WHERE id = 'global'`, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || { am: 10, pm: 10 });
    });
});

app.put('/api/limits', (req, res) => {
    const { am, pm } = req.body;
    
    if (am === undefined || pm === undefined) {
        return res.status(400).json({ error: '请提供am和pm' });
    }
    
    db.run(`UPDATE limits SET am = ?, pm = ? WHERE id = 'global'`, [am, pm], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ---------- 医生排班相关 ----------
app.get('/api/doctors', (req, res) => {
    const { date } = req.query;
    
    if (date) {
        db.get(`SELECT * FROM doctor_schedules WHERE date = ?`, [date], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(row || { date, amDoctor: '', pmDoctor: '' });
        });
    } else {
        db.all(`SELECT * FROM doctor_schedules ORDER BY date`, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    }
});

app.put('/api/doctors', (req, res) => {
    const { date, amDoctor, pmDoctor } = req.body;
    
    if (!date) return res.status(400).json({ error: '日期不能为空' });
    
    db.run(
        `INSERT INTO doctor_schedules (date, amDoctor, pmDoctor) VALUES (?, ?, ?)
         ON CONFLICT(date) DO UPDATE SET amDoctor = ?, pmDoctor = ?`,
        [date, amDoctor, pmDoctor, amDoctor, pmDoctor],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 后端服务运行在端口 ${PORT}`);
});