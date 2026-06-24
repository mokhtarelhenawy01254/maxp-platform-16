const { getSharedPrismaClient } = require('../services/sharedDatabase');
const MetaCloudProvider = require('../services/whatsapp/providers/MetaCloudProvider');
const { WhatsAppMessageHandler } = require('../services/whatsapp');

async function resolveActiveSessionId(companyId, sessionId) {
  if (!sessionId) return companyId ? `company:${companyId}` : null;
  if (sessionId.startsWith('company:') || sessionId.startsWith('session:')) return sessionId;
  const session = await getSharedPrismaClient().whatsAppSession.findFirst({
    where: { id: sessionId, companyId },
    select: { id: true }
  });
  return session?.id || sessionId;
}

async function listMetaTemplates(req, res) {
  try {
    const { companyId } = req.user;
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId مطلوب' });
    }

    const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
    const session = await getSharedPrismaClient().whatsAppSession.findFirst({
      where: { id: targetSessionId, companyId }
    });

    if (!session) {
      return res.status(404).json({ error: 'الجلسة غير موجودة' });
    }

    const templates = await MetaCloudProvider.listTemplates(targetSessionId);
    res.json({ success: true, templates });
  } catch (error) {
    console.error('Error listing Meta templates:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء جلب القوالب' });
  }
}

async function createMetaTemplate(req, res) {
  try {
    const { companyId } = req.user;
    const { sessionId, name, language, category, components, allowCategoryChange } = req.body;

    if (!sessionId || !name || !language || !category) {
      return res.status(400).json({ error: 'الحقول التالية مطلوبة: sessionId, name, language, category' });
    }

    const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
    const session = await getSharedPrismaClient().whatsAppSession.findFirst({
      where: { id: targetSessionId, companyId }
    });

    if (!session) {
      return res.status(404).json({ error: 'الجلسة غير موجودة' });
    }

    const result = await MetaCloudProvider.createTemplate(targetSessionId, {
      name, language, category, components: components || [], allowCategoryChange
    });

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error creating Meta template:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء إنشاء القالب' });
  }
}

async function updateMetaTemplate(req, res) {
  try {
    const { companyId } = req.user;
    const { sessionId, templateName } = req.body;

    if (!sessionId || !templateName) {
      return res.status(400).json({ error: 'sessionId و templateName مطلوبان' });
    }

    const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
    const session = await getSharedPrismaClient().whatsAppSession.findFirst({
      where: { id: targetSessionId, companyId }
    });

    if (!session) {
      return res.status(404).json({ error: 'الجلسة غير موجودة' });
    }

    const updateData = {};
    if (req.body.components) updateData.components = req.body.components;
    if (req.body.language) updateData.language = req.body.language;
    if (req.body.category) updateData.category = req.body.category;

    if (!updateData.components && !updateData.language && !updateData.category) {
      return res.status(400).json({ error: 'يجب توفير components أو language أو category للتحديث' });
    }

    const result = await MetaCloudProvider.updateTemplate(targetSessionId, templateName, updateData);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error updating Meta template:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء تحديث القالب' });
  }
}

async function deleteMetaTemplate(req, res) {
  try {
    const { companyId } = req.user;
    const { sessionId, templateName } = req.body;

    if (!sessionId || !templateName) {
      return res.status(400).json({ error: 'sessionId و templateName مطلوبان' });
    }

    const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
    const session = await getSharedPrismaClient().whatsAppSession.findFirst({
      where: { id: targetSessionId, companyId }
    });

    if (!session) {
      return res.status(404).json({ error: 'الجلسة غير موجودة' });
    }

    const result = await MetaCloudProvider.deleteTemplate(targetSessionId, templateName);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error deleting Meta template:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء حذف القالب' });
  }
}

async function broadcastMetaTemplate(req, res) {
  try {
    const { companyId } = req.user;
    const { sessionId, templateName, languageCode, components, recipients } = req.body;

    if (!sessionId || !templateName || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'sessionId, templateName, recipients (مصفوفة) مطلوبة' });
    }

    const targetSessionId = await resolveActiveSessionId(companyId, sessionId);
    const session = await getSharedPrismaClient().whatsAppSession.findFirst({
      where: { id: targetSessionId, companyId }
    });

    if (!session) {
      return res.status(404).json({ error: 'الجلسة غير موجودة' });
    }

    const results = { sent: 0, failed: 0, errors: [] };

    for (const recipient of recipients) {
      try {
        const to = recipient.to || recipient.phone;
        if (!to) {
          results.failed++;
          results.errors.push({ recipient, error: 'رقم الهاتف مطلوب' });
          continue;
        }

        const recipientComponents = recipient.components || components || [];
        const recipientLanguage = recipient.languageCode || languageCode || 'en';

        await MetaCloudProvider.sendTemplate(
          targetSessionId, to, templateName,
          recipientLanguage, recipientComponents
        );

        results.sent++;
      } catch (err) {
        results.failed++;
        results.errors.push({ recipient, error: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Error broadcasting Meta template:', error);
    res.status(500).json({ error: error.message || 'حدث خطأ أثناء إرسال البث' });
  }
}

module.exports = {
  listMetaTemplates,
  createMetaTemplate,
  updateMetaTemplate,
  deleteMetaTemplate,
  broadcastMetaTemplate
};