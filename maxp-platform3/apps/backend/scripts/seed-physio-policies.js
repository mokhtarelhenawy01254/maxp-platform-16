const https = require('https');

const TARGET = 'maxp.online';
const COMPANY_ID = 'cmqpbuw3y3oq1ju40or3mr8it';

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: TARGET, port: 443, path: `/api/v1${path}`, method,
      headers: { 'Content-Type': 'application/json' },
      rejectUnauthorized: false, timeout: 30000,
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: null, raw: data }); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const POLICIES = [
  { title: 'سياسة إلغاء الحجز', content: 'يمكن إلغاء الحجز قبل الموعد بـ 24 ساعة على الأقل. في حالة الإلغاء بعد ذلك يتم احتساب رسوم إلغاء بقيمة 50% من قيمة الجلسة. يمكن إعادة جدولة الموعد مجاناً مرة واحدة بشرط الإخطار قبل 12 ساعة.', category: 'general', tags: 'إلغاء, إعادة جدولة, رسوم, مواعيد' },
  { title: 'سياسة التامين الطبي', content: 'نحن نتعامل مع عدد من شركات التأمين الطبي تشمل: مصر للتأمين، أليانز، AXA، وGIG. يرجى التواصل مع الاستقبال لتأكيد تغطية وثيقتكم قبل الحجز.', category: 'insurance', tags: 'تأمين, شركات تأمين, تغطية' },
  { title: 'تعليمات ما قبل الجلسة', content: 'يرجى الحضور قبل الموعد بـ 15 دقيقة. ارتداء ملابس رياضية مريحة. إحضار التقارير الطبية السابقة. يمنع تناول الطعام قبل الجلسة بساعتين.', category: 'preparation', tags: 'تعليمات, تحضير, ملابس, تقارير' },
  { title: 'سياسة الخصوصية', content: 'جميع بيانات المرضى محفوظة بسرية تامة وفقاً لقانون حماية البيانات. لا يتم مشاركة أي معلومات طبية أو شخصية مع أطراف ثالثة دون موافقة خطية.', category: 'privacy', tags: 'خصوصية, بيانات, سرية' },
  { title: 'أسعار الجلسات والباقات', content: 'أسعار الجلسات تبدأ من 150 جنيهاً. باقة 6 جلسات بسعر 750 جنيهاً. باقة 12 جلسة بسعر 1350 جنيهاً. باقة 20 جلسة بسعر 2000 جنيهاً. الأطفال وكبار السن خصم إضافي 10%.', category: 'pricing', tags: 'أسعار, باقات, خصم, جلسات' },
  { title: 'مواعيد العمل', content: 'أيام الرجال: السبت، الاثنين، الأربعاء 3-9 م. أيام النساء: الأحد، الثلاثاء، الخميس 3-9 م. الجمعة إجازة. آخر حجز 8 م.', category: 'general', tags: 'مواعيد, أيام, دوام' },
];

async function main() {
  // Login as super admin
  console.log('🔐 Logging in as super admin...');
  const login = await api('POST', '/auth/login', { email: 'admin@mokhtarelhenawy.com', password: 'SuperAdmin@123' });
  const token = login.body?.token;
  if (!token) { console.error('❌ Login failed', login.body); return; }
  console.log('✅ Logged in as super admin');

  // First create policies via HR endpoint with x-company-id
  console.log('\n📝 Creating policies...');
  for (const p of POLICIES) {
    const r = await api('POST', '/hr/policies', {
      company_id: COMPANY_ID,
      title: p.title, content: p.content,
      category: p.category, tags: p.tags,
    }, token);
    console.log(`  ${r.status === 201 ? '✅' : '⚠️'} ${p.title} (${r.status})`);
  }

  // Check status before sync
  console.log('\n🔍 Checking embedding status...');
  const st = await api('GET', `/super-admin/ai/knowledge-embeddings/status?company_id=${COMPANY_ID}`, null, token);
  console.log('  Status:', JSON.stringify(st.body?.data?.summary || st.body).slice(0,200));

  // Trigger sync via super-admin endpoint
  console.log('\n📦 Triggering sync...');
  const sync = await api('POST', '/super-admin/ai/knowledge-embeddings/sync', { company_id: COMPANY_ID }, token);
  console.log('  Sync:', JSON.stringify(sync.body?.data || sync.body).slice(0,300));

  // Wait and check again
  console.log('\n⏳ Waiting 10s...');
  await new Promise(r => setTimeout(r, 10000));

  const st2 = await api('GET', `/super-admin/ai/knowledge-embeddings/status?company_id=${COMPANY_ID}`, null, token);
  console.log('  After sync:', JSON.stringify(st2.body?.data?.summary || st2.body).slice(0,300));
}

main().catch(console.error);
