const businessSpecialtyService = require('../services/businessSpecialtyService');

function sendError(res, error, fallbackMessage = 'فشل تنفيذ العملية') {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: error.message || fallbackMessage,
    error: error.message,
  });
}

exports.getSettings = async (req, res) => {
  try {
    const settings = await businessSpecialtyService.getOnboardingSettings();
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    sendError(res, error, 'فشل في جلب إعدادات التسجيل');
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = await businessSpecialtyService.updateOnboardingSettings(req.body || {});
    res.json({
      success: true,
      message: 'تم تحديث إعدادات التسجيل',
      data: settings,
    });
  } catch (error) {
    sendError(res, error, 'فشل في تحديث إعدادات التسجيل');
  }
};

exports.listSpecialties = async (req, res) => {
  try {
    const items = await businessSpecialtyService.listAdminSpecialties();
    res.json({
      success: true,
      data: { items },
    });
  } catch (error) {
    sendError(res, error, 'فشل في جلب التخصصات');
  }
};

exports.createSpecialty = async (req, res) => {
  try {
    const specialty = await businessSpecialtyService.createSpecialty(req.body || {});
    res.status(201).json({
      success: true,
      message: 'تم إنشاء التخصص',
      data: specialty,
    });
  } catch (error) {
    sendError(res, error, 'فشل في إنشاء التخصص');
  }
};

exports.updateSpecialty = async (req, res) => {
  try {
    const specialty = await businessSpecialtyService.updateSpecialty(req.params.id, req.body || {});
    res.json({
      success: true,
      message: 'تم تحديث التخصص',
      data: specialty,
    });
  } catch (error) {
    sendError(res, error, 'فشل في تحديث التخصص');
  }
};

exports.removeSpecialty = async (req, res) => {
  try {
    const specialty = await businessSpecialtyService.removeSpecialty(req.params.id);
    res.json({
      success: true,
      message: 'تم تعطيل التخصص',
      data: specialty,
    });
  } catch (error) {
    sendError(res, error, 'فشل في حذف التخصص');
  }
};

exports.getMarketplaceAppOptions = async (req, res) => {
  try {
    const items = await businessSpecialtyService.getMarketplaceAppOptions();
    res.json({
      success: true,
      data: { items },
    });
  } catch (error) {
    sendError(res, error, 'فشل في جلب التطبيقات');
  }
};
