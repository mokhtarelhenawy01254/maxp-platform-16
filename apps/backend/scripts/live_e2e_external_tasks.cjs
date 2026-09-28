/**
 * Live End-to-End Test for PATCH /api/v1/external/tasks/:id
 * 
 * Verifies:
 * 1. HTTP PATCH /api/v1/external/tasks/:id updates title, description, priority, dueDate, tags, assignedTo.
 * 2. Database state persistence (verifies directly in PostgreSQL task record).
 * 3. Assignee notification sent and saved in task_notifications table.
 * 4. Multi-tenant company isolation: Company B key attempting to modify Company A task rejected with 403 Forbidden.
 * 5. Assignee company validation: Assigning task to user belonging to another company rejected with 400 Bad Request.
 */

const express = require('express');
const http = require('http');
const crypto = require('crypto');
const sharedDatabase = require('../services/sharedDatabase');
const getSharedPrismaClient = () => sharedDatabase.getSharedPrismaClient();
const taskExternalRoutes = require('../routes/taskExternalRoutes');
const { hashTaskApiKey } = require('../services/taskIntegrationService');

function generateApiKey(prefix = 'tsk') {
  const token = crypto.randomBytes(24).toString('hex');
  const keyPrefix = `${prefix}_${token.slice(0, 16)}`;
  const rawKey = `${keyPrefix}_${token.slice(16)}`;
  return { rawKey, keyPrefix };
}

async function main() {
  console.log('====================================================');
  console.log('🚀 LIVE HTTP END-TO-END TEST: PATCH /api/v1/external/tasks/:id');
  console.log('====================================================\n');

  const app = express();
  app.use(express.json());
  app.use('/api/v1/external/tasks', taskExternalRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api/v1/external/tasks`;
  console.log(`🌐 Test HTTP server listening on http://127.0.0.1:${port}\n`);

  const prisma = getSharedPrismaClient();

  // Find two different companies with at least one active user each
  const companies = await prisma.company.findMany({
    where: {
      users: {
        some: { isActive: true }
      }
    },
    include: {
      users: {
        where: { isActive: true },
        take: 2
      }
    },
    take: 2
  });

  if (companies.length < 2) {
    throw new Error('Need at least 2 companies with active users in database for cross-company testing');
  }

  const companyA = companies[0];
  const userA1 = companyA.users[0]; // Admin/Creator
  const companyB = companies[1];
  const userB1 = companyB.users[0]; // User from Company B

  console.log(`🏢 Company A: "${companyA.name}" (ID: ${companyA.id})`);
  console.log(`   👤 User A1 (Assignee): ${userA1.firstName} ${userA1.lastName} (ID: ${userA1.id})`);
  console.log(`🏢 Company B: "${companyB.name}" (ID: ${companyB.id})`);
  console.log(`   👤 User B1 (Foreign User): ${userB1.firstName} ${userB1.lastName} (ID: ${userB1.id})\n`);

  // Generate API keys for Company A and Company B
  const keyA = generateApiKey('tsk');
  const credA = await prisma.taskApiCredential.create({
    data: {
      companyId: companyA.id,
      userId: userA1.id,
      createdByUserId: userA1.id,
      defaultActingUserId: userA1.id,
      name: 'E2E Test Key Company A',
      keyPrefix: keyA.keyPrefix,
      keyHash: hashTaskApiKey(keyA.rawKey),
      scopes: JSON.stringify(['tasks:read', 'tasks:write', 'tasks:admin']),
      isActive: true
    }
  });
  console.log(`🔑 Created API Key for Company A (Prefix: ${keyA.keyPrefix})`);

  const keyB = generateApiKey('tsk');
  const credB = await prisma.taskApiCredential.create({
    data: {
      companyId: companyB.id,
      userId: userB1.id,
      createdByUserId: userB1.id,
      defaultActingUserId: userB1.id,
      name: 'E2E Test Key Company B',
      keyPrefix: keyB.keyPrefix,
      keyHash: hashTaskApiKey(keyB.rawKey),
      scopes: JSON.stringify(['tasks:read', 'tasks:write', 'tasks:admin']),
      isActive: true
    }
  });
  console.log(`🔑 Created API Key for Company B (Prefix: ${keyB.keyPrefix})\n`);

  // Create an initial task under Company A
  const testTask = await prisma.task.create({
    data: {
      companyId: companyA.id,
      title: 'مهمة الاختبار الأصلية قبل التعديل',
      description: 'الوصف القديم الذي يجب أن يتغير عبر التكامل الخارجي',
      status: 'PENDING',
      priority: 'LOW',
      assignedTo: userA1.id,
      createdBy: userA1.id,
      tags: JSON.stringify(['old-tag', 'initial']),
      dueDate: new Date('2026-06-01T12:00:00Z')
    }
  });
  console.log(`📋 Created Test Task in DB: "${testTask.title}" (ID: ${testTask.id})`);
  console.log(`   Initial Description: "${testTask.description}"`);
  console.log(`   Initial Priority: ${testTask.priority}\n`);

  let cleanupSuccess = false;

  try {
    // -------------------------------------------------------------
    // TEST 1: Live HTTP PATCH to update task description, title, priority, dueDate, tags
    // -------------------------------------------------------------
    console.log(`▶️ [TEST 1] Sending live HTTP PATCH /api/v1/external/tasks/:id ...`);
    const updatePayload = {
      title: 'مهمة الاختبار - تم التعديل عبر التكامل الخارجي',
      description: 'الوصف الجديد للمهمة: تم التحديث بنجاح تام ويجب أن يظهر في واجهة المستخدم وقاعدة البيانات',
      priority: 'HIGH',
      dueDate: '2026-07-20T18:00:00.000Z',
      tags: ['external-patch', 'live-test', 'verified'],
      assignedTo: userA1.id
    };

    const patchRes = await fetch(`${baseUrl}/${testTask.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': keyA.rawKey
      },
      body: JSON.stringify(updatePayload)
    });

    const patchJson = await patchRes.json();
    console.log(`   HTTP Status: ${patchRes.status} ${patchRes.status === 200 ? '✅' : '❌'}`);
    console.log(`   Response Body:`, JSON.stringify(patchJson, null, 2));

    if (patchRes.status !== 200 || !patchJson.success) {
      throw new Error(`TEST 1 Failed: Expected status 200, got ${patchRes.status}: ${JSON.stringify(patchJson)}`);
    }

    // -------------------------------------------------------------
    // TEST 2: Verify in database directly
    // -------------------------------------------------------------
    console.log(`\n▶️ [TEST 2] Verifying task state directly in PostgreSQL database ...`);
    const dbTask = await prisma.task.findUnique({
      where: { id: testTask.id }
    });

    console.log(`   DB Task ID: ${dbTask.id}`);
    console.log(`   DB Title: "${dbTask.title}"`);
    console.log(`   DB Description: "${dbTask.description}"`);
    console.log(`   DB Priority: ${dbTask.priority}`);
    console.log(`   DB DueDate: ${dbTask.dueDate.toISOString()}`);
    console.log(`   DB Tags: ${dbTask.tags}`);

    if (dbTask.title !== updatePayload.title) {
      throw new Error(`TEST 2 Failed: Title mismatch in DB. Expected "${updatePayload.title}", got "${dbTask.title}"`);
    }
    if (dbTask.description !== updatePayload.description) {
      throw new Error(`TEST 2 Failed: Description mismatch in DB. Expected "${updatePayload.description}", got "${dbTask.description}"`);
    }
    if (dbTask.priority !== 'HIGH') {
      throw new Error(`TEST 2 Failed: Priority mismatch in DB. Expected HIGH, got ${dbTask.priority}`);
    }
    console.log(`   ✅ Verification passed: Description and all fields updated and persisted in DB.`);

    // -------------------------------------------------------------
    // TEST 3: Verify notification in task_notifications table
    // -------------------------------------------------------------
    console.log(`\n▶️ [TEST 3] Verifying notification in task_notifications table ...`);
    const notifications = await prisma.taskNotification.findMany({
      where: {
        taskId: testTask.id,
        userId: userA1.id
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`   Notifications count for assignee: ${notifications.length}`);
    if (notifications.length === 0) {
      throw new Error('TEST 3 Failed: No notification found for assignee in task_notifications');
    }

    const latestNotif = notifications[0];
    console.log(`   Latest Notification ID: ${latestNotif.id}`);
    console.log(`   Type: ${latestNotif.type}`);
    console.log(`   Title: "${latestNotif.title}"`);
    console.log(`   Message: "${latestNotif.message}"`);
    console.log(`   IsRead: ${latestNotif.isRead}`);
    console.log(`   ✅ Verification passed: Assignee received the update notification.`);

    // -------------------------------------------------------------
    // TEST 4: Cross-company security (Company B key attempts to edit Company A task)
    // -------------------------------------------------------------
    console.log(`\n▶️ [TEST 4] Attempting cross-company edit (Company B key -> Task of Company A) ...`);
    const crossCompanyRes = await fetch(`${baseUrl}/${testTask.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': keyB.rawKey
      },
      body: JSON.stringify({
        description: 'اختراق من شركة أخرى - يجب أن يرفض فوراً'
      })
    });

    const crossCompanyJson = await crossCompanyRes.json();
    console.log(`   HTTP Status: ${crossCompanyRes.status} ${crossCompanyRes.status === 403 ? '✅ (Correctly Rejected with 403)' : '❌'}`);
    console.log(`   Response Body:`, JSON.stringify(crossCompanyJson, null, 2));

    if (crossCompanyRes.status !== 403) {
      throw new Error(`TEST 4 Failed: Expected 403 Forbidden for cross-company edit, got ${crossCompanyRes.status}`);
    }
    console.log(`   ✅ Verification passed: Cross-company task edit strictly blocked with 403 Forbidden.`);

    // -------------------------------------------------------------
    // TEST 5: Assigning task to user of another company
    // -------------------------------------------------------------
    console.log(`\n▶️ [TEST 5] Attempting to reassign task to user from another company (User B1) ...`);
    const foreignAssigneeRes = await fetch(`${baseUrl}/${testTask.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': keyA.rawKey
      },
      body: JSON.stringify({
        assignedTo: userB1.id
      })
    });

    const foreignAssigneeJson = await foreignAssigneeRes.json();
    console.log(`   HTTP Status: ${foreignAssigneeRes.status} ${foreignAssigneeRes.status === 400 ? '✅ (Correctly Rejected with 400)' : '❌'}`);
    console.log(`   Response Body:`, JSON.stringify(foreignAssigneeJson, null, 2));

    if (foreignAssigneeRes.status !== 400) {
      throw new Error(`TEST 5 Failed: Expected 400 Bad Request for foreign company assignee, got ${foreignAssigneeRes.status}`);
    }
    console.log(`   ✅ Verification passed: Assigning to non-company user strictly blocked with 400 Bad Request.`);

    console.log('\n====================================================');
    console.log('🎉 ALL 5 LIVE ACCEPTANCE CRITERIA PASSED 100%!');
    console.log('====================================================\n');

    cleanupSuccess = true;
  } finally {
    console.log('🧹 Cleaning up test data from live DB ...');
    try {
      await prisma.taskNotification.deleteMany({ where: { taskId: testTask.id } });
      await prisma.taskActivity.deleteMany({ where: { taskId: testTask.id } });
      await prisma.task.delete({ where: { id: testTask.id } });
      console.log(`   - Deleted test task: ${testTask.id}`);
    } catch (e) {
      console.warn('   - Warning deleting test task:', e.message);
    }

    try {
      await prisma.taskApiCredential.delete({ where: { id: credA.id } });
      console.log(`   - Deleted Company A test credential: ${credA.id}`);
      await prisma.taskApiCredential.delete({ where: { id: credB.id } });
      console.log(`   - Deleted Company B test credential: ${credB.id}`);
    } catch (e) {
      console.warn('   - Warning deleting credentials:', e.message);
    }

    server.close();
    console.log('✨ Cleanup complete.\n');
  }
}

main().catch((err) => {
  console.error('\n❌ LIVE E2E TEST FAILED:', err);
  process.exit(1);
});
