const overlayCampaignService = require('../services/overlayCampaignService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function ensureCompanyAccess(req, campaignId) {
  const prisma = getSharedPrismaClient();
  const campaign = await prisma.overlayCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.companyId !== req.user.companyId) {
    const err = new Error('Campaign not found');
    err.status = 404;
    throw err;
  }
  return campaign;
}

exports.list = async (req, res) => {
  try {
    const campaigns = await overlayCampaignService.list(req.user.companyId);
    res.json({ success: true, data: campaigns });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const campaign = await ensureCompanyAccess(req, req.params.id);
    const full = await overlayCampaignService.getById(campaign.id);
    res.json({ success: true, data: full });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, overlayImage, startAt, endAt } = req.body;
    if (!name || !overlayImage) {
      return res.status(400).json({ success: false, error: 'name and overlayImage required' });
    }
    const campaign = await overlayCampaignService.create({
      companyId: req.user.companyId,
      name,
      overlayImage,
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      status: startAt ? 'SCHEDULED' : 'DRAFT',
    });
    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    await ensureCompanyAccess(req, req.params.id);
    const campaign = await overlayCampaignService.update(req.params.id, req.body);
    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await ensureCompanyAccess(req, req.params.id);
    await overlayCampaignService.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

exports.addProducts = async (req, res) => {
  try {
    await ensureCompanyAccess(req, req.params.id);
    const { productIds } = req.body;
    if (!Array.isArray(productIds) || !productIds.length) {
      return res.status(400).json({ success: false, error: 'productIds array required' });
    }
    await overlayCampaignService.addProducts(req.params.id, productIds);
    res.json({ success: true });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

exports.removeProduct = async (req, res) => {
  try {
    await ensureCompanyAccess(req, req.params.id);
    await overlayCampaignService.removeProduct(req.params.id, req.params.productId);
    res.json({ success: true });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

exports.applyOverlay = async (req, res) => {
  try {
    await ensureCompanyAccess(req, req.params.id);
    const results = await overlayCampaignService.applyOverlay(req.user.companyId, req.params.id);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { q } = req.query;
    const products = await prisma.product.findMany({
      where: {
        companyId: req.user.companyId,
        OR: q
          ? [
              { name: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
            ]
          : undefined,
      },
      select: { id: true, name: true, sku: true, images: true, price: true },
      take: 50,
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
