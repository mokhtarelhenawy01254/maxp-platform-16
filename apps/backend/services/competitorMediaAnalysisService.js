const { getSharedPrismaClient } = require('./sharedDatabase');
const getPrisma = () => getSharedPrismaClient();

class CompetitorMediaAnalysisService {
  // ---- Media Notes ----
  static async listMediaNotes(companyId, competitorId) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;
    const data = await getPrisma().competitorMediaNote.findMany({
      where: { competitorId },
      orderBy: { createdAt: 'desc' },
    });
    return { data };
  }

  static async createMediaNote(companyId, competitorId, note) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;
    return getPrisma().competitorMediaNote.create({
      data: { competitorId, note },
    });
  }

  static async deleteMediaNote(companyId, competitorId, noteId) {
    const note = await getPrisma().competitorMediaNote.findFirst({
      where: { id: noteId, competitor: { companyId, id: competitorId } },
    });
    if (!note) return false;
    await getPrisma().competitorMediaNote.delete({ where: { id: noteId } });
    return true;
  }

  // ---- Comparisons ----
  static async listComparisons(companyId, competitorId) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;
    const data = await getPrisma().competitorComparison.findMany({
      where: { competitorId },
      orderBy: { sortOrder: 'asc' },
    });
    return { data };
  }

  static async createComparison(companyId, competitorId, body) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;
    const max = await getPrisma().competitorComparison.aggregate({
      where: { competitorId },
      _max: { sortOrder: true },
    });
    return getPrisma().competitorComparison.create({
      data: {
        competitorId,
        featureName: body.featureName,
        competitorDescription: body.competitorDescription || null,
        ourDescription: body.ourDescription || null,
        easiestToUse: body.easiestToUse || null,
        stronger: body.stronger || null,
        notes: body.notes || null,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
  }

  static async updateComparison(companyId, competitorId, comparisonId, body) {
    const comparison = await getPrisma().competitorComparison.findFirst({
      where: { id: comparisonId, competitor: { companyId, id: competitorId } },
    });
    if (!comparison) return null;
    return getPrisma().competitorComparison.update({
      where: { id: comparisonId },
      data: {
        featureName: body.featureName,
        competitorDescription: body.competitorDescription,
        ourDescription: body.ourDescription,
        easiestToUse: body.easiestToUse,
        stronger: body.stronger,
        notes: body.notes,
      },
    });
  }

  static async deleteComparison(companyId, competitorId, comparisonId) {
    const comparison = await getPrisma().competitorComparison.findFirst({
      where: { id: comparisonId, competitor: { companyId, id: competitorId } },
    });
    if (!comparison) return false;
    await getPrisma().competitorComparison.delete({ where: { id: comparisonId } });
    return true;
  }

  static async reorderComparisons(companyId, competitorId, orderedIds) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;
    await Promise.all(
      orderedIds.map((id, index) =>
        getPrisma().competitorComparison.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );
    return getPrisma().competitorComparison.findMany({
      where: { competitorId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ---- Dev Ideas ----
  static async listDevIdeas(companyId, competitorId) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;
    const data = await getPrisma().competitorDevIdea.findMany({
      where: { competitorId },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
    return { data };
  }

  static async createDevIdea(companyId, competitorId, body) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;
    const max = await getPrisma().competitorDevIdea.aggregate({
      where: { competitorId },
      _max: { sortOrder: true },
    });
    return getPrisma().competitorDevIdea.create({
      data: {
        competitorId,
        title: body.title,
        description: body.description || null,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  static async updateDevIdea(companyId, competitorId, ideaId, body) {
    const idea = await getPrisma().competitorDevIdea.findFirst({
      where: { id: ideaId, competitor: { companyId, id: competitorId } },
    });
    if (!idea) return null;
    return getPrisma().competitorDevIdea.update({
      where: { id: ideaId },
      data: {
        title: body.title,
        description: body.description,
      },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  static async deleteDevIdea(companyId, competitorId, ideaId) {
    const idea = await getPrisma().competitorDevIdea.findFirst({
      where: { id: ideaId, competitor: { companyId, id: competitorId } },
    });
    if (!idea) return false;
    await getPrisma().competitorDevIdea.delete({ where: { id: ideaId } });
    return true;
  }

  static async reorderDevIdeas(companyId, competitorId, orderedIds) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;
    await Promise.all(
      orderedIds.map((id, index) =>
        getPrisma().competitorDevIdea.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );
    return getPrisma().competitorDevIdea.findMany({
      where: { competitorId },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ---- Dev Idea Images ----
  static async addDevIdeaImage(companyId, competitorId, ideaId, imageUrl) {
    const idea = await getPrisma().competitorDevIdea.findFirst({
      where: { id: ideaId, competitor: { companyId, id: competitorId } },
    });
    if (!idea) return null;
    const max = await getPrisma().competitorDevIdeaImage.aggregate({
      where: { ideaId },
      _max: { sortOrder: true },
    });
    return getPrisma().competitorDevIdeaImage.create({
      data: {
        ideaId,
        imageUrl,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
  }

  static async deleteDevIdeaImage(companyId, competitorId, ideaId, imageId) {
    const image = await getPrisma().competitorDevIdeaImage.findFirst({
      where: {
        id: imageId,
        idea: { id: ideaId, competitor: { companyId, id: competitorId } },
      },
    });
    if (!image) return false;
    await getPrisma().competitorDevIdeaImage.delete({ where: { id: imageId } });
    return true;
  }

  // ---- Activity Images ----
  static async listActivityImages(companyId, competitorId) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;
    const data = await getPrisma().competitorActivityImage.findMany({
      where: { competitorId },
      orderBy: { sortOrder: 'asc' },
    });
    return { data };
  }

  static async addActivityImage(companyId, competitorId, imageUrl) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;
    const max = await getPrisma().competitorActivityImage.aggregate({
      where: { competitorId },
      _max: { sortOrder: true },
    });
    return getPrisma().competitorActivityImage.create({
      data: {
        competitorId,
        imageUrl,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
  }

  static async deleteActivityImage(companyId, competitorId, imageId) {
    const image = await getPrisma().competitorActivityImage.findFirst({
      where: { id: imageId, competitor: { companyId, id: competitorId } },
    });
    if (!image) return false;
    await getPrisma().competitorActivityImage.delete({ where: { id: imageId } });
    return true;
  }

  static async reorderActivityImages(companyId, competitorId, orderedIds) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;
    await Promise.all(
      orderedIds.map((id, index) =>
        getPrisma().competitorActivityImage.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );
    return getPrisma().competitorActivityImage.findMany({
      where: { competitorId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ---- Feature Images ----
  static async listFeatureImages(companyId, competitorId) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;
    const data = await getPrisma().competitorFeatureImage.findMany({
      where: { competitorId },
      orderBy: { sortOrder: 'asc' },
    });
    return { data };
  }

  static async addFeatureImage(companyId, competitorId, imageUrl) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;
    const max = await getPrisma().competitorFeatureImage.aggregate({
      where: { competitorId },
      _max: { sortOrder: true },
    });
    return getPrisma().competitorFeatureImage.create({
      data: {
        competitorId,
        imageUrl,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
  }

  static async deleteFeatureImage(companyId, competitorId, imageId) {
    const image = await getPrisma().competitorFeatureImage.findFirst({
      where: { id: imageId, competitor: { companyId, id: competitorId } },
    });
    if (!image) return false;
    await getPrisma().competitorFeatureImage.delete({ where: { id: imageId } });
    return true;
  }

  static async reorderFeatureImages(companyId, competitorId, orderedIds) {
    const competitor = await getPrisma().competitor.findFirst({ where: { id: competitorId, companyId } });
    if (!competitor) return null;
    await Promise.all(
      orderedIds.map((id, index) =>
        getPrisma().competitorFeatureImage.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );
    return getPrisma().competitorFeatureImage.findMany({
      where: { competitorId },
      orderBy: { sortOrder: 'asc' },
    });
  }
}

module.exports = CompetitorMediaAnalysisService;
