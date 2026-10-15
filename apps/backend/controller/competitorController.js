const CompetitorService = require('../services/competitorService');
const CompetitorFeatureService = require('../services/competitorFeatureService');
const CompetitorDevRecommendationService = require('../services/competitorDevRecommendationService');
const CompetitorMediaAnalysisService = require('../services/competitorMediaAnalysisService');
const CompetitorEncryptionService = require('../services/competitorEncryptionService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { t } = require('../services/i18n');
const getPrisma = () => getSharedPrismaClient();

exports.list = async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await CompetitorService.list(companyId, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching competitors:', error);
    res.status(500).json({ success: false, error: t('competitor.list_failed') });
  }
};

exports.getById = async (req, res) => {
  try {
    const { companyId } = req.user;
    const competitor = await CompetitorService.getById(companyId, req.params.id);
    if (!competitor) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.json({ success: true, data: competitor });
  } catch (error) {
    console.error('Error fetching competitor:', error);
    res.status(500).json({ success: false, error: t('competitor.get_failed') });
  }
};

exports.create = async (req, res) => {
  try {
    const { companyId } = req.user;
    const {
      name,
      url,
      platform,
      logo,
      description,
      notes,
      activityType,
      location,
      targetMarket,
      foundedYear,
      employeeCount,
      strengths,
      weaknesses,
      socialProfiles,
      status,
      founderName,
      founderLink,
      country,
      city,
      monthlyPrice,
      yearlyPrice,
      pricingNotes,
      trafficSource,
      price,
      currency,
      pricingCurrency,
      cycle,
      pricingCycle,
      metadata,
      activityImages,
      featureImages,
      mediaNotes,
      comparisons,
      devIdeas,
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ success: false, error: t('competitor.name_required') });
    }

    // Validate socialProfiles if provided
    if (socialProfiles) {
      if (!Array.isArray(socialProfiles)) {
        return res.status(400).json({ success: false, error: t('competitor.social_array_required') });
      }
      if (socialProfiles.length > 5) {
        return res.status(400).json({ success: false, error: t('competitor.max_social_profiles') });
      }
      const allowedPlatforms = ['instagram', 'facebook', 'twitter', 'tiktok', 'linkedin', 'youtube', 'snapchat', 'telegram', 'whatsapp'];
      const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
      for (const profile of socialProfiles) {
        if (!profile.platform || !allowedPlatforms.includes(profile.platform)) {
          return res.status(400).json({ success: false, error: t('competitor.invalid_platform', 'ar', { platform: profile.platform }) });
        }
        if (!profile.url || !urlRegex.test(profile.url)) {
          return res.status(400).json({ success: false, error: t('competitor.invalid_url', 'ar', { platform: profile.platform }) });
        }
      }
    }

    const createdCompetitor = await CompetitorService.create(companyId, {
      name, url, platform, logo, description, notes,
      activityType, location, targetMarket,
      foundedYear, employeeCount, strengths, weaknesses,
      socialProfiles, status,
      founderName, founderLink, country, city,
      monthlyPrice, yearlyPrice, pricingNotes, trafficSource,
      price,
      currency: currency || pricingCurrency,
      cycle: cycle || pricingCycle,
      metadata,
      activityImages, featureImages, mediaNotes, comparisons, devIdeas,
    });
    if (!createdCompetitor) return res.status(500).json({ success: false, error: t('competitor.create_failed') });
    res.status(201).json({ success: true, data: createdCompetitor });
  } catch (error) {
    console.error('Error creating competitor:', error);
    res.status(500).json({ success: false, error: t('competitor.create_failed') });
  }
};

exports.update = async (req, res) => {
  try {
    const { companyId } = req.user;
    const competitor = await CompetitorService.update(companyId, req.params.id, req.body);
    if (!competitor) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.json({ success: true, data: competitor });
  } catch (error) {
    console.error('Error updating competitor:', error);
    res.status(500).json({ success: false, error: t('competitor.update_failed') });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { status } = req.body;
    const validStatuses = ['NEW', 'FOLLOWING', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: t('competitor.invalid_status') });
    }
    const competitor = await getPrisma().competitor.findFirst({ where: { id: req.params.id, companyId } });
    if (!competitor) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    const updated = await getPrisma().competitor.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating competitor status:', error);
    res.status(500).json({ success: false, error: t('competitor.update_failed') });
  }
};

exports.getStatusCounts = async (req, res) => {
  try {
    const { companyId } = req.user;
    const counts = await CompetitorService.getStatusCounts(companyId);
    res.json({ success: true, data: counts });
  } catch (error) {
    console.error('Error fetching status counts:', error);
    res.status(500).json({ success: false, error: t('competitor.summary_failed') });
  }
};

exports.remove = async (req, res) => {
  try {
    const { companyId } = req.user;
    const deleted = await CompetitorService.remove(companyId, req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.json({ success: true, message: t('competitor.delete_success') });
  } catch (error) {
    console.error('Error deleting competitor:', error);
    res.status(500).json({ success: false, error: t('competitor.delete_failed') });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const { companyId } = req.user;
    const product = await CompetitorService.addProduct(companyId, req.params.id, req.body);
    if (!product) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error('Error adding competitor product:', error);
    res.status(500).json({ success: false, error: t('competitor.product_add_failed') });
  }
};

exports.listProducts = async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await CompetitorService.listProducts(companyId, req.params.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching competitor products:', error);
    res.status(500).json({ success: false, error: t('competitor.products_list_failed') });
  }
};

exports.getPriceHistory = async (req, res) => {
  try {
    const { companyId } = req.user;
    const history = await CompetitorService.getPriceHistory(companyId, req.params.productId);
    if (!history) return res.status(404).json({ success: false, error: t('competitor.product_not_found') });
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({ success: false, error: t('competitor.price_history_failed') });
  }
};

exports.addAd = async (req, res) => {
  try {
    const { companyId } = req.user;
    const ad = await CompetitorService.addAd(companyId, req.params.id, req.body);
    if (!ad) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.status(201).json({ success: true, data: ad });
  } catch (error) {
    console.error('Error adding competitor ad:', error);
    res.status(500).json({ success: false, error: t('competitor.ad_add_failed') });
  }
};

exports.listAds = async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await CompetitorService.listAds(companyId, req.params.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching competitor ads:', error);
    res.status(500).json({ success: false, error: t('competitor.ads_list_failed') });
  }
};

exports.generateReport = async (req, res) => {
  try {
    const { companyId } = req.user;
    const report = await CompetitorService.generateReport(companyId, req.params.id, req.body.type || 'weekly');
    if (!report) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ success: false, error: t('competitor.report_create_failed') });
  }
};

exports.listReports = async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await CompetitorService.listReports(companyId, req.params.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ success: false, error: t('competitor.reports_list_failed') });
  }
};

exports.getAllReports = async (req, res) => {
  try {
    const { companyId } = req.user;
    const where = { companyId };
    const [data, total] = await Promise.all([
      getPrisma().competitorReport.findMany({
        where,
        include: { competitor: { select: { id: true, name: true, status: true } } },
        orderBy: { generatedAt: 'desc' },
        take: 20,
      }),
      getPrisma().competitorReport.count({ where }),
    ]);
    res.json({ success: true, data, pagination: { total } });
  } catch (error) {
    res.status(500).json({ success: false, error: t('competitor.reports_list_failed') });
  }
};

exports.priceCompare = async (req, res) => {
  try {
    const { companyId } = req.user;
    const competitorId = req.params.id || req.params.competitorId;
    if (!competitorId) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    const competitor = await CompetitorService.getById(companyId, competitorId);
    if (!competitor) return res.status(404).json({ success: false, error: t('competitor.not_found') });

    const products = await getPrisma().competitorProduct.findMany({
      where: { competitorId },
      orderBy: { lastSeen: 'desc' },
    });

    const yourProducts = await getPrisma().product.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, price: true, sku: true },
    });

    res.json({
      success: true,
      data: {
        competitorName: competitor.name,
        competitorProductCount: products.length,
        yourProductCount: yourProducts.length,
        products: products.map(p => ({ name: p.name, price: p.price ? Number(p.price) : null, sku: p.sku, currency: p.currency })),
        gaps: products
          .filter(cp => !yourProducts.find(yp => yp.sku === cp.sku))
          .slice(0, 10)
          .map(p => ({ name: p.name, price: p.price ? Number(p.price) : null })),
      },
    });
  } catch (error) {
    console.error('Error in price comparison:', error);
    res.status(500).json({ success: false, error: t('competitor.price_compare_failed') });
  }
};

exports.getBattlecard = async (req, res) => {
  try {
    const { companyId } = req.user;
    const competitorId = req.params.id || req.params.competitorId;
    if (!competitorId) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    const format = req.query.format || 'structured';
    const prisma = getPrisma();

    const [competitor, myProducts, reports] = await Promise.all([
      prisma.competitor.findFirst({
        where: { id: competitorId, companyId },
        include: { _count: { select: { products: true, ads: true } } },
      }),
      prisma.product.findMany({
        where: { companyId, isActive: true },
        take: 100,
        select: { id: true, name: true, price: true, sku: true },
      }),
      prisma.competitorReport.findMany({
        where: { competitorId },
        orderBy: { generatedAt: 'desc' },
        take: 3,
      }),
    ]);

    if (!competitor) return res.status(404).json({ success: false, error: t('competitor.not_found') });

    const competitorProducts = await prisma.competitorProduct.findMany({
      where: { competitorId },
      take: 100,
      orderBy: { lastSeen: 'desc' },
    });

    const priceComparison = competitorProducts.map(cp => {
      const match = myProducts.find(yp =>
        yp.sku === cp.sku || yp.name.toLowerCase().includes(cp.name.toLowerCase().slice(0, 10))
      );
      return {
        competitorProduct: cp.name,
        competitorPrice: cp.price ? Number(cp.price) : null,
        yourProduct: match?.name || null,
        yourPrice: match?.price ? Number(match.price) : null,
        priceDiff: match && cp.price
          ? (((Number(cp.price) - Number(match.price)) / Number(match.price)) * 100).toFixed(1)
          : null,
      };
    }).filter(c => c.yourProduct);

    const lastReport = reports[0];
    const insights = lastReport?.insights ? JSON.parse(lastReport.insights) : {};

    const card = {
      competitor: {
        id: competitor.id,
        name: competitor.name,
        platform: competitor.platform,
        url: competitor.url,
        status: competitor.status,
        monthlyPrice: competitor.monthlyPrice ? Number(competitor.monthlyPrice) : null,
        yearlyPrice: competitor.yearlyPrice ? Number(competitor.yearlyPrice) : null,
        pricingNotes: competitor.pricingNotes || null,
        structuredPricing: competitor.metadata && typeof competitor.metadata === 'object' && competitor.metadata.structuredPricing
          ? competitor.metadata.structuredPricing
          : {
              price: competitor.monthlyPrice ? Number(competitor.monthlyPrice) : null,
              currency: 'EGP',
              cycle: 'monthly',
              monthlyPrice: competitor.monthlyPrice ? Number(competitor.monthlyPrice) : null,
              yearlyPrice: competitor.yearlyPrice ? Number(competitor.yearlyPrice) : null,
              notes: competitor.pricingNotes || '',
            },
      },
      metrics: {
        theirProducts: competitor._count.products,
        theirAds: competitor._count.ads,
        yourProducts: myProducts.length,
        priceComparisonCount: priceComparison.length,
      },
      lastReportDate: lastReport?.generatedAt || null,
      reportInsights: insights,
      priceComparison: priceComparison.slice(0, 10),
      gaps: competitorProducts
        .filter(cp => !myProducts.find(yp => yp.sku === cp.sku))
        .slice(0, 5)
        .map(p => ({ name: p.name, price: Number(p.price) })),
    };

    res.json({ success: true, data: card });
  } catch (error) {
    console.error('Error generating battlecard:', error);
    res.status(500).json({ success: false, error: t('competitor.get_failed') });
  }
};

const INDUSTRY_COMPETITORS_CATALOG = {
  software: [
    {
      suggestedName: 'منصة سلة (Salla)',
      url: 'https://salla.com',
      category: 'منصات التجارة والأنظمة السحابية',
      source: 'دليل منصات التجارة الإلكترونية وإدارة المتاجر',
      reason: 'منافس مباشر في قطاع التجارة الإلكترونية وإدارة الطلبات السحابية متطابق مع خدمات شركتك',
      keywords: ['كورس', 'نظام', 'برنامج', 'متجر', 'منصة', 'saas', 'software', 'erp', 'orders', 'ecommerce'],
    },
    {
      suggestedName: 'زد (Zid)',
      url: 'https://zid.sa',
      category: 'حلول التجارة المتكاملة',
      source: 'دليل أنظمة التجارة وتطبيقات نقاط البيع',
      reason: 'منظومة تجارة سحابية رائدة تقدم حلولاً منافسة لإدارة المخزون والمبيعات',
      keywords: ['متجر', 'نظام', 'مبيعات', 'تجارة', 'سحابي', 'erp', 'pos', 'store'],
    },
    {
      suggestedName: 'أودو (Odoo)',
      url: 'https://www.odoo.com',
      category: 'أنظمة إدارة الموارد والمخزون (ERP)',
      source: 'دليل برمجيات الأعمال وإدارة الشركات',
      reason: 'حل عالمي ومحلي لإدارة العمليات والمخازن والفوترة للشركات المتوسطة والصغيرة',
      keywords: ['erp', 'محاسبة', 'مخازن', 'مبيعات', 'إدارة', 'نظام', 'برنامج'],
    },
    {
      suggestedName: 'إيزي أوردرز (Easy Orders)',
      url: 'https://easy-orders.net',
      category: 'منصات تأكيد وتتبع الطلبات',
      source: 'دليل منصات التجارة الإلكترونية المحلية',
      reason: 'منصة إدارة وتأكيد طلبات الدفع عند الاستلام المباشرة للتجار',
      keywords: ['اوردرز', 'طلبات', 'تأكيد', 'شحن', 'orders', 'cod'],
    },
    {
      suggestedName: 'ويلت (Wuilt)',
      url: 'https://wuilt.com',
      category: 'بناء المتاجر والمواقع السحابية',
      source: 'دليل حلول التجارة الإلكترونية العربية',
      reason: 'منصة إنشاء مواقع ومتاجر إلكترونية للتجار ورواد الأعمال في الشرق الأوسط',
      keywords: ['متجر', 'موقع', 'ويب', 'تجارة'],
    },
    {
      suggestedName: 'دفترة (Daftra)',
      url: 'https://www.daftra.com',
      category: 'برامج الفوترة والحسابات السحابية',
      source: 'دليل البرمجيات المحاسبية وإدارة الشركات',
      reason: 'برنامج محاسبي سحابي وإدارة موارد للمتاجر والشركات',
      keywords: ['محاسبة', 'فواتير', 'نظام', 'حسابات'],
    },
  ],
  fashion: [
    {
      suggestedName: 'تاون تيم (Town Team)',
      url: 'https://townteam.com',
      category: 'أزياء وملابس رجالية',
      source: 'دليل براندات الملابس والموضة',
      reason: 'سلسلة متاجر تجزئة منافسة تبيع الأزياء والملابس الجاهزة في السوق المحلي',
      keywords: ['قميص', 'بنطلون', 'تيشيرت', 'ملابس', 'أزياء', 'بدلة', 'fashion', 'clothes', 'shirt'],
    },
    {
      suggestedName: 'دالي دريس (Dalydress)',
      url: 'https://dalydress.com',
      category: 'أزياء راقية وموضة',
      source: 'دليل براندات الملابس والموضة',
      reason: 'علامة تجارية رائدة في الأزياء والموضة العصرية للملابس والأحذية',
      keywords: ['فستان', 'ملابس', 'موضة', 'حذاء', 'شنطة', 'أزياء', 'dress', 'jacket'],
    },
    {
      suggestedName: 'ديفاكتو (DeFacto Egypt)',
      url: 'https://www.defacto.com',
      category: 'أزياء سريعة وملابس عائلية',
      source: 'دليل متاجر الملابس والتجزئة',
      reason: 'منفذ تجزئة ومتجر إلكتروني منافس في مجال الملابس العائلية بأسعار منافسة',
      keywords: ['ملابس', 'أطفال', 'رجالي', 'حريمي', 'كوتشي', 'تيشيرت'],
    },
    {
      suggestedName: 'إل سي وايكيكي (LC Waikiki)',
      url: 'https://www.lcwaikiki.eg',
      category: 'ملابس واكسسوارات',
      source: 'دليل سلاسل الموضة بالتجزئة',
      reason: 'منافس رئيسي يقدم منتجات ملابس واكسسوارات عائلية واسعة النطاق',
      keywords: ['ملابس', 'جينز', 'جاكيت', 'شوز', 'شنط'],
    },
  ],
  electronics: [
    {
      suggestedName: 'بي تك (B.TECH)',
      url: 'https://btech.com',
      category: 'أجهزة إلكترونية ومنزلية',
      source: 'دليل تجارة الأجهزة الذكية والإلكترونيات',
      reason: 'سلسلة تجزئة ومنصة إلكترونية منافسة متخصصة في الأجهزة المنزلية والإلكترونيات',
      keywords: ['موبايل', 'شاشة', 'لاب توب', 'تلفزيون', 'سماعة', 'إلكترونيات', 'electronics', 'phone'],
    },
    {
      suggestedName: 'تو بي (2B Egypt)',
      url: 'https://2b.com.eg',
      category: 'أجهزة كمبيوتر واكسسوارات إلكترونية',
      source: 'دليل التكنولوجيا والإلكترونيات الاستهلاكية',
      reason: 'متجر تقني رائد لبيع ملحقات الكمبيوتر والموبايل والأجهزة الذكية',
      keywords: ['كمبيوتر', 'لابتوب', 'ماوس', 'كيبورد', 'شاحن', 'سماعات'],
    },
    {
      suggestedName: 'راية شوب (RayaShop)',
      url: 'https://www.rayashop.com',
      category: 'إلكترونيات وهواتف ذكية',
      source: 'دليل الأجهزة الاستهلاكية والاتصالات',
      reason: 'منصة بيع هواتف ذكية ومستلزمات تكنولوجية مع خطط تقسيط منافسة',
      keywords: ['هاتف', 'سامسونج', 'ايفون', 'شاومي', 'تابلت'],
    },
  ],
  beauty: [
    {
      suggestedName: 'مزايا (Mazaya Stores)',
      url: 'https://mazayastores.com',
      category: 'عطور ومستحضرات تجميل',
      source: 'دليل المتاجر المتخصصة في التجميل والعطور',
      reason: 'سلسلة متاجر متخصصة في العطور الفاخرة ومستحضرات العناية والتجميل',
      keywords: ['عطر', 'برفان', 'ميك اب', 'كريم', 'سيروم', 'تجميل', 'perfume', 'makeup'],
    },
    {
      suggestedName: 'إيفا لمستحضرات التجميل (Eva Cosmetics)',
      url: 'https://eva-cosmetics.com',
      category: 'منتجات العناية بالبشرة والشعر',
      source: 'دليل مصنعي وموزعي منتجات العناية الشخصية',
      reason: 'علامة محلية رائدة في منتجات العناية بالبشرة والشعر ومستحضرات التجميل',
      keywords: ['شعر', 'بشرة', 'غسول', 'لوشن', 'كريم', 'شامبو'],
    },
  ],
  dental: [
    {
      suggestedName: 'Dentsply Sirona',
      url: 'https://www.dentsplysirona.com',
      category: 'معدات ومستهلكات معامل الأسنان',
      source: 'دليل تجهيزات ومختبرات الأسنان الطبية',
      reason: 'مزود عالمي رائد لحلول رقمنة ومواد تركيبات الأسنان',
      keywords: ['زركونيا', 'تركيبات', 'أسنان', 'فينير', 'e-max', 'dental', 'crown'],
    },
    {
      suggestedName: 'Ivoclar Vivadent',
      url: 'https://www.ivoclar.com',
      category: 'خامات ومواد طب الأسنان المتقدمة',
      source: 'دليل خامات وتكنولوجيا الأسنان',
      reason: 'شركة رائدة في تصنيع أقراص الزركونيا والـ IPS e.max ومواد المعامل',
      keywords: ['معمل', 'أسنان', 'طباشير', 'سيراميك', 'قوالب'],
    },
  ],
  academy: [
    {
      suggestedName: 'المنتور (Almentor)',
      url: 'https://www.almentor.net',
      category: 'منصة دورات تدريبية وتعليمية',
      source: 'دليل المنصات التعليمية والأكاديمية',
      reason: 'منصة رائدة للدورات التدريبية المباشرة والمسجلة في مختلف المهارات',
      keywords: ['كورس', 'دورة', 'تدريب', 'محاضرة', 'دبلومة', 'course', 'academy', 'training'],
    },
    {
      suggestedName: 'يوديمي (Udemy)',
      url: 'https://www.udemy.com',
      category: 'دورات ومهارات تعليمية رقمية',
      source: 'دليل منصات التعليم الذاتي والشهادات',
      reason: 'سوق عالمي للدورات التدريبية والمحتوى التعليمي عبر الإنترنت',
      keywords: ['كورس', 'تعليم', 'برمجة', 'تسويق', 'دورة'],
    },
  ],
  general: [
    {
      suggestedName: 'نون مصر (Noon Egypt)',
      url: 'https://www.noon.com/egypt-ar',
      category: 'سوق إلكتروني متكامل',
      source: 'دليل الأسواق الكبرى ومنصات التجزئة',
      reason: 'منصة تجارة إلكترونية كبرى تبيع مختلف فئات المنتجات الاستهلاكية وتوفر عروض أسعار تنافسية',
      keywords: [],
    },
    {
      suggestedName: 'أمازون مصر (Amazon Egypt)',
      url: 'https://www.amazon.eg',
      category: 'سوق إلكتروني وتجارة عامة',
      source: 'دليل منصات التجارة الإلكترونية الإقليمية',
      reason: 'المنصة الأكبر للتجارة والتجزئة في السوق المحلي لتتبع عروض المنتجات والأسعار',
      keywords: [],
    },
    {
      suggestedName: 'جوميا (Jumia Egypt)',
      url: 'https://www.jumia.com.eg',
      category: 'منصة بيع وتجزئة إلكترونية',
      source: 'دليل مواقع التجارة الإلكترونية',
      reason: 'سوق تجزئة شامل يقدم عروضاً يومية وحملات تخفيض متزامنة',
      keywords: [],
    },
  ],
};

exports.autoDiscover = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { category, maxResults = 5 } = req.query;
    const prisma = getPrisma();
    const max = parseInt(maxResults, 10) || 5;

    // 1. Fetch Company details with businessSpecialty
    const [company, myProducts, existingCompetitors] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        include: { businessSpecialty: true },
      }),
      prisma.product.findMany({
        where: { companyId, isActive: true, ...(category ? { category } : {}) },
        take: 100,
        select: { id: true, name: true, sku: true, category: true },
      }),
      prisma.competitor.findMany({
        where: { companyId },
        select: { name: true, url: true, slug: true },
      }),
    ]);

    // 2. Build Exclusion sets: NEVER suggest our own company or our own products or existing tracked competitors!
    const companyName = (company?.name || '').toLowerCase().trim();
    const ownProductNames = new Set(
      myProducts.map(p => (p.name || '').toLowerCase().trim()).filter(Boolean)
    );
    const existingNames = new Set(
      existingCompetitors.map(c => (c.name || '').toLowerCase().trim()).filter(Boolean)
    );
    const existingUrls = new Set(
      existingCompetitors.map(c => (c.url || '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '')).filter(Boolean)
    );

    // 3. Determine active industry specialty
    const specialtySlug = (company?.businessSpecialty?.slug || '').toLowerCase();
    const specialtyNameAr = (company?.businessSpecialty?.nameAr || '').toLowerCase();
    const reqCategory = (category || '').toLowerCase().trim();

    let industryKey = 'software'; // default for max-p platform
    if (specialtySlug.includes('fashion') || specialtySlug.includes('apparel') || specialtyNameAr.includes('ملابس') || specialtyNameAr.includes('أزياء') || reqCategory.includes('fashion')) {
      industryKey = 'fashion';
    } else if (specialtySlug.includes('dental') || specialtyNameAr.includes('أسنان') || reqCategory.includes('dental')) {
      industryKey = 'dental';
    } else if (specialtySlug.includes('electro') || reqCategory.includes('electro')) {
      industryKey = 'electronics';
    } else if (specialtySlug.includes('beauty') || specialtyNameAr.includes('تجميل') || reqCategory.includes('beauty')) {
      industryKey = 'beauty';
    } else if (specialtySlug.includes('academy') || specialtyNameAr.includes('تعليم') || reqCategory.includes('academy')) {
      industryKey = 'academy';
    } else if (specialtySlug.includes('ecommerce') || specialtySlug.includes('software') || specialtySlug.includes('services')) {
      industryKey = 'software';
    }

    // 4. Gather candidates from target industry and general retail
    const candidates = [
      ...(INDUSTRY_COMPETITORS_CATALOG[industryKey] || []),
      ...(INDUSTRY_COMPETITORS_CATALOG.general || []),
    ];

    const discovered = [];

    for (const cand of candidates) {
      if (discovered.length >= max) break;

      const candName = cand.suggestedName.toLowerCase();
      const candCleanUrl = (cand.url || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

      // Check Exclusion: Is it our own company?
      if (companyName && (candName.includes(companyName) || companyName.includes(candName))) {
        continue;
      }

      // Check Exclusion: Is it one of our own products? (e.g. "كورس MaxP")
      let matchesOwnProduct = false;
      for (const ownProd of ownProductNames) {
        if (ownProd && (candName.includes(ownProd) || ownProd.includes(candName))) {
          matchesOwnProduct = true;
          break;
        }
      }
      if (matchesOwnProduct) continue;

      // Check Exclusion: Is it already added?
      let alreadyTracked = false;
      for (const exist of existingNames) {
        if (exist && (exist.includes(candName) || candName.includes(exist))) {
          alreadyTracked = true;
          break;
        }
      }
      if (alreadyTracked) continue;

      if (candCleanUrl && existingUrls.has(candCleanUrl)) {
        continue;
      }

      // Calculate matched products based on domain keywords
      const matchedCount = cand.keywords && cand.keywords.length > 0
        ? myProducts.filter(p => {
            const pName = (p.name || '').toLowerCase();
            return cand.keywords.some(k => pName.includes(k.toLowerCase()));
          }).length
        : myProducts.length;

      discovered.push({
        suggestedName: cand.suggestedName,
        url: cand.url,
        category: cand.category,
        source: cand.source,
        reason: cand.reason,
        matchedProducts: Math.max(1, matchedCount),
      });
    }

    res.json({
      success: true,
      data: {
        discovered: discovered.slice(0, max),
        searchedTerms: candidates.length,
        yourProductCount: myProducts.length,
        industrySpecialty: company?.businessSpecialty?.nameAr || 'حلول التجارة الرقمية',
        suggestion: discovered.length > 0
          ? t('competitor.discover_suggestion_start_tracking')
          : t('competitor.discover_no_new'),
      },
    });
  } catch (error) {
    console.error('Error in auto-discover:', error);
    res.status(500).json({ success: false, error: t('competitor.discover_failed') });
  }
};

exports.listFeatures = async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await CompetitorFeatureService.list(companyId, req.params.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching features:', error);
    res.status(500).json({ success: false, error: t('competitor.features_list_failed') });
  }
};

exports.createFeature = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: t('competitor.feature_title_required') });
    }
    const feature = await CompetitorFeatureService.create(companyId, req.params.id, req.body);
    if (!feature) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.status(201).json({ success: true, data: feature });
  } catch (error) {
    console.error('Error creating feature:', error);
    res.status(500).json({ success: false, error: t('competitor.feature_create_failed') });
  }
};

exports.updateFeature = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { featureId } = req.params;
    const feature = await CompetitorFeatureService.update(companyId, req.params.id, featureId, req.body);
    if (!feature) return res.status(404).json({ success: false, error: t('competitor.feature_not_found') });
    res.json({ success: true, data: feature });
  } catch (error) {
    console.error('Error updating feature:', error);
    res.status(500).json({ success: false, error: t('competitor.feature_update_failed') });
  }
};

exports.deleteFeature = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { featureId } = req.params;
    const deleted = await CompetitorFeatureService.remove(companyId, req.params.id, featureId);
    if (!deleted) return res.status(404).json({ success: false, error: t('competitor.feature_not_found') });
    res.json({ success: true, message: t('competitor.feature_delete_success') });
  } catch (error) {
    console.error('Error deleting feature:', error);
    res.status(500).json({ success: false, error: t('competitor.feature_delete_failed') });
  }
};

exports.getDevRecommendations = async (req, res) => {
  try {
    const { companyId } = req.user;
    const recommendation = await CompetitorDevRecommendationService.getByCompetitorId(companyId, req.params.id);
    if (!recommendation) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.json({ success: true, data: recommendation });
  } catch (error) {
    console.error('Error fetching dev recommendations:', error);
    res.status(500).json({ success: false, error: t('competitor.get_failed') });
  }
};

exports.upsertDevRecommendationNotes = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { notes } = req.body;
    const recommendation = await CompetitorDevRecommendationService.upsertNotes(companyId, req.params.id, notes);
    if (!recommendation) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.json({ success: true, data: recommendation });
  } catch (error) {
    console.error('Error saving dev recommendations:', error);
    res.status(500).json({ success: false, error: t('competitor.update_failed') });
  }
};

exports.addDevTask = async (req, res) => {
  try {
    const { companyId } = req.user;
    const task = await CompetitorDevRecommendationService.addTask(companyId, req.params.id, req.body);
    if (!task) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    console.error('Error adding dev task:', error);
    res.status(500).json({ success: false, error: t('competitor.feature_create_failed') });
  }
};

exports.updateDevTask = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { taskId } = req.params;
    const task = await CompetitorDevRecommendationService.updateTask(companyId, req.params.id, taskId, req.body);
    if (!task) return res.status(404).json({ success: false, error: t('competitor.feature_not_found') });
    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Error updating dev task:', error);
    res.status(500).json({ success: false, error: t('competitor.feature_update_failed') });
  }
};

exports.toggleDevTask = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { taskId } = req.params;
    const task = await CompetitorDevRecommendationService.toggleTask(companyId, req.params.id, taskId);
    if (!task) return res.status(404).json({ success: false, error: t('competitor.feature_not_found') });
    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Error toggling dev task:', error);
    res.status(500).json({ success: false, error: t('competitor.feature_update_failed') });
  }
};

exports.deleteDevTask = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { taskId } = req.params;
    const deleted = await CompetitorDevRecommendationService.deleteTask(companyId, req.params.id, taskId);
    if (!deleted) return res.status(404).json({ success: false, error: t('competitor.feature_not_found') });
    res.json({ success: true, message: t('competitor.feature_delete_success') });
  } catch (error) {
    console.error('Error deleting dev task:', error);
    res.status(500).json({ success: false, error: t('competitor.feature_delete_failed') });
  }
};

// ---- Media Notes ----
exports.getMediaNotes = async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await CompetitorMediaAnalysisService.listMediaNotes(companyId, req.params.id);
    if (!result) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching media notes:', error);
    res.status(500).json({ success: false, error: t('competitor.media_note_list_failed') });
  }
};

exports.addMediaNote = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { note } = req.body;
    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, error: t('competitor.note_content_required') });
    }
    const created = await CompetitorMediaAnalysisService.createMediaNote(companyId, req.params.id, note);
    if (!created) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Error creating media note:', error);
    res.status(500).json({ success: false, error: t('competitor.media_note_create_failed') });
  }
};

exports.updateMediaNote = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { note } = req.body;
        if (!note || !note.trim()) {
            return res.status(400).json({ success: false, error: t('competitor.note_content_required') });
        }
        const updated = await CompetitorMediaAnalysisService.updateMediaNote(companyId, req.params.id, req.params.noteId, note);
        if (!updated) return res.status(404).json({ success: false, error: t('competitor.not_found') });
        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Error updating media note:', error);
        res.status(500).json({ success: false, error: t('competitor.media_note_update_failed') });
    }
};

exports.deleteMediaNote = async (req, res) => {
    try {
        const { companyId } = req.user;
        const deleted = await CompetitorMediaAnalysisService.deleteMediaNote(companyId, req.params.id, req.params.noteId);
        if (!deleted) return res.status(404).json({ success: false, error: t('competitor.not_found') });
        res.json({ success: true, message: t('competitor.media_note_deleted') });
    } catch (error) {
        console.error('Error deleting media note:', error);
        res.status(500).json({ success: false, error: t('competitor.media_note_delete_failed') });
    }
};

// ---- Comparisons ----
exports.listComparisons = async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await CompetitorMediaAnalysisService.listComparisons(companyId, req.params.id);
    if (!result) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching comparisons:', error);
    res.status(500).json({ success: false, error: t('competitor.comparison_list_failed') });
  }
};

exports.createComparison = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { featureName } = req.body;
    if (!featureName || !featureName.trim()) {
      return res.status(400).json({ success: false, error: t('competitor.feature_name_required') });
    }
    const created = await CompetitorMediaAnalysisService.createComparison(companyId, req.params.id, req.body);
    if (!created) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Error creating comparison:', error);
    res.status(500).json({ success: false, error: t('competitor.comparison_create_failed') });
  }
};

exports.updateComparison = async (req, res) => {
  try {
    const { companyId } = req.user;
    const updated = await CompetitorMediaAnalysisService.updateComparison(companyId, req.params.id, req.params.comparisonId, req.body);
    if (!updated) return res.status(404).json({ success: false, error: t('competitor.comparison_not_found') });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating comparison:', error);
    res.status(500).json({ success: false, error: t('competitor.comparison_update_failed') });
  }
};

exports.deleteComparison = async (req, res) => {
  try {
    const { companyId } = req.user;
    const deleted = await CompetitorMediaAnalysisService.deleteComparison(companyId, req.params.id, req.params.comparisonId);
    if (!deleted) return res.status(404).json({ success: false, error: t('competitor.comparison_not_found') });
    res.json({ success: true, message: t('competitor.comparison_deleted') });
  } catch (error) {
    console.error('Error deleting comparison:', error);
    res.status(500).json({ success: false, error: t('competitor.comparison_delete_failed') });
  }
};

exports.reorderComparisons = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: t('competitor.ordered_ids_required') });
    }
    const result = await CompetitorMediaAnalysisService.reorderComparisons(companyId, req.params.id, orderedIds);
    if (!result) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error reordering comparisons:', error);
    res.status(500).json({ success: false, error: t('competitor.comparison_reorder_failed') });
  }
};

// ---- Dev Ideas ----
exports.listDevIdeas = async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await CompetitorMediaAnalysisService.listDevIdeas(companyId, req.params.id);
    if (!result) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching dev ideas:', error);
    res.status(500).json({ success: false, error: t('competitor.dev_idea_list_failed') });
  }
};

exports.createDevIdea = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: t('competitor.title_required') });
    }
    const created = await CompetitorMediaAnalysisService.createDevIdea(companyId, req.params.id, req.body);
    if (!created) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Error creating dev idea:', error);
    res.status(500).json({ success: false, error: t('competitor.dev_idea_create_failed') });
  }
};

exports.updateDevIdea = async (req, res) => {
  try {
    const { companyId } = req.user;
    const updated = await CompetitorMediaAnalysisService.updateDevIdea(companyId, req.params.id, req.params.ideaId, req.body);
    if (!updated) return res.status(404).json({ success: false, error: t('competitor.dev_idea_not_found') });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating dev idea:', error);
    res.status(500).json({ success: false, error: t('competitor.dev_idea_update_failed') });
  }
};

exports.deleteDevIdea = async (req, res) => {
  try {
    const { companyId } = req.user;
    const deleted = await CompetitorMediaAnalysisService.deleteDevIdea(companyId, req.params.id, req.params.ideaId);
    if (!deleted) return res.status(404).json({ success: false, error: t('competitor.dev_idea_not_found') });
    res.json({ success: true, message: t('competitor.dev_idea_deleted') });
  } catch (error) {
    console.error('Error deleting dev idea:', error);
    res.status(500).json({ success: false, error: t('competitor.dev_idea_delete_failed') });
  }
};

exports.reorderDevIdeas = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: t('competitor.ordered_ids_required') });
    }
    const result = await CompetitorMediaAnalysisService.reorderDevIdeas(companyId, req.params.id, orderedIds);
    if (!result) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error reordering dev ideas:', error);
    res.status(500).json({ success: false, error: t('competitor.dev_idea_reorder_failed') });
  }
};

exports.addDevIdeaImage = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ success: false, error: t('competitor.image_url_required') });
    }
    const created = await CompetitorMediaAnalysisService.addDevIdeaImage(companyId, req.params.id, req.params.ideaId, imageUrl);
    if (!created) return res.status(404).json({ success: false, error: t('competitor.dev_idea_not_found') });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Error adding dev idea image:', error);
    res.status(500).json({ success: false, error: t('competitor.dev_idea_image_add_failed') });
  }
};

exports.deleteDevIdeaImage = async (req, res) => {
  try {
    const { companyId } = req.user;
    const deleted = await CompetitorMediaAnalysisService.deleteDevIdeaImage(companyId, req.params.id, req.params.ideaId, req.params.imageId);
    if (!deleted) return res.status(404).json({ success: false, error: t('competitor.dev_idea_not_found') });
    res.json({ success: true, message: t('competitor.image_deleted') });
  } catch (error) {
    console.error('Error deleting dev idea image:', error);
    res.status(500).json({ success: false, error: t('competitor.dev_idea_image_delete_failed') });
  }
};

// ---- Activity Images ----
exports.listActivityImages = async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await CompetitorMediaAnalysisService.listActivityImages(companyId, req.params.id);
    if (!result) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching activity images:', error);
    res.status(500).json({ success: false, error: t('competitor.activity_image_list_failed') });
  }
};

exports.addActivityImage = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ success: false, error: t('competitor.image_url_required') });
    }
    const created = await CompetitorMediaAnalysisService.addActivityImage(companyId, req.params.id, imageUrl);
    if (!created) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Error adding activity image:', error);
    res.status(500).json({ success: false, error: t('competitor.activity_image_add_failed') });
  }
};

exports.deleteActivityImage = async (req, res) => {
  try {
    const { companyId } = req.user;
    const deleted = await CompetitorMediaAnalysisService.deleteActivityImage(companyId, req.params.id, req.params.imageId);
    if (!deleted) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.json({ success: true, message: t('competitor.activity_image_deleted') });
  } catch (error) {
    console.error('Error deleting activity image:', error);
    res.status(500).json({ success: false, error: t('competitor.activity_image_delete_failed') });
  }
};

exports.reorderActivityImages = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: t('competitor.ordered_ids_required') });
    }
    const result = await CompetitorMediaAnalysisService.reorderActivityImages(companyId, req.params.id, orderedIds);
    if (!result) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error reordering activity images:', error);
    res.status(500).json({ success: false, error: t('competitor.activity_image_reorder_failed') });
  }
};

// ---- Feature Images ----
exports.listFeatureImages = async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await CompetitorMediaAnalysisService.listFeatureImages(companyId, req.params.id);
    if (!result) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching feature images:', error);
    res.status(500).json({ success: false, error: t('competitor.feature_image_list_failed') });
  }
};

exports.addFeatureImage = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ success: false, error: t('competitor.image_url_required') });
    }
    const created = await CompetitorMediaAnalysisService.addFeatureImage(companyId, req.params.id, imageUrl);
    if (!created) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Error adding feature image:', error);
    res.status(500).json({ success: false, error: t('competitor.feature_image_add_failed') });
  }
};

exports.deleteFeatureImage = async (req, res) => {
  try {
    const { companyId } = req.user;
    const deleted = await CompetitorMediaAnalysisService.deleteFeatureImage(companyId, req.params.id, req.params.imageId);
    if (!deleted) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.json({ success: true, message: t('competitor.feature_image_deleted') });
  } catch (error) {
    console.error('Error deleting feature image:', error);
    res.status(500).json({ success: false, error: t('competitor.feature_image_delete_failed') });
  }
};

exports.reorderFeatureImages = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: t('competitor.ordered_ids_required') });
    }
    const result = await CompetitorMediaAnalysisService.reorderFeatureImages(companyId, req.params.id, orderedIds);
    if (!result) return res.status(404).json({ success: false, error: t('competitor.not_found') });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error reordering feature images:', error);
    res.status(500).json({ success: false, error: t('competitor.feature_image_reorder_failed') });
  }
};

// ---- Social Profile Credentials ----
exports.updateSocialProfileCredentials = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { email, password } = req.body;
    const prisma = getPrisma();

    const profile = await prisma.competitorSocialProfile.findFirst({
      where: { id: req.params.profileId, competitor: { companyId, id: req.params.id } },
    });
    if (!profile) return res.status(404).json({ success: false, error: t('competitor.not_found') });

    const data = {};
    if (email !== undefined) {
      data.email = CompetitorEncryptionService.encryptField(email);
    }
    if (password !== undefined) {
      data.password = CompetitorEncryptionService.encryptField(password);
    }

    const updated = await prisma.competitorSocialProfile.update({
      where: { id: req.params.profileId },
      data,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating social profile credentials:', error);
    res.status(500).json({ success: false, error: t('competitor.social_credentials_update_failed') });
  }
};

exports.summary = async (req, res) => {
  try {
    const { companyId } = req.user;
    const [totalCompetitors, activeCompetitors, totalProducts, totalAds, latestReports] = await Promise.all([
      getPrisma().competitor.count({ where: { companyId } }),
      getPrisma().competitor.count({ where: { companyId, isActive: true } }),
      getPrisma().competitorProduct.count({ where: { competitor: { companyId } } }),
      getPrisma().competitorAd.count({ where: { competitor: { companyId } } }),
      getPrisma().competitorReport.findMany({
        where: { companyId },
        orderBy: { generatedAt: 'desc' },
        take: 5,
        include: { competitor: { select: { name: true } } },
      }),
    ]);
    res.json({
      success: true,
      data: { totalCompetitors, activeCompetitors, totalProducts, totalAds, latestReports },
    });
  } catch (error) {
    console.error('Error fetching competitor summary:', error);
    res.status(500).json({ success: false, error: t('competitor.summary_failed') });
  }
};
