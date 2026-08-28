const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { shapeArabic } = require('../utils/arabicShaping');

const FONT = path.join(__dirname, '..', 'fonts', 'NotoSansArabic-Regular.ttf');

const AR = (s) => shapeArabic(String(s ?? ''));

const STATUS_LABEL = {
  RECEIVED: 'تم الاستلام',
  DESIGN: 'التصميم',
  MANUFACTURING: 'التصنيع',
  QC: 'مراجعة الجودة',
  READY: 'جاهز للتسليم',
  DELIVERED: 'تم التسليم',
  CLOSED: 'مغلق',
};

const PRIORITY_LABEL = {
  NORMAL: 'عادي',
  URGENT: 'عاجل',
  STAT: 'طارئ',
};

const STAGE_STATUS_LABEL = {
  PENDING: 'قيد الانتظار',
  IN_PROGRESS: 'جارٍ العمل',
  DONE: 'منجز',
};

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const money = (v) => `${Math.round(Number(v) || 0)} ج.م`;

async function generateWorkOrderPdf({ company, caseRow, workOrderHeader }) {
  const c = caseRow || {};
  const header = workOrderHeader || {};
  const labName = header.labName || (company && company.name) || 'معمل الأسنان';
  const caseNumber = c.caseNumber || '';

  const qrText = `MAXP-CASE-${caseNumber}::${c.id || ''}`;
  let qrBuffer = null;
  try {
    qrBuffer = await QRCode.toBuffer(qrText, { type: 'png', width: 120 });
  } catch (error) {
    console.error('Error generating dental work order QR:', error);
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: false });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), caseNumber }));
    doc.on('error', reject);

    doc.registerFont('Noto', FONT);
    doc.font('Noto');
    const pageWidth = doc.page.width - 80;

    // ── Header ───────────────────────────────────────────────
    doc.fontSize(18).fillColor('#2563eb').text(AR(labName), 40, 40, { align: 'right', width: pageWidth });
    if (header.address || header.phone) {
      doc.fontSize(9).fillColor('#4b5563').text(
        AR([header.address, header.phone].filter(Boolean).join(' | ')),
        40, 68, { align: 'right', width: pageWidth }
      );
    }
    doc.moveTo(40, 88).lineTo(555, 88).strokeColor('#2563eb').lineWidth(2).stroke();

    // ── Title ────────────────────────────────────────────────
    doc.fontSize(15).fillColor('#1f2937').text(AR('أمر شغل'), 40, 98, { align: 'center', width: pageWidth });

    // ── Case info grid ───────────────────────────────────────
    const info = [
      [AR('رقم الحالة'), AR(c.caseNumber || '—')],
      [AR('المريض'), AR(c.patientName || '—')],
      [AR('الطبيب'), AR(c.doctorName || '—')],
      [AR('نوع الشغل'), AR(c.workTypeName || '—')],
      [AR('الأسنان'), AR(c.teeth || '—')],
      [AR('اللون'), AR(c.shade || '—')],
      [AR('الخامة'), AR(c.material || '—')],
      [AR('تاريخ الاستحقاق'), AR(fmtDate(c.dueDate))],
      [AR('الأولوية'), AR(PRIORITY_LABEL[c.priority] || c.priority || '—')],
      [AR('الحالة'), AR(STATUS_LABEL[c.status] || c.status || '—')],
    ];

    const rowH = 18;
    const halfW = pageWidth / 2;
    doc.rect(40, 118, pageWidth, rowH * 5 + 12).fill('#f9fafb').stroke('#e5e7eb');
    for (let i = 0; i < info.length; i++) {
      const [k, v] = info[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 52 + col * halfW;
      const yy = 124 + row * rowH;
      doc.fontSize(8).fillColor('#6b7280').text(k, x, yy);
      doc.fontSize(9).fillColor('#111827').text(v, x + 80, yy);
    }

    // ── Amounts ──────────────────────────────────────────────
    let y = 124 + rowH * 5 + 20;
    doc.fontSize(11).fillColor('#2563eb').text(AR('الملخص المالي'), 40, y);
    y += 18;
    const amounts = [
      [AR('الإجمالي'), AR(money(c.total))],
      [AR('المدفوع'), AR(money(c.paid))],
      [AR('المتبقي'), AR(money(c.remaining))],
    ];
    doc.rect(40, y, pageWidth, 18 * amounts.length + 8).fill('#eff6ff').stroke('#bfdbfe');
    amounts.forEach(([k, v], i) => {
      const yy = y + 6 + i * 18;
      doc.fontSize(9).fillColor('#1e40af').text(k, 52, yy);
      doc.fontSize(9).fillColor('#111827').text(v, 52 + 80, yy);
    });
    y += 18 * amounts.length + 20;

    // ── Production stages ────────────────────────────────────
    doc.fontSize(11).fillColor('#2563eb').text(AR('مراحل الإنتاج'), 40, y);
    y += 18;
    const stages = Array.isArray(c.stages) ? c.stages : [];
    if (stages.length) {
      const colW = [pageWidth * 0.45, pageWidth * 0.3, pageWidth * 0.25];
      const tableX = 40;
      doc.rect(tableX, y, pageWidth, 20).fill('#eff6ff').stroke('#bfdbfe');
      const headers = [AR('المرحلة'), AR('الحالة'), AR('المسؤول')];
      let hx = tableX;
      doc.fontSize(9).fillColor('#1e40af');
      headers.forEach((h, i) => {
        doc.text(h, hx + 4, y + 6, { width: colW[i] - 8 });
        hx += colW[i];
      });
      y += 20;
      stages.forEach((stage, idx) => {
        if (y > doc.page.height - 80) { doc.addPage(); y = 40; }
        if (idx % 2 === 1) doc.rect(tableX, y, pageWidth, 18).fill('#fafafa');
        doc.rect(tableX, y, pageWidth, 18).stroke('#e5e7eb');
        doc.fontSize(9);
        doc.fillColor('#111827').text(AR(stage.name || '—'), tableX + 4, y + 5, { width: colW[0] - 8 });
        doc.fillColor('#374151').text(AR(STAGE_STATUS_LABEL[stage.status] || stage.status || '—'), tableX + colW[0] + 4, y + 5, { width: colW[1] - 8 });
        doc.fillColor('#4b5563').text(AR(stage.assigneeName || '—'), tableX + colW[0] + colW[1] + 4, y + 5, { width: colW[2] - 8 });
        y += 18;
      });
    } else {
      doc.fontSize(9).fillColor('#9ca3af').text(AR('لا توجد مراحل'), 40, y);
      y += 20;
    }

    // ── QR code (bottom-left) ────────────────────────────────
    if (qrBuffer) {
      doc.image(qrBuffer, 40, doc.page.height - 140, { width: 110 });
      doc.fontSize(7).fillColor('#6b7280').text(AR(caseNumber), 40, doc.page.height - 36, { width: 110, align: 'center' });
    }

    // ── Footer ───────────────────────────────────────────────
    doc.fontSize(8).fillColor('#9ca3af').text(
      AR(`تم إنشاء أمر الشغل بتاريخ ${fmtDate(new Date())}`),
      160, doc.page.height - 50,
      { align: 'center', width: pageWidth - 120 }
    );

    doc.end();
  });
}

module.exports = { generateWorkOrderPdf, generateInvoicePdf };

/**
 * فاتورة PDF للعميل (الطبيب) من بيانات الفاتورة + الحالة المرتبطة + ترويسة المعمل.
 */
function generateInvoicePdf({ company, invoice, dentalCase, workOrderHeader }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), invoiceNumber: invoice.invoiceNumber }));
      doc.on('error', reject);

      const pageWidth = 595.28;
      doc.font(FONT);

      // Header
      doc.fontSize(16).fillColor('#1f2937').text(AR(workOrderHeader.labName || company?.name || ''), { align: 'center' });
      doc.fontSize(9).fillColor('#6b7280').text(AR(workOrderHeader.address || ''), { align: 'center' });
      doc.fontSize(9).fillColor('#6b7280').text(AR('هاتف: ' + (workOrderHeader.phone || '—')), { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(pageWidth - 40, doc.y).strokeColor('#d1d5db').lineWidth(1).stroke();
      doc.moveDown(0.5);

      // Invoice title
      doc.fontSize(13).fillColor('#111827').text(AR('فاتورة'), { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor('#374151').text(AR('رقم الفاتورة: ' + invoice.invoiceNumber), { align: 'center' });
      doc.fontSize(9).fillColor('#374151').text(AR('التاريخ: ' + fmtDate(invoice.createdAt || new Date())), { align: 'center' });
      doc.moveDown(0.5);

      // Parties
      doc.fontSize(10).fillColor('#1f2937');
      doc.text(AR('العميل (الطبيب): ' + (invoice.doctorName || '—')));
      doc.text(AR('المريض: ' + (dentalCase?.patientName || invoice.patientName || '—')));
      if (dentalCase) doc.text(AR('الحالة: ' + dentalCase.caseNumber + ' — ' + (dentalCase.workTypeName || '')));
      doc.moveDown(0.5);

      // Amounts table
      const startY = doc.y;
      doc.fontSize(10);
      const rows = [
        ['الإجمالي', invoice.total],
        ['الخصم', invoice.discount],
        ['المدفوع', invoice.paid],
        ['المتبقي', invoice.remaining],
      ];
      doc.fontSize(9).fillColor('#6b7280').text(AR('التفاصيل'), { underline: true });
      doc.moveDown(0.2);
      for (const [label, value] of rows) {
        doc.fontSize(10).fillColor('#1f2937');
        doc.text(AR(label), 60, doc.y, { width: 200 });
        doc.text(String(value), pageWidth - 200, doc.y - doc.currentLineHeight(), { width: 150, align: 'left' });
        doc.moveDown(0.2);
      }
      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(pageWidth - 40, doc.y).strokeColor('#d1d5db').lineWidth(1).stroke();
      doc.moveDown(0.5);

      // Payments
      if (invoice.payments && invoice.payments.length > 0) {
        doc.fontSize(10).fillColor('#1f2937').text(AR('الدفعات:'));
        doc.moveDown(0.2);
        for (const p of invoice.payments) {
          doc.fontSize(9).fillColor('#374151').text(AR(`${fmtDate(p.createdAt)} — ${p.amount} (${p.method || 'OTHER'})`), { indent: 20 });
        }
        doc.moveDown(0.5);
      }

      // Footer
      doc.fontSize(8).fillColor('#9ca3af').text(
        AR(`أُعدت بتاريخ ${fmtDate(new Date())}`),
        0, doc.page.height - 50,
        { align: 'center', width: pageWidth }
      );

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}