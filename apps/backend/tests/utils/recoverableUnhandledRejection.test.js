const {
  getReasonMessage,
  isWhatsAppBaileysConnectionClosed,
  isGramJsResolveError,
} = require('../../utils/recoverableUnhandledRejection');

describe('recoverable unhandled rejection helpers', () => {
  test('identifies Baileys connection closed boom errors as recoverable', () => {
    const reason = new Error('Connection Closed');
    reason.isBoom = true;
    reason.output = { statusCode: 428 };
    reason.stack = 'Error: Connection Closed\n    at node_modules/@whiskeysockets/baileys/lib/Socket/socket.js:56:19';

    expect(isWhatsAppBaileysConnectionClosed(reason)).toBe(true);
  });

  test('does not suppress unrelated unhandled rejections', () => {
    expect(isWhatsAppBaileysConnectionClosed(new Error('Database unavailable'))).toBe(false);
  });

  test('extracts messages from non-error reasons', () => {
    expect(getReasonMessage({ message: 'custom' })).toBe('custom');
    expect(getReasonMessage('plain')).toBe('plain');
  });

  test('identifies GramJS resolve error as recoverable', () => {
    const reason = new Error('`resolve()` called for non-request instance');
    reason.stack = 'Error: `resolve()` called for non-request instance\n    at VirtualClass.resolve (/var/www/backend2/node_modules/telegram/tl/api.js:456:27)';

    expect(isGramJsResolveError(reason)).toBe(true);
  });

  test('does not identify other errors as GramJS resolve error', () => {
    const reason = new Error('Some other error');
    reason.stack = 'Error: Some other error\n    at node_modules/telegram/tl/api.js:456:27';
    expect(isGramJsResolveError(reason)).toBe(false);

    const resolveReason = new Error('`resolve()` called for non-request instance');
    resolveReason.stack = 'Error: `resolve()` called for non-request instance\n    at CustomClass.resolve (utils.js:10:10)';
    expect(isGramJsResolveError(resolveReason)).toBe(false);
  });
});
