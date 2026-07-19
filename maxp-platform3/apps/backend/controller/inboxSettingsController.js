const { getSharedPrismaClient } = require('../services/sharedDatabase');
const {
  getOrCreateSettings,
  getNormalizedSettings,
  serializeSettingsPayload
} = require('../services/whatsappInboxSettingsService');

async function getSettingsContext(companyId, prisma) {
  const [users, teams] = await Promise.all([
    prisma.user.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        skills: true,
        timezone: true,
        availability: true
      },
      orderBy: { firstName: 'asc' }
    }),
    prisma.moderatorTeam.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        name: true
      },
      orderBy: { name: 'asc' }
    })
  ]);

  return {
    users,
    teams
  };
}

exports.getSettings = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    await getOrCreateSettings(req.user.companyId, prisma);
    const [settings, context] = await Promise.all([
      getNormalizedSettings(req.user.companyId, prisma),
      getSettingsContext(req.user.companyId, prisma)
    ]);

    res.json({ success: true, settings, context });
  } catch (error) {
    console.error('[SettingsController] getSettings error:', error.message);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    await getOrCreateSettings(req.user.companyId, prisma);

    await prisma.inboxSettings.update({
      where: { companyId: req.user.companyId },
      data: serializeSettingsPayload(req.body || {})
    });

    const settings = await getNormalizedSettings(req.user.companyId, prisma);
    res.json({ success: true, settings });
  } catch (error) {
    console.error('[SettingsController] updateSettings error:', error.message);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

exports.getNotificationPreferences = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const prefs = await prisma.notificationPreference.findFirst({
      where: { userId: req.user.id, companyId: req.user.companyId }
    });
    res.json({
      success: true,
      preferences: prefs || {
        browserPush: true,
        soundEnabled: true,
        soundUrl: '/notification.mp3',
        newChat: true,
        newMessage: true,
        transfer: true,
        statusChange: false,
        timeoutWarnings: true
      }
    });
  } catch (error) {
    console.error('[SettingsController] getNotificationPreferences error:', error.message);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
};

exports.updateNotificationPreferences = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const prefs = await prisma.notificationPreference.upsert({
      where: {
        companyId_userId: {
          companyId: req.user.companyId,
          userId: req.user.id
        }
      },
      create: {
        userId: req.user.id,
        companyId: req.user.companyId,
        settings: req.body
      },
      update: {
        settings: req.body
      }
    });
    res.json({ success: true, preferences: prefs });
  } catch (error) {
    console.error('[SettingsController] updateNotificationPreferences error:', error.message);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
};

exports.saveBrowserPushSubscription = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const subscription = await prisma.browserPushSubscription.upsert({
      where: {
        endpoint: req.body.endpoint
      },
      create: {
        userId: req.user.id,
        companyId: req.user.companyId,
        endpoint: req.body.endpoint,
        p256dh: req.body.keys?.p256dh,
        auth: req.body.keys?.auth
      },
      update: {
        p256dh: req.body.keys?.p256dh,
        auth: req.body.keys?.auth
      }
    });
    res.json({ success: true, subscription });
  } catch (error) {
    console.error('[SettingsController] saveBrowserPushSubscription error:', error.message);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
};
