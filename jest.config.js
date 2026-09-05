/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  clearMocks: true,
  collectCoverageFrom: ['src/services/**/*.ts', 'src/domain/**/*.ts'],
  coverageDirectory: 'coverage',
};
