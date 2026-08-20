const { getSharedPrismaClient } = require('../services/sharedDatabase');
const {
  buildAiDraftPrompt,
  resolveAiKey,
  callChatCompletion,
} = require('../services/radiologyAiDraftService');

const VALID_FOCUS = ['full', 'findings', 'impression'];

const generateDraft = async (req, res) => {
  const startedAt = Date.now();
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

    const { id } = req.params;
    const { focus, additionalContext } = req.body || {};
    if (focus !== undefined && focus !== null && !VALID_FOCUS.includes(focus)) {
      return res.status(400).json({ success: false, error: '┘å╪╖╪º┘é ╪º┘ä╪º┘é╪¬╪▒╪º╪¡ ╪║┘è╪▒ ╪╡╪¡┘è╪¡' });
    }

    const prisma = getSharedPrismaClient();
    const [study, imageCount] = await Promise.all([
      prisma.radiologyStudy.findFirst({
        where: { id, companyId },
        include: { report: true, examType: true },
      }),
      prisma.radiologyStudyImage.count({ where: { studyId: id } }),
    ]);
    if (!study) return res.status(404).json({ success: false, error: '╪º┘ä╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });

    const key = await resolveAiKey(prisma, companyId);
    if (!key) {
      return res.json({
        success: true,
        data: { draft: null, reason: 'AI_NOT_CONFIGURED', model: null, provider: null, latencyMs: Date.now() - startedAt },
      });
    }

    const prompt = buildAiDraftPrompt({
      examName: study.examType?.name || study.examTypeName || '',
      modality: study.modality || '',
      patientAge: study.patientAge || '',
      patientGender: study.patientGender || '',
      patientFlags: study.patientFlags,
      imagesCount: imageCount,
      existingReportText: study.report?.reportText || '',
      focus,
      additionalContext: typeof additionalContext === 'string' ? additionalContext : '',
    });

    let text;
    try {
      text = await callChatCompletion({
        baseUrl: key.baseUrl,
        apiKey: key.apiKey,
        model: key.model,
        system: prompt.system,
        user: prompt.user,
      });
    } catch (error) {
      console.error('╪«╪╖╪ú ┘ü┘è ╪º╪│╪¬╪»╪╣╪º╪í ┘à╪▓┘ê╪» ╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è ┘ä╪¬┘ê┘ä┘è╪» ┘à╪│┘ê╪»╪⌐ ╪º┘ä╪¬┘é╪▒┘è╪▒:', error);
      return res.json({
        success: true,
        data: { draft: null, reason: 'AI_ERROR', model: key.model, provider: key.provider, latencyMs: Date.now() - startedAt },
      });
    }

    return res.json({
      success: true,
      data: { draft: text, model: key.model, provider: key.provider, latencyMs: Date.now() - startedAt },
    });
  } catch (error) {
    console.error('╪«╪╖╪ú ╪ú╪½┘å╪º╪í ╪¬┘ê┘ä┘è╪» ┘à╪│┘ê╪»╪⌐ ╪¬┘é╪▒┘è╪▒ ╪º┘ä╪ú╪┤╪╣╪⌐ ╪¿╪º┘ä╪░┘â╪º╪í ╪º┘ä╪º╪╡╪╖┘å╪º╪╣┘è:', error);
    return res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ╪ú╪½┘å╪º╪í ╪¬┘ê┘ä┘è╪» ┘à╪│┘ê╪»╪⌐ ╪º┘ä╪¬┘é╪▒┘è╪▒' });
  }
};

module.exports = { generateDraft };
