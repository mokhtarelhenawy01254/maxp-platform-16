const { resolveInboundMessageText } = require('../../utils/allFunctions');

describe('allFunctions resolveInboundMessageText', () => {
  test('prefers quick_reply payload over button title', () => {
    const event = {
      message: { text: '╪º┘ä╪ú╪│╪╣╪º╪▒', quick_reply: { payload: 'PRICE' } },
    };
    expect(resolveInboundMessageText(event)).toBe('PRICE');
  });

  test('uses postback payload for button/postback events', () => {
    const event = {
      _isPostback: true,
      _postbackPayload: 'MENU_PRICING',
      message: { text: 'MENU_PRICING' },
    };
    expect(resolveInboundMessageText(event)).toBe('MENU_PRICING');
  });

  test('falls back to plain text for normal messages', () => {
    expect(resolveInboundMessageText({ message: { text: '┘â╪º┘à ╪º┘ä╪│╪╣╪▒' } })).toBe('┘â╪º┘à ╪º┘ä╪│╪╣╪▒');
  });

  test('returns null when no text source', () => {
    expect(resolveInboundMessageText({ message: { attachments: [] } })).toBeNull();
    expect(resolveInboundMessageText({})).toBeNull();
    expect(resolveInboundMessageText(null)).toBeNull();
  });
});
