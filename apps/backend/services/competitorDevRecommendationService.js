const { getSharedPrismaClient } = require('./sharedDatabase');
const getPrisma = () => getSharedPrismaClient();

class CompetitorDevRecommendationService {
  static async getByCompetitorId(companyId, competitorId) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;

    let recommendation = await getPrisma().competitorDevRecommendation.findFirst({
      where: { competitorId },
      include: {
        tasks: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!recommendation) {
      recommendation = await getPrisma().competitorDevRecommendation.create({
        data: { competitorId, notes: '' },
      });
      recommendation = await getPrisma().competitorDevRecommendation.findFirst({
        where: { id: recommendation.id },
        include: { tasks: { orderBy: { createdAt: 'desc' } } },
      });
    }

    return recommendation;
  }

  static async upsertNotes(companyId, competitorId, notes) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;

    let recommendation = await getPrisma().competitorDevRecommendation.findFirst({
      where: { competitorId },
    });

    if (recommendation) {
      recommendation = await getPrisma().competitorDevRecommendation.update({
        where: { id: recommendation.id },
        data: { notes },
      });
    } else {
      recommendation = await getPrisma().competitorDevRecommendation.create({
        data: { competitorId, notes },
      });
    }

    return getPrisma().competitorDevRecommendation.findFirst({
      where: { id: recommendation.id },
      include: { tasks: { orderBy: { createdAt: 'desc' } } },
    });
  }

  static async addTask(companyId, competitorId, data) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;

    let recommendation = await getPrisma().competitorDevRecommendation.findFirst({
      where: { competitorId },
    });

    if (!recommendation) {
      recommendation = await getPrisma().competitorDevRecommendation.create({
        data: { competitorId, notes: '' },
      });
    }

    const task = await getPrisma().competitorDevTask.create({
      data: {
        recommendationId: recommendation.id,
        title: data.title,
        description: data.description || null,
        status: data.status || 'not_started',
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
      },
    });

    return task;
  }

  static async updateTask(companyId, competitorId, taskId, data) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;

    const task = await getPrisma().competitorDevTask.findFirst({
      where: {
        id: taskId,
        recommendation: { competitorId },
      },
    });
    if (!task) return null;

    const updated = await getPrisma().competitorDevTask.update({
      where: { id: taskId },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      },
    });

    return updated;
  }

  static async deleteTask(companyId, competitorId, taskId) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return false;

    const task = await getPrisma().competitorDevTask.findFirst({
      where: {
        id: taskId,
        recommendation: { competitorId },
      },
    });
    if (!task) return false;

    await getPrisma().competitorDevTask.delete({ where: { id: taskId } });
    return true;
  }
}

module.exports = CompetitorDevRecommendationService;
