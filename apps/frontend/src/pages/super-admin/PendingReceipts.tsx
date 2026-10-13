import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiClient } from '../../services/apiClient';
import {
    Eye,
    CheckCircle2,
    XCircle,
    Receipt as ReceiptIcon,
    ArrowPathIcon,
    Wallet,
    Building2,
    Clock,
    ShieldCheck
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

interface Receipt {
    id: string;
    amount: number;
    currency: string;
    status: string;
    receiptImage: string;
    createdAt: string;
    walletNumber?: {
        number?: string;
        walletNumber?: string;
        name?: string;
        provider?: string;
    };
    invoice?: {
        companyId: string;
        totalAmount: number;
        currency: string;
        company?: {
            name: string;
            email: string;
        };
    };
}

const getFullImageUrl = (path: string) => {
    if (!path) return '';
    const normalizedPath = path.replace(/\\/g, '/');
    if (normalizedPath.startsWith('uploads/')) {
        return `http://localhost:3000/${normalizedPath}`;
    }
    return normalizedPath;
};

const PendingReceipts: React.FC = () => {
    const { t } = useTranslation();
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchReceipts = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/wallet-payment/admin/pending-receipts');
            if (response.data.success) {
                setReceipts(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching receipts:', error);
            toast.error(t('فشل في جلب الإيصالات المعلقة'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReceipts();
    }, []);

    const totalPendingAmount = useMemo(() => {
        return receipts.reduce((acc, r) => acc + (r.invoice?.totalAmount || r.amount || 0), 0);
    }, [receipts]);

    const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            setActionLoading(id);
            const response = await apiClient.post(`/wallet-payment/admin/review-receipt/${id}`, { status });
            if (response.data.success) {
                toast.success(status === 'APPROVED' ? t('تم قبول الإيصال وإيداع الرصيد بنجاح') : t('تم رفض الإيصال'));
                setReceipts(prev => prev.filter(r => r.id !== id));
            } else {
                throw new Error(response.data.message || 'Unknown error');
            }
        } catch (error: any) {
            console.error('Error reviewing receipt:', error);
            toast.error(error.message || t('حدث خطأ أثناء المراجعة'));
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono uppercase bg-primary/10 text-primary border border-primary/20">
                            <ShieldCheck className="h-3 w-3" />
                            {t('إدارة النظام')}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">/ wallet-payments</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                        {t('مراجعة إيصالات الشحن')}
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {t('تدقيق إيصالات فودافون كاش والمحافظ الإلكترونية واعتماد شحن الرصيد للشركات')}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchReceipts}
                        disabled={loading}
                        className="h-8 text-xs font-mono gap-1.5"
                    >
                        <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>{t('تحديث')}</span>
                    </Button>
                </div>
            </div>

            {/* Telemetry Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-border/70 bg-card p-3 flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-mono text-muted-foreground uppercase">{t('إجمالي المعلق')}</span>
                        <div className="text-xl font-bold font-mono tabular-nums text-foreground mt-0.5">
                            {receipts.length} <span className="text-xs font-normal text-muted-foreground">إيصال</span>
                        </div>
                    </div>
                    <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                        <ReceiptIcon className="h-4 w-4" />
                    </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-card p-3 flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-mono text-muted-foreground uppercase">{t('قيمة الشحن بانتظار الاعتماد')}</span>
                        <div className="text-xl font-bold font-mono tabular-nums text-foreground mt-0.5">
                            {totalPendingAmount.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">ج.م</span>
                        </div>
                    </div>
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                        <Wallet className="h-4 w-4" />
                    </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-card p-3 flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-mono text-muted-foreground uppercase">{t('سرعة التدقيق')}</span>
                        <div className="text-xl font-bold font-mono tabular-nums text-foreground mt-0.5">
                            فوري <span className="text-xs font-normal text-muted-foreground">/ تلقائي</span>
                        </div>
                    </div>
                    <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <Clock className="h-4 w-4" />
                    </div>
                </div>
            </div>

            {/* Single Surface Table Chassis */}
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="border-border/60 hover:bg-transparent">
                            <TableHead className="font-mono text-xs">{t('المرجع')}</TableHead>
                            <TableHead className="font-mono text-xs">{t('الشركة / الحساب')}</TableHead>
                            <TableHead className="font-mono text-xs">{t('المبلغ المطلوب')}</TableHead>
                            <TableHead className="font-mono text-xs">{t('المحفظة المستلمة')}</TableHead>
                            <TableHead className="font-mono text-xs">{t('توقيت الإيداع')}</TableHead>
                            <TableHead className="text-center font-mono text-xs">{t('الإيصال')}</TableHead>
                            <TableHead className="text-center font-mono text-xs">{t('قرار التدقيق')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12">
                                    <div className="flex justify-center items-center gap-2 text-muted-foreground text-xs font-mono">
                                        <LoadingSpinner size="sm" />
                                        <span>جاري تحميل بيانات الإيصالات...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : receipts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12">
                                    <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                                        <CheckCircle2 className="h-8 w-8 text-emerald-500/60" />
                                        <p className="text-sm font-semibold text-foreground">{t('لا توجد إيصالات معلقة حالياً')}</p>
                                        <p className="text-xs text-muted-foreground">تمت مراجعة واعتماد جميع طلبات الشحن بنجاح</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            receipts.map((receipt) => (
                                <TableRow key={receipt.id} className="border-border/60 hover:bg-muted/20 transition-colors">
                                    <TableCell>
                                        <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                                            #{receipt.id.substring(0, 8)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {receipt.invoice?.company ? (
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 text-xs font-bold">
                                                    {receipt.invoice.company.name.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-foreground truncate">{receipt.invoice.company.name}</p>
                                                    <p className="text-[11px] font-mono text-muted-foreground truncate">{receipt.invoice.company.email}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <Badge variant="outline" className="font-mono text-[11px]">{receipt.invoice?.companyId || 'N/A'}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-xs font-bold font-mono tabular-nums text-foreground">
                                            {(receipt.invoice?.totalAmount || receipt.amount).toLocaleString()}{" "}
                                            <span className="text-[11px] font-normal text-muted-foreground">{receipt.invoice?.currency || receipt.currency || 'EGP'}</span>
                                        </p>
                                    </TableCell>
                                    <TableCell>
                                        {receipt.walletNumber ? (
                                            <div className="text-xs">
                                                <p className="font-mono text-foreground font-medium">{receipt.walletNumber.number || receipt.walletNumber.walletNumber || '—'}</p>
                                                <p className="text-[11px] text-muted-foreground">{receipt.walletNumber.provider || receipt.walletNumber.name || 'محفظة إلكترونية'}</p>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground font-mono">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs font-mono text-muted-foreground tabular-nums">
                                            {new Date(receipt.createdAt).toLocaleString('ar-EG', {
                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit', hour12: false
                                            })}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
                                            onClick={() => setSelectedImage(getFullImageUrl(receipt.receiptImage))}
                                            title="معاينة صورة الإيصال"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex gap-1.5 justify-center items-center">
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => handleReview(receipt.id, 'APPROVED')}
                                                disabled={actionLoading !== null}
                                                className="h-7 px-2.5 text-xs font-mono bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                            >
                                                {actionLoading === receipt.id ? <LoadingSpinner size="sm" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                                <span>{t('قبول')}</span>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleReview(receipt.id, 'REJECTED')}
                                                disabled={actionLoading !== null}
                                                className="h-7 px-2.5 text-xs font-mono border-destructive/30 text-destructive hover:bg-destructive/10 gap-1"
                                            >
                                                <XCircle className="h-3.5 w-3.5" />
                                                <span>{t('رفض')}</span>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Dialog for image inspection */}
            <Dialog open={!!selectedImage} onOpenChange={(open) => { if (!open) setSelectedImage(null); }}>
                <DialogContent className="max-w-2xl bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-semibold">{t('معاينة إيصال الإيداع والتحويل')}</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            تحقق من الرقم المرجعي والتوقيت والمبلغ المطابق للإيداع
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center p-2 bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
                        {selectedImage && (
                            <img
                                src={selectedImage}
                                alt="Receipt"
                                className="max-w-full max-h-[65vh] object-contain rounded-lg"
                            />
                        )}
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedImage(null)} className="h-8 text-xs font-mono">
                            {t('إغلاق')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PendingReceipts;