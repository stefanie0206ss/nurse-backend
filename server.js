<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
    <title>护士预约 · 权限版</title>
    <style>
        * { box-sizing: border-box; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        body { margin: 0; background: #f0f4f8; min-height: 100vh; display: flex; justify-content: center; align-items: flex-start; padding: 16px; }
        .app-container { max-width: 500px; width: 100%; background: white; border-radius: 32px; box-shadow: 0 10px 30px rgba(0,20,50,0.1); overflow: hidden; padding: 24px 20px; margin: 20px 0; }
        h1 { font-size: 24px; margin: 0 0 8px 0; color: #0b3b5c; display: flex; align-items: center; gap: 8px; }
        h1 small { font-size: 14px; font-weight: normal; color: #2c7da0; margin-left: auto; }
        h2 { font-size: 18px; margin: 24px 0 12px 0; color: #1e4a6d; border-left: 5px solid #2c7da0; padding-left: 12px; }
        .badge { background: #e1ecf4; color: #0b3b5c; padding: 4px 12px; border-radius: 30px; font-size: 14px; font-weight: 500; }
        .info-card { background: #f9fcff; border: 1px solid #cfe1f0; border-radius: 20px; padding: 16px; margin-bottom: 24px; }
        .slots-grid { display: flex; gap: 16px; justify-content: space-around; margin-top: 8px; }
        .slot-item { flex: 1; background: white; border-radius: 20px; padding: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.02); border: 1px solid #d9e9f5; }
        .slot-label { font-weight: 600; color: #1e4a6d; margin-bottom: 6px; }
        .slot-count { font-size: 28px; font-weight: 700; color: #0b3b5c; line-height: 1.2; }
        .slot-limit { font-size: 14px; color: #5f8aa7; }
        .form-group { margin-bottom: 18px; }
        label { display: block; font-size: 14px; font-weight: 500; color: #1e4a6d; margin-bottom: 6px; }
        input, select { width: 100%; padding: 14px 16px; border: 1px solid #bcd4e6; border-radius: 30px; font-size: 16px; background: white; transition: 0.2s; }
        input:focus, select:focus { outline: none; border-color: #2c7da0; box-shadow: 0 0 0 3px rgba(44,125,160,0.1); }
        .row-2 { display: flex; gap: 12px; }
        .row-2 .form-group { flex: 1; }
        .date-selector { display: flex; gap: 8px; overflow-x: auto; padding: 4px 0 12px; scrollbar-width: thin; -webkit-overflow-scrolling: touch; }
        .date-chip { flex: 0 0 auto; background: #eef5fa; border: 1px solid transparent; border-radius: 40px; padding: 8px 18px; text-align: center; font-weight: 500; color: #1e4a6d; cursor: pointer; transition: 0.2s; }
        .date-chip.selected { background: #2c7da0; color: white; border-color: #1e4a6d; }
        .date-chip.disabled { opacity: 0.4; pointer-events: none; }
        .time-options { display: flex; gap: 12px; margin: 12px 0 8px; }
        .time-option { flex: 1; background: #eef5fa; border-radius: 30px; padding: 14px; text-align: center; font-weight: 600; color: #1e4a6d; border: 1px solid transparent; cursor: pointer; position: relative; }
        .time-option.selected { background: #2c7da0; color: white; border-color: #1e4a6d; }
        .time-option.full { opacity: 0.4; pointer-events: none; background: #e0e7ed; color: #6c7a8a; }
        .doctor-name { font-size: 12px; font-weight: normal; color: #2c7da0; margin-top: 4px; }
        .time-option.selected .doctor-name { color: #e0f0ff; }
        .btn { background: #2c7da0; color: white; border: none; border-radius: 40px; padding: 16px 24px; font-size: 18px; font-weight: 600; width: 100%; cursor: pointer; transition: 0.2s; margin-top: 16px; }
        .btn:active { background: #1e4a6d; transform: scale(0.98); }
        .btn-outline { background: white; color: #2c7da0; border: 2px solid #2c7da0; margin-top: 12px; font-size: 16px; padding: 12px; border-radius: 40px; cursor: pointer; font-weight: 600; }
        .btn-small { background: #2c7da0; color: white; border: none; border-radius: 30px; padding: 10px 16px; font-size: 14px; font-weight: 500; cursor: pointer; }
        .message { background: #d4edda; color: #155724; padding: 14px; border-radius: 30px; margin: 16px 0 0; text-align: center; font-weight: 500; }
        .appointments-list { list-style: none; padding: 0; margin: 16px 0; }
        .appointments-list li { background: #f9fcff; border: 1px solid #d9e9f5; border-radius: 20px; padding: 12px 16px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
        .appt-info { flex: 1; }
        .appt-name { font-weight: 600; color: #0b3b5c; }
        .appt-detail { font-size: 13px; color: #5f8aa7; }
        .cancel-btn { background: none; border: 1px solid #f1b6b6; color: #b33c3c; border-radius: 30px; padding: 6px 12px; font-size: 13px; cursor: pointer; }
        .tab-bar { display: flex; gap: 8px; margin: 24px 0 16px; }
        .tab { flex: 1; text-align: center; padding: 12px; background: #eef5fa; border-radius: 40px; font-weight: 600; color: #1e4a6d; cursor: pointer; }
        .tab.active { background: #2c7da0; color: white; }
        .hidden { display: none; }
        .footer-note { margin-top: 24px; font-size: 12px; color: #8ba0b5; text-align: center; border-top: 1px solid #d9e9f5; padding-top: 16px; }
        .export-btn { background: #f0f4f8; color: #1e4a6d; border: 1px solid #bcd4e6; border-radius: 40px; padding: 12px; font-size: 14px; font-weight: 500; cursor: pointer; width: 100%; margin: 16px 0 8px; }
        .limits-panel, .doctor-panel { background: #f9fcff; border-radius: 20px; padding: 16px; margin-bottom: 20px; }
        .limits-panel { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
        .limit-item { flex: 1; min-width: 100px; }
        .limit-item label { font-size: 13px; margin-bottom: 4px; }
        .limit-item input { padding: 10px 12px; font-size: 15px; }
        .doctor-panel .row-2 { margin-bottom: 12px; }
        .doctor-panel input { padding: 10px 12px; }
        .login-panel { background: #f9fcff; border-radius: 20px; padding: 24px; margin-bottom: 20px; text-align: center; }
        .login-panel h3 { margin-top: 0; color: #1e4a6d; }
        .login-panel input { margin-bottom: 16px; }
        .login-error { color: #b33c3c; font-size: 14px; margin: 8px 0; }
        .logout-btn { background: #f0f4f8; color: #1e4a6d; border: 1px solid #bcd4e6; border-radius: 40px; padding: 8px 16px; font-size: 14px; cursor: pointer; float: right; }
        .doctor-select { width: 100%; padding: 14px 16px; border: 1px solid #bcd4e6; border-radius: 30px; font-size: 16px; background: white; }
        .small-btn { background: #f0f4f8; border: 1px solid #bcd4e6; border-radius: 30px; padding: 8px 12px; font-size: 14px; cursor: pointer; margin-left: 8px; }
        .doctor-list-item, .user-list-item { display: flex; justify-content: space-between; align-items: center; background: #f9fcff; border-radius: 20px; padding: 10px 16px; margin-bottom: 8px; }
        .role-badge { background: #e1ecf4; color: #0b3b5c; padding: 2px 8px; border-radius: 30px; font-size: 12px; margin-left: 8px; }
        .loading { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(44,125,160,0.9); color: white; padding: 12px 24px; border-radius: 40px; font-size: 16px; z-index: 1000; display: none; }
    </style>
</head>
<body>
<div class="app-container" id="app">
    <h1>🏥 分时段预约 <small class="badge" id="todayDisplay"></small></h1>
    <div class="tab-bar">
        <div class="tab active" data-tab="patient">📅 病人预约</div>
        <div class="tab" data-tab="login">🔐 管理登录</div>
    </div>

    <!-- 病人预约界面 -->
    <div id="patientPanel">
        <div class="info-card">
            <div style="font-weight:600; margin-bottom:8px;">今日剩余名额</div>
            <div class="slots-grid">
                <div class="slot-item">
                    <div class="slot-label">🌅 上午</div>
                    <div class="slot-count" id="todayAmCount">0</div>
                    <div class="slot-limit" id="todayAmLimit">/10</div>
                </div>
                <div class="slot-item">
                    <div class="slot-label">🌇 下午</div>
                    <div class="slot-count" id="todayPmCount">0</div>
                    <div class="slot-limit" id="todayPmLimit">/10</div>
                </div>
            </div>
        </div>

        <h2>📋 填写信息</h2>
        <div class="form-group">
            <label>姓名</label>
            <input type="text" id="name" placeholder="例如：张三" maxlength="20">
        </div>
        <div class="form-group">
            <label>联系电话</label>
            <input type="tel" id="phone" placeholder="11位手机号" maxlength="11">
        </div>
        <div class="row-2">
            <div class="form-group">
                <label>年龄</label>
                <input type="number" id="age" placeholder="岁" min="0" max="120">
            </div>
            <div class="form-group">
                <label>性别</label>
                <select id="gender">
                    <option value="男">男</option>
                    <option value="女">女</option>
                </select>
            </div>
        </div>

        <h2>📅 选择预约时间</h2>
        <div style="margin-bottom: 8px; color:#1e4a6d;">日期</div>
        <div class="date-selector" id="dateList"></div>

        <div style="margin: 16px 0 8px; color:#1e4a6d;">时段</div>
        <div class="time-options">
            <div class="time-option" data-time="am" id="optAm">
                <div>上午 <span id="amCount">(0/?)</span></div>
                <div class="doctor-name" id="amDoctor"></div>
            </div>
            <div class="time-option" data-time="pm" id="optPm">
                <div>下午 <span id="pmCount">(0/?)</span></div>
                <div class="doctor-name" id="pmDoctor"></div>
            </div>
        </div>

        <button class="btn" id="submitBtn">✅ 确认预约</button>
        <div id="messageArea" class="message hidden"></div>
    </div>

    <!-- 管理登录界面 -->
    <div id="loginPanel" class="hidden">
        <div class="login-panel">
            <h3>🔐 护士登录</h3>
            <input type="text" id="loginUsername" placeholder="用户名" value="super">
            <input type="password" id="loginPassword" placeholder="密码" value="admin123">
            <button class="btn" id="loginBtn">登录</button>
            <div id="loginError" class="login-error hidden"></div>
        </div>
    </div>

    <!-- 管理后台界面（登录后显示） -->
    <div id="managePanel" class="hidden">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h2 style="margin:0;">⚙️ 管理后台 <span id="userRoleSpan" class="badge"></span></h2>
            <button class="logout-btn" id="logoutBtn">登出</button>
        </div>

        <!-- 系统设置卡片（仅超级管理员可见） -->
        <div id="settingsCard" class="hidden">
            <h2>⚙️ 系统设置</h2>
            <div class="limits-panel">
                <div style="display:flex; gap:12px; align-items:center;">
                    <label style="flex:1;">最大提前预约天数</label>
                    <input type="number" id="maxAdvanceDays" min="0" value="7" style="flex:2;">
                    <button class="btn-small" id="saveSettingsBtn">保存</button>
                </div>
            </div>
        </div>

        <!-- 用户管理卡片（仅超级管理员可见） -->
        <div id="userManagerCard" class="hidden">
            <h2>👥 用户管理</h2>
            <div class="limits-panel" style="flex-wrap: wrap;">
                <div style="display: flex; gap: 8px; width: 100%;">
                    <input type="text" id="newUsername" placeholder="用户名" style="flex:2;">
                    <input type="password" id="newPassword" placeholder="密码" style="flex:2;">
                    <select id="newRole" style="flex:1;">
                        <option value="admin">普通管理员</option>
                        <option value="super">超级管理员</option>
                    </select>
                    <button class="btn-small" id="addUserBtn">添加</button>
                </div>
                <div id="userList" style="width:100%; margin-top:12px;"></div>
            </div>
        </div>

        <!-- 医生管理卡片（仅超级管理员可见） -->
        <div id="doctorManagerCard" class="hidden">
            <h2>👥 医生管理</h2>
            <div class="limits-panel" style="flex-wrap: wrap;">
                <div style="display: flex; gap: 8px; width: 100%;">
                    <input type="text" id="newDoctorName" placeholder="新医生姓名" style="flex:2;">
                    <button class="btn-small" id="addDoctorBtn">添加</button>
                </div>
                <div id="doctorList" style="width:100%; margin-top:12px;"></div>
            </div>
        </div>

        <!-- 每日限额卡片（仅超级管理员可见） -->
        <div id="dailyLimitCard" class="hidden">
            <h2>📅 每日限额</h2>
            <div class="limits-panel">
                <div style="display:flex; gap:8px; align-items:center; margin-bottom:16px;">
                    <input type="date" id="limitDate" style="flex:2;" value="">
                    <button class="btn-outline" style="flex:1;" id="loadLimitBtn">加载</button>
                </div>
                <div class="row-2">
                    <div class="form-group">
                        <label>上午最大人数</label>
                        <input type="number" id="limitAm" min="0" value="10">
                    </div>
                    <div class="form-group">
                        <label>下午最大人数</label>
                        <input type="number" id="limitPm" min="0" value="10">
                    </div>
                </div>
                <button class="btn-small" id="saveDailyLimitBtn" style="width:100%;">保存当日限额</button>
            </div>
        </div>

        <!-- 医生排班卡片（仅超级管理员可见） -->
        <div id="doctorScheduleCard" class="hidden">
            <h2>👩‍⚕️ 医生排班</h2>
            <div class="doctor-panel">
                <div style="display:flex; gap:8px; align-items:center; margin-bottom:16px;">
                    <input type="date" id="scheduleDate" style="flex:2;" value="">
                    <button class="btn-outline" style="flex:1;" id="loadScheduleBtn">加载</button>
                </div>
                <div class="row-2">
                    <select id="amDoctorSelect" class="doctor-select">
                        <option value="">-- 上午医生 --</option>
                    </select>
                    <select id="pmDoctorSelect" class="doctor-select">
                        <option value="">-- 下午医生 --</option>
                    </select>
                </div>
                <button class="btn-small" id="saveScheduleBtn" style="width:100%;">保存排班</button>
            </div>
        </div>

        <!-- 预约名单管理（所有管理员可见，但普通管理员不可取消） -->
        <h2>📋 预约名单</h2>
        <div style="display:flex; gap:8px; align-items:center; margin-bottom:16px;">
            <input type="date" id="listDate" style="flex:2;" value="">
            <button class="btn-outline" style="flex:1;" id="filterBtn">筛选</button>
        </div>
        <div>
            <div style="display:flex; gap:8px; margin-bottom:12px;">
                <span class="badge" id="listAmCount">上午 0/?</span>
                <span class="badge" id="listPmCount">下午 0/?</span>
            </div>
        </div>
        <ul class="appointments-list" id="appointmentList"></ul>
        <button class="export-btn" id="exportBtn">📎 导出当日名单 (CSV)</button>
        <p style="font-size:13px; color:#888; margin-top:8px;">普通管理员只能查看，不可取消预约。</p>
    </div>

    <div class="footer-note">数据保存在自建后端 · 管理登录 super/admin123</div>
    <div class="loading" id="loading">⏳ 加载中...</div>
</div>

<script>
    // ==================== 配置 ====================
    const API_BASE = 'https://nurse-backend-production.up.railway.app/api';  // 请替换为你的实际后端域名

    // ==================== 工具函数 ====================
    function generateId() { return Date.now() + '-' + Math.random().toString(36).substr(2, 9); }
    function getTodayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
    function formatDate(date) { const y = date.getFullYear(), m = String(date.getMonth()+1).padStart(2,'0'), d = String(date.getDate()).padStart(2,'0'); return `${y}-${m}-${d}`; }

    const loading = document.getElementById('loading');
    function showLoading() { loading.style.display = 'block'; }
    function hideLoading() { loading.style.display = 'none'; }

    // ==================== API 封装 ====================
    async function apiGet(path) {
        showLoading();
        try {
            const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        } finally {
            hideLoading();
        }
    }
    async function apiPost(path, body) {
        showLoading();
        try {
            const res = await fetch(`${API_BASE}${path}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        } finally {
            hideLoading();
        }
    }
    async function apiPut(path, body) {
        showLoading();
        try {
            const res = await fetch(`${API_BASE}${path}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        } finally {
            hideLoading();
        }
    }
    async function apiDelete(path) {
        showLoading();
        try {
            const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', credentials: 'include' });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        } finally {
            hideLoading();
        }
    }

    // ==================== 全局状态 ====================
    let currentUser = null;
    let currentRole = null;

    // ==================== 标签切换 ====================
    const tabs = document.querySelectorAll('.tab');
    const patientPanel = document.getElementById('patientPanel');
    const loginPanel = document.getElementById('loginPanel');
    const managePanel = document.getElementById('managePanel');

    function switchTab(tabId) {
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        patientPanel.classList.add('hidden');
        loginPanel.classList.add('hidden');
        managePanel.classList.add('hidden');
        if (tabId === 'patient') {
            patientPanel.classList.remove('hidden');
            initPatientUI();
        } else if (tabId === 'login') {
            if (currentUser) {
                // 如果已登录，直接显示管理后台
                showManagePanel();
            } else {
                loginPanel.classList.remove('hidden');
            }
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
        });
    });

    // ==================== 登录 / 登出 ====================
    document.getElementById('loginBtn').addEventListener('click', async () => {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        try {
            const user = await apiPost('/login', { username, password });
            currentUser = user;
            currentRole = user.role;
            await showManagePanel();
        } catch (e) {
            document.getElementById('loginError').innerText = e.message || '登录失败';
            document.getElementById('loginError').classList.remove('hidden');
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await apiPost('/logout', {});
        currentUser = null;
        currentRole = null;
        switchTab('login');
    });

    async function showManagePanel() {
        document.getElementById('userRoleSpan').innerText = currentRole === 'super' ? '超级管理员' : '普通管理员';
        const isSuper = currentRole === 'super';
        document.getElementById('settingsCard').style.display = isSuper ? 'block' : 'none';
        document.getElementById('userManagerCard').style.display = isSuper ? 'block' : 'none';
        document.getElementById('doctorManagerCard').style.display = isSuper ? 'block' : 'none';
        document.getElementById('dailyLimitCard').style.display = isSuper ? 'block' : 'none';
        document.getElementById('doctorScheduleCard').style.display = isSuper ? 'block' : 'none';

        const today = getTodayStr();
        document.getElementById('listDate').value = today;
        document.getElementById('limitDate').value = today;
        document.getElementById('scheduleDate').value = today;

        if (isSuper) {
            await loadUsers();
            await loadDoctors();
            await loadSettings();
            await loadLimitForDate(today);
            await loadScheduleForDate(today);
            await loadDoctorSelects();
        }
        await refreshAppointmentList(today);

        loginPanel.classList.add('hidden');
        managePanel.classList.remove('hidden');
    }

    // ==================== 系统设置 ====================
    async function loadSettings() {
        const settings = await apiGet('/settings');
        document.getElementById('maxAdvanceDays').value = settings.maxAdvanceDays;
    }
    document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
        const days = parseInt(document.getElementById('maxAdvanceDays').value);
        if (isNaN(days) || days < 0) { alert('请输入有效天数'); return; }
        await apiPut('/settings', { maxAdvanceDays: days });
        alert('设置已保存');
        // 如果病人端正在显示，刷新日期范围
        if (!patientPanel.classList.contains('hidden')) initPatientUI();
    });

    // ==================== 用户管理 ====================
    async function loadUsers() {
        const users = await apiGet('/users');
        const container = document.getElementById('userList');
        let html = '';
        users.forEach(u => {
            if (u.id === currentUser.id) return; // 不显示自己
            html += `<div class="user-list-item">
                <span>${u.username} <span class="role-badge">${u.role === 'super' ? '超级' : '普通'}</span></span>
                <button class="small-btn" onclick="deleteUser(${u.id})">删除</button>
            </div>`;
        });
        container.innerHTML = html;
    }
    window.deleteUser = async (id) => {
        if (confirm('确定删除该用户吗？')) {
            await apiDelete(`/users/${id}`);
            await loadUsers();
        }
    };
    document.getElementById('addUserBtn').addEventListener('click', async () => {
        const username = document.getElementById('newUsername').value;
        const password = document.getElementById('newPassword').value;
        const role = document.getElementById('newRole').value;
        if (!username || !password) { alert('用户名和密码不能为空'); return; }
        await apiPost('/users', { username, password, role });
        document.getElementById('newUsername').value = '';
        document.getElementById('newPassword').value = '';
        await loadUsers();
    });

    // ==================== 医生管理 ====================
    async function loadDoctors() {
        const doctors = await apiGet('/doctors/list');
        const container = document.getElementById('doctorList');
        let html = '';
        doctors.forEach(d => {
            html += `<div class="doctor-list-item">
                <span>${d.name}</span>
                <button class="small-btn" onclick="deleteDoctor(${d.id})">删除</button>
            </div>`;
        });
        container.innerHTML = html;
    }
    window.deleteDoctor = async (id) => {
        if (confirm('确定删除该医生吗？')) {
            try {
                await apiDelete(`/doctors/${id}`);
                await loadDoctors();
                await loadDoctorSelects();
            } catch (e) {
                alert(e.message);
            }
        }
    };
    document.getElementById('addDoctorBtn').addEventListener('click', async () => {
        const name = document.getElementById('newDoctorName').value.trim();
        if (!name) { alert('请输入医生姓名'); return; }
        await apiPost('/doctors', { name });
        document.getElementById('newDoctorName').value = '';
        await loadDoctors();
        await loadDoctorSelects();
    });

    async function loadDoctorSelects() {
        const doctors = await apiGet('/doctors/list');
        const amSelect = document.getElementById('amDoctorSelect');
        const pmSelect = document.getElementById('pmDoctorSelect');
        const options = '<option value="">-- 无 --</option>' + doctors.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        amSelect.innerHTML = options;
        pmSelect.innerHTML = options;
    }

    // ==================== 每日限额 ====================
    async function loadLimitForDate(date) {
        const limits = await apiGet(`/daily-limits?date=${date}`);
        document.getElementById('limitAm').value = limits.am;
        document.getElementById('limitPm').value = limits.pm;
    }
    document.getElementById('loadLimitBtn').addEventListener('click', () => {
        const date = document.getElementById('limitDate').value;
        if (date) loadLimitForDate(date);
    });
    document.getElementById('saveDailyLimitBtn').addEventListener('click', async () => {
        const date = document.getElementById('limitDate').value;
        if (!date) { alert('请选择日期'); return; }
        const am = parseInt(document.getElementById('limitAm').value);
        const pm = parseInt(document.getElementById('limitPm').value);
        if (isNaN(am) || am < 0 || isNaN(pm) || pm < 0) { alert('请输入有效数字'); return; }
        await apiPut('/daily-limits', { date, am, pm });
        alert('保存成功');
        if (document.getElementById('listDate').value === date) await refreshAppointmentList(date);
    });

    // ==================== 医生排班 ====================
    async function loadScheduleForDate(date) {
        const schedule = await apiGet(`/doctors/schedule?date=${date}`);
        const doctors = await apiGet('/doctors/list');
        const amId = doctors.find(d => d.name === schedule.amDoctor)?.id || '';
        const pmId = doctors.find(d => d.name === schedule.pmDoctor)?.id || '';
        document.getElementById('amDoctorSelect').value = amId;
        document.getElementById('pmDoctorSelect').value = pmId;
    }
    document.getElementById('loadScheduleBtn').addEventListener('click', () => {
        const date = document.getElementById('scheduleDate').value;
        if (date) loadScheduleForDate(date);
    });
    document.getElementById('saveScheduleBtn').addEventListener('click', async () => {
        const date = document.getElementById('scheduleDate').value;
        if (!date) { alert('请选择日期'); return; }
        const amDoctor = document.getElementById('amDoctorSelect').value || null;
        const pmDoctor = document.getElementById('pmDoctorSelect').value || null;
        await apiPut('/doctors/schedule', { date, amDoctor, pmDoctor });
        alert('保存成功');
    });

    // ==================== 预约名单 ====================
    async function refreshAppointmentList(date) {
        const [appointments, limits] = await Promise.all([
            apiGet(`/appointments?date=${date}`),
            apiGet(`/daily-limits?date=${date}`)
        ]);
        const amCount = appointments.filter(a => a.time === 'am').length;
        const pmCount = appointments.filter(a => a.time === 'pm').length;
        document.getElementById('listAmCount').innerText = `上午 ${amCount}/${limits.am}`;
        document.getElementById('listPmCount').innerText = `下午 ${pmCount}/${limits.pm}`;

        const listEl = document.getElementById('appointmentList');
        if (appointments.length === 0) {
            listEl.innerHTML = '<li style="justify-content:center; color:#8ba0b5;">暂无预约</li>';
        } else {
            let html = '';
            for (let a of appointments) {
                const doctorData = await apiGet(`/doctors?date=${date}`);
                const doctor = a.time === 'am' ? doctorData.amDoctor : doctorData.pmDoctor;
                const doctorText = doctor ? ` (${doctor})` : '';
                const timeLabel = a.time === 'am' ? '上午' : '下午';
                html += `<li>
                    <div class="appt-info">
                        <span class="appt-name">${a.name}</span> · ${a.gender} · ${a.age}岁<br>
                        <span class="appt-detail">📞 ${a.phone} · ${timeLabel}${doctorText}</span>
                    </div>`;
                if (currentRole === 'super') {
                    html += `<button class="cancel-btn" data-id="${a.id}">取消</button>`;
                }
                html += `</li>`;
            }
            listEl.innerHTML = html;
            if (currentRole === 'super') {
                document.querySelectorAll('.cancel-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.target.dataset.id;
                        await apiDelete(`/appointments/${id}`);
                        await refreshAppointmentList(date);
                    });
                });
            }
        }
    }
    document.getElementById('filterBtn').addEventListener('click', () => {
        refreshAppointmentList(document.getElementById('listDate').value);
    });
    document.getElementById('exportBtn').addEventListener('click', async () => {
        const date = document.getElementById('listDate').value;
        const appointments = await apiGet(`/appointments?date=${date}`);
        if (appointments.length === 0) { alert('无数据'); return; }
        let csv = "姓名,电话,年龄,性别,时段\n";
        appointments.forEach(a => {
            csv += `${a.name},${a.phone},${a.age},${a.gender},${a.time === 'am' ? '上午' : '下午'}\n`;
        });
        const blob = new Blob(["\uFEFF" + csv], {type: 'text/csv;charset=utf-8;'});
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `预约名单_${date}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    });

    // ==================== 病人端界面 ====================
    let selectedDate = null;
    let selectedTime = null;

    async function initPatientUI() {
        const settings = await apiGet('/settings');
        const maxDays = settings.maxAdvanceDays;

        // 生成日期列表
        const dates = [];
        const today = new Date();
        for (let i = 0; i < maxDays; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const dateStr = formatDate(d);
            const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
            const weekday = weekdays[d.getDay()];
            const display = dateStr.slice(5) + ' ' + weekday;
            dates.push({ date: dateStr, display, full: false });
        }
        selectedDate = dates[0]?.date;
        selectedTime = null;
        renderDateSelector(dates);
        if (selectedDate) await updateTimeOptionsForDate(selectedDate);
        await updateTodayCounts();
    }

    function renderDateSelector(dates) {
        const container = document.getElementById('dateList');
        let html = '';
        dates.forEach(d => {
            const selectedClass = (d.date === selectedDate) ? 'selected' : '';
            const disabledClass = d.full ? 'disabled' : '';
            html += `<div class="date-chip ${selectedClass} ${disabledClass}" data-date="${d.date}">${d.display}</div>`;
        });
        container.innerHTML = html;
        document.querySelectorAll('.date-chip').forEach(chip => {
            chip.addEventListener('click', async (e) => {
                if (chip.classList.contains('disabled')) return;
                const newDate = chip.dataset.date;
                document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('selected'));
                chip.classList.add('selected');
                selectedDate = newDate;
                await updateTimeOptionsForDate(newDate);
            });
        });
    }

    async function updateTimeOptionsForDate(date) {
        const limits = await apiGet(`/daily-limits?date=${date}`);
        const [amCount, pmCount] = await Promise.all([
            apiGet(`/appointments/count?date=${date}&time=am`),
            apiGet(`/appointments/count?date=${date}&time=pm`)
        ]);
        const doctorData = await apiGet(`/doctors?date=${date}`);

        document.getElementById('amCount').innerText = `(${amCount.count}/${limits.am})`;
        document.getElementById('pmCount').innerText = `(${pmCount.count}/${limits.pm})`;
        document.getElementById('amDoctor').innerText = doctorData.amDoctor ? `👩‍⚕️ ${doctorData.amDoctor}` : '';
        document.getElementById('pmDoctor').innerText = doctorData.pmDoctor ? `👨‍⚕️ ${doctorData.pmDoctor}` : '';

        const optAm = document.getElementById('optAm');
        const optPm = document.getElementById('optPm');

        if (amCount.count >= limits.am) {
            optAm.classList.add('full');
            if (selectedTime === 'am') selectedTime = null;
        } else {
            optAm.classList.remove('full');
        }
        if (pmCount.count >= limits.pm) {
            optPm.classList.add('full');
            if (selectedTime === 'pm') selectedTime = null;
        } else {
            optPm.classList.remove('full');
        }

        document.querySelectorAll('.time-option').forEach(opt => opt.classList.remove('selected'));
        if (selectedTime && !document.getElementById(`opt${selectedTime==='am'?'Am':'Pm'}`).classList.contains('full')) {
            document.getElementById(`opt${selectedTime==='am'?'Am':'Pm'}`).classList.add('selected');
        }
    }

    async function updateTodayCounts() {
        const today = getTodayStr();
        const limits = await apiGet(`/daily-limits?date=${today}`);
        const [amCount, pmCount] = await Promise.all([
            apiGet(`/appointments/count?date=${today}&time=am`),
            apiGet(`/appointments/count?date=${today}&time=pm`)
        ]);
        document.getElementById('todayAmCount').innerText = limits.am - amCount.count;
        document.getElementById('todayPmCount').innerText = limits.pm - pmCount.count;
        document.getElementById('todayAmLimit').innerText = '/' + limits.am;
        document.getElementById('todayPmLimit').innerText = '/' + limits.pm;
    }

    document.getElementById('optAm').onclick = () => {
        if (!document.getElementById('optAm').classList.contains('full')) {
            selectedTime = 'am';
            document.querySelectorAll('.time-option').forEach(o => o.classList.remove('selected'));
            document.getElementById('optAm').classList.add('selected');
        }
    };
    document.getElementById('optPm').onclick = () => {
        if (!document.getElementById('optPm').classList.contains('full')) {
            selectedTime = 'pm';
            document.querySelectorAll('.time-option').forEach(o => o.classList.remove('selected'));
            document.getElementById('optPm').classList.add('selected');
        }
    };

    document.getElementById('submitBtn').addEventListener('click', async () => {
        const name = document.getElementById('name').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const age = document.getElementById('age').value.trim();
        const gender = document.getElementById('gender').value;
        const date = selectedDate;
        const time = selectedTime;
        const limits = await apiGet(`/daily-limits?date=${date}`);

        if (!name) { alert('请输入姓名'); return; }
        if (!phone || !/^\d{11}$/.test(phone)) { alert('请输入11位手机号'); return; }
        if (!age || age<0 || age>120) { alert('请输入有效年龄'); return; }
        if (!date) { alert('请选择日期'); return; }
        if (!time) { alert('请选择上午或下午'); return; }

        const count = time === 'am' ? (await apiGet(`/appointments/count?date=${date}&time=am`)).count : (await apiGet(`/appointments/count?date=${date}&time=pm`)).count;
        const max = time === 'am' ? limits.am : limits.pm;
        if (count >= max) {
            alert('该时段已满');
            return;
        }

        await apiPost('/appointments', {
            id: generateId(),
            date, time, name, phone, age, gender
        });

        document.getElementById('name').value = '';
        document.getElementById('phone').value = '';
        document.getElementById('age').value = '';
        document.getElementById('gender').value = '男';
        selectedTime = null;
        document.querySelectorAll('.time-option').forEach(o => o.classList.remove('selected'));

        await initPatientUI();
        alert('预约成功');
    });

    // ==================== 初始化 ====================
    window.onload = async () => {
        document.getElementById('todayDisplay').innerText = '今日 ' + getTodayStr().slice(5);
        await initPatientUI();
        // 尝试获取当前用户（如果已登录）
        try {
            const user = await apiGet('/current-user');
            currentUser = user;
            currentRole = user.role;
            await showManagePanel();
            switchTab('login');
        } catch (e) {
            // 未登录，显示登录界面
            switchTab('patient');
        }
    };
</script>
</body>
</html>