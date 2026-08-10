const path = require('path');
const PDFDocument = require('pdfkit');
const { shapeArabic } = require('../utils/arabicShaping');

const FONT = path.join(__dirname, '..', 'fonts', 'NotoSansArabic-Regular.ttf');

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

const AR = (s) => shapeArabic(String(s ?? ''));

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

function generateOrderPdf(order, company) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: false });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('Noto', FONT);
    doc.font('Noto');
    const pageWidth = doc.page.width - 80; // margins

    // ── Header ───────────────────────────────────────────────
    doc.fontSize(20).fillColor('#2563eb').text(AR(company?.name || 'المعمل'), 40, 40, { align: 'right', width: pageWidth });
    doc.fontSize(10).fillColor('#4b5563').text(
      `${AR('رقم التقرير:')} ${AR(order.orderNumber || '')}   ${AR('التاريخ:')} ${AR(fmtDate(order.createdAt))}`,
      40, 70, { align: 'right', width: pageWidth }
    );
    doc.moveTo(40, 92).lineTo(555, 92).strokeColor('#2563eb').lineWidth(2).stroke();

    // ── Title ────────────────────────────────────────────────
    doc.fontSize(15).fillColor('#1f2937').text(AR('تقرير تحاليل طبية'), 40, 102, { align: 'center', width: pageWidth });

    // ── Patient info ─────────────────────────────────────────
    const info = [
      [AR('اسم المريض'), AR(order.patientName)],
      [AR('الهاتف'), AR(order.patientPhone || '—')],
      [AR('الجنس'), AR(order.patientGender || '—')],
      [AR('العمر'), AR(order.patientAge || '—')],
      [AR('المحال إليه'), AR(order.doctorName || '—')],
      [AR('وقت أخذ العينة'), AR(order.collectionDate ? fmtDate(order.collectionDate) : '—')],
      [AR('وقت الإبلاغ'), AR(order.reportStatus === 'DELIVERED' || order.signedAt ? fmtDate(order.signedAt || order.updatedAt) : '—')],
      [AR('ساعات الصيام'), AR(order.fastingHours != null ? `${order.fastingHours} ساعة` : '—')],
    ];

    let y = 130;
    const rowH = 20;
    const halfW = pageWidth / 2;
    // background box
    doc.rect(40, 120, pageWidth, rowH * 4 + 16).fill('#f9fafb').stroke('#e5e7eb');
    for (let i = 0; i < info.length; i++) {
      const [k, v] = info[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 52 + col * halfW;
      const yy = 128 + row * rowH;
      doc.fontSize(9).fillColor('#6b7280').text(k, x, yy);
      doc.fontSize(10).fillColor('#111827').text(v, x + 90, yy);
    }

    // ── Flags ────────────────────────────────────────────────
    let flags = [];
    try {
      const f = typeof order.patientFlags === 'string' ? JSON.parse(order.patientFlags) : order.patientFlags;
      flags = f && typeof f === 'object' ? Object.entries(f).filter(([, v]) => v).map(([k]) => k) : [];
    } catch { /* ignore */ }
    const flagNames = { bleeding: 'مريض سيولة', diabetic: 'مريض سكر', thyroid: 'غدة', tumor: 'أورام', antibiotic: 'مضاد حيوي', iron: 'حديد', cortisone: 'كورتيزون', liver: 'مريض كبد' };
    if (flags.length) {
      y = 128 + rowH * 4 + 10;
      doc.fontSize(9).fillColor('#92400e').text(`${AR('تنبيهات:')} ${AR(flags.map((f) => flagNames[f] || f).join('، '))}`, 40, y);
      y += 22;
    }

    // ── Results tables ───────────────────────────────────────
    y = flags.length ? y : 128 + rowH * 4 + 16;
    const colW = [140, 120, 90, 130, 85]; // name, result, unit, range, flag
    const tableW = colW.reduce((a, b) => a + b, 0);
    const tableX = 40;

    const drawTableHeader = (yy) => {
      doc.rect(tableX, yy, tableW, 22).fill('#eff6ff').stroke('#bfdbfe');
      const headers = [AR('الاختبار'), AR('النتيجة'), AR('الوحدة'), AR('المدى المرجعي'), AR('الحالة')];
      let hx = tableX;
      doc.fontSize(9).fillColor('#1e40af');
      headers.forEach((h, i) => {
        doc.text(h, hx + 4, yy + 6, { width: colW[i] - 8 });
        hx += colW[i];
      });
      return yy + 22;
    };

    const drawRow = (cells, yy, alt) => {
      if (alt) doc.rect(tableX, yy, tableW, 20).fill('#fafafa');
      doc.rect(tableX, yy, tableW, 20).stroke('#e5e7eb');
      let cx = tableX;
      doc.fontSize(9);
      cells.forEach((cell, i) => {
        const color = cell.color || '#111827';
        doc.fillColor(color).text(cell.text, cx + 4, yy + 6, { width: colW[i] - 8 });
        cx += colW[i];
      });
      return yy + 20;
    };

    (order.tests || []).forEach((test) => {
      const testName = test.test?.name || 'اختبار';
      const results = parseResults(test.results);
      const params = Array.isArray(test.test?.parameters) ? test.test.parameters : [];
      const byId = new Map(results.map((r) => [r.parameterId, r]));

      if (y > doc.page.height - 160) { doc.addPage(); y = 40; }

      doc.fontSize(11).fillColor('#2563eb').text(AR(testName), tableX, y);
      y += 18;
      y = drawTableHeader(y);

      if (!params.length) {
        y = drawRow([{ text: AR('لا توجد نتائج'), color: '#9ca3af' }, { text: '' }, { text: '' }, { text: '' }, { text: '' }], y, false);
      } else {
        params.forEach((p, idx) => {
          if (y > doc.page.height - 60) { doc.addPage(); y = 40; y = drawTableHeader(y); }
          const r = byId.get(p.id);
          const flag = r?.flag;
          const flagColor = FLAG_COLOR[flag] || '#111827';
          const flagLabel = FLAG_LABEL[flag] || '—';
          y = drawRow([
            { text: AR(p.name), color: '#111827' },
            { text: AR(r?.result ?? '—'), color: '#111827' },
            { text: AR(p.unit || '—'), color: '#4b5563' },
            { text: AR(p.referenceRange || '—'), color: '#4b5563' },
            { text: AR(flagLabel), color: flagColor },
          ], y, idx % 2 === 1);
        });
      }
      y += 10;
    });

    // ── Signature ────────────────────────────────────────────
    if (y > doc.page.height - 120) { doc.addPage(); y = 40; }
    y += 20;
    doc.moveTo(40, y).lineTo(250, y).strokeColor('#374151').lineWidth(1).stroke();
    doc.fontSize(10).fillColor('#111827').text(AR(order.signedBy || 'التوقيع'), 40, y + 6);
    if (order.signedAt) doc.fontSize(9).fillColor('#6b7280').text(AR(fmtDate(order.signedAt)), 40, y + 20);

    // ── Footer ───────────────────────────────────────────────
    doc.fontSize(8).fillColor('#9ca3af').text(
      AR('تم إنشاء هذا التقرير آلياً بواسطة نظام المعمل'),
      40, doc.page.height - 50,
      { align: 'center', width: pageWidth }
    );

    doc.end();
  });
}

function generateLabelPdf(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [210, 100], margin: 12 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('Noto', FONT);
    doc.font('Noto');

    doc.fontSize(26).fillColor('#111827').text(AR(order.orderNumber || ''), 12, 14, { align: 'center', width: 186 });
    doc.fontSize(13).fillColor('#4b5563').text(AR(order.patientName), 12, 48, { align: 'center', width: 186 });
    const info = [AR(order.patientGender || ''), AR(order.patientAge || '')].filter(Boolean).join(' - ');
    if (info) doc.fontSize(10).fillColor('#6b7280').text(info, 12, 68, { align: 'center', width: 186 });
    doc.moveTo(12, 88).lineTo(198, 88).strokeColor('#d1d5db').lineWidth(1).stroke();

    doc.end();
  });
}

module.exports = { generateOrderPdf, generateLabelPdf };