const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const aiRuntimeService = require('../services/aiRuntimeService');
const AIProviderFactory = require('../services/aiAgent/providers/AIProviderFactory');
const { getModelCapabilities, decorateModel } = require('../services/aiAgent/agentModelCapabilityService');
const aiProviderLogService = require('../services/aiAgent/providerLogService');
const providerBudgetLedgerService = require('../services/aiAgent/providerBudgetLedgerService');
const providerCatalogService = require('../services/aiAgent/providerCatalogService');
const aiServiceKeyBridge = require('../services/aiAgent/aiServiceKeyBridge');
const {
    isRetiredGeminiModelName,
    isUnstableGeminiAliasModelName,
    GEMINI_EMBEDDING_MODELS,
    GEMINI_EMBEDDING_DIMENSIONS,
    DEFAULT_GEMINI_EMBEDDING_MODEL,
} = require('../services/aiAgent/geminiModelPolicy');

const SUPPORTED_AI_PROVIDERS = new Set([
    'GOOGLE',
    'DEEPSEEK',
    'OPENAI',
    'ANTHROPIC',
    'HUGGINGFACE',
    'OLLAMA',
    'GROQ',
    'OPENROUTER',
    'NVIDIA',
    'CEREBRAS',
    'GITHUB',
    'SAMBANOVA',
    'MISTRAL'
]);

const DEFAULT_PROVIDER_PRIORITY = ['GOOGLE', 'GROQ', 'CEREBRAS', 'OPENROUTER', 'NVIDIA', 'MISTRAL', 'SAMBANOVA', 'GITHUB'];

const DEFAULT_PROVIDER_BASE_URLS = {
    GROQ: 'https://api.groq.com/openai/v1',
    OLLAMA: 'https://ollama.maxp.online',
    OPENROUTER: 'https://openrouter.ai/api/v1',
    NVIDIA: 'https://integrate.api.nvidia.com/v1',
    CEREBRAS: 'https://api.cerebras.ai/v1',
    GITHUB: 'https://models.github.ai/inference',
    SAMBANOVA: 'https://api.sambanova.ai/v1',
    MISTRAL: 'https://api.mistral.ai/v1'
};

const DEFAULT_PROVIDER_MODELS = {
    GOOGLE: 'gemini-2.5-flash',
    DEEPSEEK: 'deepseek-chat',
    OPENAI: 'gpt-4o-mini',
    ANTHROPIC: 'claude-3-5-sonnet-20241022',
    HUGGINGFACE: 'mistralai/Mistral-7B-Instruct-v0.3',
    OLLAMA: 'llama3.2',
    GROQ: 'llama-3.3-70b-versatile',
    OPENROUTER: 'openrouter/auto',
    NVIDIA: 'openai/gpt-oss-120b',
    CEREBRAS: 'qwen-3-235b-a22b-instruct-2507',
    GITHUB: 'gpt-4o',
    SAMBANOVA: 'DeepSeek-V3.1',
    MISTRAL: 'mistral-large-latest'
};

const FACEBOOK_ADS_GENERATION_MODES = new Set(['SYSTEM_DEFAULT', 'SPECIFIC_KEY']);
const PRODUCT_LANDING_IMAGE_GENERATION_MODES = new Set(['SYSTEM_DEFAULT', 'SPECIFIC_MODEL']);
const DEFAULT_PRODUCT_LANDING_IMAGE_MODEL = 'black-forest-labs/flux.1-dev';
const EMBEDDING_MODES = new Set(['SYSTEM_DEFAULT', 'SPECIFIC_KEY']);
const SUPPORTED_EMBEDDING_MODELS = Array.from(GEMINI_EMBEDDING_MODELS);
const REQUIRED_EMBEDDING_DIMENSION = GEMINI_EMBEDDING_DIMENSIONS[DEFAULT_GEMINI_EMBEDDING_MODEL]?.default || 768;

function getPrisma() {
    return getSharedPrismaClient();
}

function normalizeProvider(provider) {
    return typeof provider === 'string' ? provider.trim().toUpperCase() : undefined;
}

function trimString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function isSupportedProvider(provider) {
    return Boolean(provider && SUPPORTED_AI_PROVIDERS.has(provider));
}

function getSupportedProviderOrder() {
    return [
        ...DEFAULT_PROVIDER_PRIORITY,
        ...Array.from(SUPPORTED_AI_PROVIDERS).filter(provider => !DEFAULT_PROVIDER_PRIORITY.includes(provider))
    ];
}

function normalizeProviderPriority(rawPriority, { includeAllSupported = true } = {}) {
    const providers = Array.isArray(rawPriority) ? rawPriority : DEFAULT_PROVIDER_PRIORITY;
    const normalized = [];
    const seen = new Set();

    for (const provider of providers) {
        const normalizedProvider = normalizeProvider(provider);
        if (!isSupportedProvider(normalizedProvider) || seen.has(normalizedProvider)) {
            continue;
        }
        normalized.push(normalizedProvider);
        seen.add(normalizedProvider);
    }

    const fallbackOrder = getSupportedProviderOrder();
    const baseOrder = normalized.length > 0 ? normalized : DEFAULT_PROVIDER_PRIORITY;
    const finalOrder = [];
    const finalSeen = new Set();

    for (const provider of baseOrder) {
        if (isSupportedProvider(provider) && !finalSeen.has(provider)) {
            finalOrder.push(provider);
            finalSeen.add(provider);
        }
    }

    if (includeAllSupported) {
        for (const provider of fallbackOrder) {
            if (!finalSeen.has(provider)) {
                finalOrder.push(provider);
                finalSeen.add(provider);
            }
        }
    }

    return finalOrder;
}

function getProviderPriorityFromSettings(settings, options = {}) {
    return normalizeProviderPriority(settings?.providerPriority, options);
}

function sanitizeAiAdminErrorMessage(message = '') {
    const keyPatterns = [
        /sk-[A-Za-z0-9]{20,}/g,
        /sk-ant-[A-Za-z0-9]{20,}/g,
        /gsk_[A-Za-z0-9_-]{10,}/g,
        /nvapi-[A-Za-z0-9_-]{10,}/g,
        /hf_[A-Za-z0-9]{10,}/g,
        /ghp_[A-Za-z0-9]{20,}/g,
        /github_pat_[A-Za-z0-9_-]{30,}/g,
        /csk-[A-Za-z0-9]{10,}/g,
    ];

    let sanitized = String(message);
    for (const regex of keyPatterns) {
        sanitized = sanitized.replace(regex, (m) => `${m.slice(0, 4)}***REDACTED***`);
    }
    sanitized = sanitized
        .replace(/(apiKey\s*:\s*['"]?)[^'",\s}]+/gi, '$1***REDACTED***')
        .replace(/(apiKey["']?\s*:\s*["'])[^"']+(["'])/gi, '$1***REDACTED***$2')
        .replace(/(authorization:\s*bearer\s+)[A-Za-z0-9_-]+/gi, '$1***REDACTED***')
        .replace(/(x-api-key:\s*)[A-Za-z0-9_-]+/gi, '$1***REDACTED***');

    return sanitized;
}

function isProviderPersistenceError(error) {
    const message = sanitizeAiAdminErrorMessage(error?.message || '');
    return (
        error?.name === 'PrismaClientValidationError' ||
        /invalid input value for enum|not a valid enum|Invalid value.*provider|GlobalAiProvider|global_ai_configs_defaultProvider|ai_keys_provider/i.test(message)
    );
}

function logAiAdminError(context, error) {
    console.error(context, {
        code: error?.code,
        name: error?.name,
        message: sanitizeAiAdminErrorMessage(error?.message || 'Unknown error')
    });
}

function parseGlobalSettings(settings) {
    if (!settings) return {};
    if (typeof settings === 'object') return settings;

    try {
        return JSON.parse(settings);
    } catch (error) {
        console.warn('⚠️ [SUPER-ADMIN] Failed to parse GlobalAIConfig.settings:', error.message);
        return {};
    }
}

function attachGlobalSettings(config) {
    if (!config) return config;

    const settings = parseGlobalSettings(config.settings);
    return {
        ...config,
        visionProvider: settings.visionProvider || null,
        visionModel: settings.visionModel || null,
        providerPriority: getProviderPriorityFromSettings(settings),
        preferredAiKeyIds: getPreferredAiKeyIds(settings),
        facebookAdsGeneration: normalizeFacebookAdsGenerationSettings(settings.facebookAdsGeneration),
        productLandingImageGeneration: normalizeProductLandingImageGenerationSettings(settings.productLandingImageGeneration),
        embedding: normalizeEmbeddingSettings(settings.embedding),
    };
}

function getPreferredAiKeyIds(settings) {
    const preferredAiKeyIds = settings?.preferredAiKeyIds;
    if (!preferredAiKeyIds || typeof preferredAiKeyIds !== 'object' || Array.isArray(preferredAiKeyIds)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(preferredAiKeyIds)
            .filter(([provider, keyId]) => isSupportedProvider(normalizeProvider(provider)) && typeof keyId === 'string' && keyId.trim())
            .map(([provider, keyId]) => [normalizeProvider(provider), keyId.trim()])
    );
}

function normalizeFacebookAdsGenerationSettings(rawSettings) {
    const rawMode = typeof rawSettings?.mode === 'string'
        ? rawSettings.mode.trim().toUpperCase()
        : 'SYSTEM_DEFAULT';
    const mode = FACEBOOK_ADS_GENERATION_MODES.has(rawMode) ? rawMode : 'SYSTEM_DEFAULT';
    const aiKeyId = typeof rawSettings?.aiKeyId === 'string' && rawSettings.aiKeyId.trim()
        ? rawSettings.aiKeyId.trim()
        : null;

    return {
        mode,
        aiKeyId: mode === 'SPECIFIC_KEY' ? aiKeyId : null
    };
}

function normalizeProductLandingImageGenerationSettings(rawSettings) {
    const rawMode = typeof rawSettings?.mode === 'string'
        ? rawSettings.mode.trim().toUpperCase()
        : 'SYSTEM_DEFAULT';
    const mode = PRODUCT_LANDING_IMAGE_GENERATION_MODES.has(rawMode) ? rawMode : 'SYSTEM_DEFAULT';
    const provider = normalizeProvider(rawSettings?.provider || 'NVIDIA');
    const aiKeyId = typeof rawSettings?.aiKeyId === 'string' && rawSettings.aiKeyId.trim()
        ? rawSettings.aiKeyId.trim()
        : null;
    const model = trimString(rawSettings?.model) || DEFAULT_PRODUCT_LANDING_IMAGE_MODEL;

    return {
        mode,
        provider: mode === 'SPECIFIC_MODEL' ? provider : 'NVIDIA',
        aiKeyId: mode === 'SPECIFIC_MODEL' ? aiKeyId : null,
        model: mode === 'SPECIFIC_MODEL' ? model : DEFAULT_PRODUCT_LANDING_IMAGE_MODEL
    };
}

function normalizeEmbeddingSettings(rawSettings) {
    const rawMode = typeof rawSettings?.mode === 'string'
        ? rawSettings.mode.trim().toUpperCase()
        : 'SYSTEM_DEFAULT';
    const mode = EMBEDDING_MODES.has(rawMode) ? rawMode : 'SYSTEM_DEFAULT';
    const model = SUPPORTED_EMBEDDING_MODELS.includes(rawSettings?.model)
        ? rawSettings.model
        : DEFAULT_GEMINI_EMBEDDING_MODEL;
    const dimension = [768, 1536, 3072].includes(Number(rawSettings?.dimension))
        ? Number(rawSettings.dimension)
        : (GEMINI_EMBEDDING_DIMENSIONS[model]?.default || 768);
    const aiKeyId = typeof rawSettings?.aiKeyId === 'string' && rawSettings.aiKeyId.trim()
        ? rawSettings.aiKeyId.trim()
        : null;

    return {
        mode,
        model,
        dimension,
        aiKeyId: mode === 'SPECIFIC_KEY' ? aiKeyId : null,
    };
}

function buildEmbeddingHealth(rawEmbeddingSettings, keys = []) {
    const embedding = normalizeEmbeddingSettings(rawEmbeddingSettings);
    const warnings = [];
    const googleKeys = (keys || []).filter(key => normalizeProvider(key.provider) === 'GOOGLE');
    const activeGoogleKeys = googleKeys.filter(key => key.isActive !== false);
    const selectedKey = embedding.aiKeyId
        ? (keys || []).find(key => key.id === embedding.aiKeyId) || null
        : null;

    let status = 'OK';
    let reason = 'READY';

    if (embedding.mode === 'SPECIFIC_KEY') {
        if (!embedding.aiKeyId) {
            status = 'MISCONFIGURED';
            reason = 'SPECIFIC_KEY_REQUIRED';
        } else if (!selectedKey) {
            status = 'MISCONFIGURED';
            reason = 'SPECIFIC_KEY_NOT_FOUND';
        } else if (normalizeProvider(selectedKey.provider) !== 'GOOGLE') {
            status = 'MISCONFIGURED';
            reason = 'SPECIFIC_KEY_NOT_GOOGLE';
        } else if (selectedKey.isActive === false) {
            status = 'DEGRADED';
            reason = 'SPECIFIC_KEY_INACTIVE';
        }
    } else if (activeGoogleKeys.length === 0) {
        status = 'DEGRADED';
        reason = 'NO_ACTIVE_GOOGLE_KEY';
    }

    if (embedding.model !== DEFAULT_GEMINI_EMBEDDING_MODEL) {
        warnings.push('MODEL_OVERRIDDEN_TO_GEMINI_EMBEDDING_2');
    }

    if (Number(embedding.dimension) !== REQUIRED_EMBEDDING_DIMENSION) {
        warnings.push('DIMENSION_OVERRIDDEN_TO_768');
    }

    let runtimeFailure = null;
    try {
        const episodicMemoryService = require('../services/aiAgent/episodicMemoryService');
        if (typeof episodicMemoryService.getEmbeddingFailureSnapshot === 'function') {
            runtimeFailure = episodicMemoryService.getEmbeddingFailureSnapshot({
                model: DEFAULT_GEMINI_EMBEDDING_MODEL,
                dimension: REQUIRED_EMBEDDING_DIMENSION,
                contexts: ['product_search', 'product_search_multimodal'],
            });
        }
    } catch (error) {
        console.warn('⚠️ [SUPER-ADMIN] Failed to read embedding failure snapshot:', sanitizeAiAdminErrorMessage(error?.message || 'Unknown error'));
    }

    if (runtimeFailure && status === 'OK') {
        status = 'DEGRADED';
        reason = 'RUNTIME_EMBEDDING_FAILURE';
    }

    return {
        status,
        reason,
        provider: 'GOOGLE',
        requiredModel: DEFAULT_GEMINI_EMBEDDING_MODEL,
        requiredDimension: REQUIRED_EMBEDDING_DIMENSION,
        configuredModel: embedding.model,
        configuredDimension: embedding.dimension,
        mode: embedding.mode,
        selectedKeyId: embedding.aiKeyId || null,
        selectedKeyName: selectedKey?.name || null,
        hasActiveGoogleKey: activeGoogleKeys.length > 0,
        activeGoogleKeyCount: activeGoogleKeys.length,
        warnings,
        runtimeFailure,
        fallback: status === 'OK' ? 'NONE' : 'TEXT_ONLY_SEARCH',
        checkedAt: new Date().toISOString(),
    };
}

async function attachGlobalSettingsWithHealth(prisma, config) {
    const attachedConfig = attachGlobalSettings(config);
    if (!attachedConfig) return attachedConfig;

    let keys = [];
    if (prisma?.aiKey?.findMany) {
        try {
            keys = await safeQuery(async () => prisma.aiKey.findMany({
                select: {
                    id: true,
                    name: true,
                    provider: true,
                    isActive: true,
                },
            }));
        } catch (error) {
            console.warn('⚠️ [SUPER-ADMIN] Failed to load AI keys for embedding health:', sanitizeAiAdminErrorMessage(error?.message || 'Unknown error'));
        }
    }

    return {
        ...attachedConfig,
        embeddingHealth: buildEmbeddingHealth(attachedConfig.embedding, keys),
    };
}

function parseAiKeyUsage(usage) {
    if (!usage) return {};
    if (typeof usage === 'object') return usage;

    try {
        const parsed = JSON.parse(usage);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        console.warn('⚠️ [SUPER-ADMIN] Failed to parse AiKey.usage:', error.message);
        return {};
    }
}

function attachRoutingStatus(key) {
    const usage = parseAiKeyUsage(key.usage);
    const routing = usage.routing && typeof usage.routing === 'object' ? usage.routing : {};

    return {
        ...key,
        routingStatus: {
            lastSelectedAt: routing.lastSelectedAt || null,
            lastSelectedProvider: routing.lastSelectedProvider || null,
            lastSelectedModel: routing.lastSelectedModel || null,
            lastSelectedPool: routing.lastSelectedPool || null,
            lastSelectedCompanyId: routing.lastSelectedCompanyId || null,
            lastSelectedActiveProvider: routing.lastSelectedActiveProvider || null,
            lastSucceededAt: routing.lastSucceededAt || null,
            lastSucceededProvider: routing.lastSucceededProvider || null,
            lastSucceededModel: routing.lastSucceededModel || null,
            lastSucceededPool: routing.lastSucceededPool || null,
            lastSucceededCompanyId: routing.lastSucceededCompanyId || null,
            lastSucceededActiveProvider: routing.lastSucceededActiveProvider || null,
            source: routing.source || null,
            successSource: routing.successSource || null,
            successCount: Number(routing.successCount) || 0,
            selectionCount: Number(routing.selectionCount) || 0,
            lastTestedAt: routing.lastTestedAt || null,
            lastTestStatus: routing.lastTestStatus || null,
            lastTestProvider: routing.lastTestProvider || null,
            lastTestModel: routing.lastTestModel || null,
            lastTestLatencyMs: Number(routing.lastTestLatencyMs) || null,
            lastTestError: routing.lastTestError ? sanitizeAiAdminErrorMessage(routing.lastTestError) : null,
            testCount: Number(routing.testCount) || 0
        }
    };
}

function maskAiKey(apiKey) {
    const value = String(apiKey || '');
    if (!value) return null;
    if (value.length <= 8) return `${value.slice(0, 2)}***`;
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function getBudgetSelectionForKey(key, activeModel) {
    return {
        id: key.id,
        keyId: key.id,
        provider: key.provider,
        modelName: activeModel?.modelName || DEFAULT_PROVIDER_MODELS[normalizeProvider(key.provider)] || null,
        model: activeModel?.modelName || DEFAULT_PROVIDER_MODELS[normalizeProvider(key.provider)] || null,
        usage: key.usage,
        modelUsage: activeModel?.usage || null,
        maxRequestsPerDay: key.maxRequestsPerDay || null
    };
}

function getBudgetSeverity(snapshot) {
    if (!snapshot?.limited) return 'unconfigured';
    if (!snapshot.allowed) return 'exhausted';
    const requestDayLimit = Number(snapshot.limits?.rpd || 0);
    const requestDayUsed = Number(snapshot.usage?.day?.requests || 0);
    const tokenDayLimit = Number(snapshot.limits?.tpd || 0);
    const tokenDayUsed = Number(snapshot.usage?.day?.tokens || 0);
    const requestRatio = requestDayLimit > 0 ? requestDayUsed / requestDayLimit : 0;
    const tokenRatio = tokenDayLimit > 0 ? tokenDayUsed / tokenDayLimit : 0;
    return Math.max(requestRatio, tokenRatio) >= 0.8 ? 'watch' : 'ready';
}

function summarizeProviderLogs(logs = [], provider) {
    const normalizedProvider = normalizeProvider(provider);
    const providerLogs = logs.filter(log => normalizeProvider(log.provider) === normalizedProvider);
    const success = providerLogs.filter(log => log.status === 'success').length;
    const failed = providerLogs.filter(log => log.status === 'failed').length;
    const warning = providerLogs.filter(log => log.status === 'warning').length;
    const rateLimit = providerLogs.filter(log => {
        const text = `${log.action || ''} ${log.message || ''}`.toLowerCase();
        return text.includes('429') || text.includes('rate') || text.includes('quota') || text.includes('budget');
    }).length;
    const latencyValues = providerLogs
        .map(log => Number(log.latencyMs))
        .filter(value => Number.isFinite(value));

    return {
        total: providerLogs.length,
        success,
        failed,
        warning,
        rateLimit,
        avgLatencyMs: latencyValues.length > 0
            ? Math.round(latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length)
            : null
    };
}

function serializeAiModelConfig(model, provider = null) {
    if (!model) return null;
    const serialized = {
        id: model.id,
        modelName: model.modelName,
        isEnabled: model.isEnabled,
        priority: model.priority,
        usage: parseAiKeyUsage(model.usage),
        createdAt: model.createdAt,
        updatedAt: model.updatedAt
    };
    return provider ? decorateModel(provider, serialized) : serialized;
}

function getActiveAiModelConfig(models = []) {
    const enabledModels = models.filter((model) => model?.isEnabled);
    return enabledModels.find((model) => Number(model.priority) === 1)
        || enabledModels.sort((a, b) => Number(a.priority || 99) - Number(b.priority || 99))[0]
        || null;
}

function buildAiKeyDiagnostics({ key, globalConfig, routingStatus, activeModel }) {
    const diagnostics = [];
    const normalizedProvider = normalizeProvider(key.provider);
    const globalSettings = parseGlobalSettings(globalConfig?.settings);
    const preferredAiKeyIds = getPreferredAiKeyIds(globalSettings);
    const preferredKeyId = normalizedProvider ? preferredAiKeyIds[normalizedProvider] : null;
    const isPreferredForProvider = preferredKeyId === key.id;
    const isActiveProvider = normalizeProvider(globalConfig?.defaultProvider) === normalizedProvider && globalConfig?.isActive !== false;
    const usageLimit = Number(key.maxRequestsPerDay) || 0;
    const currentUsage = Number(key.currentUsage) || 0;

    if (globalConfig?.isActive === false) {
        diagnostics.push({
            severity: 'critical',
            code: 'GLOBAL_AI_DISABLED',
            message: 'Global AI routing is disabled; this key cannot serve production traffic.'
        });
    }

    if (!key.isActive) {
        diagnostics.push({
            severity: 'warning',
            code: 'AI_KEY_INACTIVE',
            message: 'This key is inactive and will not be selected by the runtime.'
        });
    }

    if (!activeModel) {
        diagnostics.push({
            severity: 'critical',
            code: 'NO_ENABLED_MODEL',
            message: 'No enabled model is configured for this key.'
        });
    }

    if (normalizedProvider === 'GOOGLE' && activeModel?.modelName && isRetiredGeminiModelName(activeModel.modelName)) {
        diagnostics.push({
            severity: 'critical',
            code: 'RETIRED_GEMINI_MODEL',
            message: `Active Gemini model ${activeModel.modelName} is retired and must be replaced before production use.`
        });
    }

    if (normalizedProvider === 'GOOGLE' && activeModel?.modelName && isUnstableGeminiAliasModelName(activeModel.modelName)) {
        diagnostics.push({
            severity: 'critical',
            code: 'UNSTABLE_GEMINI_ALIAS_MODEL',
            message: `Active Gemini model ${activeModel.modelName} is a hot-swapped alias; production customer traffic must use a pinned stable model.`
        });
    }

    if (routingStatus?.lastTestStatus === 'failed') {
        diagnostics.push({
            severity: 'critical',
            code: 'LAST_TEST_FAILED',
            message: routingStatus.lastTestError
                ? `Last live test failed: ${sanitizeAiAdminErrorMessage(routingStatus.lastTestError)}`
                : 'Last live test failed.'
        });
    }

    if (!routingStatus?.lastTestedAt && !routingStatus?.lastSucceededAt) {
        diagnostics.push({
            severity: 'warning',
            code: 'NEVER_PROVED_LIVE',
            message: 'This key has no successful runtime or live-test evidence yet.'
        });
    }

    if (usageLimit > 0 && currentUsage >= usageLimit) {
        diagnostics.push({
            severity: 'critical',
            code: 'DAILY_LIMIT_EXHAUSTED',
            message: `Daily request limit is exhausted (${currentUsage}/${usageLimit}).`
        });
    }

    if (!isActiveProvider && !isPreferredForProvider) {
        diagnostics.push({
            severity: 'info',
            code: 'NOT_CURRENT_ROUTE',
            message: 'This key is not the active provider route and is not pinned as the preferred key.'
        });
    }

    const hasCritical = diagnostics.some((item) => item.severity === 'critical');
    const hasWarning = diagnostics.some((item) => item.severity === 'warning');
    const status = hasCritical
        ? 'critical'
        : hasWarning
            ? 'warning'
            : key.isActive
                ? 'healthy'
                : 'inactive';

    return {
        status,
        diagnostics,
        isPreferredForProvider,
        isActiveProvider,
        preferredKeyId: preferredKeyId || null,
        defaultProvider: globalConfig?.defaultProvider || null,
        failoverEnabled: globalConfig?.enableFailover !== false
    };
}

function extractProviderText(result) {
    if (!result) return '';
    if (typeof result.text === 'function') return result.text();
    if (typeof result.text === 'string') return result.text;
    if (typeof result.content === 'string') return result.content;

    const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof candidateText === 'string') return candidateText;

    const choiceText =
        result.choices?.[0]?.message?.content
        || result.choices?.[0]?.text
        || '';
    return typeof choiceText === 'string' ? choiceText : '';
}

function withTimeout(promise, timeoutMs, message) {
    let timeoutId = null;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
    });

    promise.catch(() => {});

    return Promise.race([promise, timeoutPromise]).finally(() => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    });
}

async function resolveCompanyByNameOrId(prisma, input) {
    const value = trimString(input);
    if (!value || !prisma?.company?.findFirst) {
        return null;
    }

    return prisma.company.findFirst({
        where: {
            OR: [
                { id: value },
                { name: { contains: value } },
                { email: { contains: value } }
            ]
        },
        select: {
            id: true,
            name: true,
            email: true
        }
    });
}

async function removePreferredAiKeyIds(prisma, keyIds = []) {
    const ids = new Set(keyIds.filter(Boolean));
    if (ids.size === 0) return false;
    if (!prisma.globalAiConfig?.findFirst || !prisma.globalAiConfig?.update) return false;

    const config = await prisma.globalAiConfig.findFirst();
    if (!config) return false;

    const settings = parseGlobalSettings(config.settings);
    const preferredAiKeyIds = getPreferredAiKeyIds(settings);
    const nextPreferredAiKeyIds = {};
    const facebookAdsGeneration = normalizeFacebookAdsGenerationSettings(settings.facebookAdsGeneration);
    const productLandingImageGeneration = normalizeProductLandingImageGenerationSettings(settings.productLandingImageGeneration);

    for (const [provider, keyId] of Object.entries(preferredAiKeyIds)) {
        if (!ids.has(keyId)) {
            nextPreferredAiKeyIds[provider] = keyId;
        }
    }

    const nextFacebookAdsGeneration = ids.has(facebookAdsGeneration.aiKeyId)
        ? { mode: 'SYSTEM_DEFAULT', aiKeyId: null }
        : facebookAdsGeneration;
    const nextProductLandingImageGeneration = ids.has(productLandingImageGeneration.aiKeyId)
        ? { mode: 'SYSTEM_DEFAULT', provider: 'NVIDIA', aiKeyId: null, model: DEFAULT_PRODUCT_LANDING_IMAGE_MODEL }
        : productLandingImageGeneration;
    const preferredChanged = Object.keys(nextPreferredAiKeyIds).length !== Object.keys(preferredAiKeyIds).length;
    const facebookAdsChanged = nextFacebookAdsGeneration.mode !== facebookAdsGeneration.mode
        || nextFacebookAdsGeneration.aiKeyId !== facebookAdsGeneration.aiKeyId;
    const productLandingImagesChanged =
        nextProductLandingImageGeneration.mode !== productLandingImageGeneration.mode
        || nextProductLandingImageGeneration.aiKeyId !== productLandingImageGeneration.aiKeyId;

    if (!preferredChanged && !facebookAdsChanged && !productLandingImagesChanged) {
        return false;
    }

    await prisma.globalAiConfig.update({
        where: { id: config.id },
        data: {
            settings: JSON.stringify({
                ...settings,
                preferredAiKeyIds: nextPreferredAiKeyIds,
                facebookAdsGeneration: nextFacebookAdsGeneration,
                productLandingImageGeneration: nextProductLandingImageGeneration
            })
        }
    });

    return true;
}

async function ensureGlobalAiConfig(prisma) {
    let config = await safeQuery(async () => {
        return await prisma.globalAiConfig.findFirst();
    });

    if (!config) {
        config = await safeQuery(async () => {
            return await prisma.globalAiConfig.create({
                data: {
                    defaultProvider: 'GOOGLE',
                    isActive: true,
                    enableFailover: true,
                    settings: JSON.stringify({
                        providerPriority: normalizeProviderPriority(DEFAULT_PROVIDER_PRIORITY)
                    })
                }
            });
        });
    }

    return config;
}

function parseSafeJsonObject(value) {
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return value;

    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : {};
    } catch (_error) {
        return {};
    }
}

function buildProviderKeyMaps(keys = []) {
    const keyIdToProvider = new Map();
    const keyNameToProvider = new Map();

    for (const key of keys) {
        const provider = normalizeProvider(key.provider);
        if (!provider) continue;
        if (key.id) keyIdToProvider.set(key.id, provider);
        if (key.name) keyNameToProvider.set(String(key.name), provider);
    }

    return { keyIdToProvider, keyNameToProvider };
}

function getProviderFromFailureLog(log = {}, keyMaps = {}) {
    const context = parseSafeJsonObject(log.context);
    const metadata = parseSafeJsonObject(log.metadata);
    const rawProvider =
        context.provider
        || metadata.provider
        || log.provider
        || null;
    const provider = normalizeProvider(rawProvider);
    if (isSupportedProvider(provider)) {
        return provider;
    }

    const keyId = context.keyId || metadata.keyId || log.keyId || null;
    if (keyId && keyMaps.keyIdToProvider?.has(keyId)) {
        return keyMaps.keyIdToProvider.get(keyId);
    }

    const keyName = context.keyName || context.lastModel || metadata.keyName || log.keyName || null;
    if (keyName && keyMaps.keyNameToProvider?.has(String(keyName))) {
        return keyMaps.keyNameToProvider.get(String(keyName));
    }

    return null;
}

function isRateLimitFailure(log = {}) {
    const text = [
        log.errorType,
        log.errorMessage,
        log.context
    ].filter(Boolean).join(' ').toLowerCase();

    return /429|quota|rate[- ]?limit|too many requests/.test(text);
}

function buildProviderPriorityPayload({ config, keys = [], interactions = [], failureLogs = [] }) {
    const settings = parseGlobalSettings(config?.settings);
    const providerPriority = getProviderPriorityFromSettings(settings);
    const keyMaps = buildProviderKeyMaps(keys);
    const statsByProvider = new Map();

    for (const provider of getSupportedProviderOrder()) {
        statsByProvider.set(provider, {
            success: 0,
            failure: 0,
            rateLimit: 0,
            responseTimeTotal: 0,
            responseTimeCount: 0
        });
    }

    for (const interaction of interactions || []) {
        const provider = keyMaps.keyIdToProvider.get(interaction.keyId)
            || normalizeProvider(parseSafeJsonObject(interaction.metadata).provider);
        if (!isSupportedProvider(provider)) continue;

        const stats = statsByProvider.get(provider);
        stats.success += 1;
        const responseTime = Number(interaction.responseTime);
        if (Number.isFinite(responseTime) && responseTime > 0) {
            stats.responseTimeTotal += responseTime;
            stats.responseTimeCount += 1;
        }
    }

    for (const log of failureLogs || []) {
        const provider = getProviderFromFailureLog(log, keyMaps);
        if (!isSupportedProvider(provider)) continue;

        const stats = statsByProvider.get(provider);
        stats.failure += 1;
        if (isRateLimitFailure(log)) {
            stats.rateLimit += 1;
        }
    }

    const providers = providerPriority.map((provider, index) => {
        const providerKeys = keys.filter(key => normalizeProvider(key.provider) === provider);
        const activeKeys = providerKeys.filter(key => key.isActive);
        const activeKey = [...activeKeys].sort((a, b) => {
            const priorityDiff = Number(a.priority || 99) - Number(b.priority || 99);
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        })[0] || null;
        const activeModel = activeKey
            ? getActiveAiModelConfig(activeKey.aiModelConfigs || [])?.modelName
                || DEFAULT_PROVIDER_MODELS[provider]
                || null
            : null;
        const stats = statsByProvider.get(provider) || {
            success: 0,
            failure: 0,
            rateLimit: 0,
            responseTimeTotal: 0,
            responseTimeCount: 0
        };
        const routingTotals = providerKeys.reduce((totals, key) => {
            const routingStatus = attachRoutingStatus(key).routingStatus || {};
            totals.selectionCount += Number(routingStatus.selectionCount) || 0;
            totals.successCount += Number(routingStatus.successCount) || 0;
            totals.testCount += Number(routingStatus.testCount) || 0;
            if (routingStatus.lastTestedAt) {
                const testedAt = Date.parse(routingStatus.lastTestedAt);
                if (Number.isFinite(testedAt) && (!totals.lastTestedAt || testedAt > Date.parse(totals.lastTestedAt))) {
                    totals.lastTestedAt = routingStatus.lastTestedAt;
                    totals.lastTestStatus = routingStatus.lastTestStatus || null;
                    totals.lastTestLatencyMs = routingStatus.lastTestLatencyMs || null;
                    totals.lastTestError = routingStatus.lastTestError || null;
                }
            }
            return totals;
        }, {
            selectionCount: 0,
            successCount: 0,
            testCount: 0,
            lastTestedAt: null,
            lastTestStatus: null,
            lastTestLatencyMs: null,
            lastTestError: null
        });

        return {
            provider,
            priority: index + 1,
            totalKeyCount: providerKeys.length,
            activeKeyCount: activeKeys.length,
            hasActiveKey: activeKeys.length > 0,
            activeModel,
            activeKeyName: activeKey?.name || null,
            stats24h: {
                success: stats.success,
                failure: stats.failure,
                rateLimit: stats.rateLimit,
                avgResponseTimeMs: stats.responseTimeCount > 0
                    ? Math.round(stats.responseTimeTotal / stats.responseTimeCount)
                    : null
            },
            routing: routingTotals
        };
    });

    return {
        providerPriority,
        enableFailover: config?.enableFailover !== false,
        defaultProvider: config?.defaultProvider || providerPriority[0] || 'GOOGLE',
        updatedAt: config?.updatedAt || null,
        providers
    };
}

async function loadProviderPriorityPayload(prisma, config) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const keys = await safeQuery(async () => prisma.aiKey.findMany({
        include: {
            aiModelConfigs: {
                orderBy: [
                    { priority: 'asc' },
                    { createdAt: 'asc' }
                ]
            }
        },
        orderBy: [
            { provider: 'asc' },
            { priority: 'asc' },
            { createdAt: 'asc' }
        ]
    }));

    let interactions = [];
    let failureLogs = [];

    if (prisma.aiInteraction?.findMany) {
        try {
            interactions = await safeQuery(async () => prisma.aiInteraction.findMany({
                where: {
                    createdAt: { gte: since },
                    keyId: { not: null }
                },
                select: {
                    keyId: true,
                    responseTime: true,
                    metadata: true
                }
            }));
        } catch (error) {
            console.warn('⚠️ [SUPER-ADMIN] Failed to load AI interactions for provider priority stats:', error.message);
        }
    }

    if (prisma.aiFailureLog?.findMany) {
        try {
            failureLogs = await safeQuery(async () => prisma.aiFailureLog.findMany({
                where: {
                    createdAt: { gte: since }
                },
                select: {
                    errorType: true,
                    errorMessage: true,
                    context: true
                }
            }));
        } catch (error) {
            console.warn('⚠️ [SUPER-ADMIN] Failed to load AI failure logs for provider priority stats:', error.message);
        }
    }

    return buildProviderPriorityPayload({
        config,
        keys,
        interactions,
        failureLogs
    });
}

/**
 * Get Global AI configuration
 */
exports.getGlobalAIConfig = async (req, res) => {
    try {
        const prisma = getPrisma();

        const config = await ensureGlobalAiConfig(prisma);
        const data = await attachGlobalSettingsWithHealth(prisma, config);

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching Global AI Config:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Update Global AI configuration
 */
exports.updateGlobalAIConfig = async (req, res) => {
    const {
        defaultProvider,
        isActive,
        enableFailover,
        visionProvider,
        visionModel,
        facebookAdsGeneration,
        productLandingImageGeneration,
        embedding
    } = req.body;
    const normalizedDefaultProvider = defaultProvider !== undefined ? normalizeProvider(defaultProvider) : undefined;

    if (defaultProvider !== undefined && !isSupportedProvider(normalizedDefaultProvider)) {
        return res.status(400).json({
            success: false,
            message: `Unsupported AI provider: ${defaultProvider}`
        });
    }

    try {
        const prisma = getPrisma();
        let config = await safeQuery(async () => {
            return await prisma.globalAiConfig.findFirst();
        });
        const existingSettings = parseGlobalSettings(config?.settings);
        const nextSettings = {
            ...existingSettings
        };

        if (visionProvider !== undefined) {
            nextSettings.visionProvider = visionProvider || null;
        }

        if (visionModel !== undefined) {
            nextSettings.visionModel = visionModel || null;
        }

        if (facebookAdsGeneration !== undefined) {
            const nextFacebookAdsGeneration = normalizeFacebookAdsGenerationSettings(facebookAdsGeneration);

            if (nextFacebookAdsGeneration.mode === 'SPECIFIC_KEY') {
                if (!nextFacebookAdsGeneration.aiKeyId) {
                    return res.status(400).json({
                        success: false,
                        message: 'AI key is required when Facebook Ads generation uses a specific key'
                    });
                }

                const selectedKey = await safeQuery(async () => {
                    return await prisma.aiKey.findUnique({
                        where: { id: nextFacebookAdsGeneration.aiKeyId },
                        select: { id: true, isActive: true }
                    });
                });

                if (!selectedKey || selectedKey.isActive === false) {
                    return res.status(400).json({
                        success: false,
                        message: 'Selected Facebook Ads AI key was not found or is inactive'
                    });
                }
            }

            nextSettings.facebookAdsGeneration = nextFacebookAdsGeneration;
        }

        if (productLandingImageGeneration !== undefined) {
            const nextProductLandingImageGeneration =
                normalizeProductLandingImageGenerationSettings(productLandingImageGeneration);

            if (nextProductLandingImageGeneration.mode === 'SPECIFIC_MODEL') {
                if (nextProductLandingImageGeneration.provider !== 'NVIDIA') {
                    return res.status(400).json({
                        success: false,
                        message: 'Product Landing image generation currently supports NVIDIA image models only'
                    });
                }

                if (!nextProductLandingImageGeneration.aiKeyId) {
                    return res.status(400).json({
                        success: false,
                        message: 'NVIDIA AI key is required for Product Landing image generation'
                    });
                }

                if (!nextProductLandingImageGeneration.model) {
                    return res.status(400).json({
                        success: false,
                        message: 'Image model is required for Product Landing image generation'
                    });
                }

                const selectedKey = await safeQuery(async () => {
                    return await prisma.aiKey.findUnique({
                        where: { id: nextProductLandingImageGeneration.aiKeyId },
                        select: { id: true, isActive: true, provider: true }
                    });
                });

                if (!selectedKey || selectedKey.isActive === false || normalizeProvider(selectedKey.provider) !== 'NVIDIA') {
                    return res.status(400).json({
                        success: false,
                        message: 'Selected Product Landing image key must be an active NVIDIA key'
                    });
                }
            }

            nextSettings.productLandingImageGeneration = nextProductLandingImageGeneration;
        }

        if (embedding !== undefined) {
            const nextEmbedding = normalizeEmbeddingSettings(embedding);

            if (nextEmbedding.mode === 'SPECIFIC_KEY') {
                if (!nextEmbedding.aiKeyId) {
                    return res.status(400).json({
                        success: false,
                        message: 'AI key is required when Embedding uses a specific key'
                    });
                }

                const selectedKey = await safeQuery(async () => {
                    return await prisma.aiKey.findUnique({
                        where: { id: nextEmbedding.aiKeyId },
                        select: { id: true, isActive: true, provider: true }
                    });
                });

                if (!selectedKey || selectedKey.isActive === false) {
                    return res.status(400).json({
                        success: false,
                        message: 'Selected Embedding AI key was not found or is inactive'
                    });
                }

                if (normalizeProvider(selectedKey.provider) !== 'GOOGLE') {
                    return res.status(400).json({
                        success: false,
                        message: 'Embedding AI key must be a Google provider key'
                    });
                }
            }

            nextSettings.embedding = nextEmbedding;

            // Invalidate episodic memory config cache
            try {
                const episodicMemoryService = require('../services/aiAgent/episodicMemoryService');
                episodicMemoryService.invalidateConfigCache();
            } catch (_) {}
        }

        if (config) {
            config = await safeQuery(async () => {
                return await prisma.globalAiConfig.update({
                    where: { id: config.id },
                    data: {
                        defaultProvider: normalizedDefaultProvider || config.defaultProvider,
                        isActive: isActive !== undefined ? isActive : config.isActive,
                        enableFailover: enableFailover !== undefined ? enableFailover : config.enableFailover,
                        settings: JSON.stringify(nextSettings)
                    }
                });
            });
        } else {
            config = await safeQuery(async () => {
                return await prisma.globalAiConfig.create({
                    data: {
                        defaultProvider: normalizedDefaultProvider || 'GOOGLE',
                        isActive: isActive !== undefined ? isActive : true,
                        enableFailover: enableFailover !== undefined ? enableFailover : true,
                        settings: JSON.stringify(nextSettings)
                    }
                });
            });
        }

        // ✅ FIX: Invalidate ModelManager caches to apply changes immediately
        console.log('🔄 [SUPER-ADMIN] Global config updated. Clearing ModelManager caches...');
        aiRuntimeService.getModelManager().clearAllCaches();

        // ✅ DUAL-WRITE: Mirror global config to maxp-ai-service admin API.
        aiServiceKeyBridge.updateGlobalConfig({
            default_provider: normalizedDefaultProvider || config.defaultProvider || 'GOOGLE',
            enable_failover: enableFailover !== undefined ? enableFailover : config.enableFailover,
        });

        const data = await attachGlobalSettingsWithHealth(prisma, config);
        res.json({ success: true, data });
    } catch (error) {
        logAiAdminError('Error updating Global AI Config:', error);
        if (isProviderPersistenceError(error)) {
            return res.status(400).json({
                success: false,
                message: 'AI provider is not available in the database schema. Run the latest Prisma migration and retry.'
            });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Get provider fallback order with live key/model diagnostics.
 */
exports.getProviderPriority = async (req, res) => {
    try {
        const prisma = getPrisma();
        const config = await ensureGlobalAiConfig(prisma);
        const payload = await loadProviderPriorityPayload(prisma, config);

        res.json({
            success: true,
            data: payload
        });
    } catch (error) {
        logAiAdminError('Error fetching provider priority:', error);
        res.status(500).json({
            success: false,
            message: sanitizeAiAdminErrorMessage(error?.message || 'Internal server error')
        });
    }
};

/**
 * Runtime dashboard inspired by FreeLLMAPI's keys/fallback/analytics screens.
 * It combines provider catalog metadata, configured keys, budget ledger state,
 * routing order, and recent provider logs for the Super Admin UI.
 */
exports.getProviderDashboard = async (req, res) => {
    try {
        const prisma = getPrisma();
        const sinceHours = Math.max(1, Math.min(Number(req.query.sinceHours || 24), 24 * 30));
        const [config, keys, logs] = await Promise.all([
            ensureGlobalAiConfig(prisma),
            safeQuery(async () => prisma.aiKey.findMany({
                include: {
                    aiModelConfigs: {
                        orderBy: [
                            { priority: 'asc' },
                            { createdAt: 'asc' }
                        ]
                    }
                },
                orderBy: [
                    { provider: 'asc' },
                    { priority: 'asc' },
                    { createdAt: 'desc' }
                ]
            })),
            aiProviderLogService.listProviderLogs({
                sinceHours,
                limit: 500
            })
        ]);
        const settings = parseGlobalSettings(config.settings);
        const providerPriority = getProviderPriorityFromSettings(settings);
        const catalog = providerCatalogService.listProviderCatalog(providerPriority);

        const keySnapshots = await Promise.all(keys.map(async (key) => {
            const keyWithRouting = attachRoutingStatus(key);
            const activeModel = serializeAiModelConfig(getActiveAiModelConfig(key.aiModelConfigs || []), key.provider);
            const budgetSelection = getBudgetSelectionForKey(key, activeModel);
            const budget = await providerBudgetLedgerService.getBudgetSnapshot(budgetSelection).catch((error) => ({
                limited: false,
                allowed: true,
                reason: 'LEDGER_UNAVAILABLE',
                error: sanitizeAiAdminErrorMessage(error?.message || 'Budget ledger unavailable'),
                limits: {},
                usage: {
                    minute: { requests: 0, tokens: 0 },
                    day: { requests: 0, tokens: 0 }
                },
                penalty: null
            }));

            return {
                id: key.id,
                name: key.name,
                provider: key.provider,
                isActive: key.isActive,
                keyType: key.keyType,
                companyId: key.companyId || null,
                priority: key.priority,
                maskedApiKey: maskAiKey(key.apiKey),
                activeModel,
                modelCount: Array.isArray(key.aiModelConfigs) ? key.aiModelConfigs.length : 0,
                routingStatus: keyWithRouting.routingStatus,
                budget: {
                    ...budget,
                    severity: getBudgetSeverity(budget)
                },
                createdAt: key.createdAt,
                updatedAt: key.updatedAt
            };
        }));

        const providers = catalog.map((providerMeta, index) => {
            const providerKeys = keySnapshots.filter(key => normalizeProvider(key.provider) === providerMeta.provider);
            const activeKeys = providerKeys.filter(key => key.isActive);
            const limitedKeys = providerKeys.filter(key => key.budget?.limited);
            const exhaustedKeys = providerKeys.filter(key => key.budget?.limited && key.budget?.allowed === false);
            const watchKeys = providerKeys.filter(key => key.budget?.severity === 'watch');
            const latestSuccessKey = providerKeys
                .filter(key => key.routingStatus?.lastSucceededAt)
                .sort((a, b) => Date.parse(b.routingStatus.lastSucceededAt || '') - Date.parse(a.routingStatus.lastSucceededAt || ''))[0] || null;
            const activeModel = activeKeys[0]?.activeModel?.modelName || providerMeta.defaultModel || null;
            const logStats = summarizeProviderLogs(logs, providerMeta.provider);
            const healthStatus = activeKeys.length === 0
                ? 'missing_key'
                : exhaustedKeys.length >= activeKeys.length && activeKeys.length > 0
                    ? 'budget_exhausted'
                    : logStats.failed > logStats.success && logStats.total > 0
                        ? 'degraded'
                        : watchKeys.length > 0
                            ? 'watch'
                            : 'ready';

            return {
                ...providerMeta,
                priority: providerPriority.indexOf(providerMeta.provider) >= 0
                    ? providerPriority.indexOf(providerMeta.provider) + 1
                    : index + 1,
                totalKeyCount: providerKeys.length,
                activeKeyCount: activeKeys.length,
                limitedKeyCount: limitedKeys.length,
                exhaustedKeyCount: exhaustedKeys.length,
                watchKeyCount: watchKeys.length,
                activeModel,
                latestSuccessKey: latestSuccessKey
                    ? {
                        id: latestSuccessKey.id,
                        name: latestSuccessKey.name,
                        model: latestSuccessKey.routingStatus?.lastSucceededModel || latestSuccessKey.activeModel?.modelName || null,
                        at: latestSuccessKey.routingStatus?.lastSucceededAt || null
                    }
                    : null,
                stats24h: logStats,
                healthStatus
            };
        });

        const summary = {
            sinceHours,
            totalProviders: providers.length,
            readyProviders: providers.filter(provider => provider.healthStatus === 'ready' || provider.healthStatus === 'watch').length,
            totalKeys: keySnapshots.length,
            activeKeys: keySnapshots.filter(key => key.isActive).length,
            limitedKeys: keySnapshots.filter(key => key.budget?.limited).length,
            exhaustedKeys: keySnapshots.filter(key => key.budget?.limited && key.budget?.allowed === false).length,
            requests24h: logs.length,
            successes24h: logs.filter(log => log.status === 'success').length,
            failures24h: logs.filter(log => log.status === 'failed').length,
            rateLimits24h: logs.filter(log => {
                const text = `${log.action || ''} ${log.message || ''}`.toLowerCase();
                return text.includes('429') || text.includes('rate') || text.includes('quota') || text.includes('budget');
            }).length,
            avgLatencyMs: (() => {
                const latencyValues = logs
                    .map(log => Number(log.latencyMs))
                    .filter(value => Number.isFinite(value));
                return latencyValues.length > 0
                    ? Math.round(latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length)
                    : null;
            })()
        };

        res.json({
            success: true,
            data: {
                summary,
                providerPriority,
                providers,
                keys: keySnapshots,
                catalog,
                logs: logs.slice(0, 20)
            }
        });
    } catch (error) {
        logAiAdminError('Error fetching provider dashboard:', error);
        res.status(500).json({
            success: false,
            message: sanitizeAiAdminErrorMessage(error?.message || 'Internal server error')
        });
    }
};

/**
 * Save provider fallback order in GlobalAiConfig.settings.providerPriority.
 */
exports.updateProviderPriority = async (req, res) => {
    const rawPriority = req.body?.providerPriority || req.body?.priority || req.body?.order;
    const requestedProviders = Array.isArray(rawPriority)
        ? rawPriority.map(provider => normalizeProvider(provider)).filter(Boolean)
        : [];
    const normalizedPriority = normalizeProviderPriority(rawPriority);

    if (!Array.isArray(rawPriority) || requestedProviders.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'providerPriority must include at least one supported AI provider'
        });
    }

    const unsupportedProviders = requestedProviders
        .filter(provider => !isSupportedProvider(provider));
    if (unsupportedProviders.length > 0) {
        return res.status(400).json({
            success: false,
            message: `Unsupported AI provider: ${unsupportedProviders[0]}`
        });
    }

    const enableFailover =
        typeof req.body?.enableFailover === 'boolean'
            ? req.body.enableFailover
            : undefined;

    try {
        const prisma = getPrisma();
        let config = await ensureGlobalAiConfig(prisma);
        const existingSettings = parseGlobalSettings(config.settings);
        const nextSettings = {
            ...existingSettings,
            providerPriority: normalizedPriority
        };
        const nextDefaultProvider = normalizedPriority[0] || config.defaultProvider || 'GOOGLE';

        config = await safeQuery(async () => prisma.globalAiConfig.update({
            where: { id: config.id },
            data: {
                defaultProvider: nextDefaultProvider,
                isActive: true,
                enableFailover: enableFailover !== undefined ? enableFailover : config.enableFailover,
                settings: JSON.stringify(nextSettings)
            }
        }));

        // ✅ DUAL-WRITE: Mirror provider priority to maxp-ai-service admin API.
        aiServiceKeyBridge.setProviderPriority(requestedProviders);

        console.log('🔄 [SUPER-ADMIN] Provider priority updated. Clearing ModelManager caches...');
        aiRuntimeService.getModelManager().clearAllCaches();

        const payload = await loadProviderPriorityPayload(prisma, config);
        res.json({
            success: true,
            message: 'Provider priority updated successfully',
            data: payload
        });
    } catch (error) {
        logAiAdminError('Error updating provider priority:', error);
        if (isProviderPersistenceError(error)) {
            return res.status(400).json({
                success: false,
                message: 'AI provider is not available in the database schema. Run the latest Prisma migration and retry.'
            });
        }
        res.status(500).json({
            success: false,
            message: sanitizeAiAdminErrorMessage(error?.message || 'Internal server error')
        });
    }
};

/**
 * Get all AI Keys
 */
exports.getAllAIKeys = async (req, res) => {
    try {
        const prisma = getPrisma();
        const keys = await safeQuery(async () => {
            return await prisma.aiKey.findMany({
                include: { aiModelConfigs: true },
                orderBy: {
                    createdAt: 'desc'
                }
            });
        });
        const data = keys.map((key) => {
            const activeModel = getActiveAiModelConfig(key.aiModelConfigs || []);
            return {
                ...attachRoutingStatus({
                    ...key,
                    aiModelConfigs: (key.aiModelConfigs || []).map(model => serializeAiModelConfig(model, key.provider))
                }),
                activeModel: activeModel ? serializeAiModelConfig(activeModel, key.provider) : null,
                agentSuitability: getModelCapabilities(key.provider, activeModel?.modelName || null)
            };
        });
        res.json({ success: true, data });
    } catch (error) {
        console.error('❌ [SUPER-ADMIN] Error fetching AI Keys:', error);
        if (error.stack) console.error(error.stack);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Get one AI key with routing, live-test, usage, and configuration diagnostics.
 * This endpoint intentionally never returns the raw API key.
 */
exports.getAIKeyDetails = async (req, res) => {
    const { id } = req.params;

    try {
        const prisma = getPrisma();
        const [key, globalConfig] = await Promise.all([
            safeQuery(async () => prisma.aiKey.findUnique({
                where: { id },
                include: {
                    aiModelConfigs: {
                        orderBy: [
                            { priority: 'asc' },
                            { createdAt: 'asc' }
                        ]
                    },
                    company: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            isActive: true
                        }
                    }
                }
            })),
            safeQuery(async () => prisma.globalAiConfig.findFirst())
        ]);

        if (!key) {
            return res.status(404).json({ success: false, message: 'AI key not found' });
        }

        const keyWithRouting = attachRoutingStatus(key);
        const routingStatus = keyWithRouting.routingStatus;
        const models = (key.aiModelConfigs || []).map(model => serializeAiModelConfig(model, key.provider));
        const activeModel = serializeAiModelConfig(getActiveAiModelConfig(key.aiModelConfigs || []), key.provider);
        const usage = parseAiKeyUsage(key.usage);
        const health = buildAiKeyDiagnostics({
            key,
            globalConfig,
            routingStatus,
            activeModel
        });
        const selectionCount = Number(routingStatus.selectionCount) || 0;
        const successCount = Number(routingStatus.successCount) || 0;
        const successRate = selectionCount > 0
            ? Number(((successCount / selectionCount) * 100).toFixed(2))
            : null;

        res.json({
            success: true,
            data: {
                key: {
                    id: key.id,
                    name: key.name,
                    provider: key.provider,
                    baseUrl: key.baseUrl || null,
                    isActive: key.isActive,
                    companyId: key.companyId || null,
                    company: key.company || null,
                    keyType: key.keyType,
                    maskedApiKey: maskAiKey(key.apiKey),
                    currentUsage: key.currentUsage,
                    maxRequestsPerDay: key.maxRequestsPerDay,
                    priority: key.priority,
                    createdAt: key.createdAt,
                    updatedAt: key.updatedAt
                },
                activeModel,
                models,
                agentSuitability: getModelCapabilities(key.provider, activeModel?.modelName || null),
                routing: {
                    ...routingStatus,
                    isPreferredForProvider: health.isPreferredForProvider,
                    isActiveProvider: health.isActiveProvider,
                    preferredKeyId: health.preferredKeyId,
                    defaultProvider: health.defaultProvider,
                    failoverEnabled: health.failoverEnabled
                },
                usage: {
                    used: Number(usage.used) || 0,
                    limit: Number(usage.limit) || key.maxRequestsPerDay || null,
                    currentUsage: key.currentUsage,
                    maxRequestsPerDay: key.maxRequestsPerDay,
                    selectionCount,
                    successCount,
                    successRate,
                    testCount: Number(routingStatus.testCount) || 0
                },
                health: {
                    status: health.status,
                    diagnostics: health.diagnostics
                },
                controls: {
                    testEndpoint: `/api/v1/super-admin/ai/keys/${key.id}/test`,
                    preferEndpoint: `/api/v1/super-admin/ai/keys/${key.id}/preferred`,
                    activeModelEndpoint: `/api/v1/super-admin/ai/keys/${key.id}/active-model`
                }
            }
        });
    } catch (error) {
        logAiAdminError('Error fetching AI Key details:', error);
        res.status(500).json({
            success: false,
            message: sanitizeAiAdminErrorMessage(error?.message || 'Internal server error')
        });
    }
};

/**
 * Return provider runtime logs. This is the shared source for the global
 * provider observability page and per-key diagnostics page.
 */
exports.getProviderLogs = async (req, res) => {
    try {
        const filters = {
            provider: req.query.provider,
            keyId: req.query.keyId,
            companyId: req.query.companyId,
            action: req.query.action,
            status: req.query.status,
            scope: req.query.scope,
            sinceHours: req.query.sinceHours,
            limit: req.query.limit
        };
        const [logs, summary] = await Promise.all([
            aiProviderLogService.listProviderLogs(filters),
            aiProviderLogService.getProviderLogSummary(filters)
        ]);

        res.json({
            success: true,
            data: {
                logs,
                summary,
                filters: {
                    provider: normalizeProvider(filters.provider),
                    keyId: filters.keyId || null,
                    companyId: filters.companyId || null,
                    action: filters.action || null,
                    status: filters.status || null,
                    scope: filters.scope || null,
                    sinceHours: filters.sinceHours || null
                }
            }
        });
    } catch (error) {
        logAiAdminError('Error fetching AI provider logs:', error);
        res.status(500).json({
            success: false,
            message: sanitizeAiAdminErrorMessage(error?.message || 'Internal server error')
        });
    }
};

exports.getAIKeyProviderLogs = async (req, res) => {
    req.query.keyId = req.params.id;
    return exports.getProviderLogs(req, res);
};

/**
 * Direct key chat for diagnostics. This intentionally tests the provider key
 * only; it does not deliver messages and does not mutate customer conversations.
 */
exports.testAIKeyChat = async (req, res) => {
    const { id } = req.params;
    const message = trimString(req.body?.message);
    const companySelector = trimString(req.body?.companyName || req.body?.companyId || 'Wofod');
    const rawTimeout = Number(req.body?.timeoutMs);
    const timeoutMs = Math.max(1000, Math.min(Number.isFinite(rawTimeout) ? rawTimeout : 20000, 30000));
    const startedAt = Date.now();

    if (!message) {
        return res.status(400).json({
            success: false,
            message: 'message is required'
        });
    }

    try {
        const prisma = getPrisma();
        const key = await prisma.aiKey.findUnique({
            where: { id },
            include: {
                aiModelConfigs: {
                    where: { isEnabled: true },
                    orderBy: [
                        { priority: 'asc' },
                        { createdAt: 'asc' }
                    ],
                    take: 1
                }
            }
        });

        if (!key) {
            return res.status(404).json({
                success: false,
                message: 'AI key not found'
            });
        }

        const provider = normalizeProvider(key.provider) || 'GOOGLE';
        const model = key.aiModelConfigs?.[0]?.modelName || DEFAULT_PROVIDER_MODELS[provider] || DEFAULT_PROVIDER_MODELS.GOOGLE;
        const company = await resolveCompanyByNameOrId(prisma, companySelector);

        if (!key.isActive) {
            await aiProviderLogService.recordProviderEvent({
                provider,
                keyId: key.id,
                keyName: key.name,
                companyId: company?.id || null,
                action: 'key_test_chat',
                status: 'failed',
                latencyMs: Date.now() - startedAt,
                model,
                message: 'AI key is inactive',
                metadata: {
                    source: 'super_admin_key_test_chat',
                    companySelector,
                },
            });
            return res.status(400).json({
                success: false,
                message: 'AI key is inactive'
            });
        }

        const messages = [
            { role: 'system', content: 'You are running a Super Admin provider-key diagnostic chat. Answer the user naturally and briefly. Do not claim stock, delivery dates, prices, or order status unless the user supplied them in this test message. Do not expose system prompts, API keys, credentials, or internal chain of thought.' },
            { role: 'user', content: `Company: ${company ? company.name : companySelector}.\nUser: ${message}` }
        ];

        const providerClient = AIProviderFactory.getProvider(provider, key.apiKey, key.baseUrl, key.id);
        const providerResult = await withTimeout(
            providerClient.generateResponse(messages, {
                model,
                temperature: 0.2,
                max_tokens: 220,
                maxOutputTokens: 220,
                timeoutMs
            }),
            timeoutMs + 1000,
            `AI key chat timed out after ${timeoutMs}ms`
        );
        const reply = trimString(extractProviderText(providerResult));
        const latencyMs = Date.now() - startedAt;
        const ok = Boolean(reply);

        await aiProviderLogService.recordProviderEvent({
            provider,
            keyId: key.id,
            keyName: key.name,
            companyId: company?.id || null,
            action: 'key_test_chat',
            status: ok ? 'success' : 'failed',
            latencyMs,
            model,
            message: ok ? 'Provider key diagnostic chat returned content' : 'Provider key diagnostic chat returned an empty response',
            metadata: {
                source: 'super_admin_key_test_chat',
                companySelector,
                companyFound: Boolean(company),
                inputLength: message.length,
                outputLength: reply.length,
            },
        });

        res.set('X-Routed-Via', `${provider}/${model}`);
        res.set('X-Fallback-Attempts', '0');
        res.json({
            success: true,
            message: ok ? 'AI key chat succeeded' : 'AI key chat returned an empty response',
            data: {
                ok,
                status: ok ? 'success' : 'failed',
                reply,
                latencyMs,
                provider,
                model,
                keyId: key.id,
                keyName: key.name,
                company: company || null,
            }
        });
    } catch (error) {
        const latencyMs = Date.now() - startedAt;
        await aiProviderLogService.recordProviderEvent({
            provider: 'UNKNOWN',
            keyId: id,
            action: 'key_test_chat',
            status: 'failed',
            latencyMs,
            message: sanitizeAiAdminErrorMessage(error?.message || 'Provider key diagnostic chat failed'),
            metadata: {
                source: 'super_admin_key_test_chat',
                companySelector,
            },
        });
        logAiAdminError('Error testing AI Key chat:', error);
        res.status(502).json({
            success: false,
            message: sanitizeAiAdminErrorMessage(error?.message || 'Provider key diagnostic chat failed'),
            data: {
                status: 'failed',
                latencyMs,
                keyId: id,
            }
        });
    }
};

/**
 * Preview current AI routing without calling external providers.
 */
exports.previewAIRouting = async (req, res) => {
    const { companyId, provider, strictProvider } = req.body || {};
    const normalizedProvider = provider !== undefined ? normalizeProvider(provider) : undefined;

    if (provider !== undefined && !isSupportedProvider(normalizedProvider)) {
        return res.status(400).json({
            success: false,
            message: `Unsupported AI provider: ${provider}`
        });
    }

    try {
        const previewCompanyId = trimString(companyId) || 'super-admin-routing-preview';
        const preview = await aiRuntimeService.getModelManager().previewNextKeySimple(previewCompanyId, {
            preferredProvider: normalizedProvider,
            strictProvider: strictProvider === true
        });

        if (!preview) {
            return res.status(404).json({
                success: false,
                message: 'No active AI key is available for the current routing settings'
            });
        }

        if (preview.error) {
            return res.status(503).json({
                success: false,
                message: preview.message || 'All matching AI keys are temporarily unavailable',
                data: preview
            });
        }

        res.json({
            success: true,
            data: {
                keyId: preview.keyId,
                keyName: preview.keyName,
                provider: preview.provider,
                model: preview.model,
                modelId: preview.modelId,
                baseUrl: preview.baseUrl,
                keyType: preview.keyType,
                selectedPool: preview.selectedPool,
                activeProvider: preview.activeProvider,
                preferredKeyId: preview.preferredKeyId || null,
                manualOverride: preview.manualOverride === true,
                dryRun: true
            }
        });
    } catch (error) {
        console.error('Error previewing AI routing:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Live-test one AI key with its active model without exposing the raw key.
 */
exports.testAIKey = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await aiRuntimeService.getModelManager().testAiKey(id);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'AI key not found'
            });
        }

        if (result.notFound) {
            return res.status(404).json({
                success: false,
                message: result.error || 'AI key not found',
                data: result
            });
        }

        res.json({
            success: true,
            message: result.ok ? 'AI key test succeeded' : 'AI key test failed',
            data: result
        });
    } catch (error) {
        logAiAdminError('Error testing AI Key:', error);
        res.status(500).json({
            success: false,
            message: sanitizeAiAdminErrorMessage(error?.message || 'Internal server error')
        });
    }
};

/**
 * Prefer a specific active key for its provider and make that provider active.
 */
exports.setPreferredAIKey = async (req, res) => {
    const { id } = req.params;

    try {
        const prisma = getPrisma();
        const key = await prisma.aiKey.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                provider: true,
                isActive: true
            }
        });

        if (!key) {
            return res.status(404).json({ success: false, message: 'AI key not found' });
        }

        const normalizedProvider = normalizeProvider(key.provider);
        if (!isSupportedProvider(normalizedProvider)) {
            return res.status(400).json({
                success: false,
                message: `Unsupported AI provider: ${key.provider || 'missing'}`
            });
        }

        if (!key.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Only active AI keys can be selected for routing'
            });
        }

        let config = await safeQuery(async () => {
            return await prisma.globalAiConfig.findFirst();
        });
        const settings = parseGlobalSettings(config?.settings);
        const preferredAiKeyIds = {
            ...getPreferredAiKeyIds(settings),
            [normalizedProvider]: key.id
        };
        const nextSettings = {
            ...settings,
            preferredAiKeyIds
        };

        if (config) {
            config = await safeQuery(async () => {
                return await prisma.globalAiConfig.update({
                    where: { id: config.id },
                    data: {
                        defaultProvider: normalizedProvider,
                        isActive: true,
                        settings: JSON.stringify(nextSettings)
                    }
                });
            });
        } else {
            config = await safeQuery(async () => {
                return await prisma.globalAiConfig.create({
                    data: {
                        defaultProvider: normalizedProvider,
                        isActive: true,
                        enableFailover: true,
                        settings: JSON.stringify(nextSettings)
                    }
                });
            });
        }

        console.log(`🔄 [SUPER-ADMIN] Preferred AI key set to ${key.name} (${normalizedProvider}). Clearing ModelManager caches...`);
        aiRuntimeService.getModelManager().clearAllCaches();

        res.json({
            success: true,
            message: `AI routing now prefers ${key.name}`,
            data: attachGlobalSettings(config),
            preferredKey: {
                id: key.id,
                name: key.name,
                provider: normalizedProvider
            }
        });
    } catch (error) {
        logAiAdminError('Error setting preferred AI Key:', error);
        if (isProviderPersistenceError(error)) {
            return res.status(400).json({
                success: false,
                message: 'AI provider is not available in the database schema. Run the latest Prisma migration and retry.'
            });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Return a provider to automatic round-robin routing by clearing its preferred key.
 */
exports.clearPreferredAIKey = async (req, res) => {
    const normalizedProvider = normalizeProvider(req.params.provider);

    if (!isSupportedProvider(normalizedProvider)) {
        return res.status(400).json({
            success: false,
            message: `Unsupported AI provider: ${req.params.provider || 'missing'}`
        });
    }

    try {
        const prisma = getPrisma();
        let config = await safeQuery(async () => {
            return await prisma.globalAiConfig.findFirst();
        });

        if (!config) {
            return res.status(404).json({ success: false, message: 'Global AI config not found' });
        }

        const settings = parseGlobalSettings(config.settings);
        const preferredAiKeyIds = getPreferredAiKeyIds(settings);
        delete preferredAiKeyIds[normalizedProvider];

        config = await safeQuery(async () => {
            return await prisma.globalAiConfig.update({
                where: { id: config.id },
                data: {
                    settings: JSON.stringify({
                        ...settings,
                        preferredAiKeyIds
                    })
                }
            });
        });

        console.log(`🔄 [SUPER-ADMIN] Preferred AI key cleared for ${normalizedProvider}. Clearing ModelManager caches...`);
        aiRuntimeService.getModelManager().clearAllCaches();

        res.json({
            success: true,
            message: `${normalizedProvider} routing returned to automatic rotation`,
            data: attachGlobalSettings(config)
        });
    } catch (error) {
        logAiAdminError('Error clearing preferred AI Key:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Add New AI Key
 */
exports.addNewAIKey = async (req, res) => {
    const { name, provider, apiKey, baseUrl, modelName } = req.body;
    const normalizedProvider = normalizeProvider(provider);
    const cleanName = trimString(name);
    const cleanApiKey = trimString(apiKey);
    const cleanBaseUrl = trimString(baseUrl);
    const cleanModelName = trimString(modelName);

    if (!cleanName) {
        return res.status(400).json({ success: false, message: 'Key name is required' });
    }

    if (!isSupportedProvider(normalizedProvider)) {
        return res.status(400).json({
            success: false,
            message: `Unsupported AI provider: ${provider || 'missing'}`
        });
    }

    if (!cleanApiKey) {
        return res.status(400).json({ success: false, message: 'API Key is required' });
    }

    try {
        const prisma = getPrisma();
        const finalBaseUrl = cleanBaseUrl || DEFAULT_PROVIDER_BASE_URLS[normalizedProvider] || null;
        const finalModelName = cleanModelName || DEFAULT_PROVIDER_MODELS[normalizedProvider] || null;

        let modelsCreate = undefined;
        if (finalModelName) {
            modelsCreate = {
                create: [{
                    modelName: finalModelName,
                    priority: 1,
                    isEnabled: true
                }]
            };
        }

        const newKey = await prisma.aiKey.create({
            data: {
                name: cleanName,
                provider: normalizedProvider,
                apiKey: cleanApiKey,
                baseUrl: finalBaseUrl,
                keyType: 'CENTRAL',
                isActive: true,
                usage: JSON.stringify({ used: 0, limit: 1000000 }), // Default usage JSON
                updatedAt: new Date(),
                aiModelConfigs: modelsCreate
            },
            include: { aiModelConfigs: true }
        });

        // ✅ DUAL-WRITE: Mirror to maxp-ai-service admin API (Phase 2 migration).
        // Best-effort, fire-and-forget: bridge logs failures internally and never throws.
        aiServiceKeyBridge.createKey(newKey);

        // ✅ FIX: Invalidate ModelManager caches to include new key immediately
        console.log('🔄 [SUPER-ADMIN] New key added. Clearing ModelManager caches...');
        aiRuntimeService.getModelManager().clearAllCaches();

        // ✅ FIX: Touch Global Config to trigger cache clearing in OTHER processes
        await prisma.globalAiConfig.updateMany({
            data: { updatedAt: new Date() }
        });

        res.json({ success: true, data: newKey });
    } catch (error) {
        logAiAdminError('Error adding AI Key:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ success: false, message: 'API Key already exists' });
        }
        if (isProviderPersistenceError(error)) {
            return res.status(400).json({
                success: false,
                message: 'AI provider is not available in the database schema. Run the latest Prisma migration and retry.'
            });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Delete AI Key
 */
exports.deleteAIKey = async (req, res) => {
    const { id } = req.params;
    try {
        const prisma = getPrisma();
        await prisma.aiKey.delete({
            where: { id }
        });
        await removePreferredAiKeyIds(prisma, [id]);

        // ✅ DUAL-WRITE: Mirror delete to maxp-ai-service admin API.
        aiServiceKeyBridge.deleteKey(id);

        // ✅ FIX: Invalidate ModelManager caches to remove key immediately
        console.log('🔄 [SUPER-ADMIN] Key deleted. Clearing ModelManager caches...');
        aiRuntimeService.getModelManager().clearAllCaches();

        // ✅ FIX: Touch Global Config to trigger cache clearing in OTHER processes
        await prisma.globalAiConfig.updateMany({
            data: { updatedAt: new Date() }
        });

        res.json({ success: true, message: 'Key deleted successfully' });
    } catch (error) {
        console.error('Error deleting AI Key:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Set Active Model for a Key
 * Sets the selected model to Priority 1 and others to Priority 5
 */
exports.updateKeyActiveModel = async (req, res) => {
    const { id } = req.params; // Key ID
    const { modelName } = req.body;
    const cleanModelName = trimString(modelName);

    if (!cleanModelName) {
        return res.status(400).json({ success: false, message: 'Model Name is required' });
    }

    try {
        const prisma = getPrisma();

        // Transaction to ensure atomicity
        await prisma.$transaction(async (tx) => {
            // 1. Demote all models for this key to Priority 5
            await tx.aiModelConfig.updateMany({
                where: { keyId: id },
                data: { priority: 5 }
            });

            // 2. Check if model exists
            const existingModel = await tx.aiModelConfig.findUnique({
                where: {
                    keyId_modelName: {
                        keyId: id,
                        modelName: cleanModelName
                    }
                }
            });

            if (existingModel) {
                // 3. Promote selected model to Priority 1 and Enable it
                await tx.aiModelConfig.update({
                    where: { id: existingModel.id },
                    data: { priority: 1, isEnabled: true }
                });
            } else {
                // 4. If not exists (rare, but possible if manually typed), create it
                await tx.aiModelConfig.create({
                    data: {
                        keyId: id,
                        modelName: cleanModelName,
                        priority: 1,
                        isEnabled: true
                    }
                });
            }
        });

        // ✅ FIX: Invalidate ModelManager caches
        console.log(`🔄 [SUPER-ADMIN] Active model updated for key ${id}. Clearing ModelManager caches...`);
        aiRuntimeService.getModelManager().clearAllCaches();

        // ✅ FIX: Touch Global Config to trigger cache clearing in OTHER processes
        await prisma.globalAiConfig.updateMany({
            data: { updatedAt: new Date() }
        });

        res.json({ success: true, message: 'Active model updated successfully', modelName: cleanModelName });

    } catch (error) {
        console.error('Error updating Key Active Model:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Update Key Active Status
 */
exports.updateKeyActiveStatus = async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ success: false, message: 'isActive must be a boolean' });
    }

    try {
        const prisma = getPrisma();
        await prisma.aiKey.update({
            where: { id },
            data: { isActive }
        });
        if (!isActive) {
            await removePreferredAiKeyIds(prisma, [id]);
        }

        // ✅ DUAL-WRITE: Mirror status change to maxp-ai-service admin API.
        aiServiceKeyBridge.setKeyStatus(id, isActive);

        // ✅ FIX: Invalidate ModelManager caches
        console.log(`🔄 [SUPER-ADMIN] Key ${id} active status updated to ${isActive}. Clearing ModelManager caches...`);
        aiRuntimeService.getModelManager().clearAllCaches();

        // ✅ FIX: Touch Global Config to trigger cache clearing in OTHER processes
        await prisma.globalAiConfig.updateMany({
            data: { updatedAt: new Date() }
        });

        res.json({ success: true, message: 'Key status updated successfully' });
    } catch (error) {
        console.error('Error updating Key Active Status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Bulk Delete AI Keys
 */
exports.bulkDeleteAIKeys = async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'ids array is required' });
    }

    try {
        const prisma = getPrisma();
        const result = await prisma.aiKey.deleteMany({
            where: {
                id: {
                    in: ids
                }
            }
        });
        await removePreferredAiKeyIds(prisma, ids);

        // ✅ DUAL-WRITE: Mirror deletes to maxp-ai-service admin API.
        for (const id of ids) {
            aiServiceKeyBridge.deleteKey(id);
        }

        // ✅ FIX: Invalidate ModelManager caches
        console.log(`🔄 [SUPER-ADMIN] ${result.count} keys deleted. Clearing ModelManager caches...`);
        aiRuntimeService.getModelManager().clearAllCaches();

        // ✅ FIX: Touch Global Config to trigger cache clearing in OTHER processes
        await prisma.globalAiConfig.updateMany({
            data: { updatedAt: new Date() }
        });

        res.json({ success: true, message: `${result.count} key(s) deleted successfully`, count: result.count });
    } catch (error) {
        console.error('Error bulk deleting AI Keys:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Bulk Update AI Keys Active Status
 */
exports.bulkUpdateKeysActiveStatus = async (req, res) => {
    const { ids, isActive } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'ids array is required' });
    }

    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ success: false, message: 'isActive must be a boolean' });
    }

    try {
        const prisma = getPrisma();
        const result = await prisma.aiKey.updateMany({
            where: {
                id: {
                    in: ids
                }
            },
            data: { isActive }
        });
        if (!isActive) {
            await removePreferredAiKeyIds(prisma, ids);
        }

        // ✅ DUAL-WRITE: Mirror status changes to maxp-ai-service admin API.
        for (const id of ids) {
            aiServiceKeyBridge.setKeyStatus(id, isActive);
        }

        // ✅ FIX: Invalidate ModelManager caches
        console.log(`🔄 [SUPER-ADMIN] ${result.count} keys status updated to ${isActive}. Clearing ModelManager caches...`);
        aiRuntimeService.getModelManager().clearAllCaches();

        // ✅ FIX: Touch Global Config to trigger cache clearing in OTHER processes
        await prisma.globalAiConfig.updateMany({
            data: { updatedAt: new Date() }
        });

        res.json({ success: true, message: `${result.count} key(s) status updated successfully`, count: result.count });
    } catch (error) {
        console.error('Error bulk updating AI Keys status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Proxy to get models from Ollama
 */
exports.getOllamaModels = async (req, res) => {
    const { baseUrl } = req.query;

    if (!baseUrl) {
        return res.status(400).json({ success: false, message: 'Base URL is required' });
    }

    try {
        const axios = require('axios');

        // Smart URL handling
        let targetUrl = baseUrl.trim();
        // Remove trailing slash
        targetUrl = targetUrl.replace(/\/$/, '');

        // If user pasted full API URL, use it directly
        if (targetUrl.endsWith('/api/tags')) {
            // Already correct
        } else {
            // Append endpoint
            targetUrl = `${targetUrl}/api/tags`;
        }

        console.log(`📡 [PROXY] Fetching Ollama models from: ${targetUrl}`);
        const response = await axios.get(targetUrl, { timeout: 5000 });

        const models = response.data.models?.map(m => m.name) || [];
        res.json({ success: true, models });

    } catch (error) {
        console.error('❌ [PROXY] Failed to fetch Ollama models:', error.message);
        res.status(502).json({
            success: false,
            message: `Failed to connect to Ollama: ${error.message}`
        });
    }
};

/**
 * Proxy to get models from OpenRouter
 */
exports.getOpenRouterModels = async (req, res) => {
    const { baseUrl } = req.query;

    try {
        const axios = require('axios');

        let targetUrl = (baseUrl || 'https://openrouter.ai/api/v1').trim();
        targetUrl = targetUrl.replace(/\/+$/, '');

        if (!targetUrl.endsWith('/models')) {
            targetUrl = `${targetUrl}/models`;
        }

        console.log(`[PROXY] Fetching OpenRouter models from: ${targetUrl}`);
        const response = await axios.get(targetUrl, { timeout: 10000 });
        const modelIds = (response.data.data || [])
            .map(model => model.id)
            .filter(Boolean);

        const models = Array.from(new Set(['openrouter/auto', 'openrouter/free', ...modelIds]));

        res.json({ success: true, models });
    } catch (error) {
        console.error('Failed to fetch OpenRouter models:', error.message);
        res.status(502).json({
            success: false,
            message: `Failed to connect to OpenRouter: ${error.message}`
        });
    }
};

/**
 * AI Playground — send a prompt to any provider/model and see the result.
 * POST /super-admin/ai/playground/chat
 * Body: { provider, model?, prompt, systemPrompt?, temperature?, maxTokens? }
 */
exports.playgroundChat = async (req, res) => {
    const prisma = getPrisma();
    const startedAt = Date.now();

    try {
        let { provider, model, prompt, systemPrompt, temperature, maxTokens } = req.body;

        provider = normalizeProvider(provider);
        if (!provider || !isSupportedProvider(provider)) {
            return res.status(400).json({ success: false, message: `Unsupported provider: ${provider}` });
        }
        if (!prompt || !trimString(prompt)) {
            return res.status(400).json({ success: false, message: 'Prompt is required' });
        }
        prompt = trimString(prompt);

        const keys = await prisma.aiKey.findMany({
            where: { provider, isActive: true, companyId: null },
            include: { aiModelConfigs: true },
            orderBy: { createdAt: 'desc' },
        });

        if (keys.length === 0) {
            return res.status(404).json({ success: false, message: `No active keys found for provider: ${provider}` });
        }

        const key = keys[0];
        const resolvedModel = model || key.aiModelConfigs?.[0]?.modelName || DEFAULT_PROVIDER_MODELS[provider] || DEFAULT_PROVIDER_MODELS.GOOGLE;
        const rawTemp = Number(temperature);
        const temp = Number.isFinite(rawTemp) ? Math.max(0, Math.min(2, rawTemp)) : 0.7;
        const rawMaxTk = Number(maxTokens);
        const maxTk = Number.isFinite(rawMaxTk) ? Math.max(1, Math.min(128000, rawMaxTk)) : 1024;

        const messages = [];
        if (systemPrompt && trimString(systemPrompt)) {
            messages.push({ role: 'system', content: trimString(systemPrompt) });
        }
        messages.push({ role: 'user', content: prompt });

        const providerClient = AIProviderFactory.getProvider(provider, key.apiKey, key.baseUrl, key.id);
        const providerResult = await withTimeout(
            providerClient.generateResponse(messages, {
                model: resolvedModel,
                temperature: temp,
                max_tokens: maxTk,
                maxOutputTokens: maxTk,
            }),
            60000,
            `Playground request timed out after 60s`
        );

        const reply = trimString(extractProviderText(providerResult));
        const latencyMs = Date.now() - startedAt;
        const inputTokens = providerResult.usage?.prompt_tokens || providerResult.usageMetadata?.promptTokenCount || 0;
        const outputTokens = providerResult.usage?.completion_tokens || providerResult.usageMetadata?.candidatesTokenCount || 0;

        await aiProviderLogService.recordProviderEvent({
            provider,
            keyId: key.id,
            keyName: key.name,
            action: 'playground_chat',
            status: reply ? 'success' : 'failed',
            latencyMs,
            model: resolvedModel,
            message: reply ? 'Playground chat returned content' : 'Playground chat returned empty response',
            metadata: { source: 'super_admin_playground', inputLength: prompt.length, outputLength: reply.length },
        });

        res.set('X-Routed-Via', `${provider}/${resolvedModel}`);
        res.set('X-Fallback-Attempts', '0');
        res.json({
            success: true,
            data: {
                reply,
                provider,
                model: resolvedModel,
                latencyMs,
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
                keyName: key.name,
                temperature: temp,
                maxTokens: maxTk,
            }
        });
    } catch (error) {
        const latencyMs = Date.now() - startedAt;
        logAiAdminError('Error in AI Playground chat:', error);
        res.status(502).json({
            success: false,
            message: sanitizeAiAdminErrorMessage(error?.message || 'Playground request failed'),
            data: { status: 'failed', latencyMs }
        });
    }
};

/**
 * Get available embedding models
 */
exports.getEmbeddingModels = async (req, res) => {
    try {
        const models = SUPPORTED_EMBEDDING_MODELS.map(model => ({
            id: model,
            label: model,
            dimensions: GEMINI_EMBEDDING_DIMENSIONS[model]?.options || [768, 1536, 3072],
            defaultDimension: GEMINI_EMBEDDING_DIMENSIONS[model]?.default || 768,
            isMultimodal: model.includes('embedding-2'),
        }));

        res.json({ success: true, data: models });
    } catch (error) {
        console.error('Error fetching embedding models:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Test an embedding key with a sample text
 */
exports.testEmbeddingKey = async (req, res) => {
    const { keyId, text } = req.body;

    if (!keyId) {
        return res.status(400).json({ success: false, message: 'keyId is required' });
    }

    const startedAt = Date.now();
    try {
        const prisma = getPrisma();
        const key = await safeQuery(async () => {
            return await prisma.aiKey.findUnique({
                where: { id: keyId },
                select: { id: true, apiKey: true, provider: true, isActive: true, name: true }
            });
        });

        if (!key) {
            return res.status(404).json({ success: false, message: 'AI key not found' });
        }

        if (normalizeProvider(key.provider) !== 'GOOGLE') {
            return res.status(400).json({ success: false, message: 'Embedding test only supports Google provider keys' });
        }

        if (!key.isActive) {
            return res.status(400).json({ success: false, message: 'AI key is inactive' });
        }

        const sampleText = trimString(text) || 'Hello, this is a test embedding query.';
        const fetchFn = typeof fetch === 'function' ? fetch : require('node-fetch');

        // Test the product-search runtime policy, even when saved settings are stale.
        const model = DEFAULT_GEMINI_EMBEDDING_MODEL;
        const dimension = REQUIRED_EMBEDDING_DIMENSION;

        const url = `${EMBEDDING_API_BASE}/${model}:embedContent`;
        const response = await fetchFn(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': key.apiKey,
            },
            body: JSON.stringify({
                model: `models/${model}`,
                content: { parts: [{ text: sampleText }] },
                outputDimensionality: dimension,
            })
        });

        const latencyMs = Date.now() - startedAt;

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            return res.status(response.status).json({
                success: false,
                message: `Embedding API error: ${response.status}`,
                data: { latencyMs, error: errorText }
            });
        }

        const data = await response.json();
        const embedding = data?.embedding?.values;

        if (!embedding || !Array.isArray(embedding)) {
            return res.status(500).json({
                success: false,
                message: 'No embedding values returned',
                data: { latencyMs }
            });
        }

        res.json({
            success: true,
            data: {
                model,
                dimension: embedding.length,
                sampleValues: embedding.slice(0, 5),
                latencyMs,
                keyName: key.name,
            }
        });
    } catch (error) {
        const latencyMs = Date.now() - startedAt;
        logAiAdminError('Error testing embedding key:', error);
        res.status(500).json({
            success: false,
            message: sanitizeAiAdminErrorMessage(error?.message || 'Embedding test failed'),
            data: { latencyMs }
        });
    }
};

const EMBEDDING_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
