const { getSharedPrismaClient } = require('../services/sharedDatabase');

const stages = {
  LEAD: { name: 'عميل محتمل', color: 'bg-gray-100 text-gray-800' },
  QUALIFIED: { name: 'مؤهل', color: 'bg-blue-100 text-blue-800' },
  PROPOSAL: { name: 'عرض سعر', color: 'bg-yellow-100 text-yellow-800' },
  NEGOTIATION: { name: 'تفاوض', color: 'bg-orange-100 text-orange-800' },
  CLOSED_WON: { name: 'مغلق - فوز', color: 'bg-green-100 text-green-800' },
  CLOSED_LOST: { name: 'مغلق - خسارة', color: 'bg-red-100 text-red-800' },
};

/**
 * Get all opportunities with optional filtering
 */
const getAllOpportunities = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { stage, source, assignedTo, page = 1, limit = 10, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = { companyId: companyId };

    if (stage) where.stage = stage;
    if (source) where.source = source;
    if (assignedTo) where.assignedToId = assignedTo; // Assuming assignedTo relation

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const prisma = getSharedPrismaClient();

    // NOTE: This assumes the model is named 'opportunity'. It will fail if different.
    // Ensure the table name exactly matches your Prisma schema (e.g., 'opportunity', 'lead').
    const [opportunities, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true }
          },
          assignedTo: {
            select: { id: true, firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: parseInt(limit)
      }),
      prisma.opportunity.count({ where })
    ]);

    // Format response to match expected frontend structure if needed
    const formattedOpportunities = opportunities.map(opp => ({
      ...opp,
      customerName: opp.customer ? `${opp.customer.firstName} ${opp.customer.lastName || ''}`.trim() : 'Unknown',
      assignedToName: opp.assignedTo ? `${opp.assignedTo.firstName} ${opp.assignedTo.lastName || ''}`.trim() : 'Unassigned',
      value: opp.value ? parseFloat(opp.value) : 0,
      probability: opp.probability || 0
    }));

    res.json({
      success: true,
      data: formattedOpportunities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      },
      message: 'تم جلب الفرص التجارية بنجاح'
    });

  } catch (error) {
    console.error('❌ [OPPORTUNITIES] Error fetching opportunities:', error);

    // Provide a development-friendly error message if table is missing
    const schemaError = error.message?.includes('model') ? 'Database schema model error' : undefined;

    res.status(500).json({
      success: false,
      error: schemaError || 'Failed to fetch opportunities',
      message: 'فشل في جلب الفرص التجارية',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get pipeline statistics
 */
const getPipelineStats = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const prisma = getSharedPrismaClient();
    const opportunities = await prisma.opportunity.findMany({
      where: { companyId: companyId }
    });

    const pipelineStats = {
      stages: {},
      totals: {
        count: opportunities.length,
        value: 0,
        weightedValue: 0,
        averageValue: 0
      }
    };

    // Initialize stages
    Object.keys(stages).forEach(stageKey => {
      pipelineStats.stages[stageKey] = {
        count: 0,
        value: 0,
        opportunities: []
      };
    });

    // Process opportunities
    opportunities.forEach(opp => {
      const stage = opp.stage || 'LEAD'; // Default if missing
      const val = parseFloat(opp.value || 0);
      const prob = parseFloat(opp.probability || 0);

      // Ensure stage exists in map before writing
      if (!pipelineStats.stages[stage]) {
        pipelineStats.stages[stage] = { count: 0, value: 0, opportunities: [] };
      }

      // Add to stage stats
      pipelineStats.stages[stage].count++;
      pipelineStats.stages[stage].value += val;
      // We don't push full opps objects in stats to keep payload light, or limit to minimal fields
      pipelineStats.stages[stage].opportunities.push({
        id: opp.id,
        title: opp.title,
        value: val
      });

      // Add to totals
      pipelineStats.totals.value += val;
      pipelineStats.totals.weightedValue += (val * prob / 100);
    });

    // Calculate average
    if (pipelineStats.totals.count > 0) {
      pipelineStats.totals.averageValue = pipelineStats.totals.value / pipelineStats.totals.count;
    }

    res.json({
      success: true,
      data: pipelineStats,
      message: 'تم حساب إحصائيات المسار بنجاح'
    });

  } catch (error) {
    console.error('❌ [OPPORTUNITIES] Error calculating pipeline stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate pipeline statistics',
      message: 'فشل في حساب إحصائيات المسار'
    });
  }
};

/**
 * Update opportunity stage
 */
const updateOpportunityStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // Validate stage
    if (!stages[stage]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stage',
        message: 'مرحلة غير صحيحة'
      });
    }

    const prisma = getSharedPrismaClient();

    // Ensure opportunity exists and belongs to company
    const opportunity = await prisma.opportunity.findFirst({
      where: { id: id, companyId: companyId }
    });

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found',
        message: 'الفرصة التجارية غير موجودة'
      });
    }

    // Update opportunity
    const updatedOpportunity = await prisma.opportunity.update({
      where: { id: id },
      data: { stage: stage }
    });

    res.json({
      success: true,
      data: updatedOpportunity,
      message: 'تم تحديث مرحلة الفرصة بنجاح'
    });

  } catch (error) {
    console.error('❌ [OPPORTUNITIES] Error updating opportunity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update opportunity',
      message: 'فشل في تحديث الفرصة التجارية'
    });
  }
};

/**
 * Get single opportunity by ID
 */
const getOpportunityById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const prisma = getSharedPrismaClient();
    const opportunity = await prisma.opportunity.findFirst({
      where: { id: id, companyId: companyId },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true }
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
        // Include activities, products etc if they exist in schema
      }
    });

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found',
        message: 'الفرصة التجارية غير موجودة'
      });
    }

    // Format for frontend
    const formattedOpp = {
      ...opportunity,
      customerName: opportunity.customer ? `${opportunity.customer.firstName} ${opportunity.customer.lastName || ''}`.trim() : 'Unknown',
      assignedToName: opportunity.assignedTo ? `${opportunity.assignedTo.firstName} ${opportunity.assignedTo.lastName || ''}`.trim() : 'Unassigned',
      value: opportunity.value ? parseFloat(opportunity.value) : 0,
      probability: opportunity.probability || 0
    };

    res.json({
      success: true,
      data: formattedOpp,
      message: 'تم جلب الفرصة التجارية بنجاح'
    });

  } catch (error) {
    console.error('❌ [OPPORTUNITIES] Error fetching opportunity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunity',
      message: 'فشل في جلب الفرصة التجارية'
    });
  }
};

module.exports = {
  getAllOpportunities,
  getPipelineStats,
  updateOpportunityStage,
  getOpportunityById
};