const {
  buildQuickReplies,
  buildCarouselPayload,
  buildWhatsAppButtons,
} = require('../../services/botMessageSender');

describe('botMessageSender buildQuickReplies', () => {
  test('builds Messenger quick replies with title+payload', () => {
    const qr = buildQuickReplies([{ title: '╪º┘ä╪ú╪│╪╣╪º╪▒', payload: 'PRICE' }, { title: '╪º┘ä╪╣┘å┘ê╪º┘å', payload: 'ADDR' }]);
    expect(qr).toEqual([
      { content_type: 'text', title: '╪º┘ä╪ú╪│╪╣╪º╪▒', payload: 'PRICE' },
      { content_type: 'text', title: '╪º┘ä╪╣┘å┘ê╪º┘å', payload: 'ADDR' },
    ]);
  });

  test('caps at 11 buttons and truncates title to 20 chars', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ title: `╪¿${i}` }));
    const qr = buildQuickReplies(many);
    expect(qr.length).toBe(11);
  });

  test('returns undefined when empty', () => {
    expect(buildQuickReplies([])).toBeUndefined();
    expect(buildQuickReplies(null)).toBeUndefined();
  });
});

describe('botMessageSender buildCarouselPayload', () => {
  test('builds generic template with elements and buttons', () => {
    const payload = buildCarouselPayload([
      {
        title: '┘à┘å╪¬╪¼ 1',
        subtitle: '┘ê╪╡┘ü',
        imageUrl: 'https://img/1.png',
        url: 'https://maxp.online/p1',
        buttons: [{ title: '╪┤╪▒╪º╪í', payload: 'BUY_1' }],
      },
    ]);
    expect(payload.attachment.type).toBe('template');
    expect(payload.attachment.payload.template_type).toBe('generic');
    const el = payload.attachment.payload.elements[0];
    expect(el.title).toBe('┘à┘å╪¬╪¼ 1');
    expect(el.buttons[0].type).toBe('postback');
    expect(el.default_action.url).toBe('https://maxp.online/p1');
  });

  test('returns undefined when empty', () => {
    expect(buildCarouselPayload([])).toBeUndefined();
  });
});

describe('botMessageSender buildWhatsAppButtons', () => {
  test('builds {id,text} objects', () => {
    expect(buildWhatsAppButtons([{ title: '╪¬╪ú┘â┘è╪»', payload: 'CONFIRM' }])).toEqual([
      { id: 'CONFIRM', text: '╪¬╪ú┘â┘è╪»' },
    ]);
  });

  test('caps at 3', () => {
    const four = [
      { title: '1', payload: '1' },
      { title: '2', payload: '2' },
      { title: '3', payload: '3' },
      { title: '4', payload: '4' },
    ];
    expect(buildWhatsAppButtons(four)).toHaveLength(3);
  });
});
