const { applyDecimalPatch } = require('../../utils/patchPrismaDecimal');

describe('FIN-B5: Prisma Decimal Serialization to Number', () => {
  let Prisma;

  beforeAll(() => {
    try {
      const generated = require('../../prisma/generated/postgresql_v2');
      Prisma = generated.Prisma;
    } catch (_) {
      try {
        const client = require('@prisma/client');
        Prisma = client.Prisma;
      } catch (err) {
        // Mock fallback if prisma client is not generated in environment
        class MockDecimal {
          constructor(val) {
            this.val = val;
          }
          toString() {
            return String(this.val);
          }
        }
        Prisma = { Decimal: MockDecimal };
      }
    }
    applyDecimalPatch();
  });

  it('serializes integer Decimal to a JavaScript number', () => {
    const dec = new Prisma.Decimal('8500');
    const jsonStr = JSON.stringify({ amount: dec });
    const parsed = JSON.parse(jsonStr);

    expect(typeof parsed.amount).toBe('number');
    expect(parsed.amount).toBe(8500);
  });

  it('serializes fractional Decimal to a JavaScript number', () => {
    const dec = new Prisma.Decimal('8500.50');
    const jsonStr = JSON.stringify({ amount: dec });
    const parsed = JSON.parse(jsonStr);

    expect(typeof parsed.amount).toBe('number');
    expect(parsed.amount).toBe(8500.5);
  });

  it('serializes zero Decimal to 0', () => {
    const dec = new Prisma.Decimal('0.00');
    const jsonStr = JSON.stringify({ balance: dec });
    const parsed = JSON.parse(jsonStr);

    expect(typeof parsed.balance).toBe('number');
    expect(parsed.balance).toBe(0);
  });

  it('serializes negative Decimal to negative number', () => {
    const dec = new Prisma.Decimal('-125.75');
    const jsonStr = JSON.stringify({ net: dec });
    const parsed = JSON.parse(jsonStr);

    expect(typeof parsed.net).toBe('number');
    expect(parsed.net).toBe(-125.75);
  });

  it('serializes deeply nested structures containing Decimal fields correctly', () => {
    const payload = {
      orderId: 'ORD-101',
      total: new Prisma.Decimal('1500.00'),
      tax: new Prisma.Decimal('210.00'),
      items: [
        { id: 1, unitPrice: new Prisma.Decimal('500.00'), subtotal: new Prisma.Decimal('1000.00') },
        { id: 2, unitPrice: new Prisma.Decimal('500.00'), subtotal: new Prisma.Decimal('500.00') }
      ]
    };

    const parsed = JSON.parse(JSON.stringify(payload));

    expect(parsed.total).toBe(1500);
    expect(parsed.tax).toBe(210);
    expect(parsed.items[0].unitPrice).toBe(500);
    expect(parsed.items[0].subtotal).toBe(1000);
    expect(parsed.items[1].unitPrice).toBe(500);
    expect(parsed.items[1].subtotal).toBe(500);
  });

  it('preserves Decimal arithmetic and prototype methods', () => {
    if (typeof Prisma.Decimal.prototype.plus === 'function' || typeof Prisma.Decimal.prototype.add === 'function') {
      const a = new Prisma.Decimal('100.50');
      const b = new Prisma.Decimal('50.25');
      const sum = a.add ? a.add(b) : a.plus(b);

      expect(sum.toString()).toBe('150.75');
      expect(JSON.parse(JSON.stringify({ sum })).sum).toBe(150.75);
    }
  });
});
