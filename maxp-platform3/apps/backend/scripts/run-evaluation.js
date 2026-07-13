const { t: i18n } = require('./i18n');
const path = require('path');
const fs = require('fs');

// Set tenant context before database initialization
const tenantContext = require('../services/tenantContext');
const TEST_COMPANY_ID = 'test-evaluation-company-id';

const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');
const RagKnowledgeMaintenanceService = require('../services/rag/RagKnowledgeMaintenanceService');

async function main() {
  console.log('🚀 Starting RAG Evaluation Script...');
  console.log('📦 Initializing shared database...');
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  tenantContext.run(TEST_COMPANY_ID, async () => {
    try {
      console.log('🧹 Cleaning up any previous test evaluation data...');
      await prisma.faq.deleteMany({ where: { companyId: TEST_COMPANY_ID } });
      await prisma.policy.deleteMany({ where: { companyId: TEST_COMPANY_ID } });
      await prisma.product.deleteMany({ where: { companyId: TEST_COMPANY_ID } });

      console.log('🌱 Seeding RAG test knowledge base...');
      
      // Seed FAQs
      await prisma.faq.createMany({
        data: [
          {
            companyId: TEST_COMPANY_ID,
            question: i18n.t('msg.c45e4e96'),
            answer: i18n.t('msg.1f82190d'),
            category: "returns",
            tags: JSON.stringify([i18n.t('msg.14c4cb02'), i18n.t('msg.10954620'), i18n.t('msg.bb7632a2')]),
            isActive: true,
            order: 1
          },
          {
            companyId: TEST_COMPANY_ID,
            question: i18n.t('msg.b0e1680f'),
            answer: i18n.t('msg.051a3c29'),
            category: "orders",
            tags: JSON.stringify([i18n.t('msg.f48e3aa7'), i18n.t('msg.1ac91dd2'), i18n.t('msg.a280787d')]),
            isActive: true,
            order: 2
          }
        ]
      });

      // Seed Policies
      await prisma.policy.createMany({
        data: [
          {
            companyId: TEST_COMPANY_ID,
            title: "Refund Method Policy",
            content: i18n.t('msg.1f0c749b'),
            category: "returns",
            tags: JSON.stringify([i18n.t('msg.c53a3932'), i18n.t('msg.b177499b'), i18n.t('msg.bcfba51d')]),
            isActive: true,
            order: 1,
            effectiveAt: new Date()
          },
          {
            companyId: TEST_COMPANY_ID,
            title: "Cairo Shipping Cost",
            content: i18n.t('msg.80fe872a'),
            category: "shipping",
            tags: JSON.stringify([i18n.t('msg.98dfb7b0'), i18n.t('msg.92853df9'), i18n.t('msg.42df41a8')]),
            isActive: true,
            order: 2,
            effectiveAt: new Date()
          },
          {
            companyId: TEST_COMPANY_ID,
            title: "Alexandria Shipping Time",
            content: i18n.t('msg.b04dfb5d'),
            category: "shipping",
            tags: JSON.stringify([i18n.t('msg.10954620'), i18n.t('msg.20c6b963'), i18n.t('msg.f0c2c6dc')]),
            isActive: true,
            order: 3,
            effectiveAt: new Date()
          },
          {
            companyId: TEST_COMPANY_ID,
            title: "Free Shipping Limit Policy",
            content: i18n.t('msg.71301cc0'),
            category: "shipping",
            tags: JSON.stringify([i18n.t('msg.5abc46e8'), i18n.t('msg.92853df9'), i18n.t('msg.ec063247')]),
            isActive: true,
            order: 4,
            effectiveAt: new Date()
          },
          {
            companyId: TEST_COMPANY_ID,
            title: "Restocking Timeline Policy",
            content: i18n.t('msg.689be95d'),
            category: "inventory",
            tags: JSON.stringify([i18n.t('msg.65174493'), i18n.t('msg.0e1cf1c3'), i18n.t('msg.061401dc')]),
            isActive: true,
            order: 5,
            effectiveAt: new Date()
          },
          {
            companyId: TEST_COMPANY_ID,
            title: "Order Cancellation Terms",
            content: i18n.t('msg.8ac647c1'),
            category: "orders",
            tags: JSON.stringify([i18n.t('msg.b9568e86'), i18n.t('msg.42df41a8'), i18n.t('msg.cf811897')]),
            isActive: true,
            order: 6,
            effectiveAt: new Date()
          },
          {
            companyId: TEST_COMPANY_ID,
            title: "Manufacturing Defects Policy",
            content: i18n.t('msg.0925f5a4'),
            category: "returns",
            tags: JSON.stringify([i18n.t('msg.3714a8a4'), i18n.t('msg.3fec4bb4'), i18n.t('msg.42df41a8')]),
            isActive: true,
            order: 7,
            effectiveAt: new Date()
          }
        ]
      });

      // Seed Product
      await prisma.product.create({
        data: {
          companyId: TEST_COMPANY_ID,
          name: "Swan High Skotch",
          price: 350,
          description: i18n.t('msg.b5cd7f4b'),
          isActive: true
        }
      });

      console.log('✅ Seeding completed! Starting evaluation suite...');
      
      const report = await RagKnowledgeMaintenanceService.runEvaluation(TEST_COMPANY_ID);
      
      console.log('\n================ RAG EVALUATION REPORT ================');
      console.log(`Generated At:   ${report.generatedAt}`);
      console.log(`Source:         ${report.scenarioSource}`);
      console.log(`Total Cases:    ${report.total}`);
      console.log(`Passed:         ${report.passed}`);
      console.log(`Failed:         ${report.failed}`);
      console.log(`Pass Rate:      ${(report.passRate * 100).toFixed(2)}%`);
      console.log('=======================================================\n');

      console.log('Detailed Results:');
      for (const res of report.results) {
        const statusStr = res.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`[${statusStr}] - ${res.name}`);
        console.log(`   Message:      "${res.message}"`);
        console.log(`   Final Source: ${res.finalSource} (Expected: [${res.expectedSources.join(', ')}])`);
        if (res.goldenAnswer) {
          console.log(`   Golden Similarity: ${(res.semanticScore * 100).toFixed(2)}% (Match: ${res.semanticOk ? 'Yes' : 'No'})`);
        }
        if (res.missingTerms && res.missingTerms.length > 0) {
          console.log(`   Missing Terms: [${res.missingTerms.join(', ')}]`);
        }
        console.log('-------------------------------------------------------');
      }

      console.log('🧹 Cleaning up seeded test evaluation data...');
      await prisma.faq.deleteMany({ where: { companyId: TEST_COMPANY_ID } });
      await prisma.policy.deleteMany({ where: { companyId: TEST_COMPANY_ID } });
      await prisma.product.deleteMany({ where: { companyId: TEST_COMPANY_ID } });

      const passPercentage = report.passRate * 100;
      if (passPercentage >= 90) {
        console.log(`\n🎉 Success! Evaluation pass rate (${passPercentage.toFixed(2)}%) is above the 90% threshold.`);
        process.exit(0);
      } else {
        console.error(`\n❌ Failure: Evaluation pass rate (${passPercentage.toFixed(2)}%) is below the 90% threshold.`);
        process.exit(1);
      }
    } catch (err) {
      console.error('❌ Error executing RAG evaluation:', err);
      process.exit(1);
    }
  });
}

main().catch(err => {
  console.error('❌ Critical system error:', err);
  process.exit(1);
});
