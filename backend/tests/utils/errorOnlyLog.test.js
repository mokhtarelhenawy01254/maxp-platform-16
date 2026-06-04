const fs = require("fs");
const os = require("os");
const path = require("path");

describe("errorOnlyLog", () => {
  let tempDir;
  let logFile;
  let originalConsoleError;
  let errorOnlyLog;

  beforeEach(() => {
    jest.resetModules();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "maxp-errors-only-"));
    logFile = path.join(tempDir, "errors-only.jsonl");
    originalConsoleError = console.error;
    errorOnlyLog = require("../../utils/errorOnlyLog");
    errorOnlyLog.resetErrorOnlyLogForTests();
  });

  afterEach(() => {
    errorOnlyLog.resetErrorOnlyLogForTests();
    console.error = originalConsoleError;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test("writes structured error entries and redacts secrets", () => {
    errorOnlyLog.writeErrorOnlyEntry(
      "unit-test",
      [
        "request failed with Bearer abc.def.ghi",
        {
          accessToken: "secret-token",
          url: "https://example.test/path?access_token=secret-token",
        },
      ],
      { logFile },
    );

    const [line] = fs.readFileSync(logFile, "utf8").trim().split(/\r?\n/);
    const entry = JSON.parse(line);

    expect(entry.level).toBe("error");
    expect(entry.source).toBe("unit-test");
    expect(entry.args[0]).toContain("Bearer [REDACTED]");
    expect(entry.args[1].accessToken).toBe("[REDACTED]");
    expect(entry.args[1].url).toContain("access_token=[REDACTED]");
  });

  test("mirrors console.error to the error-only file", () => {
    const passthroughCalls = [];
    console.error = (...args) => {
      passthroughCalls.push(args);
    };

    const installed = errorOnlyLog.installErrorOnlyLog({ force: true, logFile });
    console.error("boom", new Error("kaput"));

    expect(installed).toBe(true);
    expect(passthroughCalls).toHaveLength(1);

    const [line] = fs.readFileSync(logFile, "utf8").trim().split(/\r?\n/);
    const entry = JSON.parse(line);

    expect(entry.source).toBe("console.error");
    expect(entry.args[0]).toBe("boom");
    expect(entry.args[1].message).toBe("kaput");
    expect(entry.args[1].stack).toContain("Error: kaput");
  });

  test("labels console entries with the process source when provided", () => {
    console.error = () => {};

    errorOnlyLog.installErrorOnlyLog({
      force: true,
      logFile,
      source: "maxp-backend",
    });
    console.error("backend failed");

    const [line] = fs.readFileSync(logFile, "utf8").trim().split(/\r?\n/);
    const entry = JSON.parse(line);

    expect(entry.source).toBe("maxp-backend:console.error");
    expect(entry.processName).toBe("maxp-backend");
  });

  test("rotates the error-only log when it reaches the configured size", () => {
    fs.writeFileSync(logFile, "x".repeat(50), "utf8");

    errorOnlyLog.writeErrorOnlyEntry("unit-test", ["rotated"], {
      logFile,
      maxBytes: 10,
      maxFiles: 2,
    });

    expect(fs.existsSync(`${logFile}.1`)).toBe(true);
    const [line] = fs.readFileSync(logFile, "utf8").trim().split(/\r?\n/);
    expect(JSON.parse(line).args[0]).toBe("rotated");
  });
});
