import fs from 'node:fs';
import path from 'node:path';

const rootDir = 'h:/max_p_new/frontend/src/storefront';

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('console.log')) {
        // Simple regex to remove console.log statements
        // Handles single line console.logs
        const newContent = content.replace(/console\.log\(.*?\);?/g, '');
        if (newContent !== content) {
          fs.writeFileSync(filePath, newContent, 'utf8');
          console.log(`✅ Cleaned: ${filePath}`);
        }
      }
    }
  });
}

console.log('🚀 Starting storefront cleanup...');
walkDir(rootDir);
console.log('✨ Cleanup complete!');
