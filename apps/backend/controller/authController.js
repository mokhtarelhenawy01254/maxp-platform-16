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
const normalizeEmail = (value = '') => value.trim().toLowerCase();

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
      await initializeSaasTheme(companyId);
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
      partnerCode,
      promoCode,
      businessSpecialtyId,
      businessSpecialtySlug,
      specialtySlug
    } = req.body;
    const trimmedCompanyName = String(companyName || '').trim() || 'حساب جديد';
    const normalizedEmail = normalizeEmail(email);
    const prisma = getSharedPrismaClient();
    const platformSignupCouponService = require('../services/platformSignupCouponService');

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة'
      });
    }

    const userTimezone = timezone || 'Asia/Riyadh';
    console.log('[REGISTER] Using timezone:', userTimezone);

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
        message: 'البريد الإلكتروني مستخدم بالفعل'
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

    const company = await prisma.company.create({
      data: {
        name: trimmedCompanyName,
        slug: uniqueSlug,
        email: normalizedEmail,
        phone: phone || null,
        plan: 'PRO',
        isActive: true,
        sidebarLayout: 'three-tier',
        timezone: userTimezone,
        businessSpecialtyId: selectedSpecialty?.id || null,
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

    await initializeRegisteredCompany(company.id, totalTrialDays, {
      specialtyAppSlugs: [],
      specialtySlug: selectedSpecialty?.slug || null,
    });

    if (partnerCode) {
      try {
        const platformPartnerService = require('../services/platformPartner.service');
        await platformPartnerService.linkCompanyToPartner(company.id, partnerCode);
        console.log(`[REGISTER] Company ${company.id} linked to partner code: ${partnerCode}`);
      } catch (partnerError) {
        console.error('[REGISTER] Failed to link company to platform partner:', partnerError);
      }
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

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: company.id
      },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        companyId: company.id
      },
      getJwtRefreshSecret(),
      { expiresIn: '7d' }
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

    const responseCompany = buildCompanyResponseWithOnboarding(
      {
        id: company.id,
        name: company.name,
        slug: company.slug,
        logo: company.logo,
        plan: company.plan,
        currency: company.currency,
        isActive: company.isActive,
        sidebarLayout: company.sidebarLayout,
        businessSpecialty: selectedSpecialty,
        settings: company.settings
      },
      user
    );

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
            signupCouponCode: appliedSignupCoupon?.code || null
          },
          companies: [
            {
              ...responseCompany,
              role: user.role,
              isDefault: true,
              isCurrent: true
            }
          ],
          hasMultipleCompanies: false
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
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const invalidCredentialsMessage =
      'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    const companyAssociationMessage = 'الحساب غير مرتبط بشركة';
    const inactiveUserMessage = 'الحساب غير مفعل';
    const inactiveCompanyMessage = 'حساب الشركة غير مفعل';
    const databaseUnavailableMessage =
      'فشل الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.';

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
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
              plan: true,
              currency: true,
              isActive: true,
              sidebarLayout: true,
              settings: true,
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
                where: { status: { in: ['ACTIVE', 'TRIAL'] } },
                select: { app: { select: { slug: true } } }
              }
            }
          },
          userCompanies: {
            where: { isActive: true },
            include: {
              company: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  logo: true,
                  plan: true,
                  currency: true,
                  isActive: true,
                  sidebarLayout: true,
                  settings: true,
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
                    where: { status: { in: ['ACTIVE', 'TRIAL'] } },
                    select: { app: { select: { slug: true } } }
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

    if (!user) {
      console.log('[AUTH] User not found:', normalizedEmail);
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

    // Check for company association (except for system roles)
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

    // Check if user is active
    if (!user.isActive) {
      console.log('[AUTH] User account is inactive');
      return res.status(401).json({
        success: false,
        message: inactiveUserMessage
      });
    }

    // Check if user has a company (required for non-super-admin users)
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

    // Verify password
    console.log('[AUTH] Verifying password...');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('[AUTH] Invalid password for user:', normalizedEmail);
      return res.status(401).json({
        success: false,
        message: invalidCredentialsMessage
      });
    }

    console.log('[AUTH] Password verified successfully');

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId
      },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        companyId: user.companyId
      },
      getJwtRefreshSecret(),
      { expiresIn: '7d' }
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

    await ensureUserCompanySlugs(user);

    // Build companies list for the response (same as /auth/me)
    const companiesMap = new Map();
    let currentActiveRole = user.role;

    // Helper to find role in a specific company
    const findRoleInCompany = (cid) => {
      const assoc = user.userCompanies?.find(uc => uc.companyId === cid);
      return assoc ? assoc.role : user.role;
    };

    // Add main company first
    if (user.company) {
      const roleInPrimary = findRoleInCompany(user.companyId);
      const activeApps = user.company.installedApps?.map(ca => ca.app.slug) || [];
      const responseCompany = buildCompanyResponseWithOnboarding(user.company, user);
      companiesMap.set(user.companyId, {
        ...responseCompany,
        activeApps,
        role: roleInPrimary,
        isDefault: true,
        isCurrent: true // Current company on login
      });
      delete companiesMap.get(user.companyId).installedApps;
      currentActiveRole = roleInPrimary;
    }

    // Add companies from userCompanies
    if (user.userCompanies) {
      for (const uc of user.userCompanies) {
        if (uc.company && uc.company.isActive) {
          if (!companiesMap.has(uc.companyId)) {
            const activeApps = uc.company.installedApps?.map(ca => ca.app.slug) || [];
            const responseCompany = buildCompanyResponseWithOnboarding(uc.company, user);
            companiesMap.set(uc.companyId, {
              ...responseCompany,
              activeApps,
              role: uc.role,
              isDefault: uc.isDefault,
              isCurrent: uc.companyId === user.companyId
            });
            delete companiesMap.get(uc.companyId).installedApps;
          }
        }
      }
    }

    // Return user data without password
    const { password: _, userCompanies: __, ...userWithoutSensitive } = user;
    const affiliateProfile = await buildAffiliateAuthProfile({
      userId: user.id,
      companyId: user.companyId,
      role: currentActiveRole,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        user: {
          ...userWithoutSensitive,
          role: currentActiveRole,
          affiliate: affiliateProfile,
          companies: Array.from(companiesMap.values()),
          hasMultipleCompanies: companiesMap.size > 1
        },
        token,
        refreshToken,
        expiresIn: '24h'
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
            plan: true,
            currency: true,
            isActive: true,
            sidebarLayout: true,
            settings: true,
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
              where: { status: { in: ['ACTIVE', 'TRIAL'] } },
              select: { app: { select: { slug: true } } }
            }
          }
        },
        userCompanies: {
          where: { isActive: true },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
                plan: true,
                currency: true,
                isActive: true,
                sidebarLayout: true,
                settings: true,
                businessSpecialty: {
                  select: {
                    id: true,
                    slug: true,
                    nameAr: true,
                    nameEn: true,
                    icon: true
                  }
                },
                installedApps: {
                  where: { status: { in: ['ACTIVE', 'TRIAL'] } },
                  select: { app: { select: { slug: true } } }
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
        message: 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¬Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€  ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾'
      });
    }

    // Check company status only if company exists (SUPER_ADMIN might not have company)
    if (user.company && !user.company.isActive) {
      return res.status(401).json({
        success: false,
        message: 'ÃƒËœÃ‚Â­ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾'
      });
    }

    await ensureUserCompanySlugs(user);

    // Build companies list for the response
    const companiesMap = new Map();
    let currentActiveRole = decoded.role || user.role;

    // Helper to find role in a specific company
    const findRoleInCompany = (cid) => {
      const assoc = user.userCompanies.find(uc => uc.companyId === cid);
      return assoc ? assoc.role : user.role;
    };

    // Add main company first
    if (user.company) {
      const roleInPrimary = findRoleInCompany(user.companyId);
      const activeApps = user.company.installedApps?.map(ca => ca.app.slug) || [];
      const responseCompany = buildCompanyResponseWithOnboarding(user.company, user);

      // DEBUG: Log the found role
      if (user.email === 'mokhtar@mokhtar.com') {
        console.log(`ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â [ME-DEBUG] User: ${user.email}, Primary: ${user.company.name}, Found Role: ${roleInPrimary}, Global Role: ${user.role}`);
      }

      companiesMap.set(user.companyId, {
        ...responseCompany,
        activeApps,
        role: roleInPrimary,
        isDefault: true,
        isCurrent: user.companyId === decoded.companyId
      });
      delete companiesMap.get(user.companyId).installedApps;

      // If this is the currently active company, ensure we use its role
      if (user.companyId === decoded.companyId) {
        currentActiveRole = roleInPrimary;
      }
    }

    // Add companies from userCompanies
    for (const uc of user.userCompanies) {
      if (uc.company && uc.company.isActive) {
        if (!companiesMap.has(uc.companyId)) {
          const activeApps = uc.company.installedApps?.map(ca => ca.app.slug) || [];
          const responseCompany = buildCompanyResponseWithOnboarding(uc.company, user);
          companiesMap.set(uc.companyId, {
            ...responseCompany,
            activeApps,
            role: uc.role,
            isDefault: uc.isDefault,
            isCurrent: uc.companyId === decoded.companyId
          });
          delete companiesMap.get(uc.companyId).installedApps;
        }

        // If this secondary company is the current one, update active role
        if (uc.companyId === decoded.companyId) {
          currentActiveRole = uc.role;
        }
      }
    }

    // Return user without password
    const { password: _, userCompanies: __, role: ___, companyId: ____, ...userWithoutSensitive } = user;

    // Get the current active company (from token's companyId)
    const currentCompany = companiesMap.get(decoded.companyId) || user.company;
    const affiliateProfile = await buildAffiliateAuthProfile({
      userId: user.id,
      companyId: decoded.companyId || user.companyId,
      role: currentActiveRole,
    });

    res.json({
      success: true,
      data: {
        ...userWithoutSensitive,
        companyId: decoded.companyId || user.companyId, // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Use active company ID from token
        role: currentActiveRole, // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Override with context-aware role
        affiliate: affiliateProfile,
        company: currentCompany, // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Return the currently selected company
        companies: Array.from(companiesMap.values()),
        hasMultipleCompanies: companiesMap.size > 1,
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

    // Generate NEW tokens
    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: decoded.role || user.role,
        companyId: decoded.companyId || user.companyId
      },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    const newRefreshToken = jwt.sign(
      {
        userId: user.id,
        role: decoded.role || user.role,
        companyId: decoded.companyId || user.companyId
      },
      getJwtRefreshSecret(),
      { expiresIn: '7d' }
    );

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
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
    const resetLink = `https://mokhtarelhenawy.online/auth/reset-password?token=${resetToken}`;

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
      message: emailSent
        ? 'ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â±ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â· ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â± ÃƒËœÃ‚Â¥Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â±Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯Ãƒâ„¢Ã†â€™ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¥Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â '
        : 'ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â¥Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â´ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¡ ÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â· ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  (Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã…Â ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â±ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â±Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¥Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã†â€™ÃƒËœÃ‚ÂªÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã…Â )',
      emailSent,
      resetLink,
      emailError: emailError ? emailError.message : (emailSent ? null : 'SMTP not configured')
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
    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â [RESET-PASSWORD] Request received');
    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¦ [RESET-PASSWORD] Body:', req.body);

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
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            plan: true,
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
            plan: true,
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
      role: uc.role,
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
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â² ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂµÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¨'
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â±Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¨'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, getJwtSecret());
    const userId = decoded.userId;

    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ [SWITCH-COMPANY] User:', userId, 'switching to company:', companyId);

    // Get user data with all companies
    const user = await getSharedPrismaClient().user.findUnique({
      where: { id: userId },
      include: {
        userCompanies: {
          where: { isActive: true },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
                plan: true,
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
    // First, check if it's the main company
    let hasAccess = user.companyId === companyId;
    let userRole = user.role;

    if (!hasAccess) {
      // Check UserCompany table
      const userCompany = await getSharedPrismaClient().userCompany.findUnique({
        where: {
          userId_companyId: {
            userId: userId,
            companyId: companyId
          }
        }
      });

      if (userCompany && userCompany.isActive) {
        hasAccess = true;
        userRole = userCompany.role;
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
    const targetCompany = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        currency: true,
        isActive: true,
        sidebarLayout: true
      }
    });

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

    // Generate new JWT token with the new company
    const newToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: userRole,  // Use the role for THIS company
        companyId: companyId  // Use the target company ID
      },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    const newRefreshToken = jwt.sign(
      {
        userId: user.id,
        role: userRole,
        companyId: companyId
      },
      getJwtRefreshSecret(),
      { expiresIn: '7d' }
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
          plan: true,
          currency: true,
          isActive: true,
          sidebarLayout: true
        }
      });

      if (mainCompany) {
        const mainRole = user.userCompanies?.find(uc => uc.companyId === user.companyId)?.role || user.role;
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
              role: uc.role,
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

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({
      success: true,
      message: `تم التبديل إلى ${targetCompany.name} بنجاح`,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        company: targetCompany,
        role: userRole,
        companies: Array.from(companiesMap.values()),
        hasMultipleCompanies: companiesMap.size > 1,
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ Switch company error:', error);

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â² ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂµÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± ÃƒËœÃ‚ÂµÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â­ ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€  Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã…Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©'
      });
    }

    res.status(500).json({
      success: false,
      message: 'ÃƒËœÃ‚Â®ÃƒËœÃ‚Â·ÃƒËœÃ‚Â£ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¨ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â¨Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª',
      error: error.message
    });
  }
};

// ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§Ãƒâ„¢Ã‚ÂÃƒËœÃ‚ÂªÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¶Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©
const setDefaultCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const userId = req.user.id;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â±Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¨'
      });
    }

    // 1. ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒËœÃ‚Â£Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â¯ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â£Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â  Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â°Ãƒâ„¢Ã¢â‚¬Â¡ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â©
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
        message: 'Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â³ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã†â€™ ÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚ÂµÃƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â°Ãƒâ„¢Ã¢â‚¬Â¡ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â©'
      });
    }

    // 2. ÃƒËœÃ‚ÂªÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â« ÃƒËœÃ‚Â¬Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¹ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§ÃƒËœÃ‚Âª Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒâ„¢Ã†â€™Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã‚ÂÃƒËœÃ‚ÂªÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¶Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¹
    // ÃƒËœÃ‚Â«Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â®ÃƒËœÃ‚ÂªÃƒËœÃ‚Â§ÃƒËœÃ‚Â±ÃƒËœÃ‚Â© Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§Ãƒâ„¢Ã‚ÂÃƒËœÃ‚ÂªÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¶Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©
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
      // 3. ÃƒËœÃ‚ÂªÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â« ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â£ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¯Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂªÃƒâ„¢Ã†â€™Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã…Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§Ãƒâ„¢Ã‚ÂÃƒËœÃ‚ÂªÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¶Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â©
      // Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â°ÃƒËœÃ‚Â§ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¶Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â£Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚ÂªÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â®Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â³Ãƒâ„¢Ã…Â Ãƒâ„¢Ã‚ÂÃƒËœÃ‚ÂªÃƒËœÃ‚Â­ ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â° Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â°Ãƒâ„¢Ã¢â‚¬Â¡ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±ÃƒËœÃ‚Â©
      getSharedPrismaClient().user.update({
        where: { id: userId },
        data: { companyId: companyId }
      })
    ]);

    console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ [SET-DEFAULT-COMPANY] User ${userId} set company ${companyId} as default`);

    res.json({
      success: true,
      message: 'ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â§Ãƒâ„¢Ã‚ÂÃƒËœÃ‚ÂªÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¶Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­'
    });

  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ Set default company error:', error);
    res.status(500).json({
      success: false,
      message: 'ÃƒËœÃ‚Â®ÃƒËœÃ‚Â·ÃƒËœÃ‚Â£ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§Ãƒâ„¢Ã‚ÂÃƒËœÃ‚ÂªÃƒËœÃ‚Â±ÃƒËœÃ‚Â§ÃƒËœÃ‚Â¶Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©',
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
        message: 'ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â² ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂµÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¨'
      });
    }

    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â±Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â±Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â '
      });
    }

    // Verify token and check permissions
    const decoded = jwt.verify(token, getJwtSecret());

    // Check if the requester is admin of the target company or super admin
    const requester = await getSharedPrismaClient().user.findUnique({
      where: { id: decoded.userId },
      select: { role: true, companyId: true }
    });

    const isAuthorized =
      requester.role === 'SUPER_ADMIN' ||
      (requester.role === 'COMPANY_ADMIN' && requester.companyId === companyId);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â³ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã†â€™ ÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¶ÃƒËœÃ‚Â§Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â°Ãƒâ„¢Ã¢â‚¬Â¡ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â©'
      });
    }

    // Check if user exists
    const targetUser = await getSharedPrismaClient().user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¬Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯'
      });
    }

    // Check if company exists
    const targetCompany = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId }
    });

    if (!targetCompany) {
      return res.status(404).json({
        success: false,
        message: 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¬Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â©'
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
        message: 'ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â­ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â« ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¶Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â©',
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

    console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ [ADD-USER-COMPANY] User', userId, 'added to company', companyId);

    res.status(201).json({
      success: true,
      message: 'ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¶ÃƒËœÃ‚Â§Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â¥Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­',
      data: userCompany
    });

  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ Add user to company error:', error);

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â² ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂµÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± ÃƒËœÃ‚ÂµÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â­ ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€  Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã…Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©'
      });
    }

    res.status(500).json({
      success: false,
      message: 'ÃƒËœÃ‚Â®ÃƒËœÃ‚Â·ÃƒËœÃ‚Â£ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â¶ÃƒËœÃ‚Â§Ãƒâ„¢Ã‚ÂÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â¥Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â©',
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
        message: 'ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â² ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂµÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¨'
      });
    }

    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â±Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â±Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â '
      });
    }

    // Verify token and check permissions
    const decoded = jwt.verify(token, getJwtSecret());

    const requester = await getSharedPrismaClient().user.findUnique({
      where: { id: decoded.userId },
      select: { role: true, companyId: true }
    });

    const isAuthorized =
      requester.role === 'SUPER_ADMIN' ||
      (requester.role === 'COMPANY_ADMIN' && requester.companyId === companyId);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â³ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â Ãƒâ„¢Ã†â€™ ÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â²ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â°Ãƒâ„¢Ã¢â‚¬Â¡ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â©'
      });
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

    console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ [REMOVE-USER-COMPANY] User', userId, 'removed from company', companyId);

    res.json({
      success: true,
      message: 'ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â²ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­'
    });

  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ Remove user from company error:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â³ ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â¶Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¹ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  Ãƒâ„¢Ã¢â‚¬Â¡ÃƒËœÃ‚Â°Ãƒâ„¢Ã¢â‚¬Â¡ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â©'
      });
    }

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â² ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂµÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± ÃƒËœÃ‚ÂµÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â­ ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€  Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã…Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©'
      });
    }

    res.status(500).json({
      success: false,
      message: 'ÃƒËœÃ‚Â®ÃƒËœÃ‚Â·ÃƒËœÃ‚Â£ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  ÃƒËœÃ‚Â¥ÃƒËœÃ‚Â²ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â©',
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
        message: 'ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â² ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂµÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¨'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â±Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¨'
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
        message: 'Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â· ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â³Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¨ÃƒËœÃ‚Â± ÃƒËœÃ‚Â£ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â  Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Â Ãƒâ„¢Ã¢â‚¬Â¡ ÃƒËœÃ‚ÂªÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â£ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©'
      });
    }

    // Get the system company ID (the super admin's company)
    const systemCompanyId = requester.companyId;

    if (!systemCompanyId) {
      return res.status(400).json({
        success: false,
        message: 'Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã…Â ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¹ÃƒËœÃ‚Â«Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â± ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¸ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦'
      });
    }

    // Update user's primary company
    const updatedUser = await getSharedPrismaClient().user.update({
      where: { id: userId },
      data: { companyId: systemCompanyId }
    });

    console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ [SET-PRIMARY-COMPANY] User', userId, 'primary company set to system company', systemCompanyId);

    res.json({
      success: true,
      message: 'ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¸ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¦ Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© ÃƒËœÃ‚Â£ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­',
      data: updatedUser
    });

  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ Set primary company error:', error);

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'ÃƒËœÃ‚Â±Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â² ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚ÂµÃƒËœÃ‚Â§ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Å¡ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± ÃƒËœÃ‚ÂµÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â­ ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€  Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¡Ãƒâ„¢Ã…Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚ÂµÃƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©'
      });
    }

    res.status(500).json({
      success: false,
      message: 'ÃƒËœÃ‚Â®ÃƒËœÃ‚Â·ÃƒËœÃ‚Â£ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  ÃƒËœÃ‚ÂªÃƒËœÃ‚Â¹Ãƒâ„¢Ã…Â Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â´ÃƒËœÃ‚Â±Ãƒâ„¢Ã†â€™ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â£ÃƒËœÃ‚Â³ÃƒËœÃ‚Â§ÃƒËœÃ‚Â³Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â©',
      error: error.message
    });
  }
};

// Change Password - User changes their own password with current password verification
const changePassword = async (req, res) => {
  try {
    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â [CHANGE-PASSWORD] Request received');

    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    // Validate required fields
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¨ ÃƒËœÃ‚ÂªÃƒËœÃ‚Â³ÃƒËœÃ‚Â¬Ãƒâ„¢Ã…Â Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â®Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ ÃƒËœÃ‚Â£Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â¹'
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â·Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¨ÃƒËœÃ‚ÂªÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Â '
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¯Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¯ÃƒËœÃ‚Â© Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â¨ ÃƒËœÃ‚Â£Ãƒâ„¢Ã¢â‚¬Â  ÃƒËœÃ‚ÂªÃƒâ„¢Ã†â€™Ãƒâ„¢Ã‹â€ Ãƒâ„¢Ã¢â‚¬Â  6 ÃƒËœÃ‚Â£ÃƒËœÃ‚Â­ÃƒËœÃ‚Â±Ãƒâ„¢Ã‚Â ÃƒËœÃ‚Â¹Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â° ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â£Ãƒâ„¢Ã¢â‚¬Å¡Ãƒâ„¢Ã¢â‚¬Å¾'
      });
    }

    // Find user
    const user = await getSharedPrismaClient().user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â³ÃƒËœÃ‚ÂªÃƒËœÃ‚Â®ÃƒËœÃ‚Â¯Ãƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± Ãƒâ„¢Ã¢â‚¬Â¦Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¬Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â¯'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      console.log('ÃƒÂ¢Ã‚ÂÃ…â€™ [CHANGE-PASSWORD] Invalid current password');
      return res.status(401).json({
        success: false,
        message: 'Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â± ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾ÃƒËœÃ‚Â­ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â© ÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â ÃƒËœÃ‚Â± ÃƒËœÃ‚ÂµÃƒËœÃ‚Â­Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â­ÃƒËœÃ‚Â©'
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

    console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ [CHANGE-PASSWORD] Password changed successfully');

    res.json({
      success: true,
      message: 'ÃƒËœÃ‚ÂªÃƒâ„¢Ã¢â‚¬Â¦ ÃƒËœÃ‚ÂªÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â± Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â± ÃƒËœÃ‚Â¨Ãƒâ„¢Ã¢â‚¬Â ÃƒËœÃ‚Â¬ÃƒËœÃ‚Â§ÃƒËœÃ‚Â­'
    });

  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'ÃƒËœÃ‚Â®ÃƒËœÃ‚Â·ÃƒËœÃ‚Â£ Ãƒâ„¢Ã‚ÂÃƒâ„¢Ã…Â  ÃƒËœÃ‚ÂªÃƒËœÃ‚ÂºÃƒâ„¢Ã…Â Ãƒâ„¢Ã…Â ÃƒËœÃ‚Â± Ãƒâ„¢Ã†â€™Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â© ÃƒËœÃ‚Â§Ãƒâ„¢Ã¢â‚¬Å¾Ãƒâ„¢Ã¢â‚¬Â¦ÃƒËœÃ‚Â±Ãƒâ„¢Ã‹â€ ÃƒËœÃ‚Â±',
      error: error.message
    });
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
  getUserCompanies,
  switchCompany,
  addUserToCompany,
  removeUserFromCompany,
  setPrimaryCompany,
  setDefaultCompany
};
