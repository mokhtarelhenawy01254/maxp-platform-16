const {
  getReasonMessage,
  isWhatsAppBaileysConnectionClosed,
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
});
