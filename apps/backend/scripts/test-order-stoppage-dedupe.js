/**
 * 🧪 Test Runner for Order Silence Deduplication & Persistent Cooldown
 */

const assert = require('assert');
const systemIncidentAlertService = require('../services/systemIncidentAlertService');
const { scanOrderSilence } = require('../cron/systemIncidentCron');

async function runTests() {
    console.log('🧪 Starting Order Stoppage & Cooldown Fixes Verification...');

    // 1. Verify Persistent DB Cooldown in dispatchIncident
    console.log('\n➡️ Test 1: Verifying Persistent DB Cooldown in dispatchIncident...');
    const mockPrisma = {
        notification: {
            findFirst: async ({ where }) => {
                // Return a mock recent notification created 1 hour ago
                return {
                    id: 'mock_notif_123',
                    createdAt: new Date(Date.now() - (60 * 60 * 1000)), // 1 hour ago
                    data: {
                        incidentType: 'ORDER_SYNC_STOPPAGE',
                        metadata: { lastOrderNumber: 'ORD-276832-281' }
                    }
                };
            }
        },
        company: {
            findUnique: async () => ({ name: 'Test Store' })
        }
    };

    // Temporarily inject mock into systemIncidentAlertService
    const sharedDb = require('../services/sharedDatabase');
    const originalGetPrisma = sharedDb.getSharedPrismaClient;
    sharedDb.getSharedPrismaClient = () => mockPrisma;

    // Clear local in-memory cooldown to simulate a fresh server restart
    systemIncidentAlertService.cooldowns.clear();

    const resultAfterRestart = await systemIncidentAlertService.dispatchIncident({
        companyId: 'comp_restart_test',
        incidentType: systemIncidentAlertService.INCIDENT_TYPES.ORDER_SYNC_STOPPAGE,
        title: '⚠️ توقف نزول الأوردرات منذ 19 ساعة',
        message: 'لم يتم تسجيل أو استيراد أي طلبات جديدة منذ 19 ساعة',
        severity: systemIncidentAlertService.SEVERITIES.WARNING,
        entityId: 'comp_restart_test',
        cooldownMinutes: 1440 // 24 hours
    });

    assert.strictEqual(resultAfterRestart.sent, false, 'Dispatch should be suppressed by persistent DB cooldown');
    assert.strictEqual(resultAfterRestart.reason, 'in_persistent_cooldown', 'Reason must be in_persistent_cooldown');
    console.log('✅ Test 1 Passed: Persistent DB cooldown prevents alert after server restart!');

    // 2. Verify Force Bypass
    console.log('\n➡️ Test 2: Verifying force: true bypasses DB cooldown...');
    const resultForced = await systemIncidentAlertService.dispatchIncident({
        companyId: 'comp_restart_test',
        incidentType: systemIncidentAlertService.INCIDENT_TYPES.ORDER_SYNC_STOPPAGE,
        title: '⚠️ تنبيه إجباري',
        message: 'رسالة إجبارية',
        severity: systemIncidentAlertService.SEVERITIES.WARNING,
        entityId: 'comp_restart_test',
        cooldownMinutes: 1440,
        force: true
    });
    assert.strictEqual(resultForced.sent, true, 'Forced dispatch should bypass cooldown');
    console.log('✅ Test 2 Passed: force: true properly bypasses persistent cooldown!');

    // 3. Verify scanOrderSilence Deduplication Logic
    console.log('\n➡️ Test 3: Verifying scanOrderSilence ignores same order stoppage...');
    let dispatchedCount = 0;
    const originalDispatch = systemIncidentAlertService.dispatchIncident;
    systemIncidentAlertService.dispatchIncident = async () => {
        dispatchedCount++;
        return { sent: true };
    };

    const mockSilencePrisma = {
        order: {
            groupBy: async () => [{ companyId: 'comp_active_1', _count: { id: 30 } }],
            findFirst: async () => ({
                id: 'order_1',
                orderNumber: 'ORD-276832-281',
                createdAt: new Date(Date.now() - (19 * 60 * 60 * 1000)) // 19 hours ago
            })
        },
        notification: {
            // Already alerted 2 hours ago for the EXACT SAME order number
            findFirst: async ({ where }) => {
                return {
                    id: 'notif_prev_1',
                    createdAt: new Date(Date.now() - (2 * 60 * 60 * 1000)),
                    data: {
                        metadata: { lastOrderNumber: 'ORD-276832-281' }
                    }
                };
            }
        }
    };

    // Run scanOrderSilence during active hours (e.g. 14:00 Cairo time)
    const mockDateDaytime = new Date('2026-11-04T12:00:00Z'); // 14:00 Cairo
    const scanResult = await scanOrderSilence(mockSilencePrisma, mockDateDaytime);

    assert.strictEqual(dispatchedCount, 0, 'No alert should be dispatched when same order was already alerted');
    console.log('✅ Test 3 Passed: scanOrderSilence skipped duplicate alert for same order within 24h!');

    // 4. Verify scanOrderSilence alerts when NEW order arrives and then stops
    console.log('\n➡️ Test 4: Verifying scanOrderSilence alerts when last order has changed...');
    const mockSilencePrismaNewOrder = {
        order: {
            groupBy: async () => [{ companyId: 'comp_active_1', _count: { id: 30 } }],
            findFirst: async () => ({
                id: 'order_2',
                orderNumber: 'ORD-999999-001', // NEW order number!
                createdAt: new Date(Date.now() - (10 * 60 * 60 * 1000)) // 10 hours ago
            })
        },
        notification: {
            findFirst: async () => ({
                id: 'notif_prev_1',
                createdAt: new Date(Date.now() - (2 * 60 * 60 * 1000)),
                data: {
                    metadata: { lastOrderNumber: 'ORD-276832-281' } // OLD order
                }
            })
        }
    };

    dispatchedCount = 0;
    await scanOrderSilence(mockSilencePrismaNewOrder, mockDateDaytime);
    assert.strictEqual(dispatchedCount, 1, 'Alert MUST be dispatched when a new stoppage occurs for a different order');
    console.log('✅ Test 4 Passed: scanOrderSilence properly triggers when a new stoppage occurs!');

    // Restore originals
    sharedDb.getSharedPrismaClient = originalGetPrisma;
    systemIncidentAlertService.dispatchIncident = originalDispatch;

    console.log('\n🎉 ALL 4 TESTS PASSED SUCCESSFULLY! Deduplication and persistent cooldown verified.\n');
}

runTests().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
