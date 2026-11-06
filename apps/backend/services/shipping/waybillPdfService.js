/**
 * Unified Shipping Print Engine (SHIP-W17)
 * High-precision A6 (105mm x 148mm) printing for Waybill, COD Invoice, and Pickup Slip.
 * Supports multi-copy duplicates and batch printing up to 100 shipments in a single merged PDF.
 */

const PDFDocument = require('pdfkit');
const {
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN,
  ensureArabicFont,
  drawCode128,
  generateQrBuffer,
} = require('./pdfTemplates/pdfShared');

const { renderWaybillPage } = require('./pdfTemplates/waybillTemplate');
const { renderInvoicePage } = require('./pdfTemplates/invoiceTemplate');
const { renderPickupSlipPage } = require('./pdfTemplates/pickupSlipTemplate');

/**
 * Resolve template names list from requested template parameter
 * @param {string} templateParam
 * @returns {string[]}
 */
function resolveTemplates(templateParam) {
  const norm = String(templateParam || 'WAYBILL').trim().toUpperCase();
  if (norm === 'BOTH') {
    return ['WAYBILL', 'INVOICE'];
  }
  if (norm === 'ALL') {
    return ['WAYBILL', 'INVOICE', 'PICKUP_SLIP'];
  }
  if (norm === 'INVOICE') {
    return ['INVOICE'];
  }
  if (norm === 'PICKUP_SLIP') {
    return ['PICKUP_SLIP'];
  }
  return ['WAYBILL'];
}

/**
 * Generate PDF buffer for a single shipment with requested template and copies
 * @param {Object} shipment
 * @param {Object} [options]
 * @param {string} [options.template='WAYBILL'] - 'WAYBILL' | 'INVOICE' | 'PICKUP_SLIP' | 'BOTH' | 'ALL'
 * @param {number} [options.copies=1] - Number of copies (1-10)
 * @returns {Promise<Buffer>}
 */
async function generateShipmentPdf(shipment, options = {}) {
  const templateList = resolveTemplates(options.template);
  const copies = Math.max(1, Math.min(10, parseInt(options.copies, 10) || 1));

  const trackingNumber = shipment.trackingNumber || `TRK-${shipment.id?.slice(-8).toUpperCase() || 'UNKNOWN'}`;
  const qrBuffer = await generateQrBuffer(trackingNumber);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [PAGE_WIDTH, PAGE_HEIGHT],
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      autoFirstPage: true,
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    ensureArabicFont(doc);

    let isFirstPage = true;

    for (let c = 0; c < copies; c++) {
      for (const tmpl of templateList) {
        if (!isFirstPage) {
          doc.addPage({
            size: [PAGE_WIDTH, PAGE_HEIGHT],
            margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
          });
        }
        isFirstPage = false;

        switch (tmpl) {
          case 'INVOICE':
            renderInvoicePage(doc, shipment, qrBuffer);
            break;
          case 'PICKUP_SLIP':
            renderPickupSlipPage(doc, shipment, qrBuffer);
            break;
          case 'WAYBILL':
          default:
            renderWaybillPage(doc, shipment, qrBuffer);
            break;
        }
      }
    }

    doc.end();
  });
}

/**
 * Backward-compatible helper for existing calls
 * @param {Object} shipment
 * @param {Object} [options]
 * @returns {Promise<Buffer>}
 */
async function generateWaybillPdf(shipment, options = {}) {
  return generateShipmentPdf(shipment, {
    template: options.template || 'WAYBILL',
    copies: options.copies || 1,
  });
}

/**
 * Generate a single consolidated PDF for a batch of shipments (limit 100)
 * @param {Object[]} shipments - Array of shipment entities
 * @param {Object} [options]
 * @param {string} [options.template='WAYBILL']
 * @param {number} [options.copies=1]
 * @returns {Promise<Buffer>}
 */
async function generateBatchPdf(shipments, options = {}) {
  if (!Array.isArray(shipments) || shipments.length === 0) {
    throw new Error('لا توجد شحنات محددة للطباعة');
  }

  if (shipments.length > 100) {
    const err = new Error('الحد الأقصى للطباعة المجمعة هو 100 شحنة');
    err.statusCode = 400;
    throw err;
  }

  const templateList = resolveTemplates(options.template);
  const copies = Math.max(1, Math.min(10, parseInt(options.copies, 10) || 1));

  // Pre-generate QR buffers for all shipments in parallel
  const qrMap = new Map();
  await Promise.all(
    shipments.map(async (s) => {
      const tracking = s.trackingNumber || `TRK-${s.id?.slice(-8).toUpperCase() || 'UNKNOWN'}`;
      const buf = await generateQrBuffer(tracking);
      qrMap.set(s.id, buf);
    })
  );

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [PAGE_WIDTH, PAGE_HEIGHT],
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      autoFirstPage: true,
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    ensureArabicFont(doc);

    let isFirstPage = true;

    for (const shipment of shipments) {
      const qrBuf = qrMap.get(shipment.id);

      for (let c = 0; c < copies; c++) {
        for (const tmpl of templateList) {
          if (!isFirstPage) {
            doc.addPage({
              size: [PAGE_WIDTH, PAGE_HEIGHT],
              margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
            });
          }
          isFirstPage = false;

          switch (tmpl) {
            case 'INVOICE':
              renderInvoicePage(doc, shipment, qrBuf);
              break;
            case 'PICKUP_SLIP':
              renderPickupSlipPage(doc, shipment, qrBuf);
              break;
            case 'WAYBILL':
            default:
              renderWaybillPage(doc, shipment, qrBuf);
              break;
          }
        }
      }
    }

    doc.end();
  });
}

module.exports = {
  generateWaybillPdf,
  generateShipmentPdf,
  generateBatchPdf,
  drawCode128,
  resolveTemplates,
};
