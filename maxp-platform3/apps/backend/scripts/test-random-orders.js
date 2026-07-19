const { t: i18n } = require('./i18n');
// Script to create orders with random data
const axios = require('axios');

const names = [i18n.t('msg.6b58ccd2'), i18n.t('msg.9aab3ed9'), i18n.t('msg.cdf4d9bd'), i18n.t('msg.30779869'), i18n.t('msg.fa60d5da'), i18n.t('msg.fd1129a0'), i18n.t('msg.eab5a102'), i18n.t('msg.0323c8a6'), i18n.t('msg.8ba10ac8'), i18n.t('msg.264b163d'), i18n.t('msg.2fe0f319'), i18n.t('msg.f27559ca')];
const streets = [i18n.t('msg.8a1124c6'), i18n.t('msg.a4df3aff'), i18n.t('msg.9a23a162'), i18n.t('msg.e5f34c6b'), i18n.t('msg.de10111b'), i18n.t('msg.13ab9e86'), i18n.t('msg.adef8af6'), i18n.t('msg.227dad33')];
const cities = [i18n.t('msg.98dfb7b0'), i18n.t('msg.44084d3e'), i18n.t('msg.dfa5b431')];

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomPhone() {
    return "2010i18n.t('msg.7ac03211')cash",
        items: [{
            productId: "cmlf8r324004duwlglosdba6n",
            name: i18n.t('msg.f20089d8'),
            price: 21860,
            quantity: 1
        }]
    };

    try {
        const response = await axios.post(
            'http://localhost:3007/api/v1/public/orders?companyId=cmlf8d5ne0000uwoss617a61i',
            orderData,
            { headers: { 'Content-Type': 'application/json' } }
        );
        console.log('Order created:', response.data.data?.orderNumber || 'Success');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Create 3 orders with random data
(async () => {
    for (let i = 0; i < 3; i++) {
        await createOrder();
        await new Promise(r => setTimeout(r, 1000));
    }
})();
