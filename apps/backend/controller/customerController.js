const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const axios = require('axios');
const { getMetaGraphApiVersion } = require('../config/metaApi');
const WalletService = require('../services/walletService');
const customerBlocklistService = require('../services/customerBlocklistService');
const autoDiscountService = require('../services/autoDiscountService');

const getAllCustomer = async (req, res) => {
  try {
    // التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // Pagination & Filtering parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search || '';
    const statusFilter = req.query.status;
    // Whitelist sortBy to prevent injection
    const allowedSortFields = ['createdAt', 'updatedAt', 'firstName', 'lastName', 'email', 'status'];
    const sortBy = allowedSortFields.includes(req.query.sortBy) ? req.query.sortBy : 'updatedAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
    const hasOrdersParam = req.query.hasOrders;
    // Default to false — show all customers unless explicitly requested with orders only
    const hasOrders = hasOrdersParam === 'true' ? true : hasOrdersParam === 'false' ? false : null;


    // بناء شرط البحث
    const where = { companyId };

    // 🕵️ Filter by order presence
    if (hasOrders === true) {
      where.orders = { some: {} };
    } else if (hasOrders === false) {
      where.orders = { none: {} };
    }
    // null = no filter (show all)

    // 🕵️ Affiliate Filtering Logic
    let affiliateId = req.query.affiliateId;

    if (req.user.role === 'AGENT') {
      const prisma = getSharedPrismaClient();
      const affiliate = await prisma.affiliate.findUnique({
        where: { userId: req.user.id }
      });
      if (affiliate) {
        affiliateId = affiliate.id;
        // Agents only see customers they referred
        where.affiliateReferrals = {
          some: { affiliateId: affiliate.id }
        };
      } else {
        // Secure fallback
        return res.json({
          success: true,
          data: [],
          pagination: { total: 0, page, limit, pages: 0 },
          message: 'لا يوجد مسوق مرتبط بهذا الحساب'
        });
      }
    } else if (affiliateId) {
      // Admins can filter by specific affiliate
      where.affiliateReferrals = {
        some: { affiliateId: affiliateId }
      };
    }

    // إضافة فلتر البحث النصي
    if (searchQuery) {
      where.OR = [
        { firstName: { contains: searchQuery } },
        { lastName: { contains: searchQuery } },
        { email: { contains: searchQuery } },
        { phone: { contains: searchQuery } }
      ];
    }

    // إضافة فلتر الحالة (مع validation للقيم المسموح بها في الـ CustomersStatus enum)
    const validStatuses = ['LEAD', 'ACTIVE', 'INACTIVE', 'BLOCKED'];
    if (statusFilter && statusFilter !== 'all' && validStatuses.includes(statusFilter)) {
      where.status = statusFilter;
    }

    // 🏷️ فلتر الوسوم (Tags)
    const tagFilter = req.query.tag;
    if (tagFilter) {
      where.tags = { contains: `"${tagFilter}"` };
    }

    // Filter by auto-discount status: AVAILABLE / PRE_ACTIVATION
    const autoDiscountFilter = req.query.autoDiscountStatus;
    if (autoDiscountFilter) {
      const matchedIds = await autoDiscountService
        .getCustomerIdsByAutoDiscountStatus(companyId, autoDiscountFilter)
        .catch((e) => {
          console.error('❌ [AUTO-DISCOUNT] Filter failed:', e?.message || e);
          return [];
        });
      // If the auto-discount system is inactive, no customer matches the filter
      if (matchedIds.length === 0) {
        where.id = { in: [] };
      } else {
        where.id = { in: matchedIds };
      }
    }

    // تنفيذ الاستعلام مع الترقيم
    const [customers, total] = await Promise.all([
      getSharedPrismaClient().customer.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: skip,
        include: {
          _count: {
            select: {
              conversations: true,
              orders: true
            }
          }
        }
      }),
      getSharedPrismaClient().customer.count({ where })
    ]);

    // حساب معلومات الترقيم
    const totalPages = Math.ceil(total / limit);

    // 🏷️ إضافة حالة الخصم التلقائي لكل عميل (خصم متاح / قبل تفعيل النظام)
    let data = customers;
    if (autoDiscountService) {
      data = await autoDiscountService
        .enrichCustomersWithAutoDiscountStatus(companyId, customers)
        .catch((e) => {
          console.error('❌ [AUTO-DISCOUNT] Enrich customer list failed:', e.message);
          return customers;
        });
    }

    // 🏷️ إضافة مستوى الولاء (badge المستويات) لكل عميل — بس لو نظام المستويات مفعّل
    try {
      const customerLoyaltyService = require('../services/hr/customerLoyaltyService');
      if (await autoDiscountService.isTiersActive(companyId)) {
        data = await customerLoyaltyService.enrichCustomersWithTier(companyId, data);
      }
    } catch (e) {
      console.error('❌ [LOYALTY-TIER] Enrich customer list failed:', e.message);
    }

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      message: `تم جلب ${customers.length} عميل للشركة`
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب العملاء',
      error: error.message
    });
  }
};

const deleteAllConversations = async (req, res) => {
  try {
    // 🔒 Security Check: Strict Admin Only
    // هذه عملية خطيرة جداً ويجب تقييدها
    const userRole = req.user?.role;
    const companyId = req.user?.companyId;

    if (userRole !== 'SUPER_ADMIN' && userRole !== 'COMPANY_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بإجراء هذا الحذف الشامل'
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة للحذف'
      });
    }

    // ✅ FIX: Delete only for specific company
    const deleted = await getSharedPrismaClient().conversation.deleteMany({
      where: { companyId: companyId }
    });

    console.log(`🗑️ Deleted ${deleted.count} conversations for company ${companyId} by ${req.user.email}`);

    res.json({
      success: true,
      deletedCount: deleted.count,
      message: `تم مسح ${deleted.count} محادثة لهذه الشركة فقط`
    });
  } catch (error) {
    console.error('❌ Error deleting conversations:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في مسح المحادثات'
    });
  }
};

// 🗑️ مسح عملاء الشركة فقط (محمية)
const deleteAllCustomers = async (req, res) => {
  try {
    // 🔒 Security Check: Strict Admin Only
    const userRole = req.user?.role;
    const companyId = req.user?.companyId;

    // فقط مدير النظام أو مدير الشركة يمكنه الحذف
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'COMPANY_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بإجراء هذا الحذف الشامل - يتطلب صلاحيات مدير'
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة للحذف'
      });
    }

    // ✅ FIX: Delete only for specific company
    const deleted = await getSharedPrismaClient().customer.deleteMany({
      where: { companyId: companyId }
    });

    console.log(`🗑️ Deleted ${deleted.count} customers for company ${companyId} by ${req.user.email}`);

    res.json({
      success: true,
      deletedCount: deleted.count,
      message: `تم مسح ${deleted.count} عميل لهذه الشركة فقط`
    });
  } catch (error) {
    console.error('❌ Error deleting customers:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في مسح العملاء'
    });
  }
};


// 🚫 حظر عميل على صفحة فيس بوك معينة
const blockCustomerOnPage = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.id;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { customerId, pageId, reason } = req.body;

    if (!customerId || !pageId) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل ومعرف الصفحة مطلوبان'
      });
    }

    // التحقق من وجود العميل والشركة
    const customer = await getSharedPrismaClient().customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyId: true, facebookId: true }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    if (customer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذا العميل'
      });
    }

    // التحقق من وجود صفحة الفيس بوك
    const facebookPage = await getSharedPrismaClient().facebookPage.findUnique({
      where: { pageId: pageId },
      select: { id: true, companyId: true, pageAccessToken: true }
    });

    if (!facebookPage) {
      return res.status(404).json({
        success: false,
        message: 'صفحة الفيس بوك غير موجودة'
      });
    }

    if (facebookPage.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذه الصفحة'
      });
    }

    // التحقق من عدم وجود حظر سابق
    const existingBlock = await getSharedPrismaClient().blockedCustomersOnPage.findFirst({
      where: {
        facebookPageId: facebookPage.id,
        customerId: customerId
      }
    });

    if (existingBlock) {
      return res.status(400).json({
        success: false,
        message: 'العميل محظور بالفعل على هذه الصفحة'
      });
    }

    // التحقق من وجود facebookId
    if (!customer.facebookId) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حظر العميل - معرف الفيسبوك غير موجود'
      });
    }

    // 🚫 التواصل مع Facebook API لحظر المستخدم من الصفحة مباشرة
    let facebookBlockResult = null;
    const facebookUserId = customer.facebookId;

    if (facebookUserId && facebookPage.pageAccessToken) {
      try {
        console.log(`🚫 [FB-API] Blocking user ${facebookUserId} on Facebook page ${pageId} via Graph API...`);

        // استخدام Facebook Graph API لحظر المستخدم
        const fbResponse = await axios.post(
          `https://graph.facebook.com/${getMetaGraphApiVersion()}/${pageId}/blocked`,
          {
            user: facebookUserId
          },
          {
            params: {
              access_token: facebookPage.pageAccessToken
            },
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        facebookBlockResult = {
          success: true,
          facebookResponse: fbResponse.data
        };
        console.log(`✅ [FB-API] User blocked successfully on Facebook page:`, fbResponse.data);
      } catch (fbError) {
        console.error(`❌ [FB-API] Error blocking user on Facebook:`, fbError.response?.data || fbError.message);
        facebookBlockResult = {
          success: false,
          error: fbError.response?.data || fbError.message
        };
        // نستمر في حفظ الحظر في قاعدة البيانات حتى لو فشل Facebook API
      }
    } else {
      console.log(`⚠️ [FB-API] Cannot block on Facebook: missing facebookId (${!!facebookUserId}) or pageAccessToken (${!!facebookPage.pageAccessToken})`);
    }

    // إنشاء الحظر في قاعدة البيانات
    const blocked = await getSharedPrismaClient().blockedCustomersOnPage.create({
      data: {
        facebookPageId: facebookPage.id,
        pageId: pageId,
        customerId: customer.id,
        facebookId: customer.facebookId,
        blockedBy: userId || null,
        reason: reason || null,
        updatedAt: new Date(),
        metadata: facebookBlockResult ? JSON.stringify(facebookBlockResult) : null // حفظ نتيجة Facebook API
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            facebookId: true
          }
        },
        facebookPage: {
          select: {
            pageId: true,
            pageName: true
          }
        }
      }
    });

    console.log(`🚫 [BLOCK] Customer ${customer.id} blocked on page ${pageId} by user ${userId}`);

    res.json({
      success: true,
      data: blocked,
      message: 'تم حظر العميل على الصفحة بنجاح'
    });
  } catch (error) {
    console.error('❌ Error blocking customer:', error);

    // معالجة أخطاء Prisma
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'العميل محظور بالفعل على هذه الصفحة'
      });
    }

    res.status(500).json({
      success: false,
      message: 'خطأ في حظر العميل',
      error: error.message
    });
  }
};

// ✅ إلغاء حظر عميل على صفحة فيس بوك معينة
const unblockCustomerOnPage = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { customerId, pageId } = req.body;

    if (!customerId || !pageId) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل ومعرف الصفحة مطلوبان'
      });
    }

    // التحقق من وجود صفحة الفيس بوك
    const facebookPage = await getSharedPrismaClient().facebookPage.findUnique({
      where: { pageId: pageId },
      select: { id: true, companyId: true, pageAccessToken: true }
    });

    if (!facebookPage) {
      return res.status(404).json({
        success: false,
        message: 'صفحة الفيس بوك غير موجودة'
      });
    }

    if (facebookPage.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذه الصفحة'
      });
    }

    // البحث عن الحظر وحذفه
    const blocked = await getSharedPrismaClient().blockedCustomersOnPage.findFirst({
      where: {
        facebookPageId: facebookPage.id,
        customerId: customerId
      },
      include: {
        customer: {
          select: {
            facebookId: true
          }
        }
      }
    });

    if (!blocked) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير محظور على هذه الصفحة'
      });
    }

    // ✅ التواصل مع Facebook API لإلغاء حظر المستخدم من الصفحة مباشرة
    const facebookUserId = blocked.customer?.facebookId || blocked.facebookId;
    let facebookUnblockResult = null;

    if (facebookUserId && facebookPage.pageAccessToken) {
      try {
        console.log(`✅ [FB-API] Unblocking user ${facebookUserId} on Facebook page ${pageId} via Graph API...`);

        // استخدام Facebook Graph API لإلغاء حظر المستخدم
        const fbResponse = await axios.delete(
          `https://graph.facebook.com/${getMetaGraphApiVersion()}/${pageId}/blocked/${facebookUserId}`,
          {
            params: {
              access_token: facebookPage.pageAccessToken
            },
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        facebookUnblockResult = {
          success: true,
          facebookResponse: fbResponse.data
        };
        console.log(`✅ [FB-API] User unblocked successfully on Facebook page`);
      } catch (fbError) {
        console.error(`❌ [FB-API] Error unblocking user on Facebook:`, fbError.response?.data || fbError.message);
        facebookUnblockResult = {
          success: false,
          error: fbError.response?.data || fbError.message
        };
        // نستمر في حذف الحظر من قاعدة البيانات حتى لو فشل Facebook API
      }
    } else {
      console.log(`⚠️ [FB-API] Cannot unblock on Facebook: missing facebookId (${!!facebookUserId}) or pageAccessToken (${!!facebookPage.pageAccessToken})`);
    }

    // حذف الحظر من قاعدة البيانات
    await getSharedPrismaClient().blockedCustomersOnPage.delete({
      where: { id: blocked.id }
    });

    console.log(`✅ [UNBLOCK] Customer ${customerId} unblocked on page ${pageId}`);

    res.json({
      success: true,
      message: 'تم إلغاء حظر العميل على الصفحة بنجاح'
    });
  } catch (error) {
    console.error('❌ Error unblocking customer:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إلغاء حظر العميل',
      error: error.message
    });
  }
};

// 📋 جلب قائمة العملاء المحظورين على صفحة معينة
const getBlockedCustomersOnPage = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { pageId } = req.params;

    if (!pageId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الصفحة مطلوب'
      });
    }

    // التحقق من وجود صفحة الفيس بوك
    const facebookPage = await getSharedPrismaClient().facebookPage.findUnique({
      where: { pageId: pageId },
      select: { id: true, companyId: true }
    });

    if (!facebookPage) {
      return res.status(404).json({
        success: false,
        message: 'صفحة الفيس بوك غير موجودة'
      });
    }

    if (facebookPage.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذه الصفحة'
      });
    }

    // جلب العملاء المحظورين
    const blockedCustomers = await getSharedPrismaClient().blockedCustomersOnPage.findMany({
      where: {
        facebookPageId: facebookPage.id
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            facebookId: true,
            avatar: true
          }
        }
      },
      orderBy: {
        blockedAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: blockedCustomers,
      count: blockedCustomers.length,
      message: `تم جلب ${blockedCustomers.length} عميل محظور`
    });
  } catch (error) {
    console.error('❌ Error fetching blocked customers:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب العملاء المحظورين',
      error: error.message
    });
  }
};

// 🔍 التحقق من حالة حظر عميل على صفحة معينة
const checkCustomerBlockStatus = async (req, res) => {
  console.log('🔍 [BLOCK-CHECK] Entrance - User:', JSON.stringify({ id: req.user?.id, role: req.user?.role, companyId: req.user?.companyId }));
  console.log('🔍 [BLOCK-CHECK] Auth Header:', req.headers.authorization ? 'Bearer token present' : 'No token');
  console.log('🔍 [BLOCK-CHECK] X-Company-Id:', req.headers['x-company-id'] || req.headers['X-Company-Id'] || 'None');
  try {
    const companyId = req.user?.companyId;
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';

    if (!companyId && !isSuperAdmin) {
      console.warn('🚫 [BLOCK-CHECK] Rejected: Missing companyId context');
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { customerId, pageId } = req.query;

    if (!customerId || !pageId) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل ومعرف الصفحة مطلوبان'
      });
    }

    // التحقق من وجود صفحة الفيس بوك
    const facebookPage = await getSharedPrismaClient().facebookPage.findUnique({
      where: { pageId: pageId },
      select: { id: true, companyId: true, pageName: true }
    });

    if (!facebookPage) {
      console.warn(`⚠️ [BLOCK-CHECK] Page not found in database: ${pageId}`);
      return res.status(200).json({
        success: true,
        isBlocked: false,
        message: 'صفحة الفيس بوك غير مسجلة'
      });
    }

    // 🔍 Detailed logging for debugging 403
    console.log(`🔍 [BLOCK-CHECK] Page: ${facebookPage.pageName} (${pageId}), PageCompany: ${facebookPage.companyId}, UserCompany: ${companyId}, isSuperAdmin: ${isSuperAdmin}`);

    // Allow access if:
    // 1. User is Super Admin
    // 2. Page company matches User company
    // 3. Page company is null (unclaimed page - allow check for authenticated user)
    const isOwner = facebookPage.companyId === companyId;
    const isUnclaimed = facebookPage.companyId === null;

    if (!isSuperAdmin && !isOwner && !isUnclaimed) {
      console.warn(`🚫 [BLOCK-CHECK] Access Denied: User ${req.user.id} (Company ${companyId}) attempted to check block status for Page ${pageId} (belongs to Company ${facebookPage.companyId})`);
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذه الصفحة'
      });
    }

    // البحث عن الحظر
    const blocked = await getSharedPrismaClient().blockedCustomersOnPage.findFirst({
      where: {
        facebookPageId: facebookPage.id,
        customerId: customerId
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            facebookId: true
          }
        }
      }
    });

    console.log(`✅ [BLOCK-CHECK] Found block record:`, blocked ? 'YES' : 'NO');

    res.json({
      success: true,
      isBlocked: !!blocked,
      data: blocked || null
    });
  } catch (error) {
    console.error('❌ Error checking block status:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من حالة الحظر',
      error: error.message
    });
  }
};

// جلب طلبات العميل
const getCustomerOrders = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل مطلوب'
      });
    }

    // التحقق من أن العميل ينتمي للشركة
    const customer = await getSharedPrismaClient().customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyId: true, phone: true, phoneNormalized: true }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    if (customer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذا العميل'
      });
    }

    // جلب طلبات العميل (بالربط المباشر بالعميل + بأرقام هاتفه)
    // لأن الطلبات ممكن تكون مسجلة على عميل تاني بنفس الرقم أو كطلب ضيف
    const orderPhone = customer.phoneNormalized || (customer.phone ? require('../utils/phoneNormalization').toCanonicalE164(customer.phone) : null);
    const orders = await getSharedPrismaClient().order.findMany({
      where: {
        companyId: companyId,
        OR: [
          { customerId: customerId },
          ...(orderPhone ? [
            { customerPhone: orderPhone },
            ...(customer.phone ? [{ customerPhone: customer.phone }] : [])
          ] : [])
        ]
      },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // تحويل البيانات للصيغة المطلوبة
    const formattedOrders = orders.map(order => {
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: (order.status || 'PENDING').toLowerCase(),
        total: parseFloat(order.total),
        createdAt: order.createdAt,
        items: order.orderItems.map(item => {
          let image = null;
          try {
            if (item.product?.images) {
              const images = JSON.parse(item.product.images);
              if (Array.isArray(images) && images.length > 0) {
                image = images[0];
              }
            }
          } catch (e) {
            console.warn(`⚠️ [ORDER-ITEM] Failed to parse images for product ${item.product?.id}:`, e.message);
          }

          return {
            name: item.product?.name || 'منتج غير معروف',
            quantity: item.quantity,
            price: parseFloat(item.price),
            image: image
          };
        })
      };
    });

    // جلب طلبات الخدمات الخاصة بالعميل (حسب رقم هاتفه)
    let formattedServiceOrders = [];
    try {
      const phonesToMatch = [customer.phone, customer.phoneNormalized, orderPhone].filter(Boolean);
      const phoneFilters = [];
      for (const p of phonesToMatch) {
        phoneFilters.push({ phone: p });
        const digits = p.replace(/\D/g, '');
        if (digits.length >= 8) {
          phoneFilters.push({ phone: { contains: digits.slice(-8) } });
        }
      }

      if (phoneFilters.length > 0) {
        const serviceOrders = await getSharedPrismaClient().serviceOrder.findMany({
          where: {
            companyId: companyId,
            OR: phoneFilters
          },
          include: {
            service: true
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        });

        formattedServiceOrders = serviceOrders.map(so => {
          let total = so.service?.price ? parseFloat(so.service.price) : 0;
          let paid = 0;
          let remaining = total;
          let paymentStatus = 'UNPAID';
          let invoiceNumber = `SRV-${so.id.slice(-6).toUpperCase()}`;

          if (so.referenceFiles && typeof so.referenceFiles === 'object' && !Array.isArray(so.referenceFiles)) {
            if (so.referenceFiles.payment) {
              total = Number(so.referenceFiles.payment.totalAmount) || total;
              paid = Number(so.referenceFiles.payment.paidAmount) || 0;
              remaining = Number(so.referenceFiles.payment.remainingAmount) || Math.max(0, total - paid);
              paymentStatus = so.referenceFiles.payment.paymentStatus || paymentStatus;
              invoiceNumber = so.referenceFiles.payment.invoiceNumber || invoiceNumber;
            }
          }

          return {
            id: so.id,
            orderNumber: invoiceNumber,
            status: (so.status || 'NEW').toLowerCase(),
            total,
            paid,
            remaining,
            paymentStatus,
            createdAt: so.createdAt,
            type: 'SERVICE',
            serviceName: so.service?.name || 'طلب خدمة',
            serviceCategory: so.service?.category || 'other',
            serviceIcon: so.service?.icon || '🛠️',
            description: so.description,
            items: [{
              name: `${so.service?.icon ? so.service.icon + ' ' : ''}${so.service?.name || 'طلب خدمة'}`,
              quantity: 1,
              price: total,
              image: null
            }]
          };
        });
      }
    } catch (soErr) {
      console.warn('⚠️ [CUSTOMER-ORDERS] Failed to query service orders:', soErr.message);
    }

    // دمج طلبات المتجر وطلبات الخدمات وترتيبها زمنياً من الأحدث للأقدم
    const allOrders = [...formattedOrders, ...formattedServiceOrders].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({
      success: true,
      data: allOrders,
      productOrders: formattedOrders,
      serviceOrders: formattedServiceOrders,
      serviceOrdersCount: formattedServiceOrders.length,
      productOrdersCount: formattedOrders.length
    });
  } catch (error) {
    console.error('❌ Error fetching customer orders:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب طلبات العميل',
      error: error.message
    });
  }
};

// 📊 جلب سجل نشاطات العميل
const getCustomerActivity = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل مطلوب'
      });
    }

    // التحقق من أن العميل ينتمي للشركة
    const customer = await getSharedPrismaClient().customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyId: true }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    if (customer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذا العميل'
      });
    }

    // جلب آخر المحادثات
    const conversations = await getSharedPrismaClient().conversation.findMany({
      where: {
        customerId: customerId,
        companyId: companyId
      },
      select: {
        id: true,
        channel: true,
        lastMessageAt: true,
        createdAt: true
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 10
    });

    // جلب آخر الطلبات
    const orders = await getSharedPrismaClient().order.findMany({
      where: {
        customerId: customerId,
        companyId: companyId
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // دمج النشاطات وترتيبها حسب التاريخ
    const activities = [
      ...conversations.map(conv => ({
        type: 'conversation',
        id: conv.id,
        platform: conv.channel,
        timestamp: conv.lastMessageAt || conv.createdAt,
        data: conv
      })),
      ...orders.map(order => ({
        type: 'order',
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: parseFloat(order.total),
        timestamp: order.createdAt,
        data: order
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('❌ Error fetching customer activity:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب سجل النشاطات',
      error: error.message
    });
  }
};

// 📝 جلب ملاحظات العميل
const getCustomerNotes = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل مطلوب'
      });
    }

    // التحقق من أن العميل ينتمي للشركة
    const customer = await getSharedPrismaClient().customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyId: true }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    if (customer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذا العميل'
      });
    }

    const notes = await getSharedPrismaClient().customerNote.findMany({
      where: { customerId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: notes
    });

  } catch (error) {
    console.error('❌ Error fetching customer notes:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الملاحظات',
      error: error.message
    });
  }
};

// 📝 إضافة ملاحظة جديدة
const addCustomerNote = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const authorId = req.user?.userId || req.user?.id;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { customerId } = req.params;
    const { content } = req.body;

    if (!customerId || !content) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل ونص الملاحظة مطلوبان'
      });
    }

    // التحقق من أن العميل ينتمي للشركة
    const customer = await getSharedPrismaClient().customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyId: true }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    if (customer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذا العميل'
      });
    }

    const note = await getSharedPrismaClient().customerNote.create({
      data: {
        customerId,
        authorId,
        content
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: note,
      message: 'تم إضافة الملاحظة بنجاح'
    });

  } catch (error) {
    console.error('❌ Error adding customer note:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة الملاحظة',
      error: error.message
    });
  }
};

// 🗑️ حذف ملاحظة
const deleteCustomerNote = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.userId || req.user?.id;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { noteId } = req.params;

    const note = await getSharedPrismaClient().customerNote.findUnique({
      where: { id: noteId },
      include: {
        customer: {
          select: { companyId: true }
        }
      }
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'الملاحظة غير موجودة'
      });
    }

    if (note.customer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذه الملاحظة'
      });
    }

    await getSharedPrismaClient().customerNote.delete({
      where: { id: noteId }
    });

    res.json({
      success: true,
      message: 'تم حذف الملاحظة بنجاح'
    });

  } catch (error) {
    console.error('❌ Error deleting customer note:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف الملاحظة',
      error: error.message
    });
  }
};


// تفاصيل العميل الكاملة (للصفحة التفصيلية)
const getCustomerDetails = async (req, res) => {
  try {
    const { customerId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // جلب بيانات العميل مع الإحصائيات
    const customer = await getSharedPrismaClient().customer.findUnique({
      where: { id: customerId },
      include: {
        _count: {
          select: {
            orders: true,
            conversations: true
          }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    if (customer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذا العميل'
      });
    }

    const activeBlockRule = await customerBlocklistService.findActiveRule(
      getSharedPrismaClient(),
      companyId,
      {
        customerId: customer.id,
        phone: customer.phone,
        email: customer.email,
        facebookId: customer.facebookId,
        whatsappId: customer.whatsappId,
      },
    );

    // جلب آخر الطلبات
    const recentOrders = await getSharedPrismaClient().order.findMany({
      where: { customerId, companyId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true
      }
    });

    // جلب آخر المحادثات
    const recentConversations = await getSharedPrismaClient().conversation.findMany({
      where: { customerId, companyId },
      orderBy: { lastMessageAt: 'desc' },
      take: 10,
      select: {
        id: true,
        channel: true,
        status: true,
        lastMessageAt: true,
        createdAt: true
      }
    });

    // جلب الملاحظات
    const notes = await getSharedPrismaClient().customerNote.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    // حساب إجمالي المشتريات
    const ordersAggregate = await getSharedPrismaClient().order.aggregate({
      where: { customerId, companyId },
      _sum: { total: true },
      _count: true
    });

    // بناء الـ Activity Timeline (دمج وترتيب)
    const activities = [
      ...recentOrders.map(o => ({
        type: 'order',
        id: o.id,
        title: `طلب #${o.orderNumber}`,
        status: o.status,
        value: parseFloat(o.total || 0),
        timestamp: o.createdAt
      })),
      ...recentConversations.map(c => ({
        type: 'conversation',
        id: c.id,
        title: `محادثة ${c.channel}`,
        status: c.status,
        timestamp: c.lastMessageAt || c.createdAt
      })),
      ...notes.map(n => ({
        type: 'note',
        id: n.id,
        title: 'ملاحظة',
        content: n.content?.substring(0, 100),
        author: n.author ? `${n.author.firstName} ${n.author.lastName}` : 'غير معروف',
        timestamp: n.createdAt
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20);

    // جلب بيانات الولاء (النقاط)
    const loyaltyRecords = await getSharedPrismaClient().customerLoyaltyRecord.findMany({
      where: { customerId, companyId },
      include: {
        customerLoyaltyProgram: { select: { id: true, name: true, nameAr: true, type: true } },
        customerLoyaltyTier: { select: { id: true, name: true, nameAr: true } }
      }
    });

    // جلب المحفظة والكاش باك
    const wallet = await getSharedPrismaClient().customerWallet.findFirst({
      where: { customerId, isActive: true }
    });

    let cashbackTotal = 0;
    if (wallet) {
      const cbAgg = await getSharedPrismaClient().walletTransaction.aggregate({
        where: { walletId: wallet.id, type: 'CASHBACK' },
        _sum: { amount: true }
      });
      cashbackTotal = parseFloat(cbAgg._sum?.amount || 0);
    }

    // الرد بكل البيانات
    res.json({
      success: true,
      data: {
        customer,
        stats: {
          ordersCount: customer._count?.orders || 0,
          conversationsCount: customer._count?.conversations || 0,
          totalSpent: parseFloat(ordersAggregate._sum?.total || 0),
          averageOrderValue: ordersAggregate._count > 0
            ? parseFloat(ordersAggregate._sum?.total || 0) / ordersAggregate._count
            : 0
        },
        recentOrders,
        recentConversations,
        notes,
        activities,
        customerBlock: {
          isBlocked: Boolean(activeBlockRule),
          rule: activeBlockRule || null
        },
        loyalty: loyaltyRecords.map(r => ({
          programId: r.programId,
          programName: r.customerLoyaltyProgram?.nameAr || r.customerLoyaltyProgram?.name,
          programType: r.customerLoyaltyProgram?.type,
          points: parseFloat(r.currentPoints || 0),
          totalEarned: parseFloat(r.totalEarned || 0),
          tierName: r.customerLoyaltyTier?.nameAr || r.customerLoyaltyTier?.name,
          status: r.status
        })),
        wallet: wallet ? {
          balance: parseFloat(wallet.balance || 0),
          totalEarned: parseFloat(wallet.totalEarned || 0),
          totalSpent: parseFloat(wallet.totalSpent || 0),
          currency: wallet.currency
        } : null,
        cashbackTotal
      }
    });
  } catch (error) {
    console.error('Error fetching customer details:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات العميل',
      error: error.message
    });
  }
};

// 🔍 البحث عن عملاء
const searchCustomers = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { q } = req.query;
    if (!q) {
      return res.json({
        success: true,
        data: [],
        message: 'نص البحث فارغ'
      });
    }

    const customers = await getSharedPrismaClient().customer.findMany({
      where: {
        companyId,
        OR: [
          { phone: { contains: q } },
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { email: { contains: q } }
        ]
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        orders: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            customerAddress: true,
            city: true,
            governorate: true,
            customerName: true,
            customerPhone: true
          }
        }
      }
    });

    const enrichedCustomers = customers.map(c => {
      const lastOrder = c.orders?.[0] || {};
      const { orders, ...rest } = c;
      let parsedAddress = null;
      if (lastOrder.customerAddress) {
        try { parsedAddress = JSON.parse(lastOrder.customerAddress); } catch (e) { parsedAddress = { address: lastOrder.customerAddress }; }
      }
      return {
        ...rest,
        address: parsedAddress?.street || parsedAddress?.address || parsedAddress?.addressLine1 || (typeof lastOrder.customerAddress === 'string' ? lastOrder.customerAddress : null),
        city: lastOrder.city || parsedAddress?.city || null,
        governorate: lastOrder.governorate || parsedAddress?.governorate || null,
        area: parsedAddress?.area || parsedAddress?.city || lastOrder.city || null
      };
    });

    res.json({
      success: true,
      data: enrichedCustomers,
      message: `تم العثور على ${enrichedCustomers.length} عميل`
    });
  } catch (error) {
    console.error('❌ Error searching customers:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في البحث عن العملاء',
      error: error.message
    });
  }
};

/**
 * 🔍 بحث سريع بالرقم — لصفحات الطلب اليدوي والطلب السريع.
 * بيرجّع بيانات العميل (الاسم/رقم الهاتف/الملاحظات) + أحدث عنوان/محافظة
 * من آخر طلب للرقم ده (لأن بيانات العنوان محفوظة على الـ orders مش على الـ customer).
 */
const getCustomerLookupByPhone = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const phone = String(req.params.phone || '').trim();
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف مطلوب'
      });
    }

    const prisma = getSharedPrismaClient();
    const { findCustomerByPhone } = require('../utils/customerIdentity');
    const { stripPhone } = require('../utils/phoneNormalization');

    const digits = stripPhone(phone);
    if (!digits || digits.length < 9) {
      return res.json({ success: true, data: { customer: null, latestOrder: null } });
    }

    // 1) العميل المسجل بنفس الرقم
    const customer = await findCustomerByPhone(prisma, phone, companyId);

    // 2) أحدث طلب بهذا الرقم (عشان العنوان والمحافظة) — بيشمل طلبات الضيوف
    const latestOrder = await prisma.order.findFirst({
      where: {
        companyId,
        OR: [
          ...(customer ? [{ customerId: customer.id }] : []),
          { customerPhone: { contains: digits } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        governorate: true,
        city: true,
        customerAddress: true,
        shippingAddress: true,
        notes: true,
        createdAt: true,
      },
    });

    const orderService = require('../services/orderService');
    const exchangeReturnPolicy = await orderService.getExchangeReturnPolicy(companyId);
    const eligiblePreviousOrders = await orderService.findEligiblePreviousOrders({
      companyId,
      customerId: customer?.id,
      customerPhone: phone,
      policy: exchangeReturnPolicy
    });

    res.json({
      success: true,
      data: {
        customer: customer
          ? {
              id: customer.id,
              firstName: customer.firstName,
              lastName: customer.lastName,
              phone: customer.phone,
              phoneNormalized: customer.phoneNormalized,
              notes: customer.notes,
              tags: customer.tags,
            }
          : null,
        latestOrder: latestOrder
          ? {
              id: latestOrder.id,
              orderNumber: latestOrder.orderNumber,
              customerName: latestOrder.customerName,
              customerPhone: latestOrder.customerPhone,
              governorate: latestOrder.governorate,
              city: latestOrder.city,
              address: latestOrder.customerAddress || latestOrder.shippingAddress || null,
              notes: latestOrder.notes,
              createdAt: latestOrder.createdAt,
            }
          : null,
        eligiblePreviousOrders: eligiblePreviousOrders || [],
        exchangeReturnPolicy,
      },
    });
  } catch (error) {
    console.error('❌ Error in customer lookup by phone:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات العميل',
      error: error.message
    });
  }
};

// 📥 استيراد عملاء من CSV (JSON array)
const importCustomersFromCSV = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const userRole = req.user?.role;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // فقط المديرين يمكنهم الاستيراد
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'COMPANY_ADMIN' && userRole !== 'MANAGER') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك باستيراد العملاء - يتطلب صلاحيات مدير'
      });
    }

    const { customers } = req.body;

    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لا توجد بيانات عملاء للاستيراد'
      });
    }

    // معالجة البيانات وإضافة companyId
    const customersToCreate = customers.map(c => {
      const metadataObj = {
        address: c.address || null,
        city: c.city || null,
        country: c.country || null
      };

      return {
        firstName: c.firstName || c.first_name || c.name?.split(' ')[0] || 'غير معروف',
        lastName: c.lastName || c.last_name || c.name?.split(' ').slice(1).join(' ') || '',
        email: c.email || null,
        phone: c.phone || c.mobile || null,
        phoneNormalized: (c.phone || c.mobile) ? require('../utils/phoneNormalization').toCanonicalE164(c.phone || c.mobile) : null,
        status: c.status || 'LEAD',
        tags: c.tags ? JSON.stringify(c.tags) : '[]',
        notes: c.notes || null,
        metadata: JSON.stringify(metadataObj),
        companyId
      };
    });

    // منع التكرار: نفلتر الأرقام الموجودة بالفعل (phoneNormalized أو الرقم الخام)
    const { buildPhoneWhere } = require('../utils/customerIdentity');
    const existingCustomers = await getSharedPrismaClient().customer.findMany({
      where: { companyId },
      select: { phoneNormalized: true, phone: true }
    });
    const existingNorm = new Set(existingCustomers.map(r => r.phoneNormalized).filter(Boolean));
    const existingRaw = new Set(existingCustomers.map(r => r.phone).filter(Boolean));
    const before = customersToCreate.length;
    const uniqueCustomers = customersToCreate.filter(c => {
      if (c.phoneNormalized && existingNorm.has(c.phoneNormalized)) return false;
      if (c.phone && existingRaw.has(c.phone)) return false;
      return true;
    });
    // نضيف الجدد للـ existing عشان دفعات الاستيراد المتتالية في نفس الطلب ميتكررش الرقم جواهم
    for (const c of uniqueCustomers) {
      if (c.phoneNormalized) existingNorm.add(c.phoneNormalized);
      if (c.phone) existingRaw.add(c.phone);
    }
    const skippedDuplicates = before - uniqueCustomers.length;

    // إنشاء العملاء بالجملة
    const result = await getSharedPrismaClient().customer.createMany({
      data: uniqueCustomers,
      skipDuplicates: true
    });

    console.log(`📥 Imported ${result.count} customers for company ${companyId} (skipped ${skippedDuplicates} existing phones)`);

    // إنشاء محافظ للعملاء الجدد
    try {
      const createdCustomers = await getSharedPrismaClient().customer.findMany({
        where: { companyId },
        select: { id: true }
      });

      for (const customer of createdCustomers) {
        await WalletService.createWallet(customer.id, companyId);
      }

      console.log(`💰 Created wallets for ${createdCustomers.length} customers`);
    } catch (walletError) {
      console.error('❌ Error creating wallets:', walletError);
      // لا نمنع العملية إذا فشلت المحافظ
    }

    res.json({
      success: true,
      importedCount: result.count,
      skippedDuplicates,
      message: skippedDuplicates > 0
        ? `تم استيراد ${result.count} عميل بنجاح وتخطي ${skippedDuplicates} برقم مسجل بالفعل`
        : `تم استيراد ${result.count} عميل بنجاح`
    });
  } catch (error) {
    console.error('❌ Error importing customers:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في استيراد العملاء',
      error: error.message
    });
  }
};

// 🗑️ حذف عميل محدد
const deleteCustomer = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const userRole = req.user?.role;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // فقط المديرين يمكنهم الحذف
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'COMPANY_ADMIN' && userRole !== 'MANAGER' && userRole !== 'OWNER') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بحذف العملاء - يتطلب صلاحيات مدير'
      });
    }

    const { customerId } = req.params;

    // التحقق من وجود العميل وانتمائه للشركة
    const customer = await getSharedPrismaClient().customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyId: true, firstName: true, lastName: true }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    if (customer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بحذف هذا العميل'
      });
    }

    // استخدام Transaction لضمان حذف المتعلقات التي قد تمنع الحذف (مثل المحفظة)
    await getSharedPrismaClient().$transaction(async (tx) => {
      // 1. حذف المحفظة إذا وجدت (بسبب وجود قيد RESTRICT في قاعدة البيانات)
      // نستخدم deleteMany لتجنب الخطأ إذا لم تكن المحفظة موجودة
      await tx.customerWallet.deleteMany({
        where: { customerId: customerId }
      });

      // 2. المتعلقات الأخرى مثل الولاء والأنشطة لتجنب رسالة الخطأ
      const relatedModels = [
        'customerLoyaltyRecord',
        'loyaltyMember',
        'activity',
        'whatsAppNotificationLog',
        'whatsappNotificationLog', // case variation handle
        'affiliateReferral',
        'customerNote',
        'aiInteraction'
      ];
      
      for (const model of relatedModels) {
        if (tx[model]) {
          await tx[model].deleteMany({ 
            where: { customerId: customerId } 
          }).catch(e => { /* Ignore missing or restrictive errors */ });
        }
      }

      // 3. حذف العميل
      await tx.customer.delete({
        where: { id: customerId }
      });
    });

    console.log(`🗑️ Customer ${customer.firstName} ${customer.lastName} deleted by user from company ${companyId}`);

    res.json({
      success: true,
      message: 'تم حذف العميل بنجاح'
    });

  } catch (error) {
    console.error('❌ Error deleting customer:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف العميل',
      error: error.message
    });
  }
};

// 🏷️ تحديث علامات العميل
const updateCustomerTags = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { customerId } = req.params;
    const { tags } = req.body;

    // Validate tags input
    if (!Array.isArray(tags)) {
      return res.status(400).json({ success: false, message: 'الوسوم يجب أن تكون مصفوفة' });
    }
    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.length > 50 || !tag.trim()) {
        return res.status(400).json({ success: false, message: 'كل وسم يجب أن يكون نصاً بين 1 و 50 حرفاً' });
      }
    }

    const prisma = getSharedPrismaClient();
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyId: true, tags: true }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }
    if (customer.companyId !== companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح بتعديل هذا العميل' });
    }

    const tagsString = JSON.stringify(tags);

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: { tags: tagsString }
    });

    // Sync to WhatsAppContact
    if (customer.tags !== tagsString) {
      await prisma.whatsAppContact.updateMany({
        where: { customerId },
        data: { tags: tagsString }
      });
    }

    res.json({ success: true, data: updatedCustomer, message: 'تم تحديث العلامات بنجاح' });

  } catch (error) {
    console.error('❌ Error updating customer tags:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث العلامات', error: error.message });
  }
};



// ✏️ تحديث بيانات العميل
const updateCustomer = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { customerId } = req.params;
    const { firstName, lastName, email, phone, phone2, password, address, city, country, status, notes, birthday, customerRating } = req.body;

    // التحقق من وجود العميل وانتمائه للشركة
    const customer = await getSharedPrismaClient().customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyId: true, metadata: true }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    if (customer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بتعديل هذا العميل'
      });
    }

    // إضافة الحقول في metadata
    let parsedMeta = {};
    if (customer.metadata) {
      try {
        parsedMeta = JSON.parse(customer.metadata);
      } catch (e) {
        console.error('Failed to parse metadata in updateCustomer:', e);
      }
    }
    
    if (birthday !== undefined) {
      if (birthday) {
        parsedMeta.birthday = birthday;
      } else {
        delete parsedMeta.birthday;
      }
    }
    if (address !== undefined) {
      if (address) parsedMeta.address = address;
      else delete parsedMeta.address;
    }
    if (city !== undefined) {
      if (city) parsedMeta.city = city;
      else delete parsedMeta.city;
    }
    if (country !== undefined) {
      if (country) parsedMeta.country = country;
      else delete parsedMeta.country;
    }
    if (phone2 !== undefined) {
      if (phone2) parsedMeta.phone2 = phone2;
      else delete parsedMeta.phone2;
    }

    const newMetadata = Object.keys(parsedMeta).length > 0 ? JSON.stringify(parsedMeta) : null;

    // Hash password if provided
    let hashedPassword = undefined;
    if (password !== undefined) {
      const bcrypt = require('bcryptjs');
      hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    }

    // تحديث بيانات العميل
    const phoneFields = {};
    if (phone !== undefined) {
      const { toCanonicalE164 } = require('../utils/phoneNormalization');
      phoneFields.phone = phone || null;
      phoneFields.phoneNormalized = toCanonicalE164(phone) || null;
    }

    const ratingFields = {};
    if (customerRating !== undefined) {
      const validRatings = {
        EXCELLENT: 'EXCELLENT',
        GOOD: 'GOOD',
        AVERAGE: 'AVERAGE',
        POOR: 'POOR',
        BAD: 'POOR',
        UNKNOWN: 'UNKNOWN'
      };
      const normalized = validRatings[String(customerRating).trim().toUpperCase()];
      if (normalized) {
        ratingFields.customerRating = normalized;
      }
    }

    const updatedCustomer = await getSharedPrismaClient().customer.update({
      where: { id: customerId },
      data: {
        firstName,
        lastName,
        email: email || null,
        ...phoneFields,
        ...ratingFields,
        password: hashedPassword,
        status: status || 'LEAD',
        notes: notes || null,
        metadata: newMetadata,
        updatedAt: new Date()
      }
    });

    // مزامنة رقم الهاتف مع جهات اتصال الواتساب المرتبطة بالعميل
    // حتى يبقى الرقم المدخل يدوياً ثابتاً ولا يرجع للرقم القديم في أي مكان
    if (phone !== undefined && phone) {
      await getSharedPrismaClient().whatsAppContact.updateMany({
        where: { customerId },
        data: { phoneNumber: String(phone).substring(0, 20) }
      }).catch(err => console.error('❌ Failed to sync phone to WhatsAppContacts:', err));
    }

    console.log(`✏️ Customer ${firstName} ${lastName} updated by user from company ${companyId}`);

    res.json({
      success: true,
      data: updatedCustomer,
      message: 'تم تحديث بيانات العميل بنجاح'
    });

  } catch (error) {
    console.error('❌ Error updating customer:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث بيانات العميل',
      error: error.message
    });
  }
};

// ➕ إنشاء عميل جديد
const createCustomer = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { firstName, lastName, email, phone, password, address, city, country, status, notes, tags, metadata } = req.body;

    if (!firstName) {
      return res.status(400).json({
        success: false,
        message: 'الاسم الأول مطلوب'
      });
    }

    // تجهيز حقل metadata ليتضمن العنوان والمدينة والدولة
    let parsedMetadata = {};
    if (metadata) {
      try {
        parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      } catch (e) {
        console.error('Failed to parse metadata in createCustomer:', e);
      }
    }
    
    // دمج الحقول الإضافية
    if (address) parsedMetadata.address = address;
    if (city) parsedMetadata.city = city;
    if (country) parsedMetadata.country = country;

    const hashedPassword = password ? await require('bcryptjs').hash(password, 10) : undefined;

    // منع التكرار: كل رقم موبايل = عميل واحد بس في نفس الشركة
    if (phone) {
      const { findCustomerByPhone } = require('../utils/customerIdentity');
      const existing = await findCustomerByPhone(getSharedPrismaClient(), phone, companyId);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `رقم الموبايل ده مسجل بالفعل لعميل: ${existing.firstName || ''} ${existing.lastName || ''}${existing.email ? ` (${existing.email})` : ''}`
        });
      }
    }

    const newCustomer = await getSharedPrismaClient().customer.create({
      data: {
        firstName,
        lastName: lastName || '',
        email: email || null,
        phone: phone || null,
        phoneNormalized: phone ? require('../utils/phoneNormalization').toCanonicalE164(phone) : null,
        password: hashedPassword,
        status: status || 'LEAD',
        notes: notes || null,
        tags: tags ? JSON.stringify(tags) : '[]',
        metadata: JSON.stringify(parsedMetadata),
        companyId
      }
    });

    // إنشاء محفظة للعميل الجديد
    try {
      await WalletService.createWallet(newCustomer.id, companyId);
    } catch (walletErr) {
      console.error('⚠️ Could not create wallet for new customer:', walletErr.message);
    }

    console.log(`➕ New customer created: ${firstName} ${lastName} in company ${companyId}`);

    res.status(201).json({
      success: true,
      data: newCustomer,
      message: 'تم إنشاء العميل بنجاح'
    });
  } catch (error) {
    console.error('❌ Error creating customer:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'يوجد عميل بنفس البريد الإلكتروني أو رقم الهاتف'
      });
    }
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء العميل',
      error: error.message
    });
  }
};

// 📤 تصدير العملاء كـ CSV
const exportCustomers = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول'
      });
    }

    const format = req.query.format || 'csv';
    const searchQuery = req.query.search || '';
    const statusFilter = req.query.status;

    const where = { companyId };
    if (searchQuery) {
      where.OR = [
        { firstName: { contains: searchQuery } },
        { lastName: { contains: searchQuery } },
        { email: { contains: searchQuery } },
        { phone: { contains: searchQuery } }
      ];
    }
    const validStatuses = ['LEAD', 'ACTIVE', 'INACTIVE', 'BLOCKED'];
    if (statusFilter && statusFilter !== 'all' && validStatuses.includes(statusFilter)) {
      where.status = statusFilter;
    }

    const customers = await getSharedPrismaClient().customer.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 5000
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="customers.json"');
      return res.json(customers);
    }

    // CSV
    const headers = ['ID', 'الاسم الأول', 'اسم العائلة', 'البريد الإلكتروني', 'الهاتف', 'المدينة', 'الدولة', 'الحالة', 'تاريخ الإنشاء'];
    const rows = customers.map(c => {
      let meta = {};
      if (c.metadata) {
        try { meta = JSON.parse(c.metadata); } catch(e) {}
      }
      return [
        c.id,
        c.firstName || '',
        c.lastName || '',
        c.email || '',
        c.phone || '',
        meta.city || '',
        meta.country || '',
        c.status || '',
        c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : ''
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
    res.send('\uFEFF' + csvContent); // BOM for Arabic UTF-8
  } catch (error) {
    console.error('❌ Error exporting customers:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تصدير العملاء',
      error: error.message
    });
  }
};

/**
 * جلب جميع الوسوم الفريدة المستخدمة في عملاء الشركة
 * GET /api/v1/customers/tags/distinct
 */
const getDistinctTags = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح بالوصول' });
    }

    // جلب جميع العملاء اللي عندهم وسوم
    const customersWithTags = await getSharedPrismaClient().customer.findMany({
      where: {
        companyId,
        tags: { not: null }
      },
      select: { tags: true }
    });

    // تجميع الوسوم الفريدة مع العدد
    const tagCountMap = {};
    for (const c of customersWithTags) {
      try {
        const parsed = typeof c.tags === 'string' ? JSON.parse(c.tags) : c.tags;
        if (Array.isArray(parsed)) {
          for (const tag of parsed) {
            if (tag && typeof tag === 'string' && tag.trim()) {
              const normalizedTag = tag.trim();
              tagCountMap[normalizedTag] = (tagCountMap[normalizedTag] || 0) + 1;
            }
          }
        }
      } catch {
        // تجاهل القيم غير الصالحة
      }
    }

    // تحويل إلى مصفوفة مرتبة حسب العدد
    const tags = Object.entries(tagCountMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ success: true, data: tags });
  } catch (error) {
    console.error('❌ Error fetching distinct tags:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الوسوم', error: error.message });
  }
};

/**
 * إعادة تسمية وسم عبر جميع العملاء
 * PUT /api/v1/customers/tags/rename
 */
const renameTag = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح بالوصول' });

    const { oldName, newName } = req.body;
    if (!oldName || !oldName.trim()) return res.status(400).json({ success: false, message: 'اسم الوسم القديم مطلوب' });
    if (!newName || !newName.trim()) return res.status(400).json({ success: false, message: 'اسم الوسم الجديد مطلوب' });

    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();
    if (trimmedOld === trimmedNew) return res.status(400).json({ success: false, message: 'الوسم الجديد مطابق للقديم' });

    const customers = await getSharedPrismaClient().customer.findMany({
      where: { companyId, tags: { not: null } },
      select: { id: true, tags: true }
    });

    let updatedCount = 0;
    const prisma = getSharedPrismaClient();
    for (const c of customers) {
      let tags;
      try { tags = typeof c.tags === 'string' ? JSON.parse(c.tags) : c.tags; } catch { continue; }
      if (!Array.isArray(tags)) continue;

      const idx = tags.indexOf(trimmedOld);
      if (idx === -1) continue;

      tags[idx] = trimmedNew;
      const newTagsStr = JSON.stringify([...new Set(tags)]);
      await prisma.customer.update({
        where: { id: c.id },
        data: { tags: newTagsStr }
      });
      // Sync to WhatsAppContact
      await prisma.whatsAppContact.updateMany({
        where: { customerId: c.id },
        data: { tags: newTagsStr }
      });
      updatedCount++;
    }

    res.json({ success: true, data: { renamed: trimmedOld, to: trimmedNew, customersAffected: updatedCount } });
  } catch (error) {
    console.error('❌ Error renaming tag:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * حذف وسم من جميع العملاء
 * DELETE /api/v1/customers/tags/:tagName
 */
const deleteTag = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح بالوصول' });

    const { tagName } = req.params;
    if (!tagName || !tagName.trim()) return res.status(400).json({ success: false, message: 'اسم الوسم مطلوب' });

    const decodedTag = decodeURIComponent(tagName).trim();

    const customers = await getSharedPrismaClient().customer.findMany({
      where: { companyId, tags: { not: null } },
      select: { id: true, tags: true }
    });

    let updatedCount = 0;
    const prisma = getSharedPrismaClient();
    for (const c of customers) {
      let tags;
      try { tags = typeof c.tags === 'string' ? JSON.parse(c.tags) : c.tags; } catch { continue; }
      if (!Array.isArray(tags)) continue;

      const filtered = tags.filter(t => t !== decodedTag);
      if (filtered.length === tags.length) continue;

      const newTagsStr = JSON.stringify(filtered);
      await prisma.customer.update({
        where: { id: c.id },
        data: { tags: newTagsStr }
      });
      // Sync to WhatsAppContact
      await prisma.whatsAppContact.updateMany({
        where: { customerId: c.id },
        data: { tags: newTagsStr }
      });
      updatedCount++;
    }

    res.json({ success: true, data: { deleted: decodedTag, customersAffected: updatedCount } });
  } catch (error) {
    console.error('❌ Error deleting tag:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllCustomer,
  createCustomer,
  exportCustomers,
  deleteAllConversations,
  deleteAllCustomers,
  blockCustomerOnPage,
  unblockCustomerOnPage,
  getBlockedCustomersOnPage,
  checkCustomerBlockStatus,
  getCustomerOrders,
  getCustomerActivity,
  getCustomerNotes,
  addCustomerNote,
  deleteCustomerNote,
  getCustomerDetails,
  searchCustomers,
  getCustomerLookupByPhone,
  importCustomersFromCSV,
  deleteCustomer,
  updateCustomerTags,
  updateCustomer,
  getDistinctTags,
  renameTag,
  deleteTag,
};
