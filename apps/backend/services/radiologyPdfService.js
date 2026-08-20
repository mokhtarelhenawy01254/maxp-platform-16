const path = require('path');
const PDFDocument = require('pdfkit');
const { shapeArabic } = require('../utils/arabicShaping');

const FONT = path.join(__dirname, '..', 'fonts', 'NotoSansArabic-Regular.ttf');

const AR = (s) => shapeArabic(String(s ?? ''));

const fmtDate = (d) => {
  if (!d) return 'ΓÇö';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return 'ΓÇö';
  return date.toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

function generateStudyReportPdf(study, company) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: false });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('Noto', FONT);
    doc.font('Noto');
    const pageWidth = doc.page.width - 80;

    doc.fontSize(20).fillColor('#2563eb').text(AR(company?.name || '┘à╪▒┘â╪▓ ╪º┘ä╪ú╪┤╪╣╪⌐'), 40, 40, { align: 'right', width: pageWidth });
    doc.fontSize(10).fillColor('#4b5563').text(
      `${AR('╪▒┘é┘à ╪º┘ä╪¡╪º┘ä╪⌐:')} ${AR(study.studyNumber || '')}   ${AR('╪º┘ä╪¬╪º╪▒┘è╪«:')} ${AR(fmtDate(study.createdAt))}`,
      40, 70, { align: 'right', width: pageWidth }
    );
    doc.moveTo(40, 92).lineTo(555, 92).strokeColor('#2563eb').lineWidth(2).stroke();

    doc.fontSize(15).fillColor('#1f2937').text(AR('╪¬┘é╪▒┘è╪▒ ╪ú╪┤╪╣╪⌐ ╪╖╪¿┘è╪⌐'), 40, 102, { align: 'center', width: pageWidth });

    const info = [
      [AR('╪º╪│┘à ╪º┘ä┘à╪▒┘è╪╢'), AR(study.patientName)],
      [AR('╪º┘ä┘ç╪º╪¬┘ü'), AR(study.patientPhone || 'ΓÇö')],
      [AR('╪º┘ä╪¼┘å╪│'), AR(study.patientGender || 'ΓÇö')],
      [AR('╪º┘ä╪╣┘à╪▒'), AR(study.patientAge || 'ΓÇö')],
      [AR('┘å┘ê╪╣ ╪º┘ä┘ü╪¡╪╡'), AR(study.examTypeName || study.modality || 'ΓÇö')],
      [AR('╪º┘ä╪╖╪¿┘è╪¿ ╪º┘ä┘à╪¡┘è┘ä'), AR(study.referralDoctor || 'ΓÇö')],
      [AR('╪▒┘é┘à ╪º┘ä╪Ñ╪░┘å'), AR(study.accessionNumber || 'ΓÇö')],
      [AR('╪¡╪º┘ä╪⌐ ╪╖╪º╪▒╪ª╪⌐'), AR(study.emergency ? '┘å╪╣┘à' : '┘ä╪º')],
    ];

    let y = 130;
    const rowH = 20;
    const halfW = pageWidth / 2;
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

    y = 220;
    const criticalCategory = study.report?.criticalCategory;
    if (criticalCategory && criticalCategory !== 'NONE') {
      const LABELS = {
        CAT1: '╪╣╪½┘ê╪▒ ╪¡╪▒╪¼ ΓÇö ┘ü╪ª╪⌐ 1 (╪¬┘ê╪º╪╡┘ä ┘ü┘ê╪▒┘è)',
        CAT2: '╪╣╪½┘ê╪▒ ╪¡╪▒╪¼ ΓÇö ┘ü╪ª╪⌐ 2 (╪¬┘ê╪º╪╡┘ä ╪«┘ä╪º┘ä ╪│╪º╪╣╪º╪¬)',
        CAT3: '╪╣╪½┘ê╪▒ ╪¡╪▒╪¼ ΓÇö ┘ü╪ª╪⌐ 3 (╪╣╪▒╪╢╪⌐ ΓÇö ┘à╪¬╪º╪¿╪╣╪⌐)',
      };
      const isCat1 = criticalCategory === 'CAT1';
      const labelColor = isCat1 ? '#dc2626' : '#ea580c';
      const fillColor = isCat1 ? '#fef2f2' : '#fff7ed';
      const strokeColor = isCat1 ? '#dc2626' : '#ea580c';
      const textW = pageWidth - 20;
      const labelText = AR(LABELS[criticalCategory] || LABELS.CAT3);
      const findingText = AR(study.report.criticalFindingText || '');
      let ackText = '';
      if (study.report.criticalAcknowledgedAt) {
        ackText = AR(`╪¬┘à ╪º┘ä╪Ñ╪¿┘ä╪º╪║ ╪╣┘å┘ç ╪¿┘ê╪º╪│╪╖╪⌐ ${study.report.criticalAcknowledgedBy || 'ΓÇö'} ┘ü┘è ${fmtDate(study.report.criticalAcknowledgedAt)}`);
      }
      const startY = y;
      let totalH = doc.heightOfString(labelText, { width: textW });
      if (findingText) totalH += doc.heightOfString(findingText, { width: textW });
      if (ackText) totalH += doc.heightOfString(ackText, { width: textW });
      const boxH = totalH + 20;
      doc.rect(40, startY - 10, pageWidth, boxH).fill(fillColor).stroke(strokeColor);
      doc.fontSize(11).fillColor(labelColor).text(labelText, 50, startY, { width: textW, align: 'right' });
      let ty = startY + doc.heightOfString(labelText, { width: textW });
      if (findingText) {
        doc.fontSize(10).fillColor('#111827').text(findingText, 50, ty, { width: textW, align: 'right' });
        ty += doc.heightOfString(findingText, { width: textW });
      }
      if (ackText) {
        doc.fontSize(9).fillColor('#6b7280').text(ackText, 50, ty, { width: textW, align: 'right' });
      }
      y = startY + totalH + 20;
    }
    doc.fontSize(11).fillColor('#374151').text(AR('╪º┘ä╪¬┘é╪▒┘è╪▒ ╪º┘ä╪╖╪¿┘è'), 40, y, { align: 'right', width: pageWidth });
    y += 22;
    const body = study.report?.reportText || '┘ä╪º ┘è┘ê╪¼╪» ╪¬┘é╪▒┘è╪▒ ╪¿╪╣╪»';
    doc.fontSize(10.5).fillColor('#111827').text(AR(body), 40, y, { align: 'right', width: pageWidth });

    y += doc.y - y + 40;
    const report = study.report;
    if (report) {
      const meta = [];
      meta.push([AR('╪¡╪º┘ä╪⌐ ╪º┘ä╪¬┘é╪▒┘è╪▒'), AR(report.reportStatus || 'ΓÇö')]);
      meta.push([AR('╪¬╪º╪▒┘è╪« ╪º┘ä╪¬┘é╪▒┘è╪▒'), AR(fmtDate(report.signedAt || report.updatedAt))]);
      meta.push([AR('╪ú╪«╪╡╪º╪ª┘è ╪º┘ä╪ú╪┤╪╣╪⌐'), AR(report.signedBy || 'ΓÇö')]);
      doc.rect(40, y, pageWidth, 60).fill('#f9fafb').stroke('#e5e7eb');
      let yy = y + 10;
      for (const [k, v] of meta) {
        doc.fontSize(9).fillColor('#6b7280').text(k, 52, yy);
        doc.fontSize(10).fillColor('#111827').text(v, 150, yy);
        yy += 20;
      }
    }

    doc.end();
  });
}

module.exports = { generateStudyReportPdf };
