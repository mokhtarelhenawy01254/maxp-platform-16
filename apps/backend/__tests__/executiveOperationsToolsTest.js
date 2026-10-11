'use strict';

/**
 * 🧪 Test Runner Proxy for:
 * Saleem (Executive Assistant Agent) - Operations, Orders, Inventory, Returns, Profits Suite
 */

const { execSync } = require('child_process');
const path = require('path');

const scriptPath = path.resolve(__dirname, '../../../scripts/test-executive-store-suite.js');

try {
  const output = execSync(`node "${scriptPath}"`, { encoding: 'utf8', stdio: 'inherit' });
} catch (error) {
  process.exit(error.status || 1);
}
