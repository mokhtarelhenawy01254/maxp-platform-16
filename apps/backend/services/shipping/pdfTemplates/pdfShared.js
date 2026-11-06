/**
 * PDF Template Shared Drawing Engine (SHIP-W17)
 * High-precision A6 layout (105mm x 148mm), Code128 barcode, QR tracking, and Arabic shaping.
 */

const path = require('path');
const QRCode = require('qrcode');
const { shapeArabic } = require('../../../utils/arabicShaping');

const FONT_PATH = path.resolve(__dirname, '../../../fonts/NotoSansArabic-Regular.ttf');

// A6 standard dimensions in PostScript points (72 points / inch)
const PAGE_WIDTH = 297.64; // 105 mm
const PAGE_HEIGHT = 419.53; // 148 mm
const MARGIN = 11.34; // 4 mm
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // ~274.96 pt
const CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN * 2; // ~396.85 pt

/**
 * Safe Arabic shaping wrapper that handles mixed content, numbers, and nulls
 */
function AR(val) {
  if (val === null || val === undefined || val === '') return '';
  return shapeArabic(String(val));
}

/**
 * Ensure Arabic font is registered on the PDFKit document
 */
function ensureArabicFont(doc) {
  try {
    doc.registerFont('CairoFont', FONT_PATH);
    doc.font('CairoFont');
  } catch (err) {
    try {
      doc.registerFont('CairoFont', path.resolve(__dirname, '../../../../fonts/NotoSansArabic-Regular.ttf'));
      doc.font('CairoFont');
    } catch (_) {
      doc.font('Helvetica');
    }
  }
}

const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

/**
 * Draw Code128 (Subset B) barcode with clean bars and quiet zones
 */
function drawCode128(doc, text, x, y, maxWidth = 190, height = 34) {
  const clean = String(text || '').trim().replace(/[^\x20-\x7E]/g, '');
  if (!clean) return;

  const codes = [104]; // Start B
  let checksum = 104;
  for (let i = 0; i < clean.length; i++) {
    const c = clean.charCodeAt(i) - 32;
    codes.push(c);
    checksum += c * (i + 1);
  }
  codes.push(checksum % 103);
  codes.push(106); // Stop

  let totalModules = 0;
  const elements = [];
  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    if (!pattern) continue;
    let isBar = true;
    for (let j = 0; j < pattern.length; j++) {
      const w = parseInt(pattern[j], 10);
      if (isBar) elements.push({ x: totalModules, width: w });
      totalModules += w;
      isBar = !isBar;
    }
  }

  // Draw pure white background behind barcode for quiet zone
  doc.rect(x - 2, y - 2, maxWidth + 4, height + 16).fill('#ffffff');

  const barUnit = Math.max(0.7, Math.min(1.2, (maxWidth - 10) / (totalModules + 4)));
  const renderedWidth = totalModules * barUnit;
  const startX = x + Math.max(0, (maxWidth - renderedWidth) / 2);

  for (const el of elements) {
    doc.rect(startX + el.x * barUnit, y, el.width * barUnit, height).fill('#000000');
  }

  // Draw human readable text below barcode
  ensureArabicFont(doc);
  doc.fontSize(7).fillColor('#0f172a')
    .text(clean, x, y + height + 2, { width: maxWidth, align: 'center' });
}

/**
 * Generate high-res QR code buffer
 */
async function generateQrBuffer(text) {
  if (!text) return null;
  try {
    return await QRCode.toBuffer(String(text), {
      width: 140,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.warn('[PDF] QR code generation fallback:', err.message);
    return null;
  }
}

/**
 * Draw A6 outer frame border
 */
function drawOuterBorder(doc) {
  doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, CONTENT_HEIGHT)
    .lineWidth(1.0)
    .strokeColor('#0f172a')
    .stroke();
}

/**
 * Draw bilingual banner header
 */
function drawBanner(doc, titleAr, titleEn, companyName) {
  const bannerHeight = 24;
  doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, bannerHeight).fill('#0f172a');

  ensureArabicFont(doc);
  // Title on right (Arabic)
  doc.fontSize(9.5).fillColor('#ffffff')
    .text(`${AR(titleAr)} | ${titleEn}`, MARGIN + 6, MARGIN + 6, {
      align: 'right',
      width: CONTENT_WIDTH - 12,
    });

  // Company on left if provided
  if (companyName) {
    doc.fontSize(8).fillColor('#94a3b8')
      .text(AR(companyName), MARGIN + 8, MARGIN + 7, {
        align: 'left',
        width: 110,
      });
  }
}

/**
 * Draw a clean divider line
 */
function drawDivider(doc, y) {
  doc.moveTo(MARGIN, y)
    .lineTo(MARGIN + CONTENT_WIDTH, y)
    .lineWidth(0.6)
    .strokeColor('#cbd5e1')
    .stroke();
}

module.exports = {
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN,
  CONTENT_WIDTH,
  CONTENT_HEIGHT,
  FONT_PATH,
  AR,
  ensureArabicFont,
  drawCode128,
  generateQrBuffer,
  drawOuterBorder,
  drawBanner,
  drawDivider,
};
