const { mapError, HTTP_STATUS_TO_ERROR, NETWORK_ERROR_CODES } = require('../../services/whatsapp/whatsappErrorCodes');

describe('whatsappErrorCodes.mapError', () => {
  it('marks network/system errors as retryable network_error', () => {
    for (const code of ['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED']) {
      const err = new Error(`connect ${code}`);
      err.code = code;
      const mapped = mapError(err);
      expect(mapped.retryable).toBe(true);
      expect(mapped.reason).toBe('network_error');
    }
  });

  it('marks an axios timeout (no response) as retryable', () => {
    const err = new Error('timeout of 30000ms exceeded');
    err.code = 'ECONNABORTED';
    const mapped = mapError(err);
    expect(mapped.retryable).toBe(true);
    expect(mapped.reason).toBe('network_error');
  });

  it('marks any unmapped 5xx (e.g. 502/504) as retryable server_error', () => {
    for (const status of [502, 504, 509]) {
      const err = Object.assign(new Error('server error'), { response: { status, data: {} } });
      const mapped = mapError(err);
      expect(mapped.retryable).toBe(true);
      expect(mapped.httpStatus).toBe(status);
    }
  });

  it('still marks unmapped 4xx as permanent send_failed', () => {
    const err = Object.assign(new Error('bad request'), { response: { status: 422, data: {} } });
    const mapped = mapError(err);
    expect(mapped.retryable).toBe(false);
    expect(mapped.reason).toBe('send_failed');
  });

  it('prefers the structured Meta error code when present', () => {
    const err = {
      response: { status: 429, data: { error: { code: 130429, error_data: { details: 'limit' } } } },
    };
    const mapped = mapError(err);
    expect(mapped.code).toBe(130429);
    expect(mapped.retryable).toBe(true);
  });

  it('maps known HTTP statuses correctly', () => {
    expect(HTTP_STATUS_TO_ERROR[502].retryable).toBe(true);
    expect(HTTP_STATUS_TO_ERROR[504].retryable).toBe(true);
    expect(HTTP_STATUS_TO_ERROR[429].retryable).toBe(true);
    expect(NETWORK_ERROR_CODES.has('ECONNRESET')).toBe(true);
  });
});
