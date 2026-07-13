const fs = require('fs');

const pagePath = 'H:/maxp-platform/apps/frontend/src/pages/admin/agent-profiles/AgentProfilesPage.tsx';
const arPath = 'H:/maxp-platform/apps/frontend/src/locales/ar/sections/agentProfiles.json';
const enPath = 'H:/maxp-platform/apps/frontend/src/locales/en/sections/agentProfiles.json';

const page = fs.readFileSync(pagePath, 'utf8');
const used = new Set();
const regex = /t\("agentProfiles\.([^"]+)"\)/g;
let m;
while ((m = regex.exec(page)) !== null) {
  used.add(m[1]);
}

function exists(obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object' || !(p in cur)) return false;
    cur = cur[p];
  }
  return typeof cur === 'string';
}

const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const missing = [];
for (const key of used) {
  if (!exists(ar, key) || !exists(en, key)) {
    missing.push(key);
  }
}

console.log('Missing keys count:', missing.length);
for (const k of missing.sort()) {
  const arOk = exists(ar, k);
  const enOk = exists(en, k);
  console.log(`  ${k} | ar:${arOk ? 'OK' : 'MISS'} en:${enOk ? 'OK' : 'MISS'}`);
}
