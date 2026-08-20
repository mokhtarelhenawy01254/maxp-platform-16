/**
 * diag-meta-update.js ΓÇö ┘è╪╣┘à┘ä ╪»╪º╪«┘ä /var/www/backend2
 * ┘è╪¼╪▒┘æ╪¿ ╪╣╪»╪⌐ ╪╡┘è╪║ URL ┘ä╪¬╪╣╪»┘è┘ä ┘é╪º┘ä╪¿ Meta Cloud API ┘ê┘è╪╖╪¿╪╣ ╪º┘ä╪º╪│╪¬╪¼╪º╪¿╪⌐ ╪º┘ä╪«╪º┘à
 */
const path = require('path');
const backendRoot = path.resolve(__dirname, '..');
const axios = require('axios');
const { getSharedPrismaClient } = require(path.join(backendRoot, 'services/sharedDatabase'));
const { decryptField } = require(path.join(backendRoot, 'utils/fieldEncryption'));

const companyEmail = 'swan@h2m.com';

async function main() {
  const prisma = getSharedPrismaClient();

  const user = await prisma.user.findFirst({ where: { email: companyEmail }, select: { companyId: true } });
  if (!user) { console.log('USER_NOT_FOUND'); return; }
  const session = await prisma.whatsAppSession.findFirst({ where: { companyId: user.companyId, provider: 'META_CLOUD' } });
  if (!session) { console.log('NO_META_SESSION'); return; }

  const apiVersion = session.metaApiVersion || 'v25.0';
  const accessToken = decryptField(session.metaAccessToken);
  const wabaId = session.metaWabaId;
  console.log('apiVersion=' + apiVersion + ' wabaId=' + wabaId + ' sessionId=' + session.id);

  const local = await prisma.whatsAppNotificationTemplate.findFirst({
    where: { companyId: user.companyId, eventType: { equals: 'CONFIRMED', mode: 'insensitive' } },
  });
  console.log('LOCAL metaTemplateName=' + local.metaTemplateName + ' metaTemplateId=' + local.metaTemplateId + ' status=' + local.metaTemplateStatus);

  // ╪¼┘ä╪¿ template id ┘à┘å ┘à┘è╪¬╪º
  const listRes = await axios.get(`https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates`, {
    headers: { Authorization: `Bearer ${accessToken}` }, timeout: 30000,
  });
  const templates = listRes.data?.data || [];
  const found = templates.find((t) => t.name === local.metaTemplateName);
  const templateId = found && found.id;
  console.log('FOUND name=' + (found && found.name) + ' id=' + templateId + ' status=' + (found && found.status));
  if (!templateId) { console.log('NO_TEMPLATE_ID'); return; }

  // ╪º┘ä╪¿┘å╪º╪í
  const { buildMetaTemplatePayload } = require(path.join(backendRoot, 'utils/metaTemplatePayload'));
  const built = buildMetaTemplatePayload(local);
  const bodyWithExample = built.variableCount > 0
    ? { type: 'BODY', text: built.bodyText, example: { body_text: [Array.from({ length: built.variableCount }, (_, i) => `┘é┘è┘à╪⌐ ${i + 1}`)] } }
    : { type: 'BODY', text: built.bodyText };
  const components = [bodyWithExample];
  if (built.buttonsComponent) components.push(built.buttonsComponent);

  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  async function tryUrl(label, method, url, payload) {
    try {
      const r = await axios({ method, url, headers, data: payload, timeout: 30000 });
      console.log(`\n[${label}] SUCCESS ${method} ${url}`);
      console.log('  status=' + r.status);
      console.log('  body=' + JSON.stringify(r.data).slice(0, 600));
      return r.data;
    } catch (e) {
      console.log(`\n[${label}] ERROR ${method} ${url}`);
      console.log('  httpStatus=' + (e.response ? e.response.status : 'n/a'));
      console.log('  rawBody=' + JSON.stringify(e.response ? e.response.data : e.message).slice(0, 800));
      return null;
    }
  }

  // A) POST /{templateId}  ΓÇö ╪º┘ä┘Ç endpoint ╪º┘ä╪╡╪¡┘è╪¡ ╪¡╪│╪¿ ┘ê╪½╪º╪ª┘é ┘à┘è╪¬╪º 2026 (POST ┘à╪¿╪º╪┤╪▒╪⌐ ╪╣┘ä┘ë ╪º┘ä┘Ç template-id)
  await tryUrl('A: directTemplateId', 'post', `https://graph.facebook.com/${apiVersion}/${templateId}`, {
    components, category: built.metaCategory,
  });

  // B) POST /message_templates?name=X  (┘â╪º┘å╪¬ ╪¬┘ü╪┤┘ä ╪¿┘Ç 2388024)
  await tryUrl('B: byNameQuery', 'post', `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates?name=${encodeURIComponent(local.metaTemplateName)}`, {
    components, category: built.metaCategory,
  });

  // C) POST /message_templates/{id}  (┘â╪º┘å╪¬ ╪¬┘ü╪┤┘ä ╪¿┘Ç 2500)
  await tryUrl('C: messageTemplatesById', 'post', `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates/${templateId}`, {
    components, category: built.metaCategory,
  });

  // D) GET /{templateId} ΓÇö ╪º┘ä╪¬╪¡┘é┘é ┘à┘å ╪º┘ä┘é╪º┘ä╪¿ ┘à╪¿╪º╪┤╪▒╪⌐ ╪¿╪º┘ä┘Ç id
  await tryUrl('D: getTemplateById', 'get', `https://graph.facebook.com/${apiVersion}/${templateId}`, null);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('DIAG_FATAL', e.message);
  console.error(JSON.stringify(e.response ? e.response.data : e).slice(0, 800));
  process.exit(1);
});
