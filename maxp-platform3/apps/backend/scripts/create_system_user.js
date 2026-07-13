const { t: i18n } = require('./i18n');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSystemUser() {
  try {
    console.log(i18n.t('msg.a2f3a43ci18n.t('msg.1110ca0e')system@devtasks.local'
      }
    });

    if (systemUser) {
      console.log(i18n.t('msg.b4cdf2a9i18n.t('msg.e8de5821')System',
          lastName: 'Bot',
          email: 'system@devtasks.local',
          password: 'system123i18n.t('msg.4ca614b5')SUPER_ADMIN',
          isActive: true,
          isEmailVerified: true
        }
      });
      console.log(i18n.t('msg.600dcdcdi18n.t('msg.ca96bd2e')msg.8cded772i18n.t('msg.21ea1be3')tech_lead',
          department: 'Development',
          skills: 'System Administration,Documentation,Project Management',
          availability: 'available',
          isActive: true
        }
      });
      console.log(i18n.t('msg.72e429be'), devTeamMember.id);
    }

    return {
      userId: systemUser.id,
      devTeamMemberId: devTeamMember.id
    };

  } catch (error) {
    console.error(i18n.t('msg.53d5fe7fi18n.t('msg.a74ae697')msg.14d7f5b4'), result);
    process.exit(0);
  })
  .catch((error) => {
    console.error(i18n.t('msg.7944b715'), error);
    process.exit(1);
  });
