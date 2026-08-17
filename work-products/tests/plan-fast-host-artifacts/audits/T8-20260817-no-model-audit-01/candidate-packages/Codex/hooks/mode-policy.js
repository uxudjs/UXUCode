const evidencePriority = 'Correctness, safety, explicit requirements, and validation evidence outrank compactness.';

const policies = {
  standard: `Use the smallest correct implementation with complete concise output. ${evidencePriority}`,
  lite: `Preserve teaching context and suggest simpler alternatives without changing the requested structure. ${evidencePriority}`,
  full: `Enforce reuse, YAGNI, and minimal maintainable changes with conclusion-first output. ${evidencePriority}`,
  ultra: `Use very short outcome-first output for clear, low-risk work and aggressively remove valueless complexity. ${evidencePriority}`,
  off: 'Correctness, safety, explicit requirements, and validation evidence remain required.'
};
const supportedModes = Object.keys(policies);

const environmentPolicy = 'Honor the project environment contract first and reuse its local toolchain. For Python with no other project contract, use the repository-root `.venv/` and its exact interpreter. Never use a silent global fallback. A build, fix, test, or setup request may authorize a required repository-local environment change; read-only requests must not create environments or install dependencies. Any environment change outside the repository requires explicit authorization after naming the exact command, target, reason, impact, verification, and rollback. Stop when safe creation or repair is impossible, ownership conflicts, or the environment boundary is unclear.';
const workflowPolicy = `Plan may proceed without a specification when thorough debug evidence or clear user requirements provide the objective, scope, constraints, and verifiable acceptance criteria; require spec when material ambiguity or risk remains. Create all UXUCode workflow artifacts only under \`work-products/\`, including test files specifically under \`work-products/tests/\`. Test artifacts must reference repository files with relative paths from their final location, never machine-specific absolute paths; product source files and final deliverables may use project-native or explicitly requested locations. ${environmentPolicy}`;

function resolveMode(value) {
  return supportedModes.includes(value) ? value : 'standard';
}

function policyFor(value) {
  return policies[resolveMode(value)];
}

module.exports = { supportedModes, resolveMode, policyFor, environmentPolicy, workflowPolicy };
