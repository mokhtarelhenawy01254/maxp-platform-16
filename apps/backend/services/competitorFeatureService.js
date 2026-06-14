const { getSharedPrismaClient } = require('./sharedDatabase');
const getPrisma = () => getSharedPrismaClient();

class CompetitorFeatureService {
  static async list(companyId, competitorId, { page = 1, limit = 50, status, priority, search } = {}) {
    const where = { competitor: { companyId, id: competitorId } };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) where.title = { contains: search, mode: 'insensitive' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [data, total] = await Promise.all([
      getPrisma().competitorFeature.findMany({
        where,
        orderBy: [{ status: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      getPrisma().competitorFeature.count({ where }),
    ]);

    return {
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    };
  }

  static async create(companyId, competitorId, data) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;

    const feature = await getPrisma().competitorFeature.create({
      data: {
        title: data.title,
        description: data.description || null,
        priority: data.priority || 'medium',
        status: data.status || 'pending',
        competitorId,
      },
    });
    return feature;
  }

  static async update(companyId, competitorId, featureId, data) {
    const feature = await getPrisma().competitorFeature.findFirst({
      where: { id: featureId, competitor: { companyId, id: competitorId } },
    });
    if (!feature) return null;

    const updated = await getPrisma().competitorFeature.update({
      where: { id: featureId },
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
      },
    });
    return updated;
  }

  static async remove(companyId, competitorId, featureId) {
    const feature = await getPrisma().competitorFeature.findFirst({
      where: { id: featureId, competitor: { companyId, id: competitorId } },
    });
    if (!feature) return false;
    await getPrisma().competitorFeature.delete({ where: { id: featureId } });
    return true;
  }
}

module.exports = CompetitorFeatureService;
