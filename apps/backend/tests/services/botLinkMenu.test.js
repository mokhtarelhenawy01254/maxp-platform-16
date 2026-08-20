const { waLink, meLink } = require('../../services/botLinkService');
const { buildMenuItems } = require('../../services/botMenuService');

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => null),
}));

describe('botLinkService waLink', () => {
  test('builds wa.me link with encoded text', () => {
    expect(waLink('01012345678', '╪ú┘ç┘ä╪º┘ï╪î ╪╣╪º┘è╪▓ ╪ú╪╣╪▒┘ü ╪º┘ä╪ú╪│╪╣╪º╪▒')).toBe(
      `https://wa.me/201012345678?text=${encodeURIComponent('╪ú┘ç┘ä╪º┘ï╪î ╪╣╪º┘è╪▓ ╪ú╪╣╪▒┘ü ╪º┘ä╪ú╪│╪╣╪º╪▒')}`
    );
  });

  test('strips non-digit chars from phone', () => {
    expect(waLink('+20 100 123 4567', '┘à╪▒╪¡╪¿╪º')).toBe(`https://wa.me/201001234567?text=${encodeURIComponent('┘à╪▒╪¡╪¿╪º')}`);
  });

  test('handles 00 international prefix', () => {
    expect(waLink('00201111222233', '')).toBe('https://wa.me/201111222233');
  });

  test('returns null without phone', () => {
    expect(waLink('', '┘à╪▒╪¡╪¿╪º')).toBeNull();
    expect(waLink(null, '┘à╪▒╪¡╪¿╪º')).toBeNull();
  });

  test('omits query when text empty', () => {
    expect(waLink('01012345678', '  ')).toBe('https://wa.me/201012345678');
  });
});

describe('botLinkService meLink', () => {
  test('builds m.me link with ref code', () => {
    expect(meLink('123456789', 'pricing')).toBe('https://m.me/123456789?ref=pricing');
  });

  test('omits ref when empty', () => {
    expect(meLink('123456789', '')).toBe('https://m.me/123456789');
  });

  test('returns null without pageId', () => {
    expect(meLink(null, 'x')).toBeNull();
  });
});

describe('botMenuService buildMenuItems', () => {
  test('builds postback items with default payload', () => {
    const items = buildMenuItems([{ type: 'postback', title: '╪º┘ä╪ú╪│╪╣╪º╪▒' }]);
    expect(items).toEqual([{ type: 'postback', title: '╪º┘ä╪ú╪│╪╣╪º╪▒', payload: 'MENU_╪º┘ä╪ú╪│╪╣╪º╪▒' }]);
  });

  test('builds web_url items', () => {
    const items = buildMenuItems([
      { type: 'web_url', title: '╪º┘ä┘à┘ê┘é╪╣', url: 'https://maxp.online' },
    ]);
    expect(items[0]).toEqual({
      type: 'web_url',
      title: '╪º┘ä┘à┘ê┘é╪╣',
      url: 'https://maxp.online',
      webview_height_ratio: 'full',
    });
  });

  test('filters items without title', () => {
    expect(buildMenuItems([{ type: 'postback', title: '' }, { type: 'postback', title: '  ' }])).toEqual([]);
  });

  test('keeps provided payload', () => {
    const items = buildMenuItems([{ type: 'postback', title: '╪«╪»┘à╪⌐', payload: 'SERVICE' }]);
    expect(items[0].payload).toBe('SERVICE');
  });
});
