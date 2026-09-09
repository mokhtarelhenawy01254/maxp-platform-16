const {
  normalizeBotText,
  matchesKeyword,
  matchBotRules,
  interpolateReply,
  getSmartReplies,
  matchSmartReplyTemplates,
  evaluateInboundBotReply,
} = require('../../services/botRuleEngine');

jest.mock('../../services/sharedDatabase', () => {
  const prisma = {
    botAutomationSettings: { findUnique: jest.fn() },
    botAutomationRule: { findMany: jest.fn() },
    aiSetting: { findUnique: jest.fn() },
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
    prisma.aiSetting.findUnique.mockReset();
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

  test('returns null when no settings and no smart replies', async () => {
    prisma.botAutomationSettings.findUnique.mockResolvedValue(null);
    prisma.aiSetting.findUnique.mockResolvedValue(null);
    const result = await evaluateInboundBotReply({ companyId: 'co-1', text: 'هلو', channel: 'WHATSAPP' });
    expect(result.kind).toBeNull();
  });

  test('matches smart replies from AiSetting even when botAutomationSettings is null', async () => {
    prisma.botAutomationSettings.findUnique.mockResolvedValue(null);
    prisma.aiSetting.findUnique.mockResolvedValue({
      modelSettings: JSON.stringify({
        ruleResponses: {
          enableRuleResponses: true,
          customRuleResponses: {
            templates: [
              {
                id: 'tmpl-1',
                name: 'التحية',
                keywords: ['السلام عليكم'],
                responses: ['وعليكم السلام ورحمة الله وبركاته 😊 تحت امرك اتفضل يافندم'],
              },
              {
                id: 'tmpl-2',
                name: 'مساء الخير',
                keywords: ['مساء النور', 'مساء الخير', 'مساء الفل'],
                responses: ['مساء الفل يافندم'],
              },
            ],
          },
        },
      }),
    });

    const result1 = await evaluateInboundBotReply({
      companyId: 'co-1',
      text: 'السلام عليكم ورحمة الله',
      channel: 'FACEBOOK',
    });
    expect(result1.kind).toBe('smart_reply');
    expect(result1.ruleId).toBe('tmpl-1');
    expect(result1.replyText).toBe('وعليكم السلام ورحمة الله وبركاته 😊 تحت امرك اتفضل يافندم');
    expect(result1.stopFurtherProcessing).toBe(true);

    const result2 = await evaluateInboundBotReply({
      companyId: 'co-1',
      text: 'مساء الفل يا باشا',
      channel: 'FACEBOOK',
    });
    expect(result2.kind).toBe('smart_reply');
    expect(result2.ruleId).toBe('tmpl-2');
    expect(result2.replyText).toBe('مساء الفل يافندم');

    const result3 = await evaluateInboundBotReply({
      companyId: 'co-1',
      text: 'عايز مقاس لارج',
      channel: 'FACEBOOK',
    });
    expect(result3.kind).toBeNull();
  });

  test('does not evaluate smart replies if enableRuleResponses is false', async () => {
    prisma.botAutomationSettings.findUnique.mockResolvedValue(null);
    prisma.aiSetting.findUnique.mockResolvedValue({
      modelSettings: JSON.stringify({
        ruleResponses: {
          enableRuleResponses: false,
          customRuleResponses: {
            templates: [
              {
                id: 'tmpl-1',
                name: 'التحية',
                keywords: ['السلام عليكم'],
                responses: ['وعليكم السلام'],
              },
            ],
          },
        },
      }),
    });

    const result = await evaluateInboundBotReply({
      companyId: 'co-1',
      text: 'السلام عليكم',
      channel: 'FACEBOOK',
    });
    expect(result.kind).toBeNull();
  });
});

describe('botRuleEngine matchSmartReplyTemplates', () => {
  const templates = [
    {
      id: 't1',
      name: 'ترحيب',
      keywords: ['السلام عليكم', 'سلام'],
      responses: ['أهلاً بحضرتك'],
    },
    {
      id: 't2',
      name: 'أسعار',
      keywords: ['بكام', 'سعر'],
      responses: ['الأسعار تبدأ من 250 جنيه'],
    },
  ];

  test('matches keyword with Arabic text tolerance', () => {
    const res = matchSmartReplyTemplates({ text: 'السلام عليكم ورحمة الله', templates });
    expect(res).not.toBeNull();
    expect(res.kind).toBe('smart_reply');
    expect(res.ruleId).toBe('t1');
    expect(res.replyText).toBe('أهلاً بحضرتك');
  });

  test('prefers longer matching keyword', () => {
    const res = matchSmartReplyTemplates({ text: 'سلام عليكم', templates });
    expect(res).not.toBeNull();
    expect(res.matchedKeyword).toBe('سلام');
  });

  test('returns null when no keywords match', () => {
    const res = matchSmartReplyTemplates({ text: 'شكراً جزيلاً', templates });
    expect(res).toBeNull();
  });

  test('returns null for empty templates or text', () => {
    expect(matchSmartReplyTemplates({ text: '', templates })).toBeNull();
    expect(matchSmartReplyTemplates({ text: 'سلام', templates: [] })).toBeNull();
  });
});
