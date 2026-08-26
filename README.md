# 🤡 FakeAI

假的，都是假的。

一个提供 OpenAI、Anthropic、Gemini 四种格式 API 的假 AI 服务（含 Responses API）。
思考只会输出「我想想」，回答从「那咋了」「关我啥事」「随便吧」等摆烂语录中随机选取。

## 特性

- ✅ **OpenAI Chat 格式** — `/v1/chat/completions`，兼容 ChatGPT 客户端
- ✅ **OpenAI Responses 格式** — `/v1/responses`，兼容 Codex / 最新 SDK
- ✅ **Anthropic 格式** — `/v1/messages`，兼容 Claude 客户端
- ✅ **Gemini 格式** — `/v1beta/models/{model}:generateContent`
- ✅ **SSE 流式输出** — 逐字吐出，假装在思考
- ✅ **思考 (Thinking)** — 永远只想到「我想想」
- ✅ **工具调用 (Tool Calls)** — 50% 概率调用你传入的工具，参数全是瞎填的
- ✅ **内存调用记录** — 自动在内存中保留最近 100 次调用的请求方法、URL、模型、耗时、状态、请求体及响应
- ✅ **可视化管理后台** — `/vx/mg.html` 查看历史调用详情、搜索筛选、统计看板与一键导出 JSONL
- ✅ **无需鉴权** — 随便调，爱咋调咋调

## 快速开始

```bash
npm install
npm start
```

服务默认监听 `3000` 端口，可通过 `PORT` 环境变量修改。

## 🚀 部署到 Vercel

本项目已内置完整的 Vercel Serverless 配置（`vercel.json` 及 `api/index.js`），支持一键部署到 Vercel：

### 方式 1：使用内置部署脚本

- **Windows PowerShell**:
  ```powershell
  .\deploy.ps1
  # 或部署预览版：.\deploy.ps1 -Preview
  ```
- **macOS / Linux / Git Bash**:
  ```bash
  chmod +x deploy.sh
  ./deploy.sh
  # 或部署预览版：./deploy.sh --preview
  ```

### 方式 2：使用 npm 命令

```bash
# 部署到生产环境
npm run deploy

# 或部署预览环境
npm run deploy:preview
```

### 方式 3：Git 关联部署

直接将代码推送到 GitHub / GitLab 仓库，然后在 [Vercel 控制台](https://vercel.com/new) 点击 **Import** 即可零配置自动构建部署。

## API 端点与页面

| 模块 | 端点 / 路径 | 方法 | 说明 |
|------|-------------|------|------|
| 管理后台页面 | `/vx/mg.html` | GET | 调用历史管理后台看板 |
| 管理 API | `/vx/mgi` | GET / DELETE | 获取历史记录、过滤查询、清空记录、导出 JSONL |
| OpenAI Chat | `/v1/chat/completions` | POST | 兼容 ChatGPT 客户端 |
| OpenAI Responses | `/v1/responses` | POST | 兼容 Codex / 最新 Responses API |
| OpenAI | `/v1/models` | GET | 最新真实模型列表 |
| Anthropic | `/v1/messages` | POST | 兼容 Claude 客户端 |
| Gemini | `/v1beta/models/{model}:generateContent` | POST | 兼容 Gemini API |
| Gemini | `/v1beta/models/{model}:streamGenerateContent` | POST | 兼容 Gemini 流式 API |
| Gemini | `/v1beta/models` | GET | Gemini 格式模型列表 |
| 健康检查 | `/health` | GET | 服务健康检查 |

## 使用示例

### OpenAI 格式（流式）

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "fake-gpt-4o",
    "stream": true,
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

### Responses API（流式）

```bash
curl http://localhost:3000/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "fake-o3",
    "stream": true,
    "input": [{"role": "user", "content": "你好"}]
  }'
```

### OpenAI 格式（带工具调用）

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "fake-gpt-4o",
    "messages": [{"role": "user", "content": "北京天气如何"}],
    "tools": [{
      "type": "function",
      "function": {
        "name": "get_weather",
        "parameters": {
          "type": "object",
          "properties": {
            "location": {"type": "string"},
            "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
          }
        }
      }
    }]
  }'
```

### Anthropic 格式（带思考）

```bash
curl http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "fake-claude",
    "max_tokens": 1024,
    "stream": true,
    "thinking": {"type": "enabled", "budget_tokens": 10000},
    "messages": [{"role": "user", "content": "解释量子力学"}]
  }'
```

### Gemini 格式（流式）

```bash
curl http://localhost:3000/v1beta/models/fake-gemini:streamGenerateContent \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"role": "user", "parts": [{"text": "你好"}]}]
  }'
```

### 作为 OpenAI SDK 的 base URL

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:3000/v1',
  apiKey: '随便填',
});

const response = await client.chat.completions.create({
  model: 'fake-gpt-4o',
  messages: [{ role: 'user', content: '你好' }],
});

console.log(response.choices[0].message.content);
// => "那咋了" / "关我啥事" / "随便吧" / ...
```

## 回复池

```
那咋了 · 关我啥事 · 你说得对 · 好的吧 · 随便吧
爱咋咋地 · 哦 · 嗯嗯 · 知道了 · 然后呢
不关心 · 无所谓 · 都行 · 你开心就好 · 啊对对对
6 · 好好好 · 笑死 · 真的假的 · 我不道啊
```

## License

MIT
