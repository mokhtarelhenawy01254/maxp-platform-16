const { PrismaClient } = require('../prisma/generated/postgresql_v2');

const prisma = new PrismaClient();

class CompetitorSocialService {
  async getOrCreateProfile(companyId, competitorId, platform) {
    let profile = await prisma.competitorSocialProfile.findUnique({
      where: {
        competitorId_platform: { competitorId, platform },
      },
    });

    if (!profile) {
      profile = await prisma.competitorSocialProfile.create({
        data: {
          platform,
          competitorId,
          companyId,
        },
      });
    }

    return profile;
  }

  async updateProfile(companyId, competitorId, platform, data) {
    const profile = await this.getOrCreateProfile(companyId, competitorId, platform);

    return prisma.competitorSocialProfile.update({
      where: { id: profile.id },
      data: {
        platformUserId: data.platformUserId,
        username: data.username,
        displayName: data.displayName,
        bio: data.bio,
        profileImage: data.profileImage,
        profileUrl: data.profileUrl,
        followersCount: data.followersCount,
        followingCount: data.followingCount,
        postsCount: data.postsCount,
        engagementRate: data.engagementRate,
        avgLikes: data.avgLikes,
        avgComments: data.avgComments,
        isVerified: data.isVerified,
        isPrivate: data.isPrivate,
        lastScrapeAt: new Date(),
        metadata: data.metadata,
      },
    });
  }

  async getProfiles(companyId, competitorId) {
    return prisma.competitorSocialProfile.findMany({
      where: { companyId, competitorId },
      include: {
        socialPosts: { take: 5, orderBy: { publishedAt: 'desc' } },
        _count: { select: { socialPosts: true, sentiments: true } },
      },
    });
  }

  async getProfile(companyId, competitorId, platform) {
    return prisma.competitorSocialProfile.findUnique({
      where: {
        competitorId_platform: { competitorId, platform },
      },
      include: {
        socialPosts: {
          take: 50,
          orderBy: { publishedAt: 'desc' },
        },
        socialMetrics: {
          take: 30,
          orderBy: { metricDate: 'desc' },
        },
        sentiments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async addPost(companyId, competitorId, platform, data) {
    const profile = await this.getOrCreateProfile(companyId, competitorId, platform);

    return prisma.competitorSocialPost.create({
      data: {
        platform,
        postId: data.postId,
        postType: data.postType || 'post',
        content: data.content,
        caption: data.caption,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        thumbnailUrl: data.thumbnailUrl,
        videoUrl: data.videoUrl,
        permalink: data.permalink,
        hashtags: data.hashtags || [],
        mentions: data.mentions || [],
        likesCount: data.likesCount || 0,
        commentsCount: data.commentsCount || 0,
        sharesCount: data.sharesCount || 0,
        viewsCount: data.viewsCount || 0,
        savesCount: data.savesCount || 0,
        engagementRate: data.engagementRate,
        publishedAt: data.publishedAt,
        scrapedAt: new Date(),
        metadata: data.metadata,
        profileId: profile.id,
      },
    });
  }

  async getPosts(companyId, competitorId, platform, options = {}) {
    const profile = await prisma.competitorSocialProfile.findUnique({
      where: { competitorId_platform: { competitorId, platform } },
    });

    if (!profile) return [];

    const { take = 50, skip = 0, postType, startDate, endDate } = options;

    const where = { profileId: profile.id };
    if (postType) where.postType = postType;
    if (startDate || endDate) {
      where.publishedAt = {};
      if (startDate) where.publishedAt.gte = startDate;
      if (endDate) where.publishedAt.lte = endDate;
    }

    return prisma.competitorSocialPost.findMany({
      where,
      take,
      skip,
      orderBy: { publishedAt: 'desc' },
    });
  }

  async recordMetrics(companyId, competitorId, platform, data) {
    const profile = await this.getOrCreateProfile(companyId, competitorId, platform);
    const metricDate = data.metricDate || new Date();
    metricDate.setHours(0, 0, 0, 0);

    return prisma.competitorSocialMetrics.upsert({
      where: {
        profileId_metricDate: { profileId: profile.id, metricDate },
      },
      create: {
        platform,
        metricDate,
        followersCount: data.followersCount,
        followingCount: data.followingCount,
        postsCount: data.postsCount,
        engagementRate: data.engagementRate,
        avgLikes: data.avgLikes,
        avgComments: data.avgComments,
        avgViews: data.avgViews,
        totalLikes: data.totalLikes,
        totalComments: data.totalComments,
        totalShares: data.totalShares,
        metadata: data.metadata,
        profileId: profile.id,
      },
      update: {
        followersCount: data.followersCount,
        followingCount: data.followingCount,
        postsCount: data.postsCount,
        engagementRate: data.engagementRate,
        avgLikes: data.avgLikes,
        avgComments: data.avgComments,
        avgViews: data.avgViews,
        totalLikes: data.totalLikes,
        totalComments: data.totalComments,
        totalShares: data.totalShares,
      },
    });
  }

  async getMetricsHistory(companyId, competitorId, platform, days = 30) {
    const profile = await prisma.competitorSocialProfile.findUnique({
      where: { competitorId_platform: { competitorId, platform } },
    });

    if (!profile) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return prisma.competitorSocialMetrics.findMany({
      where: {
        profileId: profile.id,
        metricDate: { gte: startDate },
      },
      orderBy: { metricDate: 'asc' },
    });
  }

  async analyzeSentiment(companyId, competitorId, platform, periodDays = 7) {
    const profile = await prisma.competitorSocialProfile.findUnique({
      where: { competitorId_platform: { competitorId, platform } },
    });

    if (!profile) return null;

    const posts = await prisma.competitorSocialPost.findMany({
      where: {
        profileId: profile.id,
        publishedAt: { gte: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000) },
      },
      orderBy: { publishedAt: 'desc' },
    });

    let positive = 0;
    let negative = 0;
    let neutral = 0;

    for (const post of posts) {
      const content = (post.caption || post.content || '').toLowerCase();

      const positiveWords = ['great', 'amazing', 'love', 'excellent', 'best', 'awesome', 'fantastic', 'wonderful', 'good', 'nice'];
      const negativeWords = ['bad', 'terrible', 'awful', 'worst', 'hate', 'horrible', 'poor', 'disappointed', 'slow', 'broken'];

      const posCount = positiveWords.filter(w => content.includes(w)).length;
      const negCount = negativeWords.filter(w => content.includes(w)).length;

      if (posCount > negCount) positive++;
      else if (negCount > posCount) negative++;
      else neutral++;
    }

    const total = posts.length || 1;

    const sentiment = await prisma.competitorSentiment.create({
      data: {
        platform,
        sentiment: positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral',
        score: ((positive - negative) / total).toFixed(2),
        positiveCount: positive,
        negativeCount: negative,
        neutralCount: neutral,
        periodStart: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000),
        periodEnd: new Date(),
        profileId: profile.id,
        companyId,
      },
    });

    return sentiment;
  }

  async getSentimentHistory(companyId, competitorId, platform, months = 3) {
    const profile = await prisma.competitorSocialProfile.findUnique({
      where: { competitorId_platform: { competitorId, platform } },
    });

    if (!profile) return [];

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    return prisma.competitorSentiment.findMany({
      where: {
        profileId: profile.id,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEngagementStats(companyId, competitorId, platform, days = 30) {
    const profile = await prisma.competitorSocialProfile.findUnique({
      where: { competitorId_platform: { competitorId, platform } },
    });

    if (!profile) return null;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const posts = await prisma.competitorSocialPost.findMany({
      where: {
        profileId: profile.id,
        publishedAt: { gte: startDate },
      },
    });

    if (posts.length === 0) return null;

    const totals = posts.reduce((acc, post) => ({
      likes: acc.likes + (post.likesCount || 0),
      comments: acc.comments + (post.commentsCount || 0),
      shares: acc.shares + (post.sharesCount || 0),
      views: acc.views + (post.viewsCount || 0),
    }), { likes: 0, comments: 0, shares: 0, views: 0 });

    const avgEngagementRate = posts.reduce((acc, post) => acc + (Number(post.engagementRate) || 0), 0) / posts.length;

    return {
      periodDays: days,
      postCount: posts.length,
      avgEngagementRate: avgEngagementRate.toFixed(2),
      totalLikes: totals.likes,
      totalComments: totals.comments,
      totalShares: totals.shares,
      totalViews: totals.views,
      avgLikes: Math.round(totals.likes / posts.length),
      avgComments: Math.round(totals.comments / posts.length),
      avgShares: Math.round(totals.shares / posts.length),
      avgViews: Math.round(totals.views / posts.length),
    };
  }

  async deleteProfile(companyId, competitorId, platform) {
    const profile = await prisma.competitorSocialProfile.findUnique({
      where: { competitorId_platform: { competitorId, platform } },
    });

    if (!profile) return null;

    return prisma.competitorSocialProfile.delete({
      where: { id: profile.id },
    });
  }
}

module.exports = new CompetitorSocialService();