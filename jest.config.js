
module.exports = {
  "roots": [
    "<rootDir>/dist"
  ],
  "testMatch": [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)"
  ],
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  testEnvironment: 'node',
  preset: 'ts-jest'
}