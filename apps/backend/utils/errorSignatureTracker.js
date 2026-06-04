const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const DEFAULT_MAX_ROTATED_FILES = 5;
const DEFAULT_SIGNATURE_LIMIT = 20;
const DEFAULT_SUMMARY_LENGTH = 260;
const STATE_VERSION = 1;

const SECRET_KEY_PATTERN =
  /(token|secret|password|authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|cookie)/i;

function resolveDefaultLogFile() {
  return path.resolve(
    process.env.ERROR_ONLY_LOG_FILE ||
      path.join(__dirname, "..", "logs", "errors-only.jsonl"),
  );
}

function resolveDefaultStateFile(logFile = resolveDefaultLogFile()) {
  return path.resolve(
    process.env.ERROR_SIGNATURE_STATE_FILE ||
      path.join(path.dirname(path.resolve(logFile)), "error-signature-state.json"),
  );
}

function toPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parseTimestamp(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseSince(value, now = new Date()) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();
  const durationMatch = text.match(/^(\d+)(m|h|d|w)$/i);
  if (durationMatch) {
    const amount = Number(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    const multipliers = {
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
    };
    return new Date(now.getTime() - amount * multipliers[unit]);
  }

  return parseTimestamp(text);
}

function collectErrorLogFiles(logFile, options = {}) {
  const baseFile = path.resolve(logFile || resolveDefaultLogFile());
  const maxRotatedFiles = toPositiveInteger(
    options.maxRotatedFiles,
    DEFAULT_MAX_ROTATED_FILES,
  );
  const files = [];

  for (let index = maxRotatedFiles; index >= 1; index -= 1) {
    const rotated = `${baseFile}.${index}`;
    if (fs.existsSync(rotated)) {
      files.push(rotated);
    }

    const gzRotated = `${rotated}.gz`;
    if (fs.existsSync(gzRotated)) {
      files.push(gzRotated);
    }
  }

  if (fs.existsSync(baseFile)) {
    files.push(baseFile);
  }

  const gzBaseFile = `${baseFile}.gz`;
  if (fs.existsSync(gzBaseFile)) {
    files.push(gzBaseFile);
  }

  return files;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readErrorOnlyLogFiles(files, options = {}) {
  const entries = [];
  const fileSummaries = [];
  const maxLinesPerFile = toPositiveInteger(options.maxLinesPerFile, 0);
  let invalidLines = 0;

  for (const file of files) {
    const summary = {
      file,
      size: 0,
      lines: 0,
      invalidLines: 0,
    };

    if (!fs.existsSync(file)) {
      continue;
    }

    const stats = fs.statSync(file);
    summary.size = stats.size;

    const contents = file.endsWith(".gz")
      ? zlib.gunzipSync(fs.readFileSync(file)).toString("utf8")
      : fs.readFileSync(file, "utf8");
    let lines = contents.split(/\r?\n/).filter(Boolean);
    if (maxLinesPerFile > 0 && lines.length > maxLinesPerFile) {
      lines = lines.slice(-maxLinesPerFile);
    }

    summary.lines = lines.length;

    for (const line of lines) {
      const parsed = safeJsonParse(line);
      if (!parsed || typeof parsed !== "object") {
        invalidLines += 1;
        summary.invalidLines += 1;
        continue;
      }

      entries.push({
        ...parsed,
        __file: file,
      });
    }

    fileSummaries.push(summary);
  }

  return {
    entries,
    files: fileSummaries,
    invalidLines,
  };
}

function parseEmbeddedJson(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }

  return safeJsonParse(trimmed);
}

function collectTextParts(value, parts = [], depth = 0, seen = new WeakSet()) {
  if (value === null || typeof value === "undefined") {
    return parts;
  }

  if (depth > 5) {
    return parts;
  }

  if (typeof value === "string") {
    const parsed = parseEmbeddedJson(value);
    if (parsed) {
      return collectTextParts(parsed, parts, depth + 1, seen);
    }

    if (value.trim()) {
      parts.push(value.trim());
    }
    return parts;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    parts.push(String(value));
    return parts;
  }

  if (value instanceof Error) {
    if (value.name) parts.push(value.name);
    if (value.message) parts.push(value.message);
    if (value.code) parts.push(String(value.code));
    if (value.stack) parts.push(value.stack);
    return parts;
  }

  if (typeof value !== "object") {
    return parts;
  }

  if (seen.has(value)) {
    return parts;
  }

  seen.add(value);

  const priorityKeys = [
    "name",
    "message",
    "code",
    "status",
    "statusCode",
    "method",
    "url",
    "path",
    "model",
    "type",
    "stack",
    "error",
  ];
  const keys = [
    ...priorityKeys.filter((key) => Object.prototype.hasOwnProperty.call(value, key)),
    ...Object.keys(value).filter((key) => !priorityKeys.includes(key)).slice(0, 40),
  ];

  for (const key of keys) {
    if (SECRET_KEY_PATTERN.test(key)) {
      continue;
    }

    collectTextParts(value[key], parts, depth + 1, seen);
  }

  return parts;
}

function extractFrontendPayload(args = []) {
  for (const arg of args) {
    if (typeof arg === "string") {
      const parsed = parseEmbeddedJson(arg);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        if (parsed.url || parsed.message || parsed.type || parsed.error) {
          return parsed;
        }
      }
    }

    if (arg && typeof arg === "object" && !Array.isArray(arg)) {
      if (arg.url || arg.message || arg.type || arg.error) {
        return arg;
      }
    }
  }

  return null;
}

function normalizeUrl(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return value.replace(/[?#].*$/, "");
  }
}

function getNestedMessage(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    if (typeof value.message === "string") {
      return value.message;
    }
    if (typeof value.error === "string") {
      return value.error;
    }
    if (value.error && typeof value.error.message === "string") {
      return value.error.message;
    }
  }

  return "";
}

function normalizeSignatureText(value, maxLength = DEFAULT_SUMMARY_LENGTH) {
  const normalized = String(value || "")
    .replace(/Bearer\s+\[REDACTED\]/gi, "Bearer [REDACTED]")
    .replace(/https?:\/\/[^\s"')]+/gi, (match) => normalizeUrl(match))
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/g, "<iso-date>")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "<uuid>")
    .replace(/\bcm[a-z0-9]{18,}\b/gi, "<cuid>")
    .replace(/\b\d{10,}\b/g, "<id>")
    .replace(/\b\d{4,9}(?=ms\b)/g, "<num>")
    .replace(/\b\d+\.\d+\b/g, "<num>")
    .replace(/\b\d{4,9}\b/g, "<num>")
    .replace(/:\d+:\d+/g, ":<line>:<col>")
    .replace(/\s+/g, " ")
    .trim();

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}...`
    : normalized;
}

function classifyEntry(entry, text) {
  const source = String(entry.source || "");
  const haystack = `${source} ${text}`.toLowerCase();

  if (source.toLowerCase().includes("unhandledrejection")) {
    return "runtime.unhandled_rejection";
  }

  if (source.toLowerCase().includes("uncaughtexception")) {
    return "runtime.uncaught_exception";
  }

  const isFrontend =
    haystack.includes("[frontend-error]") ||
    haystack.includes("frontend-error") ||
    haystack.includes("console error") ||
    haystack.includes("window.onerror") ||
    haystack.includes("serviceworkerregistration") ||
    haystack.includes("illegal constructor") ||
    haystack.includes("active-users") ||
    haystack.includes("/super-admin/dev-tasks");

  if (isFrontend) {
    if (
      haystack.includes("/super-admin/dev-tasks") ||
      haystack.includes("active-users")
    ) {
      return "frontend.dev_tasks_403";
    }

    if (haystack.includes("/facebook-inbox")) {
      return "frontend.facebook_inbox_transport";
    }

    if (
      haystack.includes("illegal constructor") ||
      haystack.includes("serviceworkerregistration") ||
      haystack.includes("notification")
    ) {
      return "frontend.browser_notification";
    }

    if (
      haystack.includes("active-users") ||
      haystack.includes("status code 401") ||
      haystack.includes("status code 403") ||
      haystack.includes('"status":401') ||
      haystack.includes('"status":403') ||
      haystack.includes("/super-admin/dev-tasks")
    ) {
      return "frontend.auth_noise";
    }

    return "frontend.error";
  }

  if (/@prisma\/client did not initialize yet|prisma client did not initialize/i.test(text)) {
    return "startup.prisma_client_not_generated";
  }

  if (
    /argument company is missing|guest order|publicordersroutes|guestorderid|prisma\.customer\.create[\s\S]*company/i.test(
      text,
    )
  ) {
    return "orders.guest_customer_validation";
  }

  if (
    /prismaclient|@prisma\/client|p\d{4}|argument .* is missing|database .*failed|db push/i.test(
      text,
    )
  ) {
    return "prisma";
  }

  if (/nvidia|gpt-oss|request timed out after|provider error: request timed out/i.test(text)) {
    return "ai.nvidia_timeout";
  }

  if (/openrouter.*free-models-per-min|free-models-per-min/i.test(text)) {
    return "ai.openrouter_rate_limit_minute";
  }

  if (/openrouter.*free-models-per-day|free-models-per-day/i.test(text)) {
    return "ai.openrouter_rate_limit_day";
  }

  if (
    /openrouter.*image-input|no image-input|support image input|provider returned error 404/i.test(
      text,
    )
  ) {
    return "ai.openrouter_no_image_endpoint";
  }

  if (/ai-intent|empty or invalid ai response/i.test(text)) {
    return "assistant.intent_invalid_response";
  }

  if (
    /nvidia|openrouter|gemini|google generative|huggingface|provider error|ai-response|ai-intent|rate limit|timed out|timeout|empty or invalid ai response/i.test(
      text,
    )
  ) {
    return "ai.provider_failure";
  }

  if (/post-details|object does not exist|missing permission|unsupported get request/i.test(text)) {
    return "meta.post_details_permission_missing";
  }

  if (/mark responded|mark.*responded|allfunctions\.js/i.test(text)) {
    return "meta.webhook_comment_delegate_missing";
  }

  if (
    /facebook|graph api|post-details|object does not exist|no matching user|oauth|unsupported get request|missing permission/i.test(
      text,
    )
  ) {
    return "meta.facebook_graph";
  }

  if (/woocommerce|woo commerce|export.*400|status code 400/i.test(text)) {
    return "integration.woocommerce_export_400";
  }

  if (/no whatsapp session|no_session|whatsapp.*session/i.test(text)) {
    return "channel.whatsapp_no_session";
  }

  if (
    /econnrefused|connection refused|connect\(\) failed|nginx|upstream|port 3007|port 3008|health check failed/i.test(
      text,
    )
  ) {
    return "deploy.upstream_gap";
  }

  if (/unauthorized|forbidden|jwt|permission denied|status code 401|status code 403/i.test(text)) {
    return "auth";
  }

  return "other";
}

function buildSummary(entry, textParts, category) {
  const args = Array.isArray(entry.args) ? entry.args : [];
  const frontendPayload = extractFrontendPayload(args);

  const canonicalSummaries = {
    "ai.nvidia_timeout": "NVIDIA provider timeout",
    "ai.openrouter_rate_limit_minute": "OpenRouter rate limit per minute",
    "ai.openrouter_rate_limit_day": "OpenRouter daily free-model rate limit",
    "ai.openrouter_no_image_endpoint": "OpenRouter image endpoint unsupported",
    "assistant.intent_invalid_response": "Assistant intent returned empty or invalid response",
    "meta.post_details_permission_missing": "Facebook post details missing permission or object",
    "meta.webhook_comment_delegate_missing": "Facebook comment mark-responded delegate failed",
    "integration.woocommerce_export_400": "WooCommerce export returned HTTP 400",
    "channel.whatsapp_no_session": "WhatsApp session unavailable for notification",
    "startup.prisma_client_not_generated": "Prisma client not generated during startup",
    "orders.guest_customer_validation": "Guest order customer validation failed",
  };

  if (canonicalSummaries[category]) {
    return canonicalSummaries[category];
  }

  if (frontendPayload) {
    const message =
      frontendPayload.message ||
      getNestedMessage(frontendPayload.error) ||
      frontendPayload.type ||
      "Frontend error";
    const nestedMessage = getNestedMessage(frontendPayload.error);
    const url = normalizeUrl(frontendPayload.url);
    const details = [message];

    if (nestedMessage && nestedMessage !== message) {
      details.push(nestedMessage);
    }

    if (url) {
      details.push(`at ${url}`);
    }

    return normalizeSignatureText(details.join(" | "));
  }

  const source = String(entry.source || "unknown");
  const firstUsefulPart =
    textParts.find((part) => !/^\[?[A-Z0-9_-]+\]?$/.test(part)) || textParts[0] || source;

  return normalizeSignatureText(firstUsefulPart);
}

function hashSignature(value) {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function createEntrySignature(entry) {
  const textParts = collectTextParts(Array.isArray(entry.args) ? entry.args : []);
  const text = normalizeSignatureText(textParts.join(" "), 1200);
  const category = classifyEntry(entry, text);
  const summary = buildSummary(entry, textParts, category);
  const source = String(entry.source || entry.processName || "unknown");
  const normalized = normalizeSignatureText(`${category}|${source}|${summary}`);
  const id = `${category}:${hashSignature(normalized.toLowerCase())}`;

  return {
    id,
    category,
    source,
    summary,
    normalized,
    text,
  };
}

function extractOccurrenceCount(entry) {
  const args = Array.isArray(entry.args) ? entry.args : [];
  const frontendPayload = extractFrontendPayload(args);
  const suppressedDuplicates = Number(
    frontendPayload && frontendPayload.suppressedDuplicates,
  );

  if (Number.isFinite(suppressedDuplicates) && suppressedDuplicates > 0) {
    return 1 + Math.floor(suppressedDuplicates);
  }

  return 1;
}

function severityScore(category, count, newCount) {
  const weights = {
    "runtime.uncaught_exception": 100,
    "runtime.unhandled_rejection": 95,
    prisma: 90,
    "startup.prisma_client_not_generated": 92,
    "orders.guest_customer_validation": 88,
    "deploy.upstream_gap": 80,
    "ai.nvidia_timeout": 62,
    "ai.provider_failure": 60,
    "ai.openrouter_rate_limit_minute": 45,
    "ai.openrouter_rate_limit_day": 45,
    "ai.openrouter_no_image_endpoint": 50,
    "meta.post_details_permission_missing": 45,
    "meta.webhook_comment_delegate_missing": 55,
    "meta.facebook_graph": 45,
    "integration.woocommerce_export_400": 50,
    "channel.whatsapp_no_session": 45,
    "assistant.intent_invalid_response": 52,
    auth: 40,
    "frontend.error": 35,
    "frontend.facebook_inbox_transport": 34,
    "frontend.browser_notification": 30,
    "frontend.dev_tasks_403": 20,
    "frontend.auth_noise": 20,
    other: 25,
  };

  return (weights[category] || 25) + Math.min(count, 100) + Math.min(newCount, 50) * 2;
}

function buildSignatureReport(entries, options = {}) {
  const now = options.now || new Date();
  const since = options.since ? parseSince(options.since, now) : null;
  const previousRunAt = parseTimestamp(options.previousState && options.previousState.generatedAt);
  const groups = new Map();
  const categories = new Map();
  let scannedEntries = 0;
  let skippedBySince = 0;
  let newEntriesSinceLastRun = 0;
  let totalOccurrences = 0;

  for (const entry of entries) {
    const timestamp = parseTimestamp(entry.timestamp);

    if (since && timestamp && timestamp < since) {
      skippedBySince += 1;
      continue;
    }

    scannedEntries += 1;
    const signature = createEntrySignature(entry);
    const occurrenceCount = extractOccurrenceCount(entry);
    const group =
      groups.get(signature.id) ||
      {
        id: signature.id,
        category: signature.category,
        summary: signature.summary,
        normalized: signature.normalized,
        count: 0,
        newCount: 0,
        firstSeen: null,
        lastSeen: null,
        sources: new Map(),
        files: new Map(),
        sample: null,
      };

    totalOccurrences += occurrenceCount;
    group.count += occurrenceCount;
    group.sources.set(
      signature.source,
      (group.sources.get(signature.source) || 0) + occurrenceCount,
    );
    if (entry.__file) {
      group.files.set(entry.__file, (group.files.get(entry.__file) || 0) + occurrenceCount);
    }

    if (timestamp) {
      const iso = timestamp.toISOString();
      if (!group.firstSeen || iso < group.firstSeen) {
        group.firstSeen = iso;
      }
      if (!group.lastSeen || iso > group.lastSeen) {
        group.lastSeen = iso;
        group.sample = {
          timestamp: iso,
          source: signature.source,
          summary: signature.summary,
        };
      }

      if (previousRunAt && timestamp > previousRunAt) {
        group.newCount += occurrenceCount;
        newEntriesSinceLastRun += occurrenceCount;
      }
    }

    groups.set(signature.id, group);
    categories.set(
      signature.category,
      (categories.get(signature.category) || 0) + occurrenceCount,
    );
  }

  const signatures = Array.from(groups.values())
    .map((group) => ({
      ...group,
      sources: Array.from(group.sources.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([source, count]) => ({ source, count })),
      files: Array.from(group.files.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([file, count]) => ({ file, count })),
      score: severityScore(group.category, group.count, group.newCount),
    }))
    .sort((a, b) => {
      if (b.newCount !== a.newCount) return b.newCount - a.newCount;
      if (b.count !== a.count) return b.count - a.count;
      return b.score - a.score;
    });

  return {
    version: STATE_VERSION,
    generatedAt: now.toISOString(),
    previousRunAt: previousRunAt ? previousRunAt.toISOString() : null,
    since: since ? since.toISOString() : null,
    totalEntries: entries.length,
    scannedEntries,
    skippedBySince,
    totalOccurrences,
    newEntriesSinceLastRun,
    signatureCount: signatures.length,
    categories: Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count })),
    signatures,
  };
}

function createStateFromReport(report) {
  return {
    version: STATE_VERSION,
    generatedAt: report.generatedAt,
    totalEntries: report.totalEntries,
    scannedEntries: report.scannedEntries,
    signatureCount: report.signatureCount,
    signatures: report.signatures.reduce((acc, signature) => {
      acc[signature.id] = {
        category: signature.category,
        summary: signature.summary,
        count: signature.count,
        firstSeen: signature.firstSeen,
        lastSeen: signature.lastSeen,
      };
      return acc;
    }, {}),
  };
}

function formatSignatureReport(report, options = {}) {
  const limit = toPositiveInteger(options.limit, DEFAULT_SIGNATURE_LIMIT);
  const lines = [];

  lines.push("# MaxP Error Signature Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  if (report.previousRunAt) {
    lines.push(`Previous run: ${report.previousRunAt}`);
    lines.push(`New entries since previous run: ${report.newEntriesSinceLastRun}`);
  } else {
    lines.push("Previous run: none");
  }
  if (report.since) {
    lines.push(`Filtered since: ${report.since}`);
  }
  lines.push(`Entries scanned: ${report.scannedEntries}/${report.totalEntries}`);
  lines.push(`Occurrences counted: ${report.totalOccurrences}`);
  lines.push(`Unique signatures: ${report.signatureCount}`);
  lines.push("");
  lines.push("## Categories by Occurrence");

  if (report.categories.length === 0) {
    lines.push("- none");
  } else {
    for (const category of report.categories) {
      lines.push(`- ${category.category}: ${category.count}`);
    }
  }

  lines.push("");
  lines.push(`## Top Signatures (${Math.min(limit, report.signatures.length)})`);

  if (report.signatures.length === 0) {
    lines.push("- none");
  } else {
    for (const [index, signature] of report.signatures.slice(0, limit).entries()) {
      lines.push(
        `${index + 1}. [${signature.category}] ${signature.summary || signature.id}`,
      );
      lines.push(
        `   id=${signature.id} count=${signature.count} new=${signature.newCount} last=${signature.lastSeen || "unknown"}`,
      );
      if (signature.sources.length > 0) {
        lines.push(
          `   sources=${signature.sources
            .slice(0, 3)
            .map((item) => `${item.source}(${item.count})`)
            .join(", ")}`,
        );
      }
    }
  }

  return `${lines.join("\n")}\n`;
}

module.exports = {
  STATE_VERSION,
  collectErrorLogFiles,
  readErrorOnlyLogFiles,
  parseSince,
  createEntrySignature,
  extractOccurrenceCount,
  buildSignatureReport,
  createStateFromReport,
  formatSignatureReport,
  normalizeSignatureText,
  resolveDefaultLogFile,
  resolveDefaultStateFile,
};
