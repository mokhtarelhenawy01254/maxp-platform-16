const { mapLeadgenFieldData } = require('../../controller/webhookController');

describe('mapLeadgenFieldData (Facebook Lead Ads → CRM lead)', () => {
  it('maps standard Meta field_data keys and splits full_name', () => {
    const result = mapLeadgenFieldData([
      { name: 'full_name', values: ['أحمد محمد'] },
      { name: 'phone_number', values: ['01012345678'] },
      { name: 'email', values: ['a@b.com'] }
    ]);
    expect(result.fullName).toBe('أحمد محمد');
    expect(result.firstName).toBe('أحمد');
    expect(result.lastName).toBe('محمد');
    expect(result.phone).toBe('01012345678');
    expect(result.email).toBe('a@b.com');
    expect(result.raw).toHaveLength(3);
  });

  it('keeps independent first/last names without re-splitting', () => {
    const result = mapLeadgenFieldData([
      { name: 'first_name', values: ['سارة'] },
      { name: 'last_name', values: ['علي'] }
    ]);
    expect(result.firstName).toBe('سارة');
    expect(result.lastName).toBe('علي');
  });

  it('aliases alternate keys (mobile_number → phone, Governorate → city)', () => {
    const result = mapLeadgenFieldData([
      { name: 'mobile_number', values: ['01234567890'] },
      { name: 'Governorate', values: ['القاهرة'] }
    ]);
    expect(result.phone).toBe('01234567890');
    expect(result.city).toBe('القاهرة');
  });

  it('does not crash on empty or malformed input', () => {
    expect(mapLeadgenFieldData(null).raw).toEqual([]);
    expect(mapLeadgenFieldData(undefined).raw).toEqual([]);
    // items without a name are intentionally skipped
    expect(mapLeadgenFieldData([{ name: 'x' }, { values: ['no name'] }]).raw).toHaveLength(1);
  });

  it('joins multi-value answers with a space', () => {
    const result = mapLeadgenFieldData([{ name: 'city', values: ['القاهرة', 'مدينة نصر'] }]);
    expect(result.city).toBe('القاهرة مدينة نصر');
  });

  it('first empty answer does not overwrite an earlier mapped value', () => {
    const result = mapLeadgenFieldData([
      { name: 'phone_number', values: ['01000000000'] },
      { name: 'phone', values: [''] }
    ]);
    expect(result.phone).toBe('01000000000');
  });
});
