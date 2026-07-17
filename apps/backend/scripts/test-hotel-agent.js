const http = require('http');

const BASE_URL = 'http://localhost:3007';
const EMAIL = 'dev@maxp.test';
const PASSWORD = 'dev123456';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed, raw: data });
        } catch {
          resolve({ status: res.statusCode, body: null, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(90000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  try {
    console.log(`${CYAN}▶ logging in...${RESET}`);
    const loginRes = await apiRequest('POST', '/api/v1/auth/login', { email: EMAIL, password: PASSWORD });
    if (!loginRes.body?.success) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
    }
    const token = loginRes.body.data.token;
    console.log(`${GREEN}✓ Login successful!${RESET}`);

    console.log(`\n${CYAN}▶ Fetching sandbox agents...${RESET}`);
    const listRes = await apiRequest('GET', '/api/v1/ai-sandbox/agents', null, token);
    if (!listRes.body?.success) {
      throw new Error(`Failed to list agents: ${JSON.stringify(listRes.body)}`);
    }

    const agents = listRes.body.agents || [];
    let hotelAgent = agents.find(a => a.templateSlug === 'hotel-agent');

    if (!hotelAgent) {
      console.log(`${YELLOW}⚠ Hotel agent not found, spawning a new one...${RESET}`);
      const spawnRes = await apiRequest('POST', '/api/v1/agent/agents', {
        name: 'ياسمين - موظفة الاستقبال',
        role: 'SUPPORT',
        templateSlug: 'hotel-agent',
        description: 'موظفة استقبال ودودة لتأكيد حجوزات الفندق',
        model: 'deepseek-v4-flash',
        config: {
          tone: 'friendly',
          persona: 'ياسمين موظفة استقبال الفندق',
          goal: 'تأكيد الحجز الفندقي وجمع بيانات العميل بلطف',
          welcome: 'أهلاً بحضرتك يا فندم! نورت فندقنا. حابب أساعدك في حجز غرفة؟',
          boundaries: 'لا تقومي بالتخمين، بل اسألي العميل دائماً عن اسمه ورقم تليفونه وتاريخ الحجز لو كان ناقصاً.'
        }
      }, token);

      if (spawnRes.status !== 201 || !spawnRes.body?.id) {
        throw new Error(`Failed to spawn hotel agent: ${JSON.stringify(spawnRes.body)}`);
      }
      hotelAgent = spawnRes.body;
      console.log(`${GREEN}✓ Spawned new hotel agent: ${hotelAgent.id}${RESET}`);
    } else {
      console.log(`${GREEN}✓ Found existing hotel agent: ${hotelAgent.id}${RESET}`);
    }

    console.log(`\n${CYAN}▶ Updating hotel agent to deepseek-v4-flash model...${RESET}`);
    await apiRequest('PUT', `/api/v1/agent/agents/${hotelAgent.id}`, {
      model: 'deepseek-v4-flash',
      config: {
        tone: 'friendly',
        welcome: 'أهلاً بحضرتك يا فندم! نورت فندقنا. حابب أساعدك في حجز غرفة؟'
      }
    }, token);

    const sessionId = 'test_session_' + Date.now();
    console.log(`\n${CYAN}▶ Creating Sandbox Chat Session: ${sessionId}...${RESET}`);
    const sessionRes = await apiRequest('POST', '/api/v1/ai-sandbox/sessions', {
      agentId: hotelAgent.id,
      title: `Hotel Test - ${new Date().toLocaleTimeString()}`
    }, token);

    const actualSessionId = sessionRes.body?.session?.id;
    if (!actualSessionId) {
      throw new Error(`Failed to create session: ${JSON.stringify(sessionRes.body)}`);
    }
    console.log(`${GREEN}✓ Sandbox Session created: ${actualSessionId}${RESET}`);

    // Message 1: Initial booking request with missing parameters
    console.log(`\n${BOLD}👤 Customer: "عايز أحجز أوضة ديلوكس لشخصين"${RESET}`);
    let chatRes = await apiRequest('POST', '/api/v1/ai-sandbox/chat', {
      sessionId: actualSessionId,
      agentId: hotelAgent.id,
      message: 'عايز أحجز أوضة ديلوكس لشخصين',
      provider: 'DEEPSEEK',
      model: 'deepseek-v4-flash'
    }, token);

    console.log(`${GREEN}🤖 Agent Response:${RESET}\n"${chatRes.body?.result?.reply || chatRes.body?.reply}"`);
    
    const toolCalls1 = chatRes.body?.result?.tool_calls || chatRes.body?.tool_calls || [];
    console.log(`${YELLOW}Tool Calls executed: ${toolCalls1.length}${RESET}`);
    if (toolCalls1.length > 0) {
      console.log(`${RED}❌ ERROR: Agent immediately executed tool calls instead of slot-filling!${RESET}`);
    } else {
      console.log(`${GREEN}✓ Success: Agent did not trigger immediate reservation without customer details.${RESET}`);
    }

    // Message 2: Customer provides details
    console.log(`\n${BOLD}👤 Customer: "اسمي أحمد، ورقم موبايلي 01012345678، والتاريخ من 2026-07-20 إلى 2026-07-22"${RESET}`);
    chatRes = await apiRequest('POST', '/api/v1/ai-sandbox/chat', {
      sessionId: actualSessionId,
      agentId: hotelAgent.id,
      message: 'اسمي أحمد، ورقم موبايلي 01012345678، والتاريخ من 2026-07-20 إلى 2026-07-22',
      provider: 'DEEPSEEK',
      model: 'deepseek-v4-flash'
    }, token);

    console.log(`${GREEN}🤖 Agent Response:${RESET}\n"${chatRes.body?.result?.reply || chatRes.body?.reply}"`);
    const toolCalls2 = chatRes.body?.result?.tool_calls || chatRes.body?.tool_calls || [];
    console.log(`${YELLOW}Tool Calls executed: ${toolCalls2.length}${RESET}`);

    // Message 3: Customer confirms
    console.log(`\n${BOLD}👤 Customer: "تمام موافق احجزلي"${RESET}`);
    chatRes = await apiRequest('POST', '/api/v1/ai-sandbox/chat', {
      sessionId: actualSessionId,
      agentId: hotelAgent.id,
      message: 'تمام موافق احجزلي',
      provider: 'DEEPSEEK',
      model: 'deepseek-v4-flash'
    }, token);

    console.log(`${GREEN}🤖 Agent Response:${RESET}\n"${chatRes.body?.result?.reply || chatRes.body?.reply}"`);
    const toolCalls3 = chatRes.body?.result?.tool_calls || chatRes.body?.tool_calls || [];
    console.log(`${YELLOW}Tool Calls executed: ${toolCalls3.length}${RESET}`);
    if (toolCalls3.length > 0 || (chatRes.body?.result?.tool_evidence && chatRes.body.result.tool_evidence.length > 0)) {
      console.log(`${GREEN}✓ Success: Agent successfully called reservation tools upon confirmation!${RESET}`);
    } else {
      console.log(`${RED}❌ Warning: No tool call details found in final confirmation response.${RESET}`);
    }

  } catch (error) {
    console.error(`${RED}❌ Execution error:${RESET}`, error);
  }
}

run();
