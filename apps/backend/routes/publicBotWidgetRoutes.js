const express = require('express');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getWhatsAppPhone, getFacebookPage, waLink, meLink } = require('../services/botLinkService');

const router = express.Router();

router.get('/:companyId', async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const prisma = getSharedPrismaClient();

    const [settings, phone, page] = await Promise.all([
      prisma.botAutomationSettings.findUnique({ where: { companyId } }),
      getWhatsAppPhone(companyId),
      getFacebookPage(companyId),
    ]);

    if (!settings || settings.widgetEnabled !== true) {
      return res.json({ success: true, data: { enabled: false, buttons: [] } });
    }

    let channels = ['WHATSAPP', 'FACEBOOK'];
    if (settings.channels) {
      try {
        const parsed = JSON.parse(settings.channels);
        if (Array.isArray(parsed) && parsed.length > 0) channels = parsed;
      } catch (e) { /* keep default */ }
    }

    const buttons = [];
    if (channels.includes('WHATSAPP')) {
      const url = waLink(phone, '┘à╪▒╪¡╪¿╪º┘ï╪î ╪ú╪▒╪║╪¿ ┘ü┘è ╪º┘ä╪¬┘ê╪º╪╡┘ä');
      if (url) buttons.push({ channel: 'WHATSAPP', label: 'WhatsApp', url });
    }
    if (channels.includes('FACEBOOK')) {
      const url = meLink(page?.pageId, 'widget');
      if (url) {
        buttons.push({ channel: 'FACEBOOK', label: page?.pageName || 'Messenger', url });
      }
    }

    return res.json({
      success: true,
      data: {
        enabled: buttons.length > 0,
        color: settings.widgetColor || '#4f46e5',
        buttons,
      },
    });
  } catch (error) {
    console.error('Error loading bot widget config:', error);
    return res.status(500).json({ success: false, error: 'Failed to load bot widget config' });
  }
});

module.exports = router;
