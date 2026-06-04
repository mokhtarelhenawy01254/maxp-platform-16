const { PrismaClient } = require('../prisma/generated/postgresql_v2');

const prisma = new PrismaClient();

class CompetitorPlatformService {
  async upsertAmazonData(companyId, competitorId, data) {
    return prisma.competitorAmazonData.upsert({
      where: {
        competitorId_asin: { competitorId, asin: data.asin },
      },
      create: {
        asin: data.asin,
        productTitle: data.productTitle,
        productUrl: data.productUrl,
        brand: data.brand,
        category: data.category,
        subcategory: data.subcategory,
        bsrCategory: data.bsrCategory,
        bsrRank: data.bsrRank,
        reviewCount: data.reviewCount,
        reviewRating: data.reviewRating,
        price: data.price,
        listPrice: data.listPrice,
        currency: data.currency || 'USD',
        fulfillmentType: data.fulfillmentType,
        isPrime: data.isPrime,
        isAvailable: data.isAvailable,
        inventoryLevel: data.inventoryLevel,
        fbaFees: data.fbaFees,
        referralFees: data.referralFees,
        imageUrl: data.imageUrl,
        images: data.images,
        variantsCount: data.variantsCount,
        salesRankHistory: data.salesRankHistory,
        reviewHistory: data.reviewHistory,
        competitorId,
        companyId,
      },
      update: {
        productTitle: data.productTitle,
        productUrl: data.productUrl,
        brand: data.brand,
        category: data.category,
        subcategory: data.subcategory,
        bsrCategory: data.bsrCategory,
        bsrRank: data.bsrRank,
        reviewCount: data.reviewCount,
        reviewRating: data.reviewRating,
        price: data.price,
        listPrice: data.listPrice,
        fulfillmentType: data.fulfillmentType,
        isPrime: data.isPrime,
        isAvailable: data.isAvailable,
        inventoryLevel: data.inventoryLevel,
        fbaFees: data.fbaFees,
        referralFees: data.referralFees,
        imageUrl: data.imageUrl,
        images: data.images,
        variantsCount: data.variantsCount,
        salesRankHistory: data.salesRankHistory,
        reviewHistory: data.reviewHistory,
        lastUpdated: new Date(),
      },
    });
  }

  async getAmazonData(companyId, competitorId, asin = null) {
    const where = { companyId, competitorId };
    if (asin) where.asin = asin;

    return prisma.competitorAmazonData.findMany({
      where,
      orderBy: { bsrRank: 'asc' },
    });
  }

  async getAmazonSummary(companyId, competitorId) {
    const products = await this.getAmazonData(companyId, competitorId);

    const totalProducts = products.length;
    const avgPrice = products.reduce((sum, p) => sum + Number(p.price || 0), 0) / (totalProducts || 1);
    const avgRating = products.reduce((sum, p) => sum + Number(p.reviewRating || 0), 0) / (totalProducts || 1);
    const avgReviewCount = products.reduce((sum, p) => sum + (p.reviewCount || 0), 0) / (totalProducts || 1);
    const primeCount = products.filter(p => p.isPrime).length;

    const byCategory = {};
    for (const p of products) {
      const cat = p.category || 'Unknown';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(p);
    }

    const categoryStats = Object.entries(byCategory).map(([cat, prods]) => ({
      category: cat,
      count: prods.length,
      avgPrice: prods.reduce((s, p) => s + Number(p.price || 0), 0) / prods.length,
      avgRating: prods.reduce((s, p) => s + Number(p.reviewRating || 0), 0) / prods.length,
    }));

    return {
      totalProducts,
      avgPrice: avgPrice.toFixed(2),
      avgRating: avgRating.toFixed(1),
      avgReviewCount: Math.round(avgReviewCount),
      primePercentage: ((primeCount / totalProducts) * 100).toFixed(1),
      categoryStats,
    };
  }

  async upsertGoogleBusiness(companyId, competitorId, data) {
    return prisma.competitorGoogleBusiness.upsert({
      where: {
        competitorId_placeId: { competitorId, placeId: data.placeId },
      },
      create: {
        placeId: data.placeId,
        googleMapsUrl: data.googleMapsUrl,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        postalCode: data.postalCode,
        latitude: data.latitude,
        longitude: data.longitude,
        phone: data.phone,
        website: data.website,
        rating: data.rating,
        reviewsCount: data.reviewsCount,
        reviewsUrl: data.reviewsUrl,
        photosCount: data.photosCount,
        hours: data.hours,
        categories: data.categories,
        attributes: data.attributes,
        lastScrapedAt: new Date(),
        metadata: data.metadata,
        competitorId,
        companyId,
      },
      update: {
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        postalCode: data.postalCode,
        latitude: data.latitude,
        longitude: data.longitude,
        phone: data.phone,
        website: data.website,
        rating: data.rating,
        reviewsCount: data.reviewsCount,
        photosCount: data.photosCount,
        hours: data.hours,
        categories: data.categories,
        attributes: data.attributes,
        lastScrapedAt: new Date(),
      },
    });
  }

  async getGoogleBusiness(companyId, competitorId) {
    return prisma.competitorGoogleBusiness.findFirst({
      where: { companyId, competitorId },
      include: {
        googleReviews: {
          take: 20,
          orderBy: { publishedAt: 'desc' },
        },
      },
    });
  }

  async addGoogleReview(googleDataId, data) {
    return prisma.competitorGoogleReview.create({
      data: {
        reviewId: data.reviewId,
        authorName: data.authorName,
        authorUrl: data.authorUrl,
        profilePhotoUrl: data.profilePhotoUrl,
        rating: data.rating,
        content: data.content,
        responseContent: data.responseContent,
        responseDate: data.responseDate,
        publishedAt: data.publishedAt,
        sentiment: data.sentiment,
        metadata: data.metadata,
        googleDataId,
      },
    });
  }

  async upsertTechStack(companyId, competitorId, category, name, version = null, confidence = 'high') {
    return prisma.competitorTechStack.upsert({
      where: {
        competitorId_category_name: { competitorId, category, name },
      },
      create: {
        category,
        name,
        version,
        confidence,
        detectedAt: new Date(),
        competitorId,
        companyId,
      },
      update: {
        version,
        confidence,
        detectedAt: new Date(),
      },
    });
  }

  async getTechStack(companyId, competitorId) {
    return prisma.competitorTechStack.findMany({
      where: { companyId, competitorId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async getTechStackByCategory(companyId, competitorId) {
    const stack = await this.getTechStack(companyId, competitorId);

    const byCategory = {};
    for (const item of stack) {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(item);
    }

    return byCategory;
  }

  async upsertShopifyStore(companyId, competitorId, data) {
    return prisma.competitorShopifyStore.upsert({
      where: { storeUrl: data.storeUrl },
      create: {
        storeUrl: data.storeUrl,
        storeName: data.storeName,
        description: data.description,
        logoUrl: data.logoUrl,
        facebookUrl: data.facebookUrl,
        instagramUrl: data.instagramUrl,
        twitterUrl: data.twitterUrl,
        currency: data.currency,
        country: data.country,
        productsCount: data.productsCount,
        themes: data.themes,
        appsCount: data.appsCount,
        lastScrapedAt: new Date(),
        metadata: data.metadata,
        competitorId,
        companyId,
      },
      update: {
        storeName: data.storeName,
        description: data.description,
        logoUrl: data.logoUrl,
        facebookUrl: data.facebookUrl,
        instagramUrl: data.instagramUrl,
        twitterUrl: data.twitterUrl,
        currency: data.currency,
        country: data.country,
        productsCount: data.productsCount,
        themes: data.themes,
        appsCount: data.appsCount,
        lastScrapedAt: new Date(),
      },
    });
  }

  async getShopifyStore(companyId, competitorId) {
    return prisma.competitorShopifyStore.findFirst({
      where: { companyId, competitorId },
    });
  }

  async getPlatformSummary(companyId, competitorId) {
    const [amazon, google, techStack, shopify] = await Promise.all([
      this.getAmazonSummary(companyId, competitorId),
      this.getGoogleBusiness(companyId, competitorId),
      this.getTechStack(companyId, competitorId),
      this.getShopifyStore(companyId, competitorId),
    ]);

    return {
      amazon,
      googleBusiness: google ? {
        rating: Number(google.rating),
        reviewsCount: google.reviewsCount,
        address: google.address,
        phone: google.phone,
        website: google.website,
      } : null,
      techStack: techStack.length,
      techCategories: [...new Set(techStack.map(t => t.category))],
      shopify: shopify ? {
        storeUrl: shopify.storeUrl,
        productsCount: shopify.productsCount,
        appsCount: shopify.appsCount,
      } : null,
    };
  }

  async deleteAmazonData(companyId, competitorId, asin) {
    return prisma.competitorAmazonData.deleteMany({
      where: { companyId, competitorId, asin },
    });
  }

  async deleteGoogleBusiness(companyId, competitorId) {
    return prisma.competitorGoogleBusiness.deleteMany({
      where: { companyId, competitorId },
    });
  }

  async deleteTechStack(companyId, competitorId) {
    return prisma.competitorTechStack.deleteMany({
      where: { companyId, competitorId },
    });
  }

  async deleteShopifyStore(companyId, competitorId) {
    return prisma.competitorShopifyStore.deleteMany({
      where: { companyId, competitorId },
    });
  }
}

module.exports = new CompetitorPlatformService();