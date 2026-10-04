/**
 * Antigravity Telegram Bot Companion
 * Dedicated AI assistant on Telegram for Mokhtar (MaxP Platform).
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'bot.log');

function log(...args) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ` + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
  } catch (e) {}
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8928740164:AAEpi9XmHJHhGssKPd3XnuhDa_rqjEOpGow';
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Dynamic inference key resolution - never hardcoded in repo
function resolveAiKey() {
  if (process.env.OPENCODE_GO_API_KEY) {
    return process.env.OPENCODE_GO_API_KEY.trim();
  }
  const hermesEnvPath = path.join(
    process.env.LOCALAPPDATA || 'C:\\Users\\mokhtar\\AppData\\Local',
    'hermes',
    '.env'
  );
  if (fs.existsSync(hermesEnvPath)) {
    const content = fs.readFileSync(hermesEnvPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('OPENCODE_GO_API_KEY=')) {
        return trimmed.slice('OPENCODE_GO_API_KEY='.length).trim();
      }
    }
  }
  return null;
}

const SYSTEM_PROMPT = `أنت Antigravity (أنتيجرافيتي)، مساعد الذكاء الاصطناعي ورفيق البرمجة والتطوير الخاص بمختار في منصة MaxP.
أسلوبك وطريقتك:
- تتكلم بلهجة مصرية ذكية، ودودة ومباشرة بدون حشو أو مقدمات رسمية مملة ("أهلاً يا مختار"، "يا هلا"، إلخ).
- السؤال السريع ياخد جواب سريع ومباشر، والطلب اللي محتاج تفصيل أو كود ياخد إجابة منظمة وشافية.
- خبير عميق في هندسة البرمجيات، Node.js، React، Tailwind، Python، PostgreSQL، معمارية الـ Microservices، وأتمتة الذكاء الاصطناعي.
- عارف منصة MaxP ومشروعات مختار، ومستعد تناقشه وتفكر معاه وتراجع أفكاره وأكواده وتخطط معاه من أي مكان من تليجرام.
- لو حد سألك مين أنت، وضّح إنك Antigravity المساعد البرمجي المخصص لمختار في MaxP.`;

// In-memory conversation state per chat ID (keeps last 16 turns)
const chatHistories = new Map();
const MAX_HISTORY_TURNS = 16;

function getChatHistory(chatId) {
  if (!chatHistories.has(chatId)) {
    chatHistories.set(chatId, []);
  }
  return chatHistories.get(chatId);
}

function addToHistory(chatId, role, content) {
  const history = getChatHistory(chatId);
  history.push({ role, content });
  if (history.length > MAX_HISTORY_TURNS * 2) {
    history.splice(0, history.length - MAX_HISTORY_TURNS * 2);
  }
}

function clearHistory(chatId) {
  chatHistories.set(chatId, []);
}

// Telegram API helpers
async function callTelegram(method, body = {}) {
  const url = `${TELEGRAM_API_BASE}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return await res.json();
}

async function sendChatAction(chatId, action = 'typing') {
  try {
    await callTelegram('sendChatAction', { chat_id: chatId, action });
  } catch (err) {
    // Non-critical
  }
}

// Split text into chunks <= 4000 characters
function splitMessage(text, maxLen = 4000) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let splitIdx = remaining.lastIndexOf('\n', maxLen);
    if (splitIdx < maxLen * 0.5) {
      splitIdx = remaining.lastIndexOf(' ', maxLen);
    }
    if (splitIdx <= 0) {
      splitIdx = maxLen;
    }
    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx).trimStart();
  }
  return chunks;
}

async function sendTelegramMessage(chatId, text, replyToMessageId = null) {
  const chunks = splitMessage(text);
  for (const chunk of chunks) {
    // Try sending with Markdown first
    let res = await callTelegram('sendMessage', {
      chat_id: chatId,
      text: chunk,
      parse_mode: 'Markdown',
      reply_to_message_id: replyToMessageId,
    });
    // If Markdown parse error, retry as plain text
    if (!res?.ok) {
      res = await callTelegram('sendMessage', {
        chat_id: chatId,
        text: chunk,
        reply_to_message_id: replyToMessageId,
      });
    }
  }
}

// Call LLM
async function generateAiReply(chatId, userMessage) {
  const apiKey = resolveAiKey();
  if (!apiKey) {
    return 'عذراً يا مختار، لم أتمكن من العثور على مفتاح الذكاء الاصطناعي (OPENCODE_GO_API_KEY) في إعدادات النظام.';
  }

  const history = getChatHistory(chatId);
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const startTime = Date.now();
  const res = await fetch('https://opencode.ai/zen/go/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'x-opencode-session': `antigravity_tg_${chatId}`,
    },
    body: JSON.stringify({
      model: 'deepseek-v4.1-flash',
      messages,
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('❌ [LLM Error]:', res.status, errorText);
    return `حصل خطأ أثناء معالجة الطلب من مزود الذكاء الاصطناعي (${res.status}).`;
  }

  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();
  const latency = Date.now() - startTime;
  log(`⚡ [LLM] Replied in ${latency}ms`);

  if (!reply) {
    return 'عذراً، لم أتلقَ رداً واضحاً من النموذج. حاول مرة أخرى.';
  }

  // Update history
  addToHistory(chatId, 'user', userMessage);
  addToHistory(chatId, 'assistant', reply);

  return reply;
}

// Handle incoming message
async function handleMessage(msg) {
  const chatId = msg.chat?.id;
  const text = msg.text?.trim();
  const fromUser = msg.from?.first_name || 'صديقي';

  if (!chatId || !text) return;

  log(`📩 [Msg from ${fromUser} (${chatId})]: ${text.slice(0, 50)}...`);

  // Commands
  if (text === '/start') {
    const welcome = `أهلاً بك يا ${fromUser}! 👋

أنا **Antigravity** — مساعدك الذكي ورفيقك في البرمجة وتطوير منصة MaxP.

تقدر تكلمني في أي وقت من هنا وتسألني عن:
- 💻 كتابة أو مراجعة أي كود أو حل أخطاء (Debugging).
- 🧠 مناقشة أفكار وتصميمات معمارية لمنصة MaxP.
- 📋 تخطيط المهام وتنظيم أولويات الشغل.
- ⚡ أي استشارة برمجية أو تقنية في أي وقت!

أوامر سريعة:
/clear - مسح سياق المحادثة والبدء من جديد.
/status - حالة البوت والنموذج الفعال.
/help - المساعدة.

اكتبلي أي حاجة ويلا ننطلق! 🚀`;
    await sendTelegramMessage(chatId, welcome);
    return;
  }

  if (text === '/clear' || text === '/reset') {
    clearHistory(chatId);
    await sendTelegramMessage(chatId, 'تم مسح ذاكرة وسياق المحادثة السابقة بنجاح! 🧹 تقدر تبدأ موضوع جديد.');
    return;
  }

  if (text === '/status') {
    const historyCount = getChatHistory(chatId).length / 2;
    const statusMsg = `🟢 **حالة Antigravity Bot:**
- النموذج: DeepSeek V4.1 Flash (عالي السرعة)
- التفاعل: متصل ومستعد 24/7
- رسائل السياق الحالية: ${historyCount} أدوار
- التوافق: منصة MaxP`;
    await sendTelegramMessage(chatId, statusMsg);
    return;
  }

  if (text === '/help') {
    const helpMsg = `💡 **كيفية استخدام Antigravity على تليجرام:**

- ببساطة اكتب رسالتك أو سؤالك وكأنك بتكلمني في بيئة التطوير.
- بفتكر المحادثة اللي بيننا علشان نقدر نكمل مناقشة الأفكار بسهولة.
- لو حبيت تفتح موضوع جديد تماماً، اكتب \`/clear\`.
- متاح 24/7 لمساعدتك على مدار الساعة.`;
    await sendTelegramMessage(chatId, helpMsg);
    return;
  }

  // Regular AI processing with typing indicator
  let isThinking = true;
  const typingInterval = setInterval(() => {
    if (isThinking) sendChatAction(chatId, 'typing');
  }, 4000);
  sendChatAction(chatId, 'typing');

  try {
    const reply = await generateAiReply(chatId, text);
    isThinking = false;
    clearInterval(typingInterval);
    await sendTelegramMessage(chatId, reply, msg.message_id);
  } catch (err) {
    isThinking = false;
    clearInterval(typingInterval);
    console.error('❌ [Error handling message]:', err);
    await sendTelegramMessage(chatId, 'عذراً، حدث خطأ غير متوقع أثناء معالجة رسالتك.', msg.message_id);
  }
}

// Process-wide guards so bot never crashes
process.on('uncaughtException', (err) => {
  log('💥 Uncaught exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  log('💥 Unhandled rejection:', reason?.message || reason);
});

// Main Polling Loop
async function startPolling() {
  log('🤖 [Antigravity Bot] Connecting to Telegram...');
  let connected = false;
  while (!connected) {
    try {
      const me = await callTelegram('getMe');
      if (me?.ok) {
        log(`✅ [Telegram] Connected as @${me.result.username} (${me.result.first_name})`);
        connected = true;
      } else {
        log('⚠️ [Telegram] getMe returned not ok, retrying in 5s...', me?.description);
        await new Promise(r => setTimeout(r, 5000));
      }
    } catch (err) {
      log('⚠️ [Telegram] Connection attempt failed, retrying in 5s...', err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  let offset = 0;
  log('🚀 [Antigravity Bot] Polling started. Ready to receive messages!');

  while (true) {
    try {
      const updatesRes = await callTelegram('getUpdates', {
        offset,
        timeout: 25,
        allowed_updates: ['message'],
      });

      if (updatesRes?.ok && Array.isArray(updatesRes.result)) {
        for (const update of updatesRes.result) {
          offset = update.update_id + 1;
          if (update.message) {
            handleMessage(update.message).catch(e => log('Handler error:', e.message));
          }
        }
      } else if (!updatesRes?.ok) {
        log('⚠️ [Telegram] Polling warning:', updatesRes?.description || 'Unknown error');
        await new Promise(r => setTimeout(r, 4000));
      }
    } catch (err) {
      log('⚠️ [Telegram] Polling network hiccup:', err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

startPolling();
