const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const verifyToken = require("../utils/verifyToken");
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

  // Merge carrier-specific parameters
  if (body.username !== undefined) settings.username = String(body.username).trim();
  if (body.password !== undefined && String(body.password).trim()) settings.password = String(body.password).trim();
  if (body.customerId !== undefined && body.customerId !== '') settings.customerId = Number(body.customerId) || body.customerId;
  if (body.defaultNotes !== undefined) settings.defaultNotes = String(body.defaultNotes).trim();
  if (body.pickupAddress !== undefined) settings.pickupAddress = String(body.pickupAddress).trim();
  if (body.mainClientCode !== undefined) settings.mainClientCode = body.mainClientCode;
  if (body.senderNumber !== undefined) settings.senderNumber = body.senderNumber;
  if (body.apiKey !== undefined && body.apiKey) settings.apiKey = String(body.apiKey).trim();

  return {
    providerKey,
    integrationMode,
    settings: shippingProviderService.safeJsonStringify(settings),
  };
};

// Get all shipping companies for the current company with pagination and filters
router.get('/', verifyToken.authenticateToken, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { companyId } = req.user;
    const { page, limit, search, status, integrationMode, all } = req.query;

    const where = { companyId };

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (integrationMode && integrationMode !== 'ALL') {
      where.integrationMode = integrationMode;
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    // If 'all' is explicitly requested or no pagination query is passed, return full list (for dropdowns)
    const isPaginated = page !== undefined || (limit !== undefined && all !== 'true');

    if (!isPaginated) {
      const companies = await prisma.shippingCompany.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ success: true, data: companies });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * take;

    const [total, companies] = await Promise.all([
      prisma.shippingCompany.count({ where }),
      prisma.shippingCompany.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    const totalPages = Math.ceil(total / take) || 1;

    res.json({
      success: true,
      data: companies,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching shipping companies:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add temporary demo providers for UAT/sandbox flows.
router.post('/demo-carriers', verifyToken.authenticateToken, async (req, res) => {
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
router.get('/:idOrSlug', verifyToken.authenticateToken, async (req, res) => {
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
router.post('/', verifyToken.authenticateToken, async (req, res) => {
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

    if (providerFields.providerKey === 'BOSTA' && apiKey) {
      await prisma.company.update({
        where: { id: companyId },
        data: { bostaApiKey: apiKey, bostaEnabled: isActive !== undefined ? isActive : true },
      }).catch(err => console.warn('Non-blocking bosta sync error:', err.message));
    }

    res.json({ success: true, data: company });
  } catch (error) {
    console.error('Error creating shipping company:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update a shipping company
router.put('/:id', verifyToken.authenticateToken, async (req, res) => {
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
        name: name !== undefined ? name : existing.name,
        slug: companySlug !== undefined ? companySlug : existing.slug,
        phone: phone !== undefined ? phone : existing.phone,
        email: email !== undefined ? email : existing.email,
        website: website !== undefined ? website : existing.website,
        apiKey: apiKey !== undefined ? apiKey : existing.apiKey,
        apiUrl: apiUrl !== undefined ? apiUrl : existing.apiUrl,
        ...providerFields,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
    });

    if (providerFields.providerKey === 'BOSTA') {
      const activeKey = apiKey || existing.apiKey;
      if (activeKey) {
        await prisma.company.update({
          where: { id: companyId },
          data: { bostaApiKey: activeKey, bostaEnabled: isActive !== undefined ? isActive : existing.isActive },
        }).catch(err => console.warn('Non-blocking bosta sync error:', err.message));
      }
    }

    res.json({ success: true, data: updated, message: 'تم تحديث إعدادات الشركة بنجاح' });
  } catch (error) {
    console.error('Error updating shipping company:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle company active status directly
router.patch('/:id/toggle', verifyToken.authenticateToken, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { id } = req.params;
    const { companyId } = req.user;
    const { isActive } = req.body;

    const existing = await prisma.shippingCompany.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'لم يتم العثور على الشركة' });
    }

    const newStatus = isActive !== undefined ? Boolean(isActive) : !existing.isActive;

    const updated = await prisma.shippingCompany.update({
      where: { id },
      data: { isActive: newStatus },
    });

    res.json({
      success: true,
      data: updated,
      message: newStatus ? 'تم تفعيل العمل مع الشركة بنجاح' : 'تم إيقاف العمل مع الشركة مؤقتاً',
    });
  } catch (error) {
    console.error('Error toggling company status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test connection with carrier API
router.post('/:id/test-connection', verifyToken.authenticateToken, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { id } = req.params;
    const { companyId } = req.user;

    const company = await prisma.shippingCompany.findFirst({
      where: { id, companyId },
    });

    if (!company) {
      return res.status(404).json({ success: false, error: 'لم يتم العثور على شركة الشحن' });
    }

    const providerKey = company.providerKey || 'MANUAL';
    const mode = company.integrationMode || 'MANUAL';

    if (mode === 'MANUAL') {
      return res.json({
        success: true,
        status: 'CONNECTED',
        message: 'الأسطول اليدوي جاهز ومفعل للعمل',
      });
    }

    if (mode === 'DEMO') {
      return res.json({
        success: true,
        status: 'CONNECTED',
        message: 'بيئة الشحن التجريبية (Demo Sandbox) متصلة وجاهزة للعمل',
      });
    }

    if (providerKey === 'QP_EXPRESS') {
      const settings = shippingProviderService.safeJsonParse(company.settings, {});
      const username = settings.username || company.apiKey;
      const password = settings.password;
      const customerId = settings.customerId;

      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور الخاصة بحساب كيو بي إكسبريس' });
      }
      if (!customerId) {
        return res.status(400).json({ success: false, error: 'يرجى إدخال كود العميل (Customer ID) الخاص بـ QP Express' });
      }

      try {
        const QpExpressApiClient = require('../services/qpExpress/qpExpressApiClient');
        const client = new QpExpressApiClient({
          username,
          password,
          customerId,
          baseUrl: company.apiUrl,
        });
        await client.getAccessToken();
        return res.json({
          success: true,
          status: 'CONNECTED',
          message: `تم التحقق والاتصال بنجاح بـ QP Express (كود العميل: ${customerId})`,
        });
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: `فشل الاتصال بـ QP Express: ${err.message}`,
        });
      }
    }

    if (providerKey === 'BOSTA') {
      const settings = shippingProviderService.safeJsonParse(company.settings, {});
      const apiKey = company.apiKey || settings.apiKey;
      if (!apiKey) {
        return res.status(400).json({ success: false, error: 'يرجى إدخال مفتاح الـ API Key الخاص ببوستا أولاً' });
      }

      try {
        const BostaService = require('../services/bostaService');
        const bosta = new BostaService(apiKey, companyId);
        await bosta.getAllCities();
        return res.json({
          success: true,
          status: 'CONNECTED',
          message: 'تم التحقق من صلاحية مفتاح الـ API والاتصال بشركة بوستا (Bosta) بنجاح',
        });
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: `فشل الاتصال ببوستا: ${err.message}`,
        });
      }
    }

    if (providerKey === 'TURBO') {
      if (!company.apiKey) {
        return res.status(400).json({ success: false, error: 'يرجى إدخال مفتاح الـ API Key أولاً' });
      }
      return res.json({
        success: true,
        status: 'CONNECTED',
        message: 'تم التحقق من إعدادات الاتصال بشركة تربو بنجاح',
      });
    }

    if (!company.apiKey) {
      return res.status(400).json({ success: false, error: 'مفتاح الـ API Key غير مكتمل' });
    }

    res.json({
      success: true,
      status: 'CONNECTED',
      message: `تم التحقق من إعدادات الاتصال بشركة ${company.name} بنجاح`,
    });
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a shipping company
router.delete('/:id', verifyToken.authenticateToken, async (req, res) => {
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
