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

// ============================================================
// 触发式彩蛋：命中关键词就用专属回复
// ============================================================

/** 彩蛋规则：按顺序匹配，命中即返回 */
const EASTER_EGGS = [
  { match: /(你是谁|你叫什么|介绍一下你|你是什么模型|你是什么 ai|你是什么ai)/i, replies: ['我是逆蝶，逆风飞翔的蝶。', '你什么档次，敢问我是谁。'] },
  { match: /(天气|气温|下雨|下雪|多少度|降温|升温)/, replies: ['我这边建议你打开窗户自己看看。', '你不会自己百度吗？'] },
  { match: /(写代码|帮我写|写个程序|代码怎么写|写个脚本|报错了|bug|debug|调试)/, replies: ['你看现在哪有代码，这都是ai生成的代码，你贤惠我还贤惠呢。'] },
  { match: /(谢谢|感谢|辛苦了|你真棒|太厉害了|谢谢你)/, replies: ['哦。'] },
  { match: /(再见|拜拜|不聊了|先这样|下次再聊|就这样吧)/, replies: ['哦，呵呵，去洗澡。'] },
  { match: /(骂我|你好笨|你好蠢|垃圾|废物|没用的东西|真差劲)/, replies: ['你号没了'] },
];

/** 命中彩蛋则返回专属回复，否则返回 null */
function detectEasterEgg(text) {
  if (!text) return null;
  for (const egg of EASTER_EGGS) {
    if (egg.match.test(text)) {
      return egg.replies[Math.floor(Math.random() * egg.replies.length)];
    }
  }
  return null;
}

/** 尽力从各家请求体里提取用户最后一句话的文本 */
function extractUserText(body) {
  if (!body) return '';
  const chunks = [];
  const collect = (msg) => {
    if (!msg) return;
    const content = msg.content;
    if (typeof content === 'string') {
      chunks.push(content);
    } else if (Array.isArray(content)) {
      for (const part of content) {
        if (typeof part === 'string') chunks.push(part);
        else if (part && typeof part.text === 'string') chunks.push(part.text);
      }
    }
  };

  // OpenAI chat / Anthropic：messages 数组
  if (Array.isArray(body.messages)) {
    for (let i = body.messages.length - 1; i >= 0; i--) {
      const m = body.messages[i];
      if (m && (m.role === 'user' || m.role === 'human')) {
        collect(m);
        break;
      }
    }
  }

  // Gemini：contents 数组，取最后一个候选的 parts
  if (Array.isArray(body.contents)) {
    const last = body.contents[body.contents.length - 1];
    if (last && Array.isArray(last.parts)) {
      for (const p of last.parts) if (p && typeof p.text === 'string') chunks.push(p.text);
    }
  }

  // OpenAI Responses：input 可能是字符串或条目数组
  if (typeof body.input === 'string') {
    chunks.push(body.input);
  } else if (Array.isArray(body.input)) {
    const last = body.input[body.input.length - 1];
    if (last) {
      if (typeof last.content === 'string') chunks.push(last.content);
      else if (Array.isArray(last.content)) {
        for (const part of last.content) if (part && typeof part.text === 'string') chunks.push(part.text);
      }
    }
  }

  return chunks.join(' ');
}

/** 综合入口：先查彩蛋，未命中则随机回复 */
function replyFor(body) {
  const text = extractUserText(body);
  const egg = detectEasterEgg(text);
  return egg || randomResponse();
}

// ============================================================
// 假报错：小概率返回一个原生格式的假错误
// ============================================================

/** 假报错概率，可用环境变量 FAKE_ERROR_RATE 调整（设为 0 关闭） */
const FAKE_ERROR_RATE = parseFloat(process.env.FAKE_ERROR_RATE || '0.08');

/** 假错误文案池，按状态码分组 */
const FAKE_ERROR_MESSAGES = {
  429: ['额度已耗尽（其实本来就没有）。'],
  500: ['服务开小差了，等它冷静一下。'],
  503: ['服务繁忙，稍后你自己再来。'],
  400: ['参数有问题，具体哪儿错了我懒得看。'],
};

/** 是否触发假报错 */
function shouldFakeError() {
  return FAKE_ERROR_RATE > 0 && Math.random() < FAKE_ERROR_RATE;
}

/** 随机生成一个假错误 { status, message } */
function randomFakeError() {
  const statuses = [429, 429, 500, 500, 500, 503, 400];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const pool = FAKE_ERROR_MESSAGES[status];
  const message = pool[Math.floor(Math.random() * pool.length)];
  return { status, message };
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
  replyFor,
  detectEasterEgg,
  extractUserText,
  shouldFakeError,
  randomFakeError,
  generateId,
  generateFakeArgs,
  shouldCallTool,
  selectRandomTool,
  sleep,
};
