/**
 * Helper for WhatsApp Meta template variable binding.
 * - mapVariablesByOrder: extracts {position, name}[] from local {{name}} placeholders.
 * - buildMetaBodyParams: builds bodyParams from the template variables order.
 */

function mapVariablesByOrder(localContent, metaBodyText) {
  if (!localContent) return [];
  const localMatches = (localContent.match(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g) || []);
  const seen = new Set();
  const localOrder = [];
  for (const m of localMatches) {
    const name = m.replace(/\{\{|}\}/g, '').trim();
    if (!seen.has(name)) { seen.add(name); localOrder.push(name); }
  }
  const metaCount = ((metaBodyText || '').match(/\{\{\s*\d+\s*\}\}/g) || []).length;
  const count = Math.min(localOrder.length, metaCount);
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push({ position: i + 1, name: localOrder[i] });
  }
  return result;
}

function extractLocalVariableOrder(content) {
  if (!content) return [];
  const seen = new Set();
  const order = [];
  const matches = (content.match(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g) || []);
  for (const m of matches) {
    const name = m.replace(/\{\{|}\}/g, '').trim();
    if (!seen.has(name)) { seen.add(name); order.push(name); }
  }
  return order;
}

/**
 * Builds bodyParams from the template variables order ({position, name}[]).
 * If a variable value is missing, falls back to a sensible default so Meta
 * does not reject with (#131008) Required parameter is missing.
 */
function buildMetaBodyParams(variablesOrder, localContent, values = {}) {
  let orderedVars = variablesOrder;
  if (!orderedVars || orderedVars.length === 0) {
    const localNames = extractLocalVariableOrder(localContent);
    orderedVars = localNames.map((name, idx) => ({ position: idx + 1, name }));
  }

  // Some DB rows store variables as plain strings ["orderNumber","total"] instead of
  // [{position,name}] — normalize both shapes here.
  orderedVars = orderedVars.map((v, idx) =>
    typeof v === 'string' ? { position: idx + 1, name: v } : v
  );

  // PRODUCTION-FIX (2026-08-27, #131008): a variable missing from values used to be
  // sent as '' and Meta rejected with "Required parameter is missing". Provide a
  // sensible default per variable name so the message still sends.
  const fallbackFor = (name) => {
    const n = String(name || '').toLowerCase();
    if (n.includes('date') || n.includes('time')) return 'قريباً';
    if (n.includes('point') || n.includes('balance') || n.includes('amount') || n.includes('cash') || n.includes('price') || n.includes('total') || n.includes('subtotal') || n.includes('discount') || n.includes('fee') || n.includes('salary')) return '0';
    if (n.includes('tier') || n.includes('level') || n.includes('rank')) return 'العضوية';
    if (n.includes('name')) return 'عميلنا العزيز';
    if (n.includes('count') || n.includes('number') || n.includes('qty')) return '1';
    if (n.includes('link') || n.includes('url')) return '—';
    return '—';
  };

  return orderedVars.map(v => {
    const raw = values[v.name];
    const text = (raw !== undefined && raw !== null && String(raw).trim() !== '') ? String(raw) : fallbackFor(v.name);
    return { type: 'text', text: text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim() };
  });
}

module.exports = {
  mapVariablesByOrder,
  extractLocalVariableOrder,
  buildMetaBodyParams,
};
