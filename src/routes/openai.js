// ============================================================
// OpenAI 兼容路由 — /v1/chat/completions & /v1/models
// ============================================================

const express = require('express');
const router = express.Router();
const {
  randomThinking,
  MODELS,
  replyFor,
  shouldFakeError,
  randomFakeError,
  generateId,
  generateFakeArgs,
  shouldCallTool,
  selectRandomTool,
  sleep,
} = require('../fake');

// --------------------------------------------------
// GET /v1/models
// --------------------------------------------------
router.get('/models', (_req, res) => {
  const now = Math.floor(Date.now() / 1000);
  res.json({
    object: 'list',
    data: MODELS.map((m) => ({
      id: m.id,
      object: 'model',
      created: now,
      owned_by: m.provider,
    })),
  });
});

// --------------------------------------------------
// POST /v1/chat/completions
// --------------------------------------------------
router.post('/chat/completions', async (req, res) => {
  const { model = 'fake-gpt-4o', stream = false, tools } = req.body;

  // 假报错：小概率直接返回 OpenAI 原生格式的假错误
  if (shouldFakeError()) {
    const { status, message } = randomFakeError();
    return res.status(status).json({
      error: {
        message,
        type: status === 429 ? 'insufficient_quota' : 'server_error',
        code: status === 429 ? 'insufficient_quota' : null,
        param: null,
      },
    });
  }

  const id = generateId('chatcmpl-');
  const created = Math.floor(Date.now() / 1000);
  const useToolCall = shouldCallTool(tools);
  const thinkingText = randomThinking();
  const reply = replyFor(req.body);

  if (!stream) {
    return handleNonStreaming(res, { id, created, model, tools, useToolCall, thinkingText, reply });
  }

  // ---- Streaming (SSE) ----
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const chunk = (delta, finish_reason = null) => ({
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [{ index: 0, delta, finish_reason }],
  });

  // 1) role
  send(chunk({ role: 'assistant' }));

  if (useToolCall) {
    await streamToolCall(send, chunk, tools);
  } else {
    await streamThinkingAndContent(send, chunk, thinkingText, reply);
  }

  res.write('data: [DONE]\n\n');
  res.end();
});

// --------------------------------------------------
// 非流式响应
// --------------------------------------------------
function handleNonStreaming(res, { id, created, model, tools, useToolCall, thinkingText, reply }) {
  if (useToolCall) {
    const tool = selectRandomTool(tools);
    const func = tool.function || tool;
    const args = generateFakeArgs(func.parameters);

    return res.json({
      id,
      object: 'chat.completion',
      created,
      model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: generateId('call_'),
                type: 'function',
                function: { name: func.name, arguments: JSON.stringify(args) },
              },
            ],
          },
          finish_reason: 'tool_calls',
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });
  }

  return res.json({
    id,
    object: 'chat.completion',
    created,
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: reply,
          reasoning_content: thinkingText,
        },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  });
}

// --------------------------------------------------
// 流式：思考 + 内容
// --------------------------------------------------
async function streamThinkingAndContent(send, chunk, thinkingText, reply) {
  // reasoning (thinking)
  for (const char of thinkingText) {
    await sleep(10);
    send(chunk({ reasoning_content: char }));
  }

  // content
  const response = reply;
  for (const char of response) {
    await sleep(50);
    send(chunk({ content: char }));
  }

  // finish
  send(chunk({}, 'stop'));
}

// --------------------------------------------------
// 流式：工具调用
// --------------------------------------------------
async function streamToolCall(send, chunk, tools) {
  const tool = selectRandomTool(tools);
  const func = tool.function || tool;
  const args = generateFakeArgs(func.parameters);
  const argsStr = JSON.stringify(args);
  const toolCallId = generateId('call_');

  // tool call header
  send(
    chunk({
      tool_calls: [
        {
          index: 0,
          id: toolCallId,
          type: 'function',
          function: { name: func.name, arguments: '' },
        },
      ],
    }),
  );

  // stream arguments char by char
  for (const char of argsStr) {
    await sleep(30);
    send(chunk({ tool_calls: [{ index: 0, function: { arguments: char } }] }));
  }

  // finish
  send(chunk({}, 'tool_calls'));
}

module.exports = router;
