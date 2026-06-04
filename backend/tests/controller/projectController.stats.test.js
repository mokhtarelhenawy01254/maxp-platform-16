const mockPrisma = {
  project: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const projectController = require('../../controller/projectController');

function createMockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function createProject(overrides = {}) {
  return {
    id: 'project-1',
    name: 'QA Project',
    description: 'Regression coverage for project task stats',
    status: 'ACTIVE',
    priority: 'MEDIUM',
    startDate: null,
    endDate: null,
    budget: 0,
    spentBudget: 0,
    progress: 0,
    managerId: 'user-1',
    user: {
      firstName: 'Swan',
      lastName: 'Owner',
    },
    teamMembers: null,
    tags: null,
    createdAt: new Date('2026-05-02T00:00:00.000Z'),
    tasks: [],
    ...overrides,
  };
}

describe('projectController task statistics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getAllProjects counts uppercase completed task statuses', async () => {
    mockPrisma.project.findMany.mockResolvedValue([
      createProject({
        tasks: [
          { id: 'task-1', status: 'COMPLETED' },
          { id: 'task-2', status: 'PENDING' },
        ],
      }),
    ]);

    const req = {
      user: { companyId: 'company-1' },
    };
    const res = createMockResponse();

    await projectController.getAllProjects(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: [
        expect.objectContaining({
          totalTasks: 2,
          completedTasks: 1,
          progress: 50,
        }),
      ],
    }));
  });

  test('getProjectById counts uppercase task statuses in project statistics', async () => {
    mockPrisma.project.findFirst.mockResolvedValue(createProject({
      tasks: [
        { id: 'task-1', status: 'COMPLETED', assignee: null, creator: null },
        { id: 'task-2', status: 'IN_PROGRESS', assignee: null, creator: null },
        { id: 'task-3', status: 'PENDING', assignee: null, creator: null },
      ],
    }));

    const req = {
      params: { id: 'project-1' },
      user: { companyId: 'company-1' },
    };
    const res = createMockResponse();

    await projectController.getProjectById(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        statistics: {
          totalTasks: 3,
          completedTasks: 1,
          inProgressTasks: 1,
          pendingTasks: 1,
          completionRate: 33,
        },
      }),
    }));
  });
});
