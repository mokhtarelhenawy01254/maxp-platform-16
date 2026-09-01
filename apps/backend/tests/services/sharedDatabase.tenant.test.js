const tenantContext = require('../../services/tenantContext');

describe('SharedDatabase - 2026 Multi-Tenant AST Isolation Extension', () => {
  let capturedCalls;

  beforeEach(() => {
    capturedCalls = [];
  });

  function createMockPrismaClient() {
    return {
      product: {
        findMany: jest.fn(async (args) => {
          capturedCalls.push({ model: 'Product', operation: 'findMany', args });
          return [{ id: 'prod-1', companyId: args?.where?.companyId }];
        }),
        findFirst: jest.fn(async (args) => {
          capturedCalls.push({ model: 'Product', operation: 'findFirst', args });
          return { id: 'prod-1', companyId: args?.where?.companyId };
        }),
        count: jest.fn(async (args) => {
          capturedCalls.push({ model: 'Product', operation: 'count', args });
          return 1;
        }),
        create: jest.fn(async (args) => {
          capturedCalls.push({ model: 'Product', operation: 'create', args });
          return { id: 'prod-1', ...args.data };
        }),
        update: jest.fn(async (args) => {
          capturedCalls.push({ model: 'Product', operation: 'update', args });
          return { id: 'prod-1', ...args.data };
        }),
        delete: jest.fn(async (args) => {
          capturedCalls.push({ model: 'Product', operation: 'delete', args });
          return { id: 'prod-1' };
        })
      },
      company: {
        findUnique: jest.fn(async (args) => {
          capturedCalls.push({ model: 'Company', operation: 'findUnique', args });
          return { id: args?.where?.id || 'comp-1', name: 'Test Company' };
        }),
        update: jest.fn(async (args) => {
          capturedCalls.push({ model: 'Company', operation: 'update', args });
          return { id: 'comp-1', name: 'Updated' };
        })
      },
      $extends: function(extension) {
        const extQuery = extension.query.$allOperations;
        const extended = {};

        for (const [modelName, methods] of Object.entries(this)) {
          if (modelName.startsWith('$')) continue;
          const modelTitle = modelName.charAt(0).toUpperCase() + modelName.slice(1);
          extended[modelName] = {};

          for (const [opName, mockFn] of Object.entries(methods)) {
            extended[modelName][opName] = async (args) => {
              return extQuery({
                model: modelTitle,
                operation: opName,
                args,
                query: async (modifiedArgs) => mockFn(modifiedArgs)
              });
            };
          }
        }
        return extended;
      }
    };
  }

  const GLOBAL_MODELS = new Set([
    'Company',
    'User',
    'SubscriptionPlan',
    'PlatformSetting',
    'PlatformSiteMetaPixelSetting',
    'PlatformSiteHomepageSetting',
    'PlatformDefaultSidebarSetting',
    'DevProject',
    'DevTask',
    'DevTeamMember',
    'DevTimeLog',
    'SystemLog',
    'AppSystemLog',
    'TelegramConfig',
    'TelegramScheduledMessage'
  ]);

  function applyExtension(client) {
    return client.$extends({
      query: {
        $allOperations: async ({ model, operation, args, query }) => {
          const companyId = tenantContext.getCompanyId();
          const isBypassed = tenantContext.isBypassed();

          if (isBypassed || !companyId || GLOBAL_MODELS.has(model)) {
            return await query(args);
          }

          args = args || {};

          if (['findMany', 'findFirst', 'count', 'aggregate', 'groupBy'].includes(operation)) {
            args.where = { ...args.where, companyId };
          } else if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
            return client[model.toLowerCase()].findFirst({
              ...args,
              where: { ...args.where, companyId }
            });
          } else if (operation === 'create') {
            args.data = { ...args.data, companyId };
          } else if (operation === 'createMany') {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((item) => ({ ...item, companyId }));
            } else if (args.data) {
              args.data = { ...args.data, companyId };
            }
          } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
            args.where = { ...args.where, companyId };
          } else if (operation === 'upsert') {
            args.where = { ...args.where, companyId };
            args.create = { ...args.create, companyId };
            args.update = { ...args.update };
          }

          return query(args);
        }
      }
    });
  }

  it('يحقن companyId تلقائياً في استعلامات القراءة عندما يكون السياق مفعلاً', async () => {
    const rawClient = createMockPrismaClient();
    const client = applyExtension(rawClient);

    await tenantContext.run('company-123', async () => {
      await client.product.findMany({ where: { status: 'active' } });
      await client.product.count({ where: { price: { gt: 100 } } });
    });

    expect(capturedCalls).toHaveLength(2);
    expect(capturedCalls[0].args.where).toEqual({ status: 'active', companyId: 'company-123' });
    expect(capturedCalls[1].args.where).toEqual({ price: { gt: 100 }, companyId: 'company-123' });
  });

  it('يحقن companyId تلقائياً في استعلامات الإنشاء والتعديل والحذف', async () => {
    const rawClient = createMockPrismaClient();
    const client = applyExtension(rawClient);

    await tenantContext.run('company-456', async () => {
      await client.product.create({ data: { title: 'Shirt', price: 200 } });
      await client.product.update({ where: { id: 'prod-1' }, data: { price: 250 } });
      await client.product.delete({ where: { id: 'prod-1' } });
    });

    expect(capturedCalls).toHaveLength(3);
    expect(capturedCalls[0].args.data).toEqual({ title: 'Shirt', price: 200, companyId: 'company-456' });
    expect(capturedCalls[1].args.where).toEqual({ id: 'prod-1', companyId: 'company-456' });
    expect(capturedCalls[2].args.where).toEqual({ id: 'prod-1', companyId: 'company-456' });
  });

  it('يتجاوز الحقن تلقائياً للجداول العامة مثل Company', async () => {
    const rawClient = createMockPrismaClient();
    const client = applyExtension(rawClient);

    await tenantContext.run('company-789', async () => {
      await client.company.findUnique({ where: { id: 'company-789' } });
    });

    expect(capturedCalls).toHaveLength(1);
    expect(capturedCalls[0].args.where).toEqual({ id: 'company-789' });
    expect(capturedCalls[0].args.where.companyId).toBeUndefined();
  });

  it('يدعم bypass() لعمليات السوبر أدمن والنظام', async () => {
    const rawClient = createMockPrismaClient();
    const client = applyExtension(rawClient);

    await tenantContext.bypass(async () => {
      await client.product.findMany({ where: { status: 'pending' } });
    });

    expect(capturedCalls).toHaveLength(1);
    expect(capturedCalls[0].args.where).toEqual({ status: 'pending' });
    expect(capturedCalls[0].args.where.companyId).toBeUndefined();
  });
});
