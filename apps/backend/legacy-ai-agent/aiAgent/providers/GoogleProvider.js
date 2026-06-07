const { GoogleGenerativeAI } = require('@google/generative-ai');
const BaseProvider = require('./BaseProvider');
const { normalizeGeminiTextModel } = require('../geminiModelPolicy');

const DEFAULT_TIMEOUT_MS = 30000;

function normalizeSchemaType(type) {
    if (!type || typeof type !== 'string') return type;
    const normalized = type.toUpperCase();
    if (normalized === 'INTEGER') return 'NUMBER';
    return normalized;
}

/**
 * Resolve an array-typed JSON-Schema `type` (e.g. ['number','null']) into
 * a single Gemini-compatible type string, plus a `nullable` flag.
 * Returns `{ type, nullable }`.
 */
function resolveArrayType(typeArray) {
    const filtered = typeArray.filter(t => typeof t === 'string' && t.toLowerCase() !== 'null');
    const hasNull = typeArray.some(t => typeof t === 'string' && t.toLowerCase() === 'null');
    const primary = filtered.length > 0 ? filtered[0] : 'string';
    return { type: normalizeSchemaType(primary), nullable: hasNull };
}

function normalizeGeminiSchema(schema) {
    if (!schema || typeof schema !== 'object') return schema;
    if (Array.isArray(schema)) return schema.map(normalizeGeminiSchema);

    const next = {};
    for (const [key, value] of Object.entries(schema)) {
        if (key === 'type') {
            // Handle JSON-Schema array types e.g. ['number', 'null'] → type:'NUMBER', nullable:true
            if (Array.isArray(value)) {
                const resolved = resolveArrayType(value);
                next.type = resolved.type;
                if (resolved.nullable) next.nullable = true;
            } else {
                next[key] = normalizeSchemaType(value);
            }
        } else if (key === 'properties' && value && typeof value === 'object') {
            next[key] = Object.fromEntries(
                Object.entries(value).map(([propertyName, propertySchema]) => [
                    propertyName,
                    normalizeGeminiSchema(propertySchema),
                ]),
            );
        } else if (key === 'items') {
            next[key] = normalizeGeminiSchema(value);
        } else if (!['additionalProperties', '$schema'].includes(key)) {
            next[key] = value;
        }
    }
    return next;
}

function normalizeContentPart(part) {
    if (!part) return null;
    if (typeof part === 'string') return part;
    if (part.type === 'text') return String(part.text || '');
    if (part.text) return String(part.text);
    if (part.functionResponse) {
        return `Tool result: ${JSON.stringify(part.functionResponse)}`;
    }
    if (part.functionCall) {
        return `Tool call: ${JSON.stringify(part.functionCall)}`;
    }
    return JSON.stringify(part);
}

function normalizePromptToContents(prompt) {
    if (Array.isArray(prompt)) {
        const text = prompt
            .map((message) => {
                const content = Array.isArray(message.content)
                    ? message.content.map(normalizeContentPart).filter(Boolean).join('\n')
                    : normalizeContentPart(message.content);
                return content || '';
            })
            .filter(Boolean)
            .join('\n\n');

        return [{ role: 'user', parts: [{ text }] }];
    }

    if (typeof prompt === 'string') {
        return [{ role: 'user', parts: [{ text: prompt }] }];
    }

    return [{ role: 'user', parts: [{ text: JSON.stringify(prompt || {}) }] }];
}

function normalizeToolDefinition(tool) {
    const source = tool?.function || tool;
    if (!source?.name) return null;

    return {
        name: source.name,
        description: source.description || '',
        parameters: normalizeGeminiSchema(source.parameters || {
            type: 'object',
            properties: {},
        }),
    };
}

function normalizeTools(tools) {
    if (!Array.isArray(tools) || tools.length === 0) return undefined;

    const functionDeclarations = tools
        .map(normalizeToolDefinition)
        .filter(Boolean);

    return functionDeclarations.length > 0
        ? [{ functionDeclarations }]
        : undefined;
}

function withTimeout(promise, timeoutMs, providerName) {
    const safeTimeoutMs = Number(timeoutMs) || DEFAULT_TIMEOUT_MS;
    let timeoutId;

    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            const error = new Error(`${providerName} Provider Error: Request timed out after ${safeTimeoutMs}ms`);
            error.provider = providerName.toUpperCase();
            error.code = 'TIMEOUT';
            reject(error);
        }, safeTimeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

function extractToolCalls(response) {
    const parts = response?.candidates?.[0]?.content?.parts || [];

    return parts
        .filter((part) => part?.functionCall)
        .map((part, index) => ({
            id: part.functionCall.name || `google-call-${index + 1}`,
            type: 'function',
            function: {
                name: part.functionCall.name,
                arguments: JSON.stringify(part.functionCall.args || {}),
            },
            provider: 'GOOGLE',
        }));
}

class GoogleProvider extends BaseProvider {
    constructor(config) {
        super(config);
        this.name = 'Google';
        this.timeoutMs = Number(process.env.GOOGLE_PROVIDER_TIMEOUT_MS || config?.timeoutMs || DEFAULT_TIMEOUT_MS);
        this.genAI = new GoogleGenerativeAI(this.apiKey);
    }

    /**
     * @override
     */
    async generateResponse(prompt, options = {}) {
        const {
            model = 'gemini-2.5-flash',
            temperature = 0.7,
            max_tokens,
            maxOutputTokens = 2048,
            responseMimeType,
            responseSchema,
            topK,
            topP,
            tools,
            toolConfig,
            timeoutMs,
            timeout_ms,
        } = options;

        const normalizedModel = normalizeGeminiTextModel(model);
        const googleTools = normalizeTools(tools);
        const generativeModel = this.genAI.getGenerativeModel({ model: normalizedModel });

        const generationConfig = {
            temperature,
            maxOutputTokens: max_tokens || maxOutputTokens,
        };

        if (topK !== undefined && topK !== null) generationConfig.topK = topK;
        if (topP !== undefined && topP !== null) generationConfig.topP = topP;
        if (responseMimeType) generationConfig.responseMimeType = responseMimeType;
        if (responseSchema) generationConfig.responseSchema = normalizeGeminiSchema(responseSchema);

        const requestBody = {
            contents: normalizePromptToContents(prompt),
            generationConfig,
        };

        if (googleTools) requestBody.tools = googleTools;
        if (toolConfig) requestBody.toolConfig = toolConfig;

        try {
            const result = await withTimeout(
                generativeModel.generateContent(requestBody),
                timeoutMs || timeout_ms || this.timeoutMs,
                'Google',
            );

            const response = await result.response;
            const toolCalls = extractToolCalls(response);
            let text = '';
            try {
                text = typeof response.text === 'function' ? response.text() : '';
            } catch {
                text = '';
            }

            return {
                success: true,
                content: text,
                text,
                toolCalls,
                candidates: response.candidates,
                usageMetadata: response.usageMetadata,
                promptFeedback: response.promptFeedback,
                model: normalizedModel,
                provider: 'GOOGLE',
            };
        } catch (error) {
            if (error.provider === 'GOOGLE') throw error;

            const errorObj = new Error(`Google Provider Error: ${error.message}`);
            errorObj.provider = 'GOOGLE';
            errorObj.status = error.status;
            errorObj.code = error.code;
            errorObj.details = error.details;
            throw errorObj;
        }
    }

    /**
     * Stream content generation from Google Gemini.
     * @param {Object} request - { model, contents, generationConfig, systemInstruction }
     * @returns {Promise<{stream: AsyncGenerator, response: Promise<Object>}>}
     */
    async generateContentStream(request) {
        const { model, contents, generationConfig, systemInstruction, tools, toolConfig } = request;
        const normalizedModel = normalizeGeminiTextModel(model);
        const generativeModel = this.genAI.getGenerativeModel({ model: normalizedModel });

        const requestBody = { contents, generationConfig };
        if (systemInstruction) {
            requestBody.systemInstruction = systemInstruction;
        }
        const googleTools = normalizeTools(tools);
        if (googleTools) requestBody.tools = googleTools;
        if (toolConfig) requestBody.toolConfig = toolConfig;

        const result = await withTimeout(
            generativeModel.generateContentStream(requestBody),
            this.timeoutMs,
            'Google',
        );

        const self = this;
        return {
            stream: (async function* () {
                for await (const chunk of result.stream) {
                    let text = '';
                    try {
                        text = typeof chunk.text === 'function' ? chunk.text() : '';
                    } catch {
                        text = '';
                    }
                    yield { text };
                }
            })(),
            response: result.response,
        };
    }

    /**
     * @override
     */
    async testConnection() {
        try {
            const result = await this.generateResponse('ping', { maxOutputTokens: 1 });
            return result.success;
        } catch (error) {
            return false;
        }
    }
}

module.exports = GoogleProvider;
