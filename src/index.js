// ============================================================
// 🤡 FakeAI — 假的，都是假的
// ============================================================

const express = require('express');
const requestLogger = require('./middleware/requestLogger');
const openaiRoutes = require('./routes/openai');
const responsesRoutes = require('./routes/responses');
const anthropicRoutes = require('./routes/anthropic');
const geminiRoutes = require('./routes/gemini');
const adminRoutes = require('./routes/admin');

const app = express();

// ---- Middleware ----
app.use(express.json({ limit: '10mb' }));

// CORS — 无鉴权，全开放
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  next();
});
app.options('*', (_req, res) => res.sendStatus(204));

// 请求记录留存 (JSONL)
app.use(requestLogger);

// ---- Routes ----

// 管理后台:   GET  /vx/mg.html  |  GET/DELETE /vx/mgi
app.use('/vx', adminRoutes);

// OpenAI:    POST /v1/chat/completions  |  GET /v1/models
app.use('/v1', openaiRoutes);

// OpenAI Responses: POST /v1/responses
app.use('/v1', responsesRoutes);

// Anthropic: POST /v1/messages
app.use('/v1', anthropicRoutes);

// Gemini:    POST /v1beta/models/:model:generateContent
//            POST /v1beta/models/:model:streamGenerateContent
//            GET  /v1beta/models
app.use('/v1beta', geminiRoutes);

// ---- Health ----
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: '假的，都是假的 🤡' });
});

// ---- Start ----
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log();
    console.log('  🤡 FakeAI 已启动 — 假的，都是假的');
    console.log();
    console.log(`  端口: ${PORT}`);
    console.log();
    console.log(`  OpenAI    →  POST http://localhost:${PORT}/v1/chat/completions`);
    console.log(`  Responses →  POST http://localhost:${PORT}/v1/responses`);
    console.log(`  Anthropic →  POST http://localhost:${PORT}/v1/messages`);
    console.log(`  Gemini    →  POST http://localhost:${PORT}/v1beta/models/{model}:generateContent`);
    console.log(`  Gemini 流 →  POST http://localhost:${PORT}/v1beta/models/{model}:streamGenerateContent`);
    console.log();
    console.log(`  管理页面  →  GET  http://localhost:${PORT}/vx/mg.html`);
    console.log(`  管理 API  →  GET  http://localhost:${PORT}/vx/mgi`);
    console.log();
    console.log(`  健康检查  →  GET  http://localhost:${PORT}/health`);
    console.log();
  });
}

module.exports = app;
