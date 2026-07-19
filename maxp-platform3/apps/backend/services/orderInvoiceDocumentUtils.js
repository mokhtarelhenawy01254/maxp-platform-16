const { executeWithRetry } = require('./sharedDatabase');

const DEFAULT_INVOICE_SETTINGS = Object.freeze({
  invoicePrefix: 'INV',
  invoiceNumberFormat: 'INV-YYYYMMDD-XXXXXX',
  defaultTaxRate: 0,
  defaultTerms: 'شكراً لتعاملكم معنا. يرجى الدفع خلال 7 أيام من تاريخ الفاتورة.',
  defaultNotes: null,
  defaultDueDays: 7,
  showCompanyLogo: true,
  showTaxBreakdown: true,
  showPaymentMethod: true,
  showOrderItems: true,
  pdfPageSize: 'A4',
  pdfOrientation: 'portrait',
  primaryColor: '#4F46E5',
  secondaryColor: '#6B7280',
  fontFamily: 'Arial'
});

function normalizeInvoiceSettings(settings = {}) {
  return {
    ...DEFAULT_INVOICE_SETTINGS,
    ...settings
  };
}

async function getOrCreateInvoiceSettings(prisma, companyId) {
  let settings = await executeWithRetry(async () => {
    return await prisma.orderInvoiceSettings.findUnique({
      where: { companyId }
    });
  });

  if (!settings) {
    settings = await executeWithRetry(async () => {
      return await prisma.orderInvoiceSettings.create({
        data: { companyId }
      });
    });
  }

  return normalizeInvoiceSettings(settings);
}

async function getInvoiceSettingsMap(prisma, companyIds = []) {
  const uniqueCompanyIds = [...new Set(companyIds.filter(Boolean))];

  if (uniqueCompanyIds.length === 0) {
    return new Map();
  }

  const settingsRows = await executeWithRetry(async () => {
    return await prisma.orderInvoiceSettings.findMany({
      where: {
        companyId: {
          in: uniqueCompanyIds
        }
      }
    });
  });

  const settingsMap = new Map(
    settingsRows.map((settings) => [settings.companyId, normalizeInvoiceSettings(settings)])
  );

  uniqueCompanyIds.forEach((companyId) => {
    if (!settingsMap.has(companyId)) {
      settingsMap.set(companyId, normalizeInvoiceSettings());
    }
  });

  return settingsMap;
}

function generateInvoiceNumber(settings = {}, issueDate = new Date()) {
  const normalizedSettings = normalizeInvoiceSettings(settings);
  const prefix = normalizedSettings.invoicePrefix || DEFAULT_INVOICE_SETTINGS.invoicePrefix;
  const year = String(issueDate.getFullYear());
  const shortYear = year.slice(-2);
  const month = String(issueDate.getMonth() + 1).padStart(2, '0');
  const day = String(issueDate.getDate()).padStart(2, '0');
  const serialSeed = `${issueDate.getTime()}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')}`;

  let pattern = normalizedSettings.invoiceNumberFormat || DEFAULT_INVOICE_SETTINGS.invoiceNumberFormat;

  if (pattern.includes('{PREFIX}')) {
    pattern = pattern.replace(/\{PREFIX\}/g, prefix);
  } else if (pattern.includes('PREFIX')) {
    pattern = pattern.replace(/PREFIX/g, prefix);
  } else if (/^INV\b/.test(pattern)) {
    pattern = pattern.replace(/^INV\b/, prefix);
  } else if (!pattern.includes(prefix)) {
    pattern = `${prefix}-${pattern}`;
  }

  return pattern
    .replace(/YYYY/g, year)
    .replace(/YY/g, shortYear)
    .replace(/MM/g, month)
    .replace(/DD/g, day)
    .replace(/X+/g, (match) => serialSeed.slice(-match.length).padStart(match.length, '0'));
}

function deriveTaxRate(order, settings = {}) {
  const configuredRate = Number(settings.defaultTaxRate);
  if (Number.isFinite(configuredRate) && configuredRate > 0) {
    return configuredRate;
  }

  const subtotal = Number(order.subtotal || 0);
  const tax = Number(order.tax || 0);

  if (subtotal <= 0 || tax <= 0) {
    return 0;
  }

  return Number(((tax / subtotal) * 100).toFixed(2));
}

function resolveInvoicePaymentStatus(orderPaymentStatus) {
  switch (orderPaymentStatus) {
    case 'COMPLETED':
      return 'PAID';
    case 'REFUNDED':
      return 'REFUNDED';
    case 'FAILED':
      return 'CANCELLED';
    default:
      return 'PENDING';
  }
}

function buildInvoiceData(order, settings = {}, userId = null) {
  const normalizedSettings = normalizeInvoiceSettings(settings);
  const issueDate = new Date();
  const defaultDueDays = Number(normalizedSettings.defaultDueDays);
  const dueDate =
    Number.isFinite(defaultDueDays) && defaultDueDays > 0
      ? new Date(issueDate.getTime() + defaultDueDays * 24 * 60 * 60 * 1000)
      : null;

  const customerFirstName = order.customer?.firstName || '';
  const customerLastName = order.customer?.lastName || '';
  const customerName =
    order.customerName || `${customerFirstName} ${customerLastName}`.trim() || 'عميل غير محدد';
  const invoicePaymentStatus = resolveInvoicePaymentStatus(order.paymentStatus);

  return {
    invoiceNumber: generateInvoiceNumber(normalizedSettings, issueDate),
    orderId: order.id,
    companyId: order.companyId,

    issueDate,
    dueDate,

    subtotal: order.subtotal,
    tax: order.tax,
    taxRate: deriveTaxRate(order, normalizedSettings),
    shipping: order.shipping,
    discount: order.discount,
    totalAmount: order.total,
    currency: order.currency || 'EGP',

    customerName,
    customerPhone: order.customerPhone || order.customer?.phone || null,
    customerEmail: order.customerEmail || order.customer?.email || null,
    customerAddress: order.customerAddress || order.shippingAddress || null,
    city: order.city || null,
    governorate: order.governorate || null,

    companyName: order.company?.name || 'الشركة',
    companyPhone: order.company?.phone || null,
    companyEmail: order.company?.email || null,
    companyAddress: order.company?.address || null,
    companyLogo: order.company?.logo || null,

    paymentMethod: order.paymentMethod || null,
    paymentStatus: invoicePaymentStatus,
    paidAt: invoicePaymentStatus === 'PAID' ? issueDate : null,

    notes: order.notes || normalizedSettings.defaultNotes || null,
    terms: normalizedSettings.defaultTerms || DEFAULT_INVOICE_SETTINGS.defaultTerms,

    generatedBy: userId,
    printCount: 0,
    emailCount: 0
  };
}

module.exports = {
  DEFAULT_INVOICE_SETTINGS,
  buildInvoiceData,
  generateInvoiceNumber,
  getInvoiceSettingsMap,
  getOrCreateInvoiceSettings,
  normalizeInvoiceSettings
};
