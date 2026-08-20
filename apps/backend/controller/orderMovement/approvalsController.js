const core = require('../../services/orderMovementCore');

const handler = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });
    }
    const { startDate, endDate } = req.query;
    const { start, end } = core.normalizeDateRange({ startDate, endDate });
    const rangeWhere = core.buildHistoryRangeWhere({ start, end });
    const prisma = core.getSharedPrismaClient();

    const where = { companyId: String(companyId), createdAt: rangeWhere.createdAt };

    const [rows, totalRequests, statusGroups, totalOverrides] = await Promise.all([
      prisma.orderStatusChangeRequest.findMany({
        where,
        include: {
          order: { select: { orderNumber: true } },
          fromStatus: { select: { name: true, code: true } },
          toStatus: { select: { name: true, code: true } },
          requestor: { select: { firstName: true, lastName: true } },
          reviewer: { select: { firstName: true, lastName: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 200
      }),
      prisma.orderStatusChangeRequest.count({ where }),
      prisma.orderStatusChangeRequest.groupBy({ by: ['status'], where, _count: true }),
      prisma.orderWorkflowAuditLog.count({
        where: { companyId: String(companyId), ...rangeWhere, changeType: 'override' }
      })
    ]);

    const fullName = (person) => {
      if (!person) return '';
      return `${person.firstName || ''} ${person.lastName || ''}`.trim();
    };

    const requests = rows.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      orderNumber: r.order?.orderNumber ?? null,
      requestedBy: r.requestedBy,
      requestedByName: fullName(r.requestor) || r.requestedBy,
      fromStatus: r.fromStatus,
      toStatus: r.toStatus,
      reason: r.reason ?? null,
      status: r.status,
      reviewedBy: r.reviewedBy ?? null,
      reviewedByName: fullName(r.reviewer) || r.reviewedBy || null,
      reviewedAt: r.reviewedAt ?? null,
      createdAt: r.createdAt
    }));

    const reviewed = requests.filter((r) => r.reviewedAt);
    const countByStatus = new Map(statusGroups.map((g) => [g.status, g._count]));
    const pending = countByStatus.get('pending') || 0;
    const approved = countByStatus.get('approved') || 0;
    const rejected = countByStatus.get('rejected') || 0;

    const reviewHours = reviewed.map((r) => core.hoursBetween(r.createdAt, r.reviewedAt));
    const avgReviewHours = reviewHours.length ? Math.round(core.calcMean(reviewHours) * 100) / 100 : 0;
    const approvalRate = totalRequests ? Math.round((approved / totalRequests) * 1000) / 10 : 0;

    const reviewerGroups = new Map();
    for (const r of reviewed) {
      const name = r.reviewedByName || r.reviewedBy || '╪║┘è╪▒ ┘à╪╣╪▒┘ê┘ü';
      if (!reviewerGroups.has(name)) {
        reviewerGroups.set(name, { name, reviewedCount: 0, approved: 0, rejected: 0, hours: [] });
      }
      const group = reviewerGroups.get(name);
      group.reviewedCount += 1;
      if (r.status === 'approved') group.approved += 1;
      if (r.status === 'rejected') group.rejected += 1;
      group.hours.push(core.hoursBetween(r.createdAt, r.reviewedAt));
    }

    const reviewers = Array.from(reviewerGroups.values())
      .map((g) => ({
        name: g.name,
        reviewedCount: g.reviewedCount,
        approved: g.approved,
        rejected: g.rejected,
        avgReviewHours: g.hours.length ? Math.round(core.calcMean(g.hours) * 100) / 100 : 0
      }))
      .sort((a, b) => b.reviewedCount - a.reviewedCount);

    res.json({
      success: true,
      data: {
        summary: { totalRequests, pending, approved, rejected, approvalRate, avgReviewHours, totalOverrides },
        requests,
        reviewers
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '╪¡╪»╪½ ╪«╪╖╪ú ╪ú╪½┘å╪º╪í ╪¬╪¡┘ä┘è┘ä ╪º┘ä┘à┘ê╪º┘ü┘é╪º╪¬' });
  }
};

module.exports = handler;
