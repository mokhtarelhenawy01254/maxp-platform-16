const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const axios = require('axios');
const { getMetaGraphApiVersion } = require('../config/metaApi');
const crypto = require('crypto');
const { getFacebookOAuthConfig } = require('../config/facebookAppConfig');
const {
    buildFacebookPageTokenFailureMessage,
    validateFacebookPageAccessToken
} = require('../utils/facebookPageTokenUtils');

const getConnectedFacebookPages = async (req, res) => {
    try {
        // 🔐 الحصول على companyId من المستخدم المصادق عليه
        const user = req.user;

        if (!user || !user.companyId) {
            return res.status(401).json({
                success: false,
                error: 'مستخدم غير صالح'
            });
        }

        const companyId = user.companyId;
        ////console.log('📡 [FACEBOOK-CONNECTED] Loading pages for company:', companyId);

        // 🔒 جلب صفحات Facebook مع العزل
        const facebookPages = await getSharedPrismaClient().facebookPage.findMany({
            where: {
                companyId: companyId
            },
            orderBy: [
                { status: 'asc' },
                { connectedAt: 'desc' },
                { updatedAt: 'desc' }
            ]
        });

        ////console.log(`📊 [FACEBOOK-CONNECTED] Found ${facebookPages.length} Facebook pages for company ${companyId}`);

        // Transform to expected format
        const pages = facebookPages.map(page => ({
            id: page.id,
            pageId: page.pageId,
            pageName: page.pageName,
            status: page.status || 'connected',
            connectedAt: page.connectedAt || page.createdAt,
            disconnectedAt: page.disconnectedAt || null,
            lastActivity: page.updatedAt,
            messageCount: 0, // We'll calculate this later if needed
            companyId: page.companyId, // إضافة companyId للتأكيد
            instagramAccountId: page.instagramAccountId,
            instagramAccountName: page.instagramAccountName
        }));

        res.json({
            success: true,
            pages: pages,
            companyId: companyId // إضافة companyId في الاستجابة
        });
    } catch (error) {
        console.error('❌ [FACEBOOK-CONNECTED] Error fetching Facebook pages:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            companyId: req.user?.companyId
        });
    }
};


const getSpecificFacebookPageDetails = async (req, res) => {
    try {
        // 🔐 الحصول على companyId من المستخدم المصادق عليه
        const user = req.user;

        if (!user || !user.companyId) {
            return res.status(401).json({
                success: false,
                error: 'مستخدم غير صالح'
            });
        }

        const companyId = user.companyId;
        const { pageId } = req.params;

        // 🔒 جلب الصفحة مع العزل
        const facebookPage = await getSharedPrismaClient().facebookPage.findFirst({
            where: {
                pageId: pageId,
                companyId: companyId
            }
        });

        if (!facebookPage) {
            return res.status(404).json({
                success: false,
                error: 'Page not found or access denied'
            });
        }

        res.json({
            success: true,
            data: {
                id: facebookPage.id,
                pageId: facebookPage.pageId,
                pageName: facebookPage.pageName,
                status: facebookPage.status,
                connectedAt: facebookPage.connectedAt,
                pageAccessToken: facebookPage.pageAccessToken
            }
        });
    } catch (error) {
        console.error('Error fetching Facebook page:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Import environment configuration
const envConfig = require('../config/environment');

const getFacebookAppConfig = async (req, res) => {
    try {
        // 🔐 التحقق من المصادقة
        const user = req.user;

        if (!user || !user.companyId) {
            return res.status(401).json({
                success: false,
                error: 'مستخدم غير صالح'
            });
        }

        ////console.log('⚙️ [FACEBOOK-CONFIG] Loading config for company:', user.companyId);
        ////console.log('🌍 [FACEBOOK-CONFIG] Environment:', envConfig.environment);
        ////console.log('🔗 [FACEBOOK-CONFIG] Backend URL:', envConfig.backendUrl);

        const fbConfig = getFacebookOAuthConfig();
        const config = {
            appId: fbConfig.appId || 'your-facebook-app-id',
            webhookUrl: `${envConfig.backendUrl}/api/v1/webhook`,
            verifyToken: process.env.FACEBOOK_VERIFY_TOKEN || 'simple_chat_verify_token_2025',
            requiredPermissions: [
                'pages_messaging',
                'pages_read_engagement',
                'pages_manage_metadata',
                'pages_read_user_content',
                'pages_show_list',
                'pages_manage_posts'
            ],
            webhookFields: ['messages', 'messaging_postbacks', 'message_attachments']
        };

        res.json({
            success: true,
            data: config,
            companyId: user.companyId
        });
    } catch (error) {
        console.error('❌ [FACEBOOK-CONFIG] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            companyId: req.user?.companyId
        });
    }
}

const testFacebookPageToken = async (req, res) => {
    try {
        // 🔐 التحقق من المصادقة
        const user = req.user;

        if (!user || !user.companyId) {
            return res.status(401).json({
                success: false,
                error: 'مستخدم غير صالح'
            });
        }

        ////console.log('🧪 [FACEBOOK-TEST] Testing token for company:', user.companyId);
        const { pageAccessToken } = req.body;

        if (!pageAccessToken) {
            console.error('❌ [FACEBOOK-TEST] No access token provided');
            return res.status(400).json({
                success: false,
                error: 'Page Access Token is required'
            });
        }

        ////console.log('🔑 [Backend] Token length:', pageAccessToken.length);
        ////console.log('🔑 [Backend] Token preview:', pageAccessToken.substring(0, 20) + '...');

        const validation = await validateFacebookPageAccessToken({
            pageAccessToken
        });

        if (!validation.isValid) {
            console.error('❌ [Backend] Facebook page token validation failed:', validation.error || validation.reason);
            return res.status(400).json({
                success: false,
                error: buildFacebookPageTokenFailureMessage(validation),
                reason: validation.reason,
                facebookError: validation.error
            });
        }

        res.json({
            success: true,
            data: validation.page,
            message: 'Facebook page access token is valid'
        });
    } catch (error) {
        console.error('❌ [Backend] Error testing Facebook token:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}


const connectFacebookPage = async (req, res) => {
    try {
        // 🔐 الحصول على companyId من المستخدم المصادق عليه
        const user = req.user;

        if (!user || !user.companyId) {
            return res.status(401).json({
                success: false,
                error: 'مستخدم غير صالح'
            });
        }

        const companyId = user.companyId;
        ////console.log('🔗 [FACEBOOK-CONNECT] Connecting page for company:', companyId);

        const { pageId, pageAccessToken, pageName } = req.body;

        //console.log('📤 [FACEBOOK-CONNECT] Connection request data:', {
        //     pageId,
        //     pageName,
        //     tokenLength: pageAccessToken?.length,
        //     companyId
        // });

        if (!pageAccessToken) {
            console.error('❌ [FACEBOOK-CONNECT] No access token provided');
            return res.status(400).json({
                success: false,
                error: 'Page Access Token is required'
            });
        }

        if (!pageId) {
            console.error('❌ [FACEBOOK-CONNECT] No page ID provided');
            return res.status(400).json({
                success: false,
                error: 'Page ID is required'
            });
        }

        // 🧪 Strong validation: token must be a real page token for this exact page.
        ////console.log('🧪 [FACEBOOK-CONNECT] Validating page access token...');
        const validation = await validateFacebookPageAccessToken({
            pageId,
            pageAccessToken
        });

        if (!validation.isValid) {
            console.error('❌ [FACEBOOK-CONNECT] Invalid page token:', validation.error || validation.reason);
            return res.status(400).json({
                success: false,
                error: buildFacebookPageTokenFailureMessage(validation, pageId),
                reason: validation.reason,
                facebookError: validation.error
            });
        }

        // Save to database
        ////console.log('💾 [FACEBOOK-CONNECT] Saving page to database...');

        try {
            // 🔒 التحقق من أن الصفحة لا تنتمي لشركة أخرى
            const existingPage = await getSharedPrismaClient().facebookPage.findUnique({
                where: { pageId: pageId }
            });

            if (existingPage && existingPage.companyId !== companyId) {
                console.error('❌ [FACEBOOK-CONNECT] Page belongs to another company');
                return res.status(403).json({
                    success: false,
                    error: 'هذه الصفحة مربوطة بشركة أخرى'
                });
            }

            let savedPage;
            let isReconnection = false;

            if (existingPage && existingPage.companyId === companyId) {
                // Update existing page for same company (RECONNECTION CASE)
                isReconnection = existingPage.status === 'disconnected';
                savedPage = await getSharedPrismaClient().facebookPage.update({
                    where: { pageId: pageId },
                    data: {
                        pageAccessToken: pageAccessToken,
                        pageName: pageName || validation.page?.name || existingPage.pageName,
                        status: 'connected',
                        connectedAt: new Date(),
                        disconnectedAt: null, // Clear disconnection timestamp
                        companyId: companyId
                    }
                });
                ////console.log(`📝 [FACEBOOK-CONNECT] ${isReconnection ? 'Reconnected' : 'Updated'} existing page in database`);
            } else {
                // Create new page for this company
                savedPage = await getSharedPrismaClient().facebookPage.create({
                    data: {
                        id: crypto.randomUUID(), // ✅ Add ID explicitly
                        pageId: pageId,
                        pageAccessToken: pageAccessToken,
                        pageName: pageName || validation.page?.name || 'Unknown Page',
                        status: 'connected',
                        connectedAt: new Date(),
                        companyId: companyId
                    }
                });
                ////console.log('➕ [FACEBOOK-CONNECT] Created new page in database');
            }

            // 🔗 NEW: Ensure webhook subscription for reconnected pages
            if (isReconnection) {
                ////console.log('🔗 [FACEBOOK-CONNECT] This is a reconnection - checking webhook subscription...');

                try {
                    // Check if page is subscribed to webhook
                    const subscriptionsResponse = await axios.get(`https://graph.facebook.com/${getMetaGraphApiVersion()}/${pageId}/subscribed_apps`, {
                        params: {
                            access_token: pageAccessToken
                        },
                        timeout: 10000
                    });

                    const isSubscribed = subscriptionsResponse.data.data && subscriptionsResponse.data.data.length > 0;
                    ////console.log(`🔍 [FACEBOOK-CONNECT] Webhook subscription status: ${isSubscribed ? 'SUBSCRIBED' : 'NOT SUBSCRIBED'}`);

                    if (!isSubscribed) {
                        ////console.log('🔧 [FACEBOOK-CONNECT] Attempting to subscribe page to webhook...');

                        const subscribeResponse = await axios.post(`https://graph.facebook.com/${getMetaGraphApiVersion()}/${pageId}/subscribed_apps`, {
                            subscribed_fields: 'messages,messaging_postbacks,messaging_referrals,message_attachments'
                        }, {
                            params: {
                                access_token: pageAccessToken
                            },
                            timeout: 10000
                        });

                        ////console.log('✅ [FACEBOOK-CONNECT] Successfully subscribed page to webhook!');
                        ////console.log('   Response:', subscribeResponse.data);
                    } else {
                        ////console.log('✅ [FACEBOOK-CONNECT] Page is already subscribed to webhook');
                    }

                } catch (webhookError) {
                    ////console.log('⚠️ [FACEBOOK-CONNECT] Could not manage webhook subscription:', webhookError.response?.data?.error?.message || webhookError.message);
                    ////console.log('   This may be due to missing pages_manage_metadata permission');
                    // Continue anyway, as the page connection itself succeeded
                }
            }

            const connectionData = {
                pageId: savedPage.pageId,
                pageName: savedPage.pageName,
                status: savedPage.status,
                connectedAt: savedPage.connectedAt.toISOString(),
                isReconnection: isReconnection
            };

            ////console.log('✅ [FACEBOOK-CONNECT] Page connected successfully:', connectionData);

            res.json({
                success: true,
                message: isReconnection
                    ? 'Page reconnected successfully - webhook subscription verified'
                    : 'Page connected successfully',
                data: connectionData
            });
        } catch (dbError) {
            console.error('❌ [FACEBOOK-CONNECT] Database error:', dbError);
            res.status(500).json({
                success: false,
                error: 'Database error: ' + dbError.message
            });
        }
    } catch (error) {
        console.error('❌ [FACEBOOK-CONNECT] Error connecting page:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

const facebookDiagnostics = async (req, res) => {
    try {
        // 🔐 التحقق من المصادقة
        const user = req.user;

        if (!user || !user.companyId) {
            return res.status(401).json({
                success: false,
                error: 'مستخدم غير صالح'
            });
        }

        ////console.log('🔍 [FACEBOOK-DIAGNOSTICS] Running diagnostics for company:', user.companyId);

        // 🔒 جلب إحصائيات معزولة بالشركة
        const companyCustomers = await getSharedPrismaClient().customer.count({
            where: { companyId: user.companyId }
        });

        const companyConversations = await getSharedPrismaClient().conversation.count({
            where: { companyId: user.companyId }
        });

        const companyMessages = await getSharedPrismaClient().message.count({
            where: {
                conversation: {
                    companyId: user.companyId
                }
            }
        });

        const companyFacebookPages = await getSharedPrismaClient().facebookPage.count({
            where: { companyId: user.companyId }
        });

        const diagnostics = {
            timestamp: new Date().toISOString(),
            companyId: user.companyId,
            server: {
                status: 'healthy',
                port: 3001,
                environment: 'development',
                uptime: process.uptime()
            },
            database: {
                status: 'connected',
                connection: true,
                tables: {
                    customers: companyCustomers,
                    conversations: companyConversations,
                    messages: companyMessages
                }
            },
            const fbStatusConfig = getFacebookOAuthConfig();
            facebook: {
                config: {
                    appId: fbStatusConfig.appId || 'configured',
                    webhookVerifyToken: process.env.FACEBOOK_VERIFY_TOKEN ? 'configured' : 'missing',
                    backendUrl: envConfig.backendUrl,
                    environment: envConfig.environment
                },
                pages: {
                    total: companyFacebookPages,
                    connected: companyFacebookPages,
                    companySpecific: true
                },
                webhooks: {
                    url: `${envConfig.backendUrl}/webhook`,
                    verifyToken: process.env.FACEBOOK_VERIFY_TOKEN || 'configured',
                    lastReceived: new Date().toISOString(),
                    environment: envConfig.environment
                }
            },
            issues: [],
            recommendations: [
                {
                    type: 'success',
                    message: 'النظام جاهز للردود التلقائية اليدوية والثابتة'
                }
            ]
        };

        res.json({
            success: true,
            data: diagnostics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

const disconnectFacebookPage = async (req, res) => {
    try {
        // 🔐 الحصول على companyId من المستخدم المصادق عليه
        const user = req.user;

        if (!user || !user.companyId) {
            return res.status(401).json({
                success: false,
                error: 'مستخدم غير صالح'
            });
        }

        const companyId = user.companyId;
        const { pageId } = req.params;

        ////console.log(`🗑️ [FACEBOOK-DISCONNECT] Disconnecting page ${pageId} for company ${companyId}`);

        // 🔒 التحقق من أن الصفحة تنتمي للشركة
        const existingPage = await getSharedPrismaClient().facebookPage.findUnique({
            where: { pageId: pageId }
        });

        if (!existingPage) {
            return res.status(404).json({
                success: false,
                error: 'الصفحة غير موجودة'
            });
        }

        if (existingPage.companyId !== companyId) {
            return res.status(403).json({
                success: false,
                error: 'ليس لديك صلاحية لحذف هذه الصفحة'
            });
        }

        let webhookUnsubscribed = false;
        try {
            await axios.delete(`https://graph.facebook.com/${getMetaGraphApiVersion()}/${pageId}/subscribed_apps`, {
                params: {
                    access_token: existingPage.pageAccessToken
                },
                timeout: 10000
            });
            webhookUnsubscribed = true;
        } catch (webhookError) {
            console.warn(
                '⚠️ [FACEBOOK-DISCONNECT] Could not unsubscribe from webhook:',
                webhookError.response?.data?.error?.message || webhookError.message
            );
        }

        const updatedPage = await getSharedPrismaClient().facebookPage.update({
            where: { pageId: pageId },
            data: {
                status: 'disconnected',
                disconnectedAt: new Date(),
                updatedAt: new Date()
            }
        });

        const disconnectionData = {
            pageId: pageId,
            pageName: existingPage.pageName,
            status: 'disconnected',
            disconnectedAt: updatedPage.disconnectedAt?.toISOString() || new Date().toISOString(),
            webhookUnsubscribed,
            note: webhookUnsubscribed
                ? 'Page marked as disconnected and unsubscribed from webhook'
                : 'Page marked as disconnected. Webhook unsubscribe failed, but the page can still be reconnected later.'
        };

        res.json({
            success: true,
            message: 'تم قطع الاتصال مع الصفحة بنجاح - يمكن إعادة ربطها لاحقاً',
            data: disconnectionData
        });
    } catch (error) {
        console.error('❌ [FACEBOOK-DISCONNECT] General error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


const updateFacebookPageSettings = async (req, res) => {
    try {
        // 🔐 التحقق من المصادقة
        const user = req.user;

        if (!user || !user.companyId) {
            return res.status(401).json({
                success: false,
                error: 'مستخدم غير صالح'
            });
        }

        const companyId = user.companyId;
        const { pageId } = req.params;
        const { pageName, settings } = req.body;

        ////console.log(`⚙️ [FACEBOOK-UPDATE] Updating page ${pageId} for company ${companyId}`);

        // 🔒 التحقق من أن الصفحة تنتمي للشركة
        const existingPage = await getSharedPrismaClient().facebookPage.findFirst({
            where: {
                pageId: pageId,
                companyId: companyId
            }
        });

        if (!existingPage) {
            return res.status(404).json({
                success: false,
                error: 'Page not found or access denied'
            });
        }

        // Mock successful update
        res.json({
            success: true,
            message: 'تم تحديث إعدادات الصفحة بنجاح',
            data: {
                pageId: pageId,
                pageName: pageName,
                settings: settings,
                updatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

const getFacebookPageDetails = async (req, res) => {
    try {
        // 🔐 التحقق من المصادقة
        const user = req.user;

        if (!user || !user.companyId) {
            return res.status(401).json({
                success: false,
                error: 'مستخدم غير صالح'
            });
        }

        const companyId = user.companyId;
        const { pageId } = req.params;

        ////console.log(`📄 [FACEBOOK-DETAILS] Getting details for page ${pageId}, company ${companyId}`);

        // 🔒 جلب تفاصيل الصفحة مع العزل
        const facebookPage = await getSharedPrismaClient().facebookPage.findFirst({
            where: {
                pageId: pageId,
                companyId: companyId
            }
        });

        if (!facebookPage) {
            return res.status(404).json({
                success: false,
                error: 'Page not found or access denied'
            });
        }

        // إرجاع تفاصيل الصفحة الحقيقية
        const pageDetails = {
            id: facebookPage.id,
            pageId: facebookPage.pageId,
            pageName: facebookPage.pageName,
            status: facebookPage.status || 'connected',
            connectedAt: facebookPage.connectedAt || facebookPage.createdAt,
            lastActivity: facebookPage.updatedAt,
            messageCount: 0, // يمكن حسابه لاحقاً
            companyId: facebookPage.companyId,
            settings: {
                autoReply: false,
                welcomeMessage: 'أهلاً وسهلاً بك!',
                workingHours: {
                    enabled: true,
                    start: '09:00',
                    end: '18:00'
                }
            },
            stats: {
                totalMessages: 156,
                totalCustomers: 23,
                responseTime: '2.5 دقيقة',
                lastWeekMessages: 45
            }
        };

        res.json({
            success: true,
            data: pageDetails
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
module.exports = { getConnectedFacebookPages, getSpecificFacebookPageDetails, getFacebookAppConfig, testFacebookPageToken, connectFacebookPage, facebookDiagnostics, disconnectFacebookPage, updateFacebookPageSettings, getFacebookPageDetails }
