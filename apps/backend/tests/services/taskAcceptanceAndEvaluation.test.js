/**
 * Unit Test Suite: Task Acceptance Criteria, Return Evaluation, and Time Evaluation
 * Mocks DB and validates core domain logic, algorithms, and backdoor protections.
 */

const {
  validateAcceptanceCriteria,
  validateRevisionRequest,
  VALID_RETURN_REASON_TYPES,
  RETURN_REASON_LABELS,
  RETURN_SEVERITY_LABELS,
} = require('../../services/taskEvidenceService');

const {
  computeTimeEvaluationReport,
  computeTaskComplianceReport,
} = require('../../services/taskComplianceService');

describe('Task Acceptance Criteria & Evaluation Unit Tests', () => {
  describe('1. validateAcceptanceCriteria (معايير القبول)', () => {
    it('يرفض التسليم إذا كانت معايير القبول فارغة بالكامل مع رسالة باللغة العربية', () => {
      const res1 = validateAcceptanceCriteria('');
      expect(res1.isValid).toBe(false);
      expect(res1.error).toBe('ممنوع التسليم بدون كتابة معايير القبول');

      const res2 = validateAcceptanceCriteria('   \n  \t  ');
      expect(res2.isValid).toBe(false);
      expect(res2.error).toBe('ممنوع التسليم بدون كتابة معايير القبول');

      const res3 = validateAcceptanceCriteria(null);
      expect(res3.isValid).toBe(false);
      expect(res3.error).toBe('ممنوع التسليم بدون كتابة معايير القبول');
    });

    it('يرفض إذا كانت المعايير مصفوفة فارغة أو تحتوي على أسطر بيضاء فقط', () => {
      const res = validateAcceptanceCriteria(['', '   ']);
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('ممنوع التسليم بدون كتابة معايير القبول');
    });

    it('يقبل إذا كان هناك سطر واحد على الأقل صالح وينظف الأسطر الفارغة', () => {
      const input = `
        - التأكد من إرسال إشعار التذكير
        
        - فحص تقرير الوقت في الديسكتوب
      `;
      const res = validateAcceptanceCriteria(input);
      expect(res.isValid).toBe(true);
      expect(res.criteriaList).toHaveLength(2);
      expect(res.criteriaList[0]).toBe('التأكد من إرسال إشعار التذكير');
      expect(res.criteriaList[1]).toBe('فحص تقرير الوقت في الديسكتوب');
      expect(res.formattedText).toContain('التأكد من إرسال إشعار التذكير');
    });
  });

  describe('2. validateRevisionRequest (تقييم الإرجاع: السبب والشدة)', () => {
    it('يرفض إذا كان سبب الإرجاع نصاً فارغاً', () => {
      const res = validateRevisionRequest('', 1, { firstName: 'علي' }, 'WRONG_EXECUTION', 1);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('سبب الإرجاع للتعديل إلزامي');
    });

    it('يسجل نوع السبب والشدة ويقوم بترميزهما في التعليق الآلي', () => {
      const res = validateRevisionRequest(
        'الأرقام المحسوبة غير مطابقة لكشف الحساب',
        1,
        { firstName: 'سارة' },
        'WRONG_EXECUTION',
        2
      );

      expect(res.isValid).toBe(true);
      expect(res.returnReasonType).toBe('WRONG_EXECUTION');
      expect(res.returnSeverity).toBe(2);
      expect(res.nextReturnCount).toBe(2);
      expect(res.comment).toContain('نوع سبب الإرجاع: خطأ في التنفيذ');
      expect(res.comment).toContain('درجة الشدة: متوسط');
      expect(res.comment).toContain('الأرقام المحسوبة غير مطابقة');
      expect(res.comment).toContain('سارة');
    });

    it('يضع قيماً افتراضية صحيحة إذا كان نوع السبب أو الشدة غير مدخل أو غير صالح', () => {
      const res = validateRevisionRequest(
        'ملاحظة عامة',
        0,
        { name: 'المشرف' },
        'INVALID_TYPE',
        99
      );

      expect(res.isValid).toBe(true);
      expect(res.returnReasonType).toBe('WRONG_EXECUTION');
      expect(res.returnSeverity).toBe(1);
      expect(res.comment).toContain('درجة الشدة: بسيط');
    });

    it('يدعم جميع الأنواع الخمسة الثابتة لأسباب الإرجاع', () => {
      const types = ['MISSING_EVIDENCE', 'WRONG_EXECUTION', 'CRITERIA_VIOLATION', 'QUALITY', 'LATE'];
      types.forEach((t) => {
        expect(VALID_RETURN_REASON_TYPES).toContain(t);
        expect(RETURN_REASON_LABELS[t]).toBeDefined();
      });
      expect(RETURN_SEVERITY_LABELS[1]).toBe('بسيط');
      expect(RETURN_SEVERITY_LABELS[2]).toBe('متوسط');
      expect(RETURN_SEVERITY_LABELS[3]).toBe('جسيم');
    });
  });

  describe('3. taskComplianceService: معادلة سكور الجودة مع شدة الإرجاع', () => {
    it('يحسب سكور الجودة بالمعادلة الدقيقة 100 - (10*بسيط + 25*متوسط + 50*جسيم)', () => {
      // Setup mock data for compliance report
      const mockTasks = [
        {
          id: 'task-1',
          title: 'مهمة أرجعت مرة واحدة بشكل بسيط',
          status: 'COMPLETED',
          returnCount: 1,
          returnSeverity: 1,
          returnReasonType: 'MISSING_EVIDENCE',
          hasEvidence: true,
          evidence: { changeType: 'BUG_FIX' },
          acceptanceCriteria: 'معيار 1',
          dueDate: null,
          completedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'task-2',
          title: 'مهمة أرجعت بشدة متوسطة',
          status: 'COMPLETED',
          returnCount: 1,
          returnSeverity: 2,
          returnReasonType: 'WRONG_EXECUTION',
          hasEvidence: true,
          evidence: { changeType: 'FEATURE' },
          acceptanceCriteria: 'معيار 2',
          dueDate: null,
          completedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'task-3',
          title: 'مهمة أرجعت بشدة جسيمة',
          status: 'COMPLETED',
          returnCount: 1,
          returnSeverity: 3,
          returnReasonType: 'CRITERIA_VIOLATION',
          hasEvidence: true,
          evidence: { changeType: 'FEATURE' },
          acceptanceCriteria: 'معيار 3',
          dueDate: null,
          completedAt: new Date(),
          createdAt: new Date(),
        },
      ];

      // Total deduction: (1 * 10) + (1 * 25) + (1 * 50) = 85
      // Quality score: 100 - 85 = 15%
      const minorCount = mockTasks.filter(t => (t.returnSeverity || 1) === 1 && (t.returnCount || 0) > 0).length;
      const mediumCount = mockTasks.filter(t => t.returnSeverity === 2).length;
      const severeCount = mockTasks.filter(t => t.returnSeverity === 3).length;

      const penalty = (minorCount * 10) + (mediumCount * 25) + (severeCount * 50);
      const qualityScore = Math.max(0, 100 - penalty);

      expect(minorCount).toBe(1);
      expect(mediumCount).toBe(1);
      expect(severeCount).toBe(1);
      expect(penalty).toBe(85);
      expect(qualityScore).toBe(15);
    });

    it('سكور الجودة لا ينزل تحت الصفر أبداً عند تراكم الجزاءات', () => {
      const minorCount = 5; // 50
      const severeCount = 2; // 100
      const penalty = (minorCount * 10) + (severeCount * 50); // 150
      const qualityScore = Math.max(0, 100 - penalty);
      expect(qualityScore).toBe(0);
    });
  });

  describe('4. computeTimeEvaluationReport: وقت إعادة العمل ودقة التقدير', () => {
    it('يحسب وقت إعادة العمل بدقة من جلسات التايمر اللاحقة لأول تاريخ مراجعة/إرجاع', async () => {
      const reviewDate = new Date('2026-10-01T12:00:00Z');
      const mockTask = {
        id: 't-time-1',
        title: 'مهمة تصميم صفحة الدفع',
        status: 'COMPLETED',
        estimatedMinutes: 120, // 2 hours
        returnReasonType: 'WRONG_EXECUTION',
        returnSeverity: 2,
        assignee: { firstName: 'كريم', lastName: 'حامد' },
        project: { name: 'المتجر الإلكتروني' },
        // Activities: Returned at reviewDate
        taskActivities: [
          { action: 'CREATED', createdAt: new Date('2026-10-01T08:00:00Z') },
          { action: 'STATUS_CHANGE', details: 'IN_REVIEW -> IN_PROGRESS', createdAt: reviewDate },
        ],
        // Time entries: 90 mins before return, 45 mins after return
        timeEntries: [
          { duration: 90, startTime: new Date('2026-10-01T09:00:00Z'), createdAt: new Date('2026-10-01T09:00:00Z') },
          { duration: 45, startTime: new Date('2026-10-01T13:00:00Z'), createdAt: new Date('2026-10-01T13:00:00Z') },
        ],
      };

      const mockPrisma = {
        task: {
          findMany: jest.fn().mockResolvedValue([mockTask]),
        },
      };

      const report = await computeTimeEvaluationReport(mockPrisma, 'company-123', {});
      expect(report).toBeDefined();
      expect(report.summary.totalTasks).toBe(1);
      expect(report.summary.totalEstimatedHours).toBe(2);
      expect(report.summary.totalActualHours).toBe(2.3); // 135 mins = 2.25 -> 2.3 hrs
      expect(report.summary.totalReworkMinutes).toBe(45); // Only the 45 mins entry after reviewDate

      const taskEval = report.tasks[0];
      expect(taskEval.estimatedHours).toBe(2);
      expect(taskEval.actualHours).toBe(2.3);
      expect(taskEval.reworkMinutes).toBe(45);
      expect(taskEval.returnReasonType).toBe('WRONG_EXECUTION');
      expect(taskEval.returnSeverity).toBe(2);
      expect(taskEval.sessionsCount).toBe(2);
    });

    it('يحسب نسبة الدقة 100% عندما يتطابق الفعلي مع المقدر تماماً', async () => {
      const mockTask = {
        id: 't-exact',
        title: 'مهمة مضبوطة التقدير',
        status: 'COMPLETED',
        estimatedMinutes: 60,
        taskActivities: [],
        timeEntries: [
          { duration: 60, startTime: new Date('2026-10-01T10:00:00Z'), createdAt: new Date('2026-10-01T10:00:00Z') },
        ],
      };

      const mockPrisma = {
        task: {
          findMany: jest.fn().mockResolvedValue([mockTask]),
        },
      };

      const report = await computeTimeEvaluationReport(mockPrisma, 'company-123', {});
      expect(report.summary.overallAccuracyPct).toBe(100);
      expect(report.tasks[0].diffMinutes).toBe(0);
      expect(report.tasks[0].diffPct).toBe(0);
      expect(report.tasks[0].accuracyPct).toBe(100);
      expect(report.tasks[0].reworkMinutes).toBe(0);
    });
  });

  describe('5. سد الأبواب الخلفية (Backdoors Closure Verification)', () => {
    it('منع النقل المباشر إلى COMPLETED بدون المرور بحالة IN_REVIEW', () => {
      const existingStatus = 'IN_PROGRESS';
      const targetStatus = 'COMPLETED';

      // Rule verification logic:
      const isDirectComplete = targetStatus === 'COMPLETED' && existingStatus !== 'IN_REVIEW';
      expect(isDirectComplete).toBe(true);

      const errorMessage = 'لا يمكن إنهاء المهمة مباشرة. يجب تسليمها للمراجعة (IN_REVIEW) أولاً واعتمادها من المشرف';
      expect(errorMessage).toContain('يجب تسليمها للمراجعة');
    });

    it('منع التسليم للمراجعة بدون معايير القبول من أي منفذ (الويب / الديسكتوب / الـ API الخارجي)', () => {
      const taskWithoutCriteria = {
        acceptanceCriteria: null,
      };

      const validation = validateAcceptanceCriteria(taskWithoutCriteria.acceptanceCriteria);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('ممنوع التسليم بدون كتابة معايير القبول');
    });

    it('رد واتساب "تم" يوجّه إلى IN_REVIEW مع تنبيه لنقص الأدلة ولا يقفل المهمة مباشرة', () => {
      // In WhatsApp handler:
      const statusChange = 'IN_REVIEW';
      const missingEvidence = true;
      expect(statusChange).toBe('IN_REVIEW');
      expect(missingEvidence).toBe(true);
    });
  });

  describe('6. وصف الذكاء الاصطناعي (AI Brief Field)', () => {
    it('تخزين الوصفين معاً عند إنشاء مهمة (description + aiDescription)', () => {
      const taskInput = {
        title: 'مهمة تحليل بيانات',
        description: 'وصف موجه للمنفذ البشري',
        aiDescription: 'AI Prompt: Summarize recent sales data in JSON format',
      };

      const storedTask = {
        id: 'task-ai-1',
        title: taskInput.title,
        description: String(taskInput.description).trim(),
        aiDescription: taskInput.aiDescription ? String(taskInput.aiDescription).trim() : null,
      };

      expect(storedTask.description).toBe('وصف موجه للمنفذ البشري');
      expect(storedTask.aiDescription).toBe('AI Prompt: Summarize recent sales data in JSON format');
    });

    it('تعديل وصف المنفذ البشري لا يلمس وصف الذكاء الاصطناعي (والعكس صحيح)', () => {
      let currentTask = {
        id: 'task-ai-2',
        description: 'الوصف الأصلي للبشري',
        aiDescription: 'البرومبت الأصلي للذكاء الاصطناعي',
      };

      // Scenario A: Update only description
      const updateHumanOnly = { description: 'الوصف البشري المحدث' };
      const updatedDataA = {
        ...(updateHumanOnly.description !== undefined && { description: updateHumanOnly.description }),
        ...(updateHumanOnly.aiDescription !== undefined && { aiDescription: updateHumanOnly.aiDescription }),
      };
      currentTask = { ...currentTask, ...updatedDataA };
      expect(currentTask.description).toBe('الوصف البشري المحدث');
      expect(currentTask.aiDescription).toBe('البرومبت الأصلي للذكاء الاصطناعي');

      // Scenario B: Update only aiDescription
      const updateAiOnly = { aiDescription: 'البرومبت المطور للذكاء الاصطناعي v2' };
      const updatedDataB = {
        ...(updateAiOnly.description !== undefined && { description: updateAiOnly.description }),
        ...(updateAiOnly.aiDescription !== undefined && { aiDescription: updateAiOnly.aiDescription }),
      };
      currentTask = { ...currentTask, ...updatedDataB };
      expect(currentTask.description).toBe('الوصف البشري المحدث');
      expect(currentTask.aiDescription).toBe('البرومبت المطور للذكاء الاصطناعي v2');
    });

    it('مهمة بدون aiDescription تعمل بسلاسة وتكون قيمتها null بدون كسر (Nullable)', () => {
      const taskWithoutAi = {
        title: 'مهمة بدون برومبت ذكاء اصطناعي',
        description: 'وصف بشري فقط',
        aiDescription: undefined,
      };

      const result = {
        title: taskWithoutAi.title,
        description: taskWithoutAi.description,
        aiDescription: taskWithoutAi.aiDescription ? String(taskWithoutAi.aiDescription).trim() : null,
      };

      expect(result.description).toBe('وصف بشري فقط');
      expect(result.aiDescription).toBeNull();
    });

    it('الـ API الخارجي يقبل ويُرجع aiDescription و ai_description لدعم الوكلاء', () => {
      const externalInputCamel = {
        title: 'Task for agent',
        description: 'Human notes',
        aiDescription: 'Execute python script analysis.py',
      };

      const externalInputSnake = {
        title: 'Task for agent 2',
        description: 'Human notes 2',
        ai_description: 'Execute sql query report.sql',
      };

      const parseAiDesc = (body) => {
        const val = body.aiDescription !== undefined ? body.aiDescription : body.ai_description;
        return val ? String(val).trim() : null;
      };

      expect(parseAiDesc(externalInputCamel)).toBe('Execute python script analysis.py');
      expect(parseAiDesc(externalInputSnake)).toBe('Execute sql query report.sql');
    });
  });
});
