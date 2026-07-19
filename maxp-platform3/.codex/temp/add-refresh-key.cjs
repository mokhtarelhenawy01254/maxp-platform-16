const fs = require('fs');

const arPath = 'H:/maxp-platform/apps/frontend/src/locales/ar/sections/agentProfiles.json';
const enPath = 'H:/maxp-platform/apps/frontend/src/locales/en/sections/agentProfiles.json';

const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

ar.header.refresh = 'تحديث قائمة الوكلاء';
en.header.refresh = 'Refresh agent list';

fs.writeFileSync(arPath, JSON.stringify(ar, null, 2) + '\n', 'utf8');
fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');

console.log('Added refresh key.');
