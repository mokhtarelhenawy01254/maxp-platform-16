const { getSharedPrismaClient } = require('../utils/toolHelpers');
const { createToolFromFunction } = require('../utils/autoSchemaGenerator');

const getPrisma = () => getSharedPrismaClient();

async function competitorSearchHandler(companyId, { query, limit = 10 }) {
  /**
   * Search competitors by name or URL.
   * @param {string} query - Search text to find competitors by name.
   * @param {number} limit - Maximum number of results. Default 10.
   */
  const competitors = await getPrisma().competitor.findMany({
    where: {
      companyId,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { url: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: Math.min(parseInt(limit) || 10, 50),
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { products: true, ads: true } } },
  });
  return competitors.map(c => ({
    id: c.id,
    name: c.name,
    url: c.url,
    platform: c.platform,
    isActive: c.isActive,
    productCount: c._count.products,
    adCount: c._count.ads,
  }));
}

async function competitorGetProductsHandler(companyId, { competitorId, isAvailable = undefined, limit = 20 }) {
  /**
   * List products of a specific competitor.
   * @param {string} competitorId - The competitor ID.
   * @param {string} isAvailable - Filter by availability (true/false).
   * @param {number} limit - Maximum number of products. Default 20.
   */
  const where = { competitor: { companyId, id: competitorId } };
  if (isAvailable !== undefined) where.isAvailable = isAvailable === 'true';

  const products = await getPrisma().competitorProduct.findMany({
    where,
    take: Math.min(parseInt(limit) || 20, 100),
    orderBy: { lastSeen: 'desc' },
  });
  return products.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price ? Number(p.price) : null,
    comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
    currency: p.currency,
    image: p.image,
    url: p.url,
    sku: p.sku,
    isAvailable: p.isAvailable,
    category: p.category,
  }));
}

async function competitorPriceCompareHandler(companyId, { competitorId, category = undefined }) {
  /**
   * Compare prices between your products and a competitor.
   * @param {string} competitorId - The competitor ID to compare against.
   * @param {string} category - Optional category filter.
   */
  const competitor = await getPrisma().competitor.findFirst({
    where: { id: competitorId, companyId },
    include: {
      products: {
        where: category ? { category } : {},
        take: 50,
        orderBy: { lastSeen: 'desc' },
      },
    },
  });
  if (!competitor) return { error: 'Competitor not found' };

  const yourProducts = await getPrisma().product.findMany({
    where: { companyId, isActive: true },
    take: 50,
    select: { id: true, name: true, price: true, sku: true },
  });

  return {
    competitorName: competitor.name,
    competitorProductCount: competitor.products.length,
    yourProductCount: yourProducts.length,
    competitorProducts: competitor.products.map(p => ({
      name: p.name,
      price: p.price ? Number(p.price) : null,
      sku: p.sku,
    })),
    gaps: competitor.products
      .filter(cp => !yourProducts.find(yp => yp.sku === cp.sku || yp.name.toLowerCase().includes(cp.name.toLowerCase().slice(0, 10))))
      .slice(0, 10)
      .map(p => ({ name: p.name, price: p.price ? Number(p.price) : null })),
  };
}

async function competitorGetAdsHandler(companyId, { competitorId, platform = undefined, limit = 10 }) {
  /**
   * List ads of a specific competitor.
   * @param {string} competitorId - The competitor ID.
   * @param {string} platform - Filter by platform (facebook, google, etc.).
   * @param {number} limit - Maximum number of ads. Default 10.
   */
  const where = { competitor: { companyId, id: competitorId } };
  if (platform) where.platform = platform;

  const ads = await getPrisma().competitorAd.findMany({
    where,
    take: Math.min(parseInt(limit) || 10, 50),
    orderBy: { lastSeen: 'desc' },
  });
  return ads.map(a => ({
    id: a.id,
    platform: a.platform,
    copy: a.copy,
    headline: a.headline,
    cta: a.cta,
    creativeUrl: a.creativeUrl,
    destinationUrl: a.destinationUrl,
    status: a.status,
    firstSeen: a.firstSeen,
  }));
}

async function competitorGenerateReportHandler(companyId, { competitorId, type = 'weekly' }) {
  /**
   * Generate an AI analysis report for a competitor.
   * @param {string} competitorId - The competitor ID.
   * @param {'weekly'|'comprehensive'} type - Report type: weekly or comprehensive.
   */
  const CompetitorService = require('../../competitorService');
  const report = await CompetitorService.generateReport(companyId, competitorId, type);
  if (!report) return { error: 'Competitor not found' };
  return {
    id: report.id,
    type: report.type,
    title: report.title,
    summary: report.summary,
    insights: report.insights,
    generatedAt: report.generatedAt,
  };
}

async function competitorBattlecardHandler(companyId, { competitorId, format = 'structured' }) {
  /**
   * Generate a battlecard comparing your company against a competitor.
   * @param {string} competitorId - The competitor ID to compare against.
   * @param {'markdown'|'structured'} format - Output format: markdown or structured. Default structured.
   */
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

  if (!competitor) return { error: 'Competitor not found' };

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

  if (format === 'markdown') {
    let md = `## Battlecard: ${competitor.name}\n\n`;
    md += `### Overview\n- Platform: ${competitor.platform}\n- Their Products: ${card.metrics.theirProducts}\n- Your Products: ${card.metrics.yourProducts}\n\n`;
    md += `### Price Comparison (Top ${priceComparison.length})\n`;
    md += `| Your Product | Your Price | Their Product | Their Price | Diff |\n`;
    md += `|---|---|---|---|---|\n`;
    for (const c of priceComparison.slice(0, 5)) {
      md += `| ${c.yourProduct} | ${c.yourPrice} | ${c.competitorProduct} | ${c.competitorPrice} | ${c.priceDiff}% |\n`;
    }
    md += `\n### Market Gaps\n`;
    for (const g of card.gaps) {
      md += `- ${g.name} (${g.price})\n`;
    }
    return { markdown: md, ...card };
  }

  return card;
}

async function competitorAutoDiscoverHandler(companyId, { category = undefined, maxResults = 5 }) {
  /**
   * Auto-discover competitors from your product catalog.
   * @param {string} category - Optional category to focus on.
   * @param {number} maxResults - Maximum competitors to discover. Default 5.
   */
  const prisma = getPrisma();

  const myProducts = await prisma.product.findMany({
    where: { companyId, isActive: true, ...(category ? { category } : {}) },
    take: 50,
    select: { id: true, name: true, sku: true, category: true },
  });

  if (myProducts.length === 0) {
    return { error: 'No products found', suggestion: 'Add products to your catalog first' };
  }

  const sampleProducts = myProducts.slice(0, 10);
  const searchTerms = sampleProducts.map(p => p.name.split(' ').slice(0, 2).join(' '));

  const discoveredCompetitors = [];

  for (const term of searchTerms.slice(0, maxResults)) {
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
      discoveredCompetitors.push({
        suggestedName: term,
        reason: `Similar to your products: ${sampleProducts.find(p => p.name.includes(term))?.name || term}`,
        matchedProducts: myProducts.filter(p => p.name.toLowerCase().includes(term.toLowerCase().split(' ')[0])).length,
      });
    }
  }

  return {
    discovered: discoveredCompetitors.slice(0, maxResults),
    searchedTerms: searchTerms.length,
    yourProductCount: myProducts.length,
    suggestion: discoveredCompetitors.length > 0
      ? 'Add these competitors to start tracking'
      : 'No new competitors found - you may already be tracking relevant ones',
  };
}

async function competitorSocialProfileHandler(companyId, { competitorId, platform }) {
  /**
   * Get social media profile data for a competitor (Instagram, Facebook, TikTok).
   * @param {string} competitorId - The competitor ID.
   * @param {'instagram'|'facebook'|'tiktok'} platform - Social platform: instagram, facebook, or tiktok.
   */
  const prisma = getPrisma();

  const profile = await prisma.competitorSocialProfile.findUnique({
    where: { competitorId_platform: { competitorId, platform } },
    include: {
      _count: { select: { socialPosts: true, socialMetrics: true } },
    },
  });

  if (!profile) return { error: 'Social profile not found', suggestion: 'Add social profile first using updateSocialProfile' };

  return {
    platform: profile.platform,
    username: profile.username,
    displayName: profile.displayName,
    followersCount: profile.followersCount,
    followingCount: profile.followingCount,
    postsCount: profile.postsCount,
    engagementRate: profile.engagementRate ? Number(profile.engagementRate) : null,
    isVerified: profile.isVerified,
    profileUrl: profile.profileUrl,
    lastScrapeAt: profile.lastScrapeAt,
    postsCount: profile._count.socialPosts,
  };
}

async function competitorSocialEngagementHandler(companyId, { competitorId, platform, days = 30 }) {
  /**
   * Get engagement statistics for a competitor social media account.
   * @param {string} competitorId - The competitor ID.
   * @param {'instagram'|'facebook'|'tiktok'} platform - Social platform.
   * @param {number} days - Number of days to analyze. Default 30.
   */
  const SocialService = require('../../competitorSocialService');
  const stats = await SocialService.getEngagementStats(companyId, competitorId, platform, days);

  if (!stats) return { error: 'No data available', suggestion: 'Add social posts first' };

  return {
    platform,
    periodDays: stats.periodDays,
    postCount: stats.postCount,
    avgEngagementRate: stats.avgEngagementRate,
    avgLikes: stats.avgLikes,
    avgComments: stats.avgComments,
    avgShares: stats.avgShares,
    avgViews: stats.avgViews,
    totalLikes: stats.totalLikes,
    totalComments: stats.totalComments,
    totalShares: stats.totalShares,
  };
}

async function competitorSocialPostsHandler(companyId, { competitorId, platform, limit = 20 }) {
  /**
   * Get recent posts from a competitor social media account.
   * @param {string} competitorId - The competitor ID.
   * @param {'instagram'|'facebook'|'tiktok'} platform - Social platform.
   * @param {number} limit - Maximum number of posts. Default 20.
   */
  const SocialService = require('../../competitorSocialService');
  const posts = await SocialService.getPosts(companyId, competitorId, platform, { take: limit });

  return {
    platform,
    count: posts.length,
    posts: posts.map(p => ({
      postId: p.postId,
      postType: p.postType,
      caption: p.caption ? p.caption.slice(0, 200) : null,
      mediaUrl: p.mediaUrl,
      likesCount: p.likesCount,
      commentsCount: p.commentsCount,
      sharesCount: p.sharesCount,
      viewsCount: p.viewsCount,
      engagementRate: p.engagementRate ? Number(p.engagementRate) : null,
      publishedAt: p.publishedAt,
    })),
  };
}

async function competitorAdCampaignsHandler(companyId, { competitorId, platform = undefined }) {
  /**
   * Get ad campaigns for a competitor.
   * @param {string} competitorId - The competitor ID.
   * @param {'facebook'|'google'|'tiktok'} platform - Ad platform: facebook, google, tiktok.
   */
  const AdService = require('../../competitorAdService');
  const campaigns = await AdService.getCampaigns(companyId, competitorId, platform);

  return {
    competitorId,
    platform: platform || 'all',
    totalCampaigns: campaigns.length,
    campaigns: campaigns.map(c => ({
      campaignId: c.id,
      campaignName: c.campaignName,
      objective: c.objective,
      status: c.status,
      budget: c.budget ? Number(c.budget) : null,
      spend: c.spend ? Number(c.spend) : null,
      impressions: c.impressions,
      clicks: c.clicks,
      ctr: c.ctr ? Number(c.ctr) : null,
      roas: c.roas ? Number(c.roas) : null,
      startedAt: c.startedAt,
    })),
  };
}

async function competitorAdSummaryHandler(companyId, { competitorId, platform = undefined }) {
  /**
   * Get ad spending summary for a competitor.
   * @param {string} competitorId - The competitor ID.
   * @param {'facebook'|'google'|'tiktok'} platform - Ad platform filter.
   */
  const AdService = require('../../competitorAdService');
  const summary = await AdService.getAdSummary(companyId, competitorId, platform);

  return summary;
}

async function competitorPlatformSummaryHandler(companyId, { competitorId }) {
  /**
   * Get platform-specific data summary (Amazon, Google Business, Tech Stack, Shopify).
   * @param {string} competitorId - The competitor ID.
   */
  const PlatformService = require('../../competitorPlatformService');
  const summary = await PlatformService.getPlatformSummary(companyId, competitorId);

  return summary;
}

async function competitorAmazonDataHandler(companyId, { competitorId, asin = undefined }) {
  /**
   * Get Amazon product data for a competitor.
   * @param {string} competitorId - The competitor ID.
   * @param {string} asin - Specific ASIN to look up.
   */
  const PlatformService = require('../../competitorPlatformService');
  const products = await PlatformService.getAmazonData(companyId, competitorId, asin);

  return {
    competitorId,
    count: products.length,
    products: products.map(p => ({
      asin: p.asin,
      title: p.productTitle,
      price: p.price ? Number(p.price) : null,
      bsrRank: p.bssrRank,
      reviewCount: p.reviewCount,
      reviewRating: p.reviewRating ? Number(p.reviewRating) : null,
      isPrime: p.isPrime,
      isAvailable: p.isAvailable,
      imageUrl: p.imageUrl,
    })),
  };
}

async function competitorTechStackHandler(companyId, { competitorId }) {
  /**
   * Get technology stack detected for a competitor website.
   * @param {string} competitorId - The competitor ID.
   */
  const PlatformService = require('../../competitorPlatformService');
  const stack = await PlatformService.getTechStackByCategory(companyId, competitorId);

  const result = {};
  for (const [category, items] of Object.entries(stack)) {
    result[category] = items.map(t => ({ name: t.name, version: t.version }));
  }

  return {
    competitorId,
    totalTechnologies: Object.values(stack).flat().length,
    categories: Object.keys(stack),
    stack: result,
  };
}

const TOOLS = {
  'competitor.search': createToolFromFunction('competitor.search', competitorSearchHandler, {
    description: 'Search competitors by name or URL.',
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
  }),

  'competitor.getProducts': createToolFromFunction('competitor.getProducts', competitorGetProductsHandler, {
    description: 'List products of a specific competitor.',
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
  }),

  'competitor.priceCompare': createToolFromFunction('competitor.priceCompare', competitorPriceCompareHandler, {
    description: 'Compare prices between your products and a competitor.',
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
  }),

  'competitor.getAds': createToolFromFunction('competitor.getAds', competitorGetAdsHandler, {
    description: 'List ads of a specific competitor.',
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
  }),

  'competitor.generateReport': createToolFromFunction('competitor.generateReport', competitorGenerateReportHandler, {
    description: 'Generate an AI analysis report for a competitor.',
    readOnly: true,
    sideEffects: 'write',
    requiresApproval: false,
    companyScoped: true,
  }),

  'competitor.battlecard': createToolFromFunction('competitor.battlecard', competitorBattlecardHandler, {
    description: 'Generate a battlecard comparing your company against a competitor.',
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
  }),

  'competitor.autoDiscover': createToolFromFunction('competitor.autoDiscover', competitorAutoDiscoverHandler, {
    description: 'Auto-discover competitors from your product catalog.',
    readOnly: true,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
  }),

  'competitor.socialProfile': createToolFromFunction('competitor.socialProfile', competitorSocialProfileHandler, {
    description: 'Get social media profile data for a competitor (Instagram, Facebook, TikTok).',
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
  }),

  'competitor.socialEngagement': createToolFromFunction('competitor.socialEngagement', competitorSocialEngagementHandler, {
    description: 'Get engagement statistics for a competitor social media account.',
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
  }),

  'competitor.socialPosts': createToolFromFunction('competitor.socialPosts', competitorSocialPostsHandler, {
    description: 'Get recent posts from a competitor social media account.',
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
  }),

  'competitor.adCampaigns': createToolFromFunction('competitor.adCampaigns', competitorAdCampaignsHandler, {
    description: 'Get ad campaigns for a competitor.',
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
  }),

  'competitor.adSummary': createToolFromFunction('competitor.adSummary', competitorAdSummaryHandler, {
    description: 'Get ad spending summary for a competitor.',
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
  }),

  'competitor.platformSummary': createToolFromFunction('competitor.platformSummary', competitorPlatformSummaryHandler, {
    description: 'Get platform-specific data summary (Amazon, Google Business, Tech Stack, Shopify).',
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
  }),

  'competitor.amazonData': createToolFromFunction('competitor.amazonData', competitorAmazonDataHandler, {
    description: 'Get Amazon product data for a competitor.',
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
  }),

  'competitor.techStack': createToolFromFunction('competitor.techStack', competitorTechStackHandler, {
    description: 'Get technology stack detected for a competitor website.',
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
  }),
};

module.exports = TOOLS;
