/**
 * اختبار لضمان احترام قيمة التأمين الصفرية
 * Test to ensure zero insurance value is respected
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const PayrollService = require('../services/hr/payrollService');

async function testInsuranceZeroSetting() {
  console.log('🧪 بدء اختبار إعدادات التأمين الصفرية');
  
  try {
    const prisma = getSharedPrismaClient();
    const payrollService = new PayrollService();
    
    // تعيين قيمة التأمين إلى صفر في الإعدادات
    console.log('✅ تعيين قيمة التأمين إلى صفر في الإعدادات');
    const companyId = 'YOUR_COMPANY_ID'; // استبدل بمعرف الشركة الفعلي
    
    // تحديث إعدادات HR
    await prisma.hRSettings.update({
      where: { companyId },
      data: { socialInsuranceRate: 0 }
    });
    
    // التحقق من تحديث الإعدادات
    const settings = await prisma.hRSettings.findUnique({
      where: { companyId }
    });
    
    console.log('📊 إعدادات التأمين الحالية:', settings.socialInsuranceRate);
    
    // اختبار حساب الراتب مع إعدادات التأمين الصفرية
    const employeeId = 'YOUR_EMPLOYEE_ID'; // استبدل بمعرف الموظف الفعلي
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    
    const payrollData = await payrollService.calculatePayrollData(companyId, employeeId, month, year);
    
    console.log('📊 نتائج حساب الراتب:');
    console.log('- الراتب الأساسي:', payrollData.baseSalary);
    console.log('- معدل التأمين:', settings.socialInsuranceRate);
    console.log('- قيمة التأمين المحسوبة:', payrollData.socialInsurance);
    
    // التحقق من أن قيمة التأمين صفر
    if (payrollData.socialInsurance === 0) {
      console.log('✅ نجاح: قيمة التأمين صفر كما هو متوقع');
    } else {
      console.error('❌ فشل: قيمة التأمين غير صفرية رغم تعيين الإعدادات إلى صفر');
      console.error('القيمة المحسوبة:', payrollData.socialInsurance);
    }
    
    // اختبار عرض الخصومات مع أسبابها
    console.log('\n📋 تفاصيل الخصومات:');
    console.log(payrollData.deductions);
    
    if (payrollData.deductions.details) {
      console.log('✅ نجاح: تم عرض تفاصيل الخصومات مع أسبابها');
    } else {
      console.log('❌ فشل: لم يتم عرض تفاصيل الخصومات');
    }
    
  } catch (error) {
    console.error('❌ حدث خطأ أثناء الاختبار:', error);
  }
}

// تنفيذ الاختبار
testInsuranceZeroSetting()
  .then(() => console.log('🏁 انتهى الاختبار'))
  .catch(console.error);
