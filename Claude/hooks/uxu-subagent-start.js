#!/usr/bin/env node

const context = 'Apply UXUCode implementation-policy and output-policy. Stay within the delegated scope, prefer the smallest correct change, and return verification evidence.';
process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: 'SubagentStart', additionalContext: context }
}));
