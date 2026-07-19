#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const {
  collectErrorLogFiles,
  readErrorOnlyLogFiles,
  buildSignatureReport,
  createStateFromReport,
  formatSignatureReport,
  parseSince,
  resolveDefaultLogFile,
  resolveDefaultStateFile,
} = require("../utils/errorSignatureTracker");

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    logFile: resolveDefaultLogFile(),
    stateFile: null,
    limit: 20,
    maxRotatedFiles: 5,
    maxLinesPerFile: 0,
    json: false,
    writeState: true,
    since: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      index += 1;
      if (index >= argv.length) {
        throw new Error(`Missing value for ${arg}`);
      }
      return argv[index];
    };

    if (arg === "--file" || arg === "-f") {
      options.logFile = path.resolve(readValue());
    } else if (arg === "--state") {
      options.stateFile = path.resolve(readValue());
    } else if (arg === "--limit" || arg === "-n") {
      options.limit = Number(readValue());
    } else if (arg === "--max-rotated") {
      options.maxRotatedFiles = Number(readValue());
    } else if (arg === "--max-lines-per-file") {
      options.maxLinesPerFile = Number(readValue());
    } else if (arg === "--since") {
      options.since = readValue();
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--no-write-state") {
      options.writeState = false;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.stateFile) {
    options.stateFile = resolveDefaultStateFile(options.logFile);
  }

  return options;
}

function usage() {
  return [
    "Usage: node scripts/report-error-signatures.js [options]",
    "",
    "Options:",
    "  -f, --file <path>              Error-only JSONL file. Defaults to ERROR_ONLY_LOG_FILE or logs/errors-only.jsonl.",
    "      --state <path>             Tracker state file. Defaults to logs/error-signature-state.json.",
    "  -n, --limit <count>            Number of top signatures to print. Default: 20.",
    "      --since <duration|date>    Filter entries, e.g. 2h, 1d, or 2026-05-09T00:00:00Z.",
    "      --max-rotated <count>      Include rotated files up to .N. Default: 5.",
    "      --max-lines-per-file <n>   Read only the last N lines from each file.",
    "      --json                     Print JSON instead of a Markdown report.",
    "      --no-write-state           Do not update the state file.",
    "  -h, --help                     Show this help.",
    "",
  ].join("\n");
}

function loadState(stateFile) {
  if (!stateFile || !fs.existsSync(stateFile)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf8"));
  } catch {
    return null;
  }
}

function writeState(stateFile, report) {
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(
    stateFile,
    `${JSON.stringify(createStateFromReport(report), null, 2)}\n`,
    "utf8",
  );
}

function run(options = parseArgs()) {
  if (options.help) {
    return {
      output: usage(),
      report: null,
    };
  }

  const since = options.since ? parseSince(options.since) : null;
  if (options.since && !since) {
    throw new Error(`Invalid --since value: ${options.since}`);
  }

  const files = collectErrorLogFiles(options.logFile, {
    maxRotatedFiles: options.maxRotatedFiles,
  });
  const previousState = loadState(options.stateFile);
  const logData = readErrorOnlyLogFiles(files, {
    maxLinesPerFile: options.maxLinesPerFile,
  });
  const report = buildSignatureReport(logData.entries, {
    previousState,
    since,
  });

  report.logFile = path.resolve(options.logFile);
  report.stateFile = path.resolve(options.stateFile);
  report.files = logData.files;
  report.invalidLines = logData.invalidLines;

  if (options.writeState) {
    writeState(options.stateFile, report);
  }

  const output = options.json
    ? `${JSON.stringify(report, null, 2)}\n`
    : formatSignatureReport(report, { limit: options.limit });

  return {
    output,
    report,
  };
}

if (require.main === module) {
  try {
    const { output } = run(parseArgs());
    process.stdout.write(output);
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${usage()}`);
    process.exitCode = 1;
  }
}

module.exports = {
  parseArgs,
  usage,
  loadState,
  writeState,
  run,
};
