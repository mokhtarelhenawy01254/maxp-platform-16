const {
  normalizeBotText,
  matchesKeyword,
  matchBotRules,
  interpolateReply,
  evaluateInboundBotReply,
} = require('../../services/botRuleEngine');

jest.mock('../../services/sharedDatabase', () => {
  const prisma = {
    botAutomationSettings: { findUnique: jest.fn() },
    botAutomationRule: { findMany: jest.fn() },
  };
  return {
    getSharedPrismaClient: jest.fn(() => prisma),
  };
});

const { getSharedPrismaClient } = require('../../services/sharedDatabase');

function rule(overrides = {}) {
  return {
    id: 'r1',
    companyId: 'co-1',
    name: 'rule',
    channels: null,
    matchMode: 'CONTAINS',
    keywords: ['╪│╪╣╪▒', 'price'],
    replyType: 'TEXT',
    replyText: '╪º┘ä╪ú╪│╪╣╪º╪▒ ┘à┘å 100 ╪¼┘å┘è┘ç',
    priority: 0,
    isEnabled: true,
    stopFurtherProcessing: true,
    ...overrides,
  };
}

describe('botRuleEngine normalizeBotText', () => {
  test('normalizes Arabic letters and strips tashkeel', () => {
    expect(normalizeBotText('╪ú┘ç┘ä╪º┘ï ┘ê┘Ä╪│┘Ä┘ç┘Æ┘ä╪º┘ï')).toBe('╪º┘ç┘ä╪º ┘ê╪│┘ç┘ä╪º');
    expect(normalizeBotText('╪º┘ä┘Æ╪ú╪│╪╣╪º╪▒')).toBe('╪º┘ä╪º╪│╪╣╪º╪▒');
    expect(normalizeBotText('╪¿╪º┘ä╪¬╪º┘ä┘ë')).toBe('╪¿╪º┘ä╪¬╪º┘ä┘è');
  });

  test('returns empty for null/non-string', () => {
    expect(normalizeBotText(null)).toBe('');
    expect(normalizeBotText(undefined)).toBe('');
    expect(normalizeBotText(123)).toBe('');
  });

  test('lowercases English and collapses spaces', () => {
    expect(normalizeBotText('  HELLO  world ')).toBe('hello world');
  });
});

describe('botRuleEngine matchBotRules', () => {
  test('matches CONTAINS keyword', () => {
    const result = matchBotRules({ text: '╪╣╪º┘è╪▓ ╪ú╪╣╪▒┘ü ╪º┘ä╪│╪╣╪▒', rules: [rule()], channel: 'WHATSAPP' });
    expect(result).not.toBeNull();
    expect(result.rule.id).toBe('r1');
  });

  test('higher priority wins', () => {
    const low = rule({ id: 'low', priority: 0, keywords: ['╪│╪╣╪▒'] });
    const high = rule({ id: 'high', priority: 5, keywords: ['╪│╪╣╪▒'] });
    const result = matchBotRules({ text: '┘â╪º┘à ╪│╪╣╪▒', rules: [low, high], channel: 'WHATSAPP' });
    expect(result.rule.id).toBe('high');
  });

  test('more specific keyword wins at same priority', () => {
    const broad = rule({ id: 'broad', keywords: ['╪│╪╣╪▒'] });
    const specific = rule({ id: 'specific', keywords: ['╪│╪╣╪▒ ╪º┘ä╪┤╪¡┘å'] });
    const result = matchBotRules({ text: '╪│╪╣╪▒ ╪º┘ä╪┤╪¡┘å ┘â╪º┘à', rules: [broad, specific], channel: 'WHATSAPP' });
    expect(result.rule.id).toBe('specific');
    expect(result.matchedKeyword).toBe('╪│╪╣╪▒ ╪º┘ä╪┤╪¡┘å');
  });

  test('filters by channel', () => {
    const waOnly = rule({ id: 'wa', channels: ['WHATSAPP'], keywords: ['╪│╪╣╪▒'] });
    expect(matchBotRules({ text: '╪│╪╣╪▒', rules: [waOnly], channel: 'FACEBOOK' })).toBeNull();
    expect(matchBotRules({ text: '╪│╪╣╪▒', rules: [waOnly], channel: 'WHATSAPP' })).not.toBeNull();
  });

  test('respects isEnabled=false', () => {
    const disabled = rule({ id: 'off', isEnabled: false, keywords: ['╪│╪╣╪▒'] });
    expect(matchBotRules({ text: '╪│╪╣╪▒', rules: [disabled], channel: 'WHATSAPP' })).toBeNull();
  });

  test('EXACT mode requires full normalized match', () => {
    const exact = rule({ matchMode: 'EXACT', keywords: ['┘à┘å┘è┘ê'] });
    expect(matchBotRules({ text: '╪╣╪º┘è╪▓ ╪º┘ä┘à┘å┘è┘ê', rules: [exact], channel: 'WHATSAPP' })).toBeNull();
    expect(matchBotRules({ text: '┘à┘å┘è┘ê', rules: [exact], channel: 'WHATSAPP' })).not.toBeNull();
  });

  test('REGEX mode uses keyword as pattern', () => {
    const re = rule({ matchMode: 'REGEX', keywords: ['^╪│╪╣╪▒ .*╪┤╪¡┘å$'] });
    expect(matchBotRules({ text: '╪│╪╣╪▒ ╪º┘ä╪┤╪¡┘å', rules: [re], channel: 'WHATSAPP' })).not.toBeNull();
  });

  test('handles JSON-string keywords column', () => {
    const jsonRule = rule({ keywords: null });
    const result = matchBotRules({
      text: '╪│╪╣╪▒',
      rules: [{ ...jsonRule, keywords: JSON.stringify(['╪│╪╣╪▒', '╪¬╪│╪╣┘è╪▒']) }],
      channel: 'WHATSAPP',
    });
    expect(result).not.toBeNull();
  });
});

describe('botRuleEngine interpolateReply', () => {
  test('replaces firstName and customerName', () => {
    expect(interpolateReply('╪ú┘ç┘ä╪º┘ï {firstName} {lastName}', { firstName: '┘à╪¡┘à╪»', lastName: '╪╣┘ä┘è' })).toBe('╪ú┘ç┘ä╪º┘ï ┘à╪¡┘à╪» ╪╣┘ä┘è');
    expect(interpolateReply('┘è╪º {customerName}', { customerName: '┘à╪¡┘à╪»' })).toBe('┘è╪º ┘à╪¡┘à╪»');
  });
});

describe('botRuleEngine evaluateInboundBotReply', () => {
  const prisma = getSharedPrismaClient();

  beforeEach(() => {
    prisma.botAutomationSettings.findUnique.mockReset();
    prisma.botAutomationRule.findMany.mockReset();
  });

  test('returns welcome on first message when enabled', async () => {
    prisma.botAutomationSettings.findUnique.mockResolvedValue({
      companyId: 'co-1',
      welcomeEnabled: true,
      welcomeMessage: '╪ú┘ç┘ä╪º┘ï {firstName} ≡ƒæï',
      defaultReplyEnabled: false,
      channels: null,
    });
    prisma.botAutomationRule.findMany.mockResolvedValue([]);
    const result = await evaluateInboundBotReply({
      companyId: 'co-1',
      text: '┘ç┘ä┘ê',
      channel: 'WHATSAPP',
      customer: { firstName: '┘à╪¡┘à╪»' },
      isFirstMessage: true,
    });
    expect(result.kind).toBe('welcome');
    expect(result.replyText).toBe('╪ú┘ç┘ä╪º┘ï ┘à╪¡┘à╪» ≡ƒæï');
  });

  test('does NOT send welcome on later messages', async () => {
    prisma.botAutomationSettings.findUnique.mockResolvedValue({
      companyId: 'co-1',
      welcomeEnabled: true,
      welcomeMessage: '╪ú┘ç┘ä╪º┘ï ≡ƒæï',
      defaultReplyEnabled: false,
      channels: null,
    });
    const result = await evaluateInboundBotReply({
      companyId: 'co-1',
      text: '┘ç┘ä┘ê',
      channel: 'WHATSAPP',
      isFirstMessage: false,
    });
    expect(result.kind).toBeNull();
  });

  test('matches a rule and reports stopFurtherProcessing', async () => {
    prisma.botAutomationSettings.findUnique.mockResolvedValue({
      companyId: 'co-1',
      welcomeEnabled: false,
      defaultReplyEnabled: false,
      channels: null,
    });
    prisma.botAutomationRule.findMany.mockResolvedValue([rule({ id: 'price', keywords: ['╪│╪╣╪▒'] })]);
    const result = await evaluateInboundBotReply({ companyId: 'co-1', text: '┘â╪º┘à ╪│╪╣╪▒', channel: 'WHATSAPP' });
    expect(result.kind).toBe('rule');
    expect(result.ruleId).toBe('price');
    expect(result.stopFurtherProcessing).toBe(true);
    expect(result.replyText).toBe('╪º┘ä╪ú╪│╪╣╪º╪▒ ┘à┘å 100 ╪¼┘å┘è┘ç');
  });

  test('returns default reply when no rule matches and default enabled', async () => {
    prisma.botAutomationSettings.findUnique.mockResolvedValue({
      companyId: 'co-1',
      welcomeEnabled: false,
      defaultReplyEnabled: true,
      defaultReply: '╪┤┘â╪▒╪º┘ï ┘ä┘è┘â╪î ┘ç┘å╪¬┘ê╪º╪╡┘ä ┘à╪╣╪º┘â ┘é╪▒┘è╪¿.',
      channels: null,
    });
    prisma.botAutomationRule.findMany.mockResolvedValue([rule({ keywords: ['╪┤╪¡┘å'] })]);
    const result = await evaluateInboundBotReply({ companyId: 'co-1', text: '┘à┘ü┘è╪┤ ┘â┘ä┘à╪⌐', channel: 'WHATSAPP' });
    expect(result.kind).toBe('default');
    expect(result.replyText).toBe('╪┤┘â╪▒╪º┘ï ┘ä┘è┘â╪î ┘ç┘å╪¬┘ê╪º╪╡┘ä ┘à╪╣╪º┘â ┘é╪▒┘è╪¿.');
  });

  test('returns null when channel disabled in settings', async () => {
    prisma.botAutomationSettings.findUnique.mockResolvedValue({
      companyId: 'co-1',
      welcomeEnabled: true,
      welcomeMessage: '╪ú┘ç┘ä╪º┘ï',
      defaultReplyEnabled: false,
      channels: ['FACEBOOK'],
    });
    const result = await evaluateInboundBotReply({
      companyId: 'co-1',
      text: '┘ç┘ä┘ê',
      channel: 'WHATSAPP',
      isFirstMessage: true,
    });
    expect(result.kind).toBeNull();
  });

  test('returns null when no settings', async () => {
    prisma.botAutomationSettings.findUnique.mockResolvedValue(null);
    const result = await evaluateInboundBotReply({ companyId: 'co-1', text: '┘ç┘ä┘ê', channel: 'WHATSAPP' });
    expect(result.kind).toBeNull();
  });
});
