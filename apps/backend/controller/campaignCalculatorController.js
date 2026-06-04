console.log('✅ [DEBUG] campaignCalculatorController: Loading...');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
console.log('✅ [DEBUG] campaignCalculatorController: SharedDB imported.');

/**
 * Get historical defaults for campaign calculator
 * Based on company's past performance from sentMessageStat and orders
 */
const getCampaignCalculatorDefaults = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const prisma = getSharedPrismaClient();

    // Calculate date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Get sent message stats for the last 30 days
    const [messageStats, historicalSummaries] = await Promise.all([
      // Raw stats from today
      prisma.sentMessageStat.findMany({
        where: {
          companyId: companyId,
          sentAt: { gte: thirtyDaysAgo }
        },
        select: {
          messageStatus: true,
          conversationStatus: true,
          sentAt: true,
        }
      }),
      // Historical summaries
      prisma.sentMessageDailySummary.findMany({
        where: {
          companyId: companyId,
          date: { gte: thirtyDaysAgo }
        },
        select: {
          totalSent: true,
          totalSaved: true,
          totalIgnored: true,
          totalRevenue: true,
          orderCount: true,
          conversationsCreated: true,
          conversationsExisted: true,
        }
      })
    ]);

    // Get orders data for revenue calculations
    const orders = await prisma.order.findMany({
      where: {
        companyId: companyId,
        createdAt: { gte: thirtyDaysAgo },
        conversationId: { not: null }
      },
      select: {
        total: true,
        createdAt: true,
      }
    });

    // Get hourly distribution for peak hours
    const hourlyStats = await prisma.sentMessageStat.groupBy({
      by: ['sentAt'],
      where: {
        companyId: companyId,
        sentAt: { gte: ninetyDaysAgo }
      },
      _count: {
        id: true
      }
    });

    // Calculate aggregated metrics
    let totalSent = 0;
    let totalSaved = 0;
    let totalIgnored = 0;
    let totalRevenue = 0;
    let totalOrders = 0;
    let totalConversations = 0;

    // Aggregate from historical summaries
    historicalSummaries.forEach(summary => {
      totalSent += summary.totalSent || 0;
      totalSaved += summary.totalSaved || 0;
      totalIgnored += summary.totalIgnored || 0;
      totalRevenue += parseFloat(summary.totalRevenue?.toString() || 0);
      totalOrders += summary.orderCount || 0;
      totalConversations += (summary.conversationsCreated || 0) + (summary.conversationsExisted || 0);
    });

    // Add raw stats from today
    messageStats.forEach(stat => {
      if (stat.messageStatus === 'saved') totalSaved++;
      else totalIgnored++;
      totalSent++;
    });

    // Add orders revenue
    orders.forEach(order => {
      totalRevenue += parseFloat(order.total?.toString() || 0);
      totalOrders++;
    });

    // Calculate rates
    const avgOpenRate = totalSent > 0 ? ((totalSaved / totalSent) * 100).toFixed(1) : 75;
    const avgResponseRate = totalSaved > 0 ? 25 : 25; // Default if no data
    const avgConversionRate = totalConversations > 0 ?
      ((totalOrders / totalConversations) * 100).toFixed(1) : 12;

    const avgRevenuePerMessage = totalSent > 0 ? (totalRevenue / totalSent).toFixed(2) : 8.5;
    const avgRevenuePerConversation = totalConversations > 0 ?
      (totalRevenue / totalConversations).toFixed(2) : 45;

    // Calculate peak hours from hourly stats
    const hourCounts = {};
    hourlyStats.forEach(stat => {
      const hour = new Date(stat.sentAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + (stat._count?.id || 0);
    });

    const peakHours = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Get best days of week
    const dayCounts = {};
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    messageStats.forEach(stat => {
      const day = new Date(stat.sentAt).getDay();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const bestDays = Object.entries(dayCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([day]) => dayNames[parseInt(day)]);

    // Sample size for confidence calculation
    const sampleSize = totalSent;

    const defaults = {
      avgOpenRate: parseFloat(avgOpenRate),
      avgResponseRate: parseFloat(avgResponseRate),
      avgConversionRate: parseFloat(avgConversionRate),
      avgRevenuePerMessage: parseFloat(avgRevenuePerMessage),
      avgRevenuePerConversation: parseFloat(avgRevenuePerConversation),
      peakHours: peakHours.length > 0 ? peakHours : [14, 15, 16],
      bestDays: bestDays.length > 0 ? bestDays : ['الثلاثاء', 'الأربعاء', 'الخميس'],
      costPerMessage: 0.05, // Default cost per message
      sampleSize,
      dataQuality: sampleSize > 1000 ? 'high' : sampleSize > 100 ? 'medium' : 'low',
      period: {
        from: thirtyDaysAgo.toISOString(),
        to: now.toISOString()
      }
    };

    console.log(`📊 [CAMPAIGN-CALCULATOR] Defaults fetched for company ${companyId}:`, {
      avgOpenRate,
      avgConversionRate,
      sampleSize
    });

    res.json({
      success: true,
      data: defaults
    });

  } catch (error) {
    console.error('❌ [CAMPAIGN-CALCULATOR] Error fetching defaults:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب البيانات الافتراضية'
    });
  }
};

/**
 * Calculate campaign predictions with advanced analytics
 */
const calculateCampaignPredictions = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const {
      targetAudienceSize,
      budget,
      costPerMessage,
      productPrice,
      profitMargin,
      averageOrderValue,
      expectedOpenRate,
      expectedResponseRate,
      expectedConversionRate,
      campaignDuration,
      messageType,
      useHistoricalData,
      historicalPeriod
    } = req.body;

    // Validate inputs
    if (!targetAudienceSize || !productPrice || !profitMargin) {
      return res.status(400).json({
        success: false,
        error: 'البيانات المدخلة غير مكتملة'
      });
    }

    // Get historical data for comparison if requested
    let historicalComparison = null;
    if (useHistoricalData) {
      const prisma = getSharedPrismaClient();
      const daysBack = historicalPeriod === '7d' ? 7 : historicalPeriod === '90d' ? 90 : 30;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - daysBack);

      const historicalStats = await prisma.sentMessageDailySummary.findMany({
        where: {
          companyId: companyId,
          date: { gte: fromDate }
        },
        orderBy: { date: 'desc' },
        take: daysBack
      });

      if (historicalStats.length > 0) {
        const avgRevenue = historicalStats.reduce((sum, s) => sum + parseFloat(s.totalRevenue?.toString() || 0), 0) / historicalStats.length;
        const avgOrders = historicalStats.reduce((sum, s) => sum + (s.orderCount || 0), 0) / historicalStats.length;

        historicalComparison = {
          avgDailyRevenue: avgRevenue,
          avgDailyOrders: avgOrders,
          bestDayRevenue: Math.max(...historicalStats.map(s => parseFloat(s.totalRevenue?.toString() || 0))),
          worstDayRevenue: Math.min(...historicalStats.map(s => parseFloat(s.totalRevenue?.toString() || 0))),
        };
      }
    }

    // Core predictions
    const expectedMessagesSent = targetAudienceSize;
    const expectedSavedMessages = Math.round(targetAudienceSize * (expectedOpenRate / 100));
    const expectedConversations = Math.round(expectedSavedMessages * (expectedResponseRate / 100));
    const expectedConversions = Math.round(expectedConversations * (expectedConversionRate / 100));

    // Financial predictions
    const expectedRevenue = expectedConversions * averageOrderValue;
    const expectedProfit = expectedRevenue * (profitMargin / 100);
    const totalCost = expectedMessagesSent * costPerMessage;
    const expectedRoi = totalCost > 0 ? ((expectedProfit - totalCost) / totalCost) * 100 : 0;

    // CPA and Break-even
    const costPerAcquisition = expectedConversions > 0 ? totalCost / expectedConversions : 0;
    const profitPerUnit = productPrice * (profitMargin / 100);
    const breakEvenUnits = profitPerUnit > 0 ? Math.ceil(totalCost / profitPerUnit) : 0;
    const breakEvenRevenue = breakEvenUnits * productPrice;

    // Risk analysis
    const riskFactors = [];
    if (expectedRoi < 0) {
      riskFactors.push({ level: 'high', message: 'الحملة المتوقع أن تكون غير مربحة' });
    } else if (expectedRoi < 50) {
      riskFactors.push({ level: 'medium', message: 'عائد منخفض نسبياً' });
    }

    if (expectedConversionRate < 5) {
      riskFactors.push({ level: 'medium', message: 'معدل تحويل منخفض - قد يحتاج لتحسين' });
    }

    // Daily breakdown
    const dailyBreakdown = [];
    const dailyRevenue = expectedRevenue / campaignDuration;
    let cumulativeRevenue = 0;

    for (let i = 1; i <= campaignDuration; i++) {
      cumulativeRevenue += dailyRevenue;
      dailyBreakdown.push({
        day: i,
        dailyRevenue: Math.round(dailyRevenue),
        cumulativeRevenue: Math.round(cumulativeRevenue),
        dailyConversions: Math.round(expectedConversions / campaignDuration),
        reachedBreakEven: cumulativeRevenue >= breakEvenRevenue
      });
    }

    // Confidence score based on data availability
    const prisma = getSharedPrismaClient();
    const totalHistoricalStats = await prisma.sentMessageStat.count({
      where: { companyId: companyId }
    });

    let confidenceScore = 60;
    if (totalHistoricalStats > 1000) confidenceScore = 95;
    else if (totalHistoricalStats > 500) confidenceScore = 85;
    else if (totalHistoricalStats > 100) confidenceScore = 75;

    // Smart recommendations
    const recommendations = [];

    if (expectedRoi > 100) {
      recommendations.push({
        type: 'success',
        title: 'فرصة ممتازة',
        message: `ROI متوقع ${expectedRoi.toFixed(0)}% - هذه حملة واعدة جداً!`
      });
    }

    if (expectedConversionRate < 10) {
      recommendations.push({
        type: 'improvement',
        title: 'تحسين معدل التحويل',
        message: 'جرب تحسين نص الرسالة أو عرض خصم أكبر لزيادة التحويلات'
      });
    }

    if (costPerAcquisition > averageOrderValue * 0.3) {
      recommendations.push({
        type: 'warning',
        title: 'تكلفة اكتساب مرتفعة',
        message: 'CPA يتجاوز 30% من قيمة الطلب - consider تقليل التكلفة أو زيادة قيمة الطلب'
      });
    }

    // Scenario analysis
    const scenarios = {
      conservative: {
        expectedOpenRate: expectedOpenRate * 0.7,
        expectedResponseRate: expectedResponseRate * 0.6,
        expectedConversionRate: expectedConversionRate * 0.5,
      },
      optimistic: {
        expectedOpenRate: Math.min(expectedOpenRate * 1.2, 95),
        expectedResponseRate: Math.min(expectedResponseRate * 1.3, 60),
        expectedConversionRate: Math.min(expectedConversionRate * 1.5, 40),
      }
    };

    const results = {
      predictions: {
        expectedMessagesSent,
        expectedSavedMessages,
        expectedConversations,
        expectedConversions,
        expectedRevenue: Math.round(expectedRevenue),
        expectedProfit: Math.round(expectedProfit),
        expectedRoi: Math.round(expectedRoi * 100) / 100,
        costPerAcquisition: Math.round(costPerAcquisition * 100) / 100,
        breakEvenUnits,
        breakEvenRevenue: Math.round(breakEvenRevenue),
        confidenceScore
      },
      financials: {
        totalCost: Math.round(totalCost),
        profitPerUnit: Math.round(profitPerUnit * 100) / 100,
        marginPercentage: profitMargin,
        roiPercentage: Math.round(expectedRoi * 100) / 100
      },
      dailyBreakdown,
      riskAnalysis: {
        level: expectedRoi < 0 ? 'high' : expectedRoi < 50 ? 'medium' : 'low',
        factors: riskFactors,
        confidenceScore
      },
      recommendations,
      historicalComparison,
      scenarios,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ [CAMPAIGN-CALCULATOR] Predictions calculated for company ${companyId}:`, {
      expectedRevenue: results.predictions.expectedRevenue,
      expectedRoi: results.predictions.expectedRoi,
      confidenceScore
    });

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('❌ [CAMPAIGN-CALCULATOR] Error calculating predictions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في حساب التوقعات'
    });
  }
};

/**
 * Compare campaign with historical campaign
 */
const compareWithHistoricalCampaign = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { campaignId } = req.params;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'غير مصرح بالوصول'
      });
    }

    // This would compare with a saved campaign in the future
    // For now, return a placeholder
    res.json({
      success: true,
      data: {
        message: 'ميزة المقارنة قيد التطوير',
        campaignId
      }
    });

  } catch (error) {
    console.error('❌ [CAMPAIGN-CALCULATOR] Error comparing campaigns:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getCampaignCalculatorDefaults,
  calculateCampaignPredictions,
  compareWithHistoricalCampaign
};
