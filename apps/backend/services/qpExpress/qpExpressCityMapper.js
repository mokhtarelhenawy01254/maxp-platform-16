/**
 * QP Express City & Governorate Mapper
 * مطابقة أسماء المحافظات والمدن مع معرفات مدن QP Express
 */

const QP_CITIES = [
  { id: 1, name: 'قاهره', aliases: ['القاهرة', 'قاهرة', 'cairo', 'al qahirah'] },
  { id: 2, name: 'اسكندريه', aliases: ['الاسكندرية', 'الإسكندرية', 'اسكندرية', 'alexandria', 'alex'] },
  { id: 3, name: 'جيزة', aliases: ['الجيزة', 'جيزه', 'الجيزه', 'giza', 'al gizah'] },
  { id: 4, name: 'قليوبية', aliases: ['القليوبية', 'قليوبيه', 'القليوبيه', 'qalyubia', 'kalyoubia'] },
  { id: 5, name: 'مطروح', aliases: ['مرسى مطروح', 'مرسي مطروح', 'مطروح', 'matrouh', 'marsa matrouh'] },
  { id: 6, name: 'اسوان', aliases: ['أسوان', 'اسوان', 'aswan'] },
  { id: 8, name: 'المنوفية', aliases: ['المنوفية', 'منوفية', 'المنوفيه', 'منوفيه', 'monufia', 'menofia'] },
  { id: 10, name: 'البحيرة', aliases: ['البحيرة', 'بحيرة', 'البحيره', 'بحيره', 'beheira', 'al buhayrah'] },
  { id: 12, name: 'كفر الشيخ', aliases: ['كفر الشيخ', 'كفرالشيخ', 'kafr el sheikh', 'kafr el-sheikh'] },
  { id: 14, name: 'شرقيه', aliases: ['الشرقية', 'شرقية', 'الشرقيه', 'شرقيه', 'sharqia', 'al sharqia'] },
  { id: 15, name: 'غربيه', aliases: ['الغربية', 'غربية', 'الغربيه', 'غربيه', 'gharbia', 'al gharbia', 'طنطا', 'tanta'] },
  { id: 16, name: 'بحر الاحمر', aliases: ['البحر الأحمر', 'البحر الاحمر', 'بحر احمر', 'red sea', 'الغردقة', 'hurghada'] },
  { id: 17, name: 'شرم الشيخ', aliases: ['شرم الشيخ', 'شرم', 'sharm el sheikh', 'sharm'] },
  { id: 18, name: 'اسماعيلية', aliases: ['الإسماعيلية', 'الاسماعيلية', 'اسماعيلية', 'اسماعيليه', 'ismailia'] },
  { id: 19, name: 'سويس', aliases: ['السويس', 'سويس', 'suez'] },
  { id: 20, name: 'بورسعيد', aliases: ['بور سعيد', 'بورسعيد', 'port said'] },
  { id: 21, name: 'دقهلية', aliases: ['الدقهلية', 'دقهلية', 'الدقهليه', 'دقهليه', 'المنصورة', 'dakahlia', 'mansoura'] },
  { id: 22, name: 'دمياط', aliases: ['دمياط', 'damietta'] },
  { id: 23, name: 'فيوم', aliases: ['الفيوم', 'فيوم', 'fayoum', 'faiyum'] },
  { id: 24, name: 'منيا', aliases: ['المنيا', 'منيا', 'minya', 'al minya'] },
  { id: 25, name: 'بني سويف', aliases: ['بني سويف', 'بنى سويف', 'beni suef', 'bani suwayf'] },
  { id: 26, name: 'اسيوط', aliases: ['أسيوط', 'اسيوط', 'asyut', 'assiut'] },
  { id: 27, name: 'اقصر', aliases: ['الأقصر', 'الاقصر', 'اقصر', 'luxor'] },
  { id: 28, name: 'سوهاج', aliases: ['سوهاج', 'sohag'] },
  { id: 29, name: 'قنا', aliases: ['قنا', 'qena'] },
  { id: 30, name: 'مترو', aliases: ['محطات المترو', 'مترو', 'metro'] },
  { id: 31, name: 'وادي جديد', aliases: ['الوادي الجديد', 'وادي جديد', 'new valley', 'el wadi el gedid'] },
  { id: 33, name: 'جنوب سيناء', aliases: ['جنوب سيناء', 'south sinai', 'طور سيناء', 'دهب', 'dahab', 'نويبع'] },
  { id: 34, name: 'اطراف سيناء', aliases: ['أطراف سيناء', 'اطراف سيناء', 'شمال سيناء', 'north sinai', 'العريش'] }
];

function normalizeText(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\-_,\.]/g, ' ')
    .replace(/\s+/g, ' ');
}

class QpExpressCityMapper {
  /**
   * جلب كود المدينة في كيو بي إكسبريس بناءً على اسم المحافظة أو المدينة أو العنوان
   */
  static findCity(cityNameOrGov) {
    if (!cityNameOrGov) return null;
    const normalized = normalizeText(cityNameOrGov);

    // 1. Direct match on ID or exact name
    const exact = QP_CITIES.find(c =>
      c.id === Number(cityNameOrGov) ||
      normalizeText(c.name) === normalized
    );
    if (exact) return exact;

    // 2. Alias match
    for (const city of QP_CITIES) {
      if (city.aliases) {
        for (const alias of city.aliases) {
          if (normalizeText(alias) === normalized) {
            return city;
          }
        }
      }
    }

    // 3. Substring / contains match
    for (const city of QP_CITIES) {
      if (normalized.includes(normalizeText(city.name))) {
        return city;
      }
      if (city.aliases) {
        for (const alias of city.aliases) {
          const nAlias = normalizeText(alias);
          if (normalized.includes(nAlias) || nAlias.includes(normalized)) {
            return city;
          }
        }
      }
    }

    // Default fallback to Cairo (id: 1) if not resolvable
    return null;
  }

  static getCityId(cityNameOrGov) {
    const city = this.findCity(cityNameOrGov);
    return city ? city.id : 1; // Default to Cairo
  }

  static getCityName(cityId) {
    const city = QP_CITIES.find(c => c.id === Number(cityId));
    return city ? city.name : 'قاهره';
  }

  static getAllCities() {
    return QP_CITIES.map(c => ({ id: c.id, name: c.name }));
  }
}

module.exports = QpExpressCityMapper;
