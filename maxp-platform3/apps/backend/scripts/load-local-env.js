const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadLocalEnv(options = {}) {
  const backendRoot = options.backendRoot || path.resolve(__dirname, '..');
  const backendRoots = [backendRoot];
  const worktreeRoot = path.dirname(backendRoot);
  const workspaceParent = path.dirname(worktreeRoot);
  const workspaceParentName = path.basename(workspaceParent);
  if (/_worktrees$/i.test(workspaceParentName)) {
    const mainWorkspaceName = workspaceParentName.replace(/_worktrees$/i, '');
    const mainWorkspaceBackend = path.join(
      path.dirname(workspaceParent),
      mainWorkspaceName,
      path.basename(backendRoot),
    );

    if (mainWorkspaceBackend !== backendRoot) {
      backendRoots.push(mainWorkspaceBackend);
    }
  }

  const envFiles = backendRoots.flatMap(root => [
    path.join(root, '.env'),
    path.join(root, '.env.local'),
  ]);
  const seen = new Set();

  for (const envPath of envFiles) {
    if (!fs.existsSync(envPath) || seen.has(envPath)) {
      continue;
    }
    seen.add(envPath);

    dotenv.config({
      path: envPath,
      override: true,
      quiet: true,
    });
  }

  if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
    process.env.POSTGRES_URL = process.env.DATABASE_URL;
  }

  if (!process.env.DATABASE_URL && process.env.POSTGRES_URL) {
    process.env.DATABASE_URL = process.env.POSTGRES_URL;
  }

  return {
    backendRoot,
    loadedFiles: envFiles.filter(filePath => fs.existsSync(filePath)),
    databaseUrlPresent: Boolean(process.env.DATABASE_URL),
    postgresUrlPresent: Boolean(process.env.POSTGRES_URL),
  };
}

module.exports = loadLocalEnv;
