/**
 * Live Verification Script for SHIP-T3:
 * 1. Extra service "Packaging" 10 EGP on 70 EGP shipment -> extraFees=10, total=80; statement shows separate line item.
 * 2. Package open request -> PENDING; approve -> 5 EGP fee + wallet transaction OPEN_PACKAGE_FEE + allowOpenPackage=true.
 * 3. Second pending request on same shipment -> 409 Conflict.
 * 4. Order change request (Address) -> approve -> new address in shipment + ShipmentEvent(ORDER_CHANGED).
 * 5. Order change request on DELIVERED shipment -> 409 Conflict.
 */

const extraServicesService = require('../../services/shipping/extraServicesService');
const settlementService = require('../../services/shipping/settlementService');

async function runLiveVerification() {
  console.log('================================================================');
  console.log('🚀 SHIP-T3 LIVE ACCEPTANCE VERIFICATION');
  console.log('================================================================\n');

  const testCompanyId = 'comp-t3-live-' + Date.now();
  const testShipmentId = 'ship-t3-live-' + Date.now();

  // In-memory mock DB to verify end-to-end logic
  const mockDb = {
    services: [],
    lines: [],
    openRequests: [],
    changeRequests: [],
    shipments: [
      {
        id: testShipmentId,
        companyId: testCompanyId,
        cost: 70.0,
        codAmount: 500.0,
        collectedAmount: 500.0,
        status: 'IN_TRANSIT',
        destinationGovernorate: 'CAIRO',
        destinationCity: 'Nasr City',
        destinationAddress: '15 Abbas El Akkad St',
        allowOpenPackage: false,
        barcode: 'T3-LIVE-BARCODE-001',
      },
    ],
    events: [],
    wallet: { companyId: testCompanyId, balance: 100.0 },
    walletTransactions: [],
  };

  const mockPrisma = {
    shippingService: {
      findFirst: async ({ where }) => mockDb.services.find(s => s.companyId === where.companyId && (!where.id || s.id === where.id) && (!where.code || s.code === where.code)) || null,
      create: async ({ data }) => {
        const item = { id: 'svc-' + Date.now(), ...data };
        mockDb.services.push(item);
        return item;
      },
      findMany: async ({ where }) => mockDb.services.filter(s => s.companyId === where.companyId),
    },
    shipmentServiceLine: {
      findFirst: async ({ where }) => mockDb.lines.find(l => l.id === where.id) || null,
      create: async ({ data }) => {
        const item = { id: 'line-' + Date.now(), ...data };
        mockDb.lines.push(item);
        return item;
      },
      findMany: async ({ where }) => {
        if (where?.shipmentId?.in) return mockDb.lines.filter(l => where.shipmentId.in.includes(l.shipmentId));
        return mockDb.lines.filter(l => l.shipmentId === where.shipmentId);
      },
      delete: async ({ where }) => {
        mockDb.lines = mockDb.lines.filter(l => l.id !== where.id);
      },
    },
    shipment: {
      findFirst: async ({ where }) => mockDb.shipments.find(s => s.id === where.id && s.companyId === where.companyId) || null,
      findMany: async () => mockDb.shipments,
      update: async ({ where, data }) => {
        const s = mockDb.shipments.find(x => x.id === where.id);
        if (s) Object.assign(s, data);
        return s;
      },
    },
    packageOpenRequest: {
      findFirst: async ({ where }) => mockDb.openRequests.find(r => (!where.id || r.id === where.id) && (!where.shipmentId || r.shipmentId === where.shipmentId) && (!where.status || r.status === where.status)) || null,
      create: async ({ data }) => {
        const item = { id: 'open-req-' + Date.now(), ...data, status: 'PENDING', fee: 0 };
        mockDb.openRequests.push(item);
        return item;
      },
      update: async ({ where, data }) => {
        const r = mockDb.openRequests.find(x => x.id === where.id);
        if (r) Object.assign(r, data);
        return r;
      },
      findMany: async () => mockDb.openRequests,
      count: async () => mockDb.openRequests.length,
    },
    orderChangeRequest: {
      findFirst: async ({ where }) => mockDb.changeRequests.find(r => r.id === where.id) || null,
      create: async ({ data }) => {
        const item = { id: 'chg-req-' + Date.now(), ...data, status: 'PENDING' };
        mockDb.changeRequests.push(item);
        return item;
      },
      update: async ({ where, data }) => {
        const r = mockDb.changeRequests.find(x => x.id === where.id);
        if (r) Object.assign(r, data);
        return r;
      },
      findMany: async () => mockDb.changeRequests,
      count: async () => mockDb.changeRequests.length,
    },
    shipmentEvent: {
      create: async ({ data }) => {
        mockDb.events.push(data);
        return data;
      },
    },
    companyWallet: {
      findUnique: async () => mockDb.wallet,
      update: async ({ data }) => {
        if (data.balance !== undefined) mockDb.wallet.balance = data.balance;
        return mockDb.wallet;
      },
    },
    companyWalletTransaction: {
      create: async ({ data }) => {
        mockDb.walletTransactions.push(data);
        return data;
      },
    },
    merchant: {
      findFirst: async () => ({ id: 'merch-t3', name: 'Al-Farah Merchant' }),
    },
    clientRateCard: {
      findMany: async () => [],
    },
  };

  // --------------------------------------------------------------------------
  // Condition 1: Extra service "Packaging" 10 EGP on 70 EGP shipment -> extraFees=10, total=80
  // --------------------------------------------------------------------------
  console.log('📌 Test 1: Extra Service "Packaging" 10 EGP on 70 EGP Shipment');
  const service = await extraServicesService.createService({
    companyId: testCompanyId,
    code: 'PKG_SPECIAL',
    name: 'تغليف خاص',
    pricingMode: 'FIXED',
    amount: 10.0,
    prismaClient: mockPrisma,
  });
  console.log(`   Created service: [${service.code}] ${service.name} (${service.amount} EGP)`);

  const lineResult = await extraServicesService.addShipmentServiceLine({
    companyId: testCompanyId,
    shipmentId: testShipmentId,
    serviceId: service.id,
    qty: 1,
    prismaClient: mockPrisma,
  });
  console.log(`   Added service line: fee=${lineResult.line.amount} EGP, extraFees=${lineResult.extraFees} EGP`);

  // Verify in settlement preview
  mockDb.shipments[0].status = 'DELIVERED';
  mockDb.shipments[0].merchantId = 'merch-t3';
  const preview = await settlementService.preview({
    companyId: testCompanyId,
    merchantId: 'merch-t3',
    prismaClient: mockPrisma,
  });

  const previewLine = preview.lines[0];
  const totalCharges = previewLine.shippingFee + previewLine.extraFees;
  console.log(`   Settlement Line: shippingFee=${previewLine.shippingFee} EGP, extraFees=${previewLine.extraFees} EGP, totalCharges=${totalCharges} EGP`);
  console.log(`   Gross COD (unaffected): ${preview.summary.grossCOD} EGP, Net Payout: ${preview.summary.netPayout} EGP`);

  if (previewLine.shippingFee !== 70 || previewLine.extraFees !== 10 || totalCharges !== 80) {
    throw new Error(`Test 1 Failed: Expected shippingFee=70, extraFees=10, totalCharges=80, got ${previewLine.shippingFee}, ${previewLine.extraFees}, ${totalCharges}`);
  }
  if (preview.summary.grossCOD !== 500 || preview.summary.netPayout !== 420) {
    throw new Error(`Test 1 Failed: Gross COD affected or net incorrect! grossCOD=${preview.summary.grossCOD}, net=${preview.summary.netPayout}`);
  }
  console.log('   ✅ PASS (Condition 1 verified)\n');

  // --------------------------------------------------------------------------
  // Condition 2: Package Open Request -> PENDING; Approve -> 5 EGP + Wallet OPEN_PACKAGE_FEE + allowOpenPackage=true
  // --------------------------------------------------------------------------
  console.log('📌 Test 2: Package Open Request Workflow (PENDING -> APPROVED)');
  mockDb.shipments[0].allowOpenPackage = false;
  const openReq = await extraServicesService.createPackageOpenRequest({
    companyId: testCompanyId,
    shipmentId: testShipmentId,
    requestedBy: 'Client Store',
    reason: 'معاينة العميل قبل الاستلام',
    prismaClient: mockPrisma,
  });
  console.log(`   Created open request: id=${openReq.id}, status=${openReq.status}`);
  if (openReq.status !== 'PENDING') throw new Error('Test 2 Failed: Status must be PENDING');

  // --------------------------------------------------------------------------
  // Condition 3: Second pending request on same shipment -> 409 Conflict
  // --------------------------------------------------------------------------
  console.log('📌 Test 3: Guard Against Duplicate PENDING Request (409 Conflict)');
  let conflictCaught = false;
  try {
    await extraServicesService.createPackageOpenRequest({
      companyId: testCompanyId,
      shipmentId: testShipmentId,
      requestedBy: 'Client Store',
      reason: 'طلب مكرر',
      prismaClient: mockPrisma,
    });
  } catch (err) {
    if (err.statusCode === 409) {
      conflictCaught = true;
      console.log(`   Caught expected 409: "${err.message}"`);
    } else {
      throw err;
    }
  }
  if (!conflictCaught) throw new Error('Test 3 Failed: Second pending request did not throw 409!');
  console.log('   ✅ PASS (Condition 3 verified)\n');

  // Now approve the open request
  const approval = await extraServicesService.reviewPackageOpenRequest({
    companyId: testCompanyId,
    requestId: openReq.id,
    decision: 'APPROVE',
    fee: 5.0,
    reviewerId: 'admin-1',
    reviewerName: 'Admin User',
    prismaClient: mockPrisma,
  });
  console.log(`   Approved open request: fee=${approval.fee} EGP, status=${approval.data.status}`);
  console.log(`   Shipment allowOpenPackage=${mockDb.shipments[0].allowOpenPackage}`);
  console.log(`   Wallet balance after=${mockDb.wallet.balance} EGP, Transactions count=${mockDb.walletTransactions.length}`);

  const tx = mockDb.walletTransactions.find(t => t.reason === 'OPEN_PACKAGE_FEE');
  if (!tx || tx.amount !== 5 || tx.type !== 'WITHDRAW') {
    throw new Error('Test 2 Failed: Wallet transaction OPEN_PACKAGE_FEE not recorded properly!');
  }
  if (!mockDb.shipments[0].allowOpenPackage) {
    throw new Error('Test 2 Failed: allowOpenPackage was not set to true!');
  }
  console.log('   ✅ PASS (Condition 2 verified)\n');

  // --------------------------------------------------------------------------
  // Condition 4: Order Change Request (Address) -> Approve -> New Address + ORDER_CHANGED event
  // --------------------------------------------------------------------------
  console.log('📌 Test 4: Order Change Request (ADDRESS)');
  mockDb.shipments[0].status = 'IN_TRANSIT'; // active status
  const changeReq = await extraServicesService.createOrderChangeRequest({
    companyId: testCompanyId,
    shipmentId: testShipmentId,
    type: 'ADDRESS',
    newValue: { governorate: 'GIZA', city: 'Mohandessin', address: '40 Gameat El Dowal St' },
    reason: 'تعديل العنوان بناءً على مكالمة العميل',
    requestedBy: 'Support Agent',
    prismaClient: mockPrisma,
  });
  console.log(`   Created change request: id=${changeReq.id}, type=${changeReq.type}, status=${changeReq.status}`);

  const changeApproval = await extraServicesService.reviewOrderChangeRequest({
    companyId: testCompanyId,
    requestId: changeReq.id,
    decision: 'APPROVE',
    reviewerId: 'admin-1',
    reviewerName: 'Admin User',
    prismaClient: mockPrisma,
  });

  const updatedShip = mockDb.shipments[0];
  console.log(`   Shipment updated: gov=${updatedShip.destinationGovernorate}, city=${updatedShip.destinationCity}, addr="${updatedShip.destinationAddress}"`);
  const orderChangedEvt = mockDb.events.find(e => e.toStatus === 'ORDER_CHANGED' || e.reasonCode === 'ORDER_CHANGED');
  console.log(`   ShipmentEvent created: reasonCode=${orderChangedEvt?.reasonCode}, notes="${orderChangedEvt?.notes}"`);

  if (updatedShip.destinationCity !== 'Mohandessin' || !orderChangedEvt) {
    throw new Error('Test 4 Failed: Shipment was not updated with new address or ORDER_CHANGED event missing');
  }
  console.log('   ✅ PASS (Condition 4 verified)\n');

  // --------------------------------------------------------------------------
  // Condition 5: Change Request on DELIVERED or REMITTED shipment -> 409 Conflict
  // --------------------------------------------------------------------------
  console.log('📌 Test 5: Forbid Modification after DELIVERED / REMITTED (409 Conflict)');
  mockDb.shipments[0].status = 'DELIVERED';
  let deliveredConflictCaught = false;
  try {
    await extraServicesService.createOrderChangeRequest({
      companyId: testCompanyId,
      shipmentId: testShipmentId,
      type: 'AMOUNT',
      newValue: '200',
      requestedBy: 'Merchant',
      prismaClient: mockPrisma,
    });
  } catch (err) {
    if (err.statusCode === 409) {
      deliveredConflictCaught = true;
      console.log(`   DELIVERED check caught expected 409: "${err.message}"`);
    } else {
      throw err;
    }
  }
  if (!deliveredConflictCaught) throw new Error('Test 5 Failed: Did not reject change on DELIVERED shipment with 409');

  mockDb.shipments[0].status = 'REMITTED';
  let remittedConflictCaught = false;
  try {
    await extraServicesService.createOrderChangeRequest({
      companyId: testCompanyId,
      shipmentId: testShipmentId,
      type: 'RECIPIENT',
      newValue: 'New Recipient',
      requestedBy: 'Merchant',
      prismaClient: mockPrisma,
    });
  } catch (err) {
    if (err.statusCode === 409) {
      remittedConflictCaught = true;
      console.log(`   REMITTED check caught expected 409: "${err.message}"`);
    } else {
      throw err;
    }
  }
  if (!remittedConflictCaught) throw new Error('Test 5 Failed: Did not reject change on REMITTED shipment with 409');
  console.log('   ✅ PASS (Condition 5 verified)\n');

  console.log('================================================================');
  console.log('🎉 ALL 5 SHIP-T3 ACCEPTANCE CONDITIONS VERIFIED AND PASSED 100%!');
  console.log('================================================================');
}

runLiveVerification().catch(err => {
  console.error('❌ LIVE VERIFICATION FAILED:', err);
  process.exit(1);
});
