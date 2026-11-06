/**
 * Shipment Invoice & COD Receipt Template (SHIP-W17)
 * A6 Format (105mm x 148mm) receipt detailing shipment number, customer, items, shipping fee, COD, and signatures.
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
 * Render Invoice A6 page onto PDFKit document
 * @param {PDFDocument} doc
 * @param {Object} shipment
 * @param {Buffer|null} qrBuffer
 */
function renderInvoicePage(doc, shipment, qrBuffer) {
  ensureArabicFont(doc);
  drawOuterBorder(doc);

  const companyName = shipment.company?.name || shipment.senderName || 'MaxP Express';
  drawBanner(doc, 'فاتورة شحنة وإيصال COD', 'INVOICE & RECEIPT', companyName);

  const trackingNumber = shipment.trackingNumber || `TRK-${shipment.id.slice(-8).toUpperCase()}`;
  const barcodeValue = shipment.barcode || trackingNumber;
  const orderRef = shipment.merchantOrderId || shipment.orderId || shipment.clientReference || '—';

  // Invoice Metadata Header
  let curY = MARGIN + 28;
  const issueDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });

  doc.rect(MARGIN, curY, CONTENT_WIDTH, 20).fill('#f8fafc');
  doc.fontSize(7.5).fillColor('#0f172a')
    .text(`${AR('رقم الفاتورة/الشحنة:')} ${trackingNumber}`, MARGIN + CONTENT_WIDTH / 2, curY + 5, {
      align: 'right',
      width: CONTENT_WIDTH / 2 - 6,
    });
  doc.fontSize(7.5).fillColor('#475569')
    .text(`${AR('التاريخ:')} ${issueDate} | ${AR('الطلب:')} ${orderRef}`, MARGIN + 6, curY + 5, {
      align: 'left',
      width: CONTENT_WIDTH / 2 - 10,
    });

  curY += 22;
  drawDivider(doc, curY);

  // Customer / Consignee Block
  curY += 4;
  doc.fontSize(8).fillColor('#0369a1')
    .text(AR('بيانات العميل / Customer Details:'), MARGIN + 6, curY, { align: 'right', width: CONTENT_WIDTH - 12 });

  curY += 11;
  const recName = shipment.recipientName || 'عميل';
  const recPhone = shipment.recipientPhone || '—';
  const recAddress = `${shipment.destinationAddress || '—'}${shipment.destinationCity ? ` - ${shipment.destinationCity}` : ''} (${shipment.destinationGovernorate || 'القاهرة'})`;

  doc.fontSize(8.5).fillColor('#0f172a')
    .text(`${AR('الاسم:')} ${AR(recName)} | ${AR('الهاتف:')} ${recPhone}`, MARGIN + 6, curY, { align: 'right', width: CONTENT_WIDTH - 12 });

  curY += 12;
  doc.fontSize(7.5).fillColor('#334155')
    .text(`${AR('العنوان:')} ${AR(recAddress)}`, MARGIN + 6, curY, { align: 'right', width: CONTENT_WIDTH - 12 });

  curY += 14;
  drawDivider(doc, curY);

  // Items Table Header
  curY += 4;
  doc.rect(MARGIN + 4, curY, CONTENT_WIDTH - 8, 16).fill('#0f172a');
  doc.fontSize(7).fillColor('#ffffff')
    .text(AR('البند / البيان (Description)'), MARGIN + 6, curY + 4, { align: 'right', width: 140 })
    .text(AR('العدد'), MARGIN + 150, curY + 4, { align: 'center', width: 30 })
    .text(AR('القيمة (EGP)'), MARGIN + 185, curY + 4, { align: 'center', width: CONTENT_WIDTH - 195 });

  curY += 17;

  // Items Rendering
  const items = shipment.order?.items || [];
  const codAmount = Number(shipment.codAmount || 0);
  const shippingFee = Number(shipment.cost || 0);
  const itemsSubtotal = Math.max(0, codAmount - shippingFee);

  if (items.length > 0) {
    items.slice(0, 3).forEach((item) => {
      const itemName = item.productName || item.productSku || 'صنف';
      const itemQty = item.quantity || 1;
      const itemPrice = Number(item.price || item.total || 0).toFixed(2);

      doc.rect(MARGIN + 4, curY, CONTENT_WIDTH - 8, 14).fill('#ffffff');
      doc.fontSize(7).fillColor('#1e293b')
        .text(AR(itemName), MARGIN + 6, curY + 2.5, { align: 'right', width: 140, height: 12 })
        .text(String(itemQty), MARGIN + 150, curY + 2.5, { align: 'center', width: 30 })
        .text(`${itemPrice}`, MARGIN + 185, curY + 2.5, { align: 'center', width: CONTENT_WIDTH - 195 });
      curY += 14;
    });
  } else {
    // Single row fallback
    const desc = shipment.contentDescription || 'طرد شحن منتجات تجارية';
    const pieces = shipment.pieces || 1;

    doc.rect(MARGIN + 4, curY, CONTENT_WIDTH - 8, 15).fill('#ffffff');
    doc.fontSize(7).fillColor('#1e293b')
      .text(AR(desc), MARGIN + 6, curY + 3, { align: 'right', width: 140 })
      .text(String(pieces), MARGIN + 150, curY + 3, { align: 'center', width: 30 })
      .text(`${itemsSubtotal.toFixed(2)}`, MARGIN + 185, curY + 3, { align: 'center', width: CONTENT_WIDTH - 195 });
    curY += 16;
  }

  drawDivider(doc, curY);

  // Financial Summary Breakdown Box
  curY += 6;
  const boxHeight = 62;
  doc.rect(MARGIN + 4, curY, CONTENT_WIDTH - 8, boxHeight)
    .lineWidth(0.8)
    .strokeColor('#cbd5e1')
    .fill('#f8fafc');

  // 1. Items amount
  doc.fontSize(7.5).fillColor('#475569')
    .text(AR('قيمة الأصناف / Items Subtotal:'), MARGIN + 10, curY + 6, { align: 'right', width: 150 });
  doc.fontSize(7.5).fillColor('#0f172a')
    .text(`${itemsSubtotal.toFixed(2)} EGP`, MARGIN + 160, curY + 6, { align: 'left', width: CONTENT_WIDTH - 175 });

  // 2. Shipping fee
  doc.fontSize(7.5).fillColor('#475569')
    .text(AR('رسوم الشحن / Shipping Fee:'), MARGIN + 10, curY + 20, { align: 'right', width: 150 });
  doc.fontSize(7.5).fillColor('#0f172a')
    .text(`${shippingFee.toFixed(2)} EGP`, MARGIN + 160, curY + 20, { align: 'left', width: CONTENT_WIDTH - 175 });

  // Divider inside box
  doc.moveTo(MARGIN + 8, curY + 34)
    .lineTo(MARGIN + CONTENT_WIDTH - 8, curY + 34)
    .lineWidth(0.5)
    .strokeColor('#e2e8f0')
    .stroke();

  // 3. Total COD Amount
  doc.fontSize(9).fillColor('#0369a1')
    .text(AR('الإجمالي المطلوب تحصيله (COD):'), MARGIN + 10, curY + 41, { align: 'right', width: 150 });
  doc.fontSize(12).fillColor('#0c4a6e')
    .text(`${codAmount.toFixed(2)} EGP`, MARGIN + 160, curY + 39, { align: 'left', width: CONTENT_WIDTH - 175 });

  curY += boxHeight + 8;

  // Mini Barcode
  drawCode128(doc, barcodeValue, MARGIN + 10, curY, CONTENT_WIDTH - 20, 24);
  curY += 38;

  // Signatures Row
  const sigBoxWidth = (CONTENT_WIDTH - 20) / 2;
  // Left: Courier Signature
  doc.rect(MARGIN + 6, curY, sigBoxWidth, 38).lineWidth(0.5).strokeColor('#cbd5e1');
  doc.fontSize(7).fillColor('#64748b')
    .text(AR('توقيع المندوب / Courier Sig'), MARGIN + 8, curY + 4, { align: 'center', width: sigBoxWidth - 4 });
  doc.moveTo(MARGIN + 12, curY + 30).lineTo(MARGIN + sigBoxWidth, curY + 30).strokeColor('#e2e8f0').stroke();

  // Right: Consignee Signature
  doc.rect(MARGIN + 14 + sigBoxWidth, curY, sigBoxWidth, 38).lineWidth(0.5).strokeColor('#cbd5e1');
  doc.fontSize(7).fillColor('#64748b')
    .text(AR('توقيع المستلم / Customer Sig'), MARGIN + 16 + sigBoxWidth, curY + 4, { align: 'center', width: sigBoxWidth - 4 });
  doc.moveTo(MARGIN + 20 + sigBoxWidth, curY + 30).lineTo(MARGIN + 14 + sigBoxWidth * 2 - 6, curY + 30).strokeColor('#e2e8f0').stroke();

  // Footer Note
  doc.fontSize(6).fillColor('#94a3b8')
    .text(AR('إيصال رسمي معتمد — MaxP Express Logistics Solutions'), MARGIN + 4, MARGIN + CONTENT_HEIGHT - 12, {
      align: 'center',
      width: CONTENT_WIDTH - 8,
    });
}

module.exports = {
  renderInvoicePage,
};
