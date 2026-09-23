/**
 * 🧪 Test Runner for System Incident Alert Service
 */

const assert = require('assert');
const systemIncidentAlertService = require('../services/systemIncidentAlertService');

async function runTests() {
    console.log('🧪 Starting System Incident Alert Service Verification...');

    // 1. Verify Exports & Enums
    assert(systemIncidentAlertService.INCIDENT_TYPES, 'INCIDENT_TYPES should be defined');
    assert(systemIncidentAlertService.SEVERITIES, 'SEVERITIES should be defined');
    assert.strictEqual(systemIncidentAlertService.INCIDENT_TYPES.ORDER_SYNC_STOPPAGE, 'ORDER_SYNC_STOPPAGE');
    assert.strictEqual(systemIncidentAlertService.INCIDENT_TYPES.AD_CAMPAIGN_STOPPED, 'AD_CAMPAIGN_STOPPED');
    assert.strictEqual(systemIncidentAlertService.INCIDENT_TYPES.AD_ACCOUNT_ISSUE, 'AD_ACCOUNT_ISSUE');
    assert.strictEqual(systemIncidentAlertService.INCIDENT_TYPES.AUTOMATION_ENDED, 'AUTOMATION_ENDED');
    assert.strictEqual(systemIncidentAlertService.INCIDENT_TYPES.AUTOMATION_STEP_FAILED, 'AUTOMATION_STEP_FAILED');
    assert.strictEqual(systemIncidentAlertService.INCIDENT_TYPES.WHATSAPP_DISCONNECTED, 'WHATSAPP_DISCONNECTED');
    console.log('✅ 1. Enums and constants verified.');

    // 2. Test Missing companyId
    const missingCompResult = await systemIncidentAlertService.dispatchIncident({
        incidentType: systemIncidentAlertService.INCIDENT_TYPES.ORDER_SYNC_STOPPAGE,
        title: 'تجربة',
        message: 'رسالة'
    });
    assert.strictEqual(missingCompResult.sent, false);
    assert.strictEqual(missingCompResult.reason, 'missing_company_id');
    console.log('✅ 2. Guard for missing companyId verified.');

    // 3. Test Cooldown Mechanism
    systemIncidentAlertService.cooldowns.clear();
    const isCool1 = systemIncidentAlertService.isCoolingDown('comp_test', 'ORDER_SYNC_STOPPAGE', 'entity_1');
    assert.strictEqual(isCool1, false, 'Should not be cooling down initially');

    systemIncidentAlertService.markIncidentSent('comp_test', 'ORDER_SYNC_STOPPAGE', 'entity_1');
    const isCool2 = systemIncidentAlertService.isCoolingDown('comp_test', 'ORDER_SYNC_STOPPAGE', 'entity_1');
    assert.strictEqual(isCool2, true, 'Should be cooling down immediately after sent');

    const isCoolDifferentEntity = systemIncidentAlertService.isCoolingDown('comp_test', 'ORDER_SYNC_STOPPAGE', 'entity_2');
    assert.strictEqual(isCoolDifferentEntity, false, 'Different entity should not be cooled down');
    console.log('✅ 3. Cooldown deduplication logic verified.');

    // 4. Test Telegram Text Builder
    const tgText = systemIncidentAlertService.buildTelegramAlertText({
        companyName: 'متجر سوان',
        title: '⚠️ تعطل مزامنة أوردرات WooCommerce',
        message: 'توقفت الأوردرات عن النزول بسبب خطأ 500',
        incidentType: 'ORDER_SYNC_STOPPAGE',
        severity: 'CRITICAL',
        url: '/orders',
        metadata: { storeUrl: 'https://swan.com', errorCount: 3 }
    });
    assert(tgText.includes('[SYSTEM ALERT - ORDER_SYNC_STOPPAGE]'), 'Should contain alert tag');
    assert(tgText.includes('متجر سوان'), 'Should contain company name');
    assert(tgText.includes('تعطل مزامنة'), 'Should contain title');
    assert(tgText.includes('https://maxp.online/orders'), 'Should contain absolute url');
    assert(tgText.includes('storeUrl: https://swan.com'), 'Should contain metadata');
    console.log('✅ 4. Telegram Alert text formatting verified.');

    // 5. Test Notification Preferences Service Integration
    const { DEFAULT_NOTIFICATION_TYPES } = require('../services/notificationPreferencesService');
    const hasIncident = DEFAULT_NOTIFICATION_TYPES.some(t => t.id === 'system_incident');
    const hasOrderStoppage = DEFAULT_NOTIFICATION_TYPES.some(t => t.id === 'order_sync_stoppage');
    const hasAdStoppage = DEFAULT_NOTIFICATION_TYPES.some(t => t.id === 'ad_campaign_stoppage');
    const hasAutomation = DEFAULT_NOTIFICATION_TYPES.some(t => t.id === 'automation_lifecycle');

    assert(hasIncident, 'system_incident must be in DEFAULT_NOTIFICATION_TYPES');
    assert(hasOrderStoppage, 'order_sync_stoppage must be in DEFAULT_NOTIFICATION_TYPES');
    assert(hasAdStoppage, 'ad_campaign_stoppage must be in DEFAULT_NOTIFICATION_TYPES');
    assert(hasAutomation, 'automation_lifecycle must be in DEFAULT_NOTIFICATION_TYPES');
    console.log('✅ 5. Notification types registration verified.');

    console.log('🎉 ALL SYSTEM INCIDENT ALERT TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
