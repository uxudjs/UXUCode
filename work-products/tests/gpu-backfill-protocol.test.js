const assert = require('node:assert/strict');
const { test } = require('node:test');
const childProcess = require('node:child_process');
const path = require('node:path');

const entry = path.resolve(__dirname, '../../Codex/mcp/GPUBackfill/server.js');

test('stdio exposes GPUBackfill tools with explicit GPU selection and error results', () => {
  const messages = [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'contract', version: '1' } } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'gpu_create_queue', arguments: { target: { root: '/project', python: '/env/bin/python' }, queue_id: 'test', gpu_uuids: ['GPU-one'], inventory_id: 'test', selection_confirmed: false } } },
    { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'gpu_probe', arguments: { target: { host: '-oProxyCommand=bad', root: '/project', python: '/env/bin/python' } } } },
    { jsonrpc: '2.0', id: 5, method: 'not/a/method' },
    { jsonrpc: '2.0', id: 6, method: 'ping' }
  ];
  const result = childProcess.spawnSync(process.execPath, [entry], { input: messages.map(JSON.stringify).join('\n') + '\n', encoding: 'utf8', timeout: 5000 });
  assert.equal(result.status, 0, result.stderr);
  const replies = result.stdout.trim().split('\n').map(JSON.parse);
  const byId = new Map(replies.map((reply) => [reply.id, reply]));
  assert.equal(byId.get(1).result.serverInfo.name, 'GPUBackfill');
  assert.equal(byId.get(1).result.serverInfo.version, '5.1.2');
  assert.match(byId.get(1).result.instructions, /ask.*user/i);
  assert.deepEqual(byId.get(2).result.tools.map((tool) => tool.name).sort(), ['gpu_probe', 'gpu_prepare', 'gpu_create_queue', 'gpu_submit', 'gpu_status', 'gpu_cancel', 'gpu_queue_control'].sort());
  assert.equal(byId.get(3).error.code, -32602);
  assert.match(byId.get(3).error.message, /selection_confirmed/);
  assert.equal(byId.get(4).result.isError, true);
  assert.match(byId.get(4).result.content[0].text, /host/i);
  assert.equal(byId.get(5).error.code, -32601);
  assert.deepEqual(byId.get(6).result, {});
  assert.equal(replies.length, 6, 'notifications have no response and stdout contains only JSON-RPC');
});

test('schema validates nested budgets before any target execution', async () => {
  const { createHandler } = require(entry);
  let calls = 0;
  const handle = createHandler(async (_target, request) => { calls++; return request; });
  await handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } } });
  await handle({ jsonrpc: '2.0', method: 'notifications/initialized' });
  const base = { target: { root: '/project', python: '/env/bin/python' }, queue_id: 'q', job: { job_id: 'j', command: ['/env/bin/python', 'train.py'], cwd: '/project', memory_mib: 4096, max_runtime_seconds: null } };
  const invoke = (args) => handle({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'gpu_submit', arguments: args } });
  assert.equal((await invoke({ ...base, job: { ...base.job, memory_mib: true } })).error.code, -32602);
  assert.equal((await invoke({ ...base, job: { ...base.job, multi_gpu: { sharding_supported: false, gpu_count: 2, memory_mib_per_gpu: [2048, 2048], compatible_models: ['NVIDIA A100'] } } })).error.code, -32602);
  assert.equal((await invoke({ ...base, job: { ...base.job, extra: 'ignored?' } })).error.code, -32602);
  assert.equal(calls, 0);
  const good = await invoke(base);
  assert.equal(good.result.structuredContent.action, 'submit');
  assert.equal(calls, 1);
});

for (const [label, models] of [['missing', undefined], ['empty', []], ['duplicate', ['NVIDIA A100', 'NVIDIA A100']]]) {
  test(`multi-GPU rejects ${label} compatible models before target execution`, async () => {
    const { createHandler } = require(entry);
    let calls = 0;
    const handle = createHandler(async (_target, request) => { calls++; return request; });
    await handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } } });
    const multi = { sharding_supported: true, gpu_count: 2, memory_mib_per_gpu: [70000, 70000] };
    if (models !== undefined) multi.compatible_models = models;
    const response = await handle({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'gpu_submit', arguments: {
      target: { root: '/project', python: '/env/bin/python' }, queue_id: 'q',
      job: { job_id: 'j', command: ['/env/bin/python', 'train.py'], cwd: '/project', memory_mib: 140000, max_runtime_seconds: null, multi_gpu: multi }
    } } });
    assert.equal(response.error?.code, -32602);
    assert.match(response.error.message, /compatible_models/);
    assert.equal(calls, 0);
  });
}

test('multi-GPU passes an explicit compatible model set to the target', async () => {
  const { createHandler } = require(entry);
  let calls = 0;
  const handle = createHandler(async (_target, request) => { calls++; return request; });
  await handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } } });
  const multi = { sharding_supported: true, gpu_count: 2, memory_mib_per_gpu: [70000, 70000], compatible_models: ['NVIDIA A100', 'NVIDIA H100'] };
  const response = await handle({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'gpu_submit', arguments: {
    target: { root: '/project', python: '/env/bin/python' }, queue_id: 'q',
    job: { job_id: 'j', command: ['/env/bin/python', 'train.py'], cwd: '/project', memory_mib: 140000, max_runtime_seconds: null, multi_gpu: multi }
  } } });
  assert.equal(response.result.isError, false);
  assert.deepEqual(response.result.structuredContent.job.multi_gpu, multi);
  assert.equal(calls, 1);
});

test('invalid JSON and oversized frames do not corrupt stdio or start tasks', () => {
  for (const input of ['{bad}\n', 'x'.repeat(1024 * 1024 + 1) + '\n']) {
    const result = childProcess.spawnSync(process.execPath, [entry], { input, encoding: 'utf8', timeout: 5000, maxBuffer: 2 * 1024 * 1024 });
    assert.equal(result.status, 0, result.stderr);
    const response = JSON.parse(result.stdout.trim());
    assert.equal(response.error.code, -32700);
  }
});

test('invalid JSON-RPC ids are not reflected as invalid response ids', async () => {
  const { createHandler } = require(entry);
  const handle = createHandler();
  for (const id of [{ nested: true }, [], true]) {
    const response = await handle({ jsonrpc: '2.0', id, method: 'ping' });
    assert.equal(response.error.code, -32600);
    assert.equal(response.id, null);
  }
});
