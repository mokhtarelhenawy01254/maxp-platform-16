const crypto = require('crypto');
const dicomParser = require('dicom-parser');
const { getDateStringInTimezone } = require('./dateUtils');

const cleanString = (value) => {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s === '' ? undefined : s;
};

/**
 * توليد رقم دراسة بصيغة RAD-YYYYMMDD-XXXX
 */
function generateStudyNumber() {
  const datePart = getDateStringInTimezone(new Date()).replace(/-/g, '');
  const rand = crypto.randomInt(1000, 10000);
  return `RAD-${datePart}-${rand}`;
}

/**
 * تحليل بيانات DICOM من محتوى ثنائي.
 * يعيد {} في حال فشل التحليل (الملف لا يزال يُرفع).
 */
function parseDicomFromBuffer(buffer) {
  try {
    if (!buffer || !buffer.length) return {};
    const byteArray = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const dataSet = dicomParser.parseDicom(byteArray);

    const readString = (tag) => {
      try {
        return cleanString(dataSet.string(tag));
      } catch {
        return undefined;
      }
    };

    const meta = {};
    const patientName = readString('x00100010');
    if (patientName) meta.patientName = patientName;
    const patientGender = readString('x00100040');
    if (patientGender) meta.patientGender = patientGender;
    const patientAge = readString('x00101010');
    if (patientAge) meta.patientAge = patientAge;
    const modality = readString('x00080060');
    if (modality) meta.modality = modality;
    const studyDescription = readString('x00081030');
    if (studyDescription) meta.studyDescription = studyDescription;
    const seriesDescription = readString('x0008103e');
    if (seriesDescription) meta.seriesDescription = seriesDescription;

    try {
      const slice = dataSet.intString('x00200013');
      if (Number.isFinite(slice)) meta.sliceIndex = slice;
    } catch {
      // تجاهل غياب رقم الشريحة
    }

    return meta;
  } catch (error) {
    return {};
  }
}

module.exports = { parseDicomFromBuffer, generateStudyNumber };
