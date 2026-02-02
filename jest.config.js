/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  // Ignore Next.js specific files
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  // Don't transform node_modules except for ESM packages
  transformIgnorePatterns: [
    'node_modules/(?!(drizzle-orm|@libsql)/)',
  ],
};
