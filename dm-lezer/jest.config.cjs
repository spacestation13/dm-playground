/** @type {import("jest").Config} */
const config = {
  watchPathIgnorePatterns: [
    "<rootDir>/src/parser.js",
    "<rootDir>/src/parser.terms.js",
    "<rootDir>/node_modules",
  ],
  moduleFileExtensions: ["js", "cjs", "test", "grammar"],
};

module.exports = config;
