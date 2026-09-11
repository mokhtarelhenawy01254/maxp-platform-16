/**
 * @module tenantSkillsService
 * @description Hermes Multi-Tenant Self-Learning Service for MaxP merchants.
 * Manages tenant-scoped operational rules, learned playbooks, and continuous
 * skill refinement for Facebook Media Buyers and Sales Agents.
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

class TenantSkillsService {
  constructor() {
    this.prisma = null;
    // In-memory fallback if Prisma client or DB is unavailable in test environments
    this._memoryStore = new Map();
  }

  _getPrisma() {
    if (!this.prisma) {
      try {
        this.prisma = getSharedPrismaClient();
      } catch (e) {
        this.prisma = null;
      }
    }
    return this.prisma;
  }

  /**
   * List all learned rules / skills for a specific merchant.
   * Enforces strict multi-tenant isolation by companyId.
   */
  async listLearnedRules(companyId, { skillType = null, enabled = null } = {}) {
    if (!companyId) {
      throw new Error('companyId is required');
    }

    const prisma = this._getPrisma();
    if (prisma && prisma.companySkill) {
      try {
        const where = { companyId };
        if (enabled !== null) where.enabled = enabled;

        const records = await prisma.companySkill.findMany({
          where,
          orderBy: { priority: 'desc' },
        });

        return records
          .map(r => {
            let meta = {};
            try {
              meta = r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : {};
            } catch { meta = {}; }

            return {
              id: r.id,
              companyId: r.companyId,
              name: r.name,
              description: r.description,
              instructions: r.instructions,
              enabled: r.enabled,
              priority: r.priority,
              skillType: meta.skill_type || 'MEDIA_BUYER',
              source: meta.source || 'AUTONOMOUS_LEARNED',
              rulesCount: meta.rules_count || 1,
              metadata: meta,
              createdAt: r.createdAt,
              updatedAt: r.updatedAt,
            };
          })
          .filter(r => (skillType ? r.skillType === skillType : true));
      } catch (err) {
        console.warn('[TenantSkillsService] DB query failed, using memory store:', err.message);
      }
    }

    // Memory store fallback
    const tenantMap = this._memoryStore.get(companyId) || new Map();
    let list = Array.from(tenantMap.values());
    if (enabled !== null) list = list.filter(r => r.enabled === enabled);
    if (skillType) list = list.filter(r => r.skillType === skillType);
    return list;
  }

  /**
   * Toggle a learned rule on or off.
   */
  async toggleRule(companyId, skillId, enabled) {
    if (!companyId || !skillId) {
      throw new Error('companyId and skillId are required');
    }

    const prisma = this._getPrisma();
    if (prisma && prisma.companySkill) {
      try {
        const updated = await prisma.companySkill.updateMany({
          where: { companyId, id: skillId },
          data: { enabled: Boolean(enabled), updatedAt: new Date() },
        });
        if (updated.count > 0) {
          return { success: true, skillId, enabled: Boolean(enabled) };
        }
      } catch (err) {
        console.warn('[TenantSkillsService] DB update failed, using memory store:', err.message);
      }
    }

    const tenantMap = this._memoryStore.get(companyId);
    if (tenantMap && tenantMap.has(skillId)) {
      const item = tenantMap.get(skillId);
      item.enabled = Boolean(enabled);
      item.updatedAt = new Date();
      return { success: true, skillId, enabled: Boolean(enabled) };
    }

    return { success: false, error: 'Skill not found for tenant' };
  }

  /**
   * Distill actionable media buyer rules from ad campaign metrics.
   * Hermes Closed-Loop Feedback: ROAS & CPA to learned markdown instructions.
   */
  async distillFromAdMetrics(companyId, adMetrics = {}) {
    if (!companyId) throw new Error('companyId is required');

    const adName = adMetrics.ad_name || adMetrics.name || 'حملة إعلانية';
    const angle = adMetrics.angle || adMetrics.angle_name || 'عام';
    const productName = adMetrics.product_name || 'منتج المتجر';
    const spend = Number(adMetrics.spend || adMetrics.total_spend || 0);
    const revenue = Number(adMetrics.revenue || adMetrics.total_revenue || 0);
    const purchases = Number(adMetrics.purchases || adMetrics.total_purchases || 0);
    const frequency = Number(adMetrics.frequency || 1.0);
    const ctr = Number(adMetrics.ctr || 0);
    const targetCpa = Number(adMetrics.target_cpa || 60);
    const currency = (adMetrics.currency || 'EGP').toUpperCase();

    const cpa = purchases > 0 ? Math.round((spend / purchases) * 100) / 100 : 0;
    const roas = spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0;

    let ruleType = 'WATCH';
    let ruleText = '';

    if (purchases >= 2 && roas >= 2.2 && (cpa <= targetCpa || targetCpa === 0)) {
      ruleType = 'WINNING_SCALE';
      ruleText = `- [رابح / SCALE] زاوية '${angle}' للمنتج '${productName}' حققت ROAS = ${roas}x وتكلفة شراء ${cpa} ${currency}. القاعدة: خصص 70%+ من الميزانية لهذه الزاوية وارفع الميزانية بنسبة 20% كل 48 ساعة.`;
    } else if (frequency >= 2.3 && cpa > targetCpa * 1.25) {
      ruleType = 'CREATIVE_FATIGUE';
      ruleText = `- [إرهاق إعلاني / FATIGUE] الإعلان '${adName}' وصل تكراره إلى ${frequency.toFixed(1)} مع ارتفاع CPA إلى ${cpa} ${currency}. القاعدة: أوقف هذه المجموعة أو استبدل الفيديو لتفادي حرق الميزانية.`;
    } else if (spend > 250 && purchases === 0) {
      ruleType = 'BLEEDING_KILL';
      ruleText = `- [نزيف مالي / KILL] الإعلان '${adName}' بزاوية '${angle}' أنفق ${spend} ${currency} دون أي مبيعات. القاعدة: تجنب هذا الاستهداف واختبر زاوية تسويقية بديلة.`;
    } else {
      ruleType = 'STABLE_WATCH';
      ruleText = `- [متابعة / WATCH] أداء معتدل للإعلان '${adName}' (ROAS: ${roas}x, إنفاق: ${spend} ${currency}). القاعدة: استمر في المراقبة حتى تكتمل مرحلة التعلم.`;
    }

    return await this._saveLearnedRule({
      companyId,
      skillId: `media_buyer_playbook_${companyId}`,
      skillName: 'كتيب استراتيجيات إعلانات المتجر',
      skillType: 'MEDIA_BUYER',
      ruleText,
      ruleType,
      metrics: { adName, angle, spend, revenue, purchases, roas, cpa, frequency, ctr },
    });
  }

  /**
   * Distill sales closing and objection handling rules from WhatsApp/Messenger chats.
   */
  async distillFromSalesDialogue(companyId, { outcome = 'CONFIRMED', objection = '', closingAngle = '', productName = '' } = {}) {
    if (!companyId) throw new Error('companyId is required');

    const isSuccess = ['CONFIRMED', 'SUCCESS', 'ORDER_CREATED'].includes(String(outcome).toUpperCase());
    let ruleText = '';
    if (isSuccess) {
      ruleText = `- [إغلاق ناجح] عند اعتراض العميل على '${objection}' لمنتج '${productName || 'عام'}'، نجح أسلوب '${closingAngle}' في تأكيد الطلب. القاعدة: استخدم هذا المدخل فوراً عند تكرار نفس الاعتراض.`;
    } else {
      ruleText = `- [انسحاب عميل] انسحب العميل عند الاعتراض على '${objection}'. القاعدة: تجنب الإلحاح الجاف؛ واقترح باقة بديلة أو ضمان استرجاع مجاني.`;
    }

    return await this._saveLearnedRule({
      companyId,
      skillId: `sales_closing_playbook_${companyId}`,
      skillName: 'كتيب إغلاق المبيعات والرد على الاعتراضات',
      skillType: 'SALES_CLOSING',
      ruleText,
      ruleType: isSuccess ? 'SUCCESSFUL_CLOSING' : 'ABANDONED_OBJECTION',
      metrics: { outcome, objection, closingAngle, productName },
    });
  }

  /**
   * Universal Hermes learning for ANY agent domain: Customer Support, Sales, Inventory, Operations, etc.
   */
  async recordUniversalRule(companyId, { category = 'GENERAL', ruleTitle, ruleInstructions, triggerKeywords = '', metadata = {} } = {}) {
    if (!companyId) throw new Error('companyId is required');
    if (!ruleTitle || !ruleInstructions) throw new Error('ruleTitle and ruleInstructions are required');

    const cleanCategory = String(category || 'GENERAL').trim().toUpperCase();
    const categoryTitles = {
      CUSTOMER_SUPPORT: 'كتيب خدمة العملاء والاستفسارات',
      SUPPORT: 'كتيب خدمة العملاء والاستفسارات',
      SALES: 'كتيب مبيعات وإغلاق الصفقات',
      SALES_CLOSING: 'كتيب مبيعات وإغلاق الصفقات',
      INVENTORY: 'كتيب إدارة وحركة المخزون',
      MEDIA_BUYER: 'كتيب استراتيجيات إعلانات المتجر',
      OPERATIONS: 'كتيب العمليات التشغيلية والتأكيد',
      CLINIC: 'كتيب العيادات والمواعيد الطبية',
      HOTEL: 'كتيب حجوزات الفنادق والضيافة',
      DENTAL_LAB: 'كتيب تشغيل معمل الأسنان',
      GENERAL: 'كتيب القواعد العامة للمتجر',
    };

    const skillName = categoryTitles[cleanCategory] || `كتيب ${cleanCategory}`;
    const skillId = `${cleanCategory.toLowerCase()}_playbook_${companyId}`;
    const ruleText = `- [${ruleTitle.trim()}] ${ruleInstructions.trim()}`;

    return await this._saveLearnedRule({
      companyId,
      skillId,
      skillName,
      skillType: cleanCategory,
      ruleText,
      ruleType: 'UNIVERSAL_LEARNED',
      metrics: {
        title: ruleTitle,
        category: cleanCategory,
        triggerKeywords,
        ...metadata,
      },
    });
  }

  async _saveLearnedRule({ companyId, skillId, skillName, skillType, ruleText, ruleType, metrics }) {
    const baseHeader = `# ${skillName} (${companyId})\n> مهارة تم استخلاصها وتطويرها ذاتياً بناءً على تجارب المتجر الفعلية (Hermes Self-Learning Engine).\n\n## القواعد والدروس التشغيلية المعتمدة:\n`;

    const prisma = this._getPrisma();
    if (prisma && prisma.companySkill) {
      try {
        const existing = await prisma.companySkill.findUnique({
          where: { companyId_name: { companyId, name: skillName } },
        });

        let updatedInstructions = '';
        let meta = {};

        if (!existing) {
          updatedInstructions = `${baseHeader}\n${ruleText}\n`;
          meta = {
            source: 'AUTONOMOUS_LEARNED',
            skill_type: skillType,
            rules_count: 1,
            history: [{ ruleType, metrics, learnedAt: new Date().toISOString() }],
          };

          const created = await prisma.companySkill.create({
            data: {
              companyId,
              name: skillName,
              description: `مهارة تشغيلية متعلمة ذاتياً لمتجر ${companyId}`,
              triggerPhrases: 'حملة,إعلان,تقرير,مبيعات,استهداف,أداء,خصم,شحن',
              instructions: updatedInstructions,
              priority: 10,
              enabled: true,
              metadata: JSON.stringify(meta),
            },
          });
          return { success: true, skillId: created.id, ruleAdded: ruleText, totalRules: 1 };
        } else {
          const lines = (existing.instructions || baseHeader).split('\n').map(l => l.trim()).filter(Boolean);
          if (!lines.includes(ruleText.trim())) {
            updatedInstructions = `${(existing.instructions || baseHeader).trim()}\n${ruleText}\n`;
          } else {
            updatedInstructions = existing.instructions;
          }

          try {
            meta = existing.metadata ? (typeof existing.metadata === 'string' ? JSON.parse(existing.metadata) : existing.metadata) : {};
          } catch { meta = {}; }

          const history = Array.isArray(meta.history) ? meta.history : [];
          history.push({ ruleType, metrics, learnedAt: new Date().toISOString() });
          meta.history = history.slice(-25);
          meta.rules_count = updatedInstructions.split('\n').filter(l => l.trim().startsWith('- [')).length;
          meta.skill_type = skillType;
          meta.last_updated_at = new Date().toISOString();

          await prisma.companySkill.update({
            where: { id: existing.id },
            data: {
              instructions: updatedInstructions,
              metadata: JSON.stringify(meta),
              updatedAt: new Date(),
            },
          });
          return { success: true, skillId: existing.id, ruleAdded: ruleText, totalRules: meta.rules_count };
        }
      } catch (err) {
        console.warn('[TenantSkillsService] Prisma save failed, using memory store:', err.message);
      }
    }

    // Memory Store implementation
    if (!this._memoryStore.has(companyId)) {
      this._memoryStore.set(companyId, new Map());
    }
    const tenantMap = this._memoryStore.get(companyId);
    let record = tenantMap.get(skillId);

    if (!record) {
      record = {
        id: skillId,
        companyId,
        name: skillName,
        skillType,
        instructions: `${baseHeader}\n${ruleText}\n`,
        enabled: true,
        priority: 10,
        rulesCount: 1,
        source: 'AUTONOMOUS_LEARNED',
        history: [{ ruleType, metrics, learnedAt: new Date().toISOString() }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      tenantMap.set(skillId, record);
    } else {
      const lines = record.instructions.split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.includes(ruleText.trim())) {
        record.instructions = `${record.instructions.trim()}\n${ruleText}\n`;
      }
      record.history.push({ ruleType, metrics, learnedAt: new Date().toISOString() });
      record.rulesCount = record.instructions.split('\n').filter(l => l.trim().startsWith('- [')).length;
      record.updatedAt = new Date();
    }

    return {
      success: true,
      skillId,
      ruleAdded: ruleText,
      totalRules: record.rulesCount,
      enabled: record.enabled,
    };
  }
}

module.exports = new TenantSkillsService();
