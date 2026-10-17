const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawnSync } = require('child_process');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

const LOG_PREFIX = '[ensureLocalPostgres]';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(1000);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

function isLocalHost(hostname) {
  return ['localhost', '127.0.0.1', '::1'].includes(hostname);
}

function getLocalPostgresCandidates() {
  const baseDir = path.join('C:\\', 'Program Files', 'PostgreSQL');
  if (!fs.existsSync(baseDir)) return [];

  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => Number(b) - Number(a))
    .map((version) => {
      const installDir = path.join(baseDir, version);
      return {
        version,
        installDir,
        pgCtlPath: path.join(installDir, 'bin', 'pg_ctl.exe'),
        dataDir: path.join(installDir, 'data')
      };
    })
    .filter((candidate) => fs.existsSync(candidate.pgCtlPath) && fs.existsSync(candidate.dataDir));
}

async function waitForPort(host, port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await canConnect(host, port)) return true;
    await sleep(500);
  }
  return false;
}

function buildManualStartHints(candidates) {
  const latest = candidates[0];
  if (!latest) {
    return [
      'Start-Service postgresql-x64-17',
      '"C:\\Program Files\\PostgreSQL\\17\\bin\\pg_ctl.exe" start -D "C:\\Program Files\\PostgreSQL\\17\\data"'
    ];
  }

  return [
    `Start-Service postgresql-x64-${latest.version}`,
    `"${latest.pgCtlPath}" start -D "${latest.dataDir}"`
  ];
}

function prefixed(message) {
  return `${LOG_PREFIX} ${message}`;
}

async function ensureLocalPostgres(options = {}) {
  const logger = options.logger || console;
  const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL/POSTGRES_URL is not set.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch (error) {
    throw new Error(`Invalid database URL: ${error.message}`);
  }

  const protocol = parsedUrl.protocol.replace(':', '');
  const host = parsedUrl.hostname || 'localhost';
  const port = Number(parsedUrl.port || 5432);

  // Prefer IPv4 loopback for the reachability probe: `localhost` can resolve to
  // ::1 where PostgreSQL is not listening (Windows IPv6 stack flakiness), which
  // made the 1s probe fail even though the server was up on 127.0.0.1.
  const probeHost = host === 'localhost' ? '127.0.0.1' : host;

  if (!['postgresql', 'postgres'].includes(protocol)) {
    logger.log(prefixed(`Skipping auto-start for ${protocol} database.`));
    return { status: 'skipped', reason: 'protocol', protocol, host, port };
  }

  if (!isLocalHost(host)) {
    logger.log(prefixed(`Skipping auto-start for remote host ${host}:${port}.`));
    return { status: 'skipped', reason: 'remote-host', protocol, host, port };
  }

  if (await canConnect(probeHost, port)) {
    logger.log(prefixed(`PostgreSQL is already reachable at ${host}:${port}.`));
    return { status: 'ready', protocol, host, port };
  }

  if (process.platform !== 'win32') {
    throw new Error(`PostgreSQL is not reachable at ${host}:${port}. Start it manually and retry.`);
  }

  const candidates = getLocalPostgresCandidates();
  if (candidates.length === 0) {
    throw new Error('No local PostgreSQL installation was found under C:\\Program Files\\PostgreSQL.');
  }

  const logDir = path.resolve(__dirname, '..', 'logs');
  const logPath = path.join(logDir, 'postgres-start.log');
  fs.mkdirSync(logDir, { recursive: true });

  for (const candidate of candidates) {
    logger.log(prefixed(`Attempting pg_ctl start using PostgreSQL ${candidate.version}...`));

    const result = spawnSync(
      candidate.pgCtlPath,
      ['start', '-D', candidate.dataDir, '-l', logPath],
      { encoding: 'utf8', windowsHide: true }
    );

    if (result.error) {
      logger.warn(prefixed(`pg_ctl failed for ${candidate.version}: ${result.error.message}`));
      continue;
    }

    if (await waitForPort(probeHost, port, 10000)) {
      logger.log(prefixed(`PostgreSQL is now reachable at ${host}:${port}.`));
      return { status: 'started', protocol, host, port, version: candidate.version };
    }

    const stderr = (result.stderr || '').trim();
    if (stderr) {
      logger.warn(prefixed(`PostgreSQL ${candidate.version} did not come up: ${stderr}`));
    }
  }

  const hints = buildManualStartHints(candidates);
  throw new Error(
    [
      `PostgreSQL is still not reachable at ${host}:${port}.`,
      'Try one of the following commands:',
      ...hints.map((hint) => `  ${hint}`)
    ].join('\n')
  );
}

async function main() {
  try {
    await ensureLocalPostgres();
  } catch (error) {
    const lines = String(error.message || error).split('\n');
    for (const line of lines) {
      console.error(prefixed(line));
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(prefixed(`Unexpected failure: ${error.message}`));
    process.exit(1);
  });
}

module.exports = {
  canConnect,
  ensureLocalPostgres,
  getLocalPostgresCandidates
};
