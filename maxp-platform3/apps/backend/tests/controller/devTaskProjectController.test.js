const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const manager = {
  id: 'member-1',
  user: {
    id: 'user-1',
    firstName: 'Sara',
    lastName: 'Manager',
    avatar: 'avatar.png'
  }
};

const mockPrisma = {
  devProject: {
    findMany: jest.fn(),
    create: jest.fn()
  },
  devTask: {
    count: jest.fn()
  },
  devTeamMember: {
    findUnique: jest.fn()
  }
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  safeQuery: async (fn) => fn()
}));

const controller = require('../../controller/devTaskController_minimal');

describe('devTaskController_minimal project management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getAllProjects maps Prisma relation names from the current schema', async () => {
    mockPrisma.devProject.findMany.mockResolvedValue([
      {
        id: 'project-1',
        name: 'External API Project',
        description: 'Project description',
        status: 'PLANNING',
        priority: 'HIGH',
        color: '#0ea5e9',
        icon: null,
        startDate: null,
        endDate: null,
        progress: 0,
        managerId: manager.id,
        tags: 'external,api',
        repository: null,
        createdAt: new Date('2026-05-09T12:00:00.000Z'),
        updatedAt: new Date('2026-05-09T12:00:00.000Z'),
        dev_team_member: manager,
        _count: {
          dev_tasks: 3,
          dev_releases: 1
        }
      }
    ]);
    mockPrisma.devTask.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);

    const req = { query: {} };
    const res = createResponse();

    await controller.getAllProjects(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: [
          expect.objectContaining({
            id: 'project-1',
            managerName: 'Sara Manager',
            managerAvatar: 'avatar.png',
            tasksCount: 3,
            releasesCount: 1
          })
        ]
      })
    );
  });

  test('createProject returns the created project using the schema relation alias', async () => {
    mockPrisma.devTeamMember.findUnique.mockResolvedValue({ id: manager.id });
    mockPrisma.devProject.create.mockResolvedValue({
      id: 'project-created',
      name: 'External API Verification',
      description: 'Production verification project',
      status: 'PLANNING',
      priority: 'HIGH',
      color: '#0ea5e9',
      startDate: null,
      endDate: null,
      managerId: manager.id,
      tags: 'external-api,verification',
      progress: 0,
      dev_team_member: manager
    });

    const req = {
      body: {
        name: 'External API Verification',
        description: 'Production verification project',
        priority: 'HIGH',
        color: '#0ea5e9',
        managerId: manager.id,
        tags: ['external-api', 'verification']
      }
    };
    const res = createResponse();

    await controller.createProject(req, res);

    expect(mockPrisma.devProject.create).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          dev_team_member: expect.any(Object)
        })
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          id: 'project-created',
          managerName: 'Sara Manager'
        })
      })
    );
  });
});
