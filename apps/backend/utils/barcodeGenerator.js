/**
 * Code 128 (Subset B) Pure Vector SVG Barcode Generator
 * يعمل في بيئة Node.js بدون أي مكتبات خارجية وبدون اتصال بالإنترنت
 */

const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (106 is Stop)
];

const START_CODE_B = 104;
const STOP_CODE = 106;

/**
 * توليد كود باركود Code 128B بصيغة SVG نقي
 * @param {string} text - النص أو الرقم المراد تحويله لباركود
 * @param {Object} options - إعدادات الباركود (العرض، الارتفاع، إظهار النص)
 * @returns {string} كود وسيط SVG
 */
function generateCode128Svg(text, options = {}) {
  const clean = String(text || '').trim().replace(/[^\x20-\x7E]/g, '');
  if (!clean) return '';

  const {
    height = 40,
    barWidth = 2,
    includeText = true,
    fontSize = 11,
    altText = null,
  } = options;

  // Calculate indices and checksum for Code 128 Subset B
  const codes = [START_CODE_B];
  let checksum = START_CODE_B;

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32;
    codes.push(code);
    checksum += code * (i + 1);
  }

  checksum = checksum % 103;
  codes.push(checksum);
  codes.push(STOP_CODE);

  // Convert pattern to widths
  let totalModules = 0;
  const elements = [];

  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    if (!pattern) continue;

    let isBar = true;
    for (let j = 0; j < pattern.length; j++) {
      const width = parseInt(pattern[j], 10);
      if (isBar) {
        elements.push({ x: totalModules, width });
      }
      totalModules += width;
      isBar = !isBar;
    }
  }

  const quietZone = 10;
  const svgWidth = (totalModules + quietZone * 2) * barWidth;
  const textHeight = includeText ? fontSize + 4 : 0;
  const svgHeight = height + textHeight;

  let rects = '';
  for (const el of elements) {
    const x = (quietZone + el.x) * barWidth;
    const w = el.width * barWidth;
    rects += `<rect x="${x}" y="0" width="${w}" height="${height}" fill="#000000" />`;
  }

  let textSvg = '';
  if (includeText) {
    const label = altText || clean;
    textSvg = `<text x="${svgWidth / 2}" y="${height + fontSize}" text-anchor="middle" font-family="monospace" font-size="${fontSize}" font-weight="700" fill="#000000">${label}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}" style="max-width:100%;height:auto;display:block;margin:0 auto">${rects}${textSvg}</svg>`;
}

module.exports = {
  generateCode128Svg,
};
