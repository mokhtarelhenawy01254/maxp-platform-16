import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { apiClient } from "../services/apiClient";
import { Copy, Upload, CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast";

const PaymentPage = () => {
  const { invoiceId } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [walletNumbers, setWalletNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchInvoiceData(); fetchWalletNumbers(); }, [invoiceId]);

  const fetchInvoiceData = async () => {
    try {
      const response = await apiClient.get(`/wallet-payment/invoice/${invoiceId}`);
      if (response.data.success) setInvoice(response.data.data);
      else setError(response.data.message);
    } catch (error) { setError("خطأ في جلب بيانات الفاتورة"); }
  };

  const fetchWalletNumbers = async () => {
    try {
      const response = await apiClient.get("/wallet-payment/wallet-numbers");
      if (response.data.success) setWalletNumbers(response.data.data);
    } catch (error) { console.error("خطأ في جلب أرقام المحافظ:", error); } finally { setLoading(false); }
  };

  const copyToClipboard = (text, walletName) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`تم نسخ رقم ${walletName}`));
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast.error("حجم الملف يجب أن يكون أقل من 5 ميجابايت"); return; }
      setSelectedFile(file);
    }
  };

  const submitReceipt = async (walletNumberId) => {
    if (!selectedFile) { toast.error("يرجى اختيار صورة الإيصال أولاً"); return; }
    setUploading(true);
    const formData = new FormData();
    formData.append("receipt", selectedFile);
    formData.append("invoiceId", invoiceId);
    formData.append("walletNumberId", walletNumberId);
    try {
      const response = await apiClient.post("/wallet-payment/submit-receipt", formData);
      if (response.data.success) { setSubmitted(true); toast.success("تم إرسال الإيصال بنجاح!"); }
      else toast.error(response.data.message);
    } catch (error) { toast.error("خطأ في إرسال الإيصال"); } finally { setUploading(false); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 0 }).format(amount);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });

  if (loading) return <div className="flex justify-center items-center min-h-screen"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="p-3 min-h-screen"><Alert variant="destructive" className="max-w-xl mx-auto"><AlertDescription>{error}</AlertDescription></Alert></div>;
  if (submitted) return <div className="p-3 max-w-xl mx-auto min-h-screen"><Card><CardContent className="text-center py-8"><CheckCircle className="size-16 text-green-600 mx-auto mb-4" /><h2 className="text-xl font-bold mb-2">تم إرسال الإيصال بنجاح!</h2><p className="text-muted-foreground">سيتم مراجعة إيصال الدفع وتأكيد الدفع خلال 24 ساعة</p></CardContent></Card></div>;

  return (
    <div className="p-3 max-w-3xl mx-auto min-h-screen">
      <h1 className="text-2xl font-bold text-center mb-4">🧾 دفع الفاتورة</h1>

      <Card className="mb-3">
        <CardHeader><CardTitle>تفاصيل الفاتورة</CardTitle></CardHeader>
        <CardContent><div className="grid grid-cols-2 gap-2">
          <div><p className="text-sm text-muted-foreground">رقم الفاتورة</p><p className="font-bold">{invoice?.invoiceNumber}</p></div>
          <div><p className="text-sm text-muted-foreground">الشركة</p><p className="font-bold">{invoice?.company?.name}</p></div>
          <div><p className="text-sm text-muted-foreground">المبلغ المطلوب</p><p className="text-lg font-bold text-primary">{formatCurrency(invoice?.totalAmount)}</p></div>
          <div><p className="text-sm text-muted-foreground">تاريخ الاستحقاق</p><p className="font-bold">{formatDate(invoice?.dueDate)}</p></div>
        </div></CardContent>
      </Card>

      <Card className="mb-3">
        <CardHeader><CardTitle>💳 أرقام المحافظ المتاحة</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">اختر رقم المحفظة المناسب وانسخه لإجراء التحويل</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {walletNumbers.map((wallet) => (
              <div key={wallet.id} className="rounded-lg border p-3 hover:border-primary transition-colors">
                <div className="flex items-center justify-between">
                  <div><p className="font-bold">{wallet.icon} {wallet.name}</p><p className="text-lg font-mono">{wallet.number}</p></div>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(wallet.number, wallet.name)}><Copy className="size-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>📸 رفع إيصال التحويل</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-3 text-sm space-y-1 text-muted-foreground">
            <p>📝 التعليمات:</p>
            <ol className="list-decimal pr-4 space-y-1"><li>انسخ رقم المحفظة المناسب</li><li>حول المبلغ {formatCurrency(invoice?.totalAmount)} من تليفونك</li><li>التقط صورة واضحة لإيصال التحويل</li><li>ارفع الصورة هنا واضغط إرسال</li></ol>
          </div>
          <input accept="image/*" className="hidden" id="receipt-upload" type="file" onChange={handleFileSelect} />
          <label htmlFor="receipt-upload"><Button variant="outline" className="w-full mb-2" asChild><span><Upload className="size-4" /> اختر صورة الإيصال</span></Button></label>
          {selectedFile && <Alert className="mb-2"><AlertDescription>تم اختيار الملف: {selectedFile.name}</AlertDescription></Alert>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {walletNumbers.map((wallet) => (
              <Button key={wallet.id} disabled={!selectedFile || uploading} onClick={() => submitReceipt(wallet.id)}>
                {uploading ? <LoadingSpinner size="sm" /> : `إرسال إيصال ${wallet.name}`}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentPage;