const { t: i18n } = require('./i18n');
const { t: i18n } = require('./i18ni18n.t('msg.2d6754e4')axios');

const API_URL = 'http://localhost:3007/apii18n.t('msg.4a17dcee')your-token-herei18n.t('msg.e4cea6a3')🧪 ===== اختبار إشعار PROCESSING =====\n');

    const orderNumber = 'ORD-351462-104';
    const companyId = 'cmlf8d5ne0000uwoss617a61ii18n.t('msg.dae0daa8i18n.t('msg.2302e894'));
        const orderRes = await axios.get(`${API_URL}/orders/${orderNumber}?companyId=${companyId}`, {
            headers: { Authorization: `Bearer ${TOKEN}`${i18n.t('msg.41a937e2')}`${API_URL}/orders/simple/${orderNumber}/status`,
            {
                status: 'PROCESSING',
                notes: i18n.t('msg.2d712919')
            },
            {
                headers: { 
                    Authorization: `Bearer ${TOKEN}`${i18n.t('msg.6cc712b3')}`${API_URL}/whatsapp/notifications?orderId=${order.id}&companyId=${companyId}`,
            {
                headers: { Authorization: `Bearer ${TOKEN}` }
            }
        );

        const logs = logsRes.data;
        const processingLogs = logs.filter(l => l.eventType === 'ORDER_PROCESSING');

        console.log(i18n.t('msg.991e5fea'));
        
        processingLogs.forEach((log, i) => {
            console.log(`${i18n.t('msg.0e5257c2')}${i + 1}:`);
            console.log(i18n.t('msg.5b4f7fd6'));
            console.log(i18n.t('msg.9c4293ea'));
            if (log.status === 'FAILEDi18n.t('msg.ff7341fd')SENTi18n.t('msg.783f510di18n.t('msg.256afbd6'), error.message);
        if (error.response) {
            console.error(i18n.t('msg.34ee3f9a'), error.response.data);
        }
    }

    console.log('\n===== انتهى الاختبار =====i18n.t('msg.1e086f5c')your-token-here') {
    console.log(i18n.t('msg.215283db'));
    console.log('   const TOKEN = "eyJhbG...";');
    process.exit(1);
}

testProcessingViaAPI();
