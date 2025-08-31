/** @type {import('@stryker-mutator/api/core').StrykerOptions} */
module.exports = {
  mutate: ['src/lib/utils/error-handling.ts'],
  testRunner: 'vitest',
  vitest: {
    configFile: 'vitest.config.ts'
  },
  reporters: ['clear-text', 'progress'],
  coverageAnalysis: 'perTest'
};
