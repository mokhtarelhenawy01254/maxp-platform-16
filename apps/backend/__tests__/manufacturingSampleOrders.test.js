/**
 * Jest & Direct Test Suite for Standalone Sample Manufacturing Orders (Wave 5)
 */

const assert = require('assert');

let currentPrisma = null;

// Mock sharedDatabase before requiring services
const sharedDbPath = require.resolve('../services/sharedDatabase');
require.cache[sharedDbPath] = {
  id: sharedDbPath,
  filename: sharedDbPath,
  loaded: true,
  exports: {
    getSharedPrismaClient: () => global.__testPrisma || currentPrisma,
  },
};

if (typeof jest !== 'undefined') {
  jest.mock('../services/sharedDatabase', () => ({
    getSharedPrismaClient: () => global.__testPrisma || currentPrisma,
  }));
}

const ManufacturingSampleService = require('../services/manufacturingSampleService');
const ManufacturingService = require('../services/manufacturingService');

function createInMemoryStore() {
  const store = {
    sampleOrders: new Map(),
    sampleStages: new Map(),
    sampleAttachments: new Map(),
    sampleExpenseCatalogs: new Map(),
    sampleOrderExpenses: new Map(),
    sampleOrderItems: new Map(),
    sampleComponents: new Map(),
    productionOrders: new Map(),
    boms: new Map(),
    partnerFactories: new Map(),
    products: new Map(),
    inventory: new Map(),
    stockMovements: new Map(),
    warehouses: new Map(),
    manufacturingSettings: new Map(),
    counter: 0,
  };

  return {
    sampleOrder: {
      findFirst: async ({ where, orderBy } = {}) => {
        let items = Array.from(store.sampleOrders.values());
        if (where?.companyId) items = items.filter((s) => s.companyId === where.companyId);
        if (where?.id) items = items.filter((s) => s.id === where.id);
        if (where?.sampleNumber?.startsWith) {
          items = items.filter((s) => s.sampleNumber.startsWith(where.sampleNumber.startsWith));
        }
        if (where?.status) items = items.filter((s) => s.status === where.status);
        if (orderBy?.sampleNumber === 'desc') {
          items.sort((a, b) => b.sampleNumber.localeCompare(a.sampleNumber));
        }
        if (items.length === 0) return null;
        const item = items[0];
        const stages = Array.from(store.sampleStages.values())
          .filter((st) => st.sampleOrderId === item.id)
          .sort((a, b) => a.sequence - b.sequence);
        const attachments = Array.from(store.sampleAttachments.values())
          .filter((att) => att.sampleOrderId === item.id);
        const expenses = Array.from(store.sampleOrderExpenses.values())
          .filter((exp) => exp.sampleOrderId === item.id);
        const sampleItems = Array.from(store.sampleOrderItems.values())
          .filter((it) => it.sampleOrderId === item.id)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const components = Array.from(store.sampleComponents.values())
          .filter((c) => c.sampleOrderId === item.id)
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        return { ...item, stages, attachments, expenses, items: sampleItems, components };
      },
      findMany: async ({ where, skip = 0, take = 50 } = {}) => {
        let items = Array.from(store.sampleOrders.values());
        if (where?.companyId) items = items.filter((s) => s.companyId === where.companyId);
        if (where?.status && where.status !== 'ALL') items = items.filter((s) => s.status === where.status);
        if (where?.materialSource && where.materialSource !== 'ALL') {
          items = items.filter((s) => s.materialSource === where.materialSource);
        }
        if (where?.OR) {
          items = items.filter((s) => {
            const num = (s.sampleNumber || '').toLowerCase();
            const prod = (s.productName || '').toLowerCase();
            const cust = (s.customerName || '').toLowerCase();
            const brand = (s.brandName || '').toLowerCase();
            return (
              num.includes('brand') || prod.includes('brand') || cust.includes('brand') || brand.includes('brand')
            );
          });
        }
        return items.slice(skip, skip + take).map((s) => ({
          ...s,
          stages: Array.from(store.sampleStages.values()).filter((st) => st.sampleOrderId === s.id),
          attachments: Array.from(store.sampleAttachments.values()).filter((att) => att.sampleOrderId === s.id),
          expenses: Array.from(store.sampleOrderExpenses.values()).filter((exp) => exp.sampleOrderId === s.id),
          items: Array.from(store.sampleOrderItems.values()).filter((it) => it.sampleOrderId === s.id).sort((a, b) => a.sortOrder - b.sortOrder),
          components: Array.from(store.sampleComponents.values()).filter((c) => c.sampleOrderId === s.id).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
        }));
      },
      count: async ({ where } = {}) => {
        let items = Array.from(store.sampleOrders.values());
        if (where?.companyId) items = items.filter((s) => s.companyId === where.companyId);
        if (where?.status && where.status !== 'ALL') items = items.filter((s) => s.status === where.status);
        return items.length;
      },
      create: async ({ data }) => {
        const id = `smp-ord-${++store.counter}`;
        const record = {
          id,
          ...data,
          status: data.status || 'DRAFT',
          plannedQuantity: data.plannedQuantity !== undefined ? data.plannedQuantity : 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.sampleOrders.set(id, record);
        return record;
      },
      update: async ({ where, data }) => {
        const existing = store.sampleOrders.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        store.sampleOrders.set(where.id, updated);
        // Prisma include parity: the service reads items/stages/attachments/expenses
        // off the update() result, so the fake must return them too.
        const stages = Array.from(store.sampleStages.values())
          .filter((st) => st.sampleOrderId === updated.id)
          .sort((a, b) => a.sequence - b.sequence);
        const attachments = Array.from(store.sampleAttachments.values())
          .filter((att) => att.sampleOrderId === updated.id);
        const expenses = Array.from(store.sampleOrderExpenses.values())
          .filter((exp) => exp.sampleOrderId === updated.id);
        const items = Array.from(store.sampleOrderItems.values())
          .filter((it) => it.sampleOrderId === updated.id)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const components = Array.from(store.sampleComponents.values())
          .filter((c) => c.sampleOrderId === updated.id)
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        return { ...updated, stages, attachments, expenses, items, components };
      },
      delete: async ({ where }) => {
        const existing = store.sampleOrders.get(where.id);
        store.sampleOrders.delete(where.id);
        return existing;
      },
      updateMany: async ({ where, data } = {}) => {
        let count = 0;
        for (const [id, s] of store.sampleOrders.entries()) {
          if (where?.id && s.id !== where.id) continue;
          if (where?.companyId && s.companyId !== where.companyId) continue;
          store.sampleOrders.set(id, { ...s, ...data, updatedAt: new Date() });
          count++;
        }
        return { count };
      },
    },
    sampleOrderStage: {
      findFirst: async ({ where } = {}) => {
        let items = Array.from(store.sampleStages.values());
        if (where?.id) items = items.filter((st) => st.id === where.id);
        if (where?.sampleOrderId) items = items.filter((st) => st.sampleOrderId === where.sampleOrderId);
        return items[0] || null;
      },
      create: async ({ data }) => {
        const id = `stg-${++store.counter}`;
        const record = {
          id,
          ...data,
          status: data.status || 'PENDING',
          sequence: data.sequence || 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.sampleStages.set(id, record);
        return record;
      },
      update: async ({ where, data }) => {
        const existing = store.sampleStages.get(where.id);
        if (!existing) throw new Error('Stage not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        store.sampleStages.set(where.id, updated);
        return updated;
      },
      deleteMany: async ({ where }) => {
        for (const [id, stg] of store.sampleStages.entries()) {
          if (stg.sampleOrderId === where.sampleOrderId) {
            store.sampleStages.delete(id);
          }
        }
      },
    },
    sampleOrderAttachment: {
      findFirst: async ({ where } = {}) => {
        let items = Array.from(store.sampleAttachments.values());
        if (where?.id) items = items.filter((a) => a.id === where.id);
        if (where?.sampleOrderId) items = items.filter((a) => a.sampleOrderId === where.sampleOrderId);
        return items[0] || null;
      },
      create: async ({ data }) => {
        const id = `att-${++store.counter}`;
        const record = { id, ...data, createdAt: new Date() };
        store.sampleAttachments.set(id, record);
        return record;
      },
      delete: async ({ where } = {}) => {
        const item = store.sampleAttachments.get(where.id);
        if (item) store.sampleAttachments.delete(where.id);
        return item;
      },
      deleteMany: async ({ where }) => {
        for (const [id, att] of store.sampleAttachments.entries()) {
          if (att.sampleOrderId === where.sampleOrderId) {
            store.sampleAttachments.delete(id);
          }
        }
      },
    },
    sampleExpenseCatalog: {
      findFirst: async ({ where } = {}) => {
        let items = Array.from(store.sampleExpenseCatalogs.values());
        if (where?.companyId) items = items.filter((c) => c.companyId === where.companyId);
        if (where?.id) items = items.filter((c) => c.id === where.id);
        if (where?.name) items = items.filter((c) => c.name === where.name);
        return items[0] || null;
      },
      findMany: async ({ where } = {}) => {
        let items = Array.from(store.sampleExpenseCatalogs.values());
        if (where?.companyId) items = items.filter((c) => c.companyId === where.companyId);
        if (where?.isActive !== undefined) items = items.filter((c) => c.isActive === where.isActive);
        return items;
      },
      create: async ({ data }) => {
        const id = `cat-${++store.counter}`;
        const record = { id, ...data, isActive: data.isActive !== undefined ? data.isActive : true, createdAt: new Date(), updatedAt: new Date() };
        store.sampleExpenseCatalogs.set(id, record);
        return record;
      },
      update: async ({ where, data }) => {
        const item = store.sampleExpenseCatalogs.get(where.id);
        if (!item) throw new Error('Not found');
        const updated = { ...item, ...data, updatedAt: new Date() };
        store.sampleExpenseCatalogs.set(where.id, updated);
        return updated;
      },
    },
    sampleOrderExpense: {
      findFirst: async ({ where } = {}) => {
        let items = Array.from(store.sampleOrderExpenses.values());
        if (where?.id) items = items.filter((e) => e.id === where.id);
        if (where?.sampleOrderId) items = items.filter((e) => e.sampleOrderId === where.sampleOrderId);
        return items[0] || null;
      },
      findMany: async ({ where } = {}) => {
        let items = Array.from(store.sampleOrderExpenses.values());
        if (where?.sampleOrderId) items = items.filter((e) => e.sampleOrderId === where.sampleOrderId);
        return items;
      },
      create: async ({ data }) => {
        const id = `exp-${++store.counter}`;
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        store.sampleOrderExpenses.set(id, record);
        return record;
      },
      update: async ({ where, data }) => {
        const item = store.sampleOrderExpenses.get(where.id);
        if (!item) throw new Error('Not found');
        const updated = { ...item, ...data, updatedAt: new Date() };
        store.sampleOrderExpenses.set(where.id, updated);
        return updated;
      },
      delete: async ({ where }) => {
        const item = store.sampleOrderExpenses.get(where.id);
        store.sampleOrderExpenses.delete(where.id);
        return item;
      },
      deleteMany: async ({ where } = {}) => {
        if (where?.sampleOrderId) {
          for (const [id, e] of store.sampleOrderExpenses.entries()) {
            if (e.sampleOrderId === where.sampleOrderId) {
              store.sampleOrderExpenses.delete(id);
            }
          }
        }
      },
    },
    sampleOrderItem: {
      findFirst: async ({ where } = {}) => {
        let items = Array.from(store.sampleOrderItems.values());
        if (where?.id) items = items.filter((it) => it.id === where.id);
        if (where?.sampleOrderId) items = items.filter((it) => it.sampleOrderId === where.sampleOrderId);
        return items[0] || null;
      },
      findMany: async ({ where } = {}) => {
        let items = Array.from(store.sampleOrderItems.values());
        if (where?.sampleOrderId) items = items.filter((it) => it.sampleOrderId === where.sampleOrderId);
        if (where?.companyId) items = items.filter((it) => it.companyId === where.companyId);
        return items.sort((a, b) => a.sortOrder - b.sortOrder);
      },
      create: async ({ data }) => {
        const id = `item-${++store.counter}`;
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        store.sampleOrderItems.set(id, record);
        return record;
      },
      deleteMany: async ({ where } = {}) => {
        if (where?.sampleOrderId) {
          for (const [id, it] of store.sampleOrderItems.entries()) {
            if (it.sampleOrderId === where.sampleOrderId) {
              store.sampleOrderItems.delete(id);
            }
          }
        }
      },
    },
    sampleComponent: {
      findFirst: async ({ where } = {}) => {
        let items = Array.from(store.sampleComponents.values());
        if (where?.id) items = items.filter((c) => c.id === where.id);
        if (where?.sampleOrderId) items = items.filter((c) => c.sampleOrderId === where.sampleOrderId);
        if (where?.companyId) items = items.filter((c) => c.companyId === where.companyId);
        return items[0] || null;
      },
      findMany: async ({ where } = {}) => {
        let items = Array.from(store.sampleComponents.values());
        if (where?.sampleOrderId) items = items.filter((c) => c.sampleOrderId === where.sampleOrderId);
        if (where?.companyId) items = items.filter((c) => c.companyId === where.companyId);
        return items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      },
      create: async ({ data }) => {
        const id = `comp-${++store.counter}`;
        const record = {
          id,
          ...data,
          quantity: data.quantity !== undefined ? Number(data.quantity) : 1,
          unitPrice: data.unitPrice !== undefined ? Number(data.unitPrice) : 0,
          totalCost:
            data.totalCost !== undefined
              ? Number(data.totalCost)
              : Math.round(Number(data.quantity || 1) * Number(data.unitPrice || 0) * 100) / 100,
          sortOrder: data.sortOrder || 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.sampleComponents.set(id, record);
        return record;
      },
      update: async ({ where, data }) => {
        const item = store.sampleComponents.get(where.id);
        if (!item) throw new Error('Component not found');
        const updated = { ...item, ...data, updatedAt: new Date() };
        store.sampleComponents.set(where.id, updated);
        return updated;
      },
      delete: async ({ where }) => {
        const item = store.sampleComponents.get(where.id);
        if (item) store.sampleComponents.delete(where.id);
        return item;
      },
      deleteMany: async ({ where } = {}) => {
        let count = 0;
        for (const [id, c] of store.sampleComponents.entries()) {
          if (where?.sampleOrderId && c.sampleOrderId !== where.sampleOrderId) continue;
          if (where?.companyId && c.companyId !== where.companyId) continue;
          store.sampleComponents.delete(id);
          count++;
        }
        return { count };
      },
    },
    sampleOrderComponent: {
      findFirst: async ({ where } = {}) => {
        let items = Array.from(store.sampleComponents.values());
        if (where?.id) items = items.filter((c) => c.id === where.id);
        if (where?.sampleOrderId) items = items.filter((c) => c.sampleOrderId === where.sampleOrderId);
        if (where?.companyId) items = items.filter((c) => c.companyId === where.companyId);
        return items[0] || null;
      },
      findMany: async ({ where } = {}) => {
        let items = Array.from(store.sampleComponents.values());
        if (where?.sampleOrderId) items = items.filter((c) => c.sampleOrderId === where.sampleOrderId);
        if (where?.companyId) items = items.filter((c) => c.companyId === where.companyId);
        return items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      },
      create: async ({ data }) => {
        const id = `comp-${++store.counter}`;
        const record = {
          id,
          ...data,
          quantity: data.quantity !== undefined ? Number(data.quantity) : 1,
          unitPrice: data.unitPrice !== undefined ? Number(data.unitPrice) : 0,
          totalCost:
            data.totalCost !== undefined
              ? Number(data.totalCost)
              : Math.round(Number(data.quantity || 1) * Number(data.unitPrice || 0) * 100) / 100,
          sortOrder: data.sortOrder || 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.sampleComponents.set(id, record);
        return record;
      },
      update: async ({ where, data }) => {
        const item = store.sampleComponents.get(where.id);
        if (!item) throw new Error('Component not found');
        const updated = { ...item, ...data, updatedAt: new Date() };
        store.sampleComponents.set(where.id, updated);
        return updated;
      },
      delete: async ({ where }) => {
        const item = store.sampleComponents.get(where.id);
        if (item) store.sampleComponents.delete(where.id);
        return item;
      },
      deleteMany: async ({ where } = {}) => {
        let count = 0;
        for (const [id, c] of store.sampleComponents.entries()) {
          if (where?.sampleOrderId && c.sampleOrderId !== where.sampleOrderId) continue;
          if (where?.companyId && c.companyId !== where.companyId) continue;
          store.sampleComponents.delete(id);
          count++;
        }
        return { count };
      },
    },
    productionOrder: {
      findFirst: async ({ where }) => {
        let items = Array.from(store.productionOrders.values());
        if (where?.id) items = items.filter((o) => o.id === where.id);
        if (where?.companyId) items = items.filter((o) => o.companyId === where.companyId);
        return items[0] || null;
      },
      create: async ({ data }) => {
        const id = `mo-ord-${++store.counter}`;
        const record = {
          id,
          ...data,
          orderNumber: `MO-2026-0000${store.counter}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.productionOrders.set(id, record);
        return record;
      },
      updateMany: async ({ where, data } = {}) => {
        let count = 0;
        for (const [id, ord] of store.productionOrders.entries()) {
          if (where?.sourceSampleOrderId && ord.sourceSampleOrderId === where.sourceSampleOrderId) {
            store.productionOrders.set(id, { ...ord, ...data, updatedAt: new Date() });
            count++;
          }
        }
        return { count };
      },
    },
    billOfMaterials: {
      findFirst: async ({ where }) => {
        let items = Array.from(store.boms.values());
        if (where?.id) items = items.filter((b) => b.id === where.id);
        if (where?.code) items = items.filter((b) => b.code === where.code);
        return items[0] || null;
      },
    },
    partnerFactory: {
      findFirst: async ({ where } = {}) => {
        let items = Array.from(store.partnerFactories.values());
        if (where?.id) items = items.filter((f) => f.id === where.id);
        if (where?.companyId) items = items.filter((f) => f.companyId === where.companyId);
        return items[0] || null;
      },
      create: async ({ data }) => {
        const id = data.id || `fac-${++store.counter}`;
        const record = { id, isActive: true, ...data };
        store.partnerFactories.set(id, record);
        return record;
      },
    },
    product: {
      findFirst: async ({ where } = {}) => {
        let items = Array.from(store.products.values());
        if (where?.id) items = items.filter((p) => p.id === where.id);
        if (where?.companyId) items = items.filter((p) => p.companyId === where.companyId);
        return items[0] || null;
      },
      create: async ({ data }) => {
        const id = data.id || `prod-${++store.counter}`;
        const record = { id, ...data };
        store.products.set(id, record);
        return record;
      },
    },
    inventory: {
      findFirst: async ({ where } = {}) => {
        let items = Array.from(store.inventory.values());
        if (where?.productId) items = items.filter((i) => i.productId === where.productId);
        if (where?.warehouseId) items = items.filter((i) => i.warehouseId === where.warehouseId);
        return items[0] || null;
      },
      findMany: async ({ where } = {}) => {
        let items = Array.from(store.inventory.values());
        if (where?.productId) items = items.filter((i) => i.productId === where.productId);
        if (where?.warehouseId) items = items.filter((i) => i.warehouseId === where.warehouseId);
        return items;
      },
      create: async ({ data }) => {
        const id = `inv-${++store.counter}`;
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        store.inventory.set(id, record);
        return record;
      },
      update: async ({ where, data }) => {
        const item = store.inventory.get(where.id);
        if (!item) throw new Error('Inventory not found');
        for (const [k, v] of Object.entries(data)) {
          if (v && typeof v === 'object' && v.increment !== undefined) {
            item[k] = Number(item[k] || 0) + Number(v.increment);
          } else if (v !== undefined) {
            item[k] = v;
          }
        }
        item.updatedAt = new Date();
        store.inventory.set(where.id, item);
        return item;
      },
    },
    stockMovement: {
      findFirst: async ({ where } = {}) => {
        let items = Array.from(store.stockMovements.values());
        if (where?.productId) items = items.filter((m) => m.productId === where.productId);
        if (where?.notes) items = items.filter((m) => m.notes === where.notes);
        if (where?.warehouseId) items = items.filter((m) => m.warehouseId === where.warehouseId);
        return items[0] || null;
      },
      findMany: async ({ where } = {}) => {
        let items = Array.from(store.stockMovements.values());
        if (where?.productId) items = items.filter((m) => m.productId === where.productId);
        if (where?.notes) items = items.filter((m) => m.notes === where.notes);
        if (where?.warehouseId) items = items.filter((m) => m.warehouseId === where.warehouseId);
        return items;
      },
      create: async ({ data }) => {
        const id = `sm-${++store.counter}`;
        const record = { id, ...data, createdAt: new Date() };
        store.stockMovements.set(id, record);
        return record;
      },
    },
    warehouse: {
      findFirst: async ({ where } = {}) => {
        let items = Array.from(store.warehouses.values());
        if (where?.companyId) items = items.filter((w) => w.companyId === where.companyId);
        if (where?.isActive !== undefined) items = items.filter((w) => w.isActive === where.isActive);
        return items[0] || null;
      },
      create: async ({ data }) => {
        const id = data.id || `wh-${++store.counter}`;
        const record = { id, isActive: true, ...data };
        store.warehouses.set(id, record);
        return record;
      },
    },
    manufacturingSettings: {
      findUnique: async ({ where } = {}) => {
        let items = Array.from(store.manufacturingSettings.values());
        if (where?.companyId) items = items.filter((s) => s.companyId === where.companyId);
        return items[0] || null;
      },
    },
    $transaction: async (fn) => fn(currentPrisma),
    $executeRawUnsafe: async () => true,
    _store: store,
  };
}

describe('Wave 5: Standalone Sample Orders & Conversion', () => {
  const companyId = 'c-cm-test-wave5';
  const testUser = { id: 'usr-cm-1', name: 'Test QA', email: 'qa@huinzo.com' };

  beforeEach(() => {
    currentPrisma = createInMemoryStore();
    global.__testPrisma = currentPrisma;

    // Seed sample BOM
    currentPrisma._store.boms.set('bom-hoodie-1', {
      id: 'bom-hoodie-1',
      companyId,
      code: 'BOM-HOODIE-OVR-01',
      name: 'هودي أوفر سايز صيفي',
      status: 'APPROVED',
      isActive: true,
    });

    // Seed sample Partner Factory
    currentPrisma._store.partnerFactories.set('fac-1', {
      id: 'fac-1',
      companyId,
      name: 'مصنع الأمل للطباعة',
      isActive: true,
    });

    // Seed sample Product (HZ-A)
    currentPrisma._store.products.set('prod-hoodie-1', {
      id: 'prod-hoodie-1',
      companyId,
      name: 'هودي أوفر سايز أصلي',
      sku: 'SKU-HOD-01',
    });

    // Mock ManufacturingService.createOrder to simulate production order creation
    jest.spyOn(ManufacturingService, 'createOrder').mockImplementation(async (cId, payload, userId) => {
      let plannedQuantity = 0;
      if (Array.isArray(payload.variantMatrix)) {
        for (const v of payload.variantMatrix) {
          plannedQuantity += Number(v.plannedQuantity || v.quantity || 0);
        }
      }
      if (plannedQuantity === 0 && payload.plannedQuantity) {
        plannedQuantity = Number(payload.plannedQuantity);
      }

      const order = await currentPrisma.productionOrder.create({
        data: {
          companyId: cId,
          orderNumber: 'MO-2026-00008',
          orderType: payload.orderType || 'FULL_PACKAGE',
          sourceSampleOrderId: payload.sourceSampleOrderId,
          productName: payload.productName,
          plannedQuantity,
          bomId: payload.bomId,
          variantMatrix: payload.variantMatrix,
          defaultPartnerFactoryId: payload.defaultPartnerFactoryId,
          createdById: userId,
        },
      });
      return order;
    });

    jest.spyOn(ManufacturingService, 'getBomById').mockImplementation(async (cId, bId) => {
      return currentPrisma._store.boms.get(bId) || null;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('1. Atomic Sequential Numbering (00001 -> 00002 -> 00003)', async () => {
    const s1 = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
      productName: 'عينة 1',
    });
    const s2 = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
      productName: 'عينة 2',
    });
    const s3 = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
      productName: 'عينة 3',
    });

    const year = new Date().getFullYear();
    expect(s1.sampleNumber).toBe(`SMP-${year}-00001`);
    expect(s2.sampleNumber).toBe(`SMP-${year}-00002`);
    expect(s3.sampleNumber).toBe(`SMP-${year}-00003`);
  });

  test('2. Negative Validations (Reject / 400 Guards)', async () => {
    // 2.1 Empty productName
    await expect(
      ManufacturingSampleService.createSampleOrder(companyId, testUser, { productName: '   ' })
    ).rejects.toThrow('اسم المنتج إلزامي لإنشاء أمر العينة');

    // 2.2 Reject without reason
    const s = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
      productName: 'عينة للاختبار',
    });
    await expect(
      ManufacturingSampleService.rejectSampleOrder(companyId, testUser, s.id, { resultNotes: '' })
    ).rejects.toThrow('سبب الرفض إلزامي');

    // 2.3 Converting DRAFT sample
    await expect(
      ManufacturingSampleService.convertSampleToOrder(companyId, testUser, s.id, {
        bomId: 'bom-hoodie-1',
        plannedQuantity: 100,
      })
    ).rejects.toThrow('لا يمكن تحويل العينة لأمر تصنيع إلا بعد اعتمادها أولاً');

    // 2.4 Modifying non-DRAFT sample
    await ManufacturingSampleService.approveSampleOrder(companyId, testUser, s.id, { resultNotes: 'معتمد' });
    await expect(
      ManufacturingSampleService.updateSampleOrder(companyId, testUser, s.id, { productName: 'تعديل ممنوع' })
    ).rejects.toThrow('لا يمكن تعديل بيانات العينة إلا في حالة المسودة');
  });

  test('3. Live E2E Lifecycle: Brand Z Hoodie Sample -> Full Production Order', async () => {
    // A) Create Brand Z Sample
    const sample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
      productName: 'هودي أوفر سايز Brand Z',
      brandName: 'Brand Z',
      customerName: 'أحمد التاجر الحر',
      plannedQuantity: 3,
      size: 'L',
      color: 'BLACK',
      materialSource: 'CUSTOMER',
      fee: 2500,
      bomId: 'bom-hoodie-1',
      partnerFactoryId: 'fac-1',
      stages: [
        { name: 'قص وتجهيز القماش', sequence: 1 },
        { name: 'خياطة وتجميع العينة', sequence: 2 },
        { name: 'فحص الجودة والكي', sequence: 3 },
      ],
    });

    expect(sample.sampleNumber).toMatch(/^SMP-\d{4}-\d{5}$/);
    expect(sample.status).toBe('DRAFT');
    expect(sample.fee).toBe(2500);
    expect(sample.materialSource).toBe('CUSTOMER');
    expect(sample.stages.length).toBe(3);

    // B) Progress Stages
    for (const stg of sample.stages) {
      await ManufacturingSampleService.updateSampleStage(companyId, testUser, sample.id, stg.id, {
        status: 'COMPLETED',
        notes: `تم إنهاء مرحلة ${stg.name} بنجاح ومطابقة للمواصفات`,
      });
    }

    // C) Upload Attachment
    const att = await ManufacturingSampleService.uploadSampleFile(companyId, testUser, sample.id, {
      fileName: 'hoodie-sample-approved.jpg',
      url: 'https://cdn.maxp.online/samples/hoodie-approved.jpg',
      kind: 'IMAGE',
    });
    expect(att.fileName).toBe('hoodie-sample-approved.jpg');

    // D) Approve Sample
    const approved = await ManufacturingSampleService.approveSampleOrder(companyId, testUser, sample.id, {
      resultNotes: 'تم اعتماد العينة بنجاح ومطابقتها للمواصفات الفنية المطلوبة',
    });
    expect(approved.status).toBe('APPROVED');

    // E) Convert to ProductionOrder
    const converted = await ManufacturingSampleService.convertSampleToOrder(companyId, testUser, sample.id, {
      plannedQuantity: 300,
      orderType: 'FULL_PACKAGE',
      bomId: 'bom-hoodie-1',
      notes: 'تحويل تلقائي من عينة Brand Z المعتمدة',
    });

    expect(converted.sampleOrder.status).toBe('CONVERTED');
    expect(converted.sampleOrder.convertedOrderId).toBe(converted.order.id);
    expect(converted.order.sourceSampleOrderId).toBe(sample.id);
    expect(converted.order.plannedQuantity).toBe(300);

    // Verify variant matrix inherited
    expect(converted.order.variantMatrix).toEqual([
      { size: 'L', color: 'BLACK', plannedQuantity: 300 },
    ]);

    // F) Double conversion blocked (400)
    await expect(
      ManufacturingSampleService.convertSampleToOrder(companyId, testUser, sample.id, {
        plannedQuantity: 500,
        bomId: 'bom-hoodie-1',
      })
    ).rejects.toThrow('تم تحويل هذه العينة بالفعل إلى أمر تصنيع');
  });

  test('4. List Samples and Filtering', async () => {
    await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
      productName: 'عينة للفلترة Brand Z',
      brandName: 'Brand Z',
    });

    const list = await ManufacturingSampleService.listSampleOrders(companyId, {
      status: 'ALL',
      materialSource: 'ALL',
      page: 1,
      limit: 10,
    });
    expect(Array.isArray(list.items)).toBe(true);
    expect(list.items.length).toBeGreaterThanOrEqual(1);
  });

  test('5. Sample Recurring Expenses Catalog & Snapshot Costing (T07)', async () => {
    // A) Create catalog item
    const catItem = await ManufacturingSampleService.createExpenseCatalogItem(companyId, {
      name: 'تطريز يدوي',
      defaultAmount: 180,
    });
    expect(catItem.id).toBeDefined();
    expect(catItem.name).toBe('تطريز يدوي');
    expect(catItem.defaultAmount).toBe(180);

    // B) Prevent duplicate catalog name (409)
    await expect(
      ManufacturingSampleService.createExpenseCatalogItem(companyId, {
        name: 'تطريز يدوي',
        defaultAmount: 200,
      })
    ).rejects.toThrow('موجود بالفعل');

    // C) Create sample order with expenses
    const sample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
      productName: 'عينة تي شيرت فاخر',
      fee: 1000,
      expenses: [
        { catalogId: catItem.id, amount: 180 },
        { name: 'شحن سريع', amount: 50 },
      ],
    });
    expect(sample.expensesTotal).toBe(230);
    expect(sample.totalCost).toBe(1230);
    expect(sample.expenses.length).toBe(2);

    // D) Update catalog item default amount - verify existing sample snapshot remains unchanged
    await ManufacturingSampleService.updateExpenseCatalogItem(companyId, catItem.id, {
      defaultAmount: 900,
    });
    const fetched = await ManufacturingSampleService.getSampleOrderById(companyId, sample.id);
    expect(fetched.expensesTotal).toBe(230);
    expect(fetched.totalCost).toBe(1230);
    const emb = fetched.expenses.find((e) => e.name === 'تطريز يدوي');
    expect(emb.amount).toBe(180);

    // E) Add expense to existing sample
    const newExp = await ManufacturingSampleService.addSampleExpense(companyId, testUser, sample.id, {
      name: 'تغليف خاص',
      amount: 40,
    });
    expect(newExp.name).toBe('تغليف خاص');
    expect(newExp.amount).toBe(40);

    // F) Delete expense from sample
    await ManufacturingSampleService.deleteSampleExpense(companyId, testUser, sample.id, newExp.id);
    const afterDelete = await ManufacturingSampleService.getSampleOrderById(companyId, sample.id);
    expect(afterDelete.expensesTotal).toBe(230);
    expect(afterDelete.totalCost).toBe(1230);

    // G) Soft delete catalog item
    const archived = await ManufacturingSampleService.archiveExpenseCatalogItem(companyId, catItem.id);
    expect(archived.isActive).toBe(false);
  });

  test('6. Sample Receipt Tracking & Attachments Flow (sampleReceived, receivedAt, attachments)', async () => {
    // 1. Create a sample with default unreceived status
    const sample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
      productName: 'عينة بليزر رسمي',
      fee: 3000,
      expectedDeliveryAt: '2026-10-20', // past date
    });
    expect(sample.sampleReceived).toBe(false);
    expect(sample.receivedAt).toBeFalsy();
    expect(sample.isOverdue).toBe(true);
    expect(sample.overdueDays).toBeGreaterThan(0);

    // 2. Mark sample as received
    const marked = await ManufacturingSampleService.markSampleReceived(companyId, testUser, sample.id, {
      received: true,
      receivedAt: '2026-10-28T14:00:00Z',
    });
    expect(marked.sampleReceived).toBe(true);
    expect(marked.receivedAt).toBeTruthy();
    expect(marked.isOverdue).toBe(false);
    expect(marked.overdueDays).toBe(0);

    // 3. Upload attachments of different kinds (IMAGE, PDF, OTHER)
    const imgAtt = await ManufacturingSampleService.uploadSampleFile(companyId, testUser, sample.id, {
      fileName: 'sketch.png',
      url: '/uploads/manufacturing/sketch.png',
    });
    expect(imgAtt.kind).toBe('IMAGE');

    const pdfAtt = await ManufacturingSampleService.uploadSampleFile(companyId, testUser, sample.id, {
      fileName: 'techpack.pdf',
      url: '/uploads/manufacturing/techpack.pdf',
    });
    expect(pdfAtt.kind).toBe('PDF');

    // 4. Verify attachments on sample
    const sampleWithFiles = await ManufacturingSampleService.getSampleOrderById(companyId, sample.id);
    expect(sampleWithFiles.attachments.length).toBe(2);

    // 5. Delete one attachment
    const delRes = await ManufacturingSampleService.deleteSampleFile(companyId, testUser, sample.id, imgAtt.id);
    expect(delRes.success).toBe(true);

    // 6. Toggle receipt back to unreceived
    const unreceived = await ManufacturingSampleService.markSampleReceived(companyId, testUser, sample.id, {
      received: false,
    });
    expect(unreceived.sampleReceived).toBe(false);
    expect(unreceived.receivedAt).toBeNull();
  });

  describe('T03: factory selection', () => {
    test('1. convertSampleToOrder with factoryMode: DIFFERENT and valid factory calls createOrder with defaultPartnerFactoryId', async () => {
      currentPrisma._store.partnerFactories.set('qafac-delta', {
        id: 'qafac-delta',
        companyId,
        name: 'مصنع الدلتا للغزل',
        isActive: true,
      });

      const sample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
        productName: 'عينة T03-اختبار 1',
        bomId: 'bom-hoodie-1',
        partnerFactoryId: 'fac-1',
      });
      await ManufacturingSampleService.approveSampleOrder(companyId, testUser, sample.id, { resultNotes: 'معتمد' });

      const createOrderSpy = jest.spyOn(ManufacturingService, 'createOrder');
      createOrderSpy.mockClear();

      const result = await ManufacturingSampleService.convertSampleToOrder(companyId, testUser, sample.id, {
        bomId: 'bom-hoodie-1',
        plannedQuantity: 50,
        factoryMode: 'DIFFERENT',
        partnerFactoryId: 'qafac-delta',
      });

      expect(createOrderSpy).toHaveBeenCalledTimes(1);
      const passedPayload = createOrderSpy.mock.calls[0][1];
      expect(passedPayload.defaultPartnerFactoryId).toBe('qafac-delta');
      expect(result.factory).toEqual({ id: 'qafac-delta', name: 'مصنع الدلتا للغزل' });
    });

    test('2. Missing factory rejects with clear error and zero calls to createOrder', async () => {
      const sample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
        productName: 'عينة بلا مصنع',
        bomId: 'bom-hoodie-1',
      });
      await ManufacturingSampleService.approveSampleOrder(companyId, testUser, sample.id, { resultNotes: 'معتمد' });

      const createOrderSpy = jest.spyOn(ManufacturingService, 'createOrder');
      createOrderSpy.mockClear();

      await expect(
        ManufacturingSampleService.convertSampleToOrder(companyId, testUser, sample.id, {
          bomId: 'bom-hoodie-1',
          plannedQuantity: 50,
        })
      ).rejects.toThrow('اختار مصنع التنفيذ قبل التحويل');

      expect(createOrderSpy).not.toHaveBeenCalled();
    });

    test('3. Factory not belonging to company rejects with error', async () => {
      currentPrisma._store.partnerFactories.set('fac-other-co', {
        id: 'fac-other-co',
        companyId: 'other-company-id',
        name: 'مصنع شركة ثانية',
        isActive: true,
      });

      const sample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
        productName: 'عينة اختبار شركة أخرى',
        bomId: 'bom-hoodie-1',
      });
      await ManufacturingSampleService.approveSampleOrder(companyId, testUser, sample.id, { resultNotes: 'معتمد' });

      await expect(
        ManufacturingSampleService.convertSampleToOrder(companyId, testUser, sample.id, {
          bomId: 'bom-hoodie-1',
          plannedQuantity: 50,
          factoryMode: 'DIFFERENT',
          partnerFactoryId: 'fac-other-co',
        })
      ).rejects.toThrow('المصنع الشريك غير موجود أو لا ينتمي لهذه الشركة');
    });

    test('4. Inactive factory rejects with error', async () => {
      currentPrisma._store.partnerFactories.set('fac-inactive', {
        id: 'fac-inactive',
        companyId,
        name: 'مصنع متوقف',
        isActive: false,
      });

      const sample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
        productName: 'عينة اختبار مصنع غير نشط',
        bomId: 'bom-hoodie-1',
      });
      await ManufacturingSampleService.approveSampleOrder(companyId, testUser, sample.id, { resultNotes: 'معتمد' });

      await expect(
        ManufacturingSampleService.convertSampleToOrder(companyId, testUser, sample.id, {
          bomId: 'bom-hoodie-1',
          plannedQuantity: 50,
          factoryMode: 'DIFFERENT',
          partnerFactoryId: 'fac-inactive',
        })
      ).rejects.toThrow('غير نشط — اختار مصنع تاني');
    });

    test('5. factoryMode: SAME with sample.partnerFactoryId passes that factory to payload', async () => {
      currentPrisma._store.partnerFactories.set('qafac-amal', {
        id: 'qafac-amal',
        companyId,
        name: 'مصنع الأمل للطباعة',
        isActive: true,
      });

      const sample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
        productName: 'عينة مصنع الأمل',
        bomId: 'bom-hoodie-1',
        partnerFactoryId: 'qafac-amal',
      });
      await ManufacturingSampleService.approveSampleOrder(companyId, testUser, sample.id, { resultNotes: 'معتمد' });

      const createOrderSpy = jest.spyOn(ManufacturingService, 'createOrder');
      createOrderSpy.mockClear();

      const result = await ManufacturingSampleService.convertSampleToOrder(companyId, testUser, sample.id, {
        bomId: 'bom-hoodie-1',
        plannedQuantity: 60,
        factoryMode: 'SAME',
      });

      expect(createOrderSpy).toHaveBeenCalledTimes(1);
      const passedPayload = createOrderSpy.mock.calls[0][1];
      expect(passedPayload.defaultPartnerFactoryId).toBe('qafac-amal');
      expect(result.factory.name).toBe('مصنع الأمل للطباعة');
    });

    test('6. Double conversion rejects with original message (regression)', async () => {
      const sample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
        productName: 'عينة تحويل مكرر',
        bomId: 'bom-hoodie-1',
        partnerFactoryId: 'fac-1',
      });
      await ManufacturingSampleService.approveSampleOrder(companyId, testUser, sample.id, { resultNotes: 'معتمد' });

      await ManufacturingSampleService.convertSampleToOrder(companyId, testUser, sample.id, {
        bomId: 'bom-hoodie-1',
        plannedQuantity: 40,
        factoryMode: 'SAME',
      });

      await expect(
        ManufacturingSampleService.convertSampleToOrder(companyId, testUser, sample.id, {
          bomId: 'bom-hoodie-1',
          plannedQuantity: 40,
          factoryMode: 'SAME',
        })
      ).rejects.toThrow('تم تحويل هذه العينة بالفعل إلى أمر تصنيع مسبقاً');
    });

    test('7. Deleting sample order with active vs deleted production order', async () => {
      const sample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
        productName: 'عينة لاختبار الحذف بعد التحويل',
        bomId: 'bom-hoodie-1',
        partnerFactoryId: 'fac-1',
      });
      await ManufacturingSampleService.approveSampleOrder(companyId, testUser, sample.id, { resultNotes: 'معتمد' });

      const convResult = await ManufacturingSampleService.convertSampleToOrder(companyId, testUser, sample.id, {
        bomId: 'bom-hoodie-1',
        plannedQuantity: 10,
        factoryMode: 'SAME',
      });

      const prodOrderId = convResult.order.id;

      // 1. Should fail while active production order exists
      await expect(
        ManufacturingSampleService.deleteSampleOrder(companyId, testUser, sample.id)
      ).rejects.toThrow('لا يمكن حذف عينة تم تحويلها بالفعل إلى أمر إنتاج قائم');

      // 2. Delete the production order
      currentPrisma._store.productionOrders.delete(prodOrderId);

      // 3. Now deleting sample order should succeed cleanly
      const delResult = await ManufacturingSampleService.deleteSampleOrder(companyId, testUser, sample.id);
      expect(delResult.success).toBe(true);

      const check = await currentPrisma.sampleOrder.findFirst({ where: { id: sample.id } });
      expect(check).toBeNull();
    });

    test('8. ينشئ عينة بـproductId صحيح ويخزنه', async () => {
      const sample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
        productName: 'هودي أوفر سايز',
        productId: 'prod-hoodie-1',
      });
      expect(sample.productId).toBe('prod-hoodie-1');
      const stored = await currentPrisma.sampleOrder.findFirst({ where: { id: sample.id } });
      expect(stored.productId).toBe('prod-hoodie-1');
    });

    test('9. يرفض productId مش تابع للشركة', async () => {
      await expect(
        ManufacturingSampleService.createSampleOrder(companyId, testUser, {
          productName: 'هودي أوفر سايز',
          productId: 'prod-other-company',
        })
      ).rejects.toThrow('المنتج المختار غير موجود في هذه الشركة');
    });

    test('10. يشتق productName من المنتج لو جاي فاضي', async () => {
      const sample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
        productName: '',
        productId: 'prod-hoodie-1',
      });
      expect(sample.productName).toBe('هودي أوفر سايز أصلي');
      expect(sample.productId).toBe('prod-hoodie-1');
      const stored = await currentPrisma.sampleOrder.findFirst({ where: { id: sample.id } });
      expect(stored.productName).toBe('هودي أوفر سايز أصلي');
      expect(stored.productId).toBe('prod-hoodie-1');
    });

    test('11. عينة sampleReceived=true بـproductId → inventory اتحدث + stockMovement IN (HZ-D)', async () => {
      // Seed warehouse
      currentPrisma._store.warehouses.set('wh-main-1', {
        id: 'wh-main-1',
        companyId,
        name: 'المستودع الرئيسي',
        isActive: true,
      });

      const sample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
        productName: 'هودي أوفر سايز',
        productId: 'prod-hoodie-1',
        plannedQuantity: 4,
        fee: 400,
        sampleReceived: true,
      });

      expect(sample.sampleReceived).toBe(true);
      expect(sample.stockWarning).toBeUndefined();

      // Verify inventory was created/incremented
      const inv = await currentPrisma.inventory.findFirst({
        where: { productId: 'prod-hoodie-1', warehouseId: 'wh-main-1' },
      });
      expect(inv).toBeDefined();
      expect(inv.quantity).toBe(4);
      expect(inv.available).toBe(4);
      expect(inv.cost).toBe(100); // 400 / 4

      // Verify stockMovement was created with type IN and reason ADJUSTMENT
      const sm = await currentPrisma.stockMovement.findFirst({
        where: { productId: 'prod-hoodie-1', warehouseId: 'wh-main-1' },
      });
      expect(sm).toBeDefined();
      expect(sm.type).toBe('IN');
      expect(sm.reason).toBe('ADJUSTMENT');
      expect(sm.quantity).toBe(4);
      expect(sm.reference).toBe(sample.sampleNumber);
      expect(sm.notes).toContain(`استلام عينة ${sample.sampleNumber}`);
    });

    test('12. عينة sampleReceived=true من غير productId → مفيش inventory، والرد فيه stockWarning (HZ-D)', async () => {
      const sample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
        productName: 'عينة يدوية غير مربوطة بمنتج',
        plannedQuantity: 2,
        sampleReceived: true,
      });

      expect(sample).toBeDefined();
      expect(sample.sampleReceived).toBe(true);
      expect(sample.productId).toBeNull();
      expect(sample.stockWarning).toBe('العينة مش مربوطة بمنتج — الكمية ماتضافتش للمخزن');

      // Verify no inventory or stockMovement created
      const invs = await currentPrisma.inventory.findMany({});
      expect(invs).toHaveLength(0);
      const movements = await currentPrisma.stockMovement.findMany({});
      expect(movements).toHaveLength(0);
    });

    test('13. تحديث عينة sampleReceived من false لـ true يحرّك المخزن، وتحديثها من true لـ true لا يكرر الحركة (HZ-D)', async () => {
      currentPrisma._store.warehouses.set('wh-main-1', {
        id: 'wh-main-1',
        companyId,
        name: 'المستودع الرئيسي',
        isActive: true,
      });

      // 1. إنشاء عينة غير مستلمة
      const created = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
        productName: 'هودي أوفر سايز',
        productId: 'prod-hoodie-1',
        plannedQuantity: 3,
        fee: 300,
        sampleReceived: false,
      });

      expect(created.sampleReceived).toBe(false);
      let inv = await currentPrisma.inventory.findFirst({
        where: { productId: 'prod-hoodie-1', warehouseId: 'wh-main-1' },
      });
      expect(inv).toBeNull();

      // 2. تحديثها إلى مستلمة (false -> true)
      const updatedFirst = await ManufacturingSampleService.updateSampleOrder(companyId, testUser, created.id, {
        sampleReceived: true,
      });
      expect(updatedFirst.sampleReceived).toBe(true);

      inv = await currentPrisma.inventory.findFirst({
        where: { productId: 'prod-hoodie-1', warehouseId: 'wh-main-1' },
      });
      expect(inv).toBeDefined();
      expect(inv.quantity).toBe(3);

      const movementsFirst = await currentPrisma.stockMovement.findMany({
        where: { productId: 'prod-hoodie-1' },
      });
      expect(movementsFirst).toHaveLength(1);

      // 3. تحديثها مرة ثانية وهي true بالفعل (true -> true) — يجب ألا تتكرر الحركة
      const updatedSecond = await ManufacturingSampleService.updateSampleOrder(companyId, testUser, created.id, {
        sampleReceived: true,
        designNotes: 'ملاحظة إضافية بدون تكرار المخزن',
      });
      expect(updatedSecond.sampleReceived).toBe(true);

      inv = await currentPrisma.inventory.findFirst({
        where: { productId: 'prod-hoodie-1', warehouseId: 'wh-main-1' },
      });
      expect(inv.quantity).toBe(3); // لا يزال 3 ولم يتضاعف إلى 6

      const movementsSecond = await currentPrisma.stockMovement.findMany({
        where: { productId: 'prod-hoodie-1' },
      });
      expect(movementsSecond).toHaveLength(1); // لا تزال حركة واحدة فقط ولم تتكرر
    });

    test('14. إنشاء عينة بـ٣ بنود (Task HZ-E) → اتخزنوا، الهيدر بياخد أول بند، plannedQuantity = المجموع', async () => {
      // Seed 3 products for the company
      currentPrisma._store.products.set('prod-suit-1', {
        id: 'prod-suit-1',
        companyId,
        name: 'بدلة رجالي كاملة',
      });
      currentPrisma._store.products.set('prod-shirt-1', {
        id: 'prod-shirt-1',
        companyId,
        name: 'قميص قطن كلاسيك',
      });
      currentPrisma._store.products.set('prod-belt-1', {
        id: 'prod-belt-1',
        companyId,
        name: 'حزام جلد طبيعي',
      });

      const sample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
        items: [
          { productId: 'prod-suit-1', productName: 'بدلة رجالي كاملة', quantity: 2, size: '52', color: 'NAVY' },
          { productId: 'prod-shirt-1', productName: 'قميص قطن كلاسيك', quantity: 3, size: 'L', color: 'WHITE' },
          { productId: 'prod-belt-1', productName: 'حزام جلد طبيعي', quantity: 1, size: 'FREE', color: 'BLACK' },
        ],
      });

      expect(sample).toBeDefined();
      expect(sample.productId).toBe('prod-suit-1');
      expect(sample.productName).toBe('بدلة رجالي كاملة');
      expect(sample.size).toBe('52');
      expect(sample.color).toBe('NAVY');
      expect(sample.plannedQuantity).toBe(6); // 2 + 3 + 1 = 6

      // Verify items are stored and returned
      expect(sample.items).toBeDefined();
      expect(sample.items).toHaveLength(3);
      expect(sample.items[0].productId).toBe('prod-suit-1');
      expect(sample.items[0].quantity).toBe(2);
      expect(sample.items[1].productId).toBe('prod-shirt-1');
      expect(sample.items[1].quantity).toBe(3);
      expect(sample.items[2].productId).toBe('prod-belt-1');
      expect(sample.items[2].quantity).toBe(1);

      // Verify findById includes items
      const fetched = await ManufacturingSampleService.getSampleOrderById(companyId, sample.id);
      expect(fetched.items).toHaveLength(3);
      expect(fetched.plannedQuantity).toBe(6);
    });

    test('15. إنشاء بند بـproductId مش تابع للشركة (Task HZ-E) → 400', async () => {
      currentPrisma._store.products.set('prod-foreign-1', {
        id: 'prod-foreign-1',
        companyId: 'another-company-id',
        name: 'منتج شركة أخرى',
      });

      await expect(
        ManufacturingSampleService.createSampleOrder(companyId, testUser, {
          items: [
            { productId: 'prod-foreign-1', productName: 'منتج أجنبي', quantity: 1 },
          ],
        })
      ).rejects.toThrow('المنتج المختار غير موجود في هذه الشركة');
    });

    test('16. تحديث البنود (٢ بدل ٣) (Task HZ-E) → القديم اتمسح والجديد اتخزن', async () => {
      currentPrisma._store.products.set('prod-suit-1', {
        id: 'prod-suit-1',
        companyId,
        name: 'بدلة رجالي كاملة',
      });
      currentPrisma._store.products.set('prod-shirt-1', {
        id: 'prod-shirt-1',
        companyId,
        name: 'قميص قطن كلاسيك',
      });
      currentPrisma._store.products.set('prod-belt-1', {
        id: 'prod-belt-1',
        companyId,
        name: 'حزام جلد طبيعي',
      });

      // 1. Create with 3 items
      const sample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
        items: [
          { productId: 'prod-suit-1', productName: 'بدلة رجالي كاملة', quantity: 2 },
          { productId: 'prod-shirt-1', productName: 'قميص قطن كلاسيك', quantity: 3 },
          { productId: 'prod-belt-1', productName: 'حزام جلد طبيعي', quantity: 1 },
        ],
      });
      expect(sample.items).toHaveLength(3);
      expect(sample.plannedQuantity).toBe(6);

      // 2. Update to 2 items
      const updated = await ManufacturingSampleService.updateSampleOrder(companyId, testUser, sample.id, {
        items: [
          { productId: 'prod-suit-1', productName: 'بدلة سوبريم', quantity: 4, size: '54', color: 'BLACK' },
          { productId: 'prod-shirt-1', productName: 'قميص سليم', quantity: 1, size: 'M', color: 'BLUE' },
        ],
      });

      expect(updated.items).toHaveLength(2);
      expect(updated.productId).toBe('prod-suit-1');
      expect(updated.productName).toBe('بدلة سوبريم');
      expect(updated.size).toBe('54');
      expect(updated.color).toBe('BLACK');
      expect(updated.plannedQuantity).toBe(5); // 4 + 1 = 5

      // Verify direct fetch
      const fetched = await ManufacturingSampleService.getSampleOrderById(companyId, sample.id);
      expect(fetched.items).toHaveLength(2);
      expect(fetched.items[0].productName).toBe('بدلة سوبريم');
      expect(fetched.items[1].productName).toBe('قميص سليم');
    });

    test('17. عينة قديمة من غير items (Task HZ-E regression) → لسه شغالة', async () => {
      currentPrisma._store.products.set('prod-classic-1', {
        id: 'prod-classic-1',
        companyId,
        name: 'تيشيرت كلاسيك فردي',
      });

      // Single product order without items array (legacy format)
      const legacySample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
        productId: 'prod-classic-1',
        productName: 'تيشيرت كلاسيك فردي',
        plannedQuantity: 10,
        size: 'L',
        color: 'WHITE',
      });

      expect(legacySample).toBeDefined();
      expect(legacySample.productId).toBe('prod-classic-1');
      expect(legacySample.productName).toBe('تيشيرت كلاسيك فردي');
      expect(legacySample.plannedQuantity).toBe(10);
      expect(legacySample.size).toBe('L');
      expect(legacySample.color).toBe('WHITE');
      expect(legacySample.items).toEqual([]);

      // Update without items array
      const updatedLegacy = await ManufacturingSampleService.updateSampleOrder(companyId, testUser, legacySample.id, {
        plannedQuantity: 15,
        designNotes: 'تحديث للعينة القديمة بدون بنود',
      });
      expect(updatedLegacy.plannedQuantity).toBe(15);
      expect(updatedLegacy.designNotes).toBe('تحديث للعينة القديمة بدون بنود');
      expect(updatedLegacy.items).toEqual([]);
    });
  });

  describe('Task HZ-G: Sample Components & Materials Table', () => {
    beforeEach(() => {
      // Seed products for materials testing
      currentPrisma._store.products.set('prod-fabric-1', {
        id: 'prod-fabric-1',
        companyId,
        name: 'قماش ميلتون قطن',
        sku: 'FAB-MLT-01',
        cost: 150,
      });

      currentPrisma._store.products.set('prod-rib-1', {
        id: 'prod-rib-1',
        companyId,
        name: 'ريب قطن أساور',
        sku: 'RIB-CTN-01',
        cost: 80,
      });

      // Product in a different company
      currentPrisma._store.products.set('prod-alien-1', {
        id: 'prod-alien-1',
        companyId: 'alien-company-999',
        name: 'سوستة شركة تانية',
        sku: 'ZIP-ALN-99',
        cost: 10,
      });
    });

    test('1. إنشاء عينة بـ3 مكونات (٢ منهم productId) → اتخزنوا + totalCost صح + componentsTotal صح', async () => {
      const sample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
        productName: 'هودي أوفر سايز صيفي',
        plannedQuantity: 1,
        components: [
          { productId: 'prod-fabric-1', quantity: 2.5, unit: 'متر', unitPrice: 150 }, // name defaults from product
          { productId: 'prod-rib-1', name: 'ريب قطن أساور مخصص', quantity: 0.5, unit: 'كجم', unitPrice: 80 },
          { name: 'خيط حياكة بوليستر كوري', quantity: 2, unit: 'بكرة', unitPrice: 25 }, // freeform
        ],
      });

      expect(sample).toBeDefined();
      expect(sample.components).toHaveLength(3);

      // Verify Component 1
      const comp1 = sample.components[0];
      expect(comp1.productId).toBe('prod-fabric-1');
      expect(comp1.name).toBe('قماش ميلتون قطن');
      expect(comp1.quantity).toBe(2.5);
      expect(comp1.unit).toBe('متر');
      expect(comp1.unitPrice).toBe(150);
      expect(comp1.totalCost).toBe(375); // 2.5 * 150
      expect(comp1.sortOrder).toBe(1);

      // Verify Component 2
      const comp2 = sample.components[1];
      expect(comp2.productId).toBe('prod-rib-1');
      expect(comp2.name).toBe('ريب قطن أساور مخصص');
      expect(comp2.quantity).toBe(0.5);
      expect(comp2.unit).toBe('كجم');
      expect(comp2.unitPrice).toBe(80);
      expect(comp2.totalCost).toBe(40); // 0.5 * 80
      expect(comp2.sortOrder).toBe(2);

      // Verify Component 3 (Freeform)
      const comp3 = sample.components[2];
      expect(comp3.productId).toBeNull();
      expect(comp3.name).toBe('خيط حياكة بوليستر كوري');
      expect(comp3.quantity).toBe(2);
      expect(comp3.unit).toBe('بكرة');
      expect(comp3.unitPrice).toBe(25);
      expect(comp3.totalCost).toBe(50); // 2 * 25
      expect(comp3.sortOrder).toBe(3);

      // Total components cost
      expect(sample.componentsTotal).toBe(465); // 375 + 40 + 50

      // Direct fetch parity
      const fetched = await ManufacturingSampleService.getSampleOrderById(companyId, sample.id);
      expect(fetched.components).toHaveLength(3);
      expect(fetched.componentsTotal).toBe(465);
      expect(fetched.components[0].name).toBe('قماش ميلتون قطن');
      expect(fetched.components[1].name).toBe('ريب قطن أساور مخصص');
      expect(fetched.components[2].name).toBe('خيط حياكة بوليستر كوري');
    });

    test('2. productId مش تابع للشركة → 400 («الخامة المختارة غير موجودة في هذه الشركة»)', async () => {
      // In create
      await expect(
        ManufacturingSampleService.createSampleOrder(companyId, testUser, {
          productName: 'عينة مرفوضة خاماتها',
          components: [
            { productId: 'prod-alien-1', quantity: 1, unitPrice: 10 },
          ],
        })
      ).rejects.toThrow('الخامة المختارة غير موجودة في هذه الشركة');

      // Create valid sample first
      const validSample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
        productName: 'عينة مقبولة مبدئيًا',
      });

      // In update
      await expect(
        ManufacturingSampleService.updateSampleOrder(companyId, testUser, validSample.id, {
          components: [
            { productId: 'prod-non-existent-999', quantity: 1, unitPrice: 20 },
          ],
        })
      ).rejects.toThrow('الخامة المختارة غير موجودة في هذه الشركة');
    });

    test('3. تحديث المكونات (من 3 لـ2) → القديم اتمسح والجديد اتخزن', async () => {
      // 1. Create with 3 components
      const sample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
        productName: 'هودي أوفر سايز',
        components: [
          { productId: 'prod-fabric-1', quantity: 2, unitPrice: 150 },
          { productId: 'prod-rib-1', quantity: 1, unitPrice: 80 },
          { name: 'سوستة بلاستيك', quantity: 1, unitPrice: 10 },
        ],
      });
      expect(sample.components).toHaveLength(3);
      expect(sample.componentsTotal).toBe(390); // 300 + 80 + 10

      // 2. Update to 2 components
      const updated = await ManufacturingSampleService.updateSampleOrder(companyId, testUser, sample.id, {
        components: [
          { productId: 'prod-fabric-1', name: 'قماش ميلتون تركي معدل', quantity: 3, unit: 'متر', unitPrice: 160 },
          { name: 'تيكت رقبة منسوج', quantity: 1, unit: 'قطعة', unitPrice: 15 },
        ],
      });

      expect(updated.components).toHaveLength(2);
      expect(updated.components[0].productId).toBe('prod-fabric-1');
      expect(updated.components[0].name).toBe('قماش ميلتون تركي معدل');
      expect(updated.components[0].quantity).toBe(3);
      expect(updated.components[0].totalCost).toBe(480); // 3 * 160

      expect(updated.components[1].productId).toBeNull();
      expect(updated.components[1].name).toBe('تيكت رقبة منسوج');
      expect(updated.components[1].quantity).toBe(1);
      expect(updated.components[1].totalCost).toBe(15); // 1 * 15

      expect(updated.componentsTotal).toBe(495); // 480 + 15

      // Verify direct fetch
      const fetched = await ManufacturingSampleService.getSampleOrderById(companyId, sample.id);
      expect(fetched.components).toHaveLength(2);
      expect(fetched.componentsTotal).toBe(495);
      expect(fetched.components[0].name).toBe('قماش ميلتون تركي معدل');
      expect(fetched.components[1].name).toBe('تيكت رقبة منسوج');
    });

    test('4. عينة قديمة من غير components (Task HZ-G regression) → لسه شغالة', async () => {
      // Create without components array
      const sample = await ManufacturingSampleService.createSampleOrder(companyId, testUser, {
        productName: 'عينة ريجريشن بدون جدول خامات',
        plannedQuantity: 4,
      });

      expect(sample).toBeDefined();
      expect(sample.components).toEqual([]);
      expect(sample.componentsTotal).toBe(0);

      // Update without components array
      const updated = await ManufacturingSampleService.updateSampleOrder(companyId, testUser, sample.id, {
        plannedQuantity: 6,
        designNotes: 'تحديث للعينة القديمة بدون خامات',
      });

      expect(updated.plannedQuantity).toBe(6);
      expect(updated.designNotes).toBe('تحديث للعينة القديمة بدون خامات');
      expect(updated.components).toEqual([]);
      expect(updated.componentsTotal).toBe(0);
    });
  });
});
