const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  collectErrorLogFiles,
  readErrorOnlyLogFiles,
  createEntrySignature,
  extractOccurrenceCount,
  buildSignatureReport,
  formatSignatureReport,
  normalizeSignatureText,
} = require("../../utils/errorSignatureTracker");

describe("errorSignatureTracker", () => {
  test("groups backend errors with volatile details into a stable signature", () => {
    const first = createEntrySignature({
      source: "maxp-backend:console.error",
      args: ["boom", new Error("Request timed out after 12000ms for id 120247905616540580")],
    });
    const second = createEntrySignature({
      source: "maxp-backend:console.error",
      args: ["boom", new Error("Request timed out after 9000ms for id 120247905616540581")],
    });

    expect(first.category).toBe("ai.nvidia_timeout");
    expect(second.id).toBe(first.id);
  });

  test("classifies frontend auth noise and counts suppressed duplicates", () => {
    const frontendPayload = {
      message: "Console Error",
      type: "error",
      url: "https://maxp.online/super-admin/dev-tasks?tab=active",
      error: { message: "Request failed with status code 403" },
      timestamp: "2026-05-09T01:00:00.000Z",
      suppressedDuplicates: 9,
    };
    const entry = {
      timestamp: "2026-05-09T01:05:00.000Z",
      source: "maxp-backend:console.error",
      args: ["[FRONTEND-ERROR]", JSON.stringify(frontendPayload)],
    };
    const signature = createEntrySignature(entry);

    expect(signature.category).toBe("frontend.dev_tasks_403");
    expect(signature.summary).toContain("403");
    expect(signature.summary).toContain("maxp.online/super-admin/dev-tasks");
    expect(extractOccurrenceCount(entry)).toBe(10);
  });

  test("builds a report with previous-run new counts", () => {
    const entries = [
      {
        timestamp: "2026-05-09T01:00:00.000Z",
        source: "maxp-backend:console.error",
        args: ["PrismaClientValidationError: Argument company is missing."],
      },
      {
        timestamp: "2026-05-09T02:00:00.000Z",
        source: "maxp-backend:console.error",
        args: ["PrismaClientValidationError: Argument company is missing."],
      },
    ];

    const report = buildSignatureReport(entries, {
      now: new Date("2026-05-09T03:00:00.000Z"),
      previousState: { generatedAt: "2026-05-09T01:30:00.000Z" },
    });

    expect(report.categories).toEqual([
      { category: "orders.guest_customer_validation", count: 2 },
    ]);
    expect(report.signatures).toHaveLength(1);
    expect(report.signatures[0].count).toBe(2);
    expect(report.signatures[0].newCount).toBe(1);
    expect(report.newEntriesSinceLastRun).toBe(1);
  });

  test("reads rotated JSONL files and counts malformed lines", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "maxp-signatures-"));
    const logFile = path.join(tempDir, "errors-only.jsonl");

    try {
      fs.writeFileSync(
        `${logFile}.1`,
        `${JSON.stringify({ timestamp: "2026-05-09T00:00:00.000Z", args: ["old"] })}\n`,
        "utf8",
      );
      fs.writeFileSync(
        logFile,
        [
          JSON.stringify({ timestamp: "2026-05-09T01:00:00.000Z", args: ["new"] }),
          "{partial",
          "",
        ].join("\n"),
        "utf8",
      );

      const files = collectErrorLogFiles(logFile, { maxRotatedFiles: 2 });
      const result = readErrorOnlyLogFiles(files);

      expect(files).toEqual([`${logFile}.1`, logFile]);
      expect(result.entries).toHaveLength(2);
      expect(result.invalidLines).toBe(1);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("normalizes secrets and volatile values without removing useful short status codes", () => {
    const normalized = normalizeSignatureText(
      "Request 120247905616540580 failed with status 403 and Bearer [REDACTED] at https://maxp.online/api?token=secret line:15:22",
    );

    expect(normalized).toContain("status 403");
    expect(normalized).toContain("<id>");
    expect(normalized).toContain(":<line>:<col>");
  });

  test("formats a concise markdown report", () => {
    const report = buildSignatureReport(
      [
        {
          timestamp: "2026-05-09T01:00:00.000Z",
          source: "maxp-backend:console.error",
          args: ["[NVIDIA] Request failed:", { code: "TIMEOUT", message: "Request timed out after 12000ms" }],
        },
      ],
      { now: new Date("2026-05-09T01:05:00.000Z") },
    );

    const output = formatSignatureReport(report, { limit: 5 });

    expect(output).toContain("MaxP Error Signature Report");
    expect(output).toContain("ai.nvidia_timeout");
    expect(output).toContain("NVIDIA provider timeout");
  });
});
