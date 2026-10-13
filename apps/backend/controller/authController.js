const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ÃƒÂ¢Ã‚ÂÃ…â€™ Removed to prevent early loading issues
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { isPermissionError, getPermissionErrorMessage } = require('../utils/dbPermissionHelper');
const { generateUniqueCompanySlug, ensureCompanySlug } = require('../utils/companySlug');
const {
  buildCompanyResponseWithOnboarding,
  serializeCompanySettings,
} = require('../utils/companyOnboarding');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');
const { getJwtSecret, getJwtRefreshSecret } = require('../utils/jwtSecret');
const businessSpecialtyService = require('../services/businessSpecialtyService');
const { filterActiveCompanyAppSlugs } = require('../middleware/checkAppAccess');
const normalizeEmail = (value = '') => value.trim().toLowerCase();

const getSessionExpiryConfig = (req) => {
  const headers = req?.headers || {};
  const isMobileClient =
    headers['x-platform'] === 'capacitor' ||
    /Capacitor|Android.*wv|maxp-mobile/i.test(headers['user-agent'] || '');

  const isDesktopClient =
    headers['x-client'] === 'maxp-desktop-monitor';

  if (isDesktopClient) {
    return {
      isMobileClient: false,
      tokenExpiry: '365d',
      refreshTokenExpiry: '365d',
      refreshTokenMaxAge: 365 * 24 * 60 * 60 * 1000,
    };
  }

  return {
    isMobileClient,
    tokenExpiry: isMobileClient ? '7d' : '8h',
    refreshTokenExpiry: isMobileClient ? '90d' : '7d',
    refreshTokenMaxAge: isMobileClient ? 90 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
  };
};

const ensureUserCompanySlugs = async (user) => {
  if (!user) {
    return user;
  }

  const prisma = getSharedPrismaClient();

  if (user.company) {
    user.company = await ensureCompanySlug(user.company, { prisma });
  }

  if (Array.isArray(user.userCompanies)) {
    for (const membership of user.userCompanies) {
      if (membership.company) {
        membership.company = await ensureCompanySlug(membership.company, { prisma });
      }
    }
  }

  return user;
};

const buildAffiliateAuthProfile = async ({ userId, companyId, role }) => {
  if (role !== 'AFFILIATE' || !userId || !companyId) {
    return null;
  }

  const affiliate = await getSharedPrismaClient().affiliate.findFirst({
    where: {
      userId,
      companyId,
    },
    select: {
      id: true,
      affiliateCode: true,
      status: true,
      commissionType: true,
      commissionRate: true,
      canCreateOrdersForOthers: true,
      canViewCustomerData: true,
    },
  });

  return affiliate || null;
};

// Email transporter configuration
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const initializeRegisteredCompany = async (companyId, trialDays = 0, options = {}) => {
  try {
    const {
      initializeSaasTheme,
      initializeDefaultStorePages,
      initializeDefaultApps
    } = require('../utils/initializeCompanyDefaults');
    const tenantContext = require('../services/tenantContext');
    const billingService = require('../services/billingService');

    await tenantContext.run(companyId, async () => {
      await initializeSaasTheme(companyId, {
        themeId: options.themeId || null,
      });
      await initializeDefaultStorePages(companyId);
      await initializeDefaultApps(companyId, {
        specialtyAppSlugs: options.specialtyAppSlugs || [],
        specialtySlug: options.specialtySlug || null,
        trialDays,
        source: 'signup-specialty',
      });
      await billingService.createSubscription(companyId);
    });

    console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ [REGISTER] SaaS ecosystem initialized for company:', companyId);
  } catch (error) {
    console.error('ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â [REGISTER] Failed to initialize SaaS ecosystem:', error);
    // Don't fail registration if defaults initialization fails
  }
};

const register = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      companyName,
      phone,
      timezone,
      promoCode,
      businessSpecialtyId,
      businessSpecialtySlug,
      specialtySlug,
      landingBundle,
      utm: bodyUtm
    } = req.body;
    const trimmedCompanyName = String(companyName || '').trim() || 'حساب جديد';
    const normalizedEmail = normalizeEmail(email);
    const prisma = getSharedPrismaClient();
    const platformSignupCouponService = require('../services/platformSignupCouponService');

    if (!email || !password || !firstName || !lastName || !phone) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة'
      });
    }

    const userTimezone = timezone || 'Asia/Riyadh';
    console.log('[REGISTER] Using timezone:', userTimezone);

    const registrationIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || null;
    const registrationUserAgent = req.headers['user-agent'] || null;

    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive'
        }
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'فشل إنشاء الحساب، يرجى التحقق من البيانات'
      });
    }

    let validatedSignupCoupon = null;
    if (promoCode) {
      try {
        validatedSignupCoupon = await platformSignupCouponService.validateCouponForRegistration(
          promoCode,
        );
      } catch (couponError) {
        return res.status(400).json({
          success: false,
          message: couponError.message || 'الكوبون غير صالح'
        });
      }
    }

    const selectedSpecialty = await businessSpecialtyService.resolveSpecialtyForRegistration(
      businessSpecialtyId || businessSpecialtySlug || specialtySlug,
    );
    const trialSettings = await businessSpecialtyService.getOnboardingSettings();

    const hashedPassword = await bcrypt.hash(password, 10);
    const uniqueSlug = await generateUniqueCompanySlug(trimmedCompanyName, {
      prisma,
      email: normalizedEmail
    });

    // Fetch default sidebar settings from platform settings
    const platformDefaultSidebar = await prisma.systemSettings.findUnique({
      where: { systemName: "platform_default_sidebar" },
    });

    let defaultSidebarLayout = "three-tier";
    let defaultSidebarSections = {};

    if (platformDefaultSidebar?.config) {
      try {
        const config = JSON.parse(platformDefaultSidebar.config);
        defaultSidebarLayout = config.layout || "three-tier";
        defaultSidebarSections = config.sections || {};
      } catch (e) {
        console.warn("Failed to parse platform default sidebar config:", e);
      }
    }

    // Build initial company settings with default sidebar
    const initialSettings = {
      lastSystemChange: new Date().toISOString(),
      systemChangeBy: "admin",
      sidebarSettings: defaultSidebarSections,
    };

    const company = await prisma.company.create({
      data: {
        name: trimmedCompanyName,
        slug: uniqueSlug,
        email: normalizedEmail,
        phone: phone || null,
        isActive: true,
        sidebarLayout: defaultSidebarLayout,
        timezone: userTimezone,
        businessSpecialty: selectedSpecialty?.id
          ? { connect: { id: selectedSpecialty.id } }
          : undefined,
        registration_ip: registrationIp,
        registration_user_agent: registrationUserAgent,
        settings: JSON.stringify(initialSettings),
      }
    });

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        role: 'OWNER',
        companyId: company.id,
        isActive: true,
        timezone: userTimezone
      }
    });

    try {
      await prisma.userCompany.create({
        data: {
          userId: user.id,
          companyId: company.id,
          role: 'OWNER',
          isActive: true,
          isDefault: true
        }
      });
      console.log('[REGISTER] UserCompany membership created for user:', user.email);
    } catch (error) {
      console.error('[REGISTER] Failed to create UserCompany membership:', error);
    }

    let appliedSignupCoupon = null;
    let totalTrialDays = trialSettings.defaultTrialDays;
    if (validatedSignupCoupon) {
      const couponRedemption =
        await platformSignupCouponService.applySignupCouponRedemption({
          companyId: company.id,
          userId: user.id,
          email: normalizedEmail,
          couponCode: validatedSignupCoupon.normalizedCode,
        });

      totalTrialDays += couponRedemption.benefits.trialDays;
      appliedSignupCoupon = {
        code: validatedSignupCoupon.normalizedCode,
        benefits: couponRedemption.benefits,
        benefitSummary: platformSignupCouponService.buildBenefitSummary(
          couponRedemption.benefits,
        ),
      };
    }

    const specialtyAppSlugs =
      selectedSpecialty && selectedSpecialty.autoInstallOnSignup !== false
        ? selectedSpecialty.appSlugs
        : [];
    await initializeRegisteredCompany(company.id, totalTrialDays, {
      specialtyAppSlugs,
      specialtySlug: selectedSpecialty?.slug || null,
      themeId: selectedSpecialty?.themeId || null,
    });

    // Integrated landing («باقة متجر الملابس»): auto-install the free tier
    // (store + order workflow) for signups coming from that landing page.
    // (landingBundle also arrives in the outer destructure from req.body.)
    if (landingBundle === 'clothing-store-bundle') {
      try {
        const { initializeDefaultApps } = require('../utils/initializeCompanyDefaults');
        await initializeDefaultApps(company.id, {
          specialtyAppSlugs: ['store', 'order-workflow'],
          source: 'clothing-landing-free-tier'
        });
        console.log(`[REGISTER] Free-tier apps (store, order-workflow) activated for landing signup: ${company.id}`);
      } catch (landingErr) {
        console.error('[REGISTER] Free-tier app activation failed:', landingErr?.message);
      }
    }

    // Landing attribution: persist utm_* + landing source captured by the
    // server-level utm middleware (maxp_utm cookie) into an AUTH activity log.
    try {
      const landingUtm = (bodyUtm && typeof bodyUtm === 'object' && Object.keys(bodyUtm).length > 0)
        ? bodyUtm
        : (req.utm || null);
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          companyId: company.id,
          category: 'AUTH',
          action: 'REGISTER',
          description: `تسجيل جديد${landingBundle ? ' من صفحة هبوط باقة المتجر' : ''}${landingUtm?.utm_source ? ` — utm_source: ${landingUtm.utm_source}` : ''}`,
          targetType: 'COMPANY',
          targetId: company.id,
          targetName: company.name,
          metadata: JSON.stringify({
            landingBundle: landingBundle || null,
            utm: landingUtm,
            registeredAt: new Date().toISOString()
          }),
          severity: 'LOW',
          isSuccess: true
        }
      });
    } catch (attributionLogErr) {
      console.error('[REGISTER] Attribution log failed:', attributionLogErr?.message);
    }

    // Attribution window: prefer the cookie/session code captured by the
    // server-level middleware, fall back to an explicit code in the body.
    const partnerCode = req.partnerCode || req.body?.partnerCode || req.query?.partner || undefined;

    if (partnerCode) {
      try {
        const platformPartnerService = require('../services/platformPartner.service');
        await platformPartnerService.linkCompanyToPartner(company.id, partnerCode);
        console.log(`[REGISTER] Company ${company.id} linked to partner code: ${partnerCode}`);
      } catch (partnerError) {
        console.error('[REGISTER] Failed to link company to platform partner:', partnerError);
      }
    }

    // Auto-activate a Platform Partner account for the new company owner
    try {
      const platformPartnerService = require('../services/platformPartner.service');
      const autoPartner = await platformPartnerService.ensurePartnerForCompanyOwner(user.id, company.name);
      if (autoPartner) {
        console.log(`[REGISTER] Platform Partner auto-activated for user ${user.id} (${autoPartner.partnerCode})`);
      }
    } catch (partnerError) {
      console.error('[REGISTER] Failed to auto-activate platform partner:', partnerError);
    }

    try {
      const employeeCount = await prisma.employee.count({
        where: { companyId: company.id }
      });
      const employeeNumber = `EMP${String(employeeCount + 1).padStart(5, '0')}`;

      await prisma.employee.create({
        data: {
          companyId: company.id,
          userId: user.id,
          employeeNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: phone || null,
          hireDate: new Date(),
          status: 'ACTIVE',
          contractType: 'FULL_TIME'
        }
      });

      console.log('[REGISTER] Employee record created for user:', user.email);
    } catch (error) {
      console.error('[REGISTER] Failed to create employee record:', error);
    }

    const sessionConfig = getSessionExpiryConfig(req);

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: company.id
      },
      getJwtSecret(),
      { expiresIn: sessionConfig.tokenExpiry }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        companyId: company.id
      },
      getJwtRefreshSecret(),
      { expiresIn: sessionConfig.refreshTokenExpiry }
    );

    const notificationTasks = [];

    if (phone) {
      notificationTasks.push(
        WhatsAppNotificationService.sendNewSignupWelcomeNotification({
          companyId: company.id,
          recipientPhone: phone,
          recipientName: `${firstName} ${lastName}`.trim(),
          email: normalizedEmail,
          signupType: 'platform_signup',
          companyName: company.name,
          deliveryStrategy: 'platform-only'
        })
      );
    }

    notificationTasks.push(
      WhatsAppNotificationService.sendNewSignupAdminAlertNotification({
        companyId: company.id,
        recipientName: `${firstName} ${lastName}`.trim(),
        recipientPhone: phone || '',
        email: normalizedEmail,
        signupType: 'platform_signup',
        companyName: company.name,
        audience: 'super-admins',
        deliveryStrategy: 'platform-only'
      })
    );

    if (phone && appliedSignupCoupon?.benefitSummary) {
      notificationTasks.push(
        WhatsAppNotificationService.sendBenefitGrantedNotification({
          companyId: company.id,
          recipientPhone: phone,
          recipientName: `${firstName} ${lastName}`.trim(),
          companyName: company.name,
          benefitTitle: 'مزايا التسجيل',
          benefitSummary: appliedSignupCoupon.benefitSummary,
          couponCode: appliedSignupCoupon.code || '',
          deliveryStrategy: 'platform-only'
        })
      );
    }

    Promise.allSettled(notificationTasks).catch((notificationError) => {
      console.error('[REGISTER] Failed to queue WhatsApp registration notifications:', notificationError);
    });

    let registeredActiveApps = [];
    try {
      const installedApps = await prisma.companyApp.findMany({
        where: {
          companyId: company.id,
          status: { in: ['ACTIVE', 'TRIAL', 'active', 'trial'] }
        },
        select: {
          app: { select: { slug: true } }
        }
      });
      registeredActiveApps = installedApps.map(ca => ca.app?.slug).filter(Boolean);
      if (registeredActiveApps.length === 0 && specialtyAppSlugs.length > 0) {
        registeredActiveApps = specialtyAppSlugs;
      }
    } catch (appsErr) {
      console.warn('[REGISTER] Could not fetch installed apps:', appsErr.message);
      registeredActiveApps = specialtyAppSlugs;
    }

    const responseCompany = {
      ...buildCompanyResponseWithOnboarding(
        {
          id: company.id,
          name: company.name,
          slug: company.slug,
          logo: company.logo,
          currency: company.currency,
          isActive: company.isActive,
          sidebarLayout: company.sidebarLayout,
          businessSpecialty: selectedSpecialty,
          settings: company.settings
        },
        user
      ),
      activeApps: registeredActiveApps
    };

    if (typeof res.cookie === 'function') {
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      });
    }

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          companyId: user.companyId,
          company: {
            ...responseCompany,
            activeApps: registeredActiveApps,
            signupCouponCode: appliedSignupCoupon?.code || null
          },
          companies: [
            {
              ...responseCompany,
              activeApps: registeredActiveApps,
              role: user.role,
              isDefault: true,
              isCurrent: true
            }
          ],
          hasMultipleCompanies: false,
          isDentalTechnician: false,
          dentalRole: null
        },
        token,
        refreshToken,
        signupCoupon: appliedSignupCoupon
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'خطأ في إنشاء الحساب',
      error: error.message
    });
  }
};

const validateSignupCoupon = async (req, res) => {
  try {
    const platformSignupCouponService = require('../services/platformSignupCouponService');
    const result = await platformSignupCouponService.validateCouponForRegistration(
      req.body?.promoCode,
    );

    res.json({
      success: true,
      message: 'الكوبون صالح للاستخدام',
      data: {
        code: result.coupon.code,
        name: result.coupon.name,
        description: result.coupon.description,
        benefits: result.benefits,
        benefitSummary: result.coupon.benefitSummary,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'الكوبون غير صالح',
    });
  }
};

const getBusinessSpecialties = async (req, res) => {
  try {
    const [items, settings] = await Promise.all([
      businessSpecialtyService.listPublicSpecialties(),
      businessSpecialtyService.getOnboardingSettings(),
    ]);

    res.json({
      success: true,
      data: {
        items,
        defaultTrialDays: settings.defaultTrialDays,
      },
    });
  } catch (error) {
    console.error('[AUTH] Failed to load business specialties:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب التخصصات',
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  const invalidCredentialsMessage =
    'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  const companyAssociationMessage = 'الحساب غير مرتبط بشركة';
  const inactiveUserMessage = 'الحساب غير مفعل';
  const inactiveCompanyMessage = 'حساب الشركة غير مفعل';
  const databaseUnavailableMessage =
    'فشل الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.';

  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    console.log('[AUTH] Login attempt for:', normalizedEmail);

    if (!email || !password) {
      console.log('[AUTH] Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني وكلمة المرور مطلوبان'
      });
    }

    // Ensure database is initialized
    try {
      await initializeSharedDatabase();
    } catch (initError) {
      console.error('[AUTH] Database initialization error:', initError);
      // If it's a health check error, wait a bit and retry once
      if (initError.message.includes('Health check failed')) {
        console.log(
          '[AUTH] Health check failed, waiting 2s and retrying initialization...',
        );
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          await initializeSharedDatabase();
          console.log('[AUTH] Database initialization succeeded on retry');
        } catch (retryError) {
          console.error(
            '[AUTH] Database initialization failed on retry:',
            retryError,
          );
          return res.status(503).json({
            success: false,
            message: `${databaseUnavailableMessage} يرجى المحاولة مرة أخرى بعد قليل.`,
            error: 'Database connection error'
          });
        }
      }
    }

    // Find user with company - wrap in retry logic for connection issues
    // MySQL is case-insensitive by default for VARCHAR, so we just trim the email
    const user = await executeWithRetry(async () => {
      return await getSharedPrismaClient().user.findFirst({
        where: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          email: true,
          password: true,
          firstName: true,
          lastName: true,
          role: true,
          companyId: true,
          isActive: true,
          timezone: true,
          lastLoginAt: true,
          settings: true,
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
              currency: true,
              isActive: true,
              sidebarLayout: true,
              settings: true,
              trialModeEnabled: true,
              trialEndsAt: true,
              businessSpecialty: {
                select: {
                  id: true,
                  slug: true,
                  nameAr: true,
                  nameEn: true,
                  icon: true
                }
              },
              platformSubscription: {
                select: {
                  status: true,
                  nextBillingDate: true
                }
              },
              installedApps: {
                select: {
                  status: true,
                  settings: true,
                  activePricingModel: true,
                  trialEndsAt: true,
                  validUntil: true,
                  nextBillingAt: true,
                  app: { select: { slug: true, monthlyPrice: true, pricingModel: true } }
                }
              }
            }
          },
          userCompanies: {
            where: { isActive: true },
            include: {
              roleRef: {
                select: { key: true, name: true }
              },
              company: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  logo: true,
                  currency: true,
                  isActive: true,
                  sidebarLayout: true,
                  settings: true,
                  trialModeEnabled: true,
                  trialEndsAt: true,
                  businessSpecialty: {
                    select: {
                      id: true,
                      slug: true,
                      nameAr: true,
                      nameEn: true,
                      icon: true
                    }
                  },
                  platformSubscription: {
                    select: {
                      status: true,
                      nextBillingDate: true
                    }
                  },
                  installedApps: {
                    select: {
                      status: true,
                      settings: true,
                      activePricingModel: true,
                      trialEndsAt: true,
                      validUntil: true,
                      nextBillingAt: true,
                      app: { select: { slug: true, monthlyPrice: true, pricingModel: true } }
                    }
                  }
                }
              }
            },
            orderBy: [
              { isDefault: 'desc' },
              { joinedAt: 'asc' }
            ]
          }
        }
      });
    }, 3);

    // 1. If user not found, perform dummy bcrypt compare to prevent timing enumeration
    if (!user) {
      console.log('[AUTH] User not found:', normalizedEmail);
      await bcrypt.compare(password, '$2b$10$wT8m9Z1N/7ZfK5Z1V9oZe.O3.8z1k0r7N1hG.4iO8q9r5m1k2t4mK').catch(() => {});
      return res.status(401).json({
        success: false,
        message: invalidCredentialsMessage
      });
    }

    console.log('[AUTH] User found:', {
      email: user.email,
      isActive: user.isActive,
      hasCompany: !!user.company,
      companyActive: user.company?.isActive,
      companyId: user.companyId,
      role: user.role
    });

    // 2. 🔐 Verify password FIRST before exposing ANY account status details
    // Prevents user enumeration and misleading "inactive" error on wrong password
    console.log('[AUTH] Verifying password...');
    const isPasswordValid = user.password
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!isPasswordValid) {
      console.log('[AUTH] Invalid password for user:', normalizedEmail);
      return res.status(401).json({
        success: false,
        message: invalidCredentialsMessage
      });
    }

    console.log('[AUTH] Password verified successfully');

    // 3. Check if user account is active (now that password has been authenticated)
    if (!user.isActive) {
      console.log('[AUTH] User account is inactive');
      return res.status(401).json({
        success: false,
        message: inactiveUserMessage
      });
    }

    // 4. Check for company association (except for system roles)
    const isSystemRole = ['SUPER_ADMIN', 'Project Manager', 'Team Lead', 'Developer', 'Tester'].includes(user.role);
    console.log('[AUTH-DEBUG] Checking company association:', {
      companyId: user.companyId,
      isSystemRole,
      willFail: !user.companyId && !isSystemRole
    });

    if (!user.companyId && !isSystemRole) {
      console.log(
        '[LOGIN] User found but not associated with a company:',
        normalizedEmail,
      );
      return res.status(403).json({
        success: false,
        message: companyAssociationMessage
      });
    }

    // 5. Check if user has a company (required for non-super-admin users)
    if (!user.company) {
      console.log('[AUTH] User has no company associated');
      // Only allow login without company if user is SUPER_ADMIN
      if (user.role !== 'SUPER_ADMIN') {
        return res.status(401).json({
          success: false,
          message: companyAssociationMessage
        });
      }
    } else {
      // Check if company is active (only if company exists)
      if (!user.company.isActive) {
        console.log('[AUTH] Company account is inactive');
        return res.status(401).json({
          success: false,
          message: inactiveCompanyMessage
        });
      }
    }

    const sessionConfig = getSessionExpiryConfig(req);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId
      },
      getJwtSecret(),
      { expiresIn: sessionConfig.tokenExpiry }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        companyId: user.companyId
      },
      getJwtRefreshSecret(),
      { expiresIn: sessionConfig.refreshTokenExpiry }
    );

    // Update last login
    try {
      await getSharedPrismaClient().user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });
    } catch (updateError) {
      if (isPermissionError(updateError)) {
        // Silently handle permission errors - they're expected if DB user lacks UPDATE permissions
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `[DB-PERMISSION] Cannot update last login: ${getPermissionErrorMessage(updateError)}`,
          );
        }
      } else {
        // Re-throw non-permission errors
        throw updateError;
      }
    }

    // 🫀 [AUTH] سجلّ دخول دائم — يغذّي «مين دخل وامتى» في السوبر أدمن (fire-and-forget، لا يؤثر على تسجيل الدخول)
    try {
      const forwarded = req.headers['x-forwarded-for'];
      const firstForwarded = Array.isArray(forwarded)
        ? forwarded[0]
        : String(forwarded || '').split(',')[0];
      const auditIp = (req.headers['cf-connecting-ip'] || firstForwarded || req.ip || '').trim() || null;
      const auditName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;
      Promise.resolve(
        getSharedPrismaClient().activityLog.create({
          data: {
            userId: user.id,
            companyId: user.companyId || null,
            category: 'AUTH',
            action: 'LOGIN_SUCCESS',
            description: `تسجيل دخول: ${auditName}`,
            targetType: 'USER',
            targetId: user.id,
            targetName: user.email || auditName,
            severity: 'LOW',
            isSuccess: true,
            metadata: JSON.stringify({
              ip: auditIp,
              userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
              role: user.role || null,
              source: 'authController.login',
            }),
          },
          select: { id: true },
        }),
      ).catch(() => {
        /* لا يجب أن يفشل تسجيل الدخول بسبب سجل النشاط */
      });
    } catch (auditError) {
      /* صامت بالقصد */
    }

    await ensureUserCompanySlugs(user);

    // Resolve custom roles from Role table when roleRef relation didn't populate
    for (const uc of user.userCompanies || []) {
      if (!uc.roleRef && uc.roleId) {
        try {
          const resolved = await getSharedPrismaClient().role.findUnique({
            where: { id: uc.roleId },
            select: { key: true, name: true }
          });
          if (resolved) uc.roleRef = resolved;
        } catch (e) {
          console.warn('[AUTH] Failed to resolve role for userCompany:', e.message?.substring(0, 100));
        }
      }
    }

    // Build companies list for the response (same as /auth/me)
    const companiesMap = new Map();
    let currentActiveRole = user.role;

    // Helper to find role in a specific company
    const findRoleInCompany = (cid) => {
      const assoc = user.userCompanies?.find(uc => uc.companyId === cid);
      return assoc?.roleRef?.key || (assoc ? assoc.role : user.role);
    };

    // Add main company first
    if (user.company) {
      const roleInPrimary = findRoleInCompany(user.companyId);
      const activeApps = filterActiveCompanyAppSlugs(user.company.installedApps, user.company);
      const responseCompany = {
        ...buildCompanyResponseWithOnboarding(user.company, user),
        activeApps
      };
      user.company = responseCompany;
      companiesMap.set(user.companyId, {
        ...responseCompany,
        activeApps,
        role: roleInPrimary,
        isDefault: true,
        isCurrent: true // Current company on login
      });
      delete companiesMap.get(user.companyId).installedApps;
      if (user.role !== 'SUPER_ADMIN') {
        currentActiveRole = roleInPrimary;
      }
    }

    // Add companies from userCompanies
    if (user.userCompanies) {
      for (const uc of user.userCompanies) {
        if (uc.company && uc.company.isActive) {
          if (!companiesMap.has(uc.companyId)) {
            const activeApps = filterActiveCompanyAppSlugs(uc.company.installedApps, uc.company);
            const responseCompany = {
              ...buildCompanyResponseWithOnboarding(uc.company, user),
              activeApps
            };
            companiesMap.set(uc.companyId, {
              ...responseCompany,
              activeApps,
              role: uc.roleRef?.key || uc.role,
              isDefault: uc.isDefault,
              isCurrent: uc.companyId === user.companyId
            });
            delete companiesMap.get(uc.companyId).installedApps;
          }
        }
      }
    }

    // SUPER_ADMIN operates only within its bound company (max-p). Platform-wide
    // administration lives in /super-admin — no synthetic all-companies list here.

    // Ensure at least one company is marked as isCurrent: true
    const hasCurrentCompany = Array.from(companiesMap.values()).some(c => c.isCurrent);
    if (!hasCurrentCompany && companiesMap.size > 0) {
      const firstCompanyId = companiesMap.keys().next().value;
      const firstCompany = companiesMap.get(firstCompanyId);
      if (firstCompany) {
        firstCompany.isCurrent = true;
      }
    }

    const effectiveCompanyId = user.companyId || user.company?.id || (user.userCompanies && user.userCompanies[0]?.companyId);
    const currentCompany = (effectiveCompanyId && companiesMap.get(effectiveCompanyId)) || user.company || Array.from(companiesMap.values())[0] || null;

    // Return user data without password
    const { password: _, userCompanies: __, ...userWithoutSensitive } = user;
    const affiliateProfile = await buildAffiliateAuthProfile({
      userId: user.id,
      companyId: user.companyId,
      role: currentActiveRole,
    });

    // Load user permissions for frontend consistency on login
    let permissions = [];
    try {
      const permissionService = require('../services/permissionService');
      permissions = await permissionService.getUserPermissions(user.id, user.companyId);
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[LOGIN] Could not load permissions:', e.message);
      }
    }

    if (typeof res.cookie === 'function') {
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      });
    }

    let isDentalTechnician = false;
    let dentalRole = null;
    try {
      const { checkDentalTechnicianUser } = require('../services/dentalRoles');
      const dentalInfo = await checkDentalTechnicianUser(user.id, user.companyId);
      isDentalTechnician = dentalInfo.isTechnician;
      dentalRole = dentalInfo.dentalRole;
    } catch (_) {}

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        user: {
          ...userWithoutSensitive,
          role: currentActiveRole,
          permissions,
          company: currentCompany,
          affiliate: affiliateProfile,
          companies: Array.from(companiesMap.values()),
          hasMultipleCompanies: companiesMap.size > 1,
          isDentalTechnician,
          dentalRole,
        },
        token,
        refreshToken,
        expiresIn: '8h'
      }
    });

  } catch (error) {
    console.error('[AUTH-LOGIN-FATAL] Complete Error:', error);
    if (error.stack) {
      console.error('[AUTH-LOGIN-STACK]:', error.stack);
    }

    // Provide more user-friendly error messages
    let errorMessage = 'فشل في تسجيل الدخول';
    let statusCode = 500;

    if (error.message.includes('Health check failed')) {
      errorMessage = `${databaseUnavailableMessage} يرجى المحاولة مرة أخرى بعد لحظات.`;
      statusCode = 503;
    } else if (error.message.includes('Connection') || error.message.includes('timeout')) {
      errorMessage = databaseUnavailableMessage;
      statusCode = 503;
    } else if (error.message.includes('max_connections_per_hour')) {
      errorMessage = 'تم تجاوز حد الاتصالات. يرجى المحاولة مرة أخرى لاحقًا.';
      statusCode = 503;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const me = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â² ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂµÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¨'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, getJwtSecret());

    // Get user with company and userCompanies
    const user = await getSharedPrismaClient().user.findUnique({
      where: { id: decoded.userId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            currency: true,
            isActive: true,
            sidebarLayout: true,
            settings: true,
            trialModeEnabled: true,
            trialEndsAt: true,
            businessSpecialty: {
              select: {
                id: true,
                slug: true,
                nameAr: true,
                nameEn: true,
                icon: true
              }
            },
            platformSubscription: {
              select: {
                status: true,
                nextBillingDate: true
              }
            },
            installedApps: {
              select: {
                status: true,
                settings: true,
                activePricingModel: true,
                trialEndsAt: true,
                validUntil: true,
                nextBillingAt: true,
                app: { select: { slug: true, monthlyPrice: true, pricingModel: true } }
              }
            }
          }
        },
        userCompanies: {
          where: { isActive: true },
          include: {
            roleRef: {
              select: { key: true, name: true }
            },
            company: {
              select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
                currency: true,
                isActive: true,
                sidebarLayout: true,
                settings: true,
                trialModeEnabled: true,
                trialEndsAt: true,
                businessSpecialty: {
                  select: {
                    id: true,
                    slug: true,
                    nameAr: true,
                    nameEn: true,
                    icon: true
                  }
                },
                platformSubscription: {
                  select: {
                    status: true,
                    nextBillingDate: true
                  }
                },
                installedApps: {
                  select: {
                    status: true,
                    settings: true,
                    activePricingModel: true,
                    trialEndsAt: true,
                    validUntil: true,
                    nextBillingAt: true,
                    app: { select: { slug: true, monthlyPrice: true, pricingModel: true } }
                  }
                }
              }
            }
          },
          orderBy: [
            { isDefault: 'desc' },
            { joinedAt: 'asc' }
          ]
        },
        dev_team_members: {
          select: {
            xp: true,
            level: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¬Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€  ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾'
      });
    }

    // Check company status only if company exists (SUPER_ADMIN might not have company)
    if (user.company && !user.company.isActive) {
      return res.status(401).json({
        success: false,
        message: 'ÃƒËœÃ‚Â­ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾'
      });
    }

    await ensureUserCompanySlugs(user);

    // Resolve custom roles from Role table when roleRef relation didn't populate
    for (const uc of user.userCompanies || []) {
      if (!uc.roleRef && uc.roleId) {
        try {
          const resolved = await getSharedPrismaClient().role.findUnique({
            where: { id: uc.roleId },
            select: { key: true, name: true }
          });
          if (resolved) uc.roleRef = resolved;
        } catch (e) {
          console.warn('[AUTH-ME] Failed to resolve role for userCompany:', e.message?.substring(0, 100));
        }
      }
    }

    // Build companies list for the response
    const companiesMap = new Map();
    let currentActiveRole = decoded.role || user.role;

    // Helper to find role in a specific company (prefer custom roleRef.key)
    const findRoleInCompany = (cid) => {
      const assoc = user.userCompanies.find(uc => uc.companyId === cid);
      return assoc?.roleRef?.key || (assoc ? assoc.role : user.role);
    };

    // Add main company first
    if (user.company) {
      const roleInPrimary = findRoleInCompany(user.companyId);
      const activeApps = filterActiveCompanyAppSlugs(user.company.installedApps, user.company);
      const responseCompany = {
        ...buildCompanyResponseWithOnboarding(user.company, user),
        activeApps
      };
      user.company = responseCompany;

      // DEBUG: Log the found role
      if (user.email === 'mokhtar@mokhtar.com') {
        console.log(`🔍 [ME-DEBUG] User: ${user.email}, Primary: ${user.company.name}, Found Role: ${roleInPrimary}, Global Role: ${user.role}`);
      }

      companiesMap.set(user.companyId, {
        ...responseCompany,
        activeApps,
        role: roleInPrimary,
        isDefault: true,
        isCurrent: user.companyId === decoded.companyId
      });
      delete companiesMap.get(user.companyId).installedApps;

      // If this is the currently active company, ensure we use its role (unless user is global SUPER_ADMIN)
      if (user.role !== 'SUPER_ADMIN' && user.companyId === decoded.companyId) {
        currentActiveRole = roleInPrimary;
      }
    }

    // Add companies from userCompanies
    for (const uc of user.userCompanies) {
      if (uc.company && uc.company.isActive) {
        if (!companiesMap.has(uc.companyId)) {
          const activeApps = filterActiveCompanyAppSlugs(uc.company.installedApps, uc.company);
          const responseCompany = {
            ...buildCompanyResponseWithOnboarding(uc.company, user),
            activeApps
          };
          companiesMap.set(uc.companyId, {
            ...responseCompany,
            activeApps,
            role: uc.roleRef?.key || uc.role,
            isDefault: uc.isDefault,
            isCurrent: uc.companyId === decoded.companyId
          });
          delete companiesMap.get(uc.companyId).installedApps;
        }

        // If this secondary company is the current one, update active role (unless user is global SUPER_ADMIN)
        if (user.role !== 'SUPER_ADMIN' && uc.companyId === decoded.companyId) {
          currentActiveRole = uc.roleRef?.key || uc.role;
        }
      }
    }

    // SUPER_ADMIN operates only within its bound company (max-p). Context switching
    // for platform operations stays server-side (/super-admin flows) — no synthetic
    // all-companies list is exposed here.

    // Return user without password
    const { password: _, userCompanies: __, role: ___, companyId: ____, ...userWithoutSensitive } = user;

    // Get the current active company (from token's companyId)
    const currentCompany = companiesMap.get(decoded.companyId) || user.company;
    const affiliateProfile = await buildAffiliateAuthProfile({
      userId: user.id,
      companyId: decoded.companyId || user.companyId,
      role: currentActiveRole,
    });

    // Load user permissions for granular frontend gating
    let permissions = [];
    try {
      const permissionService = require('../services/permissionService');
      permissions = await permissionService.getUserPermissions(user.id, decoded.companyId || user.companyId);
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[ME] Could not load permissions:', e.message);
      }
    }

    let isDentalTechnician = false;
    let dentalRole = null;
    try {
      const { checkDentalTechnicianUser } = require('../services/dentalRoles');
      const dentalInfo = await checkDentalTechnicianUser(user.id, decoded.companyId || user.companyId);
      isDentalTechnician = dentalInfo.isTechnician;
      dentalRole = dentalInfo.dentalRole;
    } catch (_) {}

    res.json({
      success: true,
      data: {
        ...userWithoutSensitive,
        companyId: decoded.companyId || user.companyId, // âœ¦ Use active company ID from token
        role: currentActiveRole, // âœ¦ Override with context-aware role
        permissions,
        affiliate: affiliateProfile,
        company: currentCompany, // âœ¦ Return the currently selected company
        companies: Array.from(companiesMap.values()),
        hasMultipleCompanies: companiesMap.size > 1,
        isDentalTechnician,
        dentalRole,
        devStats: user.dev_team_members?.[0] ? {
          xp: user.dev_team_members[0].xp,
          level: user.dev_team_members[0].level
        } : null
      }
    });

  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ Get user error:', error);

    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â² ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂµÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± ÃƒËœÃ‚ÂµÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â­',
        code: 'INVALID_TOKEN'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Âª ÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â² ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂµÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â©',
        code: 'TOKEN_EXPIRED'
      });
    }

    res.status(401).json({
      success: false,
      message: 'ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â² ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂµÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± ÃƒËœÃ‚ÂµÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â­',
      error: error.message,
      code: 'AUTH_ERROR'
    });
  }
};

const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, getJwtRefreshSecret());
    } catch (tokenError) {
      console.error('[AUTH] Refresh token verification failed:', tokenError);
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    let user;
    try {
      user = await getSharedPrismaClient().user.findUnique({
        where: { id: decoded.userId }
      });
    } catch (dbError) {
      console.error('[AUTH] Refresh token lookup failed:', dbError);
      return res.status(503).json({
        success: false,
        message: 'Authentication service temporarily unavailable'
      });
    }

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid or inactive user' });
    }

    const sessionConfig = getSessionExpiryConfig(req);

    // Generate NEW tokens
    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: decoded.role || user.role,
        companyId: decoded.companyId || user.companyId
      },
      getJwtSecret(),
      { expiresIn: sessionConfig.tokenExpiry }
    );

    const newRefreshToken = jwt.sign(
      {
        userId: user.id,
        role: decoded.role || user.role,
        companyId: decoded.companyId || user.companyId
      },
      getJwtRefreshSecret(),
      { expiresIn: sessionConfig.refreshTokenExpiry }
    );

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: sessionConfig.refreshTokenMaxAge,
      path: '/'
    });

    // The frontendApiClient specifically expects accessToken and refreshToken at the root of the data object.
    res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('[AUTH] Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to refresh session right now'
    });
  }
};

const logout = async (req, res) => {
  res.clearCookie('refreshToken', { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
  res.json({
    success: true,
    message: 'تم تسجيل الخروج بنجاح'
  });
}

// Forgot Password - Send reset token via email
const forgotPassword = async (req, res) => {
  try {
    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â [FORGOT-PASSWORD] Request received');
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);
    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â§ [FORGOT-PASSWORD] Email:', normalizedEmail);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â±Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¥Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â  Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¨'
      });
    }

    // Find user
    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â [FORGOT-PASSWORD] Searching for user...');
    const user = await getSharedPrismaClient().user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive'
        }
      },
      include: {
        company: {
          select: {
            name: true
          }
        }
      }
    });

    // If user not found, check if they have a pending invitation
    if (!user) {
      console.log('ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â [FORGOT-PASSWORD] User not found in users table');
      console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â [FORGOT-PASSWORD] Checking for pending invitation...');

      const invitation = await getSharedPrismaClient().userInvitation.findFirst({
        where: {
          email: normalizedEmail,
          status: 'PENDING'
        }
      });

      if (invitation) {
        console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¨ [FORGOT-PASSWORD] Found pending invitation');
        return res.status(400).json({
          success: false,
          message: 'Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â°ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â±Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¥Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â  Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¡ ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â¹Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â©. Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â° Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â¨Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â¹Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â© ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¹ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¥Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â´ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¡ ÃƒËœÃ‚Â­ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨Ãƒâ„¢Ã†â€™ÃƒËœÃ…â€™ ÃƒËœÃ‚Â«Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã†â€™ ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â±.',
          code: 'PENDING_INVITATION'
        });
      }

      // No user and no invitation - return generic success for security
      console.log('ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â [FORGOT-PASSWORD] No user or invitation found');
      return res.json({
        success: true,
        message: 'ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â°ÃƒËœÃ‚Â§ Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â±Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¥Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â  Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¬Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¹ÃƒËœÃ…â€™ ÃƒËœÃ‚Â³Ãƒâ„¢Ã…Â ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â±ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â· ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â±'
      });
    }

    console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ [FORGOT-PASSWORD] User found:', user.id);

    // Generate reset token
    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Ëœ [FORGOT-PASSWORD] Generating reset token...');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Save reset token to database
    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â¾ [FORGOT-PASSWORD] Saving token to database...');
    await getSharedPrismaClient().user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetTokenHash,
        resetPasswordExpires: resetTokenExpiry
      }
    });
    console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ [FORGOT-PASSWORD] Token saved to database');

    // Create reset link
    const resetBaseUrl = process.env.FRONTEND_URL || 'https://maxp.online';
    const resetLink = `${resetBaseUrl}/auth/reset-password?token=${resetToken}`;

    // Send email if SMTP is configured
    let emailSent = false;
    let emailError = null;
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â§ Attempting to send password reset email to:', email);
        await emailTransporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: email,
          subject: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â±',
          html: `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â±</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333; margin-top: 0; font-size: 24px;">Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¹ ${user.firstName} ${user.lastName}ÃƒËœÃ…â€™</h2>
                            
                            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                                ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¹ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â®ÃƒËœÃ‚Â§ÃƒËœÃ‚ÂµÃƒËœÃ‚Â© ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â­ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨Ãƒâ„¢Ã†â€™ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  <strong style="color: #667eea;">${user.company?.name || 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¸ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦'}</strong>.
                            </p>
                            
                            <div style="background-color: #fff3cd; border-right: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                                <p style="margin: 0; color: #856404;">
                                    ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â <strong>Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â°ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â· ÃƒËœÃ‚ÂµÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­ Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â© Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â·</strong>
                                </p>
                            </div>
                            
                            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                                Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â±ÃƒËœÃ…â€™ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â± ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â²ÃƒËœÃ‚Â± ÃƒËœÃ‚Â£ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¡:
                            </p>
                            
                            <!-- Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${resetLink}" 
                                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                                  color: white; 
                                                  padding: 15px 40px; 
                                                  text-decoration: none; 
                                                  border-radius: 50px; 
                                                  display: inline-block; 
                                                  font-weight: bold; 
                                                  font-size: 16px;
                                                  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                                            ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å“ ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â±
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #999; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                                ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â³ÃƒËœÃ‚Â® ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â· ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â  Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Â¡ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂªÃƒËœÃ‚ÂµÃƒâ„¢Ã‚ÂÃƒËœÃ‚Â­:
                            </p>
                            <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px; color: #667eea;">
                                ${resetLink}
                            </p>
                            
                            <div style="background-color: #f8d7da; border-right: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 5px;">
                                <p style="margin: 0; color: #721c24;">
                                    ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â„¢ <strong>Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â±ÃƒËœÃ…Â¸</strong><br>
                                    Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã†â€™ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¬ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â°ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â±Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â£Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â . Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â®ÃƒËœÃ‚Â§ÃƒËœÃ‚ÂµÃƒËœÃ‚Â© ÃƒËœÃ‚Â¨Ãƒâ„¢Ã†â€™ Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚ÂªÃƒËœÃ‚ÂªÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â±.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 30px; border-radius: 0 0 10px 10px;">
                            <p style="color: #999; font-size: 13px; margin: 5px 0; text-align: center;">
                                ÃƒÂ¢Ã‚ÂÃ‚Â° Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â°ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â· ÃƒËœÃ‚ÂµÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­ Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© <strong>ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â© Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â©</strong> Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Âª ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â±ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾
                            </p>
                            <p style="color: #999; font-size: 13px; margin: 5px 0; text-align: center;">
                                ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬â„¢ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â£ÃƒËœÃ‚Â³ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â£Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©ÃƒËœÃ…â€™ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â´ÃƒËœÃ‚Â§ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â°ÃƒËœÃ‚Â§ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â· Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¹ ÃƒËœÃ‚Â£Ãƒâ„¢Ã…Â  ÃƒËœÃ‚Â´ÃƒËœÃ‚Â®ÃƒËœÃ‚Âµ
                            </p>
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                            <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
                                Ãƒâ€šÃ‚Â© ${new Date().getFullYear()} ${user.company?.name || 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¸ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦'}. ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¹ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¡ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â­Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¸ÃƒËœÃ‚Â©.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
          `
        });
        emailSent = true;
        console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Password reset email sent successfully to:', email);
      } catch (error) {
        emailError = error;
        console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ Error sending password reset email:', error);
        console.error('Error details:', {
          code: error.code,
          command: error.command,
          response: error.response,
          responseCode: error.responseCode
        });
      }
    } else {
      console.log('ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â SMTP not configured - email will not be sent');
    }

    res.json({
      success: true,
      message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني',
      emailSent
    });

  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'ÃƒËœÃ‚Â®ÃƒËœÃ‚Â·ÃƒËœÃ‚Â£ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â© ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â±',
      error: error.message
    });
  }
};

// Reset Password - Verify token and update password
const resetPassword = async (req, res) => {
  try {

    // Accept both 'password' and 'newPassword' for compatibility
    const { token, password, newPassword } = req.body;
    const passwordToUse = password || newPassword;

    if (!token || !passwordToUse) {
      return res.status(400).json({
        success: false,
        message: 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â² Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â '
      });
    }

    if (passwordToUse.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â± Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â£Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚ÂªÃƒâ„¢Ã†â€™Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â  6 ÃƒËœÃ‚Â£ÃƒËœÃ‚Â­ÃƒËœÃ‚Â±Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â£Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¾'
      });
    }

    // Hash the token to compare with database
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Ëœ [RESET-PASSWORD] Token hash:', resetTokenHash);

    // Find user with valid reset token
    const user = await getSharedPrismaClient().user.findFirst({
      where: {
        resetPasswordToken: resetTokenHash,
        resetPasswordExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      console.log('ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â [RESET-PASSWORD] Invalid or expired token');

      // Check if token exists but expired
      const expiredUser = await getSharedPrismaClient().user.findFirst({
        where: {
          resetPasswordToken: resetTokenHash
        }
      });

      if (expiredUser) {
        console.log('ÃƒÂ¢Ã‚ÂÃ‚Â° [RESET-PASSWORD] Token expired at:', expiredUser.resetPasswordExpires);
        return res.status(400).json({
          success: false,
          message: 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Âª ÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â² ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â . Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â±ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â· ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯.'
        });
      }

      console.log('ÃƒÂ¢Ã‚ÂÃ…â€™ [RESET-PASSWORD] Token not found in database');
      return res.status(400).json({
        success: false,
        message: 'ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â² ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± ÃƒËœÃ‚ÂµÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â­'
      });
    }

    console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ [RESET-PASSWORD] User found:', user.id);

    // Hash new password
    const hashedPassword = await bcrypt.hash(passwordToUse, 10);

    // Update password and clear reset token
    await getSharedPrismaClient().user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        passwordChangedAt: new Date()
      }
    });

    console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ [RESET-PASSWORD] Password updated successfully');

    res.json({
      success: true,
      message: 'ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚ÂªÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â± Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â± ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­. Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã†â€™ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¢Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚ÂªÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â®Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â¨Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â©'
    });

  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'ÃƒËœÃ‚Â®ÃƒËœÃ‚Â·ÃƒËœÃ‚Â£ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â±',
      error: error.message
    });
  }
};

// Get all companies for the current user
const getUserCompanies = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â² ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂµÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¨'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, getJwtSecret());

    // Get user's companies from UserCompany table
    const userCompanies = await getSharedPrismaClient().userCompany.findMany({
      where: {
        userId: decoded.userId,
        isActive: true
      },
      include: {
        roleRef: {
          select: { key: true, name: true }
        },
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,

            currency: true,
            isActive: true,
            sidebarLayout: true,
            settings: true,
            platformSubscription: {
              select: {
                status: true,
                nextBillingDate: true
              }
            }
          }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { joinedAt: 'asc' }
      ]
    });

    // Also get the main company from user record (for backward compatibility)
    const user = await getSharedPrismaClient().user.findUnique({
      where: { id: decoded.userId },
      select: {
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            sidebarLayout: true,
            settings: true,
            platformSubscription: {
              select: {
                status: true,
                nextBillingDate: true
              }
            },

            currency: true,
            isActive: true
          }
        }
      }
    });

    // Combine results - include main company if not already in userCompanies
    const companyIds = new Set(userCompanies.map(uc => uc.companyId));
    const companies = userCompanies.map(uc => ({
      ...buildCompanyResponseWithOnboarding(uc.company, { phone: '' }),
      role: uc.roleRef?.key || uc.role,
      isDefault: uc.isDefault,
      joinedAt: uc.joinedAt
    }));

    // Add main company if not in the list
    if (user?.company && !companyIds.has(user.companyId)) {
      companies.unshift({
        ...buildCompanyResponseWithOnboarding(user.company, { phone: '' }),
        role: 'COMPANY_ADMIN',
        isDefault: true,
        joinedAt: null,
        isMainCompany: true
      });
    }

    // Mark current company
    const currentCompanyId = decoded.companyId;
    const companiesWithCurrent = companies.map(c => ({
      ...c,
      isCurrent: c.id === currentCompanyId
    }));

    res.json({
      success: true,
      data: {
        companies: companiesWithCurrent,
        currentCompanyId
      }
    });

  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ Get user companies error:', error);

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â² ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂµÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± ÃƒËœÃ‚ÂµÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â­ ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€  Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã…Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©'
      });
    }

    res.status(500).json({
      success: false,
      message: 'ÃƒËœÃ‚Â®ÃƒËœÃ‚Â·ÃƒËœÃ‚Â£ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª',
      error: error.message
    });
  }
};

// Switch to a different company
const switchCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const userId = req.user.userId;

    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ [SWITCH-COMPANY] User:', userId, 'switching to company:', companyId);

    // Get user data with all companies
    const user = await getSharedPrismaClient().user.findUnique({
      where: { id: userId },
      include: {
        userCompanies: {
          where: { isActive: true },
          include: {
            roleRef: {
              select: { key: true, name: true }
            },
            company: {
              select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
    
                currency: true,
                isActive: true,
                sidebarLayout: true
              }
            }
          },
          orderBy: [
            { isDefault: 'desc' },
            { joinedAt: 'asc' }
          ]
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¬Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€  ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾'
      });
    }

    // Check if user has access to this company
    // First, check if it's the main company or if user is SUPER_ADMIN
    let hasAccess = user.companyId === companyId || user.role === 'SUPER_ADMIN';
    let userRole = user.role;

    if (!hasAccess) {
      // Check UserCompany table
      const userCompany = await getSharedPrismaClient().userCompany.findUnique({
        where: {
          userId_companyId: {
            userId: userId,
            companyId: companyId
          }
        },
        include: {
          roleRef: {
            select: { key: true, name: true }
          }
        }
      });

      if (userCompany && userCompany.isActive) {
        hasAccess = true;
        userRole = userCompany.roleRef?.key || userCompany.role;
      }
    }

    if (!hasAccess) {
      console.log('ÃƒÂ¢Ã‚ÂÃ…â€™ [SWITCH-COMPANY] User does not have access to company:', companyId);
      return res.status(403).json({
        success: false,
        message: 'Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â³ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã†â€™ ÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚ÂµÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â¥Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â° Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â°Ãƒâ„¢Ã¢â‚¬Â¡ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â©'
      });
    }

    // Get the target company details
    const rawTargetCompany = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        currency: true,
        isActive: true,
        sidebarLayout: true,
        trialModeEnabled: true,
        trialEndsAt: true,
        platformSubscription: {
          select: {
            status: true,
            nextBillingDate: true
          }
        },
        installedApps: {
          where: { status: { in: ['ACTIVE', 'TRIAL', 'EXPIRED'] } },
          select: {
            status: true,
            settings: true,
            activePricingModel: true,
            trialEndsAt: true,
            validUntil: true,
            nextBillingAt: true,
            app: { select: { slug: true, monthlyPrice: true, pricingModel: true } }
          }
        }
      }
    });
    const targetCompany = rawTargetCompany ? {
      ...rawTargetCompany,
      activeApps: filterActiveCompanyAppSlugs(rawTargetCompany.installedApps, rawTargetCompany)
    } : null;

    if (!targetCompany) {
      return res.status(404).json({
        success: false,
        message: 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¬Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â©'
      });
    }

    if (!targetCompany.isActive) {
      return res.status(403).json({
        success: false,
        message: 'ÃƒËœÃ‚Â­ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾'
      });
    }

    // ÃƒÂ¢Ã‚ÂÃ…â€™ DO NOT UPDATE User.companyId in database!
    // User.companyId is the PRIMARY company and should remain constant
    // We only issue a new JWT with the switched company for session purposes

    // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ CORRECT: Only generate new JWT, don't touch the database
    // The primary company (User.companyId) should NEVER change during switch
    // Exception: We can update lastAccessedCompanyId if we add that field later

    const sessionConfig = getSessionExpiryConfig(req);

    // Generate new JWT token with the new company
    const newToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: userRole,  // Use the role for THIS company
        companyId: companyId  // Use the target company ID
      },
      getJwtSecret(),
      { expiresIn: sessionConfig.tokenExpiry }
    );

    const newRefreshToken = jwt.sign(
      {
        userId: user.id,
        role: userRole,
        companyId: companyId
      },
      getJwtRefreshSecret(),
      { expiresIn: sessionConfig.refreshTokenExpiry }
    );

    console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ [SWITCH-COMPANY] Successfully switched to company:', targetCompany.name);

    // Build companies list for the response
    const companiesMap = new Map();

    // Add main company if exists
    if (user.companyId) {
      const mainCompany = await getSharedPrismaClient().company.findUnique({
        where: { id: user.companyId },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          currency: true,
          isActive: true,
          sidebarLayout: true
        }
      });

      if (mainCompany) {
        const mainRole = user.userCompanies?.find(uc => uc.companyId === user.companyId)?.roleRef?.key || user.userCompanies?.find(uc => uc.companyId === user.companyId)?.role || user.role;
        companiesMap.set(user.companyId, {
          ...mainCompany,
          role: mainRole,
          isDefault: true,
          isCurrent: user.companyId === companyId
        });
      }
    }

    // Add companies from userCompanies
    if (user.userCompanies) {
      for (const uc of user.userCompanies) {
        if (uc.company && uc.company.isActive) {
          if (!companiesMap.has(uc.companyId)) {
            companiesMap.set(uc.companyId, {
              ...uc.company,
              role: uc.roleRef?.key || uc.role,
              isDefault: uc.isDefault,
              isCurrent: uc.companyId === companyId
            });
          } else {
            // Update isCurrent flag
            const existing = companiesMap.get(uc.companyId);
            companiesMap.set(uc.companyId, {
              ...existing,
              isCurrent: uc.companyId === companyId
            });
          }
        }
      }
    }

    // Load user permissions for frontend consistency on company switch
    let permissions = [];
    try {
      const permissionService = require('../services/permissionService');
      permissions = await permissionService.getUserPermissions(user.id, companyId);
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[SWITCH] Could not load permissions:', e.message);
      }
    }

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    let isDentalTechnician = false;
    let dentalRole = null;
    try {
      const { checkDentalTechnicianUser } = require('../services/dentalRoles');
      const dentalInfo = await checkDentalTechnicianUser(user.id, companyId);
      isDentalTechnician = dentalInfo.isTechnician;
      dentalRole = dentalInfo.dentalRole;
    } catch (_) {}

    res.json({
      success: true,
      message: `تم التبديل إلى ${targetCompany.name} بنجاح`,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        company: {
          ...(companiesMap.get(companyId) || targetCompany),
          activeApps: targetCompany.activeApps
        },
        role: userRole,
        permissions,
        companies: Array.from(companiesMap.values()),
        hasMultipleCompanies: companiesMap.size > 1,
        isDentalTechnician,
        dentalRole,
        expiresIn: '8h'
      }
    });

  } catch (error) {
    console.error('❌ Switch company error:', error);

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صالح أو منتهية الصلاحية'
      });
    }

    res.status(500).json({
      success: false,
      message: 'خطأ في التبديل بين الشركات',
      error: error.message
    });
  }
};

// تعيين الشركة الافتراضية
const setDefaultCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const userId = req.user.id;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    // 1. التأكد من أن المستخدم ينتمي لهذه الشركة
    const membership = await getSharedPrismaClient().userCompany.findUnique({
      where: {
        userId_companyId: {
          userId: userId,
          companyId: companyId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول لهذه الشركة'
      });
    }

    // 2. تحديث جميع الشركات للمستخدم لتغير غير الافتراضية ثم تعيين الشركة المختارة كافتراضية
    // ثم تعيين الشركة الافتراضية كافتراضية
    await getSharedPrismaClient().$transaction([
      getSharedPrismaClient().userCompany.updateMany({
        where: { userId: userId },
        data: { isDefault: false }
      }),
      getSharedPrismaClient().userCompany.update({
        where: {
          userId_companyId: {
            userId: userId,
            companyId: companyId
          }
        },
        data: { isDefault: true }
      }),
      // 3. تحديث الشركة الأساسية في جدول المستخدم لتكن هذه الشركة الافتراضية الجديدة
      // هذا يضمن أن تسجيل الدخول القادم سيصبح على هذه الشركة مباشرة
      getSharedPrismaClient().user.update({
        where: { id: userId },
        data: { companyId: companyId }
      })
    ]);

    console.log(`✅ [SET-DEFAULT-COMPANY] User ${userId} set company ${companyId} as default`);

    res.json({
      success: true,
      message: 'تم تعيين الشركة الافتراضية بنجاح'
    });

  } catch (error) {
    console.error('❌ Set default company error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تعيين الشركة الافتراضية',
      error: error.message
    });
  }
};

// Add user to a company (Admin only)
const addUserToCompany = async (req, res) => {
  try {
    const { userId, companyId, role = 'AGENT' } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة مطلوب'
      });
    }

    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم أو معرف الشركة مطلوبان'
      });
    }

    // Verify token and check permissions
    const decoded = jwt.verify(token, getJwtSecret());

    // Check if the requester is super admin or company admin (via UserCompany membership)
    const requester = await getSharedPrismaClient().user.findUnique({
      where: { id: decoded.userId },
      select: { role: true }
    });

    if (requester.role !== 'SUPER_ADMIN') {
      const membership = await getSharedPrismaClient().userCompany.findUnique({
        where: { userId_companyId: { userId: decoded.userId, companyId } },
        select: { role: true }
      });
      if (!membership || membership.role !== 'COMPANY_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية لإضافة مستخدمين لهذه الشركة'
        });
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لإضافة مستخدمين لهذه الشركة'
      });
    }

    // Check if user exists
    const targetUser = await getSharedPrismaClient().user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // Check if company exists
    const targetCompany = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId }
    });

    if (!targetCompany) {
      return res.status(404).json({
        success: false,
        message: 'الشركة غير موجودة'
      });
    }

    // Check if user is already in this company
    const existingMembership = await getSharedPrismaClient().userCompany.findUnique({
      where: {
        userId_companyId: {
          userId: userId,
          companyId: companyId
        }
      }
    });

    if (existingMembership) {
      // Update the existing membership
      const updated = await getSharedPrismaClient().userCompany.update({
        where: {
          userId_companyId: {
            userId: userId,
            companyId: companyId
          }
        },
        data: {
          role: role,
          isActive: true
        }
      });

      return res.json({
        success: true,
        message: 'تم تحديث عضوية المستخدم في الشركة بنجاح',
        data: updated
      });
    }

    // Create new membership
    const userCompany = await getSharedPrismaClient().userCompany.create({
      data: {
        userId: userId,
        companyId: companyId,
        role: role,
        isActive: true,
        isDefault: false
      }
    });

    console.log('✅ [ADD-USER-COMPANY] User', userId, 'added to company', companyId);

    res.status(201).json({
      success: true,
      message: 'تمت إضافة المستخدم إلى الشركة بنجاح',
      data: userCompany
    });

  } catch (error) {
    console.error('❌ Add user to company error:', error);

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صالح أو منتهية الصلاحية'
      });
    }

    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة المستخدم إلى الشركة',
      error: error.message
    });
  }
};

// Remove user from a company (Admin only)
const removeUserFromCompany = async (req, res) => {
  try {
    const { userId, companyId } = req.params;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة مطلوب'
      });
    }

    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم أو معرف الشركة مطلوبان'
      });
    }

    // Verify token and check permissions
    const decoded = jwt.verify(token, getJwtSecret());

    const requester = await getSharedPrismaClient().user.findUnique({
      where: { id: decoded.userId },
      select: { role: true }
    });

    if (requester.role !== 'SUPER_ADMIN') {
      const membership = await getSharedPrismaClient().userCompany.findUnique({
        where: { userId_companyId: { userId: decoded.userId, companyId } },
        select: { role: true }
      });
      if (!membership || membership.role !== 'COMPANY_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية لإزالة مستخدمين من هذه الشركة'
        });
      }
    }

    // Delete the membership
    await getSharedPrismaClient().userCompany.delete({
      where: {
        userId_companyId: {
          userId: userId,
          companyId: companyId
        }
      }
    });

    console.log('✅ [REMOVE-USER-COMPANY] User', userId, 'removed from company', companyId);

    res.json({
      success: true,
      message: 'تمت إزالة المستخدم من الشركة بنجاح'
    });

  } catch (error) {
    console.error('❌ Remove user from company error:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'المستخدم ليس عضوًا في هذه الشركة'
      });
    }

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صالح أو منتهية الصلاحية'
      });
    }

    res.status(500).json({
      success: false,
      message: 'خطأ في إزالة المستخدم من الشركة',
      error: error.message
    });
  }
};

// Set user's primary company to system company (Super Admin only)
const setPrimaryCompany = async (req, res) => {
  try {
    const { userId } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة مطلوب'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم مطلوب'
      });
    }

    // Verify token and check permissions
    const decoded = jwt.verify(token, getJwtSecret());

    const requester = await getSharedPrismaClient().user.findUnique({
      where: { id: decoded.userId },
      select: { role: true, companyId: true }
    });

    // Only SUPER_ADMIN can change primary company
    if (requester.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'فقط السوبر أدمن يمكنه تغيير الشركة الأساسية'
      });
    }

    // Get the system company ID (the super admin's company)
    const systemCompanyId = requester.companyId || 'cmopgxu3a07i4jujj6f1oh32h';

    if (!systemCompanyId) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم العثور على شركة النظام'
      });
    }

    // Update user's primary company
    const updatedUser = await getSharedPrismaClient().user.update({
      where: { id: userId },
      data: { companyId: systemCompanyId }
    });

    console.log('✅ [SET-PRIMARY-COMPANY] User', userId, 'primary company set to system company', systemCompanyId);

    res.json({
      success: true,
      message: 'تم تعيين شركة النظام كشركة أساسية بنجاح',
      data: updatedUser
    });

  } catch (error) {
    console.error('❌ Set primary company error:', error);

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صالح أو منتهية الصلاحية'
      });
    }

    res.status(500).json({
      success: false,
      message: 'خطأ في تعيين الشركة الأساسية',
      error: error.message
    });
  }
};

// Change Password - User changes their own password with current password verification
const changePassword = async (req, res) => {
  try {
    console.log('📐 [CHANGE-PASSWORD] Request received');

    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    // Validate required fields
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'يجب تسجيل الدخول أولاً'
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الحالية والجديدة مطلوبتان'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'
      });
    }

    // Find user
    const user = await getSharedPrismaClient().user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      console.log('❌ [CHANGE-PASSWORD] Invalid current password');
      return res.status(401).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await getSharedPrismaClient().user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date()
      }
    });

    console.log('✅ [CHANGE-PASSWORD] Password changed successfully');

    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تغيير كلمة المرور',
      error: error.message
    });
  }
};


// Verify email address
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: 'رمز التحقق مطلوب' });
    }

    const prisma = getSharedPrismaClient();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: tokenHash,
        emailVerificationExpires: { gt: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'رمز التحقق غير صالح أو منتهي الصلاحية' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    });

    res.json({ success: true, message: 'تم توثيق البريد الإلكتروني بنجاح' });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء توثيق البريد الإلكتروني' });
  }
};

// Send email verification link
const sendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مطلوب' });
    }

    const prisma = getSharedPrismaClient();
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return res.json({ success: true, message: 'إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال رابط التوثيق' });
    }

    if (user.isEmailVerified) {
      return res.json({ success: true, message: 'البريد الإلكتروني موثق بالفعل' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: tokenHash,
        emailVerificationExpires: tokenExpiry
      }
    });

    const verificationLink = `https://maxp.online/api/v1/auth/verify-email?token=${verificationToken}`;

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await emailTransporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: email,
          subject: 'توثيق البريد الإلكتروني - MaxP',
          html: `<p>اضغط على الرابط لتوثيق بريدك الإلكتروني:</p><a href="${verificationLink}">${verificationLink}</a>`
        });
      } catch (error) {
        console.error('Failed to send verification email:', error);
      }
    }

    res.json({ success: true, message: 'إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال رابط التوثيق' });
  } catch (error) {
    console.error('Error sending verification email:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء إرسال رابط التوثيق' });
  }
};

module.exports = {
  register,
  validateSignupCoupon,
  getBusinessSpecialties,
  login,
  me,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  sendVerificationEmail,
  getUserCompanies,
  switchCompany,
  addUserToCompany,
  removeUserFromCompany,
  setPrimaryCompany,
  setDefaultCompany
};



