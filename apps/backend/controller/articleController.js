const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const { v4: uuidv4 } = require('uuid');

const slugify = (text) => {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || `article-${Date.now()}`;
};

const parseJson = (val, fallback) => {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
};

// Authenticated: list articles for current company
exports.getArticles = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId;
    if (!companyId) return res.status(400).json({ success: false, message: 'companyId missing' });
    const prisma = await getSharedPrismaClientAsync();
    const { page = 1, limit = 20, search = '', isPublished } = req.query;
    const where = { companyId };
    if (search) where.title = { contains: String(search), mode: 'insensitive' };
    if (isPublished === 'true') where.isPublished = true;
    if (isPublished === 'false') where.isPublished = false;
    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));
    const take = Math.min(100, parseInt(limit));
    const [items, total] = await Promise.all([
      prisma.article.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take }),
      prisma.article.count({ where }),
    ]);
    return res.json({ success: true, data: { items, total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) } });
  } catch (e) {
    console.error('getArticles error', e);
    return res.status(500).json({ success: false, message: e.message });
  }
};

exports.getArticle = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId;
    const prisma = await getSharedPrismaClientAsync();
    const article = await prisma.article.findFirst({ where: { id: req.params.id, companyId } });
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    return res.json({ success: true, data: article });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

exports.createArticle = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId;
    if (!companyId) return res.status(400).json({ success: false, message: 'companyId missing' });
    const prisma = await getSharedPrismaClientAsync();
    const { title, slug, excerpt, content, heroImage, authorName, authorTitle, category, tags, seoTitle, seoDescription, amazonProducts, faqItems, tocItems, sources, isPublished } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ success: false, message: 'Title required' });
    let finalSlug = slug ? slugify(slug) : slugify(title);
    // ensure unique
    let existing = await prisma.article.findFirst({ where: { companyId, slug: finalSlug } });
    if (existing) finalSlug = `${finalSlug}-${Date.now().toString(36)}`;
    const article = await prisma.article.create({
      data: {
        companyId,
        title: String(title).trim(),
        slug: finalSlug,
        excerpt: excerpt ? String(excerpt) : null,
        content: content ? (typeof content === 'string' ? content : JSON.stringify(content)) : null,
        heroImage: heroImage || null,
        authorName: authorName || 'Jake Morrison',
        authorTitle: authorTitle || null,
        category: category || 'Guides',
        tags: tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : null,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        amazonProducts: amazonProducts ? (typeof amazonProducts === 'string' ? amazonProducts : JSON.stringify(amazonProducts)) : null,
        faqItems: faqItems ? (typeof faqItems === 'string' ? faqItems : JSON.stringify(faqItems)) : null,
        tocItems: tocItems ? (typeof tocItems === 'string' ? tocItems : JSON.stringify(tocItems)) : null,
        sources: sources ? (typeof sources === 'string' ? sources : JSON.stringify(sources)) : null,
        isPublished: Boolean(isPublished),
        publishedAt: isPublished ? new Date() : null,
      },
    });
    return res.status(201).json({ success: true, data: article });
  } catch (e) {
    console.error('createArticle error', e);
    return res.status(500).json({ success: false, message: e.message });
  }
};

exports.updateArticle = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId;
    const prisma = await getSharedPrismaClientAsync();
    const existing = await prisma.article.findFirst({ where: { id: req.params.id, companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Article not found' });
    const { title, slug, excerpt, content, heroImage, authorName, authorTitle, category, tags, seoTitle, seoDescription, amazonProducts, faqItems, tocItems, sources, isPublished } = req.body;
    const data = {};
    if (title !== undefined) data.title = String(title).trim();
    if (slug !== undefined) {
      let s = slugify(slug);
      const dup = await prisma.article.findFirst({ where: { companyId, slug: s, NOT: { id: req.params.id } } });
      if (dup) s = `${s}-${Date.now().toString(36)}`;
      data.slug = s;
    }
    if (excerpt !== undefined) data.excerpt = excerpt ? String(excerpt) : null;
    if (content !== undefined) data.content = content ? (typeof content === 'string' ? content : JSON.stringify(content)) : null;
    if (heroImage !== undefined) data.heroImage = heroImage || null;
    if (authorName !== undefined) data.authorName = authorName || null;
    if (authorTitle !== undefined) data.authorTitle = authorTitle || null;
    if (category !== undefined) data.category = category || null;
    if (tags !== undefined) data.tags = tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : null;
    if (seoTitle !== undefined) data.seoTitle = seoTitle || null;
    if (seoDescription !== undefined) data.seoDescription = seoDescription || null;
    if (amazonProducts !== undefined) data.amazonProducts = amazonProducts ? (typeof amazonProducts === 'string' ? amazonProducts : JSON.stringify(amazonProducts)) : null;
    if (faqItems !== undefined) data.faqItems = faqItems ? (typeof faqItems === 'string' ? faqItems : JSON.stringify(faqItems)) : null;
    if (tocItems !== undefined) data.tocItems = tocItems ? (typeof tocItems === 'string' ? tocItems : JSON.stringify(tocItems)) : null;
    if (sources !== undefined) data.sources = sources ? (typeof sources === 'string' ? sources : JSON.stringify(sources)) : null;
    if (isPublished !== undefined) {
      data.isPublished = Boolean(isPublished);
      data.publishedAt = data.isPublished ? (existing.publishedAt || new Date()) : null;
    }
    const updated = await prisma.article.update({ where: { id: req.params.id }, data });
    return res.json({ success: true, data: updated });
  } catch (e) {
    console.error('updateArticle error', e);
    return res.status(500).json({ success: false, message: e.message });
  }
};

exports.deleteArticle = async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.companyId;
    const prisma = await getSharedPrismaClientAsync();
    const existing = await prisma.article.findFirst({ where: { id: req.params.id, companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Article not found' });
    await prisma.article.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// Public
exports.getPublicArticles = async (req, res) => {
  try {
    const companyId = req.companyId || req.query.companyId;
    if (!companyId) return res.status(400).json({ success: false, message: 'companyId required' });
    const prisma = await getSharedPrismaClientAsync();
    const { page = 1, limit = 9, search = '', category } = req.query;
    const where = { companyId, isPublished: true };
    if (search) where.title = { contains: String(search), mode: 'insensitive' };
    if (category) where.category = String(category);
    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(50, parseInt(limit));
    const take = Math.min(50, parseInt(limit));
    const [items, total] = await Promise.all([
      prisma.article.findMany({ where, orderBy: { publishedAt: 'desc' }, skip, take, select: { id: true, title: true, slug: true, excerpt: true, heroImage: true, category: true, authorName: true, publishedAt: true, createdAt: true, views: true } }),
      prisma.article.count({ where }),
    ]);
    return res.json({ success: true, data: { items, total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

exports.getPublicArticleBySlug = async (req, res) => {
  try {
    const companyId = req.companyId || req.query.companyId;
    if (!companyId) return res.status(400).json({ success: false, message: 'companyId required' });
    const prisma = await getSharedPrismaClientAsync();
    const slug = String(req.params.slug || '').trim();
    const article = await prisma.article.findFirst({ where: { companyId, slug, isPublished: true } });
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    // increment views async
    prisma.article.update({ where: { id: article.id }, data: { views: { increment: 1 } } }).catch(()=>{});
    return res.json({ success: true, data: article });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
