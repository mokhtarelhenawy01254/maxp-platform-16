const express = require('express');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const verifyToken = require('../utils/verifyToken');
const { normalizeKeywordList } = require('../services/botRuleEngine');
const { buildStarterLinks, getFacebookPage } = require('../services/botLinkService');
const { buildMenuItems, pushPersistentMenu } = require('../services/botMenuService');
const { listUnsubscribers, removeUnsubscribe } = require('../services/botUnsubscribeService');
const { evaluateSegment } = require('../services/botSegmentService');

const router = express.Router();

const MATCH_MODES = ['CONTAINS', 'EXACT', 'REGEX'];
const REPLY_TYPES = ['TEXT', 'IMAGE', 'VIDEO'];
const CHANNELS = ['WHATSAPP', 'FACEBOOK'];

function normalizeChannels(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((c) => String(c || '').toUpperCase().trim())
    .filter((c) => CHANNELS.includes(c));
}

function normalizeSettingsChannels(value) {
  const normalized = normalizeChannels(value);
  return normalized.length > 0 ? normalized : ['WHATSAPP', 'FACEBOOK'];
}

function getCompanyId(req) {
  return req.user?.companyId || req.companyId || null;
}

router.get('/settings', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const settings = await getSharedPrismaClient().botAutomationSettings.findUnique({
      where: { companyId },
    });
    return res.json({
      success: true,
      data: {
        welcomeEnabled: settings?.welcomeEnabled === true,
        welcomeMessage: settings?.welcomeMessage || '',
        defaultReplyEnabled: settings?.defaultReplyEnabled === true,
        defaultReply: settings?.defaultReply || '',
        channels: settings?.channels ? JSON.parse(settings.channels) : ['WHATSAPP', 'FACEBOOK'],
        widgetEnabled: settings?.widgetEnabled === true,
        widgetColor: settings?.widgetColor || '#4f46e5',
      },
    });
  } catch (error) {
    console.error('Error loading bot automation settings:', error);
    return res.status(500).json({ success: false, error: 'Failed to load bot automation settings' });
  }
});

router.put('/settings', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const prisma = getSharedPrismaClient();
    const channels = normalizeSettingsChannels(req.body?.channels);
    const widgetColor = String(req.body?.widgetColor || '#4f46e5').trim();
    await prisma.botAutomationSettings.upsert({
      where: { companyId },
      update: {
        welcomeEnabled: req.body?.welcomeEnabled === true,
        welcomeMessage: String(req.body?.welcomeMessage || '').trim(),
        defaultReplyEnabled: req.body?.defaultReplyEnabled === true,
        defaultReply: String(req.body?.defaultReply || '').trim(),
        channels: JSON.stringify(channels),
        widgetEnabled: req.body?.widgetEnabled === true,
        widgetColor,
        updatedAt: new Date(),
      },
      create: {
        companyId,
        welcomeEnabled: req.body?.welcomeEnabled === true,
        welcomeMessage: String(req.body?.welcomeMessage || '').trim(),
        defaultReplyEnabled: req.body?.defaultReplyEnabled === true,
        defaultReply: String(req.body?.defaultReply || '').trim(),
        channels: JSON.stringify(channels),
        widgetEnabled: req.body?.widgetEnabled === true,
        widgetColor,
      },
    });
    return res.json({ success: true, message: 'Bot automation settings saved' });
  } catch (error) {
    console.error('Error saving bot automation settings:', error);
    return res.status(500).json({ success: false, error: 'Failed to save bot automation settings' });
  }
});

router.get('/rules', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const rules = await getSharedPrismaClient().botAutomationRule.findMany({
      where: { companyId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
    return res.json({
      success: true,
      data: rules.map((r) => ({
        id: r.id,
        name: r.name,
        channels: r.channels ? JSON.parse(r.channels) : ['WHATSAPP', 'FACEBOOK'],
        matchMode: r.matchMode,
        keywords: r.keywords ? JSON.parse(r.keywords) : [],
        replyType: r.replyType,
        replyText: r.replyText || '',
        mediaUrl: r.mediaUrl || '',
        buttons: r.buttons ? JSON.parse(r.buttons) : [],
        priority: r.priority,
        isEnabled: r.isEnabled,
        stopFurtherProcessing: r.stopFurtherProcessing,
      })),
    });
  } catch (error) {
    console.error('Error loading bot automation rules:', error);
    return res.status(500).json({ success: false, error: 'Failed to load bot automation rules' });
  }
});

function validateRuleInput(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    return { errors: ['Invalid body'] };
  }
  const name = String(body.name || '').trim();
  if (!name) errors.push('Rule name is required');
  const keywords = normalizeKeywordList(body.keywords);
  if (keywords.length === 0) errors.push('At least one keyword is required');
  const matchMode = MATCH_MODES.includes(body.matchMode) ? body.matchMode : 'CONTAINS';
  const replyType = REPLY_TYPES.includes(body.replyType) ? body.replyType : 'TEXT';
  const channels = normalizeChannels(body.channels);
  if (channels.length === 0) errors.push('At least one channel is required');
  if (replyType === 'TEXT' && !String(body.replyText || '').trim()) {
    errors.push('Reply text is required for TEXT reply');
  }
  if (replyType !== 'TEXT' && !String(body.mediaUrl || '').trim()) {
    errors.push('Media URL is required for media reply');
  }
  return {
    errors,
    data: {
      name,
      keywords,
      matchMode,
      replyType,
      replyText: String(body.replyText || '').trim(),
      mediaUrl: String(body.mediaUrl || '').trim(),
      buttons: Array.isArray(body.buttons)
        ? body.buttons
            .filter((b) => b && typeof b === 'object' && String(b.title || '').trim())
            .map((b) => ({
              title: String(b.title).trim(),
              payload: String(b.payload || '').trim(),
            }))
        : [],
      priority: Number.isInteger(Number(body.priority)) ? Number(body.priority) : 0,
      isEnabled: body.isEnabled !== false,
      stopFurtherProcessing: body.stopFurtherProcessing !== false,
      channels,
    },
  };
}

router.post('/rules', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const { errors, data } = validateRuleInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: errors.join(' ΓÇö ') });
    }
    const rule = await getSharedPrismaClient().botAutomationRule.create({
      data: {
        companyId,
        name: data.name,
        channels: JSON.stringify(data.channels),
        matchMode: data.matchMode,
        keywords: JSON.stringify(data.keywords),
        replyType: data.replyType,
        replyText: data.replyText,
        mediaUrl: data.mediaUrl,
        buttons: JSON.stringify(data.buttons),
        priority: data.priority,
        isEnabled: data.isEnabled,
        stopFurtherProcessing: data.stopFurtherProcessing,
      },
    });
    return res.json({ success: true, data: { id: rule.id } });
  } catch (error) {
    console.error('Error creating bot automation rule:', error);
    return res.status(500).json({ success: false, error: 'Failed to create bot automation rule' });
  }
});

router.put('/rules/:id', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const existing = await getSharedPrismaClient().botAutomationRule.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }
    const { errors, data } = validateRuleInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: errors.join(' ΓÇö ') });
    }
    await getSharedPrismaClient().botAutomationRule.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        channels: JSON.stringify(data.channels),
        matchMode: data.matchMode,
        keywords: JSON.stringify(data.keywords),
        replyType: data.replyType,
        replyText: data.replyText,
        mediaUrl: data.mediaUrl,
        buttons: JSON.stringify(data.buttons),
        priority: data.priority,
        isEnabled: data.isEnabled,
        stopFurtherProcessing: data.stopFurtherProcessing,
        updatedAt: new Date(),
      },
    });
    return res.json({ success: true, message: 'Rule updated' });
  } catch (error) {
    console.error('Error updating bot automation rule:', error);
    return res.status(500).json({ success: false, error: 'Failed to update bot automation rule' });
  }
});

router.delete('/rules/:id', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const existing = await getSharedPrismaClient().botAutomationRule.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }
    await getSharedPrismaClient().botAutomationRule.delete({ where: { id: existing.id } });
    return res.json({ success: true, message: 'Rule deleted' });
  } catch (error) {
    console.error('Error deleting bot automation rule:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete bot automation rule' });
  }
});

// ΓöÇΓöÇ Conversation Starters ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

router.get('/starters', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const starters = await getSharedPrismaClient().botConversationStarter.findMany({
      where: { companyId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return res.json({
      success: true,
      data: starters.map((s) => ({
        id: s.id,
        name: s.name,
        channels: s.channels ? JSON.parse(s.channels) : ['WHATSAPP', 'FACEBOOK'],
        message: s.message || '',
        refCode: s.refCode || '',
        isEnabled: s.isEnabled,
        sortOrder: s.sortOrder,
      })),
    });
  } catch (error) {
    console.error('Error loading conversation starters:', error);
    return res.status(500).json({ success: false, error: 'Failed to load conversation starters' });
  }
});

router.get('/starters/links', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const starters = await getSharedPrismaClient().botConversationStarter.findMany({
      where: { companyId, isEnabled: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const links = [];
    for (const starter of starters) {
      const built = await buildStarterLinks(companyId, starter);
      if (built.channels.length > 0) links.push(built);
    }
    return res.json({ success: true, data: links });
  } catch (error) {
    console.error('Error building starter links:', error);
    return res.status(500).json({ success: false, error: 'Failed to build starter links' });
  }
});

function validateStarterInput(body) {
  const errors = [];
  if (!body || typeof body !== 'object') return { errors: ['Invalid body'] };
  const name = String(body.name || '').trim();
  if (!name) errors.push('Starter name is required');
  const channels = normalizeChannels(body.channels);
  if (channels.length === 0) errors.push('At least one channel is required');
  return {
    errors,
    data: {
      name,
      channels,
      message: String(body.message || '').trim(),
      refCode: String(body.refCode || '').trim(),
      isEnabled: body.isEnabled !== false,
      sortOrder: Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
    },
  };
}

router.post('/starters', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const { errors, data } = validateStarterInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: errors.join(' ΓÇö ') });
    }
    const starter = await getSharedPrismaClient().botConversationStarter.create({
      data: {
        companyId,
        name: data.name,
        channels: JSON.stringify(data.channels),
        message: data.message,
        refCode: data.refCode,
        isEnabled: data.isEnabled,
        sortOrder: data.sortOrder,
      },
    });
    return res.json({ success: true, data: { id: starter.id } });
  } catch (error) {
    console.error('Error creating conversation starter:', error);
    return res.status(500).json({ success: false, error: 'Failed to create conversation starter' });
  }
});

router.put('/starters/:id', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const existing = await getSharedPrismaClient().botConversationStarter.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Starter not found' });
    }
    const { errors, data } = validateStarterInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: errors.join(' ΓÇö ') });
    }
    await getSharedPrismaClient().botConversationStarter.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        channels: JSON.stringify(data.channels),
        message: data.message,
        refCode: data.refCode,
        isEnabled: data.isEnabled,
        sortOrder: data.sortOrder,
        updatedAt: new Date(),
      },
    });
    return res.json({ success: true, message: 'Starter updated' });
  } catch (error) {
    console.error('Error updating conversation starter:', error);
    return res.status(500).json({ success: false, error: 'Failed to update conversation starter' });
  }
});

router.delete('/starters/:id', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const existing = await getSharedPrismaClient().botConversationStarter.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Starter not found' });
    }
    await getSharedPrismaClient().botConversationStarter.delete({ where: { id: existing.id } });
    return res.json({ success: true, message: 'Starter deleted' });
  } catch (error) {
    console.error('Error deleting conversation starter:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete conversation starter' });
  }
});

// ΓöÇΓöÇ Persistent Menu (Messenger) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

router.get('/menu', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const menu = await getSharedPrismaClient().botPersistentMenu.findUnique({
      where: { companyId },
    });
    const page = await getFacebookPage(companyId);
    return res.json({
      success: true,
      data: {
        isEnabled: menu?.isEnabled === true,
        pageId: menu?.pageId || page?.pageId || null,
        pageName: page?.pageName || null,
        hasPageConnected: Boolean(page),
        items: menu?.items ? JSON.parse(menu.items) : [],
      },
    });
  } catch (error) {
    console.error('Error loading persistent menu:', error);
    return res.status(500).json({ success: false, error: 'Failed to load persistent menu' });
  }
});

function normalizeMenuItems(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((it) => it && typeof it === 'object' && String(it.title || '').trim())
    .map((it) => {
      const type = it.type === 'web_url' ? 'web_url' : 'postback';
      const title = String(it.title).trim();
      if (type === 'web_url') {
        return { type, title, url: String(it.url || '').trim() };
      }
      return { type, title, payload: String(it.payload || '').trim() };
    });
}

router.put('/menu', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const prisma = getSharedPrismaClient();
    const items = normalizeMenuItems(req.body?.items);
    const isEnabled = req.body?.isEnabled !== false;
    const requestedPageId = req.body?.pageId ? String(req.body.pageId) : null;

    const page = requestedPageId
      ? await prisma.facebookPage.findFirst({ where: { companyId, pageId: requestedPageId } })
      : await getFacebookPage(companyId);

    const saved = await prisma.botPersistentMenu.upsert({
      where: { companyId },
      update: {
        pageId: page?.pageId || null,
        items: JSON.stringify(items),
        isEnabled,
        updatedAt: new Date(),
      },
      create: {
        companyId,
        pageId: page?.pageId || null,
        items: JSON.stringify(items),
        isEnabled,
      },
    });

    let push = null;
    if (isEnabled && items.length > 0 && page?.pageAccessToken) {
      push = await pushPersistentMenu({
        pageId: page.pageId,
        pageAccessToken: page.pageAccessToken,
        items,
      });
    }

    return res.json({
      success: true,
      data: { id: saved.id, pageId: page?.pageId || null, pageName: page?.pageName || null },
      push,
    });
  } catch (error) {
    console.error('Error saving persistent menu:', error);
    return res.status(500).json({ success: false, error: 'Failed to save persistent menu' });
  }
});

router.delete('/menu', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const prisma = getSharedPrismaClient();
    const existing = await prisma.botPersistentMenu.findUnique({ where: { companyId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Menu not found' });
    }
    await prisma.botPersistentMenu.delete({ where: { companyId } });
    return res.json({ success: true, message: 'Menu deleted' });
  } catch (error) {
    console.error('Error deleting persistent menu:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete persistent menu' });
  }
});

// ΓöÇΓöÇ Audience: Unsubscribers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

router.get('/audience/unsubscribers', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const data = await listUnsubscribers(companyId);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error listing unsubscribers:', error);
    return res.status(500).json({ success: false, error: 'Failed to list unsubscribers' });
  }
});

router.delete('/audience/unsubscribers/:customerId', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const channel = String(req.query.channel || 'WHATSAPP').toUpperCase();
    await removeUnsubscribe(companyId, req.params.customerId, channel);
    return res.json({ success: true, message: 'Resubscribed' });
  } catch (error) {
    console.error('Error resubscribing customer:', error);
    return res.status(500).json({ success: false, error: 'Failed to resubscribe' });
  }
});

// ΓöÇΓöÇ Audience: Custom Fields ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

router.get('/audience/fields', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const fields = await getSharedPrismaClient().botCustomField.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });
    return res.json({ success: true, data: fields.map((f) => ({ id: f.id, name: f.name, key: f.key })) });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to load custom fields' });
  }
});

router.post('/audience/fields', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const name = String(req.body?.name || '').trim();
    if (!name) {
      return res.status(400).json({ success: false, error: 'Field name is required' });
    }
    const key = String(req.body?.key || name).trim().toLowerCase().replace(/\s+/g, '_');
    const field = await getSharedPrismaClient().botCustomField.create({ data: { companyId, name, key } });
    return res.json({ success: true, data: { id: field.id } });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Field key already exists' });
    }
    return res.status(500).json({ success: false, error: 'Failed to create custom field' });
  }
});

router.delete('/audience/fields/:id', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const existing = await getSharedPrismaClient().botCustomField.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Field not found' });
    }
    await getSharedPrismaClient().botCustomField.delete({ where: { id: existing.id } });
    return res.json({ success: true, message: 'Field deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete custom field' });
  }
});

// ΓöÇΓöÇ Audience: Segments ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

router.get('/audience/segments', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const segments = await getSharedPrismaClient().botSegment.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({
      success: true,
      data: segments.map((s) => ({
        id: s.id,
        name: s.name,
        rules: s.rules ? JSON.parse(s.rules) : [],
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to load segments' });
  }
});

function normalizeSegmentRules(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((r) => r && typeof r === 'object' && String(r.field || '').trim() && String(r.value ?? '').toString().trim())
    .map((r) => ({
      field: String(r.field).trim(),
      op: ['eq', 'contains', 'gte', 'lte'].includes(r.op) ? r.op : 'eq',
      value: String(r.value).trim(),
    }));
}

router.post('/audience/segments', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const name = String(req.body?.name || '').trim();
    if (!name) {
      return res.status(400).json({ success: false, error: 'Segment name is required' });
    }
    const rules = normalizeSegmentRules(req.body?.rules);
    const segment = await getSharedPrismaClient().botSegment.create({
      data: { companyId, name, rules: JSON.stringify(rules) },
    });
    return res.json({ success: true, data: { id: segment.id } });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to create segment' });
  }
});

router.put('/audience/segments/:id', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const existing = await getSharedPrismaClient().botSegment.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Segment not found' });
    }
    const data = {};
    if (req.body?.name !== undefined) data.name = String(req.body.name).trim();
    if (req.body?.rules !== undefined) data.rules = JSON.stringify(normalizeSegmentRules(req.body.rules));
    await getSharedPrismaClient().botSegment.update({ where: { id: existing.id }, data: { ...data, updatedAt: new Date() } });
    return res.json({ success: true, message: 'Segment updated' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update segment' });
  }
});

router.delete('/audience/segments/:id', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const existing = await getSharedPrismaClient().botSegment.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Segment not found' });
    }
    await getSharedPrismaClient().botSegment.delete({ where: { id: existing.id } });
    return res.json({ success: true, message: 'Segment deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete segment' });
  }
});

router.get('/audience/segments/:id/preview', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }
    const segment = await getSharedPrismaClient().botSegment.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!segment) {
      return res.status(404).json({ success: false, error: 'Segment not found' });
    }
    const customers = await evaluateSegment(companyId, segment);
    return res.json({ success: true, data: { count: customers.length, customers: customers.slice(0, 100) } });
  } catch (error) {
    console.error('Error previewing segment:', error);
    return res.status(500).json({ success: false, error: 'Failed to preview segment' });
  }
});

module.exports = router;
