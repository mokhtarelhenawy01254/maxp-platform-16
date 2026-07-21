/**
 * Turbo Webhook Routes
 * استقبال تحديثات من Turbo
 */

const express = require('express');
const router = express.Router();
const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');

/**
 * POST /api/turbo/webhook
 * استقبال webhooks من Turbo
 */
router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    const authHeader = req.headers.authorization || req.headers['authorization'] || req.headers['Authorization'];
    const webhookToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : null;
    
    console.log('📨 [TURBO-WEBHOOK] Received webhook:', JSON.stringify(webhookData, null, 2));
    console.log('🔑 [TURBO-WEBHOOK] Webhook token:', webhookToken ? `Token: ${webhookToken.substring(0, 4)}...` : 'No token');
    console.log('🔑 [TURBO-WEBHOOK] Auth header:', authHeader ? 'Present' : 'Missing');

    // التحقق من TOKEN إذا كان موجوداً
    const prisma = getSharedPrismaClient();
    let companyId = null;
    
    if (webhookToken) {
      console.log('🔍 [TURBO-WEBHOOK] Validating webhook token...');
      const company = await safeQuery(async () => {
        return await prisma.company.findFirst({
          where: {
            turboWebhookToken: webhookToken
          },
          select: {
            id: true,
            name: true
          }
        });
      }, 3);

      if (!company) {
        console.warn(`❌ [TURBO-WEBHOOK] Invalid token: ${webhookToken}`);
        console.warn(`❌ [TURBO-WEBHOOK] Token not found in database. Please save the token in Turbo settings first.`);
        return res.status(401).json({
          error: 'Invalid token',
          code: 'INVALID_TOKEN',
          message: 'Token not found. Please configure the webhook token in Turbo settings.'
        });
      }

      companyId = company.id;
      console.log(`✅ [TURBO-WEBHOOK] Token validated. Company: ${company.name} (${companyId})`);
    } else {
      console.log('ℹ️ [TURBO-WEBHOOK] No token provided, will search in all companies');
    }

    // الرد فوراً لـ Turbo (يجب أن يكون خلال 5 ثوان)
    res.status(200).json({ success: true, received: true });

    // Turbo يرسل البيانات بالصيغة التالية:
    // order_number: كود الطرد من Turbo
    // remote_order_id: كود الطرد من نظامنا (orderNumber)
    // status: حالة الطرد (رقم)
    // order_price: المبلغ المطلوب تحصيله
    // order_type: نوع الطرد
    // return_reason: سبب الارتجاع
    // delay_reason: سبب التأجيل
    // mission_code: كود المهمة
    // is_order: حالة استلام الطرد مع التحصيل
    // return_status: حالة المرتجع
    // captain_name: اسم الكابتن
    // captain_number1: رقم الكابتن الأول
    // captain_number2: رقم الكابتن الثاني

    const orderNumber = webhookData.remote_order_id || webhookData.order_number;
    const turboOrderNumber = webhookData.order_number; // كود الطرد من Turbo
    const statusCode = webhookData.status; // رقم الحالة
    const orderPrice = webhookData.order_price;
    const orderType = webhookData.order_type;
    const returnReason = webhookData.return_reason;
    const delayReason = webhookData.delay_reason;
    const missionCode = webhookData.mission_code;
    const isOrder = webhookData.is_order;
    const returnStatus = webhookData.return_status;
    const captainName = webhookData.captain_name;
    const captainNumber1 = webhookData.captain_number1;
    const captainNumber2 = webhookData.captain_number2;

    if (!orderNumber) {
      console.warn('⚠️ [TURBO-WEBHOOK] Missing order_number or remote_order_id in webhook');
      return;
    }

    // تحويل رقم أو نص الحالة إلى الاسم النمطي
    const statusMap = {
      '1': 'pending',
      '2': 'confirmed',
      '3': 'processing',
      '4': 'shipped',
      '5': 'delivered',
      '6': 'cancelled',
      '7': 'returned',
      '8': 'delayed',
      '9': 'out_for_delivery',
      '10': 'failed_delivery',
      '11': 'rescheduled',
      '12': 'on_hold',
      '13': 'lost',
      '14': 'returned_to_company',
      '15': 'returned_resent',
      '16': 'returned_missing',
      '17': 'returned_destroyed',
      '18': 'incomplete',
      '19': 'remitted',
      '20': 'returned_received'
    };

    const rawStatusStr = String(webhookData.status || '').toLowerCase().trim();
    const status = statusMap[String(statusCode)] || statusMap[rawStatusStr] || rawStatusStr || `status_${statusCode}`;

    console.log(`📦 [TURBO-WEBHOOK] Processing webhook for order: ${orderNumber}, Turbo order: ${turboOrderNumber}, Status: ${status} (${statusCode})`);

    // البحث عن الطلب برقم الطلب (remote_order_id هو orderNumber الخاص بنا)
    let order = null;
    
    if (companyId) {
      // إذا عرفنا الشركة، ابحث في أوردراتها فقط
      order = await safeQuery(async () => {
        return await prisma.order.findFirst({
          where: {
            orderNumber: orderNumber,
            companyId: companyId
          },
          include: {
            customer: true,
            company: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });
      }, 3);

      // إذا لم يُوجد برقم الطلب، جرب البحث برقم Turbo في نفس الشركة
      if (!order && turboOrderNumber) {
        order = await safeQuery(async () => {
          return await prisma.order.findFirst({
            where: {
              companyId: companyId,
              OR: [
                { turboTrackingNumber: String(turboOrderNumber) },
                { turboShipmentId: String(turboOrderNumber) }
              ]
            },
            include: {
              customer: true,
              company: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          });
        }, 3);
      }
    } else {
      // إذا لم يكن هناك TOKEN، ابحث في جميع الشركات
      order = await safeQuery(async () => {
        return await prisma.order.findFirst({
          where: {
            orderNumber: orderNumber
          },
          include: {
            customer: true,
            company: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });
      }, 3);

      // إذا لم يُوجد برقم الطلب، جرب البحث برقم Turbo
      if (!order && turboOrderNumber) {
        order = await safeQuery(async () => {
          return await prisma.order.findFirst({
            where: {
              OR: [
                { turboTrackingNumber: String(turboOrderNumber) },
                { turboShipmentId: String(turboOrderNumber) }
              ]
            },
            include: {
              customer: true,
              company: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          });
        }, 3);
      }
    }

    // إذا لم يُوجد في Order، جرب البحث في GuestOrder
    if (!order) {
      console.log('🔍 [TURBO-WEBHOOK] Order not found in Order table, searching in GuestOrder...');
      
      if (companyId) {
        // البحث في GuestOrder للشركة المحددة
        const guestOrder = await safeQuery(async () => {
          return await prisma.guestOrder.findFirst({
            where: {
              orderNumber: orderNumber,
              companyId: companyId
            }
          });
        }, 3);

        if (guestOrder) {
          console.log(`✅ [TURBO-WEBHOOK] Found guest order: ${orderNumber} for company: ${companyId}`);
          // تحديث GuestOrder
          await safeQuery(async () => {
            return await prisma.guestOrder.update({
              where: { id: guestOrder.id },
              data: {
                status: status === 'delivered' || statusCode === '5' ? 'DELIVERED' : 
                        status === 'processing' || statusCode === '3' ? 'PROCESSING' :
                        status === 'shipped' || statusCode === '4' || status === 'out_for_delivery' || statusCode === '9' ? 'SHIPPED' :
                        status === 'cancelled' || statusCode === '6' ? 'CANCELLED' :
                        status === 'returned' || returnStatus === '1' || statusCode === '7' ? 'RETURNED' :
                        guestOrder.status,
                metadata: JSON.stringify({
                  ...(guestOrder.metadata ? JSON.parse(guestOrder.metadata) : {}),
                  turboWebhook: webhookData,
                  turboStatus: status,
                  turboStatusCode: statusCode,
                  updatedAt: new Date().toISOString()
                }),
                updatedAt: new Date()
              }
            });
          }, 3);
          
          // إرسال إشعار Socket.IO
          try {
            const socketService = require('../services/socketService');
            const io = socketService.getIO();
            if (io) {
              io.to(`company_${companyId}`).emit('turbo_shipment_update', {
                orderNumber: orderNumber,
                status: status,
                statusCode: statusCode,
                isGuestOrder: true,
                timestamp: new Date().toISOString(),
                data: webhookData
              });
            }
          } catch (socketError) {
            console.error('❌ [TURBO-WEBHOOK] Failed to send socket notification:', socketError);
          }
          
          return; // تم معالجة GuestOrder
        }
      } else {
        // البحث في جميع GuestOrders
        const guestOrder = await safeQuery(async () => {
          return await prisma.guestOrder.findFirst({
            where: {
              orderNumber: orderNumber
            }
          });
        }, 3);

        if (guestOrder) {
          console.log(`✅ [TURBO-WEBHOOK] Found guest order: ${orderNumber}`);
          // تحديث GuestOrder
          await safeQuery(async () => {
            return await prisma.guestOrder.update({
              where: { id: guestOrder.id },
              data: {
                status: status === 'delivered' || statusCode === '5' ? 'DELIVERED' : 
                        status === 'processing' || statusCode === '3' ? 'PROCESSING' :
                        status === 'shipped' || statusCode === '4' || status === 'out_for_delivery' || statusCode === '9' ? 'SHIPPED' :
                        status === 'cancelled' || statusCode === '6' ? 'CANCELLED' :
                        status === 'returned' || returnStatus === '1' || statusCode === '7' ? 'RETURNED' :
                        guestOrder.status,
                metadata: JSON.stringify({
                  ...(guestOrder.metadata ? JSON.parse(guestOrder.metadata) : {}),
                  turboWebhook: webhookData,
                  turboStatus: status,
                  turboStatusCode: statusCode,
                  updatedAt: new Date().toISOString()
                }),
                updatedAt: new Date()
              }
            });
          }, 3);
          
          // إرسال إشعار Socket.IO
          try {
            const socketService = require('../services/socketService');
            const io = socketService.getIO();
            if (io) {
              io.to(`company_${guestOrder.companyId}`).emit('turbo_shipment_update', {
                orderNumber: orderNumber,
                status: status,
                statusCode: statusCode,
                isGuestOrder: true,
                timestamp: new Date().toISOString(),
                data: webhookData
              });
            }
          } catch (socketError) {
            console.error('❌ [TURBO-WEBHOOK] Failed to send socket notification:', socketError);
          }
          
          return; // تم معالجة GuestOrder
        }
      }
    }

    if (!order) {
      console.warn(`⚠️ [TURBO-WEBHOOK] Order not found in Order or GuestOrder for orderNumber: ${orderNumber}, turboOrderNumber: ${turboOrderNumber}, companyId: ${companyId || 'all'}`);
      return;
    }

    // تحديث حالة الشحنة في قاعدة البيانات
    // تحضير turboMetadata مع جميع البيانات
    let turboMetadataObj = {};
    try {
      if (order.turboMetadata) {
        turboMetadataObj = JSON.parse(order.turboMetadata);
      }
    } catch (e) {
      console.warn('⚠️ [TURBO-WEBHOOK] Failed to parse existing turboMetadata');
    }

    // تحديث turboMetadata مع البيانات الجديدة
    turboMetadataObj = {
      ...turboMetadataObj,
      ...webhookData,
      statusCode: statusCode,
      statusText: status,
      orderPrice: orderPrice,
      orderType: orderType,
      returnReason: returnReason,
      delayReason: delayReason,
      missionCode: missionCode,
      isOrder: isOrder,
      returnStatus: returnStatus,
      captainName: captainName,
      captainNumber1: captainNumber1,
      captainNumber2: captainNumber2,
      turboOrderNumber: turboOrderNumber,
      actualShippingCost: orderPrice ? parseFloat(orderPrice) : (turboMetadataObj.actualShippingCost || null),
      receivedAt: new Date().toISOString()
    };

    const updateData = {
      turboShipmentStatus: status,
      turboMetadata: JSON.stringify(turboMetadataObj),
      updatedAt: new Date()
    };

    // تحديث turboTrackingNumber إذا كان turboOrderNumber مختلف
    if (turboOrderNumber && String(turboOrderNumber) !== String(order.turboTrackingNumber)) {
      updateData.turboTrackingNumber = String(turboOrderNumber);
    }

    // تحديث turboShipmentId إذا كان turboOrderNumber مختلف
    if (turboOrderNumber && String(turboOrderNumber) !== String(order.turboShipmentId)) {
      updateData.turboShipmentId = String(turboOrderNumber);
    }

    // actualShippingCost يتم حفظه في turboMetadata (غير موجود في schema مباشرة)

    // تحديث حالة الطلب الرئيسية (OrderStatus) بناءً على جميع حالات Turbo العشرين
    if (status === 'processing' || statusCode === '3') {
      updateData.status = 'PROCESSING';
    } else if (status === 'shipped' || statusCode === '4' || status === 'out_for_delivery' || statusCode === '9') {
      updateData.status = 'SHIPPED';
    } else if (status === 'delivered' || statusCode === '5' || status === 'remitted' || statusCode === '19') {
      updateData.status = 'DELIVERED';
      updateData.paymentStatus = 'COMPLETED'; // تم التحصيل / التوريد
    } else if (status === 'cancelled' || statusCode === '6') {
      updateData.status = 'CANCELLED';
    } else if (status === 'returned' || returnStatus === '1' || statusCode === '7' || status === 'returned_to_company' || statusCode === '14' || status === 'returned_received' || statusCode === '20' || status === 'returned_missing' || statusCode === '16' || status === 'returned_destroyed' || statusCode === '17' || status === 'lost' || statusCode === '13') {
      updateData.status = 'RETURNED';
      const shippingCost = parseFloat(order.shipping || 0);
      if (shippingCost > 0) {
        turboMetadataObj.return_amount = shippingCost;
        updateData.turboMetadata = JSON.stringify(turboMetadataObj);
      }
    } else if (status === 'returned_resent' || statusCode === '15') {
      updateData.status = 'PROCESSING';
    } else if (status === 'on_hold' || statusCode === '12' || statusCode === '8' || statusCode === '10' || statusCode === '11') {
      updateData.status = 'ON_HOLD';
    } else if (status === 'incomplete' || statusCode === '18' || status === 'pending' || statusCode === '1') {
      updateData.status = 'PENDING';
    } else if (status === 'confirmed' || statusCode === '2') {
      updateData.status = 'CONFIRMED';
    }

    await safeQuery(async () => {
      return await prisma.order.update({
        where: { id: order.id },
        data: updateData
      });
    }, 3);

    console.log(`✅ [TURBO-WEBHOOK] Updated order ${order.orderNumber} with status: ${status} (${statusCode})`);

    // إرسال إشعار Socket.IO للشركة
    try {
      const socketService = require('../services/socketService');
      const io = socketService.getIO();
      
      if (io) {
        const roomName = `company_${order.companyId}`;
        const socketData = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          trackingNumber: turboOrderNumber || order.turboTrackingNumber,
          status: status,
          statusCode: statusCode,
          orderPrice: orderPrice,
          captainName: captainName,
          captainNumber1: captainNumber1,
          returnReason: returnReason,
          delayReason: delayReason,
          timestamp: new Date().toISOString(),
          data: webhookData
        };
        
        console.log(`📡 [TURBO-WEBHOOK] Emitting turbo_shipment_update to room: ${roomName}`);
        console.log(`📡 [TURBO-WEBHOOK] Socket data:`, JSON.stringify(socketData, null, 2));
        
        // Get room size for debugging
        const room = io.sockets.adapter.rooms.get(roomName);
        const roomSize = room ? room.size : 0;
        console.log(`📡 [TURBO-WEBHOOK] Room ${roomName} has ${roomSize} connected sockets`);
        
        io.to(roomName).emit('turbo_shipment_update', socketData);
        console.log(`✅ [TURBO-WEBHOOK] Socket event emitted successfully`);
      } else {
        console.warn('⚠️ [TURBO-WEBHOOK] Socket.IO instance not available');
      }
    } catch (socketError) {
      console.error('❌ [TURBO-WEBHOOK] Failed to send socket notification:', socketError);
    }

    // إرسال إشعار للعميل (إذا كان متاحاً)
    // يمكن إضافة إشعارات SMS/Email هنا

  } catch (error) {
    console.error('❌ [TURBO-WEBHOOK] Error processing webhook:', error);
    // لا نعيد خطأ لأننا أرسلنا الرد بالفعل
  }
});

/**
 * GET /api/turbo/webhook/verify
 * التحقق من webhook (لـ Turbo verification)
 */
router.get('/webhook/verify', (req, res) => {
  const verifyToken = req.query.token || req.query.verify_token;
  const challenge = req.query.challenge;

  // يمكن إضافة token verification هنا
  if (challenge) {
    res.status(200).send(challenge);
  } else {
    res.status(200).json({ verified: true });
  }
});

module.exports = router;

