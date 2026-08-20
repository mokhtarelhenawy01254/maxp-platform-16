const axios = require('axios');
const FormData = require('form-data');
const { handleError } = require('../../utils/turbo/errorHandler');

class TicketService {
  constructor(apiClient) {
    this._client = apiClient;
  }

  async addTicket(content, categoryId, code = null, media = [], priority = 'low', relatedTo = 'others') {
    try {
      const apiKey = await this._client.getApiKey();
      const headers = await this._client.getHeaders();
      const mainClientCode = await this._client.getMainClientCode();
      const response = await axios.post(`${this._client.baseUrl}/tickets/create`, { authentication_key: apiKey, main_client_code: mainClientCode || 37321, category_id: categoryId, content, media: media || [], priority: priority || 'low', related_to: relatedTo || 'others', code: code || null }, { headers, timeout: this._client.timeout });
      const result = response.data;
      if (result.success === 0 || result.success === false) throw new Error(`Turbo API error: ${result.error_msg || result.message || 'Unknown error'}`);
      return { success: true, ticketId: result.ticket_id || result.id || result.code, message: result.message || '╪¬┘à ╪Ñ╪╢╪º┘ü╪⌐ ╪º┘ä╪¬╪░┘â╪▒╪⌐ ╪¿┘å╪¼╪º╪¡', data: result };
    } catch (error) {
      handleError(error, 'Create Ticket');
      return { success: false, error: error.message, message: '┘ü╪┤┘ä ┘ü┘è ╪Ñ╪╢╪º┘ü╪⌐ ╪º┘ä╪¬╪░┘â╪▒╪⌐' };
    }
  }

  async getInquiriesTypes() {
    try {
      const apiKey = await this._client.getApiKey();
      const headers = await this._client.getHeaders();
      const mainClientCode = await this._client.getMainClientCode();
      const response = await axios.get(`${this._client.baseUrl}/tickets/categories?authentication_key=${encodeURIComponent(apiKey)}&main_client_code=${mainClientCode || 37321}`, { headers, timeout: this._client.timeout });
      const result = response.data;
      if (result.success === 0 || result.success === false) throw new Error(`Turbo API error: ${result.error_msg || result.message || 'Unknown error'}`);
      return { success: true, types: result.data || result.categories || [], message: result.message || '╪¬┘à ╪¼┘ä╪¿ ┘ü╪ª╪º╪¬ ╪º┘ä╪¬╪░╪º┘â╪▒ ╪¿┘å╪¼╪º╪¡', data: result };
    } catch (error) {
      handleError(error, 'Get Ticket Categories');
      return { success: false, error: error.message, message: '┘ü╪┤┘ä ┘ü┘è ╪¼┘ä╪¿ ┘ü╪ª╪º╪¬ ╪º┘ä╪¬╪░╪º┘â╪▒', types: [] };
    }
  }

  async getTickets(page = 1, perPage = 10) {
    try {
      const apiKey = await this._client.getApiKey();
      const headers = await this._client.getHeaders();
      const mainClientCode = await this._client.getMainClientCode();
      const response = await axios.get(`${this._client.baseUrl}/tickets?authentication_key=${encodeURIComponent(apiKey)}&main_client_code=${mainClientCode || 37321}&per_page=${perPage}&page=${page}`, { headers, timeout: this._client.timeout });
      const result = response.data;
      const isSuccess = result.success === 1 || result.success === true;
      if (!isSuccess && result.success !== undefined) throw new Error(`Turbo API error: ${result.error_msg || result.message || 'Unknown error'}`);
      const tickets = result.feed?.data || result.tickets || result.data || [];
      const pagination = result.feed || result.pagination || { current_page: page, per_page: perPage, total: tickets.length, last_page: Math.ceil(tickets.length / perPage) };
      return { success: true, tickets, pagination: { page: pagination.current_page || page, perPage: pagination.per_page || perPage, total: pagination.total || tickets.length, lastPage: pagination.last_page || Math.ceil((pagination.total || tickets.length) / perPage) }, message: result.message || '╪¬┘à ╪¼┘ä╪¿ ╪º┘ä╪¬╪░╪º┘â╪▒ ╪¿┘å╪¼╪º╪¡', data: result };
    } catch (error) {
      if (error.response?.status === 404) return { success: true, tickets: [], pagination: { page, perPage, total: 0, lastPage: 0 }, message: '┘ä╪º ╪¬┘ê╪¼╪» ╪¬╪░╪º┘â╪▒ ┘à╪¬╪º╪¡╪⌐', data: null };
      handleError(error, 'Get Tickets');
      return { success: false, error: error.message, message: '┘ü╪┤┘ä ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä╪¬╪░╪º┘â╪▒', tickets: [], pagination: { page, perPage: 10, total: 0 } };
    }
  }

  async getTicket(ticketId) {
    try {
      const apiKey = await this._client.getApiKey();
      const headers = await this._client.getHeaders();
      const mainClientCode = await this._client.getMainClientCode();
      const response = await axios.get(`${this._client.baseUrl}/tickets/${ticketId}/show?authentication_key=${encodeURIComponent(apiKey)}&main_client_code=${mainClientCode || 37321}`, { headers, timeout: this._client.timeout, validateStatus: status => status < 500 });
      const result = response.data;
      const isSuccess = result.success === 1 || result.success === true;
      if (!isSuccess && result.success !== undefined) return { success: false, error: result.error_msg || result.message || 'Unknown error', message: result.error_msg === '╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' ? '┘ä┘à ┘è╪¬┘à ╪º┘ä╪╣╪½┘ê╪▒ ╪╣┘ä┘ë ┘ç╪░┘ç ╪º┘ä╪¬╪░┘â╪▒╪⌐ ┘ü┘è ┘å╪╕╪º┘à Turbo' : (result.error_msg || result.message), status: 404, ticket: null };
      const ticket = result.feed || result.ticket || result.data || null;
      if (ticket?.replies && Array.isArray(ticket.replies)) ticket.messages = ticket.replies;
      return { success: true, ticket, message: result.message || '╪¬┘à ╪¼┘ä╪¿ ╪º┘ä╪¬╪░┘â╪▒╪⌐ ╪¿┘å╪¼╪º╪¡', data: result };
    } catch (error) {
      if (error.response?.status === 404) return { success: false, error: '╪º┘ä╪¬╪░┘â╪▒╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐', message: '╪╣╪░╪▒╪º┘ï╪î ┘ä┘à ┘è╪¬┘à ╪º┘ä╪╣╪½┘ê╪▒ ╪╣┘ä┘ë ╪º┘ä╪¬╪░┘â╪▒╪⌐ ╪º┘ä┘à╪╖┘ä┘ê╪¿╪⌐ ┘ü┘è ┘å╪╕╪º┘à Turbo', status: 404, ticket: null };
      handleError(error, 'Get Ticket');
      return { success: false, error: error.message, message: '┘ü╪┤┘ä ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä╪¬╪░┘â╪▒╪⌐', ticket: null };
    }
  }

  async getTicketLog(ticketId) {
    try {
      const apiKey = await this._client.getApiKey();
      const headers = await this._client.getHeaders();
      const mainClientCode = await this._client.getMainClientCode();
      const response = await axios.get(`${this._client.baseUrl}/tickets/${ticketId}/log?authentication_key=${encodeURIComponent(apiKey)}&main_client_code=${mainClientCode || 37321}`, { headers, timeout: this._client.timeout, validateStatus: status => status < 500 });
      const result = response.data;
      const isSuccess = result.success === 1 || result.success === true;
      if (!isSuccess && result.success !== undefined) {
        if (result.error_msg === '╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' || response.status === 404) return { success: true, ticket: null, logs: [], message: '┘ä╪º ┘è┘ê╪¼╪» ╪│╪¼┘ä ┘à╪¬╪º╪¡ ┘ä┘ç╪░┘ç ╪º┘ä╪¬╪░┘â╪▒╪⌐', data: result };
        throw new Error(`Turbo API error: ${result.error_msg || result.message || 'Unknown error'}`);
      }
      const logs = Array.isArray(result.feed) ? result.feed : (result.logs || result.data || []);
      return { success: true, ticket: result.feed || result.data || null, logs, message: result.message || '╪¬┘à ╪¼┘ä╪¿ ╪│╪¼┘ä ╪º┘ä╪¬╪░┘â╪▒╪⌐ ╪¿┘å╪¼╪º╪¡', data: result };
    } catch (error) {
      if (error.response?.status === 404) return { success: true, ticket: null, logs: [], message: '┘ä╪º ┘è┘ê╪¼╪» ╪│╪¼┘ä ┘à╪¬╪º╪¡ ┘ä┘ç╪░┘ç ╪º┘ä╪¬╪░┘â╪▒╪⌐', data: null };
      handleError(error, 'Get Ticket Log');
      return { success: false, error: error.message, message: '┘ü╪┤┘ä ┘ü┘è ╪¼┘ä╪¿ ╪│╪¼┘ä ╪º┘ä╪¬╪░┘â╪▒╪⌐', ticket: null, logs: [] };
    }
  }

  async replyToTicket(ticketId, message, imageFile = null) {
    try {
      const apiKey = await this._client.getApiKey();
      const formData = new FormData();
      formData.append('ticket_id', String(ticketId));
      formData.append('message', message);
      formData.append('authentication_key', apiKey);
      if (imageFile?.buffer) formData.append('image', imageFile.buffer, { filename: imageFile.originalname || 'image.jpg', contentType: imageFile.mimetype || 'image/jpeg' });
      const requestHeaders = { ...formData.getHeaders() };
      const response = await axios.post(`${this._client.baseUrl}/tickets/reply`, formData, { headers: requestHeaders, timeout: this._client.timeout, maxContentLength: Infinity, maxBodyLength: Infinity });
      const result = response.data;
      if (result.success === 0 || result.success === false) throw new Error(`Turbo API error: ${result.error_msg || result.message || 'Unknown error'}`);
      return { success: true, message: result.message || '╪¬┘à ╪Ñ╪▒╪│╪º┘ä ╪º┘ä╪▒╪» ╪¿┘å╪¼╪º╪¡', data: result };
    } catch (error) {
      handleError(error, 'Reply Ticket');
      return { success: false, error: error.message, message: '┘ü╪┤┘ä ┘ü┘è ╪Ñ╪▒╪│╪º┘ä ╪º┘ä╪▒╪»' };
    }
  }

  async getUnreadTicketsCount() {
    try {
      const apiKey = await this._client.getApiKey();
      const headers = await this._client.getHeaders();
      const mainClientCode = await this._client.getMainClientCode();
      const response = await axios.get(`${this._client.baseUrl}/tickets/unreaded_tickets?authentication_key=${encodeURIComponent(apiKey)}&main_client_code=${mainClientCode || 37321}`, { headers, timeout: this._client.timeout });
      const result = response.data;
      if (result.success === 0 || result.success === false) throw new Error(`Turbo API error: ${result.error_msg || result.message || 'Unknown error'}`);
      return { success: true, counts: result.feed || result.data || { tickets: 0, missions: 0, orders: 0 }, message: result.message || '╪¬┘à ╪¼┘ä╪¿ ╪╣╪»╪» ╪º┘ä╪¬╪░╪º┘â╪▒ ╪║┘è╪▒ ╪º┘ä┘à┘é╪▒┘ê╪í╪⌐ ╪¿┘å╪¼╪º╪¡', data: result };
    } catch (error) {
      if (error.response?.status === 404) return { success: true, counts: { tickets: 0, missions: 0, orders: 0 }, message: '┘ä╪º ╪¬┘ê╪¼╪» ╪¬╪░╪º┘â╪▒ ╪║┘è╪▒ ┘à┘é╪▒┘ê╪í╪⌐', data: null };
      handleError(error, 'Get Unread Tickets Count');
      return { success: false, error: error.message, message: '┘ü╪┤┘ä ┘ü┘è ╪¼┘ä╪¿ ╪╣╪»╪» ╪º┘ä╪¬╪░╪º┘â╪▒ ╪║┘è╪▒ ╪º┘ä┘à┘é╪▒┘ê╪í╪⌐', counts: { tickets: 0, missions: 0, orders: 0 } };
    }
  }
}

module.exports = TicketService;
