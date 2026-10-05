const {
  validateDeliveryEvidence,
  generateDeliveryComment,
  validateApprovalGate,
  validateRevisionRequest
} = require('../../services/taskEvidenceService');

describe('Task Delivery Gate & Approval Gate Unit Tests', () => {
  describe('1. validateDeliveryEvidence (بوابة التسليم الاختيارية وغير المانعة)', () => {
    it('بدون دليل → مقبول بدون تعطيل (Accepts when no evidence is provided)', () => {
      const result = validateDeliveryEvidence({}, []);
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.sanitizedEvidence).toBeNull();
    });

    it('حقول جزئية → مقبولة وتسجل ما تم إدخاله (Accepts partial evidence without blocking)', () => {
      const partialEvidence = {
        changeType: 'BUG_FIX',
        commitOrPath: 'fix(tasks): resolve delivery gate lock'
      };
      const attachments = [{ id: 'att-1', fileName: 'test-run.png' }];

      const result = validateDeliveryEvidence(partialEvidence, attachments);
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.sanitizedEvidence).toBeDefined();
      expect(result.sanitizedEvidence.changeType).toBe('BUG_FIX');
      expect(result.sanitizedEvidence.commitOrPath).toBe('fix(tasks): resolve delivery gate lock');
    });

    it('بدون مرفقات → مقبول بدون حجب (Accepts even if no proof attachments exist)', () => {
      const evidence = {
        changeType: 'FEATURE',
        commitOrPath: 'feat(tasks): compliance reporting'
      };
      const emptyAttachments = [];

      const result = validateDeliveryEvidence(evidence, emptyAttachments);
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('بأربعة أسئلة + مرفق → مقبول وموثق (Accepts when full evidence is provided)', () => {
      const validEvidence = {
        changeType: 'BUG_FIX',
        commitOrPath: 'apps/backend/controller/taskController.js + 42 lines',
        numbersBeforeAfter: 'المهام المعلقة بدون دليل انخفضت من 80 إلى 0 بعد فرض البوابة',
        notTestedScope: 'تم اختبار بيئة التطوير والاختبارات الآلية',
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
    it('ينشئ قالباً تعليقياً يوثق البيانات إن وجدت', () => {
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

    it('ينشئ تعليق تسليم بسيط عند عدم وجود دليل', () => {
      const user = { firstName: 'شروق', lastName: 'علي' };
      const comment = generateDeliveryComment(null, user);
      expect(comment).toContain('تسليم المهمة للمراجعة والاعتماد');
      expect(comment).toContain('شروق علي');
    });
  });

  describe('3. validateApprovalGate (بوابة الاعتماد السلسة وغير المعطلة)', () => {
    it('اعتماد مهمة بدون دليل → مسموح وسلس (Allows approval without evidence)', () => {
      const taskWithoutEvidence = {
        id: 't-1',
        title: 'Task without proof',
        hasEvidence: false,
        evidence: null,
        acceptanceCriteria: 'معيار 1'
      };
      const approver = { id: 'u-admin', role: 'COMPANY_ADMIN' };

      const result = validateApprovalGate(taskWithoutEvidence, approver, { criteriaChecked: true });
      expect(result.isValid).toBe(true);
    });

    it('اعتماد مباشر بدون إجبار على التأشير على جميع المعايير (Allows approval directly)', () => {
      const taskWithCriteria = {
        id: 't-2',
        title: 'Task with criteria',
        hasEvidence: false,
        acceptanceCriteria: '1. شاشة المراجعة تعمل\n2. التقرير دقيق'
      };
      const approver = { id: 'u-admin', role: 'COMPANY_ADMIN' };

      const result = validateApprovalGate(taskWithCriteria, approver, {
        criteriaChecked: false
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('4. validateRevisionRequest (إرجاع للتعديل وزيادة returnCount)', () => {
    it('سبب الإرجاع إلزامي (Rejects revision request with empty reason)', () => {
      const result = validateRevisionRequest('', 2, { name: 'المدير' });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('سبب الإرجاع للتعديل إلزامي');
    });

    it('الإرجاع يسجل السبب ويزيد returnCount تلقائياً', () => {
      const result = validateRevisionRequest('يرجى مراجعة الصياغة والتنسيق', 1, { firstName: 'شادي' });
      expect(result.isValid).toBe(true);
      expect(result.nextReturnCount).toBe(2);
      expect(result.comment).toContain('إعادة المهمة للتعديل (المرة رقم 2)');
      expect(result.comment).toContain('يرجى مراجعة الصياغة والتنسيق');
      expect(result.comment).toContain('شادي');
    });
  });
});
