const fs = require('fs');
const path = require('path');

const schemaDir = 'e:/max_p_new/max_p_new/backend/prisma/schema';
const files = fs.readdirSync(schemaDir).filter(f => f.endsWith('.prisma') && f !== 'main.prisma');

const mainContent = fs.readFileSync(path.join(schemaDir, 'main.prisma'), 'utf8');
const mainModels = [...mainContent.matchAll(/model\s+([a-zA-Z0-9_]+)\s+{/g)].map(m => m[1]);

console.log(`Summary of main.prisma: ${mainModels.length} models found.`);

const otherModels = new Set();
files.forEach(f => {
    const content = fs.readFileSync(path.join(schemaDir, f), 'utf8');
    const models = [...content.matchAll(/model\s+([a-zA-Z0-9_]+)\s+{/g)].map(m => m[1]);
    models.forEach(m => otherModels.add(m));
});

console.log(`Summary of other files: ${otherModels.size} models found across ${files.length} files.`);

const onlyInMain = mainModels.filter(m => !otherModels.has(m));
console.log(`Models only in main.prisma (${onlyInMain.length}):`, onlyInMain);

const duplicated = mainModels.filter(m => otherModels.has(m));
console.log(`Models duplicated in both (${duplicated.length}).`);
