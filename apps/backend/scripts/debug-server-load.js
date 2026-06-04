// Full Debug Server Loading - Step by Step
require('dotenv').config();

console.log('[DEBUG-LOAD] Step 1: Loading basic modules...');
require('express');
require('path');
require('http');
console.log('[DEBUG-LOAD] Step 1 complete');

console.log('[DEBUG-LOAD] Step 2: Loading sharedDatabase...');
require('../services/sharedDatabase');
console.log('[DEBUG-LOAD] Step 2 complete');

console.log('[DEBUG-LOAD] Step 3: Loading heavy services that server.js loads...');

try {
  console.log('  -> aiRuntimeService...');
  require('../services/aiRuntimeService');
  console.log('  OK aiRuntimeService');
} catch (e) {
  console.log('  FAILED aiRuntimeService:', e.message);
}

try {
  console.log('  -> ragService...');
  require('../services/ragService');
  console.log('  OK ragService');
} catch (e) {
  console.log('  FAILED ragService:', e.message);
}

try {
  console.log('  -> memoryService...');
  require('../services/memoryService');
  console.log('  OK memoryService');
} catch (e) {
  console.log('  FAILED memoryService:', e.message);
}

try {
  console.log('  -> multimodalService...');
  require('../services/multimodalService');
  console.log('  OK multimodalService');
} catch (e) {
  console.log('  FAILED multimodalService:', e.message);
}

try {
  console.log('  -> simpleMonitor...');
  require('../services/simpleMonitor');
  console.log('  OK simpleMonitor');
} catch (e) {
  console.log('  FAILED simpleMonitor:', e.message);
}

try {
  console.log('  -> TelegramBotService...');
  require('../services/TelegramBotService');
  console.log('  OK TelegramBotService');
} catch (e) {
  console.log('  FAILED TelegramBotService:', e.message);
}

try {
  console.log('  -> WhatsAppManager...');
  require('../services/whatsapp');
  console.log('  OK WhatsAppManager');
} catch (e) {
  console.log('  FAILED WhatsAppManager:', e.message);
}

console.log('\n[DEBUG-LOAD] All checked services loaded without crashing.');
console.log('[DEBUG-LOAD] If we got here, no checked service calls getSharedPrismaClient() unsafely at module load time.');
process.exit(0);
