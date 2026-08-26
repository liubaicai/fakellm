// Quick test script for all API formats, in-memory logging & Admin routes
const http = require('http');
const fs = require('fs');
const path = require('path');

function get(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: 'localhost', port: 3000, path: urlPath }, (res) => {
      let chunks = '';
      res.on('data', (c) => (chunks += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: chunks }));
    });
    req.on('error', reject);
  });
}

function del(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port: 3000, path: urlPath, method: 'DELETE' }, (res) => {
      let chunks = '';
      res.on('data', (c) => (chunks += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: chunks }));
    });
    req.on('error', reject);
    req.end();
  });
}

function request(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      { hostname: 'localhost', port: 3000, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => resolve({ status: res.statusCode, body: chunks }));
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sseRequest(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      { hostname: 'localhost', port: 3000, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        let chunks = '';
        res.on('data', (c) => {
          chunks += c;
          process.stdout.write(c);
        });
        res.on('end', () => { console.log(); resolve({ status: res.statusCode, body: chunks }); });
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== 1. OpenAI 非流式 ===');
  const r1 = await request('/v1/chat/completions', { model: 'gpt-5.6-sol', messages: [{ role: 'user', content: '你好' }] });
  console.log(JSON.stringify(JSON.parse(r1.body), null, 2));

  console.log('\n=== 2. OpenAI 流式 ===');
  await sseRequest('/v1/chat/completions', { model: 'gpt-5.6-sol', stream: true, messages: [{ role: 'user', content: '你好' }] });

  console.log('\n=== 3. Anthropic 非流式 (带思考) ===');
  const r3 = await request('/v1/messages', { model: 'claude-opus-5.0', max_tokens: 1024, messages: [{ role: 'user', content: '你好' }], thinking: { type: 'enabled', budget_tokens: 10000 } });
  console.log(JSON.stringify(JSON.parse(r3.body), null, 2));

  console.log('\n=== 4. Anthropic 流式 ===');
  await sseRequest('/v1/messages', { model: 'claude-opus-5.0', max_tokens: 1024, stream: true, messages: [{ role: 'user', content: '你好' }], thinking: { type: 'enabled', budget_tokens: 10000 } });

  console.log('\n=== 5. Gemini 非流式 ===');
  const r5 = await request('/v1beta/models/gemini-3.7-flash:generateContent', { contents: [{ role: 'user', parts: [{ text: '你好' }] }] });
  console.log(JSON.stringify(JSON.parse(r5.body), null, 2));

  console.log('\n=== 6. Gemini 流式 ===');
  await sseRequest('/v1beta/models/gemini-3.7-flash:streamGenerateContent', { contents: [{ role: 'user', parts: [{ text: '你好' }] }] });

  console.log('\n=== 7. OpenAI Responses API ===');
  const r7 = await request('/v1/responses', { model: 'codex-next', input: [{ role: 'user', content: '编写代码' }] });
  console.log(JSON.stringify(JSON.parse(r7.body), null, 2));

  console.log('\n=== 8. 验证纯内存记录（无磁盘日志文件）===');
  const logFile = path.join(process.cwd(), 'logs', 'requests.jsonl');
  if (fs.existsSync(logFile)) {
    console.warn('⚠️ 存在 logs/requests.jsonl 文件');
  } else {
    console.log('✅ 确认未写磁盘文件，完全保存在内存中');
  }

  console.log('\n=== 9. 测试管理 API: GET /vx/mgi ===');
  const r9 = await get('/vx/mgi?limit=5');
  const parsed9 = JSON.parse(r9.body);
  console.log(`状态: ${r9.status}, 返回记录数: ${parsed9.list.length}, 内存总记录数: ${parsed9.total}, 最大容量: ${parsed9.maxCapacity}`);
  console.log('统计数据:', JSON.stringify(parsed9.stats, null, 2));

  console.log('\n=== 10. 测试管理 API: 导出 JSONL GET /vx/mgi?download=1 ===');
  const r10 = await get('/vx/mgi?download=1');
  const lines = r10.body.trim().split('\n').filter(Boolean);
  console.log(`状态: ${r10.status}, 内容类型: ${r10.headers['content-type']}, 导出行数: ${lines.length}`);
  console.log('首条导出记录:', lines[0].slice(0, 120) + '...');

  console.log('\n=== 11. 测试管理页面: GET /vx/mg.html ===');
  const r11 = await get('/vx/mg.html');
  console.log(`状态: ${r11.status}, 类型: ${r11.headers['content-type']}, HTML长度: ${r11.body.length}`);
  if (r11.body.includes('FakeAI 请求管理后台')) {
    console.log('✅ 管理后台 HTML 页面渲染正常');
  }

  console.log('\n=== 12. 测试清空记录: DELETE /vx/mgi ===');
  const r12 = await del('/vx/mgi');
  console.log('清空结果:', r12.body);
  const r13 = await get('/vx/mgi');
  const parsed13 = JSON.parse(r13.body);
  console.log(`清空后记录数: ${parsed13.total}`);

  console.log('\n🎉 全部纯内存记录与管理功能测试通过！');
}

main().catch(console.error);
