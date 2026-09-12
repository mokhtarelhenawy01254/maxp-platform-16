/**
 * 📅 Date Utilities for Egypt Timezone
 * جميع دوال التاريخ والوقت مضبوطة على توقيت مصر (Africa/Cairo)
 */

const EGYPT_TIMEZONE = 'Africa/Cairo';

function getDateStringInTimezone(date = new Date(), timezone = EGYPT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(date));

  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  const day = parts.find(part => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error(`Unable to format date for timezone ${timezone}`);
  }

  return `${year}-${month}-${day}`;
}

/**
 * الحصول على التاريخ الحالي بتوقيت مصر
 */
function getNowInEgypt() {
  return getNowInTimezone(EGYPT_TIMEZONE);
}

/**
 * ✅ FIX: الحصول على الوقت الحالي (UTC)
 * Data is stored in UTC in the database. We simply return new Date() which is the
 * current moment in UTC. Timezone-aware display is handled at the presentation layer.
 */
function getNowInTimezone(timezone = EGYPT_TIMEZONE) {
  // ✅ Return the current UTC time — this is accurate for storage
  return new Date();
}

/**
 * الحصول على بداية اليوم بتوقيت مصر
 */
function getStartOfDayInEgypt(date = new Date()) {
  return getStartOfDayInTimezone(date, EGYPT_TIMEZONE);
}

/**
 * ✅ الحصول على بداية اليوم في منطقة زمنية محددة
 * Returns a Date object whose UTC timestamp = midnight of that day in the given timezone.
 * Example: For Egypt (UTC+2), midnight = 22:00 UTC of the previous calendar day.
 */
function getStartOfDayInTimezone(date = new Date(), timezone = EGYPT_TIMEZONE) {
  let dateStr;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    dateStr = date.trim();
  } else {
    dateStr = getDateStringInTimezone(new Date(date), timezone);
  }

  // Now we need "midnight in target timezone" expressed as UTC.
  // We find the actual UTC offset for this specific date/timezone.
  const midnightLocalString = `${dateStr}T00:00:00`;
  // Create a "fake UTC" date and find offset by comparing
  const testDate = new Date(midnightLocalString + 'Z'); // treat as UTC temporarily
  const localMidnight = new Date(testDate.toLocaleString('en-US', { timeZone: timezone }));
  const utcMidnight = new Date(testDate.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offsetMs = localMidnight.getTime() - utcMidnight.getTime();

  // Shift the "fake UTC midnight" back by the offset to get true UTC midnight for that TZ
  return new Date(testDate.getTime() - offsetMs);
}

/**
 * ✅ Normalize a local calendar day to the UTC-midnight representation used by @db.Date fields.
 * Example: 2026-04-02 in Cairo => 2026-04-02T00:00:00.000Z
 */
function normalizeDateForDb(date = new Date(), timezone = EGYPT_TIMEZONE) {
  const dateStr = getDateStringInTimezone(date, timezone);
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/**
 * الحصول على نهاية اليوم بتوقيت مصر
 */
function getEndOfDayInEgypt(date = new Date()) {
  return getEndOfDayInTimezone(date, EGYPT_TIMEZONE);
}

/**
 * الحصول على نهاية اليوم في منطقة زمنية محددة
 */
function getEndOfDayInTimezone(date = new Date(), timezone = EGYPT_TIMEZONE) {
  let dateStr;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    dateStr = date.trim();
  } else {
    dateStr = getDateStringInTimezone(new Date(date), timezone);
  }

  const endLocalString = `${dateStr}T23:59:59.999`;
  const testDate = new Date(endLocalString + 'Z');
  const localTime = new Date(testDate.toLocaleString('en-US', { timeZone: timezone }));
  const utcTime = new Date(testDate.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offsetMs = localTime.getTime() - utcTime.getTime();

  return new Date(testDate.getTime() - offsetMs);
}

/**
 * ✅ تحويل startDate و endDate إلى نطاق زمني Prisma ({ gte?, lte? }) مع مراعاة المنطقة الزمنية (Timezone)
 * يدعم صيغ: YYYY-MM-DD أو سلاسل/كائنات التاريخ الكاملة
 */
function buildDateRangeFilter(startDate, endDate, timezone = EGYPT_TIMEZONE) {
  const filter = {};
  if (startDate) {
    const s = typeof startDate === 'string' ? startDate.trim() : startDate;
    if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
      filter.gte = getStartOfDayInTimezone(s, timezone);
    } else {
      const d = new Date(s);
      if (!isNaN(d.getTime())) filter.gte = d;
    }
  }
  if (endDate) {
    const e = typeof endDate === 'string' ? endDate.trim() : endDate;
    if (typeof e === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e)) {
      filter.lte = getEndOfDayInTimezone(e, timezone);
    } else {
      const d = new Date(e);
      if (!isNaN(d.getTime())) filter.lte = d;
    }
  }
  return filter;
}

/**
 * تحويل تاريخ إلى بداية اليوم
 */
function toStartOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * تحويل تاريخ إلى نهاية اليوم
 */
function toEndOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * دمج تاريخ مع وقت (HH:mm) بدقة توقيت مصر
 */
function combineDateAndTime(date, timeString, timezone = EGYPT_TIMEZONE) {
  if (!timeString || !timeString.trim()) {
    return null;
  }

  const [hours, minutes] = timeString.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    return null;
  }

  // الحصول على التاريخ بصيغة YYYY-MM-DD في المنطقة الزمنية المستهدفة
  const dateStr = getDateStringInTimezone(new Date(date), timezone);

  // Build local wall-clock string for that date+time in the target timezone
  const wallClockStr = `${dateStr}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

  // Convert wall-clock time in target timezone → UTC
  const testDate = new Date(wallClockStr + 'Z'); // fake UTC
  const localTime  = new Date(testDate.toLocaleString('en-US', { timeZone: timezone }));
  const utcTime    = new Date(testDate.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offsetMs   = localTime.getTime() - utcTime.getTime();

  return new Date(testDate.getTime() - offsetMs);
}

/**
 * تنسيق التاريخ والوقت للعرض بالعربية
 */
function formatDateTimeArabic(date) {
  if (!date) return '-';

  return new Date(date).toLocaleString('ar-EG', {
    timeZone: EGYPT_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * تنسيق الوقت فقط للعرض بالعربية
 */
function formatTimeArabic(date) {
  if (!date) return '-';

  return new Date(date).toLocaleTimeString('ar-EG', {
    timeZone: EGYPT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * تنسيق التاريخ فقط للعرض بالعربية
 */
function formatDateArabic(date) {
  if (!date) return '-';

  return new Date(date).toLocaleDateString('ar-EG', {
    timeZone: EGYPT_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * الحصول على مدى تاريخي (من تاريخ إلى تاريخ)
 */
function getDateRange(startDate, endDate) {
  const dates = [];
  const start = toStartOfDay(new Date(startDate));
  const end = toStartOfDay(new Date(endDate));

  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * حساب الفرق بالدقائق بين تاريخين
 */
function getDifferenceInMinutes(date1, date2) {
  return Math.floor((date2 - date1) / 60000);
}

/**
 * حساب الفرق بالساعات بين تاريخين
 */
function getDifferenceInHours(date1, date2) {
  return (date2 - date1) / 3600000;
}

/**
 * التحقق من أن التاريخ هو اليوم
 */
function isToday(date) {
  const today = getStartOfDayInEgypt();
  const checkDate = getStartOfDayInEgypt(date);
  return today.getTime() === checkDate.getTime();
}

/**
 * إضافة أيام لتاريخ معين
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * إضافة ساعات لتاريخ معين
 */
function addHours(date, hours) {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

/**
 * إضافة دقائق لتاريخ معين
 */
function addMinutes(date, minutes) {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

module.exports = {
  EGYPT_TIMEZONE,
  // Generic Timezone Functions
  getNowInTimezone,
  getStartOfDayInTimezone,
  getEndOfDayInTimezone,
  getDateStringInTimezone,
  normalizeDateForDb,
  buildDateRangeFilter,
  // Legacy Egypt Wrappers
  getNowInEgypt,
  getStartOfDayInEgypt,
  getEndOfDayInEgypt,
  toStartOfDay,
  toEndOfDay,
  combineDateAndTime,
  formatDateTimeArabic,
  formatTimeArabic,
  formatDateArabic,
  getDateRange,
  getDifferenceInMinutes,
  getDifferenceInHours,
  isToday,
  addDays,
  addHours,
  addMinutes
};
