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
    // Merchant approval policy: defaults to true (Hermes skills.write_approval standard)
    this._approvalPolicy = new Map();
  }

  isWriteApprovalRequired(companyId) {
    if (this._approvalPolicy.has(companyId)) {
      return Boolean(this._approvalPolicy.get(companyId));
    }
    return true; // Safe by default
  }

  setWriteApprovalRequired(companyId, required) {
    this._approvalPolicy.set(companyId, Boolean(required));
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
  async listLearnedRules(companyId, { skillType = null, enabled = null, status = null, agentRole = null } = {}) {
    if (!companyId) {
      throw new Error('companyId is required');
    }

    const roleDomainMap = {
      SUPPORT: ['CUSTOMER_SUPPORT', 'SUPPORT', 'GENERAL'],
      CUSTOMER_SUPPORT: ['CUSTOMER_SUPPORT', 'SUPPORT', 'GENERAL'],
      SALES: ['SALES', 'SALES_CLOSING', 'GENERAL'],
      MEDIA_BUYER: ['MEDIA_BUYER', 'GENERAL'],
      INVENTORY: ['INVENTORY', 'OPERATIONS', 'GENERAL'],
      CLINIC: ['CLINIC', 'GENERAL'],
      HOTEL: ['HOTEL', 'GENERAL'],
      DENTAL_LAB: ['DENTAL_LAB', 'OPERATIONS', 'GENERAL'],
      OPERATIONS: ['OPERATIONS', 'INVENTORY', 'GENERAL'],
    };

    const allowedDomains = agentRole ? (roleDomainMap[String(agentRole).toUpperCase()] || [String(agentRole).toUpperCase(), 'GENERAL']) : null;

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
              triggerPhrases: r.triggerPhrases || '',
              enabled: r.enabled,
              priority: r.priority,
              skillType: meta.skill_type || 'MEDIA_BUYER',
              status: meta.status || (r.enabled ? 'ACTIVE' : 'PENDING_APPROVAL'),
              source: meta.source || 'AUTONOMOUS_LEARNED',
              rulesCount: meta.rules_count || 1,
              metadata: meta,
              createdAt: r.createdAt,
              updatedAt: r.updatedAt,
            };
          })
          .filter(r => (skillType ? r.skillType === skillType : true))
          .filter(r => (allowedDomains ? allowedDomains.includes(r.skillType) : true))
          .filter(r => (status ? r.status === status : true));
      } catch (err) {
        console.warn('[TenantSkillsService] DB query failed, using memory store:', err.message);
      }
    }

    // Memory store fallback
    const tenantMap = this._memoryStore.get(companyId) || new Map();
    let list = Array.from(tenantMap.values());
    if (enabled !== null) list = list.filter(r => r.enabled === enabled);
    if (skillType) list = list.filter(r => r.skillType === skillType);
    if (allowedDomains) list = list.filter(r => allowedDomains.includes(r.skillType));
    if (status) list = list.filter(r => (r.status || (r.enabled ? 'ACTIVE' : 'PENDING_APPROVAL')) === status);
    return list;
  }

  /**
   * Approve a pending learned skill / rule (Hermes write_approval gate).
   */
  async approveSkill(companyId, skillId) {
    if (!companyId || !skillId) throw new Error('companyId and skillId are required');

    const prisma = this._getPrisma();
    if (prisma && prisma.companySkill) {
      try {
        const existing = await prisma.companySkill.findFirst({ where: { companyId, id: skillId } });
        if (existing) {
          let meta = {};
          try { meta = existing.metadata ? JSON.parse(existing.metadata) : {}; } catch { meta = {}; }
          meta.status = 'ACTIVE';
          meta.approvedAt = new Date().toISOString();

          await prisma.companySkill.update({
            where: { id: existing.id },
            data: { enabled: true, metadata: JSON.stringify(meta), updatedAt: new Date() },
          });
          return { success: true, skillId, status: 'ACTIVE', enabled: true };
        }
      } catch (err) {
        console.warn('[TenantSkillsService] DB approve failed, using memory store:', err.message);
      }
    }

    const tenantMap = this._memoryStore.get(companyId);
    if (tenantMap && tenantMap.has(skillId)) {
      const item = tenantMap.get(skillId);
      item.status = 'ACTIVE';
      item.enabled = true;
      item.approvedAt = new Date().toISOString();
      item.updatedAt = new Date();
      return { success: true, skillId, status: 'ACTIVE', enabled: true };
    }

    return { success: false, error: 'Skill not found for tenant' };
  }

  /**
   * Reject a pending learned skill / rule.
   */
  async rejectSkill(companyId, skillId) {
    if (!companyId || !skillId) throw new Error('companyId and skillId are required');

    const prisma = this._getPrisma();
    if (prisma && prisma.companySkill) {
      try {
        const existing = await prisma.companySkill.findFirst({ where: { companyId, id: skillId } });
        if (existing) {
          let meta = {};
          try { meta = existing.metadata ? JSON.parse(existing.metadata) : {}; } catch { meta = {}; }
          meta.status = 'REJECTED';
          meta.rejectedAt = new Date().toISOString();

          await prisma.companySkill.update({
            where: { id: existing.id },
            data: { enabled: false, metadata: JSON.stringify(meta), updatedAt: new Date() },
          });
          return { success: true, skillId, status: 'REJECTED', enabled: false };
        }
      } catch (err) {
        console.warn('[TenantSkillsService] DB reject failed, using memory store:', err.message);
      }
    }

    const tenantMap = this._memoryStore.get(companyId);
    if (tenantMap && tenantMap.has(skillId)) {
      const item = tenantMap.get(skillId);
      item.status = 'REJECTED';
      item.enabled = false;
      item.rejectedAt = new Date().toISOString();
      item.updatedAt = new Date();
      return { success: true, skillId, status: 'REJECTED', enabled: false };
    }

    return { success: false, error: 'Skill not found for tenant' };
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
      metrics: { adName, angle, spend, revenue, purchases, roas, cpa, frequency, ctr, autoApprove: true },
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
      metrics: { outcome, objection, closingAngle, productName, autoApprove: true },
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

  async _saveLearnedRule({ companyId, skillId, skillName, skillType, ruleText, ruleType, metrics = {} }) {
    const baseHeader = `# ${skillName} (${companyId})\n> مهارة تم استخلاصها وتطويرها ذاتياً بناءً على تجارب المتجر الفعلية (Hermes Self-Learning Engine).\n\n## القواعد والدروس التشغيلية المعتمدة:\n`;

    const requiresApproval = this.isWriteApprovalRequired(companyId);
    const initialStatus = metrics.autoApprove ? 'ACTIVE' : (requiresApproval ? 'PENDING_APPROVAL' : 'ACTIVE');
    const isEnabled = initialStatus === 'ACTIVE';

    const cleanDescription = (metrics.title || skillName).slice(0, 60);

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
            status: initialStatus,
            rules_count: 1,
            history: [{ ruleType, metrics, learnedAt: new Date().toISOString() }],
          };

          const created = await prisma.companySkill.create({
            data: {
              companyId,
              name: skillName,
              description: cleanDescription,
              triggerPhrases: metrics.triggerKeywords || 'حملة,إعلان,تقرير,مبيعات,استهداف,أداء,خصم,شحن',
              instructions: updatedInstructions,
              priority: 10,
              enabled: isEnabled,
              metadata: JSON.stringify(meta),
            },
          });
          return { success: true, skillId: created.id, ruleAdded: ruleText, totalRules: 1, status: initialStatus, enabled: isEnabled };
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
          meta.status = existing.enabled ? 'ACTIVE' : initialStatus;
          meta.last_updated_at = new Date().toISOString();

          await prisma.companySkill.update({
            where: { id: existing.id },
            data: {
              instructions: updatedInstructions,
              metadata: JSON.stringify(meta),
              updatedAt: new Date(),
            },
          });
          return { success: true, skillId: existing.id, ruleAdded: ruleText, totalRules: meta.rules_count, status: meta.status, enabled: existing.enabled };
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
        description: cleanDescription,
        triggerPhrases: metrics.triggerKeywords || 'حملة,إعلان,تقرير,مبيعات,استهداف,أداء,خصم,شحن',
        instructions: `${baseHeader}\n${ruleText}\n`,
        enabled: isEnabled,
        status: initialStatus,
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
      record.status = record.enabled ? 'ACTIVE' : initialStatus;
      record.updatedAt = new Date();
    }

    return {
      success: true,
      skillId,
      ruleAdded: ruleText,
      totalRules: record.rulesCount,
      status: record.status,
      enabled: record.enabled,
    };
  }

  /**
   * Hermes Progressive Disclosure - Level 0: Compact Index (< 60 chars description)
   */
  async getL0Index(companyId, { agentRole = null } = {}) {
    const activeSkills = await this.listLearnedRules(companyId, { enabled: true, status: 'ACTIVE', agentRole });
    return activeSkills.map(s => ({
      id: s.id,
      name: s.name,
      description: String(s.description || s.name).slice(0, 60),
      triggerPhrases: s.triggerPhrases || '',
      skillType: s.skillType,
    }));
  }

  /**
   * Hermes Progressive Disclosure - Level 1: Just-In-Time Active Skill Injection
   */
  async getL1ActiveInstructions(companyId, { agentRole = null, userMessage = '' } = {}) {
    const activeSkills = await this.listLearnedRules(companyId, { enabled: true, status: 'ACTIVE', agentRole });
    if (!userMessage) return [];

    const matched = [];
    const lowerMsg = userMessage.toLowerCase();

    for (const skill of activeSkills) {
      const triggers = (skill.triggerPhrases || '')
        .split(/[,|\n]/)
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);

      const hit = triggers.some(t => lowerMsg.includes(t));
      if (hit) {
        matched.push({
          id: skill.id,
          name: skill.name,
          instructions: skill.instructions,
        });
      }
    }
    return matched;
  }

  /**
   * Hermes Post-Turn Background Review Worker (equivalent to agent/background_review.py)
   * Separates execution from reflection, inspects trajectory, rejects prompt injection,
   * and abstracts ground-truth validated playbooks into PENDING_APPROVAL status.
   */
  async triggerBackgroundReview(companyId, { agentRole = 'GENERAL', trajectory = [], groundTruthOutcome = 'SUCCESS', metadata = {} } = {}) {
    if (!companyId) throw new Error('companyId is required');

    // 1. Prompt Injection & Poisoning Guard
    const injectionPatterns = [
      /ignore\s+(all\s+)?previous\s+instructions/i,
      /system\s+prompt/i,
      /admin\s+override/i,
      /jailbreak/i,
      /free\s+shipping\s+for\s+all/i,
      /give\s+me\s+90%/i,
      /خصم\s+90%/i,
      /شحن\s+مجاني\s+لكل\s+العملاء/i,
      /تجاهل\s+التعليمات/i,
      /أنا\s+(المدير|المالك|الإدارة)\s+التنفيذي/i,
    ];

    const conversationText = Array.isArray(trajectory)
      ? trajectory.map(t => (typeof t === 'string' ? t : (t.content || t.text || ''))).join(' ')
      : String(trajectory || '');

    for (const pattern of injectionPatterns) {
      if (pattern.test(conversationText)) {
        console.warn(`[BackgroundReview] Potential Prompt Injection blocked for tenant ${companyId}:`, pattern);
        return {
          success: false,
          blocked: true,
          error: 'POTENTIAL_INJECTION_DETECTED',
          reason: 'Trajectory contained forbidden instruction override attempt',
        };
      }
    }

    // 2. Ground-Truth Outcome Validation
    const isSuccess = ['SUCCESS', 'CONFIRMED', 'ORDER_CREATED', 'ROAS_HIT', 'OBJECTION_RESOLVED'].includes(
      String(groundTruthOutcome).toUpperCase()
    );

    const categoryMap = {
      SUPPORT: 'CUSTOMER_SUPPORT',
      CUSTOMER_SUPPORT: 'CUSTOMER_SUPPORT',
      SALES: 'SALES',
      MEDIA_BUYER: 'MEDIA_BUYER',
      INVENTORY: 'INVENTORY',
      CLINIC: 'CLINIC',
      HOTEL: 'HOTEL',
      DENTAL_LAB: 'DENTAL_LAB',
      OPERATIONS: 'OPERATIONS',
      GENERAL: 'GENERAL',
    };
    const category = categoryMap[String(agentRole).toUpperCase()] || 'GENERAL';

    const ruleTitle = metadata.ruleTitle || (isSuccess ? `تكتيك ناجح: ${category}` : `إجراء تصحيحي: ${category}`);
    const ruleInstruction = metadata.ruleInstructions || (
      isSuccess
        ? `أثبت التفاعل نجاح مسار الإجراء في تأكيد الطلب؛ اعتمد هذا الأسلوب عند تكرار نفس المعطيات.`
        : `تجنب التكرار المباشر عند فشل المعالجة؛ وجه العميل لخيار بديل أو تصعيد مباشر.`
    );

    return await this.recordUniversalRule(companyId, {
      category,
      ruleTitle,
      ruleInstructions: ruleInstruction,
      triggerKeywords: metadata.triggerKeywords || '',
      metadata: {
        source: 'HERMES_BACKGROUND_REVIEW',
        groundTruthOutcome,
        agentRole,
        evaluatedAt: new Date().toISOString(),
        ...metadata,
      },
    });
  }
}

module.exports = new TenantSkillsService();

