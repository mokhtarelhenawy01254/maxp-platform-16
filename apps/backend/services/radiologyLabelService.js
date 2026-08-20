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

const CODE39_MAP = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', A: '100001001', B: '001001001',
  C: '101001000', D: '000011001', E: '100011000', F: '001011000',
  G: '000001101', H: '100001100', I: '001001100', J: '000011100',
  K: '100000011', L: '001000011', M: '101000010', N: '000010011',
  O: '100010010', P: '001010010', Q: '000000111', R: '100000110',
  S: '001000110', T: '000010110', U: '110000001', V: '011000001',
  W: '111000000', X: '010010001', Y: '110010000', Z: '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100', '*': '010010100',
};

const barPattern = (char) => {
  const key = String(char).toUpperCase();
  return CODE39_MAP[key] || CODE39_MAP['*'];
};

function drawBarcode(doc, text, x, y, barWidth = 1.6, barHeight = 34) {
  const payload = `*${String(text).toUpperCase()}*`;
  let cursor = x;
  for (const ch of payload) {
    const pattern = barPattern(ch);
    for (let i = 0; i < 9; i++) {
      if (pattern[i] === '1') {
        doc.rect(cursor, y, barWidth, barHeight).fill('#111827');
      }
      cursor += barWidth;
    }
    cursor += barWidth;
  }
  doc.fontSize(9).fillColor('#111827').text(AR(text), x, y + barHeight + 4, { width: cursor - x, align: 'center' });
}

function generateStudyLabel(study) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [350, 240], margin: 20 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('Noto', FONT);
    doc.font('Noto');

    doc.fontSize(10).fillColor('#2563eb').text(AR('┘à╪▒┘â╪▓ ╪º┘ä╪ú╪┤╪╣╪⌐'), 20, 18, { align: 'right' });
    doc.fontSize(16).fillColor('#111827').text(AR(study.studyNumber || ''), 20, 34, { align: 'right' });
    doc.moveTo(20, 58).lineTo(330, 58).strokeColor('#e5e7eb').lineWidth(1).stroke();

    doc.fontSize(11).fillColor('#111827').text(AR(study.patientName || 'ΓÇö'), 20, 66, { align: 'right' });
    doc.fontSize(9).fillColor('#4b5563').text(
      `${AR('╪º┘ä┘ü╪¡╪╡:')} ${AR(study.examTypeName || study.modality || 'ΓÇö')}`,
      20, 84, { align: 'right' }
    );
    doc.fontSize(9).fillColor('#4b5563').text(
      `${AR('╪º┘ä╪¬╪º╪▒┘è╪«:')} ${AR(fmtDate(study.createdAt))}`,
      20, 100, { align: 'right' }
    );

    const code = String(study.studyNumber || study.id || 'STUDY').replace(/[^A-Za-z0-9-]/g, '');
    drawBarcode(doc, code, 40, 130);

    doc.end();
  });
}

module.exports = { generateStudyLabel };
