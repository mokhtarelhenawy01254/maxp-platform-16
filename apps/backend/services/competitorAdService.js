const { PrismaClient } = require('../prisma/generated/postgresql_v2');

const prisma = new PrismaClient();

class CompetitorAdService {
  async upsertCampaign(companyId, competitorId, platform, data) {
    return prisma.competitorAdCampaign.upsert({
      where: {
        competitorId_platform_campaignId: {
          competitorId,
          platform,
          campaignId: data.campaignId,
        },
      },
      create: {
        platform,
        campaignId: data.campaignId,
        campaignName: data.campaignName,
        objective: data.objective,
        status: data.status,
        startedAt: data.startedAt,
        stoppedAt: data.stoppedAt,
        budget: data.budget,
        budgetCurrency: data.budgetCurrency || 'USD',
        spend: data.spend,
        impressions: data.impressions,
        clicks: data.clicks,
        conversions: data.conversions,
        reach: data.reach,
        frequency: data.frequency,
        ctr: data.ctr,
        cpc: data.cpc,
        cpm: data.cpm,
        roas: data.roas,
        competitorId,
        companyId,
      },
      update: {
        campaignName: data.campaignName,
        objective: data.objective,
        status: data.status,
        startedAt: data.startedAt,
        stoppedAt: data.stoppedAt,
        budget: data.budget,
        spend: data.spend,
        impressions: data.impressions,
        clicks: data.clicks,
        conversions: data.conversions,
        reach: data.reach,
        frequency: data.frequency,
        ctr: data.ctr,
        cpc: data.cpc,
        cpm: data.cpm,
        roas: data.roas,
        lastUpdated: new Date(),
      },
    });
  }

  async getCampaigns(companyId, competitorId, platform = null) {
    const where = { companyId, competitorId };
    if (platform) where.platform = platform;

    return prisma.competitorAdCampaign.findMany({
      where,
      include: {
        adCreatives: { take: 10, orderBy: { lastSeen: 'desc' } },
      },
      orderBy: { lastUpdated: 'desc' },
    });
  }

  async getCampaign(companyId, competitorId, campaignId) {
    return prisma.competitorAdCampaign.findFirst({
      where: { companyId, competitorId, id: campaignId },
      include: {
        adCreatives: {
          orderBy: { lastSeen: 'desc' },
        },
      },
    });
  }

  async upsertCreative(campaignId, data) {
    return prisma.competitorAdCreative.upsert({
      where: {
        campaignId_adId: { campaignId, adId: data.adId },
      },
      create: {
        campaignId,
        adId: data.adId,
        platform: data.platform,
        adType: data.adType,
        status: data.status,
        headline: data.headline,
        primaryText: data.primaryText,
        description: data.description,
        callToAction: data.callToAction,
        landingPageUrl: data.landingPageUrl,
        imageUrl: data.imageUrl,
        videoUrl: data.videoUrl,
        adFormat: data.adFormat,
        impressions: data.impressions,
        clicks: data.clicks,
        ctr: data.ctr,
        spend: data.spend,
        firstSeen: new Date(),
        lastSeen: new Date(),
      },
      update: {
        adType: data.adType,
        status: data.status,
        headline: data.headline,
        primaryText: data.primaryText,
        description: data.description,
        callToAction: data.callToAction,
        landingPageUrl: data.landingPageUrl,
        imageUrl: data.imageUrl,
        videoUrl: data.videoUrl,
        adFormat: data.adFormat,
        impressions: data.impressions,
        clicks: data.clicks,
        ctr: data.ctr,
        spend: data.spend,
        lastSeen: new Date(),
      },
    });
  }

  async getCreatives(companyId, competitorId, campaignId = null) {
    const where = { campaign: { companyId, competitorId } };
    if (campaignId) where.campaignId = campaignId;

    return prisma.competitorAdCreative.findMany({
      where,
      include: {
        campaign: true,
      },
      orderBy: { lastSeen: 'desc' },
    });
  }

  async getAdIntelligence(companyId, competitorId, platform = null) {
    const where = { companyId, competitorId };
    if (platform) where.platform = platform;

    return prisma.competitorAdIntelligence.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async addAdIntelligence(companyId, competitorId, data) {
    return prisma.competitorAdIntelligence.create({
      data: {
        platform: data.platform,
        advertiserId: data.advertiserId,
        advertiserName: data.advertiserName,
        adLibraryId: data.adLibraryId,
        adType: data.adType,
        creativeDetails: data.creativeDetails,
        targeting: data.targeting,
        placements: data.placements,
        startDate: data.startDate,
        endDate: data.endDate,
        impressionsMin: data.impressionsMin,
        impressionsMax: data.impressionsMax,
        spendMin: data.spendMin,
        spendMax: data.spendMax,
        pageId: data.pageId,
        pageName: data.pageName,
        metadata: data.metadata,
        competitorId,
        companyId,
      },
    });
  }

  async getAdSummary(companyId, competitorId, platform = null) {
    const where = { companyId, competitorId };
    if (platform) where.platform = platform;

    const campaigns = await prisma.competitorAdCampaign.findMany({
      where,
    });

    const totalSpend = campaigns.reduce((sum, c) => sum + Number(c.spend || 0), 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);

    const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0;
    const avgCPC = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : 0;
    const avgROAS = totalSpend > 0 ? (totalConversions * avgCPC / totalSpend).toFixed(2) : 0;

    const byPlatform = {};
    for (const c of campaigns) {
      if (!byPlatform[c.platform]) byPlatform[c.platform] = [];
      byPlatform[c.platform].push(c);
    }

    const platformStats = Object.entries(byPlatform).map(([plat, camps]) => ({
      platform: plat,
      campaignCount: camps.length,
      totalSpend: camps.reduce((s, c) => s + Number(c.spend || 0), 0),
      totalImpressions: camps.reduce((s, c) => s + (c.impressions || 0), 0),
      totalClicks: camps.reduce((s, c) => s + (c.clicks || 0), 0),
    }));

    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      totalSpend: totalSpend.toFixed(2),
      totalImpressions,
      totalClicks,
      totalConversions,
      avgCTR,
      avgCPC,
      avgROAS,
      platformStats,
    };
  }

  async getTopCreatives(companyId, competitorId, platform, limit = 10) {
    return prisma.competitorAdCreative.findMany({
      where: {
        campaign: { companyId, competitorId, platform },
      },
      include: {
        campaign: true,
      },
      orderBy: { impressions: 'desc' },
      take: limit,
    });
  }

  async deleteCampaign(companyId, competitorId, campaignId) {
    return prisma.competitorAdCampaign.deleteMany({
      where: { companyId, competitorId, id: campaignId },
    });
  }
}

module.exports = new CompetitorAdService();