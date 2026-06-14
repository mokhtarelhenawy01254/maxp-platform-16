import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription } from "../components/ui/alert";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/apiClient";
import { Copy, Upload, CheckCircle, ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";

const SubscriptionRenewalPayment = () => {
  const navigate = useNavigate();
  const [walletNumbers, setWalletNumbers] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => { fetchWalletNumbers(); fetchSubscription(); }, []);

  const fetchWalletNumbers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/wallet-payment/wallet-numbers");
      if (response.data.success) setWalletNumbers(response.data.data);
    } catch (error) { toast.error("خطأ في جلب أرقام المحافظ"); } finally { setLoading(false); }
  };

  const fetchSubscription = async () => { setSubscription({ id: "mock-subscription", price: 7500, currency: "EGP" }); };

  const copyToClipboard = (text, walletName) => { navigator.clipboard.writeText(text).then(() => toast.success(`تم نسخ رقم ${walletName}`)); };

  const handleWalletSelect = (wallet) => { setSelectedWallet(wallet); setActiveStep(1); };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast.error("حجم الملف كبير جداً"); return; }
      if (!file.type.startsWith("image/")) { toast.error("يرجى اختيار ملف صورة فقط"); return; }
      setReceiptFile(file); setActiveStep(2);
    }
  };

  const handleSubmitReceipt = async () => {
    if (!receiptFile || !selectedWallet) { toast.error("يرجى اختيار المحفظة ورفع الإيصال"); return; }
    try {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append("receipt", receiptFile);
      formData.append("walletNumberId", selectedWallet.id);
      formData.append("subscriptionId", subscription?.id || "renewal");
      formData.append("amount", subscription?.price || 7500);
      formData.append("purpose", "subscription_renewal");
      const response = await apiClient.post("/wallet-payment/submit-receipt", formData);
      if (response.data.success) { toast.success("تم إرسال الإيصال بنجاح!"); setTimeout(() => navigate("/subscription"), 2000); }
      else toast.error(response.data.message);
    } catch (error) { toast.error("خطأ في إرسال الإيصال"); } finally { setUploadLoading(false); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 0 }).format(amount);

  if (loading) return <div className="flex justify-center items-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="p-3 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-3"><Button variant="ghost" size="icon" onClick={() => navigate("/subscription")}><ArrowLeft className="size-5" /></Button><h1 className="text-2xl font-bold">💳 دفع تجديد الاشتراك</h1></div>

      <div className="flex items-center justify-center gap-2 mb-4">
        {["اختيار المحفظة", "رفع الإيصال", "تأكيد الإرسال"].map((step, i) => (
          <div key={step} className={`flex items-center gap-1 ${i <= activeStep ? "text-primary font-bold" : "text-muted-foreground"}`}>
            <span className={`size-6 rounded-full flex items-center justify-center text-xs ${i <= activeStep ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{i + 1}</span>
            <span className="hidden sm:inline text-sm">{step}</span>
            {i < 2 && <span className="mx-1 text-muted-foreground">—</span>}
          </div>
        ))}
      </div>

      <Card className="mb-3"><CardContent><p className="text-lg font-bold">المبلغ المطلوب: {formatCurrency(subscription?.price || 7500)}</p><p className="text-sm text-muted-foreground">رسوم تجديد الاشتراك الشهري</p></CardContent></Card>

      <Card className="mb-3">
        <CardHeader><CardTitle>1️⃣ اختر رقم المحفظة للتحويل</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {walletNumbers.map((wallet) => (
              <div key={wallet.id} className={`rounded-lg border p-3 cursor-pointer transition-colors hover:border-primary ${selectedWallet?.id === wallet.id ? "border-primary border-2" : ""}`} onClick={() => handleWalletSelect(wallet)}>
                <div className="flex items-center justify-between">
                  <div><p className="font-bold">{wallet.icon} {wallet.name}</p><p className="text-lg font-mono">{wallet.number}</p></div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); copyToClipboard(wallet.number, wallet.name); }}><Copy className="size-4" /></Button>
                    {selectedWallet?.id === wallet.id && <CheckCircle className="size-5 text-green-600" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {activeStep >= 1 && <Card className="mb-3"><CardHeader><CardTitle>2️⃣ ارفع صورة إيصال التحويل</CardTitle></CardHeader><CardContent>
        {selectedWallet && <Alert className="mb-2"><AlertDescription>تم اختيار: {selectedWallet.icon} {selectedWallet.name} - {selectedWallet.number}</AlertDescription></Alert>}
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <input accept="image/*" className="hidden" id="receipt-upload" type="file" onChange={handleFileChange} />
          <label htmlFor="receipt-upload"><Button variant="outline" size="lg" asChild><span>{receiptFile ? <><CheckCircle className="size-4" /> تم رفع الإيصال</> : <><Upload className="size-4" /> اختر صورة الإيصال</>}</span></Button></label>
          {receiptFile && <p className="text-sm mt-1">{receiptFile.name}</p>}
          <p className="text-xs mt-1">الحد الأقصى: 5 ميجابايت | الصيغ المدعومة: JPG, PNG, GIF</p>
        </div>
      </CardContent></Card>}

      {activeStep >= 2 && <Card><CardHeader><CardTitle>3️⃣ تأكيد وإرسال</CardTitle></CardHeader><CardContent className="text-center">
        <p className="mb-1"><strong>المحفظة المختارة:</strong> {selectedWallet?.name} - {selectedWallet?.number}</p>
        <p className="mb-1"><strong>المبلغ:</strong> {formatCurrency(subscription?.price || 7500)}</p>
        <p className="mb-3"><strong>الإيصال:</strong> {receiptFile?.name}</p>
        <Button size="lg" disabled={uploadLoading || !receiptFile || !selectedWallet} onClick={handleSubmitReceipt}>
          {uploadLoading ? <><LoadingSpinner size="sm" /> جاري الإرسال...</> : "إرسال الإيصال للمراجعة"}
        </Button>
      </CardContent></Card>}
    </div>
  );
};

export default SubscriptionRenewalPayment;