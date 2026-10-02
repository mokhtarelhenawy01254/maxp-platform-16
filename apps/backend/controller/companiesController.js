const {
  getSharedPrismaClient,
  initializeSharedDatabase,
  executeWithRetry,
} = require("../services/sharedDatabase");
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const { verifyDomainDNS } = require("../utils/dnsUtils");
const {
  invalidateCompanySettingsCache,
  invalidateCompanyDashboardCache,
} = require("../middleware/performanceOptimization");
const {
  generateUniqueCompanySlug,
  ensureCompanySlug,
} = require("../utils/companySlug");
// Role name mapping for display (fallback when roleRef relation is not available)
// ponytail: keep in sync with BUILT_IN_ROLES in seedPermissions.js
const ROLE_DISPLAY_NAMES = {
  OWNER: 'مالك الشركة',
  SUPER_ADMIN: 'مدير النظام',
  COMPANY_ADMIN: 'مدير الشركة',
  MANAGER: 'مدير',
  AGENT: 'موظف',
  AFFILIATE: 'مسوق',
};
const getRoleDisplayName = (roleKey) => ROLE_DISPLAY_NAMES[roleKey] || roleKey;

const CURRENT_COMPANY_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  logo: true,
  slug: true,
  customDomain: true,
  timezone: true,
  settings: true,
  createdAt: true,
  updatedAt: true,

  currency: true,
  isActive: true,
};

const getCurrentCompany = async (req, res) => {
  try {
    console.log("📋 [GET-CURRENT-COMPANY] Request received");
    console.log("📋 [GET-CURRENT-COMPANY] req.user:", req.user);

    // Get company from authenticated user (respecting Super Admin context if set)
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;

    if (!companyId) {
      console.log("❌ [GET-CURRENT-COMPANY] No companyId found in context");
      return res.status(403).json({
        success: false,
        error: "Company context not found",
      });
    }

    let company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: CURRENT_COMPANY_SELECT,
    });

    if (!company) {
      console.log("❌ [GET-CURRENT-COMPANY] Company not found:", companyId);
      return res.status(404).json({
        success: false,
        error: "Company not found",
      });
    }

    company = await ensureCompanySlug(company, {
      prisma: getSharedPrismaClient(),
    });

    console.log("✅ [GET-CURRENT-COMPANY] Company found:", company.name);

    // Parse settings
    let settings = {};
    try {
      settings = company.settings ? JSON.parse(company.settings) : {};
    } catch (error) {
      settings = {};
    }

    // Default settings
    const defaultSettings = {
      currency: "EGP",
      currencySymbol: "جنيه",
      language: "ar",
      timezone: company.timezone || "Africa/Cairo",
      dateFormat: "DD/MM/YYYY",
      numberFormat: "ar-EG",
    };

    const finalSettings = { ...defaultSettings, ...settings };

    res.json({
      success: true,
      data: {
        id: company.id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        address: company.address,
        logo: company.logo || null,
        slug: company.slug || null,
        customDomain: company.customDomain || null,
        timezone: company.timezone,
        currency: company.currency,
        isActive: company.isActive,
        settings: finalSettings,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching current company:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch company data",
    });
  }
};

const REMOVEDDangerousFallbackEndpoint = async (req, res) => {
  // رفض الطلب - لا يوجد fallback
  console.error(
    `❌ [SECURITY] Attempted access to dangerous fallback endpoint: /api/v1/companies/1`,
  );

  return res.status(410).json({
    success: false,
    error: "This endpoint has been removed for security reasons",
    code: "ENDPOINT_REMOVED",
    message: "Please use proper company identification",
  });
};

const companyUsageEndpoint = async (req, res) => {
  try {
    const companyId = req.params.id;

    // Get actual product count from database
    let actualProductCount = 6;
    try {
      actualProductCount = await getSharedPrismaClient().product.count({
        where: { isActive: true },
      });
    } catch (error) {
      //console.log('Could not fetch product count, using default');
    }

    // Ensure all values are numbers and safe
    const safeProductCount = Number(actualProductCount) || 0;
    const productPercentage =
      Number(((safeProductCount / 1000) * 100).toFixed(1)) || 0;
    const storageUsage = 1.2;
    const storageLimit = 10;
    const storagePercentage =
      Number(((storageUsage / storageLimit) * 100).toFixed(1)) || 0;
    const apiUsage = 150;
    const apiLimit = 10000;
    const apiPercentage = Number(((apiUsage / apiLimit) * 100).toFixed(1)) || 0;

    // Create data structure that exactly matches frontend UsageStat interface
    const usageData = {
      // Products usage stat
      products: {
        usage: safeProductCount, // number - what frontend expects
        limit: 1000, // number
        percentage: productPercentage, // number
        unlimited: false, // boolean
        warning: productPercentage > 80, // boolean
        exceeded: productPercentage > 100, // boolean
      },

      // Orders usage stat
      orders: {
        usage: 0, // number
        limit: 5000, // number
        percentage: 0.0, // number
        unlimited: false, // boolean
        warning: false, // boolean
        exceeded: false, // boolean
      },

      // Storage usage stat
      storage: {
        usage: storageUsage, // number (in GB)
        limit: storageLimit, // number (in GB)
        percentage: storagePercentage, // number
        unlimited: false, // boolean
        warning: storagePercentage > 80, // boolean
        exceeded: storagePercentage > 100, // boolean
      },

      // API calls usage stat
      apiCalls: {
        usage: apiUsage, // number
        limit: apiLimit, // number
        percentage: apiPercentage, // number
        unlimited: false, // boolean
        warning: apiPercentage > 80, // boolean
        exceeded: apiPercentage > 100, // boolean
      },
    };

    res.json({
      success: true,
      data: usageData,
    });
  } catch (error) {
    console.error("Error fetching company usage:", error);

    // Return ultra-safe fallback data with same structure
    res.json({
      success: true,
      data: {
        products: {
          usage: 0,
          limit: 1000,
          percentage: 0.0,
          unlimited: false,
          warning: false,
          exceeded: false,
        },
        orders: {
          usage: 0,
          limit: 5000,
          percentage: 0.0,
          unlimited: false,
          warning: false,
          exceeded: false,
        },
        storage: {
          usage: 0,
          limit: 10,
          percentage: 0.0,
          unlimited: false,
          warning: false,
          exceeded: false,
        },
        apiCalls: {
          usage: 0,
          limit: 10000,
          percentage: 0.0,
          unlimited: false,
          warning: false,
          exceeded: false,
        },
      },
    });
  }
};

const mockEndpoint = async (req, res) => {
  try {
    // Get real product count
    let productCount = 6;
    try {
      productCount = await getSharedPrismaClient().product.count({
        where: { isActive: true },
      });
    } catch (error) {
      //console.log('Using default product count');
    }

    res.json({
      success: true,
      data: {
        currentUsage: {
          products: productCount,
          orders: 0,
        },
      },
    });
  } catch (error) {
    console.error("Error in usage mock:", error);
    res.json({
      success: true,
      data: {
        currentUsage: { products: 0, orders: 0 },
      },
    });
  }
};

const safeUsageEndpoint = async (req, res) => {
  try {
    // Get actual counts from database
    let productCount = 0;
    let orderCount = 0;

    try {
      productCount = await getSharedPrismaClient().product.count({
        where: { isActive: true },
      });
      // orderCount = await getSharedPrismaClient().order.count(); // Uncomment when order model exists
    } catch (error) {
      //console.log('Could not fetch counts, using defaults');
    }

    res.json({
      success: true,
      data: {
        products: Number(productCount) || 0,
        orders: Number(orderCount) || 0,
      },
    });
  } catch (error) {
    console.error("Error in safe usage:", error);

    res.status(500).json({
      success: false,
      error: "Failed to fetch usage data",
    });
  }
};

const getCompanyInfoEndpoint = async (req, res) => {
  try {
    const companyId = req.params.id;

    // التحقق من الصلاحية
    const userCompanyId = req.user?.effectiveCompanyId || req.user?.companyId;
    const userRole = req.user?.role;

    if (!userCompanyId && userRole !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "غير مصرح بالوصول",
      });
    }

    // السماح للـ super admin بالوصول لجميع الشركات
    if (userRole !== "SUPER_ADMIN" && companyId !== userCompanyId) {
      return res.status(403).json({
        success: false,
        message: "ليس لديك صلاحية للوصول لهذه الشركة",
      });
    }

    // Get company from database
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: "Company not found",
      });
    }

    // Parse settings
    let settings = {};
    try {
      settings = company.settings ? JSON.parse(company.settings) : {};
    } catch (error) {
      settings = {};
    }

    // Default settings with currency
    const defaultSettings = {
      currency: "EGP",
      currencySymbol: "ج.م",
      language: "ar",
      timezone: company.timezone || "Africa/Cairo",
      dateFormat: "DD/MM/YYYY",
      numberFormat: "ar-EG",
    };

    const finalSettings = { ...defaultSettings, ...settings };

    res.json({
      success: true,
      data: {
        id: company.id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        address: company.address,
        timezone: company.timezone,
        settings: finalSettings,
        currency: finalSettings.currency, // Add currency at root level for compatibility
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching company:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch company data",
    });
  }
};

const updateCompanyCurrency = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { currency } = req.body;

    //console.log(`💰 Updating currency for company ${companyId} to ${currency}`);

    // Validate currency code
    const validCurrencies = ["EGP", "USD", "EUR", "SAR", "AED"];
    if (!validCurrencies.includes(currency)) {
      return res.status(400).json({
        success: false,
        error: "Invalid currency code",
      });
    }

    // Get current company
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: "Company not found",
      });
    }

    // Authorization check: Ensure user has access to this company and proper role
    const userRole = req.user?.role;
    const userCompanyId = req.user?.companyId;

    if (userRole !== "SUPER_ADMIN") {
      if (userCompanyId !== companyId) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized access to this company",
        });
      }

      if (!["COMPANY_ADMIN", "OWNER"].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: "Insufficient permissions to update currency",
        });
      }
    }

    // Parse current settings
    let settings = {};
    try {
      settings = company.settings ? JSON.parse(company.settings) : {};
    } catch (error) {
      settings = {};
    }

    // Update currency in settings
    settings.currency = currency;

    // Update company in database
    const updatedCompany = await getSharedPrismaClient().company.update({
      where: { id: companyId },
      data: {
        settings: JSON.stringify(settings),
      },
    });

    //console.log(`✅ Currency updated successfully for company ${companyId}`);

    res.json({
      success: true,
      message: "Currency updated successfully",
      data: {
        companyId: companyId,
        currency: currency,
      },
    });
  } catch (error) {
    console.error("❌ Error updating currency:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update currency",
    });
  }
};

const getAllCompanies = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      search = "",
      isActive = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // بناء شروط البحث
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (isActive !== "") where.isActive = isActive === "true";

    // حساب التصفح
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    // ترتيب النتائج
    const orderBy = {};
    if (sortBy === "name") {
      orderBy.name = sortOrder;
    } else if (sortBy === "createdAt") {
      orderBy.createdAt = sortOrder;
    } else {
      orderBy.createdAt = "desc";
    }

    // جلب الشركات مع التصفح
    const [companies, totalCount] = await Promise.all([
      getSharedPrismaClient().company.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          _count: {
            select: {
              users: true,
              customers: true,
              products: true,
              orders: true,
              conversations: true,
            },
          },
        },
      }),
      getSharedPrismaClient().company.count({ where }),
    ]);

    // حساب معلومات التصفح
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    res.json({
      success: true,
      message: "تم جلب الشركات بنجاح",
      data: {
        companies,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages,
          hasNext,
          hasPrev,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching companies:", error);
    res.status(500).json({
      success: false,
      message: "فشل في جلب الشركات",
      error: error.message,
    });
  }
};

const getCompanyDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // التحقق من الصلاحية - المستخدم يمكنه فقط الوصول لشركته أو إذا كان super admin
    const userCompanyId = req.user?.effectiveCompanyId || req.user?.companyId;
    const userRole = req.user?.role;

    if (!userCompanyId && userRole !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "غير مصرح بالوصول - معرف الشركة مطلوب",
      });
    }

    // السماح للـ super admin بالوصول لجميع الشركات
    if (userRole !== "SUPER_ADMIN" && id !== userCompanyId) {
      return res.status(403).json({
        success: false,
        message: "ليس لديك صلاحية للوصول لهذه الشركة",
      });
    }

    const company = await getSharedPrismaClient().company.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            users: true,
            customers: true,
            products: true,
            orders: true,
            conversations: true,
          },
        },
      },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "الشركة غير موجودة",
      });
    }

    res.json({
      success: true,
      message: "تم جلب تفاصيل الشركة بنجاح",
      data: company,
    });
  } catch (error) {
    console.error("❌ Error fetching company:", error);
    res.status(500).json({
      success: false,
      message: "فشل في جلب تفاصيل الشركة",
      error: error.message,
    });
  }
};

const createNewCompany = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      website,
      address,
      currency = "EGP",
      isActive = true,
    } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "اسم الشركة والبريد الإلكتروني مطلوبان",
      });
    }

    // Check if email already exists
    const existingCompany = await getSharedPrismaClient().company.findFirst({
      where: { email },
    });

    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: "البريد الإلكتروني مستخدم بالفعل",
      });
    }

    const uniqueSlug = await generateUniqueCompanySlug(name, {
      prisma: getSharedPrismaClient(),
      email,
    });

    // Create new company
    // Extract optional socialProfiles from request body
    const { socialProfiles } = req.body;

    // Validate socialProfiles if provided
    if (socialProfiles) {
      if (!Array.isArray(socialProfiles)) {
        return res.status(400).json({ success: false, message: 'socialProfiles must be an array' });
      }
      if (socialProfiles.length > 5) {
        return res.status(400).json({ success: false, message: 'Maximum of 5 social profiles allowed' });
      }
      const allowedPlatforms = ['instagram', 'facebook', 'tiktok'];
      const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
      for (const profile of socialProfiles) {
        if (!profile.platform || !allowedPlatforms.includes(profile.platform)) {
          return res.status(400).json({ success: false, message: `Invalid platform: ${profile.platform}` });
        }
        if (!profile.url || !urlRegex.test(profile.url)) {
          return res.status(400).json({ success: false, message: `Invalid URL for platform ${profile.platform}` });
        }
      }
    }

    // Transaction to create company and optional social profiles
    const transactionResult = await getSharedPrismaClient().$transaction(async (tx) => {
      // Fetch default sidebar settings from platform settings
      const platformDefaultSidebar = await tx.systemSettings.findUnique({
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

      const createdCompany = await tx.company.create({
        data: {
          name,
          slug: uniqueSlug,
          email,
          phone: phone || null,
          website: website || null,
          address: address || null,
          currency,
          isActive,
          sidebarLayout: defaultSidebarLayout,
          settings: JSON.stringify(initialSettings),
        },
        include: { _count: { select: { users: true, customers: true, products: true, orders: true, conversations: true } } },
      });

      if (socialProfiles && socialProfiles.length) {
        const profileData = socialProfiles.map(p => ({
          platform: p.platform,
          url: p.url,
          companyId: createdCompany.id,
        }));
        await tx.companySocialProfile.createMany({ data: profileData });
      }

      // Fetch the company with social profiles included
      const fullCompany = await tx.company.findUnique({
        where: { id: createdCompany.id },
        include: { socialProfiles: true, _count: { select: { users: true, customers: true, products: true, orders: true, conversations: true } } },
      });
      return fullCompany;
    });

    res.status(201).json({
      success: true,
      message: "تم إنشاء الشركة بنجاح",
      data: transactionResult,
    });
  } catch (error) {
    console.error("❌ Error creating company:", error);
    res.status(500).json({
      success: false,
      message: "فشل في إنشاء الشركة",
      error: error.message,
    });
  }
};

const updateCompany = async (req, res) => {
  try {
    const { companyId: id } = req.params;
    const {
      name,
      email,
      phone,
      website,
      address,
      currency,
      isActive,
      sidebarLayout,
      customDomain,
      slug,
      timezone,
      settings: incomingSettings,
    } = req.body;

    // Non-super-admin users cannot change sensitive fields
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    if (!isSuperAdmin && req.body.isActive !== undefined) {
      return res.status(403).json({
        success: false,
        message: 'لا يمكن تعديل حالة التفعيل. هذا متاح لمدير النظام فقط',
      });
    }

    // Check if company exists
    const existingCompany = await getSharedPrismaClient().company.findUnique({
      where: { id },
    });

    if (!existingCompany) {
      return res.status(404).json({
        success: false,
        message: "الشركة غير موجودة",
      });
    }

    // Check if email is being changed and already exists
    if (email && email !== existingCompany.email) {
      const emailExists = await getSharedPrismaClient().company.findFirst({
        where: {
          email,
          id: { not: id },
        },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "البريد الإلكتروني مستخدم بالفعل",
        });
      }
    }

    // Check if slug is being changed and already exists
    if (slug !== undefined && slug !== existingCompany.slug) {
      if (slug) {
        // Validate slug format
        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(slug)) {
          return res.status(400).json({
            success: false,
            message:
              "الـ slug يجب أن يحتوي على أحرف إنجليزية وأرقام وشرطات فقط",
          });
        }

        // Check if slug already exists
        const slugExists = await getSharedPrismaClient().company.findFirst({
          where: {
            slug,
            id: { not: id },
          },
        });

        if (slugExists) {
          return res.status(400).json({
            success: false,
            message: "هذا الـ slug مستخدم بالفعل",
          });
        }
      }
    }

    // Check if customDomain is being changed and already exists
    if (
      customDomain !== undefined &&
      customDomain !== existingCompany.customDomain
    ) {
      if (customDomain) {
        // Sanitize: Remove protocol and www. prefix
        customDomain = customDomain
          .toLowerCase()
          .replace(/^https?:\/\//, "")
          .replace(/^www\./, "")
          .split("/")[0];

        // Validate domain format (basic validation)
        const domainRegex =
          /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
        if (!domainRegex.test(customDomain)) {
          return res.status(400).json({
            success: false,
            message:
              "صيغة الدومين غير صحيحة. يجب أن يكون مثل: example.com أو www.example.com",
          });
        }

        // Check if domain already exists
        const domainExists = await getSharedPrismaClient().company.findFirst({
          where: {
            customDomain,
            id: { not: id },
          },
        });

        if (domainExists) {
          return res.status(400).json({
            success: false,
            message: "هذا الدومين مستخدم بالفعل من قبل شركة أخرى",
          });
        }
      }
    }

    let mergedSettingsJson;
    if (incomingSettings !== undefined) {
      let existingSettings = {};
      try {
        existingSettings = existingCompany.settings
          ? JSON.parse(existingCompany.settings)
          : {};
      } catch (parseError) {
        existingSettings = {};
      }

      const safeIncomingSettings =
        incomingSettings &&
        typeof incomingSettings === "object" &&
        !Array.isArray(incomingSettings)
          ? incomingSettings
          : {};

      mergedSettingsJson = JSON.stringify({
        ...existingSettings,
        ...safeIncomingSettings,
      });
    }

    // Update company
    const updatedCompany = await getSharedPrismaClient().company.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(name &&
          !existingCompany.slug && {
            slug: name
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "-")
              .replace(/-+/g, "-")
              .replace(/^-|-$/g, ""),
          }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(website !== undefined && { website }),
        ...(address !== undefined && { address }),
        ...(currency && { currency }),
        ...(isActive !== undefined && { isActive }),
        ...(sidebarLayout && { sidebarLayout }),
        ...(customDomain !== undefined && {
          customDomain: customDomain || null,
        }),
        ...(slug !== undefined && { slug: slug || null }),
        ...(timezone && { timezone }),
        ...(mergedSettingsJson !== undefined && {
          settings: mergedSettingsJson,
        }),
      },
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
            products: true,
            orders: true,
            conversations: true,
          },
        },
      },
    });

    if (name && typeof name === "string" && name.trim()) {
      try {
        const sf = await getSharedPrismaClient().storefrontSettings.findUnique({
          where: { companyId: id },
        });
        if (sf) {
          let tokens = sf.designTokens;
          if (typeof tokens === "string") {
            try { tokens = JSON.parse(tokens); } catch (e) { tokens = {}; }
          }
          if (!tokens || typeof tokens !== "object") {
            tokens = {};
          }
          tokens.storeName = name.trim();
          await getSharedPrismaClient().storefrontSettings.update({
            where: { companyId: id },
            data: { designTokens: tokens },
          });
        }
      } catch (sfErr) {
        console.warn("⚠️ Could not auto-sync storefrontSettings storeName on company update:", sfErr);
      }
    }

    invalidateCompanySettingsCache(id);

    res.json({
      success: true,
      message: "تم تحديث الشركة بنجاح",
      data: updatedCompany,
    });
  } catch (error) {
    console.error("❌ Error updating company:", error);
    res.status(500).json({
      success: false,
      message: "فشل في تحديث الشركة",
      error: error.message,
    });
  }
};

const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if company exists
    const existingCompany = await getSharedPrismaClient().company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
            products: true,
            orders: true,
            conversations: true,
          },
        },
      },
    });

    if (!existingCompany) {
      return res.status(404).json({
        success: false,
        message: "الشركة غير موجودة",
      });
    }

    // Check if company has data
    const hasData =
      existingCompany._count.users > 0 ||
      existingCompany._count.customers > 0 ||
      existingCompany._count.products > 0 ||
      existingCompany._count.orders > 0 ||
      existingCompany._count.conversations > 0;

    if (hasData) {
      return res.status(400).json({
        success: false,
        message:
          "لا يمكن حذف الشركة لأنها تحتوي على بيانات. يمكنك إلغاء تفعيلها بدلاً من ذلك.",
      });
    }

    // Delete company
    await getSharedPrismaClient().company.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "تم حذف الشركة بنجاح",
    });
  } catch (error) {
    console.error("❌ Error deleting company:", error);
    res.status(500).json({
      success: false,
      message: "فشل في حذف الشركة",
      error: error.message,
    });
  }
};

// ==================== COMPANY USERS MANAGEMENT ====================

const getCompanyUsers = async (req, res) => {
  const { companyId } = req.params;
  const {
    page = 1,
    limit = 25,
    search = "",
    role = "",
    isActive = "",
    employeeStatus = "", // ✅ Add Employee Status filter
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  try {

    console.log(`👥 [GET-USERS] Fetching users for company: ${companyId}`);
    console.log(
      `📊 [GET-USERS] Filters - search: "${search}", role: "${role}", isActive: "${isActive}", employeeStatus: "${employeeStatus}"`,
    );

    // حساب التصفح
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    // Self-healing: ensure any direct company user has a UserCompany record
    try {
      const missingUsers = await getSharedPrismaClient().user.findMany({
        where: {
          companyId,
          userCompanies: { none: { companyId } },
        },
        select: { id: true, role: true, isActive: true },
        take: 100,
      });
      if (missingUsers.length > 0) {
        const VALID_ROLES = ['OWNER', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'AGENT', 'AFFILIATE'];
        await getSharedPrismaClient().userCompany.createMany({
          data: missingUsers.map((u) => ({
            userId: u.id,
            companyId,
            role: VALID_ROLES.includes(u.role) ? u.role : 'AGENT',
            isActive: u.isActive ?? true,
            isDefault: true,
          })),
          skipDuplicates: true,
        });
      }
    } catch (syncErr) {
      console.warn('⚠️ [GET-USERS] Self-healing sync warning:', syncErr.message);
    }

    // Build user search filter
    const userSearchWhere = {};
    if (search) {
      userSearchWhere.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // Get users from UserCompany table (multi-company support)
    const userCompanyWhere = {
      companyId: companyId,
    };

    // Add role filter if specified
    if (role) {
      userCompanyWhere.role = role;
    }

    // Add isActive / activity filter
    if (isActive === "true") {
      userCompanyWhere.isActive = true;
      userSearchWhere.isActive = true;
    } else if (isActive === "false" || isActive === "inactive") {
      userCompanyWhere.OR = [
        { isActive: false },
        { user: { isActive: false } },
      ];
    } else if (isActive === "never_logged_in") {
      userCompanyWhere.isActive = true;
      userSearchWhere.isActive = true;
      userSearchWhere.lastLoginAt = null;
    } else if (isActive === "active") {
      userCompanyWhere.isActive = true;
      userSearchWhere.isActive = true;
      userSearchWhere.lastLoginAt = { not: null };
    }

    const baseCountWhere = {
      companyId: companyId,
      ...(role ? { role } : {}),
      user: search ? userSearchWhere : undefined,
    };

    // ✅ Fetch users through UserCompany relationship with Employee data
    const [userCompanies, totalCount, activeCount, neverLoggedInCount, inactiveCount] = await Promise.all([
      getSharedPrismaClient().userCompany.findMany({
        where: {
          ...userCompanyWhere,
          user: userSearchWhere,
        },
        skip,
        take: limitNum,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true,
              isActive: true,
              isEmailVerified: true,
              lastLoginAt: true,
              createdAt: true,
              updatedAt: true,
              settings: true,
              // ✅ Include Employee fields directly from User
              employeeNumber: true,
              contractType: true,
              hireDate: true,
              baseSalary: true,
              departmentId: true,
              positionId: true,
              employees: {
                select: {
                  id: true,
                  status: true,
                  employeeNumber: true,
                  terminationDate: true,
                  terminationReason: true,
                  department: { select: { id: true, name: true, color: true } },
                  position: { select: { id: true, title: true } },
                },
              },
              departmentRelation: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
              positionRelation: {
                select: {
                  id: true,
                  title: true,
                  level: true,
                },
              },
            },
          },
          roleRef: { select: { name: true } },
        },
        orderBy: (() => {
          const safeSortOrder = (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder : 'desc';
          const validSortFields = ['createdAt', 'firstName', 'lastName', 'email', 'isActive'];
          if (sortBy === 'createdAt') return { createdAt: safeSortOrder };
          if (sortBy === 'role') return { role: safeSortOrder };
          if (sortBy === 'name') return { user: { firstName: safeSortOrder } };
          if (validSortFields.includes(sortBy)) return { user: { [sortBy]: safeSortOrder } };
          return { createdAt: safeSortOrder };
        })(),
      }),
      getSharedPrismaClient().userCompany.count({
        where: {
          ...userCompanyWhere,
          user: userSearchWhere,
        },
      }),
      getSharedPrismaClient().userCompany.count({
        where: {
          ...baseCountWhere,
          isActive: true,
          user: {
            isActive: true,
            lastLoginAt: { not: null },
          },
        },
      }),
      getSharedPrismaClient().userCompany.count({
        where: {
          ...baseCountWhere,
          isActive: true,
          user: {
            isActive: true,
            lastLoginAt: null,
          },
        },
      }),
      getSharedPrismaClient().userCompany.count({
        where: {
          ...baseCountWhere,
          OR: [
            { isActive: false },
            { user: { isActive: false } },
          ],
        },
      }),
    ]);

    // ✅ Filter by employee status and transform data
    let filteredUserCompanies = userCompanies;
    let actualTotalCount = totalCount;

    // Apply employee status filter in memory (after fetching with include)
    if (employeeStatus) {
      if (employeeStatus === "NO_EMPLOYEE") {
        // Filter for users without Employee data (no employeeNumber)
        filteredUserCompanies = userCompanies.filter(
          (uc) => !uc.user.employeeNumber && !uc.user.employees,
        );
        // Recalculate total count for NO_EMPLOYEE case
        try {
          const countQuery = {
            ...userCompanyWhere,
            user: {
              ...userSearchWhere,
              employeeNumber: null,
              employees: null,
            },
          };
          actualTotalCount = await getSharedPrismaClient().userCompany.count({
            where: countQuery,
          });
        } catch (countError) {
          console.warn("⚠️ [GET-USERS] Error counting NO_EMPLOYEE, using filtered count:", countError.message);
          actualTotalCount = filteredUserCompanies.length;
        }
      } else {
        filteredUserCompanies = userCompanies.filter((uc) => {
          const hasEmployee = uc.user.employeeNumber || uc.user.employees;
          if (!hasEmployee) return false;
          const status = uc.user.employees?.status || (uc.user.isActive ? "ACTIVE" : "INACTIVE");
          if (employeeStatus === "ACTIVE") {
            return status === "ACTIVE" && uc.user.isActive === true;
          } else if (employeeStatus === "INACTIVE") {
            return status !== "ACTIVE" || uc.user.isActive === false;
          } else if (employeeStatus) {
            return status === employeeStatus || uc.user.contractType === employeeStatus;
          }
          return true;
        });
        actualTotalCount = filteredUserCompanies.length;
      }
    }

    console.log(
      `✅ [GET-USERS] Found ${filteredUserCompanies.length} users (total: ${actualTotalCount})`,
    );

    // ✅ FIX: Transform the data to include Employee (HR) information & Activity
    const users = filteredUserCompanies.map((uc) => {
      const hrStatus = uc.user.employees?.status;
      const isHrInactive = hrStatus === 'TERMINATED' || hrStatus === 'RESIGNED' || hrStatus === 'SUSPENDED';
      const effectiveIsActive = Boolean(uc.isActive && uc.user.isActive && !isHrInactive);

      let activityStatus = 'ACTIVE';
      if (!effectiveIsActive) {
        activityStatus = isHrInactive ? (hrStatus === 'SUSPENDED' ? 'SUSPENDED' : 'INACTIVE') : 'INACTIVE';
      } else if (!uc.user.lastLoginAt) {
        activityStatus = 'NEVER_LOGGED_IN';
      } else {
        activityStatus = 'ACTIVE';
      }

      return {
        id: uc.user.id,
        firstName: uc.user.firstName,
        lastName: uc.user.lastName,
        email: uc.user.email,
        phone: uc.user.phone,
        avatar: uc.user.avatar,
        role: uc.role,
        roleId: uc.roleId || null,
        roleName: uc.roleRef?.name || (uc.role ? getRoleDisplayName(uc.role) : null),
        isActive: effectiveIsActive, // Effective activity
        accountIsActive: Boolean(uc.isActive && uc.user.isActive),
        activityStatus, // 'ACTIVE' | 'NEVER_LOGGED_IN' | 'INACTIVE' | 'SUSPENDED'
        isEmailVerified: uc.user.isEmailVerified,
        lastLoginAt: uc.user.lastLoginAt,
        createdAt: uc.user.createdAt,
        updatedAt: uc.user.updatedAt,
        defaultPage: (() => {
          try {
            if (uc.user.settings) {
              const parsed = JSON.parse(uc.user.settings);
              return parsed.defaultPage || "/apps";
            }
          } catch { /* ignore */ }
          return "/apps";
        })(),
        // ✅ Parse settings for assignedApps (per-user app access restriction)
        assignedApps: (() => {
          try {
            if (uc.user.settings) {
              const parsed = JSON.parse(uc.user.settings);
              return Array.isArray(parsed.assignedApps) ? parsed.assignedApps : [];
            }
          } catch { /* ignore */ }
          return [];
        })(),
        // ✅ Include Employee (HR) data from User fields and Employee relation
        employee: (uc.user.employees || uc.user.employeeNumber)
          ? {
              id: uc.user.employees?.id || uc.user.id,
              employeeNumber: uc.user.employees?.employeeNumber || uc.user.employeeNumber,
              status: uc.user.employees?.status || (effectiveIsActive ? "ACTIVE" : "INACTIVE"),
              contractType: uc.user.contractType,
              hireDate: uc.user.hireDate,
              baseSalary: uc.user.baseSalary,
              department: uc.user.employees?.department || uc.user.departmentRelation,
              position: uc.user.employees?.position || uc.user.positionRelation,
            }
          : null,
      };
    });

    // حساب معلومات التصفح (استخدام actualTotalCount بعد الفلترة)
    const totalPages = Math.ceil(actualTotalCount / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    res.json({
      success: true,
      message: "تم جلب المستخدمين بنجاح",
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: actualTotalCount,
          totalPages,
          hasNext,
          hasPrev,
        },
        counts: {
          total: activeCount + neverLoggedInCount + inactiveCount,
          active: activeCount,
          neverLoggedIn: neverLoggedInCount,
          inactive: inactiveCount,
        },
      },
    });
  } catch (error) {
    console.error("❌ [GET-USERS] Error:", error.message);
    console.error("❌ [GET-USERS] Stack:", error.stack);
    console.error("❌ [GET-USERS] CompanyId:", companyId);
    console.error("❌ [GET-USERS] Query:", JSON.stringify({ page, limit, search, role, isActive, employeeStatus, sortBy, sortOrder }));
    if (error.code) console.error("❌ [GET-USERS] Prisma Code:", error.code);
    if (error.meta) console.error("❌ [GET-USERS] Prisma Meta:", JSON.stringify(error.meta));
    res.status(500).json({
      success: false,
      message: "فشل في جلب المستخدمين",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

const getSingleUser = async (req, res) => {
  console.log(`🔍 [GET-SINGLE-USER] ========== REQUEST RECEIVED ==========`);
  console.log(`🔍 [GET-SINGLE-USER] Full URL: ${req.originalUrl}`);
  console.log(`🔍 [GET-SINGLE-USER] Method: ${req.method}`);
  console.log(`🔍 [GET-SINGLE-USER] Params:`, req.params);
  console.log(
    `🔍 [GET-SINGLE-USER] User from token:`,
    req.user
      ? {
          id: req.user.id,
          email: req.user.email,
          companyId: req.user.companyId,
        }
      : "No user",
  );

  try {
    const { companyId, userId } = req.params;

    console.log(
      `👤 [GET-USER] Fetching user ${userId} for company: ${companyId}`,
    );

    // ✅ FIX: Get user from UserCompany table with Employee data
    const userCompany = await getSharedPrismaClient().userCompany.findFirst({
      where: {
        companyId: companyId,
        userId: userId,
      },
      include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true,
              isActive: true,
              isEmailVerified: true,
              lastLoginAt: true,
              createdAt: true,
              updatedAt: true,
              settings: true,
              // ✅ Include Employee fields directly from User
              employeeNumber: true,
            contractType: true,
            hireDate: true,
            baseSalary: true,
            departmentId: true,
            positionId: true,
            departmentRelation: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
            positionRelation: {
              select: {
                id: true,
                title: true,
                level: true,
              },
            },
          },
        },
        roleRef: { select: { name: true } },
      },
    });

    if (!userCompany) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود في هذه الشركة",
      });
    }

    console.log(`✅ [GET-USER] User found: ${userCompany.user.email}`);

    // ✅ FIX: Transform the data to include Employee (HR) information
    const user = {
      id: userCompany.user.id,
      firstName: userCompany.user.firstName,
      lastName: userCompany.user.lastName,
      email: userCompany.user.email,
      phone: userCompany.user.phone,
      avatar: userCompany.user.avatar,
      role: userCompany.role,
      roleId: userCompany.roleId || null,
      roleName: userCompany.roleRef?.name || (userCompany.role ? getRoleDisplayName(userCompany.role) : null),
      isActive: userCompany.isActive,
      isEmailVerified: userCompany.user.isEmailVerified,
      lastLoginAt: userCompany.user.lastLoginAt,
      createdAt: userCompany.user.createdAt,
      updatedAt: userCompany.user.updatedAt,
      // ✅ Parse settings for defaultPage
      defaultPage: (() => {
        try {
          if (userCompany.user.settings) {
            const parsed = JSON.parse(userCompany.user.settings);
            return parsed.defaultPage || "/apps";
          }
        } catch { /* ignore */ }
        return "/apps";
      })(),
      // ✅ Parse settings for assignedApps (per-user app access restriction)
      assignedApps: (() => {
        try {
          if (userCompany.user.settings) {
            const parsed = JSON.parse(userCompany.user.settings);
            return Array.isArray(parsed.assignedApps) ? parsed.assignedApps : [];
          }
        } catch { /* ignore */ }
        return [];
      })(),
      // ✅ Include Employee (HR) data from User fields
      employee: userCompany.user.employeeNumber
        ? {
            id: userCompany.user.id, // Use user.id as employee id
            employeeNumber: userCompany.user.employeeNumber,
            status: userCompany.user.isActive ? "ACTIVE" : "INACTIVE", // Map isActive to status
            contractType: userCompany.user.contractType,
            hireDate: userCompany.user.hireDate,
            department: userCompany.user.departmentRelation,
            position: userCompany.user.positionRelation,
          }
        : null,
    };

    res.json({
      success: true,
      message: "تم جلب المستخدم بنجاح",
      data: user,
    });
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "فشل في جلب المستخدم",
      error: error.message,
    });
  }
};

const createnewUserForCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      isActive = true,
    } = req.body;
    
    const role = req.body.role || "AGENT";
    let roleId = req.body.roleId || null;

    const VALID_ROLE_ENUMS = ["OWNER", "SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "AGENT", "AFFILIATE"];

    if (!roleId && role) {
      let roleRecord = await getSharedPrismaClient().role.findFirst({
        where: {
          key: role,
          OR: [
            { companyId: '__system__', isBuiltIn: true },
            { companyId: null, isBuiltIn: true },
            { companyId },
          ],
        },
      });
      if (!roleRecord && VALID_ROLE_ENUMS.includes(role)) {
        roleRecord = await getSharedPrismaClient().role.findUnique({
          where: {
            key_companyId: {
              key: role,
              companyId: '__system__',
            },
          },
          select: { id: true },
        });
      }
      if (roleRecord) {
        roleId = roleRecord.id;
      }
    }

    const ucRole = VALID_ROLE_ENUMS.includes(role) ? role : "AGENT";

    console.log(
      `👤 [CREATE-USER] Request to create user for company: ${companyId}`,
    );
    console.log(`📧 [CREATE-USER] Email: ${email}, Role: ${role}${roleId ? ` (roleId: ${roleId})` : ""}`);
    console.log(
      `🔐 [CREATE-USER] Requester: ${req.user?.email}, Role: ${req.user?.role}`,
    );

    // Validation
    if (!firstName || !lastName || !email || !password) {
      console.log(
        `❌ [CREATE-USER] Validation failed - missing required fields`,
      );
      return res.status(400).json({
        success: false,
        message: "الاسم الأول والأخير والبريد الإلكتروني وكلمة المرور مطلوبة",
      });
    }

    // Check if company exists
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "الشركة غير موجودة",
      });
    }

    // Check if email already exists
    const existingUser = await getSharedPrismaClient().user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      // المستخدم موجود - نتحقق هل هو موجود في هذه الشركة
      console.log(
        `📧 [CREATE-USER] User exists with email: ${email}, checking company membership...`,
      );

      // Check if user is already in this company (via main companyId or UserCompany)
      const isInCompanyDirectly = existingUser.companyId === companyId;

      const existingMembership =
        await getSharedPrismaClient().userCompany.findUnique({
          where: {
            userId_companyId: {
              userId: existingUser.id,
              companyId: companyId,
            },
          },
        });

      if (isInCompanyDirectly || existingMembership) {
        // المستخدم موجود بالفعل في هذه الشركة
        console.log(`❌ [CREATE-USER] User already exists in this company`);
        return res.status(400).json({
          success: false,
          message: "هذا المستخدم موجود بالفعل في هذه الشركة",
        });
      }

      // إضافة المستخدم الموجود إلى هذه الشركة
      console.log(
        `✅ [CREATE-USER] Adding existing user to company via UserCompany...`,
      );

      await getSharedPrismaClient().userCompany.create({
        data: {
          userId: existingUser.id,
          companyId: companyId,
          role: ucRole,
          roleId: roleId,
          isActive: isActive,
          isDefault: false,
        },
      });

      // 🔔 Special handling for Affiliate role - Create Affiliate record for existing user
      if (role === "AFFILIATE") {
        try {
          const affiliateService = require("../services/affiliateService");
          // Check if already registered as affiliate for this company
          const alreadyAffiliate =
            await getSharedPrismaClient().affiliate.findFirst({
              where: { userId: existingUser.id, companyId: companyId },
            });

          if (!alreadyAffiliate) {
            const affiliate = await affiliateService.registerAffiliate(
              existingUser.id,
              {
                companyId: companyId,
                commissionType: "PERCENTAGE",
                commissionRate: 5.0,
                status: isActive ? "ACTIVE" : "PENDING",
              },
            );
            console.log(
              `✅ [CREATE-USER] Affiliate record created for existing user: ${existingUser.email}, Code: ${affiliate.affiliateCode}`,
            );
          }
        } catch (affError) {
          console.error(
            `⚠️ [CREATE-USER] Failed to create affiliate record for existing user:`,
            affError.message,
          );
        }
      }

      console.log(
        `✅ [CREATE-USER] Existing user ${existingUser.email} added to company ${companyId}`,
      );

      return res.status(201).json({
        success: true,
        message: "تم إضافة المستخدم الموجود إلى الشركة بنجاح",
        data: {
          id: existingUser.id,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          email: existingUser.email,
          phone: existingUser.phone,
          role: role,
          isActive: isActive,
          isExistingUser: true, // علامة أنه مستخدم موجود تم إضافته
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const prisma = getSharedPrismaClient();

    // ✅ Use User table only - Employee fields stored in User table
    const result = await prisma.$transaction(async (tx) => {
      // Get employee count for employeeNumber
      const employeeCount = await tx.user.count({
        where: { companyId: companyId, employeeNumber: { not: null } },
      });
      const employeeNumber = `EMP${String(employeeCount + 1).padStart(5, "0")}`;

      // Extract Employee fields from request body
      const { departmentId, positionId, hireDate, contractType, baseSalary } =
        req.body;

      // 1. Create User with Employee fields
      const newUser = await tx.user.create({
        data: {
          firstName,
          lastName,
          email: email.toLowerCase(),
          password: hashedPassword,
          phone: phone || null,
          role,
          isActive,
          companyId,
          // Employee fields
          employeeNumber: employeeNumber,
          departmentId: departmentId || null,
          positionId: positionId || null,
          hireDate: hireDate ? new Date(hireDate) : new Date(),
          contractType: contractType || "FULL_TIME",
          baseSalary: baseSalary ? parseFloat(baseSalary) : null,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          lastLoginAt: true,
          employeeNumber: true,
          departmentId: true,
          positionId: true,
          hireDate: true,
          contractType: true,
          baseSalary: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // 2. Create UserCompany record
      await tx.userCompany.create({
        data: {
          userId: newUser.id,
          companyId: companyId,
          role: ucRole,
          roleId: roleId,
          isActive: isActive,
          isDefault: true,
        },
      });

      // 3. Special handling for Affiliate role - Create Affiliate record
      if (role === "AFFILIATE") {
        try {
          const affiliateService = require("../services/affiliateService");
          const affiliate = await affiliateService.registerAffiliate(
            newUser.id,
            {
              companyId: companyId,
              commissionType: "PERCENTAGE",
              commissionRate: 5.0, // Default 5%
              status: isActive ? "ACTIVE" : "PENDING",
            },
          );
          console.log(
            `✅ [CREATE-USER] Affiliate record created for user: ${newUser.email}, Code: ${affiliate.affiliateCode}`,
          );
        } catch (affiliateError) {
          console.error(
            `⚠️ [CREATE-USER] Failed to create affiliate record:`,
            affiliateError.message,
          );
          // We don't fail the whole transaction because the user is already created
          // but we log it for debugging
        }
      }

      console.log(
        `✅ [CREATE-USER] User created with Employee fields: ${newUser.email}, Employee Number: ${employeeNumber}`,
      );

      return { user: newUser };
    });

    res.status(201).json({
      success: true,
      message: "تم إنشاء المستخدم بنجاح",
      data: result.user,
    });
  } catch (error) {
    console.error("❌ Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "فشل في إنشاء المستخدم",
      error: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      password, // ✅ Add password support
      role,
      isActive,
      // ✅ Add employee fields support
      departmentId,
      positionId,
      hireDate,
      contractType,
      baseSalary,
      settings, // ✅ Add user settings support (e.g., defaultPage)
    } = req.body;

    console.log(
      `👤 [UPDATE-USER] Updating user ${userId} in company ${companyId}`,
    );
    console.log(`📝 [UPDATE-USER] Fields to update:`, {
      firstName,
      lastName,
      email,
      phone,
      hasPassword: !!password,
      role,
      isActive,
      departmentId,
      positionId,
      contractType,
    });

    // ✅ FIX: Check if user exists in company via UserCompany table
    const userCompany = await getSharedPrismaClient().userCompany.findFirst({
      where: {
        userId: userId,
        companyId: companyId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!userCompany) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود في هذه الشركة",
      });
    }

    // Check if email is being changed and already exists
    if (email && email.toLowerCase() !== userCompany.user.email) {
      const emailExists = await getSharedPrismaClient().user.findFirst({
        where: {
          email: email.toLowerCase(),
          id: { not: userId },
        },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "البريد الإلكتروني مستخدم بالفعل",
        });
      }
    }

    // ✅ Hash password if provided
    let hashedPassword = null;
    if (password && password.trim()) {
      hashedPassword = await bcrypt.hash(password, 12);
      console.log(
        `🔐 [UPDATE-USER] Password will be updated for user ${userId}`,
      );
    }

    // ✅ Merge settings if provided (e.g., defaultPage)
    let mergedSettings = undefined;
    if (settings && typeof settings === 'object') {
      const existingUser = await getSharedPrismaClient().user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });
      let current = {};
      if (existingUser?.settings) {
        try { current = JSON.parse(existingUser.settings); } catch { current = {}; }
      }
      mergedSettings = { ...current, ...settings };
    }

    // ✅ FIX: Update user and UserCompany record
    const updatedUser = await getSharedPrismaClient().user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email: email.toLowerCase() }),
        ...(phone !== undefined && { phone }),
        ...(hashedPassword && { password: hashedPassword }), // ✅ Update password if provided
        // NOTE: Global User.isActive must NEVER be mutated from company-scoped controller.
        // Tenant admins only toggle membership status on UserCompany (updated below).
        // ✅ Update employee fields
        ...(departmentId !== undefined && {
          departmentId: departmentId || null,
        }),
        ...(positionId !== undefined && { positionId: positionId || null }),
        ...(hireDate && { hireDate: new Date(hireDate) }),
        ...(contractType && { contractType }),
        ...(baseSalary !== undefined && {
          baseSalary: baseSalary ? parseFloat(baseSalary) : null,
        }),
        ...(mergedSettings !== undefined && { settings: JSON.stringify(mergedSettings) }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        // ✅ Include Employee fields directly from User
        employeeNumber: true,
        contractType: true,
        hireDate: true,
        baseSalary: true,
        departmentId: true,
        positionId: true,
        departmentRelation: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        positionRelation: {
          select: {
            id: true,
            title: true,
            level: true,
          },
        },
      },
    });

    // ✅ FIX: Update UserCompany record (role and isActive are stored here)
    if (role !== undefined || isActive !== undefined) {
      try {
        const ucData = {};

        if (isActive !== undefined) {
          ucData.isActive = isActive;
        }

        if (role) {
          const VALID_ROLE_ENUMS = ['OWNER', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'AGENT', 'AFFILIATE'];

          if (VALID_ROLE_ENUMS.includes(role)) {
            ucData.role = role;
          }

          let roleRecord = await getSharedPrismaClient().role.findFirst({
            where: {
              key: role,
              OR: [
                { companyId: '__system__', isBuiltIn: true },
                { companyId: null, isBuiltIn: true },
                { companyId },
              ],
            },
            select: { id: true },
          });

          if (!roleRecord && VALID_ROLE_ENUMS.includes(role)) {
            roleRecord = await getSharedPrismaClient().role.findUnique({
              where: {
                key_companyId: {
                  key: role,
                  companyId: '__system__',
                },
              },
              select: { id: true },
            });
          }

          if (roleRecord) {
            ucData.roleId = roleRecord.id;
          } else if (VALID_ROLE_ENUMS.includes(role)) {
            const newRole = await getSharedPrismaClient().role.upsert({
              where: {
                key_companyId: {
                  key: role,
                  companyId: '__system__',
                },
              },
              update: {},
              create: {
                key: role,
                name: getRoleDisplayName(role),
                companyId: '__system__',
                isBuiltIn: true,
                isActive: true,
                priority: 0,
              },
            });
            // Sync all active permissions so the role isn't empty (edge case: missing seed)
            const allPerms = await getSharedPrismaClient().permission.findMany({
              where: { isActive: true },
              select: { id: true },
            });
            if (allPerms.length > 0) {
              await getSharedPrismaClient().rolePermission.createMany({
                data: allPerms.map(p => ({ roleId: newRole.id, permissionId: p.id })),
                skipDuplicates: true,
              });
            }
            ucData.roleId = newRole.id;
            console.log(`✅ [UPDATE-USER] Auto-resolved built-in Role record for "${role}" → ${newRole.id}`);
          } else {
            const newRole = await getSharedPrismaClient().role.create({
              data: { key: role, name: role, companyId, isBuiltIn: false, isActive: true, priority: 0 },
            });
            ucData.roleId = newRole.id;
            console.log(`✅ [UPDATE-USER] Auto-created custom Role record for "${role}"`);
          }
        }

        await getSharedPrismaClient().userCompany.updateMany({
          where: { userId, companyId },
          data: ucData,
        });
        console.log(
          `✅ [UPDATE-USER] UserCompany record updated for user: ${updatedUser.email}`,
        );

        // 🔔 Special handling for Affiliate role - Ensure Affiliate record exists
        if (role === "AFFILIATE") {
          try {
            const affiliateService = require("../services/affiliateService");
            const existingAffiliate =
              await getSharedPrismaClient().affiliate.findFirst({
                where: {
                  userId: userId,
                  companyId: companyId,
                },
              });

            if (!existingAffiliate) {
              const affiliate = await affiliateService.registerAffiliate(
                userId,
                {
                  companyId: companyId,
                  commissionType: "PERCENTAGE",
                  commissionRate: 5.0,
                  status: isActive !== false ? "ACTIVE" : "INACTIVE",
                },
              );
              console.log(
                `✅ [UPDATE-USER] Affiliate record created for user: ${updatedUser.email}, Code: ${affiliate.affiliateCode}`,
              );
            }
          } catch (affError) {
            console.error(
              `⚠️ [UPDATE-USER] Failed to ensure affiliate record:`,
              affError.message,
            );
          }
        }
      } catch (ucError) {
        console.warn(
          `⚠️ [UPDATE-USER] Failed to update UserCompany record:`,
          ucError.message,
        );
        return res.status(500).json({
          success: false,
          message: "فشل في تحديث صلاحية المستخدم",
          error: ucError.message,
        });
      }
    }

    // ✅ FIX: Re-fetch user with updated UserCompany and Employee data
    const userCompanyAfterUpdate =
      await getSharedPrismaClient().userCompany.findFirst({
        where: {
          userId: userId,
          companyId: companyId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true,
              isEmailVerified: true,
              lastLoginAt: true,
              createdAt: true,
              updatedAt: true,
              settings: true,
              // ✅ Include Employee fields directly from User
              employeeNumber: true,
              contractType: true,
              hireDate: true,
              baseSalary: true,
              departmentId: true,
              positionId: true,
              departmentRelation: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
              positionRelation: {
                select: {
                  id: true,
                  title: true,
                  level: true,
                },
              },
            },
          },
          roleRef: { select: { name: true } },
        },
      });

    const finalUser = {
      id: userCompanyAfterUpdate.user.id,
      firstName: userCompanyAfterUpdate.user.firstName,
      lastName: userCompanyAfterUpdate.user.lastName,
      email: userCompanyAfterUpdate.user.email,
      phone: userCompanyAfterUpdate.user.phone,
      avatar: userCompanyAfterUpdate.user.avatar,
      role: userCompanyAfterUpdate.role,
      roleId: userCompanyAfterUpdate.roleId || null,
      roleName: userCompanyAfterUpdate.roleRef?.name || (userCompanyAfterUpdate.role ? getRoleDisplayName(userCompanyAfterUpdate.role) : null),
      isActive: userCompanyAfterUpdate.isActive, // From UserCompany
      isEmailVerified: userCompanyAfterUpdate.user.isEmailVerified,
      lastLoginAt: userCompanyAfterUpdate.user.lastLoginAt,
      createdAt: userCompanyAfterUpdate.user.createdAt,
      updatedAt: userCompanyAfterUpdate.user.updatedAt,
      defaultPage: (() => {
        try {
          if (userCompanyAfterUpdate.user.settings) {
            const parsed = JSON.parse(userCompanyAfterUpdate.user.settings);
            return parsed.defaultPage || "/apps";
          }
        } catch { /* ignore */ }
        return "/apps";
      })(),
      assignedApps: (() => {
        try {
          if (userCompanyAfterUpdate.user.settings) {
            const parsed = JSON.parse(userCompanyAfterUpdate.user.settings);
            return Array.isArray(parsed.assignedApps) ? parsed.assignedApps : [];
          }
        } catch { /* ignore */ }
        return [];
      })(),
      employee: userCompanyAfterUpdate.user.employeeNumber
        ? {
            id: userCompanyAfterUpdate.user.id, // Use user.id as employee id
            employeeNumber: userCompanyAfterUpdate.user.employeeNumber,
            status: userCompanyAfterUpdate.user.isActive
              ? "ACTIVE"
              : "INACTIVE", // Map isActive to status
            contractType: userCompanyAfterUpdate.user.contractType,
            hireDate: userCompanyAfterUpdate.user.hireDate,
            baseSalary: userCompanyAfterUpdate.user.baseSalary,
            department: userCompanyAfterUpdate.user.departmentRelation,
            position: userCompanyAfterUpdate.user.positionRelation,
          }
        : null,
    };

    res.json({
      success: true,
      message: "تم تحديث المستخدم بنجاح",
      data: finalUser,
    });
  } catch (error) {
    console.error("❌ Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "فشل في تحديث المستخدم",
      error: error.message,
    });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { firstName, lastName, phone, avatar, timezone } = req.body;

    console.log(`👤 [UPDATE-PROFILE] User ${userId} updating profile`);

    // Check if user exists
    const existingUser = await getSharedPrismaClient().user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود",
      });
    }

    // Update user profile
    const updatedUser = await getSharedPrismaClient().user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(avatar !== undefined && { avatar }),
        ...(timezone !== undefined && { timezone }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatar: true,
        timezone: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log(
      `✅ [UPDATE-PROFILE] Profile updated successfully for user ${userId}`,
    );

    res.json({
      success: true,
      message: "تم تحديث الملف الشخصي بنجاح",
      data: updatedUser,
    });
  } catch (error) {
    console.error("❌ Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "فشل في تحديث الملف الشخصي",
      error: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    // Handle both :companyId and :id parameter names from different routes
    const companyId = req.params.companyId || req.params.id;
    const userId = req.params.userId;
    console.log(
      `🗑️ [DELETE-USER] Attempting to delete user ${userId} from company ${companyId}`,
    );

    // Check if user exists and belongs to company
    const existingUser = await getSharedPrismaClient().userCompany.findFirst({
      where: {
        userId: userId,
        companyId: companyId,
      },
      include: {
        user: true,
      },
    });

    if (!existingUser) {
      console.log(`❌ [DELETE-USER] User not found in company`);
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود",
      });
    }

    console.log(
      `✅ [DELETE-USER] User found. Role in company: ${existingUser.role}, Global Role: ${existingUser.user.role}`,
    );
    console.log(
      `📋 [DELETE-USER] Full user data:`,
      JSON.stringify(
        {
          userCompanyRole: existingUser.role,
          globalRole: existingUser.user.role,
          userId: existingUser.userId,
          companyId: existingUser.companyId,
          userEmail: existingUser.user.email,
        },
        null,
        2,
      ),
    );

    // Check if user has other company memberships or is a SUPER_ADMIN first
    console.log(`🔍 [DELETE-USER] Checking for other memberships...`);
    const otherMemberships = await getSharedPrismaClient().userCompany.count({
      where: {
        userId: userId,
        companyId: { not: companyId },
      },
    });

    const isSuperAdmin = existingUser.user.role === "SUPER_ADMIN";
    console.log(
      `📊 [DELETE-USER] Other memberships: ${otherMemberships}, Is Super Admin: ${isSuperAdmin}`,
    );
    console.log(`🔍 [DELETE-USER] Checking conditions:`);
    console.log(
      `   - existingUser.role === 'OWNER': ${existingUser.role === "OWNER"}`,
    );
    console.log(
      `   - existingUser.user.role === 'OWNER': ${existingUser.user.role === "OWNER"}`,
    );
    console.log(
      `   - existingUser.user.role === 'SUPER_ADMIN': ${existingUser.user.role === "SUPER_ADMIN"}`,
    );
    console.log(`   - isSuperAdmin: ${isSuperAdmin}`);

    // 🛡️ SECURITY FIX: Prevent deleting the OWNER account UNLESS they are a SUPER_ADMIN or have other memberships
    if (
      existingUser.role === "OWNER" &&
      !isSuperAdmin &&
      otherMemberships === 0
    ) {
      console.log(
        `❌ [DELETE-USER] Cannot delete OWNER with no other memberships`,
      );
      return res.status(403).json({
        success: false,
        message: "لا يمكن حذف مالك الشركة. يجب نقل الملكية أولاً.",
        code: "OWNER_DELETION_FORBIDDEN",
      });
    }

    // Also check the user's global role (but allow if SUPER_ADMIN or has other memberships)
    if (
      existingUser.user.role === "OWNER" &&
      !isSuperAdmin &&
      otherMemberships === 0
    ) {
      console.log(
        `❌ [DELETE-USER] Cannot delete global OWNER with no other memberships`,
      );
      return res.status(403).json({
        success: false,
        message: "لا يمكن حذف حساب المالك الرئيسي.",
        code: "OWNER_DELETION_FORBIDDEN",
      });
    }

    // If user is OWNER but has other memberships or is SUPER_ADMIN, allow deletion
    if (
      (existingUser.role === "OWNER" || existingUser.user.role === "OWNER") &&
      (isSuperAdmin || otherMemberships > 0)
    ) {
      console.log(
        `✅ [DELETE-USER] User is OWNER but has other memberships (${otherMemberships}) or is SUPER_ADMIN, allowing deletion`,
      );
    }

    // Check if user is the only COMPANY_ADMIN (but allow deletion if they're a SUPER_ADMIN or have other memberships)
    if (
      existingUser.role === "COMPANY_ADMIN" &&
      !isSuperAdmin &&
      otherMemberships === 0
    ) {
      console.log(`🔍 [DELETE-USER] Checking if user is the last admin...`);
      const adminCount = await getSharedPrismaClient().userCompany.count({
        where: {
          companyId: companyId,
          role: "COMPANY_ADMIN",
          isActive: true,
        },
      });
      console.log(`📊 [DELETE-USER] Admin count: ${adminCount}`);

      if (adminCount <= 1) {
        console.log(
          `❌ [DELETE-USER] Cannot delete last admin (not a super admin and no other memberships)`,
        );
        return res.status(400).json({
          success: false,
          message: "لا يمكن حذف آخر مدير للشركة",
        });
      }
    } else if (
      existingUser.role === "COMPANY_ADMIN" &&
      (isSuperAdmin || otherMemberships > 0)
    ) {
      console.log(
        `✅ [DELETE-USER] User is COMPANY_ADMIN but is SUPER_ADMIN or has other memberships (${otherMemberships}), allowing deletion even if last admin`,
      );
    }

    // If user has other memberships or is a super admin, only delete the UserCompany relationship
    // Otherwise, delete the entire user account
    if (otherMemberships > 0 || isSuperAdmin) {
      console.log(
        `🔄 [DELETE-USER] Removing user from company only (keeping user account)`,
      );
      // Only remove from this company
      const deleteResult = await getSharedPrismaClient().userCompany.deleteMany(
        {
          where: {
            userId: userId,
            companyId: companyId,
          },
        },
      );
      console.log(
        `✅ [DELETE-USER] Deleted ${deleteResult.count} UserCompany record(s)`,
      );

      // Invalidate all tokens for this user to force re-login with updated company list
      try {
        await getSharedPrismaClient().user.update({
          where: { id: userId },
          data: {
            updatedAt: new Date(), // This will help identify stale tokens
          },
        });
        console.log(`🔄 [DELETE-USER] User updated to invalidate old tokens`);
      } catch (err) {
        console.log(
          `⚠️ [DELETE-USER] Could not update user timestamp: ${err.message}`,
        );
      }
    } else {
      console.log(`🗑️ [DELETE-USER] Deleting entire user account`);
      // Delete the entire user account (no other memberships)
      await getSharedPrismaClient().user.delete({
        where: { id: userId },
      });
      console.log(`✅ [DELETE-USER] User account deleted`);
    }

    // 🔄 تحرير العهدة المرتبطة بالمستخدم في هذه الشركة
    try {
      const released = await getSharedPrismaClient().asset.updateMany({
        where: { companyId, assignedToId: userId },
        data: { assignedToId: null, status: "AVAILABLE" },
      });
      if (released.count > 0) {
        console.log(
          `✅ [DELETE-USER] Released ${released.count} assets assigned to user ${userId}`,
        );
      }
    } catch (err) {
      console.warn(
        `⚠️ [DELETE-USER] Failed to release assets for user ${userId}:`,
        err.message,
      );
    }

    console.log(`✅ [DELETE-USER] Operation completed successfully`);
    res.json({
      success: true,
      message: "تم حذف المستخدم بنجاح. يجب على المستخدم تسجيل الدخول مرة أخرى.",
    });
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "فشل في حذف المستخدم",
      error: error.message,
    });
  }
};

// ==================== ROLES & PERMISSIONS MANAGEMENT ====================

const createCustomRole = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { name, description, permissions, isActive = true } = req.body;

    // Validation
    if (!name || !description || !permissions || !Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: "اسم الدور والوصف والصلاحيات مطلوبة",
      });
    }

    // Check if company exists
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "الشركة غير موجودة",
      });
    }

    // For now, we'll store custom roles in company settings
    // In a real app, you'd create a separate roles table
    const currentSettings = company.settings
      ? JSON.parse(company.settings)
      : {};
    const customRoles = currentSettings.customRoles || {};

    // Generate role key
    const roleKey = `CUSTOM_${name.toUpperCase().replace(/\s+/g, "_")}`;

    // Check if role already exists
    if (customRoles[roleKey]) {
      return res.status(400).json({
        success: false,
        message: "دور بهذا الاسم موجود بالفعل",
      });
    }

    // Add new role
    customRoles[roleKey] = {
      name,
      description,
      permissions,
      isActive,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    // Update company settings
    await getSharedPrismaClient().company.update({
      where: { id: companyId },
      data: {
        settings: JSON.stringify({
          ...currentSettings,
          customRoles,
        }),
      },
    });

    res.status(201).json({
      success: true,
      message: "تم إنشاء الدور بنجاح",
      data: {
        key: roleKey,
        ...customRoles[roleKey],
      },
    });
  } catch (error) {
    console.error("❌ Error creating role:", error);
    res.status(500).json({
      success: false,
      message: "فشل في إنشاء الدور",
      error: error.message,
    });
  }
};

const getCompanyRoles = async (req, res) => {
  try {
    const { companyId } = req.params;

    // Try to read from new Role table first
    try {
      const dbRoles = await getSharedPrismaClient().role.findMany({
        where: {
          OR: [
            { companyId: '__system__', isBuiltIn: true },
            { companyId },
          ],
          isActive: true,
        },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
        orderBy: { priority: 'desc' },
      });

      if (dbRoles && dbRoles.length > 0) {
        const allRoles = {};
        for (const role of dbRoles) {
          allRoles[role.key] = {
            id: role.id,
            name: role.name,
            description: role.description,
            permissions: role.permissions.map(rp => ({
              key: rp.permission.key,
              name: rp.permission.name,
              domain: rp.permission.domain,
            })),
            isBuiltIn: role.isBuiltIn,
            isSystem: role.isSystem,
            isActive: role.isActive,
            priority: role.priority,
            companyId: role.companyId,
          };
        }
        return res.json({ success: true, data: allRoles });
      }
    } catch (dbError) {
      // Role table might not exist yet (pre-migration)
      if (process.env.NODE_ENV === 'development') {
        console.debug('[ROLES] Role table not available, using fallback:', dbError.message?.substring(0, 100));
      }
    }

    // Fallback: read from Company.settings JSON (legacy)
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "الشركة غير موجودة",
      });
    }

    const builtInRoles = {
      OWNER: {
        name: "مالك الشركة",
        description: "صلاحيات كاملة وغير محدودة",
        permissions: ["إدارة المستخدمين", "إدارة الأدوار", "إدارة المنتجات", "مشاهدة المنتجات", "إدارة العملاء", "مشاهدة العملاء", "إدارة الطلبات", "مشاهدة الطلبات", "مشاهدة التقارير", "إدارة التقارير", "إدارة الإعدادات", "إدارة التكاملات", "إدارة المحادثات", "مشاهدة المحادثات", "إدارة الخطة والاشتراك"],
        isBuiltIn: true,
        isActive: true,
      },
      COMPANY_ADMIN: {
        name: "مدير الشركة",
        description: "صلاحيات كاملة لإدارة الشركة والمستخدمين",
        permissions: ["إدارة المستخدمين", "إدارة الأدوار", "إدارة المنتجات", "إدارة العملاء", "إدارة الطلبات", "مشاهدة التقارير", "إدارة الإعدادات", "إدارة التكاملات"],
        isBuiltIn: true,
        isActive: true,
      },
      MANAGER: {
        name: "مدير",
        description: "صلاحيات إدارية محدودة",
        permissions: ["إدارة المنتجات", "إدارة العملاء", "إدارة الطلبات", "التجهيز", "مشاهدة التقارير"],
        isBuiltIn: true,
        isActive: true,
      },
      AGENT: {
        name: "موظف",
        description: "صلاحيات أساسية للعمل اليومي",
        permissions: ["إدارة العملاء", "إدارة الطلبات", "التجهيز", "مشاهدة المنتجات"],
        isBuiltIn: true,
        isActive: true,
      },
    };

    const settings = company.settings ? JSON.parse(company.settings) : {};
    const customRoles = settings.customRoles || {};

    res.json({
      success: true,
      message: "تم جلب الأدوار بنجاح",
      data: { ...builtInRoles, ...customRoles },
    });
  } catch (error) {
    console.error("❌ Error fetching roles:", error);
    res.status(500).json({
      success: false,
      message: "فشل في جلب الأدوار",
      error: error.message,
    });
  }
};

const updateCustomRole = async (req, res) => {
  try {
    const { companyId, roleKey } = req.params;
    const { name, description, permissions, isActive } = req.body;

    // Check if it's a built-in role
    if (["COMPANY_ADMIN", "MANAGER", "AGENT"].includes(roleKey)) {
      return res.status(400).json({
        success: false,
        message: "لا يمكن تعديل الأدوار الأساسية",
      });
    }

    // Get company
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "الشركة غير موجودة",
      });
    }

    const settings = company.settings ? JSON.parse(company.settings) : {};
    const customRoles = settings.customRoles || {};

    if (!customRoles[roleKey]) {
      return res.status(404).json({
        success: false,
        message: "الدور غير موجود",
      });
    }

    // Update role
    customRoles[roleKey] = {
      ...customRoles[roleKey],
      ...(name && { name }),
      ...(description && { description }),
      ...(permissions && { permissions }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: new Date().toISOString(),
    };

    // Update company settings
    await getSharedPrismaClient().company.update({
      where: { id: companyId },
      data: {
        settings: JSON.stringify({
          ...settings,
          customRoles,
        }),
      },
    });

    res.json({
      success: true,
      message: "تم تحديث الدور بنجاح",
      data: {
        key: roleKey,
        ...customRoles[roleKey],
      },
    });
  } catch (error) {
    console.error("❌ Error updating role:", error);
    res.status(500).json({
      success: false,
      message: "فشل في تحديث الدور",
      error: error.message,
    });
  }
};

const deleteCustomRole = async (req, res) => {
  try {
    const { companyId, roleKey } = req.params;

    // Check if it's a built-in role
    if (["COMPANY_ADMIN", "MANAGER", "AGENT"].includes(roleKey)) {
      return res.status(400).json({
        success: false,
        message: "لا يمكن حذف الأدوار الأساسية",
      });
    }

    // Get company
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "الشركة غير موجودة",
      });
    }

    const settings = company.settings ? JSON.parse(company.settings) : {};
    const customRoles = settings.customRoles || {};

    if (!customRoles[roleKey]) {
      return res.status(404).json({
        success: false,
        message: "الدور غير موجود",
      });
    }

    // Delete role
    delete customRoles[roleKey];

    // Update company settings
    await getSharedPrismaClient().company.update({
      where: { id: companyId },
      data: {
        settings: JSON.stringify({
          ...settings,
          customRoles,
        }),
      },
    });

    res.json({
      success: true,
      message: "تم حذف الدور بنجاح",
    });
  } catch (error) {
    console.error("❌ Error deleting role:", error);
    res.status(500).json({
      success: false,
      message: "فشل في حذف الدور",
      error: error.message,
    });
  }
};

// ==================== USER INVITATIONS ROUTES ====================
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendUserInvitation = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { email, firstName, lastName, role = "AGENT" } = req.body;

    // Validation for roles
    const validRoles = [
      "OWNER",
      "COMPANY_ADMIN",
      "MANAGER",
      "AGENT",
      "MARKETER",
      "AFFILIATE",
    ];
    if (role && !validRoles.includes(role)) {
      // If custom role, we might need a different check, but for now we allow standard ones
      console.log(
        `ℹ️ [INVITATION] Custom or non-standard role provided: ${role}`,
      );
    }

    // Validation
    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "البريد الإلكتروني والاسم الأول والأخير مطلوبة",
      });
    }

    // Check if user already exists
    const existingUser = await getSharedPrismaClient().user.findUnique({
      where: { email },
      include: {
        userCompanies: {
          select: {
            companyId: true,
            company: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // If user exists, check if they're already in this company
    if (existingUser) {
      const isInCurrentCompany = existingUser.userCompanies.some(
        (uc) => uc.companyId === companyId,
      );

      if (isInCurrentCompany) {
        return res.status(400).json({
          success: false,
          message: "هذا المستخدم موجود بالفعل في شركتك",
          code: "USER_ALREADY_IN_COMPANY",
        });
      }

      // User exists but in another company - allow cross-company invitation
      console.log(
        `👥 [CROSS-COMPANY-INVITE] User ${email} exists in ${existingUser.userCompanies.length} other company(ies)`,
      );
    }

    // Check if invitation already exists
    const existingInvitation =
      await getSharedPrismaClient().userInvitation.findFirst({
        where: {
          email,
          companyId,
          status: "PENDING",
        },
      });

    if (existingInvitation) {
      return res.status(400).json({
        success: false,
        message: "دعوة معلقة لهذا البريد الإلكتروني موجودة بالفعل",
      });
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    // Create invitation (works for both new users and existing users from other companies)
    const invitation = await getSharedPrismaClient().userInvitation.create({
      data: {
        email,
        firstName: existingUser ? existingUser.firstName : firstName,
        lastName: existingUser ? existingUser.lastName : lastName,
        role,
        token,
        invitedBy: req.user.userId,
        companyId,
        expiresAt,
      },
      include: {
        inviter: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    // 🔔 Create in-app notification if user exists (cross-company invitation)
    // Create notification for EACH company the user belongs to, so they see it regardless of which company they're logged into
    if (existingUser && existingUser.userCompanies.length > 0) {
      try {
        console.log(
          `🔔 [NOTIFICATION] Creating notifications for user ${existingUser.email} (ID: ${existingUser.id})`,
        );
        console.log(
          `🔔 [NOTIFICATION] User belongs to ${existingUser.userCompanies.length} company(ies):`,
          existingUser.userCompanies.map(
            (uc) => `${uc.company.name} (${uc.companyId})`,
          ),
        );

        // Create notification for each company the user is part of
        const notificationPromises = existingUser.userCompanies.map(
          async (uc) => {
            console.log(
              `🔔 [NOTIFICATION] Creating notification for company: ${uc.company.name} (${uc.companyId})`,
            );
            const notification =
              await getSharedPrismaClient().notification.create({
                data: {
                  userId: existingUser.id,
                  companyId: uc.companyId, // User's current company, not the inviting company
                  title: `🎉 دعوة للانضمام إلى ${invitation.company.name}`,
                    message: `${invitation.inviter.firstName} ${invitation.inviter.lastName} يدعوك للانضمام إلى ${invitation.company.name} كـ ${getRoleDisplayName(role)}`,
                  type: "invitation",
                  isRead: false,
                  data: JSON.stringify({
                    invitationId: invitation.id,
                    token: token,
                    companyName: invitation.company.name,
                    inviterName: `${invitation.inviter.firstName} ${invitation.inviter.lastName}`,
                    role: role,
                    expiresAt: expiresAt.toISOString(),
                    invitationLink: `${process.env.FRONTEND_URL || "https://maxp.online"}/auth/accept-invitation?token=${token}`,
                  }),
                  updatedAt: new Date(),
                },
              });
            console.log(
              `✅ [NOTIFICATION] Created notification ID: ${notification.id} for company ${uc.companyId}`,
            );
            return notification;
          },
        );

        const createdNotifications = await Promise.all(notificationPromises);
        console.log(
          `🔔 [NOTIFICATION] Successfully created ${createdNotifications.length} in-app notification(s) for user ${existingUser.email}`,
        );
      } catch (notifError) {
        console.error(
          "⚠️ [NOTIFICATION] Failed to create in-app notification:",
          notifError,
        );
        console.error("⚠️ [NOTIFICATION] Error stack:", notifError.stack);
        // Don't fail the invitation if notification creation fails
      }
    } else {
      console.log(
        `ℹ️ [NOTIFICATION] No notifications created - user ${existingUser ? "has no companies" : "does not exist"}`,
      );
    }

    // Generate invitation link
    const invitationLink = `${process.env.FRONTEND_URL || "https://maxp.online"}/auth/accept-invitation?token=${token}`;

    // Send email if SMTP is configured
    let emailSent = false;
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await emailTransporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: email,
          subject: `🎉 دعوة للانضمام إلى ${invitation.company.name}`,
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
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 دعوة خاصة</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333; margin-top: 0; font-size: 24px;">مرحباً ${firstName} ${lastName}،</h2>
                            
                            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                                تم دعوتك للانضمام إلى <strong style="color: #667eea;">${invitation.company.name}</strong> من قبل 
                                <strong>${invitation.inviter.firstName} ${invitation.inviter.lastName}</strong>.
                            </p>
                            
                            <div style="background-color: #f8f9fa; border-right: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 5px;">
                                <p style="margin: 0; color: #555;">
                                    <strong style="color: #333;">دورك في النظام:</strong> 
                                    <span style="color: #667eea; font-weight: bold;">${getRoleDisplayName(role)}</span>
                                </p>
                            </div>
                            
                            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                                للقبول والانضمام إلى الفريق، انقر على الزر أدناه:
                            </p>
                            
                            <!-- Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${invitationLink}" 
                                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                                  color: white; 
                                                  padding: 15px 40px; 
                                                  text-decoration: none; 
                                                  border-radius: 50px; 
                                                  display: inline-block; 
                                                  font-weight: bold; 
                                                  font-size: 16px;
                                                  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                                            ✅ قبول الدعوة والانضمام
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #999; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                                أو انسخ الرابط التالي والصقه في المتصفح:
                            </p>
                            <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px; color: #667eea;">
                                ${invitationLink}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 30px; border-radius: 0 0 10px 10px;">
                            <p style="color: #999; font-size: 13px; margin: 5px 0; text-align: center;">
                                ⏰ هذه الدعوة صالحة لمدة <strong>7 أيام</strong> من تاريخ الإرسال
                            </p>
                            <p style="color: #999; font-size: 13px; margin: 5px 0; text-align: center;">
                                🔒 إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذا البريد الإلكتروني بأمان
                            </p>
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                            <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
                                © ${new Date().getFullYear()} ${invitation.company.name}. جميع الحقوق محفوظة.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
          `,
        });
        emailSent = true;
      } catch (emailError) {
        console.error("❌ Error sending invitation email:", emailError);
      }
    }

    res.status(201).json({
      success: true,
      message: existingUser
        ? `تم إرسال دعوة للمستخدم الموجود ${existingUser.firstName} ${existingUser.lastName} للانضمام إلى شركتك`
        : "تم إرسال الدعوة بنجاح",
      data: {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
        },
        invitationLink,
        emailSent,
        isExistingUser: !!existingUser,
        existingUserCompanies: existingUser
          ? existingUser.userCompanies.map((uc) => uc.company.name)
          : [],
      },
    });
  } catch (error) {
    console.error("❌ Error creating invitation:", error);
    res.status(500).json({
      success: false,
      message: "فشل في إنشاء الدعوة",
      error: error.message,
    });
  }
};

const getCompanyInvitations = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const skip = (page - 1) * limit;
    const where = { companyId };

    if (status) {
      where.status = status;
    }

    const [invitations, totalCount] = await Promise.all([
      getSharedPrismaClient().userInvitation.findMany({
        where,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      getSharedPrismaClient().userInvitation.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      message: "تم جلب الدعوات بنجاح",
      data: {
        invitations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCount,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching invitations:", error);
    res.status(500).json({
      success: false,
      message: "فشل في جلب الدعوات",
      error: error.message,
    });
  }
};

const cancelInvitation = async (req, res) => {
  try {
    const { companyId, invitationId } = req.params;

    const invitation = await getSharedPrismaClient().userInvitation.findFirst({
      where: {
        id: invitationId,
        companyId,
      },
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "الدعوة غير موجودة",
      });
    }

    // Allow canceling any invitation (even expired ones for cleanup)
    // Just delete the invitation instead of updating status
    await getSharedPrismaClient().userInvitation.delete({
      where: { id: invitationId },
    });

    res.json({
      success: true,
      message: "تم إلغاء الدعوة بنجاح",
    });
  } catch (error) {
    console.error("❌ Error cancelling invitation:", error);
    res.status(500).json({
      success: false,
      message: "فشل في إلغاء الدعوة",
      error: error.message,
    });
  }
};

const resendInvitation = async (req, res) => {
  try {
    const { companyId, invitationId } = req.params;

    const invitation = await getSharedPrismaClient().userInvitation.findFirst({
      where: {
        id: invitationId,
        companyId,
      },
      include: {
        inviter: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "الدعوة غير موجودة",
      });
    }

    if (invitation.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "لا يمكن إعادة إرسال دعوة غير معلقة",
      });
    }

    // Generate new token and extend expiry
    const newToken = crypto.randomBytes(32).toString("hex");
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await getSharedPrismaClient().userInvitation.update({
      where: { id: invitationId },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
      },
    });

    // Generate new invitation link
    const invitationLink = `${process.env.FRONTEND_URL || "https://maxp.online"}/auth/accept-invitation?token=${newToken}`;

    // Send email if SMTP is configured
    let emailSent = false;
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await emailTransporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: invitation.email,
          subject: `🔄 إعادة إرسال: دعوة للانضمام إلى ${invitation.company.name}`,
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
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔄 تذكير بالدعوة</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333; margin-top: 0; font-size: 24px;">مرحباً ${invitation.firstName} ${invitation.lastName}،</h2>
                            
                            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                                هذا تذكير بدعوتك للانضمام إلى <strong style="color: #667eea;">${invitation.company.name}</strong>.
                            </p>
                            
                            <div style="background-color: #fff3cd; border-right: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                                <p style="margin: 0; color: #856404;">
                                    ⚠️ <strong>تم تجديد رابط الدعوة</strong> - الرابط السابق لم يعد صالحاً
                                </p>
                            </div>
                            
                            <div style="background-color: #f8f9fa; border-right: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 5px;">
                                <p style="margin: 0; color: #555;">
                                    <strong style="color: #333;">دورك في النظام:</strong> 
                                    <span style="color: #667eea; font-weight: bold;">${getRoleDisplayName(invitation.role)}</span>
                                </p>
                            </div>
                            
                            <p style="color: #555; font-size: 16px; line-height: 1.6;">
                                للقبول والانضمام إلى الفريق، انقر على الزر أدناه:
                            </p>
                            
                            <!-- Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${invitationLink}" 
                                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                                  color: white; 
                                                  padding: 15px 40px; 
                                                  text-decoration: none; 
                                                  border-radius: 50px; 
                                                  display: inline-block; 
                                                  font-weight: bold; 
                                                  font-size: 16px;
                                                  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                                            ✅ قبول الدعوة والانضمام
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #999; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                                أو انسخ الرابط التالي والصقه في المتصفح:
                            </p>
                            <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px; color: #667eea;">
                                ${invitationLink}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 30px; border-radius: 0 0 10px 10px;">
                            <p style="color: #999; font-size: 13px; margin: 5px 0; text-align: center;">
                                ⏰ هذه الدعوة الجديدة صالحة لمدة <strong>7 أيام</strong> من تاريخ الإرسال
                            </p>
                            <p style="color: #999; font-size: 13px; margin: 5px 0; text-align: center;">
                                🔒 إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذا البريد الإلكتروني بأمان
                            </p>
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                            <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
                                © ${new Date().getFullYear()} ${invitation.company.name}. جميع الحقوق محفوظة.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
          `,
        });
        emailSent = true;
      } catch (emailError) {
        console.error("❌ Error sending invitation email:", emailError);
      }
    }

    res.json({
      success: true,
      message: emailSent
        ? "تم إعادة إرسال الدعوة بنجاح"
        : "تم تحديث الدعوة بنجاح (لم يتم إرسال البريد الإلكتروني)",
      data: {
        invitationLink,
        emailSent,
      },
    });
  } catch (error) {
    console.error("❌ Error resending invitation:", error);
    res.status(500).json({
      success: false,
      message: "فشل في إعادة إرسال الدعوة",
      error: error.message,
    });
  }
};

const FrontendSpecificSafeEndpoint = async (req, res) => {
  try {
    // Get real data
    let productCount = 6;
    try {
      productCount = await getSharedPrismaClient().product.count({
        where: { isActive: true },
      });
    } catch (error) {
      //console.log('Using default count');
    }

    res.json({
      success: true,
      data: {
        products: Number(productCount) || 0,
      },
    });
  } catch (error) {
    console.error("Frontend safe endpoint error:", error);
    res.json({
      success: true,
      data: {
        products: 0,
      },
    });
  }
};

/**
 * 🔗 Update Company Slug (for subdomain)
 */
const updateCompanySlug = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { slug } = req.body;

    // Import slug validator
    const { validateSlug, sanitizeSlug } = require("../utils/slugValidator");

    // Sanitize input
    const sanitizedSlug = sanitizeSlug(slug);

    // Validate slug
    const validation = validateSlug(sanitizedSlug);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    // Check if slug already exists for another company
    const existingCompany = await getSharedPrismaClient().company.findFirst({
      where: {
        slug: sanitizedSlug,
        NOT: {
          id: companyId,
        },
      },
    });

    if (existingCompany) {
      return res.status(409).json({
        success: false,
        error: "هذا الاسم مستخدم بالفعل، يرجى اختيار اسم آخر",
      });
    }

    // Update company slug
    const updatedCompany = await getSharedPrismaClient().company.update({
      where: { id: companyId },
      data: { slug: sanitizedSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
      },
    });

    invalidateCompanySettingsCache(companyId);
    invalidateCompanyDashboardCache(companyId);

    const mainDomain = process.env.MAIN_DOMAIN || "maxp.online";
    res.json({
      success: true,
      message: "تم تحديث رابط المتجر بنجاح",
      data: {
        company: updatedCompany,
        url: `https://${sanitizedSlug}.${mainDomain}`,
      },
    });
  } catch (error) {
    console.error("❌ Error updating company slug:", error);
    res.status(500).json({
      success: false,
      error: "حدث خطأ أثناء تحديث رابط المتجر",
    });
  }
};

/**
 * 🔍 Verify Custom Domain DNS
 */
const verifyCompanyDNS = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "الشركة غير موجودة",
      });
    }

    if (!company.customDomain) {
      return res.status(400).json({
        success: false,
        message: "لم يتم تعيين دومين مخصص لهذه الشركة",
      });
    }

    // Target domain to verify against
    const expectedTarget = process.env.MAIN_DOMAIN || "maxp.online";

    // Perform DNS verification
    let result = await verifyDomainDNS(company.customDomain, expectedTarget);

    // If verification fails and it's not already a subdomain, try checking the www version
    // Many users only add the CNAME for www.yourdomain.com
    if (!result.success && !company.customDomain.includes(".")) {
      // This case might be rare for custom domains but good to have
    }

    if (!result.success && !company.customDomain.startsWith("www.")) {
      const wwwDomain = `www.${company.customDomain}`;
      console.log(`🔍 [DNS-Verify] Root failed, trying fallback: ${wwwDomain}`);
      const wwwResult = await verifyDomainDNS(wwwDomain, expectedTarget);
      if (wwwResult.success) {
        result = wwwResult;
      }
    }

    res.json(result);
  } catch (error) {
    console.error("❌ Error verifying DNS:", error);
    res.status(500).json({
      success: false,
      message: "فشل في التحقق من الدومين",
      error: error.message,
    });
  }
};

const getUsersStatistics = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { startDate, endDate, channel, activeOnly } = req.query;

    // Validate companyId
    if (!companyId || companyId === "null" || companyId === "undefined") {
      return res.status(400).json({
        success: false,
        message: "معرف الشركة مطلوب",
      });
    }

    const prisma = getSharedPrismaClient();

    // 1. Fetch company timezone to ensure accurate day boundaries
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, timezone: true },
    });

    const timezone = company?.timezone || "Africa/Cairo";

    // 2. Compute startUtc and endUtc cleanly using dateUtils
    const { getStartOfDayInTimezone, getEndOfDayInTimezone } = require("../utils/dateUtils");
    let startUtc = null;
    let endUtc = null;
    const hasStartDate = startDate && startDate !== "undefined" && startDate !== "null" && startDate.trim() !== "";
    const hasEndDate = endDate && endDate !== "undefined" && endDate !== "null" && endDate.trim() !== "";

    if (hasStartDate || hasEndDate) {
      if (hasStartDate) {
        startUtc = getStartOfDayInTimezone(new Date(startDate.trim()), timezone);
      }
      if (hasEndDate) {
        endUtc = getEndOfDayInTimezone(new Date(endDate.trim()), timezone);
      }
    } else {
      const now = new Date();
      startUtc = getStartOfDayInTimezone(now, timezone);
      endUtc = getEndOfDayInTimezone(now, timezone);
    }

    // 3. Get authorized users for this company from UserCompany (multi-tenant safe)
    const userCompanies = await prisma.userCompany.findMany({
      where: {
        companyId: companyId,
        isActive: true,
        user: { isActive: true },
      },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    const usersMap = new Map();
    userCompanies.forEach((uc) => {
      if (uc.user && uc.user.id) {
        usersMap.set(uc.user.id, {
          userId: uc.user.id,
          firstName: uc.user.firstName || "",
          lastName: uc.user.lastName || "",
          email: uc.user.email || "",
          avatar: uc.user.avatar || null,
          role: uc.role || "AGENT",
          conversationsCount: 0,
          messagesCount: 0,
          ordersCount: 0,
          convertedConversations: 0,
          totalRevenue: 0,
          conversionRate: 0,
        });
      }
    });

    // Also include direct company users from User table if any
    const directUsers = await prisma.user.findMany({
      where: {
        companyId: companyId,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        role: true,
      },
    });

    directUsers.forEach((u) => {
      if (!usersMap.has(u.id)) {
        usersMap.set(u.id, {
          userId: u.id,
          firstName: u.firstName || "",
          lastName: u.lastName || "",
          email: u.email || "",
          avatar: u.avatar || null,
          role: u.role || "AGENT",
          conversationsCount: 0,
          messagesCount: 0,
          ordersCount: 0,
          convertedConversations: 0,
          totalRevenue: 0,
          conversionRate: 0,
        });
      }
    });

    // 4. Load Prisma SQL builder
    let PrismaModule;
    try {
      PrismaModule = require("../prisma/generated/postgresql_v2").Prisma;
    } catch (e) {
      try {
        PrismaModule = require("@prisma/client").Prisma;
      } catch (err) {
        PrismaModule = null;
      }
    }

    const normalizedChannel = channel && channel !== "all" ? channel.trim().toUpperCase() : null;

    // 5. Database-level aggregation: Messages
    const messageStats = await prisma.$queryRaw`
      SELECT 
        m."senderId" AS "userId",
        COUNT(DISTINCT m."conversationId")::int AS "conversationsCount",
        COUNT(m.id)::int AS "messagesCount"
      FROM "messages" m
      JOIN "conversations" c ON c.id = m."conversationId"
      WHERE c."companyId" = ${companyId}
        AND m."isFromCustomer" = false
        AND m."senderId" IS NOT NULL
        ${startUtc ? PrismaModule.sql`AND m."createdAt" >= ${startUtc}` : PrismaModule.empty}
        ${endUtc ? PrismaModule.sql`AND m."createdAt" <= ${endUtc}` : PrismaModule.empty}
        ${normalizedChannel ? PrismaModule.sql`AND c."channel" = ${normalizedChannel}` : PrismaModule.empty}
      GROUP BY m."senderId"
    `;

    // 6. Database-level aggregation: Orders
    const orderStats = await prisma.$queryRaw`
      SELECT 
        COALESCE(o."createdBy", c."assignedUserId") AS "userId",
        COUNT(o.id)::int AS "ordersCount",
        COUNT(DISTINCT o."conversationId")::int AS "convertedConversations",
        COALESCE(SUM(o.total), 0)::float AS "totalRevenue"
      FROM "orders" o
      LEFT JOIN "conversations" c ON c.id = o."conversationId"
      WHERE o."companyId" = ${companyId}
        AND o.status::text NOT IN ('CANCELLED', 'DUPLICATE_ORDER', 'REFUNDED', 'RETURNED', 'TRASH', 'LOST')
        ${startUtc ? PrismaModule.sql`AND o."createdAt" >= ${startUtc}` : PrismaModule.empty}
        ${endUtc ? PrismaModule.sql`AND o."createdAt" <= ${endUtc}` : PrismaModule.empty}
        ${normalizedChannel ? PrismaModule.sql`AND c."channel" = ${normalizedChannel}` : PrismaModule.empty}
        AND (o."createdBy" IS NOT NULL OR c."assignedUserId" IS NOT NULL)
      GROUP BY COALESCE(o."createdBy", c."assignedUserId")
    `;

    // 7. Merge aggregation results into usersMap
    (messageStats || []).forEach((row) => {
      if (row.userId && usersMap.has(row.userId)) {
        const u = usersMap.get(row.userId);
        u.conversationsCount = row.conversationsCount || 0;
        u.messagesCount = row.messagesCount || 0;
      }
    });

    (orderStats || []).forEach((row) => {
      if (row.userId && usersMap.has(row.userId)) {
        const u = usersMap.get(row.userId);
        u.ordersCount = row.ordersCount || 0;
        u.convertedConversations = row.convertedConversations || 0;
        u.totalRevenue = Math.round((row.totalRevenue || 0) * 100) / 100;
      }
    });

    // 8. Compute accurate conversion rate & build array
    let statistics = Array.from(usersMap.values()).map((st) => {
      const convCount = st.conversationsCount;
      const convConverted = st.convertedConversations;
      let rate = 0;
      if (convCount > 0) {
        rate = parseFloat(((convConverted / convCount) * 100).toFixed(1));
        if (rate > 100) rate = 100;
      }

      return {
        ...st,
        conversionRate: rate,
      };
    });

    // 9. Role-based privacy: if requester is regular AGENT, they only see their own row
    const requesterId = req.user?.userId || req.user?.id;
    const requesterRole = (req.user?.role || "").toUpperCase();
    const isPrivileged = ["OWNER", "COMPANY_ADMIN", "MANAGER", "SUPER_ADMIN", "MODERATOR"].includes(requesterRole);

    if (!isPrivileged && requesterId) {
      statistics = statistics.filter((st) => st.userId === requesterId);
    }

    // Sort by conversationsCount desc, then messagesCount desc, then ordersCount desc
    statistics.sort(
      (a, b) =>
        b.conversationsCount - a.conversationsCount ||
        b.messagesCount - a.messagesCount ||
        b.ordersCount - a.ordersCount ||
        b.totalRevenue - a.totalRevenue
    );

    // Optional activeOnly filter: only return employees who replied/sent messages
    if (activeOnly === "true" || activeOnly === true) {
      statistics = statistics.filter(
        (st) => (st.conversationsCount || 0) > 0 || (st.messagesCount || 0) > 0
      );
    }

    // Calculate unique total conversations for the company in date range
    const totalUniqueResult = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT m."conversationId")::int AS "count"
      FROM "messages" m
      JOIN "conversations" c ON c.id = m."conversationId"
      WHERE c."companyId" = ${companyId}
        AND m."isFromCustomer" = false
        AND m."senderId" IS NOT NULL
        ${startUtc ? PrismaModule.sql`AND m."createdAt" >= ${startUtc}` : PrismaModule.empty}
        ${endUtc ? PrismaModule.sql`AND m."createdAt" <= ${endUtc}` : PrismaModule.empty}
        ${normalizedChannel ? PrismaModule.sql`AND c."channel" = ${normalizedChannel}` : PrismaModule.empty}
    `;
    const totalCompanyConversations = totalUniqueResult[0]?.count || 0;

    res.json({
      success: true,
      message: "تم جلب إحصائيات المستخدمين بنجاح",
      data: {
        statistics,
        totalUsers: statistics.length,
        totalUniqueConversations: !isPrivileged ? (statistics[0]?.conversationsCount || 0) : totalCompanyConversations,
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
        channel: normalizedChannel || "ALL",
      },
    });
  } catch (error) {
    console.error("❌ Error fetching users statistics:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "فشل في جلب إحصائيات المستخدمين",
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

/**
 * 🔍 Check Slug Availability
 */
const checkSlugAvailability = async (req, res) => {
  try {
    const { slug } = req.query;
    const { companyId } = req.query; // optional

    if (!slug) {
      return res.status(400).json({
        success: false,
        error: "يرجى إدخال اسم المتجر",
      });
    }

    const { validateSlug, sanitizeSlug } = require("../utils/slugValidator");

    // Sanitize and validate
    const sanitizedSlug = sanitizeSlug(slug);
    const validation = validateSlug(sanitizedSlug);

    if (!validation.valid) {
      return res.json({
        success: true,
        available: false,
        error: validation.error,
        suggestion: sanitizedSlug,
      });
    }

    // Check if exists
    const whereCondition = { slug: sanitizedSlug };
    if (companyId) {
      whereCondition.NOT = { id: companyId };
    }

    const existingCompany = await getSharedPrismaClient().company.findFirst({
      where: whereCondition,
    });

    const mainDomain = process.env.MAIN_DOMAIN || "maxp.online";
    res.json({
      success: true,
      available: !existingCompany,
      slug: sanitizedSlug,
      url: `https://${sanitizedSlug}.${mainDomain}`,
    });
  } catch (error) {
    console.error("❌ Error checking slug availability:", error);
    res.status(500).json({
      success: false,
      error: "حدث خطأ أثناء التحقق من توفر الاسم",
    });
  }
};

/**
 * 🖼️ Upload Company Logo
 */
const uploadCompanyLogo = async (req, res) => {
  try {
    const { companyId } = req.params;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "لم يتم رفع أي ملف",
      });
    }

    // Verify company exists
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: "الشركة غير موجودة",
      });
    }

    // Build logo URL
    const logoUrl = `/uploads/companies/${req.file.filename}`;

    // Update company with new logo
    const updatedCompany = await getSharedPrismaClient().company.update({
      where: { id: companyId },
      data: { logo: logoUrl },
    });

    res.json({
      success: true,
      message: "تم رفع اللوجو بنجاح",
      data: {
        logo: logoUrl,
        fullUrl: `${req.protocol}://${req.get("host")}${logoUrl}`,
        company: {
          id: updatedCompany.id,
          name: updatedCompany.name,
          logo: updatedCompany.logo,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error uploading company logo:", error);
    res.status(500).json({
      success: false,
      error: "فشل في رفع اللوجو",
      message: error.message,
    });
  }
};

const transferOwnership = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { targetUserId } = req.body;
    const currentUserId = req.user.id;

    console.log(
      `🔐 [OWNERSHIP] Transfer request initiated by ${currentUserId} for company ${companyId}`,
    );

    // 1. Validate Target User exists in company
    const targetUserCompany =
      await getSharedPrismaClient().userCompany.findUnique({
        where: {
          userId_companyId: {
            userId: targetUserId,
            companyId: companyId,
          },
        },
      });

    if (!targetUserCompany) {
      return res
        .status(404)
        .json({ success: false, message: "المستخدم غير موجود في هذه الشركة" });
    }

    if (targetUserCompany.userId === currentUserId) {
      return res
        .status(400)
        .json({ success: false, message: "لا يمكن نقل الملكية لنفسك" });
    }

    // 2. Perform Transfer via Transaction
    await getSharedPrismaClient().$transaction([
      // Downgrade current owner to COMPANY_ADMIN
      getSharedPrismaClient().userCompany.update({
        where: { userId_companyId: { userId: currentUserId, companyId } },
        data: { role: "COMPANY_ADMIN" },
      }),
      // Upgrade target user to OWNER
      getSharedPrismaClient().userCompany.update({
        where: { userId_companyId: { userId: targetUserId, companyId } },
        data: { role: "OWNER" },
      }),
      // Log the action
      getSharedPrismaClient().activityLog.create({
        data: {
          userId: currentUserId,
          companyId: companyId,
          category: "COMPANY",
          action: "TRANSFER_OWNERSHIP",
          description: `Ownership transferred to user ${targetUserId}`,
          targetType: "COMPANY",
          targetId: companyId,
          severity: "HIGH",
          updatedAt: new Date(),
        },
      }),
    ]);

    console.log(`✅ [OWNERSHIP] Transfer successful to ${targetUserId}`);
    res.json({ success: true, message: "تم نقل الملكية بنجاح" });
  } catch (error) {
    console.error("❌ Error transferring ownership:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "فشل عملية نقل الملكية",
        error: error.message,
      });
  }
};

module.exports = {
  getCurrentCompany,
  REMOVEDDangerousFallbackEndpoint,
  companyUsageEndpoint,
  mockEndpoint,
  getCompanyInfoEndpoint,
  safeUsageEndpoint,
  updateCompanyCurrency,
  getAllCompanies,
  createNewCompany,
  updateCompany,
  deleteCompany,
  getCompanyDetails,
  getCompanyUsers,
  getSingleUser,
  createnewUserForCompany,
  updateUser,
  updateMyProfile,
  deleteUser,
  createCustomRole,
  getCompanyRoles,
  updateCustomRole,
  deleteCustomRole,
  sendUserInvitation,
  getCompanyInvitations,
  cancelInvitation,
  resendInvitation,
  FrontendSpecificSafeEndpoint,
  updateCompanySlug,
  verifyCompanyDNS,
  checkSlugAvailability,

  getUsersStatistics,
  uploadCompanyLogo,
  transferOwnership,
};
