const evidencePriority = 'Correctness, safety, explicit requirements, and validation evidence outrank compactness.';

const policies = {
  standard: `Use the smallest correct implementation with complete concise output. ${evidencePriority}`,
  lite: `Preserve teaching context and suggest simpler alternatives without changing the requested structure. ${evidencePriority}`,
  full: `Enforce reuse, YAGNI, and minimal maintainable changes with conclusion-first output. ${evidencePriority}`,
  ultra: `Use very short outcome-first output for clear, low-risk work and aggressively remove valueless complexity. ${evidencePriority}`,
  off: 'Correctness, safety, explicit requirements, and validation evidence remain required.'
};
const supportedModes = Object.keys(policies);

const workflowPolicy = 'Plan may proceed without a specification when thorough debug evidence or clear user requirements provide the objective, scope, constraints, and verifiable acceptance criteria; require spec when material ambiguity or risk remains. Create all UXUCode workflow artifacts only under `work-products/`, including test files specifically under `work-products/tests/`. Test artifacts must reference repository files with relative paths from their final location, never machine-specific absolute paths; product source files and final deliverables may use project-native or explicitly requested locations.';

function resolveMode(value) {
  return supportedModes.includes(value) ? value : 'standard';
}

function policyFor(value) {
  return policies[resolveMode(value)];
}

module.exports = { supportedModes, resolveMode, policyFor, workflowPolicy };
