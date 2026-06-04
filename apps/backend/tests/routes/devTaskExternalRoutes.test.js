const express = require('express');
const request = require('supertest');
const { generateDevTaskApiKey, hashTaskApiKey } = require('../../services/devTaskIntegrationService');

const generatedKey = generateDevTaskApiKey();

const reporterMember = {
  id: 'member-reporter',
  userId: 'user-reporter',
  isActive: true,
  user: {
    id: 'user-reporter',
    firstName: 'Nour',
    lastName: 'Reporter',
    email: 'nour@example.com',
    isActive: true
  }
};

const assigneeMember = {
  id: 'member-assignee',
  userId: 'user-assignee',
  isActive: true,
  user: {
    id: 'user-assignee',
    firstName: 'Hossam',
    lastName: 'Assignee',
    email: 'hossam@example.com',
    isActive: true
  }
};

const outsiderMember = {
  id: 'member-outsider',
  userId: 'user-outsider',
  isActive: true,
  user: {
    id: 'user-outsider',
    firstName: 'Mona',
    lastName: 'Outsider',
    email: 'mona@example.com',
    isActive: true
  }
};

const projectStore = [
  {
    id: 'project-1',
    name: 'Core Platform',
    status: 'ACTIVE',
    priority: 'HIGH',
    progress: 45,
    repository: 'git@example.com:core.git',
    updatedAt: new Date('2026-05-07T09:00:00.000Z'),
    managerId: reporterMember.id,
    teamMembers: JSON.stringify([reporterMember.id, assigneeMember.id])
  },
  {
    id: 'project-2',
    name: 'Payments Revamp',
    status: 'ACTIVE',
    priority: 'MEDIUM',
    progress: 15,
    repository: 'git@example.com:payments.git',
    updatedAt: new Date('2026-05-07T09:30:00.000Z'),
    managerId: outsiderMember.id,
    teamMembers: JSON.stringify([outsiderMember.id])
  }
];

const baseTasks = [
  {
    id: 'task-project-1',
    title: 'Investigate payment issue',
    description: 'Came from external website',
    type: 'BUG',
    status: 'BACKLOG',
    priority: 'HIGH',
    component: null,
    assigneeId: assigneeMember.id,
    reporterId: reporterMember.id,
    projectId: 'project-1',
    releaseId: null,
    dueDate: null,
    startDate: null,
    completedDate: null,
    estimatedHours: 0,
    actualHours: 0,
    progress: 0,
    tags: JSON.stringify(['external']),
    gitBranch: null,
    ticketId: null,
    businessValue: null,
    acceptanceCriteria: null,
    relatedLinks: JSON.stringify(['https://example.com']),
    createdAt: new Date('2026-05-07T12:00:00.000Z'),
    updatedAt: new Date('2026-05-07T12:00:00.000Z')
  },
  {
    id: 'task-project-2',
    title: 'Foreign project task',
    description: 'Should never leak through project-1 key',
    type: 'FEATURE',
    status: 'TODO',
    priority: 'MEDIUM',
    component: null,
    assigneeId: outsiderMember.id,
    reporterId: outsiderMember.id,
    projectId: 'project-2',
    releaseId: null,
    dueDate: null,
    startDate: null,
    completedDate: null,
    estimatedHours: 0,
    actualHours: 0,
    progress: 10,
    tags: JSON.stringify(['foreign']),
    gitBranch: null,
    ticketId: null,
    businessValue: null,
    acceptanceCriteria: null,
    relatedLinks: null,
    createdAt: new Date('2026-05-07T10:00:00.000Z'),
    updatedAt: new Date('2026-05-07T10:00:00.000Z')
  }
];

let taskStore;

const membersById = {
  [reporterMember.id]: reporterMember,
  [assigneeMember.id]: assigneeMember,
  [outsiderMember.id]: outsiderMember
};

const projectsById = Object.fromEntries(projectStore.map((project) => [project.id, project]));

const cloneDate = (value) => (value instanceof Date ? new Date(value) : value);

const hydrateTask = (task) => ({
  ...task,
  dueDate: cloneDate(task.dueDate),
  startDate: cloneDate(task.startDate),
  completedDate: cloneDate(task.completedDate),
  createdAt: cloneDate(task.createdAt),
  updatedAt: cloneDate(task.updatedAt),
  dev_project: task.projectId
    ? {
        id: task.projectId,
        name: projectsById[task.projectId]?.name || null
      }
    : null,
  dev_release: task.releaseId
    ? {
        id: task.releaseId,
        version: '1.0.0'
      }
    : null,
  dev_team_members_dev_tasks_assigneeIdTodev_team_members: task.assigneeId
    ? {
        id: task.assigneeId,
        user: {
          firstName: membersById[task.assigneeId]?.user.firstName || '',
          lastName: membersById[task.assigneeId]?.user.lastName || ''
        }
      }
    : null,
  dev_team_members_dev_tasks_reporterIdTodev_team_members: task.reporterId
    ? {
        id: task.reporterId,
        user: {
          firstName: membersById[task.reporterId]?.user.firstName || '',
          lastName: membersById[task.reporterId]?.user.lastName || ''
        }
      }
    : null
});

const applyTaskWhere = (tasks, where = {}) =>
  tasks.filter((task) => {
    if (where.id && task.id !== where.id) {
      return false;
    }

    if (where.projectId && task.projectId !== where.projectId) {
      return false;
    }

    if (where.assigneeId && task.assigneeId !== where.assigneeId) {
      return false;
    }

    if (where.status && task.status !== where.status) {
      return false;
    }

    if (where.priority && task.priority !== where.priority) {
      return false;
    }

    if (where.OR && Array.isArray(where.OR)) {
      const query = String(
        where.OR[0]?.title?.contains || where.OR[1]?.description?.contains || ''
      ).toLowerCase();
      if (
        query &&
        !task.title.toLowerCase().includes(query) &&
        !task.description.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    return true;
  });

const mockPrisma = {
  devTaskApiCredential: {
    findFirst: jest.fn(async ({ where }) => {
      if (where.keyPrefix !== generatedKey.keyPrefix) {
        return null;
      }

      return {
        id: 'cred-dev-task',
        name: 'website-bridge',
        keyHash: hashTaskApiKey(generatedKey.rawKey),
        scopes: JSON.stringify(['dev-tasks:read', 'dev-tasks:write']),
        expiresAt: null,
        defaultReporterMemberId: reporterMember.id,
        defaultAssigneeMemberId: assigneeMember.id,
        defaultProjectId: 'project-1',
        isActive: true,
        revokedAt: null
      };
    }),
    update: jest.fn(async () => null)
  },
  devTeamMember: {
    findFirst: jest.fn(async ({ where }) => {
      const member = membersById[where?.id];
      return member?.isActive ? member : null;
    }),
    findMany: jest.fn(async ({ where } = {}) => {
      const members = Object.values(membersById);
      if (where?.id?.in) {
        return members.filter((member) => where.id.in.includes(member.id));
      }

      return members;
    })
  },
  devProject: {
    findUnique: jest.fn(async ({ where }) => projectsById[where.id] || null)
  },
  devRelease: {
    findUnique: jest.fn(async () => null)
  },
  devTask: {
    create: jest.fn(async ({ data }) => {
      const created = {
        ...data,
        createdAt: new Date('2026-05-07T12:30:00.000Z'),
        updatedAt: new Date('2026-05-07T12:30:00.000Z')
      };
      taskStore.push(created);
      return hydrateTask(created);
    }),
    findMany: jest.fn(async ({ where, skip = 0, take } = {}) => {
      const filtered = applyTaskWhere(taskStore, where);
      return filtered.slice(skip, take ? skip + take : undefined).map(hydrateTask);
    }),
    count: jest.fn(async ({ where } = {}) => applyTaskWhere(taskStore, where).length),
    findFirst: jest.fn(async ({ where }) => {
      const found = applyTaskWhere(taskStore, where)[0];
      return found ? hydrateTask(found) : null;
    }),
    update: jest.fn(async ({ where, data }) => {
      const index = taskStore.findIndex((task) => task.id === where.id);
      taskStore[index] = {
        ...taskStore[index],
        ...data,
        updatedAt: new Date('2026-05-07T13:00:00.000Z')
      };
      return hydrateTask(taskStore[index]);
    })
  },
  devTaskActivity: {
    create: jest.fn(async () => ({
      id: 'activity-1'
    }))
  }
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma
}));

const devTaskExternalRoutes = require('../../routes/devTaskExternalRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/external/dev-tasks', devTaskExternalRoutes);

describe('devTaskExternalRoutes', () => {
  beforeEach(() => {
    taskStore = baseTasks.map((task) => ({
      ...task,
      createdAt: new Date(task.createdAt),
      updatedAt: new Date(task.updatedAt)
    }));
    jest.clearAllMocks();
  });

  test('GET / returns only tasks inside the key bound project', async () => {
    const response = await request(app)
      .get('/api/v1/external/dev-tasks')
      .set('x-api-key', generatedKey.rawKey);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe('task-project-1');
    expect(response.body.data[0].projectId).toBe('project-1');
  });

  test('POST / creates a dev task inside the bound project using x-api-key authentication', async () => {
    const response = await request(app)
      .post('/api/v1/external/dev-tasks')
      .set('x-api-key', generatedKey.rawKey)
      .send({
        title: 'Investigate payment issue',
        description: 'Came from external website',
        type: 'BUG',
        priority: 'HIGH',
        assigneeId: assigneeMember.id,
        projectId: 'project-1',
        tags: ['external'],
        relatedLinks: ['https://example.com']
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.projectId).toBe('project-1');
    expect(response.body.data.reporterName).toBe('Nour Reporter');
    expect(response.body.data.assigneeName).toBe('Hossam Assignee');
  });

  test('POST / rejects creating a task in another project', async () => {
    const response = await request(app)
      .post('/api/v1/external/dev-tasks')
      .set('x-api-key', generatedKey.rawKey)
      .send({
        title: 'Should fail',
        description: 'Cross-project write',
        type: 'BUG',
        priority: 'HIGH',
        projectId: 'project-2'
      });

    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('This API key is restricted to its bound development project');
  });

  test('POST / rejects invalid dueDate values with 400', async () => {
    const response = await request(app)
      .post('/api/v1/external/dev-tasks')
      .set('x-api-key', generatedKey.rawKey)
      .send({
        title: 'Should fail',
        description: 'Bad date',
        dueDate: 'not-a-date'
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('dueDate is invalid');
  });

  test('GET /:id does not expose tasks outside the bound project', async () => {
    const response = await request(app)
      .get('/api/v1/external/dev-tasks/task-project-2')
      .set('x-api-key', generatedKey.rawKey);

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Task not found');
  });

  test('PATCH /:id/status updates task status using bearer authentication', async () => {
    const response = await request(app)
      .patch('/api/v1/external/dev-tasks/task-project-1/status')
      .set('Authorization', `Bearer ${generatedKey.rawKey}`)
      .send({
        status: 'IN_PROGRESS',
        progress: 35
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('task-project-1');
    expect(response.body.data.status).toBe('IN_PROGRESS');
    expect(response.body.data.progress).toBe(35);
    expect(mockPrisma.devTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'task-project-1' },
        data: expect.objectContaining({
          status: 'IN_PROGRESS',
          progress: 35
        })
      })
    );
  });

  test('PATCH /:id/status returns 404 for tasks outside the bound project', async () => {
    const response = await request(app)
      .patch('/api/v1/external/dev-tasks/task-project-2/status')
      .set('Authorization', `Bearer ${generatedKey.rawKey}`)
      .send({
        status: 'DONE'
      });

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Task not found');
  });
});
