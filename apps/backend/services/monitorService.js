const { getSharedPrismaClient } = require('./sharedDatabase');

// Productive & Unproductive Recognition Dictionaries
const PRODUCTIVE_APP_PATTERNS = [
  'code', 'vscode', 'visual studio', 'cursor', 'pycharm', 'webstorm', 'intellij',
  'terminal', 'cmd', 'powershell', 'excel', 'word', 'powerpoint', 'figma', 'photoshop',
  'illustrator', 'slack', 'teams', 'outlook', 'postman', 'datagrip', 'pgadmin',
  'zoom', 'webex', 'notion', 'clickup', 'linear', 'jira', 'trello', 'calc', 'dbeaver',
  'insomnia', 'workbench', 'sublime', 'atom', 'thunderbird', 'onenote'
];

const UNPRODUCTIVE_APP_PATTERNS = [
  'game', 'steam', 'epic games', 'discord', 'riot', 'valorant', 'fifa', 'gta',
  'pubg', 'roblox', 'minecraft', 'league of legends', 'battlenet', 'origin'
];

const PRODUCTIVE_WEB_PATTERNS = [
  'github.com', 'gitlab.com', 'stackoverflow.com', 'maxp.online', 'docs.google.com',
  'notion.so', 'linear.app', 'jira.', 'confluence.', 'meet.google.com', 'zoom.us',
  'chatgpt.com', 'claude.ai', 'deepseek.com', 'perplexity.ai', 'salla.sa', 'zid.sa',
  'shopify.com', 'business.facebook.com', 'ads.tiktok.com', 'ads.google.com',
  'bosta.co', 'aramex.com', 'mylerz.com', 'figma.com', 'canva.com', 'aws.amazon.com',
  'vercel.com', 'supabase.com', 'stripe.com', 'paypal.com', 'sheets.google.com',
  'drive.google.com', 'mail.google.com', 'web.whatsapp.com', 'web.telegram.org'
];

const UNPRODUCTIVE_WEB_PATTERNS = [
  'facebook.com', 'instagram.com', 'tiktok.com', 'twitter.com', 'x.com', 'reddit.com',
  'netflix.com', 'youtube.com', 'twitch.tv', 'pinterest.com', 'dailymotion.com',
  'hulu.com', 'disneyplus.com', 'primevideo.com', 'shahid.mbc.net'
];

function classifyItemCategory(name, type, customCategories = []) {
  if (!name || typeof name !== 'string') return 'unrated';
  const lower = name.toLowerCase().trim();

  // 1. Custom category rules configured in MonitorAppCategory
  if (customCategories && customCategories.length > 0) {
    const match = customCategories.find(c =>
      c.type === type && lower.includes(c.name.toLowerCase().trim())
    );
    if (match && ['productive', 'neutral', 'unproductive'].includes(match.category)) {
      return match.category;
    }
  }

  // 2. Standard Pattern Recognition
  if (type === 'app') {
    if (PRODUCTIVE_APP_PATTERNS.some(p => lower.includes(p))) return 'productive';
    if (UNPRODUCTIVE_APP_PATTERNS.some(p => lower.includes(p))) return 'unproductive';
  } else {
    // Special handling for meta ads/business vs regular social browsing
    if (lower.includes('business.facebook.com') || lower.includes('ads.facebook.com')) return 'productive';
    if (PRODUCTIVE_WEB_PATTERNS.some(p => lower.includes(p))) return 'productive';
    if (UNPRODUCTIVE_WEB_PATTERNS.some(p => lower.includes(p))) return 'unproductive';
  }

  return 'unrated';
}

function calculateLateStartSeconds(clockInTime, firstActivityTime, isToday = false) {
  if (!clockInTime) return 0;
  const inMs = new Date(clockInTime).getTime();
  if (isNaN(inMs)) return 0;

  if (firstActivityTime) {
    const actMs = new Date(firstActivityTime).getTime();
    if (!isNaN(actMs)) {
      const diffMs = actMs - inMs;
      return diffMs > 0 ? Math.floor(diffMs / 1000) : 0;
    }
  }

  // If clocked in today but no activity has been detected yet
  if (isToday) {
    const diffMs = Date.now() - inMs;
    return diffMs > 0 ? Math.floor(diffMs / 1000) : 0;
  }

  return 0;
}

function calculateTotalClockSeconds(clockInTime, clockOutTime, isToday = false) {
  if (!clockInTime) return 0;
  const inMs = new Date(clockInTime).getTime();
  if (isNaN(inMs)) return 0;

  let outMs = clockOutTime ? new Date(clockOutTime).getTime() : 0;
  if (!outMs || isNaN(outMs)) {
    if (isToday) {
      outMs = Date.now();
    } else {
      // Past day missing punch-out: cap at standard 9-hour shift
      outMs = inMs + (9 * 3600 * 1000);
    }
  }

  if (outMs > inMs) {
    const sec = Math.floor((outMs - inMs) / 1000);
    return Math.max(0, Math.min(12 * 3600, sec)); // cap at 12h
  }
  return 0;
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * معادلة الإنتاجية المرجحة المتوازنة (Balanced Weighted Productivity Formula)
 * ══════════════════════════════════════════════════════════════════════════════
 * ProductivityScore = (S_active * 0.25) + (S_tools * 0.35) + (S_output * 0.40) - P_unproductive - P_overdue
 */
function computeProductivityScore({
  totalActiveSeconds = 0,
  totalClockSeconds = 0,
  totalProductiveSeconds = 0,
  totalUnproductiveSeconds = 0,
  avgActivityScore = 0,
  completedTasksCount = 0,
  openTasksCount = 0,
  overdueTasksCount = 0,
}) {
  if (totalActiveSeconds === 0 && totalClockSeconds === 0 && completedTasksCount === 0) {
    return 0;
  }

  // 1. Presence & Interaction Factor (S_active - Weight: 25%)
  const effectiveClock = totalClockSeconds > 0 ? totalClockSeconds : Math.max(totalActiveSeconds, 6 * 3600);
  const activeRatio = Math.min(100, Math.round((totalActiveSeconds / effectiveClock) * 100));
  const sActive = Math.round((activeRatio * 0.6) + (Math.min(100, Math.max(0, avgActivityScore)) * 0.4));

  // 2. Productive Tools Usage Factor (S_tools - Weight: 35%)
  let sTools = 70; // Fair neutral baseline if tool tracking hasn't gathered sufficient data
  const totalTrackedTools = totalProductiveSeconds + totalUnproductiveSeconds;
  if (totalTrackedTools > 0 || totalActiveSeconds >= 1800) {
    const denom = Math.max(totalTrackedTools, totalActiveSeconds, 1800);
    sTools = Math.min(100, Math.round((totalProductiveSeconds / denom) * 100));
  }

  // 3. Output & Task Completion Factor (S_output - Weight: 40%)
  let sOutput = 50;
  if (completedTasksCount === 0) {
    sOutput = openTasksCount > 0 ? 60 : 70; // 70 if no tasks assigned to avoid penalizing employees outside task system
  } else if (completedTasksCount === 1) {
    sOutput = 75;
  } else if (completedTasksCount === 2) {
    sOutput = 85;
  } else {
    sOutput = Math.min(100, 90 + Math.min(10, completedTasksCount * 2));
  }

  // Bonus for output speed (tasks per active hour)
  const activeHours = totalActiveSeconds / 3600;
  if (activeHours >= 0.5 && completedTasksCount > 0) {
    const rate = completedTasksCount / activeHours;
    if (rate >= 1.0) sOutput = Math.min(100, sOutput + 5);
  }

  // 4. Penalties
  // Unproductive tool penalty: 10 pts per hour on non-work apps/sites, max 25 pts
  const pUnproductive = Math.min(25, Math.round((totalUnproductiveSeconds / 3600) * 10));
  // Overdue task penalty: 5 pts per overdue task, max 20 pts
  const pOverdue = Math.min(20, overdueTasksCount * 5);

  // Weighted sum
  const rawScore = (sActive * 0.25) + (sTools * 0.35) + (sOutput * 0.40) - pUnproductive - pOverdue;

  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

/**
 * تقييم التشخيص والإشارات التشغيلية (Layer 3 Operational Signals)
 */
function evaluateOperationalSignal({
  totalActiveSeconds = 0,
  totalClockSeconds = 0,
  completedTasksCount = 0,
  openTasksCount = 0,
  overdueTasksCount = 0,
  activeRatio = 0,
}) {
  // 1. مشكلة توزيع مهام (نشاط منخفض + مهام متأخرة كتير) -> التنبيه للمدير مش للموظف
  if (overdueTasksCount >= 2 && (activeRatio < 40 || totalActiveSeconds < 3 * 3600)) {
    return {
      type: 'TASK_OVERLOAD',
      label: 'مشكلة توزيع مهام',
      severity: 'warning',
      target: 'MANAGER',
      badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 ring-1 ring-amber-500/30',
      reason: 'الموظف يواجه تراكماً في المهام المتأخرة مع انخفاض النشاط على الجهاز، ما يشير إلى حمل عمل يفوق طاقته أو تعثر في التكليفات. يُوصى بمراجعة توزيع المهام وليس مساءلة الموظف.'
    };
  }

  // 2. تشتت (نشاط عالي + مخرجات صفر)
  if ((totalActiveSeconds >= 3 * 3600 || activeRatio >= 60) && completedTasksCount === 0 && (openTasksCount > 0 || totalClockSeconds >= 4 * 3600)) {
    return {
      type: 'DISTRACTION',
      label: 'تشتت / نشاط بلا مخرجات',
      severity: 'warning',
      target: 'EMPLOYEE_AND_MANAGER',
      badgeClass: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300 ring-1 ring-orange-500/30',
      reason: 'رصد حركة ونشاط مكثف على الجهاز طوال اليوم دون تسليم أو إنجاز أي مخرجات موثقة، ما يشير إلى استغراق في تفاصيل جانبية أو تشتت في الأولويات.'
    };
  }

  // 3. إهمال (نشاط منخفض + مخرجات صفر) -> الحالة الوحيدة التي تستحق تدخلاً ومساءلة مباشرة
  if (totalClockSeconds >= 3 * 3600 && totalActiveSeconds < 1.5 * 3600 && activeRatio < 25 && completedTasksCount === 0) {
    return {
      type: 'NEGLECT',
      label: 'إهمال / ضعف الفاعلية',
      severity: 'critical',
      target: 'DIRECT_INTERVENTION',
      badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 ring-1 ring-rose-500/30',
      reason: 'انخفاض حاد في النشاط الموثق مع انعدام تام للمخرجات أثناء ساعات الدوام المسجلة بالبصمة (الحالة التي تستدعي تدخلاً ومتابعة مباشرة).'
    };
  }

  // 4. شغل خارج الجهاز (نشاط منخفض + مخرجات طبيعية) -> لا يُصنف كإهمال
  if (totalActiveSeconds < 3 * 3600 && completedTasksCount >= 1) {
    return {
      type: 'OFF_DEVICE_WORK',
      label: 'شغل خارج الجهاز / ميداني',
      severity: 'info',
      target: 'INFO_ONLY',
      badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 ring-1 ring-blue-500/30',
      reason: 'نشاط محدود على الجهاز مع تحقيق إنجاز ملموس للمهام، ما يشير إلى طبيعة عمل ميداني أو اجتماعات أو اتصالات وتنسيق خارجي (لا يُعد إهمالاً).'
    };
  }

  // 5. أداء منضبط
  return {
    type: 'STEADY_PERFORMANCE',
    label: 'أداء منضبط ومستقر',
    severity: 'success',
    target: 'NONE',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 ring-1 ring-emerald-500/30',
    reason: 'توازن سليم بين التفاعل على الجهاز واستثمار الوقت وإنجاز المهام المطلوبة.'
  };
}

class MonitorService {
  constructor() {
    this.prisma = getSharedPrismaClient();
    this.calculateLateStartSeconds = calculateLateStartSeconds;
    this.calculateTotalClockSeconds = calculateTotalClockSeconds;
    this.computeProductivityScore = computeProductivityScore;
    this.evaluateOperationalSignal = evaluateOperationalSignal;
    this.classifyItemCategory = classifyItemCategory;
  }

  async processActivityBatch(companyId, employeeId, activities) {
    if (!activities || !activities.length) return { count: 0 };
    const res = await this.prisma.monitorActivityLog.createMany({
      data: activities.map(a => ({
        companyId,
        employeeId,
        intervalStart: new Date(a.intervalStart),
        intervalEnd: new Date(a.intervalEnd),
        mouseEvents: Number(a.mouseEvents || 0),
        keyboardEvents: Number(a.keyboardEvents || 0),
        activeSeconds: Number(a.activeSeconds || 0),
        activityScore: Number(a.activityScore || 0),
        status: a.status || 'active',
      }))
    });

    try {
      await this.updateDailySummaryFromActivity(companyId, employeeId, activities);
    } catch (e) {
      console.error('[MonitorService] Failed to update daily summary:', e.message);
    }

    return res;
  }

  async updateDailySummaryFromActivity(companyId, employeeId, activities) {
    if (!activities || !activities.length) return;

    try {
      // Use the actual interval timestamp rather than server's current arrival time
      const firstIntervalStart = activities[0].intervalStart ? new Date(activities[0].intervalStart) : new Date();
      const dateStr = (isNaN(firstIntervalStart.getTime()) ? new Date() : firstIntervalStart).toISOString().split('T')[0];
      const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
      const isToday = dateStr === new Date().toISOString().split('T')[0];

      // 1. Resolve candidate IDs
      const [emp, usr] = await Promise.all([
        this.prisma.employee.findFirst({
          where: { companyId, OR: [{ id: employeeId }, { userId: employeeId }] },
          select: { id: true, userId: true, firstName: true, lastName: true }
        }).catch(() => null),
        this.prisma.user.findFirst({
          where: { companyId, id: employeeId },
          select: { id: true, firstName: true, lastName: true }
        }).catch(() => null)
      ]);

      const canonicalEmployeeId = emp?.id || employeeId;
      const candidateIds = Array.from(new Set([employeeId, canonicalEmployeeId, emp?.userId, usr?.id].filter(Boolean)));

      // 2. Fetch attendance, app usages, web usages, and tasks
      const [attendance, existing, appUsages, webUsages, tasks, customCategories] = await Promise.all([
        this.prisma.attendance.findFirst({
          where: {
            companyId,
            OR: [{ userId: { in: candidateIds } }, { employeeRelId: { in: candidateIds } }],
            date: { gte: targetDate, lte: new Date(`${dateStr}T23:59:59.999Z`) }
          },
          orderBy: { checkIn: 'asc' }
        }).catch(() => null),
        this.prisma.monitorDailySummary.findUnique({
          where: {
            companyId_employeeId_date: {
              companyId,
              employeeId: canonicalEmployeeId,
              date: targetDate,
            },
          },
        }).catch(() => null),
        this.prisma.monitorAppUsage.findMany({
          where: {
            companyId,
            employeeId: { in: candidateIds },
            OR: [
              { date: { gte: targetDate, lte: new Date(`${dateStr}T23:59:59.999Z`) } },
              { startedAt: { gte: targetDate, lte: new Date(`${dateStr}T23:59:59.999Z`) } }
            ]
          },
          select: { appName: true, category: true, durationSeconds: true }
        }).catch(() => []),
        this.prisma.monitorWebUsage.findMany({
          where: {
            companyId,
            employeeId: { in: candidateIds },
            OR: [
              { date: { gte: targetDate, lte: new Date(`${dateStr}T23:59:59.999Z`) } },
              { startedAt: { gte: targetDate, lte: new Date(`${dateStr}T23:59:59.999Z`) } }
            ]
          },
          select: { domain: true, url: true, category: true, durationSeconds: true }
        }).catch(() => []),
        this.prisma.task.findMany({
          where: { companyId, assignedTo: { in: candidateIds } },
          select: { id: true, status: true, dueDate: true, completedDate: true, updatedAt: true }
        }).catch(() => []),
        this.prisma.monitorAppCategory.findMany({ where: { companyId } }).catch(() => [])
      ]);

      const totalActive = activities.reduce((sum, a) => sum + (Number(a.activeSeconds) || 0), 0);

      // Calculate total idle seconds for this batch (clamped to max 300s per interval)
      const totalIdle = activities.reduce((sum, a) => {
        const startMs = a.intervalStart ? new Date(a.intervalStart).getTime() : 0;
        const endMs = a.intervalEnd ? new Date(a.intervalEnd).getTime() : 0;
        const active = Number(a.activeSeconds) || 0;
        if (startMs && endMs && endMs > startMs) {
          const intervalSec = Math.min(300, Math.max(1, Math.floor((endMs - startMs) / 1000)));
          return sum + Math.max(0, intervalSec - active);
        }
        return sum;
      }, 0);

      const avgScore = activities.reduce((sum, a) => sum + (Number(a.activityScore) || 0), 0) / activities.length;

      let runningAvg = Math.round(avgScore);
      if (existing && existing.totalActiveSeconds > 0) {
        const prevWeight = existing.totalActiveSeconds;
        const newWeight = Math.max(1, totalActive);
        runningAvg = Math.round(((existing.avgActivityScore * prevWeight) + (avgScore * newWeight)) / (prevWeight + newWeight));
      }

      // Timing calculations
      const firstActivityTime = existing?.firstActivityTime || firstIntervalStart;
      const lastActivityTime = new Date();
      const clockInTime = attendance?.checkIn || existing?.clockInTime || null;
      const clockOutTime = attendance?.checkOut || existing?.clockOutTime || null;

      const lateStartSeconds = calculateLateStartSeconds(clockInTime, firstActivityTime, isToday);
      const totalClockSeconds = calculateTotalClockSeconds(clockInTime, clockOutTime, isToday);

      // Categorize apps and web duration
      let prodSec = 0;
      let unprodSec = 0;
      for (const a of appUsages) {
        const cat = (a.category && a.category !== 'unrated')
          ? a.category
          : classifyItemCategory(a.appName, 'app', customCategories);
        const dur = Number(a.durationSeconds) || 0;
        if (cat === 'productive') prodSec += dur;
        else if (cat === 'unproductive') unprodSec += dur;
      }
      for (const w of webUsages) {
        const cat = (w.category && w.category !== 'unrated')
          ? w.category
          : classifyItemCategory(w.domain || w.url, 'web', customCategories);
        const dur = Number(w.durationSeconds) || 0;
        if (cat === 'productive') prodSec += dur;
        else if (cat === 'unproductive') unprodSec += dur;
      }

      const totalActiveTotal = (existing?.totalActiveSeconds || 0) + totalActive;
      const totalIdleTotal = (existing?.totalIdleSeconds || 0) + totalIdle;
      const maxPossibleSession = totalClockSeconds > 0 ? totalClockSeconds : Math.max(totalActiveTotal + totalIdleTotal, 8 * 3600);
      const totalProductiveSeconds = Math.min(maxPossibleSession, Math.max(existing?.totalProductiveSeconds || 0, prodSec));
      const totalUnproductiveSeconds = Math.min(maxPossibleSession, Math.max(existing?.totalUnproductiveSeconds || 0, unprodSec));

      // Task metrics
      let completedTasksCount = 0;
      let openTasksCount = 0;
      let overdueTasksCount = 0;
      for (const t of tasks) {
        if (['COMPLETED', 'IN_REVIEW'].includes(t.status)) {
          const compDate = t.completedDate ? new Date(t.completedDate) : (t.updatedAt ? new Date(t.updatedAt) : null);
          if (compDate && compDate >= targetDate && compDate <= new Date(`${dateStr}T23:59:59.999Z`)) {
            completedTasksCount++;
          }
        } else if (t.status !== 'CANCELLED') {
          openTasksCount++;
          if (t.dueDate && new Date(t.dueDate) < new Date(`${dateStr}T23:59:59.999Z`)) {
            overdueTasksCount++;
          }
        }
      }

      // New balanced productivity score
      const newProdScore = computeProductivityScore({
        totalActiveSeconds: totalActiveTotal,
        totalClockSeconds,
        totalProductiveSeconds,
        totalUnproductiveSeconds,
        avgActivityScore: runningAvg,
        completedTasksCount,
        openTasksCount,
        overdueTasksCount,
      });

      const activeRatio = totalClockSeconds > 0
        ? Math.min(100, Math.round((totalActiveTotal / totalClockSeconds) * 100))
        : (totalActiveTotal > 0 ? 100 : 0);

      const operationalSignal = evaluateOperationalSignal({
        totalActiveSeconds: totalActiveTotal,
        totalClockSeconds,
        completedTasksCount,
        openTasksCount,
        overdueTasksCount,
        activeRatio,
      });

      await this.prisma.monitorDailySummary.upsert({
        where: {
          companyId_employeeId_date: {
            companyId,
            employeeId: canonicalEmployeeId,
            date: targetDate,
          },
        },
        update: {
          totalActiveSeconds: { increment: totalActive },
          totalIdleSeconds: { increment: totalIdle },
          clockInTime,
          clockOutTime,
          firstActivityTime,
          lastActivityTime,
          lateStartSeconds,
          totalClockSeconds,
          totalProductiveSeconds,
          totalUnproductiveSeconds,
          avgActivityScore: runningAvg,
          productivityScore: newProdScore,
        },
        create: {
          companyId,
          employeeId: canonicalEmployeeId,
          date: targetDate,
          clockInTime,
          clockOutTime,
          firstActivityTime,
          lastActivityTime,
          lateStartSeconds,
          totalClockSeconds,
          totalProductiveSeconds,
          totalUnproductiveSeconds,
          totalActiveSeconds: totalActive,
          totalIdleSeconds: totalIdle,
          productivityScore: newProdScore,
          avgActivityScore: runningAvg,
        },
      });

      // Operational Alert generation
      const empName = emp ? [emp.firstName, emp.lastName].filter(Boolean).join(' ') : (usr?.firstName || canonicalEmployeeId);
      await this.ensureOperationalAlerts(companyId, canonicalEmployeeId, {
        empName,
        clockInTime,
        firstActivityTime,
        lateStartSeconds,
        operationalSignal,
        overdueTasksCount,
        completedTasksCount,
        dateStr
      });
    } catch (err) {
      console.error('[MonitorService] Failed to update daily summary from activity:', err.message);
    }
  }

  async processAppUsageBatch(companyId, employeeId, appData) {
    if (!appData || !appData.length) return { count: 0 };
    const capped = appData.slice(0, 500);

    // Fetch tenant custom categories for classification
    const customCategories = await this.prisma.monitorAppCategory.findMany({
      where: { companyId }
    }).catch(() => []);

    let batchProdSec = 0;
    let batchUnprodSec = 0;

    const records = capped.map(a => {
      const startedAt = a.startedAt ? new Date(a.startedAt) : new Date();
      const dateStr = (isNaN(startedAt.getTime()) ? new Date() : startedAt).toISOString().split('T')[0];
      const utcDate = new Date(`${dateStr}T00:00:00.000Z`);

      // Resolve category
      let category = a.category;
      if (!category || category === 'unrated') {
        category = classifyItemCategory(a.appName, 'app', customCategories);
      }
      if (!['productive', 'neutral', 'unproductive', 'unrated'].includes(category)) {
        category = 'unrated';
      }

      const dur = Math.max(0, Math.min(86400, Number(a.durationSeconds || 0)));
      if (category === 'productive') batchProdSec += dur;
      else if (category === 'unproductive') batchUnprodSec += dur;

      return {
        companyId,
        employeeId,
        appName: String(a.appName || 'Unknown').slice(0, 100),
        windowTitle: a.windowTitle ? String(a.windowTitle).slice(0, 255) : null,
        category,
        durationSeconds: dur,
        startedAt,
        endedAt: a.endedAt ? new Date(a.endedAt) : null,
        date: a.date ? new Date(a.date) : utcDate,
      };
    });

    const res = await this.prisma.monitorAppUsage.createMany({ data: records });

    // Update productive/unproductive seconds on daily summary
    if ((batchProdSec > 0 || batchUnprodSec > 0) && records.length > 0) {
      try {
        const targetDate = records[0].date;
        await this.prisma.monitorDailySummary.updateMany({
          where: { companyId, employeeId, date: targetDate },
          data: {
            totalProductiveSeconds: { increment: batchProdSec },
            totalUnproductiveSeconds: { increment: batchUnprodSec },
          }
        });
      } catch (e) {
        console.warn('[MonitorService] Could not increment productive seconds for app batch:', e.message);
      }
    }

    return res;
  }

  async processWebUsageBatch(companyId, employeeId, webData) {
    if (!webData || !webData.length) return { count: 0 };
    const capped = webData.slice(0, 500);

    // Fetch tenant custom categories for classification
    const customCategories = await this.prisma.monitorAppCategory.findMany({
      where: { companyId }
    }).catch(() => []);

    let batchProdSec = 0;
    let batchUnprodSec = 0;

    const records = capped.map(w => {
      const startedAt = w.startedAt ? new Date(w.startedAt) : new Date();
      const dateStr = (isNaN(startedAt.getTime()) ? new Date() : startedAt).toISOString().split('T')[0];
      const utcDate = new Date(`${dateStr}T00:00:00.000Z`);

      // Resolve category
      let category = w.category;
      if (!category || category === 'unrated') {
        category = classifyItemCategory(w.domain || w.url, 'web', customCategories);
      }
      if (!['productive', 'neutral', 'unproductive', 'unrated'].includes(category)) {
        category = 'unrated';
      }

      const dur = Math.max(0, Math.min(86400, Number(w.durationSeconds || 0)));
      if (category === 'productive') batchProdSec += dur;
      else if (category === 'unproductive') batchUnprodSec += dur;

      return {
        companyId,
        employeeId,
        url: String(w.url || w.domain || '').slice(0, 500),
        domain: String(w.domain || '').slice(0, 150),
        pageTitle: w.pageTitle ? String(w.pageTitle).slice(0, 255) : null,
        category,
        durationSeconds: dur,
        startedAt,
        endedAt: w.endedAt ? new Date(w.endedAt) : null,
        date: w.date ? new Date(w.date) : utcDate,
      };
    });

    const res = await this.prisma.monitorWebUsage.createMany({ data: records });

    // Update productive/unproductive seconds on daily summary
    if ((batchProdSec > 0 || batchUnprodSec > 0) && records.length > 0) {
      try {
        const targetDate = records[0].date;
        await this.prisma.monitorDailySummary.updateMany({
          where: { companyId, employeeId, date: targetDate },
          data: {
            totalProductiveSeconds: { increment: batchProdSec },
            totalUnproductiveSeconds: { increment: batchUnprodSec },
          }
        });
      } catch (e) {
        console.warn('[MonitorService] Could not increment productive seconds for web batch:', e.message);
      }
    }

    return res;
  }

  async updateHeartbeat(companyId, employeeId, deviceInfo = {}) {
    const existing = await this.prisma.monitorDeviceSession.findFirst({
      where: { companyId, employeeId, isOnline: true },
      orderBy: { lastHeartbeat: 'desc' }
    });

    // Reuse session if updated within the last 4 hours
    if (existing && (Date.now() - new Date(existing.lastHeartbeat).getTime() < 4 * 3600 * 1000)) {
      return this.prisma.monitorDeviceSession.update({
        where: { id: existing.id },
        data: {
          lastHeartbeat: new Date(),
          deviceName: deviceInfo.deviceName ? String(deviceInfo.deviceName).slice(0, 100) : existing.deviceName,
          osVersion: deviceInfo.osVersion ? String(deviceInfo.osVersion).slice(0, 100) : existing.osVersion,
          appVersion: deviceInfo.appVersion ? String(deviceInfo.appVersion).slice(0, 50) : existing.appVersion,
        }
      });
    }

    return this.prisma.monitorDeviceSession.create({
      data: {
        companyId,
        employeeId,
        deviceName: deviceInfo.deviceName ? String(deviceInfo.deviceName).slice(0, 100) : 'Desktop Device',
        osVersion: deviceInfo.osVersion ? String(deviceInfo.osVersion).slice(0, 100) : null,
        appVersion: deviceInfo.appVersion ? String(deviceInfo.appVersion).slice(0, 50) : null,
        lastHeartbeat: new Date(),
        isOnline: true
      }
    });
  }

  async endDeviceSession(companyId, employeeId, reason = 'MANUAL_CLOSE') {
    try {
      return await this.prisma.monitorDeviceSession.updateMany({
        where: { companyId, employeeId, isOnline: true },
        data: {
          isOnline: false,
          lastHeartbeat: new Date(),
        }
      });
    } catch (err) {
      console.warn('[MonitorService] Could not update device session end:', err.message);
      return null;
    }
  }

  async getDailySummary(companyId, employeeId, date, alternateEmployeeId = null) {
    const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
    let summary = await this.prisma.monitorDailySummary.findUnique({
      where: { companyId_employeeId_date: { companyId, employeeId, date: targetDate } }
    });
    if (!summary && alternateEmployeeId && alternateEmployeeId !== employeeId) {
      summary = await this.prisma.monitorDailySummary.findUnique({
        where: { companyId_employeeId_date: { companyId, employeeId: alternateEmployeeId, date: targetDate } }
      });
    }
    return summary;
  }

  computeBreaksFromActivities(activities) {
    if (!activities || !activities.length) {
      return { totalBreaksCount: 0, totalBreakSeconds: 0, totalBreakMinutes: 0, breaks: [] };
    }

    const sorted = [...activities].sort((a, b) => new Date(a.intervalStart).getTime() - new Date(b.intervalStart).getTime());
    const rawBreaks = [];
    let currentBreak = null;

    for (let i = 0; i < sorted.length; i++) {
      const act = sorted[i];
      const startMs = new Date(act.intervalStart).getTime();
      const endMs = new Date(act.intervalEnd).getTime();
      const actSec = Number(act.activeSeconds) || 0;
      const score = Number(act.activityScore) || 0;
      const isIdleInterval = actSec === 0 || act.status === 'idle' || score < 20;

      // Check if there was an untracked gap of >= 3 minutes before this interval
      if (i > 0) {
        const prevEndMs = new Date(sorted[i - 1].intervalEnd).getTime();
        const gapSec = Math.floor((startMs - prevEndMs) / 1000);
        if (gapSec >= 180) {
          if (currentBreak) {
            const dur = Math.floor((currentBreak.endMs - currentBreak.startMs) / 1000);
            if (dur >= 300) {
              rawBreaks.push({
                startMs: currentBreak.startMs,
                endMs: currentBreak.endMs,
                durationSeconds: dur,
                isGap: false,
              });
            }
            currentBreak = null;
          }
          rawBreaks.push({
            startMs: prevEndMs,
            endMs: startMs,
            durationSeconds: gapSec,
            isGap: true,
          });
        }
      }

      if (isIdleInterval) {
        if (!currentBreak) {
          currentBreak = { startMs, endMs };
        } else {
          currentBreak.endMs = Math.max(currentBreak.endMs, endMs);
        }
      } else {
        if (currentBreak) {
          const durationSec = Math.floor((currentBreak.endMs - currentBreak.startMs) / 1000);
          if (durationSec >= 300) {
            rawBreaks.push({
              startMs: currentBreak.startMs,
              endMs: currentBreak.endMs,
              durationSeconds: durationSec,
              isGap: false,
            });
          }
          currentBreak = null;
        }
      }
    }

    if (currentBreak) {
      const durationSec = Math.floor((currentBreak.endMs - currentBreak.startMs) / 1000);
      if (durationSec >= 300) {
        rawBreaks.push({
          startMs: currentBreak.startMs,
          endMs: currentBreak.endMs,
          durationSeconds: durationSec,
          isGap: false,
        });
      }
    }

    // 🧹 De-fragmentation: دمج فترات التوقف المتتالية إذا كان الفاصل بينهما أقل من 4 دقائق (تجنب تفتيت الخمول)
    const mergedBreaks = [];
    for (const b of rawBreaks) {
      if (mergedBreaks.length === 0) {
        mergedBreaks.push({ ...b });
      } else {
        const last = mergedBreaks[mergedBreaks.length - 1];
        const gapBetweenBreaksSec = Math.floor((b.startMs - last.endMs) / 1000);
        if (gapBetweenBreaksSec <= 240) {
          last.endMs = Math.max(last.endMs, b.endMs);
          last.durationSeconds = Math.floor((last.endMs - last.startMs) / 1000);
          if (b.isGap) last.isGap = true;
        } else {
          mergedBreaks.push({ ...b });
        }
      }
    }

    const formattedBreaks = mergedBreaks.map((b, idx) => {
      const startDate = new Date(b.startMs);
      const endDate = new Date(b.endMs);
      const durationMinutes = Math.round(b.durationSeconds / 60);

      let reasonType = 'UNLOGGED_INACTIVITY';
      let reasonLabel = 'توقف عن استخدام الجهاز (خمول)';

      if (b.isGap) {
        reasonType = 'DEVICE_DISCONNECTED_OR_POWER_CUT';
        reasonLabel = durationMinutes >= 30
          ? 'انقطاع اتصال طويل / إغلاق جهاز أو وضع سكون'
          : 'انقطاع اتصال مؤقت بالجهاز / إغلاق أو شبكة';
      } else if (durationMinutes >= 45) {
        reasonType = 'EXTENDED_ABSENCE';
        reasonLabel = 'توقف ممتد عن استخدام الجهاز (غياب عن المكتب)';
      } else if (durationMinutes <= 15) {
        reasonType = 'SHORT_BREAK';
        reasonLabel = 'توقف قصير / خمول مؤقت';
      } else {
        reasonType = 'UNLOGGED_INACTIVITY';
        reasonLabel = 'توقف عن استخدام الجهاز (خمول غير موثق)';
      }

      return {
        breakNumber: idx + 1,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        startTimeStr: startDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        endTimeStr: endDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        durationSeconds: b.durationSeconds,
        durationMinutes,
        reasonType,
        reasonLabel,
      };
    });

    const totalBreakSeconds = formattedBreaks.reduce((sum, b) => sum + b.durationSeconds, 0);

    return {
      totalBreaksCount: formattedBreaks.length,
      totalBreakSeconds,
      totalBreakMinutes: Math.round(totalBreakSeconds / 60),
      breaks: formattedBreaks
    };
  }

  async ensureOperationalAlerts(companyId, employeeId, {
    empName,
    clockInTime,
    firstActivityTime,
    lateStartSeconds,
    operationalSignal,
    overdueTasksCount = 0,
    completedTasksCount = 0,
    dateStr
  }) {
    try {
      const todayStart = new Date(`${dateStr || new Date().toISOString().split('T')[0]}T00:00:00.000Z`);

      // Alert 1: 30 minutes clock-in without activity
      if (clockInTime && lateStartSeconds >= 1800) {
        const lateMinutes = Math.round(lateStartSeconds / 60);
        const timeStr = new Date(clockInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

        const existingAlert = await this.prisma.monitorAlert.findFirst({
          where: {
            companyId,
            employeeId,
            type: 'CLOCK_IN_NO_ACTIVITY_30M',
            createdAt: { gte: todayStart }
          }
        });

        if (!existingAlert) {
          await this.prisma.monitorAlert.create({
            data: {
              companyId,
              employeeId,
              type: 'CLOCK_IN_NO_ACTIVITY_30M',
              severity: 'warning',
              message: `سجل الموظف (${empName}) حضوراً بالبصمة في ${timeStr} دون أي نشاط على الجهاز لمدة ${lateMinutes} دقيقة (وقت تسخين ممتد).`,
              metadata: JSON.stringify({
                clockInTime,
                firstActivityTime,
                lateStartSeconds,
                lateMinutes,
                type: 'WARMUP_DELAY'
              })
            }
          });
        }
      }

      // Alert 2: TASK_OVERLOAD (Alert to Manager!)
      if (operationalSignal?.type === 'TASK_OVERLOAD') {
        const existingAlert = await this.prisma.monitorAlert.findFirst({
          where: {
            companyId,
            employeeId,
            type: 'TASK_OVERLOAD',
            createdAt: { gte: todayStart }
          }
        });

        if (!existingAlert) {
          await this.prisma.monitorAlert.create({
            data: {
              companyId,
              employeeId,
              type: 'TASK_OVERLOAD',
              severity: 'warning',
              message: `تنبيه إدارة وتوزيع مهام: الموظف (${empName}) يواجه تراكماً لـ ${overdueTasksCount} مهام متأخرة مع انخفاض النشاط، يرجى مراجعة وتوزيع المهام.`,
              metadata: JSON.stringify({
                target: 'MANAGER',
                reason: operationalSignal.reason,
                overdueTasksCount
              })
            }
          });
        }
      }

      // Alert 3: DISTRACTION (High activity, 0 output)
      if (operationalSignal?.type === 'DISTRACTION') {
        const existingAlert = await this.prisma.monitorAlert.findFirst({
          where: {
            companyId,
            employeeId,
            type: 'DISTRACTION',
            createdAt: { gte: todayStart }
          }
        });

        if (!existingAlert) {
          await this.prisma.monitorAlert.create({
            data: {
              companyId,
              employeeId,
              type: 'DISTRACTION',
              severity: 'warning',
              message: `تنبيه تشتت: الموظف (${empName}) سجل نشاطاً مرتفعاً على الجهاز دون تسليم أي مخرجات موثقة اليوم.`,
              metadata: JSON.stringify({
                target: 'EMPLOYEE_AND_MANAGER',
                reason: operationalSignal.reason,
                completedTasksCount
              })
            }
          });
        }
      }

      // Alert 4: NEGLECT (Low activity, 0 output, long presence)
      if (operationalSignal?.type === 'NEGLECT') {
        const existingAlert = await this.prisma.monitorAlert.findFirst({
          where: {
            companyId,
            employeeId,
            type: 'NEGLECT',
            createdAt: { gte: todayStart }
          }
        });

        if (!existingAlert) {
          await this.prisma.monitorAlert.create({
            data: {
              companyId,
              employeeId,
              type: 'NEGLECT',
              severity: 'critical',
              message: `تنبيه ضعف الفاعلية (إهمال): انخفاض حاد في النشاط الموثق وانعدام تام للمخرجات أثناء ساعات الدوام للموظف (${empName}).`,
              metadata: JSON.stringify({
                target: 'DIRECT_INTERVENTION',
                reason: operationalSignal.reason,
                completedTasksCount
              })
            }
          });
        }
      }
    } catch (err) {
      console.warn('[MonitorService] Error generating operational alerts:', err.message);
    }
  }

  async syncEmployeeDailySummary(companyId, rawEmployeeId, date = new Date()) {
    try {
      const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
      const isToday = dateStr === new Date().toISOString().split('T')[0];

      // 1. Resolve employee and user identities
      const [emp, usr] = await Promise.all([
        this.prisma.employee.findFirst({
          where: { companyId, OR: [{ id: rawEmployeeId }, { userId: rawEmployeeId }] },
          select: { id: true, userId: true, firstName: true, lastName: true }
        }).catch(() => null),
        this.prisma.user.findFirst({
          where: { companyId, id: rawEmployeeId },
          select: { id: true, firstName: true, lastName: true }
        }).catch(() => null)
      ]);

      const canonicalEmployeeId = emp?.id || rawEmployeeId;
      const resolvedUserId = emp?.userId || usr?.id || rawEmployeeId;
      const candidateIds = Array.from(new Set([rawEmployeeId, canonicalEmployeeId, resolvedUserId].filter(Boolean)));

      // 2. Fetch parallel telemetry
      const [
        attendance,
        activityLogs,
        appUsages,
        webUsages,
        tasks,
        customCategories,
        existingSummary,
        pastSummaries
      ] = await Promise.all([
        this.prisma.attendance.findFirst({
          where: {
            companyId,
            OR: [
              { userId: { in: candidateIds } },
              { employeeRelId: { in: candidateIds } }
            ],
            date: { gte: startOfDay, lte: endOfDay }
          },
          orderBy: { checkIn: 'asc' }
        }).catch(() => null),
        this.prisma.monitorActivityLog.findMany({
          where: {
            companyId,
            employeeId: { in: candidateIds },
            intervalStart: { gte: startOfDay, lte: endOfDay }
          },
          orderBy: { intervalStart: 'asc' }
        }).catch(() => []),
        this.prisma.monitorAppUsage.findMany({
          where: {
            companyId,
            employeeId: { in: candidateIds },
            OR: [
              { date: { gte: startOfDay, lte: endOfDay } },
              { startedAt: { gte: startOfDay, lte: endOfDay } }
            ]
          }
        }).catch(() => []),
        this.prisma.monitorWebUsage.findMany({
          where: {
            companyId,
            employeeId: { in: candidateIds },
            OR: [
              { date: { gte: startOfDay, lte: endOfDay } },
              { startedAt: { gte: startOfDay, lte: endOfDay } }
            ]
          }
        }).catch(() => []),
        this.prisma.task.findMany({
          where: {
            companyId,
            assignedTo: { in: candidateIds }
          },
          select: {
            id: true,
            status: true,
            dueDate: true,
            updatedAt: true,
            completedDate: true
          }
        }).catch(() => []),
        this.prisma.monitorAppCategory.findMany({
          where: { companyId }
        }).catch(() => []),
        this.prisma.monitorDailySummary.findFirst({
          where: {
            companyId,
            employeeId: { in: candidateIds },
            date: { gte: startOfDay, lte: endOfDay }
          }
        }).catch(() => null),
        this.prisma.monitorDailySummary.findMany({
          where: {
            companyId,
            employeeId: { in: candidateIds },
            date: { gte: new Date(startOfDay.getTime() - 7 * 86400000), lt: startOfDay },
            lateStartSeconds: { gt: 0 }
          },
          select: { lateStartSeconds: true }
        }).catch(() => [])
      ]);

      // 3. Compute Active & Idle time
      let totalActive = activityLogs.reduce((sum, a) => sum + (Number(a.activeSeconds) || 0), 0);
      let totalIdle = activityLogs.reduce((sum, a) => {
        const startMs = a.intervalStart ? new Date(a.intervalStart).getTime() : 0;
        const endMs = a.intervalEnd ? new Date(a.intervalEnd).getTime() : 0;
        const active = Number(a.activeSeconds) || 0;
        if (startMs && endMs && endMs > startMs) {
          const intervalSec = Math.min(300, Math.max(1, Math.floor((endMs - startMs) / 1000)));
          return sum + Math.max(0, intervalSec - active);
        }
        return sum;
      }, 0);

      if (existingSummary && existingSummary.totalActiveSeconds > totalActive) {
        totalActive = existingSummary.totalActiveSeconds;
      }
      if (existingSummary && existingSummary.totalIdleSeconds > totalIdle) {
        totalIdle = existingSummary.totalIdleSeconds;
      }

      const avgActivityScore = activityLogs.length > 0
        ? Math.round(activityLogs.reduce((sum, a) => sum + (Number(a.activityScore) || 0), 0) / activityLogs.length)
        : (existingSummary?.avgActivityScore || (totalActive > 0 ? 70 : 0));

      const firstActivityTime = existingSummary?.firstActivityTime ||
        (activityLogs.length > 0 ? activityLogs[0].intervalStart : null);
      const lastActivityTime = (activityLogs.length > 0 ? activityLogs[activityLogs.length - 1].intervalEnd : null) ||
        existingSummary?.lastActivityTime || null;

      // 4. Attendance & Late Start & Total Clock Seconds
      const clockInTime = attendance?.checkIn || existingSummary?.clockInTime || null;
      const clockOutTime = attendance?.checkOut || existingSummary?.clockOutTime || null;
      const lateStartSeconds = calculateLateStartSeconds(clockInTime, firstActivityTime, isToday);
      const totalClockSeconds = calculateTotalClockSeconds(clockInTime, clockOutTime, isToday);

      const lateMinutesToday = Math.round(lateStartSeconds / 60);
      let weeklyAvgLateStartMinutes = lateMinutesToday;
      if (pastSummaries && pastSummaries.length > 0) {
        const sumSec = pastSummaries.reduce((acc, s) => acc + (s.lateStartSeconds || 0), 0) + lateStartSeconds;
        weeklyAvgLateStartMinutes = Math.round(sumSec / (pastSummaries.length + 1) / 60);
      }

      // 5. Productive vs Unproductive Duration
      let prodSec = 0;
      let unprodSec = 0;
      const topAppMap = new Map();
      const topSiteMap = new Map();

      for (const a of appUsages) {
        const cat = (a.category && a.category !== 'unrated')
          ? a.category
          : classifyItemCategory(a.appName, 'app', customCategories);
        const dur = Number(a.durationSeconds) || 0;
        if (cat === 'productive') prodSec += dur;
        else if (cat === 'unproductive') unprodSec += dur;

        if (a.appName) {
          topAppMap.set(a.appName, (topAppMap.get(a.appName) || 0) + dur);
        }
      }

      for (const w of webUsages) {
        const cat = (w.category && w.category !== 'unrated')
          ? w.category
          : classifyItemCategory(w.domain || w.url, 'web', customCategories);
        const dur = Number(w.durationSeconds) || 0;
        if (cat === 'productive') prodSec += dur;
        else if (cat === 'unproductive') unprodSec += dur;

        const key = w.domain || w.url;
        if (key) {
          topSiteMap.set(key, (topSiteMap.get(key) || 0) + dur);
        }
      }

      const maxPossibleSession = totalClockSeconds > 0 ? totalClockSeconds : Math.max(totalActive + totalIdle, 8 * 3600);
      const totalProductiveSeconds = Math.min(maxPossibleSession, Math.max(existingSummary?.totalProductiveSeconds || 0, prodSec));
      const totalUnproductiveSeconds = Math.min(maxPossibleSession, Math.max(existingSummary?.totalUnproductiveSeconds || 0, unprodSec));

      const sortedApps = Array.from(topAppMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const sortedSites = Array.from(topSiteMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const topApps = JSON.stringify(Object.fromEntries(sortedApps));
      const topSites = JSON.stringify(Object.fromEntries(sortedSites));

      // 6. Tasks partitioning
      let completedTasksCount = 0;
      let openTasksCount = 0;
      let overdueTasksCount = 0;

      for (const t of tasks) {
        const isCompleted = ['COMPLETED', 'IN_REVIEW'].includes(t.status);
        if (isCompleted) {
          const compDate = t.completedDate ? new Date(t.completedDate) : (t.updatedAt ? new Date(t.updatedAt) : null);
          if (compDate && compDate >= startOfDay && compDate <= endOfDay) {
            completedTasksCount++;
          }
        } else if (t.status !== 'CANCELLED') {
          openTasksCount++;
          if (t.dueDate && new Date(t.dueDate) < endOfDay) {
            overdueTasksCount++;
          }
        }
      }

      // 7. Compute Productivity Score & Operational Signal
      const productivityScore = computeProductivityScore({
        totalActiveSeconds: totalActive,
        totalClockSeconds,
        totalProductiveSeconds,
        totalUnproductiveSeconds,
        avgActivityScore,
        completedTasksCount,
        openTasksCount,
        overdueTasksCount,
      });

      const activeRatio = totalClockSeconds > 0
        ? Math.min(100, Math.round((totalActive / totalClockSeconds) * 100))
        : (totalActive > 0 ? 100 : 0);

      const activeHours = totalActive / 3600;
      const tasksPerHour = totalActive >= 1800
        ? Number((completedTasksCount / activeHours).toFixed(2))
        : (completedTasksCount > 0 ? completedTasksCount : 0);

      const operationalSignal = evaluateOperationalSignal({
        totalActiveSeconds: totalActive,
        totalClockSeconds,
        completedTasksCount,
        openTasksCount,
        overdueTasksCount,
        activeRatio,
      });

      // 8. Persist to MonitorDailySummary
      const summaryPayload = {
        clockInTime,
        clockOutTime,
        firstActivityTime,
        lastActivityTime,
        lateStartSeconds,
        totalClockSeconds,
        totalActiveSeconds: totalActive,
        totalIdleSeconds: totalIdle,
        totalProductiveSeconds,
        totalUnproductiveSeconds,
        productivityScore,
        avgActivityScore,
        topApps,
        topSites,
      };

      const summary = await this.prisma.monitorDailySummary.upsert({
        where: {
          companyId_employeeId_date: {
            companyId,
            employeeId: canonicalEmployeeId,
            date: startOfDay,
          }
        },
        update: summaryPayload,
        create: {
          companyId,
          employeeId: canonicalEmployeeId,
          date: startOfDay,
          ...summaryPayload
        }
      });

      const empName = emp ? [emp.firstName, emp.lastName].filter(Boolean).join(' ') : (usr?.firstName || canonicalEmployeeId);
      await this.ensureOperationalAlerts(companyId, canonicalEmployeeId, {
        empName,
        clockInTime,
        firstActivityTime,
        lateStartSeconds,
        operationalSignal,
        overdueTasksCount,
        completedTasksCount,
        dateStr
      });

      return {
        ...summary,
        lateStartMinutes: lateMinutesToday,
        weeklyAvgLateStartMinutes,
        activeRatio,
        tasksPerHour,
        completedTasksCount,
        openTasksCount,
        overdueTasksCount,
        operationalSignal,
      };
    } catch (err) {
      console.error('[MonitorService] Error in syncEmployeeDailySummary:', err);
      return null;
    }
  }

  async getTeamOverview(companyId, date) {
    const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
    const isToday = dateStr === new Date().toISOString().split('T')[0];

    const [summaries, activeLogs, appUsages, webUsages, allCompanyTasks, createdTasks, attendances, deviceSessions, activeTimers, customCategories, pastSummaries] = await Promise.all([
      this.prisma.monitorDailySummary.findMany({
        where: { companyId, date: { gte: startOfDay, lte: endOfDay } }
      }),
      this.prisma.monitorActivityLog.findMany({
        where: { companyId, intervalStart: { gte: startOfDay, lte: endOfDay } },
        select: { employeeId: true, activeSeconds: true, activityScore: true, intervalStart: true, intervalEnd: true }
      }),
      this.prisma.monitorAppUsage.findMany({
        where: {
          companyId,
          OR: [
            { date: { gte: startOfDay, lte: endOfDay } },
            { startedAt: { gte: startOfDay, lte: endOfDay } }
          ]
        },
        select: { employeeId: true, appName: true, category: true, durationSeconds: true }
      }),
      this.prisma.monitorWebUsage.findMany({
        where: {
          companyId,
          OR: [
            { date: { gte: startOfDay, lte: endOfDay } },
            { startedAt: { gte: startOfDay, lte: endOfDay } }
          ]
        },
        select: { employeeId: true, domain: true, url: true, category: true, durationSeconds: true }
      }),
      this.prisma.task.findMany({
        where: { companyId },
        select: { assignedTo: true, id: true, status: true, dueDate: true, completedDate: true, updatedAt: true }
      }),
      this.prisma.task.findMany({
        where: {
          companyId,
          createdAt: { gte: startOfDay, lte: endOfDay }
        },
        select: { createdBy: true, id: true, status: true }
      }),
      this.prisma.attendance.findMany({
        where: {
          companyId,
          date: { gte: startOfDay, lte: endOfDay }
        },
        select: {
          userId: true,
          employeeRelId: true,
          checkIn: true,
          checkOut: true,
          checkInMethod: true
        }
      }).catch(() => []),
      this.prisma.monitorDeviceSession.findMany({
        where: { companyId, isOnline: true },
        select: { employeeId: true, lastHeartbeat: true, deviceName: true, appVersion: true }
      }).catch(() => []),
      this.prisma.timeEntry.findMany({
        where: { companyId, isRunning: true },
        include: {
          task: { select: { id: true, title: true, priority: true } },
          user: { select: { id: true, firstName: true, lastName: true } }
        }
      }).catch(() => []),
      this.prisma.monitorAppCategory.findMany({
        where: { companyId }
      }).catch(() => []),
      this.prisma.monitorDailySummary.findMany({
        where: {
          companyId,
          date: { gte: new Date(startOfDay.getTime() - 7 * 86400000), lt: startOfDay },
          lateStartSeconds: { gt: 0 }
        },
        select: { employeeId: true, lateStartSeconds: true }
      }).catch(() => [])
    ]);

    // Build attendance map supporting both userId and employeeRelId, merging multiple daily punches
    const attendanceMap = new Map();
    for (const att of (attendances || [])) {
      const keys = [att.userId, att.employeeRelId].filter(Boolean);
      for (const k of keys) {
        if (!attendanceMap.has(k)) {
          attendanceMap.set(k, { ...att });
        } else {
          const existing = attendanceMap.get(k);
          if (att.checkIn && (!existing.checkIn || new Date(att.checkIn) < new Date(existing.checkIn))) {
            existing.checkIn = att.checkIn;
            existing.checkInMethod = att.checkInMethod || existing.checkInMethod;
          }
          if (att.checkOut && (!existing.checkOut || new Date(att.checkOut) > new Date(existing.checkOut))) {
            existing.checkOut = att.checkOut;
          }
        }
      }
    }

    // Build device session map
    const sessionMap = new Map();
    for (const sess of (deviceSessions || [])) {
      if (sess.employeeId) sessionMap.set(sess.employeeId, sess);
    }

    // Build active task timers map
    const activeTimerMap = new Map();
    for (const timer of (activeTimers || [])) {
      if (timer.userId) activeTimerMap.set(timer.userId, timer);
    }

    // Past weekly late start map
    const pastLateStartMap = new Map();
    for (const p of pastSummaries) {
      if (!pastLateStartMap.has(p.employeeId)) pastLateStartMap.set(p.employeeId, []);
      pastLateStartMap.get(p.employeeId).push(p.lateStartSeconds || 0);
    }

    // App & Web productive/unproductive maps
    const empProdMap = new Map();
    const empUnprodMap = new Map();

    for (const app of appUsages) {
      const cat = (app.category && app.category !== 'unrated')
        ? app.category
        : classifyItemCategory(app.appName, 'app', customCategories);
      const dur = Number(app.durationSeconds) || 0;
      if (cat === 'productive') {
        empProdMap.set(app.employeeId, (empProdMap.get(app.employeeId) || 0) + dur);
      } else if (cat === 'unproductive') {
        empUnprodMap.set(app.employeeId, (empUnprodMap.get(app.employeeId) || 0) + dur);
      }
    }

    for (const web of webUsages) {
      const cat = (web.category && web.category !== 'unrated')
        ? web.category
        : classifyItemCategory(web.domain || web.url, 'web', customCategories);
      const dur = Number(web.durationSeconds) || 0;
      if (cat === 'productive') {
        empProdMap.set(web.employeeId, (empProdMap.get(web.employeeId) || 0) + dur);
      } else if (cat === 'unproductive') {
        empUnprodMap.set(web.employeeId, (empUnprodMap.get(web.employeeId) || 0) + dur);
      }
    }

    // Partition tasks per employee: completedToday, open, overdue
    const empCompletedTasks = new Map();
    const empOpenTasks = new Map();
    const empOverdueTasks = new Map();

    for (const t of allCompanyTasks) {
      if (!t.assignedTo) continue;
      const isCompleted = ['COMPLETED', 'IN_REVIEW'].includes(t.status);
      if (isCompleted) {
        const compDate = t.completedDate ? new Date(t.completedDate) : (t.updatedAt ? new Date(t.updatedAt) : null);
        if (compDate && compDate >= startOfDay && compDate <= endOfDay) {
          empCompletedTasks.set(t.assignedTo, (empCompletedTasks.get(t.assignedTo) || 0) + 1);
        }
      } else if (t.status !== 'CANCELLED') {
        empOpenTasks.set(t.assignedTo, (empOpenTasks.get(t.assignedTo) || 0) + 1);
        if (t.dueDate && new Date(t.dueDate) < endOfDay) {
          empOverdueTasks.set(t.assignedTo, (empOverdueTasks.get(t.assignedTo) || 0) + 1);
        }
      }
    }

    // Created task count map
    const createdTaskCountMap = new Map();
    for (const t of createdTasks) {
      if (t.createdBy) {
        createdTaskCountMap.set(t.createdBy, (createdTaskCountMap.get(t.createdBy) || 0) + 1);
      }
    }

    // Collect all candidate IDs
    const rawIds = new Set([
      ...summaries.map(s => s.employeeId),
      ...activeLogs.map(a => a.employeeId),
      ...appUsages.map(a => a.employeeId),
      ...allCompanyTasks.map(t => t.assignedTo),
      ...createdTasks.map(t => t.createdBy),
      ...(attendances || []).map(a => a.userId),
      ...(attendances || []).map(a => a.employeeRelId),
      ...(deviceSessions || []).map(d => d.employeeId),
      ...(activeTimers || []).map(t => t.userId),
    ].filter(Boolean));

    const employeeIds = Array.from(rawIds);
    const empMap = new Map();

    if (employeeIds.length > 0) {
      const employees = await this.prisma.employee.findMany({
        where: {
          companyId,
          OR: [{ id: { in: employeeIds } }, { userId: { in: employeeIds } }]
        },
        include: { department: true, position: true }
      });

      employees.forEach(e => {
        empMap.set(e.id, e);
        if (e.userId) {
          empMap.set(e.userId, e);
          if (attendanceMap.has(e.userId) && !attendanceMap.has(e.id)) {
            attendanceMap.set(e.id, attendanceMap.get(e.userId));
          }
          if (attendanceMap.has(e.id) && !attendanceMap.has(e.userId)) {
            attendanceMap.set(e.userId, attendanceMap.get(e.id));
          }
          if (activeTimerMap.has(e.userId) && !activeTimerMap.has(e.id)) {
            activeTimerMap.set(e.id, activeTimerMap.get(e.userId));
          }
          if (activeTimerMap.has(e.id) && !activeTimerMap.has(e.userId)) {
            activeTimerMap.set(e.userId, activeTimerMap.get(e.id));
          }
        }
      });

      const missingIds = employeeIds.filter(id => !empMap.has(id));
      if (missingIds.length > 0) {
        const users = await this.prisma.user.findMany({
          where: { companyId, id: { in: missingIds } },
          select: { id: true, firstName: true, lastName: true, email: true, role: true }
        });

        users.forEach(u => {
          const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
          empMap.set(u.id, {
            id: u.id,
            firstName: fullName,
            lastName: '',
            email: u.email,
            department: { name: u.role === 'COMPANY_ADMIN' ? 'الإدارة العامة' : 'فريق العمل' },
            position: { title: 'موظف' }
          });
        });
      }
    }

    // Top apps per employee
    const empAppMap = new Map();
    for (const app of appUsages) {
      if (!empAppMap.has(app.employeeId)) empAppMap.set(app.employeeId, new Map());
      const m = empAppMap.get(app.employeeId);
      const name = String(app.appName || 'Unknown').trim();
      m.set(name, (m.get(name) || 0) + (app.durationSeconds || 0));

      const emp = empMap.get(app.employeeId);
      const altId = (emp?.userId && emp.userId !== app.employeeId) ? emp.userId : (emp?.id && emp.id !== app.employeeId ? emp.id : null);
      if (altId) {
        if (!empAppMap.has(altId)) empAppMap.set(altId, new Map());
        const mAlt = empAppMap.get(altId);
        mAlt.set(name, (mAlt.get(name) || 0) + (app.durationSeconds || 0));
      }
    }

    const empTopApp = new Map();
    for (const [empId, m] of empAppMap.entries()) {
      const sorted = Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
      const realApp = sorted.find(([name]) => !['سطح المكتب', 'Desktop', 'explorer', 'explorer.exe', 'Windows Explorer', 'مستكشف ويندوز'].includes(name));
      empTopApp.set(empId, realApp ? realApp[0] : (sorted[0] ? sorted[0][0] : 'سطح المكتب'));
    }

    // Group and Deduplicate by canonical employee entity
    const grouped = new Map();

    // 1. Process summaries
    for (const s of summaries) {
      const empObj = empMap.get(s.employeeId) || { id: s.employeeId, firstName: s.employeeId };
      const canonicalKey = empObj.id || empObj.userId || s.employeeId;
      const att = attendanceMap.get(canonicalKey) || attendanceMap.get(empObj.userId) || attendanceMap.get(s.employeeId);

      if (!grouped.has(canonicalKey)) {
        grouped.set(canonicalKey, {
          employeeId: canonicalKey,
          employee: empObj,
          totalActiveSeconds: 0,
          totalIdleSeconds: 0,
          totalProductiveSeconds: s.totalProductiveSeconds || 0,
          totalUnproductiveSeconds: s.totalUnproductiveSeconds || 0,
          productivityScores: [],
          lastActivityTime: s.lastActivityTime,
          firstActivityTime: s.firstActivityTime,
          clockInTime: att?.checkIn || s.clockInTime || null,
          clockOutTime: att?.checkOut || s.clockOutTime || null,
          checkInMethod: att?.checkInMethod || null,
          status: 'offline',
          topApp: empTopApp.get(s.employeeId) || empTopApp.get(canonicalKey) || empTopApp.get(empObj.userId) || 'سطح المكتب',
          createdTasksCount: createdTaskCountMap.get(canonicalKey) || createdTaskCountMap.get(empObj.userId) || 0,
        });
      }

      const item = grouped.get(canonicalKey);
      item.totalActiveSeconds += (s.totalActiveSeconds || 0);
      item.totalIdleSeconds += (s.totalIdleSeconds || 0);
      if (s.totalProductiveSeconds > 0) item.totalProductiveSeconds = Math.max(item.totalProductiveSeconds, s.totalProductiveSeconds);
      if (s.totalUnproductiveSeconds > 0) item.totalUnproductiveSeconds = Math.max(item.totalUnproductiveSeconds, s.totalUnproductiveSeconds);
      if (s.avgActivityScore > 0) item.productivityScores.push(s.avgActivityScore);
      if (s.lastActivityTime && (!item.lastActivityTime || new Date(s.lastActivityTime) > new Date(item.lastActivityTime))) {
        item.lastActivityTime = s.lastActivityTime;
      }
      if (s.firstActivityTime && (!item.firstActivityTime || new Date(s.firstActivityTime) < new Date(item.firstActivityTime))) {
        item.firstActivityTime = s.firstActivityTime;
      }
      if (!item.clockInTime && (att?.checkIn || s.clockInTime)) {
        item.clockInTime = att?.checkIn || s.clockInTime;
      }
      if (!item.clockOutTime && (att?.checkOut || s.clockOutTime)) {
        item.clockOutTime = att?.checkOut || s.clockOutTime;
      }
      if (!item.checkInMethod && att?.checkInMethod) {
        item.checkInMethod = att.checkInMethod;
      }
    }

    // 2. Ensure anyone with active logs is represented
    for (const log of activeLogs) {
      const empObj = empMap.get(log.employeeId) || { id: log.employeeId, firstName: log.employeeId };
      const canonicalKey = empObj.id || empObj.userId || log.employeeId;
      const att = attendanceMap.get(canonicalKey) || attendanceMap.get(empObj.userId) || attendanceMap.get(log.employeeId);

      if (!grouped.has(canonicalKey)) {
        grouped.set(canonicalKey, {
          employeeId: canonicalKey,
          employee: empObj,
          totalActiveSeconds: 0,
          totalIdleSeconds: 0,
          totalProductiveSeconds: 0,
          totalUnproductiveSeconds: 0,
          productivityScores: [],
          lastActivityTime: log.intervalEnd,
          firstActivityTime: log.intervalStart,
          clockInTime: att?.checkIn || null,
          clockOutTime: att?.checkOut || null,
          checkInMethod: att?.checkInMethod || null,
          status: 'offline',
          topApp: empTopApp.get(log.employeeId) || empTopApp.get(canonicalKey) || empTopApp.get(empObj.userId) || 'سطح المكتب',
          createdTasksCount: createdTaskCountMap.get(canonicalKey) || createdTaskCountMap.get(empObj.userId) || 0,
        });
      }
    }

    // 3. Ensure anyone with attendance is represented
    for (const [key, att] of attendanceMap.entries()) {
      const empObj = empMap.get(key) || { id: key, firstName: key };
      const canonicalKey = empObj.id || empObj.userId || key;

      if (!grouped.has(canonicalKey)) {
        grouped.set(canonicalKey, {
          employeeId: canonicalKey,
          employee: empObj,
          totalActiveSeconds: 0,
          totalIdleSeconds: 0,
          totalProductiveSeconds: 0,
          totalUnproductiveSeconds: 0,
          productivityScores: [],
          lastActivityTime: null,
          firstActivityTime: null,
          clockInTime: att?.checkIn || null,
          clockOutTime: att?.checkOut || null,
          checkInMethod: att?.checkInMethod || null,
          status: 'offline',
          topApp: empTopApp.get(canonicalKey) || empTopApp.get(empObj.userId) || 'سطح المكتب',
          createdTasksCount: createdTaskCountMap.get(canonicalKey) || createdTaskCountMap.get(empObj.userId) || 0,
        });
      }
    }

    // 4. Ensure anyone who created tasks is represented
    for (const [key, count] of createdTaskCountMap.entries()) {
      const empObj = empMap.get(key) || { id: key, firstName: key };
      const canonicalKey = empObj.id || empObj.userId || key;

      if (!grouped.has(canonicalKey)) {
        grouped.set(canonicalKey, {
          employeeId: canonicalKey,
          employee: empObj,
          totalActiveSeconds: 0,
          totalIdleSeconds: 0,
          totalProductiveSeconds: 0,
          totalUnproductiveSeconds: 0,
          productivityScores: [],
          lastActivityTime: null,
          firstActivityTime: null,
          clockInTime: null,
          clockOutTime: null,
          checkInMethod: null,
          status: 'offline',
          topApp: empTopApp.get(canonicalKey) || empTopApp.get(empObj.userId) || 'سطح المكتب',
          createdTasksCount: count || 0,
        });
      }
    }

    // Finalize aggregated items with Layer 1, 2, and 3 metrics
    const result = Array.from(grouped.values()).map(item => {
      const avgScore = item.productivityScores.length > 0
        ? Math.round(item.productivityScores.reduce((a, b) => a + b, 0) / item.productivityScores.length)
        : (item.totalActiveSeconds > 0 ? 70 : 0);

      const session = sessionMap.get(item.employeeId) || sessionMap.get(item.employee?.userId) || sessionMap.get(item.employee?.id);
      const lastHeartbeatMs = session?.lastHeartbeat ? new Date(session.lastHeartbeat).getTime() : 0;
      const isDeviceConnected = lastHeartbeatMs > 0 && (Date.now() - lastHeartbeatMs < 4 * 60 * 1000);

      const lastActivityMs = item.lastActivityTime ? new Date(item.lastActivityTime).getTime() : 0;
      const isActivityRecent = lastActivityMs > 0 && (Date.now() - lastActivityMs < 4 * 60 * 1000);

      let status = 'offline';
      if (isActivityRecent) {
        status = 'active';
      } else if (isDeviceConnected) {
        status = 'idle';
      } else {
        status = 'offline';
      }

      const lastSeenTime = (session?.lastHeartbeat && (!item.lastActivityTime || new Date(session.lastHeartbeat) > new Date(item.lastActivityTime)))
        ? session.lastHeartbeat
        : item.lastActivityTime;

      // Layer 1: Attendance, Late Start, and Total Clock Seconds
      const lateStartSeconds = calculateLateStartSeconds(item.clockInTime, item.firstActivityTime, isToday);
      const lateStartMinutes = Math.round(lateStartSeconds / 60);
      const totalClockSeconds = calculateTotalClockSeconds(item.clockInTime, item.clockOutTime, isToday);

      // Weekly average warmup
      const pastList = [
        ...(pastLateStartMap.get(item.employeeId) || []),
        ...(item.employee?.userId ? (pastLateStartMap.get(item.employee.userId) || []) : [])
      ];
      let weeklyAvgLateStartMinutes = lateStartMinutes;
      if (pastList.length > 0) {
        const totalPastSec = pastList.reduce((a, b) => a + b, 0) + lateStartSeconds;
        weeklyAvgLateStartMinutes = Math.round(totalPastSec / (pastList.length + 1) / 60);
      }

      const activeRatio = totalClockSeconds > 0
        ? Math.min(100, Math.round((item.totalActiveSeconds / totalClockSeconds) * 100))
        : (item.totalActiveSeconds > 0 ? 100 : 0);

      // Layer 2: Productive vs Unproductive Duration
      const prodSec = empProdMap.get(item.employeeId) || empProdMap.get(item.employee?.userId) || empProdMap.get(item.employee?.id) || item.totalProductiveSeconds || 0;
      const unprodSec = empUnprodMap.get(item.employeeId) || empUnprodMap.get(item.employee?.userId) || empUnprodMap.get(item.employee?.id) || item.totalUnproductiveSeconds || 0;

      const maxSession = totalClockSeconds > 0 ? totalClockSeconds : Math.max(item.totalActiveSeconds + item.totalIdleSeconds, 8 * 3600);
      const totalProductiveSeconds = Math.min(maxSession, prodSec);
      const totalUnproductiveSeconds = Math.min(maxSession, unprodSec);

      // Layer 2: Tasks Per Employee
      const completedTasksCount = empCompletedTasks.get(item.employeeId) || empCompletedTasks.get(item.employee?.userId) || empCompletedTasks.get(item.employee?.id) || 0;
      const openTasksCount = empOpenTasks.get(item.employeeId) || empOpenTasks.get(item.employee?.userId) || empOpenTasks.get(item.employee?.id) || 0;
      const overdueTasksCount = empOverdueTasks.get(item.employeeId) || empOverdueTasks.get(item.employee?.userId) || empOverdueTasks.get(item.employee?.id) || 0;

      const activeHours = item.totalActiveSeconds / 3600;
      const tasksPerHour = item.totalActiveSeconds >= 1800
        ? Number((completedTasksCount / activeHours).toFixed(2))
        : (completedTasksCount > 0 ? completedTasksCount : 0);

      // Balanced weighted productivity score
      const productivityScore = computeProductivityScore({
        totalActiveSeconds: item.totalActiveSeconds,
        totalClockSeconds,
        totalProductiveSeconds,
        totalUnproductiveSeconds,
        avgActivityScore: avgScore,
        completedTasksCount,
        openTasksCount,
        overdueTasksCount,
      });

      // Layer 3: Operational Signal
      const operationalSignal = evaluateOperationalSignal({
        totalActiveSeconds: item.totalActiveSeconds,
        totalClockSeconds,
        completedTasksCount,
        openTasksCount,
        overdueTasksCount,
        activeRatio,
      });

      // Untracked presence gap
      const trackedDeviceSeconds = (item.totalActiveSeconds || 0) + (item.totalIdleSeconds || 0);
      const untrackedSeconds = (totalClockSeconds > trackedDeviceSeconds)
        ? (totalClockSeconds - trackedDeviceSeconds)
        : 0;

      const activeTimer = activeTimerMap.get(item.employeeId) || activeTimerMap.get(item.employee?.userId) || activeTimerMap.get(item.employee?.id);
      let activeTask = null;
      if (activeTimer && activeTimer.task) {
        const startMs = new Date(activeTimer.startTime).getTime();
        const elapsedSec = !isNaN(startMs) && Date.now() > startMs ? Math.floor((Date.now() - startMs) / 1000) : 0;
        activeTask = {
          entryId: activeTimer.id,
          taskId: activeTimer.taskId,
          title: activeTimer.task.title,
          priority: activeTimer.task.priority,
          startTime: activeTimer.startTime,
          elapsedSeconds: elapsedSec,
        };
      }

      const hasMissingClockOut = item.clockInTime && !item.clockOutTime && !isToday;

      // Asynchronously upsert to MonitorDailySummary
      this.prisma.monitorDailySummary.upsert({
        where: {
          companyId_employeeId_date: {
            companyId,
            employeeId: item.employeeId,
            date: startOfDay,
          }
        },
        update: {
          clockInTime: item.clockInTime ? new Date(item.clockInTime) : null,
          clockOutTime: item.clockOutTime ? new Date(item.clockOutTime) : null,
          firstActivityTime: item.firstActivityTime ? new Date(item.firstActivityTime) : null,
          lastActivityTime: item.lastActivityTime ? new Date(item.lastActivityTime) : null,
          lateStartSeconds,
          totalClockSeconds,
          totalActiveSeconds: item.totalActiveSeconds || 0,
          totalIdleSeconds: item.totalIdleSeconds || 0,
          totalProductiveSeconds,
          totalUnproductiveSeconds,
          productivityScore,
          avgActivityScore: avgScore,
        },
        create: {
          companyId,
          employeeId: item.employeeId,
          date: startOfDay,
          clockInTime: item.clockInTime ? new Date(item.clockInTime) : null,
          clockOutTime: item.clockOutTime ? new Date(item.clockOutTime) : null,
          firstActivityTime: item.firstActivityTime ? new Date(item.firstActivityTime) : null,
          lastActivityTime: item.lastActivityTime ? new Date(item.lastActivityTime) : null,
          lateStartSeconds,
          totalClockSeconds,
          totalProductiveSeconds,
          totalUnproductiveSeconds,
          totalActiveSeconds: item.totalActiveSeconds || 0,
          totalIdleSeconds: item.totalIdleSeconds || 0,
          productivityScore,
          avgActivityScore: avgScore,
        }
      }).catch(err => console.warn('[MonitorService] Upsert summary error:', err.message));

      // Asynchronously generate operational alerts
      const empName = item.employee?.firstName
        ? `${item.employee.firstName} ${item.employee.lastName || ''}`.trim()
        : item.employeeId;
      this.ensureOperationalAlerts(companyId, item.employeeId, {
        empName,
        clockInTime: item.clockInTime,
        firstActivityTime: item.firstActivityTime,
        lateStartSeconds,
        operationalSignal,
        overdueTasksCount,
        completedTasksCount,
        dateStr
      }).catch(() => {});

      return {
        employeeId: item.employeeId,
        employee: item.employee,
        totalActiveSeconds: item.totalActiveSeconds,
        totalIdleSeconds: item.totalIdleSeconds,
        totalProductiveSeconds,
        totalUnproductiveSeconds,
        productivityScore,
        activityRatio,
        lateStartSeconds,
        lateStartMinutes,
        weeklyAvgLateStartMinutes,
        totalClockSeconds,
        elapsedAttendanceSeconds: totalClockSeconds,
        untrackedSeconds,
        lastActivityTime: item.lastActivityTime,
        firstActivityTime: item.firstActivityTime,
        lastSeenTime,
        deviceName: session?.deviceName || null,
        isDeviceConnected,
        clockInTime: item.clockInTime,
        clockOutTime: item.clockOutTime,
        checkInMethod: item.checkInMethod,
        hasMissingClockOut,
        status,
        topApp: item.topApp,
        completedTasksCount,
        openTasksCount,
        overdueTasksCount,
        tasksPerHour,
        operationalSignal,
        createdTasksCount: item.createdTasksCount || 0,
        activeTask,
      };
    });

    return result;
  }

  async getEmployeeTimeline(companyId, employeeId, date) {
    const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
    const isToday = dateStr === new Date().toISOString().split('T')[0];

    // 1. Resolve employee and user identities
    const [employeeRecord, userRecord] = await Promise.all([
      this.prisma.employee.findFirst({
        where: { companyId, OR: [{ id: employeeId }, { userId: employeeId }] },
        include: {
          department: { select: { name: true } },
          position: { select: { title: true } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } }
        },
      }).catch(() => null),
      this.prisma.user.findFirst({
        where: { companyId, id: employeeId },
        select: { id: true, firstName: true, lastName: true, email: true, role: true }
      }).catch(() => null),
    ]);

    const resolvedUserId = employeeRecord?.userId || userRecord?.id || employeeId;
    const resolvedEmployeeId = employeeRecord?.id || employeeId;
    const candidateIds = Array.from(new Set([employeeId, resolvedUserId, resolvedEmployeeId].filter(Boolean)));

    // 2. Fetch all telemetry, apps, websites, tasks, attendance, device session, and past summaries
    const [activities, apps, websites, summary, allTasks, createdTasks, attendance, deviceSession, activeTimer, customCategories, pastSummaries] = await Promise.all([
      this.prisma.monitorActivityLog.findMany({
        where: { companyId, employeeId: { in: candidateIds }, intervalStart: { gte: startOfDay, lte: endOfDay } },
        orderBy: { intervalStart: 'asc' },
      }),
      this.prisma.monitorAppUsage.findMany({
        where: {
          companyId,
          employeeId: { in: candidateIds },
          OR: [
            { date: { gte: startOfDay, lte: endOfDay } },
            { startedAt: { gte: startOfDay, lte: endOfDay } }
          ]
        },
        orderBy: { durationSeconds: 'desc' },
      }),
      this.prisma.monitorWebUsage.findMany({
        where: {
          companyId,
          employeeId: { in: candidateIds },
          OR: [
            { date: { gte: startOfDay, lte: endOfDay } },
            { startedAt: { gte: startOfDay, lte: endOfDay } }
          ]
        },
        orderBy: { durationSeconds: 'desc' },
      }),
      this.prisma.monitorDailySummary.findFirst({
        where: { companyId, employeeId: { in: candidateIds }, date: { gte: startOfDay, lte: endOfDay } },
      }),
      this.prisma.task.findMany({
        where: { companyId, assignedTo: { in: candidateIds } },
        include: {
          project: { select: { id: true, name: true } }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      this.prisma.task.findMany({
        where: {
          companyId,
          createdBy: { in: candidateIds },
          createdAt: { gte: startOfDay, lte: endOfDay }
        },
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.attendance.findFirst({
        where: {
          companyId,
          OR: [
            { userId: { in: candidateIds } },
            { employeeRelId: { in: candidateIds } }
          ],
          date: { gte: startOfDay, lte: endOfDay }
        }
      }).catch(() => null),
      this.prisma.monitorDeviceSession.findFirst({
        where: { companyId, employeeId: { in: candidateIds }, isOnline: true },
        orderBy: { lastHeartbeat: 'desc' }
      }).catch(() => null),
      this.prisma.timeEntry.findFirst({
        where: { companyId, userId: { in: candidateIds }, isRunning: true },
        include: {
          task: { select: { id: true, title: true, priority: true } }
        }
      }).catch(() => null),
      this.prisma.monitorAppCategory.findMany({ where: { companyId } }).catch(() => []),
      this.prisma.monitorDailySummary.findMany({
        where: {
          companyId,
          employeeId: { in: candidateIds },
          date: { gte: new Date(startOfDay.getTime() - 7 * 86400000), lt: startOfDay },
          lateStartSeconds: { gt: 0 }
        },
        select: { lateStartSeconds: true }
      }).catch(() => [])
    ]);

    // 3. True recalculation directly from activity logs
    const calcActiveSeconds = activities.reduce((sum, a) => sum + (Number(a.activeSeconds) || 0), 0);
    const calcIdleSeconds = activities.reduce((sum, a) => {
      const startMs = a.intervalStart ? new Date(a.intervalStart).getTime() : 0;
      const endMs = a.intervalEnd ? new Date(a.intervalEnd).getTime() : 0;
      const active = Number(a.activeSeconds) || 0;
      if (startMs && endMs && endMs > startMs) {
        const intervalSec = Math.min(300, Math.max(1, Math.floor((endMs - startMs) / 1000)));
        return sum + Math.max(0, intervalSec - active);
      }
      return sum;
    }, 0);

    const calcAvgActivityScore = activities.length > 0
      ? Math.round(activities.reduce((sum, a) => sum + (Number(a.activityScore) || 0), 0) / activities.length)
      : (summary?.avgActivityScore || (calcActiveSeconds > 0 ? 70 : 0));

    const lastHeartbeatMs = deviceSession?.lastHeartbeat ? new Date(deviceSession.lastHeartbeat).getTime() : 0;
    const isDeviceConnected = lastHeartbeatMs > 0 && (Date.now() - lastHeartbeatMs < 4 * 60 * 1000);
    const lastActivityTimeVal = summary?.lastActivityTime || (activities.length > 0 ? activities[activities.length - 1].intervalEnd : null);
    const lastActMs = lastActivityTimeVal ? new Date(lastActivityTimeVal).getTime() : 0;
    const isActivityRecent = lastActMs > 0 && (Date.now() - lastActMs < 4 * 60 * 1000);

    let currentStatus = 'offline';
    if (isActivityRecent) {
      currentStatus = 'active';
    } else if (isDeviceConnected) {
      currentStatus = 'idle';
    } else {
      currentStatus = 'offline';
    }

    const lastSeenTime = (deviceSession?.lastHeartbeat && (!lastActivityTimeVal || new Date(deviceSession.lastHeartbeat) > new Date(lastActivityTimeVal)))
      ? deviceSession.lastHeartbeat
      : lastActivityTimeVal;

    const clockInVal = attendance?.checkIn || summary?.clockInTime || null;
    const clockOutVal = attendance?.checkOut || summary?.clockOutTime || null;

    // Layer 1: Late Start & Total Clock Seconds
    const firstActVal = summary?.firstActivityTime || (activities.length > 0 ? activities[0].intervalStart : null);
    const lateStartSeconds = calculateLateStartSeconds(clockInVal, firstActVal, isToday);
    const lateStartMinutes = Math.round(lateStartSeconds / 60);
    const totalClockSeconds = calculateTotalClockSeconds(clockInVal, clockOutVal, isToday);

    // Weekly average warm up
    let weeklyAvgLateStartMinutes = lateStartMinutes;
    if (pastSummaries && pastSummaries.length > 0) {
      const sumSec = pastSummaries.reduce((acc, s) => acc + (s.lateStartSeconds || 0), 0) + lateStartSeconds;
      weeklyAvgLateStartMinutes = Math.round(sumSec / (pastSummaries.length + 1) / 60);
    }

    const finalTotalActive = (summary?.totalActiveSeconds && summary.totalActiveSeconds > 0) ? summary.totalActiveSeconds : calcActiveSeconds;
    const finalTotalIdle = (summary?.totalIdleSeconds && summary.totalIdleSeconds > 0) ? summary.totalIdleSeconds : calcIdleSeconds;

    const activeRatio = totalClockSeconds > 0
      ? Math.min(100, Math.round((finalTotalActive / totalClockSeconds) * 100))
      : (finalTotalActive > 0 ? 100 : 0);

    // Layer 2: Productive vs Unproductive Duration
    let prodSec = 0;
    let unprodSec = 0;
    for (const a of apps) {
      const cat = (a.category && a.category !== 'unrated')
        ? a.category
        : classifyItemCategory(a.appName, 'app', customCategories);
      const dur = Number(a.durationSeconds) || 0;
      if (cat === 'productive') prodSec += dur;
      else if (cat === 'unproductive') unprodSec += dur;
    }
    for (const w of websites) {
      const cat = (w.category && w.category !== 'unrated')
        ? w.category
        : classifyItemCategory(w.domain || w.url, 'web', customCategories);
      const dur = Number(w.durationSeconds) || 0;
      if (cat === 'productive') prodSec += dur;
      else if (cat === 'unproductive') unprodSec += dur;
    }

    const maxSession = totalClockSeconds > 0 ? totalClockSeconds : Math.max(finalTotalActive + finalTotalIdle, 8 * 3600);
    const totalProductiveSeconds = Math.min(maxSession, Math.max(summary?.totalProductiveSeconds || 0, prodSec));
    const totalUnproductiveSeconds = Math.min(maxSession, Math.max(summary?.totalUnproductiveSeconds || 0, unprodSec));

    // Layer 2: Partition Tasks
    const completedTasks = [];
    const openTasks = [];
    const overdueTasks = [];

    for (const t of allTasks) {
      const isCompleted = ['COMPLETED', 'IN_REVIEW'].includes(t.status);
      if (isCompleted) {
        const compDate = t.completedDate ? new Date(t.completedDate) : (t.updatedAt ? new Date(t.updatedAt) : null);
        if (compDate && compDate >= startOfDay && compDate <= endOfDay) {
          completedTasks.push(t);
        }
      } else if (t.status !== 'CANCELLED') {
        openTasks.push(t);
        if (t.dueDate && new Date(t.dueDate) < endOfDay) {
          overdueTasks.push(t);
        }
      }
    }

    const tasksCount = completedTasks.length;
    const activeHours = finalTotalActive / 3600;
    const tasksPerHour = finalTotalActive >= 1800
      ? Number((tasksCount / activeHours).toFixed(2))
      : (tasksCount > 0 ? tasksCount : 0);

    // Balanced productivity score
    const newProductivityScore = computeProductivityScore({
      totalActiveSeconds: finalTotalActive,
      totalClockSeconds,
      totalProductiveSeconds,
      totalUnproductiveSeconds,
      avgActivityScore: calcAvgActivityScore,
      completedTasksCount: tasksCount,
      openTasksCount: openTasks.length,
      overdueTasksCount: overdueTasks.length,
    });

    // Layer 3: Operational Signal
    const operationalSignal = evaluateOperationalSignal({
      totalActiveSeconds: finalTotalActive,
      totalClockSeconds,
      completedTasksCount: tasksCount,
      openTasksCount: openTasks.length,
      overdueTasksCount: overdueTasks.length,
      activeRatio,
    });

    const trackedDeviceSec = finalTotalActive + finalTotalIdle;
    const untrackedSeconds = totalClockSeconds > trackedDeviceSec ? (totalClockSeconds - trackedDeviceSec) : 0;
    const hasMissingClockOut = clockInVal && !clockOutVal && !isToday;

    const finalSummary = {
      ...(summary || {}),
      totalActiveSeconds: finalTotalActive,
      totalIdleSeconds: finalTotalIdle,
      totalProductiveSeconds,
      totalUnproductiveSeconds,
      productivityScore: newProductivityScore,
      avgActivityScore: calcAvgActivityScore,
      activeRatio,
      lateStartSeconds,
      lateStartMinutes,
      weeklyAvgLateStartMinutes,
      firstActivityTime: firstActVal,
      lastActivityTime: lastActivityTimeVal,
      lastSeenTime,
      isDeviceConnected,
      status: currentStatus,
      deviceName: deviceSession?.deviceName || null,
      clockInTime: clockInVal,
      clockOutTime: clockOutVal,
      checkInMethod: attendance?.checkInMethod || null,
      hasMissingClockOut,
      elapsedAttendanceSeconds: totalClockSeconds,
      totalClockSeconds,
      untrackedSeconds,
      tasksPerHour,
      operationalSignal,
      activeTask: activeTimer?.task ? {
        entryId: activeTimer.id,
        taskId: activeTimer.taskId,
        title: activeTimer.task.title,
        priority: activeTimer.task.priority,
        startTime: activeTimer.startTime,
        elapsedSeconds: Math.max(0, Math.floor((Date.now() - new Date(activeTimer.startTime).getTime()) / 1000)),
      } : null,
    };

    // 4. Task Performance Calculation (Deterministic logic)
    const totalSessionSeconds = finalTotalActive + finalTotalIdle || 1;
    const avgActiveSecondsPerTask = tasksCount > 0 ? Math.round(finalTotalActive / tasksCount) : 0;
    const avgIdleSecondsPerTask = tasksCount > 0 ? Math.round(finalTotalIdle / tasksCount) : 0;
    const activeRatioPct = Math.round((finalTotalActive / totalSessionSeconds) * 100);
    const idleRatioPct = Math.round((finalTotalIdle / totalSessionSeconds) * 100);
    const idleToActiveRatio = finalTotalActive > 0 ? (finalTotalIdle / finalTotalActive).toFixed(1) : '0.0';

    const taskPerformance = {
      activeTask: activeTimer?.task ? {
        entryId: activeTimer.id,
        taskId: activeTimer.taskId,
        title: activeTimer.task.title,
        priority: activeTimer.task.priority,
        startTime: activeTimer.startTime,
        elapsedSeconds: Math.max(0, Math.floor((Date.now() - new Date(activeTimer.startTime).getTime()) / 1000)),
      } : null,
      tasksCompletedCount: tasksCount,
      tasksOpenCount: openTasks.length,
      tasksOverdueCount: overdueTasks.length,
      tasksPerHour,
      tasksCreatedCount: createdTasks.length,
      avgActiveSecondsPerTask,
      avgIdleSecondsPerTask,
      activeRatioPct,
      idleRatioPct,
      idleToActiveRatio,
      operationalSignal,
      weeklyAvgLateStartMinutes,
      totalProductiveSeconds,
      totalUnproductiveSeconds,
      tasks: completedTasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        completedAt: t.completedDate || t.updatedAt,
        projectName: t.project?.name || 'عام',
      })),
      openTasks: openTasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        projectName: t.project?.name || 'عام',
      })),
      overdueTasks: overdueTasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        projectName: t.project?.name || 'عام',
      })),
      createdTasks: createdTasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt,
        assignedToName: t.assignee ? [t.assignee.firstName, t.assignee.lastName].filter(Boolean).join(' ') : 'غير محدد',
        projectName: t.project?.name || 'عام',
      }))
    };

    // 5. Break Detection Calculation
    const breaksSummary = this.computeBreaksFromActivities(activities);

    // 6. Aggregate apps
    const appMap = new Map();
    for (const a of apps) {
      const key = a.appName || 'Unknown';
      const cat = (a.category && a.category !== 'unrated')
        ? a.category
        : classifyItemCategory(a.appName, 'app', customCategories);

      if (!appMap.has(key)) {
        appMap.set(key, {
          appName: key,
          windowTitle: a.windowTitle,
          category: cat,
          durationSeconds: 0,
          entriesCount: 0,
        });
      }
      const existing = appMap.get(key);
      existing.durationSeconds += (a.durationSeconds || 0);
      existing.entriesCount += 1;
      if (a.windowTitle) existing.windowTitle = a.windowTitle;
    }
    const aggregatedApps = Array.from(appMap.values()).sort(
      (a, b) => b.durationSeconds - a.durationSeconds
    );

    // 7. Aggregate web
    const webMap = new Map();
    for (const w of websites) {
      const key = w.domain || w.url || 'Unknown';
      const cat = (w.category && w.category !== 'unrated')
        ? w.category
        : classifyItemCategory(w.domain || w.url, 'web', customCategories);

      if (!webMap.has(key)) {
        webMap.set(key, {
          domain: key,
          url: w.url,
          pageTitle: w.pageTitle,
          category: cat,
          durationSeconds: 0,
          entriesCount: 0,
        });
      }
      const existing = webMap.get(key);
      existing.durationSeconds += (w.durationSeconds || 0);
      existing.entriesCount += 1;
      if (w.pageTitle) existing.pageTitle = w.pageTitle;
    }
    const aggregatedWeb = Array.from(webMap.values()).sort(
      (a, b) => b.durationSeconds - a.durationSeconds
    );

    return {
      date,
      summary: finalSummary,
      employee: employeeRecord || {
        id: resolvedUserId,
        firstName: userRecord ? [userRecord.firstName, userRecord.lastName].filter(Boolean).join(' ') : 'الموظف',
        department: { name: 'الإدارة العامة' },
        position: { title: 'موظف' }
      },
      taskPerformance,
      breaksSummary,
      activities,
      apps: aggregatedApps,
      rawApps: apps,
      websites: aggregatedWeb,
      rawWebsites: websites,
    };
  }

  async getCategories(companyId) {
    return this.prisma.monitorAppCategory.findMany({
      where: { companyId }
    });
  }

  async updateCategory(companyId, categoryData) {
    const res = await this.prisma.monitorAppCategory.upsert({
      where: {
        companyId_name_type_departmentId: {
          companyId,
          name: categoryData.name,
          type: categoryData.type,
          departmentId: categoryData.departmentId || null
        }
      },
      update: { category: categoryData.category },
      create: { ...categoryData, companyId }
    });

    try {
      if (categoryData.type === 'app') {
        await this.prisma.monitorAppUsage.updateMany({
          where: { companyId, appName: categoryData.name },
          data: { category: categoryData.category }
        });
      } else {
        await this.prisma.monitorWebUsage.updateMany({
          where: { companyId, domain: categoryData.name },
          data: { category: categoryData.category }
        });
      }
    } catch (e) {
      console.warn('[MonitorService] Failed to cascade category update:', e.message);
    }

    return res;
  }

  async recalculateDailySummary(companyId, employeeId, date) {
    return this.syncEmployeeDailySummary(companyId, employeeId, date);
  }
}

module.exports = new MonitorService();
