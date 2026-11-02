#!/usr/bin/env node
'use strict';

const { invoke } = require('./transport');

const VERSION = '5.1.1';
const PROTOCOL_VERSION = '2025-11-25';
const MAX_FRAME = 1024 * 1024;
const instructions = 'GPUBackfill runs authorized jobs on Linux NVIDIA GPUs via local execution or SSH. First call gpu_probe, show the GPU inventory, and ask the user to choose specific cards or all listed cards. Never select cards for the user. Only after their answer call gpu_create_queue with explicit UUIDs, inventory_id and selection_confirmed=true. Default external sharing is enabled. Non-checkpoint jobs require an idle exclusive GPU. Multi-GPU requires existing memory-sharding support and explicit compatible GPU models. Updates never authorize training. Use one coordination root per server. Obtain the server, project root, existing absolute Python interpreter, task command and budgets from the user or their authorized project contract. A successful checkpoint integrity check does not prove training-state completeness. Closing a chat leaves submitted jobs running; worker crashes or server reboots require manual review.';

const text = { type: 'string', minLength: 1, maxLength: 8192, pattern: '^[^\u0000]+$' };
const identifier = { type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$' };
const positive = { type: 'integer', minimum: 1 };
const nonnegative = { type: 'integer', minimum: 0 };
const object = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const target = object({ host: text, root: { ...text, pattern: '^/[^\u0000]*$' }, python: { ...text, pattern: '^/[^\u0000]*$' } }, ['root', 'python']);
const job = object({
  job_id: identifier,
  command: { type: 'array', items: text, minItems: 1, maxItems: 256 },
  cwd: { ...text, pattern: '^/[^\u0000]*$' },
  memory_mib: positive,
  max_runtime_seconds: { type: ['number', 'null'], exclusiveMinimum: 0 },
  resume: object({ enabled: { type: 'boolean' }, grace_seconds: positive, max_restarts: nonnegative }, ['enabled']),
  multi_gpu: object({ sharding_supported: { const: true }, gpu_count: { ...positive, minimum: 2 }, memory_mib_per_gpu: { type: 'array', items: positive, minItems: 2 }, compatible_models: { type: 'array', items: text, minItems: 1, uniqueItems: true } }, ['sharding_supported', 'gpu_count', 'memory_mib_per_gpu', 'compatible_models']),
  host_memory_mib: positive,
  disk_free_mib: positive
}, ['job_id', 'command', 'cwd', 'memory_mib', 'max_runtime_seconds']);

const definitions = [
  ['gpu_probe', 'probe', 'Read-only: list all visible NVIDIA GPUs and inventory_id on the specified Linux host. Show this inventory and ask the user which cards to select before creating a queue. This does not upload scripts.', {}, [], true],
  ['gpu_prepare', 'prepare', 'Upload and verify the bundled Linux worker in the selected project, using immutable releases and an atomic active-version pointer. Does not start jobs or restart existing workers.', {}, [], false],
  ['gpu_create_queue', 'create_queue', 'After the user chooses cards, persist a queue bound to their exact GPU UUID set and current inventory_id. Expands neither all-cards nor new hardware automatically. External-task sharing defaults to true. Prepares the bundled worker if needed.', { queue_id: identifier, gpu_uuids: { type: 'array', items: text, minItems: 1, uniqueItems: true }, inventory_id: text, selection_confirmed: { const: true }, allow_external: { type: 'boolean', default: true } }, ['queue_id', 'gpu_uuids', 'inventory_id', 'selection_confirmed'], false],
  ['gpu_submit', 'submit', 'Submit an explicitly authorized argv command with a peak memory budget to an existing queue. Starts a detached Linux worker. No-checkpoint jobs wait for exclusive idle cards. Multi-GPU is only for tasks already supporting memory sharding with explicitly declared compatible models when no selected single card can fit the job.', { queue_id: identifier, job }, ['queue_id', 'job'], false],
  ['gpu_status', 'status', 'Read-only: inspect persistent jobs/queue state. Optional queue_id and job_id filter results. Never restarts or adopts abandoned workers.', { queue_id: identifier, job_id: identifier }, [], true],
  ['gpu_cancel', 'cancel', 'Cancel only the specified GPUBackfill job. A running task receives its own STOP request and may be terminated after its grace period. Never signals external processes and never restarts a cancelled job.', { job_id: identifier }, ['job_id'], false],
  ['gpu_queue_control', 'queue_control', 'Pause or resume admission for an existing queue. Running jobs continue; paused queues start no further attempts until resumed.', { queue_id: identifier, paused: { type: 'boolean' } }, ['queue_id', 'paused'], false]
];
const tools = definitions.map(([name, action, description, properties, required, readOnly]) => ({
  name,
  description,
  inputSchema: object({ target, ...properties }, ['target', ...required]),
  annotations: { title: name, readOnlyHint: readOnly, destructiveHint: action === 'cancel', idempotentHint: action !== 'submit', openWorldHint: true }
}));

function validate(schema, value, location = 'arguments') {
  if (Object.hasOwn(schema, 'const') && value !== schema.const) throw new Error(`${location} must be ${JSON.stringify(schema.const)}`);
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const matches = types.some((type) => type === 'null' ? value === null : type === 'array' ? Array.isArray(value) : type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value) : type === 'integer' ? Number.isSafeInteger(value) : type === 'number' ? typeof value === 'number' && Number.isFinite(value) : typeof value === type);
    if (!matches) throw new Error(`${location} must have type ${types.join(' or ')}`);
  }
  if (typeof value === 'string') {
    if (schema.minLength && value.length < schema.minLength) throw new Error(`${location} is empty`);
    if (schema.maxLength && value.length > schema.maxLength) throw new Error(`${location} is too long`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) throw new Error(`${location} has an invalid format`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) throw new Error(`${location} must be >= ${schema.minimum}`);
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) throw new Error(`${location} must be > ${schema.exclusiveMinimum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) throw new Error(`${location} needs at least ${schema.minItems} items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) throw new Error(`${location} has too many items`);
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) throw new Error(`${location} contains duplicate items`);
    if (schema.items) value.forEach((item, index) => validate(schema.items, item, `${location}[${index}]`));
  } else if (value !== null && typeof value === 'object') {
    for (const required of schema.required || []) if (!Object.hasOwn(value, required)) throw new Error(`${location}.${required} is required`);
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(schema.properties || {}, key)) {
        if (schema.additionalProperties === false) throw new Error(`${location}.${key} is not supported`);
      } else validate(schema.properties[key], value[key], `${location}.${key}`);
    }
  }
}

function createHandler(execute = invoke) {
  let initialized = false;
  return async function handle(message) {
    const rawId = message && Object.hasOwn(message, 'id') ? message.id : null;
    const validId = rawId === null || typeof rawId === 'string' || (typeof rawId === 'number' && Number.isFinite(rawId));
    const id = validId ? rawId : null;
    const error = (code, detail) => ({ jsonrpc: '2.0', id, error: { code, message: detail } });
    if (!message || typeof message !== 'object' || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string' || !validId) return error(-32600, 'Invalid JSON-RPC request');
    if (!Object.hasOwn(message, 'id')) return null;
    if (message.method === 'ping') return { jsonrpc: '2.0', id, result: {} };
    if (message.method === 'initialize') {
      if (initialized) return error(-32600, 'Already initialized');
      if (typeof message.params?.protocolVersion !== 'string' || !message.params.clientInfo || !message.params.capabilities) return error(-32602, 'initialize requires protocolVersion, clientInfo and capabilities');
      initialized = true;
      return { jsonrpc: '2.0', id, result: { protocolVersion: PROTOCOL_VERSION, serverInfo: { name: 'GPUBackfill', version: VERSION }, capabilities: { tools: {} }, instructions } };
    }
    if (!initialized) return error(-32600, 'Initialize GPUBackfill before calling tools');
    if (message.method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools } };
    if (message.method !== 'tools/call') return error(-32601, 'Method not found');
    const index = definitions.findIndex(([name]) => name === message.params?.name);
    if (index < 0) return error(-32602, 'Unknown GPUBackfill tool');
    const args = message.params.arguments || {};
    try { validate(tools[index].inputSchema, args); } catch (failure) { return error(-32602, failure.message); }
    const { target: destination, ...request } = args;
    try {
      const result = await execute(destination, { ...request, action: definitions[index][1] });
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result, isError: false } };
    } catch (failure) {
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: failure.message }], isError: true } };
    }
  };
}

function serve(input = process.stdin, output = process.stdout) {
  const handle = createHandler();
  let pending = Promise.resolve();
  let buffer = '';
  let discarding = false;
  const send = (message) => { if (message) output.write(JSON.stringify(message) + '\n'); };
  const parseError = () => send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid or oversized JSON frame' } });
  const enqueue = (line) => {
    if (!line.trim()) return;
    pending = pending.then(async () => {
      let message;
      try { message = JSON.parse(line); } catch { parseError(); return; }
      send(await handle(message));
    }).catch((failure) => { process.stderr.write(`GPUBackfill: ${failure.message}\n`); });
  };
  input.setEncoding('utf8');
  input.on('data', (chunk) => {
    for (const part of chunk.match(/[^\n]*\n|[^\n]+$/g) || []) {
      const complete = part.endsWith('\n');
      if (!discarding) {
        buffer += complete ? part.slice(0, -1) : part;
        if (Buffer.byteLength(buffer) > MAX_FRAME) { buffer = ''; discarding = true; pending = pending.then(parseError); }
      }
      if (complete) { if (!discarding) enqueue(buffer); buffer = ''; discarding = false; }
    }
  });
  input.on('end', () => { if (buffer && !discarding) enqueue(buffer); });
  return () => pending;
}

if (require.main === module) serve();
module.exports = { createHandler, tools, validate, serve };
