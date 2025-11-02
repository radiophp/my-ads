const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

const tsConfigPaths = compilerOptions.paths || {};
const filteredPaths = Object.fromEntries(
  Object.entries(tsConfigPaths).filter(([alias]) => alias !== '*'),
);

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.+\\.(spec|e2e-spec)\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: pathsToModuleNameMapper(filteredPaths, { prefix: '<rootDir>/' }),
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup-test.ts'],
};
