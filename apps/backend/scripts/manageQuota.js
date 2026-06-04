/**
 * أداة إدارة الكوتة والتوكنز
 * 
 * الاستخدام:
 * - فحص الكوتة: node manageQuota.js check [--model=MODEL_NAME] [--key=KEY_ID] [--company=COMPANY_ID]
 * - إعادة تعيين الكوتة: node manageQuota.js reset [--model=MODEL_NAME] [--key=KEY_ID] [--all] [--rpm] [--rph] [--rpd] [--tpm] [--exhausted]
 * - استنفاد الكوتة (للاستخدام في الاختبار): node manageQuota.js exhaust [--model=MODEL_NAME] [--key=KEY_ID] [--rpm] [--rph] [--rpd] [--tpm]
 * - مسح النماذج المستثناة: node manageQuota.js clear-excluded [--model=MODEL_NAME] [--key=KEY_ID]
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * فحص الكوتة
 */
async function checkQuota(modelName = null, keyId = null, companyId = null) {
  try {
    console.log('\n🔍 ========== فحص الكوتة ==========\n');

    const whereClause = {
      isEnabled: true,
      key: {
        isActive: true
      }
    };

    if (modelName) {
      whereClause.model = modelName;
    }

    if (keyId) {
      whereClause.keyId = keyId;
    }

    if (companyId) {
      whereClause.key = {
        ...whereClause.key,
        companyId: companyId
      };
    }

    const models = await getSharedPrismaClient().geminiKeyModel.findMany({
      where: whereClause,
      include: {
        key: {
          select: {
            id: true,
            name: true,
            keyType: true,
            companyId: true
          }
        }
      },
      orderBy: {
        priority: 'asc'
      }
    });

    if (models.length === 0) {
      console.log('❌ لم يتم العثور على نماذج');
      return;
    }

    console.log(`📋 تم العثور على ${models.length} نموذج\n`);

    const now = new Date();

    for (const model of models) {
      try {
        const usage = JSON.parse(model.usage || '{}');
        
        console.log(`📊 ${model.model} (Key: ${model.key.name}, Priority: ${model.priority}):`);
        
        // فحص RPM
        if (usage.rpm) {
          const rpmUsed = usage.rpm.used || 0;
          const rpmLimit = usage.rpm.limit || 0;
          const rpmPercentage = rpmLimit > 0 ? ((rpmUsed / rpmLimit) * 100).toFixed(1) : 0;
          let rpmStatus = '✅';
          
          if (usage.rpm.windowStart) {
            const rpmWindowStart = new Date(usage.rpm.windowStart);
            const rpmElapsed = (now - rpmWindowStart) / 1000 / 60; // بالدقائق
            if (rpmElapsed < 1 && rpmUsed >= rpmLimit) {
              rpmStatus = '❌ مستنفد';
            } else if (rpmElapsed >= 1) {
              rpmStatus = '✅ متاح (انتهت النافذة)';
            }
          }
          
          console.log(`   RPM: ${rpmUsed}/${rpmLimit} (${rpmPercentage}%) ${rpmStatus}`);
        }

        // فحص RPH
        if (usage.rph) {
          const rphUsed = usage.rph.used || 0;
          const rphLimit = usage.rph.limit || 0;
          const rphPercentage = rphLimit > 0 ? ((rphUsed / rphLimit) * 100).toFixed(1) : 0;
          let rphStatus = '✅';
          
          if (usage.rph.windowStart) {
            const rphWindowStart = new Date(usage.rph.windowStart);
            const rphElapsed = (now - rphWindowStart) / 1000 / 60 / 60; // بالساعات
            if (rphElapsed < 1 && rphUsed >= rphLimit) {
              rphStatus = '❌ مستنفد';
            } else if (rphElapsed >= 1) {
              rphStatus = '✅ متاح (انتهت النافذة)';
            }
          }
          
          console.log(`   RPH: ${rphUsed}/${rphLimit} (${rphPercentage}%) ${rphStatus}`);
        }

        // فحص RPD
        if (usage.rpd) {
          const rpdUsed = usage.rpd.used || 0;
          const rpdLimit = usage.rpd.limit || 0;
          const rpdPercentage = rpdLimit > 0 ? ((rpdUsed / rpdLimit) * 100).toFixed(1) : 0;
          let rpdStatus = '✅';
          
          if (usage.rpd.windowStart) {
            const rpdWindowStart = new Date(usage.rpd.windowStart);
            const rpdElapsed = (now - rpdWindowStart) / 1000 / 60 / 60 / 24; // بالأيام
            if (rpdElapsed < 1 && rpdUsed >= rpdLimit) {
              rpdStatus = '❌ مستنفد';
            } else if (rpdElapsed >= 1) {
              rpdStatus = '✅ متاح (انتهت النافذة)';
            }
          }
          
          console.log(`   RPD: ${rpdUsed}/${rpdLimit} (${rpdPercentage}%) ${rpdStatus}`);
        }

        // فحص TPM
        if (usage.tpm) {
          const tpmUsed = usage.tpm.used || 0;
          const tpmLimit = usage.tpm.limit || 0;
          const tpmPercentage = tpmLimit > 0 ? ((tpmUsed / tpmLimit) * 100).toFixed(1) : 0;
          let tpmStatus = '✅';
          
          if (usage.tpm.windowStart) {
            const tpmWindowStart = new Date(usage.tpm.windowStart);
            const tpmElapsed = (now - tpmWindowStart) / 1000 / 60; // بالدقائق
            if (tpmElapsed < 1 && tpmUsed >= tpmLimit) {
              tpmStatus = '❌ مستنفد';
            } else if (tpmElapsed >= 1) {
              tpmStatus = '✅ متاح (انتهت النافذة)';
            }
          }
          
          console.log(`   TPM: ${tpmUsed}/${tpmLimit} (${tpmPercentage}%) ${tpmStatus}`);
        }

        // فحص exhaustedAt
        if (usage.exhaustedAt) {
          const exhaustedTime = new Date(usage.exhaustedAt);
          const timeDiff = (now - exhaustedTime) / 1000 / 60; // بالدقائق
          if (timeDiff < 5) {
            console.log(`   ⚠️ مستنفد منذ ${timeDiff.toFixed(1)} دقيقة`);
          }
        }

        // فحص الحد العام
        const totalUsed = usage.used || 0;
        const totalLimit = usage.limit || 1000000;
        const totalPercentage = totalLimit > 0 ? ((totalUsed / totalLimit) * 100).toFixed(1) : 0;
        console.log(`   Total: ${totalUsed}/${totalLimit} (${totalPercentage}%)`);

        console.log('');
      } catch (e) {
        console.error(`   ❌ خطأ في تحليل JSON: ${e.message}`);
        console.log('');
      }
    }

    console.log('✅ ========== انتهى الفحص ==========\n');

  } catch (error) {
    console.error('❌ خطأ:', error);
  }
}

/**
 * إعادة تعيين الكوتة
 */
async function resetQuota(modelName = null, keyId = null, resetAll = false, options = {}) {
  try {
    console.log('\n🔄 ========== إعادة تعيين الكوتة ==========\n');

    const whereClause = {
      isEnabled: true
    };

    if (keyId) {
      whereClause.keyId = keyId;
    }

    if (modelName) {
      whereClause.model = modelName;
    }

    const models = await getSharedPrismaClient().geminiKeyModel.findMany({
      where: whereClause
    });

    if (models.length === 0) {
      console.log('❌ لم يتم العثور على نماذج');
      return;
    }

    console.log(`📋 تم العثور على ${models.length} نموذج\n`);

    let resetCount = 0;
    const now = new Date();

    for (const model of models) {
      try {
        const usage = JSON.parse(model.usage || '{}');
        let updated = false;

        // إعادة تعيين RPM
        if (options.rpm || resetAll) {
          if (usage.rpm) {
            usage.rpm = {
              used: 0,
              limit: usage.rpm.limit || 15,
              windowStart: null
            };
            updated = true;
          }
        }

        // إعادة تعيين RPH
        if (options.rph || resetAll) {
          if (usage.rph) {
            usage.rph = {
              used: 0,
              limit: usage.rph.limit || 1000,
              windowStart: null
            };
            updated = true;
          }
        }

        // إعادة تعيين RPD
        if (options.rpd || resetAll) {
          if (usage.rpd) {
            usage.rpd = {
              used: 0,
              limit: usage.rpd.limit || 1000,
              windowStart: null
            };
            updated = true;
          }
        }

        // إعادة تعيين TPM
        if (options.tpm || resetAll) {
          if (usage.tpm) {
            usage.tpm = {
              used: 0,
              limit: usage.tpm.limit || 125000,
              windowStart: null
            };
            updated = true;
          }
        }

        // إعادة تعيين exhaustedAt
        if (options.exhausted || resetAll) {
          if (usage.exhaustedAt) {
            delete usage.exhaustedAt;
            updated = true;
          }
        }

        // إعادة تعيين العداد العام
        if (resetAll) {
          usage.used = 0;
          updated = true;
        }

        if (updated) {
          await getSharedPrismaClient().geminiKeyModel.update({
            where: { id: model.id },
            data: {
              usage: JSON.stringify(usage),
              updatedAt: now
            }
          });
          console.log(`✅ ${model.model}: تم إعادة التعيين`);
          resetCount++;
        }
      } catch (e) {
        console.error(`   ❌ خطأ في النموذج ${model.model}: ${e.message}`);
      }
    }

    console.log(`\n✅ تم إعادة تعيين الكوتة لـ ${resetCount} نموذج\n`);

  } catch (error) {
    console.error('❌ خطأ:', error);
  }
}

/**
 * استنفاد الكوتة (للاستخدام في الاختبار)
 */
async function exhaustQuota(modelName = null, keyId = null, options = {}) {
  try {
    console.log('\n⚠️ ========== استنفاد الكوتة (للاستخدام في الاختبار) ==========\n');

    const whereClause = {
      isEnabled: true
    };

    if (keyId) {
      whereClause.keyId = keyId;
    }

    if (modelName) {
      whereClause.model = modelName;
    }

    const models = await getSharedPrismaClient().geminiKeyModel.findMany({
      where: whereClause
    });

    if (models.length === 0) {
      console.log('❌ لم يتم العثور على نماذج');
      return;
    }

    console.log(`📋 تم العثور على ${models.length} نموذج\n`);

    let exhaustCount = 0;
    const now = new Date();

    for (const model of models) {
      try {
        const usage = JSON.parse(model.usage || '{}');
        let updated = false;

        // استنفاد RPM
        if (options.rpm) {
          if (usage.rpm) {
            usage.rpm.used = usage.rpm.limit || 15;
            usage.rpm.windowStart = now.toISOString();
            updated = true;
          }
        }

        // استنفاد RPH
        if (options.rph) {
          if (usage.rph) {
            usage.rph.used = usage.rph.limit || 1000;
            usage.rph.windowStart = now.toISOString();
            updated = true;
          }
        }

        // استنفاد RPD
        if (options.rpd) {
          if (usage.rpd) {
            usage.rpd.used = usage.rpd.limit || 1000;
            usage.rpd.windowStart = now.toISOString();
            updated = true;
          }
        }

        // استنفاد TPM
        if (options.tpm) {
          if (usage.tpm) {
            usage.tpm.used = usage.tpm.limit || 125000;
            usage.tpm.windowStart = now.toISOString();
            updated = true;
          }
        }

        // استنفاد العداد العام
        if (options.all) {
          usage.used = usage.limit || 1000000;
          usage.exhaustedAt = now.toISOString();
          updated = true;
        }

        if (updated) {
          await getSharedPrismaClient().geminiKeyModel.update({
            where: { id: model.id },
            data: {
              usage: JSON.stringify(usage),
              updatedAt: now
            }
          });
          console.log(`⚠️ ${model.model}: تم استنفاد الكوتة`);
          exhaustCount++;
        }
      } catch (e) {
        console.error(`   ❌ خطأ في النموذج ${model.model}: ${e.message}`);
      }
    }

    console.log(`\n⚠️ تم استنفاد الكوتة لـ ${exhaustCount} نموذج\n`);

  } catch (error) {
    console.error('❌ خطأ:', error);
  }
}

/**
 * مسح النماذج المستثناة
 */
async function clearExcluded(modelName = null, keyId = null) {
  try {
    console.log('\n🧹 ========== مسح النماذج المستثناة ==========\n');

    const whereClause = {};

    if (modelName) {
      whereClause.modelName = modelName;
    }

    if (keyId) {
      whereClause.keyId = keyId;
    }

    const excluded = await getSharedPrismaClient().excludedModel.findMany({
      where: whereClause
    });

    if (excluded.length === 0) {
      console.log('✅ لا توجد نماذج مستثناة');
      return;
    }

    console.log(`📋 تم العثور على ${excluded.length} نموذج مستثنى\n`);

    const deleted = await getSharedPrismaClient().excludedModel.deleteMany({
      where: whereClause
    });

    console.log(`✅ تم مسح ${deleted.count} نموذج مستثنى\n`);

  } catch (error) {
    console.error('❌ خطأ:', error);
  }
}

// معالجة سطر الأوامر
const args = process.argv.slice(2);
const command = args[0];

const getArg = (name) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.replace(`--${name}=`, '') : null;
};

const hasFlag = (name) => args.includes(`--${name}`);

const modelName = getArg('model');
const keyId = getArg('key');
const companyId = getArg('company');
const resetAll = hasFlag('all');

const options = {
  rpm: hasFlag('rpm'),
  rph: hasFlag('rph'),
  rpd: hasFlag('rpd'),
  tpm: hasFlag('tpm'),
  exhausted: hasFlag('exhausted'),
  all: hasFlag('all')
};

(async () => {
  try {
    switch (command) {
      case 'check':
        await checkQuota(modelName, keyId, companyId);
        break;
      case 'reset':
        await resetQuota(modelName, keyId, resetAll, options);
        break;
      case 'exhaust':
        await exhaustQuota(modelName, keyId, options);
        break;
      case 'clear-excluded':
        await clearExcluded(modelName, keyId);
        break;
      default:
        console.log(`
استخدام الأداة:

فحص الكوتة:
  node manageQuota.js check [--model=MODEL_NAME] [--key=KEY_ID] [--company=COMPANY_ID]

إعادة تعيين الكوتة:
  node manageQuota.js reset [--model=MODEL_NAME] [--key=KEY_ID] [--all] [--rpm] [--rph] [--rpd] [--tpm] [--exhausted]

استنفاد الكوتة (للاستخدام في الاختبار):
  node manageQuota.js exhaust [--model=MODEL_NAME] [--key=KEY_ID] [--rpm] [--rph] [--rpd] [--tpm] [--all]

مسح النماذج المستثناة:
  node manageQuota.js clear-excluded [--model=MODEL_NAME] [--key=KEY_ID]

أمثلة:
  node manageQuota.js check
  node manageQuota.js check --model=gemini-2.5-flash
  node manageQuota.js reset --all
  node manageQuota.js reset --model=gemini-2.5-flash --rpm --rpd
  node manageQuota.js exhaust --model=gemini-2.5-flash --rpm
  node manageQuota.js clear-excluded
        `);
    }
  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await getSharedPrismaClient().$disconnect();
  }
})();

























