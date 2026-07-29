const fs = require('fs');
const c = fs.readFileSync('apps/frontend/src/pages/orders/OrderDetails.tsx', 'utf-8');
const j = JSON.parse(fs.readFileSync('apps/frontend/src/locales/en/sections/orders/orderDetails.json', 'utf-8'));
const tk = /t\(['"]([\w.]+)['"]\)/g;
let u = [], m;
while ((m = tk.exec(c)) !== null) u.push(m[1]);
let f = [];
function fl(o, p) { for (const k of Object.keys(o)) { const pk = p ? p+'.'+k : k; if (typeof o[k] === 'object' && o[k] !== null) fl(o[k], pk); else f.push(pk); } }
fl(j, '');
const s = new Set(f);
const mi = u.filter(k => !s.has(k));
console.log('t() calls:', u.length);
console.log('JSON keys:', f.length);
if (mi.length) { console.log('MISSING KEYS:'); mi.forEach(k => console.log('  ' + k)); }
else console.log('All keys exist in JSON');
