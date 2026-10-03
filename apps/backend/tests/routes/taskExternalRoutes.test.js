const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const request = require('supertest');
const { generateTaskApiKey, hashTaskApiKey } = require('../../services/taskIntegrationService');

const companyId1 = 'company-test-1';
const companyId2 = 'company-test-2';

const adminUser = {
  id: 'user-admin-1',
  companyId: companyId1,
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@company1.com',
  role: 'COMPANY_ADMIN',
  isActive: true
};

const activeAssignee = {
  id: 'user-assignee-1',
  companyId: companyId1,
  firstName: 'Ahmed',
  lastName: 'Assignee',
  email: 'ahmed@company1.com',
  role: 'EMPLOYEE',
  isActive: true
};

const secondAssignee = {
  id: 'user-assignee-2',
  companyId: companyId1,
  firstName: 'Sara',
  lastName: 'Dev',
  email: 'sara@company1.com',
  role: 'EMPLOYEE',
  isActive: true
};

const inactiveUser = {
  id: 'user-inactive-1',
  companyId: companyId1,
  firstName: 'Inactive',
  lastName: 'User',
  email: 'inactive@company1.com',
  role: 'EMPLOYEE',
  isActive: false
};

const otherCompanyUser = {
  id: 'user-other-company',
  companyId: companyId2,
  firstName: 'Other',
  lastName: 'CompanyUser',
  email: 'other@company2.com',
  role: 'EMPLOYEE',
  isActive: true
};

const keyPairFull = generateTaskApiKey('tsk');
const keyPairNoUpdate = generateTaskApiKey('tsk');
const keyPairReadOnly = generateTaskApiKey('tsk');
const keyPairAssigneeOnly = generateTaskApiKey('tsk');
const keyPairGoalsOnly = generateTaskApiKey('tsk');

let taskStore = [];
let goalStore = [];
let activities = [];
let sentNotifications = [];
let queuedWebhooks = [];

const mockPrisma = {
  taskApiCredential: {
    findFirst: async ({ where }) => {
      if (where.keyPrefix === keyPairFull.keyPrefix) {
        return {
          id: 'cred-full',
          companyId: companyId1,
          userId: adminUser.id,
          defaultActingUserId: adminUser.id,
          name: 'full-tasks-key',
          keyHash: hashTaskApiKey(keyPairFull.rawKey),
          scopes: JSON.stringify(['tasks:read', 'tasks:write', 'tasks:update']),
          expiresAt: null,
          isActive: true
        };
      }
      if (where.keyPrefix === keyPairNoUpdate.keyPrefix) {
        return {
          id: 'cred-no-update',
          companyId: companyId1,
          userId: adminUser.id,
          defaultActingUserId: adminUser.id,
          name: 'legacy-write-key',
          keyHash: hashTaskApiKey(keyPairNoUpdate.rawKey),
          scopes: JSON.stringify(['tasks:read', 'tasks:write']), // Missing tasks:update
          expiresAt: null,
          isActive: true
        };
      }
      if (where.keyPrefix === keyPairReadOnly.keyPrefix) {
        return {
          id: 'cred-readonly',
          companyId: companyId1,
          userId: adminUser.id,
          defaultActingUserId: adminUser.id,
          name: 'read-only-key',
          keyHash: hashTaskApiKey(keyPairReadOnly.rawKey),
          scopes: JSON.stringify(['tasks:read']),
          expiresAt: null,
          isActive: true
        };
      }
      if (where.keyPrefix === keyPairAssigneeOnly.keyPrefix) {
        return {
          id: 'cred-assignee',
          companyId: companyId1,
          userId: activeAssignee.id, // non-manager employee
          defaultActingUserId: null,
          name: 'assignee-key',
          keyHash: hashTaskApiKey(keyPairAssigneeOnly.rawKey),
          scopes: JSON.stringify(['tasks:read', 'tasks:write', 'tasks:update']),
          expiresAt: null,
          isActive: true
        };
      }
      if (where.keyPrefix === keyPairGoalsOnly.keyPrefix) {
        return {
          id: 'cred-goals',
          companyId: companyId1,
          userId: adminUser.id,
          defaultActingUserId: adminUser.id,
          name: 'goals-scoped-key',
          keyHash: hashTaskApiKey(keyPairGoalsOnly.rawKey),
          scopes: JSON.stringify(['goals:read', 'goals:write']),
          expiresAt: null,
          isActive: true
        };
      }
      return null;
    },
    update: async () => null
  },
  $transaction: async (fn) => fn(mockPrisma),
  company: {
    findUnique: async () => ({ id: companyId1, timezone: 'Africa/Cairo' })
  },
  hRSettings: {
    findUnique: async () => ({ workDays: '0,1,2,3,4' })
  },
  goal: {
    findFirst: async ({ where }) => {
      const g = goalStore.find((item) => {
        if (where.id && item.id !== where.id) return false;
        if (where.companyId && item.companyId !== where.companyId) return false;
        return true;
      });
      if (!g) return null;
      const linkedTasks = taskStore.filter((t) => t.goalId === g.id);
      return {
        ...g,
        childGoals: g.childGoals || [],
        tasks: linkedTasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          measurementType: t.measurementType || 'TIME',
          metricUnit: t.metricUnit || null,
          metricTargetValue: t.metricTargetValue || null,
          metricCurrentValue: t.metricCurrentValue || 0,
          progress: t.progress || 0
        })),
        project: null,
        department: null,
        parentGoal: null,
        attendance: null
      };
    },
    findMany: async ({ where }) => {
      return goalStore.filter((g) => {
        if (where.companyId && g.companyId !== where.companyId) return false;
        if (where.userId && g.userId !== where.userId) return false;
        if (where.goalType && g.goalType !== where.goalType) return false;
        if (where.status && g.status !== where.status) return false;
        return true;
      }).map((g) => ({
        ...g,
        childGoals: g.childGoals || [],
        tasks: taskStore.filter((t) => t.goalId === g.id).map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          measurementType: t.measurementType || 'TIME',
          metricUnit: t.metricUnit || null,
          metricTargetValue: t.metricTargetValue || null,
          metricCurrentValue: t.metricCurrentValue || 0,
          progress: t.progress || 0
        })),
        project: null,
        department: null,
        parentGoal: null,
        attendance: null
      }));
    },
    create: async ({ data }) => {
      const g = {
        id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        childGoals: [],
        tasks: [],
        project: null,
        department: null,
        parentGoal: null,
        attendance: null
      };
      goalStore.push(g);
      return g;
    },
    update: async ({ where, data }) => {
      const idx = goalStore.findIndex((g) => g.id === where.id);
      if (idx === -1) throw new Error('Goal not found');
      goalStore[idx] = { ...goalStore[idx], ...data, updatedAt: new Date() };
      return goalStore[idx];
    },
    deleteMany: async () => ({ count: 0 })
  },
  user: {
    findFirst: async ({ where }) => {
      const allUsers = [adminUser, activeAssignee, secondAssignee, inactiveUser, otherCompanyUser];
      return allUsers.find((u) => {
        if (where.id && u.id !== where.id) return false;
        if (where.isActive !== undefined && u.isActive !== where.isActive) return false;
        if (where.OR) {
          const matchCompany = where.OR.some((cond) => cond.companyId === u.companyId);
          if (!matchCompany) return false;
        }
        return true;
      }) || null;
    },
    findMany: async () => [adminUser, activeAssignee, secondAssignee]
  },
  task: {
    findFirst: async ({ where }) => {
      const t = taskStore.find((item) => {
        if (where.id && item.id !== where.id) return false;
        if (where.companyId && item.companyId !== where.companyId) return false;
        return true;
      });
      if (!t) return null;
      const linkedGoal = t.goalId ? goalStore.find((g) => g.id === t.goalId) : null;
      return {
        ...t,
        goal: linkedGoal ? { id: linkedGoal.id, title: linkedGoal.title, goalType: linkedGoal.goalType, progress: linkedGoal.progress } : null
      };
    },
    findUnique: async ({ where }) => {
      const t = taskStore.find((item) => item.id === where.id) || null;
      if (!t) return null;
      const linkedGoal = t.goalId ? goalStore.find((g) => g.id === t.goalId) : null;
      return {
        ...t,
        goal: linkedGoal ? { id: linkedGoal.id, title: linkedGoal.title, goalType: linkedGoal.goalType, progress: linkedGoal.progress } : null
      };
    },
    findMany: async ({ where }) => {
      return taskStore
        .filter((t) => t.companyId === where.companyId)
        .map((t) => {
          const linkedGoal = t.goalId ? goalStore.find((g) => g.id === t.goalId) : null;
          return {
            ...t,
            goal: linkedGoal ? { id: linkedGoal.id, title: linkedGoal.title, goalType: linkedGoal.goalType, progress: linkedGoal.progress } : null
          };
        });
    },
    count: async ({ where }) => {
      return taskStore.filter((t) => t.companyId === where.companyId).length;
    },
    create: async ({ data }) => {
      const linkedGoal = data.goalId ? goalStore.find((g) => g.id === data.goalId) : null;
      const task = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        assignee: data.assignedTo === activeAssignee.id ? activeAssignee : adminUser,
        creator: adminUser,
        project: null,
        goal: linkedGoal ? { id: linkedGoal.id, title: linkedGoal.title, goalType: linkedGoal.goalType, progress: linkedGoal.progress } : null
      };
      taskStore.push(task);
      return task;
    },
    update: async ({ where, data }) => {
      const index = taskStore.findIndex((t) => t.id === where.id);
      if (index === -1) throw new Error('Task not found');
      taskStore[index] = {
        ...taskStore[index],
        ...data,
        updatedAt: new Date()
      };
      const t = taskStore[index];
      const assigneeObj = t.assignedTo === secondAssignee.id
        ? secondAssignee
        : t.assignedTo === activeAssignee.id
          ? activeAssignee
          : adminUser;
      const linkedGoal = t.goalId ? goalStore.find((g) => g.id === t.goalId) : null;
      return {
        ...t,
        assignee: assigneeObj,
        creator: adminUser,
        project: null,
        goal: linkedGoal ? { id: linkedGoal.id, title: linkedGoal.title, goalType: linkedGoal.goalType, progress: linkedGoal.progress } : null
      };
    },
    updateMany: async ({ where, data }) => {
      let count = 0;
      taskStore.forEach((t, idx) => {
        if (where.companyId && t.companyId !== where.companyId) return;
        if (where.goalId && t.goalId !== where.goalId) return;
        taskStore[idx] = { ...t, ...data, updatedAt: new Date() };
        count++;
      });
      return { count };
    }
  },
  taskActivity: {
    create: async ({ data }) => {
      activities.push(data);
      return { id: `act-${Date.now()}`, ...data };
    }
  }
};

// Mock dependencies
const sharedDatabase = require('../../services/sharedDatabase');
sharedDatabase.getSharedPrismaClient = () => mockPrisma;

const taskNotificationService = require('../../services/taskNotificationService');
taskNotificationService.notify = async (payload) => {
  sentNotifications.push(payload);
  return { id: `notif-${Date.now()}`, ...payload };
};

taskNotificationService.notifyTaskStakeholders = async (payload) => {
  sentNotifications.push({ ...payload, isStakeholderNotification: true });
  return [];
};

const taskWebhookService = require('../../services/taskWebhookService');
taskWebhookService.queueTaskWebhook = (event, payload) => {
  queuedWebhooks.push({ event, payload });
};

// Setup Express app
const taskExternalRoutes = require('../../routes/taskExternalRoutes');
const app = express();
app.use(express.json());
app.use('/api/v1/external/tasks', taskExternalRoutes);

const resetTestState = () => {
  taskStore = [
    {
      id: 'task-comp1-1',
      companyId: companyId1,
      projectId: null,
      title: 'Original Title',
      description: 'Original Description',
      status: 'PENDING',
      priority: 'MEDIUM',
      type: 'general',
      assignedTo: activeAssignee.id,
      createdBy: adminUser.id,
      dueDate: new Date('2026-05-01T12:00:00.000Z'),
      startDate: null,
      completedDate: null,
      estimatedHours: 2,
      actualHours: 0,
      progress: 0,
      tags: JSON.stringify(['initial']),
      dependencies: null,
      isRecurring: false,
      recurringRule: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      assignee: { id: activeAssignee.id, firstName: activeAssignee.firstName, lastName: activeAssignee.lastName },
      creator: { id: adminUser.id, firstName: adminUser.firstName, lastName: adminUser.lastName },
      project: null
    },
    {
      id: 'task-comp2-foreign',
      companyId: companyId2,
      projectId: null,
      title: 'Foreign Company Task',
      description: 'Must never be touched by company 1',
      status: 'PENDING',
      priority: 'HIGH',
      type: 'general',
      assignedTo: otherCompanyUser.id,
      createdBy: otherCompanyUser.id,
      dueDate: null,
      startDate: null,
      completedDate: null,
      estimatedHours: 0,
      actualHours: 0,
      progress: 0,
      tags: null,
      dependencies: null,
      isRecurring: false,
      recurringRule: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      assignee: null,
      creator: null,
      project: null
    }
  ];
  goalStore = [];
  activities = [];
  sentNotifications = [];
  queuedWebhooks = [];
};

test('1) Acceptance Criterion 1: Update description of existing task returns 200 and subsequent GET /:id returns new description', async () => {
  resetTestState();

  const patchRes = await request(app)
    .patch('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairFull.rawKey)
    .send({
      description: 'Updated Description via External API'
    });

  assert.strictEqual(patchRes.statusCode, 200);
  assert.strictEqual(patchRes.body.success, true);
  assert.strictEqual(patchRes.body.data.description, 'Updated Description via External API');

  const getRes = await request(app)
    .get('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairFull.rawKey);

  assert.strictEqual(getRes.statusCode, 200);
  assert.strictEqual(getRes.body.success, true);
  assert.strictEqual(getRes.body.data.description, 'Updated Description via External API');
});

test('2) Acceptance Criterion 2: Updating title, priority, dueDate, estimatedHours, assignedTo all work and verified by GET', async () => {
  resetTestState();

  const patchRes = await request(app)
    .patch('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairFull.rawKey)
    .send({
      title: 'Updated Title via External API',
      description: 'Updated Description via External API',
      priority: 'URGENT',
      dueDate: '2026-06-15T10:00:00.000Z',
      estimatedHours: 8,
      assignedTo: secondAssignee.id
    });

  assert.strictEqual(patchRes.statusCode, 200);
  assert.strictEqual(patchRes.body.success, true);
  assert.strictEqual(patchRes.body.data.title, 'Updated Title via External API');
  assert.strictEqual(patchRes.body.data.priority, 'URGENT');
  assert.strictEqual(patchRes.body.data.estimatedHours, 8);
  assert.strictEqual(patchRes.body.data.assignedTo, secondAssignee.id);

  const getRes = await request(app)
    .get('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairFull.rawKey);

  assert.strictEqual(getRes.statusCode, 200);
  assert.strictEqual(getRes.body.data.title, 'Updated Title via External API');
  assert.strictEqual(getRes.body.data.priority, 'URGENT');
  assert.strictEqual(getRes.body.data.estimatedHours, 8);
  assert.strictEqual(getRes.body.data.assignedTo, secondAssignee.id);
});

test('3) Acceptance Criterion 3: Key without tasks:write scope returns 403', async () => {
  resetTestState();

  const response = await request(app)
    .patch('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairReadOnly.rawKey)
    .send({
      title: 'Attempt without write scope'
    });

  assert.strictEqual(response.statusCode, 403);
  assert.strictEqual(response.body.success, false);
  assert.match(response.body.message, /tasks:write/);
});

test('4) Acceptance Criterion 4: Task from another company returns 403, non-existent returns 404', async () => {
  resetTestState();

  // Cross-company task modification -> 403 Forbidden
  const responseForeign = await request(app)
    .patch('/api/v1/external/tasks/task-comp2-foreign')
    .set('x-api-key', keyPairFull.rawKey)
    .send({
      title: 'Trying to update foreign task'
    });

  assert.strictEqual(responseForeign.statusCode, 403);
  assert.strictEqual(responseForeign.body.success, false);
  assert.match(responseForeign.body.message, /Access denied/);

  // Non-existent task -> 404 Not Found
  const responseNotFound = await request(app)
    .patch('/api/v1/external/tasks/task-does-not-exist')
    .set('x-api-key', keyPairFull.rawKey)
    .send({
      title: 'Non-existent task'
    });

  assert.strictEqual(responseNotFound.statusCode, 404);
  assert.strictEqual(responseNotFound.body.success, false);
  assert.strictEqual(responseNotFound.body.message, 'Task not found');
});

test('5) Acceptance Criterion 5: TaskActivity log is written and notification sent to assignee', async () => {
  resetTestState();

  const response = await request(app)
    .patch('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairFull.rawKey)
    .send({
      description: 'Checking activity log and notifications'
    });

  assert.strictEqual(response.statusCode, 200);

  // Check activity log
  assert.ok(activities.length > 0, 'Must record at least one taskActivity');
  const updateActivity = activities.find((a) => a.action === 'external_task_update');
  assert.ok(updateActivity, 'taskActivity with action external_task_update must be recorded');
  assert.match(updateActivity.description, /full-tasks-key/);

  // Check notification to assignee
  const assigneeNotification = sentNotifications.find((n) => n.userId === activeAssignee.id || n.task?.assignedTo === activeAssignee.id);
  assert.ok(assigneeNotification, 'Assignee must receive a notification');
});

test('6) Non-manager assignee-only key cannot update task details (403)', async () => {
  resetTestState();

  const response = await request(app)
    .patch('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairAssigneeOnly.rawKey)
    .send({
      title: 'Unauthorized title update by assignee'
    });

  assert.strictEqual(response.statusCode, 403);
  assert.strictEqual(response.body.success, false);
  assert.match(response.body.message, /غير مصرح للمكلّف فقط/);
});

test('7) PUT /:id also supported for updating task', async () => {
  resetTestState();

  const response = await request(app)
    .put('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairFull.rawKey)
    .send({
      priority: 'HIGH'
    });

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.body.success, true);
  assert.strictEqual(response.body.data.priority, 'HIGH');
});

test('8) Rejects invalid dueDate with 400', async () => {
  resetTestState();

  const response = await request(app)
    .patch('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairFull.rawKey)
    .send({
      dueDate: 'invalid-date-string'
    });

  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(response.body.success, false);
  assert.match(response.body.message, /dueDate/i);
});

test('9) Rejects empty title with 400', async () => {
  resetTestState();

  const response = await request(app)
    .patch('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairFull.rawKey)
    .send({
      title: '   '
    });

  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(response.body.success, false);
});

test('10) Rejects request with no updatable fields with 400', async () => {
  resetTestState();

  const response = await request(app)
    .patch('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairFull.rawKey)
    .send({});

  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(response.body.success, false);
});

test('11) Acceptance Criterion: POST /goals creates goal and returns 201 with id', async () => {
  resetTestState();

  const response = await request(app)
    .post('/api/v1/external/tasks/goals')
    .set('x-api-key', keyPairFull.rawKey)
    .send({
      title: 'Target 50 Confirmed Orders',
      targetValue: 50,
      unit: 'orders',
      goalType: 'EMPLOYEE',
      employeeId: activeAssignee.id
    });

  assert.strictEqual(response.statusCode, 201);
  assert.strictEqual(response.body.success, true);
  assert.ok(response.body.id || response.body.data?.id);
  const createdGoal = response.body.data || response.body.goal;
  assert.strictEqual(createdGoal.title, 'Target 50 Confirmed Orders');
  assert.strictEqual(createdGoal.targetValue, 50);
  assert.strictEqual(createdGoal.unit, 'orders');
  assert.strictEqual(createdGoal.goalType, 'EMPLOYEE');
});

test('12) Acceptance Criterion: GET /goals lists goals and supports filtering', async () => {
  resetTestState();

  const createRes1 = await request(app)
    .post('/api/v1/external/tasks/goals')
    .set('x-api-key', keyPairFull.rawKey)
    .send({
      title: 'Employee Goal 1',
      targetValue: 20,
      unit: 'calls',
      goalType: 'EMPLOYEE',
      employeeId: activeAssignee.id
    });
  assert.strictEqual(createRes1.statusCode, 201);

  const createRes2 = await request(app)
    .post('/api/v1/external/tasks/goals')
    .set('x-api-key', keyPairFull.rawKey)
    .send({
      title: 'Company Goal 2',
      targetValue: 100000,
      unit: 'EGP',
      goalType: 'COMPANY'
    });
  assert.strictEqual(createRes2.statusCode, 201);

  // List all goals
  const listAllRes = await request(app)
    .get('/api/v1/external/tasks/goals')
    .set('x-api-key', keyPairFull.rawKey);

  assert.strictEqual(listAllRes.statusCode, 200);
  assert.strictEqual(listAllRes.body.success, true);
  assert.strictEqual(listAllRes.body.data.length, 2);

  // Filter by employeeId
  const listFilteredRes = await request(app)
    .get(`/api/v1/external/tasks/goals?employeeId=${activeAssignee.id}`)
    .set('x-api-key', keyPairFull.rawKey);

  assert.strictEqual(listFilteredRes.statusCode, 200);
  assert.strictEqual(listFilteredRes.body.data.length, 1);
  assert.strictEqual(listFilteredRes.body.data[0].title, 'Employee Goal 1');
});

test('13) Acceptance Criterion: GET /goals/:id returns single goal, 404 for non-existent', async () => {
  resetTestState();

  const createRes = await request(app)
    .post('/api/v1/external/tasks/goals')
    .set('x-api-key', keyPairFull.rawKey)
    .send({
      title: 'Single Test Goal',
      targetValue: 10,
      unit: 'items',
      goalType: 'COMPANY'
    });
  assert.strictEqual(createRes.statusCode, 201);
  const goalId = createRes.body.id || createRes.body.data.id;

  const getRes = await request(app)
    .get(`/api/v1/external/tasks/goals/${goalId}`)
    .set('x-api-key', keyPairFull.rawKey);

  assert.strictEqual(getRes.statusCode, 200);
  assert.strictEqual(getRes.body.success, true);
  assert.strictEqual(getRes.body.data.id, goalId);
  assert.strictEqual(getRes.body.data.title, 'Single Test Goal');

  const notFoundRes = await request(app)
    .get('/api/v1/external/tasks/goals/non-existent-id')
    .set('x-api-key', keyPairFull.rawKey);

  assert.strictEqual(notFoundRes.statusCode, 404);
  assert.strictEqual(notFoundRes.body.success, false);
});

test('14) Acceptance Criterion: PATCH /goals/:id/progress updates goal progress', async () => {
  resetTestState();

  const createRes = await request(app)
    .post('/api/v1/external/tasks/goals')
    .set('x-api-key', keyPairFull.rawKey)
    .send({
      title: 'Progress Target Goal',
      targetValue: 100,
      unit: 'units',
      goalType: 'COMPANY'
    });
  assert.strictEqual(createRes.statusCode, 201);
  const goalId = createRes.body.id || createRes.body.data.id;

  const progressRes = await request(app)
    .patch(`/api/v1/external/tasks/goals/${goalId}/progress`)
    .set('x-api-key', keyPairFull.rawKey)
    .send({
      currentValue: 50
    });

  assert.strictEqual(progressRes.statusCode, 200);
  assert.strictEqual(progressRes.body.success, true);
  assert.strictEqual(progressRes.body.data.currentValue, 50);
  assert.strictEqual(progressRes.body.data.progress, 50);
});

test('15) Acceptance Criterion: PATCH /goals/:id updates goal properties', async () => {
  resetTestState();

  const createRes = await request(app)
    .post('/api/v1/external/tasks/goals')
    .set('x-api-key', keyPairFull.rawKey)
    .send({
      title: 'Original Goal Title',
      targetValue: 30,
      unit: 'tickets',
      goalType: 'COMPANY'
    });
  assert.strictEqual(createRes.statusCode, 201);
  const goalId = createRes.body.id || createRes.body.data.id;

  const updateRes = await request(app)
    .patch(`/api/v1/external/tasks/goals/${goalId}`)
    .set('x-api-key', keyPairFull.rawKey)
    .send({
      title: 'Updated Goal Title',
      priority: 'HIGH'
    });

  assert.strictEqual(updateRes.statusCode, 200);
  assert.strictEqual(updateRes.body.success, true);
  assert.strictEqual(updateRes.body.data.title, 'Updated Goal Title');
  assert.strictEqual(updateRes.body.data.priority, 'HIGH');
});

test('16) Acceptance Criterion: POST / tasks creates task with goalId, and GET returns goalTitle, goalType, goalProgress', async () => {
  resetTestState();

  // Create a goal
  const goalRes = await request(app)
    .post('/api/v1/external/tasks/goals')
    .set('x-api-key', keyPairFull.rawKey)
    .send({
      title: 'Q4 Revenue Goal',
      targetValue: 50000,
      unit: 'EGP',
      goalType: 'COMPANY'
    });
  assert.strictEqual(goalRes.statusCode, 201);
  const goalId = goalRes.body.id || goalRes.body.data.id;

  // Create task linked to goal
  const taskRes = await request(app)
    .post('/api/v1/external/tasks')
    .set('x-api-key', keyPairFull.rawKey)
    .send({
      title: 'Close enterprise lead deal',
      description: 'Negotiate and sign contract',
      assignedTo: activeAssignee.id,
      goalId
    });

  assert.strictEqual(taskRes.statusCode, 201);
  assert.strictEqual(taskRes.body.success, true);
  assert.strictEqual(taskRes.body.data.goalId, goalId);
  assert.strictEqual(taskRes.body.data.goalTitle, 'Q4 Revenue Goal');
  assert.strictEqual(taskRes.body.data.goalType, 'COMPANY');

  const taskId = taskRes.body.data.id;

  // GET /:id returns goal fields
  const getTaskRes = await request(app)
    .get(`/api/v1/external/tasks/${taskId}`)
    .set('x-api-key', keyPairFull.rawKey);

  assert.strictEqual(getTaskRes.statusCode, 200);
  assert.strictEqual(getTaskRes.body.data.goalTitle, 'Q4 Revenue Goal');
  assert.strictEqual(getTaskRes.body.data.goalType, 'COMPANY');
  assert.strictEqual(getTaskRes.body.data.goalId, goalId);

  // GET / returns goal fields for task
  const listTasksRes = await request(app)
    .get('/api/v1/external/tasks')
    .set('x-api-key', keyPairFull.rawKey);

  assert.strictEqual(listTasksRes.statusCode, 200);
  const matchedTask = listTasksRes.body.data.find((t) => t.id === taskId);
  assert.ok(matchedTask);
  assert.strictEqual(matchedTask.goalTitle, 'Q4 Revenue Goal');
  assert.strictEqual(matchedTask.goalType, 'COMPANY');
});

test('17) Read-only API key cannot create or update goals (403)', async () => {
  resetTestState();

  const response = await request(app)
    .post('/api/v1/external/tasks/goals')
    .set('x-api-key', keyPairReadOnly.rawKey)
    .send({
      title: 'Unauthorized Goal',
      targetValue: 10
    });

  assert.strictEqual(response.statusCode, 403);
  assert.strictEqual(response.body.success, false);
});

test('18) Key with only goals:read can read goals but cannot write tasks or goals (403)', async () => {
  resetTestState();

  // Reading goals works with goals:read
  const getRes = await request(app)
    .get('/api/v1/external/tasks/goals')
    .set('x-api-key', keyPairGoalsOnly.rawKey);

  assert.strictEqual(getRes.statusCode, 200);
  assert.strictEqual(getRes.body.success, true);

  // Writing task is denied without tasks:write
  const postTaskRes = await request(app)
    .post('/api/v1/external/tasks')
    .set('x-api-key', keyPairGoalsOnly.rawKey)
    .send({
      title: 'Should fail',
      description: 'No tasks:write scope'
    });

  assert.strictEqual(postTaskRes.statusCode, 403);
});

test('19) Rejects invalid goalId with 400 when creating task', async () => {
  resetTestState();

  const response = await request(app)
    .post('/api/v1/external/tasks')
    .set('x-api-key', keyPairFull.rawKey)
    .send({
      title: 'Task with bogus goal',
      description: 'Description',
      goalId: 'non-existent-goal-id'
    });

  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(response.body.success, false);
  assert.match(response.body.message, /goalId/i);
});

