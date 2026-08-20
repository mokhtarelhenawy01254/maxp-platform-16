const { matchReply, onCustomerReply, startInteractiveFlow } = require('../../services/botFlowRuntime');

jest.mock('../../services/sharedDatabase', () => {
  const prisma = {
    customerJourney: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    whatsAppFollowUpFlow: { findUnique: jest.fn(), findMany: jest.fn() },
  };
  return { getSharedPrismaClient: jest.fn(() => prisma) };
});

const { getSharedPrismaClient } = require('../../services/sharedDatabase');

function step(overrides = {}) {
  return {
    id: 's1',
    flowId: 'f1',
    stepOrder: 1,
    delayDays: 0,
    delayHours: null,
    delayUnit: 'DAYS',
    content: '╪ú┘ç┘ä╪º┘ï ≡ƒæï',
    mediaUrl: null,
    expectReply: false,
    replyKeywords: null,
    nextStepId: null,
    timeoutHours: null,
    timeoutNextStepId: null,
    ...overrides,
  };
}

function flow(steps, overrides = {}) {
  return {
    id: 'f1',
    companyId: 'co-1',
    name: '┘ü┘ä┘ê ╪º╪«╪¬╪¿╪º╪▒',
    isEnabled: true,
    isGeneral: false,
    channels: JSON.stringify(['WHATSAPP', 'FACEBOOK']),
    steps,
    ...overrides,
  };
}

describe('botFlowRuntime matchReply', () => {
  test('matches normalized Arabic keyword', () => {
    expect(matchReply('╪╣╪º┘è╪▓ ╪ú╪╣╪▒┘ü ╪º┘ä╪│╪╣╪▒', ['╪│╪╣╪▒'])).toBe(true);
  });

  test('normalizes Arabic letters in both text and keyword', () => {
    expect(matchReply('╪ú┘å╪º ╪╣╪º┘è╪▓ ╪º┘ä╪ú┘Ä╪│╪╣╪º╪▒', ['╪º┘ä╪ú╪│╪╣╪º╪▒'])).toBe(true);
    expect(matchReply('╪¿╪º┘ä╪¬╪º┘ä┘ë', ['╪¿╪º┘ä╪¬╪º┘ä┘è'])).toBe(true);
  });

  test('returns false on no match or empty keywords', () => {
    expect(matchReply('┘â╪º┘à ╪º┘ä┘ü╪º╪¬┘ê╪▒╪⌐', ['╪│╪╣╪▒'])).toBe(false);
    expect(matchReply('┘à╪▒╪¡╪¿╪º', [])).toBe(false);
  });
});

describe('botFlowRuntime onCustomerReply', () => {
  const prisma = getSharedPrismaClient();
  const sendStep = jest.fn(async () => {});

  beforeEach(() => {
    jest.clearAllMocks();
    sendStep.mockReset();
  });

  test('handled false when no active journey', async () => {
    prisma.customerJourney.findFirst.mockResolvedValue(null);
    const result = await onCustomerReply({ companyId: 'co-1', customerId: 'cu-1', channel: 'WHATSAPP', text: '┘à╪▒╪¡╪¿╪º', sendStep });
    expect(result).toEqual({ handled: false });
  });

  test('handled false when not waiting on interactive step', async () => {
    prisma.customerJourney.findFirst.mockResolvedValue({
      id: 'j1',
      flowId: 'f1',
      interactiveState: JSON.stringify({ waitingForStepId: 's1', channel: 'WHATSAPP' }),
    });
    prisma.whatsAppFollowUpFlow.findUnique.mockResolvedValue(
      flow([step({ id: 's1', expectReply: false })])
    );
    const result = await onCustomerReply({ companyId: 'co-1', customerId: 'cu-1', channel: 'WHATSAPP', text: '┘à╪▒╪¡╪¿╪º', sendStep });
    expect(result.handled).toBe(false);
  });

  test('handled false when keyword does not match', async () => {
    prisma.customerJourney.findFirst.mockResolvedValue({
      id: 'j1',
      flowId: 'f1',
      interactiveState: JSON.stringify({ waitingForStepId: 's1', channel: 'WHATSAPP' }),
    });
    prisma.whatsAppFollowUpFlow.findUnique.mockResolvedValue(
      flow([step({ id: 's1', expectReply: true, replyKeywords: JSON.stringify(['╪│╪╣╪▒']) })])
    );
    const result = await onCustomerReply({ companyId: 'co-1', customerId: 'cu-1', channel: 'WHATSAPP', text: '┘â╪º┘à ╪º┘ä╪┤╪¡┘å', sendStep });
    expect(result.handled).toBe(false);
  });

  test('advances to nextStepId and sends it on match', async () => {
    const s1 = step({ id: 's1', stepOrder: 1, expectReply: true, replyKeywords: JSON.stringify(['╪│╪╣╪▒', '╪º┘ä╪│╪╣╪▒']) });
    const s2 = step({ id: 's2', stepOrder: 2, content: '╪º┘ä╪ú╪│╪╣╪º╪▒ ╪¬╪¿╪»╪ú ┘à┘å 100 ╪¼┘å┘è┘ç' });
    prisma.customerJourney.findFirst.mockResolvedValue({
      id: 'j1',
      flowId: 'f1',
      logs: '',
      interactiveState: JSON.stringify({ waitingForStepId: 's1', channel: 'WHATSAPP' }),
    });
    prisma.whatsAppFollowUpFlow.findUnique.mockResolvedValue(flow([s1, s2]));
    prisma.customerJourney.update.mockResolvedValue({});

    const result = await onCustomerReply({ companyId: 'co-1', customerId: 'cu-1', channel: 'WHATSAPP', text: '┘â╪º┘à ╪º┘ä╪│╪╣╪▒', sendStep });
    expect(result).toEqual({ handled: true, nextStepId: 's2', scheduled: true });
    const updateArgs = prisma.customerJourney.update.mock.calls[0][0];
    expect(updateArgs.data.currentStep).toBe(1);
    expect(updateArgs.data.interactiveState).toBeNull();
    expect(updateArgs.data.nextSendAt).toBeInstanceOf(Date);
  });

  test('sends immediately when next step expects reply', async () => {
    const s1 = step({ id: 's1', stepOrder: 1, expectReply: true, replyKeywords: JSON.stringify(['╪│╪╣╪▒']) });
    const s2 = step({ id: 's2', stepOrder: 2, expectReply: true, content: '┘â╪º┘à ╪º┘ä╪│╪╣╪▒╪ƒ' });
    prisma.customerJourney.findFirst.mockResolvedValue({
      id: 'j1',
      flowId: 'f1',
      logs: '',
      interactiveState: JSON.stringify({ waitingForStepId: 's1', channel: 'WHATSAPP' }),
    });
    prisma.whatsAppFollowUpFlow.findUnique.mockResolvedValue(flow([s1, s2]));
    prisma.customerJourney.update.mockResolvedValue({});

    const result = await onCustomerReply({ companyId: 'co-1', customerId: 'cu-1', channel: 'WHATSAPP', text: '╪º┘ä╪│╪╣╪▒ ┘â╪º┘à', sendStep });
    expect(result).toEqual({ handled: true, nextStepId: 's2' });
    expect(sendStep).toHaveBeenCalledWith(expect.objectContaining({ id: 's2' }));
    const updateArgs = prisma.customerJourney.update.mock.calls[0][0];
    expect(JSON.parse(updateArgs.data.interactiveState).waitingForStepId).toBe('s2');
  });

  test('completes journey when no next step', async () => {
    prisma.customerJourney.findFirst.mockResolvedValue({
      id: 'j1',
      flowId: 'f1',
      logs: '',
      interactiveState: JSON.stringify({ waitingForStepId: 's1', channel: 'WHATSAPP' }),
    });
    prisma.whatsAppFollowUpFlow.findUnique.mockResolvedValue(
      flow([step({ id: 's1', stepOrder: 1, expectReply: true, replyKeywords: JSON.stringify(['╪│╪╣╪▒']) })])
    );
    prisma.customerJourney.update.mockResolvedValue({});

    const result = await onCustomerReply({ companyId: 'co-1', customerId: 'cu-1', channel: 'WHATSAPP', text: '╪º┘ä╪│╪╣╪▒', sendStep });
    expect(result).toEqual({ handled: true, completed: true });
    const updateArgs = prisma.customerJourney.update.mock.calls[0][0];
    expect(updateArgs.data.status).toBe('COMPLETED');
  });
});

describe('botFlowRuntime startInteractiveFlow', () => {
  const prisma = getSharedPrismaClient();
  const sendStep = jest.fn(async () => {});

  beforeEach(() => {
    jest.clearAllMocks();
    sendStep.mockReset();
  });

  test('creates journey and sends first step', async () => {
    const s1 = step({ id: 's1', content: '╪º╪¿╪»╪ú ╪º┘ä┘ü┘ä┘ê' });
    prisma.whatsAppFollowUpFlow.findUnique.mockResolvedValue(flow([s1]));
    prisma.customerJourney.findFirst.mockResolvedValue(null);
    prisma.customerJourney.create.mockResolvedValue({ id: 'j1' });

    const result = await startInteractiveFlow({ companyId: 'co-1', customerId: 'cu-1', channel: 'WHATSAPP', flowId: 'f1', sendStep });
    expect(result).toEqual({ success: true, journeyId: 'j1', firstStepId: 's1' });
    expect(sendStep).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
    const createArgs = prisma.customerJourney.create.mock.calls[0][0];
    expect(JSON.parse(createArgs.data.interactiveState).waitingForStepId).toBe('s1');
  });

  test('rejects when flow not enabled', async () => {
    prisma.whatsAppFollowUpFlow.findUnique.mockResolvedValue(flow([step()], { isEnabled: false }));
    const result = await startInteractiveFlow({ companyId: 'co-1', customerId: 'cu-1', channel: 'WHATSAPP', flowId: 'f1', sendStep });
    expect(result).toEqual({ success: false, reason: 'NO_FLOW' });
  });

  test('rejects when customer already has active journey', async () => {
    prisma.whatsAppFollowUpFlow.findUnique.mockResolvedValue(flow([step()]));
    prisma.customerJourney.findFirst.mockResolvedValue({ id: 'j0' });
    const result = await startInteractiveFlow({ companyId: 'co-1', customerId: 'cu-1', channel: 'WHATSAPP', flowId: 'f1', sendStep });
    expect(result).toEqual({ success: false, reason: 'ALREADY_ACTIVE' });
  });
});
