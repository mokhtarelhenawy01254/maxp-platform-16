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
        // الصور ومرفق الإثبات بقوا اختياريين للمهام HIGH (قرار المالك 2026-11-01):
        // الشغل اللي مالهوش واجهة (باك-إند/تستات) كان بيتقفل آليًا للأبد.
        expect(result.missingFields).not.toContain('صورة قبل');
        expect(result.missingFields).not.toContain('صورة بعد');
        expect(result.errorSummary).toContain('أدلة التسليم غير مكتملة');
        expect(result.errorSummary).toContain('عالية / عاجلة');
      });

      it('HIGH بالحقول النصية كاملة وبدون صور → isValid: true (الصور اختيارية)', () => {
        const evidenceWithoutImages = {
          changeType: 'FEATURE',
          commitOrPath: 'feat(core): new checkout engine',
          numbersBeforeAfter: 'Conversion rate 2% -> 5%',
          notTestedScope: 'Tested on desktop Chrome'
        };
        const result = validateDeliveryEvidence(evidenceWithoutImages, [], { priority: 'HIGH' });

        expect(result.isValid).toBe(true);
        expect(result.missingFields).toHaveLength(0);
        expect(result.sanitizedEvidence.commitOrPath).toBe('feat(core): new checkout engine');
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
        expect(result.missingFields.length).toBeGreaterThanOrEqual(3);
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

  describe('4. Desktop Evidence Payload Validation (T12 - Task Gate)', () => {
    it('تسليم مهمة HIGH من الديسكتوب بالـ ٣ صور والبيانات → isValid: true بدون 422', () => {
      const desktopPayload = {
        evidence: {
          changeType: 'BUG_FIX',
          commitOrPath: 'fix(desktop): approval gate evidence uploads',
          numbersBeforeAfter: '0/3 → 3/3 attachments uploaded',
          notTestedScope: 'None - tested via desktop suite',
          beforeAttachmentId: 'att-desktop-before-1',
          afterAttachmentId: 'att-desktop-after-2',
          proofAttachmentId: 'att-desktop-proof-3'
        }
      };
      const existingAttachments = [
        { id: 'att-desktop-before-1', fileName: 'before.png' },
        { id: 'att-desktop-after-2', fileName: 'after.png' },
        { id: 'att-desktop-proof-3', fileName: 'proof.pdf' }
      ];

      const result = validateDeliveryEvidence(desktopPayload, existingAttachments, { priority: 'HIGH' });
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.sanitizedEvidence.beforeAttachmentId).toBe('att-desktop-before-1');
      expect(result.sanitizedEvidence.afterAttachmentId).toBe('att-desktop-after-2');
      expect(result.sanitizedEvidence.proofAttachmentId).toBe('att-desktop-proof-3');
    });

    it('تسليم مهمة HIGH من الديسكتوب بدون صورة بعد → isValid: true (الصور اختيارية)', () => {
      const desktopPayloadMissingAfter = {
        evidence: {
          changeType: 'BUG_FIX',
          commitOrPath: 'fix(desktop): approval gate',
          numbersBeforeAfter: '1/3',
          notTestedScope: 'None',
          beforeAttachmentId: 'att-desktop-before-1'
        }
      };

      const result = validateDeliveryEvidence(desktopPayloadMissingAfter, [], { priority: 'HIGH' });
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('تسليم مهمة MEDIUM أو LOW من الديسكتوب يعمل بسلاسة دون إلزام بالصور', () => {
      const mediumPayload = {
        evidence: {
          changeType: 'FEATURE',
          commitOrPath: 'feat(desktop): quick task'
        }
      };
      const mediumResult = validateDeliveryEvidence(mediumPayload, [], { priority: 'MEDIUM' });
      expect(mediumResult.isValid).toBe(true);

      const lowPayload = { evidence: {} };
      const lowResult = validateDeliveryEvidence(lowPayload, [], { priority: 'LOW' });
      expect(lowResult.isValid).toBe(true);
    });
  });
});
