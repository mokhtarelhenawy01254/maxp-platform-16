const GoogleProvider = require('./GoogleProvider');
const DeepSeekProvider = require('./DeepSeekProvider');
const OllamaProvider = require('./OllamaProvider');
const GroqProvider = require('./GroqProvider');
const OpenRouterProvider = require('./OpenRouterProvider');
const NvidiaProvider = require('./NvidiaProvider');
const OpenAICompatProvider = require('./OpenAICompatProvider');
const { getSharedPrismaClient } = require('../../sharedDatabase');

class AIProviderFactory {
    constructor() {
        this.providers = new Map();
        this._rotationIndex = new Map();
    }

    /**
     * Get the next key index for round-robin rotation
     */
    _nextRotationIndex(providerType, total) {
        const current = this._rotationIndex.get(providerType) || 0;
        const next = (current + 1) % total;
        this._rotationIndex.set(providerType, next);
        return current;
    }

    /**
     * Get the active provider based on GlobalAIConfig
     */
    async getActiveProvider() {
        const prisma = getSharedPrismaClient();

        const globalConfig = await prisma.globalAiConfig.findFirst({
            where: { isActive: true }
        });

        const providerType = globalConfig?.defaultProvider || 'GOOGLE';

        const keys = await prisma.aiKey.findMany({
            where: {
                provider: providerType,
                isActive: true,
                companyId: null
            },
            include: {
                aiModelConfigs: true
            }
        });

        if (keys.length === 0) {
            console.warn(`No active system keys found for provider: ${providerType}. Falling back to GOOGLE.`);
            if (providerType !== 'GOOGLE') {
                const googleKeys = await prisma.aiKey.findMany({
                    where: { provider: 'GOOGLE', isActive: true, companyId: null }
                });
                if (googleKeys.length > 0) return this.getProvider('GOOGLE', googleKeys[0].apiKey, googleKeys[0].baseUrl, googleKeys[0].id);
            }
            throw new Error(`No available AI keys for provider: ${providerType}`);
        }

        const keyIndex = this._nextRotationIndex(providerType, keys.length);
        const key = keys[keyIndex];
        console.log(`🏭 [AI-FACTORY] Selected Key [${keyIndex + 1}/${keys.length}]: ${key.provider} (${key.name})`);
        console.log(`🏭 [AI-FACTORY] Base URL from DB: ${key.baseUrl}`);

        return this.getProvider(providerType, key.apiKey, key.baseUrl, key.id);
    }

    /**
     * Get or create a provider instance
     */
    getProvider(type, apiKey, baseUrl = null, id = 'default') {
        // ❌ Disable Caching: Config might change (e.g. BaseURL) and we need fresh instances
        // const cacheKey = `${type}_${id || apiKey}`;
        // if (this.providers.has(cacheKey)) {
        //     return this.providers.get(cacheKey);
        // }

        let provider;
        const keyConfig = { id, apiKey, baseUrl, provider: type };

        switch (type) {
            case 'GOOGLE':
                provider = new GoogleProvider(keyConfig);
                break;
            case 'DEEPSEEK':
                provider = new DeepSeekProvider(keyConfig);
                break;
            case 'HUGGINGFACE':
                const HuggingFaceProvider = require('./HuggingFaceProvider');
                provider = new HuggingFaceProvider(keyConfig);
                break;
            case 'OLLAMA':
                provider = new OllamaProvider(keyConfig);
                break;
            case 'GROQ':
                provider = new GroqProvider(keyConfig);
                break;
            case 'OPENROUTER':
                provider = new OpenRouterProvider(keyConfig);
                break;
            case 'NVIDIA':
                provider = new NvidiaProvider(keyConfig);
                break;
            case 'CEREBRAS':
                provider = new OpenAICompatProvider({ ...keyConfig, name: 'Cerebras', defaultBaseUrl: 'https://api.cerebras.ai/v1', defaultModel: 'qwen-3-235b-a22b-instruct-2507' });
                break;
            case 'GITHUB':
                provider = new OpenAICompatProvider({ ...keyConfig, name: 'GitHub Models', defaultBaseUrl: 'https://models.github.ai/inference', defaultModel: 'gpt-4o' });
                break;
            case 'SAMBANOVA':
                provider = new OpenAICompatProvider({ ...keyConfig, name: 'SambaNova', defaultBaseUrl: 'https://api.sambanova.ai/v1', defaultModel: 'DeepSeek-V3.1' });
                break;
            case 'MISTRAL':
                provider = new OpenAICompatProvider({ ...keyConfig, name: 'Mistral', defaultBaseUrl: 'https://api.mistral.ai/v1', defaultModel: 'mistral-large-latest' });
                break;
            default:
                throw new Error(`Unsupported AI provider type: ${type}`);
        }

        // this.providers.set(cacheKey, provider);
        return provider;
    }
}

// Singleton instance
const factory = new AIProviderFactory();
module.exports = factory;
