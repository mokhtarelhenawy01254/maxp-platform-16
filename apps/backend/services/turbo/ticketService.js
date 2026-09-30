const axios = require('axios');
const FormData = require('form-data');
const { handleError, isTurboConfigurationError } = require('../../utils/turbo/errorHandler');

class TicketService {
  constructor(apiClient) {
    this._client = apiClient;
  }

  async addTicket(content, categoryId, code = null, media = [], priority = 'medium', relatedTo = 'others', imageFile = null) {
    try {
      const apiKey = await this._client.getApiKey();
      const headers = await this._client.getHeaders();
      const mainClientCode = await this._client.getMainClientCode();

      // Normalize priority to Turbo's allowed enum: 'low' | 'medium' | 'high'
      let safePriority = 'medium';
      if (priority) {
        const p = String(priority).toLowerCase().trim();
        if (p === 'low' || p === 'منخفضة' || p === 'منخفضه') safePriority = 'low';
        else if (p === 'high' || p === 'عاجلة' || p === 'عاجله' || p === 'قصوى' || p === 'urgent') safePriority = 'high';
        else safePriority = 'medium';
      }

      // Safe related_to
      let safeRelatedTo = relatedTo || (code ? 'shipments' : 'others');
      const validRelatedTo = ['shipments', 'branches', 'client_requests', 'others'];
      if (!validRelatedTo.includes(safeRelatedTo)) {
        safeRelatedTo = code ? 'shipments' : 'others';
      }

      if (imageFile?.buffer) {
        const formData = new FormData();
        formData.append('authentication_key', apiKey);
        formData.append('main_client_code', String(mainClientCode || 37321));
        formData.append('category_id', String(categoryId));
        formData.append('content', content);
        formData.append('priority', safePriority);
        formData.append('related_to', safeRelatedTo);
        if (code) formData.append('code', String(code));
        formData.append('media[0]', imageFile.buffer, {
          filename: imageFile.originalname || 'image.jpg',
          contentType: imageFile.mimetype || 'image/jpeg',
        });
        formData.append('image', imageFile.buffer, {
          filename: imageFile.originalname || 'image.jpg',
          contentType: imageFile.mimetype || 'image/jpeg',
        });
        const uploadTimeout = Math.max(Number(this._client.timeout) || 5000, 25000);
        const requestHeaders = { ...formData.getHeaders() };
        const response = await axios.post(`${this._client.baseUrl}/tickets/create`, formData, { headers: requestHeaders, timeout: uploadTimeout, maxContentLength: Infinity, maxBodyLength: Infinity });
        const result = response.data;
        const isFailed = result.success === 0 || result.success === false || result.error === true || result.error === 1;
        if (isFailed) throw new Error(`Turbo API error: ${result.error_msg || result.message || 'Unknown error'}`);
        return { success: true, ticketId: result.ticket_id || result.id || result.data?.id || result.code, message: result.message || 'تم إضافة التذكرة بنجاح', data: result };
      }

      const response = await axios.post(`${this._client.baseUrl}/tickets/create`, {
        authentication_key: apiKey,
        main_client_code: mainClientCode || 37321,
        category_id: categoryId,
        content,
        media: media || [],
        priority: safePriority,
        related_to: safeRelatedTo,
        code: code || null
      }, { headers, timeout: this._client.timeout });
      const result = response.data;
      const isFailed = result.success === 0 || result.success === false || result.error === true || result.error === 1;
      if (isFailed) throw new Error(`Turbo API error: ${result.error_msg || result.message || 'Unknown error'}`);
      return { success: true, ticketId: result.ticket_id || result.id || result.data?.id || result.code, message: result.message || 'تم إضافة التذكرة بنجاح', data: result };
    } catch (error) {
      handleError(error, 'Create Ticket');
      const { getTurboErrorMessage, translateTurboErrorToArabic } = require('../../utils/turbo/errorHandler');
      const rawError = getTurboErrorMessage(error) || error.message || 'فشل في إضافة التذكرة';
      return { success: false, error: rawError, message: translateTurboErrorToArabic(rawError) };
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
      return { success: true, types: result.data || result.categories || [], message: result.message || 'تم جلب فئات التذاكر بنجاح', data: result };
    } catch (error) {
      handleError(error, 'Get Ticket Categories');
      return { success: false, error: error.message, message: 'فشل في جلب فئات التذاكر', types: [] };
    }
  }

  async getTickets(page = 1, perPage = 10, options = {}) {
    try {
      const apiKey = await this._client.getApiKey();
      const headers = await this._client.getHeaders();
      const mainClientCode = await this._client.getMainClientCode();
      let url = `${this._client.baseUrl}/tickets?authentication_key=${encodeURIComponent(apiKey)}&main_client_code=${mainClientCode || 37321}&per_page=${perPage}&page=${page}`;
      if (options.status !== undefined && options.status !== null && options.status !== '' && options.status !== 'all') {
        let statusVal = String(options.status).toLowerCase().trim();
        if (statusVal === '0' || statusVal === 'new') statusVal = 'open';
        else if (statusVal === '1' || statusVal === 'processing') statusVal = 'in_progress';
        else if (statusVal === '3' || statusVal === 'pending' || statusVal === 'hold') statusVal = 'on_hold';
        else if (statusVal === '2' || statusVal === 'solved' || statusVal === 'resolved') statusVal = 'closed';
        url += `&status=${encodeURIComponent(statusVal)}`;
      }
      if (options.search) {
        url += `&search=${encodeURIComponent(options.search)}`;
      }
      if (options.category_id || options.categoryId) {
        url += `&category_id=${encodeURIComponent(options.category_id || options.categoryId)}`;
      }
      const response = await axios.get(url, { headers, timeout: this._client.timeout });
      const result = response.data;
      const isSuccess = result.success === 1 || result.success === true;
      if (!isSuccess && result.success !== undefined) throw new Error(`Turbo API error: ${result.error_msg || result.message || 'Unknown error'}`);
      const tickets = result.feed?.data || result.tickets || result.data || [];
      const pagination = result.meta || result.feed || result.pagination || { current_page: page, per_page: perPage, total: tickets.length, last_page: Math.ceil(tickets.length / perPage) };
      const total = Number(pagination.total ?? tickets.length);
      const lastPage = Number(pagination.last_page ?? pagination.lastPage ?? Math.ceil(total / perPage));
      const currentPageNum = Number(pagination.current_page ?? pagination.page ?? page);
      const perPageNum = Number(pagination.per_page ?? pagination.perPage ?? perPage);
      return {
        success: true,
        tickets,
        pagination: {
          page: currentPageNum,
          perPage: perPageNum,
          total,
          lastPage
        },
        message: result.message || 'تم جلب التذاكر بنجاح',
        data: result
      };
    } catch (error) {
      if (error.response?.status === 404) return { success: true, tickets: [], pagination: { page, perPage, total: 0, lastPage: 0 }, message: 'لا توجد تذاكر متاحة', data: null };
      handleError(error, 'Get Tickets');
      return { success: false, error: error.message, message: 'فشل في جلب التذاكر', tickets: [], pagination: { page, perPage: 10, total: 0 } };
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
      if (!isSuccess && result.success !== undefined) return { success: false, error: result.error_msg || result.message || 'Unknown error', message: result.error_msg === 'غير موجود' ? 'لم يتم العثور على هذه التذكرة في نظام Turbo' : (result.error_msg || result.message), status: 404, ticket: null };
      const ticket = result.feed || result.ticket || result.data || null;
      if (ticket?.replies && Array.isArray(ticket.replies)) ticket.messages = ticket.replies;
      return { success: true, ticket, message: result.message || 'تم جلب التذكرة بنجاح', data: result };
    } catch (error) {
      if (error.response?.status === 404) return { success: false, error: 'التذكرة غير موجودة', message: 'عذراً، لم يتم العثور على التذكرة المطلوبة في نظام Turbo', status: 404, ticket: null };
      handleError(error, 'Get Ticket');
      return { success: false, error: error.message, message: 'فشل في جلب التذكرة', ticket: null };
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
        if (result.error_msg === 'غير موجود' || response.status === 404) return { success: true, ticket: null, logs: [], message: 'لا يوجد سجل متاح لهذه التذكرة', data: result };
        throw new Error(`Turbo API error: ${result.error_msg || result.message || 'Unknown error'}`);
      }
      const logs = Array.isArray(result.feed) ? result.feed : (result.logs || result.data || []);
      return { success: true, ticket: result.feed || result.data || null, logs, message: result.message || 'تم جلب سجل التذكرة بنجاح', data: result };
    } catch (error) {
      if (error.response?.status === 404) return { success: true, ticket: null, logs: [], message: 'لا يوجد سجل متاح لهذه التذكرة', data: null };
      handleError(error, 'Get Ticket Log');
      return { success: false, error: error.message, message: 'فشل في جلب سجل التذكرة', ticket: null, logs: [] };
    }
  }

  async replyToTicket(ticketId, message, imageFile = null) {
    try {
      const apiKey = await this._client.getApiKey();
      const mainClientCode = await this._client.getMainClientCode();
      const uploadTimeout = Math.max(Number(this._client.timeout) || 5000, 25000);

      const createReplyFormData = () => {
        const fd = new FormData();
        fd.append('ticket_id', String(ticketId));
        fd.append('content', message);
        fd.append('message', message);
        fd.append('authentication_key', apiKey);
        if (mainClientCode) fd.append('main_client_code', String(mainClientCode));
        if (imageFile?.buffer) {
          const filename = imageFile.originalname || 'image.jpg';
          const contentType = imageFile.mimetype || 'image/jpeg';
          fd.append('media[0]', imageFile.buffer, { filename, contentType });
          fd.append('image', imageFile.buffer, { filename, contentType });
        }
        return fd;
      };

      const primaryFormData = createReplyFormData();
      const requestHeaders = { ...primaryFormData.getHeaders() };

      // Primary: Modern message-store endpoint from Postman doc
      try {
        const response = await axios.post(
          `${this._client.baseUrl}/tickets/${ticketId}/message-store?authentication_key=${encodeURIComponent(apiKey)}&main_client_code=${mainClientCode || 37321}`,
          primaryFormData,
          { headers: requestHeaders, timeout: uploadTimeout, maxContentLength: Infinity, maxBodyLength: Infinity }
        );
        const result = response.data;
        if (result.success === 0 || result.success === false) throw new Error(`Turbo API error: ${result.error_msg || result.message || 'Unknown error'}`);
        return { success: true, message: result.message || 'تم إرسال الرد بنجاح', data: result };
      } catch (storeErr) {
        // Fallback to legacy /tickets/reply if message-store returns 404
        if (storeErr.response?.status === 404) {
          const fallbackFormData = createReplyFormData();
          const fallbackHeaders = { ...fallbackFormData.getHeaders() };
          const response = await axios.post(
            `${this._client.baseUrl}/tickets/reply`,
            fallbackFormData,
            { headers: fallbackHeaders, timeout: uploadTimeout, maxContentLength: Infinity, maxBodyLength: Infinity }
          );
          const result = response.data;
          if (result.success === 0 || result.success === false) throw new Error(`Turbo API error: ${result.error_msg || result.message || 'Unknown error'}`);
          return { success: true, message: result.message || 'تم إرسال الرد بنجاح', data: result };
        }
        throw storeErr;
      }
    } catch (error) {
      handleError(error, 'Reply Ticket');
      const { getTurboErrorMessage, translateTurboErrorToArabic } = require('../../utils/turbo/errorHandler');
      const rawError = getTurboErrorMessage(error) || error.message || 'فشل في إرسال الرد';
      return { success: false, error: rawError, message: translateTurboErrorToArabic(rawError) };
    }
  }

  async rateTicket(ticketId, rate) {
    try {
      const apiKey = await this._client.getApiKey();
      const mainClientCode = await this._client.getMainClientCode();
      const formData = new FormData();
      formData.append('rate', String(rate));
      const requestHeaders = { ...formData.getHeaders() };
      const response = await axios.post(
        `${this._client.baseUrl}/tickets/${ticketId}/rate?authentication_key=${encodeURIComponent(apiKey)}&main_client_code=${mainClientCode || 37321}`,
        formData,
        { headers: requestHeaders, timeout: this._client.timeout }
      );
      return { success: true, message: 'تم تقييم التذكرة بنجاح', data: response.data };
    } catch (error) {
      handleError(error, 'Rate Ticket');
      return { success: false, error: error.message, message: 'فشل في تقييم التذكرة' };
    }
  }

  async getStatuses() {
    try {
      const apiKey = await this._client.getApiKey();
      const headers = await this._client.getHeaders();
      const mainClientCode = await this._client.getMainClientCode();
      const response = await axios.get(
        `${this._client.baseUrl}/tickets/statuses?authentication_key=${encodeURIComponent(apiKey)}&main_client_code=${mainClientCode || 37321}`,
        { headers, timeout: this._client.timeout }
      );
      return { success: true, statuses: response.data?.data || response.data || [], message: 'تم جلب حالات التذاكر بنجاح', data: response.data };
    } catch (error) {
      handleError(error, 'Get Ticket Statuses');
      return { success: false, error: error.message, statuses: [] };
    }
  }

  async getInstructions() {
    try {
      const apiKey = await this._client.getApiKey();
      const headers = await this._client.getHeaders();
      const mainClientCode = await this._client.getMainClientCode();
      const response = await axios.get(
        `${this._client.baseUrl}/tickets/instructions?authentication_key=${encodeURIComponent(apiKey)}&main_client_code=${mainClientCode || 37321}`,
        { headers, timeout: this._client.timeout }
      );
      return { success: true, instructions: response.data?.data || response.data || [], message: 'تم جلب تعليمات التذاكر بنجاح', data: response.data };
    } catch (error) {
      handleError(error, 'Get Ticket Instructions');
      return { success: false, error: error.message, instructions: [] };
    }
  }

  async canCreateTicket() {
    try {
      const apiKey = await this._client.getApiKey();
      const headers = await this._client.getHeaders();
      const mainClientCode = await this._client.getMainClientCode();
      const response = await axios.get(
        `${this._client.baseUrl}/tickets/can-create?authentication_key=${encodeURIComponent(apiKey)}&main_client_code=${mainClientCode || 37321}`,
        { headers, timeout: this._client.timeout }
      );
      return { success: true, canCreate: response.data?.can_create ?? true, data: response.data };
    } catch (error) {
      handleError(error, 'Can Create Ticket');
      return { success: false, error: error.message, canCreate: true };
    }
  }

  async getTotalOpenTickets() {
    try {
      const apiKey = await this._client.getApiKey();
      const headers = await this._client.getHeaders();
      const mainClientCode = await this._client.getMainClientCode();
      const response = await axios.get(
        `${this._client.baseUrl}/tickets/total-open-tickets?authentication_key=${encodeURIComponent(apiKey)}&main_client_code=${mainClientCode || 37321}`,
        { headers, timeout: this._client.timeout }
      );
      return { success: true, total: response.data?.total || response.data?.data || 0, data: response.data };
    } catch (error) {
      handleError(error, 'Get Total Open Tickets');
      return { success: false, error: error.message, total: 0 };
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
      return { success: true, counts: result.feed || result.data || { tickets: 0, missions: 0, orders: 0 }, message: result.message || 'تم جلب عدد التذاكر غير المقروءة بنجاح', data: result };
    } catch (error) {
      if (error.response?.status === 404 || isTurboConfigurationError(error)) {
        return { success: true, counts: { tickets: 0, missions: 0, orders: 0 }, message: 'لا توجد تذاكر غير مقروءة أو خدمة تربو غير مفعلة', data: null, unconfigured: true };
      }
      handleError(error, 'Get Unread Tickets Count');
      return { success: false, error: error.message, message: 'فشل في جلب عدد التذاكر غير المقروءة', counts: { tickets: 0, missions: 0, orders: 0 } };
    }
  }
}

module.exports = TicketService;
