const {
  validateDeliveryEvidence,
  generateDeliveryComment,
  validateApprovalGate,
  validateRevisionRequest,
  normalizeTaskPriority
} = require('../../services/taskEvidenceService');

describe('Task Delivery Gate & Severity Enforcement Tests', () => {
  describe('1. validateDeliveryEvidence Unit Tests (حسب درجة الخطورة)', () => {
    describe('HIGH & URGENT priority (إلزام كامل)', () => {
      it('HIGH ناقص (نوع التغيير بس) → isValid: false ومع قائمة الحقول الناقصة', () => {
        const partialEvidence = {
          changeType: 'BUG_FIX'
        };
        const result = validateDeliveryEvidence(partialEvidence, [], 'HIGH');

        expect(result.isValid).toBe(false);
        expect(result.missingFields).toContain('لينك الصفحة أو الكوميت/مسار التعديل');
        expect(result.missingFields).toContain('الأرقام قبل / بعد');
        expect(result.missingFields).toContain('نطاق ما لم يتم اختباره');
        expect(result.missingFields).toContain('صورة قبل');
        expect(result.missingFields).toContain('صورة بعد');
        expect(result.missingFields).toContain('مرفق إثبات التشغيل');
        expect(result.errorSummary).toContain('أدلة التسليم غير مكتملة');
        expect(result.errorSummary).toContain('عالية / عاجلة');
      });

      it('HIGH بناقص إحدى الصورتين (صورة قبل فقط دون صورة بعد) → isValid: false', () => {
        const evidenceMissingAfter = {
          changeType: 'FEATURE',
          commitOrPath: 'feat(core): new checkout engine',
          numbersBeforeAfter: 'Conversion rate 2% -> 5%',
          notTestedScope: 'Tested on desktop Chrome',
          beforeAttachmentUrl: 'https://maxp.online/uploads/before.png'
        };
        const result = validateDeliveryEvidence(evidenceMissingAfter, [], { priority: 'HIGH' });

        expect(result.isValid).toBe(false);
        expect(result.missingFields).toContain('صورة بعد');
        expect(result.missingFields).not.toContain('صورة قبل');
      });

      it('HIGH كامل (كل الحقول + صورتين قبل وبعد) → isValid: true', () => {
        const fullHighEvidence = {
          changeType: 'BUG_FIX',
          commitOrPath: 'fix(auth): prevent session timeout',
          pageUrl: 'https://maxp.online/settings/security',
          numbersBeforeAfter: 'Session errors dropped from 14% to 0%',
          notTestedScope: 'Tested with Jest and Cypress; production canary pending',
          beforeAttachmentId: 'att-before-123',
          beforeAttachmentUrl: 'https://maxp.online/uploads/before.png',
          afterAttachmentId: 'att-after-456',
          afterAttachmentUrl: 'https://maxp.online/uploads/after.png',
          proofAttachmentId: 'att-after-456',
          agentInfo: {
            isAgent: true,
            agentName: 'MaxP TestBot',
            commitOrRunId: 'git-sha-789',
            testOutput: 'PASS 15 tests'
          }
        };
        const result = validateDeliveryEvidence(fullHighEvidence, [], { priority: 'HIGH' });

        expect(result.isValid).toBe(true);
        expect(result.missingFields).toHaveLength(0);
        expect(result.errorSummary).toBe('');
        expect(result.sanitizedEvidence).toBeDefined();
        expect(result.sanitizedEvidence.beforeAttachmentId).toBe('att-before-123');
        expect(result.sanitizedEvidence.afterAttachmentId).toBe('att-after-456');
        expect(result.sanitizedEvidence.pageUrl).toBe('https://maxp.online/settings/security');
      });

      it('URGENT priority يتبع نفس الإلزام الكامل لـ HIGH', () => {
        const partialUrgent = { changeType: 'HOTFIX' };
        const result = validateDeliveryEvidence(partialUrgent, [], 'URGENT');

        expect(result.isValid).toBe(false);
        expect(result.missingFields.length).toBeGreaterThan(3);
      });
    });

    describe('MEDIUM priority (إلزام أساسي: نوع التغيير + اللينك أو الكوميت)', () => {
      it('MEDIUM ناقص اللينك والكوميت → isValid: false', () => {
        const evidenceMissingLink = {
          changeType: 'REFACTOR'
        };
        const result = validateDeliveryEvidence(evidenceMissingLink, [], 'MEDIUM');

        expect(result.isValid).toBe(false);
        expect(result.missingFields).toContain('لينك الصفحة أو الكوميت/مسار التعديل');
        expect(result.missingFields).not.toContain('صورة قبل');
        expect(result.missingFields).not.toContain('صورة بعد');
      });

      it('MEDIUM كامل الحد الأدنى مع commitOrPath → isValid: true', () => {
        const minimalMedium = {
          changeType: 'PERFORMANCE',
          commitOrPath: 'perf(db): optimize query indexes'
        };
        const result = validateDeliveryEvidence(minimalMedium, [], 'MEDIUM');

        expect(result.isValid).toBe(true);
        expect(result.missingFields).toHaveLength(0);
        expect(result.sanitizedEvidence.commitOrPath).toBe('perf(db): optimize query indexes');
      });

      it('MEDIUM كامل الحد الأدنى مع pageUrl بدلاً من commitOrPath → isValid: true', () => {
        const mediumWithPageUrl = {
          changeType: 'UI_UX',
          pageUrl: 'https://maxp.online/tasks'
        };
        const result = validateDeliveryEvidence(mediumWithPageUrl, [], 'MEDIUM');

        expect(result.isValid).toBe(true);
        expect(result.missingFields).toHaveLength(0);
        expect(result.sanitizedEvidence.pageUrl).toBe('https://maxp.online/tasks');
      });
    });

    describe('LOW priority (بدون إلزام)', () => {
      it('LOW فاضي بالكامل → isValid: true', () => {
        const result = validateDeliveryEvidence({}, [], 'LOW');

        expect(result.isValid).toBe(true);
        expect(result.missingFields).toHaveLength(0);
        expect(result.errorSummary).toBe('');
      });

      it('LOW يسجل الدليل إن وجد دون حجب في حال غيابه', () => {
        const lowWithPartial = {
          changeType: 'CONFIG',
          numbersBeforeAfter: 'N/A'
        };
        const result = validateDeliveryEvidence(lowWithPartial, [], 'LOW');

        expect(result.isValid).toBe(true);
        expect(result.sanitizedEvidence).toBeDefined();
        expect(result.sanitizedEvidence.changeType).toBe('CONFIG');
      });
    });

    describe('Backward Compatibility (التوافق للخلف)', () => {
      it('payload بالشكل القديم (proofAttachmentId وبدون صور قبل/بعد) على مهمة MEDIUM يفضل يعدّي', () => {
        const legacyPayload = {
          changeType: 'BUG_FIX',
          commitOrPath: 'fix(tasks): resolve delivery gate lock',
          proofAttachmentId: 'att-legacy-1'
        };
        const attachments = [{ id: 'att-legacy-1', fileName: 'test-run.png' }];

        const result = validateDeliveryEvidence(legacyPayload, attachments, 'MEDIUM');
        expect(result.isValid).toBe(true);
        expect(result.missingFields).toHaveLength(0);
        expect(result.sanitizedEvidence.proofAttachmentId).toBe('att-legacy-1');
      });

      it('payload بالشكل القديم على مهمة LOW يفضل يعدّي', () => {
        const legacyPayload = {
          proofAttachmentId: 'att-legacy-2'
        };
        const result = validateDeliveryEvidence(legacyPayload, [], 'LOW');
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('2. generateDeliveryComment (تعليق آلي وقت التسليم)', () => {
    it('يوثق كافة البيانات بما فيها صورتي قبل وبعد ولينك الصفحة', () => {
      const evidence = {
        changeType: 'FEATURE',
        pageUrl: 'https://maxp.online/inventory',
        commitOrPath: 'feat(inv): bulk barcode scanner',
        numbersBeforeAfter: 'Speedup 3x',
        notTestedScope: 'Tested on Zebra scanners',
        beforeAttachmentUrl: 'https://maxp.online/uploads/before-kiosk.png',
        afterAttachmentUrl: 'https://maxp.online/uploads/after-kiosk.png',
        proofAttachmentName: 'scanner-evidence.png',
        agentInfo: null
      };
      const user = { firstName: 'مختار', lastName: 'محمود' };

      const comment = generateDeliveryComment(evidence, user);
      expect(comment).toContain('📋 **توثيق تسليم المهمة للمراجعة والاعتماد (Delivery Gate)**');
      expect(comment).toContain('مختار محمود');
      expect(comment).toContain('FEATURE');
      expect(comment).toContain('https://maxp.online/inventory');
      expect(comment).toContain('صورة قبل');
      expect(comment).toContain('صورة بعد');
      expect(comment).toContain('scanner-evidence.png');
    });

    it('ينشئ تعليق تسليم بسيط عند عدم وجود دليل', () => {
      const user = { firstName: 'مختار', lastName: 'محمود' };
      const comment = generateDeliveryComment(null, user);
      expect(comment).toContain('تسليم المهمة للمراجعة والاعتماد');
      expect(comment).toContain('مختار محمود');
    });
  });

  describe('3. validateApprovalGate & validateRevisionRequest', () => {
    it('اعتماد مهمة بدون دليل مسموح وسلس للمدراء', () => {
      const task = { id: 't-1', title: 'Task 1' };
      const result = validateApprovalGate(task, { role: 'COMPANY_ADMIN' }, {});
      expect(result.isValid).toBe(true);
    });

    it('validateRevisionRequest يرفض الإرجاع الخالي من الأسباب', () => {
      const result = validateRevisionRequest('', 0);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('سبب الإرجاع للتعديل إلزامي');
    });
  });
});
