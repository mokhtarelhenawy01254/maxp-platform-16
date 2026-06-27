const axios = require('axios');

const BASE = 'http://localhost:3007/api/v1/public/booking';
const SLUG = 'hsab-jdyd-46';
const BRANCH = 'cmqul2en9045vjuwnzfy3w3nm';

const TESTS = [
  // Wed 8 July — male day
  ['جلسة حجامة',     '2026-07-08', '15:00', 'أحمد سامي',     '01011111111', 'male',   'pass'],
  ['جلسة ريكفري',    '2026-07-08', '15:30', 'محمود فوزي',    '01022222222', 'male',   'pass'],
  ['كشف و اول جلسه مجانا', '2026-07-08', '16:00', 'ياسر نبيل', '01033333333', 'male', 'pass'],
  ['جلسة علاج طبيعي', '2026-07-08', '16:30', 'حسن إبراهيم',   '01044444444', 'male',   'pass'],
  ['جلسة شوك ويف',   '2026-07-08', '17:00', 'كريم عادل',     '01055555555', 'male',   'pass'],
  ['تصريف ليمفاوي',  '2026-07-08', '17:30', 'عمرو فتحي',     '01066666666', 'male',   'pass'],
  ['مساج ليمفاوي',   '2026-07-08', '18:00', 'طارق مجدي',     '01077777777', 'male',   'pass'],
  ['شد الفقرات',     '2026-07-08', '18:30', 'هشام جمال',     '01088888888', 'male',   'pass'],

  // Thu 2 July — female day
  ['جلسة حجامة',     '2026-07-09', '15:00', 'سارة محمود',    '01111111111', 'female', 'pass'],
  ['جلسة ريكفري',    '2026-07-09', '15:30', 'نورهان علي',    '01122222222', 'female', 'pass'],
  ['كشف و اول جلسه مجانا', '2026-07-09', '16:00', 'منى سعيد', '01133333333', 'female', 'pass'],
  ['جلسة علاج طبيعي', '2026-07-09', '16:30', 'عبير حسن',     '01144444444', 'female', 'pass'],
  ['جلسة شوك ويف',   '2026-07-09', '17:00', 'داليا فؤاد',    '01155555555', 'female', 'pass'],
  ['تصريف ليمفاوي',  '2026-07-09', '17:30', 'رشا نبيل',     '01166666666', 'female', 'pass'],
  ['مساج ليمفاوي',   '2026-07-09', '18:00', 'ليلى عادل',     '01177777777', 'female', 'pass'],
  ['شد الفقرات',     '2026-07-09', '18:30', 'فاتن جمال',     '01188888888', 'female', 'pass'],

  // Validation: wrong gender
  ['جلسة حجامة',     '2026-07-08', '19:00', 'هند سامي',      '01199999999', 'female', 'fail'],
  ['جلسة ريكفري',    '2026-07-09', '19:00', 'وليد فوزي',    '01099999999', 'male',   'fail'],
];

async function book(service, date, time, name, phone, gender) {
  const body = { slug: SLUG, branchId: BRANCH, customerName: name, customerPhone: phone,
    customerGender: gender, appointmentDate: date, startTime: time };
  const res = await axios.get(`${BASE}/services?slug=${SLUG}`);
  const norm = s => s.replace(/ة/g,'ه').replace(/أ/g,'ا').replace(/إ/g,'ا');
  const svc = res.data.data.find(s => norm(s.name).includes(norm(service)));
  if (!svc) return { status: 500, body: { error: 'service not found' } };
  body.serviceId = svc.id;
  const result = await axios.post(`${BASE}/appointments`, body, { validateStatus: () => true });
  return { status: result.status, body: result.data };
}

async function main() {
  console.log('=== 20 BOOKING TESTS (Wed 1 Jul - Thu 2 Jul) ===\n');
  let pass = 0, fail = 0;
  for (const [svc, date, time, name, phone, gender, expected] of TESTS) {
    const label = `${svc} | ${date} ${time} | ${name} (${gender})`;
    try {
      const res = await book(svc, date, time, name, phone, gender);
      const ok = expected === 'pass' ? res.status === 200 : res.status !== 200;
      ok ? pass++ : fail++;
      console.log(`${ok?'✅':'❌'} [${res.status}] ${label}`);
      if (!ok) console.log(`   ${res.body?.error || res.body?.message || ''}`);
    } catch(e) {
      fail++;
      console.log(`❌ [ERR] ${label} — ${e.message}`);
    }
  }
  console.log(`\n=== ${pass} passed / ${fail} failed / ${TESTS.length} total ===`);
}
main();
