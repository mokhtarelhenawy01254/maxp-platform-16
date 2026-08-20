jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/bookingPriceListsController');

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => {
      response.statusCode = code;
      return response;
    }),
    json: jest.fn((payload) => {
      response.payload = payload;
      return response;
    })
  };
  return response;
};

describe('bookingPriceListsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllPriceLists', () => {
    test('returns lists with itemCount and isBase flag', async () => {
      getSharedPrismaClient.mockReturnValue({
        priceList: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'base-1', name: 'قائمة أساسية', description: null, baseListId: null, isActive: true, _count: { items: 3 } },
            { id: 'pl-2', name: 'قائمة تعاقدية', description: null, baseListId: 'base-1', isActive: true, _count: { items: 1 } }
          ])
        }
      });

      const res = createResponse();
      await controller.getAllPriceLists({ user: { companyId: 'c1' } }, res);

      expect(res.statusCode).toBe(200);
      expect(getSharedPrismaClient().priceList.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { companyId: 'c1' }
      }));
      const data = res.payload.data;
      expect(data[0].isBase).toBe(true);
      expect(data[0].itemCount).toBe(3);
      expect(data[1].isBase).toBe(false);
      expect(data[1].itemCount).toBe(1);
    });

    test('returns 403 when companyId is missing', async () => {
      const res = createResponse();
      await controller.getAllPriceLists({ user: {} }, res);
      expect(res.statusCode).toBe(403);
      expect(res.payload.success).toBe(false);
    });
  });

  describe('createPriceList', () => {
    test('first list auto becomes Base', async () => {
      const mockPrisma = {
        priceList: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockResolvedValue({
            id: 'base-1', companyId: 'c1', name: 'قائمة أساسية', description: null, baseListId: null, isActive: true
          })
        }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.createPriceList({ user: { companyId: 'c1' }, body: { name: 'قائمة أساسية' } }, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.isBase).toBe(true);
      expect(mockPrisma.priceList.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ companyId: 'c1', name: 'قائمة أساسية', baseListId: null })
      }));
    });

    test('derived list links to the provided baseListId', async () => {
      const mockPrisma = {
        priceList: {
          count: jest.fn().mockResolvedValue(1),
          findFirst: jest.fn().mockResolvedValue({ id: 'base-1', companyId: 'c1', baseListId: null }),
          create: jest.fn().mockResolvedValue({
            id: 'pl-2', companyId: 'c1', name: 'قائمة تعاقدية', description: null, baseListId: 'base-1', isActive: true
          })
        }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.createPriceList(
        { user: { companyId: 'c1' }, body: { name: 'قائمة تعاقدية', baseListId: 'base-1' } },
        res
      );

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.priceList.findFirst).toHaveBeenCalledWith({ where: { id: 'base-1', companyId: 'c1' } });
      expect(mockPrisma.priceList.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ baseListId: 'base-1' })
      }));
    });

    test('rejects a baseListId from another company', async () => {
      const mockPrisma = {
        priceList: {
          count: jest.fn().mockResolvedValue(1),
          findFirst: jest.fn().mockResolvedValue(null)
        }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.createPriceList(
        { user: { companyId: 'c1' }, body: { name: 'قائمة', baseListId: 'other-base' } },
        res
      );

      expect(res.statusCode).toBe(400);
      expect(res.payload.success).toBe(false);
    });

    test('requires a name', async () => {
      const res = createResponse();
      await controller.createPriceList({ user: { companyId: 'c1' }, body: { name: '' } }, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('اسم القائمة مطلوب');
    });

    test('rejects a derived list as baseListId', async () => {
      const mockPrisma = {
        priceList: {
          count: jest.fn().mockResolvedValue(1),
          findFirst: jest.fn().mockResolvedValue({ id: 'pl-2', companyId: 'c1', baseListId: 'base-1' })
        }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.createPriceList(
        { user: { companyId: 'c1' }, body: { name: 'قائمة', baseListId: 'pl-2' } },
        res
      );

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('لا يمكن اعتماد قائمة متفرعة كقائمة أساسية');
    });
  });

  describe('updatePriceList', () => {
    test('updates name and description', async () => {
      const mockPrisma = {
        priceList: {
          findFirst: jest.fn().mockResolvedValue({ id: 'pl-2', companyId: 'c1', baseListId: 'base-1' }),
          update: jest.fn().mockResolvedValue({
            id: 'pl-2', companyId: 'c1', name: 'قائمة جديدة', description: 'وصف', baseListId: 'base-1', isActive: true
          })
        }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.updatePriceList(
        { user: { companyId: 'c1' }, params: { id: 'pl-2' }, body: { name: 'قائمة جديدة', description: 'وصف' } },
        res
      );

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.priceList.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'pl-2' },
        data: expect.objectContaining({ name: 'قائمة جديدة', description: 'وصف' })
      }));
    });

    test('returns 404 for a list of another company', async () => {
      getSharedPrismaClient.mockReturnValue({ priceList: { findFirst: jest.fn().mockResolvedValue(null) } });
      const res = createResponse();
      await controller.updatePriceList(
        { user: { companyId: 'c1' }, params: { id: 'nope' }, body: { name: 'x' } },
        res
      );
      expect(res.statusCode).toBe(404);
    });

    test('rejects an empty name', async () => {
      getSharedPrismaClient.mockReturnValue({ priceList: { findFirst: jest.fn().mockResolvedValue(null) } });
      const res = createResponse();
      await controller.updatePriceList(
        { user: { companyId: 'c1' }, params: { id: 'pl-2' }, body: { name: '   ' } },
        res
      );
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('اسم القائمة مطلوب');
    });
  });

  describe('deletePriceList', () => {
    test('soft deletes a derived list via isActive=false', async () => {
      const mockPrisma = {
        priceList: {
          findFirst: jest.fn().mockResolvedValue({ id: 'pl-2', companyId: 'c1', baseListId: 'base-1' }),
          count: jest.fn().mockResolvedValue(0),
          update: jest.fn().mockResolvedValue({ id: 'pl-2', companyId: 'c1', baseListId: 'base-1', isActive: false })
        }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.deletePriceList({ user: { companyId: 'c1' }, params: { id: 'pl-2' } }, res);

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.priceList.count).toHaveBeenCalledWith({ where: { baseListId: 'pl-2', isActive: true } });
      expect(mockPrisma.priceList.update).toHaveBeenCalledWith({
        where: { id: 'pl-2' },
        data: { isActive: false }
      });
    });

    test('refuses to delete the Base list', async () => {
      getSharedPrismaClient.mockReturnValue({
        priceList: { findFirst: jest.fn().mockResolvedValue({ id: 'base-1', companyId: 'c1', baseListId: null }) }
      });
      const res = createResponse();
      await controller.deletePriceList({ user: { companyId: 'c1' }, params: { id: 'base-1' } }, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('لا يمكن حذف قائمة الأسعار الأساسية');
    });

    test('refuses to delete a list that derived lists reference', async () => {
      getSharedPrismaClient.mockReturnValue({
        priceList: {
          findFirst: jest.fn().mockResolvedValue({ id: 'pl-1', companyId: 'c1', baseListId: 'base-1' }),
          count: jest.fn().mockResolvedValue(2)
        }
      });
      const res = createResponse();
      await controller.deletePriceList({ user: { companyId: 'c1' }, params: { id: 'pl-1' } }, res);
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('لا يمكن حذف قائمة تفرع منها قوائم أخرى');
    });
  });

  describe('getPriceListItems', () => {
    test('returns items with service info and effective price', async () => {
      const mockPrisma = {
        priceList: { findFirst: jest.fn().mockResolvedValue({ id: 'pl-2', companyId: 'c1', baseListId: 'base-1' }) },
        priceListItem: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'item-1', priceListId: 'pl-2', serviceId: 'svc-1', price: 250, isActive: true, service: { id: 'svc-1', name: 'كشف', basePrice: 300, durationMinutes: 30 } }
          ])
        }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.getPriceListItems({ user: { companyId: 'c1' }, params: { id: 'pl-2' } }, res);

      expect(res.statusCode).toBe(200);
      const item = res.payload.data[0];
      expect(item.effectivePrice).toBe(250);
      expect(item.service).toMatchObject({ id: 'svc-1', name: 'كشف', basePrice: 300, durationMinutes: 30 });
    });
  });

  describe('setPriceListItem', () => {
    test('upserts an override for a service and returns effective price', async () => {
      const mockPrisma = {
        priceList: { findFirst: jest.fn().mockResolvedValue({ id: 'pl-2', companyId: 'c1', baseListId: 'base-1' }) },
        bookingService: { findFirst: jest.fn().mockResolvedValue({ id: 'svc-1', companyId: 'c1', basePrice: 300 }) },
        priceListItem: {
          upsert: jest.fn().mockResolvedValue({
            id: 'item-1', priceListId: 'pl-2', serviceId: 'svc-1', price: 250, isActive: true
          })
        }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.setPriceListItem(
        { user: { companyId: 'c1' }, params: { id: 'pl-2', serviceId: 'svc-1' }, body: { price: 250 } },
        res
      );

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.effectivePrice).toBe(250);
      expect(mockPrisma.priceListItem.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { priceListId_serviceId: { priceListId: 'pl-2', serviceId: 'svc-1' } },
        update: { price: 250 },
        create: { priceListId: 'pl-2', serviceId: 'svc-1', price: 250 }
      }));
    });

    test('rejects a service from another company', async () => {
      const mockPrisma = {
        priceList: { findFirst: jest.fn().mockResolvedValue({ id: 'pl-2', companyId: 'c1', baseListId: 'base-1' }) },
        bookingService: { findFirst: jest.fn().mockResolvedValue(null) }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.setPriceListItem(
        { user: { companyId: 'c1' }, params: { id: 'pl-2', serviceId: 'svc-x' }, body: { price: 100 } },
        res
      );
      expect(res.statusCode).toBe(404);
    });

    test('rejects a non-finite price (Infinity)', async () => {
      const mockPrisma = {
        priceList: { findFirst: jest.fn().mockResolvedValue({ id: 'pl-2', companyId: 'c1', baseListId: 'base-1' }) }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.setPriceListItem(
        { user: { companyId: 'c1' }, params: { id: 'pl-2', serviceId: 'svc-1' }, body: { price: Infinity } },
        res
      );

      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('السعر غير صحيح');
      expect(mockPrisma.priceListItem).toBeUndefined();
    });

    test('rejects an override on the Base list', async () => {
      getSharedPrismaClient.mockReturnValue({
        priceList: { findFirst: jest.fn().mockResolvedValue({ id: 'base-1', companyId: 'c1', baseListId: null }) }
      });
      const res = createResponse();
      await controller.setPriceListItem(
        { user: { companyId: 'c1' }, params: { id: 'base-1', serviceId: 'svc-1' }, body: { price: 100 } },
        res
      );
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toBe('لا يمكن إضافة أسعار مخصصة للقائمة الأساسية');
    });
  });

  describe('removePriceListItem', () => {
    test('removes the override for a service', async () => {
      const mockPrisma = {
        priceList: { findFirst: jest.fn().mockResolvedValue({ id: 'pl-2', companyId: 'c1', baseListId: 'base-1' }) },
        priceListItem: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.removePriceListItem(
        { user: { companyId: 'c1' }, params: { id: 'pl-2', serviceId: 'svc-1' } },
        res
      );

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.priceListItem.deleteMany).toHaveBeenCalledWith({
        where: { priceListId: 'pl-2', serviceId: 'svc-1' }
      });
    });
  });

  describe('resolveServicePrice', () => {
    test('returns 404 when the service does not exist in the company', async () => {
      getSharedPrismaClient.mockReturnValue({
        bookingService: { findFirst: jest.fn().mockResolvedValue(null) }
      });
      const res = createResponse();
      await controller.resolveServicePrice(
        { user: { companyId: 'c1' }, params: { serviceId: 'svc-x' }, query: {} },
        res
      );
      expect(res.statusCode).toBe(404);
      expect(res.payload.error).toBe('الخدمة غير موجودة');
    });

    test('returns item price when an override exists', async () => {
      const mockPrisma = {
        bookingService: { findFirst: jest.fn().mockResolvedValue({ id: 'svc-1', companyId: 'c1', basePrice: 300 }) },
        priceList: { findFirst: jest.fn().mockResolvedValue({ id: 'pl-2', companyId: 'c1', baseListId: 'base-1' }) },
        priceListItem: { findUnique: jest.fn().mockResolvedValue({ id: 'item-1', price: 250, isActive: true }) }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.resolveServicePrice(
        { user: { companyId: 'c1' }, params: { serviceId: 'svc-1' }, query: { priceListId: 'pl-2' } },
        res
      );

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.price).toBe(250);
      expect(res.payload.data.basePrice).toBe(300);
      expect(res.payload.data.source).toBe('item');
    });

    test('falls back to basePrice when no override exists', async () => {
      const mockPrisma = {
        bookingService: { findFirst: jest.fn().mockResolvedValue({ id: 'svc-1', companyId: 'c1', basePrice: 300 }) },
        priceList: { findFirst: jest.fn().mockResolvedValue({ id: 'pl-2', companyId: 'c1', baseListId: 'base-1' }) },
        priceListItem: { findUnique: jest.fn().mockResolvedValue(null) }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.resolveServicePrice(
        { user: { companyId: 'c1' }, params: { serviceId: 'svc-1' }, query: { priceListId: 'pl-2' } },
        res
      );

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.price).toBe(300);
      expect(res.payload.data.source).toBe('base');
    });

    test('returns basePrice when priceListId is missing', async () => {
      const mockPrisma = {
        bookingService: { findFirst: jest.fn().mockResolvedValue({ id: 'svc-1', companyId: 'c1', basePrice: 300 }) }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.resolveServicePrice(
        { user: { companyId: 'c1' }, params: { serviceId: 'svc-1' }, query: {} },
        res
      );

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.price).toBe(300);
      expect(res.payload.data.source).toBe('base');
      expect(mockPrisma.priceList).toBeUndefined();
    });

    test('returns basePrice for the Base list even when an item exists', async () => {
      const mockPrisma = {
        bookingService: { findFirst: jest.fn().mockResolvedValue({ id: 'svc-1', companyId: 'c1', basePrice: 300 }) },
        priceList: { findFirst: jest.fn().mockResolvedValue({ id: 'base-1', companyId: 'c1', baseListId: null }) }
      };
      getSharedPrismaClient.mockReturnValue(mockPrisma);

      const res = createResponse();
      await controller.resolveServicePrice(
        { user: { companyId: 'c1' }, params: { serviceId: 'svc-1' }, query: { priceListId: 'base-1' } },
        res
      );

      expect(res.statusCode).toBe(200);
      expect(res.payload.data.price).toBe(300);
      expect(res.payload.data.source).toBe('base');
      expect(mockPrisma.priceListItem).toBeUndefined();
    });
  });
});
