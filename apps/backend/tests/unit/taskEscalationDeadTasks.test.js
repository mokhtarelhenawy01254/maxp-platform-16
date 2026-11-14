const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const BACKEND_ROOT = path.resolve(__dirname, '../..');
const DAY = 24 * 60 * 60 * 1000;

function createMockState() {
  return {
    tasks: [],
    settings: new Map(),
    notifications: [],
    activities: [],
    users: [],
    whatsappCalls: [],
    pushCalls: [],
    templates: [],
    sessions: [],
    seq: 1,
  };
}

function matchesWhere(item, where) {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    if (key === 'OR') {
      if (!cond.some((sub) => matchesWhere(item, sub))) return false;
      continue;
    }
    if (key === 'AND') {
      if (!cond.every((sub) => matchesWhere(item, sub))) return false;
      continue;
    }
    const val = item[key];
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('not' in cond) {
        if (cond.not === null && val === null) return false;
        if (cond.not !== null && val === cond.not) return false;
      }
      if ('lt' in cond) {
        if (val === null || val === undefined) return false;
        const v = val instanceof Date ? val.getTime() : typeof val === 'number' ? val : new Date(val).getTime();
        const c = cond.lt instanceof Date ? cond.lt.getTime() : typeof cond.lt === 'number' ? cond.lt : new Date(cond.lt).getTime();
        if (!(v < c)) return false;
      }
      if ('lte' in cond) {
        if (val === null || val === undefined) return false;
        const v = val instanceof Date ? val.getTime() : typeof val === 'number' ? val : new Date(val).getTime();
        const c = cond.lte instanceof Date ? cond.lte.getTime() : typeof cond.lte === 'number' ? cond.lte : new Date(cond.lte).getTime();
        if (!(v <= c)) return false;
      }
      if ('gt' in cond) {
        if (val === null || val === undefined) return false;
        const v = val instanceof Date ? val.getTime() : typeof val === 'number' ? val : new Date(val).getTime();
        const c = cond.gt instanceof Date ? cond.gt.getTime() : typeof cond.gt === 'number' ? cond.gt : new Date(cond.gt).getTime();
        if (!(v > c)) return false;
      }
      if ('in' in cond) {
        if (!cond.in.includes(val)) return false;
      }
      if ('notIn' in cond) {
        if (cond.notIn.includes(val)) return false;
      }
    } else if (val !== cond) {
      return false;
    }
  }
  return true;
}

function setupHarness() {
  const state = createMockState();

  const mockPrisma = {
    task: {
      findMany: async ({ where, orderBy, take, select } = {}) => {
        let rows = state.tasks.filter((t) => matchesWhere(t, where));
        if (orderBy?.dueDate === 'asc') {
          rows = [...rows].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        }
        if (typeof take === 'number') {
          rows = rows.slice(0, take);
        }
        if (select) {
          return rows.map((t) => {
            const res = {};
            for (const k of Object.keys(select)) {
              if (select[k]) res[k] = t[k];
            }
            return res;
          });
        }
        return rows.map((t) => ({ ...t }));
      },
      findFirst: async ({ where } = {}) => {
        const found = state.tasks.find((t) => matchesWhere(t, where));
        return found ? { ...found } : null;
      },
      count: async ({ where } = {}) => state.tasks.filter((t) => matchesWhere(t, where)).length,
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const t of state.tasks) {
          if (matchesWhere(t, where)) {
            Object.assign(t, data);
            count += 1;
          }
        }
        return { count };
      },
      update: async ({ where, data }) => {
        const t = state.tasks.find((item) => item.id === where.id);
        if (!t) throw new Error('Task not found');
        Object.assign(t, data);
        return { ...t };
      },
    },
    taskEscalationSettings: {
      findUnique: async ({ where }) => {
        const row = state.settings.get(where.companyId);
        return row ? { ...row } : null;
      },
      upsert: async ({ where, create, update }) => {
        const existing = state.settings.get(where.companyId);
        const next = existing
          ? { ...existing, ...update, updatedAt: new Date() }
          : { id: `set_${state.seq++}`, ...create, updatedAt: new Date() };
        state.settings.set(where.companyId, next);
        return { ...next };
      },
    },
    taskNotification: {
      create: async ({ data }) => {
        const row = { id: `notif_${state.seq++}`, createdAt: new Date(), ...data };
        state.notifications.push(row);
        return row;
      },
    },
    taskActivity: {
      create: async ({ data }) => {
        const row = { id: `act_${state.seq++}`, createdAt: new Date(), ...data };
        state.activities.push(row);
        return row;
      },
    },
    user: {
      findMany: async ({ where } = {}) =>
        state.users.filter((u) => matchesWhere(u, where)).map((u) => ({ ...u })),
      findFirst: async ({ where } = {}) => {
        const found = state.users.find((u) => matchesWhere(u, where));
        return found ? { ...found } : null;
      },
      findUnique: async ({ where }) => {
        const found = state.users.find((u) => u.id === where.id);
        return found ? { ...found } : null;
      },
    },
    project: {
      findUnique: async () => null,
    },
  };

  const sharedDbPath = require.resolve(path.join(BACKEND_ROOT, 'services/sharedDatabase.js'));
  require.cache[sharedDbPath] = {
    id: sharedDbPath,
    filename: sharedDbPath,
    loaded: true,
    exports: {
      getSharedPrismaClient: () => mockPrisma,
      getSharedPrismaClientAsync: async () => mockPrisma,
      safeQuery: async (fn) => fn(),
    },
  };

  const waPath = require.resolve(path.join(BACKEND_ROOT, 'services/whatsapp/WhatsAppNotificationService.js'));
  require.cache[waPath] = {
    id: waPath,
    filename: waPath,
    loaded: true,
    exports: {
      sendNotification: async (opts) => {
        state.whatsappCalls.push(opts);
        return { success: true };
      },
    },
  };

  const pushPath = require.resolve(path.join(BACKEND_ROOT, 'services/browserPushService.js'));
  require.cache[pushPath] = {
    id: pushPath,
    filename: pushPath,
    loaded: true,
    exports: {
      sendBrowserPushToUser: async (opts) => {
        state.pushCalls.push(opts);
        return { success: true };
      },
    },
  };

  const webhookPath = require.resolve(path.join(BACKEND_ROOT, 'services/taskWebhookService.js'));
  require.cache[webhookPath] = {
    id: webhookPath,
    filename: webhookPath,
    loaded: true,
    exports: {
      queueTaskWebhook: () => {},
    },
  };

  const i18nPath = require.resolve(path.join(BACKEND_ROOT, 'services/i18n.js'));
  require.cache[i18nPath] = {
    id: i18nPath,
    filename: i18nPath,
    loaded: true,
    exports: {
      t: (key) => key,
    },
  };

  for (const rel of ['services/taskNotificationService.js', 'services/taskEscalationService.js', 'cron/taskEscalationCron.js']) {
    const resolved = require.resolve(path.join(BACKEND_ROOT, rel));
    delete require.cache[resolved];
  }

  const taskEscalationService = require(path.join(BACKEND_ROOT, 'services/taskEscalationService.js'));
  const taskEscalationCron = require(path.join(BACKEND_ROOT, 'cron/taskEscalationCron.js'));

  return { state, mockPrisma, taskEscalationService, taskEscalationCron };
}

test('taskEscalationDeadTasks: weekly dead tasks report and 30-min cron expression', async (t) => {
  // Test 1: مهمة متأخرة 8 أيام → تدخل التقرير بـ recommendation: 'extend'
  await t.test('1. task overdue 8 days enters report with recommendation: extend', async () => {
    const { state, mockPrisma, taskEscalationService } = setupHarness();
    const now = new Date('2026-11-13T10:00:00.000Z');

    state.tasks.push({
      id: 'task_8d',
      companyId: 'comp_1',
      title: 'Task Overdue 8 Days',
      status: 'IN_PROGRESS',
      dueDate: new Date(now.getTime() - 8 * DAY),
      updatedAt: new Date(now.getTime() - 8 * DAY),
      assignedTo: 'user_1',
      escalationLevel: 2,
      snoozedUntil: null,
      assignee: { id: 'user_1', firstName: 'Ahmed', lastName: 'Ali' },
      project: { id: 'proj_1', name: 'Alpha' },
    });

    const report = await taskEscalationService.buildDeadTasksReport('comp_1', { now }, mockPrisma);

    assert.equal(report.companyId, 'comp_1');
    assert.equal(report.total, 1);
    assert.equal(typeof report.tasks[0].daysOverdue, 'number');
    assert.equal(report.tasks[0].daysOverdue, 8);
    assert.equal(report.tasks[0].recommendation, 'extend');
    assert.equal(report.tasks[0].reason, 'تمديد أسبوع مقترح');
    assert.equal(report.byRecommendation.extend, 1);
    assert.equal(report.byRecommendation.reassign, 0);
    assert.equal(report.byRecommendation.cancel, 0);
  });

  // Test 2: مهمة متأخرة 40 يوم و updatedAt من 20 يوم → 'cancel'
  await t.test('2. task overdue 40 days and not updated for 20 days gets recommendation: cancel', async () => {
    const { state, mockPrisma, taskEscalationService } = setupHarness();
    const now = new Date('2026-11-13T10:00:00.000Z');

    state.tasks.push({
      id: 'task_40d',
      companyId: 'comp_1',
      title: 'Task Overdue 40 Days',
      status: 'IN_PROGRESS',
      dueDate: new Date(now.getTime() - 40 * DAY),
      updatedAt: new Date(now.getTime() - 20 * DAY),
      assignedTo: 'user_1',
      escalationLevel: 3,
      snoozedUntil: null,
    });

    const report = await taskEscalationService.buildDeadTasksReport('comp_1', { now }, mockPrisma);

    assert.equal(report.total, 1);
    assert.equal(report.tasks[0].daysOverdue, 40);
    assert.equal(report.tasks[0].recommendation, 'cancel');
    assert.equal(report.tasks[0].reason, 'متأخرة 40 يوم بدون تحديث 20 يوم');
    assert.equal(report.byRecommendation.cancel, 1);
    assert.equal(report.byRecommendation.extend, 0);
    assert.equal(report.byRecommendation.reassign, 0);
  });

  // Test 3: 3 مهام لنفس المكلَّف (تأخر 10 أيام) → التلاتة 'reassign' (والقاعدة 2 تسبق 3)
  await t.test('3. 3 tasks for same assignee (10 days overdue) all get recommendation: reassign', async () => {
    const { state, mockPrisma, taskEscalationService } = setupHarness();
    const now = new Date('2026-11-13T10:00:00.000Z');

    state.tasks.push(
      {
        id: 'task_reassign_1',
        companyId: 'comp_1',
        title: 'Task 1',
        status: 'IN_PROGRESS',
        dueDate: new Date(now.getTime() - 10 * DAY),
        updatedAt: new Date(now.getTime() - 2 * DAY),
        assignedTo: 'heavy_assignee',
        escalationLevel: 2,
      },
      {
        id: 'task_reassign_2',
        companyId: 'comp_1',
        title: 'Task 2',
        status: 'IN_PROGRESS',
        dueDate: new Date(now.getTime() - 10 * DAY),
        updatedAt: new Date(now.getTime() - 2 * DAY),
        assignedTo: 'heavy_assignee',
        escalationLevel: 2,
      },
      {
        id: 'task_reassign_3',
        companyId: 'comp_1',
        title: 'Task 3',
        status: 'IN_PROGRESS',
        dueDate: new Date(now.getTime() - 10 * DAY),
        updatedAt: new Date(now.getTime() - 2 * DAY),
        assignedTo: 'heavy_assignee',
        escalationLevel: 2,
      }
    );

    const report = await taskEscalationService.buildDeadTasksReport('comp_1', { now }, mockPrisma);

    assert.equal(report.total, 3);
    assert.equal(report.byRecommendation.reassign, 3);
    assert.equal(report.byRecommendation.extend, 0);
    assert.equal(report.byRecommendation.cancel, 0);
    for (const tsk of report.tasks) {
      assert.equal(tsk.recommendation, 'reassign');
      assert.equal(tsk.reason, 'المكلَّف عليه 3 مهام ميتة');
    }
  });

  // Test 4: مهمة متأخرة 3 أيام → مش في التقرير (النافذة 7 أيام)
  await t.test('4. task overdue 3 days is excluded from the report (window is 7 days)', async () => {
    const { state, mockPrisma, taskEscalationService } = setupHarness();
    const now = new Date('2026-11-13T10:00:00.000Z');

    state.tasks.push({
      id: 'task_3d',
      companyId: 'comp_1',
      title: 'Task Overdue 3 Days',
      status: 'IN_PROGRESS',
      dueDate: new Date(now.getTime() - 3 * DAY),
      updatedAt: new Date(now.getTime() - 1 * DAY),
      assignedTo: 'user_1',
      escalationLevel: 1,
    });

    const report = await taskEscalationService.buildDeadTasksReport('comp_1', { now, windowDays: 7 }, mockPrisma);

    assert.equal(report.total, 0);
    assert.equal(report.tasks.length, 0);
    assert.equal(report.byRecommendation.extend, 0);
    assert.equal(report.byRecommendation.reassign, 0);
    assert.equal(report.byRecommendation.cancel, 0);
  });

  // Test 5: status: 'COMPLETED' و 'CANCELLED' → مستبعدة
  await t.test('5. completed and cancelled tasks are excluded from report', async () => {
    const { state, mockPrisma, taskEscalationService } = setupHarness();
    const now = new Date('2026-11-13T10:00:00.000Z');

    state.tasks.push(
      {
        id: 'task_completed',
        companyId: 'comp_1',
        title: 'Completed Overdue Task',
        status: 'COMPLETED',
        dueDate: new Date(now.getTime() - 15 * DAY),
        assignedTo: 'user_1',
      },
      {
        id: 'task_cancelled',
        companyId: 'comp_1',
        title: 'Cancelled Overdue Task',
        status: 'CANCELLED',
        dueDate: new Date(now.getTime() - 25 * DAY),
        assignedTo: 'user_1',
      }
    );

    const report = await taskEscalationService.buildDeadTasksReport('comp_1', { now }, mockPrisma);

    assert.equal(report.total, 0);
    assert.equal(report.tasks.length, 0);
  });

  // Test 6: ESCALATION_CRON_EXPRESSION === '*/30 * * * *' و DEAD_TASKS_CRON_EXPRESSION === '0 9 * * 1'
  await t.test('6. cron expressions match spec: 30-min escalation and Monday 09:00 dead tasks', () => {
    const { taskEscalationCron } = setupHarness();

    assert.equal(taskEscalationCron.ESCALATION_CRON_EXPRESSION, '*/30 * * * *');
    assert.equal(taskEscalationCron.DEAD_TASKS_CRON_EXPRESSION, '0 9 * * 1');
  });

  // Test 7: runWeeklyDeadTasksReport({ companyId }) بينادي مرة واحدة لكل شركة وبيرجّع totals صح
  await t.test('7. runWeeklyDeadTasksReport aggregates totals and runs once per targeted company', async () => {
    const { state, mockPrisma, taskEscalationService } = setupHarness();
    const now = new Date('2026-11-13T10:00:00.000Z');

    // Comp 1: 1 extend (8 days), 1 cancel (40 days, updated 20 days ago)
    state.tasks.push(
      {
        id: 'c1_task1',
        companyId: 'comp_1',
        title: 'Comp 1 Task 1',
        status: 'IN_PROGRESS',
        dueDate: new Date(now.getTime() - 8 * DAY),
        updatedAt: new Date(now.getTime() - 8 * DAY),
        assignedTo: 'u1',
      },
      {
        id: 'c1_task2',
        companyId: 'comp_1',
        title: 'Comp 1 Task 2',
        status: 'IN_PROGRESS',
        dueDate: new Date(now.getTime() - 40 * DAY),
        updatedAt: new Date(now.getTime() - 20 * DAY),
        assignedTo: 'u2',
      }
    );

    // Comp 2: 1 extend (9 days)
    state.tasks.push({
      id: 'c2_task1',
      companyId: 'comp_2',
      title: 'Comp 2 Task 1',
      status: 'IN_PROGRESS',
      dueDate: new Date(now.getTime() - 9 * DAY),
      updatedAt: new Date(now.getTime() - 9 * DAY),
      assignedTo: 'u3',
    });

    // Targeted single company
    const singleRun = await taskEscalationService.runWeeklyDeadTasksReport({
      companyId: 'comp_1',
      now,
      prisma: mockPrisma,
    });
    assert.equal(singleRun.companies.length, 1);
    assert.equal(singleRun.companies[0].companyId, 'comp_1');
    assert.equal(singleRun.totals.total, 2);
    assert.equal(singleRun.totals.extend, 1);
    assert.equal(singleRun.totals.cancel, 1);
    assert.equal(singleRun.totals.reassign, 0);

    // Multi company sweep across all
    const allRun = await taskEscalationService.runWeeklyDeadTasksReport({
      now,
      prisma: mockPrisma,
    });
    assert.equal(allRun.companies.length, 2);
    assert.equal(allRun.totals.total, 3);
    assert.equal(allRun.totals.extend, 2);
    assert.equal(allRun.totals.cancel, 1);
    assert.equal(allRun.totals.reassign, 0);
  });
});
