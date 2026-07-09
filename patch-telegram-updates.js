const fs = require('fs');
const path = '/var/www/backend2/node_modules/telegram/client/updates.js';
let content = fs.readFileSync(path, 'utf8');
const oldStr = `        if (!builder.resolved) {
            await builder.resolve(client);
        }`;
const newStr = `        if (!builder.resolved) {
            try {
                await builder.resolve(client);
            } catch (e) {
                if (e.message === "resolve() called for non-request instance") {
                    continue;
                }
                throw e;
            }
        }`;
if (content.includes(oldStr)) {
    content = content.replace(oldStr, newStr);
    fs.writeFileSync(path, content);
    console.log('✅ Patched successfully');
} else {
    console.log('❌ Pattern not found in file');
}
