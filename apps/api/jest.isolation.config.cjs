module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../..',
  roots: ['<rootDir>/tests/isolation'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j|mj)s$': ['ts-jest', { tsconfig: '<rootDir>/apps/api/tsconfig.isolation.json' }],
  },
  transformIgnorePatterns: [],
  setupFiles: ['<rootDir>/apps/api/test/jest.setup.ts'],
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/apps/api/src/modules/shared/database/database.service.ts',
    '<rootDir>/apps/api/src/modules/organization/infrastructure/membership.queries.ts',
    '<rootDir>/apps/api/src/modules/settings/infrastructure/setting.queries.ts',
    '<rootDir>/apps/api/src/modules/audit/infrastructure/audit-event.queries.ts',
    '<rootDir>/apps/api/src/modules/notifications/infrastructure/notification.queries.ts',
    '<rootDir>/apps/api/src/business/patient/infrastructure/patient.queries.ts',
  ],
  coverageProvider: 'v8',
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
};
