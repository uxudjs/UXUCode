const supportedModes = ['standard', 'lite', 'full', 'ultra', 'off'];

const policies = {
  standard: 'Use the smallest correct implementation with complete concise output. Correctness, safety, explicit requirements, and validation evidence outrank compactness.',
  lite: 'Preserve teaching context and suggest simpler alternatives without changing the requested structure. Correctness, safety, explicit requirements, and validation evidence outrank compactness.',
  full: 'Enforce reuse, YAGNI, and minimal maintainable changes with conclusion-first output. Correctness, safety, explicit requirements, and validation evidence outrank compactness.',
  ultra: 'Use very short outcome-first output for clear, low-risk work and aggressively remove valueless complexity. Correctness, safety, explicit requirements, and validation evidence outrank compactness.',
  off: 'Correctness, safety, explicit requirements, and validation evidence remain required.'
};

function resolveMode(value) {
  return supportedModes.includes(value) ? value : 'standard';
}

function policyFor(value) {
  return policies[resolveMode(value)];
}

module.exports = { supportedModes, resolveMode, policyFor };
