const fs = require('fs');
const os = require('os');
const path = require('path');

const configPath = process.platform === 'win32' && process.env.APPDATA
  ? path.join(process.env.APPDATA, 'uxucode', 'config.json')
  : path.join(os.homedir(), '.config', 'uxucode', 'config.json');
const statePath = path.join(process.cwd(), '.uxucode-state.json');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
  catch { return {}; }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

module.exports = {
  readConfig: () => readJson(configPath),
  readState: () => readJson(statePath),
  writeConfig: (value) => writeJson(configPath, value),
  writeState: (value) => writeJson(statePath, value)
};
