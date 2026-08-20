const { getSharedPrismaClient } = require('./sharedDatabase');

const DEFAULT_SETTINGS = {
  system: 'AUTO_DISCOUNT',
  activated: false,
  enabled: true,
  discountPercent: 10,
  validityDays: 3,
  convertExpiredToCashback: true,
  pointsPerAmount: 5,
  pointsRedemptionValue: 1,
  redeemPointsEnabled: true,
  // ≡ƒåò ┘ü┘ä╪º╪¼╪º╪¬ ╪¬┘ü╪╣┘è┘ä ┘à╪│╪¬┘é┘ä╪⌐ ┘ä┘â┘ä ┘å╪╕╪º┘à (╪╣╪┤╪º┘å ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ ┘ê╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è ┘è╪┤╪¬╪║┘ä┘ê╪º ┘à╪╣ ╪¿╪╣╪╢)
  tiersEnabled: false,
  autoDiscountEnabled: false,
  // ≡ƒåò ┘ê╪╢╪╣ ╪»┘à╪¼ ╪«╪╡┘à ╪º┘ä┘à╪│╪¬┘ê┘ë + ┘â┘ê╪¿┘ê┘å ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è:
  //   'BEST' = ╪ú╪╣┘ä┘ë ╪«╪╡┘à ╪¿╪│ | 'ADDITIVE' = ╪¼┘à╪╣ ╪º┘ä┘å╪│╪¿ | 'COMPOUND' = ┘à╪▒┘â┘æ╪¿
  discountCombination: 'ADDITIVE',
  // ╪¡╪» ╪ú┘é╪╡┘ë ┘ä╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪«╪╡┘à (┘¬) ΓÇö 0 = ╪¿╪»┘ê┘å ╪¡╪»
  maxTotalDiscountPercent: 20,
};

/**
 * ╪Ñ╪╣╪»╪º╪»╪º╪¬ ┘å╪╕╪º┘à "╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è" ┘ä╪┤╪▒┘â╪⌐ ┘à╪╣┘è┘å╪⌐
 */
async function getSettings(companyId) {
  const prisma = getSharedPrismaClient();
  // ≡ƒ¢í∩╕Å ┘ä┘ê ╪º┘ä┘Ç companyId ┘å╪º┘é╪╡/╪║┘è╪▒ ╪╡╪º┘ä╪¡ (┘à╪½┘ä SUPER_ADMIN ┘à┘å ╪║┘è╪▒ ╪│┘è╪º┘é ╪┤╪▒┘â╪⌐)
  // ┘å╪▒╪¼┘æ╪╣ ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐ ╪¿╪»┘ä ┘à╪º ┘å┘ê┘é╪╣ ┘ü┘è ╪«╪╖╪ú Prisma validation ΓåÆ 500
  if (!companyId) {
    return { ...DEFAULT_SETTINGS, loyaltySystem: 'TIERS' };
  }
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { loyaltySystem: true, loyaltySettings: true }
  });
  let cfg = { ...DEFAULT_SETTINGS };
  let storedSettings = {};
  try {
    if (company?.loyaltySettings) {
      storedSettings = JSON.parse(company.loyaltySettings);
      cfg = { ...cfg, ...storedSettings };
    }
  } catch (e) { /* ignore malformed */ }
  const result = { ...cfg, loyaltySystem: company?.loyaltySystem || 'TIERS' };
  // ≡ƒƒó backfill: ╪º┘ä╪┤╪▒┘â╪º╪¬ ╪º┘ä┘ä┘è ┘â╪º┘å╪¬ ╪┤╪║╪º┘ä╪⌐ ┘é╪¿┘ä ╪Ñ╪╢╪º┘ü╪⌐ ┘ü┘ä╪º╪¼ ╪º┘ä╪¬┘ü╪╣┘è┘ä ╪¬┘ü╪╢┘ä ┘à┘ü╪╣┘æ┘ä╪⌐ (╪º┘ä╪│┘ä┘ê┘â ╪º┘ä┘é╪»┘è┘à)
  if (storedSettings.activated === undefined) {
    result.activated = Boolean(company?.loyaltySystem);
  }
  // ≡ƒòÉ backfill: ┘ä┘ê ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è ┘à┘ü╪╣┘æ┘ä ┘ê┘à┘ä┘ê╪┤ ╪¬╪º╪▒┘è╪« ╪¬┘ü╪╣┘è┘ä ┘à╪¡┘ü┘ê╪╕ (╪¿┘è╪º┘å╪º╪¬ ┘é╪»┘è┘à╪⌐)╪î
  // ┘å╪│╪¬╪»┘ä ┘à┘å ╪ú┘ê┘ä ┘â┘ê╪¿┘ê┘å ╪╡╪»╪▒ ┘ê┘å╪¡┘ü╪╕┘ç ┘à╪▒╪⌐ ┘ê╪º╪¡╪»╪⌐ ╪╣╪┤╪º┘å ╪º┘ä╪¬╪º╪▒┘è╪« ┘è╪¿┘é┘ë ╪½╪º╪¿╪¬
  if (result.loyaltySystem === 'AUTO_DISCOUNT' && !result.loyaltyActivatedAt) {
    try {
      const firstVoucher = await prisma.customerLoyaltyVoucher.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      });
      if (firstVoucher?.createdAt) {
        result.loyaltyActivatedAt = firstVoucher.createdAt.toISOString();
        const persisted = { ...cfg, loyaltyActivatedAt: result.loyaltyActivatedAt };
        await prisma.company.update({
          where: { id: companyId },
          data: { loyaltySettings: JSON.stringify(persisted) }
        }).catch(() => {});
      }
    } catch (e) { /* ignore */ }
  }
  return result;
}

/**
 * ┘ç┘ä ┘å╪╕╪º┘à ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è ┘ç┘ê ╪º┘ä┘à┘ü╪╣┘ä ┘ä┘ä╪┤╪▒┘â╪⌐╪ƒ
 * ≡ƒåò ┘à╪│╪¬┘é┘ä ╪╣┘å ┘å╪╕╪º┘à ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ ΓÇö ╪¿┘è╪╣╪¬┘à╪» ╪╣┘ä┘ë autoDiscountEnabled
 */
async function isAutoDiscountActive(companyId) {
  const s = await getSettings(companyId);
  return s.autoDiscountEnabled === true && s.enabled !== false;
}

/**
 * ┘ç┘ä ┘å╪╕╪º┘à ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ (Tiers) ┘ç┘ê ╪º┘ä┘à┘ü╪╣┘ä ┘ä┘ä╪┤╪▒┘â╪⌐╪ƒ
 * ≡ƒåò ┘à╪│╪¬┘é┘ä ╪╣┘å ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è ΓÇö ╪¿┘è╪╣╪¬┘à╪» ╪╣┘ä┘ë tiersEnabled
 */
async function isTiersActive(companyId) {
  const s = await getSettings(companyId);
  return s.tiersEnabled === true;
}

/**
 * ┘ç┘ä ┘å╪╕╪º┘à ╪º┘ä┘ê┘ä╪º╪í (╪ú┘è╪º┘ï ┘â╪º┘å: ┘à╪│╪¬┘ê┘è╪º╪¬ ╪ú┘ê ╪«╪╡┘à ╪¬┘ä┘é╪º╪ª┘è) ┘à┘ü╪╣┘æ┘ä ┘ü╪╣┘ä╪º┘ï ┘ä┘ä╪┤╪▒┘â╪⌐╪ƒ
 */
async function isLoyaltySystemActivated(companyId) {
  const s = await getSettings(companyId);
  return s.activated === true;
}

/**
 * ╪¬╪¡╪»┘è╪½ ╪Ñ╪╣╪»╪º╪»╪º╪¬ ┘å╪╕╪º┘à ╪º┘ä┘ê┘ä╪º╪í ┘ä┘ä╪┤╪▒┘â╪⌐
 * data.system: 'TIERS' | 'AUTO_DISCOUNT' (╪¬┘ü╪╣┘è┘ä ╪ú╪¡╪»┘ç┘à╪º ┘è╪╣╪╖┘æ┘ä ╪º┘ä╪ó╪«╪▒)
 * data.activated: true = ╪¬┘à ╪º┘ä╪╢╪║╪╖ ╪╣┘ä┘ë "╪¬┘ü╪╣┘è┘ä ╪º┘ä┘å╪╕╪º┘à" ΓåÆ ╪º┘ä┘å╪╕╪º┘à ┘è╪┤╪¬╪║┘ä ┘ü╪╣┘ä┘è╪º┘ï
 */
async function updateSettings(companyId, data) {
  const prisma = getSharedPrismaClient();
  // ≡ƒ¢í∩╕Å ┘ä┘ê ╪º┘ä┘Ç companyId ┘å╪º┘é╪╡╪î ┘à┘å┘à┘å╪╣╪┤ P2025/validation ΓåÆ 500 ╪╣┘ä┘ë ╪º┘ä╪¡┘ü╪╕
  if (!companyId) {
    throw new Error('Company context is missing');
  }
  const system = data.system === 'AUTO_DISCOUNT' ? 'AUTO_DISCOUNT' : 'TIERS';
  const current = await getSettings(companyId);
  const next = { ...current, ...data };
  delete next.loyaltySystem;
  next.system = system;
  // ≡ƒƒó ╪º┘ä╪¬┘ü╪╣┘è┘ä ╪¿┘è╪¬╪║┘è╪▒ ┘ü┘é╪╖ ┘ä┘à╪º ╪º┘ä┘Ç activated ┘è╪¬┘ê╪╡┘Ä┘æ┘ä ╪╡╪▒╪º╪¡╪⌐ ┘ü┘è ╪º┘ä╪╖┘ä╪¿
  //    (┘à╪┤ ╪¿┘è╪¬┘ä╪║┘ë ╪¿┘à╪¼╪▒╪» ╪º╪«╪¬┘è╪º╪▒ ╪º┘ä┘å╪╕╪º┘à ╪º┘ä╪¬╪º┘å┘è ┘ü┘è ╪º┘ä┘ê╪º╪¼┘ç╪⌐)
  if (data.activated !== undefined) {
    next.activated = data.activated === true;
  }
  // ≡ƒòÉ ╪╣┘å╪» ╪¬┘ü╪╣┘è┘ä ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è ┘ä╪ú┘ê┘ä ┘à╪▒╪⌐ (╪ú┘ê ╪º┘ä╪▒╪¼┘ê╪╣ ╪Ñ┘ä┘è┘ç ╪¿╪╣╪» ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬) ┘å╪¡┘ü╪╕ ╪¬╪º╪▒┘è╪« ╪º┘ä╪¬┘ü╪╣┘è┘ä
  if (system === 'AUTO_DISCOUNT' && next.activated === true && current.loyaltySystem !== 'AUTO_DISCOUNT') {
    next.loyaltyActivatedAt = new Date().toISOString();
  }
  // ≡ƒåò ┘à╪▓╪º┘à┘å╪⌐ ╪º┘ä┘ü┘ä╪º╪¼╪º╪¬ ╪º┘ä┘à╪│╪¬┘é┘ä╪⌐ ┘à╪╣ ╪º┘ä┘å╪╕╪º┘à ╪º┘ä┘é╪»┘è┘à (╪╣╪┤╪º┘å ╪º┘ä┘ü╪▒┘ê┘å╪¬ ╪º┘ä┘é╪»┘è┘à ┘è┘ü╪╢┘ä ╪┤╪║╪º┘ä)
  next.tiersEnabled = (system === 'TIERS' && next.activated === true);
  next.autoDiscountEnabled = (system === 'AUTO_DISCOUNT' && next.activated === true);
  await prisma.company.update({
    where: { id: companyId },
    data: {
      loyaltySystem: system,
      loyaltySettings: JSON.stringify(next)
    }
  });
  // Γ£à ┘å╪▒╪¼┘æ╪╣ loyaltySystem ┘ü┘è ╪º┘ä┘Ç response ╪╣╪┤╪º┘å ╪º┘ä┘ê╪º╪¼┘ç╪⌐ ╪¬╪╣╪▒┘ü ╪º┘ä┘å╪╕╪º┘à ╪º┘ä┘ü╪╣┘ä┘è ╪º┘ä┘à┘ü╪╣┘æ┘ä
  return { ...next, loyaltySystem: system };
}

/**
 * ≡ƒåò ╪¬╪¡╪»┘è╪½ ┘à┘ê╪¡┘æ╪» ┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä┘ê┘ä╪º╪í ┘à╪╣ ┘ü┘ä╪º╪¼╪º╪¬ ╪¬┘ü╪╣┘è┘ä ┘à╪│╪¬┘é┘ä╪⌐:
 * - tiersEnabled / autoDiscountEnabled: ┘â┘ä ┘ê╪º╪¡╪» ┘ä┘ê╪¡╪»┘ç (╪º┘ä╪º╪¬┘å┘è┘å ┘à┘à┘â┘å ┘è╪┤╪¬╪║┘ä┘ê╪º ┘à╪╣ ╪¿╪╣╪╢)
 * - discountCombination: ┘ê╪╢╪╣ ╪»┘à╪¼ ╪º┘ä╪«╪╡┘à (BEST | ADDITIVE | COMPOUND)
 * - maxTotalDiscountPercent: ╪¡╪» ╪ú┘é╪╡┘ë ┘ä╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪«╪╡┘à (%) ΓÇö 0 = ╪¿╪»┘ê┘å ╪¡╪»
 * - ╪¡┘é┘ê┘ä ╪Ñ╪╣╪»╪º╪» ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è (discountPercent ...)
 * ┘à┘ä╪º╪¡╪╕╪⌐: ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â (cashbackEnabled) ╪¿┘è╪¬╪╣╪º┘à┘ä ┘à╪╣╪º┘ç ╪º┘ä┘Ç controller ╪╣╪┤╪º┘å ┘è╪╕╪¿╪╖ ╪╣┘ä┘ë status ╪¿╪▒┘å╪º┘à╪¼ CASHBACK.
 */
async function updateLoyaltyConfig(companyId, config = {}) {
  const prisma = getSharedPrismaClient();
  if (!companyId) throw new Error('Company context is missing');
  const current = await getSettings(companyId);
  const next = { ...current };

  if (config.tiersEnabled !== undefined) next.tiersEnabled = config.tiersEnabled === true;
  if (config.autoDiscountEnabled !== undefined) next.autoDiscountEnabled = config.autoDiscountEnabled === true;
  if (config.discountCombination !== undefined) {
    const allowedCombos = ['BEST', 'ADDITIVE', 'COMPOUND'];
    next.discountCombination = allowedCombos.includes(config.discountCombination)
      ? config.discountCombination
      : 'ADDITIVE';
  }
  if (config.maxTotalDiscountPercent !== undefined) {
    const pct = Number(config.maxTotalDiscountPercent);
    next.maxTotalDiscountPercent = Number.isFinite(pct) && pct > 0 ? pct : 0;
  }

  const autoFields = [
    'discountPercent', 'validityDays', 'convertExpiredToCashback',
    'pointsPerAmount', 'pointsRedemptionValue', 'redeemPointsEnabled', 'enabled'
  ];
  for (const k of autoFields) {
    if (config[k] !== undefined) next[k] = config[k];
  }

  // ≡ƒòÉ ╪¬╪º╪▒┘è╪« ╪¬┘ü╪╣┘è┘ä ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è ╪ú┘ê┘ä ┘à╪▒╪⌐ ┘è╪¬┘ü╪╣┘æ┘ä
  if (next.autoDiscountEnabled === true && current.autoDiscountEnabled !== true) {
    next.loyaltyActivatedAt = new Date().toISOString();
  }

  // ≡ƒöä ┘å╪¡╪º┘ü╪╕ ╪╣┘ä┘ë ╪º┘ä╪¡┘é┘ê┘ä legacy (loyaltySystem/activated) ┘à╪¬╪▓╪º┘à┘å╪⌐ ┘ä╪ú┘å ┘â┘ê╪» ┘é╪»┘è┘à ┘ä╪│┘ç ╪¿┘è┘é╪▒╪ú┘ç╪º
  if (next.tiersEnabled && !next.autoDiscountEnabled) {
    next.loyaltySystem = 'TIERS'; next.activated = true;
  } else if (next.autoDiscountEnabled && !next.tiersEnabled) {
    next.loyaltySystem = 'AUTO_DISCOUNT'; next.activated = true;
  } else if (next.tiersEnabled && next.autoDiscountEnabled) {
    next.activated = true; next.loyaltySystem = current.loyaltySystem || 'TIERS';
  } else {
    next.activated = false;
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { loyaltySystem: next.loyaltySystem, loyaltySettings: JSON.stringify(next) }
  });
  return next;
}

/**
 * ╪Ñ╪╡╪»╪º╪▒ ┘â┘ê╪¿┘ê┘å ╪«╪╡┘à ╪¬┘ä┘é╪º╪ª┘è ╪¿╪╣╪» ╪¬╪│┘ä┘è┘à ╪ú┘ê╪▒╪»╪▒ (┘à╪▒╪⌐ ┘ê╪º╪¡╪»╪⌐ ┘ä┘â┘ä ╪ú┘ê╪▒╪»╪▒)
 */
async function issueVoucherForDeliveredOrder({ orderId, companyId }) {
  const prisma = getSharedPrismaClient();
  try {
    const active = await isAutoDiscountActive(companyId);
    if (!active) return { issued: false, reason: 'system_off' };

    const order = await prisma.order.findFirst({ where: { id: orderId, companyId } });
    if (!order || !order.customerId) return { issued: false, reason: 'no_customer' };

    const existing = await prisma.customerLoyaltyVoucher.findFirst({
      where: { companyId, sourceOrderId: order.id, status: { in: ['ACTIVE', 'USED', 'CONVERTED'] } }
    });
    if (existing) return { issued: false, reason: 'already_issued' };

    const settings = await getSettings(companyId);
    // ≡ƒòÉ ╪º┘ä╪ú┘ê╪▒╪»╪▒╪º╪¬ ╪º┘ä┘ä┘è ╪º╪¬╪╖┘ä╪¿╪¬ ┘é╪¿┘ä ╪¬┘ü╪╣┘è┘ä ┘å╪╕╪º┘à ╪º┘ä┘ê┘ä╪º╪í ┘à╪┤ ╪¿╪¬╪º╪«╪» ┘â┘ê╪¿┘ê┘å ╪«╪╡┘à
    const activatedAt = await getLoyaltyActivatedAt(companyId, settings);
    if (activatedAt && new Date(order.createdAt) < activatedAt) {
      return { issued: false, reason: 'order_before_activation' };
    }
    const percent = Number(settings.discountPercent || 10);
    const paid = Number(order.total || 0);
    const amount = (paid * percent) / 100;
    const expiresAt = new Date(Date.now() + (Number(settings.validityDays || 3) * 24 * 60 * 60 * 1000));

    const voucher = await prisma.customerLoyaltyVoucher.create({
      data: {
        companyId,
        customerId: order.customerId,
        sourceOrderId: order.id,
        orderNumber: order.orderNumber,
        percent,
        amount,
        expiresAt
      }
    });

    // ≡ƒô¿ ╪Ñ╪┤╪╣╪º╪▒ ╪º┘ä╪╣┘à┘è┘ä ╪¿┘à┘å╪¡ ┘â┘ê╪¿┘ê┘å ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è (╪╣╪¿╪▒ ╪¼╪»┘ê┘ä ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í)
    try {
      const { sendCustomerNotification } = require('./hr/customerNotificationScheduleService');
      const customer = await prisma.customer.findUnique({
        where: { id: order.customerId },
        select: { id: true, phone: true, firstName: true, lastName: true }
      });
      if (customer) {
        await sendCustomerNotification({
          companyId,
          eventType: 'AUTO_DISCOUNT_COUPON_GRANTED',
          customer: {
            id: customer.id,
            phone: customer.phone,
            firstName: customer.firstName,
            lastName: customer.lastName,
            name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
          },
          customerId: customer.id,
          orderId: order.id,
          variables: {
            discountPercent: String(percent),
            voucherAmount: String(amount.toFixed(2)),
            validityDays: String(Number(settings.validityDays || 3)),
            expiryDate: expiresAt.toISOString().slice(0, 10),
            orderNumber: order.orderNumber || ''
          }
        });
      }
    } catch (notifError) {
      console.warn(`ΓÜá∩╕Å [AUTO-DISCOUNT-NOTIF] Failed to notify ${orderNumber}:`, notifError.message);
    }

    return { issued: true, voucher };
  } catch (error) {
    console.error('Γ¥î [AUTO-DISCOUNT] Failed to issue voucher:', error.message);
    return { issued: false, reason: 'error' };
  }
}

/**
 * ╪ú┘é╪▒╪¿ ┘â┘ê╪¿┘ê┘å ┘å╪┤╪╖ ┘ä╪╣┘à┘è┘ä (╪║┘è╪▒ ┘à╪│╪¬╪«╪»┘à ┘ê╪║┘è╪▒ ┘à┘å╪¬┘ç┘è)
 */
async function getActiveVoucher(customerId, companyId) {
  const prisma = getSharedPrismaClient();
  return prisma.customerLoyaltyVoucher.findFirst({
    where: { companyId, customerId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * ╪¡╪│╪º╪¿ ╪«╪╡┘à ╪º┘ä┘â┘ê╪¿┘ê┘å ┘ä┘ä╪╖┘ä╪¿ ╪º┘ä╪¡╪º┘ä┘è (╪Ñ┘å ┘ê┘Å╪¼╪» ┘â┘ê╪¿┘ê┘å ┘å╪┤╪╖)
 */
async function applyVoucherDiscount({ companyId, customerId, cartTotal }) {
  const prisma = getSharedPrismaClient();
  const voucher = await getActiveVoucher(customerId, companyId);
  if (!voucher) return { discount: 0, voucher: null };
  const discount = (Number(cartTotal) || 0) * (Number(voucher.percent) / 100);
  return { discount, voucher };
}

async function markVoucherUsed(voucherId) {
  if (!voucherId) return null;
  const prisma = getSharedPrismaClient();
  return prisma.customerLoyaltyVoucher.update({
    where: { id: voucherId },
    data: { status: 'USED', usedAt: new Date() }
  });
}

/**
 * ╪¬╪¡┘ê┘è┘ä ╪º┘ä┘â┘ê╪¿┘ê┘å╪º╪¬ ╪º┘ä┘à┘å╪¬┘ç┘è╪⌐ ╪Ñ┘ä┘ë ┘â╪º╪┤ ╪¿╪º┘â ┘ü┘è ╪º┘ä┘à╪¡┘ü╪╕╪⌐ (cron)
 */
async function convertExpiredVouchers() {
  const prisma = getSharedPrismaClient();
  const now = new Date();
  const expired = await prisma.customerLoyaltyVoucher.findMany({
    where: { status: 'ACTIVE', expiresAt: { lt: now } }
  });
  let converted = 0;
  for (const v of expired) {
    try {
      const settings = await getSettings(v.companyId);
      if (settings.convertExpiredToCashback !== false) {
        // ≡ƒ¢í∩╕Å Idempotency: ┘ä┘ê ╪º┘ä┘â┘ê╪¿┘ê┘å ╪»┘ç ╪º╪¬╪¡┘ê┘æ┘ä ┘ü╪╣┘ä╪º┘ï (┘ü┘è┘ç transaction id)╪î ┘å╪¬╪«╪╖╪º┘ç
        // ╪╣╪┤╪º┘å ┘à┘å╪╢╪º╪╣┘ü╪┤ ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â ┘ä┘ê ╪º┘ä┘Ç cron ╪º╪┤╪¬╪║┘ä ╪¬╪º┘å┘è ╪╣┘ä┘ë ┘å┘ü╪│ ╪º┘ä┘â┘ê╪¿┘ê┘å.
        const already = await prisma.customerLoyaltyVoucher.findUnique({
          where: { id: v.id },
          select: { status: true, convertedWalletTxId: true }
        });
        if (!already || already.status !== 'ACTIVE' || already.convertedWalletTxId) {
          continue;
        }

        const WalletService = require('./walletService');
        // ≡ƒ¢í∩╕Å ╪¿┘å╪╣┘à┘ä addCashback + ╪¬╪¡╪»┘è╪½ ╪¡╪º┘ä╪⌐ ╪º┘ä┘â┘ê╪¿┘ê┘å ┘ü┘è ┘å┘ü╪│ ╪º┘ä┘Ç transaction
        // ╪╣╪┤╪º┘å ┘ä┘ê ┘ü╪┤┘ä ╪ú┘è ┘ê╪º╪¡╪»╪î ┘à┘è╪¡╪╡┘ä╪┤ ┘â╪º╪┤ ╪¿╪º┘â ┘à┘å ╪║┘è╪▒ ╪¬╪¡┘ê┘è┘ä ╪¡╪º┘ä╪⌐ (┘ê┘ä╪º ╪º┘ä╪╣┘â╪│).
        const result = await prisma.$transaction(async (tx) => {
          const walletRes = await WalletService.addCashbackWithTx(
            tx, v.customerId, v.sourceOrderId, Number(v.amount), 1, Number(v.amount)
          );
          const updated = await tx.customerLoyaltyVoucher.update({
            where: { id: v.id },
            data: { status: 'CONVERTED', convertedAt: new Date(), convertedWalletTxId: walletRes?.transaction?.id }
          });
          return { updated, txId: walletRes?.transaction?.id };
        });
        converted++;

        // ≡ƒô¿ ╪Ñ╪┤╪╣╪º╪▒ ╪º┘ä╪╣┘à┘è┘ä ╪¿╪¬╪¡┘ê┘è┘ä ╪º┘ä┘â┘ê╪¿┘ê┘å ╪º┘ä┘à┘å╪¬┘ç┘è ╪Ñ┘ä┘ë ┘â╪º╪┤ ╪¿╪º┘â
        try {
          const { sendCustomerNotification } = require('./hr/customerNotificationScheduleService');
          const customer = await prisma.customer.findUnique({
            where: { id: v.customerId },
            select: { id: true, phone: true, firstName: true, lastName: true }
          });
          if (customer) {
            await sendCustomerNotification({
              companyId: v.companyId,
              eventType: 'AUTO_DISCOUNT_CASHBACK_CONVERTED',
              customer: {
                id: customer.id,
                phone: customer.phone,
                firstName: customer.firstName,
                lastName: customer.lastName,
                name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
              },
              customerId: customer.id,
              variables: {
                voucherAmount: String(Number(v.amount).toFixed(2)),
                cashAmount: String(Number(v.amount).toFixed(2)),
                orderNumber: v.orderNumber || ''
              }
            });
          }
        } catch (notifError) {
          console.warn(`ΓÜá∩╕Å [AUTO-DISCOUNT-NOTIF] Failed to notify convert for voucher ${v.id}:`, notifError.message);
        }
      } else {
        await prisma.customerLoyaltyVoucher.update({
          where: { id: v.id },
          data: { status: 'EXPIRED' }
        });
      }
    } catch (error) {
      console.error(`Γ¥î [AUTO-DISCOUNT] Convert failed for voucher ${v.id}:`, error.message);
    }
  }
  return { converted, expiredCount: expired.length };
}

/**
 * ╪Ñ┘ä╪║╪º╪í ┘â┘ê╪¿┘ê┘å╪º╪¬ ╪ú┘ê╪▒╪»╪▒ ╪╣┘å╪» ╪Ñ┘ä╪║╪º╪í/╪▒╪¼┘ê╪╣ ╪º┘ä╪ú┘ê╪▒╪»╪▒ ╪º┘ä┘à╪╡╪»╪▒╪î
 * ┘ê╪º╪│╪¬╪▒╪¼╪º╪╣ ╪º┘ä┘â┘ê╪¿┘ê┘å ╪º┘ä┘à╪│╪¬╪«╪»┘à ╪Ñ┘å ┘â╪º┘å ╪º┘ä╪╖┘ä╪¿ ╪º╪│╪¬╪«╪»┘à ┘â┘ê╪¿┘ê┘å.
 */
async function reverseVoucherForOrder({ orderId, companyId }) {
  const prisma = getSharedPrismaClient();
  try {
    // 1) ╪Ñ┘ä╪║╪º╪í ╪º┘ä┘â┘ê╪¿┘ê┘å╪º╪¬ ╪º┘ä┘å╪┤╪╖╪⌐/╪º┘ä┘à┘å╪¬┘ç┘è╪⌐ ╪º┘ä╪╡╪º╪»╪▒╪⌐ ┘à┘å ┘ç╪░╪º ╪º┘ä╪ú┘ê╪▒╪»╪▒
    await prisma.customerLoyaltyVoucher.updateMany({
      where: { companyId, sourceOrderId: orderId, status: { in: ['ACTIVE', 'EXPIRED'] } },
      data: { status: 'CANCELLED' }
    });
    // 2) ┘ä┘ê ┘â┘ê╪¿┘ê┘å ┘à┘å ┘ç╪░╪º ╪º┘ä╪ú┘ê╪▒╪»╪▒ ╪º╪¬╪¡┘ê┘æ┘ä ┘ä┘â╪º╪┤ ╪¿╪º┘â╪î ┘å╪«╪╡┘à┘ç ┘à┘å ╪º┘ä┘à╪¡┘ü╪╕╪⌐
    const converted = await prisma.customerLoyaltyVoucher.findMany({
      where: { companyId, sourceOrderId: orderId, status: 'CONVERTED' }
    });
    for (const v of converted) {
      try {
        const WalletService = require('./walletService');
        const wallet = await prisma.customerWallet.findFirst({ where: { customerId: v.customerId } });
        if (wallet && Number(wallet.balance) >= Number(v.amount)) {
          await WalletService.deductFromWallet(v.customerId, Number(v.amount), `╪¬╪▒╪¼┘è╪╣ ┘â┘ê╪¿┘ê┘å ┘à┘å╪¬┘ç┘è ┘ä┘ä╪ú┘ê╪▒╪»╪▒ ${v.orderNumber}`);
        }
        await prisma.customerLoyaltyVoucher.update({ where: { id: v.id }, data: { status: 'CANCELLED' } });
      } catch (error) {
        console.error(`Γ¥î [AUTO-DISCOUNT] Converted-voucher wallet reversal failed for ${v.id}:`, error.message);
      }
    }
    // 3) ┘ä┘ê ╪º┘ä╪ú┘ê╪▒╪»╪▒ ╪º╪│╪¬╪«╪»┘à ┘â┘ê╪¿┘ê┘å╪î ┘å╪▒╪¼┘æ╪╣ ╪º┘ä┘â┘ê╪¿┘ê┘å ┘å╪┤╪╖ (╪Ñ┘å ┘ä╪│┘ç ┘ü┘è ┘å╪º┘ü╪░╪⌐ ╪╡┘ä╪º╪¡┘è╪¬┘ç)
    const order = await prisma.order.findFirst({ where: { id: orderId, companyId }, select: { metadata: true } });
    if (order?.metadata) {
      try {
        const meta = JSON.parse(order.metadata);
        const usedVoucherId = meta?.autoDiscount?.usedVoucherId;
        if (usedVoucherId) {
          const v = await prisma.customerLoyaltyVoucher.findUnique({ where: { id: usedVoucherId } });
          if (v && v.status === 'USED' && new Date(v.expiresAt) > new Date()) {
            await prisma.customerLoyaltyVoucher.update({ where: { id: usedVoucherId }, data: { status: 'ACTIVE', usedAt: null } });
          }
        }
      } catch (e) { /* ignore */ }
    }
    return { reversed: true };
  } catch (error) {
    console.error('Γ¥î [AUTO-DISCOUNT] Reverse failed:', error.message);
    return { reversed: false };
  }
}

/**
 * ╪º╪│╪¬╪▒╪¼╪º╪╣ ╪º┘ä┘å┘é╪º╪╖ ╪º┘ä┘ä┘è ╪º╪│╪¬╪«╪»┘à┘ç╪º ╪º┘ä╪╣┘à┘è┘ä ┘â╪»┘ü╪╣ (┘å┘é╪╖╪⌐ = value ╪¼) ╪╣┘å╪» ╪Ñ┘ä╪║╪º╪í/╪▒╪¼┘ê╪╣ ╪º┘ä╪ú┘ê╪▒╪»╪▒
 */
async function restoreRedeemedPointsForOrder({ orderId, companyId }) {
  const prisma = getSharedPrismaClient();
  try {
    const order = await prisma.order.findFirst({ where: { id: orderId, companyId }, select: { metadata: true, customerId: true, orderNumber: true } });
    if (!order?.metadata || !order.customerId) return { restored: false, reason: 'no_metadata' };

    let meta;
    try { meta = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : order.metadata; } catch (e) { return { restored: false, reason: 'bad_metadata' }; }

    let pr = meta?.pointsRedemption;
    // Fallback: ╪¿╪╣╪╢ ╪º┘ä╪ú┘ê╪▒╪»╪▒╪º╪¬ ╪¿╪¬╪¡╪╖ ╪º┘ä┘Ç pointsRedemption ╪╣┘ä┘ë ╪º┘ä┘Ç GuestOrder ┘ü┘é╪╖
    if (!pr || !pr.pointsUsed) {
      const guestOrder = await prisma.guestOrder.findFirst({ where: { orderNumber: order.orderNumber || '', companyId }, select: { metadata: true } });
      if (guestOrder?.metadata) {
        try {
          const gm = typeof guestOrder.metadata === 'string' ? JSON.parse(guestOrder.metadata) : guestOrder.metadata;
          pr = gm?.pointsRedemption || pr;
        } catch (e) { /* ignore */ }
      }
    }
    if (!pr || !pr.pointsUsed || !pr.programId) return { restored: false, reason: 'no_points_redemption' };

    const pointsUsed = Number(pr.pointsUsed);
    const record = await prisma.customerLoyaltyRecord.findUnique({
      where: { customerId_programId: { customerId: order.customerId, programId: pr.programId } }
    });
    if (!record) return { restored: false, reason: 'no_record' };

    await prisma.customerLoyaltyRecord.update({
      where: { id: record.id },
      data: {
        currentPoints: (parseFloat(record.currentPoints) || 0) + pointsUsed,
        totalRedeemed: Math.max(0, (parseFloat(record.totalRedeemed) || 0) - pointsUsed)
      }
    });
    return { restored: true, points: pointsUsed };
  } catch (error) {
    console.error('Γ¥î [AUTO-DISCOUNT] Restore redeemed points failed:', error.message);
    return { restored: false, reason: 'error' };
  }
}

/**
 * ╪¬╪º╪▒┘è╪« ╪¬┘ü╪╣┘è┘ä ┘å╪╕╪º┘à ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è ┘ä┘ä╪┤╪▒┘â╪⌐.
 * ┘ä┘ê ┘à┘ä┘ê╪┤ ╪¬╪º╪▒┘è╪« ┘à╪¡┘ü┘ê╪╕ (╪¿┘è╪º┘å╪º╪¬ ┘é╪»┘è┘à╪⌐) ┘å╪│╪¬╪»┘ä ┘à┘å ╪ú┘ê┘ä ┘â┘ê╪¿┘ê┘å ╪╡╪»╪▒.
 */
async function getLoyaltyActivatedAt(companyId, settings) {
  const raw = settings?.loyaltyActivatedAt;
  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
  }
  const prisma = getSharedPrismaClient();
  const firstVoucher = await prisma.customerLoyaltyVoucher.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true }
  });
  return firstVoucher?.createdAt ? new Date(firstVoucher.createdAt) : null;
}

/**
 * ╪¡╪º┘ä╪⌐ ╪«╪╡┘à ╪╣┘à┘è┘ä ┘ê╪º╪¡╪»:
 * - 'AVAILABLE': ╪╣┘å╪»┘ç ┘â┘ê╪¿┘ê┘å ╪«╪╡┘à ┘ü╪╣┘æ╪º┘ä (╪«╪╡┘à ┘à╪¬╪º╪¡)
 * - 'PRE_ACTIVATION': ┘â┘ä ╪ú┘ê╪▒╪»╪▒╪º╪¬┘ç ╪º┘ä┘à╪│┘ä┘æ┘à╪⌐ ╪º╪¬╪╖┘ä╪¿╪¬ ┘é╪¿┘ä ╪¬┘ü╪╣┘è┘ä ┘å╪╕╪º┘à ╪º┘ä┘ê┘ä╪º╪í (┘à╪┤ ╪¿┘è╪╖╪¿┘é ╪╣┘ä┘è┘ç)
 * - null: ┘à╪┤ ┘ä┘ç ╪¡╪º┘ä╪⌐ (┘à┘ü┘è╪┤ ╪ú┘ê╪▒╪»╪▒╪º╪¬ / ╪º╪│╪¬╪«╪»┘à ╪º┘ä╪«╪╡┘à)
 */
async function getCustomerAutoDiscountStatus({ companyId, customerId, settings }) {
  const prisma = getSharedPrismaClient();
  const cfg = settings || await getSettings(companyId);
  const voucher = await prisma.customerLoyaltyVoucher.findFirst({
    where: { companyId, customerId, status: 'ACTIVE', expiresAt: { gt: new Date() } }
  });
  if (voucher) return 'AVAILABLE';

  const activatedAt = await getLoyaltyActivatedAt(companyId, cfg);
  if (!activatedAt) return null;

  const [pre, post] = await Promise.all([
    prisma.order.findFirst({
      where: { companyId, customerId, status: 'DELIVERED', createdAt: { lt: activatedAt } },
      select: { id: true }
    }),
    prisma.order.findFirst({
      where: { companyId, customerId, status: 'DELIVERED', createdAt: { gte: activatedAt } },
      select: { id: true }
    })
  ]);
  if (pre && !post) return 'PRE_ACTIVATION';
  return null;
}

/**
 * ╪¬╪¡┘ê┘è┘ä ┘â╪º╪ª┘å ╪º┘ä┘â┘ê╪¿┘ê┘å ┘ä┘ä╪┤┘â┘ä ╪º┘ä┘à┘ê╪¡┘æ╪» ╪º┘ä┘ä┘è ╪¿┘è╪▒╪¼╪╣ ┘ä┘ä┘ê╪º╪¼┘ç╪⌐ (┘à╪│╪¬╪«╪»┘à ┘ü┘è ┘â┘ä ╪º┘ä╪ú┘à╪º┘â┘å).
 */
function mapVoucherToPublic(voucher) {
  if (!voucher) return null;
  return {
    id: voucher.id,
    percent: Number(voucher.percent),
    amount: Number(voucher.amount),
    expiresAt: voucher.expiresAt,
    sourceOrderNumber: voucher.orderNumber || null
  };
}

/**
 * ┘à┘ä╪«╪╡ ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è ┘ä╪╣┘à┘è┘ä ┘ê╪º╪¡╪» (┘â┘ê╪¿┘ê┘å ┘ü╪╣┘æ╪º┘ä + ╪¡╪º┘ä╪⌐ ╪º┘ä╪«╪╡┘à) ΓÇö ┘à╪│╪¬╪«╪»┘à ┘ü┘è ╪¿┘ê╪º╪¿╪⌐ ╪º┘ä╪╣┘à┘è┘ä
 * ┘ü┘è ┘à┘â╪º┘å┘è┘å (╪º┘ä┘à╪│╪ñ┘ê┘ä + ╪º┘ä╪╣┘à┘è┘ä ┘å┘ü╪│┘ç) ╪╣╪┤╪º┘å ┘à┘ü┘è╪┤ ╪¬┘â╪▒╪º╪▒/╪º┘å╪¡╪▒╪º┘ü.
 */
async function getCustomerAutoDiscountSummary({ customerId, companyId, settings }) {
  const cfg = settings || await getSettings(companyId);
  const voucher = await getActiveVoucher(customerId, companyId);
  let status = null;
  if (voucher) {
    status = 'AVAILABLE';
  } else {
    status = await getCustomerAutoDiscountStatus({ companyId, customerId, settings: cfg });
  }
  return { activeVoucher: mapVoucherToPublic(voucher), status };
}

/**
 * ╪Ñ╪½╪▒╪º╪í ┘é╪º╪ª┘à╪⌐ ╪╣┘à┘ä╪º╪í ╪¿╪¡╪º┘ä╪⌐ ╪º┘ä╪«╪╡┘à (AVAILABLE / PRE_ACTIVATION) ┘ä╪╡┘ü╪¡╪⌐ ┘é╪º╪ª┘à╪⌐ ╪º┘ä╪╣┘à┘ä╪º╪í.
 * ╪¿┘è╪¿┘é┘ë null ┘ä┘ê ┘å╪╕╪º┘à ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è ┘à╪┤ ┘à┘ü╪╣┘æ┘ä ╪ú┘ê ┘à┘ü┘è╪┤ ╪¡╪º┘ä╪⌐.
 */async function enrichCustomersWithAutoDiscountStatus(companyId, customers) {
  if (!Array.isArray(customers) || customers.length === 0) return customers;
  const settings = await getSettings(companyId);
  if (settings.autoDiscountEnabled !== true || settings.enabled === false) {
    return customers;
  }
  const prisma = getSharedPrismaClient();
  const ids = customers.map(c => c.id);
  const now = new Date();

  const activeVouchers = await prisma.customerLoyaltyVoucher.findMany({
    where: { companyId, customerId: { in: ids }, status: 'ACTIVE', expiresAt: { gt: now } },
    select: { customerId: true }
  });
  const availableIds = new Set(activeVouchers.map(v => v.customerId));

  const activatedAt = await getLoyaltyActivatedAt(companyId, settings);
  let preActivationIds = new Set();
  if (activatedAt) {
    const preOrders = await prisma.order.findMany({
      where: { companyId, customerId: { in: ids }, status: 'DELIVERED', createdAt: { lt: activatedAt } },
      select: { customerId: true },
      distinct: ['customerId']
    });
    if (preOrders.length > 0) {
      const preIds = new Set(preOrders.map(o => o.customerId));
      const postOrders = await prisma.order.findMany({
        where: { companyId, customerId: { in: ids }, status: 'DELIVERED', createdAt: { gte: activatedAt } },
        select: { customerId: true },
        distinct: ['customerId']
      });
      const postIds = new Set(postOrders.map(o => o.customerId));
      preActivationIds = new Set([...preIds].filter(id => !postIds.has(id)));
    }
  }

  return customers.map(c => ({
    ...c,
    autoDiscountStatus: availableIds.has(c.id) ? 'AVAILABLE' : preActivationIds.has(c.id) ? 'PRE_ACTIVATION' : null
  }));
}

/**
 * Backfill: ╪Ñ╪╡╪»╪º╪▒ ┘â┘ê╪¿┘ê┘å╪º╪¬ ┘ä╪ú┘è ╪ú┘ê╪▒╪»╪▒ ┘à╪│┘ä┘æ┘à ┘é╪»┘è┘à ┘ä╪│┘ç ┘à┘ü┘è╪┤ ┘ä┘è┘ç ┘â┘ê╪¿┘ê┘å
 * (╪¿╪│╪¿╪¿ ┘à╪┤╪º┘â┘ä ╪│╪º╪¿┘é╪⌐/╪«╪╖╪ú ╪¼┘ä╪¿ ╪¿┘è╪º┘å╪º╪¬/┘å╪╕╪º┘à ┘à┘ê┘é┘ê┘ü ┘ä┘ü╪¬╪▒╪⌐).
 * ╪¿┘è╪╢┘à┘å ╪Ñ┘å ╪º┘ä┘å╪╕╪º┘à "┘è╪¡╪│╪¿ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ┘ê┘è╪¬┘ü╪╣┘ä" ┘ä┘ä╪ú┘ê╪▒╪»╪▒╪º╪¬ ╪º┘ä┘à╪│┘ä┘æ┘à╪⌐ ╪º┘ä┘å╪º┘é╪╡╪⌐.
 * ┘à╪▒╪┤╪¡: ╪º┘ä╪ú┘ê╪▒╪»╪▒ ╪º┘ä┘à╪│┘ä┘æ┘à ╪¿╪╣╪» ╪¬╪º╪▒┘è╪« ╪º┘ä╪¬┘ü╪╣┘è┘ä ┘ê┘à┘ü┘è╪┤ ┘ä┘ç ┘â┘ê╪¿┘ê┘å ╪ú╪╡┘ä╪º┘ï.
 */
async function backfillMissingVouchers(companyId, { limit = 50 } = {}) {
  const prisma = getSharedPrismaClient();
  if (!companyId) return { processed: 0, issued: 0, skipped: 0 };

  const active = await isAutoDiscountActive(companyId);
  if (!active) return { processed: 0, issued: 0, skipped: 0, reason: 'system_off' };

  const settings = await getSettings(companyId);
  const activatedAt = await getLoyaltyActivatedAt(companyId, settings);

  // ╪º┘ä╪ú┘ê╪▒╪»╪▒╪º╪¬ ╪º┘ä┘à╪│┘ä┘æ┘à╪⌐
  const delivered = await prisma.order.findMany({
    where: {
      companyId,
      status: 'DELIVERED',
      customerId: { not: null },
      ...(activatedAt ? { createdAt: { gte: activatedAt } } : {})
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true, orderNumber: true, customerId: true, total: true, createdAt: true }
  });

  if (delivered.length === 0) return { processed: 0, issued: 0, skipped: 0 };

  // ╪º┘ä╪ú┘ê╪▒╪»╪▒╪º╪¬ ╪º┘ä┘ä┘è ┘ä┘è┘ç╪º ┘â┘ê╪¿┘ê┘å ╪ú╪╡┘ä╪º┘ï
  const withVoucher = await prisma.customerLoyaltyVoucher.findMany({
    where: { companyId, sourceOrderId: { in: delivered.map(o => o.id) } },
    select: { sourceOrderId: true }
  });
  const withVoucherIds = new Set(withVoucher.map(v => v.sourceOrderId));

  let issued = 0;
  let skipped = 0;
  for (const order of delivered) {
    if (withVoucherIds.has(order.id)) { skipped++; continue; }

    const percent = Number(settings.discountPercent || 10);
    const amount = (Number(order.total || 0) * percent) / 100;
    const expiresAt = new Date(Date.now() + (Number(settings.validityDays || 3) * 24 * 60 * 60 * 1000));

    try {
      await prisma.customerLoyaltyVoucher.create({
        data: {
          companyId,
          customerId: order.customerId,
          sourceOrderId: order.id,
          orderNumber: order.orderNumber,
          percent,
          amount,
          expiresAt
        }
      });
      issued++;
    } catch (error) {
      console.error(`Γ¥î [AUTO-DISCOUNT-BACKFILL] Failed for order ${order.orderNumber}:`, error.message);
      skipped++;
    }
  }

  if (issued > 0) {
    console.log(`Γ£à [AUTO-DISCOUNT-BACKFILL] Issued ${issued} vouchers for company ${companyId}`);
  }
  return { processed: delivered.length, issued, skipped };
}

/**
 * ΓÅ░ ╪Ñ╪▒╪│╪º┘ä ╪¬┘å╪¿┘è┘ç ┘ä┘ä╪╣┘à┘ä╪º╪í ┘é╪¿┘ä ╪º┘å╪¬┘ç╪º╪í ╪╡┘ä╪º╪¡┘è╪⌐ ┘â┘ê╪¿┘ê┘å ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è.
 * ┘è┘Å╪│╪¬╪»╪╣┘ë ┘à┘å ┘â╪▒┘ê┘å ┘è┘ê┘à┘è ΓÇö ┘è╪▒╪│┘ä ┘à╪▒╪⌐ ┘ê╪º╪¡╪»╪⌐ ┘ä┘â┘ä ┘â┘ê╪¿┘ê┘å (lastExpiryWarnedAt ┘ü╪º╪▒╪║).
 * @param {Object} [options] ΓÇö { hoursBefore } ╪╣╪»╪» ╪º┘ä╪│╪º╪╣╪º╪¬ ┘é╪¿┘ä ╪º┘ä╪º┘å╪¬┘ç╪º╪í (╪º┘ü╪¬╪▒╪º╪╢┘è 24)
 */
async function sendExpiryWarnings({ hoursBefore = 24 } = {}) {
  const prisma = getSharedPrismaClient();
  const threshold = new Date(Date.now() + hoursBefore * 60 * 60 * 1000);
  const vouchers = await prisma.customerLoyaltyVoucher.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lte: threshold, gt: new Date() },
      lastExpiryWarnedAt: null
    }
  });

  let warned = 0;
  for (const v of vouchers) {
    try {
      const { sendCustomerNotification } = require('./hr/customerNotificationScheduleService');
      const customer = await prisma.customer.findUnique({
        where: { id: v.customerId },
        select: { id: true, phone: true, firstName: true, lastName: true }
      });
      if (!customer) continue;

      await sendCustomerNotification({
        companyId: v.companyId,
        eventType: 'AUTO_DISCOUNT_COUPON_EXPIRING',
        customer: {
          id: customer.id,
          phone: customer.phone,
          firstName: customer.firstName,
          lastName: customer.lastName,
          name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
        },
        customerId: customer.id,
        variables: {
          discountPercent: String(Number(v.percent)),
          voucherAmount: String(Number(v.amount).toFixed(2)),
          expiryDate: v.expiresAt.toISOString().slice(0, 10),
          orderNumber: v.orderNumber || ''
        }
      });

      await prisma.customerLoyaltyVoucher.update({
        where: { id: v.id },
        data: { lastExpiryWarnedAt: new Date() }
      });
      warned++;
    } catch (error) {
      console.warn(`ΓÜá∩╕Å [AUTO-DISCOUNT-NOTIF] Expiry warn failed for voucher ${v.id}:`, error.message);
    }
  }
  return { warned };
}

module.exports = {
  DEFAULT_SETTINGS,
  getSettings,
  isAutoDiscountActive,
  isTiersActive,
  isLoyaltySystemActivated,
  updateSettings,
  updateLoyaltyConfig,
  issueVoucherForDeliveredOrder,
  getActiveVoucher,
  applyVoucherDiscount,
  markVoucherUsed,
  convertExpiredVouchers,
  reverseVoucherForOrder,
  restoreRedeemedPointsForOrder,
  getLoyaltyActivatedAt,
  getCustomerAutoDiscountStatus,
  getCustomerAutoDiscountSummary,
  mapVoucherToPublic,
  enrichCustomersWithAutoDiscountStatus,
  backfillMissingVouchers,
  sendExpiryWarnings
};
