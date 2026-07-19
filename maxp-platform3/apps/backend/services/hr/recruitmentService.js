const { getSharedPrismaClient } = require('../sharedDatabase');

/**
 * 🎯 Recruitment Service
 * خدمة إدارة التوظيف والوظائف والمتقدمين
 */
class RecruitmentService {
    get prisma() {
        return getSharedPrismaClient();
    }

    /**
     * جلب جميع الوظائف مع إمكانية الفلترة
     */
    async getJobPostings(companyId, filters = {}) {
        const { status, searchTerm } = filters;
        const where = { companyId };

        if (status && status !== 'all') {
            where.status = status;
        }

        if (searchTerm) {
            where.OR = [
                { title: { contains: searchTerm } },
                { department: { contains: searchTerm } }
            ];
        }

        const jobs = await this.prisma.jobPosting.findMany({
            where,
            include: {
                _count: {
                    select: { applicants: true }
                }
            },
            orderBy: { postedDate: 'desc' }
        });

        // تحويل البيانات لتناسب الواجهة الأمامية (خاصة المصفوفات التي تخزن كنصوص)
        return jobs.map(job => ({
            ...job,
            applicantsCount: job._count.applicants,
            requirements: job.requirements ? job.requirements.split('\n').filter(r => r.trim()) : [],
            responsibilities: job.responsibilities ? job.responsibilities.split('\n').filter(r => r.trim()) : []
        }));
    }

    /**
     * إنشاء وظيفة جديدة
     */
    async createJobPosting(companyId, data) {
        try {
            console.log('📝 [RecruitmentService] Creating job posting with data:', JSON.stringify(data, null, 2));
            console.log('📝 [RecruitmentService] Company ID:', companyId);

            // تحويل المصفوفات إلى نصوص قبل الحفظ في قاعدة البيانات
            const requirements = Array.isArray(data.requirements) ? data.requirements.join('\n') : data.requirements;
            const responsibilities = Array.isArray(data.responsibilities) ? data.responsibilities.join('\n') : data.responsibilities;

            // تنظيف البيانات وإزالة الحقول الفارغة
            const jobData = {
                title: data.title,
                department: data.department,
                location: data.location,
                type: data.type,
                experienceLevel: data.experienceLevel,
                description: data.description,
                companyId,
                postedDate: new Date()
            };

            // إضافة الحقول الاختيارية فقط إذا كانت موجودة
            if (requirements) jobData.requirements = requirements;
            if (responsibilities) jobData.responsibilities = responsibilities;
            if (data.salaryMin !== undefined && data.salaryMin !== null && data.salaryMin !== '') {
                jobData.salaryMin = parseFloat(data.salaryMin);
            }
            if (data.salaryMax !== undefined && data.salaryMax !== null && data.salaryMax !== '') {
                jobData.salaryMax = parseFloat(data.salaryMax);
            }
            if (data.closingDate) {
                jobData.closingDate = new Date(data.closingDate);
            }
            if (data.status) {
                jobData.status = data.status;
            }

            console.log('📝 [RecruitmentService] Final job data to insert:', JSON.stringify(jobData, null, 2));

            const result = await this.prisma.jobPosting.create({
                data: jobData
            });

            console.log('✅ [RecruitmentService] Job posting created successfully:', result.id);
            return result;
        } catch (error) {
            console.error('❌ [RecruitmentService] Error creating job posting:', error);
            console.error('❌ [RecruitmentService] Error details:', {
                message: error.message,
                code: error.code,
                meta: error.meta
            });
            throw error;
        }
    }

    /**
     * تحديث حالة الوظيفة
     */
    async updateJobPostingStatus(companyId, jobId, status) {
        return await this.prisma.jobPosting.update({
            where: { id: jobId, companyId },
            data: { status }
        });
    }

    /**
     * حذف وظيفة
     */
    async deleteJobPosting(companyId, jobId) {
        return await this.prisma.jobPosting.delete({
            where: { id: jobId, companyId }
        });
    }

    /**
     * جلب المتقدمين مع إمكانية الفلترة
     */
    async getApplicants(companyId, filters = {}) {
        const { status, jobId, searchTerm } = filters;
        const where = { companyId };

        if (status && status !== 'all') {
            where.status = status;
        }
        if (jobId) {
            where.jobId = jobId;
        }
        if (searchTerm) {
            where.OR = [
                { name: { contains: searchTerm } },
                { email: { contains: searchTerm } }
            ];
        }

        const applicants = await this.prisma.applicant.findMany({
            where,
            include: {
                job: {
                    select: { title: true }
                }
            },
            orderBy: { appliedDate: 'desc' }
        });

        return applicants.map(app => ({
            ...app,
            jobTitle: app.job?.title,
            skills: app.skills ? app.skills.split(',').map(s => s.trim()).filter(s => s) : []
        }));
    }

    /**
     * إنشاء متقدم جديد
     */
    async createApplicant(companyId, applicantData) {
        const { name, email, phone, jobId, experience, education, skills, coverLetter, resumeUrl } = applicantData;

        return await this.prisma.applicant.create({
            data: {
                companyId,
                name,
                email,
                phone: phone || '',
                jobId,
                experience: experience || 0,
                education: education || '',
                skills: Array.isArray(skills) ? skills.join(', ') : skills || '',
                coverLetter: coverLetter || '',
                resumeUrl: resumeUrl || '',
                status: 'NEW'
            },
            include: {
                job: {
                    select: { title: true }
                }
            }
        });
    }

    /**
     * تحديث حالة المتقدم
     */
    async updateApplicantStatus(companyId, applicantId, status) {
        return await this.prisma.applicant.update({
            where: { id: applicantId, companyId },
            data: { status }
        });
    }

    /**
     * جلب المقابلات
     */
    async getInterviews(companyId) {
        const interviews = await this.prisma.interview.findMany({
            where: { companyId },
            include: {
                applicant: {
                    select: { name: true, job: { select: { title: true } } }
                }
            },
            orderBy: { date: 'asc' }
        });

        return interviews.map(i => ({
            ...i,
            applicantName: i.applicant?.name,
            jobTitle: i.applicant?.job?.title,
            interviewers: i.interviewers ? i.interviewers.split(',').map(s => s.trim()).filter(s => s) : []
        }));
    }

    /**
     * جدولة مقابلة جديدة
     */
    async createInterview(companyId, data) {
        try {
            console.log('📝 [RecruitmentService] Scheduling interview with data:', JSON.stringify(data, null, 2));
            console.log('📝 [RecruitmentService] Company ID:', companyId);

            // تحويل المصفوفة إلى نص
            const interviewers = Array.isArray(data.interviewers)
                ? data.interviewers.join(', ')
                : data.interviewers;

            // تنظيف البيانات
            const interviewData = {
                companyId,
                applicantId: data.applicantId,
                jobId: data.jobId,
                date: new Date(data.date),
                time: data.time,
                type: data.type
            };

            // إضافة الحقول الاختيارية
            if (data.location) interviewData.location = data.location;
            if (interviewers) interviewData.interviewers = interviewers;
            if (data.notes) interviewData.notes = data.notes;
            if (data.status) interviewData.status = data.status;

            console.log('📝 [RecruitmentService] Final interview data:', JSON.stringify(interviewData, null, 2));

            const result = await this.prisma.interview.create({
                data: interviewData,
                include: {
                    applicant: {
                        select: {
                            name: true,
                            email: true,
                            phone: true
                        }
                    }
                }
            });

            console.log('✅ [RecruitmentService] Interview scheduled successfully:', result.id);
            return result;
        } catch (error) {
            console.error('❌ [RecruitmentService] Error scheduling interview:', error);
            console.error('❌ [RecruitmentService] Error details:', {
                message: error.message,
                code: error.code,
                meta: error.meta
            });
            throw error;
        }
    }

    /**
     * تحديث مقابلة
     */
    async updateInterview(companyId, id, data) {
        if (data.interviewers && Array.isArray(data.interviewers)) {
            data.interviewers = data.interviewers.join(', ');
        }

        return await this.prisma.interview.update({
            where: { id, companyId },
            data
        });
    }

    /**
     * تحديث حالة المقابلة
     */
    async updateInterviewStatus(companyId, interviewId, status) {
        return await this.prisma.interview.update({
            where: { id: interviewId, companyId },
            data: { status }
        });
    }

    /**
     * إنشاء بيانات اختبار
     */
    async seedData(companyId) {
        console.log('🌱 Service seeding data for:', companyId);

        // 1. Create Job
        const job = await this.prisma.jobPosting.create({
            data: {
                companyId,
                title: 'Senior React Developer (Test)',
                department: 'Engineering',
                location: 'Cairo, Remote',
                type: 'FULL_TIME',
                experienceLevel: 'SENIOR',
                description: 'Test job for interview scheduling',
                requirements: 'React\nTypeScript',
                responsibilities: 'Build awesome code',
                status: 'ACTIVE',
                salaryMin: 20000,
                salaryMax: 40000,
                postedDate: new Date()
            }
        });

        // 2. Create Applicants
        const app1 = await this.prisma.applicant.create({
            data: {
                companyId,
                jobId: job.id,
                name: 'Ahmed Test Applicant',
                email: `ahmed.${Date.now()}@test.com`,
                phone: '01000000001',
                status: 'NEW',
                experience: 5,
                rating: 4
            }
        });

        return { job, app1 };
    }

    /**
     * جلب إحصائيات التوظيف
     */
    async getStats(companyId) {
        const [activeJobs, totalApplicants, scheduledInterviews, pendingReviews, hiredThisMonth] = await Promise.all([
            this.prisma.jobPosting.count({ where: { companyId, status: 'ACTIVE' } }),
            this.prisma.applicant.count({ where: { companyId } }),
            this.prisma.interview.count({ where: { companyId, status: 'SCHEDULED' } }),
            this.prisma.applicant.count({ where: { companyId, status: 'REVIEWING' } }),
            this.prisma.applicant.count({
                where: {
                    companyId,
                    status: 'HIRED',
                    updatedAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                    }
                }
            })
        ]);

        return {
            activeJobs,
            totalApplicants,
            scheduledInterviews,
            pendingReviews,
            hiredThisMonth,
            averageTimeToHire: 0
        };
    }

    /**
     * جلب إحصائيات مسار التوظيف
     */
    async getPipelineStats(companyId) {
        const stages = [
            { id: 'NEW', name: 'جديد', color: 'blue' },
            { id: 'REVIEWING', name: 'قيد المراجعة', color: 'amber' },
            { id: 'INTERVIEW_SCHEDULED', name: 'مقابلة مجدولة', color: 'purple' },
            { id: 'INTERVIEWED', name: 'تمت المقابلة', color: 'indigo' },
            { id: 'OFFERED', name: 'تم العرض', color: 'green' },
            { id: 'HIRED', name: 'تم التوظيف', color: 'emerald' }
        ];

        const counts = await this.prisma.applicant.groupBy({
            by: ['status'],
            where: { companyId },
            _count: true
        });

        return stages.map(stage => {
            const statusCount = counts.find(c => c.status === stage.id);
            return {
                ...stage,
                count: statusCount ? statusCount._count : 0
            };
        });
    }
}

module.exports = new RecruitmentService();
