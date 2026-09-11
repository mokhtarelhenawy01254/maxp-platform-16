require('dotenv').config();
const aiServiceAdminClient = require('../services/aiServiceAdminClient');

async function testChat() {
  const companyId = 'cmleybpf70028juo2wwpmp8rt';
  const agentId = 'agent_2lRIy-274DXBv0a1bidGQQ';
  const message = 'عايزك تعمل إعلان ممول فيسبوك احترافي لمنتج الداش https://swan.maxp.online/product/dash عشان نطلقه في مصر بميزانية تجريبية 400 جنيه يومياً، وافحص المنتج واقتصادياته واكتب المسودات الإعلانية للزوايا التسويقية الثلاثة واحفظ المسودات كاملة بالأداة المتاحة عندك facebook_ad_create_full_draft واعرضلي تفاصيل المسودات المعتمدة.';

  console.log('--- STARTING MEDIA BUYER FULL RUN (FRESH THREAD 06) ---');
  console.log('Sending message to agent:', message);
  const startTime = Date.now();
  try {
    const res = await aiServiceAdminClient.chatWithAgent({
      companyId,
      agentId,
      message,
      threadId: 'test_swan_media_buyer_dash_06',
    });
    console.log(`--- AGENT RESPONSE RECEIVED (${Date.now() - startTime}ms) ---`);
    console.log('STATUS:', res?.status);
    console.log('REPLY:\n', res?.reply);
    console.log('TOOL CALLS COUNT:', res?.tool_calls?.length);
    console.log('TOOL CALLS SUMMARY:\n', (res?.tool_calls || []).map(tc => `${tc.tool || tc.function?.name}: ${tc.status}`).join('\n'));
    if (res?.tool_calls?.length) {
      console.log('FULL TOOL CALLS:\n', JSON.stringify(res.tool_calls, null, 2));
    }
    if (res?.error) {
      console.log('ERROR:', res.error);
    }
  } catch (err) {
    console.error('FAILED TO CHAT:', err.message);
  } finally {
    setTimeout(() => process.exit(0), 500);
  }
}

testChat();
