import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from 'react';
import {
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    ChatBubbleBottomCenterTextIcon,
    UserIcon,
    ShoppingBagIcon,
    ChevronDownIcon
} from '@heroicons/react/24/outline';
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
                setRequests(res.data);
            } else {
                setRequests(prev => [...prev, ...res.data]);
            }
            setTotal(res.total || 0);
            setOffset(startOffset + res.data.length);
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
        } catch (error) {
            setReviewError(error.message || t('orderSettings.k_98'));
        } finally {
            setReviewingAction(false);
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('orderSettings.k_99')}</h2>
                <p className="text-slate-500 text-sm">{t('orderSettings.k_100')}</p>
            </div>

            {loading ? (
                <div className="p-10 text-center">{t('orderSettings.k_101')}</div>
            ) : requests.length === 0 ? (
                <div className="p-20 text-center bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <CheckCircleIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-400">{t('orderSettings.k_102')}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((req) => (
                        <div
                            key={req.id}
                            className="p-5 rounded-3xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:border-indigo-200 transition-colors"
                        >
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <ShoppingBagIcon className="w-5 h-5 text-indigo-500" />
                                        <span className="font-bold text-slate-900 dark:text-white">{t('orderSettings.k_103')}{req.order?.orderNumber}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <UserIcon className="w-4 h-4" />
                                            {t('orderSettings.k_154')} {req.requestor?.firstName} {req.requestor?.lastName}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <ClockIcon className="w-4 h-4" />
                                            {t('orderSettings.k_155')} {new Date(req.createdAt).toLocaleString('ar-EG')}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 py-2 px-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl w-fit">
                                        <span className="text-sm font-medium">{req.fromStatus?.name || t('orderSettings.k_104')}</span>
                                        <span className="text-indigo-400">←</span>
                                        <span className="text-sm font-bold text-indigo-600">{req.toStatus?.name}</span>
                                    </div>
                                    {req.reason && (
                                        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                            <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-amber-500 mt-1" />
                                            <p className="text-xs text-amber-700 dark:text-amber-400">{t('orderSettings.k_105')}{req.reason}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 self-end md:self-center">
                                    <button
                                        onClick={() => setReviewing(req)}
                                        className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
                                    >
                                        {t('orderSettings.k_156')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {offset < total && (
                        <div className="text-center pt-4">
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
                            >
                                {loadingMore ? t('orderSettings.k_101') : (
                                    <>{t('orderSettings.k_106')}{total - offset}{t('orderSettings.k_107')}<ChevronDownIcon className="w-4 h-4" /></>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Review Modal */}
            {reviewing && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold mb-6">{t('orderSettings.k_108')}</h2>

                        <div className="mb-6 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                            <p className="text-sm text-indigo-700 dark:text-indigo-300">
                                {t('orderSettings.k_157')} <strong>{reviewing.order?.orderNumber}</strong>{t('orderSettings.k_109')}<strong>{reviewing.toStatus?.name}</strong>.
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">{t('orderSettings.k_110')}</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent"
                                placeholder={t('orderSettings.k_111')}
                                rows={3}
                            />
                        </div>

                        {reviewError && (
                            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                                {reviewError}
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button
                                onClick={() => handleReview('approve')}
                                disabled={reviewingAction}
                                className="flex-1 flex items-center justify-center gap-2 py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CheckCircleIcon className="w-6 h-6" />
                                {reviewingAction ? t('orderSettings.k_112') : t('orderSettings.k_113')}
                            </button>
                            <button
                                onClick={() => handleReview('reject')}
                                disabled={reviewingAction}
                                className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <XCircleIcon className="w-6 h-6" />
                                {reviewingAction ? t('orderSettings.k_112') : t('orderSettings.k_114')}
                            </button>
                        </div>

                        <button
                            onClick={() => { setReviewing(null); setReason(''); setReviewError(null); }}
                            className="w-full mt-4 py-3 text-slate-400 hover:text-slate-600 font-medium"
                        >
                            {t('orderSettings.k_158')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApprovalRules;
