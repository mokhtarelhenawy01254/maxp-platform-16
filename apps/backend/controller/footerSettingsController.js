const {
  getSharedPrismaClientAsync,
  safeQuery,
} = require('../services/sharedDatabase');
const {
  isPlaceholderPhone,
  isPlaceholderEmail,
} = require('../utils/placeholderContact');

/**
 * Footer Settings Controller
 * Handles footer information management
 */

// Helper function to get Prisma client
async function getPrisma() {
  return getSharedPrismaClientAsync();
}

/**
 * Get footer settings
 */
exports.getFooterSettings = async (req, res) => {
  try {
    const { companyId } = req.user;
    // Handle null, undefined, or string 'null'/'undefined'
    if (!companyId || companyId === 'null' || companyId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة لعرض إعدادات الفوتر',
        error: 'COMPANY_ID_REQUIRED'
      });
    }

    let settings = await safeQuery((prisma) =>
      prisma.footerSettings.findUnique({
        where: { companyId }
      })
    );

    // Create default settings if not exists
    if (!settings) {
      // Get company info for defaults
      const company = await safeQuery((prisma) =>
        prisma.company.findUnique({
          where: { id: companyId },
          select: { name: true, email: true, phone: true, address: true }
        })
      );

      settings = await safeQuery((prisma) =>
        prisma.footerSettings.create({
          data: {
            companyId,
            aboutStore: `نحن ${company?.name || 'متجر'} نقدم أفضل المنتجات والخدمات لعملائنا الكرام`,
            showAboutStore: true,
            email: company?.email || '',
            showEmail: true,
            phone: company?.phone || '',
            showPhone: true,
            address: company?.address || '',
            showAddress: true,
            showQuickLinks: true,
            copyrightText: `© ${new Date().getFullYear()} ${company?.name || 'المتجر'}. جميع الحقوق محفوظة`,
            showCopyright: true
          }
        })
      );
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching footer settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إعدادات الفوتر'
    });
  }
};

/**
 * Update footer settings
 */
// Allowed fields for footer settings update — prevents mass assignment
const FOOTER_SETTINGS_WHITELIST = [
  'aboutStore', 'showAboutStore',
  'email', 'showEmail',
  'phone', 'showPhone',
  'address', 'showAddress',
  'showQuickLinks',
  'copyrightText', 'showCopyright'
];

exports.updateFooterSettings = async (req, res) => {
  try {
    const { companyId } = req.user;
    const prisma = await getPrisma();

    // Handle null, undefined, or string 'null'/'undefined'
    if (!companyId || companyId === 'null' || companyId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة لتحديث إعدادات الفوتر',
        error: 'COMPANY_ID_REQUIRED'
      });
    }

    // Whitelist: only allow known safe fields to prevent mass assignment
    const updateData = {};
    for (const key of FOOTER_SETTINGS_WHITELIST) {
      if (key in req.body) {
        updateData[key] = req.body[key];
      }
    }

    if (updateData.phone !== undefined && isPlaceholderPhone(updateData.phone)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف غير صالح — يرجى إدخال رقم حقيقي'
      });
    }

    if (updateData.email !== undefined && isPlaceholderEmail(updateData.email)) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني غير صالح — يرجى إدخال بريد حقيقي'
      });
    }

    // Check if settings exist
    let settings = await prisma.footerSettings.findUnique({
      where: { companyId }
    });

    if (!settings) {
      settings = await prisma.footerSettings.create({
        data: { companyId, ...updateData }
      });
    } else {
      settings = await prisma.footerSettings.update({
        where: { companyId },
        data: updateData
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث إعدادات الفوتر بنجاح',
      data: settings
    });
  } catch (error) {
    console.error('Error updating footer settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث إعدادات الفوتر'
    });
  }
};

/**
 * Reset footer settings to defaults
 */
exports.resetFooterSettings = async (req, res) => {
  try {
    const { companyId } = req.user;
    const prisma = await getPrisma();

    // Handle null, undefined, or string 'null'/'undefined'
    if (!companyId || companyId === 'null' || companyId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة لإعادة تعيين إعدادات الفوتر',
        error: 'COMPANY_ID_REQUIRED'
      });
    }

    // Get company info for defaults
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, email: true, phone: true, address: true }
    });

    const settings = await prisma.footerSettings.upsert({
      where: { companyId },
      update: {
        aboutStore: `نحن ${company?.name || 'متجر'} نقدم أفضل المنتجات والخدمات لعملائنا الكرام`,
        showAboutStore: true,
        email: company?.email || '',
        showEmail: true,
        phone: company?.phone || '',
        showPhone: true,
        address: company?.address || '',
        showAddress: true,
        showQuickLinks: true,
        copyrightText: `© ${new Date().getFullYear()} ${company?.name || 'المتجر'}. جميع الحقوق محفوظة`,
        showCopyright: true
      },
      create: {
        companyId,
        aboutStore: `نحن ${company?.name || 'متجر'} نقدم أفضل المنتجات والخدمات لعملائنا الكرام`,
        showAboutStore: true,
        email: company?.email || '',
        showEmail: true,
        phone: company?.phone || '',
        showPhone: true,
        address: company?.address || '',
        showAddress: true,
        showQuickLinks: true,
        copyrightText: `© ${new Date().getFullYear()} ${company?.name || 'المتجر'}. جميع الحقوق محفوظة`,
        showCopyright: true
      }
    });

    res.json({
      success: true,
      message: 'تم إعادة تعيين إعدادات الفوتر بنجاح',
      data: settings
    });
  } catch (error) {
    console.error('Error resetting footer settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إعادة تعيين إعدادات الفوتر'
    });
  }
};

/**
 * Get public footer settings (for storefront)
 * Supports both companyId and slug
 */
exports.getPublicFooterSettings = async (req, res) => {
  try {
    // Use company from middleware (set by getCompanyFromSubdomain) or fallback to params
    const companyId = req.company?.id || req.params?.companyId;
    const prisma = await getPrisma();

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    // Determine if companyId is actually a slug or an ID
    // CUIDs are exactly 25 chars starting with 'c', slugs are shorter alphanumeric strings
    let actualCompanyId = companyId;
    const looksLikeSlug = !/^c[a-z0-9]{24}$/.test(companyId);

    if (looksLikeSlug) {
      const company = await prisma.company.findFirst({
        where: { OR: [{ slug: companyId }, { id: companyId }] },
        select: { id: true }
      });

      if (company) {
        actualCompanyId = company.id;
      }
    }

    const settings = await prisma.footerSettings.findUnique({
      where: { companyId: actualCompanyId },
      select: {
        aboutStore: true,
        showAboutStore: true,
        email: true,
        showEmail: true,
        phone: true,
        showPhone: true,
        address: true,
        showAddress: true,
        showQuickLinks: true,
        copyrightText: true,
        showCopyright: true
      }
    });

    if (!settings) {
      // Return default settings if not configured
      const company = await prisma.company.findUnique({
        where: { id: actualCompanyId },
        select: { name: true, email: true, phone: true, address: true }
      });

      return res.json({
        success: true,
        data: {
          aboutStore: `نحن ${company?.name || 'متجر'} نقدم أفضل المنتجات والخدمات لعملائنا الكرام`,
          showAboutStore: true,
          email: company?.email || '',
          showEmail: true,
          phone: company?.phone || '',
          showPhone: true,
          address: company?.address || '',
          showAddress: true,
          showQuickLinks: true,
          copyrightText: `© ${new Date().getFullYear()} ${company?.name || 'المتجر'}. جميع الحقوق محفوظة`,
          showCopyright: true
        }
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching public footer settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إعدادات الفوتر'
    });
  }
};
