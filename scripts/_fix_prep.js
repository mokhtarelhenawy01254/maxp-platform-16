const fs = require('fs');
const path = 'apps/frontend/src/pages/orders/PreparationQueue.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add useTranslation import
if (!content.includes('useTranslation')) {
  content = content.replace(
    `import { useNavigate } from "react-router-dom";`,
    `import { useNavigate } from "react-router-dom";\nimport { useTranslation } from "react-i18next";`
  );
}

// 2. Add const { t } = useTranslation() after useNavigate
if (!content.includes('const { t } = useTranslation()')) {
  content = content.replace(
    `const navigate = useNavigate();`,
    `const navigate = useNavigate();\n  const { t } = useTranslation();`
  );
}

// 3. Replace hardcoded strings with t() calls
const replacements = [
  ['"╪¬┘à ╪Ñ┘è┘é╪º┘ü ┘à╪│╪º╪▒ ╪º┘ä╪¬╪¼┘ç┘è╪▓ ┘à┘å ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä╪¡╪º┘ä┘è╪⌐"', `t('preparation.page.disabled')`],
  ['"┘ä╪º ┘è┘à┘â┘å ┘à╪¬╪º╪¿╪╣╪⌐ ╪º┘ä╪╖┘ä╪¿ ┘à╪╣ ┘ê╪¼┘ê╪» ┘å┘ê╪º┘é╪╡. ┘è┘à┘â┘å┘â ╪¬╪¡╪»┘è╪» ┘à╪«╪▓┘å ╪º┘ä┘ê╪¼┘ç╪⌐ ╪½┘à ╪º╪│╪¬╪«╪»╪º┘à ╪º┘ä┘å┘é┘ä ╪º┘ä╪│╪▒┘è╪╣ ┘à┘å ╪º┘ä╪╣┘å╪º╪╡╪▒ ╪º┘ä┘å╪º┘é╪╡╪⌐."', `t('preparation.page.transferNoSource')`],
  ['"┘ä╪º ┘è┘à┘â┘å ┘à╪¬╪º╪¿╪╣╪⌐ ╪º┘ä╪╖┘ä╪¿ ┘à╪╣ ┘ê╪¼┘ê╪» ┘å┘ê╪º┘é╪╡ ┘ä╪ú┘å ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪¬╪┤╪¬╪▒╪╖ ╪º┘â╪¬┘à╪º┘ä ╪º┘ä┘à╪«╪▓┘ê┘å ╪ú┘ê┘ä┘ï╪º."', `t('preparation.page.allInvalid')`],
  ['"┘è╪¼╪¿ ╪º╪│╪¬┘â┘à╪º┘ä checklist ┘ü╪¡╪╡ ╪º┘ä╪¼┘ê╪»╪⌐ ┘é╪¿┘ä ╪º╪╣╪¬┘à╪º╪» ╪º┘ä╪¬╪║┘ä┘è┘ü."', `t('preparation.page.allInvalid')`],
  ['"╪¬┘à ┘ü╪¬╪¡ ┘ê╪▒┘é╪⌐ ╪º┘ä╪¬╪¼┘ç┘è╪▓ ┘ä┘ä╪╖╪¿╪º╪╣╪⌐"', `t('preparation.page.slipOpened')`],
  ['"┘ü╪┤┘ä ┘ü┘è ┘ü╪¬╪¡ ┘ê╪▒┘é╪⌐ ╪º┘ä╪¬╪¼┘ç┘è╪▓"', `t('preparation.page.slipFailed')`],
  ['"╪¬╪╣╪░╪▒ ╪º┘ä╪╣╪½┘ê╪▒ ╪╣┘ä┘ë ╪º┘ä╪╖┘ä╪¿ ╪º┘ä┘à╪¡╪»╪»"', `t('preparation.page.orderNotFound')`],
  ['"╪¬┘à ╪¡┘ü╪╕ ╪¿┘è╪º┘å╪º╪¬ ╪¬╪╣┘ä┘è┘é ╪º┘ä╪╣╪¼╪▓"', `t('preparation.page.shortageHoldSaved')`],
  ['"╪¬╪╣╪░╪▒ ╪¡┘ü╪╕ ╪¿┘è╪º┘å╪º╪¬ ╪¬╪╣┘ä┘è┘é ╪º┘ä╪╣╪¼╪▓"', `t('preparation.page.shortageHoldFailed')`],
  ['"╪¬╪╣╪░╪▒ ╪¬╪¡╪»┘è╪½ ┘à╪▒╪¡┘ä╪⌐ ╪º┘ä╪¬╪¼┘ç┘è╪▓"', `t('preparation.page.stageUpdateError')`],
  ['"┘â┘ä ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘à╪¡╪»╪»╪⌐ ┘à╪«╪º┘ä┘ü╪⌐ ┘ä┘é┘ê╪º╪╣╪» ╪º┘ä╪¬╪¼┘ç┘è╪▓ ╪º┘ä╪¡╪º┘ä┘è╪⌐"', `t('preparation.page.allInvalid')`],
  ['"╪¬╪╣╪░╪▒ ╪¬╪¡╪»┘è╪½ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘à╪¡╪»╪»╪⌐"', `t('preparation.page.stageUpdateFailed')`],
  ['"┘â┘ä ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä╪╕╪º┘ç╪▒╪⌐ ┘à╪«╪º┘ä┘ü╪⌐ ┘ä┘é┘ê╪º╪╣╪» ╪º┘ä╪¬╪¼┘ç┘è╪▓ ╪º┘ä╪¡╪º┘ä┘è╪⌐"', `t('preparation.page.allInvalid')`],
  ['"╪¬╪╣╪░╪▒ ╪¬╪¡╪»┘è╪½ ╪¼┘à┘è╪╣ ╪º┘ä╪╖┘ä╪¿╪º╪¬"', `t('preparation.page.stageUpdateFailed')`],
  ['"╪¡╪»╪» ┘à╪«╪▓┘å ╪º┘ä┘ê╪¼┘ç╪⌐ ╪ú┘ê┘ä┘ï╪º ┘ä╪¬┘ü╪╣┘è┘ä ╪º┘ä┘å┘é┘ä ╪º┘ä╪│╪▒┘è╪╣"', `t('preparation.page.selectWarehouseFirst')`],
  ['"┘ä╪º ┘è┘ê╪¼╪» ╪╣╪¼╪▓ ╪╡╪º┘ä╪¡ ┘ä┘ä┘å┘é┘ä ┘ü┘è ┘ç╪░╪º ╪º┘ä╪╣┘å╪╡╪▒"', `t('preparation.page.transferNoShortage')`],
  ['"┘ä┘à ┘è╪¬┘à ╪º┘ä╪╣╪½┘ê╪▒ ╪╣┘ä┘ë ┘à╪«╪▓┘å ┘à╪╡╪»╪▒ ┘è┘à┘ä┘â ┘â┘à┘è╪⌐ ┘â╪º┘ü┘è╪⌐ ┘ä┘ä┘å┘é┘ä"', `t('preparation.page.transferNoSource')`],
  ['"╪¬╪╣╪░╪▒ ╪¬┘å┘ü┘è╪░ ╪º┘ä┘å┘é┘ä ╪º┘ä╪│╪▒┘è╪╣"', `t('preparation.page.transferFailed')`],
  ['"╪¡╪»╪» ╪╖┘ä╪¿┘ï╪º ┘ê╪º╪¡╪»┘ï╪º ╪╣┘ä┘ë ╪º┘ä╪ú┘é┘ä ┘ä┘ä╪Ñ╪▒╪│╪º┘ä ╪Ñ┘ä┘ë ╪¬╪▒╪¿┘ê"', `t('preparation.page.selectOrderFirst')`],
  ['"┘ü╪┤┘ä ╪º┘ä╪Ñ╪▒╪│╪º┘ä ╪Ñ┘ä┘ë ╪¬╪▒╪¿┘ê"', `t('preparation.page.failedToTurbo')`],
  ['"╪¬╪╣╪░╪▒ ╪º┘ä╪Ñ╪▒╪│╪º┘ä ╪Ñ┘ä┘ë ╪¬╪▒╪¿┘ê"', `t('preparation.page.failedToTurbo')`],
  ['"╪¡╪»╪» ╪╖┘ä╪¿┘ï╪º ┘ê╪º╪¡╪»┘ï╪º ╪╣┘ä┘ë ╪º┘ä╪ú┘é┘ä ┘ä╪╖╪¿╪º╪╣╪⌐ ╪º┘ä┘ü┘ê╪º╪¬┘è╪▒"', `t('preparation.page.selectOrderFirst')`],
  ['"┘ä┘à ┘è╪¬┘à ╪º┘ä╪╣╪½┘ê╪▒ ╪╣┘ä┘ë ┘ü┘ê╪º╪¬┘è╪▒ ┘ä┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘à╪¡╪»╪»╪⌐"', `t('preparation.page.invoiceNotFound')`],
  ['"┘ü╪┤┘ä ┘ü┘è ╪¬╪¼┘ç┘è╪▓ ╪º┘ä┘ü┘ê╪º╪¬┘è╪▒"', `t('preparation.page.invoicePrintFailed')`],
  ['"╪¬╪╣╪░╪▒ ╪╖╪¿╪º╪╣╪⌐ ╪º┘ä┘ü┘ê╪º╪¬┘è╪▒"', `t('preparation.page.invoicePrintError')`],
  ['"┘ü┘è ╪º┘å╪¬╪╕╪º╪▒ ╪º┘ä╪¬╪¼┘ç┘è╪▓"', `t('preparation.page.stages.WAITING')`],
  ['"┘é┘è╪» ╪º┘ä╪¬╪¼┘ç┘è╪▓"', `t('preparation.page.stages.PREPARING')`],
  ['"┘ü╪¡╪╡ ╪º┘ä╪¼┘ê╪»╪⌐"', `t('preparation.page.stages.QUALITY_CHECK')`],
  ['"╪¬┘à ╪º┘ä╪¬╪║┘ä┘è┘ü"', `t('preparation.page.stages.PACKAGED')`],
  ['"┘à╪ñ╪¼┘ä ╪¿╪│╪¿╪¿ ╪º┘ä╪╣╪¼╪▓"', `t('preparation.page.stages.STOCK_SHORTAGE')`],
  ['"╪¼╪º┘ç╪▓ ┘ä┘ä╪┤╪¡┘å"', `t('preparation.page.stages.READY_TO_SHIP')`],
  ['"┘à┘å╪¬╪¼ ╪║┘è╪▒ ┘à╪│┘à┘ë"', `t('preparation.page.allInvalid')`],
  ['"┘à╪«╪▓┘å ╪║┘è╪▒ ┘à╪¡╪»╪»"', `t('preparation.page.allInvalid')`],
  ['"┘à┘å╪¬╪¼ ╪║┘è╪▒ ┘à╪¡╪»╪»"', `t('preparation.page.allInvalid')`],
];

for (const [from, to] of replacements) {
  // Use a safer approach - find the exact string and replace
  const idx = content.indexOf(from);
  if (idx !== -1) {
    content = content.substring(0, idx) + to + content.substring(idx + from.length);
  } else {
    console.log('NOT FOUND:', from.substring(0, 50));
  }
}

fs.writeFileSync(path, content, 'utf8');
console.log('Done!');
