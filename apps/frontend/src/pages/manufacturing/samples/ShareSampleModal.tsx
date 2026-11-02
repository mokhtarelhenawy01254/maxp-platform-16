import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  RefreshCw,
  Calendar,
  Eye,
  AlertCircle,
  Users,
  Factory,
} from 'lucide-react';
import {
  manufacturingApi,
  SampleOrder,
  SampleShareLink,
} from '../manufacturingApi';
import { DateInput } from '../../../components/ui/DateInput';

interface ShareSampleModalProps {
  sample: SampleOrder;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export const ShareSampleModal: React.FC<ShareSampleModalProps> = ({
  sample,
  isOpen,
  onClose,
  onRefresh,
}) => {
  const [links, setLinks] = useState<SampleShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Expiration date inputs
  const [customerExpDate, setCustomerExpDate] = useState('');
  const [factoryExpDate, setFactoryExpDate] = useState('');

  // Copied state
  const [copiedKind, setCopiedKind] = useState<string | null>(null);
  const [generatingKind, setGeneratingKind] = useState<string | null>(null);
  const [revokingKind, setRevokingKind] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && sample?.id) {
      loadLinks();
    }
  }, [isOpen, sample?.id]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      setActionError(null);
      const res = await manufacturingApi.listSampleShareLinks(sample.id);
      if (res.length === 0 && sample.customerPortalUrl) {
        const parts = sample.customerPortalUrl.split('/');
        const token = parts[parts.length - 1];
        if (token) {
          setLinks([{
            id: 'auto_cust',
            companyId: sample.companyId,
            sampleOrderId: sample.id,
            kind: 'CUSTOMER',
            token,
            url: sample.customerPortalUrl,
            views: 0,
            createdAt: sample.createdAt || new Date().toISOString(),
          }]);
          return;
        }
      }
      setLinks(res);
    } catch (err: any) {
      setActionError(err.message || 'حدث خطأ أثناء تحميل روابط المشاركة');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (kind: 'CUSTOMER' | 'FACTORY') => {
    try {
      setGeneratingKind(kind);
      setActionError(null);

      const expDateVal = kind === 'CUSTOMER' ? customerExpDate : factoryExpDate;
      let expIso: string | null = null;
      if (expDateVal) {
        // Set to end of chosen date
        const d = new Date(expDateVal);
        d.setHours(23, 59, 59, 999);
        expIso = d.toISOString();
      }

      await manufacturingApi.generateSampleShareLink(sample.id, kind, expIso);
      await loadLinks();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'فشل توليد الرابط');
    } finally {
      setGeneratingKind(null);
    }
  };

  const handleRevoke = async (kind: 'CUSTOMER' | 'FACTORY') => {
    if (!window.confirm('هل أنت متأكد من رغبتك في إلغاء هذا الرابط فوراً؟ لن يتمكن أي طرف من فتحه بعد الآن.')) {
      return;
    }

    try {
      setRevokingKind(kind);
      setActionError(null);
      await manufacturingApi.revokeSampleShareLink(sample.id, kind);
      await loadLinks();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'فشل إلغاء الرابط');
    } finally {
      setRevokingKind(null);
    }
  };

  const getFullUrl = (token: string) => {
    return `${window.location.origin}/share/sample/${token}`;
  };

  const handleCopy = async (token: string, kind: string) => {
    const fullUrl = getFullUrl(token);
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedKind(kind);
      setTimeout(() => setCopiedKind(null), 2000);
    } catch (_) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = fullUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedKind(kind);
      setTimeout(() => setCopiedKind(null), 2000);
    }
  };

  if (!isOpen) return null;

  const customerLink = links.find((l) => l.kind === 'CUSTOMER');
  const factoryLink = links.find((l) => l.kind === 'FACTORY');

  const renderLinkCard = (
    kind: 'CUSTOMER' | 'FACTORY',
    title: string,
    description: string,
    icon: React.ReactNode,
    link?: SampleShareLink,
    expDate?: string,
    setExpDate?: (v: string) => void
  ) => {
    const isGenerated = !!link && !link.revokedAt;
    const isRevoked = !!link?.revokedAt;
    const isExpired = !!link?.expiresAt && new Date(link.expiresAt).getTime() < Date.now();
    const isWorking = isGenerated && !isExpired;

    return (
      <div className="bg-muted/30 border border-border/80 rounded-xl p-4 sm:p-5 flex flex-col gap-3.5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <div>
              <h4 className="font-semibold text-sm text-foreground">{title}</h4>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          {isWorking ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              نشط
            </span>
          ) : isRevoked ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              ملغي
            </span>
          ) : isExpired ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              منتهي
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
              لم يتم التوليد
            </span>
          )}
        </div>

        {isWorking ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                dir="ltr"
                value={getFullUrl(link.token)}
                className="w-full text-xs font-mono bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleCopy(link.token, kind)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
                title="نسخ الرابط"
              >
                {copiedKind === kind ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    تم النسخ
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    نسخ
                  </>
                )}
              </button>
              <a
                href={getFullUrl(link.token)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors"
                title="فتح في تاب جديد"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2 pt-1 border-t border-border/50">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  اتفتح {link.views} {link.views === 1 ? 'مرة' : 'مرات'}
                </span>
                {link.expiresAt && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    ينتهي في: {new Date(link.expiresAt).toLocaleDateString('ar-EG')}
                  </span>
                )}
                {link.factoryAckAt && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    تم استلام المصنع: {new Date(link.factoryAckAt).toLocaleString('ar-EG')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGenerate(kind)}
                  disabled={generatingKind === kind}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  title="تدوير التوكن وإنشاء رابط جديد"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${generatingKind === kind ? 'animate-spin' : ''}`} />
                  تحديث الرابط
                </button>
                <button
                  type="button"
                  onClick={() => handleRevoke(kind)}
                  disabled={revokingKind === kind}
                  className="inline-flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  إلغاء الرابط
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="flex-1 flex items-center gap-2">
                <label className="text-xs text-muted-foreground whitespace-nowrap">
                  تاريخ الانتهاء (اختياري):
                </label>
                <DateInput
                  value={expDate || ''}
                  onChange={(e) => setExpDate && setExpDate(e.target.value)}
                  className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => handleGenerate(kind)}
                disabled={generatingKind === kind}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {generatingKind === kind ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Share2 className="w-3.5 h-3.5" />
                )}
                {isRevoked || isExpired ? 'إعادة توليد الرابط' : 'توليد الرابط'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                مشاركة أمر العينة: {sample.sampleNumber}
              </h3>
              <p className="text-xs text-muted-foreground">
                توليد روابط عامة ومباشرة للعميل والمصنع بدون تسجيل دخول
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {actionError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-xs">جاري تحميل بيانات الروابط...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Customer Link Card */}
              {renderLinkCard(
                'CUSTOMER',
                'لينك العميل',
                'يعرض بيانات العينة، الصور، الحالة، الموعد، والمدفوعات والمراحل بدون لوجن',
                <Users className="w-4 h-4" />,
                customerLink,
                customerExpDate,
                setCustomerExpDate
              )}

              {/* Factory Link Card */}
              {renderLinkCard(
                'FACTORY',
                'لينك المصنع',
                'مخصص للمصنع لتأكيد الاستلام ورفع صورة العينة (بدون أي بيانات مالية داخلية)',
                <Factory className="w-4 h-4" />,
                factoryLink,
                factoryExpDate,
                setFactoryExpDate
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium border border-border hover:bg-muted transition-colors text-foreground"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
