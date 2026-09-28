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

let taskStore = [];
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
      return null;
    },
    update: async () => null
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
      return taskStore.find((t) => {
        if (where.id && t.id !== where.id) return false;
        if (where.companyId && t.companyId !== where.companyId) return false;
        return true;
      }) || null;
    },
    findUnique: async ({ where }) => {
      return taskStore.find((t) => t.id === where.id) || null;
    },
    findMany: async ({ where }) => {
      return taskStore.filter((t) => t.companyId === where.companyId);
    },
    count: async ({ where }) => {
      return taskStore.filter((t) => t.companyId === where.companyId).length;
    },
    create: async ({ data }) => {
      const task = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        assignee: data.assignedTo === activeAssignee.id ? activeAssignee : adminUser,
        creator: adminUser,
        project: null
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
      return {
        ...t,
        assignee: assigneeObj,
        creator: adminUser,
        project: null
      };
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

test('3) Acceptance Criterion 3: Key without tasks:update scope returns 403', async () => {
  resetTestState();

  const response = await request(app)
    .patch('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairNoUpdate.rawKey)
    .send({
      title: 'Attempt without update scope'
    });

  assert.strictEqual(response.statusCode, 403);
  assert.strictEqual(response.body.success, false);
  assert.match(response.body.message, /tasks:update/);
});

test('4) Acceptance Criterion 4: Task from another company with the same key returns 404', async () => {
  resetTestState();

  const response = await request(app)
    .patch('/api/v1/external/tasks/task-comp2-foreign')
    .set('x-api-key', keyPairFull.rawKey)
    .send({
      title: 'Trying to update foreign task'
    });

  assert.strictEqual(response.statusCode, 404);
  assert.strictEqual(response.body.success, false);
  assert.strictEqual(response.body.message, 'Task not found');
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
