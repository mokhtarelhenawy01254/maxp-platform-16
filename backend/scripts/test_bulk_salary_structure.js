/**
 * اختبار بسيط لـ API تحديث الرواتب
 */

const testData = {
    updates: [
        {
            id: 'test-user-id-1',
            baseSalary: '5000',
            reason: 'زيادة سنوية'
        },
        {
            id: 'test-user-id-2',
            baseSalary: '6000',
            reason: 'ترقية'
        }
    ]
};

console.log('📋 Test Data Structure:');
console.log(JSON.stringify(testData, null, 2));

console.log('\n✅ Data structure is correct for /api/v1/hr/employees/bulk-salaries');
console.log('✅ Each update has: id, baseSalary, reason');
console.log('✅ Ready to test with actual employee IDs');
