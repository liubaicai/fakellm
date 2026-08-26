// ============================================================
// FakeAI — 管理后台与 API (/vx/mg.html & /vx/mgi)
// ============================================================

const express = require('express');
const router = express.Router();
const { getLogs, clearLogs, exportJsonl, MAX_LOGS } = require('../logger');

// --------------------------------------------------
// API: GET /vx/mgi — 获取内存请求日志列表 & 统计
// --------------------------------------------------
router.get('/mgi', (req, res) => {
  // 如果请求导出 JSONL 格式
  if (req.query.download === '1' || req.query.action === 'download') {
    const jsonlContent = exportJsonl();
    const filename = `fakeai-recent-requests-${new Date().toISOString().slice(0, 10)}.jsonl`;
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(jsonlContent);
  }

  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const search = req.query.search || '';
    const format = req.query.format || '';
    const model = req.query.model || '';

    const data = getLogs({ page, limit, search, format, model });
    res.json({
      success: true,
      ...data,
    });
  } catch (err) {
    console.error('获取日志列表失败:', err);
    res.status(500).json({ success: false, error: '读取日志失败: ' + err.message });
  }
});

// --------------------------------------------------
// API: DELETE /vx/mgi — 清空内存记录
// --------------------------------------------------
router.delete('/mgi', (_req, res) => {
  const success = clearLogs();
  if (success) {
    res.json({ success: true, message: '内存请求记录已清空' });
  } else {
    res.status(500).json({ success: false, error: '清空记录失败' });
  }
});

// --------------------------------------------------
// Page: GET /vx/mg.html — 管理页面
// --------------------------------------------------
router.get('/mg.html', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(ADMIN_HTML);
});

// --------------------------------------------------
// 嵌入式管理后台单页面 HTML
// --------------------------------------------------
const ADMIN_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FakeAI — 请求调用管理后台</title>
  <style>
    :root {
      --bg: #0d1117;
      --card-bg: rgba(22, 27, 34, 0.85);
      --border: rgba(240, 246, 252, 0.1);
      --text: #e6edf3;
      --text-muted: #8b949e;
      --accent: #58a6ff;
      --accent-glow: rgba(88, 166, 255, 0.15);
      --green: #3fb950;
      --red: #f85149;
      --purple: #bc8cff;
      --orange: #f0883e;
      --cyan: #39c5bb;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding-bottom: 40px;
    }

    /* 顶部导航 */
    header {
      background: rgba(13, 17, 23, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 50;
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-box h1 {
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge-fake {
      font-size: 0.7rem;
      background: linear-gradient(135deg, #e056fd, #686de0);
      color: #fff;
      padding: 2px 8px;
      border-radius: 999px;
      font-weight: 600;
    }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* 按钮通用 */
    .btn {
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.05);
      color: var(--text);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .btn-primary {
      background: #1f6feb;
      border-color: #388bfd;
      color: #fff;
    }
    .btn-primary:hover { background: #388bfd; }
    .btn-danger {
      color: #f85149;
    }
    .btn-danger:hover {
      background: rgba(248, 81, 73, 0.15);
      border-color: rgba(248, 81, 73, 0.4);
    }

    /* 主容器 */
    .container {
      max-width: 1400px;
      margin: 24px auto;
      padding: 0 24px;
    }

    /* 统计卡片 */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .stat-title {
      font-size: 0.8rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-value {
      font-size: 1.6rem;
      font-weight: 700;
      color: #fff;
    }
    .stat-meta {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* 过滤工具栏 */
    .toolbar {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 18px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      justify-content: space-between;
    }
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    input[type="text"], select {
      background: rgba(13, 17, 23, 0.8);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.85rem;
      outline: none;
    }
    input[type="text"]:focus, select:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--accent-glow);
    }
    input[type="text"] { width: 240px; }

    /* 表格样式 */
    .table-wrapper {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.85rem;
    }
    th, td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
    }
    th {
      background: rgba(255, 255, 255, 0.02);
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255, 255, 255, 0.03); cursor: pointer; }

    /* 标签徽章 */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      font-family: ui-monospace, SFMono-Regular, monospace;
    }
    .badge-method { background: #238636; color: #fff; }
    .badge-method-get { background: #1f6feb; color: #fff; }
    .badge-format-openai { background: rgba(16, 163, 127, 0.15); color: #10a37f; border: 1px solid rgba(16, 163, 127, 0.3); }
    .badge-format-anthropic { background: rgba(204, 120, 92, 0.15); color: #d97706; border: 1px solid rgba(204, 120, 92, 0.3); }
    .badge-format-gemini { background: rgba(66, 133, 244, 0.15); color: #60a5fa; border: 1px solid rgba(66, 133, 244, 0.3); }
    .badge-format-responses { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
    .badge-format-other { background: rgba(139, 148, 158, 0.15); color: #8b949e; border: 1px solid rgba(139, 148, 158, 0.3); }
    
    .badge-status-ok { color: var(--green); font-weight: 700; }
    .badge-status-err { color: var(--red); font-weight: 700; }
    .badge-stream {
      background: rgba(240, 136, 62, 0.15);
      color: var(--orange);
      border: 1px solid rgba(240, 136, 62, 0.3);
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 0.7rem;
    }

    /* 分页 */
    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      border-top: 1px solid var(--border);
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .page-controls {
      display: flex;
      gap: 8px;
    }

    /* 详情模态框 */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      z-index: 100;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .modal {
      background: #161b22;
      border: 1px solid var(--border);
      border-radius: 12px;
      width: 100%;
      max-width: 900px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    }
    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-title {
      font-size: 1.05rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .modal-body {
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .detail-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .section-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .code-box {
      background: #0d1117;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 0.8rem;
      color: #c9d1d9;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 280px;
      overflow-y: auto;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
      background: #0d1117;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      font-size: 0.85rem;
    }
    .info-item span:first-child { color: var(--text-muted); margin-right: 6px; }

    /* 空状态 */
    .empty-state {
      padding: 60px 20px;
      text-align: center;
      color: var(--text-muted);
    }
    .empty-icon { font-size: 2.5rem; margin-bottom: 12px; }

    /* 自动刷新指示灯 */
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 8px var(--green);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  </style>
</head>
<body>

  <!-- 顶部导航 -->
  <header>
    <div class="logo-box">
      <h1>🤡 FakeAI 请求管理后台</h1>
      <span class="badge-fake">内存最近 100 次记录</span>
    </div>
    <div class="nav-actions">
      <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text-muted); margin-right: 8px;">
        <span class="pulse-dot" id="liveDot"></span>
        <span id="liveStatus">自动刷新: 3s</span>
        <select id="refreshInterval" style="padding: 2px 6px; font-size: 0.75rem;">
          <option value="3000" selected>3秒</option>
          <option value="5000">5秒</option>
          <option value="10000">10秒</option>
          <option value="0">关闭</option>
        </select>
      </div>
      <button class="btn" id="btnRefresh" title="手动刷新">🔄 刷新</button>
      <button class="btn" id="btnDownload" title="导出为 JSONL 文件">📥 导出 JSONL</button>
      <button class="btn btn-danger" id="btnClear" title="清空记录">🗑️ 清空记录</button>
    </div>
  </header>

  <div class="container">

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-title">当前记录数</div>
        <div class="stat-value" id="statTotal">0</div>
        <div class="stat-meta">内存中最多保留 100 次</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">平均响应耗时</div>
        <div class="stat-value" id="statAvgDuration">0 <span style="font-size: 0.9rem; font-weight: normal; color: var(--text-muted);">ms</span></div>
        <div class="stat-meta">含思考及流式延迟</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">协议格式分布</div>
        <div class="stat-value" style="font-size: 1rem; font-weight: 500; display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px;" id="statFormats">
          -
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-title">Top 热门模型</div>
        <div class="stat-value" style="font-size: 0.95rem; font-weight: 500;" id="statTopModel">-</div>
        <div class="stat-meta" id="statModelCount">0 个不同模型</div>
      </div>
    </div>

    <!-- 过滤工具栏 -->
    <div class="toolbar">
      <div class="filters">
        <input type="text" id="searchInput" placeholder="🔍 搜索 URL / 模型 / 请求体..." />
        <select id="formatFilter">
          <option value="">全部格式</option>
          <option value="OpenAI Chat">OpenAI Chat</option>
          <option value="OpenAI Responses">OpenAI Responses</option>
          <option value="Anthropic">Anthropic</option>
          <option value="Gemini">Gemini</option>
          <option value="OpenAI Models">Models</option>
          <option value="Other">Other</option>
        </select>
        <select id="modelFilter">
          <option value="">全部模型</option>
        </select>
      </div>
      <div style="font-size: 0.85rem; color: var(--text-muted);">
        显示条数:
        <select id="limitSelect" style="padding: 4px 8px;">
          <option value="15">15 条/页</option>
          <option value="30" selected>30 条/页</option>
          <option value="50">50 条/页</option>
          <option value="100">100 条/页</option>
        </select>
      </div>
    </div>

    <!-- 表格区域 -->
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>时间</th>
            <th>方法</th>
            <th>协议格式</th>
            <th>模型</th>
            <th>请求路径</th>
            <th>流式</th>
            <th>状态</th>
            <th>耗时</th>
            <th style="text-align: right;">操作</th>
          </tr>
        </thead>
        <tbody id="logTableBody">
          <tr><td colspan="9" class="empty-state"><div class="empty-icon">⏳</div>正在加载日志...</td></tr>
        </tbody>
      </table>

      <!-- 分页控件 -->
      <div class="pagination">
        <div id="pageInfo">第 1 页 / 共 1 页 (0 条记录)</div>
        <div class="page-controls">
          <button class="btn" id="btnPrev">上一页</button>
          <button class="btn" id="btnNext">下一页</button>
        </div>
      </div>
    </div>

  </div>

  <!-- 详情模态框 -->
  <div class="modal-backdrop" id="modalBackdrop">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">
          <span>📋 请求详情</span>
          <span class="badge" id="modalId" style="background: rgba(255,255,255,0.1); color: var(--text);"></span>
        </div>
        <button class="btn" id="btnModalClose">✕</button>
      </div>
      <div class="modal-body">
        
        <div class="detail-section">
          <div class="section-title">元数据信息</div>
          <div class="info-grid" id="modalMetaGrid"></div>
        </div>

        <div class="detail-section">
          <div class="section-title">
            <span>请求体 (Request Body)</span>
            <button class="btn" id="btnCopyReq" style="padding: 2px 8px; font-size: 0.75rem;">📋 复制</button>
          </div>
          <pre class="code-box" id="modalReqBody"></pre>
        </div>

        <div class="detail-section">
          <div class="section-title">
            <span>响应数据 (Response Data)</span>
            <button class="btn" id="btnCopyResp" style="padding: 2px 8px; font-size: 0.75rem;">📋 复制</button>
          </div>
          <pre class="code-box" id="modalRespBody"></pre>
        </div>

        <div class="detail-section">
          <div class="section-title">请求头 (Headers)</div>
          <pre class="code-box" id="modalHeaders" style="max-height: 140px;"></pre>
        </div>

      </div>
    </div>
  </div>

  <script>
    let currentPage = 1;
    let autoRefreshTimer = null;
    let currentLogs = [];
    let activeModalLog = null;

    const API_URL = '/vx/mgi';

    // DOM 元素
    const logTableBody = document.getElementById('logTableBody');
    const pageInfo = document.getElementById('pageInfo');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const searchInput = document.getElementById('searchInput');
    const formatFilter = document.getElementById('formatFilter');
    const modelFilter = document.getElementById('modelFilter');
    const limitSelect = document.getElementById('limitSelect');
    const refreshInterval = document.getElementById('refreshInterval');
    const btnRefresh = document.getElementById('btnRefresh');
    const btnDownload = document.getElementById('btnDownload');
    const btnClear = document.getElementById('btnClear');
    const modalBackdrop = document.getElementById('modalBackdrop');
    const btnModalClose = document.getElementById('btnModalClose');

    // 格式徽章样式映射
    function getFormatBadge(fmt) {
      if (fmt === 'OpenAI Chat') return '<span class="badge badge-format-openai">OpenAI Chat</span>';
      if (fmt === 'OpenAI Responses') return '<span class="badge badge-format-responses">Responses</span>';
      if (fmt === 'Anthropic') return '<span class="badge badge-format-anthropic">Anthropic</span>';
      if (fmt === 'Gemini') return '<span class="badge badge-format-gemini">Gemini</span>';
      return '<span class="badge badge-format-other">' + (fmt || 'Other') + '</span>';
    }

    // 格式化时间
    function formatTime(isoStr) {
      if (!isoStr) return '-';
      const d = new Date(isoStr);
      return d.toLocaleTimeString('zh-CN', { hour12: false }) + ' ' + (d.getMonth() + 1) + '/' + d.getDate();
    }

    // 填充模型下拉选项
    function updateModelFilterOptions(modelCounts) {
      const currentSelected = modelFilter.value;
      const models = Object.keys(modelCounts || {}).filter(m => m && m !== '-');
      let html = '<option value="">全部模型</option>';
      models.forEach(m => {
        const selected = m === currentSelected ? 'selected' : '';
        html += '<option value="' + m + '" ' + selected + '>' + m + ' (' + modelCounts[m] + ')</option>';
      });
      modelFilter.innerHTML = html;
    }

    // 加载日志
    async function fetchLogs() {
      const limit = limitSelect.value;
      const search = searchInput.value.trim();
      const format = formatFilter.value;
      const model = modelFilter.value;

      const url = API_URL + '?page=' + currentPage + '&limit=' + limit +
                  '&search=' + encodeURIComponent(search) +
                  '&format=' + encodeURIComponent(format) +
                  '&model=' + encodeURIComponent(model);

      try {
        const res = await fetch(url);
        const data = await res.json();
        if (!data.success) {
          logTableBody.innerHTML = '<tr><td colspan="9" class="empty-state" style="color:var(--red);">加载失败: ' + data.error + '</td></tr>';
          return;
        }

        currentLogs = data.list || [];
        renderStats(data.stats);
        renderTable(currentLogs, data.total, data.page, data.limit);
      } catch (err) {
        console.error('拉取日志异常:', err);
      }
    }

    // 渲染统计
    function renderStats(stats) {
      if (!stats) return;
      document.getElementById('statTotal').textContent = stats.totalRequests || 0;
      document.getElementById('statAvgDuration').innerHTML = (stats.avgDuration || 0) + ' <span style="font-size: 0.9rem; font-weight: normal; color: var(--text-muted);">ms</span>';

      // 格式分布
      const fmtContainer = document.getElementById('statFormats');
      const fc = stats.formatCounts || {};
      const fKeys = Object.keys(fc);
      if (fKeys.length === 0) {
        fmtContainer.textContent = '-';
      } else {
        fmtContainer.innerHTML = fKeys.map(k => getFormatBadge(k) + ' ' + fc[k]).join(' ');
      }

      // Top 模型
      const mc = stats.modelCounts || {};
      const sortedModels = Object.entries(mc).filter(([k]) => k && k !== '-').sort((a,b) => b[1] - a[1]);
      if (sortedModels.length > 0) {
        document.getElementById('statTopModel').textContent = sortedModels[0][0] + ' (' + sortedModels[0][1] + '次)';
      } else {
        document.getElementById('statTopModel').textContent = '-';
      }
      document.getElementById('statModelCount').textContent = sortedModels.length + ' 个不同模型';

      updateModelFilterOptions(mc);
    }

    // 渲染表格
    function renderTable(list, total, page, limit) {
      if (!list || list.length === 0) {
        logTableBody.innerHTML = '<tr><td colspan="9" class="empty-state"><div class="empty-icon">📭</div>暂无请求记录</td></tr>';
        pageInfo.textContent = '第 1 页 / 共 1 页 (0 条记录)';
        btnPrev.disabled = true;
        btnNext.disabled = true;
        return;
      }

      const totalPages = Math.ceil(total / limit) || 1;
      pageInfo.textContent = '第 ' + page + ' 页 / 共 ' + totalPages + ' 页 (总计 ' + total + ' 条)';
      btnPrev.disabled = page <= 1;
      btnNext.disabled = page >= totalPages;

      let html = '';
      list.forEach((item, idx) => {
        const statusClass = (item.status >= 200 && item.status < 300) ? 'badge-status-ok' : 'badge-status-err';
        const methodClass = item.method === 'GET' ? 'badge-method-get' : 'badge-method';
        const streamBadge = item.stream ? '<span class="badge badge-stream">SSE</span>' : '<span style="color:var(--text-muted);">-</span>';

        html += '<tr onclick="showDetail(' + idx + ')">';
        html += '<td style="font-family:ui-monospace, monospace; font-size:0.8rem; color:var(--text-muted);">' + formatTime(item.timestamp) + '</td>';
        html += '<td><span class="badge ' + methodClass + '">' + item.method + '</span></td>';
        html += '<td>' + getFormatBadge(item.format) + '</td>';
        html += '<td style="font-weight:600;">' + (item.model || '-') + '</td>';
        html += '<td style="font-family:ui-monospace, monospace; font-size:0.8rem; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="' + item.url + '">' + item.url + '</td>';
        html += '<td>' + streamBadge + '</td>';
        html += '<td><span class="' + statusClass + '">' + item.status + '</span></td>';
        html += '<td style="color:var(--text-muted); font-size:0.8rem;">' + item.duration + 'ms</td>';
        html += '<td style="text-align:right;"><button class="btn" style="padding:2px 8px; font-size:0.75rem;" onclick="event.stopPropagation(); showDetail(' + idx + ')">查看</button></td>';
        html += '</tr>';
      });

      logTableBody.innerHTML = html;
    }

    // 详情弹窗
    window.showDetail = function(idx) {
      const item = currentLogs[idx];
      if (!item) return;
      activeModalLog = item;

      document.getElementById('modalId').textContent = item.id || '-';

      const metaGrid = document.getElementById('modalMetaGrid');
      metaGrid.innerHTML = [
        '<div class="info-item"><span>时间:</span>' + item.timestamp + '</div>',
        '<div class="info-item"><span>客户端 IP:</span>' + (item.ip || '127.0.0.1') + '</div>',
        '<div class="info-item"><span>请求路径:</span>' + item.method + ' ' + item.url + '</div>',
        '<div class="info-item"><span>协议格式:</span>' + item.format + '</div>',
        '<div class="info-item"><span>模型:</span>' + (item.model || '-') + '</div>',
        '<div class="info-item"><span>耗时:</span>' + item.duration + ' ms</div>',
        '<div class="info-item"><span>状态码:</span>' + item.status + '</div>',
        '<div class="info-item"><span>是否流式:</span>' + (item.stream ? '是 (SSE)' : '否') + '</div>',
      ].join('');

      document.getElementById('modalReqBody').textContent = item.requestBody ? JSON.stringify(item.requestBody, null, 2) : '(无请求体)';
      document.getElementById('modalRespBody').textContent = item.response ? (typeof item.response === 'object' ? JSON.stringify(item.response, null, 2) : item.response) : '(无响应记录)';
      document.getElementById('modalHeaders').textContent = JSON.stringify(item.headers || {}, null, 2);

      modalBackdrop.style.display = 'flex';
    };

    // 关闭弹窗
    btnModalClose.onclick = () => { modalBackdrop.style.display = 'none'; };
    modalBackdrop.onclick = (e) => { if (e.target === modalBackdrop) modalBackdrop.style.display = 'none'; };

    // 复制按钮
    document.getElementById('btnCopyReq').onclick = () => {
      if (activeModalLog && activeModalLog.requestBody) {
        navigator.clipboard.writeText(JSON.stringify(activeModalLog.requestBody, null, 2));
        alert('请求体已复制到剪贴板！');
      }
    };
    document.getElementById('btnCopyResp').onclick = () => {
      if (activeModalLog && activeModalLog.response) {
        const text = typeof activeModalLog.response === 'object' ? JSON.stringify(activeModalLog.response, null, 2) : activeModalLog.response;
        navigator.clipboard.writeText(text);
        alert('响应数据已复制到剪贴板！');
      }
    };

    // 按钮事件
    btnPrev.onclick = () => { if (currentPage > 1) { currentPage--; fetchLogs(); } };
    btnNext.onclick = () => { currentPage++; fetchLogs(); };
    btnRefresh.onclick = () => { fetchLogs(); };

    searchInput.oninput = () => { currentPage = 1; fetchLogs(); };
    formatFilter.onchange = () => { currentPage = 1; fetchLogs(); };
    modelFilter.onchange = () => { currentPage = 1; fetchLogs(); };
    limitSelect.onchange = () => { currentPage = 1; fetchLogs(); };

    // 导出文件
    btnDownload.onclick = () => {
      window.location.href = API_URL + '?download=1';
    };

    // 清空记录
    btnClear.onclick = async () => {
      if (!confirm('确定要清空全部请求日志吗？此操作不可恢复。')) return;
      try {
        const res = await fetch(API_URL, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          alert('日志已清空！');
          currentPage = 1;
          fetchLogs();
        } else {
          alert('清空失败: ' + data.error);
        }
      } catch (err) {
        alert('操作失败: ' + err.message);
      }
    };

    // 自动刷新机制
    function setupAutoRefresh() {
      if (autoRefreshTimer) clearInterval(autoRefreshTimer);
      const interval = parseInt(refreshInterval.value, 10);
      const liveDot = document.getElementById('liveDot');
      const liveStatus = document.getElementById('liveStatus');

      if (interval > 0) {
        liveDot.style.display = 'inline-block';
        liveStatus.textContent = '自动刷新: ' + (interval / 1000) + 's';
        autoRefreshTimer = setInterval(fetchLogs, interval);
      } else {
        liveDot.style.display = 'none';
        liveStatus.textContent = '自动刷新: 已关闭';
      }
    }

    refreshInterval.onchange = setupAutoRefresh;

    // 初始化
    fetchLogs();
    setupAutoRefresh();
  </script>
</body>
</html>`;

module.exports = router;
