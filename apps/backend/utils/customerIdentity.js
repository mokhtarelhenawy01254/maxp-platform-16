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

module.exports = {
  phoneFields,
  buildPhoneWhere,
  findCustomerByPhone,
};
