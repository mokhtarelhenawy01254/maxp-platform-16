/**
 * conversationShared.js
 * المتغيرات والدوال المشتركة بين كل وحدات المحادثات
 */

const { getSharedPrismaClient, executeWithRetry } = require('../../services/sharedDatabase');
const pageTokenCache = require('../../utils/pageTokenCache');

// Track messages that have been processed to prevent duplicates
const processedMessages = new Set();

// Global variable to store last webhook page ID (same as backend)
let lastWebhookPageId = null;

// دالة للتحقق من صحة محتوى الرسالة
function isValidMessageContent(content) {
    if (!content) return false;
    const trimmed = content.trim();
    // تجاهل الرسائل الفارغة أو التي تحتوي فقط على علامات التوصيل أو مسافات
    if (trimmed.length === 0) return false;
    // تجاهل الرسائل التي تحتوي فقط على علامات ✓✗×
    if (/^[✓✗×\s]+$/.test(trimmed)) return false;
    return true;
}

function updatePageTokenCache(pageId, pageAccessToken, pageName, companyId) {
    pageTokenCache.set(pageId, {
        pageAccessToken: pageAccessToken,
        pageName: pageName,
        companyId: companyId,
        lastUsed: Date.now()
    });
}

async function getPageToken(pageId) {
    // 🔒 CRITICAL FIX: Always check database for status, even if cached
    // This ensures disconnected pages are not used
    try {
        const page = await getSharedPrismaClient().facebookPage.findUnique({
            where: { pageId: pageId }
        });

        // Check if page exists and is connected
        if (!page) {
            // Remove from cache if exists
            if (pageTokenCache.has(pageId)) {
                pageTokenCache.delete(pageId);
            }
            return null;
        }

        // 🔒 CRITICAL: Check if page is disconnected
        if (page.status === 'disconnected') {
            // Remove from cache if exists
            if (pageTokenCache.has(pageId)) {
                pageTokenCache.delete(pageId);
            }
            return null;
        }

        // Page is connected - update cache and return
        if (page.pageAccessToken) {
            updatePageTokenCache(pageId, page.pageAccessToken, page.pageName, page.companyId);
            return {
                pageAccessToken: page.pageAccessToken,
                pageName: page.pageName,
                companyId: page.companyId,
                status: page.status,
                lastUsed: Date.now()
            };
        }
    } catch (error) {
        console.error(`❌ [PAGE-CACHE] خطأ في البحث عن الصفحة ${pageId}:`, error);
    }

    return null;
}

const getLastWebhookPageId = () => lastWebhookPageId;
const setLastWebhookPageId = (val) => { lastWebhookPageId = val; };

module.exports = {
    processedMessages,
    getLastWebhookPageId,
    setLastWebhookPageId,
    pageTokenCache,
    isValidMessageContent,
    updatePageTokenCache,
    getPageToken
};
