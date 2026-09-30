/**
 * Script to normalize and ensure 2-piece and 3-piece quantity offers on Swan's products
 * and sync Yasmin's instructions in the database.
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const SWAN_COMPANY_ID = 'cmleybpf70028juo2wwpmp8rt';
const YASMINE_AGENT_ID = 'agent_LSqKxvBVSJL2AO7ItWQKZQ';

async function main() {
  console.log('🔄 Checking Swan products for company:', SWAN_COMPANY_ID);

  const products = await prisma.product.findMany({
    where: { companyId: SWAN_COMPANY_ID, deletedAt: null },
    select: { id: true, name: true, price: true, comparePrice: true, metadata: true },
  });

  console.log(`Found ${products.length} products for Swan.`);

  for (const p of products) {
    let meta = {};
    if (typeof p.metadata === 'object' && p.metadata !== null) {
      meta = { ...p.metadata };
    } else if (typeof p.metadata === 'string' && p.metadata.trim()) {
      try {
        meta = JSON.parse(p.metadata);
      } catch (e) {
        meta = {};
      }
    }

    const price = Number(p.price) || 0;
    const comparePrice = p.comparePrice ? Number(p.comparePrice) : price;
    const refPrice = comparePrice > price ? comparePrice : price;

    let offers = Array.isArray(meta.quantityOffers) ? meta.quantityOffers : [];

    if (!offers || offers.length === 0) {
      // Create standard 2-piece and 3-piece offers
      const unit2 = Math.max(price - 20, 1);
      const total2 = unit2 * 2;
      const orig2 = refPrice * 2;

      const unit3 = Math.max(price - 30, 1);
      const total3 = unit3 * 3;
      const orig3 = refPrice * 3;

      offers = [
        {
          id: `offer-${Date.now()}-2`,
          buyText: orig2 > total2 ? `اشتري قطعتين بـ ${total2} بدل ${orig2} ج.م` : `اشتري قطعتين بـ ${total2} ج.م`,
          quantity: 2,
          unitPrice: unit2,
          badgeType: 'most_saving',
        },
        {
          id: `offer-${Date.now()}-3`,
          buyText: orig3 > total3 ? `اشتري 3 قطع بـ ${total3} بدل ${orig3} ج.م` : `اشتري 3 قطع بـ ${total3} ج.م`,
          quantity: 3,
          unitPrice: unit3,
          badgeType: 'none',
        },
      ];
      console.log(`➕ Added 2 & 3 piece offers for product "${p.name}" (Price: ${price})`);
    } else {
      // Fix typos (e.g. "اشتري 2 قطعة" on quantity=3) and update buyText
      offers = offers.map((off) => {
        const qty = Number(off.quantity || off.minQuantity) || 0;
        const unit = Number(off.unitPrice || off.price) || price;
        const total = Number(off.totalPrice) || (qty * unit);
        const origTotal = refPrice * qty;

        let buyText = off.buyText || '';
        if (qty === 2) {
          buyText = origTotal > total ? `اشتري قطعتين بـ ${total} بدل ${origTotal} ج.م` : `اشتري قطعتين بـ ${total} ج.م`;
        } else if (qty === 3) {
          buyText = origTotal > total ? `اشتري 3 قطع بـ ${total} بدل ${origTotal} ج.م` : `اشتري 3 قطع بـ ${total} ج.م`;
        } else if (qty > 3) {
          buyText = origTotal > total ? `اشتري ${qty} قطع بـ ${total} بدل ${origTotal} ج.م` : `اشتري ${qty} قطع بـ ${total} ج.م`;
        }
        return {
          ...off,
          quantity: qty,
          unitPrice: unit,
          buyText,
        };
      });
      console.log(`🔧 Normalized offers for product "${p.name}" (${offers.length} offers)`);
    }

    meta.quantityOffers = offers;

    await prisma.product.update({
      where: { id: p.id },
      data: { metadata: JSON.stringify(meta) },
    });
  }

  console.log('✅ All Swan products updated with accurate quantityOffers.');

  // Update Yasmin in ai.agents directly via SQL
  try {
    const agentRows = await prisma.$queryRawUnsafe(`SELECT id, persona FROM ai.agents WHERE id = $1`, YASMINE_AGENT_ID);
    if (agentRows && agentRows.length > 0) {
      let persona = agentRows[0].persona;
      if (typeof persona === 'string') {
        try { persona = JSON.parse(persona); } catch(e) { persona = {}; }
      } else if (!persona) {
        persona = {};
      }
      const soulPath = path.resolve(__dirname, '../agents/sales-rep-v2-agent/SOUL.md');
      const personaPath = path.resolve(__dirname, '../agents/sales-rep-v2-agent/PERSONA.md');
      const toolsPath = path.resolve(__dirname, '../agents/sales-rep-v2-agent/TOOLS.md');

      if (fs.existsSync(soulPath)) persona.soulInstructions = fs.readFileSync(soulPath, 'utf8');
      if (fs.existsSync(toolsPath)) persona.toolsInstructions = fs.readFileSync(toolsPath, 'utf8');
      if (fs.existsSync(personaPath)) persona.personaInstructions = fs.readFileSync(personaPath, 'utf8');

      await prisma.$executeRawUnsafe(
        `UPDATE ai.agents SET persona = $1::jsonb WHERE id = $2`,
        JSON.stringify(persona),
        YASMINE_AGENT_ID
      );
      console.log('✅ Updated Yasmin in ai.agents');
    } else {
      console.log(`⚠️ Agent with id ${YASMINE_AGENT_ID} not found in ai.agents`);
    }

    // Update sales-rep-v2-agent in ai.agent_templates
    const soulPath = path.resolve(__dirname, '../agents/sales-rep-v2-agent/SOUL.md');
    const personaPath = path.resolve(__dirname, '../agents/sales-rep-v2-agent/PERSONA.md');
    const toolsPath = path.resolve(__dirname, '../agents/sales-rep-v2-agent/TOOLS.md');

    const soul = fs.existsSync(soulPath) ? fs.readFileSync(soulPath, 'utf8') : null;
    const personaText = fs.existsSync(personaPath) ? fs.readFileSync(personaPath, 'utf8') : null;
    const tools = fs.existsSync(toolsPath) ? fs.readFileSync(toolsPath, 'utf8') : null;

    await prisma.$executeRawUnsafe(
      `UPDATE ai.agent_templates SET instructions_soul = $1, instructions_persona = $2, instructions_tools = $3 WHERE slug = $4`,
      soul,
      personaText,
      tools,
      'sales-rep-v2-agent'
    );
    console.log('✅ Updated sales-rep-v2-agent in ai.agent_templates');
  } catch (err) {
    console.error('⚠️ Could not update ai.agents / ai.agent_templates via SQL:', err.message);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Error updating Swan products/agent:', err);
  prisma.$disconnect();
  process.exit(1);
});
