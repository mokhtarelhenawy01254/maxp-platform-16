const axios = require('axios');
const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
  const trackingCode = '38125791';
  const guest = await prisma.guestOrder.findFirst({
    where: { turboTrackingNumber: trackingCode },
    include: { company: true }
  });

  const updateData = {
    authentication_key: guest.company.turboApiKey,
    code: String(trackingCode),
    main_client_code: 34425,
    remote_order_id: 'ORD-638014-156',
    remote_shipment_id: guest.id,
    receiver: 'ابوشهاب',
    phone1: '01225414714',
    phone2: null,
    api_followup_phone: '01225414714',
    government: 'القاهرة',
    area: 'عرب جسر السويس',
    address: 'جسر السويس حديقة بدر شارع الأربعين أبراج سيجال فوق صيدلية محمد ابو الدهب, عرب جسر السويس, القاهرة',
    notes: 'Order #ORD-638014-156',
    invoice_number: 638014156,
    order_summary: 'Swan Aura',
    return_summary: 'لا يوجد مرتجع',
    amount_to_be_collected: 619,
    return_amount: 0,
    is_order: 1,
    weight: 1,
    delivery_type: 0,
    is_fragile: 0
  };

  console.log('🧪 Sending payload to Turbo API /edit-order:');
  console.log(updateData);

  try {
    const res = await axios.post('https://backoffice.turbo-eg.com/external-api/edit-order', updateData);
    console.log('\n✅ Turbo API Response:');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
  }
}

main().finally(() => process.exit(0));
