const Queue = require('bull');
const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const { t } = require('../services/aiAgent/i18n');

const prisma = new PrismaClient();

class CompetitorMonitorWorker {
  constructor(redisUrl) {
    this.redisUrl = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    this.queue = new Queue('competitor-monitoring', this.redisUrl);
    this.isRunning = false;
  }

  async initialize() {
    if (this.isRunning) return;

    this.queue.process(async (job) => {
      return this.processJob(job);
    });

    this.queue.on('completed', (job, result) => {
      console.log(`[CompetitorMonitor] Job ${job.id} completed:`, result);
    });

    this.queue.on('failed', (job, err) => {
      console.error(`[CompetitorMonitor] Job ${job?.id} failed:`, err.message);
    });

    this.isRunning = true;
    console.log('[CompetitorMonitor] Worker initialized');
  }

  async processJob(job) {
    const { type, competitorId, productId, data } = job.data;

    switch (type) {
      case 'TRACK_PRODUCT':
        return await this.trackProduct(competitorId, productId, data);
      case 'TRACK_COMPETITOR':
        return await this.trackCompetitor(competitorId);
      case 'CHECK_PRICE_CHANGES':
        return await this.checkPriceChanges(competitorId);
      case 'CHECK_NEW_PRODUCTS':
        return await this.checkNewProducts(competitorId);
      case 'GENERATE_WEEKLY_REPORT':
        return await this.generateWeeklyReport(competitorId);
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  }

  async trackProduct(competitorId, productId, data) {
    const { name, price, currency, image, url, sku } = data;

    const product = await prisma.competitorProduct.update({
      where: { id: productId },
      data: {
        name,
        price,
        currency,
        image,
        url,
        sku,
        lastSeen: new Date(),
      },
    });

    await prisma.competitorPriceHistory.create({
      data: {
        price,
        currency,
        productId,
        recordedAt: new Date(),
      },
    });

    return { success: true, productId, price };
  }

  async trackCompetitor(competitorId) {
    const competitor = await prisma.competitor.findUnique({
      where: { id: competitorId },
      include: { products: true },
    });

    if (!competitor) {
      throw new Error(`Competitor ${competitorId} not found`);
    }

    let newProducts = 0;
    let priceChanges = 0;

    for (const product of competitor.products) {
      const lastHistory = await prisma.competitorPriceHistory.findFirst({
        where: { productId: product.id },
        orderBy: { recordedAt: 'desc' },
      });

      if (lastHistory && lastHistory.price !== product.price) {
        priceChanges++;
        await prisma.competitorPriceHistory.create({
          data: {
            price: product.price,
            currency: product.currency,
            productId: product.id,
            recordedAt: new Date(),
          },
        });
      }
    }

    return {
      success: true,
      competitorId,
      trackedProducts: competitor.products.length,
      newProducts,
      priceChanges,
    };
  }

  async checkPriceChanges(competitorId) {
    const competitor = await prisma.competitor.findUnique({
      where: { id: competitorId },
      include: {
        products: {
          include: { priceHistory: { orderBy: { recordedAt: 'desc' }, take: 2 } },
        },
      },
    });

    if (!competitor) return { success: false, error: 'Competitor not found' };

    const changes = [];

    for (const product of competitor.products) {
      if (product.priceHistory.length >= 2) {
        const [latest, previous] = product.priceHistory;
        if (latest.price !== previous.price) {
          changes.push({
            productId: product.id,
            productName: product.name,
            oldPrice: Number(previous.price),
            newPrice: Number(latest.price),
            change: Number(latest.price) - Number(previous.price),
            percentChange: (((Number(latest.price) - Number(previous.price)) / Number(previous.price)) * 100).toFixed(2),
          });
        }
      }
    }

    return { success: true, competitorId, changes };
  }

  async checkNewProducts(competitorId) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newProducts = await prisma.competitorProduct.findMany({
      where: {
        competitorId,
        firstSeen: { gte: sevenDaysAgo },
      },
    });

    return {
      success: true,
      competitorId,
      newProducts: newProducts.length,
      products: newProducts.map(p => ({ id: p.id, name: p.name, price: Number(p.price) })),
    };
  }

  async generateWeeklyReport(competitorId) {
    const competitor = await prisma.competitor.findUnique({
      where: { id: competitorId },
      include: {
        products: {
          include: { priceHistory: true },
        },
        ads: true,
      },
    });

    if (!competitor) return { success: false, error: 'Competitor not found' };

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newProducts = competitor.products.filter(p => p.firstSeen >= sevenDaysAgo).length;

    const priceChanges = competitor.products.filter(p => {
      if (p.priceHistory.length < 2) return false;
      const sorted = p.priceHistory.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
      return sorted[0].price !== sorted[1].price;
    }).length;

    const summary = t('competitor.monitor_summary', 'ar', {
      products: competitor.products.length,
      ads: competitor.ads.length,
      newProducts,
      priceChanges,
    });

    const report = await prisma.competitorReport.create({
      data: {
        type: 'weekly',
        title: t('competitor.weekly_report_title', 'ar', { name: competitor.name }),
        summary,
        insights: JSON.stringify({
          newProducts,
          priceChanges,
          totalProducts: competitor.products.length,
          totalAds: competitor.ads.length,
        }),
        data: JSON.stringify({
          products: competitor.products.slice(0, 50),
          ads: competitor.ads.slice(0, 20),
        }),
        periodStart: sevenDaysAgo,
        periodEnd: new Date(),
        competitorId,
        companyId: competitor.companyId,
      },
    });

    return { success: true, reportId: report.id };
  }

  async scheduleTracking(competitorId, schedule = 'daily') {
    let delay = 24 * 60 * 60 * 1000;

    if (schedule === 'hourly') delay = 60 * 60 * 1000;
    else if (schedule === 'twice-daily') delay = 12 * 60 * 60 * 1000;

    await this.queue.add(
      { type: 'TRACK_COMPETITOR', competitorId },
      {
        repeat: { delay },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    return { success: true, scheduledFor: schedule };
  }

  async scheduleWeeklyReports() {
    const competitors = await prisma.competitor.findMany({
      where: { isActive: true },
    });

    for (const comp of competitors) {
      await this.queue.add(
        { type: 'GENERATE_WEEKLY_REPORT', competitorId: comp.id },
        {
          repeat: { cron: '0 9 * * 1' },
          removeOnComplete: true,
        }
      );
    }

    return { success: true, scheduled: competitors.length };
  }

  async close() {
    await this.queue.close();
    this.isRunning = false;
    console.log('[CompetitorMonitor] Worker closed');
  }
}

module.exports = CompetitorMonitorWorker;
