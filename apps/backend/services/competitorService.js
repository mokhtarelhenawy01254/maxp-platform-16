const { getSharedPrismaClient } = require('./sharedDatabase');
const { t } = require('./i18n');
const getPrisma = () => getSharedPrismaClient();

class CompetitorService {
  static async list(companyId, { page = 1, limit = 20, isActive, search, status } = {}) {
    const where = { companyId };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [data, total] = await Promise.all([
      getPrisma().competitor.findMany({
        where,
        include: {
          socialProfiles: { select: { id: true, platform: true, profileUrl: true } },
          _count: { select: { products: true, ads: true, reports: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      getPrisma().competitor.count({ where }),
    ]);

    return {
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    };
  }

  static async getById(companyId, id) {
    const competitor = await getPrisma().competitor.findFirst({
      where: { id, companyId },
      include: {
        socialProfiles: { select: { id: true, platform: true, profileUrl: true } },
        products: {
          orderBy: { lastSeen: 'desc' },
          include: {
            priceHistory: { orderBy: { recordedAt: 'desc' }, take: 10 },
          },
        },
        ads: { orderBy: { lastSeen: 'desc' }, take: 20 },
        reports: { orderBy: { generatedAt: 'desc' }, take: 10 },
        _count: { select: { products: true, ads: true, reports: true } },
      },
    });
    return competitor;
  }

  static async create(companyId, data) {
    const { name, url, platform, logo, description, notes, activityType, location, targetMarket, foundedYear, employeeCount, strengths, weaknesses, socialProfiles, status } = data;
    const slug = data.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    // Transaction to create competitor and related social profiles
    const createdCompetitor = await getSharedPrismaClient().$transaction(async (tx) => {
      const comp = await tx.competitor.create({
        data: {
          name,
          slug,
          url,
          platform: platform || 'manual',
          logo,
          description,
          notes,
          activityType,
          location,
          targetMarket,
          foundedYear: foundedYear ? parseInt(foundedYear) : undefined,
          employeeCount,
          strengths,
          weaknesses,
          status: status || 'NEW',
          companyId,
        },
      });

      if (socialProfiles && socialProfiles.length) {
        await Promise.all(
          socialProfiles.map((p) =>
            tx.competitorSocialProfile.create({
              data: {
                platform: p.platform,
                profileUrl: p.url,
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
    return createdCompetitor;
  }

  static async update(companyId, id, data) {
    const existing = await getPrisma().competitor.findFirst({ where: { id, companyId } });
    if (!existing) return null;

    const competitor = await getSharedPrismaClient().$transaction(async (tx) => {
      const comp = await tx.competitor.update({
        where: { id },
        data: {
          name: data.name,
          url: data.url,
          platform: data.platform,
          logo: data.logo,
          description: data.description,
          notes: data.notes,
          activityType: data.activityType,
          location: data.location,
          targetMarket: data.targetMarket,
          foundedYear: data.foundedYear ? parseInt(data.foundedYear) : undefined,
          employeeCount: data.employeeCount,
          strengths: data.strengths,
          weaknesses: data.weaknesses,
          isActive: data.isActive,
          status: data.status,
        },
      });

      if (data.socialProfiles && Array.isArray(data.socialProfiles)) {
        await tx.competitorSocialProfile.deleteMany({ where: { competitorId: id } });
        if (data.socialProfiles.length) {
          await Promise.all(
            data.socialProfiles.map((p) =>
              tx.competitorSocialProfile.create({
                data: {
                  platform: p.platform,
                  profileUrl: p.url,
                  competitorId: id,
                  companyId,
                },
              })
            )
          );
        }
      }

      return tx.competitor.findUnique({
        where: { id },
        include: { socialProfiles: true },
      });
    });
    return competitor;
  }

  static async remove(companyId, id) {
    const existing = await getPrisma().competitor.findFirst({ where: { id, companyId } });
    if (!existing) return false;
    await getPrisma().competitor.delete({ where: { id } });
    return true;
  }

  static async addProduct(companyId, competitorId, data) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;

    const product = await getPrisma().competitorProduct.create({
      data: {
        name: data.name,
        slug: data.slug,
        price: data.price,
        comparePrice: data.comparePrice,
        currency: data.currency || 'EGP',
        image: data.image,
        url: data.url,
        sku: data.sku,
        barcode: data.barcode,
        isAvailable: data.isAvailable !== false,
        category: data.category,
        description: data.description,
        metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
        competitorId,
      },
    });

    if (data.price) {
      await getPrisma().competitorPriceHistory.create({
        data: { price: data.price, currency: data.currency || 'EGP', productId: product.id },
      });
    }

    return product;
  }

  static async updateProductPrice(companyId, productId, price, currency = 'EGP') {
    const product = await getPrisma().competitorProduct.findFirst({
      where: { id: productId, competitor: { companyId } },
    });
    if (!product) return null;

    const [updated] = await Promise.all([
      getPrisma().competitorProduct.update({
        where: { id: productId },
        data: { price, currency, lastSeen: new Date() },
      }),
      getPrisma().competitorPriceHistory.create({
        data: { price, currency, productId },
      }),
    ]);
    return updated;
  }

  static async getPriceHistory(companyId, productId) {
    const product = await getPrisma().competitorProduct.findFirst({
      where: { id: productId, competitor: { companyId } },
    });
    if (!product) return null;

    return getPrisma().competitorPriceHistory.findMany({
      where: { productId },
      orderBy: { recordedAt: 'asc' },
    });
  }

  static async addAd(companyId, competitorId, data) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;

    return getPrisma().competitorAd.create({
      data: {
        platform: data.platform || 'facebook',
        adId: data.adId,
        creativeUrl: data.creativeUrl,
        copy: data.copy,
        headline: data.headline,
        cta: data.cta,
        destinationUrl: data.destinationUrl,
        status: data.status || 'active',
        metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
        competitorId,
      },
    });
  }

  static async listProducts(companyId, competitorId, { page = 1, limit = 20, isAvailable } = {}) {
    const where = { competitor: { companyId, id: competitorId } };
    if (isAvailable !== undefined) where.isAvailable = isAvailable === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [data, total] = await Promise.all([
      getPrisma().competitorProduct.findMany({
        where,
        orderBy: { lastSeen: 'desc' },
        skip,
        take,
      }),
      getPrisma().competitorProduct.count({ where }),
    ]);

    return {
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    };
  }

  static async listAds(companyId, competitorId, { page = 1, limit = 20, platform } = {}) {
    const where = { competitor: { companyId, id: competitorId } };
    if (platform) where.platform = platform;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [data, total] = await Promise.all([
      getPrisma().competitorAd.findMany({
        where,
        orderBy: { lastSeen: 'desc' },
        skip,
        take,
      }),
      getPrisma().competitorAd.count({ where }),
    ]);

    return {
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    };
  }

  static async getStatusCounts(companyId) {
    const statuses = ['NEW', 'FOLLOWING', 'COMPLETED'];
    const results = await Promise.all(
      statuses.map(status =>
        getPrisma().competitor.count({ where: { companyId, status } })
      )
    );
    const total = await getPrisma().competitor.count({ where: { companyId } });
    const counts = {};
    statuses.forEach((s, i) => { counts[s] = results[i]; });
    return { total, ...counts };
  }

  static async generateReport(companyId, competitorId, type = 'weekly') {
    const competitor = await getPrisma().competitor.findFirst({
      where: { id: competitorId, companyId },
      include: {
        products: { orderBy: { lastSeen: 'desc' }, take: 50 },
        ads: { orderBy: { lastSeen: 'desc' }, take: 20 },
      },
    });
    if (!competitor) return null;

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 7);

    const newProducts = competitor.products.filter(p => p.firstSeen >= periodStart).length;
    const priceChanges = competitor.products.filter(p =>
      p.priceHistory && p.priceHistory.length > 1
    ).length;

    const summary = t('competitor.report_summary', 'ar', {
      products: competitor.products.length,
      ads: competitor.ads.length,
      newProducts,
      priceChanges,
    });
    const title = t('competitor.report_title', 'ar', {
      type: type === 'weekly' ? t('competitor.report_type_weekly') : t('competitor.report_type_full'),
      name: competitor.name,
    });

    const report = await getPrisma().competitorReport.create({
      data: {
        type,
        title,
        summary,
        insights: JSON.stringify({
          newProducts,
          priceChanges,
          totalProducts: competitor.products.length,
          totalAds: competitor.ads.length,
        }),
        data: JSON.stringify({
          products: competitor.products,
          ads: competitor.ads,
        }),
        periodStart,
        periodEnd: new Date(),
        competitorId,
        companyId,
      },
    });
    return report;
  }

  static async listReports(companyId, competitorId, { page = 1, limit = 10 } = {}) {
    const where = { competitorId, companyId };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [data, total] = await Promise.all([
      getPrisma().competitorReport.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        skip,
        take,
      }),
      getPrisma().competitorReport.count({ where }),
    ]);

    return {
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    };
  }
}

module.exports = CompetitorService;
