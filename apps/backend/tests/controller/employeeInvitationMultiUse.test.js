/**
 * Unit/Regression tests — Multi-use Employee Invitations
 */

const sharedDatabase = require('../../services/sharedDatabase');

const mPrisma = {
  employeeInvitation: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn()
  },
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  userCompany: {
    create: jest.fn()
  },
  employee: {
    count: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  department: {
    findFirst: jest.fn()
  },
  position: {
    findFirst: jest.fn()
  }
};

jest.spyOn(sharedDatabase, 'getSharedPrismaClient').mockReturnValue(mPrisma);

const {
  createEmployeeInvitation,
  verifyEmployeeInvitation
} = require('../../controller/employeeInvitationController');

describe('Employee Invitation Controller — Multi-Use Support', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createEmployeeInvitation stores isMultiUse and maxUses in metadata', async () => {
    const req = {
      user: { companyId: 'comp_1', userId: 'user_admin' },
      body: {
        role: 'AGENT',
        isMultiUse: true,
        maxUses: 5,
        expiryDays: 7
      }
    };
    let responseStatus = 200;
    let responseData = null;
    const res = {
      status(code) { responseStatus = code; return this; },
      json(data) { responseData = data; return this; }
    };

    mPrisma.employeeInvitation.create.mockResolvedValue({
      id: 'inv_1',
      token: 'tok_abc',
      metadata: JSON.stringify({ isMultiUse: true, maxUses: 5, acceptedCount: 0 })
    });

    await createEmployeeInvitation(req, res);

    expect(responseStatus).toBe(201);
    expect(mPrisma.employeeInvitation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: 'comp_1',
          role: 'AGENT',
          metadata: expect.stringContaining('"isMultiUse":true')
        })
      })
    );
  });

  test('verifyEmployeeInvitation allows multi-use invitation with acceptedCount < maxUses', async () => {
    const req = { params: { token: 'tok_multi' } };
    let responseStatus = 200;
    let responseData = null;
    const res = {
      status(code) { responseStatus = code; return this; },
      json(data) { responseData = data; return this; }
    };

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    mPrisma.employeeInvitation.findUnique.mockResolvedValue({
      id: 'inv_multi',
      token: 'tok_multi',
      status: 'PENDING',
      expiresAt: futureDate,
      role: 'AGENT',
      contractType: 'FULL_TIME',
      metadata: JSON.stringify({ isMultiUse: true, maxUses: 3, acceptedCount: 1 }),
      company: { id: 'comp_1', name: 'Test Co' }
    });

    await verifyEmployeeInvitation(req, res);

    expect(responseStatus).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.data.invitation.isMultiUse).toBe(true);
    expect(responseData.data.invitation.acceptedCount).toBe(1);
    expect(responseData.data.invitation.maxUses).toBe(3);
  });

  test('verifyEmployeeInvitation rejects multi-use invitation when maxUses is reached', async () => {
    const req = { params: { token: 'tok_multi_full' } };
    let responseStatus = 200;
    let responseData = null;
    const res = {
      status(code) { responseStatus = code; return this; },
      json(data) { responseData = data; return this; }
    };

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    mPrisma.employeeInvitation.findUnique.mockResolvedValue({
      id: 'inv_multi_full',
      token: 'tok_multi_full',
      status: 'PENDING',
      expiresAt: futureDate,
      role: 'AGENT',
      contractType: 'FULL_TIME',
      metadata: JSON.stringify({ isMultiUse: true, maxUses: 2, acceptedCount: 2 }),
      company: { id: 'comp_1', name: 'Test Co' }
    });

    await verifyEmployeeInvitation(req, res);

    expect(responseStatus).toBe(400);
    expect(responseData.success).toBe(false);
    expect(responseData.message).toContain('اكتمل الحد الأقصى للمسجلين');
  });
});
