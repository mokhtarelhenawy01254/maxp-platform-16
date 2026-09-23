const TurboService = require('../../services/turboService');
const { getSharedPrismaClient, safeQuery } = require('../../services/sharedDatabase');
const redisCacheService = require('../../services/redisCacheService');

const isTurboConfigError = (error) => {
  const msg = String(error?.message || '');
  return (
    msg.includes('Turbo is not enabled') ||
    msg.includes('not configured') ||
    msg.includes('غير مفعّلة') ||
    msg.includes('غير مفعلة') ||
    msg.includes('مفتاح API') ||
    msg.includes('إعدادات Turbo')
  );
};

const resolveCompanyId = (req) => {
  return (
    req.user?.companyId ||
    req.headers['x-company-id'] ||
    req.headers['X-Company-Id'] ||
    req.query?.companyId ||
    req.companyId ||
    null
  );
};

const resolveAccessibleTurboCompanies = async (req) => {
  const prisma = getSharedPrismaClient();
  const userId = req.user?.id;
  const currentCompanyId = resolveCompanyId(req);

  const companyIds = new Set();
  if (currentCompanyId) companyIds.add(currentCompanyId);

  if (userId) {
    const userCompanies = await safeQuery(() => prisma.userCompany.findMany({
      where: { userId, isActive: true },
      select: { companyId: true }
    }), 2).catch(() => []);
    userCompanies.forEach(uc => {
      if (uc.companyId) companyIds.add(uc.companyId);
    });

    if (req.user?.companyId) companyIds.add(req.user.companyId);
  }

  const idsArray = Array.from(companyIds).filter(Boolean);
  if (idsArray.length === 0) return [];

  const companies = await safeQuery(() => prisma.company.findMany({
    where: {
      id: { in: idsArray },
      turboApiKey: { not: null },
      turboMainClientCode: { not: null }
    },
    select: {
      id: true,
      name: true,
      turboApiKey: true,
      turboMainClientCode: true
    }
  }), 2).catch(() => []);

  // Filter unique by turboMainClientCode to avoid duplicate API calls
  const unique = [];
  const seenCodes = new Set();
  for (const c of companies) {
    const code = Number(c.turboMainClientCode);
    if (!seenCodes.has(code)) {
      seenCodes.add(code);
      unique.push(c);
    }
  }

  return unique;
};

const getTurboAccounts = async (req, res) => {
  try {
    const currentCompanyId = resolveCompanyId(req);
    const companies = await resolveAccessibleTurboCompanies(req);
    const accounts = companies.map(c => ({
      id: c.id,
      name: c.name,
      clientCode: c.turboMainClientCode,
      isCurrent: c.id === currentCompanyId
    }));
    res.json({ success: true, accounts });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting turbo accounts:', error);
    res.status(500).json({ success: false, error: error.message, accounts: [] });
  }
};

const addTicket = async (req, res) => {
  try {
    const { description, content, type, categoryId, category_id, inquiryTypeId, inquiry_type_id, complaintTypeId, complaint_type_id, code, media, priority, relatedTo, related_to, targetCompanyId } = req.body;
    const companyId = targetCompanyId || resolveCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'Company ID is required', message: 'يرجى اختيار شركة أولاً' });
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
    if (!result.success) return res.status(400).json({ success: false, error: result.error, message: result.message || result.error });
    res.json({ success: true, data: result, ticketId: result.ticketId, message: result.message });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error adding ticket:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to add ticket', message: error.message || 'فشل في إضافة التذكرة' });
  }
};

const getInquiriesTypes = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.json({ success: true, data: [] });
    const turboService = new TurboService(null, companyId);
    const result = await turboService.getInquiriesTypes();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting inquiries types:', error);
    const isConfigError = isTurboConfigError(error);
    res.status(isConfigError ? 400 : 500).json({ success: false, error: error.message || 'Failed to get inquiries types', types: [] });
  }
};

const getTickets = async (req, res) => {
  try {
    const currentCompanyId = resolveCompanyId(req);
    const { page = 1, per_page = 15, status, search, account, category, category_id, categoryId } = req.query;

    let targetCategoryId = category_id || categoryId || null;
    if (!targetCategoryId && category && category !== 'all' && category !== 'unread') {
      const catKey = String(category).toLowerCase().trim();
      if (catKey === 'shipments' || catKey === 'delivery') targetCategoryId = 2;
      else if (catKey === 'finance' || catKey === 'financial') targetCategoryId = 49;
      else if (catKey === 'support' || catKey === 'inquiries' || catKey === 'inquiry') targetCategoryId = 1;
    }

    const accessibleCompanies = await resolveAccessibleTurboCompanies(req);

    if (accessibleCompanies.length === 0 && !currentCompanyId) {
      return res.json({
        success: true,
        data: { tickets: [], pagination: { total: 0, page: 1, per_page: 15, pages: 0, total_pages: 0 } },
        tickets: [],
        message: 'يرجى اختيار شركة لعرض التذاكر'
      });
    }

    // Determine target companies to fetch tickets from
    let targetCompanies = [];
    if (account && account !== 'all') {
      targetCompanies = accessibleCompanies.filter(c => c.id === account || String(c.turboMainClientCode) === String(account));
      if (targetCompanies.length === 0 && currentCompanyId) {
        targetCompanies = accessibleCompanies.filter(c => c.id === currentCompanyId);
      }
    } else {
      // Default: fetch all accessible companies
      targetCompanies = accessibleCompanies.length > 0
        ? accessibleCompanies
        : [{ id: currentCompanyId, name: 'الحساب الحالي', turboMainClientCode: null }];
    }

    const p = parseInt(page) || 1;
    const pp = parseInt(per_page) || 15;

    let allTickets = [];
    let combinedTotal = 0;
    let maxLastPage = 1;

    const fetchPromises = targetCompanies.map(async (comp) => {
      try {
        const turboService = new TurboService(null, comp.id);
        const result = await turboService.getTickets(p, pp, { status, search, category_id: targetCategoryId });
        if (result && Array.isArray(result.tickets)) {
          const tagged = result.tickets.map(t => ({
            ...t,
            storeName: comp.name,
            clientCode: comp.turboMainClientCode,
            companyId: comp.id
          }));
          return {
            tickets: tagged,
            total: Number(result.pagination?.total ?? tagged.length),
            lastPage: Number(result.pagination?.lastPage ?? 1)
          };
        }
      } catch (err) {
        console.warn(`⚠️ [TURBO-CONTROLLER] Error fetching tickets for ${comp.name}:`, err.message);
      }
      return { tickets: [], total: 0, lastPage: 1 };
    });

    const results = await Promise.all(fetchPromises);
    results.forEach(r => {
      allTickets.push(...r.tickets);
      combinedTotal += r.total;
      if (r.lastPage > maxLastPage) maxLastPage = r.lastPage;
    });

    // 1. Strict Smart Sorting:
    // a. Active open/in-progress tickets with unread messages come first
    // b. Active open/in-progress tickets come next
    // c. Chronological newest tickets (by Ticket ID & created date) come next so newly created tickets are never buried
    allTickets.sort((a, b) => {
      const isOpenA = a.is_closed !== true && a.status?.value !== 'closed' && a.status !== 'closed';
      const isOpenB = b.is_closed !== true && b.status?.value !== 'closed' && b.status !== 'closed';

      const unreadA = Number(a.un_read_messages_count || a.unread_messages_count || (a.unread ? 1 : 0) || 0);
      const unreadB = Number(b.un_read_messages_count || b.unread_messages_count || (b.unread ? 1 : 0) || 0);

      const activeUnreadA = isOpenA && unreadA > 0;
      const activeUnreadB = isOpenB && unreadB > 0;
      if (activeUnreadA !== activeUnreadB) return activeUnreadA ? -1 : 1;

      if (isOpenA !== isOpenB) return isOpenA ? -1 : 1;

      // Higher ticket ID = newer ticket created in Turbo
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      if (idB !== idA) return idB - idA;

      const timeA = new Date(a.created_at || a.updated_at || 0).getTime();
      const timeB = new Date(b.created_at || b.updated_at || 0).getTime();
      return timeB - timeA;
    });

    // If multi-company and we fetched from >1 company, slice to per_page
    const paginatedTickets = targetCompanies.length > 1
      ? allTickets.slice(0, pp)
      : allTickets;

    // 2. Batch order matching for badges across companies
    try {
      const prisma = getSharedPrismaClient();
      const ticketCodes = new Set();
      paginatedTickets.forEach((t) => {
        if (t.code) ticketCodes.add(String(t.code).trim());
        if (t.related_value) ticketCodes.add(String(t.related_value).trim());
        if (t.related_model?.id) ticketCodes.add(String(t.related_model.id).trim());
      });

      const codesList = Array.from(ticketCodes).filter(Boolean);
      if (codesList.length > 0) {
        const companyIdsFilter = targetCompanies.map(c => c.id);
        const matchedOrders = await safeQuery(() => prisma.order.findMany({
          where: {
            companyId: { in: companyIdsFilter },
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

        paginatedTickets.forEach((t) => {
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

    const accountsSummary = accessibleCompanies.map(c => ({
      id: c.id,
      name: c.name,
      clientCode: c.turboMainClientCode,
      isCurrent: c.id === currentCompanyId
    }));

    res.json({
      success: true,
      data: {
        tickets: paginatedTickets,
        pagination: {
          total: combinedTotal,
          page: p,
          per_page: pp,
          pages: Math.ceil(combinedTotal / pp),
          lastPage: Math.max(maxLastPage, Math.ceil(combinedTotal / pp))
        },
        accounts: accountsSummary
      },
      accounts: accountsSummary,
      tickets: paginatedTickets,
      pagination: {
        total: combinedTotal,
        page: p,
        per_page: pp,
        lastPage: Math.max(maxLastPage, Math.ceil(combinedTotal / pp))
      }
    });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting tickets:', error);
    const isConfigError = isTurboConfigError(error);
    res.status(isConfigError ? 400 : 500).json({
      success: false,
      error: error.message || 'Failed to get tickets',
      message: isConfigError
        ? 'خدمة تذاكر وشات تربو غير مفعلة لهذه الشركة'
        : (error.message || 'فشل في جلب التذاكر من تربو'),
      tickets: [],
      pagination: { total: 0, page: 1, per_page: 15, pages: 0 }
    });
  }
};

const getTicket = async (req, res) => {
  try {
    const currentCompanyId = resolveCompanyId(req);
    const { id } = req.params;
    const requestedCompanyId = req.query?.companyId || req.headers['x-target-company-id'];

    if (!id) return res.status(400).json({ success: false, error: 'Ticket ID is required' });

    const accessibleCompanies = await resolveAccessibleTurboCompanies(req);

    // Build list of companies to search
    const companiesToTry = [];
    if (requestedCompanyId) {
      const found = accessibleCompanies.find(c => c.id === requestedCompanyId);
      if (found) companiesToTry.push(found);
    }
    if (currentCompanyId && !companiesToTry.some(c => c.id === currentCompanyId)) {
      const found = accessibleCompanies.find(c => c.id === currentCompanyId) || { id: currentCompanyId };
      companiesToTry.push(found);
    }
    accessibleCompanies.forEach(c => {
      if (!companiesToTry.some(t => t.id === c.id)) companiesToTry.push(c);
    });

    let foundResult = null;
    let foundCompany = null;

    for (const comp of companiesToTry) {
      try {
        const cacheKey = `turbo:ticket:${comp.id}:${id}`;
        const cachedData = await redisCacheService.get(cacheKey).catch(() => null);
        if (cachedData) {
          return res.json({ success: true, data: cachedData, cached: true });
        }

        const turboService = new TurboService(null, comp.id);
        const result = await turboService.getTicket(id);
        if (result && result.success && result.ticket) {
          foundResult = result;
          foundCompany = comp;
          break;
        }
      } catch {}
    }

    if (!foundResult) {
      return res.status(404).json({
        success: false,
        error: 'التذكرة غير موجودة',
        message: 'عذراً، لم يتم العثور على التذكرة المطلوبة في أي من حسابات Turbo المرتبطة',
        ticket: null
      });
    }

    const ticket = foundResult.ticket || foundResult.data?.ticket || foundResult.data;
    if (ticket && foundCompany) {
      ticket.storeName = foundCompany.name;
      ticket.companyId = foundCompany.id;
      ticket.clientCode = foundCompany.turboMainClientCode;

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
              companyId: foundCompany.id,
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
            let formattedAddress = matchedOrder.shippingAddress || matchedOrder.customerAddress || matchedOrder.customer?.address || '';
            if (typeof formattedAddress === 'string' && formattedAddress.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(formattedAddress);
                formattedAddress = [parsed.address, parsed.area, parsed.city, parsed.governorate].filter(Boolean).join(' - ');
              } catch {}
            }

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
                address: formattedAddress,
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
                subtotal: Number(matchedOrder.subtotal || matchedOrder.subTotal || 0),
                shippingFee: Number(matchedOrder.shippingFee || matchedOrder.shippingCost || 0),
                discount: Number(matchedOrder.discount || 0),
                total: Number(matchedOrder.total || matchedOrder.totalAmount || 0)
              },
              total: Number(matchedOrder.total || matchedOrder.totalAmount || 0),
              createdAt: matchedOrder.createdAt
            };
          }
        }
      } catch (linkErr) {
        console.warn('⚠️ [TURBO-CONTROLLER] Error attaching matched order to ticket:', linkErr.message);
      }

      // Ensure sender orientation and attribution in messages
      if (Array.isArray(ticket.messages)) {
        const agentId = ticket.agent?.id ? String(ticket.agent.id) : null;
        ticket.messages.forEach((msg) => {
          if (msg.is_client_message === undefined || msg.is_client_message === null) {
            const userId = msg.user?.id ? String(msg.user.id) : null;
            const userName = (msg.user?.name || '').toLowerCase();
            const username = (msg.user?.username || '').toLowerCase();
            const email = (msg.user?.email || '').toLowerCase();
            const isSupport = (agentId && userId === agentId) ||
              username === 'ai_customer_service' ||
              email.includes('algoistic.com') ||
              userName.includes('ai customer') ||
              userName.includes('خدمة العملاء') ||
              userName.includes('الدعم الفني');
            msg.is_client_message = isSupport ? 0 : 1;
          }
        });
      }

      const cacheKey = `turbo:ticket:${foundCompany.id}:${id}`;
      await redisCacheService.set(cacheKey, ticket, 15).catch(() => {});
    }

    res.json({ success: true, data: ticket, ticket });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting ticket:', error);
    const isConfigError = isTurboConfigError(error);
    res.status(isConfigError ? 400 : 500).json({ success: false, error: error.message || 'Failed to get ticket', ticket: null });
  }
};

const getTicketLog = async (req, res) => {
  try {
    const currentCompanyId = resolveCompanyId(req);
    const { id } = req.params;
    const requestedCompanyId = req.query?.companyId;
    if (!id) return res.status(400).json({ success: false, error: 'Ticket ID is required' });

    const accessibleCompanies = await resolveAccessibleTurboCompanies(req);
    const companiesToTry = [];
    if (requestedCompanyId) {
      const found = accessibleCompanies.find(c => c.id === requestedCompanyId);
      if (found) companiesToTry.push(found);
    }
    if (currentCompanyId && !companiesToTry.some(c => c.id === currentCompanyId)) {
      const found = accessibleCompanies.find(c => c.id === currentCompanyId) || { id: currentCompanyId };
      companiesToTry.push(found);
    }
    accessibleCompanies.forEach(c => {
      if (!companiesToTry.some(t => t.id === c.id)) companiesToTry.push(c);
    });

    for (const comp of companiesToTry) {
      try {
        const turboService = new TurboService(null, comp.id);
        const result = await turboService.getTicketLog(id);
        if (result && result.success && (result.logs?.length > 0 || result.ticket)) {
          return res.json({ success: true, data: result });
        }
      } catch {}
    }

    res.json({ success: true, data: { ticket: null, logs: [] } });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting ticket log:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get ticket log', ticket: null, logs: [] });
  }
};

const replyToTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, companyId: targetCompanyId } = req.body;
    const imageFile = req.file;
    if (!id) return res.status(400).json({ success: false, error: 'Ticket ID is required' });
    if (!message || !message.trim()) return res.status(400).json({ success: false, error: 'Message is required' });

    const currentCompanyId = targetCompanyId || resolveCompanyId(req);
    const accessibleCompanies = await resolveAccessibleTurboCompanies(req);

    const companiesToTry = [];
    if (currentCompanyId) {
      const found = accessibleCompanies.find(c => c.id === currentCompanyId) || { id: currentCompanyId };
      companiesToTry.push(found);
    }
    accessibleCompanies.forEach(c => {
      if (!companiesToTry.some(t => t.id === c.id)) companiesToTry.push(c);
    });

    let imageData = null;
    if (imageFile?.buffer) imageData = { buffer: imageFile.buffer, originalname: imageFile.originalname || 'image.jpg', mimetype: imageFile.mimetype || 'image/jpeg', size: imageFile.size };

    let successResult = null;
    let successfulCompanyId = null;

    for (const comp of companiesToTry) {
      try {
        const turboService = new TurboService(null, comp.id);
        const result = await turboService.replyToTicket(id, message.trim(), imageData);
        if (result && result.success) {
          successResult = result;
          successfulCompanyId = comp.id;
          await redisCacheService.del(`turbo:ticket:${comp.id}:${id}`).catch(() => {});
          break;
        }
      } catch {}
    }

    if (!successResult) {
      return res.status(400).json({ success: false, error: 'فشل إرسال الرد على التذكرة في Turbo' });
    }

    res.json({ success: true, data: successResult, message: 'تم إرسال الرد بنجاح' });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error replying to ticket:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to reply to ticket' });
  }
};

// 2026 Resiliency Cache: cache unread counts for 90s to avoid repeated blocking calls to Turbo
const unreadCountsCache = new Map();
const UNREAD_CACHE_TTL_MS = 90 * 1000;

const getUnreadTicketsCount = async (req, res) => {
  try {
    const currentCompanyId = resolveCompanyId(req);
    const accessibleCompanies = await resolveAccessibleTurboCompanies(req);
    const targetCompanies = accessibleCompanies.length > 0
      ? accessibleCompanies
      : (currentCompanyId ? [{ id: currentCompanyId }] : []);

    if (targetCompanies.length === 0) {
      return res.status(200).json({
        success: true,
        data: { counts: { tickets: 0, missions: 0, orders: 0 } },
        counts: { tickets: 0, missions: 0, orders: 0 },
        unconfigured: true,
      });
    }

    const cacheKey = targetCompanies.map(c => c.id).sort().join(',');
    const cached = unreadCountsCache.get(cacheKey);
    const now = Date.now();

    // Serve from cache if fresh
    if (cached && cached.expiresAt > now) {
      return res.json({
        success: true,
        data: cached.counts,
        counts: cached.counts,
        fromCache: true
      });
    }

    let totalUnread = 0;
    let totalMissions = 0;
    let totalOrders = 0;

    await Promise.all(targetCompanies.map(async (comp) => {
      try {
        const turboService = new TurboService(null, comp.id);
        const result = await turboService.getUnreadTicketsCount();
        if (result?.success && result.counts) {
          totalUnread += Number(result.counts.tickets || result.counts.unread || 0);
          totalMissions += Number(result.counts.missions || 0);
          totalOrders += Number(result.counts.orders || 0);
        }
      } catch {}
    }));

    const responseCounts = { tickets: totalUnread, missions: totalMissions, orders: totalOrders };
    unreadCountsCache.set(cacheKey, { counts: responseCounts, expiresAt: now + UNREAD_CACHE_TTL_MS });

    res.json({
      success: true,
      data: { counts: responseCounts },
      counts: responseCounts
    });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error getting unread tickets count:', error);
    // Graceful fallback: return stale cache or zeros
    const currentCompanyId = resolveCompanyId(req);
    const cached = currentCompanyId ? unreadCountsCache.get(currentCompanyId) : null;
    const fallbackCounts = cached?.counts || { tickets: 0, missions: 0, orders: 0 };
    res.status(200).json({
      success: true,
      data: { counts: fallbackCounts },
      counts: fallbackCounts,
      fallback: true
    });
  }
};

const getTicketStatuses = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.json({ success: true, statuses: [] });
    const turboService = new TurboService(null, companyId);
    const result = await turboService.getTicketStatuses();
    res.json(result);
  } catch (error) {
    if (isTurboConfigError(error)) {
      return res.json({ success: true, statuses: [] });
    }
    console.error('❌ [TURBO-CONTROLLER] Error getting ticket statuses:', error);
    res.status(500).json({ success: false, error: error.message, statuses: [] });
  }
};

const getTicketInstructions = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.json({ success: true, instructions: [] });
    const turboService = new TurboService(null, companyId);
    const result = await turboService.getTicketInstructions();
    res.json(result);
  } catch (error) {
    if (isTurboConfigError(error)) {
      return res.json({ success: true, instructions: [] });
    }
    console.error('❌ [TURBO-CONTROLLER] Error getting ticket instructions:', error);
    res.status(500).json({ success: false, error: error.message, instructions: [] });
  }
};

const getCanCreateTicket = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.json({ success: true, canCreate: false, reason: 'يرجى اختيار شركة أولاً' });
    const turboService = new TurboService(null, companyId);
    const result = await turboService.canCreateTicket();
    res.json(result);
  } catch (error) {
    if (isTurboConfigError(error)) {
      return res.json({ success: true, canCreate: false, reason: 'Turbo not configured' });
    }
    console.error('❌ [TURBO-CONTROLLER] Error checking can-create ticket:', error);
    res.status(500).json({ success: false, error: error.message, canCreate: true });
  }
};

const getTotalOpenTickets = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) return res.json({ success: true, total: 0 });
    const turboService = new TurboService(null, companyId);
    const result = await turboService.getTotalOpenTickets();
    res.json(result);
  } catch (error) {
    if (isTurboConfigError(error)) {
      return res.json({ success: true, total: 0 });
    }
    console.error('❌ [TURBO-CONTROLLER] Error getting total open tickets:', error);
    res.status(500).json({ success: false, error: error.message, total: 0 });
  }
};

const rateTicket = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    const { id } = req.params;
    const { rate } = req.body;
    if (!companyId) return res.status(400).json({ success: false, error: 'Company ID is required', message: 'يرجى اختيار شركة أولاً' });
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
  getTurboAccounts,
};
