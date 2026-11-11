const axios = require('axios');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getMetaGraphApiVersion } = require('../config/metaApi');

/**
 * Page Insights Controller
 *
 * يغطي صلاحية Meta `read_insights` على مستوى الصفحة والمنشورات:
 *  1) قائمة الصفحات المتصلة (لاختيار الأصل بالاسم)
 *  2) إحصائيات الصفحة (impressions / engaged users / fans / views)
 *  3) إحصائيات آخر المنشورات
 *
 * كل استدعاءات Graph ملفوفة بـ try/catch ولا ترمي unhandled rejection أبداً.
 */

const LOG_PREFIX = '[PAGE-INSIGHTS]';
const GRAPH_TIMEOUT_MS = 30000;
const GRAPH_INFO_TIMEOUT_MS = 12000;

// Graph v23 deprecates several legacy Page metrics (page_impressions, page_engaged_users,
// page_fans are rejected with code 100). Verified live 2026-11-11 against a connected Page:
// valid = page_media_view, page_impressions_unique, page_post_engagements, page_views_total,
// page_video_views, page_follows.
const PAGE_INSIGHT_METRICS = [
  'page_media_view',
  'page_impressions_unique',
  'page_post_engagements',
  'page_views_total',
  'page_video_views',
  'page_follows'
];

const POST_INSIGHT_METRICS = [
  'post_impressions',
  'post_impressions_unique',
  'post_engaged_users',
  'post_clicks'
];

// aggregate: 'sum' للمقاييس التراكمية، 'last' للمقاييس اللحظية (gauge)
const METRIC_CATALOG = {
  page_media_view: {
    title: 'مرات الظهور',
    description: 'عدد المرات التي ظهرت فيها منشورات الصفحة على الشاشة',
    aggregate: 'sum'
  },
  page_impressions_unique: {
    title: 'مرات الظهور الفريدة',
    description: 'عدد الأشخاص الذين شاهدوا محتوى الصفحة',
    aggregate: 'sum'
  },
  page_video_views: {
    title: 'مشاهدات الفيديو',
    description: 'عدد مرات مشاهدة فيديوهات الصفحة',
    aggregate: 'sum'
  },
  page_follows: {
    title: 'إجمالي المتابعين',
    description: 'عدد المتابعين للصفحة (Follows) في نهاية الفترة',
    aggregate: 'last'
  },
  page_post_engagements: {
    title: 'تفاعلات المنشورات',
    description: 'عدد التفاعلات (إعجاب، تعليق، مشاركة) على منشورات الصفحة',
    aggregate: 'sum'
  },
  page_views_total: {
    title: 'مشاهدات الصفحة',
    description: 'عدد مرات مشاهدة صفحة Facebook',
    aggregate: 'sum'
  }
};

const POST_METRIC_LABELS = {
  post_impressions: 'مرات الظهور',
  post_impressions_unique: 'مرات الظهور الفريدة',
  post_engaged_users: 'المستخدمون المتفاعلون',
  post_clicks: 'النقرات'
};

const ALLOWED_PERIODS = ['day', 'week', 'days_28'];

/**
 * بعض مقاييس الصفحة غير متاحة لكل الصفحات (مثال: page_views_total يحتاج حداً
 * أدنى من المعجبين، والمقاييس القديمة لا تعمل على New Pages Experience).
 * لذلك نحاول المجموعة الكاملة ثم نتراجع تدريجياً حتى نضمن نتيجة قابلة للعرض.
 */
const METRIC_FALLBACK_SETS = [
  PAGE_INSIGHT_METRICS,
  ['page_media_view', 'page_impressions_unique', 'page_post_engagements'],
  ['page_media_view']
];

const graphBase = () => `https://graph.facebook.com/${getMetaGraphApiVersion()}`;

const logInfo = (message, extra) => {
  if (extra === undefined) {
    console.log(`${LOG_PREFIX} ${message}`);
    return;
  }
  console.log(`${LOG_PREFIX} ${message}`, extra);
};

const logError = (message, extra) => {
  if (extra === undefined) {
    console.error(`${LOG_PREFIX} ${message}`);
    return;
  }
  console.error(`${LOG_PREFIX} ${message}`, extra);
};

const clampDays = (rawDays) => {
  const parsed = parseInt(rawDays, 10);
  if (!Number.isFinite(parsed)) return 28;
  return Math.min(Math.max(parsed, 1), 90);
};

const resolvePeriod = (rawPeriod) => {
  const value = String(rawPeriod || 'day');
  return ALLOWED_PERIODS.includes(value) ? value : 'day';
};

const buildRange = (days) => {
  const until = new Date();
  const since = new Date(until.getTime() - days * 24 * 60 * 60 * 1000);
  return { since, until };
};

const toUnix = (date) => Math.floor(date.getTime() / 1000);

const toIsoDate = (date) => date.toISOString().slice(0, 10);

/**
 * قيمة مقياس من Graph قد تكون رقماً أو كائناً ({ value }) أو نصاً.
 */
const toMetricNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'object') {
    const candidate = value.value ?? value.total ?? value.count;
    const parsed = Number(candidate);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const extractGraphError = (error) => {
  const payload = error?.response?.data?.error;
  return {
    message:
      payload?.message ||
      error?.message ||
      'تعذر جلب البيانات من Meta Graph API',
    code: payload?.code ?? null,
    subcode: payload?.error_subcode ?? null,
    type: payload?.type ?? null,
    status: error?.response?.status ?? null
  };
};

const respondWithGraphError = (res, graphError, context) => {
  const normalized = extractGraphError(graphError);
  logError(`${context} failed:`, {
    message: normalized.message,
    code: normalized.code,
    subcode: normalized.subcode,
    status: normalized.status
  });

  return res.status(400).json({
    success: false,
    error: normalized.message,
    code: normalized.code,
    subcode: normalized.subcode,
    type: normalized.type,
    hint:
      normalized.code === 190
        ? 'انتهت صلاحية الاتصال بصفحة Facebook. يرجى إعادة الربط.'
        : normalized.code === 200 || normalized.code === 10
          ? 'تأكد من منح صلاحية read_insights و pages_read_engagement للتطبيق.'
          : 'تحقق من صلاحية read_insights على الصفحة المحددة.'
  });
};

const loadConnectedPage = async (companyId, pageId) => {
  return getSharedPrismaClient().facebookPage.findFirst({
    where: {
      pageId: pageId,
      companyId: companyId,
      status: 'connected'
    }
  });
};

/**
 * تجهيز بيانات الصفحة الأساسية (اسم + صورة + عدد المعجبين) — best effort
 * حتى لا نُسقط الطلب بالكامل إذا فشل استدعاء معلومات الصفحة.
 */
const fetchPageHeader = async (pageId, accessToken, fallbackName) => {
  const fallback = {
    id: pageId,
    name: fallbackName || pageId,
    fanCount: null,
    followersCount: null,
    picture: null
  };

  try {
    const response = await axios.get(`${graphBase()}/${pageId}`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,fan_count,followers_count,picture'
      },
      timeout: GRAPH_INFO_TIMEOUT_MS
    });

    return {
      id: response.data?.id || pageId,
      name: response.data?.name || fallbackName || pageId,
      fanCount:
        typeof response.data?.fan_count === 'number' ? response.data.fan_count : null,
      followersCount:
        typeof response.data?.followers_count === 'number'
          ? response.data.followers_count
          : null,
      picture: response.data?.picture?.data?.url || null
    };
  } catch (error) {
    const normalized = extractGraphError(error);
    logError(`page header failed for ${pageId}:`, {
      message: normalized.message,
      code: normalized.code
    });
    return fallback;
  }
};

/**
 * GET /api/v1/pages/insights
 * قائمة الصفحات المتصلة بالشركة — لتعبئة قائمة اختيار الأصل بالاسم.
 */
const getInsightsPages = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({
        success: false,
        error: 'مستخدم غير صالح'
      });
    }

    const pages = await getSharedPrismaClient().facebookPage.findMany({
      where: {
        companyId: companyId,
        status: 'connected'
      },
      select: {
        pageId: true,
        pageName: true,
        pageAccessToken: true,
        connectedAt: true
      },
      orderBy: {
        connectedAt: 'desc'
      }
    });

    const enriched = await Promise.all(
      pages.map(async (page) => {
        const header = await fetchPageHeader(
          page.pageId,
          page.pageAccessToken,
          page.pageName
        );

        return {
          pageId: page.pageId,
          pageName: page.pageName || header.name,
          followersCount: header.followersCount,
          fanCount: header.fanCount,
          picture: header.picture,
          connectedAt: page.connectedAt
        };
      })
    );

    logInfo(`listed ${enriched.length} connected pages for company ${companyId}`);

    return res.json({
      success: true,
      data: {
        pages: enriched,
        total: enriched.length
      }
    });
  } catch (error) {
    logError('getInsightsPages crashed:', error.message);
    return res.status(500).json({
      success: false,
      error: 'خطأ في الخادم',
      message: error.message
    });
  }
};

/**
 * GET /api/v1/pages/insights/:pageId?period=day|week|days_28&days=28
 */
const getPageInsights = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({
        success: false,
        error: 'مستخدم غير صالح'
      });
    }

    const { pageId } = req.params;
    const period = resolvePeriod(req.query.period);
    const days = clampDays(req.query.days);

    const page = await loadConnectedPage(companyId, pageId);
    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'صفحة Facebook غير موجودة أو غير متصلة'
      });
    }

    const accessToken = page.pageAccessToken;
    const { since, until } = buildRange(days);

    const pageHeader = await fetchPageHeader(pageId, accessToken, page.pageName);

    let graphResponse = null;
    let lastGraphError = null;
    let usedMetricSet = [];

    for (const metricSet of METRIC_FALLBACK_SETS) {
      try {
        graphResponse = await axios.get(`${graphBase()}/${pageId}/insights`, {
          params: {
            metric: metricSet.join(','),
            period: period,
            since: toUnix(since),
            until: toUnix(until),
            access_token: accessToken
          },
          timeout: GRAPH_TIMEOUT_MS
        });
        usedMetricSet = metricSet;
        break;
      } catch (graphError) {
        lastGraphError = graphError;
        const normalized = extractGraphError(graphError);
        logError(
          `insights attempt failed for page ${pageId} with ${metricSet.length} metrics:`,
          { message: normalized.message, code: normalized.code }
        );

        // أخطاء المصادقة/الصلاحيات لا يُفيد معها التراجع
        if (normalized.code === 190 || normalized.code === 10 || normalized.code === 200) {
          break;
        }
      }
    }

    if (!graphResponse) {
      return respondWithGraphError(
        res,
        lastGraphError,
        `insights for page ${pageId} (period=${period}, days=${days})`
      );
    }

    const rawMetrics = Array.isArray(graphResponse?.data?.data)
      ? graphResponse.data.data
      : [];

    const byName = new Map();
    rawMetrics.forEach((metric) => {
      if (!metric?.name) return;
      byName.set(metric.name, metric);
    });

    const metrics = PAGE_INSIGHT_METRICS.map((name) => {
      const catalog = METRIC_CATALOG[name] || {
        title: name,
        description: '',
        aggregate: 'sum'
      };
      const raw = byName.get(name);

      const values = Array.isArray(raw?.values)
        ? raw.values.map((entry) => ({
            endTime: entry?.end_time || null,
            value: toMetricNumber(entry?.value)
          }))
        : [];

      return {
        name,
        title: raw?.title || catalog.title,
        description: raw?.description || catalog.description,
        period: raw?.period || period,
        aggregate: catalog.aggregate,
        values
      };
    });

    // الإجمالي: مجموع القيم للمقاييس التراكمية، وآخر قيمة للمقاييس اللحظية.
    // المقياس غير المتاح على هذه الصفحة يبقى null ليظهر في الواجهة كـ "—".
    const totals = {};
    metrics.forEach((metric) => {
      if (!metric.values.length) {
        totals[metric.name] = null;
        return;
      }
      if (metric.aggregate === 'last') {
        totals[metric.name] = metric.values[metric.values.length - 1].value;
      } else {
        totals[metric.name] = metric.values.reduce(
          (sum, entry) => sum + entry.value,
          0
        );
      }
    });

    logInfo(
      `page insights ok: page=${pageId} period=${period} days=${days} metrics=${metrics.length} used=${usedMetricSet.length}`
    );

    return res.json({
      success: true,
      data: {
        page: pageHeader,
        range: {
          since: toIsoDate(since),
          until: toIsoDate(until),
          sinceTimestamp: toUnix(since),
          untilTimestamp: toUnix(until),
          days
        },
        period,
        requestedMetrics: PAGE_INSIGHT_METRICS,
        appliedMetrics: usedMetricSet,
        metrics,
        totals
      }
    });
  } catch (error) {
    logError('getPageInsights crashed:', error.message);
    return res.status(500).json({
      success: false,
      error: 'خطأ في الخادم',
      message: error.message
    });
  }
};

const fetchPostInsights = async (postId, accessToken) => {
  try {
    const response = await axios.get(`${graphBase()}/${postId}/insights`, {
      params: {
        metric: POST_INSIGHT_METRICS.join(','),
        access_token: accessToken
      },
      timeout: GRAPH_TIMEOUT_MS
    });

    const result = {};
    POST_INSIGHT_METRICS.forEach((name) => {
      result[name] = 0;
    });

    const rows = Array.isArray(response?.data?.data) ? response.data.data : [];
    rows.forEach((row) => {
      if (!row?.name) return;
      const entry = Array.isArray(row.values) ? row.values[0] : null;
      result[row.name] = toMetricNumber(entry?.value);
    });

    return { ok: true, insights: result, error: null };
  } catch (error) {
    const normalized = extractGraphError(error);
    logError(`post insights failed for ${postId}:`, {
      message: normalized.message,
      code: normalized.code
    });
    return {
      ok: false,
      insights: null,
      error: normalized.message,
      code: normalized.code
    };
  }
};

/**
 * GET /api/v1/pages/insights/:pageId/posts?postId=xxx
 * إحصائيات آخر 10 منشورات (أو منشور واحد عند تمرير postId).
 */
const getPostInsights = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({
        success: false,
        error: 'مستخدم غير صالح'
      });
    }

    const { pageId } = req.params;
    const singlePostId = req.query.postId ? String(req.query.postId) : null;

    const page = await loadConnectedPage(companyId, pageId);
    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'صفحة Facebook غير موجودة أو غير متصلة'
      });
    }

    const accessToken = page.pageAccessToken;
    const pageHeader = await fetchPageHeader(pageId, accessToken, page.pageName);

    if (singlePostId) {
      const single = await fetchPostInsights(singlePostId, accessToken);
      if (!single.ok) {
        return res.status(400).json({
          success: false,
          error: single.error,
          code: single.code
        });
      }

      return res.json({
        success: true,
        data: {
          page: pageHeader,
          posts: [
            {
              id: singlePostId,
              message: '',
              createdTime: null,
              permalinkUrl: null,
              insights: single.insights,
              error: null
            }
          ]
        }
      });
    }

    let postsResponse;
    try {
      postsResponse = await axios.get(`${graphBase()}/${pageId}/posts`, {
        params: {
          access_token: accessToken,
          fields: 'id,message,created_time,permalink_url',
          limit: 10
        },
        timeout: GRAPH_TIMEOUT_MS
      });
    } catch (graphError) {
      return respondWithGraphError(res, graphError, `posts for page ${pageId}`);
    }

    const rawPosts = Array.isArray(postsResponse?.data?.data)
      ? postsResponse.data.data
      : [];

    const settled = await Promise.allSettled(
      rawPosts.map((post) => fetchPostInsights(post.id, accessToken))
    );

    const posts = rawPosts.map((post, index) => {
      const outcome = settled[index];
      const meta =
        outcome && outcome.status === 'fulfilled'
          ? outcome.value
          : {
              ok: false,
              insights: null,
              error: 'تعذر جلب إحصائيات المنشور',
              code: null
            };

      return {
        id: post.id,
        message: post.message || '',
        createdTime: post.created_time || null,
        permalinkUrl: post.permalink_url || null,
        insights: meta.insights,
        error: meta.ok ? null : meta.error
      };
    });

    logInfo(`post insights ok: page=${pageId} posts=${posts.length}`);

    return res.json({
      success: true,
      data: {
        page: pageHeader,
        labels: POST_METRIC_LABELS,
        posts
      }
    });
  } catch (error) {
    logError('getPostInsights crashed:', error.message);
    return res.status(500).json({
      success: false,
      error: 'خطأ في الخادم',
      message: error.message
    });
  }
};

module.exports = {
  getInsightsPages,
  getPageInsights,
  getPostInsights,
  PAGE_INSIGHT_METRICS,
  POST_INSIGHT_METRICS
};
