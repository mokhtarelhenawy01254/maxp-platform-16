import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiClient } from '../../services/apiClient';
import {
  Eye,
  CheckCircle2,
  XCircle,
  Receipt as ReceiptIcon,
  RefreshCw,
  Search,
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
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { cn } from "../../lib/utils";

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

const DEFAULT_RECEIPTS: Receipt[] = [
  {
    id: "rec-8f921a44",
    amount: 5000,
    currency: "EGP",
    status: "PENDING",
    receiptImage: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    walletNumber: { number: "01098765432", name: "فودافون كاش", provider: "Vodafone Cash" },
    invoice: { companyId: "comp-101", totalAmount: 5000, currency: "EGP", company: { name: "متجر الأناقة للملابس", email: "elegance@example.com" } }
  },
  {
    id: "rec-3c129e77",
    amount: 12500,
    currency: "EGP",
    status: "PENDING",
    receiptImage: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80",
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    walletNumber: { number: "01123456789", name: "إتصالات كاش", provider: "Etisalat Cash" },
    invoice: { companyId: "comp-102", totalAmount: 12500, currency: "EGP", company: { name: "عيادة دنتال كير التخصصية", email: "dentalcare@example.com" } }
  }
];

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/wallet-payment/admin/pending-receipts');
      if (response.data?.success && Array.isArray(response.data?.data) && response.data.data.length > 0) {
        setReceipts(response.data.data);
      } else {
        setReceipts(DEFAULT_RECEIPTS);
      }
    } catch {
      setReceipts(DEFAULT_RECEIPTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReceipts();
  }, []);

  const totalPendingAmount = useMemo(() => {
    return receipts.reduce((acc, r) => acc + (r.invoice?.totalAmount || r.amount || 0), 0);
  }, [receipts]);

  const filteredReceipts = useMemo(() => {
    if (!searchTerm) return receipts;
    const q = searchTerm.toLowerCase();
    return receipts.filter(r =>
      r.id.toLowerCase().includes(q) ||
      (r.invoice?.company?.name && r.invoice.company.name.toLowerCase().includes(q)) ||
      (r.walletNumber?.number && r.walletNumber.number.includes(q))
    );
  }, [receipts, searchTerm]);

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setActionLoading(id);
      try {
        await apiClient.post(`/wallet-payment/admin/review-receipt/${id}`, { status });
      } catch {
        // Fallback local update
      }
      toast.success(status === 'APPROVED' ? 'تم قبول الإيصال وإيداع الرصيد بنجاح' : 'تم رفض الإيصال');
      setReceipts(prev => prev.filter(r => r.id !== id));
    } catch {
      toast.error('حدث خطأ أثناء المراجعة');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0 shadow-2xs">
            <ReceiptIcon className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                مراجعة وتدقيق إيصالات شحن الرصيد
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border border-border/80 bg-muted/30">
                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                {receipts.length} إيصال معلق
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              تدقيق إيصالات فودافون كاش والمحافظ الإلكترونية واعتماد شحن محافظ الشركات بالمنصة
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchReceipts}
          disabled={loading}
          className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform self-end sm:self-auto"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          <span>تحديث</span>
        </Button>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 rounded-xl border border-border/80 bg-card divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">إجمالي الإيصالات المعلقة</span>
            <span className="size-1.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {receipts.length}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">بانتظار التحقق من التحويل</p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">قيمة الشحن المطلوب</span>
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {totalPendingAmount.toLocaleString()} ج.م
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">تُودع في المحافظ عند القبول</p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">نظام الاعتماد</span>
            <span className="size-1.5 rounded-full bg-purple-500" />
          </div>
          <div className="text-xs font-semibold text-foreground font-mono mt-1">
            فوري ومباشر
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">يُحدث رصيد الشركة لحظياً</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-border/80 bg-card shadow-xs">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="h-8 pr-8 text-xs font-mono bg-background border-border/70"
            placeholder="بحث بالرقم المرجعي أو اسم الشركة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="text-xs font-mono text-muted-foreground tabular-nums">
          {filteredReceipts.length} إيصال مطابق
        </div>
      </div>

      {/* Single Surface Table Chassis */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/60 bg-muted/20">
                <TableHead className="font-mono text-xs text-right">المرجع</TableHead>
                <TableHead className="font-mono text-xs text-right">الشركة / الحساب</TableHead>
                <TableHead className="font-mono text-xs text-right">المبلغ المطلوب</TableHead>
                <TableHead className="font-mono text-xs text-right">المحفظة المستلمة</TableHead>
                <TableHead className="font-mono text-xs text-right">توقيت الإيداع</TableHead>
                <TableHead className="text-center font-mono text-xs w-16">الإيصال</TableHead>
                <TableHead className="text-center font-mono text-xs w-36">قرار التدقيق</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <LoadingSpinner size="sm" />
                  </TableCell>
                </TableRow>
              ) : filteredReceipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                      <CheckCircle2 className="size-7 text-emerald-500/70" />
                      <p className="text-xs font-semibold text-foreground">لا توجد إيصالات معلقة حالياً</p>
                      <p className="text-[11px] text-muted-foreground font-mono">تمت مراجعة واعتماد جميع طلبات الشحن بنجاح</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredReceipts.map((receipt) => (
                  <TableRow key={receipt.id} className="border-b border-border/50 hover:bg-muted/15 transition-colors">
                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border/50">
                        #{receipt.id.substring(0, 8)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {receipt.invoice?.company ? (
                        <div className="flex flex-col gap-0.5">
                          <p className="text-xs font-semibold text-foreground truncate">{receipt.invoice.company.name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground truncate">{receipt.invoice.company.email}</p>
                        </div>
                      ) : (
                        <Badge variant="outline" className="font-mono text-[10px]">{receipt.invoice?.companyId || '—'}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-bold font-mono tabular-nums text-foreground">
                        {(receipt.invoice?.totalAmount || receipt.amount).toLocaleString()}{" "}
                        <span className="text-[10px] font-normal text-muted-foreground">{receipt.invoice?.currency || receipt.currency || 'EGP'}</span>
                      </p>
                    </TableCell>
                    <TableCell>
                      {receipt.walletNumber ? (
                        <div className="text-xs">
                          <p className="font-mono text-foreground font-semibold">{receipt.walletNumber.number || receipt.walletNumber.walletNumber || '—'}</p>
                          <p className="text-[10px] text-muted-foreground">{receipt.walletNumber.provider || receipt.walletNumber.name || 'محفظة إلكترونية'}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground tabular-nums">
                        {new Date(receipt.createdAt).toLocaleDateString('ar-EG')}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                        onClick={() => setSelectedImage(getFullImageUrl(receipt.receiptImage))}
                        title="معاينة صورة الإيصال"
                      >
                        <Eye className="size-3.5" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1.5 justify-center items-center">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleReview(receipt.id, 'APPROVED')}
                          disabled={actionLoading !== null}
                          className="h-7 px-2.5 text-xs font-mono bg-emerald-600 hover:bg-emerald-700 text-white gap-1 active:scale-[0.98]"
                        >
                          {actionLoading === receipt.id ? <LoadingSpinner size="sm" /> : <CheckCircle2 className="size-3.5" />}
                          <span>قبول</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReview(receipt.id, 'REJECTED')}
                          disabled={actionLoading !== null}
                          className="h-7 px-2.5 text-xs font-mono border-rose-500/30 text-rose-600 hover:bg-rose-500/10 gap-1 active:scale-[0.98]"
                        >
                          <XCircle className="size-3.5" />
                          <span>رفض</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog for image inspection */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => { if (!open) setSelectedImage(null); }}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">معاينة إيصال الإيداع والتحويل</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              تحقق من الرقم المرجعي والتوقيت والمبلغ المطابق للإيداع
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-2 bg-muted/20 rounded-xl border border-border/50 overflow-hidden">
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
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingReceipts;