const { isRateLimitedSendError, queueSendPacingDelay } = require('../../services/whatsapp/WhatsAppNotificationService');

describe('notification queue pacing', () => {
  it('detects rate-limit errors by httpStatus 429', () => {
    expect(isRateLimitedSendError({ httpStatus: 429 })).toBe(true);
  });

  it('detects rate-limit errors by Meta code/message', () => {
    expect(isRateLimitedSendError({ code: '130429' })).toBe(true);
    expect(isRateLimitedSendError({ message: 'rate over limits' })).toBe(true);
    expect(isRateLimitedSendError({ message: 'Rate limit reached' })).toBe(true);
    expect(isRateLimitedSendError({ message: 'just a normal failure' })).toBe(false);
  });

  it('does not pace permanent failures', async () => {
    const spy = jest.spyOn(global, 'setTimeout').mockImplementation((cb) => cb());
    await queueSendPacingDelay(null, { retryable: false });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('paces successes', async () => {
    const spy = jest.spyOn(global, 'setTimeout').mockImplementation((cb) => cb());
    await queueSendPacingDelay(null, null);
    expect(spy).toHaveBeenCalledWith(expect.any(Function), 2000);
    spy.mockRestore();
  });

  it('paces rate-limited failures', async () => {
    const spy = jest.spyOn(global, 'setTimeout').mockImplementation((cb) => cb());
    await queueSendPacingDelay(null, { httpStatus: 429, retryable: true });
    expect(spy).toHaveBeenCalledWith(expect.any(Function), 2000);
    spy.mockRestore();
  });
});
