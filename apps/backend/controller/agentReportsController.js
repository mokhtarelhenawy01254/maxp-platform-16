const { getSharedPrismaClient } = require('../services/sharedDatabase');
const crypto = require('crypto');

const getPrisma = () => getSharedPrismaClient();

// Default types to lazily seed per company (AR-1)
const DEFAULT_TYPES = [
  {
    slug: 'ai-update',
    name: 'إبديت الذكاء الاصطناعي',
    description: 'تقارير ونماذج الذكاء الاصطناعي',
    icon: 'sparkles',
    sortOrder: 1,
  },
  {
    slug: 'github-daily',
    name: 'الإبديت اليومي للجت هاب',
    description: 'تقارير نشاط وتحديثات مستودعات الأكواد',
    icon: 'git-commit',
    sortOrder: 2,
  },
  {
    slug: 'shipping',
    name: 'تقارير الشحن',
    description: 'تقارير عمليات الشحن والطرود اليومية',
    icon: 'truck',
    sortOrder: 3,
  },
];

/**
 * Resolves the tenant companyId from req.
 * If user is SUPER_ADMIN, allows companyId from query or body.
 */
function resolveCompanyId(req) {
  if (req.user?.role === 'SUPER_ADMIN') {
    const override = req.query?.companyId || req.body?.companyId;
    if (override && typeof override === 'string' && override.trim()) {
      return override.trim();
    }
  }
  return req.user?.companyId || null;
}

/**
 * Ensures default report types exist for the company lazily.
 */
async function ensureDefaultTypes(companyId) {
  if (!companyId) return;
  const count = await getPrisma().agentReportType.count({
    where: { companyId },
  });
  if (count === 0) {
    for (const dt of DEFAULT_TYPES) {
      await getPrisma().agentReportType.create({
        data: {
          companyId,
          slug: dt.slug,
          name: dt.name,
          description: dt.description,
          icon: dt.icon,
          sortOrder: dt.sortOrder,
          isActive: true,
        },
      }).catch((err) => {
        // Ignore potential concurrency conflict
      });
    }
  }
}

/**
 * GET /api/v1/agent-reports/types
 * List all report types with count of reports
 */
async function getTypes(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة غير متوفر' });
    }

    await ensureDefaultTypes(companyId);

    const types = await getPrisma().agentReportType.findMany({
      where: { companyId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: { reports: true },
        },
      },
    });

    const data = types.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      icon: t.icon,
      sortOrder: t.sortOrder,
      isActive: t.isActive,
      reportsCount: t._count?.reports || 0,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('❌ [AgentReports] Error fetching types:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في جلب أنواع التقارير',
      error: error.message,
    });
  }
}

/**
 * POST /api/v1/agent-reports/types
 * Create new report type
 */
async function createType(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة غير متوفر' });
    }

    const { name, slug, description, icon, sortOrder } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'اسم نوع التقرير مطلوب' });
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u0621-\u064A-]+/g, '-')
      .replace(/^-+|-+$/g, '') || `type-${Date.now()}`;

    const existing = await getPrisma().agentReportType.findFirst({
      where: { companyId, slug: cleanSlug },
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'نوع التقرير بهذا الرمز (slug) موجود بالفعل' });
    }

    const created = await getPrisma().agentReportType.create({
      data: {
        companyId,
        name: name.trim(),
        slug: cleanSlug,
        description: description?.trim() || null,
        icon: icon?.trim() || 'file-text',
        sortOrder: Number(sortOrder) || 0,
        isActive: true,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        ...created,
        reportsCount: 0,
      },
      message: 'تم إنشاء نوع التقرير بنجاح',
    });
  } catch (error) {
    console.error('❌ [AgentReports] Error creating type:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في إنشاء نوع التقرير',
      error: error.message,
    });
  }
}

/**
 * PATCH /api/v1/agent-reports/types/:id
 * Update report type
 */
async function updateType(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة غير متوفر' });
    }

    const { id } = req.params;
    const existing = await getPrisma().agentReportType.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'نوع التقرير غير موجود' });
    }

    const { name, icon, sortOrder, isActive, description } = req.body || {};
    const dataToUpdate = {};
    if (name !== undefined) dataToUpdate.name = String(name).trim();
    if (icon !== undefined) dataToUpdate.icon = String(icon).trim();
    if (description !== undefined) dataToUpdate.description = description ? String(description).trim() : null;
    if (sortOrder !== undefined) dataToUpdate.sortOrder = Number(sortOrder) || 0;
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);

    const updated = await getPrisma().agentReportType.update({
      where: { id },
      data: dataToUpdate,
      include: { _count: { select: { reports: true } } },
    });

    return res.json({
      success: true,
      data: {
        ...updated,
        reportsCount: updated._count?.reports || 0,
      },
      message: 'تم تحديث نوع التقرير بنجاح',
    });
  } catch (error) {
    console.error('❌ [AgentReports] Error updating type:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في تحديث نوع التقرير',
      error: error.message,
    });
  }
}

/**
 * DELETE /api/v1/agent-reports/types/:id
 * Delete report type (409 if has reports)
 */
async function deleteType(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة غير متوفر' });
    }

    const { id } = req.params;
    const existing = await getPrisma().agentReportType.findFirst({
      where: { id, companyId },
      include: { _count: { select: { reports: true } } },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'نوع التقرير غير موجود' });
    }

    if (existing._count?.reports > 0) {
      return res.status(409).json({
        success: false,
        message: 'لا يمكن حذف نوع التقرير لوجود تقارير مرتبطة به',
      });
    }

    await getPrisma().agentReportType.delete({
      where: { id },
    });

    return res.json({ success: true, message: 'تم حذف نوع التقرير بنجاح' });
  } catch (error) {
    console.error('❌ [AgentReports] Error deleting type:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في حذف نوع التقرير',
      error: error.message,
    });
  }
}

/**
 * GET /api/v1/agent-reports/reports
 * List reports without full html
 */
async function getReports(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة غير متوفر' });
    }

    const { typeId, q, limit = 50, offset = 0 } = req.query || {};

    const where = { companyId };
    if (typeId && String(typeId).trim()) {
      where.typeId = String(typeId).trim();
    }
    if (q && String(q).trim()) {
      const search = String(q).trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { periodLabel: { contains: search, mode: 'insensitive' } },
      ];
    }

    const take = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const skip = Math.max(Number(offset) || 0, 0);

    const [items, total] = await Promise.all([
      getPrisma().agentReport.findMany({
        where,
        select: {
          id: true,
          companyId: true,
          typeId: true,
          title: true,
          slug: true,
          periodLabel: true,
          summary: true,
          sizeBytes: true,
          status: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
          type: {
            select: {
              id: true,
              slug: true,
              name: true,
              icon: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      getPrisma().agentReport.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items,
        total,
        limit: take,
        offset: skip,
      },
    });
  } catch (error) {
    console.error('❌ [AgentReports] Error listing reports:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في جلب قائمة التقارير',
      error: error.message,
    });
  }
}

/**
 * GET /api/v1/agent-reports/reports/:id
 * Get single report metadata and html
 */
async function getReportById(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة غير متوفر' });
    }

    const { id } = req.params;
    const report = await getPrisma().agentReport.findFirst({
      where: { id, companyId },
      include: {
        type: {
          select: {
            id: true,
            slug: true,
            name: true,
            icon: true,
          },
        },
      },
    });

    if (!report) {
      return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    }

    return res.json({ success: true, data: report });
  } catch (error) {
    console.error('❌ [AgentReports] Error getting report:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في جلب التقرير',
      error: error.message,
    });
  }
}

/**
 * GET /api/v1/agent-reports/reports/:id/html
 * Returns raw text/html for direct browser view or download
 */
async function getReportHtml(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة غير متوفر' });
    }

    const { id } = req.params;
    const report = await getPrisma().agentReport.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        slug: true,
        html: true,
      },
    });

    if (!report) {
      return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${report.slug}.html"`);
    return res.send(report.html);
  } catch (error) {
    console.error('❌ [AgentReports] Error returning HTML:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في استرجاع محتوى التقرير',
      error: error.message,
    });
  }
}

/**
 * POST /api/v1/agent-reports/reports
 * Upload/create a report
 */
async function createReport(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة غير متوفر' });
    }

    const { typeId, typeSlug, title, periodLabel, summary, html, status } = req.body || {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'عنوان التقرير مطلوب' });
    }

    if (!html || typeof html !== 'string' || !html.trim()) {
      return res.status(400).json({
        success: false,
        message: 'محتوى التقرير (HTML) مطلوب ولا يمكن أن يكون فارغاً',
      });
    }

    const sizeBytes = Buffer.byteLength(html, 'utf8');
    const MAX_BYTES = 12 * 1024 * 1024; // 12MB
    if (sizeBytes > MAX_BYTES) {
      return res.status(400).json({
        success: false,
        message: 'حجم ملف التقرير يتجاوز الحد الأقصى المسموح به (12 ميجابايت)',
      });
    }

    // Resolve type
    const typeWhere = { companyId };
    if (typeId) {
      typeWhere.id = String(typeId).trim();
    } else if (typeSlug) {
      typeWhere.slug = String(typeSlug).trim();
    } else {
      return res.status(400).json({
        success: false,
        message: 'نوع التقرير (typeId أو typeSlug) مطلوب',
      });
    }

    const reportType = await getPrisma().agentReportType.findFirst({
      where: typeWhere,
    });

    if (!reportType) {
      return res.status(404).json({ success: false, message: 'نوع التقرير غير موجود' });
    }

    // Generate unique slug
    const dateStr = new Date().toISOString().slice(0, 10);
    const randomHex = crypto.randomBytes(3).toString('hex');
    const slug = `${reportType.slug}-${dateStr}-${randomHex}`;

    const created = await getPrisma().agentReport.create({
      data: {
        companyId,
        typeId: reportType.id,
        title: title.trim(),
        slug,
        periodLabel: periodLabel?.trim() || null,
        summary: summary?.trim() || null,
        html,
        sizeBytes,
        status: status || 'PUBLISHED',
        createdBy: req.user?.name || req.user?.email || req.user?.id || 'Agent',
      },
      include: {
        type: {
          select: {
            id: true,
            slug: true,
            name: true,
            icon: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: created,
      message: 'تم رفع التقرير بنجاح',
    });
  } catch (error) {
    console.error('❌ [AgentReports] Error creating report:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في إنشاء التقرير',
      error: error.message,
    });
  }
}

/**
 * PATCH /api/v1/agent-reports/reports/:id
 * Update report metadata
 */
async function updateReport(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة غير متوفر' });
    }

    const { id } = req.params;
    const existing = await getPrisma().agentReport.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    }

    const { title, summary, periodLabel, typeId, status } = req.body || {};
    const dataToUpdate = {};
    if (title !== undefined) dataToUpdate.title = String(title).trim();
    if (summary !== undefined) dataToUpdate.summary = summary ? String(summary).trim() : null;
    if (periodLabel !== undefined) dataToUpdate.periodLabel = periodLabel ? String(periodLabel).trim() : null;
    if (status !== undefined) dataToUpdate.status = String(status).trim();

    if (typeId && typeId !== existing.typeId) {
      const reportType = await getPrisma().agentReportType.findFirst({
        where: { id: String(typeId).trim(), companyId },
      });
      if (!reportType) {
        return res.status(404).json({ success: false, message: 'نوع التقرير الجديد غير موجود' });
      }
      dataToUpdate.typeId = reportType.id;
    }

    const updated = await getPrisma().agentReport.update({
      where: { id },
      data: dataToUpdate,
      include: {
        type: {
          select: {
            id: true,
            slug: true,
            name: true,
            icon: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: updated,
      message: 'تم تحديث التقرير بنجاح',
    });
  } catch (error) {
    console.error('❌ [AgentReports] Error updating report:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في تحديث التقرير',
      error: error.message,
    });
  }
}

/**
 * DELETE /api/v1/agent-reports/reports/:id
 * Delete report
 */
async function deleteReport(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة غير متوفر' });
    }

    const { id } = req.params;
    const existing = await getPrisma().agentReport.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    }

    await getPrisma().agentReport.delete({
      where: { id },
    });

    return res.json({ success: true, message: 'تم حذف التقرير بنجاح' });
  } catch (error) {
    console.error('❌ [AgentReports] Error deleting report:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في حذف التقرير',
      error: error.message,
    });
  }
}

module.exports = {
  getTypes,
  createType,
  updateType,
  deleteType,
  getReports,
  getReportById,
  getReportHtml,
  createReport,
  updateReport,
  deleteReport,
  resolveCompanyId,
  ensureDefaultTypes,
};
