const { t: i18n } = require('./i18n');
const { PrismaClient } = require('@prisma/clienti18n.t('msg.8877dfaa')🧹 Cleaning old error messages...\ni18n.t('msg.5775e3bb')MISSING_PERSONALITY_PROMPT' } },
          { content: { contains: i18n.t('msg.41561e03') } }
        ]
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        conversationId: true
      }
    });

    console.log(`📊 Found ${errorMessages.length} messages with MISSING_PERSONALITY_PROMPT error\n`);

    if (errorMessages.length === 0) {
      console.log('✅ No error messages found. Database is clean!i18n.t('msg.6cc1bb0d')📋 Sample messages (first 5):');
    errorMessages.slice(0, 5).forEach((msg, i) => {
      console.log(`${i + 1}. ID: ${msg.id}`);
      console.log(`   Date: ${msg.createdAt}`);
      console.log(`   Content: ${msg.content.substring(0, 100)}...`);
      console.log('');
    });

    console.log('\n⚠️  Do you want to delete these messages?');
    console.log('⚠️  This will permanently remove them from the database.');
    console.log('\n💡 To delete, run this script with --confirm flag:');
    console.log('   node clean_old_error_messages.js --confirmi18n.t('msg.3b380411')--confirm')) {
      console.log('\n🗑️  Deleting messages...');
      
      const result = await prisma.message.deleteMany({
        where: {
          OR: [
            { content: { contains: 'MISSING_PERSONALITY_PROMPT' } },
            { content: { contains: i18n.t('msg.41561e03') } }
          ]
        }
      });

      console.log(`✅ Deleted ${result.count} messages successfully!`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanOldErrorMessages();
