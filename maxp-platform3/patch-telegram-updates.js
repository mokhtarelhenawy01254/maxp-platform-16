const fs = require('fs');
const path = require('path');

const CANDIDATES = [
  '/var/www/backend2/node_modules/telegram/client/updates.js',
  '/var/www/backend2/node_modules/gramjs/client/updates.js',
  path.resolve(__dirname, 'apps/backend/node_modules/telegram/client/updates.js'),
  path.resolve(__dirname, 'apps/backend/node_modules/gramjs/client/updates.js'),
  path.resolve(__dirname, 'node_modules/telegram/client/updates.js'),
  path.resolve(__dirname, 'node_modules/gramjs/client/updates.js'),
];

const oldStr = `        if (!builder.resolved) {
            await builder.resolve(client);
        }`;
const newStr = `        if (!builder.resolved) {
            try {
                await builder.resolve(client);
            } catch (e) {
                if (e.message && e.message.includes("resolve() called for non-request instance")) {
                    continue;
                }
                throw e;
            }
        }`;

let patched = false;
for (const target of CANDIDATES) {
  if (!fs.existsSync(target)) continue;
  let content = fs.readFileSync(target, 'utf8');
  if (content.includes(newStr)) {
    console.log('✔️ Already patched:', target);
    patched = true;
    continue;
  }
  if (!content.includes(oldStr)) {
    console.log('⚠️  Pattern not found in', target);
    continue;
  }
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(target, content);
  console.log('✅ Patched:', target);
  patched = true;
}

if (!patched) {
  console.error('❌ Could not find telegram/gramjs updates.js to patch');
  process.exit(1);
}
