// Use shared database service instead of creating new PrismaClient
const {
  getSharedPrismaClient,
  getSharedPrismaClientAsync,
  executeWithRetry,
} = require('../services/sharedDatabase');
const {
  resolveShippingClass,
  resolveShippingClassConfig,
  calculateShippingClassSurcharge,
} = require('../utils/shippingClassUtils');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

/**
 * Shipping Zone Controller
 * Handles shipping zones with governorate name variations for automated matching
 */

const normalizeGovernorateValue = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/محافظة/g, '')
    .replace(/محافظه/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
    .replace(/\b(governorate|gov\.?|province|region)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const governorateSeedData = [
  {
    code: 'cairo',
    nameAr: 'القاهرة',
    nameEn: 'Cairo',
    aliases: ['القاهرة', 'القاهره', 'قاهرة', 'قاهره', 'cairo', 'nasr city', 'مدينة نصر', 'أطراف القاهرة والجيزة', 'اطراف القاهرة والجيزة']
  },
  {
    code: 'new-cairo',
    nameAr: 'القاهرة الجديدة',
    nameEn: 'New Cairo',
    aliases: ['new cairo', 'القاهرة الجديدة', 'القاهره الجديده', 'cairo new']
  },
  {
    code: 'helwan',
    nameAr: 'حلوان',
    nameEn: 'Helwan',
    aliases: ['helwan', 'حلوان']
  },
  {
    code: '15th-may',
    nameAr: '15 مايو',
    nameEn: '15th of May',
    aliases: ['15 may', '15 مايو']
  },
  {
    code: 'giza',
    nameAr: 'الجيزة',
    nameEn: 'Giza',
    aliases: ['الجيزة', 'الجيزه', 'جيزة', 'جيزه', 'giza', 'أطراف القاهرة والجيزة', 'اطراف القاهرة والجيزة']
  },
  {
    code: '6th-october',
    nameAr: '6 أكتوبر',
    nameEn: '6th of October',
    aliases: ['6 october', '6th of october', 'october', 'اكتوبر', 'أكتوبر', '6 أكتوبر', 'ال6 أكتوبر']
  },
  {
    code: 'sheikh-zayed',
    nameAr: 'الشيخ زايد',
    nameEn: 'Sheikh Zayed',
    aliases: ['sheikh zayed', 'zayed', 'الشيخ زايد', 'شيخ زايد']
  },
  {
    code: 'qalyubia',
    nameAr: 'القليوبية',
    nameEn: 'Qalyubia',
    aliases: ['القليوبية', 'القليوبيه', 'قليوبية', 'قليوبيه', 'qalyubia', 'qalyubiya', 'qalubia', 'kalubia']
  },
  {
    code: 'alexandria',
    nameAr: 'الإسكندرية',
    nameEn: 'Alexandria',
    aliases: ['الإسكندرية', 'الاسكندرية', 'اسكندرية', 'اسكندريه', 'alexandria', 'alex']
  },
  {
    code: 'dakahlia',
    nameAr: 'الدقهلية',
    nameEn: 'Dakahlia',
    aliases: ['الدقهلية', 'دقهلية', 'dakahlia', 'mansoura', 'المنصورة', 'المنصوره']
  },
  {
    code: 'gharbia',
    nameAr: 'الغربية',
    nameEn: 'Gharbia',
    aliases: ['الغربية', 'الغربيه', 'gharbia', 'tanta', 'طنطا', 'المحلة', 'المحله']
  },
  {
    code: 'sharqia',
    nameAr: 'الشرقية',
    nameEn: 'Sharqia',
    aliases: ['الشرقية', 'الشرقيه', 'sharqia', 'zagazig', 'الزقازيق']
  },
  {
    code: 'monufia',
    nameAr: 'المنوفية',
    nameEn: 'Monufia',
    aliases: ['المنوفية', 'المنوفيه', 'monufia', 'monoufia', 'شبين الكوم', 'شبين']
  },
  {
    code: 'kafr-el-sheikh',
    nameAr: 'كفر الشيخ',
    nameEn: 'Kafr El Sheikh',
    aliases: ['كفر الشيخ', 'kafr el sheikh', 'kafr el-sheikh', 'kafr elsheikh']
  },
  {
    code: 'damietta',
    nameAr: 'دمياط',
    nameEn: 'Damietta',
    aliases: ['دمياط', 'damietta']
  },
  {
    code: 'beheira',
    nameAr: 'البحيرة',
    nameEn: 'Beheira',
    aliases: ['البحيرة', 'البحيره', 'beheira', 'دمنهور']
  },
  {
    code: 'port-said',
    nameAr: 'بورسعيد',
    nameEn: 'Port Said',
    aliases: ['بورسعيد', 'port said']
  },
  {
    code: 'ismailia',
    nameAr: 'الإسماعيلية',
    nameEn: 'Ismailia',
    aliases: ['الإسماعيلية', 'الاسماعيلية', 'ismailia']
  },
  {
    code: 'suez',
    nameAr: 'السويس',
    nameEn: 'Suez',
    aliases: ['السويس', 'suez']
  },
  {
    code: 'north-sinai',
    nameAr: 'شمال سيناء',
    nameEn: 'North Sinai',
    aliases: ['شمال سيناء', 'north sinai']
  },
  {
    code: 'south-sinai',
    nameAr: 'جنوب سيناء',
    nameEn: 'South Sinai',
    aliases: ['جنوب سيناء', 'south sinai']
  },
  {
    code: 'giza-upper',
    nameAr: 'الجيزة (الصعيد)',
    nameEn: 'Giza (Upper)',
    aliases: ['الجيزة الصعيد', 'الجيزة (الصعيد)', 'giza upper']
  },
  {
    code: 'fayoum',
    nameAr: 'الفيوم',
    nameEn: 'Fayoum',
    aliases: ['الفيوم', 'fayoum']
  },
  {
    code: 'beni-suef',
    nameAr: 'بني سويف',
    nameEn: 'Beni Suef',
    aliases: ['بني سويف', 'بنى سويف', 'beni suef']
  },
  {
    code: 'minya',
    nameAr: 'المنيا',
    nameEn: 'Minya',
    aliases: ['المنيا', 'minya']
  },
  {
    code: 'asyut',
    nameAr: 'أسيوط',
    nameEn: 'Asyut',
    aliases: ['أسيوط', 'اسيوط', 'assiut', 'asyut']
  },
  {
    code: 'sohag',
    nameAr: 'سوهاج',
    nameEn: 'Sohag',
    aliases: ['سوهاج', 'sohag']
  },
  {
    code: 'qena',
    nameAr: 'قنا',
    nameEn: 'Qena',
    aliases: ['قنا', 'qena']
  },
  {
    code: 'luxor',
    nameAr: 'الأقصر',
    nameEn: 'Luxor',
    aliases: ['الأقصر', 'الاقصر', 'luxor']
  },
  {
    code: 'aswan',
    nameAr: 'أسوان',
    nameEn: 'Aswan',
    aliases: ['أسوان', 'اسوان', 'aswan']
  },
  {
    code: 'red-sea',
    nameAr: 'البحر الأحمر',
    nameEn: 'Red Sea',
    aliases: ['البحر الأحمر', 'البحر الاحمر', 'red sea']
  },
  {
    code: 'new-valley',
    nameAr: 'الوادي الجديد',
    nameEn: 'New Valley',
    aliases: ['الوادي الجديد', 'new valley']
  },
  {
    code: 'matrouh',
    nameAr: 'مطروح',
    nameEn: 'Matrouh',
    aliases: ['مطروح', 'مرسى مطروح', 'matrouh', 'marsa matrouh']
  }
];

const governorateAliases = Object.fromEntries(
  governorateSeedData.map((governorate) => [governorate.code, governorate.aliases])
);

const normalizeAliasList = (aliases = []) => {
  const normalized = new Set();
  aliases.forEach((alias) => {
    const value = normalizeGovernorateValue(alias);
    if (value) normalized.add(value);
  });
  return [...normalized];
};

const getGovernorateSeedRecords = () => governorateSeedData.map((governorate) => ({
  ...governorate,
  normalizedAliases: normalizeAliasList(governorate.aliases)
}));

const canonicalGovernorateStorageStatus = new WeakMap();

const mapSeedRecordToCanonicalGovernorate = (record) => ({
  id: record.code,
  code: record.code,
  nameAr: record.nameAr,
  nameEn: record.nameEn,
  isActive: true
});

const findSeedGovernorateRecord = (input = '') => {
  const rawInput = String(input || '').trim();
  if (!rawInput) return null;

  const normalizedInput = normalizeGovernorateValue(rawInput);
  return getGovernorateSeedRecords().find((record) =>
    record.code === rawInput ||
    record.code === normalizedInput ||
    record.normalizedAliases.some((candidate) =>
      candidate === normalizedInput ||
      candidate.includes(normalizedInput) ||
      normalizedInput.includes(candidate)
    )
  ) || null;
};

const getSeedCanonicalGovernorateRecords = ({ governorateIds = [], governorates = [] } = {}) => {
  const records = [];
  const seenCodes = new Set();

  const addRecord = (record) => {
    if (!record?.code || seenCodes.has(record.code)) {
      return;
    }

    seenCodes.add(record.code);
    records.push(record);
  };

  const parsedGovernorateIds = Array.isArray(governorateIds)
    ? governorateIds
    : parseZoneGovernorates(governorateIds, 'getSeedCanonicalGovernorateRecords.ids');

  parsedGovernorateIds.forEach((governorateIdOrCode) => {
    addRecord(findSeedGovernorateRecord(governorateIdOrCode));
  });

  parseZoneGovernorates(governorates, 'getSeedCanonicalGovernorateRecords.governorates')
    .forEach((governorate) => {
      addRecord(findSeedGovernorateRecord(governorate));
    });

  return records;
};

const hasCanonicalGovernorateStorage = (prisma) => (
  Boolean(prisma?.governorate) &&
  Boolean(prisma?.governorateAlias) &&
  Boolean(prisma?.shippingZoneGovernorate)
);

const getCanonicalGovernorateStorageAvailability = (prisma) => {
  if (!prisma || typeof prisma !== 'object') {
    return 'unknown';
  }

  return canonicalGovernorateStorageStatus.get(prisma) || 'unknown';
};

const markCanonicalGovernorateStorageAvailability = (prisma, availability) => {
  if (!prisma || typeof prisma !== 'object') {
    return;
  }

  canonicalGovernorateStorageStatus.set(prisma, availability);
};

const canUseCanonicalGovernorateStorage = (prisma) => (
  hasCanonicalGovernorateStorage(prisma) &&
  getCanonicalGovernorateStorageAvailability(prisma) !== 'unavailable'
);

const getShippingZoneInclude = (prisma) => (
  canUseCanonicalGovernorateStorage(prisma)
    ? {
        governorateMappings: {
          include: {
            governorate: true
          }
        }
      }
    : undefined
);

const runShippingQuery = async (operation, maxRetries = 3) => executeWithRetry(
  async () => {
    const prisma = await getSharedPrismaClientAsync();
    return operation(prisma);
  },
  maxRetries
);

const findShippingZonesWithCanonicalFallback = async (prisma, query) => {
  const include = getShippingZoneInclude(prisma);
  if (!include) {
    return prisma.shippingZone.findMany(query);
  }

  try {
    const zones = await prisma.shippingZone.findMany({
      ...query,
      include
    });
    markCanonicalGovernorateStorageAvailability(prisma, 'available');
    return zones;
  } catch (error) {
    if (isCanonicalGovernorateStorageError(error)) {
      markCanonicalGovernorateStorageAvailability(prisma, 'unavailable');
      return prisma.shippingZone.findMany(query);
    }

    throw error;
  }
};

const findShippingZoneWithCanonicalFallback = async (prisma, query) => {
  const include = getShippingZoneInclude(prisma);
  if (!include) {
    return prisma.shippingZone.findFirst(query);
  }

  try {
    const zone = await prisma.shippingZone.findFirst({
      ...query,
      include
    });
    markCanonicalGovernorateStorageAvailability(prisma, 'available');
    return zone;
  } catch (error) {
    if (isCanonicalGovernorateStorageError(error)) {
      markCanonicalGovernorateStorageAvailability(prisma, 'unavailable');
      return prisma.shippingZone.findFirst(query);
    }

    throw error;
  }
};

const isCanonicalGovernorateStorageError = (error) => {
  const message = String(error?.message || '');
  return (
    error?.code === 'P2021' ||
    message.includes('public.governorates') ||
    message.includes('public.governorate_aliases') ||
    message.includes('public.shipping_zone_governorates')
  );
};

const resolveGovernorateVariants = (input = '') => {
  const normalizedInput = normalizeGovernorateValue(input);
  if (!normalizedInput) return [];

  const variants = new Set([normalizedInput]);

  Object.values(governorateAliases).forEach((aliases) => {
    const normalizedAliases = aliases.map(alias => normalizeGovernorateValue(alias));
    if (normalizedAliases.some(alias => alias === normalizedInput || alias.includes(normalizedInput) || normalizedInput.includes(alias))) {
      normalizedAliases.forEach(alias => variants.add(alias));
    }
  });

  return [...variants];
};

const isGovernorateMatch = (candidate, input) => {
  const normalizedCandidate = normalizeGovernorateValue(candidate);
  const inputVariants = resolveGovernorateVariants(input);

  if (!normalizedCandidate || inputVariants.length === 0) {
    return false;
  }

  return inputVariants.some((variant) => (
    normalizedCandidate === variant ||
    normalizedCandidate.includes(variant) ||
    variant.includes(normalizedCandidate)
  ));
};

const parseZoneGovernorates = (governorates, contextLabel = 'shippingZone') => {
  if (Array.isArray(governorates)) {
    return governorates.filter(Boolean);
  }

  if (typeof governorates === 'string') {
    try {
      const parsed = JSON.parse(governorates.trim());
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [governorates].filter(Boolean);
    } catch (e) {
      console.error(`[${contextLabel}] Failed to parse governorates:`, e);
      return [governorates].filter(Boolean);
    }
  }

  return [];
};

const parseZonePricingTiers = (pricingTiers, contextLabel = 'shippingZone.pricingTiers') => {
  if (Array.isArray(pricingTiers)) {
    return pricingTiers.filter(Boolean);
  }

  if (typeof pricingTiers === 'string' && pricingTiers.trim()) {
    try {
      const parsed = JSON.parse(pricingTiers.trim());
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (e) {
      console.error(`[${contextLabel}] Failed to parse pricing tiers:`, e);
      return [];
    }
  }

  return [];
};

const toNumberOrDefault = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toNullableNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const serializeStringArray = (values = []) => JSON.stringify(
  [...new Set((Array.isArray(values) ? values : [values])
    .map((value) => String(value || '').trim())
    .filter(Boolean))]
);

const serializePricingTiers = (pricingTiers) => {
  const normalizedTiers = parseZonePricingTiers(pricingTiers, 'serializePricingTiers')
    .map((tier) => {
      if (!tier || typeof tier !== 'object') {
        return null;
      }

      return {
        ...(tier.minWeight !== undefined && tier.minWeight !== null && tier.minWeight !== ''
          ? { minWeight: toNumberOrDefault(tier.minWeight, 0) }
          : {}),
        ...(tier.maxWeight !== undefined && tier.maxWeight !== null && tier.maxWeight !== ''
          ? { maxWeight: toNumberOrDefault(tier.maxWeight, 0) }
          : {}),
        ...(tier.minOrderValue !== undefined && tier.minOrderValue !== null && tier.minOrderValue !== ''
          ? { minOrderValue: toNumberOrDefault(tier.minOrderValue, 0) }
          : {}),
        ...(tier.maxOrderValue !== undefined && tier.maxOrderValue !== null && tier.maxOrderValue !== ''
          ? { maxOrderValue: toNumberOrDefault(tier.maxOrderValue, 0) }
          : {}),
        price: toNumberOrDefault(tier.price, 0)
      };
    })
    .filter(Boolean);

  return normalizedTiers.length > 0 ? JSON.stringify(normalizedTiers) : null;
};

const normalizeQuoteItemQuantity = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }

  return Math.max(1, Math.floor(parsed));
};

const normalizePublicShippingQuoteItems = (rawItems) => {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const productId = String(item.productId || '').trim();
      if (!productId) {
        return null;
      }

      const variantId = String(item.variantId || '').trim();
      return {
        productId,
        variantId: variantId || null,
        quantity: normalizeQuoteItemQuantity(item.quantity),
      };
    })
    .filter(Boolean);
};

const buildShippingClassCountsForQuote = async (prisma, companyId, items) => {
  const normalizedItems = normalizePublicShippingQuoteItems(items);
  if (normalizedItems.length === 0) {
    return {};
  }

  const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: {
      companyId,
      id: { in: productIds },
    },
    select: {
      id: true,
      metadata: true,
      productVariants: {
        select: {
          id: true,
          metadata: true,
        },
      },
    },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));
  const classCounts = {};

  normalizedItems.forEach((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      return;
    }

    const selectedVariant = item.variantId
      ? product.productVariants.find((variant) => variant.id === item.variantId)
      : null;
    const shippingClass = resolveShippingClass(
      selectedVariant?.metadata,
      product.metadata,
    );

    classCounts[shippingClass] = (classCounts[shippingClass] || 0) + item.quantity;
  });

  return classCounts;
};

const extractCanonicalGovernorates = (zone) => {
  const seenGovernorateIds = new Set();
  const mappedGovernorates = (zone.governorateMappings || [])
    .map((mapping) => mapping?.governorate)
    .filter((governorate) => {
      if (!governorate?.id || seenGovernorateIds.has(governorate.id)) {
        return false;
      }

      seenGovernorateIds.add(governorate.id);
      return true;
    })
    .map((governorate) => ({
      id: governorate.id,
      code: governorate.code,
      nameAr: governorate.nameAr,
      nameEn: governorate.nameEn,
      isActive: governorate.isActive
    }));

  if (mappedGovernorates.length > 0) {
    return mappedGovernorates;
  }

  return getSeedCanonicalGovernorateRecords({
    governorateIds: zone.governorateIds,
    governorates: zone.governorates
  }).map(mapSeedRecordToCanonicalGovernorate);
};

const normalizeShippingZoneResponse = (zone) => {
  const { governorateMappings, ...rest } = zone;
  const canonicalGovernorates = extractCanonicalGovernorates(zone);

  return {
    ...rest,
    governorates: parseZoneGovernorates(zone.governorates, 'normalizeShippingZoneResponse.governorates'),
    governorateIds: canonicalGovernorates.map((governorate) => governorate.code),
    pricingTiers: parseZonePricingTiers(zone.pricingTiers, 'normalizeShippingZoneResponse.pricingTiers'),
    price: toNumberOrDefault(zone.price, 0),
    freeShippingThreshold: toNullableNumber(zone.freeShippingThreshold),
    canonicalGovernorates
  };
};

const findMatchedGovernorateLabel = (zoneGovernorates = [], input = '') => {
  return zoneGovernorates.find((gov) => isGovernorateMatch(gov, input)) || zoneGovernorates[0] || input;
};

const buildShippingQuotePayload = (zone, matchedGovernorate) => {
  if (!zone) {
    return {
      zoneId: null,
      price: 0,
      deliveryTime: 'غير محدد',
      governorate: null,
      methods: [],
      zone: null,
    };
  }

  const price = toNumberOrDefault(zone.price, 0);
  const deliveryTime = zone.deliveryTime || '3-5 أيام';
  const governorate = matchedGovernorate || null;
  const method = {
    id: zone.id,
    name: zone.name || 'Standard Shipping',
    cost: price,
    price,
    deliveryTime,
    governorate,
  };

  return {
    zoneId: zone.id,
    price,
    deliveryTime,
    governorate,
    methods: [method],
    zone,
  };
};

const parseShippingConfigObject = (settings) => {
  if (!settings) {
    return {};
  }

  if (typeof settings === 'string') {
    try {
      return JSON.parse(settings);
    } catch {
      return {};
    }
  }

  return typeof settings === 'object' ? settings : {};
};

const normalizeShippingMethodMatchValue = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

const parseShippingClassesFromSettings = (companySettings) => {
  const parsedSettings = parseShippingConfigObject(companySettings);
  const classes = parsedSettings.shippingClasses || parsedSettings.shippingClassOptions;

  return Array.isArray(classes) ? classes : [];
};

const resolveMatchedShippingClassMethodContext = ({
  shippingMethods = [],
  companySettings = null,
  shippingClassCounts = {},
}) => {
  const activeShippingClasses = Object.entries(shippingClassCounts || {})
    .filter(([, countValue]) => (Number(countValue) || 0) > 0)
    .map(([shippingClass]) => normalizeShippingMethodMatchValue(shippingClass))
    .filter(Boolean);

  const uniqueShippingClasses = [...new Set(activeShippingClasses)];
  if (uniqueShippingClasses.length !== 1) {
    return {
      matchedMethods: [],
      matchedShippingClassKey: null,
      matchedShippingClassLabel: null,
    };
  }

  const matchedShippingClassKey = uniqueShippingClasses[0];
  const configuredClass = parseShippingClassesFromSettings(companySettings).find((entry) => (
    normalizeShippingMethodMatchValue(entry?.key) === matchedShippingClassKey
  ));

  const candidateNames = new Set([matchedShippingClassKey]);
  const matchedShippingClassLabel = String(configuredClass?.label || '').trim() || null;
  if (matchedShippingClassLabel) {
    candidateNames.add(normalizeShippingMethodMatchValue(matchedShippingClassLabel));
  }

  const matchedMethods = shippingMethods.filter((method) => {
    const title = normalizeShippingMethodMatchValue(method?.title);
    return title && candidateNames.has(title);
  });

  return {
    matchedMethods,
    matchedShippingClassKey,
    matchedShippingClassLabel,
  };
};

const buildClassAwareShippingMethods = ({
  shippingMethods = [],
  fallbackMethod = null,
  deliveryTime,
  governorate,
  companySettings = null,
  shippingClassCounts = {},
}) => {
  const enabledMethods = Array.isArray(shippingMethods)
    ? shippingMethods.filter((method) => method && method.isEnabled !== false)
    : [];

  if (enabledMethods.length === 0) {
    return fallbackMethod ? [fallbackMethod] : [];
  }

  const {
    matchedMethods,
    matchedShippingClassKey,
    matchedShippingClassLabel,
  } = resolveMatchedShippingClassMethodContext({
    shippingMethods: enabledMethods,
    companySettings,
    shippingClassCounts,
  });
  const useMatchedMethodsAsFinalPrice = matchedMethods.length > 0;
  const methodsToBuild = useMatchedMethodsAsFinalPrice ? matchedMethods : enabledMethods;
  const parsedCompanySettings = parseShippingConfigObject(companySettings);

  return methodsToBuild.map((method) => {
    const settings = parseShippingConfigObject(method.settings);
    const basePrice = toNumberOrDefault(
      settings.cost,
      fallbackMethod ? toNumberOrDefault(fallbackMethod.price, 0) : 0,
    );
    const shippingClassSurcharge = useMatchedMethodsAsFinalPrice
      ? 0
      : calculateShippingClassSurcharge(
          shippingClassCounts,
          resolveShippingClassConfig(parsedCompanySettings, settings),
        );
    const price = basePrice + shippingClassSurcharge;

    return {
      id: method.id,
      name: method.title || fallbackMethod?.name || 'Standard Shipping',
      title: method.title || fallbackMethod?.name || 'Standard Shipping',
      label: method.title || fallbackMethod?.name || 'Standard Shipping',
      type: method.type || 'flat_rate',
      cost: price,
      price,
      baseCost: basePrice,
      basePrice,
      shippingClassSurcharge,
      deliveryTime: deliveryTime || fallbackMethod?.deliveryTime || '3-5 أيام',
      governorate: governorate || fallbackMethod?.governorate || null,
      sortOrder: Number(method.sortOrder) || 0,
      matchedShippingClassKey: useMatchedMethodsAsFinalPrice
        ? matchedShippingClassKey
        : null,
      matchedShippingClassLabel: useMatchedMethodsAsFinalPrice
        ? matchedShippingClassLabel
        : null,
    };
  });
};

const resolvePublicShippingQuote = async ({
  companyId,
  governorate,
  shippingClassCounts = {},
}) => {
  const quote = await resolveShippingQuoteForGovernorate(companyId, governorate);

  if (!quote.zoneId) {
    return {
      zoneId: null,
      price: 0,
      basePrice: 0,
      shippingClassSurcharge: 0,
      deliveryTime: 'غير محدد',
      governorate: null,
      methods: [],
      zone: null,
    };
  }

  let shippingClassSurcharge = 0;
  let basePrice = Number(quote.price) || 0;
  let methods = quote.methods;
  const hasShippingClassCounts = Object.entries(shippingClassCounts || {}).some(
    ([, countValue]) => (Number(countValue) || 0) > 0,
  );

  const prisma = await getSharedPrismaClientAsync();
  const [company, shippingMethods] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    }),
    prisma.shippingMethod?.findMany
      ? prisma.shippingMethod.findMany({
          where: {
            zoneId: quote.zoneId,
            isEnabled: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        })
      : Promise.resolve([]),
  ]);

  methods = buildClassAwareShippingMethods({
    shippingMethods,
    fallbackMethod: quote.methods[0] || null,
    deliveryTime: quote.deliveryTime,
    governorate: quote.governorate,
    companySettings: company?.settings,
    shippingClassCounts,
  });

  if (methods.length > 0) {
    const defaultMethod = methods[0];
    basePrice = Number(
      defaultMethod.basePrice ?? defaultMethod.baseCost ?? defaultMethod.cost,
    ) || 0;
    shippingClassSurcharge =
      Number(defaultMethod.shippingClassSurcharge) || 0;
  } else if (hasShippingClassCounts) {
    shippingClassSurcharge = calculateShippingClassSurcharge(
      shippingClassCounts,
      resolveShippingClassConfig(company?.settings, null),
    );
  }

  const totalPrice =
    methods.length > 0
      ? Number(methods[0]?.price ?? methods[0]?.cost) || 0
      : (Number(quote.price) || 0) + shippingClassSurcharge;

  return {
    zoneId: quote.zoneId,
    price: totalPrice,
    basePrice,
    shippingClassSurcharge,
    deliveryTime: quote.deliveryTime,
    governorate: quote.governorate,
    methods,
    zone: quote.zone,
  };
};

const resolveShippingQuoteForGovernorate = async (companyId, governorateInput) => {
  if (!companyId || !governorateInput) {
    return buildShippingQuotePayload(null, null);
  }

  const canonicalMatch = await findZoneViaCanonicalGovernorate(companyId, governorateInput);
  if (canonicalMatch?.zone) {
    return buildShippingQuotePayload(
      canonicalMatch.zone,
      canonicalMatch.governorate?.nameAr || governorateInput,
    );
  }

  const zones = await runShippingQuery((prisma) => findShippingZonesWithCanonicalFallback(prisma, {
    where: {
      companyId,
      isActive: true,
    },
  }));

  const matchedZone = zones.find((zone) => {
    const governorates = parseZoneGovernorates(zone.governorates, 'resolveShippingQuoteForGovernorate');
    return governorates.some((gov) => isGovernorateMatch(gov, governorateInput));
  });

  if (!matchedZone) {
    return buildShippingQuotePayload(null, null);
  }

  const zoneGovernorates = parseZoneGovernorates(
    matchedZone.governorates,
    'resolveShippingQuoteForGovernorate.matched',
  );
  const matchedGovernorate = findMatchedGovernorateLabel(zoneGovernorates, governorateInput);
  return buildShippingQuotePayload(matchedZone, matchedGovernorate);
};

const findCanonicalGovernorate = async (input = '') => {
  const normalizedInput = normalizeGovernorateValue(input);
  if (!normalizedInput) return null;

  const fallbackRecord = findSeedGovernorateRecord(input);
  const prisma = await getSharedPrismaClientAsync();
  if (!canUseCanonicalGovernorateStorage(prisma)) {
    return fallbackRecord ? mapSeedRecordToCanonicalGovernorate(fallbackRecord) : null;
  }

  try {
    const alias = await prisma.governorateAlias.findFirst({
      where: {
        normalizedAlias: normalizedInput,
        governorate: {
          isActive: true
        }
      },
      include: {
        governorate: true
      }
    });

    if (alias?.governorate) {
      markCanonicalGovernorateStorageAvailability(prisma, 'available');
      return alias.governorate;
    }
  } catch (error) {
    if (!isCanonicalGovernorateStorageError(error)) {
      throw error;
    }

    markCanonicalGovernorateStorageAvailability(prisma, 'unavailable');
    return fallbackRecord ? mapSeedRecordToCanonicalGovernorate(fallbackRecord) : null;
  }

  const seedRecord = getGovernorateSeedRecords().find((record) =>
    record.normalizedAliases.some((candidate) =>
      candidate === normalizedInput ||
      candidate.includes(normalizedInput) ||
      normalizedInput.includes(candidate)
    )
  );

  if (!seedRecord) {
    return null;
  }

  try {
    const canonicalGovernorate = await prisma.governorate.findFirst({
      where: {
        code: seedRecord.code,
        isActive: true
      }
    });

    markCanonicalGovernorateStorageAvailability(prisma, 'available');
    return canonicalGovernorate || mapSeedRecordToCanonicalGovernorate(seedRecord);
  } catch (error) {
    if (!isCanonicalGovernorateStorageError(error)) {
      throw error;
    }

    markCanonicalGovernorateStorageAvailability(prisma, 'unavailable');
    return mapSeedRecordToCanonicalGovernorate(seedRecord);
  }
};

const findZoneViaCanonicalGovernorate = async (companyId, governorateInput) => {
  const prisma = await getSharedPrismaClientAsync();
  if (!canUseCanonicalGovernorateStorage(prisma)) {
    return null;
  }

  const governorate = await findCanonicalGovernorate(governorateInput);
  if (!governorate) return null;
  if (!canUseCanonicalGovernorateStorage(prisma)) {
    return null;
  }

  let mapping;
  try {
    mapping = await prisma.shippingZoneGovernorate.findFirst({
      where: {
        governorateId: governorate.id,
        shippingZone: {
          companyId,
          isActive: true
        }
      },
      include: {
        shippingZone: true,
        governorate: true
      }
    });
    markCanonicalGovernorateStorageAvailability(prisma, 'available');
  } catch (error) {
    if (isCanonicalGovernorateStorageError(error)) {
      markCanonicalGovernorateStorageAvailability(prisma, 'unavailable');
      return null;
    }

    throw error;
  }

  if (!mapping?.shippingZone) {
    return null;
  }

  return {
    zone: mapping.shippingZone,
    governorate
  };
};

const syncCanonicalShippingData = async (companyId = null) => {
  const prisma = await getSharedPrismaClientAsync();
  if (!canUseCanonicalGovernorateStorage(prisma)) {
    return;
  }

  const seedRecords = getGovernorateSeedRecords();

  try {
    for (const record of seedRecords) {
      const governorate = await prisma.governorate.upsert({
        where: { code: record.code },
        update: {
          nameAr: record.nameAr,
          nameEn: record.nameEn,
          isActive: true
        },
        create: {
          code: record.code,
          nameAr: record.nameAr,
          nameEn: record.nameEn,
          isActive: true
        }
      });

      for (const alias of record.aliases) {
        const normalizedAlias = normalizeGovernorateValue(alias);
        if (!normalizedAlias) continue;

        await prisma.governorateAlias.upsert({
          where: {
            governorateId_normalizedAlias: {
              governorateId: governorate.id,
              normalizedAlias
            }
          },
          update: {
            alias
          },
          create: {
            governorateId: governorate.id,
            alias,
            normalizedAlias
          }
        });
      }
    }

    const zones = await prisma.shippingZone.findMany({
      where: companyId ? { companyId } : undefined
    });

    for (const zone of zones) {
      const zoneGovernorates = parseZoneGovernorates(zone.governorates, 'syncCanonicalShippingData');
      const matchedGovernorateIds = new Set();

      const explicitGovernorateIds = Array.isArray(zone.governorateIds)
        ? zone.governorateIds
        : parseZoneGovernorates(zone.governorateIds, 'syncCanonicalShippingData.ids');

      for (const governorateIdOrCode of explicitGovernorateIds) {
        const governorate = await prisma.governorate.findFirst({
          where: {
            OR: [
              { id: governorateIdOrCode },
              { code: governorateIdOrCode }
            ]
          }
        });

        if (governorate?.id) {
          matchedGovernorateIds.add(governorate.id);
        }
      }

      for (const zoneGovernorate of zoneGovernorates) {
        const canonicalGovernorate = await findCanonicalGovernorate(zoneGovernorate);
        if (canonicalGovernorate?.id) {
          matchedGovernorateIds.add(canonicalGovernorate.id);
        }
      }

      const matchedGovernorateIdsList = [...matchedGovernorateIds];

      if (matchedGovernorateIdsList.length > 0) {
        await prisma.shippingZoneGovernorate.deleteMany({
          where: {
            shippingZoneId: zone.id,
            governorateId: {
              notIn: matchedGovernorateIdsList
            }
          }
        });
      } else {
        await prisma.shippingZoneGovernorate.deleteMany({
          where: {
            shippingZoneId: zone.id
          }
        });
      }

      for (const governorateId of matchedGovernorateIdsList) {
        await prisma.shippingZoneGovernorate.upsert({
          where: {
            shippingZoneId_governorateId: {
              shippingZoneId: zone.id,
              governorateId
            }
          },
          update: {},
          create: {
            shippingZoneId: zone.id,
            governorateId
          }
        });
      }
    }

    markCanonicalGovernorateStorageAvailability(prisma, 'available');
  } catch (error) {
    if (isCanonicalGovernorateStorageError(error)) {
      markCanonicalGovernorateStorageAvailability(prisma, 'unavailable');
      console.warn('Canonical governorate storage unavailable; continuing with seed fallback:', error.message);
      return;
    }
    
    console.error('Error during canonical shipping data sync:', error.message);
    // Continue execution despite sync errors
  }
};

// Get all shipping zones for a company
const getShippingZones = async (req, res) => {
  try {
    const { companyId } = req.user;

    await syncCanonicalShippingData(companyId);

    const zones = await runShippingQuery((prisma) => findShippingZonesWithCanonicalFallback(prisma, {
      where: { companyId },
      orderBy: [
        { isActive: 'desc' },
        { price: 'asc' }
      ]
    }));

    return res.json({
      success: true,
      data: zones.map(normalizeShippingZoneResponse)
    });
  } catch (error) {
    console.error('Error fetching shipping zones:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ZONES_ERROR',
        message: 'فشل في تحميل مناطق الشحن',
        details: error.message
      }
    });
  }
};

// Get single shipping zone by ID
const getShippingZoneById = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    await syncCanonicalShippingData(companyId);

    const zone = await runShippingQuery((prisma) => findShippingZoneWithCanonicalFallback(prisma, {
      where: {
        id,
        companyId
      }
    }));

    if (!zone) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ZONE_NOT_FOUND',
          message: 'منطقة الشحن غير موجودة'
        }
      });
    }

    res.json({
      success: true,
      data: normalizeShippingZoneResponse(zone)
    });
  } catch (error) {
    console.error('Error fetching shipping zone:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ZONE_ERROR',
        message: 'فشل في تحميل منطقة الشحن',
        details: error.message
      }
    });
  }
};

// Create new shipping zone
const buildShippingZonePayload = async ({ name, governorateIds, governorates, pricingType, price, pricingTiers, deliveryTime, deliveryTimeType, freeShippingThreshold, isActive, companyId }) => {
  const canonicalGovernorates = getSeedCanonicalGovernorateRecords({
    governorateIds,
    governorates
  });
  const fallbackGovernorates = parseZoneGovernorates(governorates, 'buildShippingZonePayload.governorates');
  const canonicalNames = canonicalGovernorates.map((gov) => gov.nameAr).filter(Boolean);
  const canonicalAliases = canonicalGovernorates.flatMap((gov) => [gov.nameAr, gov.nameEn, ...(gov.aliases || [])].filter(Boolean));
  const finalGovernorates = [...new Set([...(canonicalAliases.length > 0 ? canonicalAliases : []), ...fallbackGovernorates])];
  const finalPricingTiers = pricingType === 'tiered'
    ? serializePricingTiers(pricingTiers)
    : null;

  return {
    data: {
      name: name.trim(),
      governorates: serializeStringArray(finalGovernorates.length > 0 ? finalGovernorates : canonicalNames),
      pricingType,
      price: toNumberOrDefault(price, 0),
      pricingTiers: finalPricingTiers,
      deliveryTime,
      deliveryTimeType: deliveryTimeType || 'custom',
      freeShippingThreshold: toNullableNumber(freeShippingThreshold),
      isActive: isActive !== undefined ? isActive : true,
      companyId
    },
    canonicalGovernorates
  };
};

const createShippingZone = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { 
      name,
      governorateIds,
      governorates, 
      pricingType,
      price, 
      pricingTiers,
      deliveryTime,
      deliveryTimeType,
      freeShippingThreshold,
      isActive 
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إدخال اسم المنطقة'
        }
      });
    }

    if ((!governorateIds || !Array.isArray(governorateIds) || governorateIds.length === 0) && (!governorates || !Array.isArray(governorates) || governorates.length === 0)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إضافة محافظة واحدة على الأقل'
        }
      });
    }

    const finalPricingType = pricingType || 'flat';

    if (finalPricingType === 'flat' && (!price || price <= 0)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إدخال سعر صحيح'
        }
      });
    }

    if (finalPricingType === 'tiered' && (!pricingTiers || !Array.isArray(pricingTiers) || pricingTiers.length === 0)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إضافة شريحة سعر واحدة على الأقل'
        }
      });
    }

    if (!deliveryTime) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إدخال مدة التوصيل'
        }
      });
    }

    const payload = await buildShippingZonePayload({
      name,
      governorateIds,
      governorates,
      pricingType: finalPricingType,
      price,
      pricingTiers,
      deliveryTime,
      deliveryTimeType,
      freeShippingThreshold,
      isActive,
      companyId
    });

    const createdZone = await runShippingQuery((prisma) => prisma.shippingZone.create({
      data: payload.data
    }));

    await syncCanonicalShippingData(companyId);

    const zone = await runShippingQuery((prisma) => findShippingZoneWithCanonicalFallback(prisma, {
      where: {
        id: createdZone.id,
        companyId
      }
    }));

    res.status(201).json({
      success: true,
      data: normalizeShippingZoneResponse(zone || createdZone),
      message: 'تم إضافة منطقة الشحن بنجاح'
    });
  } catch (error) {
    console.error('Error creating shipping zone:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ZONE_ERROR',
        message: 'فشل في إضافة منطقة الشحن',
        details: error.message
      }
    });
  }
};

// Update shipping zone
const updateShippingZone = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;
    const { 
      name,
      governorateIds,
      governorates, 
      pricingType,
      price, 
      pricingTiers,
      deliveryTime,
      deliveryTimeType,
      freeShippingThreshold,
      isActive 
    } = req.body;

    // Check if zone exists and belongs to company
    const existingZone = await getSharedPrismaClient().shippingZone.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!existingZone) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ZONE_NOT_FOUND',
          message: 'منطقة الشحن غير موجودة'
        }
      });
    }

    // Validation
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إدخال اسم المنطقة'
        }
      });
    }

    if (
      governorates !== undefined &&
      governorateIds === undefined &&
      (!Array.isArray(governorates) || governorates.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إضافة محافظة واحدة على الأقل'
        }
      });
    }

    const finalPricingType = pricingType || existingZone.pricingType || 'flat';

    if (finalPricingType === 'flat' && price !== undefined && (!price || price <= 0)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إدخال سعر صحيح'
        }
      });
    }

    if (finalPricingType === 'tiered' && pricingTiers !== undefined && (!Array.isArray(pricingTiers) || pricingTiers.length === 0)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إضافة شريحة سعر واحدة على الأقل'
        }
      });
    }

    if (deliveryTime !== undefined && !deliveryTime) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى إدخال مدة التوصيل'
        }
      });
    }

    const nextName = name !== undefined ? name : existingZone.name;
    const nextGovernorateIds = governorateIds !== undefined ? governorateIds : [];
    const nextGovernorates = governorates !== undefined ? governorates : parseZoneGovernorates(existingZone.governorates, 'updateShippingZone.existing');
    const nextPricingType = pricingType !== undefined ? pricingType : finalPricingType;
    const nextPrice = price !== undefined ? price : existingZone.price;
    const nextPricingTiers = pricingTiers !== undefined ? pricingTiers : parseZonePricingTiers(existingZone.pricingTiers, 'updateShippingZone.existingPricingTiers');
    const nextDeliveryTime = deliveryTime !== undefined ? deliveryTime : existingZone.deliveryTime;
    const nextDeliveryTimeType = deliveryTimeType !== undefined ? deliveryTimeType : existingZone.deliveryTimeType;
    const nextFreeShippingThreshold = freeShippingThreshold !== undefined ? freeShippingThreshold : existingZone.freeShippingThreshold;
    const nextIsActive = isActive !== undefined ? isActive : existingZone.isActive;

    const payload = await buildShippingZonePayload({
      name: nextName,
      governorateIds: nextGovernorateIds,
      governorates: nextGovernorates,
      pricingType: nextPricingType,
      price: nextPrice,
      pricingTiers: nextPricingTiers,
      deliveryTime: nextDeliveryTime,
      deliveryTimeType: nextDeliveryTimeType,
      freeShippingThreshold: nextFreeShippingThreshold,
      isActive: nextIsActive,
      companyId
    });

    const updatedZone = await runShippingQuery((prisma) => prisma.shippingZone.update({
      where: { id },
      data: payload.data
    }));

    await syncCanonicalShippingData(companyId);

    const zone = await runShippingQuery((prisma) => findShippingZoneWithCanonicalFallback(prisma, {
      where: {
        id: updatedZone.id,
        companyId
      }
    }));

    res.json({
      success: true,
      data: normalizeShippingZoneResponse(zone || updatedZone),
      message: 'تم تحديث منطقة الشحن بنجاح'
    });
  } catch (error) {
    console.error('Error updating shipping zone:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ZONE_ERROR',
        message: 'فشل في تحديث منطقة الشحن',
        details: error.message
      }
    });
  }
};

// Delete shipping zone
const deleteShippingZone = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    // Check if zone exists and belongs to company
    const existingZone = await getSharedPrismaClient().shippingZone.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!existingZone) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ZONE_NOT_FOUND',
          message: 'منطقة الشحن غير موجودة'
        }
      });
    }

    await getSharedPrismaClient().shippingZone.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'تم حذف منطقة الشحن بنجاح'
    });
  } catch (error) {
    console.error('Error deleting shipping zone:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ZONE_ERROR',
        message: 'فشل في حذف منطقة الشحن',
        details: error.message
      }
    });
  }
};

// Toggle shipping zone active status
const toggleZoneStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    const zone = await getSharedPrismaClient().shippingZone.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!zone) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ZONE_NOT_FOUND',
          message: 'منطقة الشحن غير موجودة'
        }
      });
    }

    const updatedZone = await getSharedPrismaClient().shippingZone.update({
      where: { id },
      data: {
        isActive: !zone.isActive
      }
    });

    res.json({
      success: true,
      data: updatedZone,
      message: `تم ${updatedZone.isActive ? 'تفعيل' : 'تعطيل'} منطقة الشحن بنجاح`
    });
  } catch (error) {
    console.error('Error toggling zone status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TOGGLE_STATUS_ERROR',
        message: 'فشل في تغيير حالة منطقة الشحن',
        details: error.message
      }
    });
  }
};

// Find shipping price for a governorate (used by automated order flows)
const findShippingPrice = async (req, res) => {
  try {
    const { companyId } = req.user || {};
    const { governorate } = req.query;

    console.log('[findShippingPrice] Request:', { companyId, governorate });

    if (!companyId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'غير مصرح - لم يتم العثور على معرف الشركة'
        }
      });
    }

    if (!governorate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى تحديد المحافظة'
        }
      });
    }

    await syncCanonicalShippingData(companyId);

    const canonicalMatch = await findZoneViaCanonicalGovernorate(companyId, governorate);
    if (canonicalMatch?.zone) {
      return res.json({
        success: true,
        data: {
          zoneId: canonicalMatch.zone.id,
          price: parseFloat(canonicalMatch.zone.price),
          deliveryTime: canonicalMatch.zone.deliveryTime,
          governorate: canonicalMatch.governorate.nameAr
        }
      });
    }

    // Get all active zones for the company
    const prisma = await getSharedPrismaClientAsync();
    const zones = await prisma.shippingZone.findMany({
      where: {
        companyId,
        isActive: true
      }
    });
    
    console.log('[findShippingPrice] Found zones:', zones.length);

    // Legacy fallback: Find matching zone from stored free-text governorates
    const matchedZone = zones.find(zone => {
      const governorates = parseZoneGovernorates(zone.governorates, 'findShippingPrice');
      return governorates.some(gov => isGovernorateMatch(gov, governorate));
    });

    if (matchedZone) {
      const zoneGovernorates = parseZoneGovernorates(matchedZone.governorates, 'findShippingPrice');
      return res.json({
        success: true,
        data: {
          zoneId: matchedZone.id,
          price: parseFloat(matchedZone.price),
          deliveryTime: matchedZone.deliveryTime,
          governorate: findMatchedGovernorateLabel(zoneGovernorates, governorate)
        }
      });
    }

    // No matching zone found
    res.json({
      success: true,
      data: {
        zoneId: null,
        price: 0,
        deliveryTime: 'غير محدد',
        governorate: null
      },
      message: 'لم يتم العثور على منطقة شحن مطابقة'
    });
  } catch (error) {
    console.error('Error finding shipping price:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FIND_PRICE_ERROR',
        message: 'فشل في البحث عن سعر الشحن',
        details: error.message
      }
    });
  }
};

// Get active shipping zones only
const getActiveShippingZones = async (req, res) => {
  try {
    const { companyId } = req.user;

    await syncCanonicalShippingData(companyId);

    const zones = await runShippingQuery((prisma) => findShippingZonesWithCanonicalFallback(prisma, {
      where: {
        companyId,
        isActive: true
      },
      orderBy: {
        price: 'asc'
      }
    }));

    return res.json({
      success: true,
      data: zones.map(normalizeShippingZoneResponse)
    });
  } catch (error) {
    console.error('Error fetching active shipping zones:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ACTIVE_ZONES_ERROR',
        message: 'فشل في تحميل مناطق الشحن النشطة',
        details: error.message
      }
    });
  }
};

// Calculate shipping cost for public storefront (no authentication)
const calculatePublicShippingCost = async (req, res) => {
  try {
    const { companyId } = req.params;
    const governorate =
      typeof req.body?.governorate === 'string' && req.body.governorate.trim()
        ? req.body.governorate
        : req.query.governorate;
    const quoteItems = normalizePublicShippingQuoteItems(req.body?.items);

    console.log('[calculatePublicShippingCost] Request:', {
      companyId,
      governorate,
      itemsCount: quoteItems.length,
    });

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'معرف الشركة مطلوب'
        }
      });
    }

    if (!governorate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يرجى تحديد المحافظة'
        }
      });
    }

    await syncCanonicalShippingData(companyId);

    const prisma = await getSharedPrismaClientAsync();
    const shippingClassCounts = await buildShippingClassCountsForQuote(
      prisma,
      companyId,
      quoteItems,
    );
    const quote = await resolvePublicShippingQuote({
      companyId,
      governorate,
      shippingClassCounts,
    });

    if (quote.zoneId) {
      console.log('[calculatePublicShippingCost] Matched zone:', quote.zoneId);
      return res.json({
        success: true,
        data: {
          zoneId: quote.zoneId,
          price: quote.price,
          basePrice: quote.basePrice,
          shippingClassSurcharge: quote.shippingClassSurcharge,
          deliveryTime: quote.deliveryTime,
          governorate: quote.governorate,
          methods: quote.methods,
        }
      });
    }

    // No matching zone found - return 0 instead of error
    res.json({
      success: true,
      data: {
        zoneId: null,
        price: 0,
        deliveryTime: 'غير محدد',
        governorate: null,
        methods: []
      },
      message: 'لم يتم العثور على منطقة شحن مطابقة'
    });
  } catch (error) {
    console.error('Error calculating public shipping cost:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CALCULATE_COST_ERROR',
        message: 'فشل في حساب تكلفة الشحن',
        details: error.message
      }
    });
  }
};

const getCanonicalGovernorates = async (req, res) => {
  try {
    const { companyId } = req.user || {};

    try {
      await syncCanonicalShippingData(companyId || null);

      const governorates = await getSharedPrismaClient().governorate.findMany({
        where: { isActive: true },
        include: {
          aliases: {
            orderBy: {
              alias: 'asc'
            }
          }
        },
        orderBy: {
          nameAr: 'asc'
        }
      });

      return res.json({
        success: true,
        data: governorates
      });
    } catch (canonicalError) {
      console.warn('Canonical governorates query failed, falling back to seed data:', canonicalError.message);
      return res.json({
        success: true,
        data: getGovernorateSeedRecords().map((record) => ({
          id: record.code,
          code: record.code,
          nameAr: record.nameAr,
          nameEn: record.nameEn,
          isActive: true,
          aliases: record.aliases.map((alias, index) => ({
            id: `${record.code}-${index}`,
            alias,
            normalizedAlias: normalizeGovernorateValue(alias)
          }))
        }))
      });
    }
  } catch (error) {
    console.error('Error fetching canonical governorates:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_GOVERNORATES_ERROR',
        message: 'فشل في تحميل المحافظات المعيارية',
        details: error.message
      }
    });
  }
};

module.exports = {
  getShippingZones,
  getShippingZoneById,
  createShippingZone,
  updateShippingZone,
  deleteShippingZone,
  toggleZoneStatus,
  findShippingPrice,
  getActiveShippingZones,
  calculatePublicShippingCost,
  getCanonicalGovernorates,
  resolveShippingQuoteForGovernorate,
  resolvePublicShippingQuote
};

