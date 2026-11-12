/**
 * Shipping Companies Route Validation & Built-in Delete Protection Tests
 */

const mockPrisma = {
  shippingCompany: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  company: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user-1', companyId: 'comp-1' };
    next();
  },
  requireRole: () => (req, res, next) => next(),
}));

const express = require('express');
const request = require('supertest');
const shippingCompaniesRoutes = require('../../routes/shippingCompaniesRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/shipping-companies', shippingCompaniesRoutes);

describe('Shipping Companies Validation & Built-in Deletion Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/shipping-companies - shipmentCreateTrigger validation', () => {
    test('returns 400 and does not save when shipmentCreateTrigger is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/shipping-companies')
        .send({
          name: 'شركة سريعة',
          shipmentCreateTrigger: 'INVALID_TRIGGER',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('قيمة توقيت إنشاء البوليصة غير صحيحة');
      expect(mockPrisma.shippingCompany.create).not.toHaveBeenCalled();
    });

    test('returns 400 when invalid trigger is passed inside settings', async () => {
      const res = await request(app)
        .post('/api/v1/shipping-companies')
        .send({
          name: 'شركة سريعة',
          settings: JSON.stringify({ autoCreateShipments: true, shipmentCreateTrigger: 'UNKNOWN' }),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('قيمة توقيت إنشاء البوليصة غير صحيحة');
      expect(mockPrisma.shippingCompany.create).not.toHaveBeenCalled();
    });

    test.each(['ON_ORDER', 'ON_CONFIRM', 'ON_READY'])(
      'accepts valid shipmentCreateTrigger: %s',
      async (trigger) => {
        mockPrisma.shippingCompany.create.mockResolvedValue({
          id: 'sc-1',
          name: 'شركة سريعة',
          providerKey: 'MANUAL',
          settings: JSON.stringify({ autoCreateShipments: true, shipmentCreateTrigger: trigger }),
        });

        const res = await request(app)
          .post('/api/v1/shipping-companies')
          .send({
            name: 'شركة سريعة',
            autoCreateShipments: true,
            shipmentCreateTrigger: trigger,
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(mockPrisma.shippingCompany.create).toHaveBeenCalledTimes(1);
      }
    );

    test('keeps legacy behavior when shipmentCreateTrigger is empty or omitted', async () => {
      mockPrisma.shippingCompany.create.mockResolvedValue({
        id: 'sc-2',
        name: 'شركة تقليدية',
        providerKey: 'MANUAL',
        settings: JSON.stringify({ autoCreateShipments: false, shipmentCreateTrigger: 'NONE' }),
      });

      const res = await request(app)
        .post('/api/v1/shipping-companies')
        .send({
          name: 'شركة تقليدية',
          shipmentCreateTrigger: '',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.shippingCompany.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('PUT /api/v1/shipping-companies/:id - shipmentCreateTrigger validation', () => {
    test('returns 400 and does not update when shipmentCreateTrigger is invalid', async () => {
      mockPrisma.shippingCompany.findFirst.mockResolvedValue({
        id: 'sc-1',
        companyId: 'comp-1',
        name: 'شركة سريعة',
        providerKey: 'TURBO',
        settings: JSON.stringify({ autoCreateShipments: true, shipmentCreateTrigger: 'ON_ORDER' }),
      });

      const res = await request(app)
        .put('/api/v1/shipping-companies/sc-1')
        .send({
          shipmentCreateTrigger: 'ON_DELIVERY',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('قيمة توقيت إنشاء البوليصة غير صحيحة');
      expect(mockPrisma.shippingCompany.update).not.toHaveBeenCalled();
    });

    test('updates successfully when shipmentCreateTrigger is ON_READY', async () => {
      mockPrisma.shippingCompany.findFirst.mockResolvedValue({
        id: 'sc-1',
        companyId: 'comp-1',
        name: 'Turbo',
        providerKey: 'TURBO',
        isActive: true,
        settings: JSON.stringify({ autoCreateShipments: true, shipmentCreateTrigger: 'ON_ORDER' }),
      });
      mockPrisma.shippingCompany.update.mockResolvedValue({
        id: 'sc-1',
        name: 'Turbo',
        providerKey: 'TURBO',
        settings: JSON.stringify({ autoCreateShipments: true, shipmentCreateTrigger: 'ON_READY' }),
      });
      mockPrisma.company.update.mockResolvedValue({});

      const res = await request(app)
        .put('/api/v1/shipping-companies/sc-1')
        .send({
          shipmentCreateTrigger: 'on_ready',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.shippingCompany.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('DELETE /api/v1/shipping-companies/:id - built-in deletion protection', () => {
    test.each([
      { id: 'sc-turbo', providerKey: 'TURBO', slug: 'turbo', name: 'Turbo' },
      { id: 'sc-bosta', providerKey: 'BOSTA', slug: 'bosta', name: 'Bosta' },
      { id: 'sc-qp', providerKey: 'QP_EXPRESS', slug: 'qp-express', name: 'QP Express' },
    ])('returns 403 for built-in carrier $name', async (carrier) => {
      mockPrisma.shippingCompany.findFirst.mockResolvedValue({
        ...carrier,
        companyId: 'comp-1',
      });

      const res = await request(app).delete(`/api/v1/shipping-companies/${carrier.id}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('شركات الشحن المدمجة لا يمكن حذفها');
      expect(mockPrisma.shippingCompany.delete).not.toHaveBeenCalled();
    });

    test('allows deleting custom/manual carrier', async () => {
      mockPrisma.shippingCompany.findFirst.mockResolvedValue({
        id: 'sc-custom',
        companyId: 'comp-1',
        name: 'أسطول خاص',
        slug: 'custom-fleet',
        providerKey: 'MANUAL',
      });
      mockPrisma.shippingCompany.delete.mockResolvedValue({ id: 'sc-custom' });

      const res = await request(app).delete('/api/v1/shipping-companies/sc-custom');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.shippingCompany.delete).toHaveBeenCalledWith({ where: { id: 'sc-custom' } });
    });
  });
});
