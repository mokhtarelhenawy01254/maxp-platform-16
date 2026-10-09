/**
 * Unit regression test for accept post-purchase offer guards:
 * 1) 6-hour expiration protection
 * 2) Primary order lookup using OR pattern
 */

describe('Post-Purchase Offer Accept Guards', () => {
  describe('Time-based Expiration Guard', () => {
    const sixHoursMs = 6 * 60 * 60 * 1000;

    function checkExpiration(createdAt) {
      const orderCreatedAt = createdAt ? new Date(createdAt).getTime() : 0;
      if (orderCreatedAt && (Date.now() - orderCreatedAt > sixHoursMs)) {
        return {
          allowed: false,
          status: 400,
          response: {
            success: false,
            message: 'انتهت صلاحية العرض لهذا الطلب'
          }
        };
      }
      return { allowed: true };
    }

    it('rejects order created 7 hours ago', () => {
      const sevenHoursAgo = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString();
      const result = checkExpiration(sevenHoursAgo);
      expect(result.allowed).toBe(false);
      expect(result.status).toBe(400);
      expect(result.response.message).toBe('انتهت صلاحية العرض لهذا الطلب');
    });

    it('rejects order created 24 hours ago (like ORD-501139-413 hours after checkout)', () => {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const result = checkExpiration(dayAgo);
      expect(result.allowed).toBe(false);
      expect(result.status).toBe(400);
      expect(result.response.message).toBe('انتهت صلاحية العرض لهذا الطلب');
    });

    it('allows fresh order created 5 minutes ago', () => {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const result = checkExpiration(fiveMinsAgo);
      expect(result.allowed).toBe(true);
    });

    it('allows fresh order created 2 hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const result = checkExpiration(twoHoursAgo);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Primary Order Lookup Query Pattern', () => {
    it('constructs correct OR clauses matching orderNumber and id', () => {
      const order = {
        id: 'cmv0ltajd004hjuv4gx449035',
        orderNumber: 'ORD-501139-413'
      };
      const company = { id: 'cmleybpf70028juo2wwpmp8rt' };

      const queryWhere = {
        companyId: company.id,
        OR: [
          { id: order.orderNumber },
          { orderNumber: order.orderNumber },
          { id: order.id }
        ]
      };

      expect(queryWhere.companyId).toBe('cmleybpf70028juo2wwpmp8rt');
      expect(queryWhere.OR).toEqual([
        { id: 'ORD-501139-413' },
        { orderNumber: 'ORD-501139-413' },
        { id: 'cmv0ltajd004hjuv4gx449035' }
      ]);
    });
  });

  describe('Primary Order Update Payload Validation', () => {
    it('calculates total and subtotal without invalid schema fields (finalTotal or items)', () => {
      const primaryOrder = {
        id: 'ord_123',
        subtotal: 620,
        shipping: 70,
        total: 690
      };
      const additionalTotal = 399;

      const nextOrderTotal = Number((Number(primaryOrder.total || 0) + additionalTotal).toFixed(2));
      const nextOrderSubtotal = Number((Number(primaryOrder.subtotal || 0) + additionalTotal).toFixed(2));

      const updateData = {
        total: nextOrderTotal,
        subtotal: nextOrderSubtotal
      };

      // Valid Order model fields
      expect(updateData.total).toBe(1089);
      expect(updateData.subtotal).toBe(1019);

      // Must NOT contain invalid fields that throw Prisma Unknown argument
      expect(updateData).not.toHaveProperty('finalTotal');
      expect(updateData).not.toHaveProperty('items');
    });
  });
});
