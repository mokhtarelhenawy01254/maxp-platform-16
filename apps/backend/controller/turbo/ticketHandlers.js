const TurboService = require('../../services/turboService');
const { getSharedPrismaClient, safeQuery } = require('../../services/sharedDatabase');
const redisCacheService = require('../../services/redisCacheService');

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
    const result = await turboService.addTicket(ticketContent.trim(), finalCategoryId, code, media, priority, relatedTo || related_to, req.file);
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
    const { page = 1, per_page = 15, status, search } = req.query;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });
    const turboService = new TurboService(null, companyId);
    const result = await turboService.getTickets(parseInt(page), parseInt(per_page), { status, search });

    if (result && Array.isArray(result.tickets) && result.tickets.length > 0) {
      // 1. Strict Descending Sorting (Newest tickets on top)
      result.tickets.sort((a, b) => {
        const timeA = Math.max(
          new Date(a.created_at || 0).getTime(),
          new Date(a.updated_at || 0).getTime()
        );
        const timeB = Math.max(
          new Date(b.created_at || 0).getTime(),
          new Date(b.updated_at || 0).getTime()
        );
        if (timeB !== timeA) return timeB - timeA;
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });

      // 2. Batch order matching for badges
      try {
        const prisma = getSharedPrismaClient();
        const ticketCodes = new Set();
        result.tickets.forEach((t) => {
          if (t.code) ticketCodes.add(String(t.code).trim());
          if (t.related_value) ticketCodes.add(String(t.related_value).trim());
          if (t.related_model?.id) ticketCodes.add(String(t.related_model.id).trim());
        });

        const codesList = Array.from(ticketCodes).filter(Boolean);
        if (codesList.length > 0) {
          const matchedOrders = await safeQuery(() => prisma.order.findMany({
            where: {
              companyId,
              OR: [
                { turboTrackingNumber: { in: codesList } },
                { turboShipmentId: { in: codesList } },
                { orderNumber: { in: codesList } }
              ]
            },
            select: {
              id: true,
              orderNumber: true,
              status: true,
              turboShipmentStatus: true,
              turboTrackingNumber: true,
              turboShipmentId: true,
              customerName: true
            }
          }), 2).catch(() => []);

          const orderMap = new Map();
          matchedOrders.forEach((ord) => {
            if (ord.turboTrackingNumber) orderMap.set(String(ord.turboTrackingNumber).trim(), ord);
            if (ord.turboShipmentId) orderMap.set(String(ord.turboShipmentId).trim(), ord);
            if (ord.orderNumber) orderMap.set(String(ord.orderNumber).trim(), ord);
          });

          result.tickets.forEach((t) => {
            const code1 = t.code ? String(t.code).trim() : '';
            const code2 = t.related_value ? String(t.related_value).trim() : '';
            const code3 = t.related_model?.id ? String(t.related_model.id).trim() : '';
            const matched = orderMap.get(code1) || orderMap.get(code2) || orderMap.get(code3);
            if (matched) {
              t.matchedOrderSummary = {
                id: matched.id,
                orderNumber: matched.orderNumber,
                status: matched.status,
                customerName: matched.customerName,
                shippingStatus: matched.turboShipmentStatus
              };
            }
          });
        }
      } catch (matchErr) {
        console.warn('⚠️ [TURBO-CONTROLLER] Error matching tickets with orders:', matchErr.message);
      }
    }

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

    // Redis SWR fast-cache (15s)
    const cacheKey = `turbo:ticket:${companyId}:${id}`;
    const cachedData = await redisCacheService.get(cacheKey).catch(() => null);
    if (cachedData) {
      return res.json({ success: true, data: cachedData, cached: true });
    }

    const turboService = new TurboService(null, companyId);
    const result = await turboService.getTicket(id);
    if (!result.success) return res.status(400).json({ success: false, error: result.error, message: result.message, ticket: null });

    const ticket = result.ticket || result.data?.ticket || result.data;
    if (ticket) {
      // Complete Order details linking
      try {
        const prisma = getSharedPrismaClient();
        const codeCandidates = [
          ticket.code,
          ticket.related_value,
          ticket.related_model?.id,
          String(ticket.id)
        ].filter(Boolean).map(c => String(c).trim());

        if (codeCandidates.length > 0) {
          const matchedOrder = await safeQuery(() => prisma.order.findFirst({
            where: {
              companyId,
              OR: [
                { turboTrackingNumber: { in: codeCandidates } },
                { turboShipmentId: { in: codeCandidates } },
                { orderNumber: { in: codeCandidates } }
              ]
            },
            include: {
              customer: true,
              orderItems: {
                include: {
                  product: { select: { id: true, name: true, images: true, sku: true } },
                  productVariant: { select: { id: true, name: true, sku: true } }
                }
              }
            }
          }), 2).catch(() => null);

          if (matchedOrder) {
            ticket.matchedOrder = {
              id: matchedOrder.id,
              orderNumber: matchedOrder.orderNumber,
              status: matchedOrder.status,
              turboStatus: matchedOrder.turboShipmentStatus || matchedOrder.shippingStatus || null,
              turboTrackingNumber: matchedOrder.turboTrackingNumber || null,
              turboShipmentId: matchedOrder.turboShipmentId || null,
              turboCaptainName: matchedOrder.turboCaptainName || null,
              turboCaptainPhone: matchedOrder.turboCaptainPhone || null,
              customer: {
                name: matchedOrder.customerName || matchedOrder.customer?.name || `${matchedOrder.customer?.firstName || ''} ${matchedOrder.customer?.lastName || ''}`.trim(),
                phone: matchedOrder.customerPhone || matchedOrder.customer?.phone || '',
                address: matchedOrder.shippingAddress || matchedOrder.customerAddress || matchedOrder.customer?.address || '',
                city: matchedOrder.city || matchedOrder.customer?.city || '',
                governorate: matchedOrder.governorate || matchedOrder.customer?.governorate || ''
              },
              items: (matchedOrder.orderItems || []).map(item => ({
                id: item.id,
                productName: item.productName || item.product?.name || 'منتج',
                variantName: item.variantName || item.productVariant?.name || null,
                quantity: item.quantity,
                unitPrice: Number(item.price || item.unitPrice || 0),
                total: Number(item.total || ((item.quantity || 1) * (item.price || 0)))
              })),
              financials: {
                subtotal: Number(matchedOrder.subtotal || 0),
                shippingFee: Number(matchedOrder.shippingFee || matchedOrder.shippingCost || 0),
                discount: Number(matchedOrder.discount || 0),
                total: Number(matchedOrder.total || 0)
              },
              createdAt: matchedOrder.createdAt
            };
          }
        }
      } catch (linkErr) {
        console.warn('⚠️ [TURBO-CONTROLLER] Error attaching matched order to ticket:', linkErr.message);
      }

      await redisCacheService.set(cacheKey, result, 15).catch(() => {});
    }

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

    // Invalidate Redis cache on new reply
    await redisCacheService.del(`turbo:ticket:${companyId}:${id}`).catch(() => {});

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
