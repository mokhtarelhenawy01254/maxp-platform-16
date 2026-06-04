const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const backendRoot = path.resolve(__dirname, '..');

const run = (command, args, options = {}) =>
  spawnSync(command, args, {
    cwd: backendRoot,
    encoding: 'utf8',
    stdio: 'pipe',
    ...options,
  });

const getChangedBackendFiles = () => {
  const candidates = [
    ['diff', '--name-only', 'HEAD~1', 'HEAD'],
    ['diff', '--name-only', 'HEAD'],
  ];

  for (const args of candidates) {
    const result = run('git', args);
    if (result.status !== 0) continue;

    const files = result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((file) => file.startsWith('backend/') && file.endsWith('.js'))
      .map((file) => file.replace(/^backend[\\/]/, ''));

    if (files.length > 0) {
      return [...new Set(files)];
    }
  }

  return [];
};

const fallbackFiles = ['server.js', 'routes/publicCustomerRoutes.js'];

const filesToCheck = [...new Set([...getChangedBackendFiles(), ...fallbackFiles])]
  .filter((file) => fs.existsSync(path.join(backendRoot, file)));

if (filesToCheck.length === 0) {
  console.log('No backend JavaScript files found for syntax check.');
  process.exit(0);
}

console.log(`Checking syntax for ${filesToCheck.length} backend file(s)...`);

const failures = [];

for (const relativeFile of filesToCheck) {
  const absoluteFile = path.join(backendRoot, relativeFile);
  const result = run(process.execPath, ['--check', absoluteFile]);

  if (result.status === 0) {
    console.log(`OK  ${relativeFile}`);
    continue;
  }

  failures.push(relativeFile);
  console.error(`FAIL ${relativeFile}`);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

if (failures.length > 0) {
  console.error(`Syntax check failed for ${failures.length} file(s).`);
  process.exit(1);
}

console.log('Backend syntax checks passed.');
