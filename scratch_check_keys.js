const fs = require('fs');
const path = require('path');

const srcDir = 'apps/frontend/src';
const usedKeys = new Set();
const tRegex = /t\(\s*(['"])(agentProfiles\.[^'"]+)\1/g;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '__tests__', '.git'].includes(entry.name)) scanDir(fullPath);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      let match;
      while ((match = tRegex.exec(content)) !== null) {
        usedKeys.add(match[2]);
      }
    }
  }
}

scanDir(srcDir);
console.log('Used keys from agentProfiles:', usedKeys.size);
console.log([...usedKeys].sort().join('\n'));
