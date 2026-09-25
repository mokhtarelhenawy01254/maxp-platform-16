const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { parsePagination, round2, getCompanyId } = require('../utils/dentalLabHelpers');
const {
  confirmFinancialPosting,
  voidFinancialPosting,
  generateFinancialReports,
  SOURCE_TYPES,
  POSTING_STATUS,
} = require('../services/financialPostingService');

/**
 * List all financial postings for company
 */
const listFinancialPostings = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { status, sourceType, direction, from, to } = req.query;
    const where = { companyId };

    if (status) where.status = status;
    if (sourceType) where.sourceType = sourceType;
    if (direction) where.direction = direction;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const { pageNum, limitNum, skip } = parsePagination(req.query);
    const prisma = getSharedPrismaClient();

    const [items, total] = await Promise.all([
      prisma.financialPosting.findMany({
        where,
        include: { treasuryAccount: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.financialPosting.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items,
        total,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error('Error listing financial postings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الحركات المالية' });
  }
};

/**
 * List pending postings for owner review/approval
 */
const getPendingPostings = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const prisma = getSharedPrismaClient();
    const items = await prisma.financialPosting.findMany({
      where: { companyId, status: POSTING_STATUS.PENDING_CONFIRM },
      include: { treasuryAccount: true },
      orderBy: { createdAt: 'desc' },
    });

    const totalAmount = round2(items.reduce((sum, p) => sum + (Number(p.amount) || 0), 0));

    res.json({
      success: true,
      data: {
        items,
        totalCount: items.length,
        totalAmount,
      },
    });
  } catch (error) {
    console.error('Error fetching pending postings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الحركات المعلّقة' });
  }
};

/**
 * Confirm/Approve a pending posting to treasury
 */
const confirmPosting = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const { treasuryAccountId } = req.body || {};
    const userId = req.user?.id || req.user?.email || null;

    const result = await confirmFinancialPosting(companyId, id, {
      treasuryAccountId,
      userId,
    });

    res.json({
      success: true,
      data: result,
      message: 'تم ترحيل الحركة المالية إلى الخزينة بنجاح',
    });
  } catch (error) {
    console.error('Error confirming financial posting:', error);
    if (error.code === 'NOT_FOUND') return res.status(404).json({ success: false, error: error.message });
    if (error.code === 'NO_TREASURY_ACCOUNT') return res.status(400).json({ success: false, error: error.message });
    if (error.code === 'ALREADY_VOID') return res.status(400).json({ success: false, error: error.message });
    res.status(500).json({ success: false, error: error.message || 'حدث خطأ في ترحيل الحركة المالية' });
  }
};

/**
 * Void/Reject a pending posting
 */
const voidPosting = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { id } = req.params;
    const { reason } = req.body || {};
    const userId = req.user?.id || req.user?.email || null;

    const result = await voidFinancialPosting(companyId, id, {
      reason,
      userId,
    });

    res.json({
      success: true,
      data: result,
      message: 'تم إلغاء الحركة المالية بنجاح',
    });
  } catch (error) {
    console.error('Error voiding financial posting:', error);
    if (error.code === 'NOT_FOUND') return res.status(404).json({ success: false, error: error.message });
    if (error.code === 'CANNOT_VOID_POSTED') return res.status(400).json({ success: false, error: error.message });
    res.status(500).json({ success: false, error: error.message || 'حدث خطأ في إلغاء الحركة المالية' });
  }
};

/**
 * Comprehensive Cash Flow & Balance Report
 */
const getCashFlowReport = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const prisma = getSharedPrismaClient();
    const reports = await generateFinancialReports(prisma, companyId, req.query);

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error('Error generating cash flow report:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في توليد تقرير الكاش فلو' });
  }
};

/**
 * Profitability Report per Case & Work Type
 */
const getProfitabilityReport = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;

    const { workTypeId, from, to } = req.query;
    const prisma = getSharedPrismaClient();

    const caseWhere = { companyId, isDeleted: false };
    if (workTypeId) caseWhere.workTypeId = workTypeId;
    if (from || to) {
      caseWhere.createdAt = {};
      if (from) caseWhere.createdAt.gte = new Date(from);
      if (to) caseWhere.createdAt.lte = new Date(to);
    }

    const cases = await prisma.dentalLabCase.findMany({
      where: caseWhere,
      include: {
        workType: true,
        materialUsages: true,
        stages: { where: { status: 'DONE' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const reportRows = cases.map((c) => {
      const revenue = round2(Number(c.total) || 0);
      const materialsCost = round2(c.materialUsages.reduce((sum, u) => sum + (Number(u.costRecorded) || 0), 0));
      const wagesCost = round2(c.stages.reduce((sum, s) => sum + (Number(s.stageWage) || 0), 0));
      const outsourceCost = round2(Number(c.outsourceCost) || 0);
      const totalCost = round2(materialsCost + wagesCost + outsourceCost);
      const netProfit = round2(revenue - totalCost);
      const marginPercent = revenue > 0 ? round2((netProfit / revenue) * 100) : 0;

      return {
        caseId: c.id,
        caseNumber: c.caseNumber,
        workTypeName: c.workType?.name || c.workTypeName,
        doctorName: c.doctorName,
        revenue,
        materialsCost,
        wagesCost,
        outsourceCost,
        totalCost,
        netProfit,
        marginPercent,
      };
    });

    const totals = reportRows.reduce(
      (acc, r) => {
        acc.revenue = round2(acc.revenue + r.revenue);
        acc.materialsCost = round2(acc.materialsCost + r.materialsCost);
        acc.wagesCost = round2(acc.wagesCost + r.wagesCost);
        acc.outsourceCost = round2(acc.outsourceCost + r.outsourceCost);
        acc.totalCost = round2(acc.totalCost + r.totalCost);
        acc.netProfit = round2(acc.netProfit + r.netProfit);
        return acc;
      },
      { revenue: 0, materialsCost: 0, wagesCost: 0, outsourceCost: 0, totalCost: 0, netProfit: 0 }
    );

    totals.marginPercent = totals.revenue > 0 ? round2((totals.netProfit / totals.revenue) * 100) : 0;

    res.json({
      success: true,
      data: {
        cases: reportRows,
        totals,
      },
    });
  } catch (error) {
    console.error('Error generating profitability report:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في توليد تقرير الربحية' });
  }
};

module.exports = {
  listFinancialPostings,
  getPendingPostings,
  confirmPosting,
  voidPosting,
  getCashFlowReport,
  getProfitabilityReport,
};
