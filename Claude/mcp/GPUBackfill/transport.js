'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const childProcess = require('node:child_process');

const ACTIONS = new Set(['probe', 'prepare', 'create_queue', 'submit', 'status', 'cancel', 'queue_control']);
const FILES = ['checkpoint.py', 'worker.py'];
const MAX_OUTPUT = 4 * 1024 * 1024;

function linuxPath(value, name) {
  if (typeof value !== 'string' || value === '/' || !value.startsWith('/') ||
      /[\\\x00-\x1f\x7f]/.test(value) || path.posix.normalize(value) !== value) {
    throw new Error(`${name} must be a normalized absolute Linux path`);
  }
}

function validateTarget(target) {
  if (!target || typeof target !== 'object' || Array.isArray(target) ||
      Object.keys(target).some(key => !['host', 'root', 'python'].includes(key))) {
    throw new Error('target must contain only host, root and python');
  }
  linuxPath(target.root, 'target.root');
  linuxPath(target.python, 'target.python');
  if (target.host !== undefined && (typeof target.host !== 'string' ||
      !/^(?:[A-Za-z0-9_][A-Za-z0-9_.-]*@)?[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(target.host))) {
    throw new Error('target.host must be an SSH alias or user@hostname, without options');
  }
  return { ...(target.host === undefined ? {} : { host: target.host }), root: target.root, python: target.python };
}

function quote(value) {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

function buildLaunch(target, bootstrap, platform = process.platform) {
  target = validateTarget(target);
  if (target.host) {
    return {
      command: 'ssh',
      args: ['-T', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', '-o', 'StrictHostKeyChecking=yes',
        '--', target.host, `${quote(target.python)} -I -B -c ${quote(bootstrap)}`]
    };
  }
  if (platform !== 'linux') throw new Error('Local GPU execution requires Linux; provide an SSH target');
  return { command: target.python, args: ['-I', '-B', '-c', bootstrap] };
}

function bundleIdentity(files) {
  if (!files || Object.keys(files).sort().join(',') !== FILES.join(',') ||
      FILES.some(name => typeof files[name] !== 'string')) throw new Error('Invalid GPUBackfill runtime file set');
  const hash = crypto.createHash('sha256');
  for (const name of FILES) hash.update(name + '\0').update(files[name], 'utf8').update('\0');
  return hash.digest('hex');
}

function loadBundle() {
  return Object.fromEntries(FILES.map(name => [name, fs.readFileSync(path.join(__dirname, name), 'utf8')]));
}

async function invoke(target, request, options = {}) {
  target = validateTarget(target);
  if (!request || typeof request !== 'object' || Array.isArray(request) || !ACTIONS.has(request.action)) {
    throw new Error('Unknown GPUBackfill action');
  }
  const files = options.files || loadBundle();
  const bootstrap = options.bootstrap === undefined ? fs.readFileSync(path.join(__dirname, 'bootstrap.py'), 'utf8') : options.bootstrap;
  const launch = buildLaunch(target, bootstrap, options.platform || process.platform);
  const payload = JSON.stringify({ request: { ...request, root: target.root }, files, release_id: bundleIdentity(files) });
  if (Buffer.byteLength(payload) > MAX_OUTPUT) throw new Error('GPUBackfill request is too large');
  return new Promise((resolve, reject) => {
    let done = false;
    let stdout = '';
    let stderr = '';
    let outputBytes = 0;
    let timer;
    let child;
    const finish = (error, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (error) reject(error); else resolve(value);
    };
    try {
      child = (options.spawn || childProcess.spawn)(launch.command, launch.args, {
        shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (error) { finish(error); return; }
    timer = setTimeout(() => {
      child.kill();
      finish(new Error('GPUBackfill control request timed out; inspect status before retrying a mutation'));
    }, options.timeoutMs || 30000);
    child.on('error', error => finish(new Error(`GPUBackfill transport failed: ${error.message}`)));
    child.stdin.on('error', error => finish(new Error(`GPUBackfill input failed: ${error.message}`)));
    for (const [stream, name] of [[child.stdout, 'stdout'], [child.stderr, 'stderr']]) {
      stream.setEncoding('utf8');
      stream.on('data', chunk => {
        outputBytes += Buffer.byteLength(chunk);
        if (outputBytes > MAX_OUTPUT) {
          child.kill();
          finish(new Error('GPUBackfill output exceeded 4 MiB'));
        } else if (name === 'stdout') stdout += chunk;
        else stderr = (stderr + chunk).slice(-8192);
      });
    }
    child.on('close', (code, signal) => {
      if (done) return;
      if (code !== 0) {
        finish(new Error(`GPUBackfill transport exited ${code === null ? signal : code}${stderr.trim() ? ': ' + stderr.trim() : ''}`));
        return;
      }
      try {
        const result = JSON.parse(stdout);
        if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Expected an object');
        if (result.error) throw new Error(typeof result.error === 'string' ? result.error : JSON.stringify(result.error));
        finish(null, result);
      } catch (error) { finish(new Error(`GPUBackfill response: ${error.message}`)); }
    });
    child.stdin.end(payload);
  });
}

module.exports = { validateTarget, buildLaunch, bundleIdentity, loadBundle, invoke };
