const handler = {
  get(_, prop) {
    if (prop === Symbol.toPrimitive || prop === 'inspect' || prop === 'constructor') return;
    return async () => ({ success: false, skipped: true, reason: 'WhatsApp removed' });
  }
};
module.exports = new Proxy({}, handler);
