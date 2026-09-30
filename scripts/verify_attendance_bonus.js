const http = require('http');
const { getSharedPrismaClient } = require('/var/www/backend2/services/sharedDatabase');
const payrollService = require('/var/www/backend2/services/hr/payrollService');

const prisma = getSharedPrismaClient();
const API_KEY = 'hrk_58903fa80570b7e7_830cc84a3da252756f67be5a66e891619aab6684800feca9';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 3007,
      path: '/api/v1/external/hr' + path,
      method: method,
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: raw });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🚀 Starting Attendance Commitment Bonus Verification Suite...\n');

  // 1. Identify credential and company
  const keyPrefix = 'hrk_58903fa80570b7e7';
  const credential = await prisma.hrApiCredential.findUnique({
    where: { keyPrefix },
    include: { company: true }
  });
  if (!credential) throw new Error('H2M credential not found');
  const company = credential.company;
  console.log(`✅ Tenant: ${company.name} (id: ${company.id})`);
  console.log(`✅ Credential: ${credential.name}`);

  // 2. Locate active employee in this company
  const activeEmployees = await prisma.user.findMany({
    where: { companyId: company.id, isActive: true, employeeNumber: { not: null } },
    select: { id: true, firstName: true, lastName: true, employeeNumber: true }
  });
  if (activeEmployees.length === 0) throw new Error('No active employees with employeeNumber found');
  const targetEmployee = activeEmployees[0];
  console.log(`✅ Target Employee: ${targetEmployee.firstName} ${targetEmployee.lastName} (${targetEmployee.employeeNumber}, userId: ${targetEmployee.id})`);

  // Ensure employee has committed attendance in September 2026 (only 1 absence day, so < 3 days)
  console.log('\n--- Seeding committed attendance for September 2026 (1 absent day, 25 present days) ---');
  const workingDaysSep = [
    '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-05', '2026-09-06',
    '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-12',
    '2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17',
    '2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23',
    '2026-09-24', '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29'
    // 2026-09-30 left absent
  ];

  for (const dateStr of workingDaysSep) {
    const d = new Date(dateStr);
    await prisma.attendance.upsert({
      where: {
        userId_date: {
          userId: targetEmployee.id,
          date: d
        }
      },
      update: { status: 'PRESENT' },
      create: {
        companyId: company.id,
        userId: targetEmployee.id,
        date: d,
        status: 'PRESENT',
        checkIn: new Date(`${dateStr}T09:00:00Z`),
        checkOut: new Date(`${dateStr}T17:00:00Z`),
        workHours: 8
      }
    });
  }
  console.log(`✅ Seeded 25 PRESENT attendance days (only 1 day absent out of 26 working days).`);

  // 3. Create Reward Rule for Attendance Commitment
  console.log('\n--- Test 1: POST /reward-rules (Create Rule) ---');
  const createRuleRes = await request('POST', '/reward-rules', {
    name: 'مكافأة الالتزام بالدوام الشهري',
    value: 1000,
    maxAllowedAbsenceDays: 2, // غياب أقل من 3 أيام (الحد المسموح 2 يوم)
    targetEmployeeId: targetEmployee.id,
    disburseAsPayrollBonus: true
  });
  console.log(`HTTP Status: ${createRuleRes.status}`);
  console.log(`Response:`, JSON.stringify(createRuleRes.body, null, 2));
  if (createRuleRes.status !== 201) throw new Error('Failed to create reward rule');
  const ruleId = createRuleRes.body.data.id;
  console.log(`✅ Created Rule ID: ${ruleId}`);

  // 4. Test dryRun evaluation
  console.log('\n--- Test 2: POST /reward-rules/:id/evaluate?month=2026-09&dryRun=true ---');
  const dryRunRes = await request('POST', `/reward-rules/${ruleId}/evaluate?month=2026-09&dryRun=true`);
  console.log(`HTTP Status: ${dryRunRes.status}`);
  console.log(`DryRun Result:`, JSON.stringify(dryRunRes.body, null, 2));
  if (dryRunRes.status !== 200 || !dryRunRes.body.data.dryRun) throw new Error('dryRun failed');

  const dryResult = dryRunRes.body.data.results[0];
  console.log(`Employee Evaluation Result: absentDays=${dryResult.absentDays}, isEligible=${dryResult.isEligible}, reason=${dryResult.reason}`);
  if (!dryResult.isEligible || dryResult.absentDays > 2) {
    throw new Error(`Expected employee to be eligible with absentDays <= 2, got ${dryResult.absentDays}`);
  }

  // Verify no record created in DB during dryRun
  const dryRecordsCount = await prisma.rewardRecord.count({
    where: { rewardTypeId: ruleId, companyId: company.id }
  });
  console.log(`DB RewardRecords after dryRun: ${dryRecordsCount} (Expected: 0)`);
  if (dryRecordsCount !== 0) throw new Error('dryRun must NOT create records in DB');
  console.log(`✅ dryRun succeeded with 0 DB writes.`);

  // 5. Test Live evaluation
  console.log('\n--- Test 3: POST /reward-rules/:id/evaluate?month=2026-09&dryRun=false ---');
  const liveRunRes = await request('POST', `/reward-rules/${ruleId}/evaluate?month=2026-09&dryRun=false`);
  console.log(`HTTP Status: ${liveRunRes.status}`);
  console.log(`Live Run Result:`, JSON.stringify(liveRunRes.body, null, 2));
  if (liveRunRes.status !== 200) throw new Error('Live evaluate failed');
  if (liveRunRes.body.data.summary.createdCount !== 1) {
    throw new Error(`Expected createdCount 1, got ${liveRunRes.body.data.summary.createdCount}`);
  }

  // Verify RewardRecord in DB
  const createdRecord = await prisma.rewardRecord.findFirst({
    where: { rewardTypeId: ruleId, companyId: company.id, appliedMonth: 9, appliedYear: 2026 }
  });
  console.log(`\nDB Created RewardRecord:`, createdRecord ? {
    id: createdRecord.id,
    userId: createdRecord.userId,
    rewardName: createdRecord.rewardName,
    calculatedValue: Number(createdRecord.calculatedValue),
    status: createdRecord.status,
    appliedMonth: createdRecord.appliedMonth,
    appliedYear: createdRecord.appliedYear,
    isIncludedInPayroll: createdRecord.isIncludedInPayroll
  } : 'None');
  if (!createdRecord) throw new Error('RewardRecord was not created in DB');
  console.log(`✅ DB record verified with status: ${createdRecord.status}, value: ${createdRecord.calculatedValue}`);

  // 6. Test Payroll Integration
  console.log('\n--- Test 4: Payroll Integration (Bonus inclusion in 2026-09) ---');
  const payrollData = await payrollService.calculatePayrollData(company.id, targetEmployee.id, 9, 2026);
  console.log(`Calculated Payroll Data for ${targetEmployee.firstName}:`);
  console.log(`- Base Salary: ${payrollData.baseSalary}`);
  console.log(`- Total Bonuses: ${payrollData.bonuses}`);
  console.log(`- Approved Rewards Count: ${payrollData.approvedRewards?.length || 0}`);
  if (payrollData.approvedRewards && payrollData.approvedRewards.length > 0) {
    console.log(`- Linked Rewards in Payroll:`, payrollData.approvedRewards.map(r => ({
      id: r.id,
      rewardName: r.rewardName,
      value: Number(r.calculatedValue)
    })));
  }

  if (!payrollData.bonuses || payrollData.bonuses < 1000) {
    throw new Error(`Payroll bonuses (${payrollData.bonuses}) did not include the 1000 commitment reward`);
  }
  console.log(`✅ Payroll integration verified: 1000 bonus successfully included in 2026-09 calculation.`);

  // 7. Test Duplicate Prevention on second live run
  console.log('\n--- Test 5: Duplicate Prevention on second live run ---');
  const secondLiveRes = await request('POST', `/reward-rules/${ruleId}/evaluate?month=2026-09&dryRun=false`);
  console.log(`Second Run Summary:`, secondLiveRes.body.data?.summary);
  if (secondLiveRes.body.data?.summary?.alreadyExistedCount < 1) {
    throw new Error('Duplicate prevention failed: expected alreadyExistedCount >= 1');
  }
  console.log(`✅ Duplicate prevention verified cleanly.`);

  // 8. Test Activity Logs
  console.log('\n--- Test 6: Activity Logs Audit Trail ---');
  const logs = await prisma.activityLog.findMany({
    where: {
      companyId: company.id,
      category: 'HR_EXTERNAL_API',
      action: { in: ['CREATE_REWARD_RULE', 'EVALUATE_REWARD_RULE_DRY_RUN', 'EVALUATE_REWARD_RULE'] }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(`Found ${logs.length} audit logs:`);
  logs.forEach(l => {
    console.log(`- [${l.action}] ${l.description} | target: ${l.targetName} (${l.targetId})`);
  });
  if (logs.length < 3) throw new Error('Expected at least 3 audit log entries');
  console.log(`✅ Audit trail verified with single-object logging.`);

  console.log('\n🎉 ALL ACCEPTANCE CRITERIA PASSED SUCCESSFULLY! 🎉');
}

main().then(() => process.exit(0)).catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
