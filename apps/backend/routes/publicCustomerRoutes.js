const express = require('express');
const router = express.Router();
const { getCompanyFromSubdomain } = require('../middleware/companyMiddleware');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const WalletService = require('../services/walletService');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const verifyToken = require('../utils/verifyToken');
const { getJwtSecret } = require('../utils/jwtSecret');
const { t } = require('../services/i18n');

router.get('/ping', (req, res) => res.json({ status: 'ok', time: new Date().toISOString(), version: 'v3' }));
const ensureWallet = async (customerId, companyId) => {
  try {
    if (!customerId || !companyId) return;
    await WalletService.createWallet(customerId, companyId);
  } catch (e) {
    console.error('⚠️ [PUBLIC-CUSTOMER] Wallet creation skipped:', e?.message || e);
  }
};

const resolveCompanyId = async (req) => {
  if (req.company && req.company.id) {
    return req.company.id;
  }

  let companyId = req.body?.companyId || req.query?.companyId || req.headers['x-company-id'] || null;
  if (!companyId) {
    return null;
  }

  const prisma = getSharedPrismaClient();
  const company = await prisma.company.findFirst({
    where: {
      OR: [{ id: companyId }, { slug: companyId }],
      isActive: true
    },
    select: { id: true }
  });

  return company?.id || null;
};

const safeParseJson = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return {};
  }
};



const getOtpCode = () => String(Math.floor(1000 + Math.random() * 9000));

const hashOtp = (code, salt) => {
  return crypto.createHash('sha256').update(`${code}:${salt}`).digest('hex');
};

const cleanLeadText = (value, maxLength = 500) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
};

const buildLeadNote = ({
  service,
  companyName,
  source,
  referrer,
  landingPath,
}) => {
  const parts = [
    'Lead captured from public landing',
    source ? `source: ${source}` : null,
    service ? `service: ${service}` : null,
    companyName ? `company: ${companyName}` : null,
    landingPath ? `page: ${landingPath}` : null,
    referrer ? `referrer: ${referrer}` : null,
  ].filter(Boolean);

  return parts.join(' | ');
};

const mergeLeadMetadata = (existingMetadata, nextFields) => {
  const current = safeParseJson(existingMetadata);
  const leadCapture = {
    ...(typeof current.leadCapture === 'object' && current.leadCapture ? current.leadCapture : {}),
    ...nextFields,
  };

  return {
    ...current,
    leadCapture,
  };
};

const mergeLeadTags = (rawTags, incomingTags = []) => {
  const parsed = safeParseJson(rawTags);
  const baseTags = Array.isArray(parsed) ? parsed : [];
  return [...new Set([...baseTags, ...incomingTags.filter(Boolean)])];
};

const maybeTrackLandingConversion = async (prisma, companyId, pageSlug) => {
  const cleanSlug = cleanLeadText(pageSlug, 120);
  if (!cleanSlug) return;

  const page = await prisma.landingPage.findFirst({
    where: {
      companyId,
      slug: cleanSlug,
      isPublished: true,
    },
    select: { id: true },
  });

  if (!page?.id) return;

  await prisma.landingPage.update({
    where: { id: page.id },
    data: { conversions: { increment: 1 } },
  });
};



router.post('/register', getCompanyFromSubdomain, async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة. يرجى الوصول من subdomain الشركة أو تحديد companyId'
      });
    }

    const phone = String(req.body.phone || '').trim();
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف مطلوب'
      });
    }

    const prisma = getSharedPrismaClient();

    const existingCustomer = await prisma.customer.findFirst({
      where: {
        companyId,
        phone
      },
      select: { id: true, firstName: true, lastName: true, phone: true, companyId: true }
    });

    if (existingCustomer) {
      await ensureWallet(existingCustomer.id, companyId);
      return res.json({
        success: true,
        message: 'تم تسجيل العميل بنجاح',
        data: { customer: existingCustomer }
      });
    }

    const last4 = phone.replace(/\D/g, '').slice(-4);

    const customer = await prisma.customer.create({
      data: {
        companyId,
        phone,
        firstName: 'عميل',
        lastName: last4 ? `#${last4}` : 'جديد'
      },
      select: { id: true, firstName: true, lastName: true, phone: true, companyId: true }
    });

    await ensureWallet(customer.id, companyId);

    return res.status(201).json({
      success: true,
      message: 'تم تسجيل العميل بنجاح',
      data: { customer }
    });
  } catch (error) {
    console.error('❌ [PUBLIC-CUSTOMER] Error registering customer:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء تسجيل العميل'
    });
  }
});

router.post('/lead-capture', getCompanyFromSubdomain, async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'تعذر تحديد الشركة الحالية'
      });
    }

    if (cleanLeadText(req.body?.nickname || req.body?.companyWebsite, 200)) {
      return res.status(400).json({
        success: false,
        message: 'تعذر إرسال البيانات'
      });
    }

    const firstName = cleanLeadText(req.body?.firstName, 120);
    const lastName = cleanLeadText(req.body?.lastName, 120);
    const email = cleanLeadText(req.body?.email, 190).toLowerCase() || null;
    const phone = cleanLeadText(req.body?.phone, 40) || null;
    const notes = cleanLeadText(req.body?.notes, 1200) || null;
    const companyName = cleanLeadText(req.body?.companyName, 190) || null;
    const service = cleanLeadText(req.body?.service, 120) || null;
    const source = cleanLeadText(req.body?.source, 120) || 'mg-landing';
    const landingPath = cleanLeadText(req.body?.landingPath, 240) || null;
    const pageSlug = cleanLeadText(req.body?.pageSlug, 120) || null;
    const budgetRange = cleanLeadText(req.body?.budgetRange, 120) || null;
    const referrer = cleanLeadText(req.body?.referrer, 500) || null;
    const utm = typeof req.body?.utm === 'object' && req.body.utm ? req.body.utm : {};

    if (!firstName) {
      return res.status(400).json({
        success: false,
        message: 'الاسم الأول مطلوب'
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف أو البريد الإلكتروني مطلوب'
      });
    }

    const prisma = getSharedPrismaClient();
    const duplicateFilters = [];
    if (email) duplicateFilters.push({ email });
    if (phone) duplicateFilters.push({ phone });

    const leadMetadata = {
      companyName,
      service,
      budgetRange,
      source,
      landingPath,
      pageSlug,
      referrer,
      utm,
      submittedAt: new Date().toISOString(),
    };

    const leadNote = buildLeadNote({
      service,
      companyName,
      source,
      referrer,
      landingPath,
    });

    let customer = null;
    let createdNewCustomer = false;
    if (duplicateFilters.length > 0) {
      customer = await prisma.customer.findFirst({
        where: {
          companyId,
          OR: duplicateFilters,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          notes: true,
          metadata: true,
          tags: true,
        }
      });
    }

    if (customer?.id) {
      const mergedNotes = [customer.notes, leadNote, notes].filter(Boolean).join('\n\n');
      const mergedMetadata = mergeLeadMetadata(customer.metadata, leadMetadata);
      const mergedTags = mergeLeadTags(customer.tags, ['landing', source, pageSlug].filter(Boolean));

      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          firstName: customer.firstName || firstName,
          lastName: customer.lastName || lastName || '',
          email: customer.email || email,
          phone: customer.phone || phone,
          status: 'LEAD',
          notes: mergedNotes || null,
          tags: JSON.stringify(mergedTags),
          metadata: JSON.stringify(mergedMetadata),
          updatedAt: new Date(),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          companyId: true,
        }
      });
    } else {
      createdNewCustomer = true;
      const createdMetadata = mergeLeadMetadata(null, leadMetadata);
      const createdTags = mergeLeadTags(null, ['landing', source, pageSlug].filter(Boolean));

      customer = await prisma.customer.create({
        data: {
          companyId,
          firstName,
          lastName: lastName || '',
          email,
          phone,
          status: 'LEAD',
          notes: [leadNote, notes].filter(Boolean).join('\n\n') || null,
          tags: JSON.stringify(createdTags),
          metadata: JSON.stringify(createdMetadata),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          companyId: true,
        }
      });
    }

    await ensureWallet(customer.id, companyId);
    await maybeTrackLandingConversion(prisma, companyId, pageSlug);

    return res.status(createdNewCustomer ? 201 : 200).json({
      success: true,
      message: 'تم استلام بياناتك بنجاح وسيتم التواصل معك قريباً',
      data: {
        customer,
      }
    });
  } catch (error) {
    console.error('❌ [PUBLIC-CUSTOMER] Error capturing lead:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'هذا العميل مسجل بالفعل بنفس البريد أو رقم الهاتف'
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء حفظ بيانات العميل'
    });
  }
});

router.post('/request-otp', getCompanyFromSubdomain, async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة. يرجى الوصول من subdomain الشركة أو تحديد companyId'
      });
    }

    const phone = String(req.body.phone || '').trim();
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف مطلوب'
      });
    }

    const prisma = getSharedPrismaClient();

    const existingCustomer = await prisma.customer.findFirst({
      where: { companyId, phone },
      select: { id: true, metadata: true }
    });

    const code = getOtpCode();
    const salt = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + 5 * 60 * 1000;

    const metadata = safeParseJson(existingCustomer?.metadata);
    const nextMetadata = {
      ...metadata,
      otp: {
        hash: hashOtp(code, salt),
        salt,
        expiresAt,
        used: false
      }
    };

    let customerId = existingCustomer?.id;
    if (!customerId) {
      const last4 = phone.replace(/\D/g, '').slice(-4);
      const customer = await prisma.customer.create({
        data: {
          companyId,
          phone,
          firstName: 'عميل',
          lastName: last4 ? `#${last4}` : 'جديد',
          metadata: JSON.stringify(nextMetadata)
        },
        select: { id: true }
      });
      customerId = customer.id;
      await ensureWallet(customerId, companyId);
    } else {
      await prisma.customer.update({
        where: { id: customerId },
        data: { metadata: JSON.stringify(nextMetadata) }
      });
      await ensureWallet(customerId, companyId);
    }

    return res.json({
      success: true,
      message: t('otp.sent'),
      ...(process.env.NODE_ENV !== 'production' ? { debugCode: code } : {})
    });
  } catch (error) {
    console.error('❌ [PUBLIC-CUSTOMER] Error requesting OTP:', error);
    return res.status(400).json({
      success: false,
      message: error.message || t('otp.error')
    });
  }
});

router.post('/verify-otp', getCompanyFromSubdomain, async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة. يرجى الوصول من subdomain الشركة أو تحديد companyId'
      });
    }

    const phone = String(req.body.phone || '').trim();
    const code = String(req.body.code || '').trim();

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف مطلوب'
      });
    }

    if (!code || code.length !== 4) {
      return res.status(400).json({
        success: false,
        message: 'كود التحقق غير صحيح'
      });
    }

    const prisma = getSharedPrismaClient();
    const customer = await prisma.customer.findFirst({
      where: { companyId, phone },
      select: { id: true, firstName: true, lastName: true, metadata: true, companyId: true }
    });

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    const metadata = safeParseJson(customer.metadata);
    const otp = metadata?.otp;
    if (!otp || !otp.hash || !otp.salt || !otp.expiresAt || otp.used) {
      return res.status(400).json({
        success: false,
        message: 'لا يوجد كود صالح. اطلب كود جديد'
      });
    }

    if (Date.now() > Number(otp.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'انتهت صلاحية الكود. اطلب كود جديد'
      });
    }

    const expectedHash = hashOtp(code, otp.salt);
    if (expectedHash !== otp.hash) {
      return res.status(400).json({
        success: false,
        message: 'كود التحقق غير صحيح'
      });
    }

    const nextMetadata = {
      ...metadata,
      otp: {
        ...otp,
        used: true,
        verifiedAt: Date.now()
      }
    };

    await prisma.customer.update({
      where: { id: customer.id },
      data: { metadata: JSON.stringify(nextMetadata) }
    });

    const token = jwt.sign(
      {
        userId: customer.id,
        customerId: customer.id,
        role: 'CUSTOMER',
        companyId: customer.companyId,
        phone
      },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone,
          companyId: customer.companyId
        },
        token,
        expiresIn: '24h'
      }
    });
  } catch (error) {
    console.error('❌ [PUBLIC-CUSTOMER] Error verifying OTP:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء التحقق من الكود'
    });
  }
});

router.get('/me', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'CUSTOMER') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح'
      });
    }

    const customerId = req.user.customerId || req.user.userId || req.user.id;
    const companyId = req.user.companyId;

    if (!customerId || !companyId) {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صحيح'
      });
    }

    const prisma = getSharedPrismaClient();
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        companyId: true
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    return res.json({
      success: true,
      data: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        role: 'CUSTOMER',
        companyId: customer.companyId,
        company: null
      }
    });
  } catch (error) {
    console.error('❌ [PUBLIC-CUSTOMER] Error in /me:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحميل بيانات العميل'
    });
  }
});

module.exports = router;
