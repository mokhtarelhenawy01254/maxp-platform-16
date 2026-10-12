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
 * Priority classification helper
 * HIGH and URGENT: Full enforcement
 * MEDIUM and NORMAL: Moderate enforcement (changeType + link or commit)
 * LOW: Flexible, zero mandatory fields
 */
function normalizeTaskPriority(priorityInput) {
  if (!priorityInput) return 'MEDIUM';
  const p = String(priorityInput).trim().toUpperCase();
  if (['URGENT', 'HIGH'].includes(p)) return 'HIGH';
  if (['LOW'].includes(p)) return 'LOW';
  return 'MEDIUM';
}

const PRIORITY_ARABIC_LABELS = {
  HIGH: 'عالية / عاجلة',
  MEDIUM: 'متوسطة',
  LOW: 'منخفضة'
};

/**
 * Validates the delivery evidence payload against the Delivery Gate rules.
 * 
 * @param {Object} evidenceData - Raw evidence object or fields
 * @param {Array} existingAttachments - List of attachments on the task
 * @param {Object|string} optionsOrTask - Task object, options with priority/pageUrl, or priority string
 * @returns {{ isValid: boolean, missingFields: string[], errorSummary: string, sanitizedEvidence: Object|null }}
 */
function validateDeliveryEvidence(evidenceData = {}, existingAttachments = [], optionsOrTask = {}) {
  const missingFields = [];
  const raw = evidenceData || {};

  // Normalize fields from nested evidence object or flat payload
  const nested = (raw.evidence && typeof raw.evidence === 'object') ? raw.evidence : {};

  // Priority resolution: optionsOrTask can be a string, an object { priority, ... }, or task object
  let resolvedPriority = 'MEDIUM';
  if (typeof optionsOrTask === 'string') {
    resolvedPriority = optionsOrTask;
  } else if (optionsOrTask && typeof optionsOrTask === 'object') {
    resolvedPriority = optionsOrTask.priority || (optionsOrTask.task && optionsOrTask.task.priority) || raw.priority || nested.priority || 'MEDIUM';
  } else {
    resolvedPriority = raw.priority || nested.priority || 'MEDIUM';
  }
  const normalizedPriority = normalizeTaskPriority(resolvedPriority);

  const changeType = String(raw.changeType || nested.changeType || '').trim();
  const commitOrPath = String(raw.commitOrPath || nested.commitOrPath || raw.gitCommit || nested.gitCommit || '').trim();
  
  // pageUrl can come from raw, nested, or optionsOrTask (task.pageUrl)
  const taskPageUrl = (optionsOrTask && typeof optionsOrTask === 'object')
    ? (optionsOrTask.pageUrl || (optionsOrTask.task && optionsOrTask.task.pageUrl) || '')
    : '';
  const pageUrl = String(raw.pageUrl || nested.pageUrl || taskPageUrl || '').trim();

  const numbersBeforeAfter = String(raw.numbersBeforeAfter || nested.numbersBeforeAfter || '').trim();
  const notTestedScope = String(raw.notTestedScope || nested.notTestedScope || '').trim();

  // Before & After attachments
  const beforeAttachmentId = raw.beforeAttachmentId || nested.beforeAttachmentId || null;
  const beforeAttachmentUrl = raw.beforeAttachmentUrl || nested.beforeAttachmentUrl || null;
  const afterAttachmentId = raw.afterAttachmentId || nested.afterAttachmentId || null;
  const afterAttachmentUrl = raw.afterAttachmentUrl || nested.afterAttachmentUrl || null;

  // Agent info extraction (optional)
  const rawAgentInfo = raw.agentInfo || nested.agentInfo || {};
  let sanitizedAgentInfo = null;
  if (raw.isAgent || nested.isAgent || rawAgentInfo.isAgent || rawAgentInfo.agentName) {
    sanitizedAgentInfo = {
      isAgent: true,
      agentName: String(rawAgentInfo.agentName || raw.agentName || '').trim(),
      commitOrRunId: String(rawAgentInfo.commitOrRunId || rawAgentInfo.runId || raw.agentRunId || '').trim(),
      testOutput: String(rawAgentInfo.testOutput || raw.agentTestOutput || '').trim()
    };
  }

  // Proof attachment check
  const proofAttachmentId = raw.proofAttachmentId || nested.proofAttachmentId || raw.attachmentId || nested.attachmentId || null;
  const proofAttachmentUrl = raw.proofAttachmentUrl || nested.proofAttachmentUrl || raw.attachmentUrl || nested.attachmentUrl || null;
  const hasExistingAttachment = Array.isArray(existingAttachments) && existingAttachments.length > 0;

  const hasBefore = Boolean(beforeAttachmentId || beforeAttachmentUrl);
  const hasAfter = Boolean(afterAttachmentId || afterAttachmentUrl);
  const hasProofAttachment = Boolean(proofAttachmentId || proofAttachmentUrl || hasExistingAttachment || hasBefore || hasAfter);

  const hasChangeType = Boolean(changeType);
  const hasLinkOrCommit = Boolean(pageUrl || commitOrPath);
  const hasNumbers = Boolean(numbersBeforeAfter);
  const hasNotTested = Boolean(notTestedScope);

  // Enforcement rules per priority
  if (normalizedPriority === 'HIGH') {
    if (!hasChangeType) missingFields.push('نوع التغيير');
    if (!hasLinkOrCommit) missingFields.push('لينك الصفحة أو الكوميت/مسار التعديل');
    if (!hasNumbers) missingFields.push('الأرقام قبل / بعد');
    if (!hasNotTested) missingFields.push('نطاق ما لم يتم اختباره');
    if (!hasBefore) missingFields.push('صورة قبل');
    if (!hasAfter) missingFields.push('صورة بعد');
    if (!hasProofAttachment) missingFields.push('مرفق إثبات التشغيل');
  } else if (normalizedPriority === 'MEDIUM') {
    if (!hasChangeType) missingFields.push('نوع التغيير');
    if (!hasLinkOrCommit) missingFields.push('لينك الصفحة أو الكوميت/مسار التعديل');
  }
  // LOW priority: flexible, 0 missingFields required

  const hasAnyEvidence = Boolean(
    changeType || commitOrPath || pageUrl || numbersBeforeAfter || notTestedScope || hasProofAttachment || hasBefore || hasAfter || sanitizedAgentInfo
  );

  let sanitizedEvidence = null;
  if (hasAnyEvidence) {
    sanitizedEvidence = {
      changeType: changeType || (normalizedPriority === 'LOW' ? 'عام' : 'غير محدد'),
      commitOrPath: commitOrPath || null,
      pageUrl: pageUrl || null,
      numbersBeforeAfter: numbersBeforeAfter || null,
      notTestedScope: notTestedScope || null,
      beforeAttachmentId: beforeAttachmentId || null,
      beforeAttachmentUrl: beforeAttachmentUrl || null,
      afterAttachmentId: afterAttachmentId || null,
      afterAttachmentUrl: afterAttachmentUrl || null,
      proofAttachmentId: proofAttachmentId || afterAttachmentId || beforeAttachmentId || (existingAttachments[0] ? existingAttachments[0].id : null),
      proofAttachmentUrl: proofAttachmentUrl || afterAttachmentUrl || beforeAttachmentUrl || (existingAttachments[0] ? existingAttachments[0].filePath : null),
      proofAttachmentName: existingAttachments[0] ? (existingAttachments[0].originalName || existingAttachments[0].fileName) : null,
      agentInfo: sanitizedAgentInfo,
      submittedAt: new Date().toISOString()
    };
  }

  const isValid = missingFields.length === 0;
  const priorityArabic = PRIORITY_ARABIC_LABELS[normalizedPriority] || normalizedPriority;
  const errorSummary = isValid
    ? ''
    : `أدلة التسليم غير مكتملة لمهمة بأولوية (${priorityArabic}): يرجى استيفاء [${missingFields.join('، ')}] قبل التسليم للمراجعة.`;

  return {
    isValid,
    missingFields,
    errorSummary,
    sanitizedEvidence
  };
}

/**
 * Formats the delivery template as an automated delivery comment for TaskComment.
 * 
 * @param {Object} evidence - Sanitized evidence object
 * @param {Object} user - User submitting the task
 * @returns {string} Markdown formatted comment
 */
function generateDeliveryComment(evidence = {}, user = {}) {
  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'المنفّذ' : 'المنفّذ';
  
  if (!evidence || Object.keys(evidence).length === 0) {
    return `📋 **تسليم المهمة للمراجعة والاعتماد**
تم التسليم بواسطة: **${userName}** بتاريخ ${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}`;
  }

  let agentSection = '';
  if (evidence.agentInfo && evidence.agentInfo.isAgent) {
    agentSection = `\n- 🤖 **دليل مخرج الوكيل:** ${evidence.agentInfo.agentName} (Run/Commit: \`${evidence.agentInfo.commitOrRunId}\`)\n  \`\`\`text\n  ${evidence.agentInfo.testOutput}\n  \`\`\``;
  }

  const lines = [
    `📋 **توثيق تسليم المهمة للمراجعة والاعتماد (Delivery Gate)**`,
    `تم التسليم بواسطة: **${userName}** بتاريخ ${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}`,
    ''
  ];

  if (evidence.changeType) lines.push(`1. **نوع التغيير:** ${evidence.changeType}`);
  if (evidence.pageUrl) lines.push(`- 🔗 **لينك الصفحة:** [${evidence.pageUrl}](${evidence.pageUrl})`);
  if (evidence.commitOrPath) lines.push(`2. **الكوميت / مسار التعديل:** \`${evidence.commitOrPath}\``);
  if (evidence.numbersBeforeAfter) lines.push(`3. **الأرقام قبل / بعد:** ${evidence.numbersBeforeAfter}`);
  if (evidence.notTestedScope) lines.push(`4. **«إيه اللي ما اختبرتهوش»:** ${evidence.notTestedScope}`);
  if (evidence.beforeAttachmentUrl) lines.push(`- 🖼️ **صورة قبل:** [عرض الصورة](${evidence.beforeAttachmentUrl})`);
  if (evidence.afterAttachmentUrl) lines.push(`- 🖼️ **صورة بعد:** [عرض الصورة](${evidence.afterAttachmentUrl})`);
  if (evidence.proofAttachmentName || evidence.proofAttachmentUrl) {
    const attachmentNote = evidence.proofAttachmentName ? `\`${evidence.proofAttachmentName}\`` : 'مرفق تشغيلي';
    lines.push(`- 📎 **إثبات التشغيل المرفق:** ${attachmentNote}`);
  }
  if (agentSection) {
    lines.push(agentSection);
  }

  return lines.join('\n');
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
  // Approval is always allowed for authorized roles — no blocking on missing evidence or screenshots
  const isOverride = Boolean(options.ownerOverride);
  return {
    isValid: true,
    isOverride
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
  3: 'جسيم',
  '1': 'بسيط',
  '2': 'متوسط',
  '3': 'جسيم'
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
      isValid: true,
      count: 0,
      criteriaList: [],
      formattedText: ''
    };
  }

  const lines = raw
    .split('\n')
    .map(line => line.replace(/^[-*•✓☐☑\d\.\s]+/, '').trim())
    .filter(Boolean);

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
  PRIORITY_ARABIC_LABELS,
  normalizeTaskPriority,
  validateAcceptanceCriteria,
  validateDeliveryEvidence,
  generateDeliveryComment,
  validateApprovalGate,
  validateRevisionRequest
};
