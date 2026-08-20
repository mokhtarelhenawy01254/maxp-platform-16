const { phoneFields, buildPhoneWhere, findCustomerByPhone } = require('../../utils/customerIdentity');

describe('customerIdentity', () => {
  test('phoneFields writes canonical phoneNormalized for any format', () => {
    expect(phoneFields('01019046551')).toEqual({
      phone: '01019046551',
      phoneNormalized: '+201019046551',
    });
    expect(phoneFields('201019046551').phoneNormalized).toBe('+201019046551');
    expect(phoneFields(null)).toEqual({ phone: null, phoneNormalized: null });
  });

  test('buildPhoneWhere returns OR across canonical + variants', () => {
    const where = buildPhoneWhere('01019046551', 'company-1');
    expect(where.companyId).toBe('company-1');
    expect(where.OR[0]).toEqual({ phoneNormalized: '+201019046551' });
    expect(where.OR[1].phone.in).toEqual(expect.arrayContaining(['01019046551', '1019046551', '201019046551']));
  });

  test('buildPhoneWhere returns null for empty phone', () => {
    expect(buildPhoneWhere('', 'company-1')).toBeNull();
    expect(buildPhoneWhere(null, 'company-1')).toBeNull();
  });

  test('findCustomerByPhone queries the canonical or raw phone', async () => {
    const mockPrisma = {
      customer: {
        findFirst: jest.fn().mockResolvedValue({ id: 'c1' }),
      },
    };
    const result = await findCustomerByPhone(mockPrisma, '01019046551', 'company-1');
    expect(result.id).toBe('c1');
    expect(mockPrisma.customer.findFirst).toHaveBeenCalled();
  });
});
