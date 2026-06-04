const { getSharedPrismaClient } = require('../utils/toolHelpers');

const getPrisma = () => getSharedPrismaClient();

const TOOLS = {
  'competitor.search': {
    description: 'Search competitors by name or URL.',
    params: {
      query: 'Search text to find competitors by name.',
      limit: 'Maximum number of results. Default 10.',
    },
    requiredParams: ['query'],
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', description: 'Search text for competitor name.' },
        limit: { type: 'integer', minimum: 1, maximum: 50 },
      },
    },
    handler: async (companyId, { query, limit = 10 }) => {
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
    },
  },

  'competitor.getProducts': {
    description: 'List products of a specific competitor.',
    params: {
      competitorId: 'The competitor ID.',
      isAvailable: 'Filter by availability (true/false).',
      limit: 'Maximum number of products. Default 20.',
    },
    requiredParams: ['competitorId'],
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['competitorId'],
      properties: {
        competitorId: { type: 'string', description: 'Competitor ID.' },
        isAvailable: { type: 'string', description: 'Filter by availability.' },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
      },
    },
    handler: async (companyId, { competitorId, isAvailable, limit = 20 }) => {
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
    },
  },

  'competitor.priceCompare': {
    description: 'Compare prices between your products and a competitor.',
    params: {
      competitorId: 'The competitor ID to compare against.',
      category: 'Optional category filter.',
    },
    requiredParams: ['competitorId'],
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['competitorId'],
      properties: {
        competitorId: { type: 'string', description: 'Competitor ID.' },
        category: { type: 'string', description: 'Category to filter by.' },
      },
    },
    handler: async (companyId, { competitorId, category }) => {
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
    },
  },

  'competitor.getAds': {
    description: 'List ads of a specific competitor.',
    params: {
      competitorId: 'The competitor ID.',
      platform: 'Filter by platform (facebook, google, etc.).',
      limit: 'Maximum number of ads. Default 10.',
    },
    requiredParams: ['competitorId'],
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['competitorId'],
      properties: {
        competitorId: { type: 'string', description: 'Competitor ID.' },
        platform: { type: 'string', description: 'Ad platform filter.' },
        limit: { type: 'integer', minimum: 1, maximum: 50 },
      },
    },
    handler: async (companyId, { competitorId, platform, limit = 10 }) => {
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
    },
  },

  'competitor.generateReport': {
    description: 'Generate an AI analysis report for a competitor.',
    params: {
      competitorId: 'The competitor ID.',
      type: 'Report type: weekly or comprehensive.',
    },
    requiredParams: ['competitorId'],
    readOnly: true,
    sideEffects: 'write',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['competitorId'],
      properties: {
        competitorId: { type: 'string', description: 'Competitor ID.' },
        type: { type: 'string', enum: ['weekly', 'comprehensive'], description: 'Report type.' },
      },
    },
    handler: async (companyId, { competitorId, type = 'weekly' }) => {
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
    },
  },

  'competitor.battlecard': {
    description: 'Generate a battlecard comparing your company against a competitor.',
    params: {
      competitorId: 'The competitor ID to compare against.',
      format: 'Output format: markdown or structured. Default structured.',
    },
    requiredParams: ['competitorId'],
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['competitorId'],
      properties: {
        competitorId: { type: 'string', description: 'Competitor ID.' },
        format: { type: 'string', enum: ['markdown', 'structured'], description: 'Battlecard format.' },
      },
    },
    handler: async (companyId, { competitorId, format = 'structured' }) => {
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
    },
  },

  'competitor.autoDiscover': {
    description: 'Auto-discover competitors from your product catalog.',
    params: {
      category: 'Optional category to focus on.',
      maxResults: 'Maximum competitors to discover. Default 5.',
    },
    requiredParams: [],
    readOnly: true,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Product category to analyze.' },
        maxResults: { type: 'integer', minimum: 1, maximum: 20 },
      },
    },
    handler: async (companyId, { category, maxResults = 5 }) => {
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
    },
  },

  'competitor.socialProfile': {
    description: 'Get social media profile data for a competitor (Instagram, Facebook, TikTok).',
    params: {
      competitorId: 'The competitor ID.',
      platform: 'Social platform: instagram, facebook, or tiktok.',
    },
    requiredParams: ['competitorId', 'platform'],
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['competitorId', 'platform'],
      properties: {
        competitorId: { type: 'string', description: 'Competitor ID.' },
        platform: { type: 'string', enum: ['instagram', 'facebook', 'tiktok'] },
      },
    },
    handler: async (companyId, { competitorId, platform }) => {
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
    },
  },

  'competitor.socialEngagement': {
    description: 'Get engagement statistics for a competitor social media account.',
    params: {
      competitorId: 'The competitor ID.',
      platform: 'Social platform.',
      days: 'Number of days to analyze. Default 30.',
    },
    requiredParams: ['competitorId', 'platform'],
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['competitorId', 'platform'],
      properties: {
        competitorId: { type: 'string', description: 'Competitor ID.' },
        platform: { type: 'string', enum: ['instagram', 'facebook', 'tiktok'] },
        days: { type: 'integer', minimum: 7, maximum: 90 },
      },
    },
    handler: async (companyId, { competitorId, platform, days = 30 }) => {
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
    },
  },

  'competitor.socialPosts': {
    description: 'Get recent posts from a competitor social media account.',
    params: {
      competitorId: 'The competitor ID.',
      platform: 'Social platform.',
      limit: 'Maximum number of posts. Default 20.',
    },
    requiredParams: ['competitorId', 'platform'],
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['competitorId', 'platform'],
      properties: {
        competitorId: { type: 'string', description: 'Competitor ID.' },
        platform: { type: 'string', enum: ['instagram', 'facebook', 'tiktok'] },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
      },
    },
    handler: async (companyId, { competitorId, platform, limit = 20 }) => {
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
    },
  },

  'competitor.adCampaigns': {
    description: 'Get ad campaigns for a competitor.',
    params: {
      competitorId: 'The competitor ID.',
      platform: 'Ad platform: facebook, google, tiktok.',
    },
    requiredParams: ['competitorId'],
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['competitorId'],
      properties: {
        competitorId: { type: 'string', description: 'Competitor ID.' },
        platform: { type: 'string', enum: ['facebook', 'google', 'tiktok'] },
      },
    },
    handler: async (companyId, { competitorId, platform }) => {
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
    },
  },

  'competitor.adSummary': {
    description: 'Get ad spending summary for a competitor.',
    params: {
      competitorId: 'The competitor ID.',
      platform: 'Ad platform filter.',
    },
    requiredParams: ['competitorId'],
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['competitorId'],
      properties: {
        competitorId: { type: 'string', description: 'Competitor ID.' },
        platform: { type: 'string', enum: ['facebook', 'google', 'tiktok'] },
      },
    },
    handler: async (companyId, { competitorId, platform }) => {
      const AdService = require('../../competitorAdService');
      const summary = await AdService.getAdSummary(companyId, competitorId, platform);

      return summary;
    },
  },

  'competitor.platformSummary': {
    description: 'Get platform-specific data summary (Amazon, Google Business, Tech Stack, Shopify).',
    params: {
      competitorId: 'The competitor ID.',
    },
    requiredParams: ['competitorId'],
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['competitorId'],
      properties: {
        competitorId: { type: 'string', description: 'Competitor ID.' },
      },
    },
    handler: async (companyId, { competitorId }) => {
      const PlatformService = require('../../competitorPlatformService');
      const summary = await PlatformService.getPlatformSummary(companyId, competitorId);

      return summary;
    },
  },

  'competitor.amazonData': {
    description: 'Get Amazon product data for a competitor.',
    params: {
      competitorId: 'The competitor ID.',
      asin: 'Specific ASIN to look up.',
    },
    requiredParams: ['competitorId'],
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['competitorId'],
      properties: {
        competitorId: { type: 'string', description: 'Competitor ID.' },
        asin: { type: 'string', description: 'Amazon ASIN.' },
      },
    },
    handler: async (companyId, { competitorId, asin }) => {
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
    },
  },

  'competitor.techStack': {
    description: 'Get technology stack detected for a competitor website.',
    params: {
      competitorId: 'The competitor ID.',
    },
    requiredParams: ['competitorId'],
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['competitorId'],
      properties: {
        competitorId: { type: 'string', description: 'Competitor ID.' },
      },
    },
    handler: async (companyId, { competitorId }) => {
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
    },
  },
};

module.exports = TOOLS;
