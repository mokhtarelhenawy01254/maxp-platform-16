/**
 * Unified order/study numbering for radiology.
 *
 * Every booking converts to one order number `ORD-YYYYMMDD-<seq>` shared by all
 * its studies (stored on each study as `accessionNumber`), and every study gets
 * a unique study number `ORD-YYYYMMDD-<seq>-<LETTER>` where the letter reflects
 * the exam index inside the booking (0→A, 25→Z, 26→A1, 27→B1, ...).
 */

const { getDateStringInTimezone } = require('./dateUtils');

const datePart = (date) => {
  const d = date && date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return getDateStringInTimezone(d).replace(/-/g, '');
};

const orderSeq = (bookingNo) => {
  if (bookingNo !== undefined && bookingNo !== null && bookingNo !== '') {
    return String(bookingNo).padStart(4, '0');
  }
  return String(Date.now()).slice(-6);
};

/**
 * رقم الطلب المشترك لكل فحوصات الحجز: ORD-YYYYMMDD-<seq>
 */
function generateOrderStudyNumber({ bookingNo, date } = {}) {
  return `ORD-${datePart(date)}-${orderSeq(bookingNo)}`;
}

const examLetter = (index) => {
  const i = Number.isFinite(Number(index)) ? Math.max(0, Math.floor(Number(index))) : 0;
  if (i < 26) return String.fromCharCode(65 + i);
  return `${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26)}`;
};

/**
 * رقم حالة فريد: ORD-YYYYMMDD-<seq>-<LETTER>
 */
function generateStudyNumber({ bookingNo, examIndex = 0, date } = {}) {
  return `${generateOrderStudyNumber({ bookingNo, date })}-${examLetter(examIndex)}`;
}

/**
 * استخراج رقم الطلب المشترك من رقم الحالة (الجزء قبل آخر -).
 */
function deriveAccession(studyNumber) {
  if (!studyNumber) return null;
  const s = String(studyNumber);
  const idx = s.lastIndexOf('-');
  if (idx <= 0) return s;
  return s.slice(0, idx);
}

module.exports = { generateOrderStudyNumber, generateStudyNumber, deriveAccession };
