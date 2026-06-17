const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const { requireDbPermission } = require('../middleware/rbacMiddleware');
const settingsController = require('../controller/inboxSettingsController');

router.use(verifyToken.authenticateToken);

// ─── General Inbox Settings ───────────────────────────────────────

router.get(
  '/',
  requireDbPermission('settings.read'),
  settingsController.getSettings
);

router.put(
  '/',
  requireDbPermission('settings.manage'),
  settingsController.updateSettings
);

// ─── Notification Preferences ─────────────────────────────────────

router.get(
  '/notification-preferences',
  requireDbPermission('settings.notifications.manage'),
  settingsController.getNotificationPreferences
);

router.put(
  '/notification-preferences',
  requireDbPermission('settings.notifications.manage'),
  settingsController.updateNotificationPreferences
);

// ─── Browser Push Subscription ────────────────────────────────────

router.post(
  '/browser-push',
  requireDbPermission('settings.notifications.manage'),
  settingsController.saveBrowserPushSubscription
);

module.exports = router;
