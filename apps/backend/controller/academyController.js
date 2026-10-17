const academyService = require('../services/academyService');
const KashierService = require('../services/kashierService');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../utils/jwtSecret');

function getCompanyId(req) {
  const explicit =
    req.headers['x-company-id'] ||
    req.headers['X-Company-Id'] ||
    req.query.companyId ||
    req.body?.companyId;
  if (explicit) return String(explicit).trim();

  // If instructor or admin is managing courses, use their companyId
  if (req.user && req.user.role !== 'STUDENT' && req.user.companyId) {
    return req.user.companyId;
  }

  // Multi-tenant subdomain resolution from request host (e.g. swan.maxp.online)
  if (req.company?.id) {
    return req.company.id;
  }

  if (req.user?.companyId) {
    return req.user.companyId;
  }

  return null;
}

function resolveAcademyCompanyId(req) {
  return getCompanyId(req) || 'cmopgxu3a07i4jujj6f1oh32h';
}

/**
 * In-memory OTP store for student verification codes.
 * Map<cleanPhone, { code: string, expiresAt: number, attempts: number, lastSentAt: number }>
 */
const studentOtpStore = new Map();

/**
 * 🛡️ Security Law: Only extract student identity from verified JWT token.
 * Raw query parameters (?phone=) and unauthenticated headers (x-student-phone) are NEVER trusted.
 */
function extractVerifiedStudentPhone(req) {
  // 1. From authenticated req.user (populated by authenticateToken / optionalAuth)
  if (req.user?.studentPhone && typeof req.user.studentPhone === 'string') {
    return req.user.studentPhone.trim();
  }
  if (req.user?.role === 'STUDENT' && req.user?.phone && typeof req.user.phone === 'string') {
    return req.user.phone.trim();
  }

  // 2. Direct Bearer token verification if present
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], getJwtSecret());
      if (decoded.role === 'STUDENT' && (decoded.studentPhone || decoded.phone)) {
        return (decoded.studentPhone || decoded.phone).trim();
      }
    } catch (_) {}
  }

  return null;
}


// -------------------------------------------------------------
// Course Management (Admin / Instructor)
// -------------------------------------------------------------

exports.createCourse = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' });

    // Only SUPER_ADMIN can create global (platform-wide) courses
    const isGlobal = req.body.isGlobal && req.user?.role === 'SUPER_ADMIN' ? true : false;

    const course = await academyService.createCourse({
      companyId,
      ...req.body,
      isGlobal,
    });

    res.status(201).json({ success: true, course });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    // Only SUPER_ADMIN can toggle isGlobal flag
    const data = { ...req.body };
    if (data.isGlobal !== undefined && req.user?.role !== 'SUPER_ADMIN') {
      delete data.isGlobal;
    }

    const course = await academyService.updateCourse(id, companyId, data);
    res.json({ success: true, course });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    await academyService.deleteCourse(id, companyId);
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getCourses = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' });

    const courses = await academyService.getCourses(companyId);
    res.json({ success: true, courses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getCourseDetails = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const course = await academyService.getCourseDetails(id, companyId);
    res.json({ success: true, course });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
};

// -------------------------------------------------------------
// Modules & Lessons
// -------------------------------------------------------------

exports.addModule = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { courseId } = req.params;
    const moduleItem = await academyService.addModule({
      companyId,
      courseId,
      ...req.body,
    });
    res.status(201).json({ success: true, module: moduleItem });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateModule = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const moduleItem = await academyService.updateModule(id, companyId, req.body);
    res.json({ success: true, module: moduleItem });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteModule = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    await academyService.deleteModule(id, companyId);
    res.json({ success: true, message: 'Module deleted' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.addLesson = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { moduleId } = req.params;
    const lesson = await academyService.addLesson({
      companyId,
      moduleId,
      ...req.body,
    });
    res.status(201).json({ success: true, lesson });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateLesson = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const lesson = await academyService.updateLesson(id, companyId, req.body);
    res.json({ success: true, lesson });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteLesson = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    await academyService.deleteLesson(id, companyId);
    res.json({ success: true, message: 'Lesson deleted' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.saveLessonQuiz = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // lessonId
    const quiz = await academyService.saveLessonQuiz(id, companyId, req.body);
    res.json({ success: true, quiz });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// -------------------------------------------------------------
// Student & Catalog Endpoints
// -------------------------------------------------------------

exports.getPublishedCatalog = async (req, res) => {
  try {
    const companyId = resolveAcademyCompanyId(req);

    const studentUserId = req.user?.id || null;
    const customerId = req.user?.customerId || null;
    const studentPhone = extractVerifiedStudentPhone(req);

    let customerTags = [];
    if (req.user?.tags && Array.isArray(req.user.tags)) {
      customerTags = req.user.tags;
    } else if (req.query.tags) {
      customerTags = String(req.query.tags)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }

    // 🔒 الكتالوج العام يعرض PUBLIC حصراً — UNLISTED يُطلب صراحةً فقط
    const includeUnlisted = req.query.includeUnlisted === 'true';

    const courses = await academyService.getPublishedCatalog({
      companyId,
      studentUserId,
      customerId,
      studentPhone,
      customerTags,
      includeUnlisted,
    });
    res.json({ success: true, courses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getMyCourses = async (req, res) => {
  try {
    const companyId = resolveAcademyCompanyId(req);
    const studentUserId = req.user?.id || null;
    const customerId = req.user?.customerId || null;
    const studentPhone = extractVerifiedStudentPhone(req);

    if (!studentUserId && !customerId && !studentPhone) {
      return res.json({ success: true, enrollments: [] });
    }

    const enrollments = await academyService.getMyEnrolledCourses({
      companyId,
      studentUserId,
      customerId,
      studentPhone,
    });

    res.json({ success: true, enrollments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getCourseOutline = async (req, res) => {
  try {
    const companyId = resolveAcademyCompanyId(req);
    const { id } = req.params; // courseId
    const studentUserId = req.user?.id || null;
    const customerId = req.user?.customerId || null;
    const studentPhone = extractVerifiedStudentPhone(req);

    const data = await academyService.getCourseOutlineWithProgress({
      courseId: id,
      companyId,
      studentUserId,
      customerId,
      studentPhone,
    });

    res.json({ success: true, ...data });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
};

exports.getLessonContent = async (req, res) => {
  try {
    const companyId = resolveAcademyCompanyId(req);
    const { id } = req.params; // lessonId
    const studentUserId = req.user?.id || null;
    const customerId = req.user?.customerId || null;
    const studentPhone = extractVerifiedStudentPhone(req);

    const data = await academyService.getLessonContent({
      lessonId: id,
      companyId,
      studentUserId,
      customerId,
      studentPhone,
    });

    res.json({ success: true, ...data });
  } catch (err) {
    res.status(403).json({ success: false, error: err.message });
  }
};

exports.enrollStudent = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentName, studentPhone, studentEmail, customerId, orderId, subscriptionDays } = req.body;

    // أنواع التوكنات غير التابعة لفريق الشركة لا تُعامل كأدمن إطلاقاً
    const NON_STAFF_ROLES = ['STUDENT', 'CUSTOMER', 'COURIER', 'AI_SERVICE'];
    const isStaffCaller = Boolean(req.user?.id) && !NON_STAFF_ROLES.includes(req.user?.role);

    // الطالب المصادق: الشركة تُقرأ من توكنه حصراً (ممنوع الثقة في الهيدر)
    const tokenCompanyId = req.user?.role === 'STUDENT' ? req.user.companyId : null;
    const companyId = tokenCompanyId || getCompanyId(req);

    // 🔒 حارس الدفع: تسجيل كورس مدفوع بـ orderId يتطلب أوردر مدفوع حقيقي في قاعدة البيانات
    let verifiedOrderId = null;
    if (orderId) {
      const db = academyService.getDb();
      const order = await db.order.findFirst({
        where: {
          OR: [{ id: String(orderId) }, { orderNumber: String(orderId) }],
        },
        select: { id: true, companyId: true, paymentStatus: true, status: true },
      });
      const isPaidOrder = order && ['COMPLETED', 'PAID'].includes(String(order.paymentStatus || '').toUpperCase());
      if (isStaffCaller) {
        verifiedOrderId = order?.id || null;
      } else if (isPaidOrder && (!order.companyId || !tokenCompanyId || order.companyId === tokenCompanyId)) {
        verifiedOrderId = order.id;
      } else {
        return res.status(403).json({
          success: false,
          error: 'لا يمكن التسجيل في كورس مدفوع إلا بعد إتمام الدفع فعلياً.',
        });
      }
    }

    // الأدمن (فريق الشركة المصادق عليه) يستطيع التسجيل بدون دفع — الطلاب والعملاء لا
    const byAdmin = isStaffCaller;

    const enrollment = await academyService.enrollStudent({
      companyId,
      courseId,
      studentUserId: isStaffCaller ? req.user?.id || null : null,
      customerId: customerId || null,
      orderId: verifiedOrderId,
      studentName: studentName || req.user?.name,
      studentPhone: studentPhone || req.user?.studentPhone || req.user?.phone,
      studentEmail: studentEmail || req.user?.email,
      subscriptionDays: subscriptionDays ? Number(subscriptionDays) : null,
      byAdmin,
    });

    res.status(201).json({ success: true, enrollment });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.suspendEnrollment = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { enrollmentId } = req.params;
    const enrollment = await academyService.suspendEnrollment({ enrollmentId, companyId });
    res.json({ success: true, enrollment });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.reactivateEnrollment = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { enrollmentId } = req.params;
    const enrollment = await academyService.reactivateEnrollment({ enrollmentId, companyId });
    res.json({ success: true, enrollment });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// 🔒 الطالب المصادق: الهوية والشركة من التوكن حصراً — ممنوع الثقة في الهيدر/الجسم
function getStudentScope(req) {
  if (req.user?.role === 'STUDENT') {
    return { companyId: req.user.companyId, studentPhone: req.user.studentPhone, isStudent: true };
  }
  return { companyId: getCompanyId(req), studentPhone: null, isStudent: false };
}

exports.completeLesson = async (req, res) => {
  try {
    const { companyId, studentPhone } = getStudentScope(req);
    const { id } = req.params; // lessonId
    const { enrollmentId } = req.body;

    const progress = await academyService.completeLessonManual({
      lessonId: id,
      enrollmentId,
      companyId,
      studentPhone,
    });

    res.json({ success: true, progress });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.submitQuiz = async (req, res) => {
  try {
    const { companyId, studentPhone } = getStudentScope(req);
    const { id } = req.params; // lessonId
    const { enrollmentId, answers } = req.body;

    const result = await academyService.submitLessonQuiz({
      lessonId: id,
      enrollmentId,
      companyId,
      studentPhone,
      answers,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.askCoach = async (req, res) => {
  try {
    const { companyId, studentPhone } = getStudentScope(req);
    const { id } = req.params; // lessonId
    const { message, quizContext } = req.body;

    const result = await academyService.askCoachOnLesson({
      lessonId: id,
      companyId,
      studentPhone,
      userMessage: message,
      quizContext,
      userId: req.user?.id || req.user?.userId || null,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getStudentsProgress = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // courseId

    const students = await academyService.getStudentsProgress(id, companyId);
    res.json({ success: true, students });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// 🔒 هروب HTML لأي نص يُحقن في قالب الشهادة (الاسم نص حر من فورم عام)
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

exports.renderCertificate = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const db = academyService.getDb();
    const cert = await db.academyCertificate.findUnique({
      where: { enrollmentId },
      include: {
        enrollment: true,
      },
    });

    if (!cert) return res.status(404).send('Certificate not found');

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>شهادة إتمام — ${escapeHtml(cert.courseTitle)}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .cert-card { background: linear-gradient(135deg, #1e293b, #0f172a); border: 4px double #38bdf8; border-radius: 24px; padding: 60px 80px; max-width: 800px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); position: relative; }
    .badge { display: inline-block; padding: 8px 20px; background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; border-radius: 9999px; color: #38bdf8; font-weight: bold; font-size: 14px; margin-bottom: 24px; letter-spacing: 1px; }
    h1 { font-size: 38px; margin: 0 0 16px; color: #ffffff; }
    p.lead { font-size: 18px; color: #94a3b8; margin: 0 0 28px; }
    h2.student { font-size: 32px; color: #38bdf8; margin: 20px 0; border-bottom: 2px solid rgba(56, 189, 248, 0.2); padding-bottom: 12px; display: inline-block; min-width: 300px; }
    p.course { font-size: 20px; color: #cbd5e1; margin: 24px 0 40px; }
    .meta-row { display: flex; justify-content: space-between; border-top: 1px solid #334155; padding-top: 24px; font-size: 14px; color: #64748b; }
    .print-btn { margin-top: 30px; background: #0284c7; color: white; border: none; padding: 12px 28px; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; }
    @media print { .print-btn { display: none; } body { background: white; color: black; } .cert-card { border-color: #0284c7; } }
  </style>
</head>
<body>
  <div class="cert-card">
    <div class="badge">MAXP ACADEMY CERTIFICATE OF COMPLETION</div>
    <h1>شهادة إتمام معتمدة</h1>
    <p class="lead">تشهد أكاديمية ماكس بي بأن المتدرب:</p>
    <h2 class="student">${escapeHtml(cert.studentName)}</h2>
    <p class="course">قد أتم بنجاح كافة متطلبات وتطبيقات الدورة التدريبية المكثفة:<br><strong style="color: #f1f5f9; font-size: 24px;">${escapeHtml(cert.courseTitle)}</strong></p>
    <div class="meta-row">
      <span>رقم الشهادة: <strong>${escapeHtml(cert.certificateNumber)}</strong></span>
      <span>تاريخ الإصدار: <strong>${new Date(cert.issuedAt).toLocaleDateString('ar-EG')}</strong></span>
    </div>
    <button class="print-btn" onclick="window.print()">طباعة / حفظ كـ PDF</button>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(500).send('Error generating certificate');
  }
};

// -------------------------------------------------------------
// Exercise Submissions & Review Endpoints (M2)
// -------------------------------------------------------------

exports.submitExercise = async (req, res) => {
  try {
    const { companyId, studentPhone } = getStudentScope(req);
    const { id } = req.params; // lessonId
    const { enrollmentId, submissionText, submissionUrl } = req.body;
    const studentUserId = req.user?.id || null;
    const customerId = req.user?.role === 'STUDENT' ? null : (req.query.customerId || req.headers['x-customer-id'] || null);

    const result = await academyService.submitLessonExercise({
      lessonId: id,
      enrollmentId,
      companyId,
      studentPhone,
      studentUserId,
      customerId,
      submissionText,
      submissionUrl,
    });

    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getLessonSubmissions = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // lessonId
    const { status } = req.query;

    const submissions = await academyService.getLessonSubmissions({
      lessonId: id,
      companyId,
      status,
    });

    res.json({ success: true, submissions });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getCourseSubmissions = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // courseId
    const { status } = req.query;

    const submissions = await academyService.getCourseSubmissions({
      courseId: id,
      companyId,
      status,
    });

    res.json({ success: true, submissions });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.reviewSubmission = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params; // submissionId
    const { status, instructorNote } = req.body;
    const reviewedBy = req.user?.name || req.user?.email || 'مدرب ماكس بي';

    const submission = await academyService.reviewSubmission({
      submissionId: id,
      companyId,
      reviewedBy,
      status,
      instructorNote,
    });

    res.json({ success: true, submission });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getStoreProducts = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const products = await academyService.getStoreProducts(companyId);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.syncOrderEnrollment = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { orderNumber, orderId } = req.body;
    if (!orderNumber && !orderId) {
      return res.status(400).json({ success: false, error: 'رقم الطلب مطلوب لإجراء المزامنة' });
    }
    const result = await academyService.processOrderAutoEnrollment({
      orderId: orderId || null,
      orderNumber: orderNumber || null,
      companyId,
      changedBy: req.user?.id || 'INSTRUCTOR',
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Helper to resolve an active connected WhatsApp session for a company (Baileys in-memory or Meta Cloud) with platform-wide fallback
async function resolveActiveWhatsAppSession(companyId, db) {
  try {
    const WhatsAppManager = require('../services/whatsapp/WhatsAppManager');
    let ensureRuntimeSessionConnected = null;
    try {
      const balancer = require('../services/whatsapp/sessionBalancer');
      ensureRuntimeSessionConnected = balancer?.ensureRuntimeSessionConnected;
    } catch (_) {}

    const isSendableBaileys = (mem) => {
      if (!mem || mem.status !== 'connected' || !mem.sock) return false;
      if (typeof mem.sock.sendMessage !== 'function') return false;
      const readyState = typeof WhatsAppManager?.getSocketReadyState === 'function'
        ? WhatsAppManager.getSocketReadyState(mem.sock)
        : (mem.sock?.ws?.readyState ?? 1);
      return readyState === 1;
    };

    const evaluateDbCandidate = async (candidate, targetCompanyId) => {
      if (!candidate?.id) return null;
      if (candidate.provider === 'META_CLOUD') {
        return { id: candidate.id, provider: 'META_CLOUD' };
      }
      if (typeof WhatsAppManager.getSession === 'function') {
        const mem = WhatsAppManager.getSession(candidate.id);
        if (isSendableBaileys(mem)) {
          return { id: candidate.id, provider: 'BAILEYS' };
        }
      }
      if (typeof ensureRuntimeSessionConnected === 'function' && candidate.authState) {
        try {
          const jitSession = await ensureRuntimeSessionConnected(candidate.id, targetCompanyId);
          if (isSendableBaileys(jitSession)) {
            return { id: candidate.id, provider: 'BAILEYS' };
          }
        } catch (_) {}
      }
      return null;
    };

    // 1. In-memory check for target company
    if (typeof WhatsAppManager.getCompanySessions === 'function' && companyId) {
      const companySessions = WhatsAppManager.getCompanySessions(companyId) || [];
      for (const s of companySessions) {
        const sid = s.sessionId || s.id;
        if (!sid) continue;
        const mem = WhatsAppManager.getSession(sid);
        if (isSendableBaileys(mem)) {
          return { id: sid, provider: mem.provider || 'BAILEYS' };
        }
      }
    }

    // 2. Query DB for CONNECTED sessions belonging to target company
    if (db?.whatsAppSession && companyId) {
      const targetDbSessions = await db.whatsAppSession.findMany({
        where: { companyId, status: 'CONNECTED' },
        orderBy: [{ isDefault: 'desc' }, { lastConnectedAt: 'desc' }, { createdAt: 'desc' }],
        select: { id: true, provider: true, status: true, authState: true },
      });

      for (const candidate of targetDbSessions) {
        const resolved = await evaluateDbCandidate(candidate, companyId);
        if (resolved) return resolved;
      }
    }

    // 3. Fallback: Central max-p platform session ('cmopgxu3a07i4jujj6f1oh32h')
    const fallbackCompanyId = 'cmopgxu3a07i4jujj6f1oh32h';
    if (companyId !== fallbackCompanyId) {
      if (typeof WhatsAppManager.getCompanySessions === 'function') {
        const centralSessions = WhatsAppManager.getCompanySessions(fallbackCompanyId) || [];
        for (const s of centralSessions) {
          const sid = s.sessionId || s.id;
          if (!sid) continue;
          const mem = WhatsAppManager.getSession(sid);
          if (isSendableBaileys(mem)) {
            return { id: sid, provider: mem.provider || 'BAILEYS' };
          }
        }
      }

      if (db?.whatsAppSession) {
        const fallbackDbSessions = await db.whatsAppSession.findMany({
          where: { companyId: fallbackCompanyId, status: 'CONNECTED' },
          orderBy: [{ isDefault: 'desc' }, { lastConnectedAt: 'desc' }, { createdAt: 'desc' }],
          select: { id: true, provider: true, status: true, authState: true },
        });

        for (const candidate of fallbackDbSessions) {
          const resolved = await evaluateDbCandidate(candidate, fallbackCompanyId);
          if (resolved) return resolved;
        }
      }
    }

    // 4. Universal platform safety net: Find ANY verified connected WhatsApp session across the platform
    // This ensures student OTP is NEVER blocked if max-p's dedicated Baileys socket is recovering/relinking
    if (db?.whatsAppSession) {
      const anyMetaSession = await db.whatsAppSession.findFirst({
        where: { provider: 'META_CLOUD', status: 'CONNECTED' },
        orderBy: [{ lastConnectedAt: 'desc' }],
        select: { id: true, provider: true },
      });
      if (anyMetaSession?.id) {
        return { id: anyMetaSession.id, provider: 'META_CLOUD' };
      }

      const otherConnectedSessions = await db.whatsAppSession.findMany({
        where: { status: 'CONNECTED' },
        orderBy: [{ lastConnectedAt: 'desc' }],
        select: { id: true, provider: true, companyId: true, authState: true },
        take: 5,
      });
      for (const candidate of otherConnectedSessions) {
        const resolved = await evaluateDbCandidate(candidate, candidate.companyId);
        if (resolved) return resolved;
      }
    }
  } catch (err) {
    console.warn('[student-otp] Error resolving WhatsApp session:', err.message);
  }
  return null;
}

// -------------------------------------------------------------
// Student Authentication & Profile
// -------------------------------------------------------------

exports.sendStudentLoginCode = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'رقم الهاتف مطلوب لإرسال كود التحقق' });
    }

    const cleanPhone = phone.trim();
    const db = academyService.getDb();

    // 1. Verify that this phone has an active enrollment or customer account
    const enrollment = await db.academyEnrollment.findFirst({
      where: {
        studentPhone: cleanPhone,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
      include: {
        course: { select: { id: true, title: true } },
      },
    });

    if (!enrollment) {
      // Check customer table fallback
      const customer = await db.customer.findFirst({
        where: { phone: cleanPhone },
      });
      const customerEnrollment = customer ? await db.academyEnrollment.findFirst({
        where: { customerId: customer.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
      }) : null;

      if (!customerEnrollment) {
        return res.status(404).json({
          success: false,
          message: 'لم يتم العثور على اشتراك مرتبط بهذا الرقم. يمكنك الاشتراك في الكورس أولاً أو مشاهدة أول درسين مجاناً.',
        });
      }
    }

    // 2. Rate limit check (minimum 30 seconds between resends for the same phone)
    const existingOtp = studentOtpStore.get(cleanPhone);
    const now = Date.now();
    if (existingOtp && (now - existingOtp.lastSentAt) < 30 * 1000) {
      const waitSeconds = Math.ceil((30 * 1000 - (now - existingOtp.lastSentAt)) / 1000);
      return res.status(429).json({
        success: false,
        message: `يرجى الانتظار ${waitSeconds} ثانية قبل إعادة إرسال الكود.`,
        retryAfter: waitSeconds,
      });
    }

    // 3. Generate 6-digit code
    // 🔒 حسابات الاختبار (01000000099 / 01000000088) بكود ثابت 123456 — مفعّلة فقط بمتغير البيئة
    //    ALLOW_ACADEMY_TEST_OTP === 'true' (ممنوعة تماماً في الإنتاج افتراضياً)
    const isTestFixedOtp = (process.env.ALLOW_ACADEMY_TEST_OTP === 'true' || process.env.ACADEMY_TEST_ACCOUNTS === 'true') &&
      (cleanPhone === '01000000099' || cleanPhone === '01000000088');
    const code = isTestFixedOtp ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Save in OTP store (valid for 10 minutes)
    studentOtpStore.set(cleanPhone, {
      code,
      expiresAt: now + 10 * 60 * 1000,
      attempts: 0,
      lastSentAt: now,
    });

    // 5. Dispatch via WhatsApp
    let dispatchSuccess = false;
    let dispatchError = null;

    if (isTestFixedOtp) {
      // 🧹 Test accounts (01000000099 / 01000000088) have fixed predictable code 123456 only when ALLOW_ACADEMY_TEST_OTP === 'true'
      dispatchSuccess = true;
    } else {
      const companyId = enrollment?.companyId || 'cmopgxu3a07i4jujj6f1oh32h';
      try {
        const activeSession = await resolveActiveWhatsAppSession(companyId, db);
        if (!activeSession) {
          throw new Error('لا توجد جلسة واتساب نشطة متصلة في النظام لإرسال الكود');
        }

        const WhatsAppMessageHandler = require('../services/whatsapp/WhatsAppMessageHandler');
        if (typeof WhatsAppMessageHandler.sendText !== 'function') {
          throw new Error('خدمة إرسال رسائل واتساب غير متاحة حالياً');
        }

        await WhatsAppMessageHandler.sendText(
          activeSession.id,
          cleanPhone,
          `كود التحقق لدخول أكاديمية ماكس بي: ${code}\nصلاحية الكود 10 دقائق.`
        );
        dispatchSuccess = true;
      } catch (waErr) {
        dispatchError = waErr;
        console.error(`🚨 [STUDENT_OTP_FAILED] WhatsApp dispatch failed for ${cleanPhone}:`, waErr.message);
      }
    }

    // 🔒 Reliability: If dispatch failed for a real student phone, DO NOT falsely claim success!
    if (!dispatchSuccess) {
      studentOtpStore.delete(cleanPhone); // Remove OTP so student isn't stuck with an undelivered code

      // Operational notification to the team
      try {
        const notificationService = require('../services/notificationService');
        if (notificationService?.createNotification) {
          await notificationService.createNotification({
            companyId: enrollment?.companyId || 'cmopgxu3a07i4jujj6f1oh32h',
            title: '⚠️ تعذر إرسال كود تحقق دخول الطالب عبر واتساب',
            body: `فشل إرسال كود التحقق للرقم ${cleanPhone}. السبب: ${dispatchError?.message || 'تعذر الإرسال'}`,
            type: 'STUDENT_AUTH_OTP_FAILED',
            metadata: { phone: cleanPhone, error: dispatchError?.message },
          });
        }
      } catch (_) {}

      res.setHeader('cf-turn-off-custom-errors', '1');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');

      return res.status(502).json({
        success: false,
        code: 'OTP_DISPATCH_FAILED',
        message: 'تعذر إرسال كود التحقق عبر واتساب حالياً. يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني.',
      });
    }

    // 6. Record notification on success
    try {
      const notificationService = require('../services/notificationService');
      if (notificationService?.createNotification) {
        await notificationService.createNotification({
          companyId: enrollment?.companyId || 'cmopgxu3a07i4jujj6f1oh32h',
          title: 'كود تحقق دخول الطالب',
          body: `تم إصدار وإرسال كود تحقق للطالب ${cleanPhone}`,
          type: 'STUDENT_AUTH_OTP',
          metadata: { phone: cleanPhone },
        });
      }
    } catch (_) {}

    res.json({
      success: true,
      message: 'تم إرسال كود التحقق بنجاح إلى هاتفك عبر واتساب',
      expiresInSeconds: 600,
      ...(isTestFixedOtp ? { testCode: '123456' } : {}),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.studentLogin = async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'رقم الهاتف مطلوب لتسجيل الدخول' });
    }

    const cleanPhone = phone.trim();

    // 🔒 P0-3 Security: Code is MANDATORY
    if (!code || !String(code).trim()) {
      return res.status(400).json({
        success: false,
        message: 'كود التحقق مطلوب لتسجيل الدخول. اضغط على "إرسال كود التحقق" أولاً.',
        code: 'OTP_REQUIRED',
      });
    }

    const cleanCode = String(code).trim();
    const isTestFixedOtp = (process.env.ALLOW_ACADEMY_TEST_OTP === 'true' || process.env.ACADEMY_TEST_ACCOUNTS === 'true') &&
      (cleanPhone === '01000000099' || cleanPhone === '01000000088');

    // Verify OTP
    let isCodeValid = false;
    if (isTestFixedOtp && cleanCode === '123456') {
      isCodeValid = true;
    } else {
      const otpRecord = studentOtpStore.get(cleanPhone);
      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message: 'لم يتم العثور على كود تحقق لهذا الرقم، أو انتهت صلاحيته. أعد طلب كود جديد.',
          code: 'OTP_EXPIRED',
        });
      }

      if (Date.now() > otpRecord.expiresAt) {
        studentOtpStore.delete(cleanPhone);
        return res.status(400).json({
          success: false,
          message: 'انتهت صلاحية كود التحقق. أعد طلب كود جديد.',
          code: 'OTP_EXPIRED',
        });
      }

      otpRecord.attempts = (otpRecord.attempts || 0) + 1;
      if (otpRecord.attempts > 5) {
        studentOtpStore.delete(cleanPhone);
        return res.status(429).json({
          success: false,
          message: 'تم تجاوز الحد الأقصى للمحاولات الخاطئة. أعد طلب كود جديد.',
          code: 'OTP_MAX_ATTEMPTS',
        });
      }

      if (otpRecord.code !== cleanCode) {
        const remaining = 5 - otpRecord.attempts;
        return res.status(400).json({
          success: false,
          message: `كود التحقق غير صحيح. متبقي ${remaining} محاولة.`,
          code: 'OTP_INVALID',
          remainingAttempts: remaining,
        });
      }

      isCodeValid = true;
      // Single-use: delete after successful verification
      studentOtpStore.delete(cleanPhone);
    }

    const db = academyService.getDb();

    // Look for active enrollments with this phone number
    const enrollments = await db.academyEnrollment.findMany({
      where: {
        studentPhone: cleanPhone,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            price: true,
            thumbnailUrl: true,
          },
        },
      },
    });

    if (!enrollments || enrollments.length === 0) {
      // Also check customer table for fallback
      const customer = await db.customer.findFirst({
        where: { phone: cleanPhone },
      });

      if (customer) {
        const customerEnrollments = await db.academyEnrollment.findMany({
          where: {
            customerId: customer.id,
            status: { in: ['ACTIVE', 'COMPLETED'] },
          },
          include: {
            course: {
              select: {
                id: true,
                title: true,
                price: true,
                thumbnailUrl: true,
              },
            },
          },
        });

        if (customerEnrollments.length > 0) {
          const studentName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'طالب ماكس بي';
          const token = jwt.sign(
            {
              id: `student_${cleanPhone}`,
              userId: `student_${cleanPhone}`,
              studentPhone: cleanPhone,
              customerId: customer.id,
              studentName,
              role: 'STUDENT',
              companyId: customerEnrollments[0]?.companyId || 'cmopgxu3a07i4jujj6f1oh32h',
            },
            getJwtSecret(),
            { expiresIn: '30d' }
          );
          return res.json({
            success: true,
            token,
            student: {
              phone: cleanPhone,
              name: studentName,
              enrollmentsCount: customerEnrollments.length,
            },
          });
        }
      }

      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على اشتراك مرتبط بهذا الرقم. يمكنك الاشتراك في الكورس أولاً أو مشاهدة أول درسين مجاناً.',
      });
    }

    const primaryEnrollment = enrollments[0];
    const studentName = primaryEnrollment.studentName || 'طالب ماكس بي';
    const token = jwt.sign(
      {
        id: `student_${cleanPhone}`,
        userId: `student_${cleanPhone}`,
        studentPhone: cleanPhone,
        studentName,
        role: 'STUDENT',
        companyId: primaryEnrollment?.companyId || 'cmopgxu3a07i4jujj6f1oh32h',
      },
      getJwtSecret(),
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      student: {
        phone: cleanPhone,
        name: studentName,
        enrollmentsCount: enrollments.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getStudentProfile = async (req, res) => {
  try {
    const studentPhone = extractVerifiedStudentPhone(req);
    if (!studentPhone) {
      return res.status(401).json({
        success: false,
        message: 'مطلوب تسجيل الدخول كطالب للوصول للملف الشخصي',
        code: 'STUDENT_AUTH_REQUIRED',
      });
    }

    const db = academyService.getDb();
    const enrollments = await db.academyEnrollment.findMany({
      where: {
        studentPhone,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            price: true,
            thumbnailUrl: true,
          },
        },
        progress: true,
      },
    });

    res.json({
      success: true,
      student: {
        phone: studentPhone,
        name: enrollments[0]?.studentName || 'طالب ماكس بي',
        enrollments,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// -------------------------------------------------------------
// Instant Digital Course Checkout & Auto-Enrollment
// -------------------------------------------------------------

exports.checkoutCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      paymentMethod = 'card',
      testMode = false,
    } = req.body;

    const rawPhone = req.body.studentPhone || req.body.phone;
    const rawName = req.body.studentName || req.body.name;
    const rawEmail = req.body.studentEmail || req.body.email;

    if (!rawPhone || !rawPhone.toString().trim()) {
      return res.status(400).json({ success: false, message: 'رقم الهاتف مطلوب لإتمام الاشتراك' });
    }
    const cleanPhone = rawPhone.toString().trim();
    const cleanName = rawName && rawName.toString().trim() ? rawName.toString().trim() : 'طالب جديد';
    const cleanEmail = rawEmail && rawEmail.toString().trim() ? rawEmail.toString().trim() : null;

    const db = academyService.getDb();
    const course = await db.academyCourse.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: true,
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'الكورس غير موجود' });
    }

    // 🔒 لا شراء إلا لكورس منشور
    if (!course.isPublished) {
      return res.status(400).json({ success: false, message: 'هذا الكورس غير متاح للاشتراك حالياً' });
    }

    // 🔒 الكورس المجاني لا يمر عبر الدفع — التسجيل فيه مجاني مباشرة
    const coursePrice = Number(course.price) || 0;
    if (coursePrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'هذا الكورس مجاني — يمكنك التسجيل فيه مباشرة بدون دفع.',
        code: 'FREE_COURSE_NO_CHECKOUT',
      });
    }

    const targetCompanyId = course.companyId || 'cmopgxu3a07i4jujj6f1oh32h';

    // 1. Idempotency Check: if student already enrolled, return existing enrollment immediately
    const existingEnrollment = await db.academyEnrollment.findFirst({
      where: {
        courseId: course.id,
        status: { in: ['ACTIVE', 'COMPLETED'] },
        OR: [
          { studentPhone: cleanPhone },
          ...(cleanEmail ? [{ studentEmail: cleanEmail }] : []),
        ],
      },
      include: {
        course: { select: { id: true, title: true } },
      },
    });

    if (existingEnrollment) {
      // 🔒 Security (Round 3): DO NOT issue token on checkout. Student must authenticate via OTP.
      return res.json({
        success: true,
        alreadyEnrolled: true,
        message: 'أنت مسجل بالفعل في هذا الكورس! يرجى تسجيل الدخول لمتابعة الدروس.',
        enrollment: existingEnrollment,
        student: { phone: cleanPhone, name: existingEnrollment.studentName || cleanName },
      });
    }

    // 2. Find or create Customer with required relations
    let customer = await db.customer.findFirst({
      where: {
        companyId: targetCompanyId,
        phone: cleanPhone,
      },
    });

    if (!customer) {
      const nameParts = cleanName.split(' ');
      const firstName = nameParts[0] || 'طالب';
      const lastName = nameParts.slice(1).join(' ') || '.';

      customer = await db.customer.create({
        data: {
          company: { connect: { id: targetCompanyId } },
          firstName,
          lastName,
          phone: cleanPhone,
          email: cleanEmail,
          status: 'ACTIVE',
        },
      }).catch(async (createErr) => {
        console.warn('[Academy] Customer creation fallback find:', createErr.message);
        return db.customer.findFirst({ where: { companyId: targetCompanyId, phone: cleanPhone } });
      });
    }

    if (!customer) {
      return res.status(500).json({ success: false, message: 'تعذر ربط بيانات العميل للاشتراك' });
    }

    // 3. Check if internal testMode is explicitly allowed
    // 🔒 P0-1 Security: testMode is strictly locked behind internal env flag ALLOW_ACADEMY_TEST_PAYMENTS === 'true'
    const allowTestMode = process.env.ALLOW_ACADEMY_TEST_PAYMENTS === 'true';
    const isTestCheckout = Boolean(testMode && allowTestMode);
    const orderNumber = `ORD-CRS-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    if (!isTestCheckout) {
      // 🔒 Real Payment via Kashier Payment Gateway
      const origin = req.get('origin') || (req.get('host') ? `${req.protocol || 'https'}://${req.get('host')}` : 'https://maxp.online');
      const redirectUrl = `${origin}/portal/course/${course.id}?orderNumber=${encodeURIComponent(orderNumber)}&paymentSuccess=1`;
      const webhookUrl = process.env.WEBHOOK_BASE_URL
        ? `${process.env.WEBHOOK_BASE_URL}/api/v1/payment/kashier/webhook`
        : 'https://maxp.online/api/v1/payment/kashier/webhook';

      const session = await KashierService.createPaymentSession(
        {
          amount: coursePrice,
          currency: 'EGP',
          orderId: orderNumber,
          customer: { email: cleanEmail || '', reference: cleanPhone },
          redirectUrl,
          webhookUrl,
          description: `اشتراك رقمي: ${course.title}`,
        },
        targetCompanyId
      );

      if (!session.success) {
        return res.status(502).json({
          success: false,
          message: 'تعذر إنشاء جلسة الدفع عبر كاشير. يرجى المحاولة مرة أخرى.',
          error: session.error,
        });
      }

      // Create Order in PENDING status
      const order = await db.order.create({
        data: {
          orderNumber,
          company: { connect: { id: targetCompanyId } },
          customer: { connect: { id: customer.id } },
          customerName: cleanName,
          customerPhone: cleanPhone,
          customerEmail: cleanEmail,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          paymentMethod: 'CREDIT_CARD',
          total: coursePrice,
          subtotal: coursePrice,
          shipping: 0,
          shippingAddress: 'رقمي / كورس أونلاين',
          city: 'أونلاين',
          notes: `اشتراك رقمي في كورس: ${course.title} (جلسة كاشير: ${session.sessionId})`,
          metadata: JSON.stringify({
            kashierSessionId: session.sessionId,
            kashierMode: session.mode,
            courseId: course.id,
            studentPhone: cleanPhone,
            studentName: cleanName,
          }),
          orderItems: {
            create: [
              {
                productId: course.storeProductId || undefined,
                productName: course.title || 'كورس رقمي',
                quantity: 1,
                price: coursePrice,
                total: coursePrice,
              },
            ],
          },
        },
        include: {
          orderItems: true,
          customer: true,
        },
      });

      // Return payment session details for redirection.
      // 🔒 Security: NO STUDENT TOKEN IS ISSUED HERE. Access is granted only after payment verification.
      return res.status(201).json({
        success: true,
        paymentPending: true,
        sessionUrl: session.sessionUrl,
        sessionId: session.sessionId,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          totalAmount: Number(order.total) || coursePrice,
        },
        message: 'تم إنشاء طلب الاشتراك. يرجى إتمام عملية الدفع عبر بوابة كاشير.',
      });
    }

    // 4. Test Mode Execution (Allowed ONLY in test environments with ALLOW_ACADEMY_TEST_PAYMENTS=true)
    const order = await db.order.create({
      data: {
        orderNumber,
        company: { connect: { id: targetCompanyId } },
        customer: { connect: { id: customer.id } },
        customerName: cleanName,
        customerPhone: cleanPhone,
        customerEmail: cleanEmail,
        status: 'CONFIRMED',
        paymentStatus: 'COMPLETED',
        paymentMethod: 'CREDIT_CARD',
        total: coursePrice,
        subtotal: coursePrice,
        shipping: 0,
        shippingAddress: 'رقمي / كورس أونلاين (اختبار داخلي)',
        city: 'أونلاين',
        notes: `اشتراك رقمي تجريبي داخلي في كورس: ${course.title}`,
        orderItems: {
          create: [
            {
              productId: course.storeProductId || undefined,
              productName: course.title || 'كورس رقمي',
              quantity: 1,
              price: coursePrice,
              total: coursePrice,
            },
          ],
        },
      },
      include: {
        orderItems: true,
        customer: true,
      },
    });

    await academyService.processOrderAutoEnrollment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      companyId: course.companyId,
      orderData: order,
    });

    const enrollment = await db.academyEnrollment.findFirst({
      where: {
        courseId: course.id,
        studentPhone: cleanPhone,
      },
    });

    res.status(201).json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
      },
      enrollment,
      student: {
        phone: cleanPhone,
        name: cleanName,
      },
      message: 'تم تفعيل الاشتراك التجريبي بنجاح. يرجى تسجيل الدخول للوصول إلى المحتوى.',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.verifyCoursePayment = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { orderNumber } = req.body;

    if (!orderNumber || !String(orderNumber).trim()) {
      return res.status(400).json({ success: false, message: 'رقم الطلب مطلوب للتحقق من الدفع' });
    }

    const cleanOrderNumber = String(orderNumber).trim();
    const db = academyService.getDb();

    const order = await db.order.findFirst({
      where: { orderNumber: cleanOrderNumber },
      include: { customer: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    const cleanPhone = order.customerPhone;
    const cleanName = order.customerName || 'طالب ماكس بي';

    // 1. If already completed (via Kashier webhook or previous verify)
    if (order.paymentStatus === 'COMPLETED' || order.status === 'CONFIRMED' || order.status === 'COMPLETED') {
      await academyService.processOrderAutoEnrollment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        companyId: order.companyId,
        orderData: order,
      });

      let metadata = {};
      try {
        metadata = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : (order.metadata || {});
      } catch (_) {}

      const targetCourseId = courseId || metadata.courseId;
      const enrollment = await db.academyEnrollment.findFirst({
        where: {
          ...(targetCourseId ? { courseId: targetCourseId } : {}),
          studentPhone: cleanPhone,
        },
      });

      // 🔒 Security (Round 3): DO NOT issue token on payment verification. Access is gated by OTP login.
      return res.json({
        success: true,
        verified: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
        },
        enrollment,
        student: { phone: cleanPhone, name: cleanName },
        message: 'تم تأكيد الدفع وتفعيل الاشتراك بنجاح! يرجى تسجيل الدخول لمتابعة الكورس.',
      });
    }

    // 2. If order is still PENDING, verify status with Kashier API directly
    let metadata = {};
    try {
      metadata = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : (order.metadata || {});
    } catch (_) {}

    const sessionId = metadata.kashierSessionId;
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'لم يتم العثور على جلسة دفع كاشير مرتبطة بهذا الطلب',
      });
    }

    const sessionCheck = await KashierService.getSessionStatus(sessionId, order.companyId);

    const isPaid = sessionCheck.success && (
      sessionCheck.status === 'SUCCESS' ||
      sessionCheck.status === 'CAPTURED' ||
      sessionCheck.data?.status === 'SUCCESS' ||
      sessionCheck.data?.status === 'CAPTURED'
    );

    if (isPaid) {
      let validPaymentMethod = 'CREDIT_CARD';
      const validMethods = ['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'PAYPAL', 'STRIPE', 'WALLET', 'INSTAPAY', 'VISA', 'MASTERCARD', 'VODAFONE_CASH'];
      if (sessionCheck.method && validMethods.includes(sessionCheck.method.toUpperCase())) {
        validPaymentMethod = sessionCheck.method.toUpperCase();
      }

      await db.order.update({
        where: { id: order.id },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'COMPLETED',
          paymentMethod: validPaymentMethod,
        },
      });

      await academyService.processOrderAutoEnrollment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        companyId: order.companyId,
        orderData: order,
      });

      const targetCourseId = courseId || metadata.courseId;
      const enrollment = await db.academyEnrollment.findFirst({
        where: {
          ...(targetCourseId ? { courseId: targetCourseId } : {}),
          studentPhone: cleanPhone,
        },
      });

      // 🔒 Security (Round 3): DO NOT issue token on payment verification. Access is gated by OTP login.
      return res.json({
        success: true,
        verified: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: 'CONFIRMED',
          paymentStatus: 'COMPLETED',
        },
        enrollment,
        student: { phone: cleanPhone, name: cleanName },
        message: 'تم التحقق من نجاح الدفع وتفعيل الكورس بنجاح! يرجى تسجيل الدخول لمتابعة الكورس.',
      });
    }

    return res.status(402).json({
      success: false,
      verified: false,
      paymentStatus: sessionCheck.status || 'PENDING',
      message: 'لم يتم تأكيد السداد بعد من بوابة الدفع. يرجى إتمام عملية الدفع.',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


