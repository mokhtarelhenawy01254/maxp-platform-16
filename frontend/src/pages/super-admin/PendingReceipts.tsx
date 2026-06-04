import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    IconButton
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../services/apiClient';
import { Eye, CheckCircle, XCircle } from 'lucide-react';

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
    // Normalize backslashes to forward slashes for URL compatibility
    const normalizedPath = path.replace(/\\/g, '/');
    // Convert standard backend upload paths to full URL
    if (normalizedPath.startsWith('uploads/')) {
        return `http://localhost:3000/${normalizedPath}`; // Ensure full URL for local dev
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
                // Remove from list
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
        <Box>
            <Typography variant="h4" fontWeight="bold" mb={3}>
                {t('مراجعة إيصالات الشحن')}
            </Typography>

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: 'background.default' }}>
                            <TableRow>
                                <TableCell>{t('الرقم المرجعي')}</TableCell>
                                <TableCell>{t('الشركة / العميل')}</TableCell>
                                <TableCell>{t('المبلغ المعروض')}</TableCell>
                                <TableCell>{t('المحفظة المحول إليها')}</TableCell>
                                <TableCell>{t('التاريخ')}</TableCell>
                                <TableCell align="center">{t('الإيصال')}</TableCell>
                                <TableCell align="center">{t('الإجراءات')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : receipts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                        <Typography color="text.secondary">{t('لا توجد إيصالات معلقة حالياً')}</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                receipts.map((receipt) => (
                                    <TableRow key={receipt.id}>
                                        <TableCell>
                                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                                {receipt.id.substring(0, 8)}...
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {receipt.invoice?.company ? (
                                                <Box>
                                                    <Typography variant="body2">{receipt.invoice.company.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{receipt.invoice.company.email}</Typography>
                                                </Box>
                                            ) : (
                                                <Chip label={receipt.invoice?.companyId || 'N/A'} size="small" variant="outlined" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Typography fontWeight="bold" color="primary">
                                                {receipt.invoice?.totalAmount} {receipt.invoice?.currency || 'EGP'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {receipt.walletNumber ? (
                                                <Box>
                                                    <Typography variant="body2">{receipt.walletNumber.number}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{receipt.walletNumber.name}</Typography>
                                                </Box>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(receipt.createdAt).toLocaleString('ar-EG')}
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton color="primary" onClick={() => setSelectedImage(getFullImageUrl(receipt.receiptImage))}>
                                                <Eye size={20} />
                                            </IconButton>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box display="flex" gap={1} justifyContent="center">
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    size="small"
                                                    startIcon={actionLoading === receipt.id ? <CircularProgress size={16} color="inherit" /> : <CheckCircle size={16} />}
                                                    onClick={() => handleReview(receipt.id, 'APPROVED')}
                                                    disabled={actionLoading !== null}
                                                >
                                                    {t('قبول')}
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    color="error"
                                                    size="small"
                                                    startIcon={<XCircle size={16} />}
                                                    onClick={() => handleReview(receipt.id, 'REJECTED')}
                                                    disabled={actionLoading !== null}
                                                >
                                                    {t('رفض')}
                                                </Button>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog open={!!selectedImage} onClose={() => setSelectedImage(null)} maxWidth="md" fullWidth>
                <DialogTitle>{t('استعراض صورة الإيصال')}</DialogTitle>
                <DialogContent sx={{ display: 'flex', justifyContent: 'center', p: 3, bgcolor: '#f5f5f5' }}>
                    {selectedImage && (
                        <img
                            src={selectedImage}
                            alt="Receipt"
                            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedImage(null)}>{t('إغلاق')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PendingReceipts;
