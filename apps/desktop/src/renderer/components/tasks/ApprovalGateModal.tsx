import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  RotateCcw,
  Shield,
  ShieldAlert,
  FileCheck2,
  Paperclip,
  Cpu,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

interface ApprovalGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
  isAdminOrManager?: boolean;
  onApprove: (options: {
    ownerOverride?: boolean;
    ownerOverrideReason?: string;
    criteriaChecked?: boolean;
  }) => Promise<void>;
  onReturn: (reason: string) => Promise<void>;
  isSubmitting?: boolean;
}

export const ApprovalGateModal: React.FC<ApprovalGateModalProps> = ({
  isOpen,
  onClose,
  task,
  isAdminOrManager = false,
  onApprove,
  onReturn,
  isSubmitting = false,
}) => {
  if (!isOpen || !task) return null;

  const initialChecklist = useMemo(() => {
    const raw = String(task.acceptanceCriteria || '').trim();
    if (!raw) {
      return [
        {
          id: 0,
          text: 'التحقق من إنجاز متطلبات المهمة بالكامل وعملها بدون أخطاء',
          checked: false,
        },
      ];
    }
    return raw
      .split('\n')
      .map((line) => line.replace(/^[-*•\d\.\s]+/, '').trim())
      .filter(Boolean)
      .map((text, idx) => ({ id: idx, text, checked: false }));
  }, [task.acceptanceCriteria]);

  const evidenceObj = useMemo(() => {
    if (!task.evidence) return null;
    if (typeof task.evidence === 'object') return task.evidence;
    try {
      return JSON.parse(task.evidence);
    } catch {
      return null;
    }
  }, [task.evidence]);

  const hasValidEvidence = Boolean(
    (task.hasEvidence && !task.missingEvidence) || evidenceObj
  );

  const [checklist, setChecklist] = useState(initialChecklist);
  const [returnMode, setReturnMode] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [useOwnerOverride, setUseOwnerOverride] = useState(false);
  const [ownerOverrideReason, setOwnerOverrideReason] = useState('');

  const allCriteriaChecked =
    checklist.length > 0 && checklist.every((item) => item.checked);

  // Approval is never blocked on missing evidence or unchecked criteria
  const canApprove = !isSubmitting;

  const toggleCheck = (idx: number) => {
    setChecklist((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, checked: !c.checked } : c))
    );
  };

  const handleApproveSubmit = async () => {
    if (!canApprove || isSubmitting) return;
    await onApprove({
      criteriaChecked: allCriteriaChecked,
      ownerOverride: useOwnerOverride,
      ownerOverrideReason: useOwnerOverride
        ? ownerOverrideReason.trim() || 'اعتماد إداري مباشر'
        : undefined,
    });
  };

  const handleReturnSubmit = async () => {
    if (!returnReason.trim() || isSubmitting) return;
    await onReturn(returnReason.trim());
  };

  return (
    <div style={styles.overlay} onClick={onClose} dir="rtl">
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitleWrap}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Shield size={18} color="#10b981" />
              <h2 style={styles.title}>بوابة الاعتماد والتحقق (Approval Gate)</h2>
            </div>
            <p style={styles.subtitle}>{task.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={styles.closeBtn}
            title="إغلاق"
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body: Two Columns */}
        <div style={styles.body}>
          {/* Column 1: Acceptance Criteria & Admin Override */}
          <div style={styles.col}>
            <div style={styles.sectionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileCheck2 size={15} color="var(--accent-blue, #3b82f6)" />
                <span style={styles.sectionTitle}>معايير القبول (مطلوب التأشير عليها)</span>
              </div>
              <span
                style={{
                  ...styles.counterBadge,
                  backgroundColor: allCriteriaChecked
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(245, 158, 11, 0.15)',
                  color: allCriteriaChecked ? '#10b981' : '#f59e0b',
                }}
              >
                {checklist.filter((c) => c.checked).length} / {checklist.length}
              </span>
            </div>

            <div style={styles.checklistWrap}>
              {checklist.map((item, idx) => (
                <label
                  key={idx}
                  onClick={() => toggleCheck(idx)}
                  style={{
                    ...styles.checkItem,
                    borderColor: item.checked
                      ? 'rgba(16, 185, 129, 0.4)'
                      : 'rgba(255, 255, 255, 0.08)',
                    backgroundColor: item.checked
                      ? 'rgba(16, 185, 129, 0.08)'
                      : 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => {}}
                    style={styles.checkbox}
                  />
                  <span
                    style={{
                      ...styles.checkText,
                      color: item.checked
                        ? '#ffffff'
                        : 'var(--text-secondary, #cbd5e1)',
                    }}
                  >
                    {item.text}
                  </span>
                </label>
              ))}
            </div>

            {/* Return History Alert */}
            {Number(task.returnCount || 0) > 0 && (
              <div style={styles.returnNotice}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#f59e0b', fontWeight: 600 }}>
                  <RotateCcw size={12} />
                  <span>أعيدت للتعديل سابقاً {task.returnCount} مرات</span>
                </div>
                {task.lastReturnReason && (
                  <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>
                    «{task.lastReturnReason}»
                  </p>
                )}
              </div>
            )}

            {/* Admin / Owner Override */}
            {isAdminOrManager && (
              <div style={styles.overrideSection}>
                <label style={styles.overrideLabel}>
                  <input
                    type="checkbox"
                    checked={useOwnerOverride}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setUseOwnerOverride(val);
                      if (val && !ownerOverrideReason) {
                        setOwnerOverrideReason('اعتماد إداري مباشر للمهام السابقة');
                      }
                    }}
                    style={styles.checkbox}
                  />
                  <ShieldAlert size={15} color="#f43f5e" />
                  <span style={{ fontWeight: 600, color: '#f43f5e' }}>
                    اعتماد استثنائي للإدارة (Owner / Admin Override)
                  </span>
                </label>
                {useOwnerOverride && (
                  <div style={styles.overrideInputWrap}>
                    <input
                      type="text"
                      value={ownerOverrideReason}
                      onChange={(e) => setOwnerOverrideReason(e.target.value)}
                      placeholder="سبب التجاوز الاستثنائي (يسجل في سجل الاعتماد)..."
                      style={styles.overrideInput}
                    />
                    <span style={styles.overrideHint}>
                      يسمح باعتماد المهمة مباشرة حتى لو لم يكن لها دليل تسليم رقمي سابق.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Column 2: Evidence Dossier */}
          <div style={styles.colSecondary}>
            <div style={styles.sectionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Paperclip size={14} color="var(--text-muted, #94a3b8)" />
                <span style={styles.sectionTitle}>ملف دليل التسليم (Delivery Evidence)</span>
              </div>
              {hasValidEvidence ? (
                <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={12} />
                  مرفق دليل
                </span>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                  اختياري (لم يرفق دليل)
                </span>
              )}
            </div>

            {evidenceObj ? (
              <div style={styles.evidenceDataWrap}>
                {evidenceObj.changeType && (
                  <div style={styles.evidenceField}>
                    <span style={styles.fieldLabel}>نوع التغيير:</span>
                    <span style={styles.fieldChip}>{evidenceObj.changeType}</span>
                  </div>
                )}

                {evidenceObj.commitOrPath && (
                  <div style={styles.evidenceField}>
                    <span style={styles.fieldLabel}>الكوميت / مسار الملفات:</span>
                    <code style={styles.fieldCode}>{evidenceObj.commitOrPath}</code>
                  </div>
                )}

                {evidenceObj.numbersBeforeAfter && (
                  <div style={styles.evidenceField}>
                    <span style={styles.fieldLabel}>الأرقام قبل / بعد:</span>
                    <span style={styles.fieldVal}>{evidenceObj.numbersBeforeAfter}</span>
                  </div>
                )}

                {evidenceObj.notTestedScope && (
                  <div style={styles.evidenceField}>
                    <span style={styles.fieldLabel}>ما لم يتم اختباره:</span>
                    <span style={{ ...styles.fieldVal, color: '#f59e0b' }}>{evidenceObj.notTestedScope}</span>
                  </div>
                )}

                {evidenceObj.agentInfo?.isAgent && (
                  <div style={styles.agentBox}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#818cf8', fontWeight: 600 }}>
                      <Cpu size={13} />
                      <span>وكيل الذكاء: {evidenceObj.agentInfo.agentName}</span>
                    </div>
                    <pre style={styles.agentPre}>{evidenceObj.agentInfo.testOutput}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div style={styles.noEvidenceBox}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', fontSize: 12 }}>
                  لم يتم إرفاق ملف دليل تسليم (اختياري)
                </span>
                <p style={{ margin: '6px 0 0', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.5, fontSize: 11 }}>
                  يمكنك مراجعة متطلبات المهمة واعتماد إنجازها مباشرة بدون أي عوائق.
                </p>
              </div>
            )}

            {/* Proof Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', display: 'block', marginBottom: 5 }}>
                  المرفقات التشغيلية:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {task.attachments.map((att: any) => (
                    <a
                      key={att.id}
                      href={att.filePath || '#'}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.attachmentLink}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {att.originalName || att.fileName}
                      </span>
                      <ExternalLink size={12} style={{ flexShrink: 0 }} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Return Drawer */}
        {returnMode && (
          <div style={styles.returnDrawer}>
            <label style={styles.returnLabel}>
              سبب الإرجاع للتعديل والملاحظات المطلوبة <span style={{ color: '#f43f5e' }}>* (إلزامي)</span>
            </label>
            <textarea
              rows={2}
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="اكتب بوضوح ما هو الناقص وما المطلوب من المنفذ تعديله أو إرفاقه قبل إعادة التسليم..."
              style={styles.returnTextarea}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setReturnMode(false)}
                style={styles.cancelBtn}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleReturnSubmit}
                disabled={!returnReason.trim() || isSubmitting}
                style={{
                  ...styles.confirmReturnBtn,
                  opacity: !returnReason.trim() || isSubmitting ? 0.5 : 1,
                }}
              >
                تأكيد الإرجاع للمنفذ
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={styles.closeFooterBtn}
          >
            إغلاق
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!returnMode && (
              <button
                type="button"
                onClick={() => setReturnMode(true)}
                disabled={isSubmitting}
                style={styles.returnBtn}
              >
                <RotateCcw size={13} />
                <span>طلب تعديلات وإرجاع</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleApproveSubmit}
              disabled={isSubmitting}
              title="اعتماد وإنجاز المهمة"
              style={{
                ...styles.approveBtn,
                opacity: isSubmitting ? 0.6 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              <CheckCircle2 size={14} />
              <span>
                {useOwnerOverride ? 'اعتماد بتجاوز الإدارة (Override)' : 'اعتماد وإنجاز المهمة'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '90vh',
    backgroundColor: 'var(--bg-secondary, #121214)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 18px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  headerTitleWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: '#ffffff',
    margin: 0,
  },
  subtitle: {
    fontSize: 12,
    color: 'var(--text-muted, #94a3b8)',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 580,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted, #94a3b8)',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: 16,
    padding: 16,
  },
  col: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  colSecondary: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 12,
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
  },
  counterBadge: {
    fontSize: 10.5,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 10,
  },
  checklistWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  checkItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 120ms ease',
  },
  checkbox: {
    marginTop: 2,
    accentColor: '#10b981',
    cursor: 'pointer',
    width: 14,
    height: 14,
  },
  checkText: {
    fontSize: 11.5,
    lineHeight: 1.45,
    wordBreak: 'break-word',
  },
  returnNotice: {
    padding: '8px 10px',
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    fontSize: 11,
  },
  overrideSection: {
    marginTop: 6,
    paddingTop: 10,
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  overrideLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11.5,
    cursor: 'pointer',
  },
  overrideInputWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    paddingRight: 20,
  },
  overrideInput: {
    width: '100%',
    height: 28,
    padding: '0 8px',
    borderRadius: 5,
    fontSize: 11,
    border: '1px solid rgba(244, 63, 94, 0.4)',
    backgroundColor: 'rgba(244, 63, 94, 0.06)',
    color: '#ffffff',
    outline: 'none',
  },
  overrideHint: {
    fontSize: 10,
    color: 'var(--text-muted, #94a3b8)',
  },
  evidenceDataWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    fontSize: 11,
  },
  evidenceField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  fieldLabel: {
    fontSize: 10.5,
    color: 'var(--text-muted, #94a3b8)',
    fontWeight: 600,
  },
  fieldChip: {
    alignSelf: 'flex-start',
    padding: '2px 8px',
    borderRadius: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
    fontSize: 10.5,
    fontWeight: 600,
  },
  fieldCode: {
    padding: '4px 8px',
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    fontSize: 10,
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    color: '#e2e8f0',
  },
  fieldVal: {
    color: '#e2e8f0',
    lineHeight: 1.4,
  },
  agentBox: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.25)',
  },
  agentPre: {
    margin: '4px 0 0',
    padding: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    fontSize: 10,
    fontFamily: 'monospace',
    maxHeight: 80,
    overflowY: 'auto',
    color: '#cbd5e1',
  },
  noEvidenceBox: {
    padding: '16px 10px',
    textAlign: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.04)',
    border: '1px solid rgba(245, 158, 11, 0.15)',
  },
  attachmentLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '5px 8px',
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    color: 'var(--accent-blue, #60a5fa)',
    fontSize: 10.5,
    textDecoration: 'none',
  },
  returnDrawer: {
    padding: '10px 18px',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderTop: '1px solid rgba(245, 158, 11, 0.2)',
  },
  returnLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: '#f59e0b',
    marginBottom: 6,
  },
  returnTextarea: {
    width: '100%',
    padding: 8,
    borderRadius: 6,
    fontSize: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    color: '#ffffff',
    outline: 'none',
    resize: 'none',
  },
  cancelBtn: {
    padding: '4px 10px',
    borderRadius: 5,
    fontSize: 11,
    border: '1px solid rgba(255, 255, 255, 0.15)',
    backgroundColor: 'transparent',
    color: 'var(--text-muted, #94a3b8)',
    cursor: 'pointer',
  },
  confirmReturnBtn: {
    padding: '4px 12px',
    borderRadius: 5,
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: '#d97706',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 18px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  closeFooterBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    fontSize: 11.5,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'transparent',
    color: 'var(--text-muted, #94a3b8)',
    cursor: 'pointer',
  },
  returnBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    borderRadius: 6,
    fontSize: 11.5,
    fontWeight: 600,
    border: '1px solid rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    color: '#f59e0b',
    cursor: 'pointer',
  },
  approveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 16px',
    borderRadius: 6,
    fontSize: 11.5,
    fontWeight: 700,
    border: 'none',
    backgroundColor: '#10b981',
    color: '#ffffff',
    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
    transition: 'transform 120ms ease, opacity 120ms ease',
  },
};
