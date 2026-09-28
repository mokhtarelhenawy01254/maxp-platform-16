const deviceService = require('../services/deviceService');

/**
 * Register or heartbeat a device from desktop/web client
 * POST /api/v1/devices/register
 */
const registerDevice = async (req, res) => {
  try {
    const { fingerprint, deviceName, clientType, osVersion, appVersion } = req.body;
    const companyId = req.user.companyId || req.user.effectiveCompanyId;
    const userId = req.user.id || req.user.userId;

    if (!fingerprint) {
      return res.status(400).json({
        success: false,
        message: 'بصمة الجهاز (fingerprint) مطلوبة',
      });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;

    const result = await deviceService.registerDevice({
      companyId,
      userId,
      fingerprint,
      deviceName,
      clientType,
      osVersion,
      appVersion,
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      data: result,
      message: result.isNew ? 'تم تسجيل الجهاز بنجاح' : 'تم تحديث بيانات الجهاز بنجاح',
    });
  } catch (error) {
    console.error('❌ [DEVICE-CONTROLLER] Error in registerDevice:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'فشل تسجيل الجهاز',
    });
  }
};

/**
 * Get classification of current device from request header
 * GET /api/v1/devices/status
 */
const getCurrentDeviceStatus = async (req, res) => {
  try {
    const fingerprint = req.headers['x-device-fingerprint'] || req.headers['X-Device-Fingerprint'];
    const companyId = req.user.companyId || req.user.effectiveCompanyId;

    if (!fingerprint) {
      return res.status(200).json({
        success: true,
        data: {
          deviceType: 'PERSONAL',
          isRegistered: false,
          isApproved: true,
          message: 'لا توجد بصمة جهاز مرسلة — تم تطبيق نمط الجهاز الشخصي افتراضياً',
        },
      });
    }

    const device = await deviceService.getDevice(companyId, fingerprint);

    if (!device) {
      return res.status(200).json({
        success: true,
        data: {
          deviceType: 'PERSONAL',
          isRegistered: false,
          isApproved: true,
          message: 'الجهاز غير مسجل — تم تطبيق نمط الجهاز الشخصي افتراضياً',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: device.id,
        deviceName: device.deviceName,
        deviceType: device.deviceType, // 'OFFICE' | 'PERSONAL'
        isRegistered: true,
        isApproved: device.isApproved,
        lastActiveAt: device.lastActiveAt,
      },
    });
  } catch (error) {
    console.error('❌ [DEVICE-CONTROLLER] Error in getCurrentDeviceStatus:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'فشل فحص حالة الجهاز',
    });
  }
};

/**
 * List all company devices (Admin)
 * GET /api/v1/devices
 */
const listDevices = async (req, res) => {
  try {
    const companyId = req.user.companyId || req.user.effectiveCompanyId;
    const { page, limit, deviceType, search, userId } = req.query;

    const result = await deviceService.listDevices({
      companyId,
      userId,
      deviceType,
      search,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: result.devices,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error('❌ [DEVICE-CONTROLLER] Error in listDevices:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'فشل استرجاع قائمة الأجهزة',
    });
  }
};

/**
 * Update device type or status (Admin)
 * PATCH /api/v1/devices/:id/type
 */
const updateDevice = async (req, res) => {
  try {
    const companyId = req.user.companyId || req.user.effectiveCompanyId;
    const { id } = req.params;
    const { deviceType, isApproved, deviceName } = req.body;

    if (deviceType && !['OFFICE', 'PERSONAL'].includes(deviceType.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'نوع الجهاز يجب أن يكون إما OFFICE أو PERSONAL',
      });
    }

    const updated = await deviceService.updateDevice(companyId, id, {
      deviceType,
      isApproved,
      deviceName,
    });

    return res.status(200).json({
      success: true,
      data: updated,
      message: 'تم تحديث نوع الجهاز وحالته بنجاح',
    });
  } catch (error) {
    console.error('❌ [DEVICE-CONTROLLER] Error in updateDevice:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'فشل تحديث الجهاز',
    });
  }
};

/**
 * Delete a device (Admin)
 * DELETE /api/v1/devices/:id
 */
const deleteDevice = async (req, res) => {
  try {
    const companyId = req.user.companyId || req.user.effectiveCompanyId;
    const { id } = req.params;

    await deviceService.deleteDevice(companyId, id);

    return res.status(200).json({
      success: true,
      message: 'تم حذف الجهاز بنجاح',
    });
  } catch (error) {
    console.error('❌ [DEVICE-CONTROLLER] Error in deleteDevice:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'فشل حذف الجهاز',
    });
  }
};

module.exports = {
  registerDevice,
  getCurrentDeviceStatus,
  listDevices,
  updateDevice,
  deleteDevice,
};
