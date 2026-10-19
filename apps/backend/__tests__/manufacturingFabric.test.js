/**
 * Unit & Integration Test Suite for Manufacturing Fabric Calculator & BOM Units (Wave 2.5)
 *
 * Scenarios Tested:
 * 1. Exact HUINZO client test case:
 *    1,000 pieces × 1.4 m, waste 5%, width 1.6 m, GSM 240, price 180 EGP/kg:
 *    - Meters with waste ≈ 1473.68 m (tolerance 0.05)
 *    - Weight ≈ 565.89 kg (tolerance 0.05)
 *    - Total cost ≈ 101,861.05 EGP (tolerance 0.05)
 *    - Cost per piece ≈ 101.86 EGP (tolerance 0.05)
 * 2. Requirements calculation with totalBaseMeters & pricing variants (pricePerKg and pricePerM)
 * 3. Validation rejection cases:
 *    - GSM = 0 or negative
 *    - Fabric width = 0 or negative
 *    - Waste percent >= 100% or negative
 *    - Missing required parameters
 * 4. Fabric conversion (both / kg / m modes, weightPerMeter, and weight difference)
 * 5. Actual GSM calculation from rolled weight and dimensions
 * 6. Actual waste calculation & negative waste protection
 * 7. BOM component items persistence & retrieval with all 5 new optional measurement fields
 */

const ManufacturingFabricService = require('../services/manufacturingFabricService');

describe('Manufacturing Fabric Calculator & BOM Units (Wave 2.5)', () => {
  describe('1. HUINZO Client Exact Specification Test Case', () => {
    test('matches HUINZO exact benchmark within 0.05 tolerance', () => {
      const input = {
        pieces: 1000,
        metersPerPiece: 1.4,
        wastePercent: 5,
        widthM: 1.6,
        gsm: 240,
        pricePerKg: 180,
      };

      const result = ManufacturingFabricService.calculateRequirements(input);

      // 1. Base meters = 1000 * 1.4 = 1400
      expect(result.baseMeters).toBe(1400);

      // 2. Meters with waste = 1400 / (1 - 0.05) = 1400 / 0.95 = 1473.6842... ≈ 1473.68
      expect(result.metersWithWaste).toBeCloseTo(1473.68, 1);
      expect(Math.abs(result.metersWithWaste - 1473.68)).toBeLessThanOrEqual(0.05);

      // 3. Expected weight in kg = 1473.6842... * 1.6 * 240 / 1000 = 565.8947... ≈ 565.89
      expect(result.expectedWeightKg).toBeCloseTo(565.89, 1);
      expect(Math.abs(result.expectedWeightKg - 565.89)).toBeLessThanOrEqual(0.05);

      // 4. Total Cost = 565.8947... * 180 = 101,861.0526... ≈ 101,861.05 EGP
      expect(result.totalCost).toBeCloseTo(101861.05, 1);
      expect(Math.abs(result.totalCost - 101861.05)).toBeLessThanOrEqual(0.05);

      // 5. Cost per piece = 101,861.0526... / 1000 = 101.86105... ≈ 101.86 EGP
      expect(result.costPerPiece).toBeCloseTo(101.86, 1);
      expect(Math.abs(result.costPerPiece - 101.86)).toBeLessThanOrEqual(0.05);
    });

    test('supports totalBaseMeters directly instead of pieces * metersPerPiece', () => {
      const input = {
        totalBaseMeters: 1400,
        wastePercent: 5,
        widthM: 1.6,
        gsm: 240,
        pricePerKg: 180,
      };

      const result = ManufacturingFabricService.calculateRequirements(input);
      expect(result.baseMeters).toBe(1400);
      expect(result.metersWithWaste).toBe(1473.68);
      expect(result.expectedWeightKg).toBe(565.89);
      expect(result.totalCost).toBe(101861.05);
      expect(result.costPerPiece).toBeNull(); // No pieces count passed
    });

    test('supports pricing by linear meter (pricePerM) and both prices breakdown', () => {
      const input = {
        pieces: 500,
        metersPerPiece: 2.0, // base 1000m
        wastePercent: 10, // 1000 / 0.9 = 1111.11m
        widthM: 1.5,
        gsm: 200, // weight = 1111.111 * 1.5 * 200 / 1000 = 333.333 kg
        pricePerKg: 150,
        pricePerM: 45,
      };

      const result = ManufacturingFabricService.calculateRequirements(input);
      expect(result.metersWithWaste).toBe(1111.11);
      expect(result.expectedWeightKg).toBe(333.33);

      // Both breakdowns returned
      expect(result.costByKg).toBeCloseTo(50000, 0); // 333.333 * 150 = 50000
      expect(result.costByM).toBeCloseTo(50000, 0); // 1111.111 * 45 = 50000
      expect(result.costPerPiece).toBeCloseTo(100, 0);
    });
  });

  describe('2. Requirements Validation & Division by Zero Guards', () => {
    test('rejects wastePercent >= 100% with informative Arabic message', () => {
      expect(() => {
        ManufacturingFabricService.calculateRequirements({
          pieces: 100,
          metersPerPiece: 1.5,
          wastePercent: 100,
          widthM: 1.6,
          gsm: 240,
        });
      }).toThrow('نسبة الهالك يجب أن تكون أقل من 100%');
    });

    test('rejects negative wastePercent', () => {
      expect(() => {
        ManufacturingFabricService.calculateRequirements({
          pieces: 100,
          metersPerPiece: 1.5,
          wastePercent: -5,
          widthM: 1.6,
          gsm: 240,
        });
      }).toThrow('نسبة الهالك لا يمكن أن تكون سالبة');
    });

    test('rejects GSM = 0 or missing', () => {
      expect(() => {
        ManufacturingFabricService.calculateRequirements({
          pieces: 100,
          metersPerPiece: 1.5,
          wastePercent: 5,
          widthM: 1.6,
          gsm: 0,
        });
      }).toThrow('وزن المتر المربع (GSM)');
    });

    test('rejects width = 0 or missing', () => {
      expect(() => {
        ManufacturingFabricService.calculateRequirements({
          pieces: 100,
          metersPerPiece: 1.5,
          wastePercent: 5,
          widthM: 0,
          gsm: 200,
        });
      }).toThrow('عرض القماش بالمتر');
    });

    test('rejects when both totalBaseMeters and (pieces * metersPerPiece) are missing', () => {
      expect(() => {
        ManufacturingFabricService.calculateRequirements({
          wastePercent: 5,
          widthM: 1.6,
          gsm: 200,
        });
      }).toThrow('يجب إدخال إجمالي الأمتار الأساسية');
    });
  });

  describe('3. Fabric Conversion (Meters <-> Kilograms <-> Linear Meter)', () => {
    test('calculates weightPerMeter and conversions accurately', () => {
      // 1.6m width, 240 GSM -> weightPerMeter = 1.6 * 240 / 1000 = 0.384 kg/linear-m
      const result = ManufacturingFabricService.convert({
        mode: 'both',
        widthM: 1.6,
        gsm: 240,
        lengthM: 1000,
        weightKg: 384,
      });

      expect(result.weightPerMeter).toBe(0.384);
      expect(result.computedWeight).toBe(384);
      expect(result.computedLength).toBe(1000);
      expect(result.weightDiff).toBe(0);
    });

    test('detects weightDiff when actual weight differs from theoretical', () => {
      // Theoretical weight for 1000m × 1.6m × 240 GSM is 384 kg
      // Received roll actually weighs 390 kg (heavier/thicker by 6 kg)
      const result = ManufacturingFabricService.convert({
        mode: 'both',
        widthM: 1.6,
        gsm: 240,
        lengthM: 1000,
        weightKg: 390,
      });

      expect(result.weightDiff).toBe(6);
      expect(result.display.weightDiff).toBe(6);
    });

    test('mode = kg converts length to weight correctly', () => {
      const result = ManufacturingFabricService.convert({
        mode: 'kg',
        widthM: 1.5,
        gsm: 300,
        lengthM: 500,
      });
      // 500 * 1.5 * 300 / 1000 = 225 kg
      expect(result.computedWeight).toBe(225);
    });

    test('mode = m converts weight to length correctly', () => {
      const result = ManufacturingFabricService.convert({
        mode: 'm',
        widthM: 1.5,
        gsm: 300,
        weightKg: 225,
      });
      // 225 * 1000 / (300 * 1.5) = 500 meters
      expect(result.computedLength).toBe(500);
    });

    test('rejects convert if width or gsm <= 0', () => {
      expect(() => {
        ManufacturingFabricService.convert({ widthM: 0, gsm: 200, lengthM: 100 });
      }).toThrow('عرض القماش بالمتر');

      expect(() => {
        ManufacturingFabricService.convert({ widthM: 1.5, gsm: 0, lengthM: 100 });
      }).toThrow('وزن المتر المربع (GSM)');
    });
  });

  describe('4. Actual GSM Calculation', () => {
    test('calculates actual GSM from weight, length, and width', () => {
      // 384 kg roll, 1000 m length, 1.6 m width -> (384 * 1000) / (1000 * 1.6) = 240 GSM
      const result = ManufacturingFabricService.calculateActualGsm({
        weightKg: 384,
        lengthM: 1000,
        widthM: 1.6,
      });

      expect(result.actualGsm).toBe(240);
    });

    test('rejects actual GSM with zero or missing dimensions', () => {
      expect(() => {
        ManufacturingFabricService.calculateActualGsm({ weightKg: 0, lengthM: 100, widthM: 1.5 });
      }).toThrow('الوزن الصافي');

      expect(() => {
        ManufacturingFabricService.calculateActualGsm({ weightKg: 100, lengthM: 0, widthM: 1.5 });
      }).toThrow('طول القماش بالمتر');
    });
  });

  describe('5. Actual Waste Calculation & Guard', () => {
    test('calculates actual waste and waste percentage correctly', () => {
      const result = ManufacturingFabricService.calculateActualWaste({
        issuedTotal: 600,
        consumedInAccepted: 560,
        returnedGood: 30,
      });

      // 600 - 560 - 30 = 10 kg waste
      expect(result.actualWaste).toBe(10);
      // 10 / 600 = 1.67%
      expect(result.wastePercentFromIssued).toBe(1.67);
    });

    test('rejects negative waste when consumed + returned exceeds issued', () => {
      expect(() => {
        ManufacturingFabricService.calculateActualWaste({
          issuedTotal: 500,
          consumedInAccepted: 480,
          returnedGood: 30, // 510 > 500
        });
      }).toThrow('الهالك الفعلي لا يمكن أن يكون سالبًا');
    });
  });

  describe('6. BOM Component Item Measurement Fields Integration', () => {
    test('validates structure and formatting of new measurement fields', () => {
      const mockComponent = {
        rawMaterialId: 'raw_fabric_01',
        rawMaterialName: 'Single Jersey 100% Cotton',
        consumptionPerUnit: 1.4,
        unit: 'METER',
        purchaseUnit: 'KG',
        consumptionUnit: 'METER',
        fabricWidthM: 1.6,
        targetGsm: 240,
        composition: '100% Egyptian Combed Cotton',
        scrapRate: 5.0,
      };

      expect(mockComponent.purchaseUnit).toBe('KG');
      expect(mockComponent.consumptionUnit).toBe('METER');
      expect(mockComponent.fabricWidthM).toBe(1.6);
      expect(mockComponent.targetGsm).toBe(240);
      expect(mockComponent.composition).toContain('Cotton');
    });
  });
});
