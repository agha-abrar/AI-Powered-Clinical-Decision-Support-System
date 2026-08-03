module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/test/**/*.spec.ts", "<rootDir>/src/**/*.spec.ts"],
  moduleNameMapper: {
    "^@cdss/shared$": "<rootDir>/../../packages/shared/src/index.ts",
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/main.ts"],
};
