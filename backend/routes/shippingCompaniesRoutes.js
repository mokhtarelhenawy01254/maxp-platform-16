const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { requireAuth } = require('../middleware/auth');
const shippingProviderService = require('../services/shippingProviderService');

const buildSlug = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0621-\u064A]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const buildProviderFields = (body, carrier = {}) => {
  const providerKey = shippingProviderService.normalizeProviderKey(body.providerKey || carrier.providerKey, {
    ...carrier,
    name: body.name || carrier.name,
    slug: body.slug || carrier.slug,
  });
  const integrationMode = shippingProviderService.normalizeIntegrationMode(
    body.integrationMode || carrier.integrationMode,
    providerKey,
  );
  const settings = shippingProviderService.normalizeSettings(
    body.settings !== undefined ? body.settings : carrier.settings,
    providerKey,
    integrationMode,
  );

  if (body.autoCreateShipments !== undefined) {
    settings.autoCreateShipments = Boolean(body.autoCreateShipments);
  }

  return {
    providerKey,
    integrationMode,
    settings: shippingProviderService.safeJsonStringify(settings),
  };
};

// Get all shipping companies for the current company
router.get('/', requireAuth, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { companyId } = req.user;

    const companies = await prisma.shippingCompany.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: companies });
  } catch (error) {
    console.error('Error fetching shipping companies:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add temporary demo providers for UAT/sandbox flows.
router.post('/demo-carriers', requireAuth, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { companyId } = req.user;

    const carriers = await shippingProviderService.ensureDemoShippingCompanies(prisma, companyId);

    res.json({
      success: true,
      message: 'تم تجهيز شركات الشحن الديمو',
      data: carriers,
    });
  } catch (error) {
    console.error('Error ensuring demo shipping carriers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single shipping company by ID or slug
router.get('/:idOrSlug', requireAuth, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { idOrSlug } = req.params;
    const { companyId } = req.user;

    let company;
    
    // Try to find by slug first (if it looks like a slug - no cuid format)
    if (!idOrSlug.startsWith('cml') && !idOrSlug.startsWith('clr')) {
      company = await prisma.shippingCompany.findFirst({
        where: { 
          slug: idOrSlug,
          companyId 
        }
      });
    }
    
    // If not found by slug, try by ID
    if (!company) {
      company = await prisma.shippingCompany.findFirst({
        where: { 
          id: idOrSlug,
          companyId 
        }
      });
    }

    if (!company) {
      return res.status(404).json({ success: false, error: 'لم يتم العثور على الشركة' });
    }

    res.json({ success: true, data: company });
  } catch (error) {
    console.error('Error fetching shipping company:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new shipping company
router.post('/', requireAuth, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { companyId } = req.user;
    const { name, slug, phone, email, website, apiKey, apiUrl, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'اسم الشركة مطلوب' });
    }

    // Auto-generate slug if not provided
    const companySlug = slug || buildSlug(name);
    const providerFields = buildProviderFields({ ...req.body, slug: companySlug });

    const company = await prisma.shippingCompany.create({
      data: {
        name,
        slug: companySlug,
        phone,
        email,
        website,
        apiKey,
        apiUrl,
        ...providerFields,
        isActive: isActive !== undefined ? isActive : true,
        companyId
      }
    });

    res.json({ success: true, data: company });
  } catch (error) {
    console.error('Error creating shipping company:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update a shipping company
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { id } = req.params;
    const { companyId } = req.user;
    const { name, slug, phone, email, website, apiKey, apiUrl, isActive } = req.body;

    // Check if company exists and belongs to user
    const existing = await prisma.shippingCompany.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    // Auto-generate slug if name changed and no slug provided
    let companySlug = slug;
    if (!companySlug && name && name !== existing.name) {
      companySlug = buildSlug(name);
    }
    const providerFields = buildProviderFields(
      { ...req.body, slug: companySlug || existing.slug },
      existing,
    );

    const updated = await prisma.shippingCompany.update({
      where: { id },
      data: {
        name,
        slug: companySlug || slug,
        phone,
        email,
        website,
        apiKey,
        apiUrl,
        ...providerFields,
        isActive
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating shipping company:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a shipping company
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { id } = req.params;
    const { companyId } = req.user;

    // Check if company exists and belongs to user
    const existing = await prisma.shippingCompany.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    await prisma.shippingCompany.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting shipping company:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
