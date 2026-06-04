/**
 * اختبار لضمان حساب خصم الغياب للشهر الحالي
 * Test to ensure absence deduction is calculated for current month
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const PayrollService = require('../services/hr/payrollService');

async function testAbsenceDeduction() {
  console.log('🧪 بدء اختبار حساب خصم الغياب للشهر الحالي');
  
  try {
    const prisma = getSharedPrismaClient();
    const payrollService = new PayrollService();
    
    // تعيين قيمة خصم الغياب للشهر الحالي إلى true في الإعدادات
    console.log('✅ تعيين خيار خصم الغياب للشهر الحالي إلى true في الإعدادات');
    const companyId = 'YOUR_COMPANY_ID'; // استبدل بمعرف الشركة الفعلي
    
    // تحديث إعدادات HR
    await prisma.hRSettings.update({
      where: { companyId },
      data: { deductAbsenceInCurrentMonth: true }
    });
    
    // التحقق من تحديث الإعدادات
    const settings = await prisma.hRSettings.findUnique({
      where: { companyId }
    });
    
    console.log('📊 إعدادات خصم الغياب الحالية:', settings.deductAbsenceInCurrentMonth);
    
    // اختبار حساب الراتب مع إعدادات خصم الغياب للشهر الحالي
    const employeeId = 'YOUR_EMPLOYEE_ID'; // استبدل بمعرف الموظف الفعلي
    const month = new Date().getMonth() + 1; // الشهر الحالي
    const year = new Date().getFullYear(); // السنة الحالية
    
    const payrollData = await payrollService.calculatePayrollData(companyId, employeeId, month, year);
    
    console.log('📊 نتائج حساب الراتب:');
    console.log('- الراتب الأساسي:', payrollData.baseSalary);
    console.log('- أيام الغياب:', payrollData.absentDays);
    console.log('- قيمة خصم الغياب:', payrollData.attendanceDeduction);
    
    // التحقق من أن خصم الغياب يتم حسابه للشهر الحالي
    if (payrollData.absentDays > 0 && payrollData.attendanceDeduction > 0) {
      console.log('✅ نجاح: تم حساب خصم الغياب للشهر الحالي كما هو متوقع');
      console.log('عدد أيام الغياب:', payrollData.absentDays);
      console.log('قيمة الخصم:', payrollData.attendanceDeduction);
    } else if (payrollData.absentDays > 0 && payrollData.attendanceDeduction === 0) {
      console.error('❌ فشل: لم يتم حساب خصم الغياب رغم وجود أيام غياب');
    } else {
      console.log('ℹ️ لا توجد أيام غياب للاختبار');
    }
    
    // اختبار تعطيل خصم الغياب للشهر الحالي
    console.log('\n🧪 اختبار تعطيل خصم الغياب للشهر الحالي');
    
    // تحديث الإعدادات لتعطيل خصم الغياب للشهر الحالي
    await prisma.hRSettings.update({
      where: { companyId },
      data: { deductAbsenceInCurrentMonth: false }
    });
    
    // حساب الراتب مرة أخرى
    const payrollData2 = await payrollService.calculatePayrollData(companyId, employeeId, month, year);
    
    console.log('📊 نتائج حساب الراتب بعد تعطيل خصم الغياب:');
    console.log('- أيام الغياب:', payrollData2.absentDays);
    console.log('- قيمة خصم الغياب:', payrollData2.attendanceDeduction);
    
    // التحقق من عدم حساب خصم الغياب للشهر الحالي عند تعطيل الخيار
    if (payrollData2.absentDays > 0 && payrollData2.attendanceDeduction === 0) {
      console.log('✅ نجاح: لم يتم حساب خصم الغياب للشهر الحالي عند تعطيل الخيار');
    } else if (payrollData2.absentDays > 0 && payrollData2.attendanceDeduction > 0) {
      console.error('❌ فشل: تم حساب خصم الغياب رغم تعطيل الخيار');
    }
    
    // إعادة الإعدادات إلى وضعها الأصلي
    await prisma.hRSettings.update({
      where: { companyId },
      data: { deductAbsenceInCurrentMonth: true }
    });
    
    console.log('✅ تم إعادة الإعدادات إلى وضعها الأصلي');
    
  } catch (error) {
    console.error('❌ حدث خطأ أثناء الاختبار:', error);
  }
}

// تنفيذ الاختبار
testAbsenceDeduction()
  .then(() => console.log('🏁 انتهى الاختبار'))
  .catch(console.error);
