const axios = require('axios');
const BaseProvider = require('./BaseProvider');

class OpenAICompatProvider extends BaseProvider {
    constructor(config = {}) {
        super(config);
        this.name = config.name || 'OpenAI Compatible';
        this.defaultBaseUrl = config.defaultBaseUrl || 'https://api.openai.com/v1';
        this.baseUrl = (config.baseUrl || this.defaultBaseUrl).replace(/\/+$/, '');
        this.defaultModel = config.defaultModel || 'gpt-3.5-turbo';
        this.timeoutMs = Number(config.timeoutMs || 30000);
        this.extraHeaders = config.extraHeaders || {};
    }

    async generateResponse(prompt, options = {}) {
        const {
            model = this.defaultModel,
            temperature = 0.7,
            max_tokens,
            maxOutputTokens,
            top_p,
            stream = false,
            tools,
            tool_choice
        } = options;

        const url = `${this.baseUrl}/chat/completions`;
        const messages = this._normalizeMessages(prompt);
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
            const response = await axios.post(url, requestBody, {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    ...this.extraHeaders
                },
                timeout: this.timeoutMs,
                transitional: { clarifyTimeoutError: true }
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
                provider: this.name.toUpperCase().replace(/\s+/g, '_'),
                cost: { value: null, formatted: 'N/A' }
            };
        } catch (error) {
            const status = error.response?.status;
            const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
            const remoteMessage = isTimeout
                ? `Request timed out after ${this.timeoutMs}ms`
                : error.response?.data?.error?.message || error.response?.data?.message || error.message;
            const errorObj = new Error(`${this.name} Provider Error: ${remoteMessage}`);
            errorObj.provider = this.name.toUpperCase().replace(/\s+/g, '_');
            errorObj.status = status;
            errorObj.code = isTimeout ? 'TIMEOUT' : error.code;
            errorObj.details = error.response?.data;

            throw errorObj;
        }
    }

    async testConnection() {
        try {
            const result = await this.generateResponse('Reply with OK.', {
                model: this.defaultModel,
                max_tokens: 8,
                temperature: 0
            });
            return Boolean(result.success);
        } catch (error) {
            console.error(`${this.name} connection test failed:`, error.message);
            return false;
        }
    }

    getAvailableModels() {
        return [this.defaultModel];
    }

    _normalizeMessages(prompt) {
        if (Array.isArray(prompt)) {
            return prompt.map((message) => {
                const normalized = {
                    role: message.role || 'user',
                    content: this._normalizeMessageContent(message.content)
                };
                if (message.name) normalized.name = message.name;
                if (message.tool_call_id) normalized.tool_call_id = message.tool_call_id;
                if (Array.isArray(message.tool_calls)) normalized.tool_calls = message.tool_calls;
                return normalized;
            });
        }

        if (typeof prompt === 'string') {
            return [{ role: 'user', content: prompt }];
        }

        return [{ role: 'user', content: JSON.stringify(prompt) }];
    }

    _normalizeMessageContent(content) {
        if (typeof content === 'string') {
            return content;
        }

        if (Array.isArray(content)) {
            const textParts = content
                .map((part) => {
                    if (!part) return '';
                    if (typeof part === 'string') return part;
                    if (part.type === 'text') return String(part.text || '');
                    return '';
                })
                .filter(Boolean);
            return textParts.join('\n');
        }

        if (content && typeof content === 'object') {
            return content.type === 'text' ? String(content.text || '') : JSON.stringify(content);
        }

        return '';
    }

    _safeParseJson(value, fallback = null) {
        if (!value || typeof value !== 'string') return fallback;
        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    }
}

module.exports = OpenAICompatProvider;
