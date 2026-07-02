const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const verifyToken = require('../utils/verifyToken');

router.use(verifyToken.authenticateToken);

const DEFAULT_USER_SETTINGS = {
  sidebarLayout: null,
};

router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(403).json({
        success: false,
        message: 'معرف المستخدم مطلوب',
        code: 'USER_ID_REQUIRED',
      });
    }

    const user = await getSharedPrismaClient().user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    let parsed = { ...DEFAULT_USER_SETTINGS };
    if (user?.settings) {
      try {
        const userPrefs = JSON.parse(user.settings);
        parsed = { ...parsed, ...userPrefs };
      } catch {
        // ignore parse errors, use defaults
      }
    }

    res.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error('❌ [USER-SETTINGS] Error fetching:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user settings',
      details: error.message,
    });
  }
});

router.put('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(403).json({
        success: false,
        message: 'معرف المستخدم مطلوب',
        code: 'USER_ID_REQUIRED',
      });
    }

    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'بيانات الإعدادات غير صالحة',
      });
    }

    const user = await getSharedPrismaClient().user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    let current = {};
    if (user?.settings) {
      try {
        current = JSON.parse(user.settings);
      } catch {
        current = {};
      }
    }

    const merged = {
      ...current,
      ...settings,
      updatedAt: new Date().toISOString(),
    };

    await getSharedPrismaClient().user.update({
      where: { id: userId },
      data: { settings: JSON.stringify(merged) },
    });

    res.json({
      success: true,
      data: merged,
      message: 'تم حفظ الإعدادات بنجاح',
    });
  } catch (error) {
    console.error('❌ [USER-SETTINGS] Error updating:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user settings',
      details: error.message,
    });
  }
});

module.exports = router;
