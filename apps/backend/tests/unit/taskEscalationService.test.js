const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const BACKEND_ROOT = path.resolve(__dirname, '../..');

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
      findMany: async ({ where, orderBy, take } = {}) => {
        let rows = state.tasks.filter((t) => matchesWhere(t, where));
        if (orderBy?.dueDate === 'asc') {
          rows = [...rows].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        }
        if (typeof take === 'number') {
          rows = rows.slice(0, take);
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
    whatsAppNotificationTemplate: {
      findFirst: async ({ where } = {}) =>
        state.templates.find((t) => matchesWhere(t, where)) || null,
    },
    whatsAppSession: {
      findFirst: async ({ where } = {}) =>
        state.sessions.find((s) => matchesWhere(s, where)) || null,
    },
  };

  // Inject lightweight mocks into require.cache so tests run offline with zero real DB/network/external deps
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

  // Clear cached service modules so each suite gets clean bindings
  for (const rel of ['services/taskNotificationService.js', 'services/taskEscalationService.js']) {
    const resolved = require.resolve(path.join(BACKEND_ROOT, rel));
    delete require.cache[resolved];
  }

  const taskEscalationService = require(path.join(BACKEND_ROOT, 'services/taskEscalationService.js'));

  state.users.push(
    { id: 'emp_1', companyId: 'comp_1', isActive: true, role: 'AGENT', firstName: 'Ali', lastName: 'Emp', phone: '201000000001' },
    { id: 'mgr_1', companyId: 'comp_1', isActive: true, role: 'MANAGER', firstName: 'Mona', lastName: 'Mgr', phone: '201000000002' },
    { id: 'own_1', companyId: 'comp_1', isActive: true, role: 'OWNER', firstName: 'Omar', lastName: 'Owner', phone: '201000000003' },
    { id: 'creator_1', companyId: 'comp_1', isActive: true, role: 'MANAGER', firstName: 'Sara', lastName: 'Creator', phone: '201000000004' }
  );

  return { state, mockPrisma, taskEscalationService };
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

test('taskEscalationService: 3-level progression, dedupe, and skip guards', async (t) => {
  await t.test('escalates through 3 levels in order: L1 assignee -> L2 manager -> L3 owner', async () => {
    const { state, mockPrisma, taskEscalationService } = setupHarness();
    const dueDate = new Date('2026-11-10T09:00:00.000Z');

    state.tasks.push({
      id: 'task_prog',
      companyId: 'comp_1',
      title: 'Overdue Task',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate,
      assignedTo: 'emp_1',
      createdBy: 'creator_1',
      escalationLevel: 0,
      lastEscalatedAt: null,
      nextEscalationAt: null,
      snoozedUntil: null,
      acceptanceCriteria: 'Keep untouched',
      hasEvidence: false,
      project: { id: 'proj_1', name: 'Main Project', managerId: 'mgr_1' },
    });

    // Level 1 (+1h): assignee reminder (in-app + push, no WhatsApp)
    const t1 = new Date(dueDate.getTime() + 1 * HOUR);
    const res1 = await taskEscalationService.runEscalationSweep({ companyId: 'comp_1', now: t1, prisma: mockPrisma });
    assert.equal(res1.escalated, 1);
    assert.equal(state.tasks[0].escalationLevel, 1);
    assert.equal(state.tasks[0].status, 'IN_PROGRESS');
    assert.equal(state.tasks[0].assignedTo, 'emp_1');
    assert.equal(state.notifications.length, 1);
    assert.equal(state.notifications[0].userId, 'emp_1');
    assert.equal(state.notifications[0].type, 'task_escalation_l1');
    assert.equal(state.whatsappCalls.length, 0);
    assert.equal(state.activities[0].action, 'escalated');
    assert.equal(state.activities[0].field, 'level_1');
    assert.equal(state.activities[0].newValue, '1');

    // Level 2 (+25h): project manager + WhatsApp TASK_ESCALATION_L2
    const t2 = new Date(dueDate.getTime() + 25 * HOUR);
    const res2 = await taskEscalationService.runEscalationSweep({ companyId: 'comp_1', now: t2, prisma: mockPrisma });
    assert.equal(res2.escalated, 1);
    assert.equal(state.tasks[0].escalationLevel, 2);
    assert.equal(state.notifications.length, 2);
    assert.equal(state.notifications[1].userId, 'mgr_1');
    assert.equal(state.notifications[1].type, 'task_escalation_l2');
    assert.equal(state.whatsappCalls.length, 1);
    assert.equal(state.whatsappCalls[0].eventType, 'TASK_ESCALATION_L2');
    assert.equal(state.activities[1].field, 'level_2');
    assert.equal(state.activities[1].newValue, '2');

    // Level 3 (+73h): company owner + WhatsApp TASK_ESCALATION_L3
    const t3 = new Date(dueDate.getTime() + 73 * HOUR);
    const res3 = await taskEscalationService.runEscalationSweep({ companyId: 'comp_1', now: t3, prisma: mockPrisma });
    assert.equal(res3.escalated, 1);
    assert.equal(state.tasks[0].escalationLevel, 3);
    assert.equal(state.notifications.length, 3);
    assert.equal(state.notifications[2].userId, 'own_1');
    assert.equal(state.notifications[2].type, 'task_escalation_l3');
    assert.equal(state.whatsappCalls.length, 2);
    assert.equal(state.whatsappCalls[1].eventType, 'TASK_ESCALATION_L3');
    assert.equal(state.activities[2].field, 'level_3');
    assert.equal(state.activities[2].newValue, '3');
  });

  await t.test('prevents duplicate notifications within the same day via atomic escalationLevel dedupe', async () => {
    const { state, mockPrisma, taskEscalationService } = setupHarness();
    const now = new Date('2026-11-12T09:00:00.000Z');

    state.tasks.push({
      id: 'task_dedupe',
      companyId: 'comp_1',
      title: 'Dedupe Task',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      dueDate: new Date(now.getTime() - 2 * HOUR),
      assignedTo: 'emp_1',
      createdBy: 'creator_1',
      escalationLevel: 0,
      snoozedUntil: null,
      project: { id: 'proj_1', name: 'Main Project', managerId: 'mgr_1' },
    });

    await taskEscalationService.runEscalationSweep({ companyId: 'comp_1', now, prisma: mockPrisma });
    await taskEscalationService.runEscalationSweep({ companyId: 'comp_1', now: new Date(now.getTime() + 2 * HOUR), prisma: mockPrisma });
    await taskEscalationService.runEscalationSweep({ companyId: 'comp_1', now: new Date(now.getTime() + 6 * HOUR), prisma: mockPrisma });

    const l1Notifs = state.notifications.filter((n) => n.taskId === 'task_dedupe' && n.type === 'task_escalation_l1');
    assert.equal(l1Notifs.length, 1);
    assert.equal(state.activities.length, 1);

    // Direct escalateTask call with stale task snapshot (escalationLevel: 0) is also blocked atomically
    const staleSnapshot = { ...state.tasks[0], escalationLevel: 0 };
    const raceOutcome = await taskEscalationService.escalateTask(staleSnapshot, 1, { now, prisma: mockPrisma });
    assert.equal(raceOutcome.escalated, false);
    assert.equal(raceOutcome.reason, 'already_escalated');
    assert.equal(state.notifications.length, 1);
  });

  await t.test('jumps directly to highest due level (L3) on first scan and logs skipped levels', async () => {
    const { state, mockPrisma, taskEscalationService } = setupHarness();
    const now = new Date('2026-11-12T09:00:00.000Z');

    state.tasks.push({
      id: 'task_jump',
      companyId: 'comp_1',
      title: 'Very Late Task',
      status: 'PENDING',
      priority: 'URGENT',
      dueDate: new Date(now.getTime() - 73 * HOUR),
      assignedTo: 'emp_1',
      createdBy: 'creator_1',
      escalationLevel: 0,
      snoozedUntil: null,
      project: { id: 'proj_1', name: 'Main Project', managerId: 'mgr_1' },
    });

    const summary = await taskEscalationService.runEscalationSweep({ companyId: 'comp_1', now, prisma: mockPrisma });
    assert.equal(summary.escalated, 1);
    assert.equal(state.notifications.length, 1);
    assert.equal(state.notifications[0].type, 'task_escalation_l3');
    assert.equal(state.notifications[0].userId, 'own_1');
    assert.match(state.activities[0].description, /skipped=level_1,level_2/);
  });

  await t.test('skips terminal statuses (COMPLETED, CANCELLED) and null dueDate', async () => {
    const { state, mockPrisma, taskEscalationService } = setupHarness();
    const now = new Date('2026-11-12T09:00:00.000Z');

    state.tasks.push(
      {
        id: 't_completed',
        companyId: 'comp_1',
        title: 'Completed',
        status: 'COMPLETED',
        dueDate: new Date(now.getTime() - 3 * DAY),
        assignedTo: 'emp_1',
        createdBy: 'creator_1',
        escalationLevel: 0,
        snoozedUntil: null,
      },
      {
        id: 't_cancelled',
        companyId: 'comp_1',
        title: 'Cancelled',
        status: 'CANCELLED',
        dueDate: new Date(now.getTime() - 3 * DAY),
        assignedTo: 'emp_1',
        createdBy: 'creator_1',
        escalationLevel: 0,
        snoozedUntil: null,
      },
      {
        id: 't_no_due',
        companyId: 'comp_1',
        title: 'No Due Date',
        status: 'IN_PROGRESS',
        dueDate: null,
        assignedTo: 'emp_1',
        createdBy: 'creator_1',
        escalationLevel: 0,
        snoozedUntil: null,
      }
    );

    const summary = await taskEscalationService.runEscalationSweep({ companyId: 'comp_1', now, prisma: mockPrisma });
    assert.equal(summary.scanned, 0);
    assert.equal(summary.escalated, 0);
    assert.equal(state.notifications.length, 0);
    assert.equal(state.activities.length, 0);
  });

  await t.test('skips all escalations when settings.enabled is false', async () => {
    const { state, mockPrisma, taskEscalationService } = setupHarness();
    const now = new Date('2026-11-12T09:00:00.000Z');

    state.settings.set('comp_1', {
      companyId: 'comp_1',
      enabled: false,
      level1Days: 0,
      level2Days: 1,
      level3Days: 3,
    });

    state.tasks.push({
      id: 't_disabled',
      companyId: 'comp_1',
      title: 'Disabled Settings Task',
      status: 'IN_PROGRESS',
      dueDate: new Date(now.getTime() - 4 * DAY),
      assignedTo: 'emp_1',
      createdBy: 'creator_1',
      escalationLevel: 0,
      snoozedUntil: null,
      project: { id: 'proj_1', name: 'Main Project', managerId: 'mgr_1' },
    });

    const summary = await taskEscalationService.runEscalationSweep({ companyId: 'comp_1', now, prisma: mockPrisma });
    assert.equal(summary.skippedDisabled, true);
    assert.equal(summary.escalated, 0);
    assert.equal(state.notifications.length, 0);
    assert.equal(state.activities.length, 0);
  });

  await t.test('respects snoozedUntil and resumes once snooze expires', async () => {
    const { state, mockPrisma, taskEscalationService } = setupHarness();
    const now = new Date('2026-11-12T09:00:00.000Z');

    state.tasks.push({
      id: 't_snoozed',
      companyId: 'comp_1',
      title: 'Snoozed Task',
      status: 'IN_PROGRESS',
      dueDate: new Date(now.getTime() - 4 * HOUR),
      assignedTo: 'emp_1',
      createdBy: 'creator_1',
      escalationLevel: 0,
      snoozedUntil: new Date(now.getTime() + 2 * DAY),
      project: { id: 'proj_1', name: 'Main Project', managerId: 'mgr_1' },
    });

    const during = await taskEscalationService.runEscalationSweep({ companyId: 'comp_1', now, prisma: mockPrisma });
    assert.equal(during.escalated, 0);
    assert.equal(state.notifications.length, 0);

    // After snooze expires
    const afterSnooze = new Date(now.getTime() + 2 * DAY + 60 * 1000);
    const resumed = await taskEscalationService.runEscalationSweep({ companyId: 'comp_1', now: afterSnooze, prisma: mockPrisma });
    assert.equal(resumed.escalated, 1);
    assert.equal(state.notifications.length, 1);
    assert.equal(state.notifications[0].type, 'task_escalation_l2');
  });

  await t.test('validates escalation level ordering in settings', () => {
    const { taskEscalationService } = setupHarness();
    assert.equal(taskEscalationService.validateEscalationSettings({ level1Days: 0, level2Days: 1, level3Days: 3 }).isValid, true);
    assert.equal(taskEscalationService.validateEscalationSettings({ level1Days: 0, level2Days: 3, level3Days: 3 }).isValid, false);
    assert.equal(taskEscalationService.validateEscalationSettings({ level1Days: 2, level2Days: 2, level3Days: 4 }).isValid, false);
  });
});
