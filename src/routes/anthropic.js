// ============================================================
// Anthropic 兼容路由 — /v1/messages
// ============================================================

const express = require('express');
const router = express.Router();
const {
  randomThinking,
  randomResponse,
  generateId,
  generateFakeArgs,
  shouldCallTool,
  selectRandomTool,
  sleep,
} = require('../fake');

// --------------------------------------------------
// POST /v1/messages
// --------------------------------------------------
router.post('/messages', async (req, res) => {
  const { model = 'fake-claude', stream = false, tools, thinking } = req.body;
  const msgId = generateId('msg_');
  const useToolCall = shouldCallTool(tools);
  const thinkingEnabled = !!(thinking && thinking.type === 'enabled');
  const thinkingText = randomThinking();

  if (!stream) {
    return handleNonStreaming(res, { msgId, model, tools, useToolCall, thinkingEnabled, thinkingText });
  }

  // ---- Streaming (SSE) ----
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // message_start
  sendEvent('message_start', {
    type: 'message_start',
    message: {
      id: msgId,
      type: 'message',
      role: 'assistant',
      content: [],
      model,
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 0 },
    },
  });

  // ping
  sendEvent('ping', { type: 'ping' });

  let blockIndex = 0;

  // ---- Thinking block (if enabled) ----
  if (thinkingEnabled) {
    sendEvent('content_block_start', {
      type: 'content_block_start',
      index: blockIndex,
      content_block: { type: 'thinking', thinking: '' },
    });

    for (const char of thinkingText) {
      await sleep(10);
      sendEvent('content_block_delta', {
        type: 'content_block_delta',
        index: blockIndex,
        delta: { type: 'thinking_delta', thinking: char },
      });
    }

    sendEvent('content_block_stop', { type: 'content_block_stop', index: blockIndex });
    blockIndex++;
  }

  // ---- Text block ----
  const response = randomResponse();
  sendEvent('content_block_start', {
    type: 'content_block_start',
    index: blockIndex,
    content_block: { type: 'text', text: '' },
  });

  for (const char of response) {
    await sleep(50);
    sendEvent('content_block_delta', {
      type: 'content_block_delta',
      index: blockIndex,
      delta: { type: 'text_delta', text: char },
    });
  }

  sendEvent('content_block_stop', { type: 'content_block_stop', index: blockIndex });
  blockIndex++;

  // ---- Tool use block (if applicable) ----
  if (useToolCall) {
    const tool = selectRandomTool(tools);
    const args = generateFakeArgs(tool.input_schema);
    const toolUseId = generateId('toolu_');
    const argsStr = JSON.stringify(args);

    sendEvent('content_block_start', {
      type: 'content_block_start',
      index: blockIndex,
      content_block: { type: 'tool_use', id: toolUseId, name: tool.name, input: {} },
    });

    // stream input JSON in small chunks
    const chunkSize = 5;
    for (let i = 0; i < argsStr.length; i += chunkSize) {
      await sleep(30);
      sendEvent('content_block_delta', {
        type: 'content_block_delta',
        index: blockIndex,
        delta: { type: 'input_json_delta', partial_json: argsStr.substring(i, i + chunkSize) },
      });
    }

    sendEvent('content_block_stop', { type: 'content_block_stop', index: blockIndex });
    blockIndex++;
  }

  // ---- message_delta & message_stop ----
  sendEvent('message_delta', {
    type: 'message_delta',
    delta: {
      stop_reason: useToolCall ? 'tool_use' : 'end_turn',
      stop_sequence: null,
    },
    usage: { output_tokens: useToolCall ? 15 : 5 },
  });

  sendEvent('message_stop', { type: 'message_stop' });
  res.end();
});

// --------------------------------------------------
// 非流式响应
// --------------------------------------------------
function handleNonStreaming(res, { msgId, model, tools, useToolCall, thinkingEnabled, thinkingText }) {
  const content = [];

  // thinking (if enabled)
  if (thinkingEnabled) {
    content.push({ type: 'thinking', thinking: thinkingText });
  }

  // text
  content.push({ type: 'text', text: randomResponse() });

  // tool use
  if (useToolCall) {
    const tool = selectRandomTool(tools);
    const args = generateFakeArgs(tool.input_schema);
    content.push({
      type: 'tool_use',
      id: generateId('toolu_'),
      name: tool.name,
      input: args,
    });
  }

  res.json({
    id: msgId,
    type: 'message',
    role: 'assistant',
    content,
    model,
    stop_reason: useToolCall ? 'tool_use' : 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: useToolCall ? 15 : 5 },
  });
}

module.exports = router;
