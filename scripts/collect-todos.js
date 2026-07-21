const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../apps/frontend/src/locales/en/sections');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

const todos = {};

files.forEach(file => {
  const filePath = path.join(localesDir, file);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  for (const [key, val] of Object.entries(content)) {
    if (typeof val === 'string' && val.startsWith('__TODO_TRANSLATE__:')) {
      const arText = val.substring('__TODO_TRANSLATE__:'.length);
      todos[arText] = '';
    } else if (typeof val === 'object' && val !== null) {
      // Handle nested keys (if any, though our script generated flat keys)
      for (const [k2, v2] of Object.entries(val)) {
        if (typeof v2 === 'string' && v2.startsWith('__TODO_TRANSLATE__:')) {
          const arText = v2.substring('__TODO_TRANSLATE__:'.length);
          todos[arText] = '';
        }
      }
    }
  }
});

const outputPath = path.join(__dirname, 'todos.json');
fs.writeFileSync(outputPath, JSON.stringify(todos, null, 2), 'utf8');
console.log(`Collected ${Object.keys(todos).length} unique strings to translate.`);
console.log(`Saved to scripts/todos.json`);
