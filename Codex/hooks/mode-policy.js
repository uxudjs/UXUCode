const evidencePriority = 'Correctness, safety, explicit requirements, and validation evidence outrank compactness.';

const policies = {
  standard: `Use the smallest correct implementation with complete concise output. ${evidencePriority}`,
  lite: `Preserve teaching context and suggest simpler alternatives without changing the requested structure. ${evidencePriority}`,
  full: `Enforce reuse, YAGNI, and minimal maintainable changes with conclusion-first output. ${evidencePriority}`,
  ultra: `Use very short outcome-first output for clear, low-risk work and aggressively remove valueless complexity. ${evidencePriority}`,
  off: 'Correctness, safety, explicit requirements, and validation evidence remain required.'
};
const supportedModes = Object.keys(policies);

const environmentPolicy = 'Follow the project environment contract. Reuse its toolchain. For Python, default to repo-root `.venv/` and its exact interpreter. No silent global fallback. Build/fix/test/setup may authorize required repo-local environment changes. Read-only tasks forbid environment creation and installs. An environment change outside the repository needs explicit authorization after giving exact command, target, why local is unavailable, impact, verification and rollback. Stop on unsafe setup or repair, ownership conflicts or unclear boundaries.';
const workflowPolicy = `Plan from clear requirements or thorough debug evidence with objective, scope, constraints and verifiable acceptance criteria. Require spec for material ambiguity or risk. Keep workflow artifacts only under \`work-products/\`, including test files in \`work-products/tests/\`. Tests reference repo files via relative paths from their final location, never machine-specific absolute paths. Place source and deliverables at native or explicitly requested paths. ${environmentPolicy}`;

function resolveMode(value) {
  return supportedModes.includes(value) ? value : 'standard';
}

function policyFor(value) {
  return policies[resolveMode(value)];
}

module.exports = { supportedModes, resolveMode, policyFor, environmentPolicy, workflowPolicy };
