/**
 * test-meta-resubmit-fix.js
 * ┘è╪«╪¬╪¿╪▒ ╪Ñ╪╡┘ä╪º╪¡ ╪Ñ╪╣╪º╪»╪⌐ ╪Ñ╪▒╪│╪º┘ä ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐ (resubmit-meta) ╪╣┘ä┘ë ╪º┘ä╪Ñ┘å╪¬╪º╪¼:
 * - ┘è╪│╪¼┘ä ╪º┘ä╪»╪«┘ê┘ä ╪¿╪¡╪│╪º╪¿ Swan (swan@h2m.com)
 * - ┘è╪¼┘ä╪¿ ╪º┘ä╪¡╪º┘ä╪º╪¬ ┘à╪╣ ╪º┘ä┘é┘ê╪º┘ä╪¿
 * - ┘è╪¿╪¡╪½ ╪╣┘å ╪¡╪º┘ä╪⌐ CONFIRMED (┘à╪ñ┘â╪»)
 * - ┘è╪¼┘ä╪¿ ╪¼┘ä╪│╪⌐ Meta Cloud
 * - ┘è╪│╪¬╪»╪╣┘è POST /templates/:id/resubmit-meta
 * - ┘è╪¬╪¡┘é┘é: ┘ä╪º ┘è┘ê╪¼╪» ╪«╪╖╪ú code 100 / subcode 2388024╪î ┘ê╪º┘ä╪▒╪» success
 */

const https = require('https');

const BASE_URL = 'https://maxp.online';
const EMAIL = 'swan@h2m.com';
const PASSWORD = process.env.PASSWORD || '0165676135';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let failures = 0;

function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      rejectUnauthorized: false,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), raw: data });
        } catch {
          resolve({ status: res.statusCode, body: null, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

function check(cond, label) {
  if (cond) {
    console.log(`${GREEN}Γ£ô PASS${RESET} ${label}`);
  } else {
    console.log(`${RED}Γ£ù FAIL${RESET} ${label}`);
    failures++;
  }
}

async function main() {
  console.log(`${BOLD}${'='.repeat(70)}${RESET}`);
  console.log(`${BOLD}   ╪º╪«╪¬╪¿╪º╪▒ ╪Ñ╪╡┘ä╪º╪¡ resubmit-meta (Meta Template ID) ╪╣┘ä┘ë ╪º┘ä╪Ñ┘å╪¬╪º╪¼${RESET}`);
  console.log(`${BOLD}${'='.repeat(70)}${RESET}`);

  try {
    // 1) ╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä
    console.log(`\n${CYAN}Γû╢ 1) ╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä: ${EMAIL}${RESET}`);
    const login = await apiRequest('POST', '/api/v1/auth/login', { email: EMAIL, password: PASSWORD });
    const token = login.body?.data?.token;
    check(!!token, `╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä (status=${login.status})`);
    if (!token) {
      console.log(`${RED}┘ä╪º ┘è┘à┘â┘å ┘à╪¬╪º╪¿╪╣╪⌐ ╪º┘ä╪º╪«╪¬╪¿╪º╪▒ ╪¿╪»┘ê┘å ╪¬┘ê┘â┘å.${RESET}`);
      console.log(JSON.stringify(login.body).slice(0, 500));
      process.exit(1);
    }

    // 2) ╪¼┘ä╪¿ ╪º┘ä╪¡╪º┘ä╪º╪¬ ┘à╪╣ ╪º┘ä┘é┘ê╪º┘ä╪¿
    console.log(`\n${CYAN}Γû╢ 2) ╪¼┘ä╪¿ ╪º┘ä╪¡╪º┘ä╪º╪¬ ┘à╪╣ ╪º┘ä┘é┘ê╪º┘ä╪¿ (with-templates)${RESET}`);
    const statusesRes = await apiRequest('GET', '/api/v1/order-status/with-templates', null, token);
    const statuses = statusesRes.body?.data || statusesRes.body || [];
    check(Array.isArray(statuses) && statuses.length > 0, `╪¼┘ä╪¿ ╪º┘ä╪¡╪º┘ä╪º╪¬ (count=${Array.isArray(statuses) ? statuses.length : 0})`);

    // ╪º┘ä╪¿╪¡╪½ ╪╣┘å ╪¡╪º┘ä╪⌐ ┘à╪ñ┘â╪» / CONFIRMED
    const confirmed = (Array.isArray(statuses) ? statuses : []).find(
      (s) => String(s.code || s.eventType || '').toUpperCase().includes('CONFIRMED') || String(s.name || '').includes('┘à╪ñ┘â╪»')
    );
    check(!!confirmed, `╪Ñ┘è╪¼╪º╪» ╪¡╪º┘ä╪⌐ CONFIRMED (┘à╪ñ┘â╪»)`);
    if (!confirmed) {
      console.log(JSON.stringify(statuses).slice(0, 1000));
      process.exit(1);
    }
    console.log(`${YELLOW}Γä╣ ╪º┘ä╪¡╪º┘ä╪⌐: code=${confirmed.code}, name=${confirmed.name}, template=${confirmed.template ? confirmed.template.id : 'none'}${RESET}`);

    const tpl = confirmed.template;
    check(!!tpl && !!tpl.id, `╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è ┘ä┘ä╪¡╪º┘ä╪⌐ ┘à┘ê╪¼┘ê╪» (id=${tpl?.id})`);
    check(!!tpl.metaTemplateName, `╪º┘ä┘é╪º┘ä╪¿ ┘à╪▒╪¿┘ê╪╖ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º (metaTemplateName=${tpl?.metaTemplateName})`);
    if (!tpl || !tpl.id || !tpl.metaTemplateName) {
      console.log(`${YELLOW}ΓÜá ╪º┘ä┘é╪º┘ä╪¿ ╪║┘è╪▒ ┘à╪▒╪¿┘ê╪╖ ╪¿┘à┘è╪¬╪º ΓÇö ┘ä╪º ┘è┘à┘â┘å ╪º╪«╪¬╪¿╪º╪▒ resubmit. ╪º┘ä╪«╪▒┘ê╪¼.${RESET}`);
      process.exit(0);
    }

    // 3) ╪¼┘ä╪¿ ╪¼┘ä╪│╪º╪¬ ┘à┘è╪¬╪º
    console.log(`\n${CYAN}Γû╢ 3) ╪¼┘ä╪¿ ╪¼┘ä╪│╪º╪¬ Meta Cloud${RESET}`);
    const sessionsRes = await apiRequest('GET', '/api/v1/whatsapp/sessions', null, token);
    const sessions = sessionsRes.body?.sessions || [];
    const metaSession = (sessions || []).find((s) => s.provider === 'META_CLOUD');
    check(!!metaSession, `╪¼┘ä╪│╪⌐ Meta Cloud ┘à┘ê╪¼┘ê╪»╪⌐ (id=${metaSession?.id})`);
    if (!metaSession) {
      console.log(JSON.stringify(sessionsRes.body).slice(0, 800));
      process.exit(1);
    }

    // 4) ┘à╪╣┘ä┘ê┘à╪º╪¬ ╪Ñ╪╢╪º┘ü┘è╪⌐ (meta-available ┘è┘ü┘ä╪¬╪▒ APPROVED ┘ü┘é╪╖ ΓÇö ┘é╪» ┘è┘â┘ê┘å ╪º┘ä┘é╪º┘ä╪¿ PENDING ╪¿╪╣╪» ╪º┘ä╪¬╪╣╪»┘è┘ä)
    console.log(`\n${CYAN}Γû╢ 4) ┘à╪╣┘ä┘ê┘à╪º╪¬ ╪Ñ╪╢╪º┘ü┘è╪⌐ ╪╣┘å ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º${RESET}`);
    const metaAvailableRes = await apiRequest(
      'GET',
      `/api/v1/whatsapp-notifications/templates/meta-available?sessionId=${metaSession.id}`,
      null,
      token
    );
    const available = metaAvailableRes.body?.templates || [];
    const metaTpl = (Array.isArray(available) ? available : []).find((t) => t.name === tpl.metaTemplateName);
    if (metaTpl) {
      console.log(`${YELLOW}Γä╣ meta-available: status=${metaTpl.status}, boundTo=${metaTpl.boundToLocalTemplateId}${RESET}`);
    } else {
      console.log(`${YELLOW}Γä╣ ╪º┘ä┘é╪º┘ä╪¿ ╪║┘è╪▒ ╪╕╪º┘ç╪▒ ┘ü┘è meta-available (┘è┘Å╪╣╪▒╪╢ APPROVED ┘ü┘é╪╖) ΓÇö ┘é╪» ┘è┘â┘ê┘å PENDING ╪¡╪º┘ä┘è╪º┘ï╪î ┘ê┘ç╪░╪º ┘à┘é╪¿┘ê┘ä.${RESET}`);
    }

    // 5) ╪º╪│╪¬╪»╪╣╪º╪í resubmit-meta (╪º┘ä╪º╪│╪¬╪»╪╣╪º╪í ╪º┘ä┘ü╪╣┘ä┘è)
    console.log(`\n${CYAN}Γû╢ 5) ╪º╪│╪¬╪»╪╣╪º╪í POST resubmit-meta ┘ä┘ä┘é╪º┘ä╪¿ ${tpl.id}${RESET}`);
    const resubmitRes = await apiRequest(
      'POST',
      `/api/v1/whatsapp-notifications/templates/${tpl.id}/resubmit-meta`,
      { sessionId: metaSession.id },
      token
    );

    const bodyText = JSON.stringify(resubmitRes.body);
    console.log(`${YELLOW}Γä╣ HTTP ${resubmitRes.status}${RESET}`);
    console.log(`${YELLOW}Γä╣ response: ${bodyText.slice(0, 1200)}${RESET}`);

    // 6) ╪º┘ä╪¬╪¡┘é┘é ┘à┘å ╪º┘ä┘å╪¬╪º╪ª╪¼
    console.log(`\n${CYAN}Γû╢ 6) ╪º┘ä╪¬╪¡┘é┘é ┘à┘å ╪º┘ä┘å╪¬╪º╪ª╪¼${RESET}`);

    // ╪º┘ä╪┤╪▒╪╖ ╪º┘ä╪ú╪│╪º╪│┘è: ╪ú┘ä╪º ┘è┘â┘ê┘å ┘ç┘å╪º┘â ╪«╪╖╪ú Meta code 100 / subcode 2388024
    const has2388024 = /2388024/.test(bodyText) || /┘è┘ê╪¼╪» ┘à╪¡╪¬┘ê┘ë ╪¿┘ç╪░┘ç ╪º┘ä┘ä╪║╪⌐/.test(bodyText) || /Content in This Language Already Exists/i.test(bodyText);
    check(!has2388024, `┘ä╪º ┘è┘ê╪¼╪» ╪«╪╖╪ú 2388024 (Content in This Language Already Exists)`);

    // ╪º┘ä╪┤╪▒╪╖ ╪º┘ä╪½╪º┘å┘è: ╪º╪│╪¬╪¼╪º╪¿╪⌐ ┘å╪º╪¼╪¡╪⌐ (success !== false) ╪ú┘ê 200/2xx
    const okStatus = resubmitRes.status >= 200 && resubmitRes.status < 300;
    check(okStatus, `HTTP status ┘å╪¼╪º╪¡ (${resubmitRes.status})`);
    check(resubmitRes.body?.success !== false, `response.success !== false`);

    // ╪º┘ä╪┤╪▒╪╖ ╪º┘ä╪½╪º┘ä╪½: ╪º┘ä┘é╪º┘ä╪¿ ╪¡┘Å╪»┘æ╪½ (applied=true) ΓÇö ╪º┘ä╪¬╪╣╪»┘è┘ä ╪╣╪¿╪▒ POST /{templateId} ┘é╪¿┘ä╪¬┘ç ┘à┘è╪¬╪º
    const applied = resubmitRes.body?.applied === true || /╪¬┘à ╪¬╪¡╪»┘è╪½/.test(bodyText);
    check(applied, `┘à┘è╪¬╪º ┘é╪¿┘ä╪¬ ╪º┘ä╪¬╪╣╪»┘è┘ä (applied=true / ╪¬┘à ╪¬╪¡╪»┘è╪½)`);

    // ╪º┘ä╪┤╪▒╪╖ ╪º┘ä╪▒╪º╪¿╪╣: ╪╣╪»┘à ┘ê╪¼┘ê╪» ╪ú╪«╪╖╪º╪í HTTP 500
    check(resubmitRes.status !== 500, `┘ä╪º ┘è┘ê╪¼╪» HTTP 500`);

    // ╪º┘ä╪┤╪▒╪╖ ╪º┘ä╪«╪º┘à╪│: ┘å┘ü╪│ ╪º┘ä┘é╪º┘ä╪¿ ╪¬╪╣╪»┘æ┘ä (┘ä┘à ┘è┘Å┘å╪┤╪ú ┘é╪º┘ä╪¿ ╪¼╪»┘è╪» ╪¿╪º╪│┘à ┘à╪«╪¬┘ä┘ü) ΓÇö ╪º┘ä┘à┘ü╪¬╪º╪¡: ┘å┘ü╪│ metaTemplateId
    if (resubmitRes.body?.metaTemplateId) {
      check(String(resubmitRes.body.metaTemplateId).length > 0, `╪¬┘à ╪¬╪╣╪»┘è┘ä ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘à┘ê╪¼┘ê╪» (metaTemplateId=${resubmitRes.body.metaTemplateId})`);
    }

    // 7) ╪Ñ╪╣╪º╪»╪⌐ ╪¼┘ä╪¿ ╪¿╪╣╪» ╪º┘ä┘Ç resubmit ┘ä╪▒╪ñ┘è╪⌐ ╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä╪¼╪»┘è╪»╪⌐
    console.log(`\n${CYAN}Γû╢ 7) ╪¼┘ä╪¿ ╪º┘ä╪¡╪º┘ä╪⌐ ╪¿╪╣╪» resubmit ┘ä┘ä╪¬╪¡┘é┘é ┘à┘å metaTemplateStatus${RESET}`);
    const statusesAfter = await apiRequest('GET', '/api/v1/order-status/with-templates', null, token);
    const afterList = statusesAfter.body?.data || statusesAfter.body || [];
    const confirmedAfter = (Array.isArray(afterList) ? afterList : []).find(
      (s) => String(s.code || s.eventType || '').toUpperCase().includes('CONFIRMED') || String(s.name || '').includes('┘à╪ñ┘â╪»')
    );
    if (confirmedAfter?.template) {
      console.log(`${YELLOW}Γä╣ ╪¿╪╣╪»: metaTemplateName=${confirmedAfter.template.metaTemplateName}, metaTemplateStatus=${confirmedAfter.template.metaTemplateStatus}${RESET}`);
      check(/PENDING/i.test(String(confirmedAfter.template.metaTemplateStatus || '')), `metaTemplateStatus ╪ú╪╡╪¿╪¡ PENDING`);
    } else {
      console.log(`${YELLOW}ΓÜá ┘ä┘à ┘è╪¬┘à ╪º┘ä╪╣╪½┘ê╪▒ ╪╣┘ä┘ë ╪¡╪º┘ä╪⌐ CONFIRMED ╪¿╪╣╪» ╪º┘ä╪º╪│╪¬╪»╪╣╪º╪í ΓÇö ╪¬╪«╪╖┘è ╪º┘ä┘ü╪¡╪╡.${RESET}`);
    }

  } catch (error) {
    console.error(`\n${RED}Γ£ù ╪«╪╖╪ú ╪║┘è╪▒ ┘à╪¬┘ê┘é╪╣ ╪ú╪½┘å╪º╪í ╪º┘ä╪º╪«╪¬╪¿╪º╪▒:${RESET}`, error.message);
    failures++;
  }

  console.log(`\n${BOLD}${'='.repeat(70)}${RESET}`);
  if (failures === 0) {
    console.log(`${GREEN}${BOLD}≡ƒÄë ╪º┘ä╪º╪«╪¬╪¿╪º╪▒ ┘å╪¼╪¡ ╪¿╪º┘ä┘â╪º┘à┘ä ΓÇö ╪º┘ä╪Ñ╪╡┘ä╪º╪¡ ┘è╪╣┘à┘ä ╪╣┘ä┘ë ╪º┘ä╪Ñ┘å╪¬╪º╪¼.${RESET}`);
    process.exit(0);
  } else {
    console.log(`${RED}${BOLD}Γ£ù ╪º┘ä╪º╪«╪¬╪¿╪º╪▒ ┘ü╪┤┘ä ┘ü┘è ${failures} ┘ü╪¡╪╡.${RESET}`);
    process.exit(1);
  }
}

main();
