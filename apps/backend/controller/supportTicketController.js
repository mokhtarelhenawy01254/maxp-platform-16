const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { processImage, isProcessableImage } = require('../utils/imageProcessor');
const tenantContext = require('../services/tenantContext');
const getPrisma = () => getSharedPrismaClient();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/support');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5
  }
});

// Convert category from frontend to Prisma enum
const mapCategory = (category) => {
  const mapping = {
    'technical': 'TECHNICAL',
    'billing': 'BILLING',
    'inquiry': 'INQUIRY',
    'suggestion': 'SUGGESTION',
    'complaint': 'COMPLAINT'
  };
  return mapping[category] || 'INQUIRY';
};

// Convert status from frontend to Prisma enum
const mapStatus = (status) => {
  const mapping = {
    'open': 'OPEN',
    'in_progress': 'IN_PROGRESS',
    'closed': 'CLOSED'
  };
  return mapping[status] || 'OPEN';
};

// Convert from Prisma enum to frontend
const mapCategoryToFrontend = (category) => {
  const mapping = {
    'TECHNICAL': 'technical',
    'BILLING': 'billing',
    'INQUIRY': 'inquiry',
    'SUGGESTION': 'suggestion',
    'COMPLAINT': 'complaint'
  };
  return mapping[category] || 'inquiry';
};

const mapStatusToFrontend = (status) => {
  const mapping = {
    'OPEN': 'open',
    'IN_PROGRESS': 'in_progress',
    'CLOSED': 'closed'
  };
  return mapping[status] || 'open';
};

const mapPriority = (priority) => {
  const mapping = {
    'low': 'LOW',
    'medium': 'MEDIUM',
    'high': 'HIGH',
    'critical': 'CRITICAL'
  };
  return mapping[priority] || 'MEDIUM';
};

const mapPriorityToFrontend = (priority) => {
  const mapping = {
    'LOW': 'low',
    'MEDIUM': 'medium',
    'HIGH': 'high',
    'CRITICAL': 'critical'
  };
  return mapping[priority] || 'medium';
};

// Generate unique ticket ID
const generateTicketId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${timestamp}-${random}`;
};

// Transform ticket for frontend
const transformTicket = (ticket) => {
  return {
    ...ticket,
    category: mapCategoryToFrontend(ticket.category),
    status: mapStatusToFrontend(ticket.status),
    userId: ticket.user ? {
      _id: ticket.user.id,
      name: `${ticket.user.firstName} ${ticket.user.lastName}`,
      email: ticket.user.email
    } : null,
    priority: mapPriorityToFrontend(ticket.priority),
    assignedTo: ticket.assignedUser ? {
      _id: ticket.assignedUser.id,
      name: `${ticket.assignedUser.firstName} ${ticket.assignedUser.lastName}`,
      email: ticket.assignedUser.email
    } : null,
    messages: ticket.SupportMessage || ticket.messages || []
  };
};

// Create new ticket
const createTicket = async (req, res) => {
  try {
    let { subject, category, content } = req.body;
    if (!subject && content) {
      subject = content.trim().slice(0, 50);
    }
    const userId = req.user.id;
    const companyId = req.user.companyId;

    // Create ticket
    const ticket = await getPrisma().supportTicket.create({
      data: {
        ticketId: generateTicketId(),
        subject: subject || 'بدون عنوان',
        description: content,
        category: mapCategory(category),
        status: 'OPEN',
        userId,
        companyId
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    // Create initial message
    await getPrisma().supportMessage.create({
      data: {
        content,
        isFromAdmin: false,
        ticketId: ticket.id,
        senderId: userId
      }
    });

    // Handle file attachments
    if (req.files && req.files.length > 0) {
      const attachmentData = [];
      for (const file of req.files) {
        let currentFilename = file.filename;
        let currentSize = file.size;
        let currentMimetype = file.mimetype;

        if (isProcessableImage(file.mimetype)) {
          try {
            const processed = await processImage(file.path, path.dirname(file.path));
            currentFilename = processed.filename;
            currentSize = processed.size;
            currentMimetype = 'image/webp';
          } catch (procError) {
            console.error(`❌ [IMAGE-PROC] Error processing support ticket image:`, procError.message);
          }
        }

        attachmentData.push({
          filename: currentFilename,
          originalName: file.originalname,
          mimeType: currentMimetype,
          size: currentSize,
          url: `/uploads/support/${currentFilename}`,
          ticketId: ticket.id
        });
      }
      await getPrisma().supportAttachment.createMany({ data: attachmentData });
    }

    res.status(201).json({
      success: true,
      message: 'تم إنشاء التذكرة بنجاح',
      ticket: transformTicket(ticket)
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء التذكرة',
      error: error.message
    });
  }
};

// Get user tickets
const getUserTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, category, page = 1, limit = 10 } = req.query;

    const where = { userId };
    if (status) where.status = mapStatus(status);
    if (category) where.category = mapCategory(category);

    const [tickets, total] = await Promise.all([
      getPrisma().supportTicket.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          SupportMessage: { take: 1, orderBy: { createdAt: 'desc' } }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit)
      }),
      getPrisma().supportTicket.count({ where })
    ]);

    res.json({
      success: true,
      tickets: tickets.map(transformTicket),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب التذاكر',
      error: error.message
    });
  }
};

// Get ticket details
const getTicketDetails = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'SUPER_ADMIN' || req.user.role === 'superadmin';

    const where = isAdmin ? { ticketId } : { ticketId, userId };

    const fetchTicket = async () => {
      return await getPrisma().supportTicket.findFirst({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          assignedUser: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          SupportMessage: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true }
              },
              SupportAttachment: true
            },
            orderBy: { createdAt: 'asc' }
          },
          SupportAttachment: true
        }
      });
    };

    const ticket = isAdmin ? await tenantContext.bypass(fetchTicket) : await fetchTicket();

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'التذكرة غير موجودة'
      });
    }

    // Filter internal messages for non-admin
    const messages = ticket.SupportMessage || [];
    const filteredMessages = messages.filter(msg => {
      if (isAdmin) return true;
      return !msg.isInternal;
    });

    // Transform messages for frontend
    const transformedTicket = {
      ...transformTicket(ticket),
      messages: filteredMessages.map(msg => ({
        _id: msg.id,
        content: msg.content,
        senderType: msg.isFromAdmin ? 'admin' : 'user',
        isInternal: msg.isInternal,
        sender: msg.user ? {
          _id: msg.user.id,
          name: `${msg.user.firstName} ${msg.user.lastName}`,
          email: msg.user.email
        } : null,
        attachments: msg.SupportAttachment,
        createdAt: msg.createdAt
      }))
    };

    res.json({
      success: true,
      ticket: transformedTicket
    });
  } catch (error) {
    console.error('Error fetching ticket details:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تفاصيل التذكرة',
      error: error.message
    });
  }
};

// Add message to ticket
const addMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { content, isInternal } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'SUPER_ADMIN' || req.user.role === 'superadmin';

    const execute = async () => {
      const where = isAdmin ? { ticketId } : { ticketId, userId };

      const ticket = await getPrisma().supportTicket.findFirst({
        where,
        include: {
          user: {
            select: { id: true, companyId: true, firstName: true, lastName: true }
          }
        }
      });
      if (!ticket) {
        return { notFound: true };
      }

      // Create new message
      const isInternalMsg = isAdmin && (isInternal === 'true' || isInternal === true);
      const message = await getPrisma().supportMessage.create({
        data: {
          content,
          isFromAdmin: isAdmin,
          isInternal: isInternalMsg,
          ticketId: ticket.id,
          senderId: userId
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      // Handle file attachments
      if (req.files && req.files.length > 0) {
        const attachmentData = [];
        for (const file of req.files) {
          let currentFilename = file.filename;
          let currentSize = file.size;
          let currentMimetype = file.mimetype;

          if (isProcessableImage(file.mimetype)) {
            try {
              const processed = await processImage(file.path, path.dirname(file.path));
              currentFilename = processed.filename;
              currentSize = processed.size;
              currentMimetype = 'image/webp';
            } catch (procError) {
              console.error(`❌ [IMAGE-PROC] Error processing support ticket image:`, procError.message);
            }
          }

          attachmentData.push({
            filename: currentFilename,
            originalName: file.originalname,
            mimeType: currentMimetype,
            size: currentSize,
            url: `/uploads/support/${currentFilename}`,
            messageId: message.id
          });
        }
        await getPrisma().supportAttachment.createMany({ data: attachmentData });
      }

      // Update ticket status if admin is replying
      if (isAdmin && ticket.status === 'OPEN') {
        await getPrisma().supportTicket.update({
          where: { id: ticket.id },
          data: { status: 'IN_PROGRESS' }
        });
      }

      // (أ) & (ج) إشعار لصاحب التذكرة عند رد فريق الدعم (ممنوع إشعار لنفسه، وممنوع إشعار للرسائل الداخلية)
      if (isAdmin && !isInternalMsg && ticket.userId !== userId) {
        const targetCompanyId = ticket.companyId || ticket.user?.companyId;
        if (targetCompanyId && ticket.userId) {
          const rawSnippet = String(content || '').trim();
          const snippet = rawSnippet.length > 80 ? rawSnippet.slice(0, 77) + '...' : rawSnippet;
          try {
            const { createNotification } = require('../services/notificationService');
            await createNotification({
              companyId: targetCompanyId,
              userId: ticket.userId,
              title: `رد جديد على تذكرتك ${ticket.ticketId}`,
              body: snippet || `تم إضافة رد جديد على تذكرتك ${ticket.ticketId}`,
              type: 'support_ticket',
              metadata: {
                ticketId: ticket.ticketId,
                url: `/support/tickets/${ticket.ticketId}`,
                action: 'new_reply',
              },
            });
          } catch (notifErr) {
            console.warn('[supportTicketController] Failed to send reply notification:', notifErr.message);
          }
        }
      } else if (!isAdmin && ticket.assignedUserId && ticket.assignedUserId !== userId) {
        // إشعار داخلي لفريق الدعم عند رد التاجر
        const targetCompanyId = ticket.companyId || req.user.companyId;
        if (targetCompanyId) {
          const rawSnippet = String(content || '').trim();
          const snippet = rawSnippet.length > 80 ? rawSnippet.slice(0, 77) + '...' : rawSnippet;
          try {
            const { createNotification } = require('../services/notificationService');
            await createNotification({
              companyId: targetCompanyId,
              userId: ticket.assignedUserId,
              title: `رد جديد من العميل على تذكرة ${ticket.ticketId}`,
              body: snippet || `قام العميل بإضافة رد على التذكرة ${ticket.ticketId}`,
              type: 'support_ticket',
              metadata: {
                ticketId: ticket.ticketId,
                url: `/admin/support`,
                action: 'customer_reply',
              },
            });
          } catch (notifErr) {
            console.warn('[supportTicketController] Failed to send support notification:', notifErr.message);
          }
        }
      }

      return { success: true };
    };

    const result = isAdmin ? await tenantContext.bypass(execute) : await execute();
    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: 'التذكرة غير موجودة'
      });
    }

    res.json({
      success: true,
      message: 'تم إضافة الرد بنجاح'
    });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة الرد',
      error: error.message
    });
  }
};

// Update ticket details (Admin only: Status, Priority, AssignedUser)
const updateTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, priority, assignedUserId } = req.body;

    const isAdmin = req.user.role === 'SUPER_ADMIN' || req.user.role === 'superadmin';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'غير مسموح لك بتحديث التذكرة'
      });
    }

    const execute = async () => {
      const ticket = await getPrisma().supportTicket.findFirst({
        where: { ticketId },
        include: {
          user: {
            select: { id: true, companyId: true, firstName: true, lastName: true }
          }
        }
      });
      if (!ticket) {
        return null;
      }

      const updateData = {};
      const targetNewStatus = status ? mapStatus(status) : null;
      const statusChanged = targetNewStatus && targetNewStatus !== ticket.status;

      if (status) {
        updateData.status = targetNewStatus;
        if (targetNewStatus === 'CLOSED') updateData.closedAt = new Date();
      }
      if (priority) updateData.priority = mapPriority(priority);
      if (assignedUserId) updateData.assignedUserId = assignedUserId;

      const updatedTicket = await getPrisma().supportTicket.update({
        where: { id: ticket.id },
        data: updateData,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, companyId: true }
          },
          assignedUser: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      // (ب) تغيير حالة التذكرة → إشعار لصاحب التذكرة: «تذكرتك <ticketId> بقت: <الحالة>»
      if (statusChanged && ticket.userId) {
        const STATUS_ARABIC_LABELS = {
          'OPEN': 'مفتوحة',
          'IN_PROGRESS': 'قيد المعالجة',
          'CLOSED': 'مغلقة'
        };
        const statusLabel = STATUS_ARABIC_LABELS[targetNewStatus] || targetNewStatus;
        const targetCompanyId = ticket.companyId || ticket.user?.companyId || updatedTicket.companyId || updatedTicket.user?.companyId;

        if (targetCompanyId) {
          try {
            const { createNotification } = require('../services/notificationService');
            await createNotification({
              companyId: targetCompanyId,
              userId: ticket.userId,
              title: `تحديث حالة تذكرتك ${ticket.ticketId}`,
              body: `تذكرتك ${ticket.ticketId} بقت: ${statusLabel}`,
              type: 'support_ticket',
              metadata: {
                ticketId: ticket.ticketId,
                status: targetNewStatus,
                url: `/support/tickets/${ticket.ticketId}`,
                action: 'status_changed',
              },
            });
          } catch (notifErr) {
            console.warn('[supportTicketController] Failed to send status change notification:', notifErr.message);
          }
        }
      }

      return updatedTicket;
    };

    const updatedTicket = await tenantContext.bypass(execute);
    if (!updatedTicket) {
      return res.status(404).json({
        success: false,
        message: 'التذكرة غير موجودة'
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث التذكرة بنجاح',
      ticket: transformTicket(updatedTicket)
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث التذكرة',
      error: error.message
    });
  }
};

// Rate ticket (User only, after closure)
const rateTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { rating, feedback } = req.body;
    const userId = req.user.id;

    const ticket = await getPrisma().supportTicket.findFirst({
      where: { ticketId, userId }
    });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'التذكرة غير موجودة'
      });
    }

    if (ticket.status !== 'CLOSED') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تقييم التذكرة إلا بعد إغلاقها'
      });
    }

    const updatedTicket = await getPrisma().supportTicket.update({
      where: { id: ticket.id },
      data: { rating, feedback: feedback || null }
    });

    res.json({
      success: true,
      message: 'تم تقييم الخدمة بنجاح',
      ticket: transformTicket(updatedTicket)
    });
  } catch (error) {
    console.error('Error rating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تقييم الخدمة',
      error: error.message
    });
  }
};

// Get all tickets (Admin only)
const getAllTickets = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'SUPER_ADMIN' || req.user.role === 'superadmin';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'غير مسموح لك بعرض جميع التذاكر'
      });
    }

    const { status, category, page = 1, limit = 10, search, companyId } = req.query;

    const where = {};
    if (status) where.status = mapStatus(status);
    if (category) where.category = mapCategory(category);
    if (companyId) where.companyId = companyId;
    if (search) {
      where.OR = [
        { ticketId: { contains: search } },
        { subject: { contains: search } }
      ];
    }

    const baseWhereForStats = { ...where };
    delete baseWhereForStats.status;

    const execute = async () => {
      return await Promise.all([
        getPrisma().supportTicket.findMany({
          where,
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit),
          skip: (parseInt(page) - 1) * parseInt(limit)
        }),
        getPrisma().supportTicket.count({ where }),
        getPrisma().supportTicket.count({ where: { ...baseWhereForStats, status: 'OPEN' } }),
        getPrisma().supportTicket.count({ where: { ...baseWhereForStats, status: 'IN_PROGRESS' } }),
        getPrisma().supportTicket.count({ where: { ...baseWhereForStats, status: 'CLOSED' } })
      ]);
    };

    const [tickets, total, openCount, inProgressCount, closedCount] = isAdmin
      ? await tenantContext.bypass(execute)
      : await execute();

    // Format stats for frontend
    const stats = [
      { _id: 'open', count: openCount },
      { _id: 'in_progress', count: inProgressCount },
      { _id: 'closed', count: closedCount }
    ];

    res.json({
      success: true,
      tickets: tickets.map(transformTicket),
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب التذاكر',
      error: error.message
    });
  }
};


// Get specific user tickets (Admin History)
const getUserTicketHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { excludeTicketId } = req.query;

    const isAdmin = req.user.role === 'SUPER_ADMIN' || req.user.role === 'superadmin';
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const where = { userId };
    if (excludeTicketId) {
      where.ticketId = { not: excludeTicketId };
    }

    const execute = async () => {
      return await getPrisma().supportTicket.findMany({
        where,
        select: {
          id: true,
          ticketId: true,
          subject: true,
          status: true,
          createdAt: true,
          priority: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
    };

    const tickets = isAdmin ? await tenantContext.bypass(execute) : await execute();

    res.json({
      success: true,
      tickets: tickets.map(t => ({
        ...t,
        status: mapStatusToFrontend(t.status),
        priority: mapPriorityToFrontend(t.priority)
      }))
    });
  } catch (error) {
    console.error('Error fetching user history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user history' });
  }
};

// Get list of staff users for assignment
const getSupportStaff = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'SUPER_ADMIN' || req.user.role === 'superadmin';
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    console.log(' [DEBUG] getSupportStaff - isAdmin:', isAdmin);
    console.log(' [DEBUG] req.user:', req.user);
    const prisma = getPrisma();
    if (!prisma) {
      console.error(' [DEBUG] Prisma client is undefined!');
      throw new Error('Prisma client is undefined');
    }
    console.log(' [DEBUG] Prisma user model:', !!prisma.user);

    const execute = async () => {
      return await getPrisma().user.findMany({
        where: {
          role: { in: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'AGENT'] }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true
        }
      });
    };

    const staff = isAdmin ? await tenantContext.bypass(execute) : await execute();

    res.json({
      success: true,
      staff: staff.map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        role: u.role
      }))
    });
  } catch (error) {
    console.error('Error fetching staff (detailed):', error);
    console.error(error.stack);
    res.status(500).json({ success: false, message: 'Failed to fetch staff list', error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch staff' });
  }
};

module.exports = {
  upload,
  createTicket,
  getUserTickets,
  getTicketDetails,
  addMessage,
  updateTicket,
  updateTicketStatus: updateTicket, // Backward compatibility alias
  rateTicket,
  getAllTickets,
  getUserTicketHistory,
  getSupportStaff
};
