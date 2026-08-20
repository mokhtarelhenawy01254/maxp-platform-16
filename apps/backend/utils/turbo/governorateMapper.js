/**
 * Turbo Governorate Mapper Utilities
 * ╪»┘ê╪º┘ä ┘à╪╖╪º╪¿┘é╪⌐ ╪º┘ä┘à╪¡╪º┘ü╪╕╪º╪¬ ┘ê╪º┘ä┘à╪»┘å ┘ä╪┤╪¡┘å Turbo
 */

const { GOVERNORATE_MAP, CITY_TO_GOVERNMENT_MAP, FALLBACK_GOVERNMENTS } = require('./constants');
const { cleanLocationName } = require('./addressParser');

function getTurboGovernorateName(governorate) {
  if (!governorate) return null;

  const govName = cleanLocationName(governorate).toLowerCase().trim();
  if (!govName) return null;

  const cleanedGov = cleanLocationName(governorate);
  if (GOVERNORATE_MAP[cleanedGov]) {
    return GOVERNORATE_MAP[cleanedGov];
  }

  for (const [key, value] of Object.entries(GOVERNORATE_MAP)) {
    if (key.toLowerCase() === govName || value.toLowerCase() === govName) {
      return value;
    }
  }

  const sortedEntries = Object.entries(GOVERNORATE_MAP)
    .sort(([a], [b]) => b.length - a.length);

  for (const [key, value] of sortedEntries) {
    if (govName.includes(key.toLowerCase()) || key.toLowerCase().includes(govName)) {
      return value;
    }
  }

  return cleanedGov || null;
}

function findGovernmentByCity(cityName, governments = null) {
  if (!cityName) return '╪º┘ä┘é╪º┘ç╪▒╪⌐';

  const cleanCity = cleanLocationName(cityName).toLowerCase().trim();

  if (!governments || governments.length === 0) {
    return getTurboGovernorateName(cityName);
  }

  for (const [city, gov] of Object.entries(CITY_TO_GOVERNMENT_MAP)) {
    const cityLower = city.toLowerCase();
    if (cleanCity === cityLower || cleanCity.includes(cityLower) || cityLower.includes(cleanCity)) {
      const foundGov = governments.find(g => {
        const govNameLower = g.name.toLowerCase();
        return govNameLower === gov.toLowerCase() ||
          govNameLower.includes(gov.toLowerCase()) ||
          gov.toLowerCase().includes(govNameLower);
      });
      if (foundGov) {
        return foundGov.name;
      }
    }
  }

  for (const gov of governments) {
    const govName = gov.name.toLowerCase();
    if (govName === cleanCity) {
      return gov.name;
    }
  }

  for (const gov of governments) {
    const govName = gov.name.toLowerCase();
    if (govName.includes(cleanCity) || cleanCity.includes(govName)) {
      return gov.name;
    }
  }

  const cityWords = cleanCity.split(' ').filter(w => w.length > 2);
  for (const gov of governments) {
    const govName = gov.name.toLowerCase();
    for (const word of cityWords) {
      if (govName.includes(word)) {
        return gov.name;
      }
    }
  }

  return getTurboGovernorateName(cityName);
}

module.exports = {
  getTurboGovernorateName,
  findGovernmentByCity
};
