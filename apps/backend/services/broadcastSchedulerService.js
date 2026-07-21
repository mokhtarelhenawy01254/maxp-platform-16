/**
 * خدمة جدولة البرودكاست
 * Broadcast Scheduler Service
 * 
 * تقوم بفحص الحملات المجدولة وإرسالها تلقائياً في الموعد المحدد
 */

const cron = require('node-cron');
const { getSharedPrismaClient, safeQuery, isInConnectionLimitCooldown, getCooldownInfo } = require('./sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

/**
 * استبدال المتغيرات في الرسالة بالبيانات الفعلية للعميل
 * @param {string} message - نص الرسالة الذي يحتوي على متغيرات
 * @param {Object} customer - بيانات العميل
 * @returns {string} - الرسالة بعد استبدال المتغيرات
 */
const replaceMessageVariables = (message, customer) => {
  if (!message || !customer) return message;
  
  let personalizedMessage = message;
  
  // استبدال متغير اسم العميل الكامل
  const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'عزيزي العميل';
  personalizedMessage = personalizedMessage.replace(/{customerName}/g, fullName);
  
  // استبدال متغير الاسم الأول
  const firstName = customer.firstName || 'عزيزي العميل';
  personalizedMessage = personalizedMessage.replace(/{firstName}/g, firstName);
  
  // استبدال متغير الاسم الأخير
  const lastName = customer.lastName || '';
  personalizedMessage = personalizedMessage.replace(/{lastName}/g, lastName);
  
  return personalizedMessage;
};

class BroadcastSchedulerService {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
    this.lastCooldownLog = null; // Track last cooldown log to reduce spam
    this.stats = {
      totalChecks: 0,
      campaignsSent: 0,
      lastCheck: null,
      errors: 0
    };
    
    console.log('📡 [BroadcastScheduler] Service initialized');
  }

  /**
   * بدء خدمة الجدولة
   */
  start() {
    if (this.cronJob) {
      console.log('⚠️ [BroadcastScheduler] Service already running');
      return;
    }

    console.log('🚀 [BroadcastScheduler] Starting broadcast scheduler...');

    // فحص كل 5 دقائق للحملات المجدولة (تقليل الضغط على قاعدة البيانات)
    this.cronJob = cron.schedule('*/5 * * * *', async () => {
      await this.checkScheduledCampaigns();
    });

    console.log('✅ [BroadcastScheduler] Scheduler started - checking every 5 minutes');
  }

  /**
   * إيقاف خدمة الجدولة
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('🛑 [BroadcastScheduler] Scheduler stopped');
    }
  }

  /**
   * فحص الحملات المجدولة وإرسالها
   */
  async checkScheduledCampaigns() {
    if (this.isRunning) {
      console.log('⏳ [BroadcastScheduler] Previous check still running, skipping...');
      return;
    }

    // 🔥 Check if database is in cooldown mode
    if (isInConnectionLimitCooldown()) {
      const cooldownInfo = getCooldownInfo();
      // Only log once every 5 minutes to reduce spam
      if (!this.lastCooldownLog || Date.now() - this.lastCooldownLog > 5 * 60 * 1000) {
        console.log(`⏳ [BroadcastScheduler] Database in cooldown mode. Skipping check. Retry in ${cooldownInfo.remainingMinutes} minutes.`);
        this.lastCooldownLog = Date.now();
      }
      return;
    }

    try {
      this.isRunning = true;
      this.stats.totalChecks++;
      this.stats.lastCheck = new Date();

      const now = new Date();
      console.log(`🔍 [BroadcastScheduler] Checking for scheduled campaigns at ${now.toISOString()}`);

      // البحث عن الحملات المجدولة التي حان وقت إرسالها
      const scheduledCampaigns = await safeQuery(async () => {
        return await getSharedPrismaClient().broadcastCampaign.findMany({
        where: {
          status: 'scheduled',
          scheduledAt: {
            lte: now // الوقت المحدد <= الآن
          }
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              isActive: true
            }
          }
        }
      });
      }, 5);

      if (scheduledCampaigns.length === 0) {
        console.log('✅ [BroadcastScheduler] No campaigns to send');
        return;
      }

      console.log(`📨 [BroadcastScheduler] Found ${scheduledCampaigns.length} campaign(s) ready to send`);

      // إرسال كل حملة
      for (const campaign of scheduledCampaigns) {
        // تحقق من أن الشركة نشطة
        if (!campaign.company.isActive) {
          console.log(`⚠️ [BroadcastScheduler] Skipping campaign ${campaign.id} - Company inactive`);
          
          // تحديث حالة الحملة إلى failed
          await safeQuery(async () => {
            return await getSharedPrismaClient().broadcastCampaign.update({
              where: { id: campaign.id },
              data: {
                status: 'failed',
                failureReason: 'Company is inactive'
              }
            });
          }, 5);
          
          continue;
        }

        console.log(`🚀 [BroadcastScheduler] Sending campaign: ${campaign.name} (${campaign.id}) for company ${campaign.company.name}`);
        
        try {
          await this.sendScheduledCampaign(campaign);
          this.stats.campaignsSent++;
          console.log(`✅ [BroadcastScheduler] Campaign ${campaign.id} sent successfully`);
        } catch (error) {
          this.stats.errors++;
          console.error(`❌ [BroadcastScheduler] Error sending campaign ${campaign.id}:`, error.message);
          
          // تحديث حالة الحملة إلى failed
          await safeQuery(async () => {
            return await getSharedPrismaClient().broadcastCampaign.update({
              where: { id: campaign.id },
              data: {
                status: 'failed',
                failureReason: error.message
              }
            });
          }, 5).catch(err => console.error('Error updating campaign status:', err));
        }
      }
    } catch (error) {
      console.error('❌ [BroadcastScheduler] Error in scheduler:', error.message);
      this.stats.errors++;
    } finally {
      this.isRunning = false;
    }
  }

  async sendScheduledCampaign(campaign) {
    const { sendFacebookMessage } = require('../utils/allFunctions');
    const socketService = require('./socketService');
    const WhatsAppMessageHandler = require('./whatsapp').WhatsAppMessageHandler;

    console.log(`📊 [BroadcastScheduler] Starting to send campaign ${campaign.id}`);

    // تحديث حالة الحملة إلى "sending"
    await safeQuery(async () => {
      return await getSharedPrismaClient().broadcastCampaign.update({
        where: { id: campaign.id },
        data: {
          status: 'sending',
          sentAt: new Date()
        }
      });
    }, 5);

    const isWhatsApp = campaign.channel === 'whatsapp';
    let conversations = [];

    if (isWhatsApp) {
      console.log('🌐 [BroadcastScheduler] Fetching all WhatsApp conversations/customers (no 24h limit)');
      conversations = await safeQuery(async () => {
        return await getSharedPrismaClient().conversation.findMany({
          where: {
            companyId: campaign.companyId,
            customer: {
              phone: { not: null }
            }
          },
          include: {
            customer: true
          }
        });
      }, 4);

      // إنشاء محادثات للعملاء الذين لديهم أرقام هواتف ولكن ليس لديهم سجلات محادثات بعد
      const existingCustomerIds = new Set(conversations.map(c => c.customerId).filter(Boolean));
      const customersWithoutConv = await safeQuery(async () => {
        return await getSharedPrismaClient().customer.findMany({
          where: {
            companyId: campaign.companyId,
            phone: { not: null, not: '' },
            id: { notIn: Array.from(existingCustomerIds) }
          }
        });
      }, 4);

      if (customersWithoutConv && customersWithoutConv.length > 0) {
        console.log(`➕ [BroadcastScheduler] Creating conversations for ${customersWithoutConv.length} customers without prior conversations`);
        for (const cust of customersWithoutConv) {
          try {
            const newConv = await safeQuery(async () => {
              return await getSharedPrismaClient().conversation.create({
                data: {
                  id: 'cm' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9),
                  companyId: campaign.companyId,
                  customerId: cust.id,
                  status: 'ACTIVE',
                  channel: 'whatsapp'
                },
                include: { customer: true }
              });
            }, 4);
            if (newConv) conversations.push(newConv);
          } catch (err) {
            console.error(`❌ [BroadcastScheduler] Error creating conversation for customer ${cust.id}:`, err.message);
          }
        }
      }

      conversations = conversations.filter(c => c.customer?.phone && c.customer.phone.trim() !== '');

      // تصفية تصنيف العملاء إذا تم تحديده
      if (campaign.leadCategoryId) {
        console.log(`🏷️ [BroadcastScheduler] Filtering by lead category: ${campaign.leadCategoryId}`);
        const validContacts = await safeQuery(async () => {
          return await getSharedPrismaClient().whatsAppContact.findMany({
            where: { leadCategoryId: campaign.leadCategoryId, companyId: campaign.companyId },
            select: { customerId: true }
          });
        }, 3);
        const validCustomerIds = new Set(validContacts.map(c => c.customerId).filter(Boolean));
        conversations = conversations.filter(c => validCustomerIds.has(c.customer?.id));
      }

    } else {
      // Facebook Messenger: 24h active window policy
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      console.log(`⏰ [BroadcastScheduler] Filtering active Messenger conversations with activity after: ${twentyFourHoursAgo.toISOString()}`);
      conversations = await safeQuery(async () => {
        return await getSharedPrismaClient().conversation.findMany({
          where: {
            companyId: campaign.companyId,
            status: 'ACTIVE',
            messages: {
              some: {
                isFromCustomer: true,
                createdAt: {
                  gte: twentyFourHoursAgo
                }
              }
            }
          },
          include: {
            customer: true,
            messages: {
              where: { isFromCustomer: true },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        });
      }, 4);
    }

    console.log(`📊 [BroadcastScheduler] Found ${conversations.length} target conversations`);

    // تحديث عدد المستلمين في الحملة
    await safeQuery(async () => {
      return await getSharedPrismaClient().broadcastCampaign.update({
      where: { id: campaign.id },
      data: {
        recipientCount: conversations.length
      }
      });
    }, 5);

    // إنشاء سجلات المستلمين
    const recipients = conversations.map(conv => ({
      campaignId: campaign.id,
      conversationId: conv.id,
      customerPhone: conv.customer.phone || '',
      customerName: `${conv.customer.firstName} ${conv.customer.lastName}`,
      messengerUserId: conv.customer.facebookId,
      status: 'pending'
    }));

    if (recipients.length > 0) {
      await safeQuery(async () => {
        return await getSharedPrismaClient().broadcastRecipient.createMany({
        data: recipients
        });
      }, 5);
    } else {
      console.log('⚠️ [BroadcastScheduler] No recipients found for campaign');
      
      await safeQuery(async () => {
        return await getSharedPrismaClient().broadcastCampaign.update({
        where: { id: campaign.id },
        data: {
          status: 'failed',
          failureReason: 'No active recipients found'
        }
        });
      }, 5);
      
      return;
    }

    let waSessionId = null;

    if (isWhatsApp) {
      waSessionId = campaign.whatsAppSessionId;
      if (!waSessionId) {
        console.log(`🔍 [BroadcastScheduler] whatsAppSessionId not found on campaign, searching for default Meta session`);
        const metaSession = await safeQuery(async () => {
          return await getSharedPrismaClient().whatsAppSession.findFirst({
            where: { companyId: campaign.companyId, provider: 'META_CLOUD' }
          });
        }, 3);
        if (metaSession) {
          waSessionId = metaSession.id;
        } else {
          const defaultSession = await safeQuery(async () => {
            return await getSharedPrismaClient().whatsAppSession.findFirst({
              where: { companyId: campaign.companyId, isDefault: true }
            }) || await getSharedPrismaClient().whatsAppSession.findFirst({
              where: { companyId: campaign.companyId }
            });
          }, 3);
          waSessionId = defaultSession?.id || null;
        }
      }
      console.log(`📞 [BroadcastScheduler] Using WhatsApp session ID: ${waSessionId}`);
      if (!waSessionId) {
        throw new Error('لا توجد جلسة واتساب نشطة متاحة لإرسال هذه الحملة المجدولة');
      }
    }

    // إرسال الرسائل
    let sentCount = 0;
    let failedCount = 0;
    const totalRecipients = conversations.length;

    const io = socketService.getIO();
    
    // إرسال إشعار بدء الحملة
    if (io) {
      io.emit('campaign:progress', {
        campaignId: campaign.id,
        status: 'started',
        total: totalRecipients,
        sent: 0,
        failed: 0,
        progress: 0
      });
    }

    // إرسال رسالة لكل عميل
    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      
      try {
        if (isWhatsApp) {
          const phone = conv.customer.phone;
          if (!phone) {
            console.log(`⚠️ [BroadcastScheduler] Skipping customer ${conv.customer.firstName} - No phone number`);
            failedCount++;

            await safeQuery(async () => {
              return await getSharedPrismaClient().broadcastRecipient.updateMany({
                where: {
                  campaignId: campaign.id,
                  conversationId: conv.id
                },
                data: {
                  status: 'failed',
                  failureReason: 'No phone number',
                  sentAt: new Date()
                }
              });
            }, 4);

            continue;
          }

          const to = phone.startsWith('+') ? phone.slice(1) : phone;

          // Build template body parameters from customer data
          const bodyParams = [];
          if (conv.customer.firstName) {
            bodyParams.push({ type: 'text', text: conv.customer.firstName });
          }
          if (conv.customer.lastName) {
            bodyParams.push({ type: 'text', text: conv.customer.lastName });
          }

          const components = bodyParams.length > 0
            ? [{ type: 'body', parameters: bodyParams }]
            : [];

          let result;
          try {
            result = await WhatsAppMessageHandler.sendTemplateMessage(
              waSessionId, to, campaign.waTemplateName,
              { name: campaign.waTemplateName, language: campaign.waLanguageCode, languageCode: campaign.waLanguageCode, components },
              { metadata: { isBroadcast: true, campaignId: campaign.id }, senderId: campaign.creatorId }
            );
          } catch (sendErr) {
            if (components.length > 0) {
              console.log(`⚠️ [BroadcastScheduler] Re-trying template ${campaign.waTemplateName} without body params for ${to}`);
              result = await WhatsAppMessageHandler.sendTemplateMessage(
                waSessionId, to, campaign.waTemplateName,
                { name: campaign.waTemplateName, language: campaign.waLanguageCode, languageCode: campaign.waLanguageCode, components: [] },
                { metadata: { isBroadcast: true, campaignId: campaign.id }, senderId: campaign.creatorId }
              );
            } else {
              throw sendErr;
            }
          }

          sentCount++;
          const waMessageId = result?.messages?.[0]?.id || result?.messageId || null;

          await safeQuery(async () => {
            return await getSharedPrismaClient().broadcastRecipient.updateMany({
              where: {
                campaignId: campaign.id,
                conversationId: conv.id
              },
              data: {
                status: 'sent',
                sentAt: new Date(),
                messageId: waMessageId
              }
            });
          }, 4);
        } else {
          // Facebook Messenger
          if (!conv.customer.facebookId) {
            console.log(`⚠️ [BroadcastScheduler] Skipping customer ${conv.customer.firstName} - No Facebook ID`);
            failedCount++;

            await safeQuery(async () => {
              return await getSharedPrismaClient().broadcastRecipient.updateMany({
                where: {
                  campaignId: campaign.id,
                  conversationId: conv.id
                },
                data: {
                  status: 'failed',
                  failureReason: 'No Facebook ID',
                  sentAt: new Date()
                }
              });
            }, 4);

            continue;
          }

          // جلب Page ID من metadata المحادثة
          let conversationPageId = null;
          if (conv.metadata) {
            try {
              const metadata = JSON.parse(conv.metadata);
              if (metadata.pageId) {
                conversationPageId = metadata.pageId;
              }
            } catch (error) {
              console.log(`⚠️ [BroadcastScheduler] Error parsing metadata: ${error.message}`);
            }
          }

          // إذا لم يتم العثور على Page ID، استخدم أول صفحة متصلة
          if (!conversationPageId) {
            const defaultPage = await safeQuery(async () => {
              return await getSharedPrismaClient().facebookPage.findFirst({
                where: {
                  companyId: campaign.companyId,
                  status: 'connected'
                },
                orderBy: {
                  connectedAt: 'desc'
                }
              });
            }, 3);

            if (defaultPage) {
              conversationPageId = defaultPage.pageId;
            } else {
              console.log(`❌ [BroadcastScheduler] No connected Facebook page for customer ${conv.customer.firstName}`);
              failedCount++;

              await safeQuery(async () => {
                return await getSharedPrismaClient().broadcastRecipient.updateMany({
                  where: {
                    campaignId: campaign.id,
                    conversationId: conv.id
                  },
                  data: {
                    status: 'failed',
                    failureReason: 'No connected Facebook page',
                    sentAt: new Date()
                  }
                });
              }, 4);

              continue;
            }
          }

          // حفظ الرسائل في database قبل الإرسال
          const savedMessages = [];
          
          // ✨ استبدال المتغيرات بالبيانات الفعلية للعميل
          const personalizedMessage = replaceMessageVariables(campaign.message, conv.customer);
          console.log(`✨ [SCHEDULER PERSONALIZATION] Original: "${campaign.message}" => Personalized: "${personalizedMessage}"`);
          
          if (personalizedMessage && personalizedMessage.trim().length > 0) {
            const textMessage = await safeQuery(async () => {
              return await getSharedPrismaClient().message.create({
                data: {
                  conversationId: conv.id,
                  content: personalizedMessage,
                  isFromCustomer: false,
                  type: 'TEXT',
                  senderId: null,
                  metadata: JSON.stringify({
                    isBroadcast: true,
                    campaignId: campaign.id,
                    campaignName: campaign.name,
                    sentAt: new Date().toISOString(),
                    originalMessage: campaign.message,
                    hasVariables: campaign.message !== personalizedMessage
                  })
                }
              });
            }, 6);
            savedMessages.push(textMessage);
          }

          let sendResult;
          
          // إرسال الصور إن وجدت
          if (campaign.images && Array.isArray(campaign.images) && campaign.images.length > 0) {
            for (const imageUrl of campaign.images) {
              const imageMessage = await safeQuery(async () => {
                return await getSharedPrismaClient().message.create({
                  data: {
                    conversationId: conv.id,
                    content: imageUrl,
                    isFromCustomer: false,
                    type: 'IMAGE',
                    senderId: null,
                    metadata: JSON.stringify({
                      isBroadcast: true,
                      campaignId: campaign.id,
                      campaignName: campaign.name,
                      sentAt: new Date().toISOString()
                    })
                  }
                });
              }, 6);
              savedMessages.push(imageMessage);
            }

            // إرسال النص المخصص أولاً
            if (personalizedMessage && personalizedMessage.trim().length > 0) {
              sendResult = await sendFacebookMessage(
                conv.customer.facebookId,
                personalizedMessage,
                'TEXT',
                conversationPageId
              );
            }
            
            // إرسال الصور
            for (const imageUrl of campaign.images) {
              const imageResult = await sendFacebookMessage(
                conv.customer.facebookId,
                imageUrl,
                'IMAGE',
                conversationPageId
              );
              
              if (!imageResult.success) {
                sendResult = imageResult;
                break;
              }
              sendResult = imageResult;
            }
          } else {
            // إرسال النص المخصص فقط
            sendResult = await sendFacebookMessage(
              conv.customer.facebookId,
              personalizedMessage,
              'TEXT',
              conversationPageId
            );
          }

          if (sendResult.success) {
            sentCount++;

            await safeQuery(async () => {
              return await getSharedPrismaClient().broadcastRecipient.updateMany({
                where: {
                  campaignId: campaign.id,
                  conversationId: conv.id
                },
                data: {
                  status: 'sent',
                  sentAt: new Date()
                }
              });
            }, 5);
          } else {
            failedCount++;

            // حذف الرسائل المحفوظة لأن الإرسال فشل
            for (const msg of savedMessages) {
              await safeQuery(async () => {
                return await getSharedPrismaClient().message.delete({
                  where: { id: msg.id }
                });
              }, 4);
            }

            await safeQuery(async () => {
              return await getSharedPrismaClient().broadcastRecipient.updateMany({
                where: {
                  campaignId: campaign.id,
                  conversationId: conv.id
                },
                data: {
                  status: 'failed',
                  failureReason: sendResult.error || sendResult.message || 'Unknown error',
                  sentAt: new Date()
                }
              });
            }, 4);
          }
        }

        // إرسال تحديث التقدم
        if (io) {
          const progress = Math.round(((i + 1) / totalRecipients) * 100);
          io.emit('campaign:progress', {
            campaignId: campaign.id,
            status: 'sending',
            total: totalRecipients,
            sent: sentCount,
            failed: failedCount,
            progress: progress,
            currentRecipient: `${conv.customer.firstName} ${conv.customer.lastName}`
          });
        }

        // تأخير صغير لتجنب rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ [BroadcastScheduler] Error sending to ${conv.customer.firstName}:`, error.message);
        failedCount++;

        await safeQuery(async () => {
          return await getSharedPrismaClient().broadcastRecipient.updateMany({
          where: {
            campaignId: campaign.id,
            conversationId: conv.id
          },
          data: {
            status: 'failed',
            failureReason: error.message,
            sentAt: new Date()
          }
          });
        }, 3).catch(err => console.error('Error updating recipient status:', err));
      }
    }

    console.log(`📊 [BroadcastScheduler] Campaign results - Sent: ${sentCount}, Failed: ${failedCount}`);

    // إرسال إشعار الإتمام
    if (io) {
      io.emit('campaign:progress', {
        campaignId: campaign.id,
        status: 'completed',
        total: totalRecipients,
        sent: sentCount,
        failed: failedCount,
        progress: 100
      });
    }

    // تحديث إحصائيات الحملة
    await safeQuery(async () => {
      return await getSharedPrismaClient().broadcastCampaign.update({
      where: { id: campaign.id },
      data: {
        recipientCount: recipients.length,
        sentCount: sentCount,
        failedCount: failedCount,
        deliveredCount: 0, // ponytail: starts at 0, updated by webhooks on actual delivery
        status: sentCount > 0 ? 'sent' : 'failed'
      }
      });
    }, 6);

    console.log(`✅ [BroadcastScheduler] Campaign ${campaign.id} completed - Recipients: ${recipients.length}, Sent: ${sentCount}, Failed: ${failedCount}`);
  }

  /**
   * الحصول على إحصائيات الخدمة
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      schedulerActive: this.cronJob !== null
    };
  }
}

// إنشاء instance واحد للخدمة
const broadcastScheduler = new BroadcastSchedulerService();

module.exports = broadcastScheduler;

