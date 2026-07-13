/**
 * 📋 Application Form Controller
 * وحدة تحكم استبيانات التوظيف
 */

const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const { v4: uuidv4 } = require('uuid');

const getApplicantSourceNote = (formTitle) =>
  `تم إنشاء هذا المتقدم من استبيان التقديم: ${formTitle}`;

const extractResumeUrlFromAnswers = (answers = []) => {
  const fileAnswer = answers.find(
    (answer) => typeof answer.answerFile === 'string' && answer.answerFile.trim(),
  );
  return fileAnswer?.answerFile || null;
};

const buildApplicantPayloadFromResponse = ({
  companyId,
  form,
  responseRecord,
  answers = [],
}) => ({
  id: uuidv4(),
  companyId,
  jobId: form.jobId,
  formResponseId: responseRecord.id,
  name: responseRecord.respondentName,
  email: responseRecord.respondentEmail,
  phone: responseRecord.respondentPhone || null,
  resumeUrl: extractResumeUrlFromAnswers(answers),
  notes: getApplicantSourceNote(form.title),
  status: 'NEW',
});

const getResponseDetailsInclude = () => ({
  answers: {
    include: {
      question: { select: { questionText: true, questionType: true } }
    }
  },
  form: {
    select: {
      title: true,
      jobId: true,
      job: { select: { title: true } }
    }
  },
  applicant: {
    select: {
      id: true,
      status: true,
      createdAt: true
    }
  }
});

const getResponseDetailsForCompany = async (companyId, responseId) => (
  getSharedPrismaClient().recruitmentFormResponse.findFirst({
    where: {
      id: responseId,
      form: { is: { companyId } }
    },
    include: getResponseDetailsInclude()
  })
);

const ensureApplicantFromFormResponse = async (prisma, {
  companyId,
  form,
  responseRecord,
  answers = [],
}) => {
  if (!form?.jobId) {
    return null;
  }

  const existingApplicant = await prisma.applicant.findFirst({
    where: {
      companyId,
      formResponseId: responseRecord.id
    }
  });

  if (existingApplicant) {
    return existingApplicant;
  }

  return prisma.applicant.create({
    data: buildApplicantPayloadFromResponse({
      companyId,
      form,
      responseRecord,
      answers,
    }),
  });
};

const deleteApplicantsLinkedToResponses = async (prisma, companyId, responseIds = []) => {
  const ids = Array.isArray(responseIds)
    ? responseIds.filter(Boolean)
    : [responseIds].filter(Boolean);

  if (ids.length === 0) {
    return { count: 0 };
  }

  return prisma.applicant.deleteMany({
    where: {
      companyId,
      formResponseId: { in: ids }
    }
  });
};

// ═══════════════════════════════════════════════════════════════
// 🌐 Public Routes
// ═══════════════════════════════════════════════════════════════

exports.getPublicForm = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 [PublicForm] Searching for form with ID/Slug: ${id}`);

    const form = await getSharedPrismaClient().recruitmentForm.findFirst({
      where: { 
        OR: [
          { id },
          { slug: id }
        ]
      },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } }
      }
    });

    if (!form) {
      console.log(`❌ [PublicForm] Form not found: ${id}`);
      return res.status(404).json({ success: false, message: 'الاستبيان غير موجود' });
    }

    if (!form.isActive) {
      console.log(`⚠️ [PublicForm] Form is found but inactive: ${form.title} (${form.id})`);
      return res.status(403).json({ success: false, message: 'هذا الاستبيان غير نشط حالياً' });
    }

    console.log(`✅ [PublicForm] Form found and active: ${form.title}`);

    // Format questions options
    if (form.questions) {
      form.questions = form.questions.map(q => ({
        ...q,
        options: q.options ? q.options.split(',').map(o => o.trim()) : []
      }));
    }

    res.json({ success: true, data: form });
  } catch (error) {
    console.error('❌ Error fetching public form:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.submitResponse = async (req, res) => {
  try {
    const { id } = req.params; // formId
    const { respondentName, respondentEmail, respondentPhone, answers } = req.body;

    if (!respondentName) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال الاسم بالكامل' });
    }

    // Resolve slug or id to actual ID
    const form = await getSharedPrismaClient().recruitmentForm.findFirst({
      where: {
        OR: [{ id }, { slug: id }]
      },
      select: {
        id: true,
        companyId: true,
        title: true,
        jobId: true,
      },
    });

    if (!form) {
      return res.status(404).json({ success: false, message: 'الاستبيان غير موجود' });
    }

    const actualFormId = form.id;

    const result = await getSharedPrismaClient().$transaction(async (prisma) => {
      // 1. Create response record
      const response = await prisma.recruitmentFormResponse.create({
        data: {
          id: uuidv4(),
          formId: actualFormId,
          respondentName,
          respondentEmail,
          respondentPhone,
          isContacted: false,
          contactedAt: null,
          submittedAt: new Date()
        }
      });

      // 2. Create answers
      if (answers && Array.isArray(answers)) {
        await Promise.all(answers.map(ans => 
          prisma.recruitmentFormAnswer.create({
            data: {
              id: uuidv4(),
              responseId: response.id,
              questionId: ans.questionId,
              answerText: ans.answerText,
              answerFile: ans.answerFile || null
            }
          })
        ));
      }

      await ensureApplicantFromFormResponse(prisma, {
        companyId: form.companyId,
        form,
        responseRecord: response,
        answers,
      });

      return response;
    });

    res.status(201).json({ success: true, message: 'تم إرسال ردك بنجاح. شكراً لك!', data: result });
  } catch (error) {
    console.error('❌ Error submitting form response:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// 🔒 Protected Routes - إدارة الاستبيانات
// ═══════════════════════════════════════════════════════════════

exports.getForms = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      companyId,
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    };

    const [forms, total] = await Promise.all([
      getSharedPrismaClient().recruitmentForm.findMany({
        where,
        include: {
          job: { select: { title: true } },
          _count: { select: { questions: true, responses: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      getSharedPrismaClient().recruitmentForm.count({ where })
    ]);

    const formattedForms = forms.map(form => ({
      ...form,
      jobTitle: form.job?.title,
      questionsCount: form._count.questions,
      responsesCount: form._count.responses
    }));

    res.json({
      success: true,
      data: formattedForms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error fetching forms:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getFormById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const form = await getSharedPrismaClient().recruitmentForm.findFirst({
      where: { id, companyId },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        job: { select: { title: true } }
      }
    });

    if (!form) {
      return res.status(404).json({ success: false, message: 'الاستبيان غير موجود' });
    }

    // Format questions options
    if (form.questions) {
      form.questions = form.questions.map(q => ({
        ...q,
        options: q.options ? q.options.split(',').map(o => o.trim()) : []
      }));
    }

    res.json({ success: true, data: form });
  } catch (error) {
    console.error('❌ Error fetching form by ID:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createForm = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { title, slug, description, jobId, isActive, questions } = req.body;

    const result = await getSharedPrismaClient().$transaction(async (prisma) => {
      const form = await prisma.recruitmentForm.create({
        data: {
          id: uuidv4(),
          companyId,
          title,
          slug: slug || null,
          description,
          jobId: jobId || null,
          isActive: isActive !== undefined ? isActive : true
        }
      });

      if (questions && Array.isArray(questions)) {
        await Promise.all(questions.map((q, index) => 
          prisma.recruitmentFormQuestion.create({
            data: {
              id: uuidv4(),
              formId: form.id,
              questionText: q.questionText,
              questionType: q.questionType,
              options: q.options ? (Array.isArray(q.options) ? q.options.join(',') : q.options) : null,
              isRequired: q.isRequired || false,
              orderIndex: q.orderIndex !== undefined ? q.orderIndex : index
            }
          })
        ));
      }

      return form;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error creating recruitment form:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateForm = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const { title, slug, description, jobId, isActive, questions } = req.body;

    const result = await getSharedPrismaClient().$transaction(async (prisma) => {
      // Check ownership
      const existing = await prisma.recruitmentForm.findFirst({
        where: { id, companyId }
      });

      if (!existing) {
        throw new Error('الاستبيان غير موجود');
      }

      const form = await prisma.recruitmentForm.update({
        where: { id },
        data: {
          title,
          slug: slug || null,
          description,
          jobId: jobId || null,
          isActive: isActive !== undefined ? isActive : true
        }
      });

      if (questions && Array.isArray(questions)) {
        // Simple approach: delete existing questions and recreate
        // In a real app, you might want to update existing ones to preserve response links
        await prisma.recruitmentFormQuestion.deleteMany({ where: { formId: id } });
        
        await Promise.all(questions.map((q, index) => 
          prisma.recruitmentFormQuestion.create({
            data: {
              id: uuidv4(),
              formId: form.id,
              questionText: q.questionText,
              questionType: q.questionType,
              options: q.options ? (Array.isArray(q.options) ? q.options.join(',') : q.options) : null,
              isRequired: q.isRequired || false,
              orderIndex: q.orderIndex !== undefined ? q.orderIndex : index
            }
          })
        ));
      }

      return form;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error updating recruitment form:', error);
    res.status(error.message === 'الاستبيان غير موجود' ? 404 : 500).json({ success: false, error: error.message });
  }
};

exports.deleteForm = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const existing = await getSharedPrismaClient().recruitmentForm.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'الاستبيان غير موجود' });
    }

    await getSharedPrismaClient().$transaction(async (prisma) => {
      const linkedResponses = await prisma.recruitmentFormResponse.findMany({
        where: { formId: id },
        select: { id: true }
      });

      await deleteApplicantsLinkedToResponses(
        prisma,
        companyId,
        linkedResponses.map((response) => response.id)
      );

      await prisma.recruitmentForm.delete({ where: { id } });
    });

    res.json({ success: true, message: 'تم حذف الاستبيان بنجاح' });
  } catch (error) {
    console.error('❌ Error deleting recruitment form:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// إدارة الأسئلة
// ═══════════════════════════════════════════════════════════════

exports.addQuestion = async (req, res) => {
  try {
    const { id } = req.params; // formId
    const { questionText, questionType, options, isRequired, orderIndex } = req.body;

    const question = await getSharedPrismaClient().recruitmentFormQuestion.create({
      data: {
        id: uuidv4(),
        formId: id,
        questionText,
        questionType,
        options: options ? (Array.isArray(options) ? options.join(',') : options) : null,
        isRequired: isRequired || false,
        orderIndex: orderIndex || 0
      }
    });

    // Format for response
    const formatted = {
      ...question,
      options: question.options ? question.options.split(',').map(o => o.trim()) : []
    };

    res.status(201).json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { questionText, questionType, options, isRequired, orderIndex } = req.body;

    const question = await getSharedPrismaClient().recruitmentFormQuestion.update({
      where: { id: questionId },
      data: {
        questionText,
        questionType,
        options: options ? (Array.isArray(options) ? options.join(',') : options) : null,
        isRequired,
        orderIndex
      }
    });

    // Format for response
    const formatted = {
      ...question,
      options: question.options ? question.options.split(',').map(o => o.trim()) : []
    };

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    await getSharedPrismaClient().recruitmentFormQuestion.delete({
      where: { id: questionId }
    });
    res.json({ success: true, message: 'تم حذف السؤال بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// إدارة الردود
// ═══════════════════════════════════════════════════════════════

exports.getFormResponses = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params; // formId

    const form = await getSharedPrismaClient().recruitmentForm.findFirst({
      where: { id, companyId },
      select: { id: true }
    });

    if (!form) {
      return res.status(404).json({ success: false, message: 'الاستبيان غير موجود' });
    }

    const responses = await getSharedPrismaClient().recruitmentFormResponse.findMany({
      where: {
        formId: id,
        form: { is: { companyId } }
      },
      orderBy: { submittedAt: 'desc' },
      include: {
        answers: {
          include: {
            question: { select: { questionText: true, questionType: true } }
          }
        },
        applicant: {
          select: {
            id: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    res.json({ success: true, data: responses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getResponseById = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { responseId } = req.params;
    const response = await getResponseDetailsForCompany(companyId, responseId);

    if (!response) {
      return res.status(404).json({ success: false, message: 'الرد غير موجود' });
    }

    res.json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.convertResponseToApplicant = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { responseId } = req.params;

    const responseRecord = await getSharedPrismaClient().recruitmentFormResponse.findFirst({
      where: {
        id: responseId,
        form: { is: { companyId } }
      },
      include: {
        answers: {
          select: {
            answerFile: true
          }
        },
        form: {
          select: {
            id: true,
            title: true,
            jobId: true
          }
        },
        applicant: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    if (!responseRecord) {
      return res.status(404).json({ success: false, message: 'الرد غير موجود' });
    }

    if (!responseRecord.form?.jobId) {
      return res.status(400).json({
        success: false,
        message: 'اربط الاستبيان بوظيفة أولاً حتى يدخل الرد في مسار التوظيف'
      });
    }

    if (!responseRecord.applicant) {
      await getSharedPrismaClient().$transaction(async (prisma) => {
        await ensureApplicantFromFormResponse(prisma, {
          companyId,
          form: responseRecord.form,
          responseRecord,
          answers: responseRecord.answers,
        });
      });
    }

    const updatedResponse = await getResponseDetailsForCompany(companyId, responseId);

    res.json({
      success: true,
      data: updatedResponse,
      message: responseRecord.applicant
        ? 'الرد موجود بالفعل داخل مسار التوظيف'
        : 'تمت إضافة الرد إلى مسار التوظيف',
    });
  } catch (error) {
    console.error('❌ Error converting response to applicant:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateResponseContactStatus = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { responseId } = req.params;
    const { isContacted } = req.body;

    if (typeof isContacted !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'يرجى إرسال حالة التواصل بشكل صحيح'
      });
    }

    const existingResponse = await getSharedPrismaClient().recruitmentFormResponse.findFirst({
      where: {
        id: responseId,
        form: { is: { companyId } }
      },
      select: {
        id: true,
        isContacted: true,
        contactedAt: true
      }
    });

    if (!existingResponse) {
      return res.status(404).json({ success: false, message: 'الرد غير موجود' });
    }

    const updatedResponse = await getSharedPrismaClient().recruitmentFormResponse.update({
      where: { id: responseId },
      data: {
        isContacted,
        contactedAt: isContacted
          ? existingResponse.contactedAt || new Date()
          : null
      }
    });

    res.json({ success: true, data: updatedResponse });
  } catch (error) {
    console.error('❌ Error updating response contact status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteResponse = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { responseId } = req.params;

    const existingResponse = await getSharedPrismaClient().recruitmentFormResponse.findFirst({
      where: {
        id: responseId,
        form: { is: { companyId } }
      },
      select: { id: true }
    });

    if (!existingResponse) {
      return res.status(404).json({ success: false, message: 'الرد غير موجود' });
    }

    await getSharedPrismaClient().$transaction(async (prisma) => {
      await deleteApplicantsLinkedToResponses(prisma, companyId, [responseId]);

      await prisma.recruitmentFormResponse.delete({
        where: { id: responseId }
      });
    });

    res.json({ success: true, message: 'تم حذف الرد بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
