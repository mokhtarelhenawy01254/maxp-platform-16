/**
 * اختبار لعرض تفاصيل الخصومات وأسبابها
 * Test for displaying discount details and reasons
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const PayrollService = require('../services/hr/payrollService');

async function testDiscountDisplay() {
  console.log('🧪 بدء اختبار عرض تفاصيل الخصومات');
  
  try {
    const prisma = getSharedPrismaClient();
    const payrollService = new PayrollService();
    
    const companyId = 'YOUR_COMPANY_ID'; // استبدل بمعرف الشركة الفعلي
    const employeeId = 'YOUR_EMPLOYEE_ID'; // استبدل بمعرف الموظف الفعلي
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    
    // إضافة خصم يدوي للاختبار
    const manualDeduction = await prisma.manualDeduction.create({
      data: {
        companyId,
        employeeId,
        type: 'OTHER',
        amount: 100,
        reason: 'خصم اختباري للتأكد من عرض السبب',
        date: new Date(),
        effectiveMonth: month,
        effectiveYear: year,
        status: 'APPROVED',
        createdBy: 'SYSTEM_TEST'
      }
    });
    
    console.log('✅ تم إنشاء خصم يدوي للاختبار:', manualDeduction.id);
    
    // حساب الراتب مع الخصم اليدوي الجديد
    const payrollData = await payrollService.calculatePayrollData(companyId, employeeId, month, year);
    
    console.log('\n📋 تفاصيل الخصومات:');
    console.log(JSON.stringify(payrollData.deductions, null, 2));
    
    // التحقق من وجود تفاصيل الخصومات
    if (payrollData.deductions.details) {
      console.log('✅ نجاح: تم عرض تفاصيل الخصومات');
      
      // التحقق من وجود معلومات نوع الخصم (يدوي/تلقائي)
      if (payrollData.deductions.details.includes('يدوي')) {
        console.log('✅ نجاح: تم عرض نوع الخصم (يدوي)');
      } else {
        console.log('❌ فشل: لم يتم عرض نوع الخصم (يدوي)');
      }
      
      // التحقق من وجود سبب الخصم
      if (payrollData.deductions.details.includes('خصم اختباري')) {
        console.log('✅ نجاح: تم عرض سبب الخصم');
      } else {
        console.log('❌ فشل: لم يتم عرض سبب الخصم');
      }
    } else {
      console.log('❌ فشل: لم يتم عرض تفاصيل الخصومات');
    }
    
    // حذف الخصم الاختباري بعد الانتهاء
    await prisma.manualDeduction.delete({
      where: { id: manualDeduction.id }
    });
    
    console.log('✅ تم حذف الخصم الاختباري بنجاح');
    
  } catch (error) {
    console.error('❌ حدث خطأ أثناء الاختبار:', error);
  }
}

// تنفيذ الاختبار
testDiscountDisplay()
  .then(() => console.log('🏁 انتهى الاختبار'))
  .catch(console.error);
