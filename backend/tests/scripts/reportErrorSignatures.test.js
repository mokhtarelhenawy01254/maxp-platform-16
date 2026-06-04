const fs = require("fs");
const os = require("os");
const path = require("path");

const { parseArgs, run } = require("../../scripts/report-error-signatures");

describe("report-error-signatures script", () => {
  let tempDir;
  let logFile;
  let stateFile;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "maxp-error-report-"));
    logFile = path.join(tempDir, "errors-only.jsonl");
    stateFile = path.join(tempDir, "error-signature-state.json");
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test("parses CLI options", () => {
    const options = parseArgs([
      "--file",
      logFile,
      "--state",
      stateFile,
      "--limit",
      "7",
      "--since",
      "2h",
      "--json",
      "--no-write-state",
    ]);

    expect(options.logFile).toBe(path.resolve(logFile));
    expect(options.stateFile).toBe(path.resolve(stateFile));
    expect(options.limit).toBe(7);
    expect(options.since).toBe("2h");
    expect(options.json).toBe(true);
    expect(options.writeState).toBe(false);
  });

  test("builds a report and writes state", () => {
    fs.writeFileSync(
      logFile,
      [
        JSON.stringify({
          timestamp: "2026-05-09T01:00:00.000Z",
          source: "maxp-backend:console.error",
          args: ["[OPENROUTER] Request failed:", { status: 429, message: "Rate limit exceeded: free-models-per-min." }],
        }),
        JSON.stringify({
          timestamp: "2026-05-09T02:00:00.000Z",
          source: "maxp-backend:console.error",
          args: ["[OPENROUTER] Request failed:", { status: 429, message: "Rate limit exceeded: free-models-per-min." }],
        }),
        "",
      ].join("\n"),
      "utf8",
    );

    const result = run({
      logFile,
      stateFile,
      limit: 5,
      maxRotatedFiles: 1,
      maxLinesPerFile: 0,
      json: false,
      writeState: true,
      since: null,
      help: false,
    });

    expect(result.output).toContain("MaxP Error Signature Report");
    expect(result.report.signatures[0].category).toBe(
      "ai.openrouter_rate_limit_minute",
    );
    expect(result.report.signatures[0].count).toBe(2);
    expect(fs.existsSync(stateFile)).toBe(true);
  });

  test("uses existing state to report new occurrences", () => {
    fs.writeFileSync(
      stateFile,
      JSON.stringify({ generatedAt: "2026-05-09T01:30:00.000Z" }),
      "utf8",
    );
    fs.writeFileSync(
      logFile,
      [
        JSON.stringify({
          timestamp: "2026-05-09T01:00:00.000Z",
          source: "maxp-backend:console.error",
          args: ["PrismaClientValidationError: Argument company is missing."],
        }),
        JSON.stringify({
          timestamp: "2026-05-09T02:00:00.000Z",
          source: "maxp-backend:console.error",
          args: ["PrismaClientValidationError: Argument company is missing."],
        }),
      ].join("\n"),
      "utf8",
    );

    const result = run({
      logFile,
      stateFile,
      limit: 5,
      maxRotatedFiles: 1,
      maxLinesPerFile: 0,
      json: true,
      writeState: false,
      since: null,
      help: false,
    });

    expect(JSON.parse(result.output).newEntriesSinceLastRun).toBe(1);
  });
});
