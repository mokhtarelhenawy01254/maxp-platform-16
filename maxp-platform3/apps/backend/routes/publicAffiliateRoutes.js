const express = require('express');
const fs = require('fs');
const router = express.Router();
const affiliateService = require('../services/affiliateService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../utils/jwtSecret');
const uploadAffiliateIdentityDocument = require('../middleware/affiliateIdentityDocumentUpload');

const handleAffiliateIdentityDocumentUpload = (req, res, next) => {
  uploadAffiliateIdentityDocument.single('identityDocument')(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'فشل رفع مستند الاعتماد',
      });
    }

    next();
  });
};

/**
 * Public Affiliate Registration Routes
 * No authentication required - registration without company assignment
 * الشركة/الإدارة ستقوم بربط المسوق بالشركة لاحقاً
 */

/**
 * الحصول على بيانات الشركة العامة (لصفحة التسجيل)
 */
router.get('/companies/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const prisma = getSharedPrismaClient();

    // التحقق من أن Prisma client موجود
    if (!prisma) {
      throw new Error('Prisma client not initialized');
    }

    const company = await prisma.company.findFirst({
      where: {
        slug: slug,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        logo: true,
        slug: true,
        affiliate_settings: {
          select: {
            commissionType: true,
            commissionRate: true,
            cookieDuration: true,
            termsAndConditions: true,
            isActive: true,
            autoApproveAffiliates: true,
            defaultMinPayout: true,
            defaultCanCreateOrdersForOthers: true,
            defaultCanViewCustomerData: true,
            requireIdentityDocument: true,
            identityDocumentLabel: true,
            payoutSlaDays: true,
            platformMarginType: true,
            platformMarginValue: true
          }
        }
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'الشركة غير موجودة'
      });
    }

    const affiliateProgram = company.affiliate_settings
      ? {
          commissionType: company.affiliate_settings.commissionType,
          commissionRate: company.affiliate_settings.commissionRate,
          cookieDuration: company.affiliate_settings.cookieDuration,
          termsAndConditions: company.affiliate_settings.termsAndConditions,
          isActive: company.affiliate_settings.isActive,
          autoApproveAffiliates:
            company.affiliate_settings.autoApproveAffiliates ?? false,
          defaultMinPayout:
            Number.isFinite(Number(company.affiliate_settings.defaultMinPayout))
              ? Number(company.affiliate_settings.defaultMinPayout)
              : 100,
          defaultCanCreateOrdersForOthers:
            company.affiliate_settings.defaultCanCreateOrdersForOthers ?? true,
          defaultCanViewCustomerData:
            company.affiliate_settings.defaultCanViewCustomerData ?? true,
          requireIdentityDocument:
            company.affiliate_settings.requireIdentityDocument ?? false,
          identityDocumentLabel:
            company.affiliate_settings.identityDocumentLabel ||
            'مستند إثبات الهوية',
          payoutSlaDays:
            Number.isInteger(Number(company.affiliate_settings.payoutSlaDays))
              ? Number(company.affiliate_settings.payoutSlaDays)
              : 3,
          platformMarginType: company.affiliate_settings.platformMarginType,
          platformMarginValue: company.affiliate_settings.platformMarginValue
        }
      : {
          commissionType: 'PERCENTAGE',
          commissionRate: 5,
          cookieDuration: 30,
          termsAndConditions: '',
          isActive: true,
          autoApproveAffiliates: false,
          defaultMinPayout: 100,
          defaultCanCreateOrdersForOthers: true,
          defaultCanViewCustomerData: true,
          requireIdentityDocument: false,
          identityDocumentLabel: 'مستند إثبات الهوية',
          payoutSlaDays: 3,
          platformMarginType: 'FIXED',
          platformMarginValue: 0
        };

    res.json({
      success: true,
      data: {
        id: company.id,
        name: company.name,
        logo: company.logo,
        slug: company.slug,
        affiliateProgram
      }
    });
  } catch (error) {
    console.error('❌ [PUBLIC-AFFILIATE] Error fetching company:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب بيانات الشركة'
    });
  }
});

/**
 * تسجيل مسوق جديد (عام - بدون authentication)
 * يمكن التسجيل برابط مباشر لشركة معينة
 */
router.post('/register', handleAffiliateIdentityDocumentUpload, async (req, res) => {
  const uploadedDocumentPath = req.file?.path;
  const cleanupUploadedDocument = async () => {
    if (uploadedDocumentPath) {
      await fs.promises.unlink(uploadedDocumentPath).catch(() => null);
    }
  };

  try {
    const prisma = getSharedPrismaClient();

    // التحقق من أن Prisma client موجود
    if (!prisma) {
      console.error('❌ [PUBLIC-AFFILIATE] Prisma client is undefined');
      throw new Error('Prisma client not initialized');
    }

    // التحقق من أن affiliate model موجود
    if (!prisma.affiliate) {
      console.error('❌ [PUBLIC-AFFILIATE] Affiliate model not found in Prisma client');
      console.error('❌ [PUBLIC-AFFILIATE] Available models:', Object.keys(prisma).filter(key => !key.startsWith('$') && !key.startsWith('_')));
      throw new Error('Affiliate model not found. Please run: npx prisma generate');
    }

    console.log('✅ [PUBLIC-AFFILIATE] Prisma client initialized, affiliate model found');

    const rawPaymentDetails = req.body?.paymentDetails;
    const parsedPaymentDetails =
      typeof rawPaymentDetails === 'string'
        ? (() => {
            try {
              return JSON.parse(rawPaymentDetails);
            } catch {
              return rawPaymentDetails;
            }
          })()
        : rawPaymentDetails;
    const data = {
      ...req.body,
      paymentDetails: parsedPaymentDetails,
    };
    // Check for company identification: 
    // 1. Explicitly passed in body (data.companySlug)
    // 2. Detected by subdomain middleware (req.companyId)
    let companyId = req.companyId || null;
    let affiliateSettingsForRegistration = null;

    // إذا تم إرسال companySlug، نبحث عن الشركة (الأولوية للـ slug المرسل صراحة)
    if (data.companySlug) {
      const company = await prisma.company.findFirst({
        where: {
          slug: data.companySlug,
          isActive: true
        },
        include: {
          affiliate_settings: true
        }
      });

      if (company) {
        if (company.affiliate_settings && company.affiliate_settings.isActive === false) {
          await cleanupUploadedDocument();
          return res.status(403).json({
            success: false,
            message: 'برنامج المسوقين غير متاح حالياً لهذه الشركة'
          });
        }

        companyId = company.id;
        affiliateSettingsForRegistration = company.affiliate_settings || null;
        console.log(`✅ [PUBLIC-AFFILIATE] Linking new affiliate to company via slug: ${company.name} (${company.id})`);
      } else {
        console.warn(`⚠️ [PUBLIC-AFFILIATE] Company slug provided but not found: ${data.companySlug}`);
        await cleanupUploadedDocument();
        return res.status(400).json({
          success: false,
          message: 'الشركة غير موجودة'
        });
      }
    } else if (companyId) {
      const affiliateSettings = await prisma.affiliateSetting.findUnique({
        where: { companyId }
      });

      if (affiliateSettings && affiliateSettings.isActive === false) {
        await cleanupUploadedDocument();
        return res.status(403).json({
          success: false,
          message: 'برنامج المسوقين غير متاح حالياً لهذه الشركة'
        });
      }

      affiliateSettingsForRegistration = affiliateSettings || null;
      console.log(`✅ [PUBLIC-AFFILIATE] Linking new affiliate to company via subdomain context: ${companyId}`);
    } else {
      console.log('✅ [PUBLIC-AFFILIATE] Registering affiliate without company - company will be assigned later by admin');
    }

    if (
      affiliateSettingsForRegistration?.requireIdentityDocument &&
      !req.file?.filename
    ) {
      await cleanupUploadedDocument();
      return res.status(400).json({
        success: false,
        message: `يجب رفع ${affiliateSettingsForRegistration.identityDocumentLabel || 'مستند إثبات الهوية'} قبل إرسال الطلب`,
      });
    }

    // التحقق من البيانات المطلوبة
    const { email, password, firstName, lastName, phone } = data;

    if (!email || !password || !firstName || !lastName) {
      await cleanupUploadedDocument();
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني وكلمة المرور والاسم مطلوبون'
      });
    }

    // التحقق من أن المستخدم غير موجود
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // التحقق من وجود affiliate مرتبط
      const existingAffiliate = await prisma.affiliate.findUnique({
        where: { userId: existingUser.id }
      });

      if (existingAffiliate) {
        await cleanupUploadedDocument();
        return res.status(400).json({
          success: false,
          message: 'المستخدم مسجل بالفعل كمسوق'
        });
      }

      await cleanupUploadedDocument();
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم بالفعل'
      });
    }

    // إنشاء مستخدم جديد
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        companyId: companyId, // ربط بالشركة إذا وجدت
        role: 'AFFILIATE', // دور خاص بالمسوق
        isActive: true,
        // ✅ إضافة ربط UserCompany لضمان ظهور المستخدم في قوائم الشركة
        userCompanies: companyId ? {
          create: {
            companyId: companyId,
            role: 'AFFILIATE',
            isActive: true,
            isDefault: true
          }
        } : undefined
      }
    });

    if (companyId) {
      console.log(`✅ [PUBLIC-AFFILIATE] User created and linked to company ${companyId}`);
    } else {
      console.log('✅ [PUBLIC-AFFILIATE] User created without company - admin will assign company later');
    }

    // تسجيل المسوق
    const affiliateData = {
      companyId: companyId, // ربط بالشركة إذا وجدت
      commissionType: affiliateSettingsForRegistration?.commissionType || 'PERCENTAGE',
      commissionRate: Number.isFinite(Number(affiliateSettingsForRegistration?.commissionRate))
        ? Number(affiliateSettingsForRegistration.commissionRate)
        : 5.0,
      paymentMethod: data.paymentMethod,
      paymentDetails: data.paymentDetails,
      identityDocumentUrl: req.file?.filename
        ? `/uploads/affiliate-documents/${req.file.filename}`
        : null,
      identityDocumentUploadedAt: req.file?.filename ? new Date() : null,
      minPayout: Number.isFinite(Number(affiliateSettingsForRegistration?.defaultMinPayout))
        ? Number(affiliateSettingsForRegistration.defaultMinPayout)
        : 100.0,
      canCreateOrdersForOthers:
        affiliateSettingsForRegistration?.defaultCanCreateOrdersForOthers ?? true,
      canViewCustomerData:
        affiliateSettingsForRegistration?.defaultCanViewCustomerData ?? true,
      status:
        affiliateSettingsForRegistration?.autoApproveAffiliates === true
          ? 'ACTIVE'
          : 'PENDING'
    };

    const affiliate = await affiliateService.registerAffiliate(user.id, affiliateData);

    // إنشاء token للمستخدم
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, companyId: companyId },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'تم تسجيل المسوق بنجاح',
      data: {
        affiliate,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        },
        token
      }
    });
  } catch (error) {
    await cleanupUploadedDocument();

    console.error('❌ [PUBLIC-AFFILIATE] Error registering affiliate:', error);
    console.error('❌ [PUBLIC-AFFILIATE] Error stack:', error.stack);

    // إرجاع رسالة خطأ أكثر تفصيلاً في بيئة التطوير
    const errorMessage = process.env.NODE_ENV === 'development'
      ? `${error.message} (${error.stack})`
      : error.message || 'حدث خطأ أثناء تسجيل المسوق';

    res.status(400).json({
      success: false,
      message: errorMessage
    });
  }
});

module.exports = router;
