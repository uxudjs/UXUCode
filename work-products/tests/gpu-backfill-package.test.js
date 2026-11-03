'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const childProcess = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const files = ['server.js', 'transport.js', 'bootstrap.py', 'worker.py', 'checkpoint.py'];
const hosts = [
  { name: 'Codex', manifest: '.codex-plugin/plugin.json', entry: './mcp/GPUBackfill/server.js', cwd: './' },
  { name: 'Claude', manifest: '.claude-plugin/plugin.json', entry: '${CLAUDE_PLUGIN_ROOT}/mcp/GPUBackfill/server.js', cwd: '${CLAUDE_PLUGIN_ROOT}' }
];
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

for (const host of hosts) {
  test(`${host.name} distributes GPUBackfill inside its own plugin root`, () => {
    const pluginRoot = path.join(root, host.name);
    const manifest = readJson(path.join(pluginRoot, host.manifest));
    assert.equal(manifest.version, '5.1.2');
    assert.equal(manifest.mcpServers, './.mcp.json');
    const configuration = readJson(path.join(pluginRoot, '.mcp.json'));
    assert.deepEqual(Object.keys(configuration.mcpServers), ['GPUBackfill']);
    const server = configuration.mcpServers.GPUBackfill;
    assert.equal(server.type, 'stdio');
    assert.equal(server.command, 'node');
    assert.deepEqual(server.args, [host.entry]);
    assert.equal(server.cwd, host.cwd);
    const entry = path.resolve(pluginRoot, server.args[0].replace('${CLAUDE_PLUGIN_ROOT}', pluginRoot));
    assert.equal(entry, path.join(pluginRoot, 'mcp/GPUBackfill/server.js'));
    for (const file of files) {
      const stat = fs.lstatSync(path.join(pluginRoot, 'mcp/GPUBackfill', file));
      assert.ok(stat.isFile() && !stat.isSymbolicLink(), `${file} must be packaged as a regular file`);
    }
  });
}

test('both hosts distribute the same complete GPUBackfill runtime', () => {
  for (const host of hosts) {
    assert.deepEqual(fs.readdirSync(path.join(root, host.name, 'mcp/GPUBackfill')).sort(), [...files].sort());
  }
  for (const file of files) {
    assert.ok(fs.readFileSync(path.join(root, 'Codex/mcp/GPUBackfill', file)).equals(
      fs.readFileSync(path.join(root, 'Claude/mcp/GPUBackfill', file))
    ), `${file} differs between host packages`);
  }
  assert.equal(readJson(path.join(root, 'Claude/.claude-plugin/marketplace.json')).plugins[0].version, '5.1.2');
});

test('source validation ignores generated runtimes while still rejecting forbidden product entries', () => {
  const temporaryRoot = path.join(__dirname, '.tmp');
  fs.mkdirSync(temporaryRoot, { recursive: true });
  const fixture = fs.mkdtempSync(path.join(temporaryRoot, 'gpu-backfill-scan-'));
  assert.equal(path.dirname(fixture), temporaryRoot);
  const write = (relative, bytes) => {
    const absolute = path.join(fixture, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, bytes);
  };
  try {
    write('scripts/validate-no-legacy-commands.js', fs.readFileSync(path.join(root, 'scripts/validate-no-legacy-commands.js')));
    for (const host of ['Claude', 'Codex']) {
      for (const name of ['hook-state.js', 'hooks.json', 'mode-policy.js', 'uxu-prompt-router.js', 'uxu-session-start.js', 'uxu-statusline.js', 'uxu-subagent-start.js']) write(`${host}/hooks/${name}`, '');
    }
    const forbidden = Buffer.from('QGJ1aWxkIGFsbA==', 'base64').toString('utf8');
    write('.venv/runtime.txt', forbidden);
    write('.codegraph/cache.txt', forbidden);
    const run = () => childProcess.spawnSync(process.execPath, [path.join(fixture, 'scripts/validate-no-legacy-commands.js')], { encoding: 'utf8' });
    let result = run();
    assert.equal(result.status, 0, result.stderr);
    write('Codex/product.txt', forbidden);
    result = run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Codex\/product.txt/);
  } finally {
    assert.equal(path.dirname(path.resolve(fixture)), path.resolve(temporaryRoot));
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
