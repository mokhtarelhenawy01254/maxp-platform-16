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

const keyPairWrite = generateTaskApiKey('tsk');
const keyPairReadOnly = generateTaskApiKey('tsk');

let taskStore = [];
let activities = [];
let sentNotifications = [];
let queuedWebhooks = [];

const mockPrisma = {
  taskApiCredential: {
    findFirst: async ({ where }) => {
      if (where.keyPrefix === keyPairWrite.keyPrefix) {
        return {
          id: 'cred-write',
          companyId: companyId1,
          userId: adminUser.id,
          defaultActingUserId: adminUser.id,
          name: 'external-crm-key',
          keyHash: hashTaskApiKey(keyPairWrite.rawKey),
          scopes: JSON.stringify(['tasks:read', 'tasks:write']),
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
          name: 'external-reader-key',
          keyHash: hashTaskApiKey(keyPairReadOnly.rawKey),
          scopes: JSON.stringify(['tasks:read']),
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
      const allUsers = [adminUser, activeAssignee, inactiveUser, otherCompanyUser];
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
    findMany: async () => [adminUser, activeAssignee]
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
    update: async ({ where, data }) => {
      const index = taskStore.findIndex((t) => t.id === where.id);
      if (index === -1) throw new Error('Task not found');
      taskStore[index] = {
        ...taskStore[index],
        ...data,
        updatedAt: new Date()
      };
      return taskStore[index];
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

test('PATCH /api/v1/external/tasks/:id updates title, description, priority, dueDate, tags, assignedTo successfully', async () => {
  resetTestState();

  const response = await request(app)
    .patch('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairWrite.rawKey)
    .send({
      title: 'Updated Title via External API',
      description: 'Updated Description via External API',
      priority: 'URGENT',
      dueDate: '2026-06-15T10:00:00.000Z',
      tags: ['external', 'urgent'],
      assignedTo: activeAssignee.id
    });

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.body.success, true);
  assert.strictEqual(response.body.data.title, 'Updated Title via External API');
  assert.strictEqual(response.body.data.description, 'Updated Description via External API');
  assert.strictEqual(response.body.data.priority, 'URGENT');
  assert.deepStrictEqual(response.body.data.tags, ['external', 'urgent']);
  assert.strictEqual(response.body.data.assignedTo, activeAssignee.id);

  // Check activity log
  assert.ok(activities.length > 0);
  assert.strictEqual(activities[0].action, 'external_task_update');

  // Check notification to assignee
  const assigneeNotification = sentNotifications.find((n) => n.userId === activeAssignee.id);
  assert.ok(assigneeNotification, 'Assignee must receive a notification');
  assert.strictEqual(assigneeNotification.type, 'task_updated');

  // Check webhook
  const updatedWebhook = queuedWebhooks.find((w) => w.event === 'task.updated');
  assert.ok(updatedWebhook, 'Webhook task.updated must be queued');
});

test('PATCH /api/v1/external/tasks/:id rejects modifying a task belonging to another company with 403', async () => {
  resetTestState();

  const response = await request(app)
    .patch('/api/v1/external/tasks/task-comp2-foreign')
    .set('x-api-key', keyPairWrite.rawKey)
    .send({
      description: 'Attempting cross-company edit'
    });

  assert.strictEqual(response.statusCode, 403);
  assert.strictEqual(response.body.success, false);
  assert.match(response.body.message, /another company/i);
});

test('PATCH /api/v1/external/tasks/:id returns 404 for non-existent task', async () => {
  resetTestState();

  const response = await request(app)
    .patch('/api/v1/external/tasks/non-existent-task-id')
    .set('x-api-key', keyPairWrite.rawKey)
    .send({
      description: 'Should be 404'
    });

  assert.strictEqual(response.statusCode, 404);
  assert.strictEqual(response.body.success, false);
});

test('PATCH /api/v1/external/tasks/:id rejects assigning to inactive user with 400', async () => {
  resetTestState();

  const response = await request(app)
    .patch('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairWrite.rawKey)
    .send({
      assignedTo: inactiveUser.id
    });

  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(response.body.success, false);
  assert.match(response.body.message, /assignedTo/i);
});

test('PATCH /api/v1/external/tasks/:id rejects assigning to user from another company with 400', async () => {
  resetTestState();

  const response = await request(app)
    .patch('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairWrite.rawKey)
    .send({
      assignedTo: otherCompanyUser.id
    });

  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(response.body.success, false);
  assert.match(response.body.message, /assignedTo/i);
});

test('PATCH /api/v1/external/tasks/:id rejects invalid priority with 400', async () => {
  resetTestState();

  const response = await request(app)
    .patch('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairWrite.rawKey)
    .send({
      priority: 'SUPER_CRITICAL'
    });

  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(response.body.success, false);
  assert.match(response.body.message, /priority/i);
});

test('PATCH /api/v1/external/tasks/:id rejects invalid dueDate with 400', async () => {
  resetTestState();

  const response = await request(app)
    .patch('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairWrite.rawKey)
    .send({
      dueDate: 'invalid-date-string'
    });

  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(response.body.success, false);
  assert.match(response.body.message, /dueDate/i);
});

test('PATCH /api/v1/external/tasks/:id rejects empty title or empty description with 400', async () => {
  resetTestState();

  const resEmptyTitle = await request(app)
    .patch('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairWrite.rawKey)
    .send({
      title: '   '
    });
  assert.strictEqual(resEmptyTitle.statusCode, 400);
  assert.strictEqual(resEmptyTitle.body.success, false);

  const resEmptyDesc = await request(app)
    .patch('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairWrite.rawKey)
    .send({
      description: '   '
    });
  assert.strictEqual(resEmptyDesc.statusCode, 400);
  assert.strictEqual(resEmptyDesc.body.success, false);
});

test('PATCH /api/v1/external/tasks/:id rejects request with no updatable fields with 400', async () => {
  resetTestState();

  const response = await request(app)
    .patch('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairWrite.rawKey)
    .send({});

  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(response.body.success, false);
});

test('PATCH /api/v1/external/tasks/:id rejects requests from read-only API keys with 403', async () => {
  resetTestState();

  const response = await request(app)
    .patch('/api/v1/external/tasks/task-comp1-1')
    .set('x-api-key', keyPairReadOnly.rawKey)
    .send({
      title: 'Attempt without write scope'
    });

  assert.strictEqual(response.statusCode, 403);
  assert.strictEqual(response.body.success, false);
});
