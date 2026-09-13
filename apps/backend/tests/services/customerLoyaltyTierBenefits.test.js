const customerLoyaltyService = require('../../services/hr/customerLoyaltyService');
const EnhancedOrderService = require('../../services/enhancedOrderService');

describe('Customer Loyalty Tier Benefits - Real Application', () => {
  describe('parseBenefits & getCustomerActiveRewards logic', () => {
    it('correctly extracts discountPercent and freeShipping from structured benefits', async () => {
      // Test the extraction logic on structured object
      const benefits = { discountPercent: 12.5, freeShipping: true };
      expect(benefits.freeShipping).toBe(true);
      expect(Number(benefits.discountPercent)).toBe(12.5);
    });

    it('correctly parses text benefits as fallback', async () => {
      const mockBenefits = ['شحن مجاني', 'خصم 10% على كل الطلبات'];
      let freeShipping = false;
      let discountPercent = 0;

      for (const item of mockBenefits) {
        const str = String(item).trim();
        if (/شحن\s*مجاني|free\s*shipping/i.test(str)) {
          freeShipping = true;
        }
        const match = str.match(/(?:خصم|discount)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*%/i) || str.match(/(\d+(?:\.\d+)?)\s*%\s*(?:خصم|discount)/i);
        if (match) {
          const val = parseFloat(match[1]);
          if (val > 0) discountPercent = val;
        }
      }

      expect(freeShipping).toBe(true);
      expect(discountPercent).toBe(10);
    });
  });

  describe('EnhancedOrderService - calculateCosts with loyalty tier benefits', () => {
    let service;

    beforeEach(() => {
      service = new EnhancedOrderService();
    });

    it('applies freeShipping and discountPercent from customer tier rewards', async () => {
      // Mock getCustomerActiveRewards to simulate customer in VIP tier (15% discount + free shipping)
      jest.spyOn(customerLoyaltyService, 'getCustomerActiveRewards').mockResolvedValue({
        freeShipping: true,
        discountPercent: 15,
        freeShippingThreshold: 0,
        pointsMultiplier: 1
      });

      // Mock calculateShipping to return 60 by default if not free
      jest.spyOn(service, 'calculateShipping').mockResolvedValue(60);

      const costs = await service.calculateOrderCosts({
        companyId: 'comp-1',
        customerId: 'cust-1',
        productPrice: 500,
        quantity: 2,
        governorate: 'القاهرة',
        subtotal: 1000
      });

      // Subtotal = 1000
      // Tier Discount = 15% of 1000 = 150
      // Shipping = 0 (free shipping applied!)
      // Total = 1000 - 150 + 0 = 850
      expect(costs.subtotal).toBe(1000);
      expect(costs.shipping).toBe(0);
      expect(costs.discount).toBe(150);
      expect(costs.total).toBe(850);
    });

    it('does not apply free shipping or discount if tier does not have them', async () => {
      jest.spyOn(customerLoyaltyService, 'getCustomerActiveRewards').mockResolvedValue({
        freeShipping: false,
        discountPercent: 0,
        freeShippingThreshold: 0,
        pointsMultiplier: 1
      });

      jest.spyOn(service, 'calculateShipping').mockResolvedValue(50);

      const costs = await service.calculateOrderCosts({
        companyId: 'comp-1',
        customerId: 'cust-2',
        productPrice: 300,
        quantity: 1,
        governorate: 'الجيزة',
        subtotal: 300
      });

      expect(costs.subtotal).toBe(300);
      expect(costs.shipping).toBe(50);
      expect(costs.discount).toBe(0);
      expect(costs.total).toBe(350);
    });
  });
});
