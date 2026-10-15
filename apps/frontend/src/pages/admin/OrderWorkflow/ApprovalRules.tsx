import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  User,
  ShoppingBag,
  ChevronDown,
  ArrowLeft,
  X,
  AlertCircle,
} from 'lucide-react';
import orderWorkflowService from '../../../services/orderWorkflowService';

const PAGE_SIZE = 10;

const ApprovalRules: React.FC<{ onUpdate: () => void }> = ({ onUpdate }) => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<any | null>(null);
  const [reason, setReason] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewingAction, setReviewingAction] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchRequests(0, true);
  }, []);

  const fetchRequests = async (startOffset: number = 0, reset: boolean = false) => {
    try {
      if (reset) setLoading(true);
      const res = await orderWorkflowService.getPendingApprovals(PAGE_SIZE, startOffset);
      if (reset) {
        setRequests(res.data || []);
      } else {
        setRequests(prev => [...prev, ...(res.data || [])]);
      }
      setTotal(res.total || 0);
      setOffset(startOffset + (res.data || []).length);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    setLoadingMore(true);
    fetchRequests(offset, false);
  };

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!reviewing) return;
    try {
      setReviewError(null);
      setReviewingAction(true);
      await orderWorkflowService.reviewApproval(reviewing.id, action, reason);
      setReviewing(null);
      setReason('');
      fetchRequests(0, true);
      onUpdate();
    } catch (error: any) {
      setReviewError(error.message || t('orderSettings.k_98'));
    } finally {
      setReviewingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Surface */}
      <div className="bg-card border border-border/70 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-foreground">{t('orderSettings.k_99')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('orderSettings.k_100')}</p>
        </div>
        <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground border border-border/60">
          {total} {t('orderSettings.k_29')}
        </span>
      </div>

      {loading ? (
        <div className="p-10 text-center text-xs text-muted-foreground">{t('orderSettings.k_101')}</div>
      ) : requests.length === 0 ? (
        <div className="p-16 text-center bg-card rounded-xl border border-border/70 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <p className="text-xs text-muted-foreground">{t('orderSettings.k_102')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="p-4 rounded-xl bg-card border border-border/70 hover:border-primary/40 transition-colors shadow-sm"
            >
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                    <span className="font-mono font-bold text-sm text-foreground">
                      {t('orderSettings.k_103')} {req.order?.orderNumber || req.orderNumber}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1 font-medium">
                      <User className="w-3.5 h-3.5" />
                      {t('orderSettings.k_154')} {req.requestor?.firstName || req.requestedBy} {req.requestor?.lastName || ''}
                    </div>
                    <div className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(req.createdAt).toLocaleString('ar-EG')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 py-1.5 px-3 bg-muted/40 border border-border/60 rounded-lg w-fit text-xs font-mono">
                    <span className="font-medium text-foreground">{req.fromStatus?.name || req.currentStatus || t('orderSettings.k_104')}</span>
                    <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-bold text-primary">{req.toStatus?.name || req.targetStatus}</span>
                  </div>

                  {req.reason && (
                    <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">{req.reason}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => setReviewing(req)}
                    className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition shadow-sm"
                  >
                    {t('orderSettings.k_156')}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {offset < total && (
            <div className="text-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-card border border-border/70 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition disabled:opacity-50"
              >
                {loadingMore ? t('orderSettings.k_101') : (
                  <>
                    {t('orderSettings.k_106')} {total - offset} {t('orderSettings.k_107')}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {reviewing && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border/80 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-base font-bold text-foreground">{t('orderSettings.k_108')}</h2>
              <button onClick={() => { setReviewing(null); setReason(''); setReviewError(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-foreground">
              <p>
                {t('orderSettings.k_157')} <strong className="font-mono">{reviewing.order?.orderNumber || reviewing.orderNumber}</strong> {t('orderSettings.k_109')} <strong className="font-bold">{reviewing.toStatus?.name || reviewing.targetStatus}</strong>.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">{t('orderSettings.k_110')}</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-border/70 bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-hidden"
                placeholder={t('orderSettings.k_111')}
                rows={3}
              />
            </div>

            {reviewError && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {reviewError}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleReview('approve')}
                disabled={reviewingAction}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {reviewingAction ? t('orderSettings.k_112') : t('orderSettings.k_113')}
              </button>
              <button
                onClick={() => handleReview('reject')}
                disabled={reviewingAction}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                {reviewingAction ? t('orderSettings.k_112') : t('orderSettings.k_114')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalRules;
