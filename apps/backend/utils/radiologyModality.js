const MODALITY_BY_CATEGORY = {
  CT: 'CT',
  MRI: 'MR',
  'X-Ray': 'CR',
  XRay: 'CR',
  'X-RAY': 'CR',
  US: 'US',
  DEXA: 'DXA',
  NM: 'NM',
  PET: 'PT',
  Fluoroscopy: 'FLUOROSCOPY',
  Dental: 'DENTAL',
  DENTAL: 'DENTAL',
  ECHO: 'ECHO',
  EEG: 'EEG',
};

const MODALITY_ALIASES = {
  '╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐': 'CT',
  '╪º╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐': 'CT',
  '┘à┘é╪╖╪╣┘è╪⌐': 'CT',
  '╪▒┘å┘è┘å ┘à╪║┘å╪º╪╖┘è╪│┘è': 'MR',
  '╪º┘ä╪▒┘å┘è┘å ╪º┘ä┘à╪║┘å╪º╪╖┘è╪│┘è': 'MR',
  '╪▒┘å┘è┘å': 'MR',
  '┘à┘ê╪¼╪º╪¬ ┘ü┘ê┘é ╪╡┘ê╪¬┘è╪⌐': 'US',
  '╪º┘ä┘à┘ê╪¼╪º╪¬ ┘ü┘ê┘é ╪º┘ä╪╡┘ê╪¬┘è╪⌐': 'US',
  '╪│┘ê┘å╪º╪▒': 'US',
  '╪»┘è┘â╪│╪º': 'DXA',
  '┘ü┘ä┘ê╪▒┘ê╪│┘â┘ê╪¿┘è': 'FLUOROSCOPY',
};

const normalizeModality = (value) => {
  if (!value) return null;
  const key = String(value).trim();
  if (MODALITY_BY_CATEGORY[key]) return MODALITY_BY_CATEGORY[key];
  if (MODALITY_ALIASES[key]) return MODALITY_ALIASES[key];
  const lower = key.toLowerCase();
  const direct = Object.entries(MODALITY_BY_CATEGORY).find(([k]) => k.toLowerCase() === lower);
  if (direct) return direct[1];
  const alias = Object.entries(MODALITY_ALIASES).find(([k]) => k.toLowerCase() === lower);
  if (alias) return alias[1];
  return null;
};

const resolveModality = (category) => {
  if (!category) return null;
  if (typeof category === 'object' && category !== null) {
    if (category.modality) return category.modality;
    return normalizeModality(category.name);
  }
  return normalizeModality(category) || category || null;
};

module.exports = { MODALITY_BY_CATEGORY, MODALITY_ALIASES, normalizeModality, resolveModality };
