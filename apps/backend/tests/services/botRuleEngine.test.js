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
    keywords: ['سعر', 'price'],
    replyType: 'TEXT',
    replyText: 'الأسعار من 100 جنيه',
    priority: 0,
    isEnabled: true,
    stopFurtherProcessing: true,
    ...overrides,
  };
}

describe('botRuleEngine normalizeBotText', () => {
  test('normalizes Arabic letters and strips tashkeel', () => {
    expect(normalizeBotText('أهلاً وَسَهْلاً')).toBe('اهلا وسهلا');
    expect(normalizeBotText('الْأسعار')).toBe('الاسعار');
    expect(normalizeBotText('بالتالى')).toBe('بالتالي');
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
    const result = matchBotRules({ text: 'عايز أعرف السعر', rules: [rule()], channel: 'WHATSAPP' });
    expect(result).not.toBeNull();
    expect(result.rule.id).toBe('r1');
  });

  test('higher priority wins', () => {
    const low = rule({ id: 'low', priority: 0, keywords: ['سعر'] });
    const high = rule({ id: 'high', priority: 5, keywords: ['سعر'] });
    const result = matchBotRules({ text: 'كام سعر', rules: [low, high], channel: 'WHATSAPP' });
    expect(result.rule.id).toBe('high');
  });

  test('more specific keyword wins at same priority', () => {
    const broad = rule({ id: 'broad', keywords: ['سعر'] });
    const specific = rule({ id: 'specific', keywords: ['سعر الشحن'] });
    const result = matchBotRules({ text: 'سعر الشحن كام', rules: [broad, specific], channel: 'WHATSAPP' });
    expect(result.rule.id).toBe('specific');
    expect(result.matchedKeyword).toBe('سعر الشحن');
  });

  test('filters by channel', () => {
    const waOnly = rule({ id: 'wa', channels: ['WHATSAPP'], keywords: ['سعر'] });
    expect(matchBotRules({ text: 'سعر', rules: [waOnly], channel: 'FACEBOOK' })).toBeNull();
    expect(matchBotRules({ text: 'سعر', rules: [waOnly], channel: 'WHATSAPP' })).not.toBeNull();
  });

  test('respects isEnabled=false', () => {
    const disabled = rule({ id: 'off', isEnabled: false, keywords: ['سعر'] });
    expect(matchBotRules({ text: 'سعر', rules: [disabled], channel: 'WHATSAPP' })).toBeNull();
  });

  test('EXACT mode requires full normalized match', () => {
    const exact = rule({ matchMode: 'EXACT', keywords: ['منيو'] });
    expect(matchBotRules({ text: 'عايز المنيو', rules: [exact], channel: 'WHATSAPP' })).toBeNull();
    expect(matchBotRules({ text: 'منيو', rules: [exact], channel: 'WHATSAPP' })).not.toBeNull();
  });

  test('REGEX mode uses keyword as pattern', () => {
    const re = rule({ matchMode: 'REGEX', keywords: ['^سعر .*شحن$'] });
    expect(matchBotRules({ text: 'سعر الشحن', rules: [re], channel: 'WHATSAPP' })).not.toBeNull();
  });

  test('handles JSON-string keywords column', () => {
    const jsonRule = rule({ keywords: null });
    const result = matchBotRules({
      text: 'سعر',
      rules: [{ ...jsonRule, keywords: JSON.stringify(['سعر', 'تسعير']) }],
      channel: 'WHATSAPP',
    });
    expect(result).not.toBeNull();
  });
});

describe('botRuleEngine interpolateReply', () => {
  test('replaces firstName and customerName', () => {
    expect(interpolateReply('أهلاً {firstName} {lastName}', { firstName: 'محمد', lastName: 'علي' })).toBe('أهلاً محمد علي');
    expect(interpolateReply('يا {customerName}', { customerName: 'محمد' })).toBe('يا محمد');
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
      welcomeMessage: 'أهلاً {firstName} 👋',
      defaultReplyEnabled: false,
      channels: null,
    });
    prisma.botAutomationRule.findMany.mockResolvedValue([]);
    const result = await evaluateInboundBotReply({
      companyId: 'co-1',
      text: 'هلو',
      channel: 'WHATSAPP',
      customer: { firstName: 'محمد' },
      isFirstMessage: true,
    });
    expect(result.kind).toBe('welcome');
    expect(result.replyText).toBe('أهلاً محمد 👋');
  });

  test('does NOT send welcome on later messages', async () => {
    prisma.botAutomationSettings.findUnique.mockResolvedValue({
      companyId: 'co-1',
      welcomeEnabled: true,
      welcomeMessage: 'أهلاً 👋',
      defaultReplyEnabled: false,
      channels: null,
    });
    const result = await evaluateInboundBotReply({
      companyId: 'co-1',
      text: 'هلو',
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
    prisma.botAutomationRule.findMany.mockResolvedValue([rule({ id: 'price', keywords: ['سعر'] })]);
    const result = await evaluateInboundBotReply({ companyId: 'co-1', text: 'كام سعر', channel: 'WHATSAPP' });
    expect(result.kind).toBe('rule');
    expect(result.ruleId).toBe('price');
    expect(result.stopFurtherProcessing).toBe(true);
    expect(result.replyText).toBe('الأسعار من 100 جنيه');
  });

  test('returns default reply when no rule matches and default enabled', async () => {
    prisma.botAutomationSettings.findUnique.mockResolvedValue({
      companyId: 'co-1',
      welcomeEnabled: false,
      defaultReplyEnabled: true,
      defaultReply: 'شكراً ليك، هنتواصل معاك قريب.',
      channels: null,
    });
    prisma.botAutomationRule.findMany.mockResolvedValue([rule({ keywords: ['شحن'] })]);
    const result = await evaluateInboundBotReply({ companyId: 'co-1', text: 'مفيش كلمة', channel: 'WHATSAPP' });
    expect(result.kind).toBe('default');
    expect(result.replyText).toBe('شكراً ليك، هنتواصل معاك قريب.');
  });

  test('returns null when channel disabled in settings', async () => {
    prisma.botAutomationSettings.findUnique.mockResolvedValue({
      companyId: 'co-1',
      welcomeEnabled: true,
      welcomeMessage: 'أهلاً',
      defaultReplyEnabled: false,
      channels: ['FACEBOOK'],
    });
    const result = await evaluateInboundBotReply({
      companyId: 'co-1',
      text: 'هلو',
      channel: 'WHATSAPP',
      isFirstMessage: true,
    });
    expect(result.kind).toBeNull();
  });

  test('returns null when no settings', async () => {
    prisma.botAutomationSettings.findUnique.mockResolvedValue(null);
    const result = await evaluateInboundBotReply({ companyId: 'co-1', text: 'هلو', channel: 'WHATSAPP' });
    expect(result.kind).toBeNull();
  });
});
