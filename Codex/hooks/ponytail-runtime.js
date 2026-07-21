const fs = require('fs');
const path = require('path');
const os = require('os');

const STATE_FILE = '.ponytail-active';
const stateDir = process.env.PLUGIN_DATA || path.join(os.homedir(), '.codex', 'plugins', 'code-skill-hook');
const statePath = path.join(stateDir, STATE_FILE);

function setMode(mode) {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(statePath, mode);
}

function clearMode() {
  try { fs.unlinkSync(statePath); } catch (_) {}
}

function readMode() {
  try {
    return fs.readFileSync(statePath, 'utf8').trim() || null;
  } catch (_) {
    return null;
  }
}

function writeHookOutput(event, mode, context = '') {
  const output = { systemMessage: `PONYTAIL:${mode.toUpperCase()}` };
  if (context) {
    output.hookSpecificOutput = {
      hookEventName: event,
      additionalContext: context,
    };
  }
  process.stdout.write(JSON.stringify(output));
}

module.exports = { clearMode, readMode, setMode, writeHookOutput };
