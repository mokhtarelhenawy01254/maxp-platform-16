const mockPrisma = {
  timeEntry: { findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  task: { update: jest.fn() },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
}));
jest.mock('../../services/socketService', () => ({
  sendToCompany: jest.fn(),
  sendToUser: jest.fn(),
}));
jest.mock('../../services/goalMetricEngine', () => ({
  recordGoalMetricEvent: jest.fn(() => Promise.resolve()),
}));

const taskTimerService = require('../../services/taskTimerService');
const { TimerStopError } = taskTimerService;

const baseArgs = { entryId: 'e1', companyId: 'c1', actingUserId: 'u1', actingUserRole: 'EMPLOYEE' };
const runningEntry = {
  id: 'e1', companyId: 'c1', userId: 'u1', taskId: 't1', isRunning: true,
  startTime: new Date(Date.now() - 30 * 60000), description: null, task: { id: 't1', title: 'T' },
};

describe('taskTimerService.stopTimerById — status-aware errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.timeEntry.findMany.mockResolvedValue([]);
    mockPrisma.timeEntry.update.mockImplementation(({ data }) => Promise.resolve({ ...runningEntry, ...data }));
  });

  it('missing entry → TimerStopError 404 (TIME_ENTRY_NOT_FOUND)', async () => {
    mockPrisma.timeEntry.findFirst.mockResolvedValue(null);
    await expect(taskTimerService.stopTimerById(baseArgs)).rejects.toMatchObject({
      name: 'TimerStopError', statusCode: 404, code: 'TIME_ENTRY_NOT_FOUND',
    });
    expect(mockPrisma.timeEntry.update).not.toHaveBeenCalled();
  });

  it('already stopped entry → 404 (TIME_ENTRY_ALREADY_STOPPED)', async () => {
    mockPrisma.timeEntry.findFirst.mockResolvedValue({ ...runningEntry, isRunning: false });
    await expect(taskTimerService.stopTimerById(baseArgs)).rejects.toMatchObject({
      statusCode: 404, code: 'TIME_ENTRY_ALREADY_STOPPED',
    });
  });

  it("employee stopping another user's timer → 403", async () => {
    mockPrisma.timeEntry.findFirst.mockResolvedValue({ ...runningEntry, userId: 'other' });
    await expect(taskTimerService.stopTimerById(baseArgs)).rejects.toMatchObject({
      statusCode: 403, code: 'TIME_ENTRY_FORBIDDEN',
    });
    expect(mockPrisma.timeEntry.update).not.toHaveBeenCalled();
  });

  it("manager can stop another user's timer", async () => {
    mockPrisma.timeEntry.findFirst.mockResolvedValue({ ...runningEntry, userId: 'other' });
    const res = await taskTimerService.stopTimerById({ ...baseArgs, actingUserRole: 'MANAGER' });
    expect(res.isRunning).toBe(false);
  });

  it('lookup is scoped by company', async () => {
    mockPrisma.timeEntry.findFirst.mockResolvedValue(runningEntry);
    await taskTimerService.stopTimerById(baseArgs);
    expect(mockPrisma.timeEntry.findFirst.mock.calls[0][0].where).toEqual({ id: 'e1', companyId: 'c1' });
  });
});

describe('taskController.stopTimeTracking — maps TimerStopError to HTTP status', () => {
  let taskController;
  beforeAll(() => {
    taskController = require('../../controller/taskController');
  });

  const makeRes = () => {
    const res = { headersSent: false };
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
  };
  const req = { params: { entryId: 'e1' }, body: {}, user: { companyId: 'c1', userId: 'u1', role: 'EMPLOYEE' } };

  it.each([
    [404, 'TIME_ENTRY_NOT_FOUND'],
    [403, 'TIME_ENTRY_FORBIDDEN'],
  ])('returns %i (not 500)', async (status, code) => {
    const spy = jest.spyOn(taskTimerService, 'stopTimerById')
      .mockRejectedValue(new TimerStopError('x', status, code));
    const res = makeRes();
    await taskController.stopTimeTracking(req, res);
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, code }));
    spy.mockRestore();
  });

  it('unexpected errors still return 500', async () => {
    const spy = jest.spyOn(taskTimerService, 'stopTimerById').mockRejectedValue(new Error('db down'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = makeRes();
    await taskController.stopTimeTracking(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    spy.mockRestore();
    errSpy.mockRestore();
  });
});
