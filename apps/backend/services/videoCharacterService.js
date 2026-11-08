/**
 * Character library for the AI Video Studio.
 * Characters hold stable reference images (generated via AI Influencer/Soul sheets
 * or uploaded by the merchant) that get injected into every scene featuring them —
 * the foundation of character consistency across generations.
 */
const videoStudioService = require('./videoStudioService');
const { getSharedPrismaClient } = require('./sharedDatabase');

const SHEET_MODEL = 'ai-influencer';

class VideoCharacterService {
  async listCharacters(companyId) {
    const prisma = getSharedPrismaClient();
    return prisma.videoCharacter.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCharacter(companyId, characterId) {
    const prisma = getSharedPrismaClient();
    const character = await prisma.videoCharacter.findUnique({ where: { id: characterId } });
    if (!character || character.companyId !== companyId) return null;
    return character;
  }

  /**
   * Create a character. Either with uploaded referenceImages (UPLOADED) or with a
   * description that will be used to generate a character sheet (GENERATED).
   */
  async createCharacter(companyId, { name, description, gender, ageRange, style, referenceImages }) {
    const prisma = getSharedPrismaClient();
    if (!name || !String(name).trim()) throw new Error('اسم الشخصية مطلوب');
    const hasUploads = Array.isArray(referenceImages) && referenceImages.filter(Boolean).length >= 1;

    return prisma.videoCharacter.create({
      data: {
        companyId,
        name: String(name).trim(),
        description: description || null,
        gender: gender || null,
        ageRange: ageRange || null,
        style: style || null,
        sourceType: hasUploads ? 'UPLOADED' : 'GENERATED',
        referenceImages: hasUploads ? referenceImages.filter(Boolean).slice(0, 4) : [],
      },
    });
  }

  async updateCharacter(companyId, characterId, patch) {
    const prisma = getSharedPrismaClient();
    const existing = await this.getCharacter(companyId, characterId);
    if (!existing) return null;
    const allowed = {};
    if (patch.name !== undefined) allowed.name = String(patch.name).trim();
    if (patch.description !== undefined) allowed.description = patch.description;
    if (patch.gender !== undefined) allowed.gender = patch.gender;
    if (patch.ageRange !== undefined) allowed.ageRange = patch.ageRange;
    if (patch.style !== undefined) allowed.style = patch.style;
    if (Array.isArray(patch.referenceImages)) {
      allowed.referenceImages = patch.referenceImages.filter(Boolean).slice(0, 4);
    }
    return prisma.videoCharacter.update({ where: { id: characterId }, data: allowed });
  }

  async deleteCharacter(companyId, characterId) {
    const prisma = getSharedPrismaClient();
    const existing = await this.getCharacter(companyId, characterId);
    if (!existing) return { deleted: false };
    await prisma.videoCharacter.delete({ where: { id: characterId } });
    return { deleted: true };
  }

  /**
   * Kick off a character-sheet generation job (AI Influencer). The worker attaches
   * the outputs back to the character when the job completes (onSheetJobCompleted).
   */
  async generateSheet(companyId, userId, characterId) {
    const character = await this.getCharacter(companyId, characterId);
    if (!character) throw new Error('الشخصية غير موجودة');

    const promptParts = [
      'Character reference sheet of a single person, multiple consistent views (front, side, 3/4), neutral studio lighting, same face, same outfit across all views.',
    ];
    if (character.gender) promptParts.push(`${character.gender} character`);
    if (character.ageRange) promptParts.push(`age ${character.ageRange}`);
    if (character.style) promptParts.push(`style: ${character.style}`);
    if (character.description) promptParts.push(character.description);
    if (character.name) promptParts.push(`character name hint: ${character.name}`);

    const job = await videoStudioService.createJob({
      companyId,
      userId,
      type: 'CHARACTER_SHEET',
      model: SHEET_MODEL,
      params: {
        prompt: promptParts.join(' '),
        aspectRatio: '3:4',
        characterId: character.id,
        quantity: 1,
      },
    });
    await getSharedPrismaClient().videoCharacter.update({
      where: { id: character.id },
      data: { sheetJobId: job.id },
    });
    return job;
  }

  /**
   * Called by the worker when a CHARACTER_SHEET job completes: attach the sheet
   * output as the character's stable reference images.
   */
  async onSheetJobCompleted(job) {
    const prisma = getSharedPrismaClient();
    const params = job.params || {};
    const characterId = params.characterId;
    if (!characterId) return;
    const character = await prisma.videoCharacter.findUnique({ where: { id: characterId } });
    if (!character) return;

    const sheetUrls = Array.isArray(job.providerMeta?.outputAssets)
      ? job.providerMeta.outputAssets.filter(Boolean)
      : job.outputUrl
        ? [job.outputUrl]
        : [];

    await prisma.videoCharacter.update({
      where: { id: characterId },
      data: {
        referenceImages: sheetUrls.slice(0, 4),
        thumbnailUrl: sheetUrls[0] || character.thumbnailUrl,
      },
    });
    console.log(`🧑 [VIDEO-CHARACTER] Sheet attached to character ${characterId} (${sheetUrls.length} refs)`);
  }

  /**
   * Resolve characters (by ids) into a flat list of reference image URLs for injection into scene params.
   */
  async collectReferenceImages(companyId, characterIds) {
    if (!Array.isArray(characterIds) || characterIds.length === 0) return [];
    const prisma = getSharedPrismaClient();
    const characters = await prisma.videoCharacter.findMany({
      where: { companyId, id: { in: characterIds.slice(0, 3) } },
      select: { referenceImages: true },
    });
    const refs = [];
    for (const c of characters) {
      const images = Array.isArray(c.referenceImages) ? c.referenceImages : [];
      for (const img of images) {
        if (img && refs.length < 4) refs.push(img);
      }
    }
    return refs;
  }
}

module.exports = new VideoCharacterService();
