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

    const enrichedData = data.map((c) => ({
      ...c,
      structuredPricing: c.metadata && typeof c.metadata === 'object' && c.metadata.structuredPricing
        ? c.metadata.structuredPricing
        : {
            price: c.monthlyPrice ? Number(c.monthlyPrice) : null,
            currency: 'EGP',
            cycle: 'monthly',
            monthlyPrice: c.monthlyPrice ? Number(c.monthlyPrice) : null,
            yearlyPrice: c.yearlyPrice ? Number(c.yearlyPrice) : null,
            notes: c.pricingNotes || '',
          },
    }));

    return {
      data: enrichedData,
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
        activityImages: { orderBy: { sortOrder: 'asc' }, select: { imageUrl: true } },
        featureImages: { orderBy: { sortOrder: 'asc' }, select: { imageUrl: true } },
        mediaNotes: { orderBy: { createdAt: 'desc' }, select: { note: true } },
        comparisons: { orderBy: { sortOrder: 'asc' } },
        devIdeas: {
          orderBy: { sortOrder: 'asc' },
          include: { images: { orderBy: { sortOrder: 'asc' }, select: { imageUrl: true } } },
        },
        _count: { select: { products: true, ads: true, reports: true } },
      },
    });

    if (competitor) {
      competitor.structuredPricing = competitor.metadata && typeof competitor.metadata === 'object' && competitor.metadata.structuredPricing
        ? competitor.metadata.structuredPricing
        : {
            price: competitor.monthlyPrice ? Number(competitor.monthlyPrice) : null,
            currency: 'EGP',
            cycle: 'monthly',
            monthlyPrice: competitor.monthlyPrice ? Number(competitor.monthlyPrice) : null,
            yearlyPrice: competitor.yearlyPrice ? Number(competitor.yearlyPrice) : null,
            notes: competitor.pricingNotes || '',
          };
    }
    return competitor;
  }

  static async create(companyId, data) {
    const { name, url, platform, logo, description, notes, activityType, location, targetMarket, foundedYear, employeeCount, strengths, weaknesses, socialProfiles, status, founderName, founderLink, country, city, monthlyPrice, yearlyPrice, pricingNotes, trafficSource, activityImages, featureImages, mediaNotes, comparisons, devIdeas } = data;
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
          founderName,
          founderLink,
          country,
          city,
          monthlyPrice: monthlyPrice ? parseFloat(monthlyPrice) : null,
          yearlyPrice: yearlyPrice ? parseFloat(yearlyPrice) : null,
          pricingNotes,
          trafficSource,
          metadata: {
            ...(data.metadata || {}),
            structuredPricing: {
              price: data.price !== undefined && data.price !== '' ? parseFloat(data.price) : (monthlyPrice ? parseFloat(monthlyPrice) : null),
              currency: data.currency || data.pricingCurrency || 'EGP',
              cycle: data.cycle || data.pricingCycle || 'monthly',
              monthlyPrice: monthlyPrice ? parseFloat(monthlyPrice) : null,
              yearlyPrice: yearlyPrice ? parseFloat(yearlyPrice) : null,
              notes: pricingNotes || '',
            },
          },
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

      if (activityImages && Array.isArray(activityImages) && activityImages.length) {
        await Promise.all(
          activityImages.map((url, i) =>
            tx.competitorActivityImage.create({
              data: { competitorId: comp.id, imageUrl: url, sortOrder: i },
            })
          )
        );
      }

      if (featureImages && Array.isArray(featureImages) && featureImages.length) {
        await Promise.all(
          featureImages.map((url, i) =>
            tx.competitorFeatureImage.create({
              data: { competitorId: comp.id, imageUrl: url, sortOrder: i },
            })
          )
        );
      }

      if (mediaNotes && Array.isArray(mediaNotes) && mediaNotes.length) {
        await Promise.all(
          mediaNotes.map((note) =>
            tx.competitorMediaNote.create({
              data: { competitorId: comp.id, note: typeof note === 'string' ? note : note.text || note.note || '' },
            })
          )
        );
      }

      if (comparisons && Array.isArray(comparisons) && comparisons.length) {
        await Promise.all(
          comparisons.map((c, i) =>
            tx.competitorComparison.create({
              data: {
                competitorId: comp.id,
                featureName: c.featureName || '',
                competitorDescription: c.competitorDescription || c.competitorDesc || null,
                ourDescription: c.ourDescription || c.ourDesc || null,
                easiestToUse: c.easiestToUse || c.easierToUse || null,
                stronger: c.stronger || null,
                notes: c.notes || null,
                sortOrder: i,
              },
            })
          )
        );
      }

      if (devIdeas && Array.isArray(devIdeas) && devIdeas.length) {
        await Promise.all(
          devIdeas.map((idea, i) =>
            tx.competitorDevIdea.create({
              data: {
                competitorId: comp.id,
                title: idea.title || '',
                description: idea.description || null,
                sortOrder: i,
                images: {
                  create: (idea.images || []).map((url, j) => ({
                    imageUrl: url,
                    sortOrder: j,
                  })),
                },
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
          founderName: data.founderName,
          founderLink: data.founderLink,
          country: data.country,
          city: data.city,
          monthlyPrice: data.monthlyPrice !== undefined ? (data.monthlyPrice ? parseFloat(data.monthlyPrice) : null) : undefined,
          yearlyPrice: data.yearlyPrice !== undefined ? (data.yearlyPrice ? parseFloat(data.yearlyPrice) : null) : undefined,
          pricingNotes: data.pricingNotes !== undefined ? data.pricingNotes : undefined,
          trafficSource: data.trafficSource,
          metadata: {
            ...(existing.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}),
            ...(data.metadata || {}),
            structuredPricing: {
              ...((existing.metadata && typeof existing.metadata === 'object' && existing.metadata.structuredPricing) || {}),
              price: data.price !== undefined && data.price !== ''
                ? parseFloat(data.price)
                : (data.monthlyPrice ? parseFloat(data.monthlyPrice) : (existing.metadata?.structuredPricing?.price ?? null)),
              currency: data.currency || data.pricingCurrency || existing.metadata?.structuredPricing?.currency || 'EGP',
              cycle: data.cycle || data.pricingCycle || existing.metadata?.structuredPricing?.cycle || 'monthly',
              monthlyPrice: data.monthlyPrice !== undefined
                ? (data.monthlyPrice ? parseFloat(data.monthlyPrice) : null)
                : (existing.metadata?.structuredPricing?.monthlyPrice ?? null),
              yearlyPrice: data.yearlyPrice !== undefined
                ? (data.yearlyPrice ? parseFloat(data.yearlyPrice) : null)
                : (existing.metadata?.structuredPricing?.yearlyPrice ?? null),
              notes: data.pricingNotes !== undefined
                ? data.pricingNotes
                : (existing.metadata?.structuredPricing?.notes ?? ''),
            },
          },
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

      // Media analysis data – delete & re-create for simplicity
      if (data.activityImages !== undefined) {
        await tx.competitorActivityImage.deleteMany({ where: { competitorId: id } });
        if (Array.isArray(data.activityImages) && data.activityImages.length) {
          await Promise.all(
            data.activityImages.map((url, i) =>
              tx.competitorActivityImage.create({
                data: { competitorId: id, imageUrl: url, sortOrder: i },
              })
            )
          );
        }
      }

      if (data.featureImages !== undefined) {
        await tx.competitorFeatureImage.deleteMany({ where: { competitorId: id } });
        if (Array.isArray(data.featureImages) && data.featureImages.length) {
          await Promise.all(
            data.featureImages.map((url, i) =>
              tx.competitorFeatureImage.create({
                data: { competitorId: id, imageUrl: url, sortOrder: i },
              })
            )
          );
        }
      }

      if (data.mediaNotes !== undefined) {
        await tx.competitorMediaNote.deleteMany({ where: { competitorId: id } });
        if (Array.isArray(data.mediaNotes) && data.mediaNotes.length) {
          await Promise.all(
            data.mediaNotes.map((note) =>
              tx.competitorMediaNote.create({
                data: { competitorId: id, note: typeof note === 'string' ? note : note.text || note.note || '' },
              })
            )
          );
        }
      }

      if (data.comparisons !== undefined) {
        await tx.competitorComparison.deleteMany({ where: { competitorId: id } });
        if (Array.isArray(data.comparisons) && data.comparisons.length) {
          await Promise.all(
            data.comparisons.map((c, i) =>
              tx.competitorComparison.create({
                data: {
                  competitorId: id,
                  featureName: c.featureName || '',
                  competitorDescription: c.competitorDescription || c.competitorDesc || null,
                  ourDescription: c.ourDescription || c.ourDesc || null,
                  easiestToUse: c.easiestToUse || c.easierToUse || null,
                  stronger: c.stronger || null,
                  notes: c.notes || null,
                  sortOrder: i,
                },
              })
            )
          );
        }
      }

      if (data.devIdeas !== undefined) {
        await tx.competitorDevIdea.deleteMany({ where: { competitorId: id } });
        if (Array.isArray(data.devIdeas) && data.devIdeas.length) {
          await Promise.all(
            data.devIdeas.map((idea, i) =>
              tx.competitorDevIdea.create({
                data: {
                  competitorId: id,
                  title: idea.title || '',
                  description: idea.description || null,
                  sortOrder: i,
                  images: {
                    create: (idea.images || []).map((url, j) => ({
                      imageUrl: url,
                      sortOrder: j,
                    })),
                  },
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
