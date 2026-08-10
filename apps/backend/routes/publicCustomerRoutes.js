const express = require('express');
const router = express.Router();
const { getCompanyFromSubdomain } = require('../middleware/companyMiddleware');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const WalletService = require('../services/walletService');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const WhatsAppManager = require('../services/whatsapp/WhatsAppManager');
const WhatsAppMessageHandler = require('../services/whatsapp/WhatsAppMessageHandler');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');
const verifyToken = require('../utils/verifyToken');
const customerLoyaltyService = require('../services/hr/customerLoyaltyService');
const autoDiscountService = require('../services/autoDiscountService');
const { getJwtSecret } = require('../utils/jwtSecret');
const { t } = require('../services/i18n');
const { toCanonicalE164, getPhoneVariants } = require('../utils/phoneNormalization');
const { findCustomerByPhone } = require('../utils/customerIdentity');

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

const formatPhoneForWhatsApp = (phone) => {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, '');
  if (!cleaned) return null;
  if (cleaned.startsWith('0')) {
    cleaned = `20${cleaned.substring(1)}`;
  } else if (!cleaned.startsWith('20') && cleaned.length === 10) {
    cleaned = `20${cleaned}`;
  }
  return cleaned;
};

const getOtpCode = () => String(Math.floor(1000 + Math.random() * 9000));

const hashOtp = (code, salt) => {
  return crypto.createHash('sha256').update(`${code}:${salt}`).digest('hex');
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const queueNotificationTasks = (tasks, label) => {
  const pendingTasks = tasks.filter(Boolean);
  if (!pendingTasks.length) return;

  Promise.allSettled(pendingTasks).then((results) => {
    const failedTasks = results.filter((result) => result.status === 'rejected');
    if (failedTasks.length > 0) {
      console.error(`❌ [PUBLIC-CUSTOMER] ${label} notifications had ${failedTasks.length} failed tasks`);
    }
  }).catch((notificationError) => {
    console.error(`❌ [PUBLIC-CUSTOMER] Failed to queue ${label} notifications:`, notificationError);
  });
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

const sendOtpViaWhatsApp = async ({ companyId, phone, code }) => {
  const prisma = getSharedPrismaClient();

  const settings = await prisma.whatsAppNotificationSettings.findUnique({
    where: { companyId },
    select: { defaultSessionId: true, isEnabled: true }
  });

  if (settings && settings.isEnabled === false) {
    return { success: false, reason: 'notifications_disabled' };
  }

  let sessionId = settings.defaultSessionId;
  if (!sessionId) {
    const connected = await prisma.whatsAppSession.findFirst({
      where: {
        companyId,
        status: 'CONNECTED'
      },
      select: { id: true },
      orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }]
    });

    if (connected?.id) {
      sessionId = connected.id;
      console.log(`ℹ️ [PUBLIC-CUSTOMER] Using fallback connected session for company ${companyId}: ${sessionId}`);
    }
  }

  if (!sessionId) {
    return { success: false, reason: 'no_session' };
  }

  let session = WhatsAppManager.getSession(sessionId);
  if (!session || session.status !== 'connected') {
    try {
      await WhatsAppManager.createSession(sessionId, companyId);
      await delay(1500);
      session = WhatsAppManager.getSession(sessionId);
    } catch (e) {
      // ignore and continue fallbacks
    }

    // Try one more fallback: pick any CONNECTED session from DB and see if runtime is connected
    const connected = await prisma.whatsAppSession.findFirst({
      where: {
        companyId,
        status: 'CONNECTED',
        id: { not: sessionId }
      },
      select: { id: true },
      orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }]
    });

    if (connected?.id) {
      const fallbackId = connected.id;
      let fallbackSession = WhatsAppManager.getSession(fallbackId);
      if (!fallbackSession || fallbackSession.status !== 'connected') {
        try {
          await WhatsAppManager.createSession(fallbackId, companyId);
          await delay(1500);
          fallbackSession = WhatsAppManager.getSession(fallbackId);
        } catch (e) {
          // ignore
        }
      }
      if (fallbackSession && fallbackSession.status === 'connected') {
        sessionId = fallbackId;
        session = fallbackSession;
        console.log(`ℹ️ [PUBLIC-CUSTOMER] Using fallback runtime-connected session for company ${companyId}: ${sessionId}`);
      }
    }
  }

  if (!session || session.status !== 'connected') {
    return { success: false, reason: 'session_not_connected' };
  }

  const formatted = formatPhoneForWhatsApp(phone);
  if (!formatted) {
    return { success: false, reason: 'invalid_phone' };
  }

  const jid = `${formatted}@s.whatsapp.net`;
  try {
    const result = await WhatsAppMessageHandler.sendText(sessionId, jid, `كود الدخول: ${code}`);
    return { success: true, sessionId, formattedPhone: formatted, jid, messageId: result?.messageId || result?.key?.id || null };
  } catch (e) {
    console.error('❌ [PUBLIC-CUSTOMER] WhatsApp sendText failed:', {
      companyId,
      sessionId,
      jid,
      error: e?.message || e
    });
    return { success: false, reason: 'send_failed' };
  }
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

    const existingCustomer = await findCustomerByPhone(prisma, phone, companyId);

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
        phoneNormalized: toCanonicalE164(phone),
        firstName: 'عميل',
        lastName: last4 ? `#${last4}` : 'جديد'
      },
      select: { id: true, firstName: true, lastName: true, phone: true, companyId: true }
    });

    await ensureWallet(customer.id, companyId);

    queueNotificationTasks([
      WhatsAppNotificationService.sendNewSignupWelcomeNotification({
        companyId,
        recipientPhone: customer.phone,
        recipientName: `${customer.firstName} ${customer.lastName}`.trim(),
        customerId: customer.id,
        signupType: 'storefront_customer'
      }),
      WhatsAppNotificationService.sendNewSignupAdminAlertNotification({
        companyId,
        recipientName: `${customer.firstName} ${customer.lastName}`.trim(),
        recipientPhone: customer.phone,
        signupType: 'storefront_customer',
        audience: 'company-admins'
      })
    ], 'public-register');

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
    if (phone) {
      duplicateFilters.push({ OR: [{ phoneNormalized: toCanonicalE164(phone) }, { phone: { in: getPhoneVariants(phone) } }] });
    }

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

    if (createdNewCustomer) {
      queueNotificationTasks([
        customer.phone
          ? WhatsAppNotificationService.sendNewSignupWelcomeNotification({
              companyId,
              recipientPhone: customer.phone,
              recipientName: `${customer.firstName} ${customer.lastName}`.trim(),
              email: customer.email || '',
              customerId: customer.id,
              signupType: 'landing_lead'
            })
          : null,
        WhatsAppNotificationService.sendNewSignupAdminAlertNotification({
          companyId,
          recipientName: `${customer.firstName} ${customer.lastName}`.trim(),
          recipientPhone: customer.phone || '',
          email: customer.email || '',
          signupType: 'landing_lead',
          audience: 'company-admins'
        })
      ], 'lead-capture');
    }

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
      where: { companyId, OR: [{ phoneNormalized: toCanonicalE164(phone) }, { phone: { in: getPhoneVariants(phone) } }] },
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
          phoneNormalized: toCanonicalE164(phone),
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

    const sendResult = await sendOtpViaWhatsApp({ companyId, phone, code });
    if (!sendResult.success) {
      return res.status(400).json({
        success: false,
        message: sendResult.reason === 'no_session'
          ? 'تعذر إرسال كود واتساب: يرجى تفعيل إشعارات واتساب للشركة وتحديد جلسة واتساب افتراضية (Default Session) أولاً'
          : sendResult.reason === 'notifications_disabled'
            ? 'تعذر إرسال كود واتساب: إشعارات واتساب معطلة للشركة. يرجى تفعيل إشعارات واتساب من إعدادات الشركة'
            : sendResult.reason === 'session_not_connected'
              ? 'واتساب غير متصل حالياً. يرجى ربط واتساب من إعدادات الشركة أولاً'
              : sendResult.reason === 'invalid_phone'
                ? 'رقم الهاتف غير صالح'
                : sendResult.reason === 'send_failed'
                  ? 'تعذر إرسال كود واتساب: فشل إرسال الرسالة من جلسة واتساب الحالية (راجع اتصال الجلسة وصحة الرقم ووجود واتساب عليه)'
                  : 'تعذر إرسال كود واتساب'
      });
    }

    const response = {
      success: true,
      message: t('otp.sent'),
      ...(process.env.NODE_ENV !== 'production' ? { debugCode: code } : {})
    };

    return res.json(response);
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
      where: { companyId, OR: [{ phoneNormalized: toCanonicalE164(phone) }, { phone: { in: getPhoneVariants(phone) } }] },
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

router.get('/loyalty-summary', verifyToken.authenticateToken, async (req, res) => {
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

    const [customer, wallet, progress, autoSettings] = await Promise.all([
      prisma.customer.findFirst({
        where: { id: customerId, companyId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          phoneNormalized: true,
          avatar: true,
          createdAt: true
        }
      }),
      prisma.customerWallet.findFirst({ where: { customerId, companyId, isActive: true } }),
      customerLoyaltyService.getCustomerTierProgress(companyId, customerId),
      autoDiscountService.getSettings(companyId)
    ]);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, nameAr: true, currency: true, logo: true, loyaltySystem: true }
    });

    const loyaltyRecord = await prisma.customerLoyaltyRecord.findFirst({
      where: { companyId, customerId, status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
      select: { currentPoints: true, totalEarned: true, totalRedeemed: true, joinDate: true }
    });

    let totalCashback = 0;
    if (wallet) {
      const agg = await prisma.walletTransaction.aggregate({
        where: { walletId: wallet.id, type: 'CASHBACK' },
        _sum: { amount: true }
      });
      totalCashback = parseFloat(agg._sum.amount || 0);
    }

    const loyaltySystem = autoSettings?.loyaltySystem || 'TIERS';
    const isAutoDiscount = loyaltySystem === 'AUTO_DISCOUNT';

    // ملخص الخصم التلقائي (كوبون فعّال + حالة الخصم) — موحّد مع بوابة المسؤول
    let autoSummary = { activeVoucher: null, status: null };
    if (isAutoDiscount) {
      autoSummary = await autoDiscountService
        .getCustomerAutoDiscountSummary({ companyId, customerId, settings: autoSettings })
        .catch(() => ({ activeVoucher: null, status: null }));
    }
    const activeVoucher = autoSummary.activeVoucher;
    const autoDiscountStatus = autoSummary.status;

    return res.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          avatar: customer.avatar,
          joinedAt: customer.createdAt
        },
        company: {
          id: company?.id,
          name: company?.name,
          nameAr: company?.nameAr,
          currency: company?.currency || 'EGP',
          logo: company?.logo,
          loyaltySystem
        },
        loyaltySystem,
        loyalty: {
          method: progress?.method || null,
          metricLabel: progress?.metricLabel || 'نقطة',
          currentMetric: progress ? Number(progress.currentMetric) : (loyaltyRecord ? parseFloat(loyaltyRecord.currentPoints) : 0),
          tier: progress?.tier || null,
          nextTier: progress?.nextTier || null,
          rewards: progress?.rewards || { freeShipping: false, discountPercent: 0 },
          points: {
            current: loyaltyRecord ? parseFloat(loyaltyRecord.currentPoints) : 0,
            totalEarned: loyaltyRecord ? parseFloat(loyaltyRecord.totalEarned) : 0,
            totalRedeemed: loyaltyRecord ? parseFloat(loyaltyRecord.totalRedeemed) : 0,
            joinedAt: loyaltyRecord?.joinDate || null
          }
        },
        autoDiscount: isAutoDiscount
          ? {
              discountPercent: Number(autoSettings.discountPercent || 0),
              validityDays: Number(autoSettings.validityDays || 3),
              status: autoDiscountStatus,
              activeVoucher
            }
          : null,
        wallet: {
          balance: wallet ? parseFloat(wallet.balance) : 0,
          totalEarned: wallet ? parseFloat(wallet.totalEarned) : 0,
          totalSpent: wallet ? parseFloat(wallet.totalSpent) : 0,
          totalCashback,
          currency: wallet?.currency || company?.currency || 'EGP'
        }
      }
    });
  } catch (error) {
    console.error('❌ [PUBLIC-CUSTOMER] Error in /loyalty-summary:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحميل بيانات العميل'
    });
  }
});

module.exports = router;
