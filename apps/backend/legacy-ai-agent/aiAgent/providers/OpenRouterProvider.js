const axios = require('axios');
const BaseProvider = require('./BaseProvider');

class OpenRouterProvider extends BaseProvider {
    constructor(config = {}) {
        super(config);
        this.name = 'OpenRouter';
        this.defaultBaseUrl = 'https://openrouter.ai/api/v1';
        this.baseUrl = (config.baseUrl || this.defaultBaseUrl).replace(/\/+$/, '');
        this.timeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS || config.timeoutMs || 30000);
    }

    /**
     * Generate a response using OpenRouter's OpenAI-compatible API.
     */
    async generateResponse(prompt, options = {}) {
        const {
            model = 'openrouter/auto',
            temperature = 0.7,
            max_tokens,
            maxOutputTokens,
            top_p,
            timeoutMs,
            timeout_ms,
            stream = false,
            tools,
            tool_choice
        } = options;

        const url = `${this.baseUrl}/chat/completions`;
        const requestTimeoutMs = Number(timeoutMs || timeout_ms || this.timeoutMs) || this.timeoutMs;
        const messages = this._normalizeMessages(prompt, options);
        const requestBody = {
            model,
            messages,
            temperature,
            max_tokens: max_tokens || maxOutputTokens || 1024,
            stream
        };

        if (top_p !== undefined && top_p !== null) {
            requestBody.top_p = top_p;
        }
        if (Array.isArray(tools) && tools.length > 0) {
            requestBody.tools = tools;
        }
        if (tool_choice !== undefined && tool_choice !== null) {
            requestBody.tool_choice = tool_choice;
        }

        try {
            console.log('[OPENROUTER] Sending request:', {
                url,
                model,
                messageCount: messages.length,
                hasImages: this._hasImageContent(messages)
            });

            const response = await axios.post(url, requestBody, {
                headers: this._buildHeaders(),
                timeout: requestTimeoutMs,
                transitional: {
                    clarifyTimeoutError: true
                }
            });

            const choice = response.data.choices?.[0] || {};
            const content = choice.message?.content || '';
            const toolCalls = Array.isArray(choice.message?.tool_calls)
                ? choice.message.tool_calls
                : [];
            const inputTokens = response.data.usage?.prompt_tokens || 0;
            const outputTokens = response.data.usage?.completion_tokens || 0;

            return {
                text: () => content,
                usageMetadata: {
                    totalTokenCount: response.data.usage?.total_tokens || 0,
                    promptTokenCount: inputTokens,
                    candidatesTokenCount: outputTokens
                },
                candidates: [{
                    content: {
                        parts: [
                            ...(content ? [{ text: content }] : []),
                            ...toolCalls.map((toolCall) => ({
                                functionCall: {
                                    name: toolCall.function?.name,
                                    args: this._safeParseJson(toolCall.function?.arguments, {})
                                }
                            }))
                        ]
                    },
                    finishReason: choice.finish_reason === 'stop' ? 'STOP' : 'OTHER'
                }],
                success: true,
                content,
                toolCalls,
                usage: response.data.usage,
                model: response.data.model || model,
                provider: 'OPENROUTER',
                cost: this._extractCost(response.data)
            };
        } catch (error) {
            const status = error.response?.status;
            const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
            const remoteMessage = isTimeout
                ? `Request timed out after ${requestTimeoutMs}ms`
                : error.response?.data?.error?.message || error.response?.data?.message || error.message;
            const errorObj = new Error(`OpenRouter Provider Error: ${remoteMessage}`);
            errorObj.provider = 'OPENROUTER';
            errorObj.status = status;
            errorObj.code = isTimeout ? 'TIMEOUT' : error.code;
            errorObj.details = error.response?.data;

            console.error('[OPENROUTER] Request failed:', {
                status,
                code: errorObj.code,
                message: remoteMessage,
                model
            });

            throw errorObj;
        }
    }

    async testConnection() {
        try {
            const result = await this.generateResponse('Reply with OK.', {
                model: 'openrouter/auto',
                max_tokens: 8,
                temperature: 0
            });
            return Boolean(result.success);
        } catch (error) {
            console.error('OpenRouter connection test failed:', error.message);
            return false;
        }
    }

    async getAvailableModels() {
        try {
            const response = await axios.get(`${this.baseUrl}/models`, {
                headers: this._buildHeaders()
            });

            return (response.data.data || []).map((model) => model.id).filter(Boolean);
        } catch (error) {
            console.warn('Failed to fetch OpenRouter models:', error.message);
            return [];
        }
    }

    _normalizeMessages(prompt, options = {}) {
        const imageUrls = this._normalizeImageUrls(options.imageUrls || options.images);

        if (Array.isArray(prompt)) {
            const messages = prompt.map((message) => {
                const normalized = {
                    role: message.role || 'user',
                    content: this._normalizeMessageContent(message.content)
                };
                if (message.name) normalized.name = message.name;
                if (message.tool_call_id) normalized.tool_call_id = message.tool_call_id;
                if (Array.isArray(message.tool_calls)) normalized.tool_calls = message.tool_calls;
                return normalized;
            });

            if (imageUrls.length > 0) {
                const userIndex = messages.findIndex((message) => message.role === 'user');
                const targetIndex = userIndex >= 0 ? userIndex : messages.length - 1;
                messages[targetIndex].content = this._appendImagesToContent(messages[targetIndex].content, imageUrls);
            }

            return messages;
        }

        if (typeof prompt === 'string') {
            if (imageUrls.length > 0) {
                return [{
                    role: 'user',
                    content: this._appendImagesToContent(prompt, imageUrls)
                }];
            }

            return [{ role: 'user', content: prompt }];
        }

        return [{
            role: 'user',
            content: imageUrls.length > 0
                ? this._appendImagesToContent(JSON.stringify(prompt), imageUrls)
                : JSON.stringify(prompt)
        }];
    }

    _normalizeMessageContent(content) {
        if (typeof content === 'string') {
            return content;
        }

        if (Array.isArray(content)) {
            return content.map((part) => this._normalizeContentPart(part)).filter(Boolean);
        }

        if (content && typeof content === 'object') {
            if (content.type) {
                return [this._normalizeContentPart(content)].filter(Boolean);
            }

            return JSON.stringify(content);
        }

        return '';
    }

    _normalizeContentPart(part) {
        if (!part) return null;

        if (typeof part === 'string') {
            return { type: 'text', text: part };
        }

        if (part.type === 'text') {
            return { type: 'text', text: String(part.text || '') };
        }

        if (part.type === 'image_url') {
            const url = typeof part.image_url === 'string' ? part.image_url : part.image_url?.url;
            return url ? { type: 'image_url', image_url: { url } } : null;
        }

        if (part.imageUrl || part.image_url || part.url) {
            const url = part.imageUrl || part.image_url || part.url;
            return url ? { type: 'image_url', image_url: { url } } : null;
        }

        if (['file', 'input_audio', 'video_url'].includes(part.type)) {
            return part;
        }

        return { type: 'text', text: JSON.stringify(part) };
    }

    _appendImagesToContent(content, imageUrls) {
        const normalized = this._normalizeMessageContent(content);
        const parts = Array.isArray(normalized)
            ? normalized
            : [{ type: 'text', text: String(normalized || '') }];

        const imageParts = imageUrls.map((url) => ({
            type: 'image_url',
            image_url: { url }
        }));

        return [...parts, ...imageParts];
    }

    _normalizeImageUrls(images) {
        if (!images) return [];
        const list = Array.isArray(images) ? images : [images];

        return list
            .map((image) => {
                if (!image) return null;
                if (typeof image === 'string') return image;
                return image.url || image.imageUrl || image.image_url || image.dataUrl || null;
            })
            .filter(Boolean);
    }

    _hasImageContent(messages) {
        return messages.some((message) => Array.isArray(message.content)
            && message.content.some((part) => part?.type === 'image_url'));
    }

    _safeParseJson(value, fallback = null) {
        if (!value || typeof value !== 'string') return fallback;
        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    }

    _buildHeaders() {
        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };

        const referer = process.env.OPENROUTER_SITE_URL || process.env.APP_URL || 'http://localhost:3000';
        const title = process.env.OPENROUTER_APP_NAME || process.env.APP_NAME || 'MaxP';

        if (referer) headers['HTTP-Referer'] = referer;
        if (title) headers['X-Title'] = title;

        return headers;
    }

    _extractCost(data) {
        const cost = data?.usage?.cost;
        if (typeof cost === 'number') {
            return {
                value: cost,
                formatted: `$${cost.toFixed(7)}`
            };
        }

        return {
            value: null,
            formatted: 'N/A'
        };
    }
}

module.exports = OpenRouterProvider;
