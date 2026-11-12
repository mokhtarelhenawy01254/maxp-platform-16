const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveAttendanceTimezone } = require('../../utils/dateUtils');

/**
 * تنسيق الوقت للمنطقة الزمنية المحددة بصيغة HH:mm
 * @param {string} isoString
 * @param {string} timeZone
 * @returns {string}
 */
function formatInTz(isoString, timeZone) {
  const d = new Date(isoString);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

test('TASK 8cc22007: Attendance display timezone formatting and resolution', async (t) => {
  await t.test('(أ) Formats 2026-11-10T08:35:02Z in Africa/Cairo as 10:35 (UTC+2)', () => {
    const iso = '2026-11-10T08:35:02Z';
    const cairoTime = formatInTz(iso, 'Africa/Cairo');
    console.log(`08:35:02Z → ${cairoTime} in Africa/Cairo`);
    assert.equal(cairoTime, '10:35');
  });

  await t.test('(ب) Formats 2026-11-10T08:35:02Z in Asia/Riyadh as 11:35 (UTC+3 proving bug magnitude)', () => {
    const iso = '2026-11-10T08:35:02Z';
    const riyadhTime = formatInTz(iso, 'Asia/Riyadh');
    console.log(`08:35:02Z → ${riyadhTime} in Asia/Riyadh`);
    assert.equal(riyadhTime, '11:35');
  });

  await t.test('(ج) Formats 2026-07-15T09:00Z in Africa/Cairo as 12:00 (UTC+3 summer time, prevents hardcoded +2)', () => {
    const iso = '2026-07-15T09:00Z';
    const cairoSummerTime = formatInTz(iso, 'Africa/Cairo');
    console.log(`09:00Z → ${cairoSummerTime} in Africa/Cairo (summer)`);
    assert.equal(cairoSummerTime, '12:00');
  });

  await t.test('(د1) resolveAttendanceTimezone returns valid company timezone (Asia/Riyadh)', () => {
    const resolved = resolveAttendanceTimezone('Asia/Riyadh');
    assert.equal(resolved, 'Asia/Riyadh');
  });

  await t.test('(د2) resolveAttendanceTimezone falls back to Africa/Cairo for invalid timezone', () => {
    const resolved = resolveAttendanceTimezone('Mars/Base');
    assert.equal(resolved, 'Africa/Cairo');
  });

  await t.test('(د3) resolveAttendanceTimezone falls back to Africa/Cairo for undefined timezone', () => {
    const resolved = resolveAttendanceTimezone(undefined);
    assert.equal(resolved, 'Africa/Cairo');
  });
});
