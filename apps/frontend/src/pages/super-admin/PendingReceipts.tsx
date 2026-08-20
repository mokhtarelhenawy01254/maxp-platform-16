import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiClient } from '../../services/apiClient';
import { Eye, CheckCircle, XCircle } from 'lucide-react';
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
    DialogTrigger,
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
        walletNumber: string;
        provider: string;
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
        <div>
            <h1 className="text-2xl font-bold mb-3">{t('مراجعة إيصالات الشحن')}</h1>

            <div className="rounded-xl border bg-card text-card-foreground overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>{t('الرقم المرجعي')}</TableHead>
                            <TableHead>{t('الشركة / العميل')}</TableHead>
                            <TableHead>{t('المبلغ المعروض')}</TableHead>
                            <TableHead>{t('المحفظة المحول إليها')}</TableHead>
                            <TableHead>{t('التاريخ')}</TableHead>
                            <TableHead className="text-center">{t('الإيصال')}</TableHead>
                            <TableHead className="text-center">{t('الإجراءات')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-6">
                                    <div className="flex justify-center"><LoadingSpinner size="md" /></div>
                                </TableCell>
                            </TableRow>
                        ) : receipts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-6">
                                    <p className="text-muted-foreground">{t('لا توجد إيصالات معلقة حالياً')}</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            receipts.map((receipt) => (
                                <TableRow key={receipt.id}>
                                    <TableCell>
                                        <span className="text-xs font-mono">{receipt.id.substring(0, 8)}...</span>
                                    </TableCell>
                                    <TableCell>
                                        {receipt.invoice?.company ? (
                                            <div>
                                                <p className="text-sm">{receipt.invoice.company.name}</p>
                                                <p className="text-xs text-muted-foreground">{receipt.invoice.company.email}</p>
                                            </div>
                                        ) : (
                                            <Badge variant="outline">{receipt.invoice?.companyId || 'N/A'}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-bold text-primary">{receipt.invoice?.totalAmount} {receipt.invoice?.currency || 'EGP'}</p>
                                    </TableCell>
                                    <TableCell>
                                        {receipt.walletNumber ? (
                                            <div>
                                                <p className="text-sm">{receipt.walletNumber.number}</p>
                                                <p className="text-xs text-muted-foreground">{receipt.walletNumber.name}</p>
                                            </div>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(receipt.createdAt).toLocaleString('ar-EG')}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button variant="ghost" size="icon" onClick={() => setSelectedImage(getFullImageUrl(receipt.receiptImage))}>
                                            <Eye className="size-5" />
                                        </Button>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex gap-1 justify-center">
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => handleReview(receipt.id, 'APPROVED')}
                                                disabled={actionLoading !== null}
                                            >
                                                {actionLoading === receipt.id ? <LoadingSpinner size="sm" /> : <CheckCircle className="size-4" />}
                                                {t('قبول')}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleReview(receipt.id, 'REJECTED')}
                                                disabled={actionLoading !== null}
                                            >
                                                <XCircle className="size-4" />
                                                {t('رفض')}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={!!selectedImage} onOpenChange={(open) => { if (!open) setSelectedImage(null); }}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{t('استعراض صورة الإيصال')}</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center p-3 bg-muted/50 rounded-lg">
                        {selectedImage && (
                            <img
                                src={selectedImage}
                                alt="Receipt"
                                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
                            />
                        )}
                    </div>
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={() => setSelectedImage(null)}>{t('إغلاق')}</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PendingReceipts;