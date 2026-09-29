import React, { useState } from 'react';
import { X, Target, Plus, Zap, CheckCircle2, PhoneCall, ShoppingCart, Truck, Banknote, Clock, Headphones, Activity } from 'lucide-react';
import { audioAlerts } from '../../utils/audioAlerts';

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalCreated: () => void;
}

interface MetricOption {
  key: string;
  label: string;
  category: string;
  defaultUnit: string;
  defaultTarget: number;
  defaultTitle: string;
  icon: any;
  hint: string;
}

const AUTOMATED_METRICS: MetricOption[] = [
  {
    key: 'ORDER_CONFIRMED',
    label: 'تأكيد طلبات (كول سنتر ومبيعات)',
    category: 'مبيعات',
    defaultUnit: 'طلب مؤكد',
    defaultTarget: 50,
    defaultTitle: 'تأكيد 50 طلب كول سنتر',
    icon: PhoneCall,
    hint: 'يزداد تلقائياً عندما يؤكد الموظف أي طلبية على المنصة',
  },
  {
    key: 'ORDER_CREATED',
    label: 'إنشاء طلبات مبيعات جديدة',
    category: 'مبيعات',
    defaultUnit: 'طلب',
    defaultTarget: 20,
    defaultTitle: 'إنشاء 20 طلب مبيعات جديد',
    icon: ShoppingCart,
    hint: 'يزداد تلقائياً عند إدخال طلب جديد في النظام',
  },
  {
    key: 'ORDER_DELIVERED',
    label: 'تسليم شحنات بنجاح (شحن ولوجستيات)',
    category: 'شحن',
    defaultUnit: 'شحنة مسلمة',
    defaultTarget: 40,
    defaultTitle: 'تسليم 40 شحنة للعملاء',
    icon: Truck,
    hint: 'يزداد تلقائياً عند تغيير حالة الشحنة إلى تم التسليم',
  },
  {
    key: 'REVENUE_COLLECTED',
    label: 'تحصيل إيرادات وأموال (خزينة)',
    category: 'مالية',
    defaultUnit: 'ج.م',
    defaultTarget: 10000,
    defaultTitle: 'تحصيل 10,000 ج.م إيرادات',
    icon: Banknote,
    hint: 'يزداد تلقائياً عند تسجيل أو تحصيل مبالغ الطلبات',
  },
  {
    key: 'TASK_COMPLETED',
    label: 'إنجاز مهام العمل (إنتاجية)',
    category: 'مهام',
    defaultUnit: 'مهمة',
    defaultTarget: 5,
    defaultTitle: 'إنجاز 5 مهام عمل',
    icon: CheckCircle2,
    hint: 'يزداد تلقائياً عند تحويل أي مهمة إلى مكتملة (Done)',
  },
  {
    key: 'TASK_STOPWATCH_HOURS',
    label: 'ساعات عمل تركيز بالتايمر',
    category: 'مهام',
    defaultUnit: 'ساعة',
    defaultTarget: 6,
    defaultTitle: 'تسجيل 6 ساعات عمل بالمؤقت',
    icon: Clock,
    hint: 'يزداد تلقائياً بعدد الساعات المسجلة عبر مؤقت الديسك توب',
  },
  {
    key: 'TICKET_RESOLVED',
    label: 'حل تذاكر الدعم وخدمة العملاء',
    category: 'دعم',
    defaultUnit: 'تذكرة',
    defaultTarget: 15,
    defaultTitle: 'حل 15 تذكرة دعم فني',
    icon: Headphones,
    hint: 'يزداد تلقائياً عند إغلاق تذكرة أو محادثة دعم بنجاح',
  },
  {
    key: 'DENTAL_CASE_COMPLETED',
    label: 'تسليم حالات معمل الأسنان',
    category: 'معمل',
    defaultUnit: 'حالة',
    defaultTarget: 10,
    defaultTitle: 'تسليم 10 حالات معمل أسنان',
    icon: Activity,
    hint: 'يزداد تلقائياً عند تسليم حالة أو إنهاء مرحلة فنية',
  },
];

export const CreateGoalModal: React.FC<CreateGoalModalProps> = ({
  isOpen,
  onClose,
  onGoalCreated,
}) => {
  const [trackingMode, setTrackingMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [selectedMetricKey, setSelectedMetricKey] = useState<string>('ORDER_CONFIRMED');
  const [title, setTitle] = useState('تأكيد 50 طلب كول سنتر');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState<number>(50);
  const [unit, setUnit] = useState('طلب مؤكد');
  const [goalType, setGoalType] = useState('DAILY');
  const [priority, setPriority] = useState('MEDIUM');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleMetricSelect = (metric: MetricOption) => {
    setSelectedMetricKey(metric.key);
    setTitle(metric.defaultTitle);
    setUnit(metric.defaultUnit);
    setTarget(metric.defaultTarget);
  };

  const handleModeSwitch = (mode: 'AUTO' | 'MANUAL') => {
    setTrackingMode(mode);
    if (mode === 'AUTO') {
      const metric = AUTOMATED_METRICS.find((m) => m.key === selectedMetricKey) || AUTOMATED_METRICS[0];
      handleMetricSelect(metric);
    } else {
      setTitle('');
      setUnit('مهام');
      setTarget(5);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('يرجى كتابة عنوان الهدف');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const numericTarget = Number(target) || 1;
      const res = await window.electronAPI.createGoal({
        title: title.trim(),
        description: description.trim(),
        target: numericTarget,
        targetValue: numericTarget,
        unit: unit.trim() || 'وحدة',
        goalType,
        priority,
        metricKey: trackingMode === 'AUTO' ? selectedMetricKey : undefined,
      });

      if (res?.success || res?.id) {
        audioAlerts.playTaskComplete();
        onGoalCreated();
        onClose();
        setTitle('');
        setDescription('');
      } else {
        setError(res?.error || 'فشل في حفظ الهدف');
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ الهدف');
    } finally {
      setSubmitting(false);
    }
  };

  const currentMetric = AUTOMATED_METRICS.find((m) => m.key === selectedMetricKey) || AUTOMATED_METRICS[0];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={16} color="var(--accent-blue)" />
            <span style={styles.title}>إضافة هدف أو مؤشر أداء جديد</span>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.errorBanner}>{error}</div>}

          {/* Mode Selector */}
          <div style={styles.modeToggleContainer}>
            <button
              type="button"
              onClick={() => handleModeSwitch('AUTO')}
              style={{
                ...styles.modeToggleBtn,
                backgroundColor: trackingMode === 'AUTO' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                borderColor: trackingMode === 'AUTO' ? 'var(--accent-blue)' : 'var(--border-subtle)',
                color: trackingMode === 'AUTO' ? 'var(--accent-blue)' : 'var(--text-muted)',
              }}
            >
              <Zap size={13} />
              <span>تتبع تلقائي ذكي من النظام</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('MANUAL')}
              style={{
                ...styles.modeToggleBtn,
                backgroundColor: trackingMode === 'MANUAL' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                borderColor: trackingMode === 'MANUAL' ? 'var(--text-muted)' : 'var(--border-subtle)',
                color: trackingMode === 'MANUAL' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <Target size={13} />
              <span>تتبع يدوي مخصص</span>
            </button>
          </div>

          {/* Auto Metric Picker */}
          {trackingMode === 'AUTO' && (
            <div style={styles.field}>
              <label style={styles.label}>اختر المؤشر التلقائي المربوط بالمنصة</label>
              <select
                value={selectedMetricKey}
                onChange={(e) => {
                  const m = AUTOMATED_METRICS.find((opt) => opt.key === e.target.value);
                  if (m) handleMetricSelect(m);
                }}
                style={styles.select}
              >
                {AUTOMATED_METRICS.map((m) => (
                  <option key={m.key} value={m.key}>
                    [{m.category}] {m.label}
                  </option>
                ))}
              </select>
              <div style={styles.metricHint}>
                <Zap size={11} color="var(--accent-blue)" />
                <span>{currentMetric.hint}</span>
              </div>
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>عنوان الهدف *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: إنجاز 6 مهام تطوير، مراجعة 3 حملات إعلانية…"
              style={styles.input}
              autoFocus
            />
          </div>

          <div style={styles.row}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>الرقم المستهدف</label>
              <input
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                style={styles.input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>وحدة القياس</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={styles.input}
                placeholder="مثال: طلب، مهمة، ج.م"
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>نطاق الهدف</label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
                style={styles.select}
              >
                <option value="DAILY">هدف يومي (اليوم)</option>
                <option value="WEEKLY">هدف أسبوعي</option>
                <option value="MONTHLY">هدف شهري</option>
                <option value="STRATEGIC">هدف استراتيجي</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>الأولوية</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={styles.select}
              >
                <option value="URGENT">عاجل</option>
                <option value="HIGH">مرتفع</option>
                <option value="MEDIUM">متوسط</option>
                <option value="LOW">منخفض</option>
              </select>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>الوصف أو الملاحظات (اختياري)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="تفاصيل إضافية للهدف…"
              rows={2}
              style={{ ...styles.input, resize: 'none' }}
            />
          </div>

          <div style={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={styles.submitBtn}
            >
              <Plus size={13} />
              <span>{submitting ? 'جاري الحفظ…' : 'حفظ الهدف'}</span>
            </button>
          </div>
        </form>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 10,
    width: 460,
    maxWidth: '92vw',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
    direction: 'rtl',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 3,
  },
  form: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 11,
  },
  modeToggleContainer: {
    display: 'flex',
    gap: 8,
  },
  modeToggleBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '7px 10px',
    borderRadius: 6,
    border: '1px solid var(--border-subtle)',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  metricHint: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 10,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  row: {
    display: 'flex',
    gap: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  input: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    padding: '7px 10px',
    color: 'var(--text-primary)',
    fontSize: 12,
    outline: 'none',
  },
  select: {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 6,
    padding: '7px 10px',
    color: 'var(--text-primary)',
    fontSize: 12,
    outline: 'none',
    width: '100%',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: 'var(--accent-red)',
    padding: '6px 10px',
    borderRadius: 6,
    fontSize: 11,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
    borderTop: '1px solid var(--border-subtle)',
    paddingTop: 12,
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-muted)',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 11,
    cursor: 'pointer',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'var(--accent-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
};

export default CreateGoalModal;
