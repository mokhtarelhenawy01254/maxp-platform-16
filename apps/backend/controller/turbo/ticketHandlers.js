const TurboService = require('../../services/turboService');

const addTicket = async (req, res) => {
  try {
    const { description, content, type, categoryId, category_id, inquiryTypeId, inquiry_type_id, complaintTypeId, complaint_type_id, code, media, priority, relatedTo, related_to } = req.body;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const ticketContent = content || description || '';
    if (!ticketContent.trim()) return res.status(400).json({ success: false, error: 'Content/Description is required' });
    let finalCategoryId = categoryId || category_id;
    if (!finalCategoryId) {
      if (type === 1) finalCategoryId = inquiryTypeId || inquiry_type_id || type;
      else if (type === 2) finalCategoryId = complaintTypeId || complaint_type_id || type;
      else finalCategoryId = type || 3;
    }
    if (!finalCategoryId) return res.status(400).json({ success: false, error: 'Category ID is required' });
    const turboService = new TurboService(null, companyId);
    const result = await turboService.addTicket(ticketContent.trim(), finalCategoryId, code, media, priority, relatedTo || related_to);
    if (!result.success) return res.status(400).json({ success: false, error: result.error, message: result.message });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error adding ticket:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to add ticket' });
  }
};

const getInquiriesTypes = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const turboService = new TurboService(null, companyId);
    const result = await turboService.getInquiriesTypes();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting inquiries types:', error);
    const isConfigError = error.message?.includes('Turbo is not enabled') || error.message?.includes('not configured');
    res.status(isConfigError ? 400 : 500).json({ success: false, error: error.message || 'Failed to get inquiries types', types: [] });
  }
};

const getTickets = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { page = 1, per_page = 10, status, search } = req.query;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const turboService = new TurboService(null, companyId);
    const result = await turboService.getTickets(parseInt(page), parseInt(per_page), { status, search });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting tickets:', error);
    const isConfigError = error.message?.includes('Turbo is not enabled') || error.message?.includes('not configured');
    res.status(isConfigError ? 400 : 500).json({ success: false, error: error.message || 'Failed to get tickets', tickets: [], pagination: { total: 0, page: 1, per_page: 10, pages: 0 } });
  }
};

const getTicket = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    if (!id) return res.status(400).json({ success: false, error: 'Ticket ID is required' });
    const turboService = new TurboService(null, companyId);
    const result = await turboService.getTicket(id);
    if (!result.success) return res.status(400).json({ success: false, error: result.error, message: result.message, ticket: null });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting ticket:', error);
    const isConfigError = error.message?.includes('Turbo is not enabled') || error.message?.includes('not configured');
    res.status(isConfigError ? 400 : 500).json({ success: false, error: error.message || 'Failed to get ticket', ticket: null });
  }
};

const getTicketLog = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    if (!id) return res.status(400).json({ success: false, error: 'Ticket ID is required' });
    const turboService = new TurboService(null, companyId);
    const result = await turboService.getTicketLog(id);
    if (!result.success) return res.status(400).json({ success: false, error: result.error, message: result.message, ticket: null, logs: [] });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting ticket log:', error);
    const isConfigError = error.message?.includes('Turbo is not enabled') || error.message?.includes('not configured');
    res.status(isConfigError ? 400 : 500).json({ success: false, error: error.message || 'Failed to get ticket log', ticket: null, logs: [] });
  }
};

const replyToTicket = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const { message } = req.body;
    const imageFile = req.file;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    if (!id) return res.status(400).json({ success: false, error: 'Ticket ID is required' });
    if (!message) return res.status(400).json({ success: false, error: 'Message is required' });
    const turboService = new TurboService(null, companyId);
    let imageData = null;
    if (imageFile?.buffer) imageData = { buffer: imageFile.buffer, originalname: imageFile.originalname || 'image.jpg', mimetype: imageFile.mimetype || 'image/jpeg', size: imageFile.size };
    const result = await turboService.replyToTicket(id, message, imageData);
    if (!result.success) return res.status(400).json({ success: false, error: result.error, message: result.message });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error replying to ticket:', error);
    const isConfigError = error.message?.includes('Turbo is not enabled') || error.message?.includes('not configured');
    res.status(isConfigError ? 400 : 500).json({ success: false, error: error.message || 'Failed to reply to ticket' });
  }
};

const getUnreadTicketsCount = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const turboService = new TurboService(null, companyId);
    const result = await turboService.getUnreadTicketsCount();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting unread tickets count:', error);
    const isConfigError = error.message?.includes('Turbo is not enabled') || error.message?.includes('not configured');
    res.status(isConfigError ? 400 : 500).json({ success: false, error: error.message || 'Failed to get unread tickets count', counts: { tickets: 0, missions: 0, orders: 0 } });
  }
};

const getTicketStatuses = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const turboService = new TurboService(null, companyId);
    const result = await turboService.getTicketStatuses();
    res.json(result);
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting ticket statuses:', error);
    res.status(500).json({ success: false, error: error.message, statuses: [] });
  }
};

const getTicketInstructions = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const turboService = new TurboService(null, companyId);
    const result = await turboService.getTicketInstructions();
    res.json(result);
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting ticket instructions:', error);
    res.status(500).json({ success: false, error: error.message, instructions: [] });
  }
};

const getCanCreateTicket = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const turboService = new TurboService(null, companyId);
    const result = await turboService.canCreateTicket();
    res.json(result);
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error checking can-create ticket:', error);
    res.status(500).json({ success: false, error: error.message, canCreate: true });
  }
};

const getTotalOpenTickets = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const turboService = new TurboService(null, companyId);
    const result = await turboService.getTotalOpenTickets();
    res.json(result);
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting total open tickets:', error);
    res.status(500).json({ success: false, error: error.message, total: 0 });
  }
};

const rateTicket = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const { rate } = req.body;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    if (!id) return res.status(400).json({ success: false, error: 'Ticket ID is required' });
    if (!rate || Number(rate) < 1 || Number(rate) > 5) {
      return res.status(400).json({ success: false, error: 'Rate must be a number between 1 and 5' });
    }
    const turboService = new TurboService(null, companyId);
    const result = await turboService.rateTicket(id, Number(rate));
    res.json(result);
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error rating ticket:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  addTicket,
  getInquiriesTypes,
  getTickets,
  getTicket,
  getTicketLog,
  replyToTicket,
  getUnreadTicketsCount,
  getTicketStatuses,
  getTicketInstructions,
  getCanCreateTicket,
  getTotalOpenTickets,
  rateTicket,
};
