const {
  filterProductionGeminiModels,
  filterRetiredGeminiModels,
  isProductionUnsafeGeminiModelName,
  normalizeGeminiEmbeddingModel,
  normalizeGeminiTextModel,
  isRetiredGeminiModelName,
  isUnstableGeminiAliasModelName,
} = require('../../services/aiAgent/geminiModelPolicy');

describe('geminiModelPolicy', () => {
  test('normalizes retired text model names to the stable text default', () => {
    expect(normalizeGeminiTextModel('gemini-pro')).toBe('gemini-2.5-flash');
    expect(normalizeGeminiTextModel('models/gemini-1.5-flash')).toBe('gemini-2.5-flash');
    expect(normalizeGeminiTextModel('gemini-flash-latest')).toBe('gemini-2.5-flash');
    expect(normalizeGeminiTextModel('gemini-3-flash')).toBe('gemini-3-flash');
  });

  test('normalizes retired embedding model names to the Gemini embedding default', () => {
    expect(normalizeGeminiEmbeddingModel('text-embedding-004')).toBe('gemini-embedding-001');
    expect(normalizeGeminiEmbeddingModel('models/gemini-embedding-001')).toBe('gemini-embedding-001');
  });

  test('filters retired Gemini candidates from env and API candidate lists', () => {
    expect(filterRetiredGeminiModels([
      'gemini-1.5-flash',
      'models/gemini-2.5-flash',
      'gemini-pro',
      'gemini-2.5-flash',
    ])).toEqual(['gemini-2.5-flash']);
    expect(isRetiredGeminiModelName('models/gemini-pro-vision')).toBe(true);
  });

  test('blocks hot-swapped Gemini latest aliases from production candidates', () => {
    expect(isUnstableGeminiAliasModelName('models/gemini-flash-latest')).toBe(true);
    expect(isProductionUnsafeGeminiModelName('gemini-pro-latest')).toBe(true);
    expect(isUnstableGeminiAliasModelName('gpt-4o-latest')).toBe(false);
    expect(filterProductionGeminiModels([
      'gemini-flash-latest',
      'gemini-2.5-flash',
      'gemini-1.5-flash',
      'models/gemini-3-pro-preview',
    ])).toEqual(['gemini-2.5-flash', 'gemini-3-pro-preview']);
  });
});
