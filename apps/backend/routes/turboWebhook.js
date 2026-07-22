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
            OR: [
              { turboWebhookToken: webhookToken },
              { turboApiKey: webhookToken }
            ]
          },
          select: {
            id: true,
            name: true
          }
        });
      }, 3);

      if (company) {
        companyId = company.id;
        console.log(`✅ [TURBO-WEBHOOK] Token validated. Company: ${company.name} (${companyId})`);
      } else {
        console.warn(`⚠️ [TURBO-WEBHOOK] Token ${webhookToken} not directly matched to company, will search order globally`);
      }
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

    // Official Turbo Status Code Mapping (1..13 as specified in official plugin):
    // 1: Saved (محفوظة قبل الشحن في تربو) => turbo_saved
    // 2: Sent (مرسلة لتربو) => turbo_sent
    // 3: Underway (قيد التنفيذ في الفرع) => processing
    // 4: With Captain (مع الكابتن / مسلمة للمندوب) => out_for_delivery
    // 5: Returned With Company (مرتجعة مع الشركة) => returned_to_company
    // 6: Returned / Cancelled (مرتجعة / ملغية) => cancelled
    // 7: Delivered (تم التسليم) => delivered
    // 8: Supplied (تم التوريد / تحصيل الأموال) => remitted
    // 9: Archived (محذوفة في تربو) => archived
    // 10: Returned Re-sent (مرتجعة معاد إرسالها) => returned_resent
    // 11: Lost (مرتجع مفقود) => returned_missing
    // 12: Absent Returned / Destroyed (مرتجع معدوم) => returned_destroyed
    // 13: Delayed (مؤجلة مع المندوب) => delayed
    const statusMap = {
      '1': 'turbo_saved',
      '2': 'turbo_sent',
      '3': 'processing',
      '4': 'out_for_delivery',
      '5': 'returned_to_company',
      '6': 'cancelled',
      '7': 'delivered',
      '8': 'remitted',
      '9': 'archived',
      '10': 'returned_resent',
      '11': 'returned_missing',
      '12': 'returned_destroyed',
      '13': 'delayed',
      // Legacy / extended fallbacks:
      '14': 'returned_to_company',
      '15': 'returned_resent',
      '16': 'returned_missing',
      '17': 'returned_destroyed',
      '18': 'incomplete',
      '19': 'remitted',
      '20': 'returned_received',
      // Text string mappings:
      'under delivery': 'out_for_delivery',
      'with captain': 'out_for_delivery',
      'in transit': 'shipped',
      'underway': 'processing',
      'accepted': 'processing',
      'delivered': 'delivered',
      'supplied': 'remitted',
      'remitted': 'remitted',
      'cancelled': 'cancelled',
      'archived': 'cancelled',
      'returned': 'returned',
      'returned with company': 'returned_to_company',
      'returned to sender': 'returned',
      'failed delivery': 'failed_delivery',
      'rescheduled': 'rescheduled',
      'on hold': 'on_hold',
      'delayed': 'delayed',
      'lost': 'returned_missing'
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

    // تحديث حالة الطلب الرئيسية (OrderStatus) بناءً على أكواد تربو الرسمية 1-13
    // turbo_saved (1), turbo_sent (2), processing (3): لا نغير حالة الأوردر الداخلية
    // archived (9): لا نلغي الأوردر - فقط حذف من تربو
    if (status === 'out_for_delivery' || statusCode === '4') {
      updateData.status = 'SHIPPED';
    } else if (status === 'delivered' || statusCode === '7' || status === 'remitted' || statusCode === '8') {
      updateData.status = 'DELIVERED';
      updateData.paymentStatus = 'COMPLETED';
    } else if (status === 'cancelled' || statusCode === '6') {
      updateData.status = 'CANCELLED';
    } else if (status === 'returned_to_company' || statusCode === '5' || status === 'returned' || status === 'returned_received' || status === 'returned_missing' || statusCode === '11' || status === 'returned_destroyed' || statusCode === '12' || status === 'lost') {
      updateData.status = 'RETURNED';
      const shippingCost = parseFloat(order.shipping || 0);
      if (shippingCost > 0) {
        turboMetadataObj.return_amount = shippingCost;
        updateData.turboMetadata = JSON.stringify(turboMetadataObj);
      }
    } else if (status === 'returned_resent' || statusCode === '10') {
      updateData.status = 'PROCESSING';
    } else if (status === 'delayed' || statusCode === '13') {
      updateData.status = 'ON_HOLD';
    }
    // For turbo_saved (1), turbo_sent (2), processing (3), archived (9): do NOT touch Order.status

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

