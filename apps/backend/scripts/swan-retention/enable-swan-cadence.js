/**
 * تفعيل الرسائل الدورية (Retention Cadence) لشركة Swan — بيشتغل بعد نشر commit الخدمة.
 * التشغيل: node scripts/swan-retention/enable-swan-cadence.js  (الباسورد مشفر داخل الملف)
 */
const BASE = 'https://maxp.online/api/v1';
const LOGIN = 'https://maxp.online/api/auth/login';
const EMAIL = 'swan@h2m.com';
const PASSWORD = Buffer.from('MDE2NTY3NjEzNQ==', 'base64').toString('utf8');

(async () => {
  if (!PASSWORD) { console.error('❌ حدد SWAN_PASSWORD في متغيرات البيئة'); process.exit(1); }
  const lr = await fetch(LOGIN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
  const ld = await lr.json();
  const token = ld?.token || ld?.accessToken || ld?.data?.token;
  if (!token) { console.error('❌ فشل تسجيل الدخول:', JSON.stringify(ld).slice(0, 200)); process.exit(1); }
  const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const p = '/hr/customer-loyalty/retention-cadence/settings';
  const res = await fetch(BASE + p, {
    method: 'PUT',
    headers: H,
    body: JSON.stringify({
      enabled: true,
      throttlePerRun: 300,
      types: {
        CADENCE_PRODUCT: { enabled: true, intervalDays: 10 },
        CADENCE_BALANCE: { enabled: true, intervalDays: 15 },
        CADENCE_REFERRAL: { enabled: true, intervalDays: 30 },
        CADENCE_TIER: { enabled: true, intervalDays: 30 }
      }
    })
  });
  const body = await res.text();
  console.log('STATUS:', res.status);
  console.log('BODY:', body.slice(0, 600));
  process.exit(res.ok ? 0 : 1);
})();
