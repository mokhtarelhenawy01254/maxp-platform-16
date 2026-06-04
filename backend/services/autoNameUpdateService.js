// إنشاء ملف services/autoNameUpdateService.js
const { getSharedPrismaClient } = require('./sharedDatabase');
const { fetchFacebookUserProfile } = require('../utils/allFunctions');

class AutoNameUpdateService {
  get prisma() {
    return getSharedPrismaClient();
  }

  constructor() {
    this.isRunning = false;
    this.lastRunTime = null;
    this.stats = {
      totalProcessed: 0,
      totalUpdated: 0,
      totalErrors: 0
    };
  }

  /**
   * بدء خدمة التحديث التلقائي
   */
  start() {
    console.log('🚀 [AUTO-NAME-UPDATE] بدء خدمة التحديث التلقائي لأسماء العملاء...');

    // تشغيل كل 6 ساعات
    this.interval = setInterval(() => {
      this.runUpdateBatch();
    }, 6 * 60 * 60 * 1000);

    // تشغيل فوري عند البدء
    setTimeout(() => {
      this.runUpdateBatch();
    }, 30000); // تأخير 30 ثانية بعد بدء الخدمة

    console.log('✅ [AUTO-NAME-UPDATE] خدمة التحديث التلقائي بدأت بنجاح');
  }

  /**
   * إيقاف الخدمة
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('🛑 [AUTO-NAME-UPDATE] تم إيقاف خدمة التحديث التلقائي');
    }
  }

  /**
   * تشغيل دفعة تحديث
   */
  async runUpdateBatch() {
    if (this.isRunning) {
      console.log('⚠️ [AUTO-NAME-UPDATE] خدمة التحديث قيد التشغيل بالفعل، تخطي هذه الدورة');
      return;
    }

    this.isRunning = true;
    this.lastRunTime = new Date();

    console.log('🔄 [AUTO-NAME-UPDATE] بدء دفعة تحديث الأسماء التلقائية...');

    try {
      // الحصول على جميع الشركات النشطة
      const activeCompanies = await this.prisma.company.findMany({
        where: { isActive: true },
        include: {
          facebookPages: {
            where: { status: 'connected' },
            orderBy: { connectedAt: 'desc' },
            take: 1
          }
        }
      });

      console.log(`🏢 [AUTO-NAME-UPDATE] تم العثور على ${activeCompanies.length} شركة نشطة`);

      for (const company of activeCompanies) {
        await this.updateCompanyCustomers(company);
        // تأخير بين الشركات لتجنب الحمل الزائد
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log('✅ [AUTO-NAME-UPDATE] اكتملت دفعة التحديث بنجاح');
      console.log(`📊 [AUTO-NAME-UPDATE] الإحصائيات: معالج=${this.stats.totalProcessed}, محدث=${this.stats.totalUpdated}, أخطاء=${this.stats.totalErrors}`);

    } catch (error) {
      console.error('❌ [AUTO-NAME-UPDATE] خطأ في دفعة التحديث:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * تحديث عملاء شركة معينة
   */
  async updateCompanyCustomers(company) {
    console.log(`🏢 [AUTO-NAME-UPDATE] معالجة عملاء شركة: ${company.name} (${company.id})`);

    // التحقق من وجود صفحة فيس بوك متصلة
    if (!company.facebookPages || company.facebookPages.length === 0) {
      console.log(`⚠️ [AUTO-NAME-UPDATE] لا توجد صفحة فيس بوك متصلة للشركة: ${company.name}`);
      return;
    }

    const facebookPage = company.facebookPages[0];
    if (!facebookPage.pageAccessToken) {
      console.log(`⚠️ [AUTO-NAME-UPDATE] لا يوجد رمز وصول للصفحة: ${facebookPage.pageName}`);
      return;
    }

    // البحث عن العملاء الذين يحتاجون تحديث
    const customersToUpdate = await this.prisma.customer.findMany({
      where: {
        companyId: company.id,
        facebookId: { not: null },
        OR: [
          { firstName: 'Facebook' },
          { lastName: 'User' },
          { firstName: { contains: 'عميل' } },
          { firstName: 'زائر' },
          { firstName: 'زبون' },
          { lastName: { in: ['كريم', 'مميز', 'عزيز', 'جديد'] } }
        ],
        // تجنب العملاء الذين تم تحديثهم مؤخراً
        updatedAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // أكثر من 24 ساعة
        }
      },
      take: 10, // معالجة 10 عملاء فقط في كل دورة لكل شركة
      orderBy: { createdAt: 'desc' }
    });

    console.log(`👥 [AUTO-NAME-UPDATE] تم العثور على ${customersToUpdate.length} عميل للتحديث في شركة ${company.name}`);

    let updatedInCompany = 0;
    for (const customer of customersToUpdate) {
      try {
        const updated = await this.updateCustomerName(customer, facebookPage.pageAccessToken);
        if (updated) {
          updatedInCompany++;
          this.stats.totalUpdated++;
        }
        this.stats.totalProcessed++;

        // تأخير بين العملاء
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`❌ [AUTO-NAME-UPDATE] خطأ في تحديث العميل ${customer.id}:`, error.message);
        this.stats.totalErrors++;
      }
    }

    console.log(`✅ [AUTO-NAME-UPDATE] تم تحديث ${updatedInCompany} عميل في شركة ${company.name}`);
  }

  /**
   * تحديث اسم عميل واحد
   */
  async updateCustomerName(customer, pageAccessToken) {
    console.log(`👤 [AUTO-NAME-UPDATE] تحديث العميل: ${customer.firstName} ${customer.lastName} (${customer.facebookId})`);

    try {
      const facebookProfile = await fetchFacebookUserProfile(customer.facebookId, pageAccessToken);

      if (!facebookProfile || !facebookProfile.first_name) {
        console.log(`⚠️ [AUTO-NAME-UPDATE] لم يتم الحصول على بيانات للعميل ${customer.id}`);
        return false;
      }

      // التحقق من أن الاسم حقيقي وليس افتراضي
      const isRealName = !['Facebook', 'عميل', 'مستخدم', 'User', 'زائر', 'زبون'].includes(facebookProfile.first_name);

      if (!isRealName) {
        console.log(`⚠️ [AUTO-NAME-UPDATE] الاسم على الفيس بوك افتراضي أيضاً: ${facebookProfile.first_name}`);
        return false;
      }

      // تحديث العميل في قاعدة البيانات
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: {
          firstName: facebookProfile.first_name,
          lastName: facebookProfile.last_name || '',
          avatar: facebookProfile.profile_pic,
          metadata: JSON.stringify({
            ...customer.metadata ? JSON.parse(customer.metadata) : {},
            facebookProfile: facebookProfile,
            autoUpdated: true,
            autoUpdatedAt: new Date().toISOString(),
            originalName: `${customer.firstName} ${customer.lastName}`
          })
        }
      });

      console.log(`✅ [AUTO-NAME-UPDATE] تم تحديث العميل ${customer.id}: ${customer.firstName} ${customer.lastName} → ${facebookProfile.first_name} ${facebookProfile.last_name}`);
      return true;

    } catch (error) {
      console.error(`❌ [AUTO-NAME-UPDATE] خطأ في تحديث العميل ${customer.id}:`, error.message);
      throw error;
    }
  }

  /**
   * الحصول على حالة الخدمة
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      stats: this.stats,
      nextRunTime: this.lastRunTime ?
        new Date(this.lastRunTime.getTime() + 6 * 60 * 60 * 1000) : null
    };
  }

  /**
   * إعادة تعيين الإحصائيات
   */
  resetStats() {
    this.stats = {
      totalProcessed: 0,
      totalUpdated: 0,
      totalErrors: 0
    };
    console.log('🔄 [AUTO-NAME-UPDATE] تم إعادة تعيين الإحصائيات');
  }
}

module.exports = new AutoNameUpdateService();