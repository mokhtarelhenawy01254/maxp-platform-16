/**
 * Facebook Audiences Controller
 * 
 * Controller للتعامل مع طلبات Facebook Audiences Management
 */

const axios = require('axios');
const FacebookAudiencesService = require('../services/facebookAudiencesService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

/**
 * جلب Access Token للشركة
 */
async function getCompanyAdsAccessToken(companyId) {
  try {
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { 
        facebookAdsAccessToken: true,
        facebookUserAccessToken: true
      }
    });

    return company?.facebookAdsAccessToken || company?.facebookUserAccessToken || null;
  } catch (error) {
    console.error('❌ Error getting company access token:', error);
    return null;
  }
}

/**
 * ============================================
 * Custom Audiences Endpoints
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/audiences/custom
 * جلب جميع Custom Audiences
 */
const getCustomAudiences = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    // جلب Audiences من قاعدة البيانات
    const audiences = await getSharedPrismaClient().facebookCustomAudience.findMany({
      where: { companyId },
      include: {
        facebookAdAccount: true,
        facebookLookalikeAudiences: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: audiences || []
    });
  } catch (error) {
    console.error('❌ Error getting custom audiences:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching custom audiences',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * POST /api/v1/facebook-ads/audiences/custom
 * إنشاء Custom Audience جديد
 */
const createCustomAudience = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.body.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const {
      name,
      description,
      audienceType, // CUSTOMER_LIST, WEBSITE, PAGE_ENGAGEMENT, IG_ENGAGEMENT, VIDEO_VIEWS, ENGAGEMENT
      adAccountId,
      // Customer List
      customerList,
      customerListId,
      sourceType,
      // Website
      pixelId,
      eventType,
      urlContains,
      retentionDays,
      // Page Engagement
      pageId,
      pageEngagementType,
      // Instagram
      igUserId,
      igEngagementType,
      // Video View
      videoId,
      videoViewDuration,
      // Legacy Engagement
      engagementType
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name || !audienceType) {
      return res.status(400).json({
        success: false,
        error: 'Name and audience type are required'
      });
    }

    // جلب Access Token
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    // جلب Ad Account
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: {
        companyId,
        ...(adAccountId && { accountId: adAccountId }),
        isActive: true
      }
    });

    if (!adAccount) {
      return res.status(400).json({
        success: false,
        error: 'Ad Account not found'
      });
    }

    // إنشاء Service
    const audiencesService = new FacebookAudiencesService(accessToken, adAccount.accountId);

    // 🛡️ Auto-resolve default assets if not specified in request
    let effectivePixelId = pixelId;
    if (!effectivePixelId && audienceType === 'WEBSITE') {
      try {
        const company = await getSharedPrismaClient().company.findUnique({
          where: { id: companyId },
          select: { facebookPixelId: true }
        });
        const storefront = await getSharedPrismaClient().storefrontSettings?.findUnique?.({
          where: { companyId },
          select: { facebookPixelId: true }
        });
        effectivePixelId = company?.facebookPixelId || storefront?.facebookPixelId;
      } catch (pixErr) {
        console.warn('Could not auto-resolve pixel for custom audience:', pixErr.message);
      }
    }

    let effectivePageId = pageId;
    if (!effectivePageId && ['PAGE_ENGAGEMENT', 'ENGAGEMENT', 'VIDEO_VIEWS', 'VIDEO_VIEW', 'IG_ENGAGEMENT'].includes(audienceType)) {
      try {
        const pagesRes = await axios.get(`${audiencesService.baseUrl}/me/accounts`, {
          params: { access_token: accessToken, fields: 'id,name' }
        });
        if (pagesRes.data?.data?.length > 0) {
          effectivePageId = pagesRes.data.data[0].id;
        }
      } catch (pageErr) {
        console.warn('Could not auto-resolve Facebook Page for audience:', pageErr.message);
      }
    }

    let effectiveIgUserId = igUserId;
    if (!effectiveIgUserId && audienceType === 'IG_ENGAGEMENT' && effectivePageId) {
      try {
        const pageIgRes = await axios.get(`${audiencesService.baseUrl}/${effectivePageId}`, {
          params: {
            access_token: accessToken,
            fields: 'instagram_business_account,connected_instagram_account'
          }
        });
        effectiveIgUserId =
          pageIgRes.data?.instagram_business_account?.id ||
          pageIgRes.data?.connected_instagram_account?.id;
      } catch (igErr) {
        console.warn('Could not auto-resolve Instagram Account for audience:', igErr.message);
      }
    }

    // تجهيز قائمة العملاء
    let effectiveCustomerList = Array.isArray(customerList) ? customerList : [];
    if (audienceType === 'CUSTOMER_LIST' && (sourceType === 'STORE_CUSTOMERS' || effectiveCustomerList.length === 0)) {
      try {
        const orders = await getSharedPrismaClient().order?.findMany?.({
          where: { companyId },
          select: {
            customerName: true,
            customerPhone: true,
            customerEmail: true,
          },
          take: 5000,
        });
        if (orders && orders.length > 0) {
          effectiveCustomerList = orders
            .filter((o) => o.customerEmail || o.customerPhone)
            .map((o) => {
              const names = (o.customerName || '').trim().split(' ');
              return {
                email: o.customerEmail || '',
                phone: o.customerPhone || '',
                firstName: names[0] || '',
                lastName: names.slice(1).join(' ') || ''
              };
            });
        }
      } catch (orderErr) {
        console.warn('Could not auto-fetch store customers:', orderErr.message);
      }
    }

    let facebookResult;
    
    // إنشاء Audience حسب النوع
    switch (audienceType) {
      case 'CUSTOMER_LIST':
        if (!effectiveCustomerList || effectiveCustomerList.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'قائمة العملاء مطلوبة (يرجى إدخال أرقام أو إيميلات أو اختيار عملاء المتجر)'
          });
        }
        facebookResult = await audiencesService.createCustomerListAudience({
          name,
          description,
          customerList: effectiveCustomerList,
          adAccountId: adAccount.accountId
        });
        break;

      case 'WEBSITE':
        if (!effectivePixelId) {
          return res.status(400).json({
            success: false,
            error: 'Pixel ID مطلوب لإنشاء جمهور زوار الموقع'
          });
        }
        facebookResult = await audiencesService.createWebsiteAudience({
          name,
          description,
          pixelId: effectivePixelId,
          eventType,
          urlContains,
          retentionDays,
          adAccountId: adAccount.accountId
        });
        break;

      case 'PAGE_ENGAGEMENT':
      case 'ENGAGEMENT':
        if (!effectivePageId) {
          return res.status(400).json({
            success: false,
            error: 'صفحة فيسبوك مطلوبة لإنشاء جمهور التفاعل'
          });
        }
        facebookResult = await audiencesService.createEngagementAudience({
          name,
          description,
          pageId: effectivePageId,
          engagementType: pageEngagementType || engagementType || 'page_engaged',
          retentionDays,
          adAccountId: adAccount.accountId
        });
        break;

      case 'IG_ENGAGEMENT':
        if (!effectiveIgUserId) {
          return res.status(400).json({
            success: false,
            error: 'حساب Instagram التجاري غير مربوط بالصفحة أو الحساب الإعلاني'
          });
        }
        facebookResult = await audiencesService.createInstagramAudience({
          name,
          description,
          igUserId: effectiveIgUserId,
          engagementType: igEngagementType || 'ig_business_profile_engaged',
          retentionDays,
          adAccountId: adAccount.accountId
        });
        break;

      case 'VIDEO_VIEWS':
      case 'VIDEO_VIEW':
        if (!effectivePageId) {
          return res.status(400).json({
            success: false,
            error: 'صفحة فيسبوك مطلوبة لتحديد مشاهدي الفيديو'
          });
        }
        facebookResult = await audiencesService.createVideoAudience({
          name,
          description,
          pageId: effectivePageId,
          videoViewDuration: videoViewDuration || 'video_watched_10s',
          retentionDays,
          adAccountId: adAccount.accountId
        });
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `نوع الجمهور (${audienceType}) غير مدعوم`
        });
    }

    if (!facebookResult.success) {
      const fbErr = facebookResult.error?.error || facebookResult.error;
      const isTosError =
        fbErr?.code === 200 &&
        (fbErr?.error_subcode === 1870090 ||
          String(fbErr?.error_user_title || '').includes('شروط') ||
          String(fbErr?.message || '').toLowerCase().includes('custom audience'));

      const accountNumericId = String(adAccount.accountId || '').replace(/^act_/, '');
      const tosUrl = `https://business.facebook.com/ads/manage/customaudiences/tos/?act=${accountNumericId}`;

      return res.status(400).json({
        success: false,
        error: isTosError
          ? `مطلوب تفعيل شروط الجماهير المخصصة لهذا الحساب لدى Meta أولاً عبر الرابط: ${tosUrl}`
          : (fbErr?.error_user_msg || fbErr?.message || facebookResult.error),
        errorCode: isTosError
          ? 'FACEBOOK_CUSTOM_AUDIENCE_TOS_REQUIRED'
          : 'FACEBOOK_AUDIENCE_CREATE_FAILED',
        tosUrl: isTosError ? tosUrl : undefined,
        rawError: facebookResult.error
      });
    }

    // حفظ Audience في قاعدة البيانات
    const audience = await getSharedPrismaClient().facebookCustomAudience.create({
      data: {
        companyId,
        adAccountId: adAccount.id,
        name,
        description,
        audienceType,
        facebookAudienceId: facebookResult.audienceId,
        customerListId,
        pixelId,
        eventType,
        retentionDays,
        engagementType,
        videoId,
        videoViewDuration,
        status: 'ACTIVE'
      }
    });

    // جلب Audience Size
    const sizeResult = await audiencesService.getAudienceSize(facebookResult.audienceId);
    if (sizeResult.success) {
      await getSharedPrismaClient().facebookCustomAudience.update({
        where: { id: audience.id },
        data: { audienceSize: sizeResult.size }
      });
    }

    res.json({
      success: true,
      data: audience,
      message: 'Custom Audience created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating custom audience:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/v1/facebook-ads/audiences/custom/:id
 * جلب معلومات Custom Audience
 */
const getCustomAudience = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const audience = await getSharedPrismaClient().facebookCustomAudience.findFirst({
      where: { id, companyId },
      include: {
        facebookAdAccount: true,
        facebookLookalikeAudiences: true
      }
    });

    if (!audience) {
      return res.status(404).json({
        success: false,
        error: 'Custom Audience not found'
      });
    }

    res.json({
      success: true,
      data: audience
    });
  } catch (error) {
    console.error('❌ Error getting custom audience:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * DELETE /api/v1/facebook-ads/audiences/custom/:id
 * حذف Custom Audience
 */
const deleteCustomAudience = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const audience = await getSharedPrismaClient().facebookCustomAudience.findFirst({
      where: { id, companyId }
    });

    if (!audience) {
      return res.status(404).json({
        success: false,
        error: 'Custom Audience not found'
      });
    }

    // حذف من Facebook
    if (audience.facebookAudienceId) {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        const audiencesService = new FacebookAudiencesService(accessToken);
        await audiencesService.deleteCustomAudience(audience.facebookAudienceId);
      }
    }

    // حذف من قاعدة البيانات
    await getSharedPrismaClient().facebookCustomAudience.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Custom Audience deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting custom audience:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * ============================================
 * Lookalike Audiences Endpoints
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/audiences/lookalike
 * جلب جميع Lookalike Audiences
 */
const getLookalikeAudiences = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const audiences = await getSharedPrismaClient().facebookLookalikeAudience.findMany({
      where: { companyId },
      include: {
        facebookAdAccount: true,
        facebookCustomAudience: {
          select: {
            id: true,
            name: true,
            audienceType: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: audiences || []
    });
  } catch (error) {
    console.error('❌ Error getting lookalike audiences:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching lookalike audiences',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * POST /api/v1/facebook-ads/audiences/lookalike
 * إنشاء Lookalike Audience جديد
 */
const createLookalikeAudience = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.body.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const {
      name,
      description,
      sourceAudienceId, // Internal ID للـ Custom Audience
      country,
      ratio = 1,
      adAccountId
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name || !sourceAudienceId || !country) {
      return res.status(400).json({
        success: false,
        error: 'Name, source audience ID, and country are required'
      });
    }

    // التحقق من Source Audience
    const sourceAudience = await getSharedPrismaClient().facebookCustomAudience.findFirst({
      where: {
        id: sourceAudienceId,
        companyId
      }
    });

    if (!sourceAudience || !sourceAudience.facebookAudienceId) {
      return res.status(400).json({
        success: false,
        error: 'Source Custom Audience not found or not synced with Facebook'
      });
    }

    // جلب Access Token
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    // جلب Ad Account
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: {
        companyId,
        ...(adAccountId && { accountId: adAccountId }),
        isActive: true
      }
    });

    if (!adAccount) {
      return res.status(400).json({
        success: false,
        error: 'Ad Account not found'
      });
    }

    // إنشاء Service
    const audiencesService = new FacebookAudiencesService(accessToken, adAccount.accountId);

    // إنشاء Lookalike Audience في Facebook
    const facebookResult = await audiencesService.createLookalikeAudience({
      name,
      description,
      sourceAudienceId: sourceAudience.facebookAudienceId,
      country,
      ratio,
      adAccountId: adAccount.accountId
    });

    if (!facebookResult.success) {
      return res.status(400).json({
        success: false,
        error: facebookResult.error
      });
    }

    // حفظ Lookalike Audience في قاعدة البيانات
    const lookalikeAudience = await getSharedPrismaClient().facebookLookalikeAudience.create({
      data: {
        companyId,
        adAccountId: adAccount.id,
        sourceAudienceId,
        name,
        description,
        facebookAudienceId: facebookResult.audienceId,
        lookalikeSpec: JSON.stringify({ country, ratio }),
        country,
        ratio,
        status: 'ACTIVE'
      }
    });

    // جلب Audience Size
    const sizeResult = await audiencesService.getAudienceSize(facebookResult.audienceId);
    if (sizeResult.success) {
      await getSharedPrismaClient().facebookLookalikeAudience.update({
        where: { id: lookalikeAudience.id },
        data: { audienceSize: sizeResult.size }
      });
    }

    res.json({
      success: true,
      data: lookalikeAudience,
      message: 'Lookalike Audience created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating lookalike audience:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getCustomAudiences,
  createCustomAudience,
  getCustomAudience,
  deleteCustomAudience,
  getLookalikeAudiences,
  createLookalikeAudience
};


