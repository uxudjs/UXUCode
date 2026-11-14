const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createHandler } = require('../../Codex/mcp/GPUBackfill/server');

async function session() {
  const seen = [];
  const handle = createHandler(async (_target, request) => { seen.push(request); return request; });
  await handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
    protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'disk-test', version: '1' }
  } });
  const job = { job_id: 'disk', command: ['/env/bin/python', 'task.py'], cwd: '/project',
    memory_mib: 1024, max_runtime_seconds: null };
  const submit = (value) => handle({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: {
    name: 'gpu_submit', arguments: { target: { root: '/project', python: '/env/bin/python' }, queue_id: 'q', job: value }
  } });
  return { seen, job, submit };
}

test('submission requires a task-specific disk contract without a hidden default', async () => {
  const { seen, job, submit } = await session();
  assert.equal((await submit(job)).error?.code, -32602);
  assert.equal(seen.length, 0);
});

test('small and large disk needs pass through unchanged and legacy thresholds are rejected', async () => {
  const { seen, job, submit } = await session();
  for (const growth_mib of [512, 32768]) {
    const disk = { paths: ['/project/output'], growth_mib, checkpoint_mib: 256, safety_mib: 128 };
    assert.deepEqual((await submit({ ...job, disk })).result?.structuredContent.job.disk, disk);
  }
  assert.equal((await submit({ ...job, disk_free_mib: 12288 })).error?.code, -32602);
  assert.equal(seen.length, 2);
});

test('invalid disk contracts never reach the target', async () => {
  const { seen, job, submit } = await session();
  const good = { paths: ['/project/output'], growth_mib: 512, checkpoint_mib: 256, safety_mib: 128 };
  for (const change of [{ paths: [] }, { paths: ['relative'] }, { paths: ['/project/out', '/project/out'] },
    { growth_mib: -1 }, { growth_mib: true }, { checkpoint_mib: 0.5 }, { safety_mib: NaN }, { extra: 1 }]) {
    assert.equal((await submit({ ...job, disk: { ...good, ...change } })).error?.code, -32602);
  }
  assert.equal(seen.length, 0);
});
