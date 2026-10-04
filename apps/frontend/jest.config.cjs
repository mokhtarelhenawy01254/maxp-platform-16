/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;
const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx)$/;
const VITEST_IMPORT_PATTERN =
  /from\s+['"]vitest['"]|@testing-library\/jest-dom\/vitest/;
const REGEX_SPECIAL_CHARACTERS = /[|\\{}()[\]^$+*?.]/g;

const escapeRegex = (value) => value.replace(REGEX_SPECIAL_CHARACTERS, "\\$&");

const collectVitestTestPathIgnorePatterns = (dir) => {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const ignorePatterns = [];
  const stack = [dir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir) {
      continue;
    }

    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!TEST_FILE_PATTERN.test(entry.name)) {
        continue;
      }

      const fileContents = fs.readFileSync(fullPath, "utf8");
      if (!VITEST_IMPORT_PATTERN.test(fileContents)) {
        continue;
      }

      const relativePath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, "/");
      ignorePatterns.push(`<rootDir>/${escapeRegex(relativePath)}`);
    }
  }

  return ignorePatterns;
};

const vitestTestPathIgnorePatterns = collectVitestTestPathIgnorePatterns(
  path.join(ROOT_DIR, "src"),
);

module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@shared/(.*)$": "<rootDir>/../shared/$1",
    "^.*/config/environment$": "<rootDir>/src/test/__mocks__/environmentMock.ts",
    "^@base-ui/react/dialog$":
      "<rootDir>/src/test/__mocks__/baseUiDialogMock.tsx",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/src/test/__mocks__/fileMock.js",
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        diagnostics: false,
        isolatedModules: true,
      },
    ],
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx,js,jsx}",
    "src/pages/ContinuousLearning/**/*.{js,jsx}",
    "src/components/ContinuousLearning/**/*.{js,jsx}",
    "src/services/learningAPI.js",
    "!src/**/*.d.ts",
    "!src/main.tsx",
    "!src/test/**",
    "!src/**/*.stories.{ts,tsx}",
    "!src/**/*.test.{js,jsx}",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.{ts,tsx}",
    "<rootDir>/src/**/*.{test,spec}.{ts,tsx}",
  ],
  testPathIgnorePatterns: vitestTestPathIgnorePatterns,
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
};
