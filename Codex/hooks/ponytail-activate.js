#!/usr/bin/env node
// Codex SessionStart hook: persist the active mode in PLUGIN_DATA and inject its rules.

const { getDefaultMode } = require('./ponytail-config');
const { getPonytailInstructions } = require('./ponytail-instructions');
const { clearMode, setMode, writeHookOutput } = require('./ponytail-runtime');

const mode = getDefaultMode();
if (mode === 'off') {
  clearMode();
  writeHookOutput('SessionStart', 'off');
  process.exit(0);
}

try { setMode(mode); } catch (_) {}
try {
  writeHookOutput('SessionStart', mode, getPonytailInstructions(mode));
} catch (_) {
  // Hooks must remain best-effort when stdout closes during session startup.
}
