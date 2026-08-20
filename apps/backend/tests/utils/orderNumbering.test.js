const {
  generateOrderStudyNumber,
  generateStudyNumber,
  deriveAccession,
} = require('../../utils/orderNumbering');

const DATE = new Date('2026-08-14T12:00:00.000Z');

describe('utils/orderNumbering', () => {
  describe('generateOrderStudyNumber', () => {
    test('formats the bookingNo padded to 4 digits', () => {
      expect(generateOrderStudyNumber({ bookingNo: 7, date: DATE })).toBe('ORD-20260814-0007');
    });

    test('keeps a 4+ digit bookingNo as-is', () => {
      expect(generateOrderStudyNumber({ bookingNo: 1234, date: DATE })).toBe('ORD-20260814-1234');
      expect(generateOrderStudyNumber({ bookingNo: 10001, date: DATE })).toBe('ORD-20260814-10001');
    });

    test('falls back to a 6-digit time sequence when bookingNo is missing', () => {
      expect(generateOrderStudyNumber({ date: DATE })).toMatch(/^ORD-20260814-\d{6}$/);
      expect(generateOrderStudyNumber({})).toMatch(/^ORD-\d{8}-\d{6}$/);
    });
  });

  describe('generateStudyNumber', () => {
    test('appends the exam letter per index', () => {
      expect(generateStudyNumber({ bookingNo: 5, examIndex: 0, date: DATE })).toBe('ORD-20260814-0005-A');
      expect(generateStudyNumber({ bookingNo: 5, examIndex: 1, date: DATE })).toBe('ORD-20260814-0005-B');
      expect(generateStudyNumber({ bookingNo: 5, examIndex: 24, date: DATE })).toBe('ORD-20260814-0005-Y');
      expect(generateStudyNumber({ bookingNo: 5, examIndex: 25, date: DATE })).toBe('ORD-20260814-0005-Z');
    });

    test('uses A1/B1 style letters beyond 26 exams', () => {
      expect(generateStudyNumber({ bookingNo: 5, examIndex: 26, date: DATE })).toBe('ORD-20260814-0005-A1');
      expect(generateStudyNumber({ bookingNo: 5, examIndex: 27, date: DATE })).toBe('ORD-20260814-0005-B1');
      expect(generateStudyNumber({ bookingNo: 5, examIndex: 52, date: DATE })).toBe('ORD-20260814-0005-A2');
    });

    test('sibling studies share the order prefix but differ by letter', () => {
      const a = generateStudyNumber({ bookingNo: 9, examIndex: 0, date: DATE });
      const b = generateStudyNumber({ bookingNo: 9, examIndex: 1, date: DATE });
      expect(a).not.toBe(b);
      expect(deriveAccession(a)).toBe(deriveAccession(b));
      expect(deriveAccession(a)).toBe('ORD-20260814-0009');
    });
  });

  describe('deriveAccession', () => {
    test('returns the part before the last hyphen', () => {
      expect(deriveAccession('ORD-20260814-0005-A')).toBe('ORD-20260814-0005');
      expect(deriveAccession('ORD-20260814-0005-A1')).toBe('ORD-20260814-0005');
    });

    test('returns null for empty input', () => {
      expect(deriveAccession(null)).toBeNull();
      expect(deriveAccession(undefined)).toBeNull();
      expect(deriveAccession('')).toBeNull();
    });
  });
});
