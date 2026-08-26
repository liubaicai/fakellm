// ============================================================
// FakeAI — 内存请求记录管理模块 (最近 100 次)
// ============================================================

const MAX_LOGS = 100;
const memoryLogs = [];

/**
 * 追加一条请求日志到内存 (最多保留 100 条)
 * @param {Object} logEntry 
 */
function appendLog(logEntry) {
  memoryLogs.push(logEntry);
  if (memoryLogs.length > MAX_LOGS) {
    memoryLogs.shift(); // 移除最早的一条
  }
}

/**
 * 获取内存中的请求记录（倒序，带分页和过滤）
 * @param {Object} options
 * @param {number} options.page - 页码 (从 1 开始)
 * @param {number} options.limit - 每页条数
 * @param {string} [options.search] - 搜索关键词 (URL/Body/Model)
 * @param {string} [options.format] - 格式筛选
 * @param {string} [options.model] - 模型筛选
 */
function getLogs({ page = 1, limit = 20, search = '', format = '', model = '' } = {}) {
  const allFiltered = [];
  const stats = {
    totalRequests: memoryLogs.length,
    modelCounts: {},
    formatCounts: {},
    statusCounts: {},
    totalDuration: 0,
  };

  const searchLower = search.trim().toLowerCase();

  for (let i = memoryLogs.length - 1; i >= 0; i--) {
    const entry = memoryLogs[i];

    // 统计数据
    const m = entry.model || 'unknown';
    stats.modelCounts[m] = (stats.modelCounts[m] || 0) + 1;

    const f = entry.format || 'other';
    stats.formatCounts[f] = (stats.formatCounts[f] || 0) + 1;

    const s = entry.status || 200;
    stats.statusCounts[s] = (stats.statusCounts[s] || 0) + 1;

    stats.totalDuration += (entry.duration || 0);

    // 过滤判断
    if (format && entry.format !== format) continue;
    if (model && entry.model !== model) continue;

    if (searchLower) {
      const matchUrl = entry.url && entry.url.toLowerCase().includes(searchLower);
      const matchModel = entry.model && entry.model.toLowerCase().includes(searchLower);
      const matchBody = entry.requestBody && JSON.stringify(entry.requestBody).toLowerCase().includes(searchLower);
      const matchResp = entry.response && JSON.stringify(entry.response).toLowerCase().includes(searchLower);
      if (!matchUrl && !matchModel && !matchBody && !matchResp) {
        continue;
      }
    }

    allFiltered.push(entry);
  }

  const total = allFiltered.length;
  const startIndex = (page - 1) * limit;
  const list = allFiltered.slice(startIndex, startIndex + limit);

  return {
    total,
    page,
    limit,
    maxCapacity: MAX_LOGS,
    list,
    stats: {
      totalRequests: stats.totalRequests,
      filteredRequests: total,
      avgDuration: stats.totalRequests > 0 ? Math.round(stats.totalDuration / stats.totalRequests) : 0,
      modelCounts: stats.modelCounts,
      formatCounts: stats.formatCounts,
      statusCounts: stats.statusCounts,
    },
  };
}

/**
 * 清空内存记录
 */
function clearLogs() {
  memoryLogs.length = 0;
  return true;
}

/**
 * 获取全部内存记录转为 JSONL 格式字符串
 */
function exportJsonl() {
  return memoryLogs.map(item => JSON.stringify(item)).join('\n') + (memoryLogs.length > 0 ? '\n' : '');
}

module.exports = {
  MAX_LOGS,
  appendLog,
  getLogs,
  clearLogs,
  exportJsonl,
};
