const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'orders', 'components', 'OrderWhatsAppNotifications.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// Count all key entries
const keys = content.match(/key: '[^']+'/g) || [];
console.log('Total key entries:', keys.length);

// Find duplicates
const seen = {};
const dups = [];
keys.forEach(k => {
    if (seen[k]) dups.push(k);
    else seen[k] = true;
});
console.log('Duplicate keys:', dups.length > 0 ? dups : 'NONE ✅');

// Check important statuses exist
const checks = ['DRAFT', 'PENDING', 'AWAITING_CUSTOMER_INFO', 'QUOTE_SENT', 'PENDING_PAYMENT',
    'PAYMENT_INITIATED', 'COD_PENDING', 'UNDER_REVIEW', 'PICKING', 'PACKED',
    'CANCEL_REQUESTED', 'CANCELLED_BY_CUSTOMER', 'RETURN_REQUESTED', 'RETURN_APPROVED',
    'EXCHANGE_REQUESTED', 'FRAUD_SUSPECTED', 'ON_HOLD', 'SPLIT_SHIPMENT',
    'SHIPMENT_CREATED', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED', 'LOST_IN_TRANSIT',
    'RETURNED_TO_SENDER'];

let allFound = true;
checks.forEach(k => {
    if (!content.includes("key: '" + k + "'")) {
        console.log('MISSING:', k);
        allFound = false;
    }
});
if (allFound) console.log('All checked statuses present ✅');

// Check for "as const" which causes runtime issues in JS
const asConstCount = (content.match(/as const/g) || []).length;
console.log('as const occurrences (should be 0 ideally, TS only):', asConstCount);

// Check file size
console.log('File size:', Math.round(content.length / 1024) + ' KB');

// Check filter categories exist
const cats = ['order', 'payment', 'delivery', 'customer', 'marketing'];
cats.forEach(c => {
    const count = (content.match(new RegExp("category: '" + c + "'", 'g')) || []).length;
    console.log('Category "' + c + '" count:', count);
});
