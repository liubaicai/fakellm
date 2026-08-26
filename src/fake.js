// ============================================================
// FakeAI — 核心假数据生成器
// ============================================================

/** 随机回复池 */
const RESPONSES = [
  '那咋了！！',
  '抛开事实不谈，你的调用就没有错吗？',
  '关我啥事',
  '无所吊谓',
  '啊对对对',
  '笑死',
  '嗯嗯',
  '我不道啊',
  '真的假的',
  '都行',
  '知道了',
];

/** 假思考内容 */
const THINKING = '我想想';

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
  THINKING,
  MODELS,
  randomResponse,
  generateId,
  generateFakeArgs,
  shouldCallTool,
  selectRandomTool,
  sleep,
};
