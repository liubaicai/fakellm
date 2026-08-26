// ============================================================
// Gemini 兼容路由 — /v1beta/models/:model
// ============================================================

const express = require('express');
const router = express.Router();
const {
  THINKING,
  MODELS,
  randomResponse,
  generateId,
  generateFakeArgs,
  shouldCallTool,
  selectRandomTool,
  sleep,
} = require('../fake');

// --------------------------------------------------
// GET /v1beta/models — 列出模型
// --------------------------------------------------
router.get('/models', (_req, res) => {
  res.json({
    models: MODELS.map((m) => ({
      name: `models/${m.id}`,
      displayName: m.name,
      description: `FakeAI — ${m.name} (${m.provider})`,
      supportedGenerationMethods: ['generateContent', 'streamGenerateContent'],
    })),
  });
});

// --------------------------------------------------
// POST /v1beta/models/:modelAction
// 匹配: models/fake-gemini:generateContent
//        models/fake-gemini:streamGenerateContent
// --------------------------------------------------
router.post('/models/:modelAction', async (req, res) => {
  const colonIdx = req.params.modelAction.lastIndexOf(':');
  if (colonIdx === -1) {
    return res.status(400).json({ error: { message: 'Missing action in URL (e.g. :generateContent)' } });
  }

  const model = req.params.modelAction.substring(0, colonIdx);
  const action = req.params.modelAction.substring(colonIdx + 1);

  const tools = extractGeminiTools(req.body.tools);
  const useToolCall = shouldCallTool(tools);

  switch (action) {
    case 'generateContent':
      return handleGenerateContent(res, { model, tools, useToolCall });
    case 'streamGenerateContent':
      return handleStreamGenerateContent(res, { model, tools, useToolCall });
    default:
      return res.status(400).json({ error: { message: `Unknown action: ${action}` } });
  }
});

// --------------------------------------------------
// 从 Gemini 格式中提取 function declarations
// --------------------------------------------------
function extractGeminiTools(tools) {
  if (!tools || !Array.isArray(tools)) return null;
  const declarations = [];
  for (const tool of tools) {
    if (tool.functionDeclarations) {
      declarations.push(...tool.functionDeclarations);
    }
  }
  return declarations.length > 0 ? declarations : null;
}

// --------------------------------------------------
// 非流式：generateContent
// --------------------------------------------------
function handleGenerateContent(res, { model, tools, useToolCall }) {
  const parts = [{ thought: true, text: THINKING }];

  if (useToolCall) {
    const tool = selectRandomTool(tools);
    const args = generateFakeArgs(tool.parameters);
    parts.push({ functionCall: { name: tool.name, args } });
  } else {
    parts.push({ text: randomResponse() });
  }

  res.json({
    candidates: [
      {
        content: { parts, role: 'model' },
        finishReason: 'STOP',
        index: 0,
      },
    ],
    usageMetadata: {
      promptTokenCount: 10,
      candidatesTokenCount: 5,
      totalTokenCount: 15,
    },
    modelVersion: model,
  });
}

// --------------------------------------------------
// 流式：streamGenerateContent (SSE)
// --------------------------------------------------
async function handleStreamGenerateContent(res, { model, tools, useToolCall }) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendData = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  // ---- Thinking ----
  for (const char of THINKING) {
    await sleep(50);
    sendData({
      candidates: [
        {
          content: { parts: [{ thought: true, text: char }], role: 'model' },
          index: 0,
        },
      ],
    });
  }

  // ---- Content or Tool Call ----
  if (useToolCall) {
    const tool = selectRandomTool(tools);
    const args = generateFakeArgs(tool.parameters);

    await sleep(50);
    sendData({
      candidates: [
        {
          content: {
            parts: [{ functionCall: { name: tool.name, args } }],
            role: 'model',
          },
          finishReason: 'STOP',
          index: 0,
        },
      ],
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 5,
        totalTokenCount: 15,
      },
      modelVersion: model,
    });
  } else {
    const response = randomResponse();
    for (const char of response) {
      await sleep(50);
      sendData({
        candidates: [
          {
            content: { parts: [{ text: char }], role: 'model' },
            index: 0,
          },
        ],
      });
    }

    // final chunk
    sendData({
      candidates: [
        {
          content: { parts: [{ text: '' }], role: 'model' },
          finishReason: 'STOP',
          index: 0,
        },
      ],
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 5,
        totalTokenCount: 15,
      },
      modelVersion: model,
    });
  }

  res.end();
}

module.exports = router;
