const {
  validateDeliveryEvidence,
  generateDeliveryComment,
  validateApprovalGate,
  validateRevisionRequest
} = require('../../services/taskEvidenceService');

describe('Task Delivery Gate & Approval Gate Unit Tests', () => {
  describe('1. validateDeliveryEvidence (بوابة التسليم)', () => {
    it('بدون دليل → مرفوض (Rejects when no evidence is provided)', () => {
      const result = validateDeliveryEvidence({}, []);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('نوع التغيير (Change Type)');
      expect(result.missingFields).toContain('الكوميت / مسار التعديل (Commit / File Path)');
      expect(result.missingFields).toContain('الأرقام قبل / بعد (Numbers Before & After)');
      expect(result.missingFields).toContain('«إيه اللي ما اختبرتهوش» (What wasn\'t tested / Limitations)');
      expect(result.missingFields).toContain('إثبات تشغيل مرفق (Attached Proof of Run)');
      expect(result.errorSummary).toMatch(/لا يمكن تسليم المهمة للمراجعة قبل اكتمال الدليل/);
    });

    it('أي خانة من الأربعة فاضية تمنع التسليم (Rejects if any of the 4 template fields is empty)', () => {
      // Missing question 4: notTestedScope
      const partialEvidence = {
        changeType: 'BUG_FIX',
        commitOrPath: 'fix(tasks): resolve delivery gate lock',
        numbersBeforeAfter: 'قبل: 80 معلقة بدون دليل، بعد: 0 معلقة بدون دليل',
        notTestedScope: '' // Empty
      };
      const attachments = [{ id: 'att-1', fileName: 'test-run.png' }];

      const result = validateDeliveryEvidence(partialEvidence, attachments);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('«إيه اللي ما اختبرتهوش» (What wasn\'t tested / Limitations)');
      expect(result.missingFields).not.toContain('نوع التغيير (Change Type)');
      expect(result.missingFields).not.toContain('إثبات تشغيل مرفق (Attached Proof of Run)');
    });

    it('يرفض التسليم إذا لم يوجد أي مرفق إثبات تشغيل', () => {
      const evidence = {
        changeType: 'FEATURE',
        commitOrPath: 'feat(tasks): compliance reporting',
        numbersBeforeAfter: 'Before: 0%, After: 100%',
        notTestedScope: 'Mobile landscape not tested'
      };
      const emptyAttachments = [];

      const result = validateDeliveryEvidence(evidence, emptyAttachments);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('إثبات تشغيل مرفق (Attached Proof of Run)');
    });

    it('دليل مخرج الوكيل: «تمّت» من الوكيل مش دليل وترفض فوراً', () => {
      const agentEvidenceWithDone = {
        changeType: 'FEATURE',
        commitOrPath: 'feat/agent-work',
        numbersBeforeAfter: '10 -> 20',
        notTestedScope: 'None',
        proofAttachmentId: 'att-1',
        isAgent: true,
        agentName: 'MaxPAgent',
        agentRunId: 'run-999',
        agentTestOutput: 'تمت' // Banned trivial string!
      };

      const result = validateDeliveryEvidence(agentEvidenceWithDone, []);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('ناتج اختبارات حقيقي للوكيل («تمّت» وحدها ليست دليلاً معتمداً)');
    });

    it('بأربعة أسئلة + مرفق → مقبول (Accepts when all 4 questions + attachment are valid)', () => {
      const validEvidence = {
        changeType: 'BUG_FIX',
        commitOrPath: 'apps/backend/controller/taskController.js + 42 lines',
        numbersBeforeAfter: 'المهام المعلقة بدون دليل انخفضت من 80 إلى 0 بعد فرض البوابة',
        notTestedScope: 'تم اختبار بيئة التطوير والاختبارات الآلية؛ لم تُجر تجربة على بيئة Safari القديمة',
        agentInfo: {
          isAgent: true,
          agentName: 'MaxPAgent',
          commitOrRunId: 'git-commit-e4f8b2',
          testOutput: 'PASS tests/services/taskDeliveryGate.test.js\n12 passed, 12 total\nTime: 1.2s'
        }
      };
      const attachments = [{ id: 'att-screenshot-1', fileName: 'test-execution.png' }];

      const result = validateDeliveryEvidence(validEvidence, attachments);
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.sanitizedEvidence).toBeDefined();
      expect(result.sanitizedEvidence.changeType).toBe('BUG_FIX');
      expect(result.sanitizedEvidence.agentInfo.testOutput).toContain('12 passed');
    });
  });

  describe('2. generateDeliveryComment (تعليق آلي وقت التسليم)', () => {
    it('ينشئ قالباً تعليقياً غنياً يوثق الأسئلة الأربعة والمنفذ والمرفق', () => {
      const evidence = {
        changeType: 'HOTFIX',
        commitOrPath: 'fix(auth): lock session',
        numbersBeforeAfter: '0 -> 100%',
        notTestedScope: 'Only tested on Chrome',
        proofAttachmentName: 'evidence-screen.mp4',
        agentInfo: null
      };
      const user = { firstName: 'شروق', lastName: 'علي', email: 'shrouk@example.com' };

      const comment = generateDeliveryComment(evidence, user);
      expect(comment).toContain('📋 **توثيق تسليم المهمة للمراجعة والاعتماد (Delivery Gate)**');
      expect(comment).toContain('شروق علي');
      expect(comment).toContain('نوع التغيير:** HOTFIX');
      expect(comment).toContain('`fix(auth): lock session`');
      expect(comment).toContain('evidence-screen.mp4');
    });
  });

  describe('3. validateApprovalGate (بوابة الاعتماد)', () => {
    it('ممنوع اعتماد مهمة ليس لديها دليل معتمد (hasEvidence=false)', () => {
      const taskWithoutEvidence = {
        id: 't-1',
        title: 'Task without proof',
        hasEvidence: false,
        evidence: null,
        acceptanceCriteria: 'معيار 1'
      };
      const approver = { id: 'u-admin', role: 'COMPANY_ADMIN' };

      const result = validateApprovalGate(taskWithoutEvidence, approver, { criteriaChecked: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('لا يمكن اعتماد المهمة بدون دليل تسليم معتمد');
    });

    it('اعتماد بمعيار غير متأشّر مرفوض (Rejects approval when criteria are unchecked)', () => {
      const taskWithCriteria = {
        id: 't-2',
        title: 'Task with criteria',
        hasEvidence: true,
        evidence: { changeType: 'FEATURE' },
        acceptanceCriteria: '1. شاشة المراجعة تعمل\n2. التقرير دقيق'
      };
      const approver = { id: 'u-admin', role: 'COMPANY_ADMIN' };

      // criteriaChecked is false
      const result = validateApprovalGate(taskWithCriteria, approver, {
        criteriaChecked: false,
        checklistState: [{ label: '1', checked: true }, { label: '2', checked: false }]
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('يجب التأشير على جميع معايير القبول');
    });

    it('اعتماد مكتمل الدليل ومؤشر على جميع المعايير → مقبول', () => {
      const task = {
        id: 't-3',
        title: 'Ready task',
        hasEvidence: true,
        evidence: { changeType: 'FEATURE' },
        acceptanceCriteria: 'معيار 1'
      };
      const approver = { id: 'u-admin', role: 'COMPANY_ADMIN' };

      const result = validateApprovalGate(task, approver, { criteriaChecked: true });
      expect(result.isValid).toBe(true);
      expect(result.isOverride).toBe(false);
    });

    it('override للمالك فقط ومسجّل بالسبب (Owner Override)', () => {
      const taskWithoutEvidence = {
        id: 't-4',
        title: 'Urgent hotfix',
        hasEvidence: false,
        evidence: null,
        acceptanceCriteria: 'معيار 1'
      };

      // Case 1: Non-owner attempts override -> REJECTED
      const nonOwner = { id: 'u-emp', role: 'DEVELOPER' };
      const nonOwnerResult = validateApprovalGate(taskWithoutEvidence, nonOwner, {
        ownerOverride: true,
        ownerOverrideReason: 'طوارئ'
      });
      expect(nonOwnerResult.isValid).toBe(false);
      expect(nonOwnerResult.error).toContain('مقتصرة حصرياً على مالك المنصة');

      // Case 2: Owner attempts override without reason -> REJECTED
      const owner = { id: 'u-owner', role: 'OWNER' };
      const emptyReasonResult = validateApprovalGate(taskWithoutEvidence, owner, {
        ownerOverride: true,
        ownerOverrideReason: ''
      });
      expect(emptyReasonResult.isValid).toBe(false);
      expect(emptyReasonResult.error).toContain('يجب كتابة سبب واضح');

      // Case 3: Owner with valid reason -> ACCEPTED
      const validOwnerResult = validateApprovalGate(taskWithoutEvidence, owner, {
        ownerOverride: true,
        ownerOverrideReason: 'اعتماد استثنائي بأمر المالك شادي لحل مشكلة الإنتاج الطارئة'
      });
      expect(validOwnerResult.isValid).toBe(true);
      expect(validOwnerResult.isOverride).toBe(true);
    });
  });

  describe('4. validateRevisionRequest (إرجاع للتعديل وزيادة returnCount)', () => {
    it('سبب الإرجاع إلزامي (Rejects revision request with empty reason)', () => {
      const result = validateRevisionRequest('', 2, { name: 'المدير' });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('سبب الإرجاع للتعديل إلزامي');
    });

    it('الإرجاع يسجل السبب ويزيد returnCount تلقائياً', () => {
      const result = validateRevisionRequest('الصورة المرفقة غير واضحة ومسار الكوميت ناقص', 1, { firstName: 'شادي' });
      expect(result.isValid).toBe(true);
      expect(result.nextReturnCount).toBe(2);
      expect(result.comment).toContain('إعادة المهمة للتعديل (المرة رقم 2)');
      expect(result.comment).toContain('الصورة المرفقة غير واضحة');
      expect(result.comment).toContain('شادي');
    });
  });
});
