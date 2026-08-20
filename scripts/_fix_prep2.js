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
// 1. "┘à┘å╪¬╪¼ ╪║┘è╪▒ ┘à╪│┘à┘ë" ΓåÆ unnamedProduct
// 2. "┘à╪«╪▓┘å ╪║┘è╪▒ ┘à╪¡╪»╪»" ΓåÆ unnamedWarehouse  
// 3. "┘à┘å╪¬╪¼ ╪║┘è╪▒ ┘à╪¡╪»╪»" ΓåÆ unnamedProduct
// 4. "┘ä╪º ┘è┘à┘â┘å ┘à╪¬╪º╪¿╪╣╪⌐ ╪º┘ä╪╖┘ä╪¿ ┘à╪╣ ┘ê╪¼┘ê╪» ┘å┘ê╪º┘é╪╡ ┘ä╪ú┘å ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪¬╪┤╪¬╪▒╪╖ ╪º┘â╪¬┘à╪º┘ä ╪º┘ä┘à╪«╪▓┘ê┘å ╪ú┘ê┘ä┘ï╪º." ΓåÆ stockMustBeComplete
// 5. "┘è╪¼╪¿ ╪º╪│╪¬┘â┘à╪º┘ä checklist ┘ü╪¡╪╡ ╪º┘ä╪¼┘ê╪»╪⌐ ┘é╪¿┘ä ╪º╪╣╪¬┘à╪º╪» ╪º┘ä╪¬╪║┘ä┘è┘ü." ΓåÆ qcChecklistRequired

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
