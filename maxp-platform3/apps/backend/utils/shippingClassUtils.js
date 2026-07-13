const { parseProductMetadata } = require('./productMetadataUtils');

const DEFAULT_SHIPPING_CLASS_FEES = {
  standard: 0,
  heavy: 20,
  fragile: 10,
  express: 30
};

const DEFAULT_SHIPPING_CLASS_MODE = 'max'; // 'max' | 'per_item'

const normalizeShippingClass = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().toLowerCase();
  return normalized || null;
};

const getShippingClassFromMetadata = (metadata) => {
  const parsed = parseProductMetadata(metadata);
  if (!parsed || typeof parsed !== 'object') return null;
  return normalizeShippingClass(parsed.shippingClass);
};

const parseJsonObject = (value) => {
  if (!value || typeof value !== 'string') {
    return value && typeof value === 'object' ? value : {};
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const resolveShippingClass = (variantMetadata, productMetadata) => {
  const variantShippingClass = getShippingClassFromMetadata(variantMetadata);
  const productShippingClass = getShippingClassFromMetadata(productMetadata);

  // Product-level shipping class should remain the default for all variants
  // unless a variant explicitly opts into a different non-standard class.
  if (variantShippingClass && variantShippingClass !== 'standard') {
    return variantShippingClass;
  }

  if (productShippingClass) {
    return productShippingClass;
  }

  return variantShippingClass || 'standard';
};

const normalizeFeesMap = (fees) => {
  if (!fees || typeof fees !== 'object') return {};
  return Object.entries(fees).reduce((acc, [key, value]) => {
    const normalizedKey = normalizeShippingClass(key);
    if (!normalizedKey) return acc;
    acc[normalizedKey] = Number(value) || 0;
    return acc;
  }, {});
};

const resolveShippingClassConfig = (companySettings, methodSettings) => {
  const company = parseJsonObject(companySettings);
  const method = parseJsonObject(methodSettings);

  const companyFees = normalizeFeesMap(company.shippingClassFees || company.classFees);
  const methodFees = normalizeFeesMap(method.shippingClassFees || method.classFees);

  const fees = {
    ...DEFAULT_SHIPPING_CLASS_FEES,
    ...companyFees,
    ...methodFees
  };

  const modeRaw =
    method.shippingClassMode ||
    method.classMode ||
    company.shippingClassMode ||
    company.classMode ||
    DEFAULT_SHIPPING_CLASS_MODE;

  const mode = modeRaw === 'per_item' ? 'per_item' : 'max';

  return { fees, mode };
};

const calculateShippingClassSurcharge = (classCounts, config) => {
  if (!classCounts || typeof classCounts !== 'object') return 0;

  const fees = config?.fees || DEFAULT_SHIPPING_CLASS_FEES;
  const mode = config?.mode === 'per_item' ? 'per_item' : 'max';

  let maxSurcharge = 0;
  let totalSurcharge = 0;

  for (const [shippingClass, countValue] of Object.entries(classCounts)) {
    const count = Number(countValue) || 0;
    if (count <= 0) continue;

    const fee = Number(fees[shippingClass] ?? 0);

    if (mode === 'per_item') {
      totalSurcharge += fee * count;
    } else if (fee > maxSurcharge) {
      maxSurcharge = fee;
    }
  }

  return mode === 'per_item' ? totalSurcharge : maxSurcharge;
};

module.exports = {
  DEFAULT_SHIPPING_CLASS_FEES,
  DEFAULT_SHIPPING_CLASS_MODE,
  resolveShippingClass,
  resolveShippingClassConfig,
  calculateShippingClassSurcharge
};
