#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'THIRD_PARTY_NOTICES.md');
const text = fs.readFileSync(file, 'utf8');
const required = [
  'DietrichGebert/ponytail',
  'JuliusBrussee/caveman',
  'addyosmani/agent-skills',
  'multica-ai/andrej-karpathy-skills',
  'Copyright (c) 2026 DietrichGebert',
  'Copyright (c) 2026 Julius Brussee',
  'Copyright (c) 2025 Addy Osmani',
  'Permission is hereby granted, free of charge',
  'THE SOFTWARE IS PROVIDED "AS IS"'
];
const missing = required.filter((item) => !text.includes(item));
if (!fs.existsSync(path.join(root, 'LICENSE'))) missing.push('root LICENSE');
if (missing.length) { console.error('Third-party notice validation failed: ' + missing.join(', ')); process.exit(1); }
console.log('Third-party notice validation passed.');
