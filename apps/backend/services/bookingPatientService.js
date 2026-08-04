const { getSharedPrismaClient } = require('./sharedDatabase');

const normalizePhone = (phone) => {
  if (!phone) return null;
  return String(phone).trim().replace(/[\s()-]/g, '');
};

const normalizeGender = (g) => {
  if (!g) return null;
  const v = String(g).toUpperCase();
  return v === 'MALE' || v === 'FEMALE' ? v : null;
};

const splitName = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'مريض',
    lastName: parts.slice(1).join(' ') || null,
  };
};

/**
 * Find existing patient by phone (company-scoped) or create a new one.
 * Optionally auto-links to an existing CRM Customer with the same phone.
 * @param {object} opts
 * @param {string} opts.companyId
 * @param {string} [opts.customerName]
 * @param {string} [opts.customerPhone]
 * @param {string} [opts.customerGender]
 * @param {string} [opts.customerEmail]
 * @param {string} [opts.customerId] explicit customer link (from authenticated flows)
 * @returns {Promise<{ id: string; created: boolean }>}
 */
const findOrCreatePatient = async ({ companyId, customerName, customerPhone, customerGender, customerEmail, customerId, nationalId, nationalIdImage, address }) => {
  const prisma = getSharedPrismaClient();
  const phone = normalizePhone(customerPhone);

  if (phone) {
    const existing = await prisma.patient.findFirst({
      where: { companyId, phone, isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) {
      // Update identity fields if provided (fill gaps on an existing patient)
      const patch = {};
      if (nationalId && nationalId !== '') patch.nationalId = nationalId;
      if (nationalIdImage && nationalIdImage !== '') patch.nationalIdImage = nationalIdImage;
      if (address && address !== '') patch.address = address;
      if (Object.keys(patch).length > 0) {
        await prisma.patient.update({ where: { id: existing.id }, data: patch });
      }
      return { id: existing.id, created: false };
    }
  }

  const { firstName, lastName } = splitName(customerName);

  // Resolve CRM customer link: explicit id, or by phone
  let resolvedCustomerId = customerId || null;
  if (!resolvedCustomerId && phone) {
    const customer = await prisma.customer.findFirst({
      where: { companyId, OR: [{ phone }, { whatsappId: phone }] },
      select: { id: true },
    });
    if (customer) resolvedCustomerId = customer.id;
  }

  const patient = await prisma.patient.create({
    data: {
      companyId,
      customerId: resolvedCustomerId,
      firstName,
      lastName,
      phone: phone || null,
      email: customerEmail || null,
      gender: normalizeGender(customerGender),
      nationalId: nationalId || null,
      nationalIdImage: nationalIdImage || null,
      address: address || null,
    },
  });

  return { id: patient.id, created: true };
};

module.exports = { findOrCreatePatient, normalizePhone, normalizeGender, splitName };
