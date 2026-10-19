/**
 * Manufacturing Fabric Calculation & Material Requirement Service
 * Wave 2.5: Textile conversions, actual GSM, requirements & costing, actual waste.
 * Client Specification: HUINZO Textile Standard.
 */

const round2 = (val) => (val === null || val === undefined ? null : Math.round((Number(val) || 0) * 100) / 100);
const round3 = (val) => (val === null || val === undefined ? null : Math.round((Number(val) || 0) * 1000) / 1000);
const round4 = (val) => (val === null || val === undefined ? null : Math.round((Number(val) || 0) * 10000) / 10000);

class ManufacturingFabricService {
  /**
   * 1. Fabric Conversion: Meters <-> Kilograms <-> Linear Meter Weight
   * @param {Object} params
   * @param {string} [params.mode='both'] - 'both' | 'kg' | 'm'
   * @param {number} params.widthM - Fabric width in meters (> 0)
   * @param {number} params.gsm - Grams per square meter (> 0)
   * @param {number} [params.lengthM] - Length in meters
   * @param {number} [params.weightKg] - Weight in kilograms
   */
  static convert({ mode = 'both', widthM, gsm, lengthM, weightKg }) {
    const width = Number(widthM);
    const targetGsm = Number(gsm);

    if (widthM === undefined || widthM === null || widthM === '' || isNaN(width) || width <= 0) {
      const err = new Error('عرض القماش بالمتر مطلوب ويجب أن يكون رقمًا أكبر من الصفر');
      err.statusCode = 400;
      throw err;
    }

    if (gsm === undefined || gsm === null || gsm === '' || isNaN(targetGsm) || targetGsm <= 0) {
      const err = new Error('وزن المتر المربع (GSM) مطلوب ويجب أن يكون رقمًا أكبر من الصفر');
      err.statusCode = 400;
      throw err;
    }

    // Weight per linear meter (kg/m) = widthM * GSM / 1000
    const weightPerMeter = (width * targetGsm) / 1000;

    let computedWeight = null;
    let computedLength = null;
    let weightDiff = null;

    const hasLen = lengthM !== undefined && lengthM !== null && lengthM !== '';
    const hasWt = weightKg !== undefined && weightKg !== null && weightKg !== '';

    const len = hasLen ? Number(lengthM) : null;
    const wt = hasWt ? Number(weightKg) : null;

    if (mode === 'kg') {
      // Convert length to weight
      if (!hasLen || isNaN(len) || len <= 0) {
        const err = new Error('طول القماش بالأمتار مطلوب ويجب أن يكون أكبر من الصفر للتحويل إلى وزن');
        err.statusCode = 400;
        throw err;
      }
      computedWeight = (len * width * targetGsm) / 1000;
    } else if (mode === 'm') {
      // Convert weight to length
      if (!hasWt || isNaN(wt) || wt <= 0) {
        const err = new Error('وزن القماش بالكيلوجرام مطلوب ويجب أن يكون أكبر من الصفر للتحويل إلى طول');
        err.statusCode = 400;
        throw err;
      }
      computedLength = (wt * 1000) / (targetGsm * width);
    } else {
      // Mode 'both' or default
      if ((!hasLen || isNaN(len) || len <= 0) && (!hasWt || isNaN(wt) || wt <= 0)) {
        const err = new Error('يجب إدخال الطول بالمتر أو الوزن بالكيلوجرام بقيمة أكبر من الصفر');
        err.statusCode = 400;
        throw err;
      }

      if (hasLen && !isNaN(len) && len > 0) {
        computedWeight = (len * width * targetGsm) / 1000;
      }
      if (hasWt && !isNaN(wt) && wt > 0) {
        computedLength = (wt * 1000) / (targetGsm * width);
      }
      if (hasLen && hasWt && !isNaN(len) && !isNaN(wt) && len > 0 && wt > 0) {
        // Difference between entered actual weight and theoretical weight
        const theoreticalWeight = (len * width * targetGsm) / 1000;
        weightDiff = wt - theoreticalWeight;
      }
    }

    return {
      mode,
      widthM: width,
      gsm: targetGsm,
      weightPerMeter: round4(weightPerMeter),
      computedWeight: computedWeight !== null ? round4(computedWeight) : null,
      computedLength: computedLength !== null ? round4(computedLength) : null,
      weightDiff: weightDiff !== null ? round4(weightDiff) : null,
      display: {
        weightPerMeter: round3(weightPerMeter),
        computedWeight: computedWeight !== null ? round2(computedWeight) : null,
        computedLength: computedLength !== null ? round2(computedLength) : null,
        weightDiff: weightDiff !== null ? round2(weightDiff) : null,
      },
    };
  }

  /**
   * 2. Actual GSM calculation from rolled weight and dimensions
   * Formula: (weightKg * 1000) / (lengthM * widthM)
   */
  static calculateActualGsm({ weightKg, lengthM, widthM }) {
    if (weightKg === undefined || weightKg === null || weightKg === '') {
      const err = new Error('الوزن الصافي بالكيلوجرام مطلوب');
      err.statusCode = 400;
      throw err;
    }
    const wt = Number(weightKg);
    if (isNaN(wt) || wt <= 0) {
      const err = new Error('الوزن الصافي بالكيلوجرام يجب أن يكون أكبر من الصفر');
      err.statusCode = 400;
      throw err;
    }

    if (lengthM === undefined || lengthM === null || lengthM === '') {
      const err = new Error('طول القماش بالمتر مطلوب');
      err.statusCode = 400;
      throw err;
    }
    const len = Number(lengthM);
    if (isNaN(len) || len <= 0) {
      const err = new Error('طول القماش بالمتر يجب أن يكون أكبر من الصفر');
      err.statusCode = 400;
      throw err;
    }

    if (widthM === undefined || widthM === null || widthM === '') {
      const err = new Error('عرض القماش بالمتر مطلوب');
      err.statusCode = 400;
      throw err;
    }
    const width = Number(widthM);
    if (isNaN(width) || width <= 0) {
      const err = new Error('عرض القماش بالمتر يجب أن يكون أكبر من الصفر');
      err.statusCode = 400;
      throw err;
    }

    const actualGsm = (wt * 1000) / (len * width);

    return {
      weightKg: wt,
      lengthM: len,
      widthM: width,
      actualGsm: round2(actualGsm),
      actualGsmRaw: actualGsm,
      note: 'ملاحظة: الوزن الصافي يُحسب بدون وزن الكرتون أو قلب الثوب البلاستيكي',
    };
  }

  /**
   * 3. Requirements & Costing:
   * Client Formula:
   * - Base = totalBaseMeters or pieces * metersPerPiece
   * - metersWithWaste = base / (1 - wastePercent/100)
   * - weightKg = metersWithWaste * widthM * gsm / 1000
   * - costByKg = weightKg * pricePerKg
   * - costByM = metersWithWaste * pricePerM
   * - costPerPiece = totalCost / pieces
   */
  static calculateRequirements({
    pieces,
    metersPerPiece,
    totalBaseMeters,
    wastePercent,
    widthM,
    gsm,
    pricePerKg,
    pricePerM,
  }) {
    if (wastePercent === undefined || wastePercent === null || wastePercent === '') {
      const err = new Error('نسبة الهالك مطلوبة');
      err.statusCode = 400;
      throw err;
    }
    const waste = Number(wastePercent);
    if (isNaN(waste) || waste < 0) {
      const err = new Error('نسبة الهالك لا يمكن أن تكون سالبة');
      err.statusCode = 400;
      throw err;
    }
    if (waste >= 100) {
      const err = new Error('نسبة الهالك يجب أن تكون أقل من 100% لتجنب القسمة على صفر أو قيمة غير منطقية');
      err.statusCode = 400;
      throw err;
    }

    if (widthM === undefined || widthM === null || widthM === '') {
      const err = new Error('عرض القماش بالمتر مطلوب');
      err.statusCode = 400;
      throw err;
    }
    const width = Number(widthM);
    if (isNaN(width) || width <= 0) {
      const err = new Error('عرض القماش بالمتر يجب أن يكون أكبر من الصفر');
      err.statusCode = 400;
      throw err;
    }

    if (gsm === undefined || gsm === null || gsm === '') {
      const err = new Error('وزن المتر المربع (GSM) مطلوب');
      err.statusCode = 400;
      throw err;
    }
    const targetGsm = Number(gsm);
    if (isNaN(targetGsm) || targetGsm <= 0) {
      const err = new Error('وزن المتر المربع (GSM) يجب أن يكون أكبر من الصفر');
      err.statusCode = 400;
      throw err;
    }

    let baseMeters = 0;
    const piecesCount = pieces !== undefined && pieces !== null && pieces !== '' ? Number(pieces) : null;
    const mPerPiece = metersPerPiece !== undefined && metersPerPiece !== null && metersPerPiece !== '' ? Number(metersPerPiece) : null;
    const totalBase = totalBaseMeters !== undefined && totalBaseMeters !== null && totalBaseMeters !== '' ? Number(totalBaseMeters) : null;

    if (totalBase !== null && !isNaN(totalBase) && totalBase > 0) {
      baseMeters = totalBase;
    } else if (piecesCount !== null && mPerPiece !== null && !isNaN(piecesCount) && !isNaN(mPerPiece) && piecesCount > 0 && mPerPiece > 0) {
      baseMeters = piecesCount * mPerPiece;
    } else {
      const err = new Error('يجب إدخال إجمالي الأمتار الأساسية أو (عدد القطع مع استهلاك القطعة بالمتر) بقيم أكبر من الصفر');
      err.statusCode = 400;
      throw err;
    }

    // Required meters with waste: base / (1 - waste/100)
    const metersWithWaste = baseMeters / (1 - waste / 100);

    // Expected weight in kg: metersWithWaste * widthM * gsm / 1000
    const expectedWeightKg = (metersWithWaste * width * targetGsm) / 1000;

    // Pricing & Costing
    const hasPriceKg = pricePerKg !== undefined && pricePerKg !== null && pricePerKg !== '';
    const hasPriceM = pricePerM !== undefined && pricePerM !== null && pricePerM !== '';

    const pKg = hasPriceKg ? Number(pricePerKg) : null;
    const pM = hasPriceM ? Number(pricePerM) : null;

    let costByKg = null;
    let costByM = null;

    if (hasPriceKg && !isNaN(pKg) && pKg >= 0) {
      costByKg = expectedWeightKg * pKg;
    }
    if (hasPriceM && !isNaN(pM) && pM >= 0) {
      costByM = metersWithWaste * pM;
    }

    const totalCost = costByKg !== null ? costByKg : costByM;

    let costPerPiece = null;
    if (totalCost !== null && piecesCount && piecesCount > 0) {
      costPerPiece = totalCost / piecesCount;
    }

    return {
      pieces: piecesCount,
      metersPerPiece: mPerPiece,
      baseMeters: round4(baseMeters),
      wastePercent: waste,
      widthM: width,
      gsm: targetGsm,
      metersWithWaste: round2(metersWithWaste),
      metersWithWasteRaw: metersWithWaste,
      expectedWeightKg: round2(expectedWeightKg),
      expectedWeightKgRaw: expectedWeightKg,
      pricePerKg: pKg,
      pricePerM: pM,
      costByKg: costByKg !== null ? round2(costByKg) : null,
      costByKgRaw: costByKg,
      costByM: costByM !== null ? round2(costByM) : null,
      costByMRaw: costByM,
      totalCost: totalCost !== null ? round2(totalCost) : null,
      totalCostRaw: totalCost,
      costPerPiece: costPerPiece !== null ? round2(costPerPiece) : null,
      costPerPieceRaw: costPerPiece,
      formulas: {
        baseMetersFormula: 'الأساسي = عدد القطع × استهلاك القطعة',
        metersWithWasteFormula: 'المطلوب شامل الهالك = الأساسي ÷ (1 - نسبة الهالك / 100)',
        weightFormula: 'الوزن = الأمتار المطلوبة × العرض × GSM ÷ 1000',
        costFormula: 'التكلفة = الوزن × سعر الكيلو (أو الأمتار × سعر المتر)',
      },
    };
  }

  /**
   * 4. Actual Waste Calculation:
   * actualWaste = issuedTotal - consumedInAccepted - returnedGood
   */
  static calculateActualWaste({ issuedTotal, consumedInAccepted, returnedGood }) {
    if (issuedTotal === undefined || issuedTotal === null || issuedTotal === '') {
      const err = new Error('إجمالي المصروف مطلوب');
      err.statusCode = 400;
      throw err;
    }
    const issued = Number(issuedTotal);
    if (isNaN(issued) || issued < 0) {
      const err = new Error('إجمالي المصروف يجب أن يكون رقمًا موجبًا');
      err.statusCode = 400;
      throw err;
    }

    if (consumedInAccepted === undefined || consumedInAccepted === null || consumedInAccepted === '') {
      const err = new Error('المستهلك في الإنتاج المقبول مطلوب');
      err.statusCode = 400;
      throw err;
    }
    const consumed = Number(consumedInAccepted);
    if (isNaN(consumed) || consumed < 0) {
      const err = new Error('المستهلك في الإنتاج المقبول يجب أن يكون رقمًا موجبًا');
      err.statusCode = 400;
      throw err;
    }

    const returned = returnedGood !== undefined && returnedGood !== null && returnedGood !== '' ? Number(returnedGood) : 0;
    if (isNaN(returned) || returned < 0) {
      const err = new Error('المرتجع الصالح يجب أن يكون رقمًا موجبًا');
      err.statusCode = 400;
      throw err;
    }

    const actualWaste = issued - consumed - returned;
    if (actualWaste < 0) {
      const err = new Error('إجمالي المصروف يجب أن يكون أكبر من أو يساوي مجموع المستهلك المقبول والمرتجع الصالح (الهالك الفعلي لا يمكن أن يكون سالبًا)');
      err.statusCode = 400;
      throw err;
    }

    const wastePercent = issued > 0 ? (actualWaste / issued) * 100 : 0;

    return {
      issuedTotal: issued,
      consumedInAccepted: consumed,
      returnedGood: returned,
      actualWaste: round2(actualWaste),
      actualWasteRaw: actualWaste,
      wastePercentFromIssued: round2(wastePercent),
      note: 'الجرد والتسوية لكل أمر تشغيل: يمثل الهالك الفعلي غير المسترد أثناء القص والتشغيل',
    };
  }
}

module.exports = ManufacturingFabricService;
