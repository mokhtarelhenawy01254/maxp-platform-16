const { toCanonicalE164, getPhoneVariants } = require('./phoneNormalization');

function phoneFields(phone) {
  const canonical = toCanonicalE164(phone);
  return {
    phone: phone || null,
    phoneNormalized: canonical || null,
  };
}

function buildPhoneWhere(phone, companyId) {
  const canonical = toCanonicalE164(phone);
  if (!canonical) return null;
  return {
    companyId,
    OR: [{ phoneNormalized: canonical }, { phone: { in: getPhoneVariants(phone) } }],
  };
}

async function findCustomerByPhone(prisma, phone, companyId) {
  const where = buildPhoneWhere(phone, companyId);
  if (!where) return null;
  return prisma.customer.findFirst({ where });
}

// ── Per-key async mutex ──────────────────────────────────────────────
// يمنع سباق (race) check-then-create لنفس الرقم في نفس الشركة.
// آمن لأن الـ backend بيشتغل كعملية واحدة (PM2 single instance).
const keyLocks = new Map();

function acquireKeyLock(key) {
  const prev = keyLocks.get(key) || Promise.resolve();
  let release;
  const current = new Promise((r) => (release = r));
  keyLocks.set(key, current);
  return { gate: prev, release, current };
}

async function withKeyLock(key, fn) {
  const { gate, release, current } = acquireKeyLock(key);
  await gate;
  try {
    return await fn();
  } finally {
    release();
    // لو مفيش مُتصل تاني مسجّل (حطّ current جديد) نحذف المفتاح من الخريطة
    if (keyLocks.get(key) === current) {
      keyLocks.delete(key);
    }
  }
}

/**
 * ينشئ عميلاً برقم موبايل بشرط ألا يتكرر الرقم في نفس الشركة.
 * - بيبحث الأول بالرقم (بكل صيغه: phoneNormalized + variants) → لو موجود بيرجّع الموجود.
 * - لو مش موجود بيعمل create ومعاه phoneNormalized canonical.
 * - لو حصل سباق وضرب الـ unique constraint الجديد (P2002) بيرجّع اللي اتّعمل الأول.
 * - لو phone فاضي/null → create عادي (مفيش dedupe ممكن).
 * - `data` لا تشمل companyId/phoneNormalized (بيتضافوا تلقائيًا).
 */
async function createCustomerByPhone(prisma, { companyId, phone, data = {} }) {
  const canonical = toCanonicalE164(phone);
  const where = buildPhoneWhere(phone, companyId);

  if (!where) {
    // مفيش رقم صالح → create عادي (مع P2002 fallback على أي unique تاني زي facebookId)
    try {
      return await prisma.customer.create({ data: { ...data, companyId } });
    } catch (err) {
      if (err?.code === 'P2002') {
        const fallbackWhere = { companyId };
        if (data.facebookId) fallbackWhere.facebookId = data.facebookId;
        if (data.whatsappId) fallbackWhere.whatsappId = data.whatsappId;
        const existing = await prisma.customer.findFirst({ where: fallbackWhere });
        if (existing) return existing;
      }
      throw err;
    }
  }

  const lockKey = `customer:${companyId}:${canonical}`;
  return withKeyLock(lockKey, async () => {
    let customer = await prisma.customer.findFirst({ where });
    if (customer) return customer;

    const createData = {
      ...data,
      companyId,
      phone: phone || null,
      phoneNormalized: data.phoneNormalized || canonical,
    };
    try {
      return await prisma.customer.create({ data: createData });
    } catch (err) {
      if (err?.code === 'P2002') {
        const found = await prisma.customer.findFirst({ where });
        if (found) return found;
      }
      throw err;
    }
  });
}

/**
 * لفّاف آمن: بيحاول create، ولو ضرب الـ unique constraint (P2002) بسبب سباق
 * (عميل بنفس الرقم اتُعمِل في نفس اللحظة من فلو تاني) بيرجّع اللي اتعمل الأول
 * بدل ما يرمي 500 ويكسر الفلو (طلب/فورم/تسجيل).
 */
async function safeCreateCustomer(prisma, createArgs, fallbackWhere) {
  try {
    return await prisma.customer.create(createArgs);
  } catch (err) {
    if (err?.code === 'P2002' && fallbackWhere) {
      const existing = await prisma.customer.findFirst({ where: fallbackWhere });
      if (existing) return existing;
    }
    throw err;
  }
}

module.exports = {
  phoneFields,
  buildPhoneWhere,
  findCustomerByPhone,
  createCustomerByPhone,
  safeCreateCustomer,
  withKeyLock,
};
