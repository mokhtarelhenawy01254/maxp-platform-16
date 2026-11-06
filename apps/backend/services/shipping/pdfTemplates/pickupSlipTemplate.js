/**
 * Pickup & Handover Slip Template (SHIP-W17)
 * A6 Format (105mm x 148mm) handover voucher for branch/courier package receiving.
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
 * Render Pickup Slip A6 page onto PDFKit document
 * @param {PDFDocument} doc
 * @param {Object} shipment
 * @param {Buffer|null} qrBuffer
 */
function renderPickupSlipPage(doc, shipment, qrBuffer) {
  ensureArabicFont(doc);
  drawOuterBorder(doc);

  const companyName = shipment.company?.name || shipment.senderName || 'MaxP Express';
  drawBanner(doc, 'إذن استلام وتسليم طرد', 'PICKUP SLIP', companyName);

  const trackingNumber = shipment.trackingNumber || `TRK-${shipment.id.slice(-8).toUpperCase()}`;
  const barcodeValue = shipment.barcode || trackingNumber;
  const pickupDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  // Top Barcode Section
  let curY = MARGIN + 28;
  drawCode128(doc, barcodeValue, MARGIN + 6, curY, CONTENT_WIDTH - 12, 30);
  curY += 44;

  drawDivider(doc, curY);

  // Metadata Strip
  curY += 4;
  doc.rect(MARGIN, curY, CONTENT_WIDTH, 20).fill('#f1f5f9');
  doc.fontSize(7.5).fillColor('#0f172a')
    .text(`${AR('الفرع / المحطة:')} ${AR(shipment.branch?.name || 'الفرع الرئيسي')}`, MARGIN + CONTENT_WIDTH / 2, curY + 5, {
      align: 'right',
      width: CONTENT_WIDTH / 2 - 6,
    });
  doc.fontSize(7.5).fillColor('#334155')
    .text(`${AR('التوقيت:')} ${pickupDate}`, MARGIN + 6, curY + 5, {
      align: 'left',
      width: CONTENT_WIDTH / 2 - 10,
    });

  curY += 22;
  drawDivider(doc, curY);

  // Merchant (Shipper) Handover Info
  curY += 5;
  doc.fontSize(8).fillColor('#0284c7')
    .text(AR('الطرف الأول: الراسل / المتجر (Shipper):'), MARGIN + 6, curY, { align: 'right', width: CONTENT_WIDTH - 12 });

  curY += 12;
  const sndName = shipment.senderName || shipment.merchant?.name || shipment.company?.name || 'المتجر';
  const sndPhone = shipment.senderPhone || shipment.company?.phone || '—';
  const sndAddress = shipment.senderAddress || shipment.company?.address || '—';

  doc.fontSize(8.5).fillColor('#0f172a')
    .text(`${AR('المتجر:')} ${AR(sndName)} | ${AR('الهاتف:')} ${sndPhone}`, MARGIN + 6, curY, { align: 'right', width: CONTENT_WIDTH - 12 });
  curY += 12;
  doc.fontSize(7.5).fillColor('#475569')
    .text(`${AR('عنوان الاستلام:')} ${AR(sndAddress)}`, MARGIN + 6, curY, { align: 'right', width: CONTENT_WIDTH - 12 });

  curY += 14;
  drawDivider(doc, curY);

  // Destination & Consignee Summary
  curY += 4;
  doc.fontSize(8).fillColor('#0284c7')
    .text(AR('الطرف الثاني: الوجهة والمستلم (Consignee Destination):'), MARGIN + 6, curY, { align: 'right', width: CONTENT_WIDTH - 12 });

  curY += 12;
  const recName = shipment.recipientName || 'عميل';
  const govCity = `${shipment.destinationGovernorate || 'القاهرة'}${shipment.destinationCity ? ` - ${shipment.destinationCity}` : ''}`;

  doc.fontSize(8.5).fillColor('#0f172a')
    .text(`${AR('المستلم:')} ${AR(recName)} | ${AR('المحافظة والمدينة:')} ${AR(govCity)}`, MARGIN + 6, curY, { align: 'right', width: CONTENT_WIDTH - 12 });

  curY += 14;
  drawDivider(doc, curY);

  // Parcel Verification & Custody Specs
  curY += 5;
  const weightVal = shipment.actualWeight || shipment.weight || 1;
  const piecesVal = shipment.pieces || 1;
  const codAmount = Number(shipment.codAmount || 0);

  doc.rect(MARGIN + 4, curY, CONTENT_WIDTH - 8, 48)
    .lineWidth(0.8)
    .strokeColor('#e2e8f0')
    .fill('#fafafa');

  doc.fontSize(8).fillColor('#1e293b')
    .text(`${AR('عدد القطع:')} ${piecesVal} | ${AR('الوزن المسجل:')} ${weightVal} kg | ${AR('مبلغ التحصيل:')} ${codAmount.toFixed(2)} EGP`,
      MARGIN + 8, curY + 6, { align: 'right', width: CONTENT_WIDTH - 16 });

  // Checklist items
  doc.fontSize(7.5).fillColor('#475569')
    .text(AR('[✔] تم فحص الغلاف الخارجي والتأكد من سلامته'), MARGIN + 8, curY + 20, { align: 'right', width: CONTENT_WIDTH - 16 })
    .text(AR('[✔] تم التحقق من رقم الباركود ومطابقته للسيستم'), MARGIN + 8, curY + 33, { align: 'right', width: CONTENT_WIDTH - 16 });

  curY += 56;

  // Signatures Section
  const sigBoxWidth = (CONTENT_WIDTH - 20) / 2;

  // Driver Signature (مندوب الاستلام)
  doc.rect(MARGIN + 6, curY, sigBoxWidth, 48).lineWidth(0.6).strokeColor('#cbd5e1');
  doc.fontSize(7.5).fillColor('#334155')
    .text(AR('توقيع مندوب الاستلام (Courier)'), MARGIN + 8, curY + 4, { align: 'center', width: sigBoxWidth - 4 });
  doc.fontSize(6.5).fillColor('#94a3b8')
    .text(AR('أقر باستلام الطرد الموضح بعاليه'), MARGIN + 8, curY + 16, { align: 'center', width: sigBoxWidth - 4 });
  doc.moveTo(MARGIN + 12, curY + 38).lineTo(MARGIN + sigBoxWidth, curY + 38).strokeColor('#e2e8f0').stroke();

  // Shipper Signature (المسلم / التاجر)
  doc.rect(MARGIN + 14 + sigBoxWidth, curY, sigBoxWidth, 48).lineWidth(0.6).strokeColor('#cbd5e1');
  doc.fontSize(7.5).fillColor('#334155')
    .text(AR('توقيع المسلّم (Shipper / Sender)'), MARGIN + 16 + sigBoxWidth, curY + 4, { align: 'center', width: sigBoxWidth - 4 });
  doc.fontSize(6.5).fillColor('#94a3b8')
    .text(AR('تم التسليم لشركة الشحن بحالة سليمة'), MARGIN + 16 + sigBoxWidth, curY + 16, { align: 'center', width: sigBoxWidth - 4 });
  doc.moveTo(MARGIN + 20 + sigBoxWidth, curY + 38).lineTo(MARGIN + 14 + sigBoxWidth * 2 - 6, curY + 38).strokeColor('#e2e8f0').stroke();

  // Footer
  doc.fontSize(6).fillColor('#94a3b8')
    .text(AR('إذن استلام عهدة رسمي — MaxP Courier Logistics Portal'), MARGIN + 4, MARGIN + CONTENT_HEIGHT - 12, {
      align: 'center',
      width: CONTENT_WIDTH - 8,
    });
}

module.exports = {
  renderPickupSlipPage,
};
