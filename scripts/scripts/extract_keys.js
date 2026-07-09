const fs = require('fs');
const path = require('path');

const filePath = 'e:/max_p_new/max_p_new/frontend/src/pages/orders/components/OrderWhatsAppNotifications.tsx';
const content = fs.readFileSync(filePath, 'utf8');

const regex = /settingKey:\s*['"]([^'"]+)['"]/g;
let match;
const keys = new Set();
while ((match = regex.exec(content)) !== null) {
    keys.add(match[1]);
}

console.log(JSON.stringify(Array.from(keys), null, 2));
