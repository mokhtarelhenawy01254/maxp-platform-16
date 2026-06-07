const CompetitorService = require('../services/competitorService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { t } = require('../legacy-ai-agent/aiAgent/i18n');
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
      socialProfiles,
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ success: false, error: t('competitor.name_required') });
    }

    // Validate socialProfiles if provided
    if (socialProfiles) {
      if (!Array.isArray(socialProfiles)) {
        return res.status(400).json({ success: false, message: 'socialProfiles must be an array' });
      }
      if (socialProfiles.length > 5) {
        return res.status(400).json({ success: false, message: 'Maximum of 5 social profiles allowed' });
      }
      const allowedPlatforms = ['instagram', 'facebook', 'tiktok'];
      const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
      for (const profile of socialProfiles) {
        if (!profile.platform || !allowedPlatforms.includes(profile.platform)) {
          return res.status(400).json({ success: false, message: `Invalid platform: ${profile.platform}` });
        }
        if (!profile.url || !urlRegex.test(profile.url)) {
          return res.status(400).json({ success: false, message: `Invalid URL for platform ${profile.platform}` });
        }
      }
    }

    // Transaction to create competitor and related social profiles
    const createdCompetitor = await getSharedPrismaClient().$transaction(async (tx) => {
      const comp = await tx.competitor.create({
        data: {
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          url,
          platform: platform || 'manual',
          logo,
          description,
          notes,
          companyId,
        },
      });

      if (socialProfiles && socialProfiles.length) {
        await Promise.all(
          socialProfiles.map((p) =>
            tx.competitorSocialProfile.create({
              data: {
                platform: p.platform,
                url: p.url,
                competitorId: comp.id,
                companyId,
              },
            })
          )
        );
      }

      return tx.competitor.findUnique({
        where: { id: comp.id },
        include: { socialProfiles: true },
      });
    });

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
        include: { competitor: { select: { id: true, name: true } } },
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
    const { competitorId } = req.params;
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
    const { competitorId } = req.params;
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

exports.autoDiscover = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { category, maxResults = 5 } = req.query;
    const prisma = getPrisma();
    const max = parseInt(maxResults, 10) || 5;

    const myProducts = await prisma.product.findMany({
      where: { companyId, isActive: true, ...(category ? { category } : {}) },
      take: 50,
      select: { id: true, name: true, sku: true, category: true },
    });

    if (myProducts.length === 0) {
      return res.json({
        success: true,
        data: { discovered: [], searchedTerms: 0, yourProductCount: 0, suggestion: 'Add products to your catalog first' },
      });
    }

    const sampleProducts = myProducts.slice(0, 10);
    const searchTerms = sampleProducts.map(p => p.name.split(' ').slice(0, 2).join(' '));
    const discovered = [];

    for (const term of searchTerms.slice(0, max)) {
      const existing = await prisma.competitor.findFirst({
        where: {
          companyId,
          OR: [
            { name: { contains: term.split(' ')[0], mode: 'insensitive' } },
            { url: { contains: term.split(' ')[0], mode: 'insensitive' } },
          ],
        },
      });

      if (!existing) {
        discovered.push({
          suggestedName: term,
          reason: `Similar to your products: ${sampleProducts.find(p => p.name.includes(term))?.name || term}`,
          matchedProducts: myProducts.filter(p => p.name.toLowerCase().includes(term.toLowerCase().split(' ')[0])).length,
        });
      }
    }

    res.json({
      success: true,
      data: {
        discovered: discovered.slice(0, max),
        searchedTerms: searchTerms.length,
        yourProductCount: myProducts.length,
        suggestion: discovered.length > 0
          ? 'Add these competitors to start tracking'
          : 'No new competitors found - you may already be tracking relevant ones',
      },
    });
  } catch (error) {
    console.error('Error in auto-discover:', error);
    res.status(500).json({ success: false, error: t('competitor.discover_failed') });
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
