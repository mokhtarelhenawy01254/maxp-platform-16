const path = require('path');
const PDFDocument = require('pdfkit');
const { shapeArabic } = require('../utils/arabicShaping');

const FONT = path.join(__dirname, '..', 'fonts', 'NotoSansArabic-Regular.ttf');

const FLAG_LABEL = {
  critical_high: '╪º╪▒╪¬┘ü╪º╪╣ ╪¡╪▒╪¼',
  high: '╪╣╪º┘ä┘ì',
  normal: '╪╖╪¿┘è╪╣┘è',
  low: '┘à┘å╪«┘ü╪╢',
  critical_low: '╪º┘å╪«┘ü╪º╪╢ ╪¡╪▒╪¼',
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
  if (!d) return 'ΓÇö';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return 'ΓÇö';
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

    // ΓöÇΓöÇ Header ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    doc.fontSize(20).fillColor('#2563eb').text(AR(company?.name || '╪º┘ä┘à╪╣┘à┘ä'), 40, 40, { align: 'right', width: pageWidth });
    doc.fontSize(10).fillColor('#4b5563').text(
      `${AR('╪▒┘é┘à ╪º┘ä╪¬┘é╪▒┘è╪▒:')} ${AR(order.orderNumber || '')}   ${AR('╪º┘ä╪¬╪º╪▒┘è╪«:')} ${AR(fmtDate(order.createdAt))}`,
      40, 70, { align: 'right', width: pageWidth }
    );
    doc.moveTo(40, 92).lineTo(555, 92).strokeColor('#2563eb').lineWidth(2).stroke();

    // ΓöÇΓöÇ Title ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    doc.fontSize(15).fillColor('#1f2937').text(AR('╪¬┘é╪▒┘è╪▒ ╪¬╪¡╪º┘ä┘è┘ä ╪╖╪¿┘è╪⌐'), 40, 102, { align: 'center', width: pageWidth });

    // ΓöÇΓöÇ Patient info ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const info = [
      [AR('╪º╪│┘à ╪º┘ä┘à╪▒┘è╪╢'), AR(order.patientName)],
      [AR('╪º┘ä┘ç╪º╪¬┘ü'), AR(order.patientPhone || 'ΓÇö')],
      [AR('╪º┘ä╪¼┘å╪│'), AR(order.patientGender || 'ΓÇö')],
      [AR('╪º┘ä╪╣┘à╪▒'), AR(order.patientAge || 'ΓÇö')],
      [AR('╪º┘ä┘à╪¡╪º┘ä ╪Ñ┘ä┘è┘ç'), AR(order.doctorName || 'ΓÇö')],
      [AR('┘ê┘é╪¬ ╪ú╪«╪░ ╪º┘ä╪╣┘è┘å╪⌐'), AR(order.collectionDate ? fmtDate(order.collectionDate) : 'ΓÇö')],
      [AR('┘ê┘é╪¬ ╪º┘ä╪Ñ╪¿┘ä╪º╪║'), AR(order.reportStatus === 'DELIVERED' || order.signedAt ? fmtDate(order.signedAt || order.updatedAt) : 'ΓÇö')],
      [AR('╪│╪º╪╣╪º╪¬ ╪º┘ä╪╡┘è╪º┘à'), AR(order.fastingHours != null ? `${order.fastingHours} ╪│╪º╪╣╪⌐` : 'ΓÇö')],
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

    // ΓöÇΓöÇ Flags ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    let flags = [];
    try {
      const f = typeof order.patientFlags === 'string' ? JSON.parse(order.patientFlags) : order.patientFlags;
      flags = f && typeof f === 'object' ? Object.entries(f).filter(([, v]) => v).map(([k]) => k) : [];
    } catch { /* ignore */ }
    const flagNames = { bleeding: '┘à╪▒┘è╪╢ ╪│┘è┘ê┘ä╪⌐', diabetic: '┘à╪▒┘è╪╢ ╪│┘â╪▒', thyroid: '╪║╪»╪⌐', tumor: '╪ú┘ê╪▒╪º┘à', antibiotic: '┘à╪╢╪º╪» ╪¡┘è┘ê┘è', iron: '╪¡╪»┘è╪»', cortisone: '┘â┘ê╪▒╪¬┘è╪▓┘ê┘å', liver: '┘à╪▒┘è╪╢ ┘â╪¿╪»' };
    if (flags.length) {
      y = 128 + rowH * 4 + 10;
      doc.fontSize(9).fillColor('#92400e').text(`${AR('╪¬┘å╪¿┘è┘ç╪º╪¬:')} ${AR(flags.map((f) => flagNames[f] || f).join('╪î '))}`, 40, y);
      y += 22;
    }

    // ΓöÇΓöÇ Results tables ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    y = flags.length ? y : 128 + rowH * 4 + 16;
    const colW = [140, 120, 90, 130, 85]; // name, result, unit, range, flag
    const tableW = colW.reduce((a, b) => a + b, 0);
    const tableX = 40;

    const drawTableHeader = (yy) => {
      doc.rect(tableX, yy, tableW, 22).fill('#eff6ff').stroke('#bfdbfe');
      const headers = [AR('╪º┘ä╪º╪«╪¬╪¿╪º╪▒'), AR('╪º┘ä┘å╪¬┘è╪¼╪⌐'), AR('╪º┘ä┘ê╪¡╪»╪⌐'), AR('╪º┘ä┘à╪»┘ë ╪º┘ä┘à╪▒╪¼╪╣┘è'), AR('╪º┘ä╪¡╪º┘ä╪⌐')];
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
      const testName = test.test?.name || '╪º╪«╪¬╪¿╪º╪▒';
      const results = parseResults(test.results);
      const params = Array.isArray(test.test?.parameters) ? test.test.parameters : [];
      const byId = new Map(results.map((r) => [r.parameterId, r]));

      if (y > doc.page.height - 160) { doc.addPage(); y = 40; }

      doc.fontSize(11).fillColor('#2563eb').text(AR(testName), tableX, y);
      y += 18;
      y = drawTableHeader(y);

      if (!params.length) {
        y = drawRow([{ text: AR('┘ä╪º ╪¬┘ê╪¼╪» ┘å╪¬╪º╪ª╪¼'), color: '#9ca3af' }, { text: '' }, { text: '' }, { text: '' }, { text: '' }], y, false);
      } else {
        params.forEach((p, idx) => {
          if (y > doc.page.height - 60) { doc.addPage(); y = 40; y = drawTableHeader(y); }
          const r = byId.get(p.id);
          const flag = r?.flag;
          const flagColor = FLAG_COLOR[flag] || '#111827';
          const flagLabel = FLAG_LABEL[flag] || 'ΓÇö';
          y = drawRow([
            { text: AR(p.name), color: '#111827' },
            { text: AR(r?.result ?? 'ΓÇö'), color: '#111827' },
            { text: AR(p.unit || 'ΓÇö'), color: '#4b5563' },
            { text: AR(p.referenceRange || 'ΓÇö'), color: '#4b5563' },
            { text: AR(flagLabel), color: flagColor },
          ], y, idx % 2 === 1);
        });
      }
      y += 10;
    });

    // ΓöÇΓöÇ Signature ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    if (y > doc.page.height - 120) { doc.addPage(); y = 40; }
    y += 20;
    doc.moveTo(40, y).lineTo(250, y).strokeColor('#374151').lineWidth(1).stroke();
    doc.fontSize(10).fillColor('#111827').text(AR(order.signedBy || '╪º┘ä╪¬┘ê┘é┘è╪╣'), 40, y + 6);
    if (order.signedAt) doc.fontSize(9).fillColor('#6b7280').text(AR(fmtDate(order.signedAt)), 40, y + 20);

    // ΓöÇΓöÇ Footer ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    doc.fontSize(8).fillColor('#9ca3af').text(
      AR('╪¬┘à ╪Ñ┘å╪┤╪º╪í ┘ç╪░╪º ╪º┘ä╪¬┘é╪▒┘è╪▒ ╪ó┘ä┘è╪º┘ï ╪¿┘ê╪º╪│╪╖╪⌐ ┘å╪╕╪º┘à ╪º┘ä┘à╪╣┘à┘ä'),
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
