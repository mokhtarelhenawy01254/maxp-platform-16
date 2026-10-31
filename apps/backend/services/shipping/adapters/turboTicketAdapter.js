const crypto = require('crypto');
const TurboService = require('../../turboService');

function hashMessage(body, sentAt) {
  return crypto.createHash('sha256').update(`${body || ''}|${sentAt || ''}`).digest('hex');
}

class TurboTicketAdapter {
  constructor(turboService = null) {
    this._service = turboService;
  }

  _getService(companyId, apiKey = null) {
    if (this._service) return this._service;
    return new TurboService(apiKey, companyId);
  }

  async listTickets({ companyId, page = 1, perPage = 10, options = {}, apiKey = null } = {}) {
    const service = this._getService(companyId, apiKey);
    return service.getTickets(page, perPage, options);
  }

  async getTicket({ companyId, ticketId, apiKey = null } = {}) {
    const service = this._getService(companyId, apiKey);
    return service.getTicket(ticketId);
  }

  async getMessages({ companyId, ticketId, apiKey = null } = {}) {
    const service = this._getService(companyId, apiKey);
    const result = await service.getTicketLog(ticketId);

    if (!result || !result.success) {
      return { success: false, messages: [], error: result?.error || 'Failed to fetch messages' };
    }

    const rawLogs = Array.isArray(result.logs) ? result.logs : [];
    const messages = rawLogs.map((log) => {
      const isClient = log.is_client_message === 1 || log.is_client === true || log.sender_type === 'client';
      const body = String(log.content || log.message || log.notes || '').trim();
      const sentAtStr = log.created_at || log.createdAt || null;
      const sentAt = sentAtStr ? new Date(sentAtStr) : new Date();
      const externalId = log.id ? String(log.id) : hashMessage(body, sentAt.toISOString());
      const authorName = log.user_name || log.author || (isClient ? 'المتجر' : 'شركة الشحن (Turbo)');

      return {
        externalId,
        body,
        direction: isClient ? 'OUTBOUND' : 'INBOUND',
        authorName,
        sentAt,
      };
    });

    return {
      success: true,
      messages,
      ticket: result.ticket,
    };
  }

  async reply({ companyId, ticketId, message, apiKey = null } = {}) {
    const service = this._getService(companyId, apiKey);
    return service.replyToTicket(ticketId, message);
  }

  async create({ companyId, content, categoryId = 1, code = null, priority = 'medium', relatedTo = 'others', apiKey = null } = {}) {
    const service = this._getService(companyId, apiKey);
    return service.addTicket(content, categoryId, code, [], priority, relatedTo);
  }
}

module.exports = new TurboTicketAdapter();
