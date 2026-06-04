const mockPrisma = {
  moderatorTeam: {
    findMany: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const rbacAdminController = require('../../controller/rbacAdminController');

const createResponse = () => ({
  json: jest.fn(),
  status: jest.fn().mockReturnThis(),
});

describe('rbacAdminController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getTeams derives leader data from the team leader member relation', async () => {
    mockPrisma.moderatorTeam.findMany.mockResolvedValue([
      {
        id: 'team-1',
        name: 'Sales',
        description: 'Sales follow-up',
        isActive: true,
        members: [
          {
            id: 'member-1',
            isTeamLeader: true,
            user: {
              id: 'user-1',
              firstName: 'Sara',
              lastName: 'Ali',
              email: 'sara@example.com',
              avatar: null,
              role: 'OWNER',
              isActive: true,
            },
          },
        ],
      },
    ]);

    const req = {
      user: {
        companyId: 'company-1',
      },
    };
    const res = createResponse();

    await rbacAdminController.getTeams(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      teams: [
        expect.objectContaining({
          id: 'team-1',
          leader: {
            id: 'member-1',
            user: expect.objectContaining({
              firstName: 'Sara',
              role: 'OWNER',
            }),
          },
        }),
      ],
    });
  });

  test('getPermissionsMatrix exposes OWNER with company-admin level permissions', async () => {
    const req = { user: { companyId: 'company-1' } };
    const res = createResponse();

    await rbacAdminController.getPermissionsMatrix(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'AGENT'],
        permissions: expect.objectContaining({
          'numbers.manage': expect.objectContaining({
            OWNER: true,
          }),
          'dashboard.view': expect.objectContaining({
            OWNER: true,
          }),
        }),
      }),
    );
  });
});
