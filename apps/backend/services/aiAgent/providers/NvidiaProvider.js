const axios = require('axios');
const BaseProvider = require('./BaseProvider');

class NvidiaProvider extends BaseProvider {
    constructor(config = {}) {
        super(config);
        this.name = 'NVIDIA NIM';
        this.defaultBaseUrl = 'https://integrate.api.nvidia.com/v1';
        this.baseUrl = (config.baseUrl || this.defaultBaseUrl).replace(/\/+$/, '');
        this.timeoutMs = Number(process.env.NVIDIA_TIMEOUT_MS || config.timeoutMs || 60000);
    }

    /**
     * Generate a response using NVIDIA NIM's OpenAI-compatible chat completions API.
     */
    async generateResponse(prompt, options = {}) {
        const {
            model = 'openai/gpt-oss-120b',
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
            console.log('[NVIDIA] Sending request:', {
                url,
                model,
                messageCount: messages.length
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
                provider: 'NVIDIA',
                cost: {
                    value: null,
                    formatted: 'N/A'
                }
            };
        } catch (error) {
            const status = error.response?.status;
            const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
            const remoteMessage = isTimeout
                ? `Request timed out after ${requestTimeoutMs}ms`
                : error.response?.data?.error?.message || error.response?.data?.message || error.message;
            const errorObj = new Error(`NVIDIA Provider Error: ${this._redactSecrets(remoteMessage)}`);
            errorObj.provider = 'NVIDIA';
            errorObj.status = status;
            errorObj.code = isTimeout ? 'TIMEOUT' : error.code;
            errorObj.details = error.response?.data;

            console.error('[NVIDIA] Request failed:', {
                status,
                code: errorObj.code,
                message: this._redactSecrets(remoteMessage),
                model
            });

            throw errorObj;
        }
    }

    async testConnection() {
        try {
            const result = await this.generateResponse('Reply with OK.', {
                model: 'openai/gpt-oss-120b',
                max_tokens: 8,
                temperature: 0
            });
            return Boolean(result.success);
        } catch (error) {
            console.error('NVIDIA connection test failed:', this._redactSecrets(error.message));
            return false;
        }
    }

    getAvailableModels() {
        return ['openai/gpt-oss-120b'];
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

    _buildHeaders() {
        return {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };
    }

    _redactSecrets(message = '') {
        return String(message)
            .replace(/nvapi-[A-Za-z0-9_-]+/g, 'nvapi-***REDACTED***')
            .replace(/(Authorization["']?\s*:\s*["']?Bearer\s+)[^"',\s}]+/gi, '$1***REDACTED***');
    }
}

module.exports = NvidiaProvider;
