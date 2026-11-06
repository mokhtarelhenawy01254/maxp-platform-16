/**
 * Waybill A6 Sticky Label Template (SHIP-W17)
 * Standard A6 (105mm x 148mm) shipping sticker with Code128, QR, bilingual fields, and high-contrast COD box.
 */

const {
  MARGIN,
  CONTENT_WIDTH,
  CONTENT_HEIGHT,
  AR,
  ensureArabicFont,
  drawCode128,
  drawOuterBorder,
  drawBanner,
  drawDivider,
} = require('./pdfShared');

/**
 * Render Waybill A6 page onto PDFKit document
 * @param {PDFDocument} doc
 * @param {Object} shipment
 * @param {Buffer|null} qrBuffer
 */
function renderWaybillPage(doc, shipment, qrBuffer) {
  ensureArabicFont(doc);
  drawOuterBorder(doc);

  const companyName = shipment.company?.name || shipment.senderName || 'MaxP Express';
  drawBanner(doc, 'بوليصة شحن سريعة', 'WAYBILL', companyName);

  const trackingNumber = shipment.trackingNumber || `TRK-${shipment.id.slice(-8).toUpperCase()}`;
  const barcodeValue = shipment.barcode || trackingNumber;

  // Top Section: Barcode + QR
  const topY = MARGIN + 28;
  const qrSize = 52;
  const qrX = MARGIN + CONTENT_WIDTH - qrSize - 4;
  const barcodeWidth = qrBuffer ? (CONTENT_WIDTH - qrSize - 16) : (CONTENT_WIDTH - 12);

  drawCode128(doc, barcodeValue, MARGIN + 6, topY, barcodeWidth, 32);

  if (qrBuffer) {
    doc.image(qrBuffer, qrX, topY, { width: qrSize, height: qrSize });
    doc.fontSize(6).fillColor('#64748b')
      .text(trackingNumber, qrX - 4, topY + qrSize + 2, { width: qrSize + 8, align: 'center' });
  }

  // Divider 1
  const divY1 = topY + 58;
  drawDivider(doc, divY1);

  // Governorate & Order ID Highlight Strip
  const govText = shipment.destinationGovernorate || 'القاهرة';
  const cityText = shipment.destinationCity ? ` - ${shipment.destinationCity}` : '';
  const orderRef = shipment.merchantOrderId || shipment.orderId || shipment.clientReference || '—';

  doc.rect(MARGIN, divY1, CONTENT_WIDTH, 24).fill('#f1f5f9');

  // Right half: Governorate (Destination)
  ensureArabicFont(doc);
  doc.fontSize(10).fillColor('#0f172a')
    .text(`${AR('الوجهة / Dest:')} ${AR(govText + cityText)}`, MARGIN + CONTENT_WIDTH / 2, divY1 + 6, {
      align: 'right',
      width: CONTENT_WIDTH / 2 - 6,
    });

  // Left half: Order reference
  doc.fontSize(8.5).fillColor('#334155')
    .text(`${AR('الطلب / Order:')} ${orderRef}`, MARGIN + 6, divY1 + 7, {
      align: 'left',
      width: CONTENT_WIDTH / 2 - 10,
    });

  // Divider 2
  const divY2 = divY1 + 24;
  drawDivider(doc, divY2);

  // Recipient (Consignee) Section
  let curY = divY2 + 5;
  doc.fontSize(8.5).fillColor('#0369a1')
    .text(AR('بيانات المستلم / Consignee:'), MARGIN + 6, curY, { align: 'right', width: CONTENT_WIDTH - 12 });

  curY += 13;
  const recName = shipment.recipientName || 'عميل';
  const recPhone = shipment.recipientPhone || '—';
  const recPhone2 = shipment.recipientPhone2 ? ` / ${shipment.recipientPhone2}` : '';
  const recAddress = `${shipment.destinationAddress || '—'}${shipment.destinationCity ? ` - ${shipment.destinationCity}` : ''}`;

  doc.fontSize(9.5).fillColor('#09090b')
    .text(`${AR('الاسم / Name:')} ${AR(recName)}`, MARGIN + 6, curY, { align: 'right', width: CONTENT_WIDTH - 12 });

  curY += 13;
  doc.fontSize(9).fillColor('#09090b')
    .text(`${AR('الهاتف / Phone:')} ${recPhone}${recPhone2}`, MARGIN + 6, curY, { align: 'right', width: CONTENT_WIDTH - 12 });

  curY += 13;
  doc.fontSize(8.5).fillColor('#1e293b')
    .text(`${AR('العنوان / Address:')} ${AR(recAddress)}`, MARGIN + 6, curY, {
      align: 'right',
      width: CONTENT_WIDTH - 12,
      lineGap: 2,
    });

  // Divider 3
  curY += 24;
  drawDivider(doc, curY);

  // Sender (Shipper) Section
  curY += 4;
  doc.fontSize(8).fillColor('#64748b')
    .text(AR('بيانات الراسل / Shipper:'), MARGIN + 6, curY, { align: 'right', width: CONTENT_WIDTH - 12 });

  curY += 12;
  const sndName = shipment.senderName || shipment.merchant?.name || shipment.company?.name || 'المرسل';
  const sndPhone = shipment.senderPhone || shipment.company?.phone || '—';
  const sndAddress = shipment.senderAddress || shipment.company?.address || '—';

  doc.fontSize(8).fillColor('#1e293b')
    .text(`${AR(sndName)} | ${sndPhone} | ${AR(sndAddress)}`, MARGIN + 6, curY, { align: 'right', width: CONTENT_WIDTH - 12 });

  // Divider 4
  curY += 18;
  drawDivider(doc, curY);

  // Parcel Specs Section
  curY += 4;
  const weightVal = shipment.actualWeight || shipment.weight || 1;
  const piecesVal = shipment.pieces || 1;
  const fragileText = shipment.isFragile ? AR('قابل للكسر (Fragile) ⚠️') : AR('طبيعي (Standard)');
  const openText = shipment.allowOpenPackage ? AR('مسموح الفتح (Open Allowed)') : AR('ممنوع الفتح (No Open)');

  doc.fontSize(7.5).fillColor('#475569')
    .text(`${AR('الوزن:')} ${weightVal} kg | ${AR('القطع:')} ${piecesVal} | ${fragileText} | ${openText}`,
      MARGIN + 6, curY, { align: 'right', width: CONTENT_WIDTH - 12 });

  if (shipment.contentDescription) {
    curY += 12;
    doc.fontSize(7).fillColor('#64748b')
      .text(`${AR('الوصف / Description:')} ${AR(shipment.contentDescription)}`, MARGIN + 6, curY, {
        align: 'right',
        width: CONTENT_WIDTH - 12,
      });
  }

  // Branch / Hub Routing if available
  if (shipment.branch) {
    curY += 11;
    doc.fontSize(7).fillColor('#0284c7')
      .text(`${AR('الفرع / Hub:')} ${AR(shipment.branch.name)} (${shipment.branch.code || ''})`, MARGIN + 6, curY, {
        align: 'right',
        width: CONTENT_WIDTH - 12,
      });
  }

  // Large COD Box at bottom
  const codY = MARGIN + CONTENT_HEIGHT - 62;
  const codAmount = Number(shipment.codAmount || 0);

  if (codAmount > 0) {
    doc.rect(MARGIN + 4, codY, CONTENT_WIDTH - 8, 42)
      .lineWidth(1.2)
      .strokeColor('#0284c7')
      .fill('#f0f9ff');

    ensureArabicFont(doc);
    doc.fontSize(8.5).fillColor('#0369a1')
      .text(AR('المطلوب تحصيله من العميل / Amount to Collect (COD)'), MARGIN + 8, codY + 5, {
        align: 'center',
        width: CONTENT_WIDTH - 16,
      });
    doc.fontSize(15).fillColor('#0c4a6e')
      .text(`${codAmount.toFixed(2)} EGP`, MARGIN + 8, codY + 20, {
        align: 'center',
        width: CONTENT_WIDTH - 16,
      });
  } else {
    // Prepaid Box
    doc.rect(MARGIN + 4, codY, CONTENT_WIDTH - 8, 42)
      .lineWidth(1.2)
      .strokeColor('#16a34a')
      .fill('#f0fdf4');

    ensureArabicFont(doc);
    doc.fontSize(9).fillColor('#15803d')
      .text(AR('الشحنة مدفوعة مسبقاً — لا يتم تحصيل مبالغ'), MARGIN + 8, codY + 7, {
        align: 'center',
        width: CONTENT_WIDTH - 16,
      });
    doc.fontSize(12).fillColor('#166534')
      .text('PAID / 0.00 EGP', MARGIN + 8, codY + 22, {
        align: 'center',
        width: CONTENT_WIDTH - 16,
      });
  }

  // Footer
  ensureArabicFont(doc);
  doc.fontSize(6).fillColor('#94a3b8')
    .text(AR('منظومة الشحن السريع — MaxP Logistics Portal | A6 Official Label'), MARGIN + 4, MARGIN + CONTENT_HEIGHT - 12, {
      align: 'center',
      width: CONTENT_WIDTH - 8,
    });
}

module.exports = {
  renderWaybillPage,
};
