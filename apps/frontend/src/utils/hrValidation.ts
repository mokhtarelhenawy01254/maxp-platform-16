/**
 * 🔍 HR Frontend Validation Utilities
 * مكتبة التحقق من صحة البيانات في واجهة نظام الموارد البشرية
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * التحقق من البريد الإلكتروني
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * التحقق من رقم الهاتف المصري
 */
export const validateEgyptianPhone = (phone: string): boolean => {
  if (!phone) return false;
  const ascii = String(phone)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .trim();
  const digits = ascii.replace(/\D/g, "");
  let normalized = digits;
  if (normalized.startsWith("0020")) normalized = "0" + normalized.slice(4);
  else if (normalized.startsWith("2001") && normalized.length === 13) normalized = "0" + normalized.slice(3);
  else if (normalized.startsWith("201") && normalized.length === 12) normalized = "0" + normalized.slice(2);
  return /^01[0-9]{9}$/.test(normalized);
};

/**
 * التحقق من رقم الهوية المصري
 */
export const validateNationalId = (nationalId: string): boolean => {
  const nationalIdRegex = /^[0-9]{14}$/;
  return nationalIdRegex.test(nationalId);
};

/**
 * التحقق من صحة بيانات الموظف
 */
export const validateEmployeeData = (
  data: any,
  options?: { isExistingUser?: boolean }
): ValidationResult => {
  const errors: ValidationError[] = [];

  // الاسم الأول
  if (!data.firstName || data.firstName.trim().length < 2) {
    errors.push({
      field: "firstName",
      message: "الاسم الأول يجب أن يكون على الأقل حرفين",
    });
  }
  if (data.firstName && data.firstName.length > 50) {
    errors.push({
      field: "firstName",
      message: "الاسم الأول يجب ألا يزيد عن 50 حرف",
    });
  }

  // الاسم الأخير
  if (!data.lastName || data.lastName.trim().length < 2) {
    errors.push({
      field: "lastName",
      message: "الاسم الأخير يجب أن يكون على الأقل حرفين",
    });
  }
  if (data.lastName && data.lastName.length > 50) {
    errors.push({
      field: "lastName",
      message: "الاسم الأخير يجب ألا يزيد عن 50 حرف",
    });
  }

  // البريد الإلكتروني
  if (data.email && !validateEmail(data.email)) {
    errors.push({
      field: "email",
      message: "البريد الإلكتروني غير صحيح",
    });
  }

  // رقم الهاتف
  if (data.phone && !validateEgyptianPhone(data.phone)) {
    errors.push({
      field: "phone",
      message: "رقم الهاتف غير صحيح (يجب أن يبدأ بـ 01 ويتكون من 11 رقم)",
    });
  }

  // تاريخ الميلاد
  if (data.dateOfBirth) {
    const birthDate = new Date(data.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();

    if (birthDate > today) {
      errors.push({
        field: "dateOfBirth",
        message: "تاريخ الميلاد لا يمكن أن يكون في المستقبل",
      });
    }
    if (age < 16) {
      errors.push({
        field: "dateOfBirth",
        message: "عمر الموظف يجب أن يكون 16 سنة على الأقل",
      });
    }
    if (age > 70) {
      errors.push({
        field: "dateOfBirth",
        message: "عمر الموظف يجب ألا يزيد عن 70 سنة",
      });
    }
  }

  // تاريخ التعيين
  if (data.hireDate) {
    const hireDate = new Date(data.hireDate);
    const today = new Date();

    if (hireDate > today) {
      errors.push({
        field: "hireDate",
        message: "تاريخ التعيين لا يمكن أن يكون في المستقبل",
      });
    }
  }

  // الراتب الأساسي
  if (data.baseSalary !== undefined && data.baseSalary !== "") {
    const salary = parseFloat(data.baseSalary);
    if (isNaN(salary) || salary < 0) {
      errors.push({
        field: "baseSalary",
        message: "الراتب الأساسي يجب أن يكون رقماً موجباً",
      });
    }
    if (salary > 1000000) {
      errors.push({
        field: "baseSalary",
        message: "الراتب الأساسي يبدو غير منطقي (أكثر من مليون)",
      });
    }
  }

  // رقم الهوية
  if (data.nationalId && !validateNationalId(data.nationalId)) {
    errors.push({
      field: "nationalId",
      message: "رقم الهوية يجب أن يتكون من 14 رقم",
    });
  }

  // كلمة المرور (مطلوبة فقط للمستخدمين الجدد غير المسجلين بالمنصة)
  if (!options?.isExistingUser) {
    if (!data.password || data.password.trim().length === 0) {
      errors.push({
        field: "password",
        message: "كلمة المرور مطلوبة",
      });
    } else if (data.password.length < 6) {
      errors.push({
        field: "password",
        message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * التحقق من صحة بيانات الإجازة
 */
export const validateLeaveData = (data: any): ValidationResult => {
  const errors: ValidationError[] = [];

  // نوع الإجازة
  if (!data.type) {
    errors.push({
      field: "type",
      message: "نوع الإجازة مطلوب",
    });
  }

  // تاريخ البداية
  if (!data.startDate) {
    errors.push({
      field: "startDate",
      message: "تاريخ بداية الإجازة مطلوب",
    });
  }

  // تاريخ النهاية
  if (!data.endDate) {
    errors.push({
      field: "endDate",
      message: "تاريخ نهاية الإجازة مطلوب",
    });
  }

  // التحقق من أن تاريخ النهاية بعد تاريخ البداية
  if (data.startDate && data.endDate) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate < startDate) {
      errors.push({
        field: "endDate",
        message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية",
      });
    }

    const daysDiff =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      errors.push({
        field: "endDate",
        message: "مدة الإجازة طويلة جداً (أكثر من سنة)",
      });
    }
  }

  // السبب (مطلوب لبعض أنواع الإجازات)
  if (["SICK", "EMERGENCY", "OTHER"].includes(data.type) && !data.reason) {
    errors.push({
      field: "reason",
      message: "السبب مطلوب لهذا النوع من الإجازات",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * التحقق من صحة بيانات القسم
 */
export const validateDepartmentData = (data: any): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push({
      field: "name",
      message: "اسم القسم يجب أن يكون على الأقل حرفين",
    });
  }

  if (data.name && data.name.length > 100) {
    errors.push({
      field: "name",
      message: "اسم القسم يجب ألا يزيد عن 100 حرف",
    });
  }

  if (data.color && !/^#[0-9A-F]{6}$/i.test(data.color)) {
    errors.push({
      field: "color",
      message: "لون القسم يجب أن يكون بصيغة HEX صحيحة (مثل #FF5733)",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * التحقق من صحة بيانات الحضور اليدوي
 */
export const validateManualAttendanceData = (data: any): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!data.date) {
    errors.push({
      field: "date",
      message: "التاريخ مطلوب",
    });
  }

  if (!data.employeeId) {
    errors.push({
      field: "employeeId",
      message: "الموظف مطلوب",
    });
  }

  if (data.checkIn && data.checkOut) {
    const checkIn = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);

    if (checkOut <= checkIn) {
      errors.push({
        field: "checkOut",
        message: "وقت الانصراف يجب أن يكون بعد وقت الحضور",
      });
    }

    const workHours = (checkOut.getTime() - checkIn.getTime()) / 3600000;
    if (workHours > 24) {
      errors.push({
        field: "checkOut",
        message: "ساعات العمل غير منطقية (أكثر من 24 ساعة)",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * عرض رسائل الأخطاء
 */
export const getErrorMessage = (
  errors: ValidationError[],
  field: string,
): string | undefined => {
  const error = errors.find((e) => e.field === field);
  return error?.message;
};

/**
 * التحقق من وجود أخطاء لحقل معين
 */
export const hasError = (errors: ValidationError[], field: string): boolean => {
  return errors.some((e) => e.field === field);
};
