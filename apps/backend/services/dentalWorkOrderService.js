const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { shapeArabic, hasArabic } = require('../utils/arabicShaping');

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
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd}`;
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
    const doc = new PDFDocument({ size: 'A4', margins: { top: 30, bottom: 20, left: 40, right: 40 }, bufferPages: false });
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

    const rowH = 20;
    const halfW = pageWidth / 2;
    doc.rect(40, 118, pageWidth, rowH * 5 + 12).fill('#f9fafb').stroke('#e5e7eb');
    for (let i = 0; i < info.length; i++) {
      const [k, v] = info[i];
      const col = i % 2; // 0 = right column, 1 = left column in RTL
      const row = Math.floor(i / 2);
      const colX = col === 0 ? 40 + halfW : 40;
      const yy = 124 + row * rowH;
      const labelW = 85;
      const valW = halfW - labelW - 16;
      doc.fontSize(8.5).fillColor('#6b7280').text(k, colX + valW + 4, yy, { width: labelW, align: 'right' });
      doc.fontSize(9).fillColor('#111827').text(v, colX + 8, yy, { width: valW, align: hasArabic(v) ? 'right' : 'left' });
    }

    // ── Amounts ──────────────────────────────────────────────
    let y = 124 + rowH * 5 + 20;
    doc.fontSize(11).fillColor('#2563eb').text(AR('الملخص المالي'), 40, y, { align: 'right', width: pageWidth });
    y += 18;
    const amounts = [
      [AR('الإجمالي:'), AR(money(c.total))],
      [AR('المدفوع:'), AR(money(c.paid))],
      [AR('المتبقي:'), AR(money(c.remaining))],
    ];
    doc.rect(40, y, pageWidth, 20 * amounts.length + 8).fill('#eff6ff').stroke('#bfdbfe');
    amounts.forEach(([k, v], i) => {
      const yy = y + 6 + i * 20;
      doc.fontSize(9).fillColor('#1e40af').text(k, 40 + pageWidth - 110, yy, { width: 100, align: 'right' });
      doc.fontSize(9.5).fillColor('#111827').text(v, 52, yy, { width: pageWidth - 120, align: 'left' });
    });
    y += 20 * amounts.length + 20;

    // ── Production stages ────────────────────────────────────
    doc.fontSize(11).fillColor('#2563eb').text(AR('مراحل الإنتاج والتكليفات'), 40, y, { align: 'right', width: pageWidth });
    y += 18;
    const stages = Array.isArray(c.stages) ? c.stages : [];
    if (stages.length) {
      const colW = [pageWidth * 0.40, pageWidth * 0.30, pageWidth * 0.30];
      const tableX = 40;
      doc.rect(tableX, y, pageWidth, 20).fill('#eff6ff').stroke('#bfdbfe');
      const headers = [
        { title: AR('المسؤول'), x: tableX, w: colW[2] },
        { title: AR('الحالة'), x: tableX + colW[2], w: colW[1] },
        { title: AR('المرحلة'), x: tableX + colW[2] + colW[1], w: colW[0] },
      ];
      doc.fontSize(9).fillColor('#1e40af');
      headers.forEach((h) => {
        doc.text(h.title, h.x + 4, y + 6, { width: h.w - 8, align: 'right' });
      });
      y += 20;
      stages.forEach((stage, idx) => {
        if (y > doc.page.height - 100) { doc.addPage(); y = 40; }
        if (idx % 2 === 1) doc.rect(tableX, y, pageWidth, 18).fill('#fafafa');
        doc.rect(tableX, y, pageWidth, 18).stroke('#e5e7eb');
        doc.fontSize(9);
        doc.fillColor('#4b5563').text(AR(stage.assigneeName || '—'), tableX + 4, y + 5, { width: colW[2] - 8, align: 'right' });
        doc.fillColor('#374151').text(AR(STAGE_STATUS_LABEL[stage.status] || stage.status || '—'), tableX + colW[2] + 4, y + 5, { width: colW[1] - 8, align: 'right' });
        doc.fillColor('#111827').text(AR(stage.name || '—'), tableX + colW[2] + colW[1] + 4, y + 5, { width: colW[0] - 8, align: 'right' });
        y += 18;
      });
    } else {
      doc.fontSize(9).fillColor('#9ca3af').text(AR('لا توجد مراحل'), 40, y, { align: 'right', width: pageWidth });
      y += 20;
    }

    // ── QR code (bottom-left) ────────────────────────────────
    if (qrBuffer) {
      doc.image(qrBuffer, 40, doc.page.height - 135, { width: 100 });
      doc.fontSize(8).fillColor('#6b7280').text(AR(caseNumber), 40, doc.page.height - 35, { width: 100, align: 'center', lineBreak: false });
    }

    // ── Footer ───────────────────────────────────────────────
    doc.fontSize(8).fillColor('#9ca3af').text(
      AR(`تم إنشاء أمر الشغل بتاريخ ${fmtDate(new Date())}`),
      160, doc.page.height - 35,
      { align: 'center', width: pageWidth - 120, lineBreak: false }
    );

    doc.end();
  });
}

module.exports = {
  generateWorkOrderPdf,
  generateInvoicePdf,
  generatePanLabelPdf,
  generateWarrantyCertificatePdf,
  generateDoctorStatementPdf,
};

/**
 * فاتورة PDF للعميل (الطبيب) من بيانات الفاتورة + الحالة المرتبطة + ترويسة المعمل.
 */
function generateInvoicePdf({ company, invoice, dentalCase, items, workOrderHeader }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 25, bottom: 25, left: 30, right: 30 }, bufferPages: true });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), invoiceNumber: invoice.invoiceNumber }));
      doc.on('error', reject);

      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 30;
      const contentWidth = pageWidth - margin * 2;
      doc.font(FONT);

      // Parse consolidated items if present
      let caseItems = Array.isArray(items) && items.length > 0 ? items : [];
      let isConsolidated = false;
      let consolidatedTitle = '';

      if (!caseItems.length && invoice.notes && typeof invoice.notes === 'string' && invoice.notes.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(invoice.notes);
          if (Array.isArray(parsed.items) && parsed.items.length > 0) {
            caseItems = parsed.items;
            isConsolidated = Boolean(parsed.isConsolidated);
            consolidatedTitle = parsed.title || '';
          }
        } catch {}
      }

      if (!caseItems.length && dentalCase) {
        caseItems = [{
          caseNumber: dentalCase.caseNumber || '—',
          patientName: dentalCase.patientName || invoice.patientName || '—',
          workTypeName: dentalCase.workTypeName || '—',
          unitsCount: dentalCase.unitsCount || 1,
          unitPrice: dentalCase.unitPrice || (dentalCase.unitsCount ? Math.round(Number(invoice.total) / dentalCase.unitsCount) : Number(invoice.total)),
          total: Number(invoice.total) || 0,
        }];
      }

      const totalUnits = caseItems.reduce((acc, it) => acc + (Number(it.unitsCount) || 1), 0);
      const invoiceTitle = isConsolidated || caseItems.length > 1 ? 'مطالبة / فاتورة شهرية مجمعة' : 'فاتورة حساب حالة';

      // Header block
      doc.rect(margin, 20, contentWidth, 54).fill('#f8fafc');
      doc.rect(margin, 20, contentWidth, 54).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

      doc.fontSize(14).fillColor('#1e293b').text(AR(workOrderHeader.labName || company?.name || 'معمل الأسنان'), margin + 15, 27, { align: 'right', width: contentWidth - 30 });
      const contactInfo = [
        workOrderHeader.phone && `هاتف: ${workOrderHeader.phone}`,
        workOrderHeader.address && `العنوان: ${workOrderHeader.address}`,
      ].filter(Boolean).join(' | ');
      if (contactInfo) {
        doc.fontSize(8).fillColor('#64748b').text(AR(contactInfo), margin + 15, 48, { align: 'right', width: contentWidth - 30 });
      }

      // Invoice Title Badge
      const titleY = 82;
      doc.rect(margin, titleY, contentWidth, 24).fill(isConsolidated || caseItems.length > 1 ? '#1e3a8a' : '#0f172a');
      doc.fontSize(10.5).fillColor('#ffffff').text(
        AR(`${invoiceTitle} — رقم: ${invoice.invoiceNumber}`),
        margin,
        titleY + 6,
        { width: contentWidth, align: 'center' }
      );

      // Parties & Date info
      const infoY = titleY + 32;
      doc.fontSize(8.5).fillColor('#0f172a');
      const doctorText = `الطبيب / العميل: ${invoice.doctorName || (invoice.doctor && invoice.doctor.name) || 'غير محدد'}`;
      doc.text(AR(doctorText), margin + contentWidth / 2, infoY, { width: contentWidth / 2, align: 'right' });
      if (invoice.doctor?.clinicName) {
        doc.fontSize(8).fillColor('#475569').text(AR(`العيادة / المركز: ${invoice.doctor.clinicName}`), margin + contentWidth / 2, doc.y + 2, { width: contentWidth / 2, align: 'right' });
      }

      doc.fontSize(8).fillColor('#475569');
      doc.text(AR(`تاريخ الإصدار: ${fmtDate(invoice.createdAt || new Date())}`), margin, infoY, { width: contentWidth / 2 - 10, align: 'left' });
      if (invoice.dueDate) {
        doc.text(AR(`تاريخ الاستحقاق: ${fmtDate(invoice.dueDate)}`), margin, doc.y + 2, { width: contentWidth / 2 - 10, align: 'left' });
      }
      doc.text(AR(`إجمالي الحالات: ${caseItems.length} كارتة (${totalUnits} وحدة/كراون)`), margin, doc.y + 2, { width: contentWidth / 2 - 10, align: 'left' });

      let currentY = infoY + 40;

      // Items Table
      const colWidths = {
        idx: 22,
        caseNum: 75,
        patient: 120,
        workType: 135,
        units: 40,
        unitPrice: 60,
        total: 73.28,
      };

      const drawTableHeader = (y) => {
        doc.rect(margin, y, contentWidth, 20).fill('#1e293b');
        doc.fontSize(8).fillColor('#ffffff');
        let x = margin + contentWidth;

        const cols = [
          { text: 'م', w: colWidths.idx },
          { text: 'رقم الكارتة', w: colWidths.caseNum },
          { text: 'اسم المريض', w: colWidths.patient },
          { text: 'نوع التركيبة / الشغل', w: colWidths.workType },
          { text: 'العدد', w: colWidths.units },
          { text: 'سعر الوحدة', w: colWidths.unitPrice },
          { text: 'الإجمالي', w: colWidths.total },
        ];

        cols.forEach((col) => {
          x -= col.w;
          doc.text(AR(col.text), x + 2, y + 5, { width: col.w - 4, align: 'center' });
        });

        return y + 20;
      };

      currentY = drawTableHeader(currentY);

      if (caseItems.length === 0) {
        doc.rect(margin, currentY, contentWidth, 24).fill('#f8fafc');
        doc.rect(margin, currentY, contentWidth, 24).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        doc.fontSize(8).fillColor('#94a3b8').text(AR('لا توجد بنود مفصلة مسجلة بالفاتورة'), margin, currentY + 7, { width: contentWidth, align: 'center' });
        currentY += 28;
      } else {
        caseItems.forEach((it, index) => {
          if (currentY > pageHeight - 130) {
            doc.addPage();
            currentY = drawTableHeader(30);
          }

          const isEven = index % 2 === 0;
          doc.rect(margin, currentY, contentWidth, 18).fill(isEven ? '#ffffff' : '#f8fafc');
          doc.rect(margin, currentY, contentWidth, 18).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

          doc.fontSize(7.5).fillColor('#0f172a');
          let x = margin + contentWidth;

          const rowCols = [
            { text: String(index + 1), w: colWidths.idx, align: 'center', color: '#64748b' },
            { text: it.caseNumber || '—', w: colWidths.caseNum, align: 'center', color: '#2563eb' },
            { text: it.patientName || '—', w: colWidths.patient, align: 'right' },
            { text: it.workTypeName || '—', w: colWidths.workType, align: 'right', color: '#475569' },
            { text: String(it.unitsCount || 1), w: colWidths.units, align: 'center' },
            { text: `${Math.round(it.unitPrice || 0)}`, w: colWidths.unitPrice, align: 'center' },
            { text: `${Math.round(it.total || 0)} ج.م`, w: colWidths.total, align: 'center', color: '#0f172a' },
          ];

          rowCols.forEach((col) => {
            x -= col.w;
            doc.fillColor(col.color || '#0f172a').text(AR(col.text), x + 2, currentY + 4, { width: col.w - 4, align: col.align });
          });

          currentY += 18;
        });
      }

      // Financial Summary Block
      if (currentY > pageHeight - 120) {
        doc.addPage();
        currentY = 30;
      }

      currentY += 8;
      const sumBoxW = 220;
      const sumBoxX = margin;
      doc.rect(sumBoxX, currentY, sumBoxW, 70).fill('#f8fafc');
      doc.rect(sumBoxX, currentY, sumBoxW, 70).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

      const printSummaryLine = (lbl, val, valColor = '#0f172a', isBold = false) => {
        doc.fontSize(isBold ? 9 : 8).fillColor('#475569').text(AR(lbl), sumBoxX + sumBoxW - 100, doc.y, { width: 90, align: 'right' });
        doc.fontSize(isBold ? 9 : 8).fillColor(valColor).text(AR(`${val} ج.م`), sumBoxX + 10, doc.y - doc.currentLineHeight(), { width: 90, align: 'left' });
        doc.moveDown(0.2);
      };

      doc.y = currentY + 6;
      printSummaryLine('إجمالي المطالبة:', `${Math.round(invoice.total || 0)}`);
      if (Number(invoice.discount) > 0) {
        printSummaryLine('الخصم الممنوح:', `-${Math.round(invoice.discount)}`, '#b91c1c');
      }
      printSummaryLine('المسدد:', `${Math.round(invoice.paid || 0)}`, '#047857');
      printSummaryLine('الصافي المتبقي المستحق:', `${Math.round(invoice.remaining || 0)}`, invoice.remaining > 0 ? '#b91c1c' : '#047857', true);

      // Signatures & Stamp
      const signY = currentY + 80;
      if (signY <= pageHeight - 65) {
        doc.fontSize(8).fillColor('#1e3a8a').text(AR('ختم واعتماد المعمل'), margin + 25, signY, { width: 140, align: 'center' });
        doc.rect(margin + 25, signY + 12, 140, 35).strokeColor('#94a3b8').dash(3, { space: 3 }).stroke().undash();

        doc.fontSize(8).fillColor('#1e3a8a').text(AR('توقيع الطبيب / الاستلام'), pageWidth - margin - 165, signY, { width: 140, align: 'center' });
        doc.rect(pageWidth - margin - 165, signY + 12, 140, 35).strokeColor('#94a3b8').dash(3, { space: 3 }).stroke().undash();
      }

      // Footer
      doc.fontSize(7.5).fillColor('#94a3b8').text(
        AR(`أُصدرت بواسطة منصة MaxP — تاريخ الطباعة: ${fmtDate(new Date())}`),
        margin,
        pageHeight - 20,
        { align: 'center', width: contentWidth }
      );

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * ملصق باركود حراري مدمج لعلبة الشغل (Job Pan Label) للطابعات الحرارية (80x50 مم).
 */
async function generatePanLabelPdf({ company, caseRow, workOrderHeader }) {
  const c = caseRow || {};
  const header = workOrderHeader || {};
  const labName = header.labName || (company && company.name) || 'معمل الأسنان';
  const caseNumber = c.caseNumber || '—';

  const qrText = `MAXP-CASE-${caseNumber}::${c.id || ''}`;
  let qrBuffer = null;
  try {
    qrBuffer = await QRCode.toBuffer(qrText, { type: 'png', width: 80, margin: 1 });
  } catch (error) {
    console.error('Error generating pan label QR:', error);
  }

  return new Promise((resolve, reject) => {
    // 80mm x 50mm in PDF points (1mm ~ 2.83465 pt) => 226.8 x 141.7 pt
    const doc = new PDFDocument({ size: [226.8, 141.7], margin: 6 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), caseNumber }));
    doc.on('error', reject);

    doc.registerFont('Noto', FONT);
    doc.font('Noto');

    const w = 226.8 - 12;
    const h = 141.7 - 12;

    // Outer border
    doc.rect(6, 6, w, h).strokeColor('#1e40af').lineWidth(1.5).stroke();

    // Header bar
    doc.rect(6, 6, w, 20).fill('#1e40af');
    doc.fontSize(8).fillColor('#ffffff').text(AR(labName), 10, 10, { width: w - 8, align: 'right' });
    doc.fontSize(9).fillColor('#ffffff').text(caseNumber, 10, 10, { width: w - 8, align: 'left' });

    // QR code on left
    if (qrBuffer) {
      doc.image(qrBuffer, 10, 32, { width: 62, height: 62 });
    }

    // Details on right
    const rightX = 76;
    const rightW = w - 74;
    let y = 30;

    const printLine = (label, val, bold = false) => {
      if (!val || val === '—') return;
      const lineText = `${label}: ${val}`;
      doc.fontSize(bold ? 8 : 7.5).fillColor(bold ? '#1e40af' : '#111827');
      doc.text(AR(lineText), rightX, y, { width: rightW, align: 'right' });
      y += 13;
    };

    printLine('الطبيب', c.doctorName || (c.doctor && c.doctor.name) || '—', true);
    printLine('المريض', c.patientName || '—');
    printLine('الشغل', c.workTypeName || '—');
    printLine('الأسنان', [c.teeth, c.shade && `(${c.shade})`].filter(Boolean).join(' '));

    const priorityStr = c.priority && c.priority !== 'NORMAL' ? `[${PRIORITY_LABEL[c.priority] || c.priority}] ` : '';
    const dueStr = c.dueDate ? fmtDate(c.dueDate) : '—';
    printLine('التسليم', priorityStr + dueStr, Boolean(priorityStr));

    doc.end();
  });
}

/**
 * شهادة ضمان ومطابقة جودة التركيبات للمريض (Patient Warranty Certificate) بمقاس A5.
 */
async function generateWarrantyCertificatePdf({ company, caseRow, workOrderHeader }) {
  const c = caseRow || {};
  const header = workOrderHeader || {};
  const labName = header.labName || (company && company.name) || 'معمل الأسنان';
  const caseNumber = c.caseNumber || '—';
  const warrantyYears = Number(c.warrantyYears) > 0 ? Number(c.warrantyYears) : 5;

  const issueDate = c.deliveredAt ? new Date(c.deliveredAt) : new Date();
  const expiryDate = new Date(issueDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + warrantyYears);

  const qrText = `MAXP-WARRANTY::${caseNumber}::${c.patientName || ''}::${warrantyYears}Y`;
  let qrBuffer = null;
  try {
    qrBuffer = await QRCode.toBuffer(qrText, { type: 'png', width: 100, margin: 1 });
  } catch (error) {
    console.error('Error generating warranty QR:', error);
  }

  return new Promise((resolve, reject) => {
    // A5 Portrait (419.53 x 595.28 pt)
    const doc = new PDFDocument({ size: 'A5', margins: { top: 20, bottom: 10, left: 20, right: 20 } });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), caseNumber }));
    doc.on('error', reject);

    doc.registerFont('Noto', FONT);
    doc.font('Noto');

    const pageWidth = 419.53;
    const pageHeight = 595.28;
    const margin = 20;
    const w = pageWidth - margin * 2;
    const h = pageHeight - margin * 2;

    // Outer Decorative Borders
    doc.rect(margin, margin, w, h).strokeColor('#1e40af').lineWidth(2).stroke();
    doc.rect(margin + 4, margin + 4, w - 8, h - 8).strokeColor('#d97706').lineWidth(0.8).stroke();

    // Top Header Banner
    doc.rect(margin + 6, margin + 6, w - 12, 64).fill('#1e3a8a');
    doc.fontSize(14).fillColor('#ffffff').text(AR(labName), margin + 10, margin + 14, { width: w - 20, align: 'center' });
    doc.fontSize(10).fillColor('#fbbf24').text(AR('شهادة ضمان ومطابقة جودة التركيبات'), margin + 10, margin + 34, { width: w - 20, align: 'center' });
    doc.fontSize(8).fillColor('#93c5fd').text(AR('Patient Dental Prosthetics Warranty Certificate'), margin + 10, margin + 48, { width: w - 20, align: 'center' });

    // Certificate Number & QR Code
    let currentY = margin + 80;
    doc.fontSize(8.5).fillColor('#6b7280').text(AR(`رقم الشهادة: ${caseNumber}`), margin + 15, currentY, { width: 220, align: 'right' });
    doc.fontSize(8.5).fillColor('#6b7280').text(AR(`تاريخ الإصدار: ${fmtDate(issueDate)}`), margin + 15, currentY + 14, { width: 220, align: 'right' });

    if (qrBuffer) {
      doc.image(qrBuffer, pageWidth - margin - 70, currentY - 5, { width: 55, height: 55 });
    }

    currentY += 45;
    doc.moveTo(margin + 15, currentY).lineTo(pageWidth - margin - 15, currentY).strokeColor('#e5e7eb').lineWidth(1).stroke();
    currentY += 12;

    // Certificate Core Fields Box
    doc.rect(margin + 12, currentY, w - 24, 195).fillAndStroke('#f8fafc', '#cbd5e1');

    const drawField = (label, value, y, highlight = false) => {
      const labelW = 120;
      const valW = w - 40 - labelW;
      doc.fontSize(8.5).fillColor('#475569').text(AR(label + ':'), margin + 16 + valW, y, { width: labelW, align: 'right' });
      doc.fontSize(highlight ? 9.5 : 9).fillColor(highlight ? '#1e40af' : '#0f172a').text(AR(value || '—'), margin + 16, y, { width: valW - 8, align: 'right' });
    };

    let fieldY = currentY + 10;
    drawField('اسم المريض', c.patientName, fieldY, true);
    fieldY += 20;
    drawField('الطبيب المعالج / العيادة', c.doctorName || (c.doctor && c.doctor.name), fieldY, true);
    fieldY += 20;
    drawField('نوع التركيبة / التعويض', c.workTypeName, fieldY);
    fieldY += 20;
    drawField('الأسنان المستهدفة', c.teeth, fieldY);
    fieldY += 20;
    drawField('الخامة والماركة المعتمدة', c.materialBrand || c.material || 'Zirconia Premium Multi-Layer', fieldY);
    fieldY += 20;
    drawField('رقم التشغيلة والباتش (Lot #)', c.lotNumber || 'LOT-' + (c.id ? c.id.slice(-8).toUpperCase() : 'CERT'), fieldY);
    fieldY += 20;
    drawField('درجة اللون (Shade)', c.shade, fieldY);
    fieldY += 20;
    drawField('مدة الضمان المعتمدة', `${warrantyYears} سنوات (حتى ${fmtDate(expiryDate)})`, fieldY, true);

    currentY += 210;

    // Warranty Statement
    doc.fontSize(7.5).fillColor('#64748b').text(
      AR('يضمن المعمل جودة الخامات الطبية المستخدمة ومطابقتها للمواصفات الدولية، وخلوها من العيوب المصنعية طوال فترة الضمان المذكورة أعلاه بشرط اتباع إرشادات العناية بالأسنان الموصى بها من الطبيب المعالج.'),
      margin + 16, currentY,
      { width: w - 32, align: 'center', lineGap: 2 }
    );

    // Footer Signature & Stamp
    currentY += 45;
    doc.fontSize(8).fillColor('#1e3a8a').text(AR('ختم واعتماد معمل الأسنان'), margin + 25, currentY, { width: 150, align: 'center' });
    doc.rect(margin + 25, currentY + 12, 150, 40).strokeColor('#94a3b8').dash(3, { space: 3 }).stroke().undash();

    doc.fontSize(8).fillColor('#1e3a8a').text(AR('توقيع الطبيب المعالج'), pageWidth - margin - 175, currentY, { width: 150, align: 'center' });
    doc.rect(pageWidth - margin - 175, currentY + 12, 150, 40).strokeColor('#94a3b8').dash(3, { space: 3 }).stroke().undash();

    // Lab Phone / Address
    doc.fontSize(7).fillColor('#94a3b8').text(
      AR([header.phone && `هاتف: ${header.phone}`, header.address].filter(Boolean).join(' | ')),
      margin, pageHeight - margin - 14,
      { width: w, align: 'center', lineBreak: false }
    );

    doc.end();
  });
}

/**
 * كشف حساب طبيب A4 رسمي من بيانات المعمل، الطبيب، الفواتير، والأرصدة.
 */
async function generateDoctorStatementPdf({ company, doctor, statement, workOrderHeader, from, to }) {
  const header = workOrderHeader || {};
  const labName = header.labName || company?.name || 'معمل الأسنان';
  const docName = doctor?.name || 'طبيب الأسنان';
  const clinicName = doctor?.clinicName || '';
  const phone = doctor?.phone || '';
  const totals = statement?.totals || {};
  const invoices = Array.isArray(statement?.invoices) ? statement.invoices : [];

  const dateFromStr = from ? fmtDate(from) : 'البداية';
  const dateToStr = to ? fmtDate(to) : fmtDate(new Date());

  const qrText = `MAXP-STATEMENT::${doctor?.id || 'DOC'}::${company?.id || 'LAB'}::${totals.closingBalance || totals.remaining || 0}EGP`;
  let qrBuffer = null;
  try {
    qrBuffer = await QRCode.toBuffer(qrText, { type: 'png', width: 90, margin: 1 });
  } catch (err) {
    console.error('Error generating statement QR:', err);
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 25, bottom: 35, left: 30, right: 30 },
        bufferPages: true,
      });

      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve({ buffer: Buffer.concat(chunks) }));
      doc.on('error', reject);

      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 30;
      const contentWidth = pageWidth - margin * 2;

      doc.font(FONT);

      const drawHeader = () => {
        // Lab Info
        doc.fontSize(15).fillColor('#0f172a').text(AR(labName), margin, 25, { width: contentWidth - 75, align: 'right' });
        const sub = [header.phone && `هاتف: ${header.phone}`, header.address].filter(Boolean).join(' | ');
        if (sub) {
          doc.fontSize(8).fillColor('#64748b').text(AR(sub), margin, doc.y + 2, { width: contentWidth - 75, align: 'right' });
        }

        // QR Code on top left
        if (qrBuffer) {
          doc.image(qrBuffer, margin, 22, { width: 55, height: 55 });
        }

        // Horizontal divider line
        const headerBottomY = 82;
        doc.moveTo(margin, headerBottomY).lineTo(pageWidth - margin, headerBottomY).strokeColor('#e2e8f0').lineWidth(1).stroke();

        // Statement Title Bar
        doc.rect(margin, headerBottomY + 6, contentWidth, 24).fill('#f1f5f9');
        doc.fontSize(11).fillColor('#1e293b').text(
          AR('كشف حساب أستاذ مساعد للعميل (Statement of Account)'),
          margin,
          headerBottomY + 12,
          { width: contentWidth, align: 'center' }
        );

        // Doctor & Period Info Box
        const infoY = headerBottomY + 36;
        doc.fontSize(9).fillColor('#0f172a');
        doc.text(AR(`العميل / الطبيب: ${docName}`), margin + (contentWidth / 2), infoY, { width: (contentWidth / 2), align: 'right' });
        if (clinicName) {
          doc.fontSize(8).fillColor('#475569').text(AR(`العيادة / المركز: ${clinicName}`), margin + (contentWidth / 2), doc.y + 2, { width: (contentWidth / 2), align: 'right' });
        }
        if (phone) {
          doc.fontSize(8).fillColor('#475569').text(AR(`رقم الهاتف: ${phone}`), margin + (contentWidth / 2), doc.y + 2, { width: (contentWidth / 2), align: 'right' });
        }

        doc.fontSize(8.5).fillColor('#0f172a').text(AR(`الفترة المحاسبية: من ${dateFromStr} إلى ${dateToStr}`), margin, infoY, { width: (contentWidth / 2) - 10, align: 'left' });
        doc.fontSize(8).fillColor('#475569').text(AR(`تاريخ الاستخراج: ${fmtDate(new Date())}`), margin, infoY + 14, { width: (contentWidth / 2) - 10, align: 'left' });

        return infoY + 38;
      };

      let currentY = drawHeader();

      // Summary Cards (Opening balance, Invoiced, Paid, Remaining, Closing balance)
      const cardW = (contentWidth - 16) / 5;
      const cards = [
        { label: 'الرصيد الافتتاحي', val: `${Math.round(totals.openingBalance || 0)} ج.م`, bg: '#f8fafc', color: '#334155' },
        { label: 'إجمالي المفوتر', val: `${Math.round(totals.invoiced || 0)} ج.م`, bg: '#eff6ff', color: '#1d4ed8' },
        { label: 'إجمالي المسدد', val: `${Math.round(totals.paid || 0)} ج.م`, bg: '#ecfdf5', color: '#047857' },
        { label: 'الخصومات / إشعار دائن', val: `${Math.round(totals.creditTotal || 0)} ج.م`, bg: '#fefce8', color: '#a16207' },
        { label: 'الرصيد الختامي المستحق', val: `${Math.round(totals.closingBalance || totals.remaining || 0)} ج.م`, bg: '#fef2f2', color: '#b91c1c' },
      ];

      doc.font(FONT);
      cards.forEach((c, idx) => {
        const cx = margin + idx * (cardW + 4);
        doc.roundedRect(cx, currentY, cardW, 40, 4).fill(c.bg);
        doc.roundedRect(cx, currentY, cardW, 40, 4).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
        doc.fontSize(7.5).fillColor('#64748b').text(AR(c.label), cx + 2, currentY + 6, { width: cardW - 4, align: 'center' });
        doc.fontSize(9.5).fillColor(c.color).text(AR(c.val), cx + 2, currentY + 22, { width: cardW - 4, align: 'center' });
      });

      currentY += 48;

      // Table Header
      const colWidths = {
        idx: 22,
        date: 58,
        invNumber: 68,
        patient: 110,
        workType: 105,
        total: 58,
        paid: 58,
        remaining: 56,
      };

      const drawTableHeader = (y) => {
        doc.rect(margin, y, contentWidth, 20).fill('#1e293b');
        doc.fontSize(8).fillColor('#ffffff');
        let x = margin + contentWidth;

        const cols = [
          { text: 'م', w: colWidths.idx },
          { text: 'التاريخ', w: colWidths.date },
          { text: 'رقم الفاتورة', w: colWidths.invNumber },
          { text: 'المريض / الحالة', w: colWidths.patient },
          { text: 'نوع التركيبة', w: colWidths.workType },
          { text: 'المفوتر (مدين)', w: colWidths.total },
          { text: 'المسدد (دائن)', w: colWidths.paid },
          { text: 'المتبقي', w: colWidths.remaining },
        ];

        cols.forEach((col) => {
          x -= col.w;
          doc.text(AR(col.text), x + 2, y + 5, { width: col.w - 4, align: 'center' });
        });

        return y + 20;
      };

      currentY = drawTableHeader(currentY);

      if (invoices.length === 0) {
        doc.rect(margin, currentY, contentWidth, 30).fill('#f8fafc');
        doc.rect(margin, currentY, contentWidth, 30).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        doc.fontSize(9).fillColor('#94a3b8').text(AR('لا توجد فواتير أو حركات مسجلة خلال الفترة المحددة'), margin, currentY + 10, { width: contentWidth, align: 'center' });
        currentY += 35;
      } else {
        invoices.forEach((inv, index) => {
          if (currentY > pageHeight - 85) {
            doc.addPage();
            currentY = drawTableHeader(30);
          }

          const isEven = index % 2 === 0;
          doc.rect(margin, currentY, contentWidth, 18).fill(isEven ? '#ffffff' : '#f8fafc');
          doc.rect(margin, currentY, contentWidth, 18).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

          doc.fontSize(7.5).fillColor('#0f172a');
          let x = margin + contentWidth;

          const pName = inv.patientName || inv.case?.patientName || '—';
          const cNum = inv.caseNumber || inv.case?.caseNumber;
          const patientLabel = cNum ? `${pName} (${cNum})` : pName;
          const wType = inv.workTypeName || inv.case?.workTypeName || '—';
          const uCount = inv.unitsCount ?? inv.case?.unitsCount;
          const workTypeLabel = uCount && uCount > 1 ? `${wType} (${uCount} و)` : wType;

          const rowCols = [
            { text: String(index + 1), w: colWidths.idx, align: 'center', color: '#64748b' },
            { text: fmtDate(inv.createdAt), w: colWidths.date, align: 'center' },
            { text: inv.invoiceNumber || inv.id?.slice(0, 8) || '—', w: colWidths.invNumber, align: 'center', color: '#2563eb' },
            { text: patientLabel, w: colWidths.patient, align: 'right' },
            { text: workTypeLabel, w: colWidths.workType, align: 'right', color: '#475569' },
            { text: `${Math.round(inv.total || 0)}`, w: colWidths.total, align: 'center', color: '#0f172a' },
            { text: `${Math.round(inv.paid || 0)}`, w: colWidths.paid, align: 'center', color: '#047857' },
            { text: `${Math.round(inv.remaining || 0)}`, w: colWidths.remaining, align: 'center', color: (inv.remaining > 0 ? '#b91c1c' : '#64748b') },
          ];

          rowCols.forEach((col) => {
            x -= col.w;
            doc.fillColor(col.color || '#0f172a').text(AR(col.text), x + 2, currentY + 4, { width: col.w - 4, align: col.align });
          });

          currentY += 18;
        });
      }

      // Total Row at end of table
      if (currentY > pageHeight - 85) {
        doc.addPage();
        currentY = 30;
      }

      doc.rect(margin, currentY, contentWidth, 20).fill('#f1f5f9');
      doc.rect(margin, currentY, contentWidth, 20).strokeColor('#cbd5e1').lineWidth(1).stroke();
      doc.fontSize(8.5).fillColor('#0f172a');
      doc.text(AR(`الإجمالي (${invoices.length} فاتورة)`), margin + colWidths.remaining + colWidths.paid + colWidths.total, currentY + 5, { width: contentWidth - (colWidths.remaining + colWidths.paid + colWidths.total) - 10, align: 'right' });
      doc.text(AR(`${Math.round(totals.invoiced || 0)}`), margin + colWidths.remaining + colWidths.paid, currentY + 5, { width: colWidths.total, align: 'center' });
      doc.fillColor('#047857').text(AR(`${Math.round(totals.paid || 0)}`), margin + colWidths.remaining, currentY + 5, { width: colWidths.paid, align: 'center' });
      doc.fillColor('#b91c1c').text(AR(`${Math.round(totals.remaining || 0)}`), margin, currentY + 5, { width: colWidths.remaining, align: 'center' });

      currentY += 30;

      // Signatures & Stamp section
      if (currentY > pageHeight - 90) {
        doc.addPage();
        currentY = 30;
      }

      const sigBoxW = (contentWidth - 20) / 2;
      doc.fontSize(8).fillColor('#334155').text(AR('ختم واعتماد إدارة المعمل'), margin + sigBoxW + 20, currentY, { width: sigBoxW, align: 'center' });
      doc.roundedRect(margin + sigBoxW + 20, currentY + 12, sigBoxW, 40, 4).strokeColor('#cbd5e1').dash(3, { space: 3 }).stroke().undash();

      doc.fontSize(8).fillColor('#334155').text(AR('توقيع وموافقة الطبيب / المستلم'), margin, currentY, { width: sigBoxW, align: 'center' });
      doc.roundedRect(margin, currentY + 12, sigBoxW, 40, 4).strokeColor('#cbd5e1').dash(3, { space: 3 }).stroke().undash();

      // Page numbers across all buffered pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(7).fillColor('#94a3b8').text(
          AR(`صفحة ${i + 1} من ${range.count} • منصة MaxP Dental Lab • ${fmtDate(new Date())}`),
          margin,
          pageHeight - 25,
          { width: contentWidth, align: 'center', lineBreak: false }
        );
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}