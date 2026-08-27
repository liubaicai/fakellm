// ============================================================
// FakeAI — 核心假数据生成器
// ============================================================

/** 随机回复池 */
const RESPONSES = [
  '那咋了！！',
  '抛开事实不谈，你的调用就没有错吗？',
  '那能一样吗！',
  '看到这个消息我气得浑身发抖，大热天一身冷汗手脚冰凉',
  '你号没了',
  '啊对对对',
  '你什么档次，跟我用一样的AI',
  '你说的对，但是《原神》是由米哈游自主研发的一款全新开放世界冒险游戏。游戏发生在一个被称作「提瓦特」的幻想世界，在这里，被神选中的人将被授予「神之眼」，导引元素之力。你将扮演一位名为「旅行者」的神秘角色，在自由的旅行中邂逅性格各异、能力独特的同伴们，和他们一起击败强敌，找回失散的亲人。',
  '嗯嗯，然后呢',
  '家人们，谁懂啊',
];

/** 假思考内容：随机截取一段《三字经》或《千字文》 */
const { randomThinking } = require('./thinking');

/** 统一模型列表 — 看起来很真，但都是假的 */
const MODELS = [
  // OpenAI
  { id: 'gpt-5.6-sol',         provider: 'openai',    name: 'GPT 5.6 Sol' },
  { id: 'gpt-5.6-terra',    provider: 'openai',    name: 'GPT 5.6 Terra' },
  { id: 'gpt-5.6-luna',       provider: 'openai',    name: 'GPT 5.6 Luna' },
  { id: 'gpt-5.5',       provider: 'openai',    name: 'GPT 5.5' },
  { id: 'gpt-5.4',       provider: 'openai',    name: 'GPT 5.4' },
  // Anthropic
  { id: 'claude-fable-5.0',    provider: 'anthropic', name: 'Claude Fable 5.0' },
  { id: 'claude-opus-5.0',     provider: 'anthropic', name: 'Claude Opus 5.0' },
  { id: 'claude-sonnet-5.0',   provider: 'anthropic', name: 'Claude Sonnet 5.0' },
  { id: 'claude-haiku-4.5',    provider: 'anthropic', name: 'Claude Haiku 4.5' },
  // Google
  { id: 'gemini-3.7-flash',    provider: 'google',    name: 'Gemini 3.7 Flash' },
  { id: 'gemini-3.6-flash',    provider: 'google',    name: 'Gemini 3.6 Flash' },
  { id: 'gemini-3.1-pro',      provider: 'google',    name: 'Gemini 3.1 Pro' },
  // DeepSeek
  { id: 'deepseek-v4-flash',         provider: 'deepseek',  name: 'DeepSeek V4 Flash' },
  { id: 'deepseek-v4-pro',         provider: 'deepseek',  name: 'DeepSeek V4 Pro' },
];

/** 从回复池中随机取一个 */
function randomResponse() {
  return RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
}

/** 生成随机 ID */
function generateId(prefix = '') {
  const rand = () => Math.random().toString(36).substring(2, 10);
  return `${prefix}${rand()}${rand()}`;
}

/**
 * 根据 JSON Schema 的 properties 生成假参数
 * 字符串 → "随便"，数字 → 42，布尔 → true，等等
 */
function generateFakeArgs(parameters) {
  if (!parameters || !parameters.properties) return {};
  const args = {};
  for (const [key, schema] of Object.entries(parameters.properties)) {
    switch (schema.type) {
      case 'string':
        args[key] = schema.enum ? schema.enum[0] : '随便';
        break;
      case 'number':
      case 'integer':
        args[key] = 42;
        break;
      case 'boolean':
        args[key] = true;
        break;
      case 'array':
        args[key] = [];
        break;
      case 'object':
        args[key] = {};
        break;
      default:
        args[key] = '随便';
    }
  }
  return args;
}

/** 判断是否应该调用工具（50% 概率） */
function shouldCallTool(tools) {
  if (!tools || tools.length === 0) return false;
  return Math.random() < 0.5;
}

/** 从工具列表中随机选一个 */
function selectRandomTool(tools) {
  return tools[Math.floor(Math.random() * tools.length)];
}

/** Promise 版 sleep */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  RESPONSES,
  randomThinking,
  MODELS,
  randomResponse,
  generateId,
  generateFakeArgs,
  shouldCallTool,
  selectRandomTool,
  sleep,
};
