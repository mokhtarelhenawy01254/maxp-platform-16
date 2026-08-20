/**
 * ≡ƒÅå Loyalty Tier Presets (┘é┘ê╪º┘ä╪¿ ┘à╪│╪¬┘ê┘è╪º╪¬ ╪¼╪º┘ç╪▓╪⌐)
 * ╪¡╪▓┘à ╪¼╪º┘ç╪▓╪⌐ ┘ä┘à╪│╪¬┘ê┘è╪º╪¬ ╪º┘ä┘ê┘ä╪º╪í ╪¬╪«╪¬╪º╪▒┘ç╪º ╪º┘ä╪┤╪▒┘â╪⌐ ┘ê╪¬┘Å╪╣╪»┘æ┘ä ╪¿╪╣╪»┘ç╪º ╪¿╪▒╪º╪¡╪¬┘ç╪º:
 *  - classic5: ╪¿╪▒┘ê┘å╪▓/┘ü╪╢╪⌐/╪░┘ç╪¿/╪¿┘ä╪º╪¬┘è┘å/╪»╪º┘è┘à┘ê┘å╪»
 *  - stars10:  10 ┘à╪│╪¬┘ê┘è╪º╪¬ ╪¿╪ú╪│┘ä┘ê╪¿ ╪º┘ä╪ú┘ä╪╣╪º╪¿ (┘å╪¼┘ê┘à)
 *  - vip3:     ┘à╪│╪¬┘ê┘è╪º╪¬ VIP ┘ü╪º╪«╪▒╪⌐
 *
 * ┘â┘ä ┘à╪│╪¬┘ê┘ë: ╪º┘ä╪º╪│┘à (╪╣╪▒╪¿┘è/╪Ñ┘å╪¼┘ä┘è╪▓┘è) + ╪º┘ä┘ä┘ê┘å + ╪º┘ä╪ú┘è┘é┘ê┘å╪⌐ + ╪º┘ä╪¡╪»┘ê╪» (┘å┘é╪º╪╖) + ╪º┘ä┘à╪▓╪º┘è╪º.
 * ╪¬┘Å┘å╪┤╪ú ╪╣╪¿╪▒ createTier ╪º┘ä┘à┘ê╪¼┘ê╪» (╪¿╪¬╪¡┘é┘æ┘é ┘à┘å ╪¬╪»╪º╪«┘ä ╪º┘ä╪¡╪»┘ê╪» ╪¬┘ä┘é╪º╪ª┘è╪º┘ï).
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

const TIER_PRESETS = {
  classic5: {
    key: 'classic5',
    name: '┘â┘ä╪º╪│┘è┘â (5 ┘à╪│╪¬┘ê┘è╪º╪¬)',
    nameAr: '┘â┘ä╪º╪│┘è┘â ΓÇö 5 ┘à╪│╪¬┘ê┘è╪º╪¬',
    description: '╪¿╪▒┘ê┘å╪▓╪î ┘ü╪╢╪⌐╪î ╪░┘ç╪¿╪î ╪¿┘ä╪º╪¬┘è┘å╪î ╪»╪º┘è┘à┘ê┘å╪» ΓÇö ╪º┘ä╪ú╪│┘à╪º╪í ╪º┘ä╪ú╪┤┘ç╪▒ ╪╣╪º┘ä┘à┘è╪º┘ï',
    calculationType: 'POINTS',
    tiers: [
      { name: 'Bronze', nameAr: '╪¿╪▒┘ê┘å╪▓', color: '#CD7F32', icon: 'medal', minPoints: 0, maxPoints: 999, benefits: ['╪º╪┤╪¬╪▒╪º┘â ┘ü┘è ╪¿╪▒┘å╪º┘à╪¼ ╪º┘ä┘ê┘ä╪º╪í', '┘â╪│╪¿ ┘å┘é╪º╪╖ ╪╣┘ä┘ë ┘â┘ä ╪╖┘ä╪¿'] },
      { name: 'Silver', nameAr: '┘ü╪╢╪⌐', color: '#C0C0C0', icon: 'medal', minPoints: 1000, maxPoints: 4999, benefits: ['┘â╪│╪¿ ┘å┘é╪º╪╖ ╪ú╪│╪▒╪╣', '╪«╪╡┘à 5%'] },
      { name: 'Gold', nameAr: '╪░┘ç╪¿', color: '#D4AF37', icon: 'crown', minPoints: 5000, maxPoints: 14999, benefits: ['╪┤╪¡┘å ┘à╪¼╪º┘å┘è', '╪«╪╡┘à 10%', '╪ú┘ê┘ä┘ê┘è╪⌐ ┘ü┘è ╪º┘ä╪«╪»┘à╪⌐'] },
      { name: 'Platinum', nameAr: '╪¿┘ä╪º╪¬┘è┘å', color: '#E5E4E2', icon: 'trophy', minPoints: 15000, maxPoints: 39999, benefits: ['╪┤╪¡┘å ┘à╪¼╪º┘å┘è', '╪«╪╡┘à 15%', '┘ç╪»╪º┘è╪º ┘ü┘è ╪º┘ä┘à┘å╪º╪│╪¿╪º╪¬', '╪ú┘ê┘ä┘ê┘è╪⌐ ┘é╪╡┘ê┘ë'] },
      { name: 'Diamond', nameAr: '╪»╪º┘è┘à┘ê┘å╪»', color: '#B9F2FF', icon: 'gem', minPoints: 40000, benefits: ['╪┤╪¡┘å ┘à╪¼╪º┘å┘è', '╪«╪╡┘à 20%', '┘à╪»┘è╪▒ ╪¡╪│╪º╪¿ ╪«╪º╪╡', '╪╣╪▒┘ê╪╢ ╪¡╪╡╪▒┘è╪⌐', '┘ç╪»╪º┘è╪º ┘ü╪º╪«╪▒╪⌐'] }
    ]
  },
  stars10: {
    key: 'stars10',
    name: '┘å╪¼┘ê┘à (10 ┘à╪│╪¬┘ê┘è╪º╪¬)',
    nameAr: '┘å╪¼┘ê┘à ΓÇö 10 ┘à╪│╪¬┘ê┘è╪º╪¬',
    description: '10 ┘à╪│╪¬┘ê┘è╪º╪¬ ┘à╪¬╪»╪▒╪¼╪⌐ ╪¿╪ú╪│┘ä┘ê╪¿ ╪º┘ä╪ú┘ä╪╣╪º╪¿ ΓÇö ╪¬╪¡┘ü┘è╪▓ ┘ä┘ä┘ê╪╡┘ê┘ä ┘ä┘ä┘à╪│╪¬┘ê┘ë ╪º┘ä╪ú╪╣┘ä┘ë',
    calculationType: 'POINTS',
    tiers: [
      { name: 'Star 1', nameAr: '┘å╪¼┘à╪⌐ 1', color: '#64748B', icon: 'award', minPoints: 0, maxPoints: 499, benefits: ['╪¿╪»╪º┘è╪⌐ ╪º┘ä╪▒╪¡┘ä╪⌐'] },
      { name: 'Star 2', nameAr: '┘å╪¼┘à╪⌐ 2', color: '#718096', icon: 'award', minPoints: 500, maxPoints: 999, benefits: ['┘â╪│╪¿ ┘å┘é╪º╪╖ ┘à╪╢╪º╪╣┘ü'] },
      { name: 'Star 3', nameAr: '┘å╪¼┘à╪⌐ 3', color: '#5B6B8C', icon: 'award', minPoints: 1000, maxPoints: 1999, benefits: ['╪«╪╡┘à 3%'] },
      { name: 'Star 4', nameAr: '┘å╪¼┘à╪⌐ 4', color: '#4A5C8A', icon: 'award', minPoints: 2000, maxPoints: 3499, benefits: ['╪«╪╡┘à 5%'] },
      { name: 'Star 5', nameAr: '┘å╪¼┘à╪⌐ 5', color: '#3D5BAE', icon: 'award', minPoints: 3500, maxPoints: 4999, benefits: ['╪«╪╡┘à 7%'] },
      { name: 'Star 6', nameAr: '┘å╪¼┘à╪⌐ 6', color: '#3550C4', icon: 'award', minPoints: 5000, maxPoints: 7499, benefits: ['╪┤╪¡┘å ┘à╪¼╪º┘å┘è', '╪«╪╡┘à 10%'] },
      { name: 'Star 7', nameAr: '┘å╪¼┘à╪⌐ 7', color: '#2E46D6', icon: 'trophy', minPoints: 7500, maxPoints: 9999, benefits: ['╪┤╪¡┘å ┘à╪¼╪º┘å┘è', '╪«╪╡┘à 12%'] },
      { name: 'Star 8', nameAr: '┘å╪¼┘à╪⌐ 8', color: '#2840E0', icon: 'trophy', minPoints: 10000, maxPoints: 14999, benefits: ['╪┤╪¡┘å ┘à╪¼╪º┘å┘è', '╪«╪╡┘à 15%', '╪ú┘ê┘ä┘ê┘è╪⌐'] },
      { name: 'Star 9', nameAr: '┘å╪¼┘à╪⌐ 9', color: '#273DEB', icon: 'gem', minPoints: 15000, maxPoints: 24999, benefits: ['╪┤╪¡┘å ┘à╪¼╪º┘å┘è', '╪«╪╡┘à 18%', '╪ú┘ê┘ä┘ê┘è╪⌐'] },
      { name: 'Star 10', nameAr: '┘å╪¼┘à╪⌐ 10', color: '#1F35F2', icon: 'gem', minPoints: 25000, benefits: ['╪┤╪¡┘å ┘à╪¼╪º┘å┘è', '╪«╪╡┘à 25%', '╪ú┘ê┘ä┘ê┘è╪⌐ ┘é╪╡┘ê┘ë', '┘à╪»┘è╪▒ ╪¡╪│╪º╪¿ ╪«╪º╪╡'] }
    ]
  },
  vip3: {
    key: 'vip3',
    name: 'VIP (3 ┘à╪│╪¬┘ê┘è╪º╪¬)',
    nameAr: 'VIP ΓÇö 3 ┘à╪│╪¬┘ê┘è╪º╪¬',
    description: 'VIP╪î VIP Gold╪î VIP Platinum ΓÇö ┘à┘à┘è╪▓╪º╪¬ ┘ü╪º╪«╪▒╪⌐',
    calculationType: 'POINTS',
    tiers: [
      { name: 'VIP', nameAr: 'VIP', color: '#B8860B', icon: 'crown', minPoints: 0, maxPoints: 4999, benefits: ['╪«╪╡┘à 5%', '┘â╪│╪¿ ┘å┘é╪º╪╖ ┘à╪╢╪º╪╣┘ü'] },
      { name: 'VIP Gold', nameAr: 'VIP ╪░┘ç╪¿┘è', color: '#D4AF37', icon: 'crown', minPoints: 5000, maxPoints: 19999, benefits: ['╪┤╪¡┘å ┘à╪¼╪º┘å┘è', '╪«╪╡┘à 12%', '╪ú┘ê┘ä┘ê┘è╪⌐'] },
      { name: 'VIP Platinum', nameAr: 'VIP ╪¿┘ä╪º╪¬┘è┘å┘è', color: '#E5E4E2', icon: 'gem', minPoints: 20000, benefits: ['╪┤╪¡┘å ┘à╪¼╪º┘å┘è', '╪«╪╡┘à 20%', '╪ú┘ê┘ä┘ê┘è╪⌐ ┘é╪╡┘ê┘ë', '┘à╪»┘è╪▒ ╪¡╪│╪º╪¿ ╪«╪º╪╡', '╪╣╪▒┘ê╪╢ ╪¡╪╡╪▒┘è╪⌐'] }
    ]
  }
};

/**
 * ╪¬╪╖╪¿┘è┘é ┘é╪º┘ä╪¿ ╪¼╪º┘ç╪▓ ╪╣┘ä┘ë ╪¿╪▒┘å╪º┘à╪¼ ┘ê┘ä╪º╪í ΓÇö ┘è┘å╪┤╪ª ┘â┘ä ╪º┘ä┘à╪│╪¬┘ê┘è╪º╪¬ ╪»┘ü╪╣╪⌐ ┘ê╪º╪¡╪»╪⌐.
 * @returns {Promise<{created, preset, programName}>}
 */
async function applyTierPreset(companyId, programId, presetKey) {
  const prisma = getSharedPrismaClient();
  const preset = TIER_PRESETS[presetKey];
  if (!preset) {
    const err = new Error('┘é╪º┘ä╪¿ ┘à╪│╪¬┘ê┘è╪º╪¬ ╪║┘è╪▒ ┘à╪╣╪▒┘ê┘ü');
    err.statusCode = 400;
    throw err;
  }

  const program = await prisma.customerLoyaltyProgram.findFirst({
    where: { id: programId, companyId },
    select: { id: true, name: true, nameAr: true }
  });
  if (!program) {
    const err = new Error('╪¿╪▒┘å╪º┘à╪¼ ╪º┘ä┘ê┘ä╪º╪í ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
    err.statusCode = 404;
    throw err;
  }

  const customerLoyaltyService = require('../hr/customerLoyaltyService');

  let created = 0;
  const errors = [];
  for (const tier of preset.tiers) {
    try {
      await customerLoyaltyService.createTier(companyId, {
        programId,
        name: tier.name,
        nameAr: tier.nameAr,
        calculationType: preset.calculationType,
        minPoints: tier.minPoints,
        maxPoints: tier.maxPoints,
        color: tier.color,
        icon: tier.icon,
        benefits: tier.benefits || [],
        priority: created + 1
      });
      created++;
    } catch (e) {
      errors.push(`${tier.nameAr || tier.name}: ${e.message}`);
    }
  }

  return {
    created,
    errors,
    preset: { key: preset.key, name: preset.nameAr, description: preset.description },
    programName: program.nameAr || program.name
  };
}

module.exports = { TIER_PRESETS, applyTierPreset };
