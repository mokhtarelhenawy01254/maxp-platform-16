import React, { useState, useEffect } from 'react';
import {
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    ChatBubbleBottomCenterTextIcon,
    UserIcon,
    ShoppingBagIcon
} from '@heroicons/react/24/outline';
import orderWorkflowService from '../../../services/orderWorkflowService';

const ApprovalRules: React.FC<{ onUpdate: () => void }> = ({ onUpdate }) => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [reviewing, setReviewing] = useState<any | null>(null);
    const [reason, setReason] = useState('');

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await orderWorkflowService.getPendingApprovals();
            setRequests(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (action: 'approve' | 'reject') => {
        if (!reviewing) return;
        try {
            await orderWorkflowService.reviewApproval(reviewing.id, action, reason);
            setReviewing(null);
            setReason('');
            fetchRequests();
            onUpdate();
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">طلبات الموافقة المعلقة</h2>
                <p className="text-slate-500 text-sm">راجع طلبات تغيير حالة الطلبات التي تتطلب موافقة المدير</p>
            </div>

            {loading ? (
                <div className="p-10 text-center">جاري التحميل...</div>
            ) : requests.length === 0 ? (
                <div className="p-20 text-center bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <CheckCircleIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-400">لا يوجد طلبات موافقة معلقة حالياً</p>
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
                                        <span className="font-bold text-slate-900 dark:text-white">طلب رقم: {req.order?.orderNumber}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <UserIcon className="w-4 h-4" />
                                            بواسطة: {req.requestor?.firstName} {req.requestor?.lastName}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <ClockIcon className="w-4 h-4" />
                                            منذ: {new Date(req.createdAt).toLocaleString('ar-EG')}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 py-2 px-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl w-fit">
                                        <span className="text-sm font-medium">{req.fromStatus?.name || 'بداية'}</span>
                                        <span className="text-indigo-400">←</span>
                                        <span className="text-sm font-bold text-indigo-600">{req.toStatus?.name}</span>
                                    </div>
                                    {req.reason && (
                                        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                            <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-amber-500 mt-1" />
                                            <p className="text-xs text-amber-700 dark:text-amber-400">السبب: {req.reason}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 self-end md:self-center">
                                    <button
                                        onClick={() => setReviewing(req)}
                                        className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
                                    >
                                        مراجعة الطلب
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Review Modal */}
            {reviewing && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold mb-6">مراجعة طلب تغيير الحالة</h2>

                        <div className="mb-6 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                            <p className="text-sm text-indigo-700 dark:text-indigo-300">
                                أنت بصدد مراجعة تغيير حالة الطلب <strong>{reviewing.order?.orderNumber}</strong> إلى <strong>{reviewing.toStatus?.name}</strong>.
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">ملاحظات المراجعة (اختياري):</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent"
                                placeholder="اكتب ملاحظاتك للموظف هنا..."
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => handleReview('approve')}
                                className="flex-1 flex items-center justify-center gap-2 py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition"
                            >
                                <CheckCircleIcon className="w-6 h-6" />
                                موافقة
                            </button>
                            <button
                                onClick={() => handleReview('reject')}
                                className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition"
                            >
                                <XCircleIcon className="w-6 h-6" />
                                رفض
                            </button>
                        </div>

                        <button
                            onClick={() => { setReviewing(null); setReason(''); }}
                            className="w-full mt-4 py-3 text-slate-400 hover:text-slate-600 font-medium"
                        >
                            إغلاق
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApprovalRules;
