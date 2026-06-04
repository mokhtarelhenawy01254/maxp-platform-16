const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');

let credentialsStore;

const reporterMember = {
  id: 'member-reporter',
  userId: 'user-reporter',
  isActive: true,
  user: {
    firstName: 'Sara',
    lastName: 'Reporter',
    isActive: true
  }
};

const assigneeMember = {
  id: 'member-assignee',
  userId: 'user-assignee',
  isActive: true,
  user: {
    firstName: 'Omar',
    lastName: 'Assignee',
    isActive: true
  }
};

const projectsStore = [
  {
    id: 'project-1',
    name: 'Core Platform',
    status: 'ACTIVE',
    priority: 'HIGH',
    progress: 45,
    repository: 'repo'
  }
];

const usersStore = {
  'mock-admin-id': {
    id: 'mock-admin-id',
    email: 'admin@test.com',
    role: 'SUPER_ADMIN',
    isActive: true,
    userCompanies: []
  },
  'team-lead-id': {
    id: 'team-lead-id',
    email: 'lead@test.com',
    role: 'Team Lead',
    isActive: true,
    userCompanies: []
  }
};

const createMockCredential = (overrides = {}) => ({
  id: overrides.id || 'cred-1',
  name: overrides.name || 'landing-bridge',
  description: overrides.description || 'External bridge',
  scopes: overrides.scopes || JSON.stringify(['dev-tasks:read', 'dev-tasks:write']),
  keyPrefix: overrides.keyPrefix || 'dtk_abc12345',
  keyHash: overrides.keyHash || 'hash-1',
  isActive: overrides.isActive ?? true,
  lastUsedAt: overrides.lastUsedAt || null,
  expiresAt: overrides.expiresAt || null,
  revokedAt: overrides.revokedAt || null,
  revokedReason: overrides.revokedReason || null,
  defaultReporterMemberId: overrides.defaultReporterMemberId || reporterMember.id,
  defaultAssigneeMemberId: overrides.defaultAssigneeMemberId || assigneeMember.id,
  defaultProjectId: overrides.defaultProjectId || projectsStore[0].id,
  createdByUserId: overrides.createdByUserId || 'mock-admin-id',
  revokedByUserId: overrides.revokedByUserId || null,
  createdAt: overrides.createdAt || new Date('2026-05-07T10:00:00.000Z'),
  updatedAt: overrides.updatedAt || new Date('2026-05-07T10:00:00.000Z')
});

const mockPrisma = {
  devTaskApiCredential: {
    findMany: jest.fn(async ({ where } = {}) => credentialsStore.filter((credential) => {
      if (where?.revokedAt === null) {
        return credential.revokedAt === null;
      }
      return true;
    })),
    create: jest.fn(async ({ data }) => {
      const created = createMockCredential({
        id: 'cred-created',
        ...data
      });
      credentialsStore.unshift(created);
      return created;
    }),
    update: jest.fn(async ({ where, data }) => {
      const index = credentialsStore.findIndex((credential) => credential.id === where.id);
      credentialsStore[index] = {
        ...credentialsStore[index],
        ...data,
        updatedAt: new Date('2026-05-07T11:00:00.000Z')
      };
      return credentialsStore[index];
    }),
    findUnique: jest.fn(async ({ where }) => credentialsStore.find((credential) => credential.id === where.id) || null),
    findFirst: jest.fn(async ({ where }) => credentialsStore.find((credential) => {
      if (where.id && credential.id !== where.id) return false;
      if (where.keyPrefix && credential.keyPrefix !== where.keyPrefix) return false;
      if (where.revokedAt === null && credential.revokedAt !== null) return false;
      return true;
    }) || null)
  },
  devTeamMember: {
    findFirst: jest.fn(async ({ where }) => {
      if (where?.id === reporterMember.id) {
        return reporterMember;
      }
      if (where?.id === assigneeMember.id) {
        return assigneeMember;
      }
      return null;
    }),
    findMany: jest.fn(async ({ where }) => {
      const members = [reporterMember, assigneeMember];
      if (where?.id?.in) {
        return members.filter((member) => where.id.in.includes(member.id));
      }
      return members;
    })
  },
  devProject: {
    findUnique: jest.fn(async ({ where }) => projectsStore.find((project) => project.id === where.id) || null),
    findMany: jest.fn(async ({ where }) => {
      if (where?.id?.in) {
        return projectsStore.filter((project) => where.id.in.includes(project.id));
      }
      return projectsStore;
    })
  },
  user: {
    findUnique: jest.fn(async ({ where }) => usersStore[where.id] || null)
  }
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
  safeQuery: (fn) => fn()
}));

jest.mock('../../services/devSettingsService', () => ({
  getSettings: jest.fn(async () => ({
    permissions: {
      'Team Lead': {
        canAccessSettings: true
      }
    }
  }))
}));

const superAdminRoutes = require('../../routes/superAdminRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/super-admin', superAdminRoutes);

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const token = jwt.sign(
  { userId: 'mock-admin-id', role: 'SUPER_ADMIN' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);
const teamLeadToken = jwt.sign(
  { userId: 'team-lead-id', role: 'Team Lead' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

describe('Super Admin Dev Task Integrations routes', () => {
  beforeEach(() => {
    credentialsStore = [createMockCredential()];
    jest.clearAllMocks();
  });

  test('GET /dev/task-integrations/credentials returns stored credentials', async () => {
    const response = await request(app)
      .get('/api/v1/super-admin/dev/task-integrations/credentials')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('landing-bridge');
    expect(response.body.data[0].defaultReporterMemberName).toBe('Sara Reporter');
  });

  test('POST /dev/task-integrations/credentials creates a new credential and returns the raw key once', async () => {
    const response = await request(app)
      .post('/api/v1/super-admin/dev/task-integrations/credentials')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'wordpress-site',
        description: 'Create dev tasks from external website',
        scopes: ['dev-tasks:read', 'dev-tasks:write'],
        defaultReporterMemberId: reporterMember.id,
        defaultAssigneeMemberId: assigneeMember.id,
        defaultProjectId: projectsStore[0].id
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('wordpress-site');
    expect(response.body.secret.apiKey).toMatch(/^dtk_[a-f0-9]+_[a-f0-9]+$/);
  });

  test('GET /dev/task-integrations/credentials rejects non-super-admin system roles', async () => {
    const response = await request(app)
      .get('/api/v1/super-admin/dev/task-integrations/credentials')
      .set('Authorization', `Bearer ${teamLeadToken}`);

    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('هذا الإجراء متاح فقط للسوبر أدمن');
  });
});
