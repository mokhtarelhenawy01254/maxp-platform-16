const { getSharedPrismaClient } = require('../sharedDatabase');
const prisma = getSharedPrismaClient();

/**
 * 🎯 Application Form Service
 * خدمة إدارة استبيانات التوظيف
 */
class ApplicationFormService {
    /**
     * جلب جميع الاستبيانات
     */
    async getForms(companyId, filters = {}) {
        const { jobId, isActive } = filters;
        const where = { companyId };

        if (jobId) {
            where.jobId = jobId;
        }
        if (isActive !== undefined) {
            where.isActive = isActive === 'true' || isActive === true;
        }

        const forms = await prisma.applicationForm.findMany({
            where,
            include: {
                job: {
                    select: { id: true, title: true }
                },
                _count: {
                    select: { questions: true, responses: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return forms.map(form => ({
            ...form,
            jobTitle: form.job?.title,
            questionsCount: form._count.questions,
            responsesCount: form._count.responses
        }));
    }

    /**
     * جلب استبيان واحد مع الأسئلة
     */
    async getFormById(companyId, formId) {
        const form = await prisma.applicationForm.findFirst({
            where: { id: formId, companyId },
            include: {
                job: {
                    select: { id: true, title: true }
                },
                questions: {
                    orderBy: { orderIndex: 'asc' }
                }
            }
        });

        if (!form) {
            throw new Error('الاستبيان غير موجود');
        }

        return {
            ...form,
            jobTitle: form.job?.title,
            questions: form.questions.map(q => ({
                ...q,
                options: q.options ? JSON.parse(q.options) : []
            }))
        };
    }

    /**
     * جلب استبيان للعرض العام (للمتقدمين)
     */
    async getPublicForm(formId) {
        const form = await prisma.applicationForm.findFirst({
            where: { id: formId, isActive: true },
            include: {
                job: {
                    select: { id: true, title: true, department: true, location: true }
                },
                questions: {
                    orderBy: { orderIndex: 'asc' }
                }
            }
        });

        if (!form) {
            throw new Error('الاستبيان غير موجود أو غير نشط');
        }

        return {
            ...form,
            jobTitle: form.job?.title,
            questions: form.questions.map(q => ({
                ...q,
                options: q.options ? JSON.parse(q.options) : []
            }))
        };
    }

    /**
     * إنشاء استبيان جديد
     */
    async createForm(companyId, data) {
        const { title, description, jobId, isActive, questions } = data;

        const form = await prisma.applicationForm.create({
            data: {
                companyId,
                title,
                description,
                jobId: jobId || null,
                isActive: isActive !== false
            }
        });

        // إضافة الأسئلة إذا وجدت
        if (questions && questions.length > 0) {
            await prisma.applicationFormQuestion.createMany({
                data: questions.map((q, index) => ({
                    formId: form.id,
                    questionText: q.questionText,
                    questionType: q.questionType || 'TEXT',
                    options: q.options ? JSON.stringify(q.options) : null,
                    isRequired: q.isRequired || false,
                    orderIndex: index
                }))
            });
        }

        return this.getFormById(companyId, form.id);
    }

    /**
     * تحديث استبيان
     */
    async updateForm(companyId, formId, data) {
        const { title, description, jobId, isActive, questions } = data;

        // التحقق من وجود الاستبيان
        const existingForm = await prisma.applicationForm.findFirst({
            where: { id: formId, companyId }
        });

        if (!existingForm) {
            throw new Error('الاستبيان غير موجود');
        }

        // تحديث الاستبيان
        await prisma.applicationForm.update({
            where: { id: formId },
            data: {
                title,
                description,
                jobId: jobId || null,
                isActive
            }
        });

        // تحديث الأسئلة إذا وجدت
        if (questions !== undefined) {
            // حذف الأسئلة القديمة
            await prisma.applicationFormQuestion.deleteMany({
                where: { formId }
            });

            // إضافة الأسئلة الجديدة
            if (questions.length > 0) {
                await prisma.applicationFormQuestion.createMany({
                    data: questions.map((q, index) => ({
                        formId,
                        questionText: q.questionText,
                        questionType: q.questionType || 'TEXT',
                        options: q.options ? JSON.stringify(q.options) : null,
                        isRequired: q.isRequired || false,
                        orderIndex: index
                    }))
                });
            }
        }

        return this.getFormById(companyId, formId);
    }

    /**
     * حذف استبيان
     */
    async deleteForm(companyId, formId) {
        const form = await prisma.applicationForm.findFirst({
            where: { id: formId, companyId }
        });

        if (!form) {
            throw new Error('الاستبيان غير موجود');
        }

        await prisma.applicationForm.delete({
            where: { id: formId }
        });

        return { success: true };
    }

    /**
     * إضافة سؤال للاستبيان
     */
    async addQuestion(companyId, formId, questionData) {
        const form = await prisma.applicationForm.findFirst({
            where: { id: formId, companyId }
        });

        if (!form) {
            throw new Error('الاستبيان غير موجود');
        }

        // الحصول على أعلى ترتيب
        const lastQuestion = await prisma.applicationFormQuestion.findFirst({
            where: { formId },
            orderBy: { orderIndex: 'desc' }
        });

        const question = await prisma.applicationFormQuestion.create({
            data: {
                formId,
                questionText: questionData.questionText,
                questionType: questionData.questionType || 'TEXT',
                options: questionData.options ? JSON.stringify(questionData.options) : null,
                isRequired: questionData.isRequired || false,
                orderIndex: lastQuestion ? lastQuestion.orderIndex + 1 : 0
            }
        });

        return {
            ...question,
            options: question.options ? JSON.parse(question.options) : []
        };
    }

    /**
     * تحديث سؤال
     */
    async updateQuestion(companyId, formId, questionId, questionData) {
        const form = await prisma.applicationForm.findFirst({
            where: { id: formId, companyId }
        });

        if (!form) {
            throw new Error('الاستبيان غير موجود');
        }

        const question = await prisma.applicationFormQuestion.update({
            where: { id: questionId },
            data: {
                questionText: questionData.questionText,
                questionType: questionData.questionType,
                options: questionData.options ? JSON.stringify(questionData.options) : null,
                isRequired: questionData.isRequired,
                orderIndex: questionData.orderIndex
            }
        });

        return {
            ...question,
            options: question.options ? JSON.parse(question.options) : []
        };
    }

    /**
     * حذف سؤال
     */
    async deleteQuestion(companyId, formId, questionId) {
        const form = await prisma.applicationForm.findFirst({
            where: { id: formId, companyId }
        });

        if (!form) {
            throw new Error('الاستبيان غير موجود');
        }

        await prisma.applicationFormQuestion.delete({
            where: { id: questionId }
        });

        return { success: true };
    }

    /**
     * إرسال رد على الاستبيان (من المتقدم)
     */
    async submitResponse(formId, responseData) {
        const { respondentName, respondentEmail, respondentPhone, answers } = responseData;

        // التحقق من وجود الاستبيان ونشاطه
        const form = await prisma.applicationForm.findFirst({
            where: { id: formId, isActive: true },
            include: {
                questions: true
            }
        });

        if (!form) {
            throw new Error('الاستبيان غير موجود أو غير نشط');
        }

        // التحقق من الأسئلة المطلوبة
        const requiredQuestions = form.questions.filter(q => q.isRequired);
        for (const rq of requiredQuestions) {
            const answer = answers.find(a => a.questionId === rq.id);
            if (!answer || !answer.answerText) {
                throw new Error(`السؤال "${rq.questionText}" مطلوب`);
            }
        }

        // إنشاء الرد
        const response = await prisma.applicationFormResponse.create({
            data: {
                formId,
                respondentName,
                respondentEmail,
                respondentPhone
            }
        });

        // إضافة الإجابات
        if (answers && answers.length > 0) {
            await prisma.applicationFormAnswer.createMany({
                data: answers.map(a => ({
                    responseId: response.id,
                    questionId: a.questionId,
                    answerText: a.answerText,
                    answerFile: a.answerFile
                }))
            });
        }

        return response;
    }

    /**
     * جلب ردود الاستبيان
     */
    async getFormResponses(companyId, formId) {
        const form = await prisma.applicationForm.findFirst({
            where: { id: formId, companyId }
        });

        if (!form) {
            throw new Error('الاستبيان غير موجود');
        }

        const responses = await prisma.applicationFormResponse.findMany({
            where: { formId },
            include: {
                answers: {
                    include: {
                        question: {
                            select: { questionText: true, questionType: true }
                        }
                    }
                },
                applicant: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { submittedAt: 'desc' }
        });

        return responses;
    }

    /**
     * جلب رد واحد بالتفصيل
     */
    async getResponseById(companyId, responseId) {
        const response = await prisma.applicationFormResponse.findFirst({
            where: { id: responseId },
            include: {
                form: {
                    select: { id: true, title: true, companyId: true }
                },
                answers: {
                    include: {
                        question: {
                            select: { questionText: true, questionType: true, options: true }
                        }
                    }
                },
                applicant: {
                    select: { id: true, name: true, email: true, phone: true }
                }
            }
        });

        if (!response || response.form.companyId !== companyId) {
            throw new Error('الرد غير موجود');
        }

        return {
            ...response,
            answers: response.answers.map(a => ({
                ...a,
                question: {
                    ...a.question,
                    options: a.question.options ? JSON.parse(a.question.options) : []
                }
            }))
        };
    }

    /**
     * حذف رد
     */
    async deleteResponse(companyId, responseId) {
        const response = await prisma.applicationFormResponse.findFirst({
            where: { id: responseId },
            include: {
                form: {
                    select: { companyId: true }
                }
            }
        });

        if (!response || response.form.companyId !== companyId) {
            throw new Error('الرد غير موجود');
        }

        await prisma.applicationFormResponse.delete({
            where: { id: responseId }
        });

        return { success: true };
    }
}

module.exports = new ApplicationFormService();
