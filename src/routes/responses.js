// ============================================================
// OpenAI Responses API 兼容路由 — POST /v1/responses
// ============================================================

const express = require('express');
const router = express.Router();
const {
  THINKING,
  randomResponse,
  generateId,
  generateFakeArgs,
  shouldCallTool,
  selectRandomTool,
  sleep,
} = require('../fake');

// --------------------------------------------------
// POST /v1/responses
// --------------------------------------------------
router.post('/responses', async (req, res) => {
  const { model = 'fake-o3', stream = false, tools } = req.body;
  const respId = generateId('resp_');
  const created = Math.floor(Date.now() / 1000);

  // Normalize tools: Responses API tools have { type, name, parameters } at top level
  const functionTools = extractFunctionTools(tools);
  const useToolCall = shouldCallTool(functionTools);

  if (!stream) {
    return handleNonStreaming(res, { respId, created, model, functionTools, useToolCall });
  }

  // ---- Streaming (SSE) ----
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  let seq = 0;
  const sendEvent = (type, data) => {
    const payload = { type, sequence_number: seq++, ...data };
    res.write(`event: message\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  const response = randomResponse();

  // Build the full response object for envelope events
  const buildResponseObj = (status, output = []) => ({
    id: respId,
    object: 'response',
    created_at: created,
    model,
    status,
    output,
    usage: null,
  });

  // ---- response.created ----
  sendEvent('response.created', { response: buildResponseObj('in_progress') });

  // ---- response.in_progress ----
  sendEvent('response.in_progress', { response: buildResponseObj('in_progress') });

  let outputIndex = 0;

  // ---- Reasoning ----
  const reasoningId = generateId('rs_');
  const reasoningItem = {
    type: 'reasoning',
    id: reasoningId,
    summary: [],
  };

  sendEvent('response.output_item.added', {
    output_index: outputIndex,
    item: { ...reasoningItem },
  });

  // reasoning summary part
  sendEvent('response.reasoning_summary_part.added', {
    item_id: reasoningId,
    output_index: outputIndex,
    summary_index: 0,
    part: { type: 'summary_text', text: '' },
  });

  // stream thinking char by char
  for (const char of THINKING) {
    await sleep(50);
    sendEvent('response.reasoning_summary_text.delta', {
      item_id: reasoningId,
      output_index: outputIndex,
      summary_index: 0,
      delta: char,
    });
  }

  // done
  sendEvent('response.reasoning_summary_text.done', {
    item_id: reasoningId,
    output_index: outputIndex,
    summary_index: 0,
    text: THINKING,
  });

  sendEvent('response.reasoning_summary_part.done', {
    item_id: reasoningId,
    output_index: outputIndex,
    summary_index: 0,
    part: { type: 'summary_text', text: THINKING },
  });

  reasoningItem.summary = [{ type: 'summary_text', text: THINKING }];
  sendEvent('response.output_item.done', {
    output_index: outputIndex,
    item: reasoningItem,
  });
  outputIndex++;

  if (useToolCall) {
    // ---- Function Call ----
    await streamFunctionCall(sendEvent, outputIndex, functionTools);
  } else {
    // ---- Message ----
    await streamMessage(sendEvent, outputIndex, response);
  }

  // ---- response.completed ----
  const finalOutput = [reasoningItem];
  if (useToolCall) {
    const tool = selectRandomTool(functionTools);
    const args = generateFakeArgs(tool.parameters);
    finalOutput.push({
      type: 'function_call',
      id: generateId('fc_'),
      call_id: generateId('call_'),
      name: tool.name,
      arguments: JSON.stringify(args),
      status: 'completed',
    });
  } else {
    finalOutput.push({
      type: 'message',
      id: generateId('msg_'),
      role: 'assistant',
      status: 'completed',
      content: [{ type: 'output_text', text: response }],
    });
  }

  const finalResp = {
    ...buildResponseObj('completed', finalOutput),
    usage: {
      input_tokens: 10,
      output_tokens: 5,
      total_tokens: 15,
      output_tokens_details: { reasoning_tokens: 3 },
    },
  };
  sendEvent('response.completed', { response: finalResp });

  res.end();
});

// --------------------------------------------------
// Extract function tools from Responses API format
// --------------------------------------------------
function extractFunctionTools(tools) {
  if (!tools || !Array.isArray(tools)) return null;
  const fns = tools.filter((t) => t.type === 'function');
  return fns.length > 0 ? fns : null;
}

// --------------------------------------------------
// 流式：消息输出
// --------------------------------------------------
async function streamMessage(sendEvent, outputIndex, response) {
  const msgId = generateId('msg_');
  const msgItem = {
    type: 'message',
    id: msgId,
    role: 'assistant',
    status: 'in_progress',
    content: [],
  };

  sendEvent('response.output_item.added', {
    output_index: outputIndex,
    item: msgItem,
  });

  // content part
  sendEvent('response.content_part.added', {
    item_id: msgId,
    output_index: outputIndex,
    content_index: 0,
    part: { type: 'output_text', text: '' },
  });

  // stream text delta
  for (const char of response) {
    await sleep(50);
    sendEvent('response.output_text.delta', {
      item_id: msgId,
      output_index: outputIndex,
      content_index: 0,
      delta: char,
    });
  }

  sendEvent('response.output_text.done', {
    item_id: msgId,
    output_index: outputIndex,
    content_index: 0,
    text: response,
  });

  sendEvent('response.content_part.done', {
    item_id: msgId,
    output_index: outputIndex,
    content_index: 0,
    part: { type: 'output_text', text: response },
  });

  msgItem.status = 'completed';
  msgItem.content = [{ type: 'output_text', text: response }];
  sendEvent('response.output_item.done', {
    output_index: outputIndex,
    item: msgItem,
  });
}

// --------------------------------------------------
// 流式：函数调用
// --------------------------------------------------
async function streamFunctionCall(sendEvent, outputIndex, tools) {
  const tool = selectRandomTool(tools);
  const args = generateFakeArgs(tool.parameters);
  const argsStr = JSON.stringify(args);

  const fcId = generateId('fc_');
  const callId = generateId('call_');

  const fcItem = {
    type: 'function_call',
    id: fcId,
    call_id: callId,
    name: tool.name,
    arguments: '',
    status: 'in_progress',
  };

  sendEvent('response.output_item.added', {
    output_index: outputIndex,
    item: fcItem,
  });

  // stream arguments char by char
  for (const char of argsStr) {
    await sleep(30);
    sendEvent('response.function_call_arguments.delta', {
      item_id: fcId,
      output_index: outputIndex,
      delta: char,
    });
  }

  sendEvent('response.function_call_arguments.done', {
    item_id: fcId,
    output_index: outputIndex,
    arguments: argsStr,
  });

  fcItem.arguments = argsStr;
  fcItem.status = 'completed';
  sendEvent('response.output_item.done', {
    output_index: outputIndex,
    item: fcItem,
  });
}

// --------------------------------------------------
// 非流式响应
// --------------------------------------------------
function handleNonStreaming(res, { respId, created, model, functionTools, useToolCall }) {
  const output = [];

  // Reasoning
  output.push({
    type: 'reasoning',
    id: generateId('rs_'),
    summary: [{ type: 'summary_text', text: THINKING }],
  });

  if (useToolCall) {
    const tool = selectRandomTool(functionTools);
    const args = generateFakeArgs(tool.parameters);
    output.push({
      type: 'function_call',
      id: generateId('fc_'),
      call_id: generateId('call_'),
      name: tool.name,
      arguments: JSON.stringify(args),
      status: 'completed',
    });
  } else {
    output.push({
      type: 'message',
      id: generateId('msg_'),
      role: 'assistant',
      status: 'completed',
      content: [{ type: 'output_text', text: randomResponse() }],
    });
  }

  res.json({
    id: respId,
    object: 'response',
    created_at: created,
    model,
    status: 'completed',
    output,
    usage: {
      input_tokens: 10,
      output_tokens: 5,
      total_tokens: 15,
      output_tokens_details: { reasoning_tokens: 3 },
    },
  });
}

module.exports = router;
