/**
 * Performance, Insights, Funnels, Geo and Recommendations Helpers
 */
const {
  PURCHASE_ACTION_TYPES,
  CONVERSION_ACTION_TYPES,
} = require("./constants");
const { toNullableNumber, toFiniteNumber } = require("./utils");

function getInsightActionValue(rows, actionTypes) {
  if (!Array.isArray(rows)) {
    return 0;
  }

  const normalizedActionTypes = actionTypes.map((type) => type.toLowerCase());
  const match = rows.find((row) =>
    normalizedActionTypes.includes(String(row?.action_type || "").toLowerCase()),
  );

  return toFiniteNumber(match?.value);
}

function aggregateMetaInsights(insights = []) {
  const totals = createEmptyPerformanceTotals();
  insights.forEach((insight) => addMetaInsightToTotals(totals, insight));
  return withDerivedPerformance(totals);
}

function getPurchaseRoas(insight, spend, purchaseValue) {
  const roasFromMeta = getInsightActionValue(
    insight.purchase_roas,
    PURCHASE_ACTION_TYPES,
  );

  if (roasFromMeta > 0) {
    return roasFromMeta;
  }

  return spend > 0 ? purchaseValue / spend : 0;
}

function buildInsightPersistenceData(insight) {
  const spend = toFiniteNumber(insight.spend);
  const purchases = getInsightActionValue(insight.actions, PURCHASE_ACTION_TYPES);
  const purchaseValue = getInsightActionValue(
    insight.action_values,
    PURCHASE_ACTION_TYPES,
  );
  const conversions = getInsightActionValue(
    insight.actions,
    CONVERSION_ACTION_TYPES,
  );
  const linkClicks =
    toFiniteNumber(insight.inline_link_clicks) ||
    getInsightActionValue(insight.actions, ["link_click", "omni_link_click"]);
  const landingPageViews = getInsightActionValue(insight.actions, [
    "landing_page_view",
    "omni_landing_page_view",
  ]);
  const cpa =
    getInsightActionValue(insight.cost_per_action_type, PURCHASE_ACTION_TYPES) ||
    (purchases > 0 ? spend / purchases : 0);

  return {
    impressions: Math.trunc(toFiniteNumber(insight.impressions)),
    clicks: Math.trunc(toFiniteNumber(insight.clicks)),
    ctr: toFiniteNumber(insight.ctr),
    cpc: toFiniteNumber(insight.cpc),
    spend,
    conversions: Math.trunc(conversions),
    cpa,
    reach: Math.trunc(toFiniteNumber(insight.reach)),
    frequency: toFiniteNumber(insight.frequency),
    linkClicks: Math.trunc(linkClicks),
    costPerLinkClick: toFiniteNumber(insight.cost_per_inline_link_click),
    landingPageViews: Math.trunc(landingPageViews),
    purchases: Math.trunc(purchases),
    purchaseValue,
    roas: getPurchaseRoas(insight, spend, purchaseValue),
    breakdown: JSON.stringify({
      actions: insight.actions || [],
      actionValues: insight.action_values || [],
      costPerActionType: insight.cost_per_action_type || [],
      purchaseRoas: insight.purchase_roas || [],
      dateStart: insight.date_start || null,
      dateStop: insight.date_stop || null,
    }),
  };
}

function createEmptyPerformanceTotals() {
  return {
    impressions: 0,
    clicks: 0,
    spend: 0,
    reach: 0,
    conversions: 0,
    purchases: 0,
    purchaseValue: 0,
    linkClicks: 0,
    landingPageViews: 0,
    frequencySum: 0,
    frequencySamples: 0,
  };
}

function addInsightToTotals(totals, insight) {
  totals.impressions += insight.impressions;
  totals.clicks += insight.clicks;
  totals.spend += insight.spend;
  totals.reach += insight.reach;
  totals.conversions += insight.conversions;
  totals.purchases += insight.purchases;
  totals.purchaseValue += insight.purchaseValue;
  totals.linkClicks += insight.linkClicks;
  totals.landingPageViews += insight.landingPageViews;

  if (insight.frequency > 0) {
    totals.frequencySum += insight.frequency;
    totals.frequencySamples += 1;
  }
}

function addMetaInsightToTotals(totals, insight) {
  addInsightToTotals(totals, buildInsightPersistenceData(insight));
}

function withDerivedPerformance(totals) {
  return {
    impressions: totals.impressions,
    clicks: totals.clicks,
    spend: Number(totals.spend.toFixed(2)),
    reach: totals.reach,
    conversions: totals.conversions,
    purchases: totals.purchases,
    purchaseValue: Number(totals.purchaseValue.toFixed(2)),
    linkClicks: totals.linkClicks,
    landingPageViews: totals.landingPageViews,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    cpa: totals.purchases > 0 ? totals.spend / totals.purchases : 0,
    roas: totals.spend > 0 ? totals.purchaseValue / totals.spend : 0,
    frequency:
      totals.frequencySamples > 0
        ? totals.frequencySum / totals.frequencySamples
        : 0,
  };
}

function buildPerformanceRecommendations(summary, campaigns) {
  const recommendations = [];

  if (summary.impressions === 0) {
    recommendations.push({
      priority: "HIGH",
      title: "لا توجد بيانات أداء كافية",
      message:
        "زامن الإحصائيات بعد إطلاق الإعلان أو انتظر أول delivery من Meta قبل اتخاذ قرارات تحسين.",
    });
    return recommendations;
  }

  if (summary.spend > 0 && summary.purchases === 0) {
    recommendations.push({
      priority: "HIGH",
      title: "إنفاق بدون مشتريات",
      message:
        "راجع ربط Pixel swam-maxp وأحداث Purchase/InitiateCheckout، ثم اختبر صفحة الهبوط والعرض قبل رفع الميزانية.",
    });
  }

  if (summary.ctr > 0 && summary.ctr < 1) {
    recommendations.push({
      priority: "MEDIUM",
      title: "CTR منخفض",
      message:
        "جرّب Hook أقوى في أول سطر وصورة/كاروسيل أوضح للمنتج، لأن الجمهور يرى الإعلان ولا يضغط كفاية.",
    });
  }

  if (summary.frequency > 3) {
    recommendations.push({
      priority: "MEDIUM",
      title: "احتمال إرهاق للجمهور",
      message:
        "التكرار أعلى من 3. جهز نسخة كريتيف جديدة أو وسّع الجمهور قبل ما تكلفة النتيجة تزيد.",
    });
  }

  if (summary.purchases > 0 && summary.roas < 1) {
    recommendations.push({
      priority: "HIGH",
      title: "ROAS أقل من 1",
      message:
        "الإعلان يبيع لكن العائد أقل من المصروف. راجع السعر، الشحن، صفحة المنتج، وقيمة العرض.",
    });
  }

  // Only flag missing pixel for purely local campaigns with zero purchases recorded
  const hasTrackedPurchases = (summary.purchases || 0) > 0;
  const campaignsMissingPixel = hasTrackedPurchases
    ? []
    : campaigns.filter(
        (campaign) =>
          /SALES|CONVERSIONS/i.test(campaign.objective || "") &&
          !campaign.pixelId &&
          !campaign.facebookCampaignId &&
          campaign.performanceSource !== "META" &&
          (campaign.performance?.spend || 0) > 0,
      );

  if (campaignsMissingPixel.length > 0) {
    recommendations.push({
      priority: "HIGH",
      title: "حملات مبيعات بدون Pixel محلي",
      message:
        "بعض حملات المبيعات غير مسجل عليها Pixel في النظام، وهذا يصعب قراءة التحويلات والتحسين.",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: "LOW",
      title: "الأداء مستقر مبدئياً",
      message:
        "استمر في مراقبة CPC وROAS يومياً، وابدأ A/B test للعنوان أو أول صورة عند توفر بيانات أكثر.",
    });
  }

  return recommendations;
}

function normalizeGeoPerformanceBreakdown(value) {
  const normalized = String(value || "region").trim().toLowerCase();
  return ["country", "region"].includes(normalized) ? normalized : "region";
}

function getGeoPerformanceLabel(insight, breakdown) {
  if (breakdown === "country") {
    return insight.country || insight.country_code || "غير محدد";
  }

  return insight.region || insight.region_name || insight.country || "غير محدد";
}

function buildGeoPerformanceRecommendations(rows) {
  if (rows.length === 0) {
    return [
      {
        priority: "HIGH",
        title: "لا توجد بيانات جغرافية كافية",
        message:
          "انتظر أول delivery من Meta أو وسّع المدة قبل تقسيم الميزانية بين محافظات.",
      },
    ];
  }

  const topRow = rows[0];
  const recommendations = [
    {
      priority: "MEDIUM",
      title: `أعلى منطقة إنفاقاً: ${topRow.label}`,
      message:
        "راجع ROAS وCPA لهذه المنطقة قبل التوسع. لا تزود الميزانية بناءً على الإنفاق وحده.",
    },
  ];

  if (topRow.metrics.spend < 100) {
    recommendations.push({
      priority: "LOW",
      title: "العينة ما زالت صغيرة",
      message:
        "استنى إنفاق ونتائج أكثر قبل إيقاف محافظات أو نقل الميزانية بينها.",
    });
  }

  return recommendations;
}

function normalizePerformanceBreakdown(value) {
  const normalized = String(value || "age_gender").trim().toLowerCase();
  return [
    "age_gender",
    "placement",
    "platform",
    "device",
    "country",
    "region",
  ].includes(normalized)
    ? normalized
    : "age_gender";
}

function getTranslatedGender(value) {
  const labels = {
    male: "رجال",
    female: "نساء",
    unknown: "غير محدد",
  };
  const normalized = String(value || "unknown").toLowerCase();
  return labels[normalized] || value || "غير محدد";
}

function getTranslatedPublisherPlatform(value) {
  const labels = {
    facebook: "Facebook",
    instagram: "Instagram",
    messenger: "Messenger",
    audience_network: "Audience Network",
    threads: "Threads",
    whatsapp: "WhatsApp",
  };
  const normalized = String(value || "unknown").toLowerCase();
  return labels[normalized] || value || "غير محدد";
}

function getTranslatedPlatformPosition(value) {
  const labels = {
    feed: "Feed",
    stories: "Stories",
    story: "Stories",
    reels: "Reels",
    instagram_reels: "Instagram Reels",
    instagram_stories: "Instagram Stories",
    marketplace: "Marketplace",
    video_feeds: "Video feeds",
    search: "Search",
    right_hand_column: "Right column",
    instream_video: "In-stream video",
    profile_feed: "Profile feed",
    explore: "Explore",
    unknown: "غير محدد",
  };
  const normalized = String(value || "unknown").toLowerCase();
  return labels[normalized] || value || "غير محدد";
}

function getTranslatedDevicePlatform(value) {
  const labels = {
    mobile: "موبايل",
    desktop: "Desktop",
    unknown: "غير محدد",
  };
  const normalized = String(value || "unknown").toLowerCase();
  return labels[normalized] || value || "غير محدد";
}

function getPerformanceBreakdownLabel(insight, breakdown) {
  if (breakdown === "age_gender") {
    return `${insight.age || "غير محدد"} / ${getTranslatedGender(insight.gender)}`;
  }

  if (breakdown === "placement") {
    return `${getTranslatedPublisherPlatform(
      insight.publisher_platform,
    )} - ${getTranslatedPlatformPosition(insight.platform_position)}`;
  }

  if (breakdown === "platform") {
    return getTranslatedPublisherPlatform(insight.publisher_platform);
  }

  if (breakdown === "device") {
    return getTranslatedDevicePlatform(insight.device_platform);
  }

  if (breakdown === "country") {
    return insight.country || insight.country_code || "غير محدد";
  }

  return insight.region || insight.region_name || insight.country || "غير محدد";
}

function getPerformanceBreakdownKey(insight, breakdown) {
  if (breakdown === "age_gender") {
    return `age_gender:${insight.age || "unknown"}:${insight.gender || "unknown"}`;
  }

  if (breakdown === "placement") {
    return `placement:${insight.publisher_platform || "unknown"}:${
      insight.platform_position || "unknown"
    }`;
  }

  if (breakdown === "platform") {
    return `platform:${insight.publisher_platform || "unknown"}`;
  }

  if (breakdown === "device") {
    return `device:${insight.device_platform || "unknown"}`;
  }

  if (breakdown === "country") {
    return `country:${insight.country || insight.country_code || "unknown"}`;
  }

  return `region:${insight.region || insight.region_name || insight.country || "unknown"}`;
}

function buildPerformanceBreakdownRecommendations(rows, campaigns, breakdown) {
  const recommendations = [];

  if (rows.length === 0) {
    return [
      {
        priority: "HIGH",
        title: "لا توجد بيانات breakdown كافية",
        message:
          "وسّع الفترة الزمنية أو انتظر مزامنة Meta؛ بدون شرائح لا نقدر نحدد هل المشكلة جمهور، موضع، أو صفحة هبوط.",
      },
    ];
  }

  const expensiveLowReturn = rows.find(
    (row) => row.metrics.spend >= 100 && row.metrics.purchases === 0,
  );
  if (expensiveLowReturn) {
    recommendations.push({
      priority: "HIGH",
      title: `إنفاق بدون مشتريات: ${expensiveLowReturn.label}`,
      message:
        "هذه الشريحة تسحب ميزانية ولا ترجع مشتريات. راجع الكريتيف/العرض أو استبعدها في اختبار منفصل.",
    });
  }

  const bestRow = rows.find((row) => row.metrics.purchases > 0);
  if (bestRow) {
    recommendations.push({
      priority: "MEDIUM",
      title: `أفضل شريحة حالياً: ${bestRow.label}`,
      message:
        "قسّم القرار على CPA وROAS وليس الإنفاق فقط، ثم اختبر رفع الميزانية تدريجياً إذا العينة كافية.",
    });
  }

  const weakCampaign = campaigns.find(
    (campaign) =>
      campaign.metrics.spend >= 150 &&
      campaign.metrics.purchases === 0 &&
      campaign.rows.length > 0,
  );
  if (weakCampaign) {
    recommendations.push({
      priority: "HIGH",
      title: `حملة تحتاج فحص: ${weakCampaign.campaignName}`,
      message:
        "الحملة تصرف بدون Purchase. افصل التشخيص بين CTR، Landing Page Views، Pixel Purchase، والتكرار قبل إيقافها بالكامل.",
    });
  }

  if (breakdown === "placement") {
    recommendations.push({
      priority: "LOW",
      title: "راجع Advantage+ Placements قبل الاستبعاد",
      message:
        "لو موضع واحد ضعيف، اختبره وحده أو راجع الكريتيف الخاص به بدل إلغاء كل المواضع مرة واحدة.",
    });
  }

  return recommendations.length > 0
    ? recommendations
    : [
        {
          priority: "LOW",
          title: "التوزيع لا يظهر مشكلة حادة",
          message:
            "لا توجد شريحة واضحة تستنزف الميزانية حالياً. راقب الحجم الإحصائي واستكمل التشخيص على مستوى الإعلان.",
        },
      ];
}

function toIsoDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseReportDateInput(value) {
  const normalized = String(value || "").trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);

  if (dateOnlyMatch) {
    return new Date(
      Number(dateOnlyMatch[1]),
      Number(dateOnlyMatch[2]) - 1,
      Number(dateOnlyMatch[3]),
    );
  }

  if (!normalized) {
    return null;
  }

  const parsedDate = new Date(normalized);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function normalizeReportDateRange(startDate, endDate, days = 30) {
  const today = new Date();
  const rangeEnd = parseReportDateInput(endDate) || today;
  const parsedStartDate = parseReportDateInput(startDate);
  const rangeStart = parsedStartDate || new Date(rangeEnd);

  if (!startDate) {
    rangeStart.setDate(rangeStart.getDate() - days + 1);
  }

  rangeStart.setHours(0, 0, 0, 0);
  rangeEnd.setHours(23, 59, 59, 999);

  return {
    rangeStart,
    rangeEnd,
    startDate: toIsoDateOnly(rangeStart),
    endDate: toIsoDateOnly(rangeEnd),
  };
}

function getPreviousDateRange(rangeStart, rangeEnd) {
  const durationMs = Math.max(24 * 60 * 60 * 1000, rangeEnd - rangeStart);
  const previousEnd = new Date(rangeStart);
  previousEnd.setDate(previousEnd.getDate() - 1);
  previousEnd.setHours(23, 59, 59, 999);

  const previousStart = new Date(previousEnd.getTime() - durationMs);
  previousStart.setHours(0, 0, 0, 0);

  return {
    rangeStart: previousStart,
    rangeEnd: previousEnd,
    startDate: toIsoDateOnly(previousStart),
    endDate: toIsoDateOnly(previousEnd),
  };
}

function aggregatePersistedInsights(insights = []) {
  const totals = createEmptyPerformanceTotals();
  insights.forEach((insight) => addInsightToTotals(totals, insight));
  return withDerivedPerformance(totals);
}

async function getMetaInsightsOrNull(adsService, metaNodeId, dateRange) {
  if (!adsService || !metaNodeId) {
    return null;
  }

  const result = await adsService.getInsights(metaNodeId, {
    since: dateRange.startDate,
    until: dateRange.endDate,
  });

  return result.success ? result.data || [] : null;
}

function percentChange(current, baseline) {
  if (!baseline) {
    return current > 0 ? 100 : 0;
  }

  return ((current - baseline) / baseline) * 100;
}

function buildAdComparison(current, baseline) {
  return {
    spend: percentChange(current.spend, baseline.spend),
    purchases: percentChange(current.purchases, baseline.purchases),
    roas: percentChange(current.roas, baseline.roas),
    cpa: percentChange(current.cpa, baseline.cpa),
    ctr: percentChange(current.ctr, baseline.ctr),
    frequency: percentChange(current.frequency, baseline.frequency),
  };
}

function buildAdFunnel(summary) {
  const steps = [
    {
      key: "impressions",
      label: "الظهور",
      value: summary.impressions,
      rate: 100,
    },
    {
      key: "linkClicks",
      label: "ضغطات الرابط",
      value: summary.linkClicks || summary.clicks,
      rate:
        summary.impressions > 0
          ? ((summary.linkClicks || summary.clicks) / summary.impressions) * 100
          : 0,
    },
    {
      key: "landingPageViews",
      label: "مشاهدات صفحة الهبوط",
      value: summary.landingPageViews,
      rate:
        (summary.linkClicks || summary.clicks) > 0
          ? (summary.landingPageViews / (summary.linkClicks || summary.clicks)) *
            100
          : 0,
    },
    {
      key: "conversions",
      label: "أحداث التحويل",
      value: summary.conversions,
      rate:
        summary.landingPageViews > 0
          ? (summary.conversions / summary.landingPageViews) * 100
          : 0,
    },
    {
      key: "purchases",
      label: "المشتريات",
      value: summary.purchases,
      rate:
        summary.landingPageViews > 0
          ? (summary.purchases / summary.landingPageViews) * 100
          : 0,
    },
  ];

  let diagnosis = {
    key: "stable",
    title: "لا توجد نقطة تسريب حادة",
    message:
      "الفانل لا يظهر كسر واضح حالياً. راقب الحجم الإحصائي وقارن الشرائح قبل القرار.",
    severity: "LOW",
  };

  if (summary.impressions === 0) {
    diagnosis = {
      key: "no_delivery",
      title: "لا يوجد Delivery كافٍ",
      message:
        "الإعلان لم يجمع ظهوراً كافياً في الفترة الحالية. افحص الحالة والميزانية والـ ad set.",
      severity: "HIGH",
    };
  } else if (summary.ctr > 0 && summary.ctr < 1) {
    diagnosis = {
      key: "creative",
      title: "المشكلة غالباً في الكريتيف أو أول Hook",
      message:
        "CTR أقل من 1%؛ الجمهور يرى الإعلان لكن لا يضغط بما يكفي. اختبر صورة/فيديو ونص افتتاحي جديد.",
      severity: "MEDIUM",
    };
  } else if (
    (summary.linkClicks || summary.clicks) > 0 &&
    summary.landingPageViews / (summary.linkClicks || summary.clicks) < 0.65
  ) {
    diagnosis = {
      key: "landing_page_load",
      title: "تسريب بين الضغط وصفحة الهبوط",
      message:
        "نسبة Landing Page Views من الضغطات ضعيفة. راجع سرعة الصفحة، الرابط، والـ Pixel/PageView.",
      severity: "HIGH",
    };
  } else if (summary.spend >= 100 && summary.purchases === 0) {
    diagnosis = {
      key: "offer_or_tracking",
      title: "إنفاق بدون Purchase",
      message:
        "الإعلان يصرف بدون مشتريات. راجع العرض، صفحة المنتج، checkout، وصحة حدث Purchase/CAPI.",
      severity: "HIGH",
    };
  } else if (summary.frequency > 3.5 && summary.ctr < 1.5) {
    diagnosis = {
      key: "fatigue",
      title: "احتمال إرهاق إعلاني",
      message:
        "التكرار مرتفع والضغط ضعيف نسبياً. جهز نسخة كريتيف جديدة أو وسع الجمهور.",
      severity: "MEDIUM",
    };
  }

  return { steps, diagnosis };
}

function buildAdVerdict(summary, previousSummary, adSetSummary, campaignSummary) {
  if (summary.impressions === 0) {
    return {
      status: "NO_DATA",
      label: "لا توجد بيانات كافية",
      tone: "slate",
      reason: "الإعلان يحتاج مزامنة أو فترة أطول قبل تقييم الأداء.",
    };
  }

  if (summary.spend >= 100 && summary.purchases === 0) {
    return {
      status: "FIX",
      label: "يحتاج إصلاح",
      tone: "red",
      reason: "يوجد إنفاق بدون مشتريات، فلا تزود الميزانية قبل فحص الفانل والتتبع.",
    };
  }

  if (summary.purchases >= 2 && summary.roas >= 3) {
    return {
      status: "SCALE",
      label: "قابل للتوسيع",
      tone: "green",
      reason: "ROAS جيد ومعه مشتريات كافية مبدئياً. التوسيع يكون تدريجياً مع مراقبة CPA.",
    };
  }

  if (adSetSummary.cpa > 0 && summary.cpa > adSetSummary.cpa * 1.25) {
    return {
      status: "FIX",
      label: "أضعف من متوسط المجموعة",
      tone: "amber",
      reason: "CPA أعلى من متوسط الـ Ad Set بأكثر من 25%. راجع الشرائح والكريتيف.",
    };
  }

  if (campaignSummary.roas > 0 && summary.roas < campaignSummary.roas * 0.75) {
    return {
      status: "WATCH",
      label: "راقب قبل القرار",
      tone: "amber",
      reason: "ROAS أقل من متوسط الحملة، لكنه لا يكفي وحده للإيقاف بدون قراءة الفانل.",
    };
  }

  if (previousSummary.spend > 0 && summary.cpa > previousSummary.cpa * 1.25) {
    return {
      status: "WATCH",
      label: "الأداء يتراجع",
      tone: "amber",
      reason: "CPA ارتفع مقارنة بالفترة السابقة. راقب التكرار والمواضع.",
    };
  }

  return {
    status: "MONITOR",
    label: "مستقر مبدئياً",
    tone: "blue",
    reason: "الأداء لا يظهر مشكلة حادة. القرار القادم يعتمد على breakdowns والحجم الإحصائي.",
  };
}

function buildAdDetailRecommendations({
  summary,
  previousSummary,
  adSetSummary,
  campaignSummary,
  funnel,
  ad,
  campaign,
}) {
  const recommendations = [];

  if (summary.impressions === 0) {
    recommendations.push({
      priority: "HIGH",
      title: "ابدأ بالمزامنة أو توسيع الفترة",
      message:
        "لا توجد بيانات Delivery كافية. زامن الإعلان أو اختر فترة أطول قبل أي حكم.",
    });
  }

  if (summary.spend >= 100 && summary.purchases === 0) {
    recommendations.push({
      priority: "HIGH",
      title: "لا تزود الميزانية الآن",
      message:
        "فيه إنفاق بدون Purchase. افحص Pixel/CAPI، صفحة المنتج، العرض، وسعر الشحن قبل التوسيع.",
    });
  }

  if (summary.ctr > 0 && summary.ctr < 1) {
    recommendations.push({
      priority: "MEDIUM",
      title: "اختبر Hook وكريتيف جديد",
      message:
        "CTR منخفض. حضّر نسخة أول سطر أقوى وصورة/فيديو يوضح المنتج مباشرة.",
    });
  }

  if (summary.frequency > 3.5) {
    recommendations.push({
      priority: "MEDIUM",
      title: "راجع إرهاق الجمهور",
      message:
        "Frequency مرتفعة. جهز إعلان جديد أو وسّع الجمهور قبل ما CPA يزيد أكثر.",
    });
  }

  if (adSetSummary.cpa > 0 && summary.cpa > adSetSummary.cpa * 1.25) {
    recommendations.push({
      priority: "HIGH",
      title: "قارنه بباقي إعلانات المجموعة",
      message:
        "الإعلان أغلى من متوسط الـ Ad Set. لو الـ breakdowns لا تظهر شريحة رابحة، اختبر بديل أو أوقفه.",
    });
  }

  if (campaignSummary.roas > 0 && summary.roas > campaignSummary.roas * 1.25) {
    recommendations.push({
      priority: "MEDIUM",
      title: "مرشح لتوسيع تدريجي",
      message:
        "ROAS أعلى من متوسط الحملة. زوّد 15-20% فقط مع مراقبة CPA يومياً.",
    });
  }

  if (previousSummary.spend > 0 && summary.roas < previousSummary.roas * 0.75) {
    recommendations.push({
      priority: "MEDIUM",
      title: "راجع سبب التراجع",
      message:
        "ROAS تراجع مقارنة بالفترة السابقة. افتح تقسيم المواضع والعمر/الجنس لتحديد مصدر الهبوط.",
    });
  }

  if (/SALES|CONVERSIONS/i.test(campaign?.objective || "") && !campaign?.pixelId) {
    recommendations.push({
      priority: "HIGH",
      title: "Pixel غير واضح على حملة مبيعات",
      message:
        "الحملة هدفها مبيعات لكن Pixel غير مسجل محلياً؛ ده يضعف قراءة Purchase وROAS.",
    });
  }

  if (funnel?.diagnosis?.key && funnel.diagnosis.key !== "stable") {
    recommendations.push({
      priority: funnel.diagnosis.severity || "MEDIUM",
      title: funnel.diagnosis.title,
      message: funnel.diagnosis.message,
    });
  }

  if (!ad?.facebookAdId) {
    recommendations.push({
      priority: "MEDIUM",
      title: "الإعلان غير مربوط بمعرف Meta",
      message:
        "بدون Facebook Ad ID لن تظهر المعاينة أو breakdowns الدقيقة من Meta.",
    });
  }

  return recommendations.length > 0
    ? recommendations
    : [
        {
          priority: "LOW",
          title: "لا توجد مشكلة حادة الآن",
          message:
            "راقب الأداء يومياً وافتح breakdowns قبل أي رفع كبير في الميزانية.",
        },
      ];
}

function buildAdBreakdownRecommendations(rows, breakdown) {
  if (rows.length === 0) {
    return [
      {
        priority: "HIGH",
        title: "لا توجد بيانات تفصيلية لهذا التقسيم",
        message:
          "زامن الإعلان من Meta أو وسّع الفترة. بدون breakdown لا يمكن تحديد هل المشكلة جمهور أو موضع أو جهاز.",
      },
    ];
  }

  const recommendations = [];
  const wasteRow = rows.find(
    (row) => row.metrics.spend >= 50 && row.metrics.purchases === 0,
  );
  if (wasteRow) {
    recommendations.push({
      priority: "HIGH",
      title: `إنفاق بدون مشتريات: ${wasteRow.label}`,
      message:
        "هذه الشريحة تسحب من الميزانية دون Purchase. اختبر استبعادها أو افصل لها كريتيف/عرض مختلف.",
    });
  }

  const bestRow = rows.find((row) => row.metrics.purchases > 0);
  if (bestRow) {
    recommendations.push({
      priority: "MEDIUM",
      title: `أفضل شريحة حالياً: ${bestRow.label}`,
      message:
        "استخدم هذه الشريحة كنقطة مقارنة عند تقييم باقي الشرائح، ولا توسع قبل حجم عينة كاف.",
    });
  }

  if (breakdown === "placement") {
    recommendations.push({
      priority: "LOW",
      title: "لا تستبعد المواضع دفعة واحدة",
      message:
        "لو موضع ضعيف، اختبر نسخة كريتيف مناسبة له قبل تعطيله بالكامل.",
    });
  }

  return recommendations.length > 0
    ? recommendations
    : [
        {
          priority: "LOW",
          title: "التوزيع مستقر",
          message:
            "لا توجد شريحة واضحة تستنزف الميزانية في هذا التقسيم حالياً.",
        },
      ];
}

module.exports = {
  getInsightActionValue,
  aggregateMetaInsights,
  getPurchaseRoas,
  buildInsightPersistenceData,
  createEmptyPerformanceTotals,
  addInsightToTotals,
  addMetaInsightToTotals,
  withDerivedPerformance,
  buildPerformanceRecommendations,
  normalizeGeoPerformanceBreakdown,
  getGeoPerformanceLabel,
  buildGeoPerformanceRecommendations,
  normalizePerformanceBreakdown,
  getTranslatedGender,
  getTranslatedPublisherPlatform,
  getTranslatedPlatformPosition,
  getTranslatedDevicePlatform,
  getPerformanceBreakdownLabel,
  getPerformanceBreakdownKey,
  buildPerformanceBreakdownRecommendations,
  toIsoDateOnly,
  parseReportDateInput,
  normalizeReportDateRange,
  getPreviousDateRange,
  aggregatePersistedInsights,
  getMetaInsightsOrNull,
  percentChange,
  buildAdComparison,
  buildAdFunnel,
  buildAdVerdict,
  buildAdDetailRecommendations,
  buildAdBreakdownRecommendations,
};
