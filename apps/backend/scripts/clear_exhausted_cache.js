/**
 * Script to clear all exhausted keys cache
 * Run this to reset the quota exhaustion state
 */

const { getModelManager } = require('../legacy-ai-agent/aiAgent/modelManager');

async function clearExhaustedCache() {
    try {
        console.log('ðŸ§¹ Clearing exhausted keys cache...');

        const modelManager = getModelManager();

        if (modelManager && modelManager.stateStore) {
            await modelManager.stateStore.clearAll();
            console.log('âœ… StateStore cleared successfully!');
        } else {
            console.log('âš ï¸ ModelManager not initialized yet. Restarting the backend server will clear the cache.');
        }

        // Also clear any cooldowns
        if (modelManager && modelManager.clearExpiredExhaustedFlags) {
            await modelManager.clearExpiredExhaustedFlags();
            console.log('âœ… Exhausted flags cleared!');
        }

        console.log('\nðŸ“‹ Ø§Ù„Ø­Ù„ Ø§Ù„Ø£Ø³Ù‡Ù„: Ø£Ø¹Ø¯ ØªØ´ØºÙŠÙ„ Ø§Ù„Ø³ÙŠØ±ÙØ± Ø§Ù„Ø®Ù„ÙÙŠ (Backend) Ø¨Ø§Ù„Ø¶ØºØ· Ø¹Ù„Ù‰ Ctrl+C Ø«Ù… ØªØ´ØºÙŠÙ„Ù‡ Ù…Ø±Ø© Ø£Ø®Ø±Ù‰.');

    } catch (error) {
        console.error('âŒ Error clearing cache:', error.message);
        console.log('\nðŸ“‹ Ø§Ù„Ø­Ù„ Ø§Ù„Ø¨Ø¯ÙŠÙ„: Ø£Ø¹Ø¯ ØªØ´ØºÙŠÙ„ Ø§Ù„Ø³ÙŠØ±ÙØ± Ø§Ù„Ø®Ù„ÙÙŠ (Backend) Ù„Ù…Ø³Ø­ Ø§Ù„Ø°Ø§ÙƒØ±Ø© Ø§Ù„Ù…Ø¤Ù‚ØªØ©.');
    }
}

clearExhaustedCache();

