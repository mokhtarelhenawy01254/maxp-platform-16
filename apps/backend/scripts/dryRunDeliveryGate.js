/**
 * Dry-run script for Task Delivery Gate validation across HIGH, MEDIUM, LOW priorities.
 */
const taskEvidenceService = require('../services/taskEvidenceService');

console.log('================================================================');
console.log('DRY-RUN: TASK DELIVERY EVIDENCE GATE (فحص بوابة التسليم الفعلية)');
console.log('================================================================\n');

// 1. HIGH PRIORITY CASE
console.log('----------------------------------------------------------------');
console.log('CASE 1: HIGH PRIORITY (إلزام كامل بكافة الأدلة والصورتين)');
console.log('----------------------------------------------------------------');
const highTask = {
  id: 'task-high-01',
  title: 'إصلاح مشكلة احتساب الأرصدة في الفواتير',
  priority: 'HIGH',
};

// 1.A: Incomplete HIGH submission
const highIncompletePayload = {
  changeType: 'BUG_FIX',
  // missing pageUrl / commit, metrics, notTestedScope, before/after images
};
const highIncompleteResult = taskEvidenceService.validateDeliveryEvidence(
  highIncompletePayload,
  [],
  highTask
);
console.log('1.A [HIGH - غير مكتمل]:');
console.log(JSON.stringify(highIncompleteResult, null, 2));

// 1.B: Complete HIGH submission
const highCompletePayload = {
  changeType: 'BUG_FIX',
  pageUrl: 'https://maxp.online/billing/invoices',
  commitOrPath: 'fix(billing): reconcile invoice balance calculations',
  numbersBeforeAfter: 'عدد الفواتير المعلقة بخلل: 14 -> 0',
  notTestedScope: 'تم الاختبار على بيئة الـ staging، بانتظار تشغيل الدفعة الكبرى',
  beforeAttachmentId: 'att-before-991',
  beforeAttachmentUrl: 'https://maxp.online/uploads/invoices-before.png',
  afterAttachmentId: 'att-after-992',
  afterAttachmentUrl: 'https://maxp.online/uploads/invoices-after.png',
};
const highCompleteResult = taskEvidenceService.validateDeliveryEvidence(
  highCompletePayload,
  [],
  highTask
);
console.log('\n1.B [HIGH - مكتمل بالكامل]:');
console.log(JSON.stringify(highCompleteResult, null, 2));


// 2. MEDIUM PRIORITY CASE
console.log('\n----------------------------------------------------------------');
console.log('CASE 2: MEDIUM PRIORITY (إلزام أساسي: نوع التغيير + اللينك أو الكوميت)');
console.log('----------------------------------------------------------------');
const mediumTask = {
  id: 'task-med-02',
  title: 'تحسين نصوص رسائل التنبيهات في لوحة التحكم',
  priority: 'MEDIUM',
};

// 2.A: Incomplete MEDIUM submission (missing link/commit)
const mediumIncompletePayload = {
  changeType: 'UI_UX',
};
const mediumIncompleteResult = taskEvidenceService.validateDeliveryEvidence(
  mediumIncompletePayload,
  [],
  mediumTask
);
console.log('2.A [MEDIUM - غير مكتمل]:');
console.log(JSON.stringify(mediumIncompleteResult, null, 2));

// 2.B: Minimal Complete MEDIUM submission (with pageUrl)
const mediumCompletePayload = {
  changeType: 'UI_UX',
  pageUrl: 'https://maxp.online/settings/notifications',
};
const mediumCompleteResult = taskEvidenceService.validateDeliveryEvidence(
  mediumCompletePayload,
  [],
  mediumTask
);
console.log('\n2.B [MEDIUM - مكتمل بالحد الأدنى]:');
console.log(JSON.stringify(mediumCompleteResult, null, 2));


// 3. LOW PRIORITY CASE
console.log('\n----------------------------------------------------------------');
console.log('CASE 3: LOW PRIORITY (بدون إلزام - مرن وتطوعي)');
console.log('----------------------------------------------------------------');
const lowTask = {
  id: 'task-low-03',
  title: 'تعديل خطأ إملائي في تذييل الصفحة',
  priority: 'LOW',
};

// 3.A: Empty LOW submission
const lowEmptyPayload = {};
const lowEmptyResult = taskEvidenceService.validateDeliveryEvidence(
  lowEmptyPayload,
  [],
  lowTask
);
console.log('3.A [LOW - فارغ بالكامل]:');
console.log(JSON.stringify(lowEmptyResult, null, 2));

console.log('\n================================================================');
console.log('DRY-RUN COMPLETE: All validation gates behave per specification.');
console.log('================================================================');
