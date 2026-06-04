/**
 * 🎯 Recruitment Controller
 * وحدة تحكم التوظيف - إدارة الوظائف والمتقدمين والمقابلات
 */

const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════
// 📋 الوظائف - Job Postings
// ═══════════════════════════════════════════════════════════════

exports.getJobPostings = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { status, department, search, page = 1, limit = 20 } = req.query;

    const where = { companyId };
    if (status) where.status = status;
    if (department) where.department = department;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { department: { contains: search } },
        { location: { contains: search } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [jobs, total] = await executeWithRetry(() =>
      Promise.all([
        getSharedPrismaClient().jobPosting.findMany({
          where,
          include: { _count: { select: { applicants: true } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        getSharedPrismaClient().jobPosting.count({ where })
      ])
    );

    res.json({
      success: true,
      data: jobs,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('❌ Error fetching job postings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createJobPosting = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { title, department, location, type, experienceLevel, salaryMin, salaryMax, description, requirements, responsibilities, status, closingDate } = req.body;

    const job = await executeWithRetry(() =>
      getSharedPrismaClient().jobPosting.create({
        data: {
          id: uuidv4(),
          companyId,
          title,
          department,
          location,
          type: type || 'FULL_TIME',
          experienceLevel: experienceLevel || 'MID',
          salaryMin: salaryMin || null,
          salaryMax: salaryMax || null,
          description,
          requirements: Array.isArray(requirements) ? requirements.join('\n') : (requirements || null),
          responsibilities: Array.isArray(responsibilities) ? responsibilities.join('\n') : (responsibilities || null),
          status: status || 'ACTIVE',
          closingDate: (closingDate && closingDate.trim() !== '') ? new Date(closingDate) : null
        }
      })
    );

    res.status(201).json({ success: true, data: job });
  } catch (error) {
    console.error('❌ Error creating job posting:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateJobPostingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const companyId = req.user.companyId;

    const job = await executeWithRetry(() =>
      getSharedPrismaClient().jobPosting.update({
        where: { id },
        data: { status }
      })
    );

    res.json({ success: true, data: job });
  } catch (error) {
    console.error('❌ Error updating job posting status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteJobPosting = async (req, res) => {
  try {
    const { id } = req.params;

    await executeWithRetry(() =>
      getSharedPrismaClient().jobPosting.delete({ where: { id } })
    );

    res.json({ success: true, message: 'تم حذف الوظيفة بنجاح' });
  } catch (error) {
    console.error('❌ Error deleting job posting:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// 👤 المتقدمين - Applicants
// ═══════════════════════════════════════════════════════════════

exports.getApplicants = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { jobId, status, search, page = 1, limit = 20 } = req.query;
    const fetchAll = String(limit).toLowerCase() === 'all';
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(
      Math.max(parseInt(limit, 10) || 20, 1),
      1000
    );

    const where = { companyId };
    if (jobId) where.jobId = jobId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    const findManyArgs = {
      where,
      include: {
        job: { select: { title: true, department: true } },
        _count: { select: { interviews: true } }
      },
      orderBy: { createdAt: 'desc' }
    };

    if (!fetchAll) {
      findManyArgs.skip = (parsedPage - 1) * parsedLimit;
      findManyArgs.take = parsedLimit;
    }

    const [applicants, total] = await executeWithRetry(() =>
      Promise.all([
        getSharedPrismaClient().applicant.findMany(findManyArgs),
        getSharedPrismaClient().applicant.count({ where })
      ])
    );

    res.json({
      success: true,
      data: applicants,
      pagination: {
        page: fetchAll ? 1 : parsedPage,
        limit: fetchAll ? total : parsedLimit,
        total,
        totalPages: fetchAll ? (total > 0 ? 1 : 0) : Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching applicants:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createApplicant = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { jobId, name, email, phone, resumeUrl, coverLetter, experience, education, skills, notes } = req.body;

    const applicant = await executeWithRetry(() =>
      getSharedPrismaClient().applicant.create({
        data: {
          id: uuidv4(),
          companyId,
          jobId,
          name,
          email,
          phone,
          resumeUrl: resumeUrl || null,
          coverLetter: coverLetter || null,
          experience: experience ? parseInt(experience) : null,
          education: education || null,
          skills: skills || null,
          notes: notes || null
        },
        include: { job: { select: { title: true } } }
      })
    );

    res.status(201).json({ success: true, data: applicant });
  } catch (error) {
    console.error('❌ Error creating applicant:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateApplicantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const data = { status };
    if (notes) data.notes = notes;

    const applicant = await executeWithRetry(() =>
      getSharedPrismaClient().applicant.update({
        where: { id },
        data,
        include: { job: { select: { title: true } } }
      })
    );

    res.json({ success: true, data: applicant });
  } catch (error) {
    console.error('❌ Error updating applicant status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteApplicant = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const result = await executeWithRetry(() =>
      getSharedPrismaClient().applicant.deleteMany({
        where: { id, companyId }
      })
    );

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'المتقدم غير موجود أو لا يخص هذه الشركة'
      });
    }

    return res.json({ success: true, message: 'تم حذف المتقدم بنجاح' });
  } catch (error) {
    console.error('❌ Error deleting applicant:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// 📅 المقابلات - Interviews
// ═══════════════════════════════════════════════════════════════

exports.getInterviews = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { applicantId, status, page = 1, limit = 20 } = req.query;

    const where = { companyId };
    if (applicantId) where.applicantId = applicantId;
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [interviews, total] = await executeWithRetry(() =>
      Promise.all([
        getSharedPrismaClient().interview.findMany({
          where,
          include: {
            applicant: { select: { name: true, email: true, phone: true } }
          },
          orderBy: { date: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        getSharedPrismaClient().interview.count({ where })
      ])
    );

    res.json({
      success: true,
      data: interviews,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('❌ Error fetching interviews:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.scheduleInterview = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { applicantId, jobId, date, time, type, location, interviewers, notes } = req.body;

    const interview = await executeWithRetry(() =>
      getSharedPrismaClient().interview.create({
        data: {
          id: uuidv4(),
          companyId,
          applicantId,
          jobId,
          date: new Date(date),
          time,
          type: type || 'IN_PERSON',
          location: location || null,
          interviewers: interviewers ? JSON.stringify(interviewers) : null,
          notes: notes || null
        },
        include: {
          applicant: { select: { name: true, email: true } }
        }
      })
    );

    // Update applicant status
    await executeWithRetry(() =>
      getSharedPrismaClient().applicant.update({
        where: { id: applicantId },
        data: { status: 'INTERVIEW_SCHEDULED' }
      })
    );

    res.status(201).json({ success: true, data: interview });
  } catch (error) {
    console.error('❌ Error scheduling interview:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateInterviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const data = { status };
    if (notes) data.notes = notes;

    const interview = await executeWithRetry(() =>
      getSharedPrismaClient().interview.update({
        where: { id },
        data,
        include: {
          applicant: { select: { name: true, email: true } }
        }
      })
    );

    // Update applicant status if interview completed
    if (status === 'COMPLETED') {
      await executeWithRetry(() =>
        getSharedPrismaClient().applicant.update({
          where: { id: interview.applicantId },
          data: { status: 'INTERVIEWED' }
        })
      );
    }

    res.json({ success: true, data: interview });
  } catch (error) {
    console.error('❌ Error updating interview status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// 📊 الإحصائيات - Stats
// ═══════════════════════════════════════════════════════════════

exports.getStats = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const [totalJobs, activeJobs, totalApplicants, totalInterviews, newApplicants, hiredApplicants] = await executeWithRetry(() =>
      Promise.all([
        getSharedPrismaClient().jobPosting.count({ where: { companyId } }),
        getSharedPrismaClient().jobPosting.count({ where: { companyId, status: 'ACTIVE' } }),
        getSharedPrismaClient().applicant.count({ where: { companyId } }),
        getSharedPrismaClient().interview.count({ where: { companyId } }),
        getSharedPrismaClient().applicant.count({ where: { companyId, status: 'NEW' } }),
        getSharedPrismaClient().applicant.count({ where: { companyId, status: 'HIRED' } })
      ])
    );

    res.json({
      success: true,
      data: {
        totalJobs,
        activeJobs,
        totalApplicants,
        totalInterviews,
        newApplicants,
        hiredApplicants
      }
    });
  } catch (error) {
    console.error('❌ Error fetching recruitment stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPipelineStats = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const statuses = ['NEW', 'REVIEWING', 'INTERVIEW_SCHEDULED', 'INTERVIEWED', 'OFFERED', 'HIRED', 'REJECTED'];

    const counts = await executeWithRetry(() =>
      Promise.all(
        statuses.map(status =>
          getSharedPrismaClient().applicant.count({ where: { companyId, status } })
        )
      )
    );

    const names = {
      'NEW': 'جديد',
      'REVIEWING': 'قيد المراجعة',
      'INTERVIEW_SCHEDULED': 'مقابلة مجدولة',
      'INTERVIEWED': 'تمت المقابلة',
      'OFFERED': 'تم العرض',
      'HIRED': 'تم التوظيف',
      'REJECTED': 'مرفوض'
    };

    const colors = {
      'NEW': 'blue',
      'REVIEWING': 'amber',
      'INTERVIEW_SCHEDULED': 'purple',
      'INTERVIEWED': 'indigo',
      'OFFERED': 'green',
      'HIRED': 'emerald',
      'REJECTED': 'red'
    };

    const pipeline = statuses.map((status, i) => ({
      id: status,
      name: names[status] || status,
      count: counts[i],
      color: colors[status] || 'blue'
    }));

    res.json({ success: true, data: pipeline });
  } catch (error) {
    console.error('❌ Error fetching pipeline stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
