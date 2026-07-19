/**
 * Test PROCESSING notification via API
 */

const axios = require('axios');

async function testViaAPI() {
    const companyId = 'cmlf8d5ne0000uwoss617a61i';
    const orderNumber = 'ORD-351462-104'; // Change this to your order number
    
    console.log('🧪 Testing via API...\n');
    
    try {
        // First check current order status
        console.log('1. Getting order info...');
        const orderRes = await axios.get(`http://localhost:3007/api/v1/orders/${orderNumber}?companyId=${companyId}`);
        console.log('   Current status:', orderRes.data?.data?.status);
        console.log('   Customer phone:', orderRes.data?.data?.customer?.phone);
        
        // Update status to PROCESSING
        console.log('\n2. Updating status to PROCESSING...');
        const updateRes = await axios.patch(`http://localhost:3007/api/v1/orders/simple/${orderNumber}/status`, {
            companyId,
            status: 'PROCESSING',
            notes: 'Test status update'
        });
        
        console.log('   Update result:', updateRes.data?.success ? '✅ Success' : '❌ Failed');
        console.log('   Message:', updateRes.data?.message);
        
        if (updateRes.data?.data?.turboTrackingNumber) {
            console.log('   Turbo tracking:', updateRes.data.data.turboTrackingNumber);
        }
        
        console.log('\n✅ Check your WhatsApp now!');
        console.log('If message didn\'t arrive, check server logs with: pm2 logs');
        
    } catch (err) {
        console.error('\n❌ Error:', err.response?.data?.message || err.message);
        if (err.response?.status === 404) {
            console.log('\n⚠️ Order not found. Please update the orderNumber in this script.');
        }
    } finally {
        process.exit(0);
    }
}

testViaAPI();
