const linkedOrderSyncService = require('../../services/linkedOrderSyncService');

describe('linkedOrderSyncService', () => {
  afterEach(() => {
    linkedOrderSyncService.__clearConnectionCache();
    linkedOrderSyncService.__setPrismaForTests(null);
  });

  it('provider copy internal_push -> consumer Order gets the new status + one history row with oldStatus', async () => {
    linkedOrderSyncService.__clearConnectionCache();

    const fakePrisma = {
      companyConnection: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conn-1' })
      },
      order: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'provider-order-1') {
            return Promise.resolve({
              id: 'provider-order-1',
              companyId: 'provider-comp',
              sourceType: 'internal_push',
              externalId: 'consumer-order-1',
              status: 'CONFIRMED'
            });
          }
          if (where.id === 'consumer-order-1') {
            return Promise.resolve({
              id: 'consumer-order-1',
              companyId: 'consumer-comp',
              sourceType: 'regular',
              externalId: null,
              status: 'PENDING'
            });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockResolvedValue({ id: 'consumer-order-1', status: 'CONFIRMED' })
      },
      guestOrder: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn()
      }
    };

    linkedOrderSyncService.__setPrismaForTests(fakePrisma);

    const result = await linkedOrderSyncService.mirrorStatus({
      model: 'Order',
      orderId: 'provider-order-1',
      companyId: 'provider-comp',
      newStatus: 'CONFIRMED'
    });

    expect(result.mirrored).toBe(1);
    expect(fakePrisma.order.update).toHaveBeenCalledTimes(1);
    expect(fakePrisma.order.update).toHaveBeenCalledWith({
      where: { id: 'consumer-order-1' },
      data: expect.objectContaining({
        status: 'CONFIRMED',
        customStatusCode: null,
        statusHistory: {
          create: expect.objectContaining({
            status: 'CONFIRMED',
            oldStatus: 'PENDING',
            reason: 'مزامنة تلقائية من الشركة المرتبطة'
          })
        }
      })
    });
  });

  it('provider copy -> consumer GuestOrder (relation OrderStatusHistory)', async () => {
    linkedOrderSyncService.__clearConnectionCache();

    const fakePrisma = {
      companyConnection: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conn-1' })
      },
      order: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'provider-order-1') {
            return Promise.resolve({
              id: 'provider-order-1',
              companyId: 'provider-comp',
              sourceType: 'internal_push',
              externalId: 'consumer-guest-1',
              status: 'SHIPPED'
            });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn()
      },
      guestOrder: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'consumer-guest-1') {
            return Promise.resolve({
              id: 'consumer-guest-1',
              companyId: 'consumer-comp',
              status: 'pending'
            });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockResolvedValue({ id: 'consumer-guest-1', status: 'SHIPPED' })
      }
    };

    linkedOrderSyncService.__setPrismaForTests(fakePrisma);

    const result = await linkedOrderSyncService.mirrorStatus({
      model: 'Order',
      orderId: 'provider-order-1',
      companyId: 'provider-comp',
      newStatus: 'SHIPPED'
    });

    expect(result.mirrored).toBe(1);
    expect(fakePrisma.guestOrder.update).toHaveBeenCalledTimes(1);
    expect(fakePrisma.guestOrder.update).toHaveBeenCalledWith({
      where: { id: 'consumer-guest-1' },
      data: expect.objectContaining({
        status: 'SHIPPED',
        OrderStatusHistory: {
          create: expect.objectContaining({
            status: 'SHIPPED',
            oldStatus: 'pending',
            reason: 'مزامنة تلقائية من الشركة المرتبطة'
          })
        }
      })
    });
  });

  it('consumer Order -> all provider copies (2) updated, one scheduled call each', async () => {
    linkedOrderSyncService.__clearConnectionCache();

    const fakePrisma = {
      companyConnection: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conn-1' })
      },
      order: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'consumer-order-1') {
            return Promise.resolve({
              id: 'consumer-order-1',
              companyId: 'consumer-comp',
              sourceType: 'regular',
              externalId: null,
              status: 'CONFIRMED'
            });
          }
          return Promise.resolve(null);
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          if (where.externalId === 'consumer-order-1' && where.sourceType === 'internal_push') {
            return Promise.resolve([
              { id: 'provider-order-1', companyId: 'provider-1', status: 'PENDING' },
              { id: 'provider-order-2', companyId: 'provider-2', status: 'PENDING' }
            ]);
          }
          return Promise.resolve([]);
        }),
        update: jest.fn().mockResolvedValue({ id: 'updated' })
      },
      guestOrder: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn()
      }
    };

    linkedOrderSyncService.__setPrismaForTests(fakePrisma);

    const result = await linkedOrderSyncService.mirrorStatus({
      model: 'Order',
      orderId: 'consumer-order-1',
      companyId: 'consumer-comp',
      newStatus: 'CONFIRMED'
    });

    expect(result.mirrored).toBe(2);
    expect(fakePrisma.order.update).toHaveBeenCalledTimes(2);

    expect(fakePrisma.order.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'provider-order-1' },
      data: expect.objectContaining({
        status: 'CONFIRMED',
        customStatusCode: null,
        statusHistory: {
          create: expect.objectContaining({
            status: 'CONFIRMED',
            oldStatus: 'PENDING',
            reason: 'مزامنة تلقائية من الشركة المرتبطة'
          })
        }
      })
    });

    expect(fakePrisma.order.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'provider-order-2' },
      data: expect.objectContaining({
        status: 'CONFIRMED',
        customStatusCode: null,
        statusHistory: {
          create: expect.objectContaining({
            status: 'CONFIRMED',
            oldStatus: 'PENDING',
            reason: 'مزامنة تلقائية من الشركة المرتبطة'
          })
        }
      })
    });

    // Also verify scheduleMirror triggers mirrorStatus via setImmediate
    fakePrisma.order.update.mockClear();
    linkedOrderSyncService.scheduleMirror({
      model: 'Order',
      orderId: 'consumer-order-1',
      companyId: 'consumer-comp',
      newStatus: 'CONFIRMED'
    });

    await new Promise((resolve) => setImmediate(resolve));
    expect(fakePrisma.order.update).toHaveBeenCalledTimes(2);
  });

  it('consumer GuestOrder -> provider copy updated', async () => {
    linkedOrderSyncService.__clearConnectionCache();

    const fakePrisma = {
      companyConnection: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conn-1' })
      },
      guestOrder: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'consumer-guest-1') {
            return Promise.resolve({
              id: 'consumer-guest-1',
              companyId: 'consumer-comp',
              status: 'CONFIRMED'
            });
          }
          return Promise.resolve(null);
        })
      },
      order: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          if (where.externalId === 'consumer-guest-1' && where.sourceType === 'internal_push') {
            return Promise.resolve([
              { id: 'provider-order-1', companyId: 'provider-comp', status: 'PENDING' }
            ]);
          }
          return Promise.resolve([]);
        }),
        update: jest.fn().mockResolvedValue({ id: 'provider-order-1', status: 'CONFIRMED' })
      }
    };

    linkedOrderSyncService.__setPrismaForTests(fakePrisma);

    const result = await linkedOrderSyncService.mirrorStatus({
      model: 'GuestOrder',
      orderId: 'consumer-guest-1',
      companyId: 'consumer-comp',
      newStatus: 'CONFIRMED'
    });

    expect(result.mirrored).toBe(1);
    expect(fakePrisma.order.update).toHaveBeenCalledTimes(1);
    expect(fakePrisma.order.update).toHaveBeenCalledWith({
      where: { id: 'provider-order-1' },
      data: expect.objectContaining({
        status: 'CONFIRMED',
        customStatusCode: null,
        statusHistory: {
          create: expect.objectContaining({
            status: 'CONFIRMED',
            oldStatus: 'PENDING',
            reason: 'مزامنة تلقائية من الشركة المرتبطة'
          })
        }
      })
    });
  });

  it('same status twice -> second call writes nothing (idempotent)', async () => {
    linkedOrderSyncService.__clearConnectionCache();

    const fakePrisma = {
      companyConnection: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conn-1' })
      },
      order: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'provider-order-1') {
            return Promise.resolve({
              id: 'provider-order-1',
              companyId: 'provider-comp',
              sourceType: 'internal_push',
              externalId: 'consumer-order-1',
              status: 'CONFIRMED'
            });
          }
          if (where.id === 'consumer-order-1') {
            return Promise.resolve({
              id: 'consumer-order-1',
              companyId: 'consumer-comp',
              status: 'CONFIRMED'
            });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn()
      },
      guestOrder: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn()
      }
    };

    linkedOrderSyncService.__setPrismaForTests(fakePrisma);

    const result = await linkedOrderSyncService.mirrorStatus({
      model: 'Order',
      orderId: 'provider-order-1',
      companyId: 'provider-comp',
      newStatus: 'CONFIRMED'
    });

    expect(result.mirrored).toBe(0);
    expect(result.skipped).toBe(1);
    expect(fakePrisma.order.update).not.toHaveBeenCalled();
  });

  it('invalid status for Order (e.g. FOO) -> no throw, no update', async () => {
    linkedOrderSyncService.__clearConnectionCache();

    const fakePrisma = {
      companyConnection: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conn-1' })
      },
      order: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'provider-order-1') {
            return Promise.resolve({
              id: 'provider-order-1',
              companyId: 'provider-comp',
              sourceType: 'internal_push',
              externalId: 'consumer-order-1',
              status: 'FOO'
            });
          }
          if (where.id === 'consumer-order-1') {
            return Promise.resolve({
              id: 'consumer-order-1',
              companyId: 'consumer-comp',
              status: 'PENDING'
            });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn()
      },
      guestOrder: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn()
      }
    };

    linkedOrderSyncService.__setPrismaForTests(fakePrisma);

    let thrown = false;
    let result = null;
    try {
      result = await linkedOrderSyncService.mirrorStatus({
        model: 'Order',
        orderId: 'provider-order-1',
        companyId: 'provider-comp',
        newStatus: 'FOO'
      });
    } catch (e) {
      thrown = true;
    }

    expect(thrown).toBe(false);
    expect(result.mirrored).toBe(0);
    expect(result.skipped).toBe(1);
    expect(fakePrisma.order.update).not.toHaveBeenCalled();
  });

  it('no active connection -> zero peer queries (__clearConnectionCache, fake connection findFirst returns null)', async () => {
    linkedOrderSyncService.__clearConnectionCache();

    const fakePrisma = {
      companyConnection: {
        findFirst: jest.fn().mockResolvedValue(null)
      },
      order: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
      },
      guestOrder: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
      }
    };

    linkedOrderSyncService.__setPrismaForTests(fakePrisma);

    const result = await linkedOrderSyncService.mirrorStatus({
      model: 'Order',
      orderId: 'provider-order-1',
      companyId: 'provider-comp',
      newStatus: 'CONFIRMED'
    });

    expect(result.mirrored).toBe(0);
    expect(fakePrisma.companyConnection.findFirst).toHaveBeenCalledTimes(1);
    expect(fakePrisma.order.findUnique).not.toHaveBeenCalled();
    expect(fakePrisma.order.findMany).not.toHaveBeenCalled();
    expect(fakePrisma.guestOrder.findUnique).not.toHaveBeenCalled();
    expect(fakePrisma.order.update).not.toHaveBeenCalled();
    expect(fakePrisma.guestOrder.update).not.toHaveBeenCalled();
  });

  it('a peer update that throws does not reject mirrorStatus', async () => {
    linkedOrderSyncService.__clearConnectionCache();

    const fakePrisma = {
      companyConnection: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conn-1' })
      },
      order: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'provider-order-1') {
            return Promise.resolve({
              id: 'provider-order-1',
              companyId: 'provider-comp',
              sourceType: 'internal_push',
              externalId: 'consumer-order-1',
              status: 'CONFIRMED'
            });
          }
          if (where.id === 'consumer-order-1') {
            return Promise.resolve({
              id: 'consumer-order-1',
              companyId: 'consumer-comp',
              status: 'PENDING'
            });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockRejectedValue(new Error('DB connection failure'))
      },
      guestOrder: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn()
      }
    };

    linkedOrderSyncService.__setPrismaForTests(fakePrisma);

    let result = null;
    let rejected = false;
    try {
      result = await linkedOrderSyncService.mirrorStatus({
        model: 'Order',
        orderId: 'provider-order-1',
        companyId: 'provider-comp',
        newStatus: 'CONFIRMED'
      });
    } catch (e) {
      rejected = true;
    }

    expect(rejected).toBe(false);
    expect(result).toBeDefined();
    expect(result.mirrored).toBe(0);
    expect(result.skipped).toBe(1);
  });
});
