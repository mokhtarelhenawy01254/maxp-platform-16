/**
 * 🔍 HR Validation Utilities
 * مكتبة شاملة للتحقق من صحة البيانات في نظام الموارد البشرية
 */

const validator = require('validator');
const { ValidationError } = require('./hrErrors');

/**
 * التحقق من صحة بيانات الموظف
 */
function validateEmployeeData(data, isUpdate = false) {
  const errors = [];

  // التحقق من الاسم الأول - اختياري
  if (data.firstName !== undefined && data.firstName !== null) {
    if (typeof data.firstName !== 'string' || data.firstName.trim().length < 2) {
      errors.push({ field: 'firstName', message: 'الاسم الأول يجب أن يكون نصاً لا يقل عن حرفين' });
    }
    if (data.firstName && data.firstName.length > 50) {
      errors.push({ field: 'firstName', message: 'الاسم الأول يجب ألا يزيد عن 50 حرف' });
    }
  } else if (!isUpdate) {
    // قيمة افتراضية للإنشاء
    data.firstName = 'موظف';
  }

  // التحقق من الاسم الأخير - اختياري
  if (data.lastName !== undefined && data.lastName !== null) {
    if (typeof data.lastName !== 'string' || data.lastName.trim().length < 2) {
      errors.push({ field: 'lastName', message: 'الاسم الأخير يجب أن يكون نصاً لا يقل عن حرفين' });
    }
    if (data.lastName && data.lastName.length > 50) {
      errors.push({ field: 'lastName', message: 'الاسم الأخير يجب ألا يزيد عن 50 حرف' });
    }
  } else if (!isUpdate) {
    // قيمة افتراضية للإنشاء
    data.lastName = 'جديد';
  }

  // التحقق من البريد الإلكتروني - مطلوب دائماً
  if (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0) {
    errors.push({ field: 'email', message: 'البريد الإلكتروني مطلوب' });
  } else if (data.email) {
    if (!validator.isEmail(data.email)) {
      errors.push({ field: 'email', message: 'البريد الإلكتروني غير صحيح' });
    }
  }

  // التحقق من رقم الهاتف
  if (data.phone) {
    const ascii = String(data.phone)
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
      .trim();
    const digits = ascii.replace(/\D/g, "");
    let normalized = digits;
    if (normalized.startsWith("0020")) normalized = "0" + normalized.slice(4);
    else if (normalized.startsWith("2001") && normalized.length === 13) normalized = "0" + normalized.slice(3);
    else if (normalized.startsWith("201") && normalized.length === 12) normalized = "0" + normalized.slice(2);
    if (!/^01[0-9]{9}$/.test(normalized)) {
      errors.push({ field: 'phone', message: 'رقم الهاتف غير صحيح (يجب أن يبدأ بـ 01 ويتكون من 11 رقم)' });
    }
  }

  // التحقق من تاريخ الميلاد
  if (data.dateOfBirth) {
    const birthDate = new Date(data.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();

    if (birthDate > today) {
      errors.push({ field: 'dateOfBirth', message: 'تاريخ الميلاد لا يمكن أن يكون في المستقبل' });
    }
    if (age < 16) {
      errors.push({ field: 'dateOfBirth', message: 'عمر الموظف يجب أن يكون 16 سنة على الأقل' });
    }
    if (age > 70) {
      errors.push({ field: 'dateOfBirth', message: 'عمر الموظف يجب ألا يزيد عن 70 سنة' });
    }
  }

  // التحقق من تاريخ التعيين - اختياري مع قيمة افتراضية
  if (data.hireDate !== undefined && data.hireDate !== null && data.hireDate.trim().length > 0) {
    const hireDate = new Date(data.hireDate);
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 50);

    if (hireDate > today) {
      errors.push({ field: 'hireDate', message: 'تاريخ التعيين لا يمكن أن يكون في المستقبل' });
    }
    if (hireDate < oneYearAgo) {
      errors.push({ field: 'hireDate', message: 'تاريخ التعيين غير منطقي (أكثر من 50 سنة)' });
    }
  } else if (!isUpdate) {
    // قيمة افتراضية: تاريخ اليوم
    data.hireDate = new Date().toISOString().split('T')[0];
  }

  // التحقق من نوع العقد - اختياري مع قيمة افتراضية
  if (data.contractType !== undefined && data.contractType !== null && data.contractType.trim().length > 0) {
    const validContractTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'FREELANCE'];
    if (!validContractTypes.includes(data.contractType)) {
      errors.push({ field: 'contractType', message: 'نوع العقد غير صحيح' });
    }
  } else if (!isUpdate) {
    // قيمة افتراضية
    data.contractType = 'FULL_TIME';
  }

  // التحقق من الراتب الأساسي - اختياري مع قيمة افتراضية
  if (data.baseSalary !== undefined && data.baseSalary !== null) {
    if (typeof data.baseSalary !== 'string' || data.baseSalary.trim().length === 0) {
      errors.push({ field: 'baseSalary', message: 'الراتب الأساسي يجب أن يكون نصاً صحيحاً' });
    } else {
      const salary = parseFloat(data.baseSalary);
      if (isNaN(salary) || salary < 0) {
        errors.push({ field: 'baseSalary', message: 'الراتب الأساسي يجب أن يكون رقماً موجباً' });
      }
      if (salary > 1000000) {
        errors.push({ field: 'baseSalary', message: 'الراتب الأساسي يبدو غير منطقي (أكثر من مليون)' });
      }
    }
  } else {
    // إذا لم يتم تقديم الراتب، استخدم قيمة افتراضية
    data.baseSalary = '0';
  }

  // التحقق من الجنس
  if (data.gender) {
    const validGenders = ['MALE', 'FEMALE'];
    if (!validGenders.includes(data.gender)) {
      errors.push({ field: 'gender', message: 'الجنس يجب أن يكون MALE أو FEMALE' });
    }
  }

  // التحقق من القسم - اختياري ولكن يجب التحقق إذا تم إدخاله
  if (data.departmentId && data.departmentId.trim() !== '') {
    if (typeof data.departmentId !== 'string' || data.departmentId.length === 0) {
      errors.push({ field: 'departmentId', message: 'معرف القسم غير صحيح' });
    }
  }

  // التحقق من المنصب - اختياري ولكن يجب التحقق إذا تم إدخاله
  if (data.positionId && data.positionId.trim() !== '') {
    if (typeof data.positionId !== 'string' || data.positionId.length === 0) {
      errors.push({ field: 'positionId', message: 'معرف المنصب غير صحيح' });
    }
  }

  // التحقق من الجنسية - اختياري
  if (data.nationalId) {
    const nationalIdRegex = /^[0-9]{14}$/;
    if (!nationalIdRegex.test(data.nationalId)) {
      errors.push({ field: 'nationalId', message: 'رقم الهوية يجب أن يتكون من 14 رقم' });
    }
  }

  // التحقق من العنوان - اختياري
  if (data.address && data.address.trim().length > 0) {
    if (data.address.length > 500) {
      errors.push({ field: 'address', message: 'العنوان يجب ألا يزيد عن 500 حرف' });
    }
  }

  // التحقق من المدينة - اختياري
  if (data.city && data.city.trim().length > 0) {
    if (data.city.length > 100) {
      errors.push({ field: 'city', message: 'المدينة يجب ألا يزيد عن 100 حرف' });
    }
  }

  // التحقق من الدولة - اختياري
  if (data.country && data.country.trim().length > 0) {
    if (data.country.length > 100) {
      errors.push({ field: 'country', message: 'الدولة يجب ألا يزيد عن 100 حرف' });
    }
  }

  // التحقق من كلمة المرور - مطلوبة عند إنشاء موظف جديد
  if (!isUpdate) {
    if (!data.password || typeof data.password !== 'string' || data.password.trim().length === 0) {
      errors.push({ field: 'password', message: 'كلمة المرور مطلوبة' });
    } else if (data.password.length < 6) {
      errors.push({ field: 'password', message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('فشل التحقق من صحة البيانات', errors);
  }

  return true;
}

/**
 * التحقق من صحة بيانات الحضور
 */
function validateAttendanceData(data) {
  const errors = [];

  // التحقق من التاريخ
  if (data.date) {
    const date = new Date(data.date);
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    if (date > today) {
      errors.push({ field: 'date', message: 'تاريخ الحضور لا يمكن أن يكون في المستقبل' });
    }
    if (date < oneYearAgo) {
      errors.push({ field: 'date', message: 'تاريخ الحضور قديم جداً (أكثر من سنة)' });
    }
  }

  // التحقق من وقت الحضور
  if (data.checkIn) {
    const checkIn = new Date(data.checkIn);
    if (isNaN(checkIn.getTime())) {
      errors.push({ field: 'checkIn', message: 'وقت الحضور غير صحيح' });
    }
  }

  // التحقق من وقت الانصراف
  if (data.checkOut) {
    const checkOut = new Date(data.checkOut);
    if (isNaN(checkOut.getTime())) {
      errors.push({ field: 'checkOut', message: 'وقت الانصراف غير صحيح' });
    }

    if (data.checkIn) {
      const checkIn = new Date(data.checkIn);
      if (checkOut <= checkIn) {
        errors.push({ field: 'checkOut', message: 'وقت الانصراف يجب أن يكون بعد وقت الحضور' });
      }

      const workHours = (checkOut - checkIn) / 3600000;
      if (workHours > 24) {
        errors.push({ field: 'checkOut', message: 'ساعات العمل غير منطقية (أكثر من 24 ساعة)' });
      }
    }
  }

  // التحقق من ساعات العمل
  if (data.workHours !== undefined) {
    const hours = parseFloat(data.workHours);
    if (isNaN(hours) || hours < 0) {
      errors.push({ field: 'workHours', message: 'ساعات العمل يجب أن تكون رقماً موجباً' });
    }
    if (hours > 24) {
      errors.push({ field: 'workHours', message: 'ساعات العمل لا يمكن أن تزيد عن 24 ساعة' });
    }
  }

  // التحقق من الحالة
  if (data.status) {
    const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND', 'REMOTE', 'OVERTIME'];
    if (!validStatuses.includes(data.status)) {
      errors.push({ field: 'status', message: 'حالة الحضور غير صحيحة' });
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('فشل التحقق من صحة بيانات الحضور', errors);
  }

  return true;
}

/**
 * التحقق من صحة بيانات الإجازة
 */
function validateLeaveData(data) {
  const errors = [];

  // التحقق من نوع الإجازة
  if (!data.type) {
    errors.push({ field: 'type', message: 'نوع الإجازة مطلوب' });
  } else {
    const validTypes = ['ANNUAL', 'SICK', 'UNPAID', 'MATERNITY', 'PATERNITY', 'BEREAVEMENT', 'MARRIAGE', 'HAJJ', 'STUDY', 'EMERGENCY', 'OTHER'];
    if (!validTypes.includes(data.type)) {
      errors.push({ field: 'type', message: 'نوع الإجازة غير صحيح' });
    }
  }

  // التحقق من تاريخ البداية
  if (!data.startDate) {
    errors.push({ field: 'startDate', message: 'تاريخ بداية الإجازة مطلوب' });
  } else {
    const startDate = new Date(data.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(startDate.getTime())) {
      errors.push({ field: 'startDate', message: 'تاريخ البداية غير صحيح' });
    }
  }

  // التحقق من تاريخ النهاية
  if (!data.endDate) {
    errors.push({ field: 'endDate', message: 'تاريخ نهاية الإجازة مطلوب' });
  } else {
    const endDate = new Date(data.endDate);

    if (isNaN(endDate.getTime())) {
      errors.push({ field: 'endDate', message: 'تاريخ النهاية غير صحيح' });
    }

    if (data.startDate) {
      const startDate = new Date(data.startDate);
      if (endDate < startDate) {
        errors.push({ field: 'endDate', message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' });
      }

      const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        errors.push({ field: 'endDate', message: 'مدة الإجازة طويلة جداً (أكثر من سنة)' });
      }
    }
  }

  // التحقق من عدد الأيام
  if (data.totalDays !== undefined) {
    const days = parseInt(data.totalDays);
    if (isNaN(days) || days <= 0) {
      errors.push({ field: 'totalDays', message: 'عدد الأيام يجب أن يكون رقماً موجباً' });
    }
    if (days > 365) {
      errors.push({ field: 'totalDays', message: 'عدد الأيام كبير جداً' });
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('فشل التحقق من صحة بيانات الإجازة', errors);
  }

  return true;
}

/**
 * التحقق من صحة بيانات الراتب
 */
function validatePayrollData(data) {
  const errors = [];

  // التحقق من الشهر
  if (data.month !== undefined) {
    const month = parseInt(data.month);
    if (isNaN(month) || month < 1 || month > 12) {
      errors.push({ field: 'month', message: 'الشهر يجب أن يكون بين 1 و 12' });
    }
  }

  // التحقق من السنة
  if (data.year !== undefined) {
    const year = parseInt(data.year);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 2000 || year > currentYear + 1) {
      errors.push({ field: 'year', message: `السنة يجب أن تكون بين 2000 و ${currentYear + 1}` });
    }
  }

  // التحقق من الراتب الأساسي
  if (data.baseSalary !== undefined) {
    const salary = parseFloat(data.baseSalary);
    if (isNaN(salary) || salary < 0) {
      errors.push({ field: 'baseSalary', message: 'الراتب الأساسي يجب أن يكون رقماً موجباً' });
    }
    if (salary > 1000000) {
      errors.push({ field: 'baseSalary', message: 'الراتب الأساسي يبدو غير منطقي' });
    }
  }

  // التحقق من البدلات
  if (data.totalAllowances !== undefined) {
    const allowances = parseFloat(data.totalAllowances);
    if (isNaN(allowances) || allowances < 0) {
      errors.push({ field: 'totalAllowances', message: 'إجمالي البدلات يجب أن يكون رقماً موجباً' });
    }
  }

  // التحقق من الخصومات
  if (data.totalDeductions !== undefined) {
    const deductions = parseFloat(data.totalDeductions);
    if (isNaN(deductions) || deductions < 0) {
      errors.push({ field: 'totalDeductions', message: 'إجمالي الخصومات يجب أن يكون رقماً موجباً' });
    }
  }

  // التحقق من ساعات العمل الإضافي
  if (data.overtimeHours !== undefined) {
    const hours = parseFloat(data.overtimeHours);
    if (isNaN(hours) || hours < 0) {
      errors.push({ field: 'overtimeHours', message: 'ساعات العمل الإضافي يجب أن تكون رقماً موجباً' });
    }
    if (hours > 200) {
      errors.push({ field: 'overtimeHours', message: 'ساعات العمل الإضافي كبيرة جداً' });
    }
  }

  // التحقق من الصافي
  if (data.netSalary !== undefined) {
    const netSalary = parseFloat(data.netSalary);
    if (isNaN(netSalary)) {
      errors.push({ field: 'netSalary', message: 'صافي الراتب يجب أن يكون رقماً' });
    }
    if (netSalary < 0) {
      errors.push({ field: 'netSalary', message: 'صافي الراتب لا يمكن أن يكون سالباً' });
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('فشل التحقق من صحة بيانات الراتب', errors);
  }

  return true;
}

/**
 * التحقق من صحة بيانات القسم
 */
function validateDepartmentData(data) {
  const errors = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push({ field: 'name', message: 'اسم القسم يجب أن يكون نصاً لا يقل عن حرفين' });
  }

  if (data.name && data.name.length > 100) {
    errors.push({ field: 'name', message: 'اسم القسم يجب ألا يزيد عن 100 حرف' });
  }

  if (data.color && !/^#[0-9A-F]{6}$/i.test(data.color)) {
    errors.push({ field: 'color', message: 'لون القسم يجب أن يكون بصيغة HEX صحيحة (مثل #FF5733)' });
  }

  if (errors.length > 0) {
    throw new ValidationError('فشل التحقق من صحة بيانات القسم', errors);
  }

  return true;
}

/**
 * التحقق من صحة بيانات المنصب
 */
function validatePositionData(data) {
  const errors = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 2) {
    errors.push({ field: 'title', message: 'اسم المنصب يجب أن يكون نصاً لا يقل عن حرفين' });
  }

  if (data.title && data.title.length > 100) {
    errors.push({ field: 'title', message: 'اسم المنصب يجب ألا يزيد عن 100 حرف' });
  }

  if (data.level !== undefined) {
    const level = parseInt(data.level);
    if (isNaN(level) || level < 1 || level > 10) {
      errors.push({ field: 'level', message: 'مستوى المنصب يجب أن يكون بين 1 و 10' });
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('فشل التحقق من صحة بيانات المنصب', errors);
  }

  return true;
}

/**
 * التحقق من صحة بيانات الأذونات
 */
function validatePermissionData(data) {
  const errors = [];

  // التحقق من نوع الإذن
  if (!data.type) {
    errors.push({ field: 'type', message: 'نوع الإذن مطلوب' });
  } else {
    const validTypes = ['DEDUCTIBLE', 'NON_DEDUCTIBLE', 'FIXED_HOURS', 'COMPENSATORY'];
    if (!validTypes.includes(data.type)) {
      errors.push({ field: 'type', message: 'نوع الإذن غير صحيح' });
    }
  }

  // التحقق من التاريخ
  if (!data.date) {
    errors.push({ field: 'date', message: 'تاريخ الإذن مطلوب' });
  } else {
    const date = new Date(data.date);
    if (isNaN(date.getTime())) {
      errors.push({ field: 'date', message: 'التاريخ غير صحيح' });
    }
  }

  // التحقق من وقت البداية والنهاية
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!data.startTime || !timeRegex.test(data.startTime)) {
    errors.push({ field: 'startTime', message: 'وقت البداية غير صحيح (HH:mm)' });
  }
  if (!data.endTime || !timeRegex.test(data.endTime)) {
    errors.push({ field: 'endTime', message: 'وقت النهاية غير صحيح (HH:mm)' });
  }

  // التحقق من عدد الساعات
  if (data.totalHours !== undefined) {
    const hours = parseFloat(data.totalHours);
    if (isNaN(hours) || hours <= 0) {
      errors.push({ field: 'totalHours', message: 'عدد الساعات يجب أن يكون رقماً موجباً' });
    }
    if (hours > 24) {
      errors.push({ field: 'totalHours', message: 'عدد الساعات لا يمكن أن يزيد عن 24 ساعة' });
    }
  }

  if (!data.reason || data.reason.trim().length < 3) {
    errors.push({ field: 'reason', message: 'سبب الإذن مطلوب' });
  }

  if (errors.length > 0) {
    throw new ValidationError('فشل التحقق من صحة بيانات الإذن', errors);
  }

  return true;
}

module.exports = {
  validateEmployeeData,
  validateAttendanceData,
  validateLeaveData,
  validatePayrollData,
  validateDepartmentData,
  validatePositionData,
  validatePermissionData
};
