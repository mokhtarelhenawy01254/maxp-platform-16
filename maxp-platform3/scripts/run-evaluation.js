const path = require('path');
const fs = require('fs');

// Set tenant context before database initialization
const tenantContext = require('../backend/services/tenantContext');
const TEST_COMPANY_ID = process.env.RAG_EVAL_COMPANY_ID || 'test-evaluation-company-id';

const { getSharedPrismaClient, initializeSharedDatabase } = require('../backend/services/sharedDatabase');
const RagKnowledgeMaintenanceService = require('../backend/services/rag/RagKnowledgeMaintenanceService');

function assertSafeEvaluationDatabase() {
  const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
  const databaseUrl = String(process.env.DATABASE_URL || '').toLowerCase();
  const allowProduction = process.env.ALLOW_PRODUCTION_RAG_EVAL === 'true';
  const looksProduction = nodeEnv === 'production'
    || databaseUrl.includes('maxp.online')
    || databaseUrl.includes('production')
    || databaseUrl.includes('/prod');

  if (looksProduction && !allowProduction) {
    throw new Error('Refusing to seed or delete RAG evaluation data against a production-looking database. Set ALLOW_PRODUCTION_RAG_EVAL=true only for an intentionally isolated test company.');
  }
}

async function main() {
  assertSafeEvaluationDatabase();
  console.log('🚀 Starting RAG Evaluation Script...');
  console.log('📦 Initializing shared database...');
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  await tenantContext.run(TEST_COMPANY_ID, async () => {
    let cleanupNeeded = false;
    try {
      console.log('🧹 Cleaning up any previous test evaluation data...');
      await prisma.faq.deleteMany({ where: { companyId: TEST_COMPANY_ID } });
      await prisma.policy.deleteMany({ where: { companyId: TEST_COMPANY_ID } });
      await prisma.product.deleteMany({ where: { companyId: TEST_COMPANY_ID } });
      cleanupNeeded = true;

      console.log('🌱 Seeding RAG test knowledge base...');

      // Seed FAQs
      await prisma.faq.createMany({
        data: [
          {
            companyId: TEST_COMPANY_ID,
            question: "عايز ارجع التيشرت اللي اشتريته، ايه هي سياسة الاسترجاع؟",
            answer: "سياسة الاسترجاع تتيح إرجاع المنتجات خلال 14 يومًا بشرط أن تكون بحالتها الأصلية وغير مستخدمة.",
            category: "returns",
            tags: JSON.stringify(["استرجاع", "يوم", "منتج"]),
            isActive: true,
            order: 1
          },
          {
            companyId: TEST_COMPANY_ID,
            question: "عايز اعرف طلبي رقم 12345 وصل لفين؟",
            answer: "يمكنك تتبع حالة طلبك باستخدام رقم الطلب المرسل إليك عبر الواتساب وموقعنا الإلكتروني.",
            category: "orders",
            tags: JSON.stringify(["طلب", "رقم", "حالة"]),
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
            content: "يتم إرجاع المبالغ بنفس طريقة الدفع الأصلية أو عبر محفظة إلكترونية للعميل.",
            category: "returns",
            tags: JSON.stringify(["محفظة", "حساب", "طريقة"]),
            isActive: true,
            order: 1,
            effectiveAt: new Date()
          },
          {
            companyId: TEST_COMPANY_ID,
            title: "Cairo Shipping Cost",
            content: "تكلفة الشحن لمحافظة القاهرة هي 50 جنيهًا للتوصيل العادي.",
            category: "shipping",
            tags: JSON.stringify(["القاهرة", "جنيه", "شحن"]),
            isActive: true,
            order: 2,
            effectiveAt: new Date()
          },
          {
            companyId: TEST_COMPANY_ID,
            title: "Alexandria Shipping Time",
            content: "يستغرق الشحن لمحافظة الإسكندرية من يومين إلى 3 أيام عمل للتوصيل الباب للباب.",
            category: "shipping",
            tags: JSON.stringify(["يوم", "اسكندرية", "توصيل"]),
            isActive: true,
            order: 3,
            effectiveAt: new Date()
          },
          {
            companyId: TEST_COMPANY_ID,
            title: "Free Shipping Limit Policy",
            content: "الشحن مجاني للطلبات التي تزيد قيمتها عن 1000 جنيه لجميع المحافظات.",
            category: "shipping",
            tags: JSON.stringify(["مجاني", "جنيه", "أكثر"]),
            isActive: true,
            order: 4,
            effectiveAt: new Date()
          },
          {
            companyId: TEST_COMPANY_ID,
            title: "Restocking Timeline Policy",
            content: "يتم تحديث المخزون وتوفير المقاسات الناقصة خلال أسبوعين من نفاد الكمية.",
            category: "inventory",
            tags: JSON.stringify(["توفير", "قريباً", "تحديث"]),
            isActive: true,
            order: 5,
            effectiveAt: new Date()
          },
          {
            companyId: TEST_COMPANY_ID,
            title: "Order Cancellation Terms",
            content: "يمكنك إلغاء طلبك مجاناً قبل خروجه للشحن مع المندوب وسنقوم برد كامل المبلغ.",
            category: "orders",
            tags: JSON.stringify(["إلغاء", "شحن", "قبل"]),
            isActive: true,
            order: 6,
            effectiveAt: new Date()
          },
          {
            companyId: TEST_COMPANY_ID,
            title: "Manufacturing Defects Policy",
            content: "في حال وجود عيب صناعة، يتم استبدال المنتج مجاناً دون أي مصاريف شحن إضافية.",
            category: "returns",
            tags: JSON.stringify(["عيب", "بديل", "شحن"]),
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
          description: "كوتشي اسود مريح ومميز لجميع المقاسات من 39 إلى 41.",
          isActive: true
        }
      });
      console.log('✅ Seeding completed! Starting evaluation suite...');

      const report = await RagKnowledgeMaintenanceService.runEvaluation(TEST_COMPANY_ID, {
        useSeedScenarios: true,
      });

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

      const passPercentage = report.passRate * 100;
      if (passPercentage >= 90) {
        console.log(`\n🎉 Success! Evaluation pass rate (${passPercentage.toFixed(2)}%) is above the 90% threshold.`);
      } else {
        throw new Error(`Evaluation pass rate (${passPercentage.toFixed(2)}%) is below the 90% threshold.`);
      }
    } catch (err) {
      console.error('❌ Error executing RAG evaluation:', err);
      throw err;
    } finally {
      if (cleanupNeeded || process.env.RAG_EVAL_CLEANUP_ONLY === 'true') {
        console.log('🧹 Cleaning up seeded test evaluation data...');
        await prisma.faq.deleteMany({ where: { companyId: TEST_COMPANY_ID } });
        await prisma.policy.deleteMany({ where: { companyId: TEST_COMPANY_ID } });
        await prisma.product.deleteMany({ where: { companyId: TEST_COMPANY_ID } });
      }
    }
  });
}

main().catch(err => {
  console.error('❌ Critical system error:', err);
  process.exit(1);
});
