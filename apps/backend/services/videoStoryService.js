/**
 * Story mode: a sequence of scenes rendered one after another with the same
 * characters. Scene-to-scene visual continuity comes from two mechanisms:
 *   1. Character reference images injected into every scene job.
 *   2. Keyframe chaining: the last frame of scene N becomes the start frame of
 *      scene N+1 (extracted by the worker via ffmpeg).
 */
const videoStudioService = require('./videoStudioService');
const videoCharacterService = require('./videoCharacterService');
const { getSharedPrismaClient } = require('./sharedDatabase');

const DEFAULT_STORY_MODEL = 'kling-4.0';

class VideoStoryService {
  async listStories(companyId) {
    const prisma = getSharedPrismaClient();
    return prisma.videoStory.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: { scenes: { orderBy: { sceneOrder: 'asc' } } },
    });
  }

  async getStory(companyId, storyId) {
    const prisma = getSharedPrismaClient();
    const story = await prisma.videoStory.findUnique({
      where: { id: storyId },
      include: { scenes: { orderBy: { sceneOrder: 'asc' }, include: {} } },
    });
    if (!story || story.companyId !== companyId) return null;
    // Hydrate scene job outputs for the player
    const jobIds = story.scenes.map((s) => s.videoJobId).filter(Boolean);
    const jobs = jobIds.length
      ? await prisma.videoJob.findMany({
          where: { id: { in: jobIds } },
          select: { id: true, status: true, outputUrl: true, outputPosterUrl: true, errorMessage: true, progress: true },
        })
      : [];
    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    return {
      ...story,
      scenes: story.scenes.map((s) => ({ ...s, job: s.videoJobId ? jobMap.get(s.videoJobId) || null : null })),
    };
  }

  async createStory(companyId, { title, model, aspectRatio, chaining = true }) {
    const prisma = getSharedPrismaClient();
    if (!title || !String(title).trim()) throw new Error('عنوان القصة مطلوب');
    return prisma.videoStory.create({
      data: {
        companyId,
        title: String(title).trim(),
        settings: { chaining: chaining !== false, model: model || DEFAULT_STORY_MODEL, aspectRatio: aspectRatio || '9:16' },
      },
      include: { scenes: true },
    });
  }

  async updateStory(companyId, storyId, patch) {
    const prisma = getSharedPrismaClient();
    const story = await prisma.videoStory.findUnique({ where: { id: storyId } });
    if (!story || story.companyId !== companyId) return null;
    if (story.status === 'RENDERING') throw new Error('لا يمكن تعديل قصة قيد التنفيذ');
    const data = {};
    if (patch.title !== undefined) data.title = String(patch.title).trim();
    if (patch.settings !== undefined) {
      data.settings = { ...(story.settings || {}), ...patch.settings };
    }
    return prisma.videoStory.update({ where: { id: storyId }, data, include: { scenes: { orderBy: { sceneOrder: 'asc' } } } });
  }

  async deleteStory(companyId, storyId) {
    const prisma = getSharedPrismaClient();
    const story = await prisma.videoStory.findUnique({ where: { id: storyId } });
    if (!story || story.companyId !== companyId) return { deleted: false };
    if (story.status === 'RENDERING') throw new Error('لا يمكن حذف قصة قيد التنفيذ');
    await prisma.videoStory.delete({ where: { id: storyId } }); // scenes cascade
    return { deleted: true };
  }

  async addScene(companyId, storyId, { prompt, characterIds = [], durationSeconds = 5, cameraMotion }) {
    const prisma = getSharedPrismaClient();
    const story = await prisma.videoStory.findUnique({ where: { id: storyId }, include: { scenes: true } });
    if (!story || story.companyId !== companyId) throw new Error('القصة غير موجودة');
    if (story.status === 'RENDERING') throw new Error('لا يمكن تعديل قصة قيد التنفيذ');
    if (!prompt || !String(prompt).trim()) throw new Error('برومبت المشهد مطلوب');

    const nextOrder = story.scenes.reduce((max, s) => Math.max(max, s.sceneOrder), 0) + 1;
    return prisma.videoStoryScene.create({
      data: {
        storyId,
        sceneOrder: nextOrder,
        prompt: String(prompt).trim(),
        characterIds: characterIds.slice(0, 3),
        durationSeconds: Math.min(15, Math.max(1, Number(durationSeconds) || 5)),
        cameraMotion: cameraMotion || null,
      },
    });
  }

  async updateScene(companyId, sceneId, patch) {
    const prisma = getSharedPrismaClient();
    const scene = await prisma.videoStoryScene.findUnique({ where: { id: sceneId }, include: { story: true } });
    if (!scene || scene.story.companyId !== companyId) throw new Error('المشهد غير موجود');
    if (scene.story.status === 'RENDERING') throw new Error('لا يمكن تعديل قصة قيد التنفيذ');
    if (scene.status === 'COMPLETED') throw new Error('لا يمكن تعديل مشهد مكتمل — احذفه وأعد إنشاءه');
    const data = {};
    if (patch.prompt !== undefined) data.prompt = String(patch.prompt).trim();
    if (patch.characterIds !== undefined) data.characterIds = patch.characterIds.slice(0, 3);
    if (patch.durationSeconds !== undefined) data.durationSeconds = Math.min(15, Math.max(1, Number(patch.durationSeconds) || 5));
    if (patch.cameraMotion !== undefined) data.cameraMotion = patch.cameraMotion;
    return prisma.videoStoryScene.update({ where: { id: sceneId }, data });
  }

  async deleteScene(companyId, sceneId) {
    const prisma = getSharedPrismaClient();
    const scene = await prisma.videoStoryScene.findUnique({ where: { id: sceneId }, include: { story: true } });
    if (!scene || scene.story.companyId !== companyId) return { deleted: false };
    if (scene.story.status === 'RENDERING') throw new Error('لا يمكن تعديل قصة قيد التنفيذ');
    if (scene.status === 'COMPLETED') throw new Error('حذف المشهد المكتمل غير مسموح داخل قصة — أنشئ قصة جديدة');
    await prisma.videoStoryScene.delete({ where: { id: sceneId } });
    return { deleted: true };
  }

  /**
   * Start (or resume) sequential rendering from the first non-completed scene.
   * Each scene becomes a VideoJob with character refs injected; when chaining is
   * enabled the previous scene's last frame becomes the next scene's start frame.
   */
  async renderStory(companyId, storyId, userId) {
    const prisma = getSharedPrismaClient();
    const story = await this.getStory(companyId, storyId);
    if (!story) throw new Error('القصة غير موجودة');
    const pending = story.scenes.filter((s) => s.status !== 'COMPLETED');
    if (pending.length === 0) throw new Error('كل المشاهد مكتملة بالفعل');
    if (story.status === 'RENDERING') throw new Error('القصة قيد التنفيذ بالفعل');

    await prisma.videoStory.update({ where: { id: storyId }, data: { status: 'RENDERING' } });

    const first = pending[0];
    await this.launchSceneJob({ story, scene: first, userId });
    return this.getStory(companyId, storyId);
  }

  async launchSceneJob({ story, scene, userId }) {
    const prisma = getSharedPrismaClient();
    const settings = story.settings || {};
    const model = settings.model || DEFAULT_STORY_MODEL;
    const characterIds = Array.isArray(scene.characterIds) ? scene.characterIds : [];
    const referenceImages = await videoCharacterService.collectReferenceImages(story.companyId, characterIds);

    const previousScene = scene.sceneOrder > 1
      ? story.scenes.find((s) => s.sceneOrder === scene.sceneOrder - 1)
      : null;
    let startFrameUrl = null;
    if (settings.chaining !== false && previousScene?.videoJobId) {
      const prevJob = await prisma.videoJob.findUnique({
        where: { id: previousScene.videoJobId },
        select: { lastFrameUrl: true, outputUrl: true },
      });
      startFrameUrl = prevJob?.lastFrameUrl || null;
    }

    const job = await videoStudioService.createJob({
      companyId: story.companyId,
      userId,
      type: 'IMAGE_TO_VIDEO',
      model,
      params: {
        prompt: scene.prompt,
        durationSeconds: scene.durationSeconds,
        aspectRatio: settings.aspectRatio || '9:16',
        cameraMotion: scene.cameraMotion || undefined,
        referenceImages,
        startFrameUrl,
        characterIds,
        storyId: story.id,
        storySceneOrder: scene.sceneOrder,
      },
      storySceneId: scene.id,
    });

    await prisma.videoStoryScene.update({
      where: { id: scene.id },
      data: { videoJobId: job.id, status: 'RENDERING', errorMessage: null },
    });
    return job;
  }

  /**
   * Worker hook: a scene job reached a terminal state. Advance or fail the story.
   */
  async onSceneJobFinished(job) {
    const prisma = getSharedPrismaClient();
    if (!job.storySceneId) return;
    const scene = await prisma.videoStoryScene.findUnique({
      where: { id: job.storySceneId },
      include: { story: { include: { scenes: { orderBy: { sceneOrder: 'asc' } } } } },
    });
    if (!scene) return;
    const story = scene.story;

    if (job.status === 'COMPLETED') {
      await prisma.videoStoryScene.update({
        where: { id: scene.id },
        data: { status: 'COMPLETED', errorMessage: null },
      });
      const next = story.scenes.find((s) => s.sceneOrder > scene.sceneOrder && s.status !== 'COMPLETED');
      if (next) {
        try {
          await this.launchSceneJob({ story, scene: next, userId: job.userId });
          console.log(`📖 [VIDEO-STORY] Story ${story.id}: scene ${next.sceneOrder} launched`);
        } catch (e) {
          await prisma.videoStory.update({ where: { id: story.id }, data: { status: 'FAILED' } });
          await prisma.videoStoryScene.update({
            where: { id: next.id },
            data: { status: 'FAILED', errorMessage: e.message },
          });
          console.error(`❌ [VIDEO-STORY] scene ${next.sceneOrder} launch failed: ${e.message}`);
        }
      } else {
        await prisma.videoStory.update({ where: { id: story.id }, data: { status: 'COMPLETED' } });
        console.log(`📖 [VIDEO-STORY] Story ${story.id} COMPLETED`);
      }
      return;
    }

    if (job.status === 'FAILED' || job.status === 'CANCELLED') {
      await prisma.videoStoryScene.update({
        where: { id: scene.id },
        data: { status: 'FAILED', errorMessage: job.errorMessage || `المشهد ${job.status === 'CANCELLED' ? 'أُلغي' : 'فشل'}` },
      });
      await prisma.videoStory.update({ where: { id: story.id }, data: { status: 'FAILED' } });
      console.warn(`⚠️ [VIDEO-STORY] Story ${story.id} FAILED at scene ${scene.sceneOrder}`);
    }
  }
}

module.exports = new VideoStoryService();
