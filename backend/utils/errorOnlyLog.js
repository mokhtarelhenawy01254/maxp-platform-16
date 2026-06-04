const fs = require("fs");
const os = require("os");
const path = require("path");

const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;
const DEFAULT_MAX_FILES = 3;
const REDACTED = "[REDACTED]";
const SECRET_KEY_PATTERN =
  /(token|secret|password|authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|cookie)/i;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const QUERY_SECRET_PATTERN =
  /([?&](?:access_token|refresh_token|token|api_key|key|secret|password)=)[^&\s]+/gi;

const state = {
  installed: false,
  originalConsoleError: null,
  listeners: [],
  inWrite: false,
};

function resolveLogDir() {
  return process.env.LOG_DIR || path.join(__dirname, "..", "logs");
}

function resolveLogFile(options = {}) {
  return (
    options.logFile ||
    process.env.ERROR_ONLY_LOG_FILE ||
    path.join(resolveLogDir(), "errors-only.jsonl")
  );
}

function toPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function shouldEnable(options = {}) {
  if (options.force === true) return true;
  if (process.env.ERROR_ONLY_LOG_DISABLED === "true") return false;
  if (process.env.NODE_ENV === "test") return false;
  return (
    process.env.NODE_ENV === "production" ||
    process.env.ERROR_ONLY_LOG_ENABLED === "true"
  );
}

function redactString(value) {
  return String(value)
    .replace(BEARER_PATTERN, `Bearer ${REDACTED}`)
    .replace(QUERY_SECRET_PATTERN, `$1${REDACTED}`);
}

function truncateString(value, maxLength = 6000) {
  const safeValue = redactString(value);
  if (safeValue.length <= maxLength) {
    return safeValue;
  }

  return `${safeValue.slice(0, maxLength)}...[truncated]`;
}

function normalizeError(error) {
  return {
    name: error.name,
    message: truncateString(error.message || String(error), 2000),
    code: error.code,
    status: error.status || error.statusCode,
    stack: error.stack ? truncateString(error.stack, 8000) : undefined,
  };
}

function normalizeValue(value, depth = 0, seen = new WeakSet()) {
  if (value instanceof Error) {
    return normalizeError(value);
  }

  if (typeof value === "string") {
    return truncateString(value);
  }

  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "undefined") {
    return undefined;
  }

  if (typeof value === "function") {
    return `[Function ${value.name || "anonymous"}]`;
  }

  if (typeof value !== "object") {
    return truncateString(String(value));
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  if (depth >= 5) {
    return "[MaxDepth]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, 40).map((item) => normalizeValue(item, depth + 1, seen));
  }

  const output = {};
  for (const key of Object.keys(value).slice(0, 80)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      output[key] = REDACTED;
      continue;
    }

    output[key] = normalizeValue(value[key], depth + 1, seen);
  }

  return output;
}

function normalizeArgs(args = []) {
  return Array.from(args).map((arg) => normalizeValue(arg));
}

function rotateLogFileIfNeeded(logFile, options = {}) {
  const maxBytes = toPositiveInteger(
    options.maxBytes || process.env.ERROR_ONLY_LOG_MAX_BYTES,
    DEFAULT_MAX_BYTES,
  );
  const maxFiles = toPositiveInteger(
    options.maxFiles || process.env.ERROR_ONLY_LOG_MAX_FILES,
    DEFAULT_MAX_FILES,
  );

  if (!fs.existsSync(logFile)) {
    return;
  }

  const stats = fs.statSync(logFile);
  if (stats.size < maxBytes) {
    return;
  }

  for (let index = maxFiles; index >= 1; index -= 1) {
    const source = index === 1 ? logFile : `${logFile}.${index - 1}`;
    const target = `${logFile}.${index}`;

    if (!fs.existsSync(source)) {
      continue;
    }

    if (index === maxFiles && fs.existsSync(target)) {
      fs.unlinkSync(target);
    }

    fs.renameSync(source, target);
  }
}

function appendJsonLine(logFile, entry, options = {}) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  rotateLogFileIfNeeded(logFile, options);
  fs.appendFileSync(logFile, `${JSON.stringify(entry)}${os.EOL}`, "utf8");
}

function writeErrorOnlyEntry(source, args = [], options = {}) {
  if (state.inWrite) {
    return;
  }

  const logFile = resolveLogFile(options);

  try {
    state.inWrite = true;
    appendJsonLine(
      logFile,
      {
        timestamp: new Date().toISOString(),
        level: "error",
        source,
        processName: options.processName || options.source || process.title,
        pid: process.pid,
        hostname: os.hostname(),
        args: normalizeArgs(args),
      },
      options,
    );
  } catch {
    // Never let logging failure crash the app or recurse through console.error.
  } finally {
    state.inWrite = false;
  }
}

function addProcessListener(eventName, listener) {
  process.on(eventName, listener);
  state.listeners.push([eventName, listener]);
}

function installErrorOnlyLog(options = {}) {
  if (state.installed || console.__maxpErrorOnlyLogInstalled) {
    return false;
  }

  if (!shouldEnable(options)) {
    return false;
  }

  state.originalConsoleError = console.error.bind(console);

  console.error = (...args) => {
    const source = options.source
      ? `${options.source}:console.error`
      : "console.error";
    writeErrorOnlyEntry(source, args, options);
    return state.originalConsoleError(...args);
  };

  addProcessListener("uncaughtExceptionMonitor", (error) => {
    const source = options.source
      ? `${options.source}:uncaughtException`
      : "uncaughtException";
    writeErrorOnlyEntry(source, [error], options);
  });

  addProcessListener("unhandledRejection", (reason) => {
    const source = options.source
      ? `${options.source}:unhandledRejection`
      : "unhandledRejection";
    writeErrorOnlyEntry(source, [reason], options);
  });

  console.__maxpErrorOnlyLogInstalled = true;
  state.installed = true;
  return true;
}

function resetErrorOnlyLogForTests() {
  if (state.originalConsoleError) {
    console.error = state.originalConsoleError;
  }

  for (const [eventName, listener] of state.listeners) {
    process.removeListener(eventName, listener);
  }

  state.listeners = [];
  state.originalConsoleError = null;
  state.installed = false;
  state.inWrite = false;
  delete console.__maxpErrorOnlyLogInstalled;
}

module.exports = {
  installErrorOnlyLog,
  writeErrorOnlyEntry,
  resetErrorOnlyLogForTests,
};
