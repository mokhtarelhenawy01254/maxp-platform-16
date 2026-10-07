import React from 'react';
import { X, AlertCircle, ShieldAlert, Calendar } from 'lucide-react';

interface DeductionItem {
  id: string;
  date: string;
  reason: string;
  amount: number;
  type?: string;
}

interface DeductionsBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  deductions?: DeductionItem[];
  totalDeductions?: number;
  currency?: string;
}

export const DeductionsBreakdownModal: React.FC<DeductionsBreakdownModalProps> = ({
  isOpen,
  onClose,
  deductions = [],
  totalDeductions = 0,
  currency = 'ج.م',
}) => {
  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ar-EG-u-nu-latn', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <div style={styles.iconWrapper}>
              <AlertCircle size={16} color="var(--accent-red)" />
            </div>
            <div>
              <h3 style={styles.title}>تفصيل الخصومات والاستقطاعات</h3>
              <p style={styles.subtitle}>
                إجمالي الاستقطاعات للشهر الحالي:{' '}
                <strong style={{ color: 'var(--accent-red)', fontVariantNumeric: 'tabular-nums' }}>
                  {totalDeductions.toLocaleString('en-US')} {currency}
                </strong>
              </p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="إغلاق">
            <X size={16} color="var(--text-muted)" />
          </button>
        </div>

        {/* List of Deductions */}
        <div style={styles.body}>
          {deductions.length === 0 ? (
            <div style={styles.emptyState}>
              <ShieldAlert size={28} color="var(--accent-green)" />
              <p style={styles.emptyTitle}>لا توجد أي خصومات مسجلة عليك هذا الشهر!</p>
              <p style={styles.emptySub}>التزامك بساعات العمل وبصمات الحضور منتظم بنسبة 100%.</p>
            </div>
          ) : (
            <div style={styles.list}>
              {deductions.map((item) => (
                <div key={item.id} style={styles.itemCard}>
                  <div style={styles.itemHeader}>
                    <div style={styles.dateTag}>
                      <Calendar size={11} color="var(--text-muted)" />
                      <span>{formatDate(item.date)}</span>
                    </div>
                    <span style={styles.amountBadge}>
                      -{item.amount.toLocaleString('en-US')} {currency}
                    </span>
                  </div>
                  <p style={styles.reasonText}>{item.reason}</p>
                </div>
              ))}
            </div>
          )}

          <div style={styles.noticeBox}>
            <ShieldAlert size={14} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={styles.noticeText}>
              يتم تطبيق الخصومات آلياً بموجب لائحة تنظيم العمل الداخلية وفق فروق أوقات البصمة وساعات التأخير المعتمدة في سجلات الشركة.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button style={styles.closeActionBtn} onClick={onClose}>
            إغلاق النافذة
          </button>
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
    background: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    width: '92%',
    maxWidth: 480,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 10,
    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.45)',
    overflow: 'hidden',
    animation: 'fadeIn 160ms ease-out',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--bg-surface)',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 6,
    background: 'rgba(239, 68, 68, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  subtitle: {
    margin: '2px 0 0',
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    maxHeight: 360,
    overflowY: 'auto',
  },
  emptyState: {
    padding: '24px 12px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  emptySub: {
    margin: 0,
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  itemCard: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateTag: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    color: 'var(--text-muted)',
    fontVariantNumeric: 'tabular-nums',
  },
  amountBadge: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--accent-red)',
    fontVariantNumeric: 'tabular-nums',
  },
  reasonText: {
    margin: '2px 0 0',
    fontSize: 12,
    color: 'var(--text-primary)',
    lineHeight: 1.4,
  },
  noticeBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '9px 12px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    marginTop: 4,
  },
  noticeText: {
    margin: 0,
    fontSize: 11,
    lineHeight: 1.5,
    color: 'var(--text-muted)',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '12px 16px',
    borderTop: '1px solid var(--border-subtle)',
    background: 'var(--bg-surface)',
  },
  closeActionBtn: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-secondary)',
    padding: '6px 14px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default DeductionsBreakdownModal;
