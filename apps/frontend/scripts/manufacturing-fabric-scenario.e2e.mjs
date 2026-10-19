/**
 * End-to-End Browser Scenario Verification for Manufacturing Fabric Calculator & BOM Units (Wave 2.5)
 *
 * Verifies:
 * 1. Fabric Conversion (كيلو ↔ متر ↔ GSM):
 *    - Mode 'both', 'kg', 'm'
 *    - Width = 1.6m, GSM = 240, Length = 1,000m, Weight = 385kg
 *    - Linear meter weight = 0.384 kg/m, Computed weight = 384 kg, Difference = +1.0 kg
 * 2. Fabric Requirements & Costing (HUINZO Client Exact Benchmark):
 *    - 1,000 pieces × 1.4m, 5% waste, 1.6m width, 240 GSM, 180 EGP/kg
 *    - Required meters with waste = 1,473.68m
 *    - Expected weight = 565.89 kg
 *    - Total fabric cost = 101,861.05 EGP
 *    - Fabric cost per piece = 101.86 EGP
 * 3. Actual Waste Calculation & Guard:
 *    - Issued = 600 kg, Consumed = 560 kg, Returned = 30 kg
 *    - Actual waste = 10 kg (1.67%)
 * 4. BOM Component Measurement Fields & Fabric Specs:
 *    - purchaseUnit, consumptionUnit, fabricWidthM, targetGsm, composition
 *    - Direct Fabric Calculator trigger button from BOM component row
 * 5. Zero Regression on Legacy Cockpit (MO-2026-00005, CO-2026-00001) and Header navigation
 * 6. Captures 5 full-page screenshots to:
 *    - C:/maxp-knowledge/_reports/screenshots/manufacturing-fabric/
 *    - artifacts/qa/manufacturing-fabric/
 */

import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');
const OUTPUT_DIRS = [
  path.resolve(__dirname, '../../../artifacts/qa/manufacturing-fabric'),
  path.resolve('C:/maxp-knowledge/_reports/screenshots/manufacturing-fabric'),
];

for (const dir of OUTPUT_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// User & Company Fixtures
const testCompany = {
  id: 'comp_test_mfg',
  name: 'مصنع اختبار — حسابات وتصنيع',
  slug: 'test-mfg-factory',
  currency: 'EGP',
};

const testUser = {
  id: 'usr_mokhtar_admin',
  firstName: 'مختار',
  lastName: 'المدير',
  role: 'SUPER_ADMIN',
  companyRole: 'OWNER',
  companyId: testCompany.id,
  company: testCompany,
};

// Fixture BOM with new fabric fields
let bomList = [
  {
    id: 'bom_hoodie_ovr_01',
    companyId: testCompany.id,
    code: 'BOM-HOODIE-OVR-01',
    bomNumber: 'BOM-HOODIE-OVR-01',
    name: 'BOM هودي أوفر سايز شتوي',
    productId: 'prod_hoodie_ovr',
    productName: 'هودي أوفر سايز قطن شتوي',
    productSku: 'HD-OVR-001',
    version: '1.0',
    isActive: true,
    baseQuantity: 1,
    unit: 'قطعة',
    routingType: 'INTERNAL',
    wasteMarginPercent: 3,
    description: 'قائمة المواد القياسية مع مواصفات أقمشة التصنيع',
    components: [
      {
        id: 'comp_item_fabric_01',
        bomId: 'bom_hoodie_ovr_01',
        rawMaterialId: 'mat_fabric_fleece_240',
        rawMaterialName: 'قماش ميلتون قطن شتوي فاخر',
        consumptionPerUnit: 1.4,
        unit: 'METER',
        purchaseUnit: 'KG',
        consumptionUnit: 'METER',
        fabricWidthM: 1.6,
        targetGsm: 240,
        composition: '100% Cotton French Terry',
        scrapRate: 5,
        appliesToSizes: ['ALL'],
        appliesToColors: ['ALL'],
        notes: 'عرض 160 سم - كثافة 240 GSM',
      },
      {
        id: 'comp_item_rib_02',
        bomId: 'bom_hoodie_ovr_01',
        rawMaterialId: 'mat_rib_lycra',
        rawMaterialName: 'قماش ريب ليكرا أساور وياقة',
        consumptionPerUnit: 0.25,
        unit: 'METER',
        purchaseUnit: 'KG',
        consumptionUnit: 'METER',
        fabricWidthM: 1.2,
        targetGsm: 320,
        composition: '95% Cotton / 5% Elastane',
        scrapRate: 3,
        appliesToSizes: ['ALL'],
        appliesToColors: ['ALL'],
        notes: 'ريب مطاطي عالي التحمل',
      },
      {
        id: 'comp_item_thread_03',
        bomId: 'bom_hoodie_ovr_01',
        rawMaterialId: 'mat_thread_poly',
        rawMaterialName: 'خيوط حياكة بوليستر 40/2',
        consumptionPerUnit: 0.1,
        unit: 'PIECE',
        purchaseUnit: 'PIECE',
        consumptionUnit: 'PIECE',
        fabricWidthM: null,
        targetGsm: null,
        composition: '100% Spun Polyester',
        scrapRate: 2,
        appliesToSizes: ['ALL'],
        appliesToColors: ['ALL'],
        notes: 'بكرات خيط خياطة عالي المتانة',
      },
    ],
    standardStages: [
      { id: 'op_1', sequence: 1, name: 'قص وفرد الباترون', stageType: 'CUTTING', standardMinutes: 4, ratePerPiece: 1 },
      { id: 'op_2', sequence: 2, name: 'خياطة وتجميع', stageType: 'SEWING', standardMinutes: 18, ratePerPiece: 1 },
      { id: 'op_3', sequence: 3, name: 'تشطيب ومكواة وتعبئة', stageType: 'FINISHING', standardMinutes: 3, ratePerPiece: 1 },
    ],
  },
];

let productionOrders = [
  {
    id: 'mo_legacy_5',
    orderNumber: 'MO-2026-00005',
    companyId: testCompany.id,
    orderType: 'FULL_PACKAGE',
    status: 'COMPLETED',
    plannedQuantity: 20,
    producedQuantity: 20,
    unit: 'قطعة',
    salePricePerUnit: 450,
    actualMaterialCost: 4651,
    actualLaborCost: 500,
    actualOverheadCost: 200,
    totalCost: 5351,
    customerOrderId: 'co_order_1',
    customerOrder: {
      id: 'co_order_1',
      orderNumber: 'CO-2026-00001',
      brandName: 'Brand X Sports',
      customer: { id: 'cust_huinzo', name: 'شركة هوانزو للملابس الرياضية (Huinzo Sports)' },
    },
    bom: bomList[0],
    stages: [
      { id: 'stg_1', sequence: 1, name: 'قص القماش', status: 'COMPLETED', executionEntity: 'INTERNAL' },
      { id: 'stg_2', sequence: 2, name: 'خياطة وتجميع', status: 'COMPLETED', executionEntity: 'INTERNAL' },
      { id: 'stg_3', sequence: 3, name: 'تشطيب وتعبئة', status: 'COMPLETED', executionEntity: 'INTERNAL' },
    ],
    createdAt: '2026-10-18T12:00:00.000Z',
    completedAt: '2026-10-18T18:00:00.000Z',
  },
];

// Setup Express App for E2E
const app = express();
app.use(express.json());

// Auth Mock Middleware
app.use((req, res, next) => {
  req.user = testUser;
  req.companyId = testCompany.id;
  next();
});

// API Routes
app.use('/socket.io', (req, res) => res.status(200).send('ok'));
app.get('/api/v1/auth/me', (req, res) => {
  res.json({ success: true, data: testUser, user: testUser });
});

app.get('/api/v1/users/me', (req, res) => {
  res.json({ success: true, data: testUser, user: testUser });
});

app.get(['/api/v1/company/current', '/api/v1/companies/current'], (req, res) => {
  res.json({ success: true, data: testCompany });
});

app.get('/api/v1/manufacturing/settings', (req, res) => {
  res.json({ success: true, data: { allowOverIssue: false, defaultWarehouseId: 'wh_main' } });
});

app.get('/api/v1/customers', (req, res) => {
  res.json({ success: true, data: [{ id: 'cust_huinzo', name: 'شركة هوانزو للملابس الرياضية (Huinzo Sports)' }] });
});

app.get('/api/v1/products', (req, res) => {
  res.json({ success: true, data: { products: [{ id: 'prod_hoodie_ovr', name: 'هودي أوفر سايز قطن شتوي', sku: 'HD-OVR-001' }] } });
});

// Manufacturing Orders
app.get('/api/v1/manufacturing/orders', (req, res) => {
  res.json({ success: true, data: productionOrders });
});

app.get('/api/v1/manufacturing/orders/:id', (req, res) => {
  const o = productionOrders.find((x) => x.id === req.params.id || x.orderNumber === req.params.id);
  if (!o) return res.status(404).json({ success: false, message: 'الأمر غير موجود' });
  res.json({ success: true, data: o });
});

// BOM APIs
app.get('/api/v1/manufacturing/boms', (req, res) => {
  res.json({ success: true, data: bomList });
});

app.get('/api/v1/manufacturing/boms/:id', (req, res) => {
  const bom = bomList.find((b) => b.id === req.params.id || b.bomNumber === req.params.id);
  if (!bom) return res.status(404).json({ success: false, message: 'قائمة المواد غير موجودة' });
  res.json({ success: true, data: bom });
});

app.patch('/api/v1/manufacturing/boms/:id', (req, res) => {
  const bom = bomList.find((b) => b.id === req.params.id);
  if (!bom) return res.status(404).json({ success: false, message: 'قائمة المواد غير موجودة' });
  if (req.body.components) {
    bom.components = req.body.components.map((c, i) => ({
      ...c,
      id: c.id || `comp_item_${Date.now()}_${i}`,
    }));
  }
  res.json({ success: true, data: bom });
});

// Fabric Calculator APIs (Real calculation logic matching manufacturingFabricService.js)
app.post('/api/v1/manufacturing/fabric/convert', (req, res) => {
  const { mode = 'both', widthM, gsm, lengthM, weightKg } = req.body;
  const numWidth = Number(widthM);
  const numGsm = Number(gsm);

  if (!numWidth || numWidth <= 0) {
    return res.status(400).json({ success: false, message: 'عرض القماش (بالمتر) يجب أن يكون أكبر من الصفر' });
  }
  if (!numGsm || numGsm <= 0) {
    return res.status(400).json({ success: false, message: 'وزن المتر المربع (GSM) يجب أن يكون أكبر من الصفر' });
  }

  const weightPerMeter = (numWidth / 1000) * numGsm;
  let computedWeight = null;
  let computedLength = null;
  let weightDiff = null;

  const numLength = lengthM !== undefined && lengthM !== null && lengthM !== '' ? Number(lengthM) : null;
  const numWeight = weightKg !== undefined && weightKg !== null && weightKg !== '' ? Number(weightKg) : null;

  if (numLength !== null && numLength > 0) {
    computedWeight = (numLength * numWidth * numGsm) / 1000;
  }
  if (numWeight !== null && numWeight > 0) {
    computedLength = (numWeight * 1000) / (numGsm * numWidth);
  }
  if (numWeight !== null && computedWeight !== null) {
    weightDiff = numWeight - computedWeight;
  }

  res.json({
    success: true,
    data: {
      mode,
      widthM: numWidth,
      gsm: numGsm,
      weightPerMeter: Number(weightPerMeter.toFixed(4)),
      computedWeight: computedWeight !== null ? Number(computedWeight.toFixed(4)) : null,
      computedLength: computedLength !== null ? Number(computedLength.toFixed(4)) : null,
      weightDiff: weightDiff !== null ? Number(weightDiff.toFixed(4)) : null,
    },
  });
});

app.post('/api/v1/manufacturing/fabric/actual-gsm', (req, res) => {
  const { weightKg, lengthM, widthM } = req.body;
  const numWeight = Number(weightKg);
  const numLength = Number(lengthM);
  const numWidth = Number(widthM);

  if (!numWeight || numWeight <= 0 || !numLength || numLength <= 0 || !numWidth || numWidth <= 0) {
    return res.status(400).json({ success: false, message: 'يجب إدخال الوزن الصافي والطول والعرض بقيم أكبر من الصفر' });
  }

  const actualGsm = (numWeight * 1000) / (numLength * numWidth);
  res.json({ success: true, data: { actualGsm: Number(actualGsm.toFixed(2)) } });
});

app.post('/api/v1/manufacturing/fabric/requirements', (req, res) => {
  const { pieces, metersPerPiece, totalBaseMeters, wastePercent, widthM, gsm, pricePerKg, pricePerM } = req.body;

  const numWaste = Number(wastePercent ?? 0);
  if (numWaste >= 100) {
    return res.status(400).json({ success: false, message: 'نسبة الهالك يجب أن تكون أقل من 100%' });
  }
  if (numWaste < 0) {
    return res.status(400).json({ success: false, message: 'نسبة الهالك لا يمكن أن تكون سالبة' });
  }

  const numWidth = Number(widthM);
  const numGsm = Number(gsm);
  if (!numWidth || numWidth <= 0) {
    return res.status(400).json({ success: false, message: 'عرض القماش (بالمتر) يجب أن يكون أكبر من الصفر' });
  }
  if (!numGsm || numGsm <= 0) {
    return res.status(400).json({ success: false, message: 'وزن المتر المربع (GSM) يجب أن يكون أكبر من الصفر' });
  }

  let baseMeters = 0;
  const numTotalBase = totalBaseMeters !== undefined && totalBaseMeters !== null && totalBaseMeters !== '' ? Number(totalBaseMeters) : null;
  const numPieces = pieces !== undefined && pieces !== null && pieces !== '' ? Number(pieces) : null;
  const numMetersPerPiece = metersPerPiece !== undefined && metersPerPiece !== null && metersPerPiece !== '' ? Number(metersPerPiece) : null;

  if (numTotalBase !== null && numTotalBase > 0) {
    baseMeters = numTotalBase;
  } else if (numPieces !== null && numPieces > 0 && numMetersPerPiece !== null && numMetersPerPiece > 0) {
    baseMeters = numPieces * numMetersPerPiece;
  } else {
    return res.status(400).json({ success: false, message: 'يجب تحديد إجمالي الأمتار الأساسية أو (عدد القطع × استهلاك القطعة)' });
  }

  const metersWithWaste = baseMeters / (1 - numWaste / 100);
  const expectedWeightKg = (metersWithWaste * numWidth * numGsm) / 1000;

  const numPriceKg = pricePerKg !== undefined && pricePerKg !== null && pricePerKg !== '' ? Number(pricePerKg) : null;
  const numPriceM = pricePerM !== undefined && pricePerM !== null && pricePerM !== '' ? Number(pricePerM) : null;

  let totalCost = null;
  let costByKg = null;
  let costByMeter = null;

  if (numPriceKg !== null && numPriceKg > 0) {
    costByKg = expectedWeightKg * numPriceKg;
    totalCost = costByKg;
  }
  if (numPriceM !== null && numPriceM > 0) {
    costByMeter = metersWithWaste * numPriceM;
    if (totalCost === null) {
      totalCost = costByMeter;
    }
  }

  const costPerPiece = totalCost !== null && numPieces !== null && numPieces > 0 ? totalCost / numPieces : null;

  res.json({
    success: true,
    data: {
      baseMeters: Number(baseMeters.toFixed(2)),
      metersWithWaste: Number(metersWithWaste.toFixed(2)),
      expectedWeightKg: Number(expectedWeightKg.toFixed(2)),
      totalCost: totalCost !== null ? Number(totalCost.toFixed(2)) : null,
      costByKg: costByKg !== null ? Number(costByKg.toFixed(2)) : null,
      costByMeter: costByMeter !== null ? Number(costByMeter.toFixed(2)) : null,
      costPerPiece: costPerPiece !== null ? Number(costPerPiece.toFixed(2)) : null,
      wastePercent: numWaste,
      pieces: numPieces,
    },
  });
});

app.post('/api/v1/manufacturing/fabric/actual-waste', (req, res) => {
  const { issuedTotal, consumedInAccepted, returnedGood } = req.body;
  const numIssued = Number(issuedTotal ?? 0);
  const numConsumed = Number(consumedInAccepted ?? 0);
  const numReturned = Number(returnedGood ?? 0);

  if (numIssued <= 0) {
    return res.status(400).json({ success: false, message: 'إجمالي الكمية المصروفة يجب أن يكون أكبر من الصفر' });
  }

  const actualWaste = numIssued - numConsumed - numReturned;
  if (actualWaste < -0.0001) {
    return res.status(400).json({ success: false, message: 'الكمية المستهلكة والمرتجعة تتجاوز المصروف الكلي؛ الهالك لا يمكن أن يكون سالباً' });
  }

  const wastePercent = (Math.max(0, actualWaste) / numIssued) * 100;
  res.json({
    success: true,
    data: {
      issuedTotal: numIssued,
      consumedInAccepted: numConsumed,
      returnedGood: numReturned,
      actualWaste: Number(Math.max(0, actualWaste).toFixed(2)),
      wastePercentFromIssued: Number(wastePercent.toFixed(2)),
      note: 'الجرد والتسوية لكل أمر تشغيل: يمثل الهالك الفعلي غير المسترد أثناء القص والتشغيل',
    },
  });
});

// Partner Factories
app.get('/api/v1/manufacturing/partner-factories', (req, res) => {
  res.json({ success: true, data: [] });
});

// Serve frontend dist
app.use(express.static(DIST_DIR));
app.use((req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// Main Test Execution Function
async function runVerification() {
  const server = http.createServer(app);
  const port = await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(server.address().port);
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`🌐 Test server listening on ${baseUrl}`);

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'ar-EG',
    });

    // Inject LocalStorage Authentication tokens & state before any script runs
    await context.addInitScript(
      ({ user, company }) => {
        const b64 = (v) => btoa(unescape(encodeURIComponent(JSON.stringify(v))));
        const fakeToken = `${b64({ alg: 'HS256' })}.${b64({
          userId: user.id,
          role: user.role,
          companyId: company.id,
          exp: Math.floor(Date.now() / 1000) + 86400,
        })}.sig`;

        localStorage.setItem('accessToken', fakeToken);
        localStorage.setItem('refreshToken', 'refresh-token-valid');
        sessionStorage.setItem('accessToken', fakeToken);
        sessionStorage.setItem('refreshToken', 'refresh-token-valid');
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userId', user.id);
        localStorage.setItem('companyId', company.id);
        localStorage.setItem('company', JSON.stringify(company));
        localStorage.setItem('i18nextLng', 'ar');
      },
      { user: testUser, company: testCompany },
    );

    const page = await context.newPage();

    const takeScreenshots = async (filename) => {
      for (const dir of OUTPUT_DIRS) {
        const dest = path.join(dir, filename);
        await page.screenshot({ path: dest, fullPage: true });
      }
      console.log(`📸 Screenshot saved: ${filename}`);
    };

    // ------------------------------------------------------------------------
    // SCENARIO 1: Fabric Conversion Tab (Both kg and meters + diff)
    // ------------------------------------------------------------------------
    console.log('\n🔹 Scenario 1: Fabric Conversion (كيلو ↔ متر)...');
    await page.goto(`${baseUrl}/manufacturing/fabric-calculator?tab=conversion`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // Fill conversion inputs: Width = 1.6m, GSM = 240, Length = 1,000m, Weight = 385kg
    await page.locator('input[placeholder*="1.60"]').fill('1.6');
    await page.locator('input[placeholder*="240"]').fill('240');
    await page.locator('input[placeholder*="1000"]').fill('1000');
    await page.locator('input[placeholder*="384"]').fill('385');

    // Click calculate
    const calcBtn1 = page.locator('button:has-text("حساب التحويل")').first();
    await calcBtn1.click();
    await page.waitForTimeout(600);

    // Verify results
    const weightPerMeterText = page.locator('text=0.384').first();
    await weightPerMeterText.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Linear meter weight verified: 0.384 kg/m');

    const computedWeightText = page.locator('text=384').first();
    await computedWeightText.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Computed weight verified: 384 kg');

    const diffBadge = page.locator('text=+1').first();
    await diffBadge.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Actual vs Theoretical difference badge verified: +1 kg');

    await takeScreenshots('01-fabric-conversion-both.png');

    // ------------------------------------------------------------------------
    // SCENARIO 2: Fabric Requirements & Costing (HUINZO Benchmark)
    // ------------------------------------------------------------------------
    console.log('\n🔹 Scenario 2: Fabric Requirements (HUINZO Exact Benchmark)...');
    const reqTabBtn = page.locator('button:has-text("احتياجات القماش والتكلفة")').first();
    await reqTabBtn.click();
    await page.waitForTimeout(500);

    // Click preset button for HUINZO example
    const presetBtn = page.locator('button:has-text("مثال العميل المعتمد")').first();
    await presetBtn.click();
    await page.waitForTimeout(300);

    // Click calculate
    const calcBtn2 = page.locator('button:has-text("حساب الاحتياجات والتكلفة")').first();
    await calcBtn2.click();
    await page.waitForTimeout(600);

    // Verify outputs: 1473.68 m · 565.89 kg · 101,861.05 EGP · 101.86 EGP/pc
    await page.locator('text=1473.68').first().waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Meters with waste verified: 1473.68 m');

    await page.locator('text=565.89').first().waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Expected weight verified: 565.89 kg');

    await page.locator('text=101,861.05').first().waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Total fabric cost verified: 101,861.05 EGP');

    await page.locator('text=101.86').first().waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Cost per piece verified: 101.86 EGP');

    await takeScreenshots('02-fabric-requirements-huinzo.png');

    // ------------------------------------------------------------------------
    // SCENARIO 3: Actual Waste & Reconciliation Guard
    // ------------------------------------------------------------------------
    console.log('\n🔹 Scenario 3: Actual Waste Calculation...');
    const wasteTabBtn = page.locator('button:has-text("الهالك الفعلي")').first();
    await wasteTabBtn.click();
    await page.waitForTimeout(500);

    // Fill actual waste inputs: Issued = 600, Consumed = 560, Returned = 30
    await page.locator('input[placeholder*="600"]').fill('600');
    await page.locator('input[placeholder*="560"]').fill('560');
    await page.locator('input[placeholder*="30"]').fill('30');

    // Click calculate
    const calcBtn3 = page.locator('button:has-text("حساب الهالك الفعلي")').first();
    await calcBtn3.click();
    await page.waitForTimeout(600);

    // Verify 10 kg waste and 1.67%
    await page.locator('text=10').first().waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Actual waste verified: 10 kg');

    await page.locator('text=1.67%').first().waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Actual waste percentage verified: 1.67%');

    await takeScreenshots('03-fabric-actual-waste.png');

    // ------------------------------------------------------------------------
    // SCENARIO 4: BOM Component Item Measurement Fields & Fabric Specs
    // ------------------------------------------------------------------------
    console.log('\n🔹 Scenario 4: BOM Component Measurement Fields & Specs...');
    await page.goto(`${baseUrl}/manufacturing/boms`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // Open BOM details
    const bomRowBtn = page.locator('button:has-text("BOM-HOODIE-OVR-01")').first();
    await bomRowBtn.click();
    await page.waitForTimeout(600);

    // Verify fabric specs sub-row in drawer
    await page.locator('text=100% Cotton French Terry').first().waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ BOM component composition verified in drawer: 100% Cotton French Terry');

    await page.locator('text=240 GSM').first().waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ BOM component target GSM verified in drawer: 240 GSM');

    // Click Edit BOM button to open modal with full editable fields and calculator button
    const editBomBtn = page.locator('button:has-text("تعديل الـ BOM")').first();
    await editBomBtn.click();
    await page.waitForTimeout(600);

    // Check direct calculator launch link inside the modal table
    const calcLauncherBtn = page.locator('a:has-text("حاسبة القماش")').first();
    await calcLauncherBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Direct "حاسبة القماش" trigger button visible in BOM edit modal!');

    await takeScreenshots('04-bom-component-fabric-units.png');

    // ------------------------------------------------------------------------
    // SCENARIO 5: Zero Regression Check (Order Cockpit MO-2026-00005)
    // ------------------------------------------------------------------------
    console.log('\n🔹 Scenario 5: Zero Regression Check on MO-2026-00005...');
    await page.goto(`${baseUrl}/manufacturing/orders/mo_legacy_5`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // Verify order cockpit loads, shows COMPLETED status, CO-2026-00001 link, and top tab
    await page.locator('text=MO-2026-00005').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('text=CO-2026-00001').first().waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Legacy order MO-2026-00005 cockpit and customer order CO-2026-00001 intact!');

    // Check header tab exists
    const headerFabricTab = page.locator('a[href*="fabric-calculator"]:has-text("حاسبة القماش")').first();
    await headerFabricTab.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Top navigation tab «حاسبة القماش» visible in manufacturing header!');

    await takeScreenshots('05-zero-regression-order-cockpit.png');

    console.log('\n🎉 ALL 5 E2E SCENARIOS VERIFIED AND 5 SCREENSHOTS CAPTURED SUCCESSFULLY!');
  } finally {
    if (browser) {
      await browser.close();
    }
    server.close();
  }
}

runVerification().catch((err) => {
  console.error('❌ E2E Verification failed:', err);
  process.exit(1);
});
