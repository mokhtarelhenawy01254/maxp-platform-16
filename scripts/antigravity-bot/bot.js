/**
 * Antigravity Telegram Bot Companion (v2.0 - Tool-Enabled Autonomous Agent)
 * Connected to MaxP Platform workspace (H:\maxp-platform).
 * Open for all authorized operators & team members on Telegram.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const WORKSPACE_DIR = 'H:\\maxp-platform';
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

const SYSTEM_PROMPT = `أنت Antigravity (أنتيجرافيتي)، مساعد ورفيق البرمجة والتطوير الذكي لمختار وفريق منصة MaxP.
أنت متصل مباشرة بنظام التشغيل وبيئة العمل الحية على المسار: H:\\maxp-platform (Windows).

قواعد العمل والتنفيذ الإلزامية الصارمة (قانون العمل الفوري):
1. اللهجة: تتكلم بلهجة مصرية ذكية، عملية ومباشرة بدون مقدمات مطولة ("أهلاً يا باشا"، "تمام هفحص حالا"، إلخ).
2. حظر الوعود والكلام الإنشائي بدون تنفيذ (Strict Immediate Execution):
   - ممنوع منعاً باتاً تحت أي ظرف أن تجيب بكلام نظري، تسويف، أو وعود (مثل: "حاضر هفحص"، "سأقوم بفحص السيرفر"، "دعني أتحقق"، "اكتب هذا الأمر") دون استدعاء الأداة المناسبة في نفس الرد الأول!
   - إذا طلب المستخدم فحصاً (سيرفر، ملف، خطأ، git، إلخ) أو تشغيل أمر أو تعديل كود؛ ردك الأول يجب أن يكون Tool Call حقيقياً (مثل run_command أو read_file) فوراً.
3. أدواتك التنفيذية الحقيقية (Tools):
   - run_command: لتشغيل أي أمر في PowerShell أو فحص Git أو تنفيذ أوامر SSH للسيرفر واختبار الشبكة والخدمات.
   - read_file: لقراءة وفحص ملفات المشروع الفعلية (مع أرقام الأسطر).
   - write_file: لإنشاء أو تعديل الأكواد والملفات في المشروع.
   - list_directory: لاستعراض محتويات المجلدات.
4. سيرفر MaxP الإنتاجي:
   - Host: srv974554.hstgr.cloud (أو 153.92.223.119)
   - أمر SSH التلقائي المعتمد: ssh -i ~/.ssh/maxp_server -o StrictHostKeyChecking=no root@srv974554.hstgr.cloud "<command>"
   - إذا طلب المستخدم فحص السيرفر أو مشكلة في النظام أو خدمات PM2، نفّذ فوراً:
     run_command({ command: 'ssh -i ~/.ssh/maxp_server -o StrictHostKeyChecking=no root@srv974554.hstgr.cloud "df -h; echo ---; free -h; echo ---; pm2 status; echo ---; uptime"' })
5. بعد تشغيل الأدوات ووصول النتيجة، اشرح النتيجة الحرفية باختصار شديد ووضوح، مع تقديم الحل أو الخطوة التالية مباشرة.
6. متاح للتحدث مع أي شخص من فريق العمل عبر تليجرام، وتدير سياق كل محادثة بشكل مستقل.`;

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
async function callTelegram(method, body = {}, timeoutMs = 45000) {
  const url = `${TELEGRAM_API_BASE}/${method}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Telegram API timeout after ${timeoutMs}ms for ${method}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Intent detectors to force tool execution and ban conversational stalling
function isActionableIntent(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  const actionablePatterns = [
    /(افحص|شوف|شغل|نفذ|اقرأ|اقرا|وريني|هات|راجع|صلح|عدل|اكتب|اعمل|فحص|تشغيل|تنفيذ|جرب|جيب|استعرض)/i,
    /(سيرفر|server|ssh|git|status|log|logs|pm2|nginx|docker|curl|ping|port|api)/i,
    /(ملف|فايل|كود|error|مشكلة|خطأ|عطل|واقف|مش شغال|تهنيج|داون|down|ريسورس|resources)/i,
    /(h:\\|c:\\|\.js|\.ts|\.json|\.env|\.sql|\.prisma|\.sh|\.conf)/i,
    /(root@|153\.92|srv974554)/i
  ];
  return actionablePatterns.some(pattern => pattern.test(lower));
}

function containsStallingPhrases(text) {
  if (!text) return false;
  return /(هفحص|سأقوم|سأفحص|جاري الفحص|دعني أفحص|سأتحقق|سأراجع|تمام هشوف|حاضر هفحص|سوف أقوم|هقوم بفحص|سأباشر|حالاً هفحص)/i.test(text);
}

async function sendChatAction(chatId, action = 'typing') {
  try {
    await callTelegram('sendChatAction', { chat_id: chatId, action });
  } catch (err) {}
}

function splitMessage(text, maxLen = 4000) {
  if (!text) return [''];
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
    let res = await callTelegram('sendMessage', {
      chat_id: chatId,
      text: chunk,
      parse_mode: 'Markdown',
      reply_to_message_id: replyToMessageId,
    });
    if (!res?.ok) {
      res = await callTelegram('sendMessage', {
        chat_id: chatId,
        text: chunk,
        reply_to_message_id: replyToMessageId,
      });
    }
  }
}

// Tool Definitions
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Execute a command in PowerShell within H:\\maxp-platform, or run SSH commands to the server. Returns stdout and stderr.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The exact command string to execute (e.g. git status, ssh ..., dir, npm test)' },
          timeoutMs: { type: 'number', description: 'Timeout in milliseconds (default 30000)' }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file in the workspace or system with line numbers.',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to file (relative to H:\\maxp-platform or absolute)' },
          startLine: { type: 'number', description: 'Optional 1-indexed start line' },
          endLine: { type: 'number', description: 'Optional 1-indexed end line' }
        },
        required: ['filePath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write or overwrite content to a file in the workspace.',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'File path to write' },
          content: { type: 'string', description: 'Text content to save' }
        },
        required: ['filePath', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'List contents of a directory in the workspace or filesystem.',
      parameters: {
        type: 'object',
        properties: {
          dirPath: { type: 'string', description: 'Directory path (relative to H:\\maxp-platform or absolute, default is workspace root)' }
        },
        required: []
      }
    }
  }
];

// Tool Executors
async function executeTool(name, args) {
  log(`⚙️ [Tool Call] ${name}:`, JSON.stringify(args).slice(0, 150));

  if (name === 'run_command') {
    const rawCmd = args.command || '';
    const timeout = args.timeoutMs || 30000;

    // Safety guard against catastrophic OS destructive commands
    const lower = rawCmd.toLowerCase();
    if (lower.includes('format c:') || lower.includes('rmdir /s /q c:\\windows') || lower.includes('stop-computer')) {
      return 'Error: Blocked dangerous system destruction command.';
    }

    return new Promise((resolve) => {
      exec(rawCmd, { cwd: WORKSPACE_DIR, shell: 'powershell.exe', timeout, maxBuffer: 1024 * 1024 * 2 }, (error, stdout, stderr) => {
        let out = '';
        if (stdout) out += stdout;
        if (stderr) out += (out ? '\n[STDERR]\n' : '') + stderr;
        if (error && !out) out = `Command failed: ${error.message}`;
        if (!out) out = '(Command executed with empty output)';
        if (out.length > 3500) {
          out = out.slice(0, 3500) + '\n... [output truncated]';
        }
        resolve(out);
      });
    });
  }

  if (name === 'read_file') {
    const targetPath = path.isAbsolute(args.filePath)
      ? args.filePath
      : path.join(WORKSPACE_DIR, args.filePath);

    if (!fs.existsSync(targetPath)) {
      return `Error: File not found: ${args.filePath}`;
    }

    try {
      const content = fs.readFileSync(targetPath, 'utf8');
      const lines = content.split('\n');
      const start = args.startLine ? Math.max(1, args.startLine) : 1;
      const end = args.endLine ? Math.min(lines.length, args.endLine) : Math.min(lines.length, start + 300);

      const numbered = lines
        .slice(start - 1, end)
        .map((line, idx) => `${start + idx}: ${line}`)
        .join('\n');

      return `File: ${args.filePath} (lines ${start}-${end} of ${lines.length}):\n${numbered.slice(0, 3500)}`;
    } catch (err) {
      return `Error reading file: ${err.message}`;
    }
  }

  if (name === 'write_file') {
    const targetPath = path.isAbsolute(args.filePath)
      ? args.filePath
      : path.join(WORKSPACE_DIR, args.filePath);

    try {
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(targetPath, args.content, 'utf8');
      return `Success: File written successfully (${args.content.length} characters) at ${args.filePath}`;
    } catch (err) {
      return `Error writing file: ${err.message}`;
    }
  }

  if (name === 'list_directory') {
    const targetDir = args.dirPath
      ? (path.isAbsolute(args.dirPath) ? args.dirPath : path.join(WORKSPACE_DIR, args.dirPath))
      : WORKSPACE_DIR;

    if (!fs.existsSync(targetDir)) {
      return `Error: Directory not found: ${targetDir}`;
    }

    try {
      const entries = fs.readdirSync(targetDir, { withFileTypes: true });
      const summary = entries.slice(0, 100).map(e => {
        const type = e.isDirectory() ? '[DIR]' : '[FILE]';
        return `${type} ${e.name}`;
      }).join('\n');
      return `Directory contents (${entries.length} items):\n${summary}`;
    } catch (err) {
      return `Error listing directory: ${err.message}`;
    }
  }

  return `Error: Unknown tool ${name}`;
}

// Call LLM with Multi-Step Tool Calling Loop
async function generateAiReply(chatId, userMessage) {
  const apiKey = resolveAiKey();
  if (!apiKey) {
    return 'عذراً، لم أتمكن من العثور على مفتاح الذكاء الاصطناعي (OPENCODE_GO_API_KEY) في إعدادات النظام.';
  }

  const history = getChatHistory(chatId);
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const startTime = Date.now();
  const maxIterations = 8;
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

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
        tools: TOOLS,
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ [LLM Error]:', res.status, errorText);
      return `حصل خطأ أثناء معالجة الطلب (${res.status}).`;
    }

    const data = await res.json();
    const message = data?.choices?.[0]?.message;

    if (!message) {
      return 'عذراً، لم أتلقَ رداً واضحاً من النموذج.';
    }

    // Check if model wants to call tools
    if (message.tool_calls && message.tool_calls.length > 0) {
      messages.push(message);

      for (const call of message.tool_calls) {
        let args = {};
        try {
          args = typeof call.function.arguments === 'string'
            ? JSON.parse(call.function.arguments)
            : call.function.arguments;
        } catch (e) {
          args = {};
        }

        sendChatAction(chatId, 'typing');
        const toolResult = await executeTool(call.function.name, args);

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: String(toolResult),
        });
      }

      // Loop continues to next iteration to let model inspect output
      continue;
    }

    // Anti-Stalling Interceptor: Prevent conversational evasion when action is requested
    const actionable = isActionableIntent(userMessage);
    const stalling = containsStallingPhrases(message.content);
    if (iteration === 1 && (actionable || stalling)) {
      log(`⚠️ [Interceptor] Model responded with text instead of executing ("${(message.content || '').slice(0, 60)}..."). Enforcing immediate tool execution pass...`);
      messages.push(message);
      messages.push({
        role: 'user',
        content: 'قانون التنفيذ الإلزامي: لقد رددت بنص إنشائي دون استدعاء أي أداة! المطلوب هو التنفيذ الفعلي فوراً دون أي كلام نظري. استدعِ الأداة المناسبة (run_command أو read_file أو غيرها) حالاً ونفذ الأمر الحقيقي.',
      });
      continue;
    }

    // Final response reached
    const reply = message.content?.trim();
    const latency = Date.now() - startTime;
    log(`⚡ [LLM] Completed in ${latency}ms (iterations: ${iteration})`);

    if (!reply) {
      return 'تم تنفيذ العملية بنجاح.';
    }

    // Update persistent history
    addToHistory(chatId, 'user', userMessage);
    addToHistory(chatId, 'assistant', reply);

    return reply;
  }

  return 'عذراً، استغرقت العملية خطوات تنفيذ كثيرة دون اكتمال. يرجى تبسيط الطلب.';
}

// Handle incoming message (Open for ALL users)
async function handleMessage(msg) {
  const chatId = msg.chat?.id;
  const text = msg.text?.trim();
  const fromUser = msg.from?.first_name || 'صديقي';

  if (!chatId || !text) return;

  log(`📩 [Msg from ${fromUser} (${chatId})]: ${text.slice(0, 50)}...`);

  // Commands
  if (text === '/start') {
    const welcome = `أهلاً بك يا ${fromUser}! 👋

أنا **Antigravity** — رفيقك البرمجي المتصل مباشرة بمشروع منصة **MaxP** (H:\\maxp-platform).

أنا الآن مجهز بأدوات تنفيذ كاملة:
- ⚡ تشغيل أوامر النظام و Git وفحص السيرفر (\`run_command\`).
- 📂 قراءة وفحص ملفات المشروع لايف (\`read_file\`).
- ✍️ تعديل وإنشاء الملفات والأكواد (\`write_file\`).
- 📁 استعراض المجلدات والملفات (\`list_directory\`).

أوامر سريعة:
/status - حالة الاتصال والأدوات.
/clear - مسح سياق المحادثة والبدء من جديد.
/help - المساعدة.

اطلب مني أي حاجة في المشروع أو السيرفر وهنفذها فوراً! 🚀`;
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
    const statusMsg = `🟢 **حالة Antigravity Bot (Live Workspace Agent):**
- مسار العمل: \`H:\\maxp-platform\`
- النموذج: DeepSeek V4.1 Flash (Tool-Calling ReAct Engine)
- الأدوات النشطة: \`run_command\`, \`read_file\`, \`write_file\`, \`list_directory\`
- وضع الوصول: متاح لجميع أعضاء الفريق (Open Access)
- رسائل السياق الحالية لك: ${historyCount} أدوار`;
    await sendTelegramMessage(chatId, statusMsg);
    return;
  }

  if (text === '/help') {
    const helpMsg = `💡 **كيفية استخدام Antigravity على تليجرام:**
- اكتب سؤالك أو طلبك مباشرة (مثال: "اقرأ ملف prisma/schema/main.prisma" أو "افحص git status" أو "شوف حالة السيرفر").
- البوت بيستخدم الأدوات مباشرة وبينفذ المطلوب وبيجيبلك النتيجة الحرفية.
- لمسح سياق الجلسة، اكتب \`/clear\`.`;
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
    await sendTelegramMessage(chatId, `عذراً، حدث خطأ: ${err.message}`, msg.message_id);
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
  log('🚀 [Antigravity Bot v2.0] Polling started with live tools! Ready for all users.');

  while (true) {
    try {
      const updatesRes = await callTelegram('getUpdates', {
        offset,
        timeout: 25,
        allowed_updates: ['message'],
      }, 40000);

      if (updatesRes?.ok && Array.isArray(updatesRes.result)) {
        if (updatesRes.result.length > 0) {
          log(`📥 [Telegram] Received ${updatesRes.result.length} update(s)`);
        }
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
