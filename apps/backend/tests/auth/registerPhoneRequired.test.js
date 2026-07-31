const { validationResult } = require('express-validator');
const { userValidationRules } = require('../../middleware/inputValidation');

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const runUserValidation = async (bodyValue) => {
  const req = { body: bodyValue };
  const chain = userValidationRules();
  await Promise.all(chain.map((rule) => rule.run(req)));
  return validationResult(req);
};

const validBody = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  password: 'StrongPass#123',
  phone: '01012345678',
};

describe('userValidationRules phone requirement', () => {
  it('rejects a missing phone field with a required message', async () => {
    const { phone, ...withoutPhone } = validBody;
    const result = await runUserValidation(withoutPhone);
    const phoneErrors = result
      .array()
      .filter((error) => error.path === 'phone')
      .map((error) => error.msg);
    expect(phoneErrors).toContain('رقم الهاتف مطلوب');
  });

  it('rejects an empty phone field with a required message', async () => {
    const result = await runUserValidation({ ...validBody, phone: '' });
    const phoneErrors = result
      .array()
      .filter((error) => error.path === 'phone')
      .map((error) => error.msg);
    expect(phoneErrors).toContain('رقم الهاتف مطلوب');
  });

  it('accepts a valid phone', async () => {
    const result = await runUserValidation(validBody);
    const phoneErrors = result.array().filter((error) => error.path === 'phone');
    expect(phoneErrors).toHaveLength(0);
  });
});

describe('authController register phone requirement', () => {
  jest.mock('../../services/sharedDatabase', () => ({
    getSharedPrismaClient: jest.fn(() => ({})),
    initializeSharedDatabase: jest.fn().mockResolvedValue(undefined),
    executeWithRetry: jest.fn(async (operation) => operation()),
  }));

  jest.mock('bcryptjs', () => ({
    compare: jest.fn().mockResolvedValue(true),
    hash: jest.fn(),
  }));

  jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  }));

  jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => ({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-mail' }),
    })),
  }));

  const { register } = require('../../controller/authController');

  it('returns 400 with a required-fields message when phone is missing', async () => {
    const req = {
      body: {
        email: 'test@example.com',
        password: 'StrongPass#123',
        firstName: 'Test',
        lastName: 'User',
      },
    };
    const res = createResponse();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'جميع الحقول مطلوبة' }),
    );
  });
});
