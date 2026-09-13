/**
 * Inventory AI Studio Controller Tests
 */

jest.mock('../../services/aiServiceAdminClient', () => ({
  listAgents: jest.fn(),
  chatWithAgent: jest.fn(),
  spawnAgent: jest.fn(),
}));

jest.mock('../../services/sharedDatabase', () => {
  const mockPrisma = {
    $executeRawUnsafe: jest.fn().mockResolvedValue(true),
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    $queryRaw: jest.fn().mockResolvedValue([]),
    product: {
      update: jest.fn().mockImplementation(({ where, data }) =>
        Promise.resolve({ id: where.id, ...data })
      ),
    },
  };
  return {
    getSharedPrismaClient: () => mockPrisma,
  };
});

const inventoryAiController = require('../../controller/inventoryAiController');
const aiServiceAdminClient = require('../../services/aiServiceAdminClient');
const agentStudioSessionService = require('../../services/agentStudioSessionService');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

describe('Inventory AI Studio Controller', () => {
  const prisma = getSharedPrismaClient();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('chat', () => {
    it('returns 401 if companyId is missing', async () => {
      const req = { user: {}, body: { message: 'مرحبا' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await inventoryAiController.chat(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Company ID is required' })
      );
    });

    it('returns 400 if message is empty or missing', async () => {
      const req = { user: { companyId: 'comp_123' }, body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await inventoryAiController.chat(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'message is required' })
      );
    });

    it('successfully chats with inventory agent and passes active product context', async () => {
      const req = {
        user: { companyId: 'comp_test' },
        body: {
          message: 'افحص مخزون المنتج واقترح سعر مناسب',
          threadId: 'sess_test_123',
          activeProduct: {
            id: 'prod_1',
            name: 'كوتشي سوان',
            price: 500,
            cost: 250,
            stock: 8,
          },
        },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      aiServiceAdminClient.listAgents.mockResolvedValue([
        { id: 'agent_inv_01', name: 'وكيل المخزون', role: 'INVENTORY', status: 'ACTIVE' },
      ]);

      aiServiceAdminClient.chatWithAgent.mockResolvedValue({
        status: 'completed',
        reply: 'رصيد منتج "كوتشي سوان" هو 8 قطع (مخزون حرج). أقترح إعادة طلب 50 قطعة ورفع السعر إلى 520 ج.م.',
        tool_calls: [
          {
            name: 'inventory_check',
            args: { product_name: 'كوتشي سوان' },
          },
          {
            name: 'product_update_price',
            args: { productId: 'prod_1', price: 520, reason: 'رفع هامش الربح' },
          },
        ],
      });

      await inventoryAiController.chat(req, res);

      expect(aiServiceAdminClient.chatWithAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'comp_test',
          agentId: 'agent_inv_01',
          message: 'افحص مخزون المنتج واقترح سعر مناسب',
          channel: 'inventory_studio',
          memory_context: expect.objectContaining({
            activeProduct: expect.objectContaining({ name: 'كوتشي سوان', stock: 8 }),
          }),
        })
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'completed',
          agentId: 'agent_inv_01',
          tool_calls: expect.arrayContaining([
            expect.objectContaining({ name: 'inventory_check' }),
            expect.objectContaining({ name: 'product_update_price' }),
          ]),
        })
      );
    });
  });

  describe('getActiveAgent', () => {
    it('returns active agent routed to INVENTORY_STUDIO when available', async () => {
      const req = { user: { companyId: 'comp_test' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      aiServiceAdminClient.listAgents.mockResolvedValue([
        { id: 'agent_routed_1', name: 'خبير المخزون الموجه', role: 'INVENTORY', allowedChannels: ['INVENTORY_STUDIO'], status: 'ACTIVE' },
        { id: 'agent_general', name: 'وكيل عام', role: 'SALES', status: 'ACTIVE' },
      ]);

      await inventoryAiController.getActiveAgent(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          agent: expect.objectContaining({
            id: 'agent_routed_1',
            name: 'خبير المخزون الموجه',
            isRouted: true,
          }),
        })
      );
    });

    it('falls back to role INVENTORY when no specific channel routing is set', async () => {
      const req = { user: { companyId: 'comp_test' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      aiServiceAdminClient.listAgents.mockResolvedValue([
        { id: 'agent_inv_default', name: 'وكيل المخزون الأساسي', role: 'INVENTORY', status: 'ACTIVE' },
      ]);

      await inventoryAiController.getActiveAgent(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          agent: expect.objectContaining({
            id: 'agent_inv_default',
            isRouted: false,
          }),
        })
      );
    });
  });

  describe('applyAction', () => {
    it('applies PRICE_CHANGE directly on product', async () => {
      const req = {
        user: { companyId: 'comp_test' },
        body: {
          type: 'PRICE_CHANGE',
          productId: 'prod_99',
          newValue: 599,
        },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await inventoryAiController.applyAction(req, res);

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod_99' },
          data: { price: 599 },
        })
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('599'),
        })
      );
    });

    it('applies STOCK_ADJUSTMENT directly on product inventory', async () => {
      const req = {
        user: { companyId: 'comp_test' },
        body: {
          type: 'STOCK_ADJUSTMENT',
          productId: 'prod_99',
          newValue: 45,
        },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await inventoryAiController.applyAction(req, res);

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod_99' },
          data: { inventory: 45 },
        })
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('45'),
        })
      );
    });
  });
});
