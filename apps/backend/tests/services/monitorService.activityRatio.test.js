/**
 * 🚨 PRODUCTION-FIX (2026-09-29) — حرس انحدار لمشكلة ظهرت فعليًا في الإنتاج:
 *
 * `getTeamOverview` كانت بترجّع الحقل `activityRatio,` كمتغيّر **غير معرّف** في الدالة كلها
 * (النسبة كانت متحسبة فعلًا باسم `activeRatio`)، فكانت ترمي
 *   ReferenceError: activityRatio is not defined  →  500 على
 *   GET /api/v1/employee-monitor/team/overview
 * وصفحة /hr/monitor كلها بتقع (شاهد حقيقي من [FRONTEND-ERROR]: url=https://maxp.online/hr/monitor).
 *
 * المشكلة كانت خطأ اسم بس، فالحرس هنا على المصدر نفسه: الحقل لازم يكون مربوط بالحساب الموجود،
 * وميصحّش يفضل فيه استخدام مجرّد للمتغيّر الغلط.
 */
const fs = require('fs');
const path = require('path');

const SRC_PATH = path.resolve(__dirname, '../../services/monitorService.js');
const SRC = fs.readFileSync(SRC_PATH, 'utf8');

describe('monitorService.getTeamOverview — activityRatio binding (production 500 guard)', () => {
  test('الحقل activityRatio مربوط بالمتغيّر المحسوب activeRatio', () => {
    expect(SRC).toMatch(/activityRatio\s*:\s*activeRatio/);
  });

  test('مفيش استخدام مجرّد للمتغيّر غير المعرّف activityRatio في الكائن', () => {
    // سطر زي "        activityRatio," = المتغيّر العاري اللي كان بيرمي ReferenceError
    expect(SRC).not.toMatch(/^\s*activityRatio\s*,\s*$/m);
  });

  test('النسبة لسه بتتحسب ومقصوصة على 100 (نسبة مئوية زي ما الواجهة بتعرضها)', () => {
    expect(SRC).toMatch(/const\s+activeRatio\s*=/);
    expect(SRC).toMatch(/Math\.min\(\s*100\s*,\s*Math\.round\(/);
  });

  test('الواجهة بتقرا الحقل بنفس الاسم — تثبيت العقد بين الباك والفرونت', () => {
    const fePath = path.resolve(
      __dirname,
      '../../../frontend/src/pages/hr/monitor/MonitorDashboard.tsx'
    );
    const fe = fs.readFileSync(fePath, 'utf8');
    expect(fe).toMatch(/activityRatio/);
  });
});
