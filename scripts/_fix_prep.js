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
  ['"تم إيقاف مسار التجهيز من الإعدادات الحالية"', `t('preparation.page.disabled')`],
  ['"لا يمكن متابعة الطلب مع وجود نواقص. يمكنك تحديد مخزن الوجهة ثم استخدام النقل السريع من العناصر الناقصة."', `t('preparation.page.transferNoSource')`],
  ['"لا يمكن متابعة الطلب مع وجود نواقص لأن الإعدادات تشترط اكتمال المخزون أولًا."', `t('preparation.page.allInvalid')`],
  ['"يجب استكمال checklist فحص الجودة قبل اعتماد التغليف."', `t('preparation.page.allInvalid')`],
  ['"تم فتح ورقة التجهيز للطباعة"', `t('preparation.page.slipOpened')`],
  ['"فشل في فتح ورقة التجهيز"', `t('preparation.page.slipFailed')`],
  ['"تعذر العثور على الطلب المحدد"', `t('preparation.page.orderNotFound')`],
  ['"تم حفظ بيانات تعليق العجز"', `t('preparation.page.shortageHoldSaved')`],
  ['"تعذر حفظ بيانات تعليق العجز"', `t('preparation.page.shortageHoldFailed')`],
  ['"تعذر تحديث مرحلة التجهيز"', `t('preparation.page.stageUpdateError')`],
  ['"كل الطلبات المحددة مخالفة لقواعد التجهيز الحالية"', `t('preparation.page.allInvalid')`],
  ['"تعذر تحديث الطلبات المحددة"', `t('preparation.page.stageUpdateFailed')`],
  ['"كل الطلبات الظاهرة مخالفة لقواعد التجهيز الحالية"', `t('preparation.page.allInvalid')`],
  ['"تعذر تحديث جميع الطلبات"', `t('preparation.page.stageUpdateFailed')`],
  ['"حدد مخزن الوجهة أولًا لتفعيل النقل السريع"', `t('preparation.page.selectWarehouseFirst')`],
  ['"لا يوجد عجز صالح للنقل في هذا العنصر"', `t('preparation.page.transferNoShortage')`],
  ['"لم يتم العثور على مخزن مصدر يملك كمية كافية للنقل"', `t('preparation.page.transferNoSource')`],
  ['"تعذر تنفيذ النقل السريع"', `t('preparation.page.transferFailed')`],
  ['"حدد طلبًا واحدًا على الأقل للإرسال إلى تربو"', `t('preparation.page.selectOrderFirst')`],
  ['"فشل الإرسال إلى تربو"', `t('preparation.page.failedToTurbo')`],
  ['"تعذر الإرسال إلى تربو"', `t('preparation.page.failedToTurbo')`],
  ['"حدد طلبًا واحدًا على الأقل لطباعة الفواتير"', `t('preparation.page.selectOrderFirst')`],
  ['"لم يتم العثور على فواتير للطلبات المحددة"', `t('preparation.page.invoiceNotFound')`],
  ['"فشل في تجهيز الفواتير"', `t('preparation.page.invoicePrintFailed')`],
  ['"تعذر طباعة الفواتير"', `t('preparation.page.invoicePrintError')`],
  ['"في انتظار التجهيز"', `t('preparation.page.stages.WAITING')`],
  ['"قيد التجهيز"', `t('preparation.page.stages.PREPARING')`],
  ['"فحص الجودة"', `t('preparation.page.stages.QUALITY_CHECK')`],
  ['"تم التغليف"', `t('preparation.page.stages.PACKAGED')`],
  ['"مؤجل بسبب العجز"', `t('preparation.page.stages.STOCK_SHORTAGE')`],
  ['"جاهز للشحن"', `t('preparation.page.stages.READY_TO_SHIP')`],
  ['"منتج غير مسمى"', `t('preparation.page.allInvalid')`],
  ['"مخزن غير محدد"', `t('preparation.page.allInvalid')`],
  ['"منتج غير محدد"', `t('preparation.page.allInvalid')`],
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
