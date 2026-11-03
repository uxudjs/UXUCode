'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { spawn, spawnSync } = require('node:child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const binary = process.env.UXUCODE_CODEX_BINARY;

test('native Codex loads the installed GPUBackfill manifest and discovers its tools', {
  skip: !binary && 'set UXUCODE_CODEX_BINARY to the exact native Codex executable',
  timeout: 60000
}, async () => {
  assert.ok(path.isAbsolute(binary), 'use the exact native executable, not a shell shim');
  const temporaryRoot = path.join(__dirname, '.tmp');
  fs.mkdirSync(temporaryRoot, { recursive: true });
  const relative = path.relative(fs.realpathSync(root), fs.realpathSync(temporaryRoot));
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
  const fixture = fs.mkdtempSync(path.join(temporaryRoot, 'gpu-backfill 中文 launch '));
  const plugin = path.join(fixture, 'plugin');
  const codexHome = path.join(fixture, 'home');
  let child;
  let nextId = 0;
  let stderr = '';
  const pending = new Map();
  const call = (method, params) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out: ${stderr}`)); }, 20000);
    pending.set(id, { resolve, reject, timer });
    child.stdin.write(JSON.stringify({ id, method, params }) + '\n');
  });
  try {
    fs.cpSync(path.join(root, 'Codex'), plugin, { recursive: true });
    fs.mkdirSync(codexHome);
    fs.writeFileSync(path.join(codexHome, 'config.toml'),
      `[marketplaces.uxu-code-codex]\nsource_type = "local"\nsource = ${JSON.stringify(plugin.replace(/\\/g, '/'))}\n\n[plugins."uxu-code@uxu-code-codex"]\nenabled = true\n`);
    const env = { ...process.env, CODEX_HOME: codexHome };
    const installed = spawnSync(binary, ['plugin', 'add', 'uxu-code@uxu-code-codex', '--json'], {
      cwd: fixture, env, encoding: 'utf8', windowsHide: true, timeout: 20000
    });
    assert.equal(installed.status, 0, installed.stderr || installed.error?.message);
    const receipt = JSON.parse(installed.stdout);
    assert.equal(receipt.pluginId, 'uxu-code@uxu-code-codex');
    const cached = path.relative(codexHome, receipt.installedPath);
    assert.ok(cached && !cached.startsWith('..') && !path.isAbsolute(cached));
    assert.deepEqual(fs.readFileSync(path.join(receipt.installedPath, '.mcp.json')),
      fs.readFileSync(path.join(plugin, '.mcp.json')));
    child = spawn(binary, ['app-server', '--stdio'], { cwd: fixture, env, windowsHide: true });
    child.stderr.on('data', data => { stderr = (stderr + data.toString()).slice(-8000); });
    const rejectPending = error => {
      for (const request of pending.values()) { clearTimeout(request.timer); request.reject(error); }
      pending.clear();
    };
    child.on('error', rejectPending);
    child.on('exit', code => rejectPending(new Error(`native host exited ${code}: ${stderr}`)));
    readline.createInterface({ input: child.stdout }).on('line', line => {
      let message;
      try { message = JSON.parse(line); } catch { return; }
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.reject(new Error(JSON.stringify(message.error)));
      else request.resolve(message.result);
    });
    const initialized = await call('initialize', {
      clientInfo: { name: 'uxucode-native-launch-test', version: '1.0.0' },
      capabilities: { experimentalApi: true }
    });
    assert.equal(fs.realpathSync(initialized.codexHome), fs.realpathSync(codexHome));
    child.stdin.write(JSON.stringify({ method: 'initialized' }) + '\n');
    const status = await call('mcpServerStatus/list', { serverName: 'GPUBackfill', detail: 'full' });
    const gpu = status.data.find(server => server.name === 'GPUBackfill');
    assert.ok(gpu, 'native host must discover the installed plugin MCP');
    assert.equal(gpu.pluginId, receipt.pluginId);
    assert.equal(gpu.toolsError, null);
    assert.equal(gpu.serverInfo.name, 'GPUBackfill');
    assert.equal(gpu.serverInfo.version, receipt.version);
    assert.deepEqual(Object.keys(gpu.tools).sort(), [
      'gpu_cancel', 'gpu_create_queue', 'gpu_prepare', 'gpu_probe',
      'gpu_queue_control', 'gpu_status', 'gpu_submit'
    ]);
  } finally {
    for (const request of pending.values()) clearTimeout(request.timer);
    if (child && child.exitCode === null) {
      child.stdin.end();
      await new Promise(resolve => {
        const timer = setTimeout(() => child.kill(), 3000);
        child.once('close', () => { clearTimeout(timer); resolve(); });
      });
    }
    assert.equal(path.dirname(fs.realpathSync(fixture)), fs.realpathSync(temporaryRoot));
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
