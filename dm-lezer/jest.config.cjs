/** @type {import("jest").Config} */
const config = {
  watchPathIgnorePatterns: [
    "<rootDir>/src/parser.ts",
    "<rootDir>/src/parser.terms.ts",
    "<rootDir>/node_modules",
  ],
  moduleFileExtensions: ["js", "ts", "cjs", "test", "grammar"],
  extensionsToTreatAsEsm: [".ts"],
  resolver: "jest-ts-webcompat-resolver",
};

module.exports = config;
