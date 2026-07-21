const fs = require('fs');
const path = 'apps/frontend/src/pages/orders/PreparationQueue.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  // Fix wrong keys
  ['t(\'preparation.page.allInvalid\')', 't(\'preparation.page.unnamedProduct\')'],
  // Fix the ones that should be different
];

// First pass: replace specific wrong mappings
content = content.replace(
  `record.products?.name || record.products?.sku || t('preparation.page.unnamedProduct')`,
  `record.products?.name || record.products?.sku || t('preparation.page.unnamedProduct')`
);

// Actually let me do targeted replacements for the incorrect allInvalid uses
// The following strings should NOT use allInvalid:
// 1. "منتج غير مسمى" → unnamedProduct
// 2. "مخزن غير محدد" → unnamedWarehouse  
// 3. "منتج غير محدد" → unnamedProduct
// 4. "لا يمكن متابعة الطلب مع وجود نواقص لأن الإعدادات تشترط اكتمال المخزون أولًا." → stockMustBeComplete
// 5. "يجب استكمال checklist فحص الجودة قبل اعتماد التغليف." → qcChecklistRequired

// Let me find and fix each one
const fixes = [
  // These are "fallback names" - they display as labels, need unique keys
  { from: '|| t(\'preparation.page.allInvalid\')', 
    to: '|| t(\'preparation.page.unnamedProduct\')' },
];

for (const fix of fixes) {
  const idx = content.indexOf(fix.from);
  if (idx !== -1) {
    content = content.substring(0, idx) + fix.to + content.substring(idx + fix.from.length);
  }
}

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed!');
