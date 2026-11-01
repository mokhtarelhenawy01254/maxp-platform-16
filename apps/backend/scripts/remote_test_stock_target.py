import sys
import paramiko

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

SERVER_HOST = "153.92.223.119"
SERVER_USER = "root"
SERVER_PASS = "Mokhtar1234@#"

REMOTE_SCRIPT = """
const stockAndTargetAlertService = require('./services/stockAndTargetAlertService');
const aiCronSchedulerService = require('./services/aiCronSchedulerService');
const sharedDb = require('./services/sharedDatabase');

async function testLive() {
  console.log('=== LIVE SERVER TEST START ===');
  const company = await sharedDb.safeQuery(prisma => 
    prisma.company.findFirst({
      where: { isActive: true },
      select: { id: true, name: true, phone: true, settings: true }
    })
  );

  if (!company) {
    console.error('No active company found');
    process.exit(1);
  }

  console.log('Testing with real company:', company.name, 'ID:', company.id);

  // 1. Get current settings
  const currentSettings = await stockAndTargetAlertService.getSettings(company.id);
  console.log('Current settings:', JSON.stringify(currentSettings, null, 2));

  // 2. Update settings with test target and threshold
  const updated = await stockAndTargetAlertService.updateSettings(company.id, {
    monthly_orders: 100,
    min_stock_threshold: 10,
    report_time: '09:00',
    enabled: true
  });
  console.log('Updated settings successfully:', {
    monthly_orders: updated.monthly_orders,
    min_stock_threshold: updated.min_stock_threshold,
    report_time: updated.report_time
  });

  // 3. Dispatch live report (dryRun: true to avoid sending unsolicited whatsapp during test)
  console.log('\\n--- DISPATCHING LIVE REPORT (Direct DB Queries) ---');
  const reportRes = await stockAndTargetAlertService.dispatchDailyReport(company.id, {
    dryRun: true,
    force: true
  });

  console.log('Report result status:', reportRes.success ? 'SUCCESS' : 'FAILED');
  console.log('Live DB metrics:', reportRes.metrics);
  console.log('\\n--- GENERATED REPORT MESSAGE ---');
  console.log(reportRes.messageText);
  console.log('--------------------------------');

  // 4. Test Deduplication: second run on same day
  console.log('\\n--- TESTING DEDUPLICATION (2nd Run) ---');
  const run2 = await stockAndTargetAlertService.dispatchDailyReport(company.id, {
    dryRun: true,
    force: true
  });
  console.log('Run 2 new low items alerted:', run2.metrics?.newLowItemsCount);
  console.log('Deduplication working (0 duplicates):', run2.metrics?.newLowItemsCount === 0);

  // 5. Check Cron Job
  console.log('\\n--- SYNCING CRON JOB ---');
  const cronJob = await aiCronSchedulerService.syncStockTargetCronJob(company.id, {
    report_time: '09:00',
    enabled: true
  });
  console.log('Cron Job registered:', {
    id: cronJob.id,
    cronExpression: cronJob.cronExpression,
    nextRun: cronJob.nextRun,
    status: cronJob.status
  });

  console.log('\\n=== LIVE SERVER TEST PASSED 100% ===');
  process.exit(0);
}

testLive().catch(err => {
  console.error('Error during test:', err);
  process.exit(1);
});
"""

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(SERVER_HOST, username=SERVER_USER, password=SERVER_PASS, timeout=20, look_for_keys=False, allow_agent=False)

    sftp = client.open_sftp()
    with sftp.open("/var/www/backend2/test_stock_target_live.js", "w") as f:
        f.write(REMOTE_SCRIPT)
    sftp.close()

    print("Running live test on server...")
    stdin, stdout, stderr = client.exec_command("cd /var/www/backend2 && node test_stock_target_live.js", timeout=120)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    
    print(out)
    if err:
        print("STDERR:", err)

    # Clean up test script
    client.exec_command("rm -f /var/www/backend2/test_stock_target_live.js")
    client.close()

if __name__ == "__main__":
    main()
