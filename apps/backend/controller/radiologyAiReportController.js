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
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { focus, additionalContext } = req.body || {};
    if (focus !== undefined && focus !== null && !VALID_FOCUS.includes(focus)) {
      return res.status(400).json({ success: false, error: 'نطاق الاقتراح غير صحيح' });
    }

    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({
      where: { id, companyId },
      include: { report: true, examType: true },
    });
    if (!study) return res.status(404).json({ success: false, error: 'الدراسة غير موجودة' });

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
      imagesCount: Array.isArray(study.images) ? study.images.length : null,
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
      console.error('خطأ في استدعاء مزود الذكاء الاصطناعي لتوليد مسودة التقرير:', error);
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
    console.error('خطأ أثناء توليد مسودة تقرير الأشعة بالذكاء الاصطناعي:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ أثناء توليد مسودة التقرير' });
  }
};

module.exports = { generateDraft };
