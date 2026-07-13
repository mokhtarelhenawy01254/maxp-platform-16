jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

jest.mock('axios', () => ({
  get: jest.fn(),
}));

jest.mock('../../controller/conversation/conversationShared', () => ({
  getPageToken: jest.fn(),
}));

const { __testables } = require('../../controller/conversation/facebookSyncController');

describe('facebookSyncController helpers', () => {
  test('builds a stable duplicate signature from content, direction, type, and timestamp', () => {
    const first = __testables.buildFacebookMessageSignature({
      content: '  Hello    customer  ',
      type: 'text',
      isFromCustomer: true,
      createdAt: '2026-05-05T10:15:30.000Z',
    });
    const second = __testables.buildFacebookMessageSignature({
      content: 'hello customer',
      type: 'TEXT',
      isFromCustomer: true,
      createdAt: new Date('2026-05-05T10:15:30.000Z'),
    });

    expect(first).toBe(second);
    expect(first).toBe('customer|TEXT|2026-05-05T10:15:30.000Z|hello customer');
  });

  test('keeps page and customer copies distinct even with identical content', () => {
    const customerSignature = __testables.buildFacebookMessageSignature({
      content: 'تمام',
      type: 'TEXT',
      isFromCustomer: true,
      createdAt: '2026-05-05T10:15:30.000Z',
    });
    const pageSignature = __testables.buildFacebookMessageSignature({
      content: 'تمام',
      type: 'TEXT',
      isFromCustomer: false,
      createdAt: '2026-05-05T10:15:30.000Z',
    });

    expect(customerSignature).not.toBe(pageSignature);
  });
});
