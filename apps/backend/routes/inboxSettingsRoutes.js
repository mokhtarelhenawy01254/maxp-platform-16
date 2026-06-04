const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbacMiddleware');
const settingsController = require('../controller/inboxSettingsController');

router.use(requireAuth);

// ─── General Inbox Settings ───────────────────────────────────────

router.get(
  '/',
  requirePermission('settings.read'),
  settingsController.getSettings
);

router.put(
  '/',
  requirePermission('settings.manage'),
  settingsController.updateSettings
);

// ─── Notification Preferences ─────────────────────────────────────

router.get(
  '/notification-preferences',
  requirePermission('settings.notifications.manage'),
  settingsController.getNotificationPreferences
);

router.put(
  '/notification-preferences',
  requirePermission('settings.notifications.manage'),
  settingsController.updateNotificationPreferences
);

// ─── Browser Push Subscription ────────────────────────────────────

router.post(
  '/browser-push',
  requirePermission('settings.notifications.manage'),
  settingsController.saveBrowserPushSubscription
);

module.exports = router;
