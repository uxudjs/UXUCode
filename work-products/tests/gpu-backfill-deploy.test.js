const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { test } = require('node:test');
const { spawn, spawnSync } = require('node:child_process');
const transport = require('../../Codex/mcp/GPUBackfill/transport.js');

const target = { host: 'research@training-host', root: '/srv/project with spaces', python: '/srv/env/bin/python' };

test('target rejects shell options, traversal and Windows execution roots', () => {
  assert.deepEqual(transport.validateTarget(target), target);
  for (const bad of [
    { ...target, host: '-oProxyCommand=bad' },
    { ...target, host: 'host; touch /tmp/bad' },
    { ...target, root: '/srv/../other' },
    { ...target, root: 'C:\\project' },
    { ...target, python: 'python3' },
    { ...target, extra: true }
  ]) assert.throws(() => transport.validateTarget(bad));
});

test('SSH launch keeps user data out of the command and enforces known host keys', () => {
  const launch = transport.buildLaunch(target, 'print("bootstrap")', 'win32');
  assert.equal(launch.command, 'ssh');
  assert.ok(launch.args.includes('StrictHostKeyChecking=yes'));
  assert.ok(launch.args.includes('BatchMode=yes'));
  assert.equal(launch.args.at(-2), target.host);
  assert.ok(!launch.args.at(-1).includes(target.root));
  assert.ok(launch.args.at(-1).startsWith("'/srv/env/bin/python' -I -B -c '"));
  assert.throws(() => transport.buildLaunch({ root: '/srv/project', python: '/usr/bin/python3' }, '', 'win32'), /Linux|SSH/);
});

test('bundle identity binds both fixed runtime files, in stable filename order', () => {
  const files = { 'worker.py': 'def dispatch(request, release_dir=None): return {}\n', 'checkpoint.py': '# checkpoint\n' };
  const result = transport.bundleIdentity(files);
  const expected = crypto.createHash('sha256');
  for (const name of Object.keys(files).sort()) expected.update(name + '\0').update(files[name]).update('\0');
  assert.equal(result, expected.digest('hex'));
  assert.throws(() => transport.bundleIdentity({ ...files, '../escape.py': 'bad' }));
});

function fakeSpawn(output, capture) {
  return (command, args, options) => {
    capture.command = command; capture.args = args; capture.options = options;
    const child = new EventEmitter();
    child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough();
    child.kill = () => { capture.killed = true; };
    let input = '';
    child.stdin.on('data', value => { input += value; });
    child.stdin.on('finish', () => {
      capture.payload = JSON.parse(input);
      queueMicrotask(() => { child.stdout.write(output); child.stdout.end(); child.emit('close', 0); });
    });
    return child;
  };
}

test('invoke sends JSON on stdin, ignores request root override and parses one result', async () => {
  const captured = {};
  const files = { 'checkpoint.py': '# helper\n', 'worker.py': '# worker\n' };
  const result = await transport.invoke(target, { action: 'status', root: '/outside', job_id: 'job-1' }, {
    spawn: fakeSpawn('{"ok":true}\n', captured), files, bootstrap: '# trusted bootstrap'
  });
  assert.deepEqual(result, { ok: true });
  assert.equal(captured.payload.request.root, target.root);
  assert.equal(captured.options.shell, false);
  assert.equal(captured.payload.request.action, 'status');
  assert.equal(captured.payload.release_id, transport.bundleIdentity(files));
});

test('invoke reports bootstrap errors and rejects unknown actions before spawning', async () => {
  const captured = {};
  const options = { spawn: fakeSpawn('{"error":"deployment conflict"}\n', captured), files: { 'checkpoint.py': '', 'worker.py': '' }, bootstrap: '' };
  await assert.rejects(transport.invoke(target, { action: 'prepare' }, options), /deployment conflict/);
  await assert.rejects(transport.invoke(target, { action: 'execute_shell' }, options), /action/);
});

const repo = path.resolve(__dirname, '../..');
const temporaryRoot = path.join(__dirname, '.tmp');
const bootstrapSource = fs.readFileSync(path.join(repo, 'Codex/mcp/GPUBackfill/bootstrap.py'), 'utf8');

function linuxPath(value) {
  return process.platform === 'win32' ? '/mnt/' + value[0].toLowerCase() + value.slice(2).replaceAll('\\', '/') : value;
}

function runPython(source, input, timeout = 10000) {
  const interpreter = linuxPath(path.join(repo, '.venv/bin/python'));
  const command = process.platform === 'win32' ? path.join(process.env.SystemRoot, 'System32/wsl.exe') : interpreter;
  const prefix = process.platform === 'win32' ? ['-d', 'Ubuntu', '--exec', interpreter] : [];
  return spawnSync(command, [...prefix, '-I', '-B', '-c', source], {
    input, encoding: 'utf8', timeout, windowsHide: true, shell: false
  });
}

const linuxReady = ['win32', 'linux'].includes(process.platform) && runPython('import sys; print(sys.version_info.major)', '').status === 0;
const linuxOnly = { skip: linuxReady ? false : 'Repository Linux .venv is unavailable; no global Python fallback' };

test('Linux regressions cover the four GPUBackfill review fixes', { ...linuxOnly, timeout: 120000 }, () => {
  const suite = linuxPath(path.join(__dirname, 'gpu-backfill-review-fixes.py'));
  const result = runPython('import runpy,sys; sys.argv=[sys.stdin.read()]; runpy.run_path(sys.argv[0],run_name="__main__")', suite, 110000);
  assert.equal(result.error, undefined, result.error && result.error.message);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

function runtime(version = 1) {
  return {
    'checkpoint.py': '# test checkpoint module\n',
    'worker.py': 'VERSION = ' + version + '\ndef dispatch(request, release_dir=None):\n    return {"action": request["action"], "release_dir": release_dir, "version": VERSION}\n'
  };
}

function fixture() {
  fs.mkdirSync(temporaryRoot, { recursive: true });
  const directory = fs.mkdtempSync(path.join(temporaryRoot, 'gpu-backfill-deploy-'));
  return { directory, root: linuxPath(directory) };
}

function rpc(fixture, action, files = runtime(), overrides = {}) {
  const envelope = { request: { action, root: fixture.root }, files, release_id: transport.bundleIdentity(files), ...overrides };
  const result = runPython(bootstrapSource, JSON.stringify(envelope));
  assert.equal(result.error, undefined, result.error && result.error.message);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('Linux bootstrap probe and status do not create the remote runtime directory', linuxOnly, () => {
  const item = fixture();
  assert.deepEqual(rpc(item, 'probe'), { action: 'probe', release_dir: null, version: 1 });
  assert.deepEqual(rpc(item, 'status'), { action: 'status', release_dir: null, version: 1 });
  assert.equal(fs.existsSync(path.join(item.directory, '.gpubackfill')), false);
});

test('Linux release preparation is idempotent and an update preserves old code and state', linuxOnly, () => {
  const item = fixture();
  const first = rpc(item, 'prepare');
  assert.equal(first.updated, true);
  assert.equal(rpc(item, 'prepare').updated, false);
  const state = path.join(item.directory, '.gpubackfill');
  fs.mkdirSync(path.join(state, 'jobs'));
  fs.writeFileSync(path.join(state, 'jobs/sentinel.json'), '{"keep":true}');
  const second = rpc(item, 'create_queue', runtime(2));
  assert.equal(second.version, 2);
  const current = JSON.parse(fs.readFileSync(path.join(state, 'current.json'), 'utf8'));
  assert.equal(current.release_id, transport.bundleIdentity(runtime(2)));
  assert.equal(fs.readFileSync(path.join(state, 'releases', first.release_id, 'worker.py'), 'utf8'), runtime()['worker.py']);
  assert.equal(fs.readFileSync(path.join(state, 'jobs/sentinel.json'), 'utf8'), '{"keep":true}');
});

test('Linux bootstrap rejects upload tampering before creating any state', linuxOnly, () => {
  const item = fixture();
  const result = rpc(item, 'prepare', runtime(), { release_id: '0'.repeat(64) });
  assert.match(result.error, /integrity mismatch/);
  assert.equal(fs.existsSync(path.join(item.directory, '.gpubackfill')), false);
});

test('Linux deployment preserves CRLF source bytes across upload and version verification', linuxOnly, () => {
  const item = fixture();
  const files = Object.fromEntries(Object.entries(runtime()).map(([name, value]) => [name, value.replaceAll('\n', '\r\n')]));
  const first = rpc(item, 'prepare', files);
  assert.equal(first.error, undefined, first.error);
  assert.equal(first.release_id, transport.bundleIdentity(files));
  for (const [name, value] of Object.entries(files)) {
    assert.equal(fs.readFileSync(path.join(item.directory, '.gpubackfill/releases', first.release_id, name), 'utf8'), value);
  }
  assert.equal(rpc(item, 'prepare', files).updated, false);
});

test('Linux bootstrap refuses a damaged active release without overwriting or switching it', linuxOnly, () => {
  const item = fixture();
  const first = rpc(item, 'prepare');
  const state = path.join(item.directory, '.gpubackfill');
  fs.writeFileSync(path.join(state, 'releases', first.release_id, 'worker.py'), '# externally changed\n');
  assert.match(rpc(item, 'prepare', runtime(2)).error, /damaged/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(state, 'current.json'), 'utf8')).release_id, first.release_id);
  assert.equal(fs.existsSync(path.join(state, 'releases', transport.bundleIdentity(runtime(2)))), false);
});

test('Linux bootstrap rejects unknown state ownership and symbolic-link roots', linuxOnly, () => {
  const item = fixture();
  fs.mkdirSync(path.join(item.directory, '.gpubackfill'));
  fs.writeFileSync(path.join(item.directory, '.gpubackfill/unknown'), 'do not overwrite');
  assert.ok(rpc(item, 'prepare').error);
  assert.equal(fs.readFileSync(path.join(item.directory, '.gpubackfill/unknown'), 'utf8'), 'do not overwrite');
  const parent = fixture();
  const targetDirectory = path.join(parent.directory, 'target');
  const linkDirectory = path.join(parent.directory, 'linked');
  fs.mkdirSync(targetDirectory);
  const setup = runPython('import os,sys,json; a=json.load(sys.stdin); os.symlink(a[0],a[1])', JSON.stringify([linuxPath(targetDirectory), linuxPath(linkDirectory)]));
  assert.equal(setup.status, 0, setup.stderr);
  assert.match(rpc({ root: linuxPath(linkDirectory) }, 'prepare').error, /symbolic link/);
  assert.equal(fs.existsSync(path.join(targetDirectory, '.gpubackfill')), false);
});

test('Linux staging self-check failure never activates the new release', linuxOnly, () => {
  const item = fixture();
  const first = rpc(item, 'prepare');
  const broken = { ...runtime(2), 'worker.py': 'raise RuntimeError("self-check failure")\n' };
  assert.match(rpc(item, 'prepare', broken).error, /self-check failure/);
  const state = path.join(item.directory, '.gpubackfill');
  assert.equal(JSON.parse(fs.readFileSync(path.join(state, 'current.json'), 'utf8')).release_id, first.release_id);
  assert.equal(fs.existsSync(path.join(state, 'releases', transport.bundleIdentity(broken))), false);
});

test('real Linux bundle survives control disconnect and enforces pause and scoped cancellation', {
  ...linuxOnly, timeout: 60000
}, async () => {
  const item = fixture();
  const binaryDirectory = path.join(item.directory, 'bin');
  fs.mkdirSync(binaryDirectory);
  const smi = path.join(binaryDirectory, 'nvidia-smi');
  fs.writeFileSync(smi, '#!/bin/sh\ncase "$*" in\n' +
    '  *--query-gpu=*) printf "%s\\n" "0, GPU-11111111-1111-1111-1111-111111111111, NVIDIA RTX 3090, 24576, 24576, 0" "1, GPU-22222222-2222-2222-2222-222222222222, NVIDIA A100, 40960, 40960, 0" ;;\n' +
    '  *--query-compute-apps=*) exit 0 ;;\n  *) exit 2 ;;\nesac\n');
  const chmod = runPython('import os,sys; os.chmod(sys.stdin.read(),0o700)', linuxPath(smi));
  assert.equal(chmod.status, 0, chmod.stderr);
  const interpreter = linuxPath(path.join(repo, '.venv/bin/python'));
  const selected = { root: item.root, python: interpreter };
  const mockedSpawn = (command, args, options) => {
    const mockPath = linuxPath(binaryDirectory) + ':/usr/bin:/bin';
    return process.platform === 'win32'
      ? spawn(path.join(process.env.SystemRoot, 'System32/wsl.exe'), ['-d', 'Ubuntu', '--exec', '/usr/bin/env', 'PATH=' + mockPath, command, ...args], options)
      : spawn(command, args, { ...options, env: { ...process.env, PATH: mockPath } });
  };
  const call = request => transport.invoke(selected, request, { platform: 'linux', spawn: mockedSpawn });
  const terminal = new Set(['completed', 'failed', 'cancelled', 'needs_verification']);
  const jobs = [];
  async function waitFor(jobId, accept, limit = 14000) {
    const deadline = Date.now() + limit;
    let value;
    do {
      const state = await call({ action: 'status', job_id: jobId });
      value = state.jobs.find(job => job.job_id === jobId);
      if (value && accept(value)) return value;
      await new Promise(resolve => setTimeout(resolve, 100));
    } while (Date.now() < deadline);
    throw new Error('Worker did not reach expected state: ' + JSON.stringify(value));
  }
  const stopAware = 'import os,time; from pathlib import Path; stop=Path(os.environ["GPU_BACKFILL_STOP_FILE"]); end=time.monotonic()+12\nwhile time.monotonic()<end and not stop.exists(): time.sleep(0.05)\n';
  function job(jobId, code) {
    return { job_id: jobId, cwd: item.root, command: [interpreter, '-I', '-B', '-c', code], memory_mib: 512,
      max_runtime_seconds: 25, resume: { enabled: false, grace_seconds: 1, max_restarts: 0 } };
  }
  try {
    const probe = await call({ action: 'probe' });
    assert.equal(probe.gpus.length, 2);
    assert.notEqual(probe.gpus[0].name, probe.gpus[1].name);
    assert.equal(fs.existsSync(path.join(item.directory, '.gpubackfill')), false);
    await call({ action: 'prepare' });
    assert.deepEqual(await call({ action: 'status' }), { queues: [], jobs: [] });
    const queue = await call({ action: 'create_queue', queue_id: 'integration', gpu_uuids: probe.gpus.map(card => card.uuid),
      inventory_id: probe.inventory_id, selection_confirmed: true });
    assert.equal(queue.queue.allow_external, true);
    for (const [id, code] of [
      ['cancel-me', stopAware],
      ['keep-running', 'import time; from pathlib import Path; time.sleep(4); Path("completed-marker").write_text("done")']
    ]) {
      const result = await call({ action: 'submit', queue_id: 'integration', job: job(id, code) });
      jobs.push(id);
      assert.equal(result.status, 'queued');
      assert.ok(result.worker_pid > 0);
    }
    // Each invoke has already closed its control process before this state read.
    const running = await waitFor('cancel-me', value => value.status === 'running');
    assert.equal(running.status, 'running');
    await call({ action: 'cancel', job_id: 'cancel-me' });
    assert.equal((await waitFor('cancel-me', value => terminal.has(value.status))).status, 'cancelled');
    const kept = await waitFor('keep-running', value => terminal.has(value.status));
    assert.equal(kept.status, 'completed', JSON.stringify(kept));
    assert.equal(fs.readFileSync(path.join(item.directory, 'completed-marker'), 'utf8'), 'done');
    await call({ action: 'queue_control', queue_id: 'integration', paused: true });
    await call({ action: 'submit', queue_id: 'integration', job: job('paused', 'from pathlib import Path; Path("resumed-marker").write_text("done")') });
    jobs.push('paused');
    await waitFor('paused', value => value.status === 'waiting');
    assert.equal(fs.existsSync(path.join(item.directory, 'resumed-marker')), false);
    await call({ action: 'queue_control', queue_id: 'integration', paused: false });
    const resumed = await waitFor('paused', value => terminal.has(value.status));
    assert.equal(resumed.status, 'completed', JSON.stringify(resumed));
    assert.equal(fs.readFileSync(path.join(item.directory, 'resumed-marker'), 'utf8'), 'done');
  } finally {
    for (const id of jobs) {
      await call({ action: 'cancel', job_id: id }).catch(() => {});
      await waitFor(id, value => terminal.has(value.status), 10000);
    }
  }
});
