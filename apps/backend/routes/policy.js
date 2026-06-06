const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const episodicMemoryService = require('../legacy-ai-agent/aiAgent/episodicMemoryService');
const { requireAuth } = require('../middleware/auth');

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
router.get('/', async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const companyId = req.user?.companyId;

    const where = {};
    if (companyId) where.companyId = companyId;
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const policies = await getPrisma().policy.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(policies.map(serializePolicy));
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'فشل تحميل السياسات' });
  }
});

// Create policy
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, content, category, tags, isActive, effectiveAt, expiresAt } = req.body;
    const companyId = req.user.companyId;

    const policy = await getPrisma().policy.create({
      data: {
        title,
        content,
        category: category || 'general',
        tags: normalizeTagsForWrite(tags),
        isActive: isActive !== undefined ? isActive : true,
        effectiveAt: effectiveAt ? new Date(effectiveAt) : new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        companyId,
        version: 1
      }
    });

    _autoEmbedPolicy(policy).catch(() => {});
    res.status(201).json(serializePolicy(policy));
  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({ error: 'فشل إنشاء السياسة' });
  }
});

// Update policy
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, tags, isActive, effectiveAt, expiresAt } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = normalizeTagsForWrite(tags);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (effectiveAt !== undefined) updateData.effectiveAt = new Date(effectiveAt);
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const policy = await getPrisma().policy.update({
      where: { id },
      data: updateData
    });

    _autoEmbedPolicy(policy).catch(() => {});
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
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await getPrisma().policy.delete({ where: { id } });

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
