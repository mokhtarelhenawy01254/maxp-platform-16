const {
  getSharedPrismaClientAsync,
  safeQuery,
} = require('../services/sharedDatabase');
const { isPlaceholderPhone } = require('../utils/placeholderContact');
const tenantContext = require('../services/tenantContext');
const shippingZoneController = require('./shippingZoneController');
const orderStatusController = require('./orderStatusController');

/**
 * Store Settings Controller
 * Handles branches and shipping zones management
 */

// Helper function to get Prisma client for non-queued mutations.
async function getPrisma() {
  return getSharedPrismaClientAsync();
}

async function runStoreSettingsQuery(operation) {
  return tenantContext.run(null, () => safeQuery((prisma) => operation(prisma)));
}

// ============ Store Settings ============

/**
 * Get all store settings (branches and shipping zones)
 */
exports.getStoreSettings = async (req, res) => {
  try {
    const { companyId } = req.user;

    const [branches, shippingZones] = await Promise.all([
      runStoreSettingsQuery((prisma) =>
        prisma.branche.findMany({
          where: { companyId },
          orderBy: { createdAt: 'desc' }
        })
      ),
      runStoreSettingsQuery((prisma) =>
        prisma.shippingZone.findMany({
          where: { companyId },
          orderBy: { createdAt: 'desc' }
        })
      )
    ]);

    res.json({
      success: true,
      data: {
        branches,
        shippingZones
      }
    });
  } catch (error) {
    console.error('Error fetching store settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إعدادات المتجر',
      error: error.message
    });
  }
};

// ============ Branches ============

/**
 * Get all branches
 */
exports.getBranches = async (req, res) => {
  try {
    const { companyId } = req.user;

    const branches = await runStoreSettingsQuery((prisma) =>
      prisma.branche.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' }
      })
    );

    res.json({
      success: true,
      data: branches
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الفروع',
      error: error.message
    });
  }
};

/**
 * Get active branches only
 */
exports.getActiveBranches = async (req, res) => {
  try {
    const { companyId } = req.user;

    const branches = await runStoreSettingsQuery((prisma) =>
      prisma.branche.findMany({
        where: {
          companyId,
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      })
    );

    res.json({
      success: true,
      data: branches
    });
  } catch (error) {
    console.error('Error fetching active branches:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الفروع النشطة',
      error: error.message
    });
  }
};

/**
 * Create new branch
 */
exports.createBranch = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { name, address, city, phone, email, workingHours } = req.body;

    if (!name || !address || !city || !phone) {
      return res.status(400).json({
        success: false,
        message: 'الاسم والعنوان والمدينة والهاتف مطلوبة'
      });
    }

    if (isPlaceholderPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف غير صالح — يرجى إدخال رقم حقيقي'
      });
    }

    const prisma = await getPrisma();
    const branch = await prisma.branche.create({
      data: {
        name,
        address,
        city,
        phone,
        email,
        workingHours,
        companyId,
        isActive: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الفرع بنجاح',
      data: branch
    });
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إنشاء الفرع',
      error: error.message
    });
  }
};

/**
 * Update branch
 */
exports.updateBranch = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { name, address, city, phone, email, workingHours, isActive } = req.body;

    const prisma = await getPrisma();

    // Verify branch belongs to company
    const existingBranch = await prisma.branche.findFirst({
      where: { id, companyId }
    });

    if (!existingBranch) {
      return res.status(404).json({
        success: false,
        message: 'الفرع غير موجود'
      });
    }

    if (phone !== undefined && isPlaceholderPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف غير صالح — يرجى إدخال رقم حقيقي'
      });
    }

    const branch = await prisma.branche.update({
      where: { id },
      data: {
        name,
        address,
        city,
        phone,
        email,
        workingHours,
        isActive
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث الفرع بنجاح',
      data: branch
    });
  } catch (error) {
    console.error('Error updating branch:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث الفرع',
      error: error.message
    });
  }
};

/**
 * Toggle branch status
 */
exports.toggleBranchStatus = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const prisma = await getPrisma();

    // Verify branch belongs to company
    const existingBranch = await prisma.branche.findFirst({
      where: { id, companyId }
    });

    if (!existingBranch) {
      return res.status(404).json({
        success: false,
        message: 'الفرع غير موجود'
      });
    }

    const branch = await prisma.branche.update({
      where: { id },
      data: {
        isActive: !existingBranch.isActive
      }
    });

    res.json({
      success: true,
      message: `تم ${branch.isActive ? 'تفعيل' : 'تعطيل'} الفرع بنجاح`,
      data: branch
    });
  } catch (error) {
    console.error('Error toggling branch status:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تغيير حالة الفرع',
      error: error.message
    });
  }
};

/**
 * Delete branch
 */
exports.deleteBranch = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const prisma = await getPrisma();

    // Verify branch belongs to company
    const existingBranch = await prisma.branche.findFirst({
      where: { id, companyId }
    });

    if (!existingBranch) {
      return res.status(404).json({
        success: false,
        message: 'الفرع غير موجود'
      });
    }

    await prisma.branche.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'تم حذف الفرع بنجاح'
    });
  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في حذف الفرع',
      error: error.message
    });
  }
};

// ============ Shipping Zones ============

/**
 * Get all shipping zones
 */
exports.getCanonicalGovernorates = (req, res) => shippingZoneController.getCanonicalGovernorates(req, res);

exports.getShippingZones = (req, res) => shippingZoneController.getShippingZones(req, res);

/**
 * Get active shipping zones only
 */
exports.getActiveShippingZones = (req, res) => shippingZoneController.getActiveShippingZones(req, res);

/**
 * Find shipping price by governorate
 */
exports.findShippingPrice = (req, res) => shippingZoneController.findShippingPrice(req, res);

/**
 * Create new shipping zone
 */
exports.createShippingZone = (req, res) => shippingZoneController.createShippingZone(req, res);

/**
 * Update shipping zone
 */
exports.updateShippingZone = (req, res) => shippingZoneController.updateShippingZone(req, res);

/**
 * Toggle shipping zone status
 */
exports.toggleZoneStatus = (req, res) => shippingZoneController.toggleZoneStatus(req, res);

/**
 * Delete shipping zone
 */
exports.deleteShippingZone = (req, res) => shippingZoneController.deleteShippingZone(req, res);

// ============ Turbo Shipping Settings ============

/**
 * Get Turbo shipping settings
 */
exports.getTurboSettings = async (req, res) => {
  try {
    const { companyId } = req.user;
    const prisma = await getPrisma();

    const company = await safeQuery(async () => {
      return await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          turboApiKey: true,
          turboMainClientCode: true,
          turboSenderNumber: true,
          turboEnabled: true,
          turboAutoCreate: true,
          turboWebhookUrl: true,
          turboWebhookToken: true
        }
      });
    }, 3);

    // إخفاء API Key جزئياً للأمان
    const maskedApiKey = company?.turboApiKey
      ? `${company.turboApiKey.substring(0, 4)}****${company.turboApiKey.substring(company.turboApiKey.length - 4)}`
      : null;

    res.json({
      success: true,
      data: {
        turboEnabled: company?.turboEnabled || false,
        turboAutoCreate: company?.turboAutoCreate || false,
        turboMainClientCode: company?.turboMainClientCode || null,
        turboSenderNumber: company?.turboSenderNumber || null,
        turboWebhookUrl: company?.turboWebhookUrl || null,
        turboWebhookToken: company?.turboWebhookToken || null,
        hasApiKey: !!company?.turboApiKey,
        maskedApiKey: maskedApiKey
      }
    });
  } catch (error) {
    console.error('Error fetching Turbo settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إعدادات Turbo',
      error: error.message
    });
  }
};

/**
 * Update Turbo shipping settings
 */
exports.updateTurboSettings = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { turboApiKey, turboMainClientCode, turboSenderNumber, turboEnabled, turboAutoCreate, turboWebhookUrl, turboWebhookToken } = req.body;
    const prisma = await getPrisma();

    const updateData = {};

    // تحديث API Key فقط إذا تم إرساله
    if (turboApiKey !== undefined) {
      if (turboApiKey && turboApiKey.trim().length > 0) {
        updateData.turboApiKey = turboApiKey.trim();
      } else {
        updateData.turboApiKey = null;
      }
    }

    // تحديث Main Client Code
    if (turboMainClientCode !== undefined) {
      if (turboMainClientCode && turboMainClientCode > 0) {
        updateData.turboMainClientCode = parseInt(turboMainClientCode);
      } else {
        updateData.turboMainClientCode = null;
      }
    }

    // تحديث Sender Number
    if (turboSenderNumber !== undefined) {
      if (turboSenderNumber && turboSenderNumber.trim().length > 0) {
        updateData.turboSenderNumber = turboSenderNumber.trim();
      } else {
        updateData.turboSenderNumber = null;
      }
    }

    if (turboEnabled !== undefined) {
      updateData.turboEnabled = Boolean(turboEnabled);
    }

    if (turboAutoCreate !== undefined) {
      updateData.turboAutoCreate = Boolean(turboAutoCreate);
    }

    if (turboWebhookUrl !== undefined) {
      updateData.turboWebhookUrl = turboWebhookUrl || null;
    }

    if (turboWebhookToken !== undefined) {
      updateData.turboWebhookToken = turboWebhookToken || null;
    }

    await safeQuery(async () => {
      return await prisma.company.update({
        where: { id: companyId },
        data: updateData
      });
    }, 3);

    // تلقائياً أنشئ/حدث حالات الشحن المخصصة لتربو في إعدادات حالات الطلب للشركة
    try {
      if (orderStatusController && typeof orderStatusController.initializeDefaultStatuses === 'function') {
        await orderStatusController.initializeDefaultStatuses(companyId);
        console.log(`✅ [TURBO] Default shipping statuses initialized for company ${companyId}`);
      }
    } catch (statusInitErr) {
      console.warn('⚠️ [TURBO] Could not auto-initialize shipping statuses:', statusInitErr.message);
    }

    console.log(`✅ [TURBO] Settings saved for company ${companyId}`);
    if (updateData.turboWebhookToken) {
      console.log(`✅ [TURBO] Webhook token saved (length: ${updateData.turboWebhookToken.length})`);
    }

    res.json({
      success: true,
      message: 'تم تحديث إعدادات Turbo بنجاح'
    });
  } catch (error) {
    console.error('Error updating Turbo settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث إعدادات Turbo',
      error: error.message
    });
  }
};

/**
 * Get Bosta shipping settings
 */
exports.getBostaSettings = async (req, res) => {
  try {
    const { companyId } = req.user;
    const prisma = await getSharedPrismaClientAsync();

    const company = await safeQuery(async () => {
      return await prisma.company.findUnique({
        where: { id: companyId },
        select: { bostaApiKey: true, bostaEnabled: true, bostaWebhookToken: true }
      });
    }, 3);

    const maskedApiKey = company?.bostaApiKey
      ? `${company.bostaApiKey.substring(0, 4)}****${company.bostaApiKey.substring(company.bostaApiKey.length - 4)}`
      : null;

    res.json({
      success: true,
      data: {
        bostaEnabled: company?.bostaEnabled || false,
        bostaWebhookToken: company?.bostaWebhookToken || null,
        hasApiKey: !!company?.bostaApiKey,
        maskedApiKey: maskedApiKey
      }
    });
  } catch (error) {
    console.error('Error fetching Bosta settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إعدادات Bosta',
      error: error.message
    });
  }
};

/**
 * Update Bosta shipping settings
 */
exports.updateBostaSettings = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { bostaApiKey, bostaEnabled, bostaWebhookToken } = req.body;
    const prisma = await getSharedPrismaClientAsync();

    const updateData = {};

    if (bostaApiKey !== undefined) {
      if (bostaApiKey && bostaApiKey.trim().length > 0) {
        updateData.bostaApiKey = bostaApiKey.trim();
      } else {
        updateData.bostaApiKey = null;
      }
    }

    if (bostaEnabled !== undefined) {
      updateData.bostaEnabled = Boolean(bostaEnabled);
    }

    if (bostaWebhookToken !== undefined) {
      updateData.bostaWebhookToken = bostaWebhookToken || null;
    }

    await safeQuery(async () => {
      return await prisma.company.update({
        where: { id: companyId },
        data: updateData
      });
    }, 3);

    console.log(`✅ [BOSTA] Settings saved for company ${companyId}`);

    res.json({
      success: true,
      message: 'تم تحديث إعدادات Bosta بنجاح'
    });
  } catch (error) {
    console.error('Error updating Bosta settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث إعدادات Bosta',
      error: error.message
    });
  }
};

// ============ Shipping Method Management (New Architecture) ============

/**
 * Get methods for a specific zone
 */
exports.getShippingMethods = async (req, res) => {
  try {
    const { zoneId } = req.params;
    const prisma = await getPrisma();

    const methods = await prisma.shippingMethod.findMany({
      where: { zoneId },
      orderBy: { sortOrder: 'asc' }
    });

    res.json({
      success: true,
      data: methods
    });
  } catch (error) {
    console.error('Error fetching shipping methods:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Create a new shipping method
 */
exports.createShippingMethod = async (req, res) => {
  try {
    const { zoneId } = req.params;
    const { title, type, isEnabled, settings, sortOrder } = req.body;
    const prisma = await getPrisma();

    const method = await prisma.shippingMethod.create({
      data: {
        zoneId,
        title,
        type: type || 'flat_rate',
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        settings: typeof settings === 'object' ? JSON.stringify(settings) : settings,
        sortOrder: parseInt(sortOrder || 0)
      }
    });

    res.json({
      success: true,
      data: method
    });
  } catch (error) {
    console.error('Error creating shipping method:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update a shipping method
 */
exports.updateShippingMethod = async (req, res) => {
  try {
    const { methodId } = req.params;
    const updates = req.body;
    const prisma = await getPrisma();

    if (updates.settings && typeof updates.settings === 'object') {
      updates.settings = JSON.stringify(updates.settings);
    }

    const method = await prisma.shippingMethod.update({
      where: { id: methodId },
      data: updates
    });

    res.json({
      success: true,
      data: method
    });
  } catch (error) {
    console.error('Error updating shipping method:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Delete a shipping method
 */
exports.deleteShippingMethod = async (req, res) => {
  try {
    const { methodId } = req.params;
    const prisma = await getPrisma();

    await prisma.shippingMethod.delete({
      where: { id: methodId }
    });

    res.json({ success: true, message: 'تم حذف طريقة الشحن بنجاح' });
  } catch (error) {
    console.error('Error deleting shipping method:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
