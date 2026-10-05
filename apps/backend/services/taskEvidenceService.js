/**
 * taskEvidenceService.js
 * 
 * Core engine for Task Delivery Gate, Mandatory 4-Question Verification Template,
 * Approval Gate, Agent Output Validation, and Revision Auditing.
 */

const BANNED_AGENT_TEST_OUTPUTS = new Set([
  'تمت',
  'تمّت',
  'تم',
  'done',
  'ok',
  'finished',
  'completed',
  'pass',
  'passed',
  'نجحت'
]);

/**
 * Validates the delivery evidence payload against the Delivery Gate rules.
 * 
 * @param {Object} evidenceData - Raw evidence object or fields
 * @param {Array} existingAttachments - List of attachments on the task
 * @returns {{ isValid: boolean, missingFields: string[], errorSummary: string, sanitizedEvidence: Object|null }}
 */
function validateDeliveryEvidence(evidenceData = {}, existingAttachments = []) {
  const missingFields = [];
  const raw = evidenceData || {};

  // Normalize fields from nested evidence object or flat payload
  const nested = (raw.evidence && typeof raw.evidence === 'object') ? raw.evidence : {};
  
  const changeType = String(raw.changeType || nested.changeType || '').trim();
  const commitOrPath = String(raw.commitOrPath || nested.commitOrPath || raw.gitCommit || nested.gitCommit || '').trim();
  const numbersBeforeAfter = String(raw.numbersBeforeAfter || nested.numbersBeforeAfter || '').trim();
  const notTestedScope = String(raw.notTestedScope || nested.notTestedScope || '').trim();
  
  // Proof attachment check
  const proofAttachmentId = raw.proofAttachmentId || nested.proofAttachmentId || raw.attachmentId || nested.attachmentId;
  const proofAttachmentUrl = raw.proofAttachmentUrl || nested.proofAttachmentUrl || raw.attachmentUrl || nested.attachmentUrl;
  const hasProofAttachment = Boolean(proofAttachmentId || proofAttachmentUrl || (Array.isArray(existingAttachments) && existingAttachments.length > 0));

  // 1. Question 1: نوع التغيير
  if (!changeType) {
    missingFields.push('نوع التغيير (Change Type)');
  }

  // 2. Question 2: كوميت / مسار
  if (!commitOrPath) {
    missingFields.push('الكوميت / مسار التعديل (Commit / File Path)');
  }

  // 3. Question 3: الأرقام قبل / بعد
  if (!numbersBeforeAfter) {
    missingFields.push('الأرقام قبل / بعد (Numbers Before & After)');
  }

  // 4. Question 4: «إيه اللي ما اختبرتهوش»
  if (!notTestedScope) {
    missingFields.push('«إيه اللي ما اختبرتهوش» (What wasn\'t tested / Limitations)');
  }

  // 5. Proof Attachment
  if (!hasProofAttachment) {
    missingFields.push('إثبات تشغيل مرفق (Attached Proof of Run)');
  }

  // 6. Agent output verification
  const rawAgentInfo = raw.agentInfo || nested.agentInfo || {};
  const isAgent = Boolean(raw.isAgent || nested.isAgent || rawAgentInfo.isAgent || raw.agentName || nested.agentName || rawAgentInfo.agentName);

  let sanitizedAgentInfo = null;

  if (isAgent) {
    const agentName = String(rawAgentInfo.agentName || raw.agentName || nested.agentName || '').trim();
    const commitOrRunId = String(rawAgentInfo.commitOrRunId || rawAgentInfo.runId || raw.agentRunId || nested.agentRunId || '').trim();
    const testOutput = String(rawAgentInfo.testOutput || raw.agentTestOutput || nested.agentTestOutput || '').trim();

    if (!agentName) {
      missingFields.push('اسم الوكيل (Agent Name)');
    }
    if (!commitOrRunId) {
      missingFields.push('معرّف التشغيل أو الكوميت للوكيل (Agent Run ID / Commit)');
    }
    if (!testOutput) {
      missingFields.push('ناتج الاختبارات للوكيل (Agent Test Output)');
    } else {
      const normalizedOutput = testOutput.toLowerCase().replace(/[\s\.\!؟_،-]/g, '');
      if (BANNED_AGENT_TEST_OUTPUTS.has(normalizedOutput) || testOutput.length < 10) {
        missingFields.push('ناتج اختبارات حقيقي للوكيل («تمّت» وحدها ليست دليلاً معتمداً)');
      }
    }

    sanitizedAgentInfo = {
      isAgent: true,
      agentName,
      commitOrRunId,
      testOutput
    };
  }

  if (missingFields.length > 0) {
    const errorSummary = `بوابة التسليم: لا يمكن تسليم المهمة للمراجعة قبل اكتمال الدليل. الحقول الناقصة: ${missingFields.join(' · ')}`;
    return {
      isValid: false,
      missingFields,
      errorSummary,
      sanitizedEvidence: null
    };
  }

  const sanitizedEvidence = {
    changeType,
    commitOrPath,
    numbersBeforeAfter,
    notTestedScope,
    proofAttachmentId: proofAttachmentId || (existingAttachments[0] ? existingAttachments[0].id : null),
    proofAttachmentUrl: proofAttachmentUrl || (existingAttachments[0] ? existingAttachments[0].filePath : null),
    proofAttachmentName: existingAttachments[0] ? (existingAttachments[0].originalName || existingAttachments[0].fileName) : 'مرفق تشغيلي',
    agentInfo: sanitizedAgentInfo,
    submittedAt: new Date().toISOString()
  };

  return {
    isValid: true,
    missingFields: [],
    errorSummary: '',
    sanitizedEvidence
  };
}

/**
 * Formats the 4-question template as an automated delivery comment for TaskComment.
 * 
 * @param {Object} evidence - Sanitized evidence object
 * @param {Object} user - User submitting the task
 * @returns {string} Markdown formatted comment
 */
function generateDeliveryComment(evidence = {}, user = {}) {
  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'المنفّذ' : 'المنفّذ';
  
  let agentSection = '';
  if (evidence.agentInfo && evidence.agentInfo.isAgent) {
    agentSection = `\n- 🤖 **دليل مخرج الوكيل:** ${evidence.agentInfo.agentName} (Run/Commit: \`${evidence.agentInfo.commitOrRunId}\`)\n  \`\`\`text\n  ${evidence.agentInfo.testOutput}\n  \`\`\``;
  }

  const attachmentNote = evidence.proofAttachmentName ? `\`${evidence.proofAttachmentName}\`` : 'مرفق تشغيلي مسجّل في الملفات';

  return `📋 **توثيق تسليم المهمة للمراجعة والاعتماد (Delivery Gate)**
تم التسليم بواسطة: **${userName}** بتاريخ ${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}

1. **نوع التغيير:** ${evidence.changeType}
2. **الكوميت / مسار التعديل:** \`${evidence.commitOrPath}\`
3. **الأرقام قبل / بعد:** ${evidence.numbersBeforeAfter}
4. **«إيه اللي ما اختبرتهوش»:** ${evidence.notTestedScope}
- 📎 **إثبات التشغيل المرفق:** ${attachmentNote}${agentSection}`;
}

/**
 * Validates the Approval Gate when an approver attempts to transition task to COMPLETED.
 * 
 * @param {Object} task - Existing task object
 * @param {Object} user - Approver user object
 * @param {Object} options - { criteriaChecked, ownerOverride, ownerOverrideReason, checklistState }
 * @returns {{ isValid: boolean, error?: string, isOverride: boolean }}
 */
function validateApprovalGate(task = {}, user = {}, options = {}) {
  const userRole = String(user.role || '').toUpperCase();
  const isOwnerOrSuper = ['OWNER', 'SUPER_ADMIN', 'COMPANY_ADMIN'].includes(userRole);
  const { ownerOverride = false, ownerOverrideReason = '', criteriaChecked = false, checklistState = [] } = options;

  // If Owner Override is explicitly used
  if (ownerOverride) {
    if (!isOwnerOrSuper) {
      return {
        isValid: false,
        error: 'صلاحية تجاوز بوابة الاعتماد (Owner Override) مقتصرة حصرياً على مالك المنصة أو مدير الشركة (OWNER / COMPANY_ADMIN)',
        isOverride: false
      };
    }
    const reason = String(ownerOverrideReason || '').trim();
    if (!reason || reason.length < 5) {
      return {
        isValid: false,
        error: 'يجب كتابة سبب واضح وموثّق لتجاوز الاعتماد الاستثنائي (Owner Override Reason)',
        isOverride: false
      };
    }
    return {
      isValid: true,
      isOverride: true
    };
  }

  // 1. Evidence must be verified (hasEvidence === true)
  if (!task.hasEvidence && !task.evidence) {
    return {
      isValid: false,
      error: 'بوابة الاعتماد: لا يمكن اعتماد المهمة بدون دليل تسليم معتمد (hasEvidence=true)',
      isOverride: false
    };
  }

  // 2. Acceptance criteria checkboxes must all be satisfied
  const acceptanceCriteriaStr = String(task.acceptanceCriteria || '').trim();
  
  if (acceptanceCriteriaStr) {
    // If criteria are defined, they must be checked
    if (!criteriaChecked && (!Array.isArray(checklistState) || checklistState.length === 0 || checklistState.some(c => !c.checked))) {
      return {
        isValid: false,
        error: 'بوابة الاعتماد: يجب التأشير على جميع معايير القبول والتحقق منها قبل الاعتماد',
        isOverride: false
      };
    }
  }

  return {
    isValid: true,
    isOverride: false
  };
}

const VALID_RETURN_REASON_TYPES = [
  'MISSING_EVIDENCE',
  'WRONG_EXECUTION',
  'CRITERIA_VIOLATION',
  'QUALITY',
  'LATE'
];

const RETURN_REASON_LABELS = {
  MISSING_EVIDENCE: 'نقص أدلة التسليم أو عدم كفايتها',
  WRONG_EXECUTION: 'خطأ في التنفيذ أو عدم مطابقة المطلوب',
  CRITERIA_VIOLATION: 'مخالفة معايير القبول المحددة',
  QUALITY: 'جودة ضعيفة أو غير مقبولة',
  LATE: 'تأخر في التسليم عن الموعد'
};

const RETURN_SEVERITY_LABELS = {
  1: 'بسيط',
  2: 'متوسط',
  3: 'جسيم'
};

/**
 * Validates that a task has at least one valid acceptance criteria item before submission for review.
 * 
 * @param {string|null|undefined} acceptanceCriteria - Raw criteria string
 * @returns {{ isValid: boolean, error?: string, count: number }}
 */
function validateAcceptanceCriteria(acceptanceCriteria) {
  let raw = '';
  if (Array.isArray(acceptanceCriteria)) {
    raw = acceptanceCriteria.map(s => String(s || '').trim()).filter(Boolean).join('\n');
  } else {
    raw = String(acceptanceCriteria || '').trim();
  }
  if (!raw) {
    return {
      isValid: false,
      error: 'ممنوع التسليم بدون كتابة معايير القبول',
      count: 0
    };
  }

  const lines = raw
    .split('\n')
    .map(line => line.replace(/^[-*•✓☐☑\d\.\s]+/, '').trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      isValid: false,
      error: 'ممنوع التسليم بدون كتابة معايير القبول',
      count: 0
    };
  }

  return {
    isValid: true,
    count: lines.length,
    criteriaList: lines,
    formattedText: lines.join('\n')
  };
}

/**
 * Validates Return for Revision and formats the revision comment.
 * 
 * @param {string} reason - Revision reason
 * @param {number} currentReturnCount - Current return count on task
 * @param {Object} user - Reviewer user
 * @param {Object|string} [options] - Optional { returnReasonType, returnSeverity } or returnReasonType string
 * @param {number} [paramSeverity] - Optional severity if passed positionally
 * @returns {{ isValid: boolean, error?: string, nextReturnCount: number, comment: string, returnReasonType: string|null, returnSeverity: number|null }}
 */
function validateRevisionRequest(reason = '', currentReturnCount = 0, user = {}, options = {}, paramSeverity = undefined) {
  const trimmed = String(reason || '').trim();
  if (!trimmed || trimmed.length < 3) {
    return {
      isValid: false,
      error: 'سبب الإرجاع للتعديل إلزامي ويجب أن يوضح الملاحظات بدقة للمنفّذ',
      nextReturnCount: currentReturnCount,
      comment: '',
      returnReasonType: null,
      returnSeverity: null
    };
  }

  const isObjectOptions = typeof options === 'object' && options !== null && !Array.isArray(options);
  const rawType = isObjectOptions ? options.returnReasonType : options;
  const rawSev = isObjectOptions ? options.returnSeverity : paramSeverity;

  let sanitizedType = 'WRONG_EXECUTION';
  if (rawType) {
    const normType = String(rawType).trim().toUpperCase();
    if (VALID_RETURN_REASON_TYPES.includes(normType)) {
      sanitizedType = normType;
    }
  }

  let sanitizedSeverity = 1;
  if (rawSev !== undefined && rawSev !== null) {
    const parsedSev = parseInt(rawSev, 10);
    if ([1, 2, 3].includes(parsedSev)) {
      sanitizedSeverity = parsedSev;
    }
  }

  const nextReturnCount = Number(currentReturnCount || 0) + 1;
  const reviewerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'المراجع' : 'المراجع';

  let metaLines = '';
  if (sanitizedType) {
    metaLines += `\n- نوع سبب الإرجاع: ${RETURN_REASON_LABELS[sanitizedType] || sanitizedType}`;
  }
  if (sanitizedSeverity) {
    metaLines += `\n- درجة الشدة: ${RETURN_SEVERITY_LABELS[sanitizedSeverity] || sanitizedSeverity}`;
  }

  const comment = `↩️ **إعادة المهمة للتعديل (المرة رقم ${nextReturnCount})**
بواسطة: **${reviewerName}** بتاريخ ${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}${metaLines}

- **سبب الإرجاع والملاحظات:**
${trimmed}

يرجى استيفاء التعديلات المطلوبة وإعادة تقديم دليل التسليم عبر بوابة التسليم.`;

  return {
    isValid: true,
    nextReturnCount,
    comment,
    returnReasonType: sanitizedType,
    returnSeverity: sanitizedSeverity
  };
}

module.exports = {
  VALID_RETURN_REASON_TYPES,
  RETURN_REASON_LABELS,
  RETURN_SEVERITY_LABELS,
  validateAcceptanceCriteria,
  validateDeliveryEvidence,
  generateDeliveryComment,
  validateApprovalGate,
  validateRevisionRequest
};
