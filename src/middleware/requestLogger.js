// ============================================================
// FakeAI — 请求日志拦截中间件
// ============================================================

const { appendLog } = require('../logger');
const { generateId } = require('../fake');

/**
 * 识别 API 格式
 */
function detectFormat(url, body) {
  if (url.startsWith('/v1/chat/completions')) return 'OpenAI Chat';
  if (url.startsWith('/v1/responses')) return 'OpenAI Responses';
  if (url.startsWith('/v1/messages')) return 'Anthropic';
  if (url.startsWith('/v1beta/models')) return 'Gemini';
  if (url.startsWith('/v1/models')) return 'OpenAI Models';
  if (url.startsWith('/health')) return 'Health';
  return 'Other';
}

/**
 * 从请求中提取模型名称
 */
function extractModel(url, body) {
  if (body && typeof body === 'object') {
    if (body.model) return body.model;
  }
  // Gemini URL format: /v1beta/models/:modelAction
  if (url.startsWith('/v1beta/models/')) {
    const part = url.slice('/v1beta/models/'.length).split('?')[0];
    const colonIdx = part.lastIndexOf(':');
    if (colonIdx !== -1) {
      return part.substring(0, colonIdx);
    }
    return part;
  }
  return '-';
}

/**
 * 请求日志中间件
 */
function requestLoggerMiddleware(req, res, next) {
  // 忽略管理页面与管理 API 本身，避免日志无限自循环
  if (req.originalUrl.startsWith('/vx/')) {
    return next();
  }

  const startTime = Date.now();
  const requestId = generateId('req_');
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const url = req.originalUrl;
  const method = req.method;
  const requestBody = req.body;
  const format = detectFormat(url, requestBody);
  const model = extractModel(url, requestBody);
  const isStream = Boolean(requestBody && requestBody.stream);

  let responseChunks = [];
  let responseBody = null;
  let isSSE = false;

  // 拦截 res.write (捕获 SSE 和流式输出)
  const originalWrite = res.write;
  res.write = function (chunk, encoding, callback) {
    if (chunk) {
      const contentType = res.getHeader('Content-Type') || '';
      if (typeof contentType === 'string' && contentType.includes('text/event-stream')) {
        isSSE = true;
      }
      try {
        const chunkStr = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
        responseChunks.push(chunkStr);
      } catch {
        // ignore
      }
    }
    return originalWrite.apply(res, arguments);
  };

  // 拦截 res.send / res.json
  const originalSend = res.send;
  res.send = function (body) {
    if (body !== undefined && responseBody === null) {
      try {
        if (typeof body === 'string') {
          try {
            responseBody = JSON.parse(body);
          } catch {
            responseBody = body;
          }
        } else {
          responseBody = body;
        }
      } catch {
        responseBody = body;
      }
    }
    return originalSend.apply(res, arguments);
  };

  // 监听响应结束
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    let finalResponse = responseBody;
    if (isSSE || responseChunks.length > 0) {
      const fullSseData = responseChunks.join('');
      finalResponse = {
        _isStream: true,
        chunkCount: responseChunks.length,
        rawSse: fullSseData.length > 50000 ? fullSseData.slice(0, 50000) + '...[truncated]' : fullSseData,
      };
    }

    const logEntry = {
      id: requestId,
      timestamp: new Date().toISOString(),
      method,
      url,
      ip: clientIp,
      status: res.statusCode,
      duration,
      format,
      model,
      stream: isStream || isSSE,
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent'],
        'authorization': req.headers['authorization'] ? '(provided)' : undefined,
        'x-api-key': req.headers['x-api-key'] ? '(provided)' : undefined,
      },
      requestBody: requestBody && Object.keys(requestBody).length > 0 ? requestBody : undefined,
      response: finalResponse,
    };

    appendLog(logEntry);
  });

  next();
}

module.exports = requestLoggerMiddleware;
