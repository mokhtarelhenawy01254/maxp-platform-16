const { computeCustomerDetailsDiff, computeOrderItemsDiff } = require('../../utils/orderDiffHelper');

describe('orderDiffHelper', () => {
  describe('computeCustomerDetailsDiff', () => {
    test('detects name, phone, altPhone, governorate, city, address, and notes changes', () => {
      const oldData = {
        customerName: 'أحمد علي',
        customerPhone: '01011111111',
        metadata: JSON.stringify({ alternativePhone: '01111111111' }),
        shippingAddress: JSON.stringify({ governorate: 'القاهرة', city: 'مدينة نصر', address: 'شارع 1' }),
        notes: 'ملاحظة قديمة',
      };

      const input = {
        customerName: 'أحمد محمود',
        customerPhone: '01022222222',
        alternativePhone: '01122222222',
        governorate: 'الجيزة',
        city: 'الدقي',
        customerAddress: 'شارع التحرير',
        notes: 'ملاحظة جديدة',
      };

      const diffs = computeCustomerDetailsDiff(oldData, input);
      expect(diffs).toEqual([
        'تعديل اسم العميل: من "أحمد علي" إلى "أحمد محمود"',
        'تعديل رقم الهاتف: من "01011111111" إلى "01022222222"',
        'تعديل الرقم البديل: من "01111111111" إلى "01122222222"',
        'تعديل المحافظة: من "القاهرة" إلى "الجيزة"',
        'تعديل المدينة / المنطقة: من "مدينة نصر" إلى "الدقي"',
        'تعديل العنوان: من "شارع 1" إلى "شارع التحرير"',
        'تعديل الملاحظات: "ملاحظة جديدة"',
      ]);
    });

    test('returns empty array when nothing changed', () => {
      const oldData = {
        customerName: 'أحمد علي',
        customerPhone: '01011111111',
        metadata: JSON.stringify({ alternativePhone: '01111111111' }),
        shippingAddress: JSON.stringify({ governorate: 'القاهرة', city: 'مدينة نصر', address: 'شارع 1' }),
        notes: 'ملاحظة',
      };

      const input = {
        customerName: 'أحمد علي',
        customerPhone: '01011111111',
        alternativePhone: '01111111111',
        governorate: 'القاهرة',
        city: 'مدينة نصر',
        shippingAddress: { address: 'شارع 1' },
        notes: 'ملاحظة',
      };

      const diffs = computeCustomerDetailsDiff(oldData, input);
      expect(diffs).toEqual([]);
    });
  });

  describe('computeOrderItemsDiff', () => {
    test('detects added, removed, and modified items as well as total adjustments', () => {
      const oldItems = [
        { productId: 'p-1', productName: 'تيشرت صيفي', productColor: 'أزرق', productSize: 'L', price: 150, quantity: 2 },
        { productId: 'p-2', productName: 'بنطلون جينز', productColor: 'أسود', productSize: '32', price: 300, quantity: 1 },
      ];

      const newItems = [
        // Modified p-1: quantity 2 -> 3, price 150 -> 140
        { productId: 'p-1', productName: 'تيشرت صيفي', productColor: 'أزرق', productSize: 'L', price: 140, quantity: 3 },
        // Added p-3
        { productId: 'p-3', productName: 'حذاء كاجوال', productColor: 'بني', productSize: '43', price: 500, quantity: 1 },
        // p-2 removed
      ];

      const oldTotals = { total: 600, shipping: 50 };
      const newTotals = { total: 970, shipping: 50 };

      const diffs = computeOrderItemsDiff(oldItems, newItems, oldTotals, newTotals);
      expect(diffs).toEqual([
        'تعديل "تيشرت صيفي" (اللون: أزرق - المقاس: L): الكمية: من 2 إلى 3، السعر: من 150 إلى 140 ج.م',
        'إضافة منتج: "حذاء كاجوال" (اللون: بني - المقاس: 43) (الكمية: 1 - السعر: 500 ج.م)',
        'حذف منتج: "بنطلون جينز" (اللون: أسود - المقاس: 32) (الكمية السابقة: 1)',
        'تعديل إجمالي الطلب: من 600 ج.م إلى 970 ج.م',
      ]);
    });
  });
});
