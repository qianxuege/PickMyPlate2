/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Mock native / Expo modules that cannot run in Node
    '^expo-linking$': '<rootDir>/tests/__mocks__/expo-linking.ts',
    '^expo-constants$': '<rootDir>/tests/__mocks__/expo-constants.ts',
    '^expo-router$': '<rootDir>/tests/__mocks__/expo-router.ts',
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/tests/__mocks__/async-storage.ts',
    '^react-native$': '<rootDir>/tests/__mocks__/react-native.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        paths: { '@/*': ['./*'] },
      },
    }],
  },
  globals: {},
};
