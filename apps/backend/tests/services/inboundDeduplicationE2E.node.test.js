/**
 * Standalone executable integration tests (node:test) verifying inbound message
 * deduplication, daily skipped counters, P2002 race fallback, pre-claim conversation
 * safety, Baileys button skip, and double-reply guards.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const servicesDir = path.resolve(__dirname, '../../services');
const controllersDir = path.resolve(__dirname, '../../controller');
const utilsDir = path.resolve(__dirname, '../../utils');
const whatsappDir = path.join(servicesDir, 'whatsapp');

function setMockModule(absPath, exportsValue) {
  require.cache[absPath] = {
    id: absPath,
    filename: absPath,
    loaded: true,
    exports: exportsValue,
  };
}

function clearModule(absPath) {
  delete require.cache[absPath];
}

function createInMemoryDedupePrisma() {
  const dedupeRows = new Map();
  const messagesByExtId = new Map();
  const messages = [];
  const waMessagesById = new Map();
  let conversationUnread = 0;
  let nextId = 1;

  const prisma = {
    _dedupeRows: dedupeRows,
    _messages: messages,
    _getUnreadCount: () => conversationUnread,
    $executeRawUnsafe: async () => 0,
    $executeRaw: async () => 0,
    $transaction: async (fn) => (typeof fn === 'function' ? fn(prisma) : []),
    messageInboundDedupe: {
      create: async ({ data }) => {
        const key = `${data.companyId}|${data.channel}|${data.externalMessageId}`;
        if (dedupeRows.has(key)) {
          const err = new Error('Unique constraint failed on the fields: (`companyId`,`channel`,`externalMessageId`)');
          err.code = 'P2002';
          throw err;
        }
        const row = {
          id: `claim-${nextId++}`,
          duplicateCount: 0,
          ...data,
        };
        dedupeRows.set(key, row);
        return row;
      },
      updateMany: async ({ where, data }) => {
        const key = `${where.companyId}|${where.channel}|${where.externalMessageId}`;
        const row = dedupeRows.get(key);
        if (!row) return { count: 0 };
        if (data?.duplicateCount?.increment) {
          row.duplicateCount += data.duplicateCount.increment;
        }
        if (data?.lastSeenAt) row.lastSeenAt = data.lastSeenAt;
        return { count: 1 };
      },
      update: async ({ where, data }) => {
        for (const row of dedupeRows.values()) {
          if (row.id === where.id) {
            Object.assign(row, data);
            return row;
          }
        }
        return null;
      },
      delete: async ({ where }) => {
        for (const [k, row] of dedupeRows.entries()) {
          if (row.id === where.id) {
            dedupeRows.delete(k);
            return row;
          }
        }
        return null;
      },
    },
    customer: {
      findFirst: async () => ({ id: 'cust-1', companyId: 'comp-redline', firstName: 'Test', lastName: 'User', phone: '201000000001' }),
      findUnique: async () => ({ id: 'cust-1', companyId: 'comp-redline', firstName: 'Test', lastName: 'User', phone: '201000000001' }),
      create: async ({ data }) => ({ id: 'cust-1', ...data }),
      update: async ({ where, data }) => ({ id: where.id, companyId: 'comp-redline', firstName: 'Test', lastName: 'User', phone: '201000000001', ...data }),
    },
    conversation: {
      findFirst: async () => ({ id: 'conv-1', companyId: 'comp-redline', customerId: 'cust-1', aiEnabled: false, status: 'ACTIVE', unreadCount: conversationUnread, metadata: '{}' }),
      findMany: async () => [],
      findUnique: async () => ({ id: 'conv-1', companyId: 'comp-redline', customerId: 'cust-1', aiEnabled: false, status: 'ACTIVE', unreadCount: conversationUnread, metadata: '{}' }),
      create: async ({ data }) => ({ id: 'conv-1', unreadCount: 1, ...data }),
      update: async ({ where, data }) => {
        if (data?.unreadCount?.increment) {
          conversationUnread += data.unreadCount.increment;
        } else if (typeof data?.unreadCount === 'number') {
          conversationUnread = data.unreadCount;
        }
        return { id: where.id, companyId: 'comp-redline', status: 'ACTIVE', unreadCount: conversationUnread, ...data };
      },
    },
    message: {
      findFirst: async () => null,
      count: async () => 1,
      create: async ({ data }) => {
        if (data.externalMessageId) {
          const msgKey = `${data.conversationId}|${data.externalMessageId}`;
          if (messagesByExtId.has(msgKey)) {
            const err = new Error('Unique constraint failed on messages(conversationId, externalMessageId)');
            err.code = 'P2002';
            throw err;
          }
          messagesByExtId.set(msgKey, true);
        }
        const msg = { id: `msg-${nextId++}`, createdAt: new Date(), ...data };
        messages.push(msg);
        return msg;
      },
    },
    whatsAppSession: {
      findFirst: async () => ({ id: 'sess-meta-1', companyId: 'comp-redline', phoneNumberId: 'pn-1' }),
      findMany: async () => [],
      findUnique: async () => ({ id: 'sess-1', companyId: 'comp-redline', phoneNumber: '201111111111', aiEnabled: false, autoReply: false }),
    },
    whatsAppContact: {
      findUnique: async () => null,
      upsert: async ({ create }) => ({ id: 'wac-1', ...create }),
      updateMany: async () => ({ count: 0 }),
    },
    whatsAppMessage: {
      findUnique: async ({ where }) => {
        const key = where?.messageId || `${where?.sessionId_messageId?.sessionId}|${where?.sessionId_messageId?.messageId}`;
        return waMessagesById.get(key) || null;
      },
      upsert: async ({ where, create }) => {
        const key = where?.messageId || create?.messageId || `${where?.sessionId_messageId?.sessionId}|${where?.sessionId_messageId?.messageId}`;
        const existing = waMessagesById.get(key);
        if (existing) return existing;
        const row = { id: `wam-${nextId++}`, ...create };
        waMessagesById.set(key, row);
        return row;
      },
      count: async () => 1,
    },
    whatsAppSettings: {
      findUnique: async () => ({ browserNotifications: false, notificationSound: false }),
    },
    broadcastRecipient: {
      updateMany: async () => ({ count: 0 }),
    },
    notification: {
      create: async ({ data }) => ({ id: `notif-${nextId++}`, ...data }),
    },
    inboxSettings: {
      findUnique: async () => ({
        id: 'is-1',
        companyId: 'comp-redline',
        assignmentMode: 'MANUAL',
        roundRobinEnabled: false,
      }),
      create: async ({ data }) => ({ id: 'is-1', ...data }),
      update: async ({ where, data }) => ({ id: where.id || 'is-1', ...data }),
    },
    facebookPage: {
      findUnique: async () => ({ id: 'fp-1', pageId: 'page-1', pageName: 'Red Line', pageAccessToken: 'tok-1', companyId: 'comp-redline', status: 'connected' }),
      findMany: async () => [{ id: 'fp-1', pageId: 'page-1', pageName: 'Red Line', pageAccessToken: 'tok-1', companyId: 'comp-redline', status: 'connected' }],
    },
    blockedCustomersOnPage: {
      findFirst: async () => null,
    },
    company: {
      findUnique: async ({ where }) => ({ id: where?.id || 'comp-redline', name: 'Red Line', slug: 'red-line' }),
    },
    user: {
      findMany: async () => [],
      findFirst: async () => null,
    },
  };
  return prisma;
}

test('inboundDeduplicationGuard: daily counter + auto-reply double-guard', async () => {
  const prisma = createInMemoryDedupePrisma();
  setMockModule(path.join(servicesDir, 'sharedDatabase.js'), {
    getSharedPrismaClient: () => prisma,
    getSharedPrismaClientAsync: async () => prisma,
    safeQuery: async (fn) => fn(),
    executeWithRetry: async (fn) => fn(),
  });
  clearModule(path.join(servicesDir, 'inboundDeduplicationGuard.js'));
  const guard = require(path.join(servicesDir, 'inboundDeduplicationGuard.js'));

  guard.resetSchemaEnsureState();
  guard.resetDailyDuplicateCounts();

  const logged = [];
  const origLog = console.log;
  console.log = (...args) => logged.push(args.join(' '));
  try {
    const r1 = guard.logDuplicateSkipped({
      channel: 'facebook',
      externalMessageId: 'm_mid_image_1',
      companyId: 'comp-redline',
      conversationId: 'conv-1',
    });
    const r2 = guard.logDuplicateSkipped({
      channel: 'facebook',
      externalMessageId: 'm_mid_image_2',
      companyId: 'comp-redline',
      conversationId: 'conv-1',
    });
    assert.equal(r1.dailyCount, 1);
    assert.equal(r2.dailyCount, 2);
    assert.equal(guard.getDailyDuplicateCount({ channel: 'facebook', date: r1.date }), 2);
    assert.match(logged[0], /\[INBOUND-DEDUPE\] duplicate_skipped channel=facebook externalMessageId=m_mid_image_1.*dailyCount=1/);
  } finally {
    console.log = origLog;
  }

  const c1 = await guard.claimInboundAutoReply({
    companyId: 'comp-redline',
    channel: 'facebook',
    externalMessageId: 'm_mid_emoji',
    conversationId: 'conv-1',
  });
  const c2 = await guard.claimInboundAutoReply({
    companyId: 'comp-redline',
    channel: 'facebook',
    externalMessageId: 'm_mid_emoji',
    conversationId: 'conv-1',
  });
  assert.equal(c1.duplicate, false);
  assert.equal(c2.duplicate, true);

  const batch = await guard.filterUnclaimedAutoReplyEntries({
    companyId: 'comp-redline',
    channel: 'facebook',
    conversationId: 'conv-1',
    entries: [
      { fbMessageId: 'm_mid_emoji', message: 'dup emoji' },
      { fbMessageId: 'm_mid_fresh', message: 'fresh msg' },
    ],
  });
  assert.equal(batch.entriesToProcess.length, 1);
  assert.equal(batch.entriesToProcess[0].fbMessageId, 'm_mid_fresh');
  assert.deepEqual(batch.skippedIds, ['m_mid_emoji']);
});

test('WhatsAppSyncService.syncMessage: insert-if-not-exists, P2002 fallback, and error claim release', async () => {
  const prisma = createInMemoryDedupePrisma();
  const createdMessages = [];
  const origCreate = prisma.message.create;
  prisma.message.create = async (args) => {
    const res = await origCreate(args);
    createdMessages.push(res);
    return res;
  };

  setMockModule(path.join(servicesDir, 'sharedDatabase.js'), {
    getSharedPrismaClient: () => prisma,
    executeWithRetry: async (fn) => fn(),
  });
  setMockModule(path.join(servicesDir, 'whatsappRealtimeAudienceService.js'), {
    emitToAudience: () => {},
    getConversationAudience: async () => ({ userIds: ['u-1'] }),
  });
  let notifyCount = 0;
  setMockModule(path.join(servicesDir, 'inboxNotificationService.js'), {
    notifyNewMessage: async () => { notifyCount += 1; },
  });
  setMockModule(path.join(servicesDir, 'whatsappAssignmentEngineService.js'), {
    assignConversationToBestModerator: async ({ conversationId }) => ({
      conversation: { id: conversationId, assignedUserId: null, status: 'ACTIVE', metadata: '{}' },
    }),
  });

  clearModule(path.join(servicesDir, 'inboundDeduplicationGuard.js'));
  clearModule(path.join(whatsappDir, 'WhatsAppSyncService.js'));
  const guard = require(path.join(servicesDir, 'inboundDeduplicationGuard.js'));
  guard.resetSchemaEnsureState();
  guard.resetDailyDuplicateCounts();
  const WhatsAppSyncService = require(path.join(whatsappDir, 'WhatsAppSyncService.js'));

  const first = await WhatsAppSyncService.syncMessage(
    'comp-redline',
    'sess-1',
    '201000000001@s.whatsapp.net',
    { messageId: 'wamid.img.001', type: 'IMAGE', content: '', timestamp: Math.floor(Date.now() / 1000) },
    true,
    true
  );
  assert.equal(first.wasCreated, true);
  assert.equal(createdMessages.length, 1);
  assert.equal(notifyCount, 1);

  const dup = await WhatsAppSyncService.syncMessage(
    'comp-redline',
    'sess-1',
    '201000000001@s.whatsapp.net',
    { messageId: 'wamid.img.001', type: 'IMAGE', content: '', timestamp: Math.floor(Date.now() / 1000) },
    true,
    true
  );
  assert.equal(dup.wasCreated, false);
  assert.equal(dup.duplicateLogged, true);
  assert.equal(createdMessages.length, 1);
  assert.equal(notifyCount, 1);
  assert.equal(guard.getDailyDuplicateCount({ channel: 'whatsapp' }), 1);

  // DB P2002 race fallback
  prisma.message.create = async () => {
    const err = new Error('Unique constraint failed on the constraint');
    err.code = 'P2002';
    throw err;
  };
  const raceResult = await WhatsAppSyncService.syncMessage(
    'comp-redline',
    'sess-1',
    '201000000001@s.whatsapp.net',
    { messageId: 'wamid.race.003', type: 'TEXT', content: 'hi', timestamp: Math.floor(Date.now() / 1000) },
    true,
    true
  );
  assert.equal(raceResult.wasCreated, false);
  assert.equal(raceResult.duplicateLogged, true);
  assert.equal(guard.getDailyDuplicateCount({ channel: 'whatsapp' }), 2);

  // Outer error before message.create releases pre-claim and returns { error: true }
  const preClaim = await guard.claimInboundMessage({
    companyId: 'comp-redline',
    channel: 'whatsapp',
    externalMessageId: 'wamid.err.004',
  });
  prisma.customer.findFirst = async () => { throw new Error('Transient DB error'); };
  const errResult = await WhatsAppSyncService.syncMessage(
    'comp-redline',
    'sess-1',
    '201000000001@s.whatsapp.net',
    { messageId: 'wamid.err.004', type: 'TEXT', content: 'hi', _inboundClaim: preClaim.claim },
    true,
    true
  );
  assert.equal(errResult.error, true);
  assert.equal(errResult.wasCreated, false);
  assert.equal(prisma._dedupeRows.has('comp-redline|whatsapp|wamid.err.004'), false, 'Pre-claim must be released on sync error');
});

test('WhatsAppInboundService: duplicate skips upsert/bot-reply & pre-claim releases on upsert failure', async () => {
  const prisma = createInMemoryDedupePrisma();
  let botSendCalls = 0;
  let socketEmitCalls = 0;

  setMockModule(path.join(servicesDir, 'sharedDatabase.js'), {
    getSharedPrismaClient: () => prisma,
    executeWithRetry: async (fn) => fn(),
  });
  setMockModule(path.join(servicesDir, 'socketService.js'), {
    getIO: () => null,
  });
  setMockModule(path.join(servicesDir, 'whatsappRealtimeAudienceService.js'), {
    emitToAudience: () => { socketEmitCalls += 1; },
    getConversationAudience: async () => ({ userIds: [] }),
  });
  setMockModule(path.join(servicesDir, 'inboxNotificationService.js'), {
    notifyNewMessage: async () => {},
  });
  setMockModule(path.join(whatsappDir, 'WhatsAppMessageHandler.js'), {
    sendText: async () => { botSendCalls += 1; },
    sendImage: async () => { botSendCalls += 1; },
    sendButtons: async () => { botSendCalls += 1; },
  });
  setMockModule(path.join(whatsappDir, 'WhatsAppReactionService.js'), {});
  setMockModule(path.join(servicesDir, 'aiSdkClient.js'), { sendChatMessage: async () => null });
  setMockModule(path.join(servicesDir, 'aiSettingsResolver.js'), {
    getEffectiveAiAutoReplySetting: async () => ({ autoReplyEnabled: false }),
  });
  try {
    const axiosPath = require.resolve('axios');
    setMockModule(axiosPath, {
      get: async () => ({ status: 200, data: { first_name: 'Test', last_name: 'Customer' } }),
      post: async () => ({ status: 200, data: { message_id: 'm_out_1' } }),
    });
  } catch (_) {}
  setMockModule(path.join(servicesDir, 'botUnsubscribeService.js'), {
    isUnsubscribeText: () => false,
    isUnsubscribed: async () => false,
    recordUnsubscribe: async () => {},
    UNSUBSCRIBE_CONFIRMATION: '',
  });
  setMockModule(path.join(servicesDir, 'botRuleEngine.js'), {
    evaluateInboundBotReply: async () => ({ kind: 'rule', replyText: 'Auto bot reply' }),
  });
  setMockModule(path.join(servicesDir, 'botMessageSender.js'), {
    buildWhatsAppButtons: () => [],
  });
  setMockModule(path.join(servicesDir, 'botFlowRuntime.js'), {
    onCustomerReply: async () => ({ handled: false }),
  });

  clearModule(path.join(servicesDir, 'inboundDeduplicationGuard.js'));
  clearModule(path.join(whatsappDir, 'WhatsAppSyncService.js'));
  clearModule(path.join(whatsappDir, 'WhatsAppInboundService.js'));

  const guard = require(path.join(servicesDir, 'inboundDeduplicationGuard.js'));
  guard.resetSchemaEnsureState();
  guard.resetDailyDuplicateCounts();
  const WhatsAppInboundService = require(path.join(whatsappDir, 'WhatsAppInboundService.js'));

  const imgPayload = {
    sessionId: 'sess-1',
    companyId: 'comp-redline',
    remoteJid: '201000000001@s.whatsapp.net',
    messageId: 'wamid.inbound.img.001',
    messageType: 'IMAGE',
    content: '',
    mediaUrl: 'https://example.com/img.jpg',
    timestamp: Math.floor(Date.now() / 1000),
    isGroup: false,
    fromMe: false,
  };
  const firstImg = await WhatsAppInboundService.saveIncomingMessage(imgPayload);
  assert.notEqual(firstImg.duplicate, true);
  assert.equal(prisma._messages.length, 1);
  const emitsAfterFirstImg = socketEmitCalls;
  assert.ok(emitsAfterFirstImg >= 1);

  const dupImg = await WhatsAppInboundService.saveIncomingMessage(imgPayload);
  assert.equal(dupImg.duplicate, true);
  assert.equal(prisma._messages.length, 1);
  assert.equal(socketEmitCalls, emitsAfterFirstImg, 'Duplicate IMAGE must not emit realtime events again');

  const payload = {
    sessionId: 'sess-1',
    companyId: 'comp-redline',
    remoteJid: '201000000001@s.whatsapp.net',
    messageId: 'wamid.inbound.text.001',
    messageType: 'TEXT',
    content: '😀',
    timestamp: Math.floor(Date.now() / 1000),
    isGroup: false,
    fromMe: false,
  };

  const firstSave = await WhatsAppInboundService.saveIncomingMessage(payload);
  assert.equal(Boolean(firstSave), true);
  assert.notEqual(firstSave.duplicate, true);
  assert.equal(botSendCalls, 1, 'First delivery should trigger bot reply once');

  const secondSave = await WhatsAppInboundService.saveIncomingMessage(payload);
  assert.equal(secondSave.duplicate, true);
  assert.equal(botSendCalls, 1, 'Duplicate delivery MUST NOT trigger second bot reply');
  assert.equal(guard.getDailyDuplicateCount({ channel: 'whatsapp' }), 2);

  // Upsert failure releases claim so retry succeeds
  const origUpsert = prisma.whatsAppMessage.upsert;
  let shouldFail = true;
  prisma.whatsAppMessage.upsert = async (args) => {
    if (shouldFail) {
      shouldFail = false;
      throw new Error('transient DB timeout');
    }
    return origUpsert(args);
  };

  await assert.rejects(
    WhatsAppInboundService.saveIncomingMessage({ ...payload, messageId: 'wamid.retry.002' }),
    /transient DB timeout/
  );
  const retried = await WhatsAppInboundService.saveIncomingMessage({ ...payload, messageId: 'wamid.retry.002' });
  assert.notEqual(retried.duplicate, true);
  assert.equal(botSendCalls, 2);
});

test('whatsappMetaWebhookController: duplicate button payload skips WhatsAppInteractionService.handleButtonResponse', async () => {
  const interactionPath = path.join(servicesDir, 'whatsapp', 'WhatsAppInteractionService.js');
  const inboundPath = path.join(servicesDir, 'whatsapp', 'WhatsAppInboundService.js');
  const sessionLookup = path.join(servicesDir, 'sharedDatabase.js');

  let buttonHandlerCalls = 0;
  const seenMids = new Set();
  const prisma = {
    whatsAppSession: {
      findFirst: async () => ({ id: 'sess-meta-1', companyId: 'comp-redline', phoneNumberId: 'pn-1' }),
      findMany: async () => [],
    },
  };

  setMockModule(sessionLookup, {
    getSharedPrismaClient: () => prisma,
    executeWithRetry: async (fn) => fn(),
  });
  setMockModule(inboundPath, {
    saveIncomingMessage: async ({ messageId }) => {
      if (seenMids.has(messageId)) {
        return { id: null, duplicate: true };
      }
      seenMids.add(messageId);
      return { id: 'wam-meta-1' };
    },
    updateMessageStatus: async () => {},
  });
  setMockModule(interactionPath, {
    handleButtonResponse: async () => { buttonHandlerCalls += 1; return true; },
  });

  clearModule(path.join(controllersDir, 'whatsappMetaWebhookController.js'));
  const controller = require(path.join(controllersDir, 'whatsappMetaWebhookController.js'));

  const makeReq = () => ({
    headers: {},
    body: {
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          field: 'messages',
          value: {
            metadata: { phone_number_id: 'pn-1' },
            contacts: [{ wa_id: '201000000001', profile: { name: 'Tester' } }],
            messages: [{
              from: '201000000001',
              id: 'wamid.btn.dup.1',
              timestamp: String(Math.floor(Date.now() / 1000)),
              type: 'button',
              button: { text: 'Confirm', payload: 'CONFIRM_ORDER' },
            }],
          },
        }],
      }],
    },
  });
  const makeRes = () => ({
    statusCode: 200,
    sendStatus(c) { this.statusCode = c; return this; },
    status(c) { this.statusCode = c; return this; },
    json() { return this; },
    send() { return this; },
  });

  await controller.postWebhook(makeReq(), makeRes());
  await controller.postWebhook(makeReq(), makeRes());
  assert.equal(buttonHandlerCalls, 1, 'Duplicate Meta button webhook must execute handleButtonResponse only once');
});

test('allFunctions.handleFacebookMessage: saves mid in metadata, prevents unread inflation on duplicate, and skips duplicate bot reply', async () => {
  const prisma = createInMemoryDedupePrisma();
  let socketEmits = 0;

  setMockModule(path.join(servicesDir, 'sharedDatabase.js'), {
    getSharedPrismaClient: () => prisma,
    getSharedPrismaClientAsync: async () => prisma,
    safeQuery: async (fn) => fn(),
    executeWithRetry: async (fn) => fn(),
  });
  setMockModule(path.join(servicesDir, 'socketService.js'), {
    getIO: () => ({ to: () => ({ emit: () => { socketEmits += 1; } }) }),
  });
  setMockModule(path.join(servicesDir, 'chatMediaArchiveService.js'), {
    archiveAttachments: async (atts) => ({ attachments: atts, originals: [], archivedCount: 0 }),
  });
  setMockModule(path.join(servicesDir, 'botUnsubscribeService.js'), {
    isUnsubscribeText: () => false,
    isUnsubscribed: async () => false,
    recordUnsubscribe: async () => {},
    UNSUBSCRIBE_CONFIRMATION: '',
  });
  setMockModule(path.join(servicesDir, 'botRuleEngine.js'), {
    evaluateInboundBotReply: async () => null,
  });
  setMockModule(path.join(servicesDir, 'botFlowRuntime.js'), {
    onCustomerReply: async () => ({ handled: false }),
  });
  setMockModule(path.join(utilsDir, 'production-facebook-fix.js'), {
    sendProductionFacebookMessage: async () => ({ success: true, messageId: 'm_out_1' }),
    callWithRetry: async (fn) => fn(),
  });
  setMockModule(path.join(servicesDir, 'browserPushService.js'), {
    sendBrowserPushToCompany: async () => {},
  });
  setMockModule(path.join(servicesDir, 'aiSettingsResolver.js'), {
    getEffectiveAiAutoReplySetting: async () => ({ autoReplyEnabled: false }),
  });

  const Module = require('module');
  const origLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === 'uuid') {
      return { v4: () => require('crypto').randomUUID() };
    }
    if (request === 'axios') {
      return {
        get: async () => ({ status: 200, data: { first_name: 'Test', last_name: 'Customer' } }),
        post: async () => ({ status: 200, data: { message_id: 'm_out_1' } }),
      };
    }
    if (request === 'form-data') {
      return function FormDataMock() {};
    }
    return origLoad.apply(this, arguments);
  };

  let handleFacebookMessage;
  let guard;
  try {
    clearModule(path.join(servicesDir, 'inboundDeduplicationGuard.js'));
    clearModule(path.join(utilsDir, 'allFunctions.js'));

    guard = require(path.join(servicesDir, 'inboundDeduplicationGuard.js'));
    guard.resetSchemaEnsureState();
    guard.resetDailyDuplicateCounts();
    ({ handleFacebookMessage } = require(path.join(utilsDir, 'allFunctions.js')));
  } finally {
    Module._load = origLoad;
  }

  const fbEvent = {
    sender: { id: 'psid-user-1' },
    recipient: { id: 'page-1' },
    timestamp: Date.now(),
    message: {
      mid: 'm_fb_img_mid_999',
      attachments: [{ type: 'image', payload: { url: 'https://cdn.example.com/photo.jpg' } }],
    },
  };

  await handleFacebookMessage(fbEvent, 'page-1');
  assert.equal(prisma._messages.length, 1);
  const unreadAfterFirst = prisma._getUnreadCount();
  assert.ok(unreadAfterFirst >= 1);
  const meta = JSON.parse(prisma._messages[0].metadata);
  assert.equal(meta.mid, 'm_fb_img_mid_999');
  assert.equal(meta.externalMessageId, 'm_fb_img_mid_999');
  const emitsAfterFirst = socketEmits;

  // Replay exact same mid -> ignored, unreadCount NOT incremented again
  await handleFacebookMessage(fbEvent, 'page-1');
  assert.equal(prisma._messages.length, 1);
  assert.equal(prisma._getUnreadCount(), unreadAfterFirst, 'Duplicate Messenger delivery must NOT increment unreadCount');
  assert.equal(socketEmits, emitsAfterFirst, 'Duplicate Messenger delivery must NOT emit new_message socket event');
  assert.equal(guard.getDailyDuplicateCount({ channel: 'facebook' }), 1);
});
