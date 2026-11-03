/**
 * Waybill A6 PDF Generation Service (SHIP-W2)
 * Generates official A6 shipping labels with Code128 barcode, QR code, and full recipient/sender data
 */

const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { shapeArabic } = require('../../utils/arabicShaping');

const FONT_PATH = path.join(__dirname, '..', '..', 'fonts', 'NotoSansArabic-Regular.ttf');
const AR = (s) => shapeArabic(String(s ?? ''));

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
 * Draw Code128 (Subset B) barcode in PDFKit document
 */
function drawCode128(doc, text, x, y, maxWidth = 200, height = 34) {
  const clean = String(text || '').trim().replace(/[^\x20-\x7E]/g, '');
  if (!clean) return;

  const codes = [104];
  let checksum = 104;
  for (let i = 0; i < clean.length; i++) {
    const c = clean.charCodeAt(i) - 32;
    codes.push(c);
    checksum += c * (i + 1);
  }
  codes.push(checksum % 103);
  codes.push(106);

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

  const barUnit = Math.min(1.3, maxWidth / (totalModules + 6));
  const renderedWidth = (totalModules + 6) * barUnit;
  const startX = x + (maxWidth - renderedWidth) / 2 + 3 * barUnit;

  for (const el of elements) {
    doc.rect(startX + el.x * barUnit, y, el.width * barUnit, height).fill('#000000');
  }

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#111827')
    .text(clean, x, y + height + 2, { width: maxWidth, align: 'center' });
}

/**
 * Generate A6 Shipping Label PDF Buffer
 * @param {Object} shipment - Shipment entity with relation data
 * @returns {Promise<Buffer>}
 */
async function generateWaybillPdf(shipment) {
  const trackingNumber = shipment.trackingNumber || `TRK-${shipment.id.slice(-8).toUpperCase()}`;
  const barcodeValue = shipment.barcode || trackingNumber;
  const qrPayload = trackingNumber;

  // Generate QR Code Buffer
  const qrBuffer = await QRCode.toBuffer(qrPayload, {
    width: 140,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  });

  return new Promise((resolve, reject) => {
    // A6 size: 105mm x 148mm = 297.64 x 419.53 points
    const doc = new PDFDocument({
      size: [297.64, 419.53],
      margins: { top: 12, bottom: 12, left: 12, right: 12 },
      autoFirstPage: true,
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Register Arabic font
    try {
      doc.registerFont('Noto', FONT_PATH);
      doc.font('Noto');
    } catch {
      // Fallback
      doc.font('Helvetica');
    }

    const pageWidth = 297.64;
    const margin = 12;
    const contentWidth = pageWidth - margin * 2; // ~273.64

    // Outer border
    doc.rect(margin, margin, contentWidth, 395).lineWidth(1.2).strokeColor('#1e293b').stroke();

    // Header bar
    doc.rect(margin, margin, contentWidth, 26).fill('#1e293b');
    doc.font('Noto').fontSize(11).fillColor('#ffffff')
      .text(AR('بوليصة شحن سريعة — WAYBILL'), margin + 6, margin + 7, { align: 'right', width: contentWidth - 12 });

    // Top section: Barcode + QR
    const topY = margin + 32;
    // Draw Barcode on the left/center
    drawCode128(doc, barcodeValue, margin + 8, topY, 185, 36);

    // Draw QR on the right
    doc.image(qrBuffer, margin + 205, topY, { width: 56, height: 56 });
    doc.font('Helvetica-Bold').fontSize(6).fillColor('#64748b')
      .text(trackingNumber, margin + 200, topY + 58, { width: 66, align: 'center' });

    // Divider line
    const divY1 = topY + 72;
    doc.moveTo(margin, divY1).lineTo(margin + contentWidth, divY1).lineWidth(0.8).strokeColor('#cbd5e1').stroke();

    // Summary strip (Governorate & Order ID)
    const govText = shipment.destinationGovernorate || 'القاهرة';
    const orderRef = shipment.merchantOrderId || shipment.orderId || '—';
    doc.rect(margin, divY1, contentWidth, 24).fill('#f1f5f9');
    doc.font('Noto').fontSize(12).fillColor('#0f172a')
      .text(`${AR('المحافظة:')} ${AR(govText)}`, margin + 10, divY1 + 6, { align: 'right', width: contentWidth / 2 - 10 });
    doc.font('Noto').fontSize(9).fillColor('#334155')
      .text(`${AR('رقم الطلب:')} ${orderRef}`, margin + 10, divY1 + 7, { align: 'left', width: contentWidth / 2 - 10 });

    const divY2 = divY1 + 24;
    doc.moveTo(margin, divY2).lineTo(margin + contentWidth, divY2).lineWidth(0.8).strokeColor('#cbd5e1').stroke();

    // Recipient Section (المستلم)
    const recY = divY2 + 6;
    doc.font('Noto').fontSize(10).fillColor('#1e293b')
      .text(AR('بيانات المستلم (Consignee):'), margin + 8, recY, { align: 'right', width: contentWidth - 16 });

    const recName = shipment.recipientName || '—';
    const recPhone = shipment.recipientPhone || '—';
    const recPhone2 = shipment.recipientPhone2 ? ` / ${shipment.recipientPhone2}` : '';
    const recAddress = `${shipment.destinationAddress || '—'}${shipment.destinationCity ? ` - ${shipment.destinationCity}` : ''}`;

    doc.font('Noto').fontSize(10).fillColor('#09090b')
      .text(`${AR('الاسم:')} ${AR(recName)}`, margin + 8, recY + 14, { align: 'right', width: contentWidth - 16 });
    doc.font('Noto').fontSize(9.5).fillColor('#09090b')
      .text(`${AR('الهاتف:')} ${recPhone}${recPhone2}`, margin + 8, recY + 28, { align: 'right', width: contentWidth - 16 });
    doc.font('Noto').fontSize(8.5).fillColor('#334155')
      .text(`${AR('العنوان:')} ${AR(recAddress)}`, margin + 8, recY + 42, { align: 'right', width: contentWidth - 16 });

    // Divider
    const divY3 = recY + 68;
    doc.moveTo(margin, divY3).lineTo(margin + contentWidth, divY3).lineWidth(0.8).strokeColor('#cbd5e1').stroke();

    // Sender Section (المرسل)
    const sndY = divY3 + 4;
    doc.font('Noto').fontSize(8.5).fillColor('#64748b')
      .text(AR('بيانات الراسل (Shipper):'), margin + 8, sndY, { align: 'right', width: contentWidth - 16 });

    const sndName = shipment.senderName || shipment.company?.name || '—';
    const sndPhone = shipment.senderPhone || '—';
    const sndAddress = shipment.senderAddress || '—';

    doc.font('Noto').fontSize(8.5).fillColor('#1e293b')
      .text(`${AR(sndName)} | ${sndPhone} | ${AR(sndAddress)}`, margin + 8, sndY + 12, { align: 'right', width: contentWidth - 16 });

    // Divider
    const divY4 = sndY + 28;
    doc.moveTo(margin, divY4).lineTo(margin + contentWidth, divY4).lineWidth(0.8).strokeColor('#cbd5e1').stroke();

    // Parcel Specs (الوزن والقطع والملاحظات)
    const specY = divY4 + 5;
    const weightVal = shipment.actualWeight || shipment.weight || 1;
    const piecesVal = shipment.pieces || 1;
    const fragileText = shipment.isFragile ? AR('قابل للكسر ⚠️') : AR('طبيعي');
    const openText = shipment.allowOpenPackage ? AR('مسموح الفتح') : AR('ممنوع الفتح');

    doc.font('Noto').fontSize(8).fillColor('#475569')
      .text(`${AR('الوزن:')} ${weightVal} kg | ${AR('القطع:')} ${piecesVal} | ${fragileText} | ${openText}`,
        margin + 8, specY, { align: 'right', width: contentWidth - 16 });

    if (shipment.contentDescription) {
      doc.font('Noto').fontSize(7.5).fillColor('#64748b')
        .text(`${AR('الوصف:')} ${AR(shipment.contentDescription)}`, margin + 8, specY + 12, { align: 'right', width: contentWidth - 16 });
    }

    // Branch / Hub routing
    if (shipment.branch) {
      doc.font('Noto').fontSize(7.5).fillColor('#475569')
        .text(`${AR('الفرع/الهاَب:')} ${AR(shipment.branch.name)} (${shipment.branch.code})`, margin + 8, specY + 23, { align: 'right', width: contentWidth - 16 });
    }

    // Big COD / Financial Box
    const codY = 345;
    const codAmount = Number(shipment.codAmount || 0);

    doc.rect(margin + 6, codY, contentWidth - 12, 42).lineWidth(1.2).strokeColor('#0284c7').fill('#f0f9ff');
    doc.font('Noto').fontSize(9).fillColor('#0369a1')
      .text(AR('المطلوب تحصيله من العميل (COD)'), margin + 12, codY + 5, { align: 'center', width: contentWidth - 24 });
    doc.font('Noto').fontSize(16).fillColor('#0c4a6e')
      .text(`${codAmount.toFixed(2)} EGP`, margin + 12, codY + 20, { align: 'center', width: contentWidth - 24 });

    // Footer
    doc.font('Noto').fontSize(6.5).fillColor('#94a3b8')
      .text(AR('منظومة الشحن المتكاملة — MaxP Logistics Portal'), margin + 8, 396, { align: 'center', width: contentWidth - 16 });

    doc.end();
  });
}

module.exports = {
  generateWaybillPdf,
  drawCode128,
};
