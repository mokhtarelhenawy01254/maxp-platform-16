const htmlPdf = require('html-pdf-node');

const FLAG_LABEL = {
  critical_high: 'ارتفاع حرج',
  high: 'عالٍ',
  normal: 'طبيعي',
  low: 'منخفض',
  critical_low: 'انخفاض حرج',
};

const FLAG_COLOR = {
  critical_high: '#dc2626',
  high: '#f59e0b',
  normal: '#16a34a',
  low: '#f59e0b',
  critical_low: '#dc2626',
};

const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

function parseResults(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildResultsTable(test) {
  const params = Array.isArray(test.test?.parameters) ? test.test.parameters : [];
  const results = parseResults(test.results);
  const byId = new Map(results.map(r => [r.parameterId, r]));

  let rows = '';
  for (const p of params) {
    const r = byId.get(p.id);
    const flag = r?.flag;
    const flagCell = flag
      ? `<span style="color:${FLAG_COLOR[flag] || '#333'};font-weight:600">${FLAG_LABEL[flag] || flag}</span>`
      : '<span style="color:#9ca3af">—</span>';
    rows += `<tr>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(r?.result ?? '—')}</td>
      <td>${escapeHtml(p.unit || '—')}</td>
      <td dir="ltr">${escapeHtml(p.referenceRange || '—')}</td>
      <td>${flagCell}</td>
    </tr>`;
  }
  if (!rows) {
    rows = '<tr><td colspan="5" style="text-align:center;color:#9ca3af">لا توجد نتائج</td></tr>';
  }
  return `<h3>${escapeHtml(test.test?.name || 'اختبار')}</h3>
  <table class="results">
    <thead><tr><th>الاختبار</th><th>النتيجة</th><th>الوحدة</th><th>المدى المرجعي</th><th>الحالة</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildOrderHtml(order, company) {
  const testsHtml = (order.tests || []).map(t => buildResultsTable(t)).join('');
  const flags = (() => {
    try {
      const f = typeof order.patientFlags === 'string' ? JSON.parse(order.patientFlags) : order.patientFlags;
      return f && typeof f === 'object' ? Object.entries(f).filter(([, v]) => v).map(([k]) => k) : [];
    } catch { return []; }
  })();
  const flagNames = { bleeding: 'مريض سيولة', diabetic: 'مريض سكر', thyroid: 'غدة', tumor: 'أورام', antibiotic: 'مضاد حيوي', iron: 'حديد', cortisone: 'كورتيزون', liver: 'مريض كبد' };
  const flagsHtml = flags.length
    ? `<p class="flags"><strong>تنبيهات:</strong> ${flags.map(f => `<span class="flag">${flagNames[f] || f}</span>`).join(' ')}</p>`
    : '';

  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #111827; padding: 24px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 12px; }
  .lab-name { font-size: 22px; font-weight: 700; color: #2563eb; }
  .order-info { text-align: left; font-size: 12px; color: #4b5563; }
  .barcode { font-family: 'Courier New', monospace; letter-spacing: 3px; font-size: 16px; font-weight: 700; color: #111827; }
  h2 { margin: 18px 0 10px; font-size: 16px; color: #1f2937; }
  .patient-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; }
  .patient-grid .kv { display: flex; }
  .patient-grid .k { color: #6b7280; min-width: 90px; }
  .patient-grid .v { font-weight: 600; }
  h3 { margin: 14px 0 6px; font-size: 14px; color: #2563eb; }
  table.results { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  table.results th, table.results td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: right; }
  table.results th { background: #eff6ff; color: #1e40af; font-weight: 600; }
  table.results tr:nth-child(even) td { background: #fafafa; }
  .flags { margin: 10px 0; }
  .flag { display: inline-block; background: #fef3c7; color: #92400e; border-radius: 999px; padding: 2px 10px; margin-left: 6px; font-size: 12px; }
  .signature { margin-top: 26px; display: flex; justify-content: space-between; align-items: flex-end; }
  .sig-box { text-align: center; }
  .sig-line { width: 220px; border-bottom: 1.5px solid #374151; margin-bottom: 4px; padding-bottom: 4px; min-height: 22px; }
  .footer { margin-top: 18px; border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 11px; color: #9ca3af; text-align: center; }
</style></head><body>
  <div class="header">
    <div class="lab-name">${escapeHtml(company?.name || 'المعمل')}</div>
    <div class="order-info">
      <div>رقم التقرير: <span class="barcode">${escapeHtml(order.orderNumber || '')}</span></div>
      <div>${order.createdAt ? fmtDate(order.createdAt) : ''}</div>
    </div>
  </div>
  <h2>تقرير تحاليل طبية</h2>
  <div class="patient-grid">
    <div class="kv"><span class="k">اسم المريض</span><span class="v">${escapeHtml(order.patientName)}</span></div>
    <div class="kv"><span class="k">الهاتف</span><span class="v" dir="ltr">${escapeHtml(order.patientPhone || '—')}</span></div>
    <div class="kv"><span class="k">الجنس</span><span class="v">${escapeHtml(order.patientGender || '—')}</span></div>
    <div class="kv"><span class="k">العمر</span><span class="v">${escapeHtml(order.patientAge || '—')}</span></div>
    <div class="kv"><span class="k">المحال إليه</span><span class="v">${escapeHtml(order.doctorName || '—')}</span></div>
    <div class="kv"><span class="k">وقت أخذ العينة</span><span class="v">${order.collectionDate ? fmtDate(order.collectionDate) : '—'}</span></div>
    <div class="kv"><span class="k">وقت الإبلاغ</span><span class="v">${order.reportStatus === 'DELIVERED' || order.signedAt ? fmtDate(order.signedAt || order.updatedAt) : '—'}</span></div>
    <div class="kv"><span class="k">ساعات الصيام</span><span class="v">${order.fastingHours != null ? order.fastingHours + ' ساعة' : '—'}</span></div>
  </div>
  ${flagsHtml}
  ${testsHtml}
  <div class="signature">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div>${order.signedBy ? escapeHtml(order.signedBy) : 'التوقيع'}</div>
      ${order.signedAt ? `<div style="font-size:11px;color:#6b7280">${fmtDate(order.signedAt)}</div>` : ''}
    </div>
  </div>
  <div class="footer">تم إنشاء هذا التقرير آلياً بواسطة نظام المعمل</div>
</body></html>`;
}

async function generateOrderPdf(order, company) {
  const html = buildOrderHtml(order, company);
  const buffer = await htmlPdf.generatePdf(
    { content: html },
    { format: 'A4', printBackground: true, margin: { top: 16, right: 16, bottom: 16, left: 16 } }
  );
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

module.exports = { generateOrderPdf, buildOrderHtml };
