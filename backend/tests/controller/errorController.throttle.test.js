describe('errorController frontend error throttling', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalThrottle = process.env.FRONTEND_ERROR_LOG_THROTTLE_MS;

  let consoleErrorSpy;
  let dateNowSpy;

  const createResponse = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  });

  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_ERROR_LOG_THROTTLE_MS = '300000';
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    dateNowSpy.mockRestore();
    process.env.NODE_ENV = originalNodeEnv;
    if (originalThrottle === undefined) {
      delete process.env.FRONTEND_ERROR_LOG_THROTTLE_MS;
    } else {
      process.env.FRONTEND_ERROR_LOG_THROTTLE_MS = originalThrottle;
    }
  });

  it('suppresses expected dev tasks authorization noise from frontend logging', async () => {
    const controller = require('../../controller/errorController');
    const req = {
      body: {
        message: 'Console Error',
        url: 'https://maxp.online/super-admin/dev-tasks?x=1',
        timestamp: '2026-05-08T16:23:03.533Z',
        type: 'error',
        userAgent: 'Chrome',
        stack: 'AxiosError: Request failed with status code 403'
      }
    };

    await controller.logError(req, createResponse());
    await controller.logError(
      {
        body: {
          ...req.body,
          url: 'https://maxp.online/super-admin/dev-tasks?x=2',
          stack: 'AxiosError: Request failed with status code 401'
        }
      },
      createResponse()
    );

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('suppresses empty production console-error pings from frontend logging', async () => {
    const controller = require('../../controller/errorController');
    const req = {
      body: {
        message: 'Console Error',
        url: 'https://maxp.online/whatsapp',
        timestamp: '2026-05-09T14:13:35.462Z',
        type: 'error',
        userAgent: 'Chrome',
        stack: ''
      }
    };

    await controller.logError(req, createResponse());

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('logs non-auth frontend errors and suppresses duplicates in the throttle window', async () => {
    const controller = require('../../controller/errorController');
    const req = {
      body: {
        message: 'Console Error',
        url: 'https://maxp.online/super-admin/dev-tasks?x=1',
        timestamp: '2026-05-08T16:23:03.533Z',
        type: 'error',
        userAgent: 'Chrome',
        stack: 'AxiosError: Request failed with status code 500'
      }
    };

    await controller.logError(req, createResponse());
    await controller.logError(
      {
        body: {
          ...req.body,
          url: 'https://maxp.online/super-admin/dev-tasks?x=2',
          timestamp: '2026-05-08T16:23:33.533Z'
        }
      },
      createResponse()
    );

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

    dateNowSpy.mockReturnValue(301001);
    await controller.logError(req, createResponse());

    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy.mock.calls[1][1]).toContain('"suppressedDuplicates":1');
  });
});
