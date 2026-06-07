const PROVIDER_CATALOG = {
  GOOGLE: {
    label: 'Google Gemini',
    adapter: 'native',
    defaultModel: 'gemini-2.5-flash',
    baseUrl: null,
    strength: 'Stable multimodal customer replies and Gemini tool support.',
    freeTierHint: 'Gemini free tiers are model-specific and volatile; verify quotas before production changes.',
    limitHints: { rpd: 20 },
    notes: ['Use pinned stable Gemini models for customer traffic.', 'Avoid hot-swapped preview aliases for production.'],
  },
  GROQ: {
    label: 'Groq',
    adapter: 'openai-compatible',
    defaultModel: 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
    strength: 'Very fast text generation and useful failover capacity.',
    freeTierHint: 'Commonly request/day constrained; parse 429 retry windows aggressively.',
    limitHints: { rpd: 1000 },
    notes: ['Good first failover after Google.', 'Token/day limits can appear before request/day limits.'],
  },
  OPENROUTER: {
    label: 'OpenRouter',
    adapter: 'openai-compatible',
    defaultModel: 'openrouter/auto',
    baseUrl: 'https://openrouter.ai/api/v1',
    strength: 'Broad model catalog and free-model failover.',
    freeTierHint: 'Free-model pools and daily caps change frequently.',
    limitHints: {},
    notes: ['Prefer explicit free model ids when stability matters.', 'Daily free-model limits should cool down for 24h.'],
  },
  NVIDIA: {
    label: 'NVIDIA NIM',
    adapter: 'openai-compatible',
    defaultModel: 'openai/gpt-oss-120b',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    strength: 'Strong failover for larger open models and product-image generation paths.',
    freeTierHint: 'Credit/trial behavior varies by account.',
    limitHints: {},
    notes: ['Keep timeout cooldowns enabled.', 'Useful for FLUX/product landing image models when configured.'],
  },
  DEEPSEEK: {
    label: 'DeepSeek',
    adapter: 'native',
    defaultModel: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com',
    strength: 'Cost-efficient reasoning/chat fallback.',
    freeTierHint: 'Treat quota and pricing as account-specific.',
    limitHints: {},
    notes: ['Configure explicit limits in key/model usage JSON when known.'],
  },
  OPENAI: {
    label: 'OpenAI',
    adapter: 'native',
    defaultModel: 'gpt-4o-mini',
    baseUrl: null,
    strength: 'High compatibility for OpenAI-style tool workflows.',
    freeTierHint: 'Paid/provider-managed limits; do not infer free quota.',
    limitHints: {},
    notes: ['Use as paid reliability fallback when configured.'],
  },
  ANTHROPIC: {
    label: 'Anthropic',
    adapter: 'native',
    defaultModel: 'claude-3-5-haiku-latest',
    baseUrl: null,
    strength: 'High-quality long-context backup when keys are configured.',
    freeTierHint: 'Paid/provider-managed limits; do not infer free quota.',
    limitHints: {},
    notes: ['Requires provider-specific adapter support before broad routing.'],
  },
  HUGGINGFACE: {
    label: 'Hugging Face',
    adapter: 'native',
    defaultModel: 'meta-llama/Llama-3.1-8B-Instruct',
    baseUrl: null,
    strength: 'Model hub fallback for selected hosted inference models.',
    freeTierHint: 'Hosted inference quotas and availability vary by model.',
    limitHints: {},
    notes: ['Use explicit model ids and health-check them before routing.'],
  },
  OLLAMA: {
    label: 'Ollama',
    adapter: 'openai-compatible',
    defaultModel: 'llama3.2',
    baseUrl: 'https://ollama.maxp.online',
    strength: 'Private/local fallback when an Ollama-compatible server is connected.',
    freeTierHint: 'Capacity is infrastructure-bound, not provider free-tier-bound.',
    limitHints: {},
    notes: ['Use server health and latency as the primary routing signals.'],
  },
  CEREBRAS: {
    label: 'Cerebras',
    adapter: 'openai-compatible',
    defaultModel: 'qwen-3-235b-a22b-instruct-2507',
    baseUrl: 'https://api.cerebras.ai/v1',
    strength: 'Very fast inference, among the fastest available. Good for high-throughput fallback.',
    freeTierHint: '30 RPM shared pool, 1M TPD. Models change frequently; verify availability before production use.',
    limitHints: { rpm: 30, tpd: 1000000 },
    notes: ['Speed is the primary advantage over Groq.', 'Free-tier model catalog rotated periodically by Cerebras.'],
  },
  GITHUB_MODELS: {
    label: 'GitHub Models',
    adapter: 'openai-compatible',
    defaultModel: 'gpt-4o',
    baseUrl: 'https://models.github.ai/inference',
    strength: 'Free GPT-4o and GPT-4.1 access through GitHub account. Useful as a mid-tier fallback.',
    freeTierHint: 'Experimental/prototyping scope per ToS. 10 RPM, 50 RPD. GPT-4o has ~18M tokens/mo.',
    limitHints: { rpm: 10, rpd: 50 },
    notes: ['ToS restricts to prototyping — avoid production critical path.', 'GPT-4o is the most capable free model available here.'],
  },
  SAMBANOVA: {
    label: 'SambaNova',
    adapter: 'openai-compatible',
    defaultModel: 'DeepSeek-V3.1',
    baseUrl: 'https://api.sambanova.ai/v1',
    strength: 'Hosts DeepSeek V3.1/V3.2, Llama 4 Maverick, GPT-OSS. Good frontier-model fallback pool.',
    freeTierHint: '20 RPM / 20 RPD / 200K TPD shared Developer tier. Model IDs use exact casing.',
    limitHints: { rpm: 20, rpd: 20, tpd: 200000 },
    notes: ['DeepSeek V3.1 and V3.2 are competitive frontier models on free tier.', 'Model IDs are case-sensitive.'],
  },
  MISTRAL: {
    label: 'Mistral',
    adapter: 'openai-compatible',
    defaultModel: 'mistral-large-latest',
    baseUrl: 'https://api.mistral.ai/v1',
    strength: 'Mistral Large 3, Codestral, and Medium 3.5 through the Experiment pool (~1B tokens/mo).',
    freeTierHint: 'Experiment tier: 2 RPM, 500K TPM, ~50-100M tokens/mo shared across all models.',
    limitHints: { rpm: 2, tpm: 500000 },
    notes: ['Codestral is strong for code generation tasks.', 'Large shared token pool means good availability.'],
  },
};

function normalizeProvider(provider) {
  return String(provider || '').trim().toUpperCase();
}

function getProviderCatalog(provider) {
  const normalized = normalizeProvider(provider);
  return PROVIDER_CATALOG[normalized] || {
    label: normalized || 'Unknown provider',
    adapter: 'unknown',
    defaultModel: null,
    baseUrl: null,
    strength: 'No catalog metadata configured.',
    freeTierHint: 'Verify provider limits manually.',
    limitHints: {},
    notes: [],
  };
}

function listProviderCatalog(providerOrder = []) {
  const seen = new Set();
  const ordered = [];
  for (const provider of providerOrder) {
    const normalized = normalizeProvider(provider);
    if (normalized && !seen.has(normalized)) {
      ordered.push(normalized);
      seen.add(normalized);
    }
  }
  for (const provider of Object.keys(PROVIDER_CATALOG)) {
    if (!seen.has(provider)) {
      ordered.push(provider);
      seen.add(provider);
    }
  }

  return ordered.map(provider => ({
    provider,
    ...getProviderCatalog(provider),
  }));
}

module.exports = {
  getProviderCatalog,
  listProviderCatalog,
  _private: {
    PROVIDER_CATALOG,
    normalizeProvider,
  },
};
