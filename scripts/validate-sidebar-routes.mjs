import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const appTsxPath = path.join(ROOT, 'apps/frontend/src/App.tsx');
const settingsPath = path.join(ROOT, 'apps/frontend/src/pages/settings/Settings.tsx');
const sidebarPath = path.join(ROOT, 'apps/frontend/src/config/sidebar.ts');

const appTsx = fs.readFileSync(appTsxPath, 'utf8');
const appRouteMatches = [...appTsx.matchAll(/path=["']([^"']+)["']/g)].map(m => m[1]);
const appRoutesSet = new Set(appRouteMatches);

const settingsTsx = fs.readFileSync(settingsPath, 'utf8');
const tabMatches = [...settingsTsx.matchAll(/id:\s*["']([^"']+)["']/g)].map(m => m[1]);
const validSettingsTabs = new Set(tabMatches);

const sidebarTs = fs.readFileSync(sidebarPath, 'utf8');

const sectionRegex = /\{\s*id:\s*['"]([^'"]+)['"][\s\S]*?items:\s*\[([\s\S]*?)\]/g;
let match;
const sections = [];

while ((match = sectionRegex.exec(sidebarTs)) !== null) {
  const sectionId = match[1];
  const itemsBlock = match[2];
  
  const itemRegex = /to:\s*['"]([^'"]+)['"](?:[\s\S]*?label:\s*([^,\n}]+))?/g;
  let itemMatch;
  const items = [];
  while ((itemMatch = itemRegex.exec(itemsBlock)) !== null) {
    items.push({
      to: itemMatch[1],
      label: (itemMatch[2] || '').trim()
    });
  }
  
  if (items.length > 0) {
    sections.push({ sectionId, items });
  }
}

function checkRoute(toPath) {
  const cleanPath = toPath.split('?')[0];

  if (toPath.startsWith('http://') || toPath.startsWith('https://')) {
    return { ok: true, type: 'external' };
  }

  // 1. Exact match in App.tsx
  if (appRoutesSet.has(cleanPath)) {
    return { ok: true, type: 'exact' };
  }

  // 2. Settings trap check: 2-segment /settings/:tab
  if (cleanPath.startsWith('/settings/')) {
    const segs = cleanPath.split('/').filter(Boolean);
    if (segs.length === 2) {
      const tab = segs[1];
      if (validSettingsTabs.has(tab)) {
        return { ok: true, type: `settings-tab (${tab})` };
      } else {
        return { ok: false, type: `SETTINGS_TRAP (falls into /settings/:tab but tab '${tab}' is not in Settings.tsx)` };
      }
    }
  }

  // 3. Check dedicated sub-app wildcards (micro-frontends/nested routers)
  const SUB_APP_ROUTERS = [
    '/merchant-portal',
    '/admin/booking',
    '/lab',
    '/radiology',
    '/dental-lab',
    '/dental-portal',
    '/admin/education',
    '/admin/hotel',
    '/accounting',
  ];
  for (const prefix of SUB_APP_ROUTERS) {
    if (cleanPath === prefix || cleanPath.startsWith(prefix + '/')) {
      return { ok: true, type: `sub-app (${prefix}/*)` };
    }
  }

  // 4. Match against specific parameterized routes (excluding generic wildcards like /* and /settings/*)
  for (const r of appRoutesSet) {
    if (r === '/settings/:tab' || r.endsWith('/*') || r === '*') continue;
    if (r.includes(':')) {
      const pattern = '^' + r.replace(/\/:[^/]+/g, '/[^/]+') + '$';
      if (new RegExp(pattern).test(cleanPath)) {
        return { ok: true, type: `param (${r})` };
      }
    }
  }

  return { ok: false, type: 'UNMATCHED (no route in App.tsx)' };
}

console.log('Validating Sidebar Routes...');
let hasStorefrontError = false;
const allFindings = [];

for (const sec of sections) {
  for (const item of sec.items) {
    const res = checkRoute(item.to);
    if (!res.ok) {
      allFindings.push({
        section: sec.sectionId,
        path: item.to,
        label: item.label,
        reason: res.type
      });
      if (sec.sectionId === 'storefront-design') {
        hasStorefrontError = true;
      }
    }
  }
}

if (hasStorefrontError) {
  console.error('❌ Storefront Design section has broken routes:');
  console.error(allFindings.filter(f => f.section === 'storefront-design'));
  process.exit(1);
} else {
  console.log('✅ Storefront Design & Store Management routes are 100% verified.');
}

if (allFindings.length > 0) {
  console.log('\nOther findings across the sidebar:');
  for (const f of allFindings) {
    console.log(`- [${f.section}] ${f.path}: ${f.reason}`);
  }
} else {
  console.log('✅ All sidebar items across all sections are valid.');
}
