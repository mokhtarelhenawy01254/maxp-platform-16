/**
 * Tenant-driven Meta body params — regression guard for the 2026-10-20 incident.
 *
 * The old code derived the number of body params from a *static* expected list and
 * blindly trimmed the longer source, which produced META_PARAM_COUNT_MISMATCH /
 * 132018 on real tenant templates whose variable count differed. These tests pin
 * the rule: the tenant's own template row is the single source of truth, and any
 * mismatch means "do not send" (one explicit mismatch) — never a scrambled message.
 */
const {
  resolveTemplateVariableOrder,
  planMetaBodyParams,
  buildMetaBodyParams,
} = require('../utils/metaTemplateVariables');

describe('resolveTemplateVariableOrder — مصدر الحقيقة = صف قالب الشركة', () => {
  test('variables مخزّنة كـJSON string بترتيبها الصحيح', () => {
    const t = { variables: '["customerName","points","balance"]', content: 'x' };
    const r = resolveTemplateVariableOrder(t);
    expect(r.source).toBe('db_variables');
    expect(r.names).toEqual(['customerName', 'points', 'balance']);
  });

  test('variables مخزّنة كـ[{position,name}] بنفس الترتيب', () => {
    const t = {
      variables: [
        { position: 1, name: 'customerName' },
        { position: 2, name: 'cashAmount' },
      ],
    };
    expect(resolveTemplateVariableOrder(t).names).toEqual(['customerName', 'cashAmount']);
  });

  test('بتشيل التكرار وتحافظ على أول ظهور', () => {
    const t = { variables: ['customerName', 'customerName', 'points'] };
    expect(resolveTemplateVariableOrder(t).names).toEqual(['customerName', 'points']);
  });

  test('variables فاضي/تالف → fallback على نص القالب المحلي بترتيب الplaceholders', () => {
    const t = { variables: 'NOT-JSON', content: 'أهلاً {{customerName}} نقاطك {{points}} ورصيدك {{balance}}' };
    const r = resolveTemplateVariableOrder(t);
    expect(r.source).toBe('local_content');
    expect(r.names).toEqual(['customerName', 'points', 'balance']);
  });

  test('مفيش أي مصدر → none وقائمة فاضية', () => {
    expect(resolveTemplateVariableOrder(null)).toEqual({ names: [], source: 'none' });
    expect(resolveTemplateVariableOrder({})).toEqual({ names: [], source: 'none' });
  });
});

describe('planMetaBodyParams — مطابقة عدد المتغيرات مع القالب المعتمد', () => {
  test('قالب 3 متغيرات + ميتا 3 → ok وبترتيب 1..3', () => {
    const plan = planMetaBodyParams({
      template: { variables: ['customerName', 'points', 'balance'] },
      metaParamCount: 3,
    });
    expect(plan.ok).toBe(true);
    expect(plan.reason).toBeNull();
    expect(plan.expected).toBe(3);
    expect(plan.actual).toBe(3);
    expect(plan.order.map(o => o.position)).toEqual([1, 2, 3]);
    expect(plan.order.map(o => o.name)).toEqual(['customerName', 'points', 'balance']);
  });

  test('قالب 3 متغيرات + ميتا 4 (القالب المعتمد أكبر) → mismatch وترتيب فاضي (صفر إرسال)', () => {
    const plan = planMetaBodyParams({
      template: { variables: ['customerName', 'points', 'balance'] },
      metaParamCount: 4,
    });
    expect(plan.ok).toBe(false);
    expect(plan.reason).toBe('template_param_mismatch');
    expect(plan.expected).toBe(4);
    expect(plan.actual).toBe(3);
    expect(plan.order).toEqual([]);
  });

  test('قالب 4 متغيرات + ميتا 2 → بيسقط الذيل ويبعت 2 (trimmed معلّم)', () => {
    const plan = planMetaBodyParams({
      template: { variables: ['customerName', 'cashAmount', 'currency', 'balance'] },
      metaParamCount: 2,
    });
    expect(plan.ok).toBe(true);
    expect(plan.expected).toBe(2);
    expect(plan.actual).toBe(4);
    expect(plan.trimmed).toBe(true);
    expect(plan.dropped).toEqual(['currency', 'balance']);
    expect(plan.order.map(o => o.name)).toEqual(['customerName', 'cashAmount']);
  });

  test('قالب 2 متغيرات + ميتا 3 → mismatch (مستحيل نختلق القيمة الثالثة)', () => {
    const plan = planMetaBodyParams({
      template: { variables: ['customerName', 'cashAmount'] },
      metaParamCount: 3,
    });
    expect(plan.ok).toBe(false);
    expect(plan.reason).toBe('template_param_mismatch');
    expect(plan.expected).toBe(3);
    expect(plan.actual).toBe(2);
  });

  test('عدد ميتا غير معروف (0) → بنعتمد صف القالب وبنعتبره مطابق', () => {
    const plan = planMetaBodyParams({
      template: { variables: ['customerName', 'points'] },
      metaParamCount: 0,
    });
    expect(plan.ok).toBe(true);
    expect(plan.expected).toBe(2);
    expect(plan.source).toBe('db_variables');
  });

  test('قالب بلا متغيرات → no_template_variables', () => {
    const plan = planMetaBodyParams({ template: { variables: [] }, metaParamCount: 0 });
    expect(plan.ok).toBe(false);
    expect(plan.reason).toBe('no_template_variables');
  });
});

describe('التكامل: خطة القالب بتبني payload بنفس الترتيب (بدون إزاحة قيم)', () => {
  test('قيم كل متغير بتقع في مركزها الصح', () => {
    const template = { variables: ['customerName', 'cashAmount', 'balance'] };
    const plan = planMetaBodyParams({ template, metaParamCount: 3 });
    const body = buildMetaBodyParams(plan.order, template.content, {
      customerName: 'أحمد',
      cashAmount: '150',
      balance: '320',
    });
    expect(body.map(b => b.text)).toEqual(['أحمد', '150', '320']);
  });

  test('شركتين بقوالب مختلفة الأحجام → كل واحدة بتاخد خطة بعدد قالبها', () => {
    const a = planMetaBodyParams({ template: { variables: ['customerName', 'points'] }, metaParamCount: 2 });
    const b = planMetaBodyParams({
      template: { variables: ['customerName', 'points', 'expiryDate', 'currentBalance'] },
      metaParamCount: 4,
    });
    expect([a.ok, a.expected]).toEqual([true, 2]);
    expect([b.ok, b.expected]).toEqual([true, 4]);

    const bodyA = buildMetaBodyParams(a.order, null, { customerName: 'A', points: '10' });
    const bodyB = buildMetaBodyParams(b.order, null, {
      customerName: 'B', points: '20', expiryDate: '2026-11-01', currentBalance: '80',
    });
    expect(bodyA).toHaveLength(2);
    expect(bodyB).toHaveLength(4);
    expect(bodyB[1].text).toBe('20');
    expect(bodyB[3].text).toBe('80');
  });
});
