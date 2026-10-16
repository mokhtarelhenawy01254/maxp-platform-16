/**
 * Regression tests — employee invitation public onboarding (2026-10-16)
 *
 * Bug: GET/POST /api/v1/hr/employee-invitations/{verify,accept}/:token are
 * public by design (fresh invitees have no user token and no companyId),
 * but they fell under COMPANY_ISOLATED_ROUTES ('/api/v1/hr/*') and were
 * rejected with 403 COMPANY_ID_REQUIRED — making every fresh invite link
 * render "تعذر فحص ...
 * (docs/employee-invitation-403-2026-10-16.md).
 */

const {
  needsCompanyIsolation,
  globalCompanyIsolation,
} = require('../../middleware/globalSecurity');

describe('globalSecurity — employee invitation self-onboarding routes are public', () => {
  test('REGRESSION: verify/accept endpoints are exempt from company isolation', () => {
    expect(needsCompanyIsolation('/api/v1/hr/employee-invitations/verify/tok123')).toBe(false);
    expect(needsCompanyIsolation('/api/v1/hr/employee-invitations/accept/tok123')).toBe(false);
  });

  test('other HR routes remain company-isolated', () => {
    expect(needsCompanyIsolation('/api/v1/hr/employees')).toBe(true);
    expect(needsCompanyIsolation('/api/v1/hr/dashboard')).toBe(true);
  });

  test('unauthenticated invitee passes globalCompanyIsolation without 403', () => {
    const req = {
      method: 'GET',
      path: '/api/v1/hr/employee-invitations/verify/tok123',
      originalUrl: '/api/v1/hr/employee-invitations/verify/tok123',
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      headers: {},
    };
    const res = {
      statusCode: 200,
      status(code) { res.statusCode = code; return res; },
      json(payload) { res.payload = payload; return res; },
    };
    const next = jest.fn();

    globalCompanyIsolation(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.payload).toBeUndefined();
  });
});
