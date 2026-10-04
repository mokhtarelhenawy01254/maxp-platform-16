/**
 * Test for AgentStudioSessionService 42P01 Self-Healing Recovery
 */

describe('AgentStudioSessionService Self-Healing Recovery', () => {
  let agentStudioSessionService;
  let mockPrisma;

  beforeEach(() => {
    jest.resetModules();

    mockPrisma = {
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
      $queryRawUnsafe: jest.fn(),
    };

    jest.doMock('../services/sharedDatabase', () => ({
      getSharedPrismaClient: () => mockPrisma,
    }));

    agentStudioSessionService = require('../services/agentStudioSessionService');
  });

  it('should catch 42P01 (relation does not exist), re-ensure tables, and successfully retry', async () => {
    // First query fails with 42P01
    const p2010Err = new Error('relation "public.agent_studio_sessions" does not exist');
    p2010Err.code = '42P01';

    // Mock query failure on first attempt, then success on second attempt
    mockPrisma.$queryRawUnsafe
      .mockRejectedValueOnce(p2010Err)
      .mockResolvedValueOnce([
        {
          id: 'sess_1',
          companyId: 'comp_1',
          domain: 'copilot',
          userId: 'user_1',
          title: 'جلسة سحابية',
          status: 'ACTIVE',
          context: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      .mockResolvedValueOnce([]); // messages

    const sessions = await agentStudioSessionService.listSessions('comp_1', 'copilot', 10);

    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('sess_1');

    // Ensure ensureTables was called to heal the missing relation
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
  });
});
