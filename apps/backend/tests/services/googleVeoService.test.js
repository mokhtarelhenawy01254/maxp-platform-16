const assert = require('assert');
const googleVeoService = require('../../services/googleVeoService');

async function runTests() {
  console.log('🧪 Starting Google Veo Service Tests...');

  // Test 1: Validation
  try {
    await googleVeoService.createVideoTask({ prompt: '' });
    assert.fail('Should fail when prompt is empty');
  } catch (err) {
    assert.strictEqual(err.message, 'Prompt is required for video generation');
    console.log('  ✅ Test 1 Passed: Empty prompt validation rejected');
  }

  // Test 2: Task Creation
  const taskResult = await googleVeoService.createVideoTask({
    companyId: 'test_company_123',
    prompt: 'Cinematic drone shot of Egyptian cotton fabric fluttering in the breeze, golden hour',
    aspectRatio: '9:16',
    durationSeconds: 5,
  });

  assert.ok(taskResult.taskId.startsWith('veo_'), 'Task ID must start with veo_');
  assert.ok(['QUEUED', 'PROCESSING'].includes(taskResult.status), 'Task status should be QUEUED or PROCESSING');
  console.log(`  ✅ Test 2 Passed: Task queued with ID ${taskResult.taskId} (status: ${taskResult.status})`);

  // Test 3: Status Retrieval
  const statusBefore = googleVeoService.getTaskStatus(taskResult.taskId);
  assert.ok(statusBefore, 'Task must exist in memory');
  assert.ok(['QUEUED', 'PROCESSING', 'COMPLETED'].includes(statusBefore.status));
  console.log(`  ✅ Test 3 Passed: Initial status fetched (${statusBefore.status})`);

  // Test 4: List Tasks
  const companyTasks = googleVeoService.listTasks('test_company_123');
  assert.ok(Array.isArray(companyTasks));
  assert.ok(companyTasks.length >= 1);
  assert.strictEqual(companyTasks[0].id, taskResult.taskId);
  console.log(`  ✅ Test 4 Passed: Company task list retrieved successfully (${companyTasks.length} task)`);

  console.log('🎉 All Google Veo Service Unit Tests Passed!\n');
}

runTests().catch((err) => {
  console.error('❌ Tests failed:', err);
  process.exit(1);
});
