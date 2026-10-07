// Mock Electron API bridge for browser testing, Vite dev preview, and automated verification
// Only active when window.electronAPI is undefined. In real Electron, preload.js provides the real bridge.

const mockTasks = [
  {
    id: 'task-101',
    title: 'تطوير نظام معايير القبول وشاشة بيئة العمل المستقلة (Task Cockpit)',
    status: 'IN_PROGRESS',
    priority: 'URGENT',
    description: 'بناء شاشة بيئة عمل متكاملة بنمط 70/30 مع شريط أوامر علوي ومعايير قبول تفاعلية مع حفظ التقدم وإمكانية التحرير الكامل.',
    acceptanceCriteria: [
      { id: 'crit-1', text: 'شريط تقدم تفاعلي (Micro-progress bar) بنسبة الإنجاز', completed: true },
      { id: 'crit-2', text: 'دعم السحب والإفلات وإعادة ترتيب المعايير بالماوس ولوحة المفاتيح', completed: true },
      { id: 'crit-3', text: 'بوابة فحص إلزامية تمنع اعتماد المهمة قبل إتمام المعايير بنسبة 100%', completed: false },
      { id: 'crit-4', text: 'شاشة بيئة عمل مستقلة TaskCockpitPage مع اختصارات Esc و Ctrl+E', completed: true },
    ],
    assignedTo: 'usr-1',
    assigneeName: 'مختار الدسوقي',
    assignee: { id: 'usr-1', firstName: 'مختار', lastName: 'الدسوقي', email: 'mokhtar@maxp.online' },
    createdBy: 'usr-1',
    createdByName: 'مختار الدسوقي',
    creator: { id: 'usr-1', firstName: 'مختار', lastName: 'الدسوقي', email: 'mokhtar@maxp.online' },
    dueDate: '2026-10-15T18:00:00.000Z',
    tags: ['desktop', 'cockpit', 'quality-gate'],
    taskWatchers: [{ id: 'w-1', userId: 'usr-1', user: { id: 'usr-1', firstName: 'مختار', lastName: 'الدسوقي' } }],
    taskAttachments: [],
    createdAt: '2026-10-06T10:00:00.000Z',
  },
  {
    id: 'task-102',
    title: 'اعتماد مخرجات تصميم واجهة المتجر للموبايل',
    status: 'IN_REVIEW',
    priority: 'HIGH',
    description: 'مراجعة وتدقيق الواجهات الجديدة لمتجر سوان للتأكد من خلوها من مشاكل البوكسات المتداخلة وتوافقها التام مع شاشات 390px.',
    acceptanceCriteria: [
      { id: 'crit-201', text: 'عدم وجود بطاقات متداخلة (Box-in-Box على الموبايل)', completed: true },
      { id: 'crit-202', text: 'استغلال أكثر من 85% من عرض الشاشة (390px)', completed: false },
    ],
    assignedTo: 'usr-2',
    assigneeName: 'أحمد علي',
    assignee: { id: 'usr-2', firstName: 'أحمد', lastName: 'علي', email: 'ahmed@maxp.online' },
    createdBy: 'usr-1',
    createdByName: 'مختار الدسوقي',
    creator: { id: 'usr-1', firstName: 'مختار', lastName: 'الدسوقي', email: 'mokhtar@maxp.online' },
    dueDate: '2026-10-12T12:00:00.000Z',
    tags: ['mobile', 'review'],
    taskWatchers: [],
    taskAttachments: [],
    createdAt: '2026-10-05T08:00:00.000Z',
  },
];

let tasksState = [...mockTasks];

export function initMockElectronBridge() {
  if (typeof window === 'undefined' || window.electronAPI) {
    return;
  }

  console.info('[MockBridge] Initializing mock electronAPI for browser dev/testing environment.');

  window.electronAPI = {
    getAuthState: async () => ({
      isLoggedIn: true,
      user: {
        id: 'usr-1',
        firstName: 'مختار',
        lastName: 'الدسوقي',
        role: 'ADMIN',
        companyId: 'comp-1',
        email: 'mokhtar@maxp.online',
      },
      serverUrl: 'https://maxp.online',
    }),
    getAuthToken: async () => ({ token: 'mock-auth-token-xyz' }),
    login: async () => ({
      success: true,
      user: { id: 'usr-1', firstName: 'مختار', lastName: 'الدسوقي', role: 'ADMIN' },
    }),
    logout: async () => true,

    getTasks: async () => ({
      success: true,
      tasks: [...tasksState],
      fromCache: false,
      isOffline: false,
    }),
    getCompanyUsers: async () => ({
      success: true,
      users: [
        { id: 'usr-1', firstName: 'مختار', lastName: 'الدسوقي', email: 'mokhtar@maxp.online' },
        { id: 'usr-2', firstName: 'أحمد', lastName: 'علي', email: 'ahmed@maxp.online' },
      ],
    }),
    getTask: async (taskId: string) => {
      const task = tasksState.find((t) => t.id === taskId);
      return { success: Boolean(task), task: task || null };
    },
    createTask: async (taskData: any) => {
      const newTask = {
        id: `task-${Date.now()}`,
        ...taskData,
        createdAt: new Date().toISOString(),
      };
      tasksState.unshift(newTask);
      return { success: true, task: newTask };
    },
    updateTask: async (taskId: string, data: any) => {
      tasksState = tasksState.map((t) => (t.id === taskId ? { ...t, ...data } : t));
      const updated = tasksState.find((t) => t.id === taskId);
      return { success: true, task: updated };
    },
    updateTaskStatus: async (
      taskId: string,
      status: string,
      revisionReason?: string,
      _options?: any,
      _returnReasonType?: string,
      _returnSeverity?: number
    ) => {
      tasksState = tasksState.map((t) =>
        t.id === taskId ? { ...t, status, revisionReason: revisionReason || (t as any).revisionReason } : t
      );
      const updated = tasksState.find((t) => t.id === taskId);
      return { success: true, task: updated };
    },
    getTaskActivities: async () => ({
      success: true,
      data: [
        {
          id: 'act-1',
          action: 'STATUS_CHANGED',
          details: 'تم بدء العمل على المهمة',
          user: { firstName: 'مختار', lastName: 'الدسوقي' },
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    }),
    startTaskTimer: async () => ({ success: true, entry: { id: 'timer-1' } }),
    stopTaskTimer: async () => ({ success: true }),
    getRunningTaskTimer: async () => ({ success: true, runningTimer: null, runningTimers: [] }),
    getCompanyActiveTimers: async () => ({ success: true, activeTimers: [] }),
    getTeamOverview: async () => ({ success: true, data: [] }),

    getSubtasks: async () => ({ success: true, subtasks: [] }),
    createSubtask: async () => ({ success: true, subtask: {} }),
    getChecklists: async () => ({ success: true, checklists: [] }),
    createChecklist: async () => ({ success: true, checklist: {} }),
    addChecklistItem: async () => ({ success: true, item: {} }),
    updateChecklistItem: async () => ({ success: true, item: {} }),
    deleteChecklistItem: async () => ({ success: true }),

    getTaskComments: async () => ({
      success: true,
      comments: [
        {
          id: 'comm-1',
          content: 'تم الانتهاء من هيكل الكومبوننتس بالكامل بنجاح.',
          user: { firstName: 'مختار', lastName: 'الدسوقي' },
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        },
      ],
    }),
    addTaskComment: async (_taskId: string, content: string) => ({
      success: true,
      comment: {
        id: `comm-${Date.now()}`,
        content,
        user: { firstName: 'مختار', lastName: 'الدسوقي' },
        createdAt: new Date().toISOString(),
      },
    }),
    updateTaskComment: async () => ({ success: true, comment: {} }),
    deleteTaskComment: async () => ({ success: true }),

    getTaskDependencies: async () => ({ success: true, data: { blocking: [], blockedBy: [] } }),
    addTaskDependency: async () => ({ success: true }),
    removeTaskDependency: async () => ({ success: true }),

    addWatcher: async (taskId: string, userId: string) => {
      tasksState = tasksState.map((t) => {
        if (t.id === taskId) {
          const watchers = t.taskWatchers || [];
          return {
            ...t,
            taskWatchers: [...watchers, { id: `w-${Date.now()}`, userId, user: { id: userId, firstName: 'مختار', lastName: 'الدسوقي' } }],
          };
        }
        return t;
      });
      return { success: true };
    },
    removeWatcher: async (taskId: string, userId: string) => {
      tasksState = tasksState.map((t) => {
        if (t.id === taskId) {
          const watchers = t.taskWatchers || [];
          return {
            ...t,
            taskWatchers: watchers.filter((w: any) => (w.userId || w.id) !== userId),
          };
        }
        return t;
      });
      return { success: true };
    },

    uploadTaskAttachment: async () => ({ success: true }),
    fetchAttachment: async () => ({ success: false }),
    captureDesktopSnippet: async () => ({ success: false }),

    getTrackerState: async () => ({
      isTracking: false,
      isPaused: false,
      todaySeconds: 14400,
      idleSeconds: 0,
      currentWindow: 'Visual Studio Code',
      activeApp: 'Code.exe',
    }),
    toggleTracking: async () => true,
    pauseTracking: async () => {},
    resumeTracking: async () => {},
    endShift: async () => ({ success: true }),
    startShift: async () => ({ success: true }),
    getDailySummary: async () => ({ totalDurationSeconds: 14400, productiveSeconds: 12500 }),
    getAppsSummary: async () => [],
    getWebsitesSummary: async () => [],
    getAllDailyStatsKeys: async () => [],
    getSystemInfo: async () => ({ hostname: 'MaxP-Workstation', platform: 'win32' }),
    syncNow: async () => ({ success: true }),
    getAttendanceAudit: async () => ({ status: 'CLOCKED_IN', totalHoursToday: 4 }),
    clockIn: async () => ({ success: true }),
    getSettings: async () => ({}),
    updateSettings: async () => true,

    getTodayGoals: async () => ({ success: true, goals: [] }),
    ensureTodayGoals: async () => ({ success: true, goals: [] }),
    getGoals: async () => ({ success: true, goals: [] }),
    createGoal: async () => ({ success: true }),
    updateGoalProgress: async () => ({ success: true }),
    getTaskDashboardStats: async () => ({ success: true, stats: {} }),

    getMyAttendanceSummary: async () => ({
      success: true,
      stats: {
        presentDays: 22,
        absentDays: 1,
        lateDays: 2,
        totalWorkHours: 176,
        overtimeHours: 12.5,
      },
      recent: [
        {
          id: 'att-1',
          date: new Date().toISOString(),
          clockIn: new Date(Date.now() - 5 * 3600000).toISOString(),
          clockOut: null,
          method: 'desktop_workspace',
          status: 'PRESENT',
          workHours: 5.0,
          overtimeHours: 0,
        },
        {
          id: 'att-2',
          date: new Date(Date.now() - 86400000).toISOString(),
          clockIn: new Date(Date.now() - 86400000 - 8 * 3600000).toISOString(),
          clockOut: new Date(Date.now() - 86400000).toISOString(),
          method: 'desktop_workspace',
          status: 'PRESENT',
          workHours: 8.0,
          overtimeHours: 1.5,
        },
        {
          id: 'att-3',
          date: new Date(Date.now() - 2 * 86400000).toISOString(),
          clockIn: new Date(Date.now() - 2 * 86400000 - 8 * 3600000).toISOString(),
          clockOut: new Date(Date.now() - 2 * 86400000).toISOString(),
          method: 'desktop_workspace',
          status: 'PRESENT',
          workHours: 8.0,
          overtimeHours: 0,
        },
      ],
    }),

    getMyPayrollSummary: async () => ({
      success: true,
      payroll: {
        month: '2026-10',
        basicSalary: 12000,
        hourlyRate: 65,
        currency: 'EGP',
        salaryType: 'MONTHLY',
      },
      projection: {
        baseSalary: 12000,
        earnedBaseSalary: 2800,
        daysPassedWorking: 7,
        totalWorkingDays: 26,
        overtimeAmount: 1250,
        bonusAmount: 500,
        deductionAmount: 200,
        earnedNetSalary: 4350,
        netEstimated: 13550,
        currency: 'EGP',
        totalHoursLogged: 188.5,
        deductionsDetails: [
          {
            id: 'ded-1',
            date: '2026-10-04',
            reason: 'تأخير صباحي 25 دقيقة عن موعد الوردية',
            amount: 150,
            type: 'LATENESS',
          },
          {
            id: 'ded-2',
            date: '2026-10-02',
            reason: 'انصراف مبكر قبل نهاية الوردية الرسمية',
            amount: 50,
            type: 'EARLY_LEAVE',
          },
        ],
      },
    }),

    getMyPermissionsSummary: async () => ({
      success: true,
      stats: {
        totalRequests: 1,
        pendingCount: 0,
        totalHours: 0.5,
        maxAllowedMinutes: 120,
        remainingMinutes: 90,
      },
      leavesConfig: {
        annualLeaveBalance: 18,
        totalAnnualLeaves: 21,
        sickLeaveBalance: 14,
      },
      requests: [
        {
          id: 'perm-1',
          type: 'PERSONAL_DURING_DAY',
          date: '2026-10-05',
          durationMinutes: 30,
          reason: 'ظرف طارئ لمراجعة البنك',
          status: 'APPROVED',
          createdAt: '2026-10-05T08:30:00Z',
        },
      ],
    }),

    createPermissionRequest: async (data: any) => ({
      success: true,
      data: {
        id: `perm-${Date.now()}`,
        ...data,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      },
    }),

    getMyAdvances: async () => ({
      success: true,
      requests: [
        {
          id: 'adv-1',
          amount: 1500,
          reason: 'ظرف أسري طارئ',
          repaymentType: 'INSTALLMENTS',
          installmentsCount: 2,
          status: 'APPROVED',
          createdAt: '2026-10-01T10:00:00Z',
        },
      ],
      config: {
        maxAdvanceAmount: 3000,
        maxInstallments: 6,
      },
    }),

    createAdvanceRequest: async (data: any) => ({
      success: true,
      data: {
        id: `adv-${Date.now()}`,
        ...data,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      },
    }),

    getMyPerformanceScore: async () => ({
      success: true,
      data: {
        compositeScore: 88,
        isEvaluated: true,
        tier: 'TIER_A',
        tierLabel: 'ممتاز (Tier A)',
        pillars: {
          delivery: { score: 92, weight: 25, label: 'سرعة ومعدل الإنجاز', details: '12/14 مهمة مكتملة في الموعد' },
          quality: { score: 90, weight: 25, label: 'جودة المخرجات والاعتماد', details: 'صفر إرجاعات مسجلة، مخرجات موثقة' },
          punctuality: { score: 85, weight: 20, label: 'الانضباط والحضور', details: '1 تأخير طفيف من 22 وردية حضور' },
          focus: { score: 88, weight: 20, label: 'التركيز والنشاط الرقمي', details: '88% معدل نشاط حقيقي وموثق' },
          goals: { score: 85, weight: 10, label: 'الأهداف ومؤشرات النتائج', details: 'تحقيق مستهدفات الشهر بنسبة 85%' },
        },
        recommendations: [
          'تسليم المهام المتبقية قبل موعد الاستحقاق يعزز من مؤشر الإنجاز إلى Tier S.',
          'الحفاظ على وتيرة الحضور الصباحي المبكر يرفع نقاط الانضباط مباشرة.'
        ],
        period: 'آخر 30 يوماً',
        telemetryStats: {
          tasksCompleted: 12,
          totalTasks: 14,
          onTimeTasks: 12,
          lateTasksCount: 0,
          returns: 0,
          missingEvidenceCount: 0,
          presentDays: 22,
          lateDays: 1,
          absentDays: 0,
          workDaysScheduled: 22,
          monitoredDays: 20,
          activeGoals: 2
        },
        drilldownDetails: {
          lateTasks: [],
          returnedTasks: []
        }
      }
    }),

    openExternal: async () => ({ success: true }),
    copyToClipboard: async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {}
      return { success: true };
    },
    readClipboardText: async () => ({ success: true, text: '' }),
    windowMinimize: async () => true,
    windowToggleMaximize: async () => true,
    windowClose: async () => true,
    windowIsMaximized: async () => false,
    getDeviceInfo: async () => ({
      hostname: 'MaxP-Workstation',
      platform: 'win32',
      release: '10.0.22631',
      appVersion: '1.0.86',
    }),
    checkForUpdates: async () => ({
      success: true,
      status: 'up-to-date',
      currentVersion: '1.0.86',
      message: 'التطبيق محدث إلى آخر إصدار',
    }),
    quitAndInstallUpdate: async () => {},

    onUpdateStatus: () => () => {},
    onTrackerStateUpdate: () => () => {},
    onNotification: () => () => {},
    onTaskAssigned: () => () => {},
    onTasksRefresh: () => () => {},
    onDayRollover: () => () => {},
    onInactivityReturn: () => () => {},
    onAuthLoggedOut: () => () => {},
  } as any;
}
