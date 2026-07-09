/**
 * Run on production server: insert policies + trigger knowledge embedding sync.
 * Copy: scp scripts/physio-insert-and-sync.js root@153.92.223.119:/tmp/
 * Run:  node /tmp/physio-insert-and-sync.js
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://u339372869_max:0165676135Aa%40A@92.113.22.70:5432/u339372869_max',
});

const COMPANY_ID = 'cmqpbuw3y3oq1ju40or3mr8it';

const POLICIES = [
  { title: 'سياسة إلغاء الحجز', content: 'يمكن إلغاء الحجز قبل الموعد بـ 24 ساعة على الأقل. في حالة الإلغاء بعد ذلك يتم احتساب رسوم إلغاء بقيمة 50% من قيمة الجلسة. يمكن إعادة جدولة الموعد مجاناً مرة واحدة بشرط الإخطار قبل 12 ساعة.', category: 'general', tags: 'إلغاء, إعادة جدولة, رسوم, مواعيد' },
  { title: 'سياسة التامين الطبي', content: 'نحن نتعامل مع عدد من شركات التأمين الطبي تشمل: مصر للتأمين، أليانز، AXA، وGIG. يرجى التواصل مع الاستقبال لتأكيد تغطية وثيقتكم قبل الحجز.', category: 'insurance', tags: 'تأمين, شركات تأمين, تغطية' },
  { title: 'تعليمات ما قبل الجلسة', content: 'يرجى الحضور قبل الموعد بـ 15 دقيقة. ارتداء ملابس رياضية مريحة. إحضار التقارير الطبية السابقة. يمنع تناول الطعام قبل الجلسة بساعتين.', category: 'preparation', tags: 'تعليمات, تحضير, ملابس, تقارير' },
  { title: 'سياسة الخصوصية', content: 'جميع بيانات المرضى محفوظة بسرية تامة وفقاً لقانون حماية البيانات. لا يتم مشاركة أي معلومات طبية أو شخصية مع أطراف ثالثة دون موافقة خطية.', category: 'privacy', tags: 'خصوصية, بيانات, سرية' },
  { title: 'أسعار الجلسات والباقات', content: 'أسعار الجلسات تبدأ من 150 جنيهاً. باقة 6 جلسات بسعر 750 جنيهاً. باقة 12 جلسة بسعر 1350 جنيهاً. باقة 20 جلسة بسعر 2000 جنيهاً. الأطفال وكبار السن خصم إضافي 10%.', category: 'pricing', tags: 'أسعار, باقات, خصم, جلسات' },
  { title: 'مواعيد العمل', content: 'أيام الرجال: السبت، الاثنين، الأربعاء 3-9 م. أيام النساء: الأحد، الثلاثاء، الخميس 3-9 م. الجمعة إجازة. آخر حجز 8 م.', category: 'general', tags: 'مواعيد, أيام, دوام' },
];

async function main() {
  // Check existing
  const { rows: cr } = await pool.query('SELECT COUNT(*) as c FROM policies WHERE company_id = $1', [COMPANY_ID]);
  console.log('Existing policies:', cr[0].c);

  // Insert if none
  if (parseInt(cr[0].c) === 0) {
    for (const p of POLICIES) {
      await pool.query(
        `INSERT INTO policies (company_id, title, content, category, tags, is_active, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,true,NOW(),NOW())`,
        [COMPANY_ID, p.title, p.content, p.category, p.tags]
      );
      console.log('  +', p.title);
    }
  }

  // Verify
  const { rows: cr2 } = await pool.query('SELECT COUNT(*) as c FROM policies WHERE company_id = $1', [COMPANY_ID]);
  console.log('Total policies:', cr2[0].c);

  // Now trigger knowledge sync via ai-service internal API
  // The ai-service knows about policies from its own DB pool
  console.log('\nTriggering knowledge embedding sync...');
  // Hit the ai-service internal endpoint
  const http = require('http');
  const body = JSON.stringify({ company_id: COMPANY_ID, source_types: ['policy'] });
  const req = http.request({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/admin/knowledge-embeddings/sync',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    timeout: 60000,
  }, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      try { console.log('Sync response:', JSON.stringify(JSON.parse(d), null, 2).slice(0,500)); } catch { console.log('Raw:', d.slice(0,500)); }
      pool.end();
    });
  });
  req.on('error', e => { console.error('Sync error:', e.message); pool.end(); });
  req.write(body);
  req.end();
}

main().catch(e => { console.error(e); pool.end(); process.exit(1); });
