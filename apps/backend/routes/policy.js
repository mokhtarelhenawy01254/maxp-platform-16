const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const episodicMemoryService = { generateEmbeddingAsync: async () => null };
const aiServiceAdminClient = require('../services/aiServiceAdminClient');
const verifyToken = require("../utils/verifyToken");

const getPrisma = () => getSharedPrismaClient();

async function _autoEmbedPolicy(policy) {
  try {
    const categoryLabel = String(policy.category || 'general');
    const tags = Array.isArray(policy.tags) ? policy.tags.join(', ') : '';
    const text = [
      `[Knowledge Type: Policy]`,
      `Policy title: ${String(policy.title || '')}`,
      `Policy content: ${String(policy.content || '')}`,
      `Category: ${categoryLabel}`,
      tags ? `Tags: ${tags}` : '',
    ].filter(Boolean).join('\n');
    const embedding = await episodicMemoryService.generateEmbeddingAsync(text);
    await getPrisma().policy.update({
      where: { id: policy.id },
      data: {
        embedding: JSON.stringify(embedding),
        embeddingGeneratedAt: new Date(),
      },
    });
  } catch (err) {
    console.warn(`[POLICY] Auto-embedding failed for ${policy.id}:`, err.message);
  }
}

const normalizeTagsForWrite = (tags) => {
  if (Array.isArray(tags)) return JSON.stringify(tags);
  if (typeof tags === 'string') return tags;
  if (tags == null) return null;
  return JSON.stringify([String(tags)]);
};

const normalizeTagsForRead = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [String(tags)];
  } catch {
    return String(tags)
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
  }
};

const serializePolicy = (policy) => ({
  ...policy,
  tags: normalizeTagsForRead(policy.tags)
});

// Get all policies
router.get('/', verifyToken.optionalAuth, async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const companyId = req.user?.companyId || req.query.companyId;

    const where = {};
    if (companyId) where.companyId = companyId;
    if (category && category !== 'all') where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const policies = await getPrisma().policy.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const serialized = policies.map(serializePolicy);
    res.json(serialized);
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'فشل تحميل السياسات' });
  }
});

// Batch create policies (for Starter Packs or CSV Import)
router.post('/batch', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'معرف الشركة مطلوب' });
    }

    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'قائمة السياسات مطلوبة' });
    }

    const createdList = [];
    for (const item of items) {
      if (!item.title || !String(item.title).trim() || !item.content || !String(item.content).trim()) {
        continue;
      }
      const policy = await getPrisma().policy.create({
        data: {
          title: String(item.title).trim(),
          content: String(item.content).trim(),
          category: item.category ? String(item.category).trim() : 'general',
          tags: normalizeTagsForWrite(item.tags),
          isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
          effectiveAt: item.effectiveAt ? new Date(item.effectiveAt) : new Date(),
          companyId,
          version: 1
        }
      });
      createdList.push(serializePolicy(policy));
      _autoEmbedPolicy(policy).catch(() => {});
      aiServiceAdminClient.embedKnowledgeItem({
        sourceId: policy.id, sourceType: 'policy', companyId,
        title: policy.title, content: policy.content,
        category: policy.category || '', tags: policy.tags || '',
      }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: `تم إنشاء ${createdList.length} سياسة بنجاح`,
      count: createdList.length,
      data: createdList
    });
  } catch (error) {
    console.error('Error batch creating policies:', error);
    res.status(500).json({ error: 'فشل إنشاء السياسات المجمعة' });
  }
});

// Create policy
router.post('/', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { title, content, category, tags, isActive, effectiveAt, expiresAt } = req.body;
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'معرف الشركة مطلوب' });
    }
    if (!title || !String(title).trim() || !content || !String(content).trim()) {
      return res.status(400).json({ error: 'عنوان السياسة ونصوص البنود مطلوبان' });
    }

    const policy = await getPrisma().policy.create({
      data: {
        title: String(title).trim(),
        content: String(content).trim(),
        category: category ? String(category).trim() : 'general',
        tags: normalizeTagsForWrite(tags),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        effectiveAt: effectiveAt ? new Date(effectiveAt) : new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        companyId,
        version: 1
      }
    });

    _autoEmbedPolicy(policy).catch(() => {});
    aiServiceAdminClient.embedKnowledgeItem({
      sourceId: policy.id, sourceType: 'policy', companyId,
      title: policy.title, content: policy.content,
      category: policy.category || '', tags: policy.tags || '',
    }).catch(() => {});
    res.status(201).json(serializePolicy(policy));
  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({ error: 'فشل إنشاء السياسة' });
  }
});

// Update policy
router.put('/:id', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, tags, isActive, effectiveAt, expiresAt } = req.body;
    const companyId = req.user?.companyId;
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'superadmin';

    const existing = await getPrisma().policy.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'السياسة غير موجودة' });
    }

    if (!isSuperAdmin && companyId && existing.companyId !== companyId) {
      return res.status(403).json({ error: 'غير مصرح لك بتعديل هذه السياسة' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = String(title).trim();
    if (content !== undefined) updateData.content = String(content).trim();
    if (category !== undefined) updateData.category = String(category).trim();
    if (tags !== undefined) updateData.tags = normalizeTagsForWrite(tags);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (effectiveAt !== undefined) updateData.effectiveAt = new Date(effectiveAt);
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const policy = await getPrisma().policy.update({
      where: { id },
      data: updateData
    });

    _autoEmbedPolicy(policy).catch(() => {});
    aiServiceAdminClient.embedKnowledgeItem({
      sourceId: policy.id, sourceType: 'policy', companyId: policy.companyId,
      title: policy.title, content: policy.content,
      category: policy.category || '', tags: policy.tags || '',
    }).catch(() => {});
    res.json(serializePolicy(policy));
  } catch (error) {
    console.error('Error updating policy:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'السياسة غير موجودة' });
    }
    res.status(500).json({ error: 'فشل تحديث السياسة' });
  }
});

// Delete policy
router.delete('/:id', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'superadmin';

    const existing = await getPrisma().policy.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'السياسة غير موجودة' });
    }

    if (!isSuperAdmin && companyId && existing.companyId !== companyId) {
      return res.status(403).json({ error: 'غير مصرح لك بحذف هذه السياسة' });
    }

    await getPrisma().policy.delete({ where: { id } });
    aiServiceAdminClient.deleteKnowledgeEmbeddingItem(id, 'policy').catch(() => {});

    res.json({ message: 'تم حذف السياسة بنجاح' });
  } catch (error) {
    console.error('Error deleting policy:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'السياسة غير موجودة' });
    }
    res.status(500).json({ error: 'فشل حذف السياسة' });
  }
});

module.exports = router;
