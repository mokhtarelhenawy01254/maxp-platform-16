const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const envConfig = require('../config/environment');
const redisConfig = require('../config/redis');
const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const { getJwtSecret } = require('../utils/jwtSecret');
const { canViewConversation } = require('../middleware/rbacMiddleware');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
    this.userSockets = new Map(); // socketId -> {userId, userName, companyId, role}
    this.typingUsers = new Map(); // conversationId -> Set of userIds
    this.companyUsers = new Map(); // companyId -> Set of userIds
    this.companyRooms = new Map(); // companyId -> Set of socketIds
    this.securityLog = new Map(); // Store security events
    this.pubClient = null;
    this.subClient = null;
    this.securityLogCleanupInterval = null;
  }

  initialize(server) {
    // 1. إعداد Redis Adapter
    try {
      // Skip Redis if not configured
      if (!process.env.REDIS_URL) {
        console.log('⚠️ [SOCKET] Redis disabled - using memory adapter');
        this.pubClient = null;
        this.subClient = null;
        // Continue without Redis adapter
      } else {
        this.pubClient = redisConfig.url ? new Redis(redisConfig.url, redisConfig) : new Redis(redisConfig);
        this.subClient = this.pubClient.duplicate();
        console.log('✅ [SOCKET] Redis Adapter initialized successfully');
      }
    } catch (error) {
      console.error('❌ [SOCKET] Failed to initialize Redis Adapter:', error.message);
      // Fallback to memory adapter automatically if Redis fails
    }

    this.io = new Server(server, {
      cors: {
        origin: (origin, callback) => {
          // Non-browser clients (workers, AI service, server-to-server) send no Origin header — allow them.
          if (!origin) return callback(null, true);
          envConfig.corsOrigins(origin, (err, allowed) => {
            if (allowed) return callback(null, true);
            console.warn(`🚫 [SOCKET-CORS] Blocked origin: ${origin}`);
            return callback(new Error('Origin not allowed by CORS'), false);
          });
        },
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ["*"]
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
      adapter: this.pubClient && this.subClient ? createAdapter(this.pubClient, this.subClient) : undefined
    });

    // Add authentication middleware with development fallback
    this.io.use(this.authenticateSocket.bind(this));
    this.setupEventHandlers();
    //console.log('✅ Socket.IO server initialized (AUTH TEMPORARILY DISABLED FOR DEBUGGING)');
  }

  getIO() {
    if (this.io) return this.io;
    if (this.emitter) return this.emitter;

    // Initialize Redis Emitter for worker processes that don't have an HTTP server
    if (process.env.REDIS_URL && redisConfig) {
      try {
        const { Emitter } = require('@socket.io/redis-emitter');
        const Redis = require('ioredis');
        const pubClient = redisConfig.url ? new Redis(redisConfig.url, redisConfig) : new Redis(redisConfig);
        this.emitter = new Emitter(pubClient);
        console.log('✅ [SOCKET] Redis Emitter initialized for worker process');
        return this.emitter;
      } catch (error) {
        console.error('❌ [SOCKET] Failed to initialize Redis Emitter:', error.message);
      }
    }

    return null;
  }

  // JWT Authentication middleware for Socket.IO
  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      // Allow mock tokens ONLY in explicit development mode (allow-list, no fail-open)
      if (process.env.NODE_ENV === 'development' &&
          (!token || token === 'mock-access-token' || token.includes('mock-signature'))) {
        socket.userId = 'dev-user';
        socket.companyId = 'dev-company';
        socket.userName = 'Developer';
        socket.role = 'COMPANY_ADMIN';

        console.log(`✅ [SOCKET-AUTH] Mock authentication for socket ${socket.id}`);
        return next();
      }

      const decoded = jwt.verify(token, getJwtSecret());

      // Verify user exists and is active
      const user = await safeQuery(async () => {
        return await getSharedPrismaClient().user.findUnique({
          where: { id: decoded.userId },
          include: { company: true }
        });
      }, 3);

      // ⚡ FIX: Prioritize companyId and role from token for session isolation
      const activeCompanyId = decoded.companyId || user.companyId;
      const activeRole = decoded.role || user.role;

      // 🛡️ SECURITY Check: Verify the user still belongs to this company (not a Zombie session)
      // Super Admin is exempt from this check
      // ponytail: always check membership, not just on cross-company access
      if (user.role !== 'SUPER_ADMIN') {
        const userCompany = await safeQuery(async () => {
          return await getSharedPrismaClient().userCompany.findUnique({
            where: {
              userId_companyId: {
                userId: user.id,
                companyId: activeCompanyId
              }
            }
          });
        }, 3);

        if (!userCompany || !userCompany.isActive) {
          // 🔄 Legacy fallback: match HTTP auth middleware behavior
          // Allows users with ZERO active userCompany records to access their primary company
          const activeMembershipCount = await safeQuery(async () => {
            return await getSharedPrismaClient().userCompany.count({
              where: {
                userId: user.id,
                isActive: true
              }
            });
          }, 3);

          const isLegacyPrimaryAccess = activeMembershipCount === 0 && activeCompanyId === user.companyId;

          if (!isLegacyPrimaryAccess) {
            console.warn(`❌ [SOCKET-AUTH] Access revoked for user ${user.email} to company ${activeCompanyId}`);
            return next(new Error('Access to the requested company has been revoked'));
          }
          console.log(`✅ [SOCKET-AUTH] Legacy primary company access allowed for user ${user.email}`);
        }
      }

      // Store user info in socket
      socket.userId = user.id;
      socket.companyId = activeCompanyId;
      socket.userRole = activeRole;
      socket.userName = `${user.firstName} ${user.lastName}`;

      // 🖥️ [DEVICE-ISOLATION] Resolve device type for audio/notification isolation
      const deviceFingerprint =
        socket.handshake.auth?.deviceFingerprint ||
        socket.handshake.query?.deviceFingerprint ||
        socket.handshake.headers?.['x-device-fingerprint'];
      let deviceType = 'PERSONAL';
      if (deviceFingerprint && activeCompanyId) {
        try {
          const device = await getSharedPrismaClient().userDevice.findUnique({
            where: {
              companyId_fingerprint: {
                companyId: activeCompanyId,
                fingerprint: String(deviceFingerprint).trim(),
              },
            },
            select: { deviceType: true, isApproved: true },
          });
          if (device) {
            deviceType = device.deviceType || 'PERSONAL';
          }
        } catch {}
      }
      socket.deviceType = deviceType;
      socket.deviceFingerprint = deviceFingerprint || null;

      //console.log(`✅ [SOCKET-AUTH] Authenticated socket ${socket.id} for user ${user.email} (Active Company: ${activeCompanyId}, Device: ${deviceType})`);
      next();

    } catch (error) {
      console.error(`❌ [SOCKET-AUTH] Authentication failed for socket ${socket.id}:`, error.message);
      next(new Error('Authentication failed'));
    }
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      //console.log(`🔌 User connected: ${socket.id}`);

      // Note: User authentication happens in authenticateSocket middleware
      // If authentication succeeded, socket.userId, socket.companyId etc. should be set

      // Only auto-join if user is authenticated
      if (socket.userId && socket.companyId) {
        // Auto-join user to their company room
        socket.join(`company_${socket.companyId}`);
        socket.join(`user_${socket.userId}`);
        socket.join(`user:${socket.userId}`);

        // 🖥️ [DEVICE-ISOLATION] Join device-specific rooms
        if (socket.deviceType === 'OFFICE') {
          socket.join(`company_${socket.companyId}_office`);
          socket.join(`user_${socket.userId}_office`);
        } else {
          socket.join(`company_${socket.companyId}_personal`);
          socket.join(`user_${socket.userId}_personal`);
        }

        this.connectedUsers.set(socket.userId, socket.id);
        this.userSockets.set(socket.id, {
          userId: socket.userId,
          userName: socket.userName,
          companyId: socket.companyId,
          role: socket.userRole,
          connectedAt: new Date().toISOString()
        });

        // Track company users
        if (!this.companyRooms.has(socket.companyId)) {
          this.companyRooms.set(socket.companyId, new Set());
        }
        this.companyRooms.get(socket.companyId).add(socket.id);

        this.logSecurityEvent('user_connected', {
          socketId: socket.id,
          userId: socket.userId,
          companyId: socket.companyId,
          timestamp: new Date()
        });
      }

      // معالج انضمام المستخدم
      socket.on('user_join', (data) => {
        this.handleUserJoin(socket, data);
      });

      // 🚀 معالج الانضمام لغرفة الشركة (للاستيراد في الخلفية)
      socket.on('join_company_room', async (data) => {
        if (!data || !data.companyId) return;
        if (!socket.userId || !socket.companyId) {
          socket.emit('error', { message: 'Socket not authenticated' });
          this.logSecurityEvent('unauthorized_company_room_join', {
            socketId: socket.id,
            companyId: data.companyId,
            timestamp: new Date()
          });
          return;
        }

        if (data.companyId === socket.companyId) {
          socket.join(`company_${data.companyId}`);
          return;
        }

        try {
          const membership = await safeQuery(async () => {
            return await getSharedPrismaClient().userCompany.findUnique({
              where: {
                userId_companyId: {
                  userId: socket.userId,
                  companyId: data.companyId
                }
              },
              select: { isActive: true }
            });
          }, 3);

          if (!membership || !membership.isActive) {
            socket.emit('error', { message: 'Access denied to this company room' });
            this.logSecurityEvent('unauthorized_company_room_join', {
              socketId: socket.id,
              userId: socket.userId,
              companyId: data.companyId,
              timestamp: new Date()
            });
            return;
          }

          socket.join(`company_${data.companyId}`);
        } catch (err) {
          console.error(`❌ [SOCKET] join_company_room check failed for socket ${socket.id}:`, err.message);
          socket.emit('error', { message: 'Failed to join company room' });
        }
      });

      // معالج إرسال الرسائل
      socket.on('send_message', (data) => {
        this.handleSendMessage(socket, data);
      });
      socket.on('message:send', (data) => {
        this.handleSendMessage(socket, data);
      });

      // معالج بدء الكتابة
      socket.on('start_typing', (data) => {
        this.handleStartTyping(socket, data);
      });
      socket.on('typing:start', (data) => {
        this.handleStartTyping(socket, data);
      });

      // معالج إيقاف الكتابة
      socket.on('stop_typing', (data) => {
        this.handleStopTyping(socket, data);
      });
      socket.on('typing:stop', (data) => {
        this.handleStopTyping(socket, data);
      });

      // معالج تمييز الرسائل كمقروءة
      socket.on('mark_as_read', (data) => {
        this.handleMarkAsRead(socket, data);
      });
      socket.on('message:read', (data) => {
        this.handleMarkAsRead(socket, data);
      });

      // معالج انضمام لمحادثة معينة
      socket.on('join_conversation', (data) => {
        this.handleJoinConversation(socket, data);
      });
      socket.on('join:conversation', (data) => {
        this.handleJoinConversation(socket, typeof data === 'string' ? { conversationId: data } : data);
      });

      // معالج مغادرة محادثة
      socket.on('leave_conversation', (data) => {
        this.handleLeaveConversation(socket, data);
      });
      socket.on('leave:conversation', (data) => {
        this.handleLeaveConversation(socket, typeof data === 'string' ? { conversationId: data } : data);
      });

      // معالج قطع الاتصال
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // معالج الأخطاء
      socket.on('error', (error) => {
        console.error(`❌ Socket error for ${socket.id}:`, error);
      });
    });
  }

  // انضمام المستخدم (enhanced with security)
  handleUserJoin(socket, data) {
    // If socket is authenticated via middleware, use that data
    // Otherwise, try to use data from the event (for backward compatibility)
    if (!socket.userId || !socket.companyId) {
      // Try to extract from data if provided
      if (data && data.userId && data.companyId) {
        socket.userId = data.userId;
        socket.companyId = data.companyId;
        socket.userName = data.userName || 'User';
      } else {
        console.warn('⚠️ [SOCKET-JOIN] No user data found for Socket.IO connection', {
          socketId: socket.id,
          hasSocketUserId: !!socket.userId,
          hasSocketCompanyId: !!socket.companyId,
          dataProvided: !!data
        });
        socket.emit('error', { message: 'Socket not authenticated - please reconnect' });
        this.logSecurityEvent('unauthorized_join_attempt', {
          socketId: socket.id,
          data,
          timestamp: new Date()
        });
        return;
      }
    }

    const { userId = socket.userId, userName = socket.userName, companyId = socket.companyId } = data || {};

    // Security check: Verify user ID matches authenticated socket (only if auth is enabled)
    if (socket.userId && userId !== socket.userId) {
      socket.emit('error', { message: 'User ID mismatch' });
      this.logSecurityEvent('user_id_mismatch', {
        socketId: socket.id,
        providedUserId: userId,
        actualUserId: socket.userId,
        timestamp: new Date()
      });
      return;
    }

    // Security check: Verify company ID matches authenticated socket (only if auth is enabled)
    if (socket.companyId && companyId !== socket.companyId) {
      socket.emit('error', { message: 'Company ID mismatch' });
      this.logSecurityEvent('company_id_mismatch', {
        socketId: socket.id,
        providedCompanyId: companyId,
        actualCompanyId: socket.companyId,
        timestamp: new Date()
      });
      return;
    }

    // تسجيل المستخدم
    this.connectedUsers.set(userId, socket.id);
    this.userSockets.set(socket.id, {
      userId: socket.userId,
      userName: socket.userName,
      companyId: socket.companyId,
      role: socket.userRole,
      connectedAt: new Date().toISOString()
    });

    // انضمام لغرف المستخدم والشركة
    socket.join(`user_${userId}`);
    socket.join(`user:${userId}`);
    socket.join(`company_${companyId}`);

    // 🔥 CRITICAL: Track company users for direct messaging fallback
    if (!this.companyRooms.has(companyId)) {
      this.companyRooms.set(companyId, new Set());
    }
    this.companyRooms.get(companyId).add(socket.id);

    console.log(`✅ [SOCKET-JOIN] User ${socket.userName} (${userId}) joined company ${companyId} room successfully`);
    //console.log(`📊 [SOCKET-JOIN] Company ${companyId} now has ${this.companyRooms.get(companyId).size} connected users`);

    // إشعار المستخدمين الآخرين في نفس الشركة فقط
        socket.to(`company_${companyId}`).emit('user_online', {
          userId,
          userName: socket.userName,
          companyId,
          timestamp: new Date()
        });

        // إرسال قائمة المستخدمين المتصلين من نفس الشركة فقط
        const companyUsers = this.getCompanyUsers(companyId);
        socket.emit('online_users', {
          users: companyUsers
        });

        // 📡 Emit current WhatsApp session statuses to the newly joined user
        try {
          const WhatsAppManager = require('./whatsapp/WhatsAppManager');
          if (typeof WhatsAppManager.emitSessionStatusesForCompany === 'function') {
            WhatsAppManager.emitSessionStatusesForCompany(companyId);
            console.log(`📡 [SOCKET] Emitted WhatsApp session statuses for company ${companyId} to newly joined user`);
          }
        } catch (waErr) {
          // WhatsAppManager might not be loaded yet - that's OK
          console.log(`⚠️ [SOCKET] Could not emit WhatsApp statuses: ${waErr.message}`);
        }

    this.logSecurityEvent('user_joined', {
      socketId: socket.id,
      userId,
      companyId,
      timestamp: new Date()
    });
  }

  // إرسال رسالة (enhanced with company isolation)
  async handleSendMessage(socket, data) {
    try {
      const { conversationId, content, type = 'text', tempId } = data;

      // Verify socket authentication
      if (!socket.userId || !socket.companyId) {
        socket.emit('error', { message: 'Socket not authenticated' });
        this.logSecurityEvent('unauthorized_message_attempt', {
          socketId: socket.id,
          conversationId,
          timestamp: new Date()
        });
        return;
      }

      // Verify conversation belongs to user's company
      const conversation = await safeQuery(async () => {
        return await getSharedPrismaClient().conversation.findFirst({
          where: {
            id: conversationId,
            companyId: socket.companyId
          },
          select: { id: true, companyId: true }
        });
      }, 3);

      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found or access denied' });
        this.logSecurityEvent('unauthorized_conversation_access', {
          socketId: socket.id,
          userId: socket.userId,
          companyId: socket.companyId,
          conversationId,
          timestamp: new Date()
        });
        return;
      }

      // إنشاء الرسالة
      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId,
        content,
        type,
        senderId: socket.userId,
        senderName: socket.userName,
        timestamp: new Date(),
        isFromCustomer: false,
        status: 'sent',
        companyId: socket.companyId
      };

      // إرسال للمستخدمين في المحادثة (من نفس الشركة فقط)
      socket.to(`conversation_${conversationId}`).emit('new_message', message);
      socket.to(`conversation_${conversationId}`).emit('message:new', message);
      socket.to(`conversation:${conversationId}`).emit('new_message', message);
      socket.to(`conversation:${conversationId}`).emit('message:new', message);

      // إرسال للمرسل أيضاً
      socket.emit('new_message', message);
      socket.emit('message:new', message);

      // تأكيد الإرسال للمرسل
      socket.emit('message_sent', {
        tempId,
        message
      });

      //console.log(`📨 Message sent in conversation ${conversationId} by company ${socket.companyId}`);

      this.logSecurityEvent('message_sent', {
        socketId: socket.id,
        userId: socket.userId,
        companyId: socket.companyId,
        conversationId,
        messageId: message.id,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error handling send message:', error);
      socket.emit('error', { message: 'Failed to send message' });
      this.logSecurityEvent('message_send_error', {
        socketId: socket.id,
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  // بدء الكتابة
  handleStartTyping(socket, data) {
    const { conversationId } = data;
    const userInfo = this.userSockets.get(socket.id);

    if (!userInfo || !conversationId) return;

    // إضافة المستخدم لقائمة الكاتبين
    if (!this.typingUsers.has(conversationId)) {
      this.typingUsers.set(conversationId, new Set());
    }
    this.typingUsers.get(conversationId).add(userInfo.userId);

    // إشعار المستخدمين الآخرين في المحادثة
    socket.to(`conversation_${conversationId}`).emit('user_typing', {
      userId: userInfo.userId,
      userName: userInfo.userName,
      conversationId
    });
    socket.to(`conversation:${conversationId}`).emit('typing:start', {
      userId: userInfo.userId,
      userName: userInfo.userName,
      conversationId
    });

    //console.log(`✍️ User ${userInfo.userName} started typing in ${conversationId}`);
  }

  // إيقاف الكتابة
  handleStopTyping(socket, data) {
    const { conversationId } = data;
    const userInfo = this.userSockets.get(socket.id);

    if (!userInfo || !conversationId) return;

    // إزالة المستخدم من قائمة الكاتبين
    if (this.typingUsers.has(conversationId)) {
      this.typingUsers.get(conversationId).delete(userInfo.userId);

      // حذف المحادثة من القائمة إذا لم يعد أحد يكتب
      if (this.typingUsers.get(conversationId).size === 0) {
        this.typingUsers.delete(conversationId);
      }
    }

    // إشعار المستخدمين الآخرين
    socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
      userId: userInfo.userId,
      conversationId
    });
    socket.to(`conversation:${conversationId}`).emit('typing:stop', {
      userId: userInfo.userId,
      conversationId
    });

    //console.log(`🛑 User ${userInfo.userName} stopped typing in ${conversationId}`);
  }

  // تمييز الرسائل كمقروءة
  handleMarkAsRead(socket, data) {
    const { conversationId, messageId } = data;
    const userInfo = this.userSockets.get(socket.id);

    if (!userInfo) return;

    // إشعار بقراءة الرسالة
    socket.to(`conversation_${conversationId}`).emit('message_read', {
      messageId,
      userId: userInfo.userId,
      timestamp: new Date()
    });
    socket.to(`conversation:${conversationId}`).emit('message:read', {
      messageId,
      userId: userInfo.userId,
      timestamp: new Date()
    });

    //console.log(`👁️ Message ${messageId} marked as read by ${userInfo.userName}`);
  }

  // انضمام لمحادثة (enhanced with company verification)
  async handleJoinConversation(socket, data) {
    const { conversationId } = data;

    if (!socket.userId || !socket.companyId || !conversationId) {
      socket.emit('error', { message: 'Missing authentication or conversation ID' });
      return;
    }

    try {
      // Verify conversation belongs to user's company
      const conversation = await safeQuery(async () => {
        return await getSharedPrismaClient().conversation.findFirst({
          where: {
            id: conversationId,
            companyId: socket.companyId
          },
          select: { id: true, companyId: true }
        });
      }, 3);

      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found or access denied' });
        this.logSecurityEvent('unauthorized_conversation_join', {
          socketId: socket.id,
          userId: socket.userId,
          companyId: socket.companyId,
          conversationId,
          timestamp: new Date()
        });
        return;
      }

      const hasAccess = await canViewConversation(
        getSharedPrismaClient(),
        socket.userId,
        socket.companyId,
        conversationId
      );

      if (!hasAccess) {
        socket.emit('error', { message: 'Conversation access denied' });
        this.logSecurityEvent('conversation_join_denied', {
          socketId: socket.id,
          userId: socket.userId,
          companyId: socket.companyId,
          conversationId,
          timestamp: new Date()
        });
        return;
      }

      socket.join(`conversation_${conversationId}`);
      socket.join(`conversation:${conversationId}`);
      //console.log(`🏠 User ${socket.userName} joined conversation ${conversationId} (Company: ${socket.companyId})`);

      this.logSecurityEvent('conversation_joined', {
        socketId: socket.id,
        userId: socket.userId,
        companyId: socket.companyId,
        conversationId,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error joining conversation:', error);
      socket.emit('error', { message: 'Failed to join conversation' });
    }
  }

  // مغادرة محادثة
  handleLeaveConversation(socket, data) {
    const { conversationId } = data;
    const userInfo = this.userSockets.get(socket.id);

    if (!userInfo || !conversationId) return;

    socket.leave(`conversation_${conversationId}`);
    socket.leave(`conversation:${conversationId}`);

    // إيقاف الكتابة عند المغادرة
    this.handleStopTyping(socket, { conversationId });

    //console.log(`🚪 User ${userInfo.userName} left conversation ${conversationId}`);
  }

  // قطع الاتصال (enhanced with company cleanup and multi-socket awareness)
  handleDisconnect(socket) {
    const userInfo = this.userSockets.get(socket.id);

    if (userInfo) {
      const { userId, userName, companyId } = userInfo;

      // إزالة هذا المقبس المحدد
      this.userSockets.delete(socket.id);

      // التحقق مما إذا كان للمستخدم أي مقابس أخرى نشطة (مثل تبويب آخر أو خدمة أخرى)
      let remainingSocketId = null;
      for (const [sId, info] of this.userSockets.entries()) {
        if (info.userId === userId) {
          remainingSocketId = sId;
          break;
        }
      }

      if (remainingSocketId) {
        // المستخدم لا يزال متصلاً عبر مقبس آخر
        this.connectedUsers.set(userId, remainingSocketId);
      } else {
        // انتهت جميع اتصالات المستخدم بالكامل
        this.connectedUsers.delete(userId);
      }

      // إزالة من غرفة الشركة
      if (this.companyRooms.has(companyId)) {
        this.companyRooms.get(companyId).delete(socket.id);
        if (this.companyRooms.get(companyId).size === 0) {
          this.companyRooms.delete(companyId);
        }
      }

      // إشعار المستخدمين الآخرين في نفس الشركة فقط إذا لم يعد للمستخدم أي اتصال آخر
      if (!remainingSocketId) {
        // إزالة من جميع محادثات الكتابة
        for (const [conversationId, typingSet] of this.typingUsers.entries()) {
          if (typingSet.has(userId)) {
            typingSet.delete(userId);
            socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
              userId,
              conversationId
            });
          }
        }

        socket.to(`company_${companyId}`).emit('user_offline', {
          userId,
          userName,
          timestamp: new Date()
        });
      }

      this.logSecurityEvent('user_disconnected', {
        socketId: socket.id,
        userId,
        companyId,
        isFullyOffline: !remainingSocketId,
        timestamp: new Date()
      });
    } else {
      //console.log(`🔌 Anonymous user ${socket.id} disconnected`);
    }
  }

  // إرسال رسالة لمستخدم معين
  sendToUser(userId, event, data) {
    const io = this.getIO();
    if (!io || !userId) return false;

    io.to(`user_${userId}`).emit(event, data);
    return true;
  }

  // إرسال رسالة لمحادثة معينة
  sendToConversation(conversationId, event, data) {
    const io = this.getIO();
    if (io) {
      io.to(`conversation_${conversationId}`).emit(event, data);
      io.to(`conversation:${conversationId}`).emit(event, data);
    }
  }

  // إرسال إشعار عام (إلى جميع المستخدمين المتصلين)
  broadcast(event, data) {
    const io = this.getIO();
    if (io) {
      io.to('company_*').emit(event, data); // with emittor we can't emit completely globally without rooms safely if not in main thread, but normally we just broadcast
    }
  }

  // الحصول على المستخدمين المتصلين
  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  // الحصول على عدد المستخدمين المتصلين
  getOnlineCount() {
    return this.connectedUsers.size;
  }

  // التحقق من اتصال مستخدم
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  // Get users online in a specific company
  getCompanyUsers(companyId) {
    const companySocketIds = this.companyRooms.get(companyId) || new Set();
    const companyUsers = [];

    for (const socketId of companySocketIds) {
      const userInfo = this.userSockets.get(socketId);
      if (userInfo) {
        companyUsers.push(userInfo.userId);
      }
    }

    return companyUsers;
  }

  // Get detailed online users for a specific company (deduplicated by userId)
  getCompanyOnlineUsers(companyId) {
    const companySocketIds = this.companyRooms.get(companyId) || new Set();
    const userMap = new Map();

    for (const socketId of companySocketIds) {
      const userInfo = this.userSockets.get(socketId);
      if (userInfo && userInfo.userId) {
        // Keep the earliest connectedAt across multiple sockets per user
        const existing = userMap.get(userInfo.userId);
        if (!existing || (userInfo.connectedAt && existing.connectedAt > userInfo.connectedAt)) {
          userMap.set(userInfo.userId, {
            userId: userInfo.userId,
            userName: userInfo.userName,
            role: userInfo.role || null,
            connectedAt: userInfo.connectedAt || new Date().toISOString()
          });
        }
      }
    }

    return Array.from(userMap.values());
  }

  // Send message to specific company
  sendToCompany(companyId, event, data) {
    const io = this.getIO();
    if (io) {
      io.to(`company_${companyId}`).emit(event, data);
      //console.log(`📤 [COMPANY-BROADCAST] Sent ${event} to company ${companyId}`);
    }
  }

  // Enhanced conversation message with company isolation
  sendToConversationSecure(conversationId, companyId, event, data) {
    // Only send to users in the specific company's conversation room
    const room = `conversation_${conversationId}`;
    const companyRoom = `company_${companyId}`;

    // Get intersection of conversation members and company members
    const conversationSockets = this.io.sockets.adapter.rooms.get(room) || new Set();
    const companySockets = this.io.sockets.adapter.rooms.get(companyRoom) || new Set();

    for (const socketId of conversationSockets) {
      if (companySockets.has(socketId)) {
        this.io.to(socketId).emit(event, data);
      }
    }

    //console.log(`📤 [SECURE-CONVERSATION] Sent ${event} to conversation ${conversationId} (Company: ${companyId})`);
  }

  // Emit new conversation event to company users
  emitNewConversation(companyId, conversation) {
    const io = this.getIO();
    if (!io) {
      console.error('❌ [SOCKET] IO instance / Emitter not available');
      return;
    }

    console.log(`📤 [NEW-CONVERSATION] Attempting to send to company ${companyId}:`, conversation.id);

    const companyRoomName = `company_${companyId}`;
    const localRooms = this.io?.sockets?.adapter?.rooms;
    const companyRoom = localRooms?.get(companyRoomName);
    const companySocketIds = this.companyRooms.get(companyId);

    console.log(`📊 [NEW-CONVERSATION] Company room status:`, {
      companyId,
      roomExists: !!companyRoom,
      roomSize: companyRoom?.size || 0,
      trackedSockets: companySocketIds?.size || 0,
      emitterMode: !this.io
    });

    // Method 1: Send to company room (standard approach)
    io.to(companyRoomName).emit('conversation:new', conversation);
    console.log(`📤 [NEW-CONVERSATION] Sent to ${companyRoomName} room`);

    // Log room info for debugging
    console.log(`📊 [NEW-CONVERSATION] Room size: ${companyRoom?.size || 0}, Tracked sockets: ${companySocketIds?.size || 0}`);

    // Method 2: Direct delivery - REMOVED to prevent duplicate events
    // (Sockets in room would receive twice: once from room, once from direct)

    // Method 3: Broadcast - REMOVED to prevent duplicate events

    console.log(`✅ [NEW-CONVERSATION] Event sent successfully via company room`);
  }

  // إرسال أي event للشركة (دالة عامة)
  emitToCompany(companyId, eventName, data) {
    const io = this.getIO();
    if (!io) {
      console.error('❌ [SOCKET] IO instance / Emitter not available');
      return;
    }

    if (!companyId) {
      console.error('❌ [SOCKET] Company ID is required');
      return;
    }

    console.log(`🔌 [SOCKET] Emitting '${eventName}' to company ${companyId}`);
    io.to(`company_${companyId}`).emit(eventName, data);
  }

  // 🖥️ إرسال التنبيهات الصوتية الحية والإنذارات حصراً لأجهزة المكتب المعتمدة
  emitToOfficeDevices(companyId, eventName, data) {
    const io = this.getIO();
    if (!io || !companyId) return;
    io.to(`company_${companyId}_office`).emit(eventName, data);
  }


  // Security logging
  logSecurityEvent(eventType, details) {
    const logEntry = {
      type: eventType,
      timestamp: new Date(),
      ...details
    };

    if (!this.securityLog.has(eventType)) {
      this.securityLog.set(eventType, []);
    }

    this.securityLog.get(eventType).push(logEntry);

    // Keep only last 100 entries per event type
    if (this.securityLog.get(eventType).length > 100) {
      this.securityLog.get(eventType).shift();
    }

    //console.log(`🔒 [SOCKET-SECURITY] ${eventType}:`, details);
  }

  // Get security logs
  getSecurityLogs(eventType = null) {
    if (eventType) {
      return this.securityLog.get(eventType) || [];
    }
    return Object.fromEntries(this.securityLog);
  }

  // Clear old security logs
  clearOldSecurityLogs() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    for (const [eventType, logs] of this.securityLog.entries()) {
      const filteredLogs = logs.filter(log => log.timestamp > oneHourAgo);
      this.securityLog.set(eventType, filteredLogs);
    }
  }

  ensureSecurityLogCleanupInterval() {
    if (this.securityLogCleanupInterval) {
      return this.securityLogCleanupInterval;
    }

    this.securityLogCleanupInterval = setInterval(() => {
      this.clearOldSecurityLogs();
    }, 60 * 60 * 1000);

    // Housekeeping should not keep short-lived processes like tests alive.
    if (typeof this.securityLogCleanupInterval.unref === 'function') {
      this.securityLogCleanupInterval.unref();
    }

    return this.securityLogCleanupInterval;
  }
}

// إنشاء instance واحد
const socketService = new SocketService();

socketService.ensureSecurityLogCleanupInterval();

module.exports = socketService;

