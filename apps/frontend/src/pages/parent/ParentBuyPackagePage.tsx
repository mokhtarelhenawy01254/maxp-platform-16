import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Wallet,
  BookOpen,
  User,
  GraduationCap,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw
} from "lucide-react";

interface Subject {
  id: string;
  name: string;
  packages: Array<{
    id: string;
    name: string;
    hoursCount: number;
    price: number;
    description?: string;
  }>;
}

interface Child {
  id: string;
  firstName: string;
  lastName: string;
}

const ParentBuyPackagePage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [wallet, setWallet] = useState<{ balance: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("parentToken");
        const [subRes, childRes, walRes] = await Promise.all([
          fetch("/api/v1/education/parent-portal/subjects", {
            headers: { Authorization: `Bearer ${token}` }
          }).then((r) => r.json()).catch(() => ({ success: false })),
          fetch("/api/v1/education/parent-portal/children", {
            headers: { Authorization: `Bearer ${token}` }
          }).then((r) => r.json()).catch(() => ({ success: false })),
          fetch("/api/v1/education/parent-portal/wallet", {
            headers: { Authorization: `Bearer ${token}` }
          }).then((r) => r.json()).catch(() => ({ success: false }))
        ]);

        if (subRes.success && Array.isArray(subRes.data) && subRes.data.length > 0) {
          setSubjects(subRes.data);
          setSelectedSubject(subRes.data[0].id);
        } else {
          setSubjects([]);
          setSelectedSubject("");
        }

        if (childRes.success && Array.isArray(childRes.data) && childRes.data.length > 0) {
          setChildren(childRes.data);
          setSelectedStudent(childRes.data[0].id);
        } else {
          setChildren([]);
          setSelectedStudent("");
        }

        if (walRes.success && walRes.data?.wallet) {
          setWallet(walRes.data.wallet);
        } else {
          setWallet(null);
        }
      } catch {
        setSubjects([]);
        setSelectedSubject("");
        setChildren([]);
        setSelectedStudent("");
        setWallet(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const currentSubject = subjects.find((s) => s.id === selectedSubject) || subjects[0];
  const selectedPkg = currentSubject?.packages?.find((p) => p.id === selectedPackage);
  const userBalance = wallet?.balance ?? 0;
  const hasCatalog = subjects.length > 0;
  // 🎓 خصم الأخوات 10%: بيظهر للولي الأمر لو عنده أكتر من طالب مسجل
  const siblingDiscountRate = children.length > 1 ? 0.1 : 0;
  const priceAfterDiscount = (p: number) =>
    Math.round(p * (1 - siblingDiscountRate) * 100) / 100;
  const payable = selectedPkg ? priceAfterDiscount(selectedPkg.price) : 0;
  const canPurchase = Boolean(
    hasCatalog &&
      selectedStudent &&
      selectedPackage &&
      selectedPkg &&
      userBalance >= payable
  );

  const handlePurchase = async () => {
    if (!canPurchase || !selectedPkg) return;
    try {
      setPurchasing(true);
      setMessage(null);
      const token = localStorage.getItem("parentToken");
      const res = await fetch("/api/v1/education/parent-portal/purchase-package", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ studentId: selectedStudent, packageId: selectedPackage })
      });
      const json = await res.json();
      if (json.success) {
        setMessage({
          type: "success",
          text: `تم شراء "${selectedPkg.name}" بنجاح وخصم ${selectedPkg.price} ج.م من المحفظة!`
        });
        setTimeout(() => navigate("/parent/enrollments"), 1500);
      } else {
        setMessage({ type: "error", text: json.message || "حدث خطأ أثناء الشراء" });
      }
    } catch {
      setMessage({
        type: "error",
        text: "تعذر الاتصال بالخادم، لم يتم إتمام عملية الشراء. يرجى المحاولة مرة أخرى"
      });
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] space-y-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-mono text-muted-foreground uppercase">جاري تحميل الباقات والمحفظة...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* Telemetry Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              PACKAGE CHECKOUT
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              رصيد المحفظة: {userBalance.toLocaleString("ar-EG")} ج.م
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">شراء باقة تعليمية</h1>
          <p className="text-xs text-muted-foreground">
            اختيار الطالب والمادة التعليمية لشحن ساعات الدروس الخصوصية
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/parent/wallet"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-all"
          >
            <Wallet className="w-3.5 h-3.5 text-primary" />
            <span>شحن رصيد المحفظة</span>
          </Link>
        </div>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center gap-2.5 ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-destructive" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1 & 2: Select Student & Subject */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Student Picker */}
          <div className="rounded-xl border border-border/70 bg-card text-card-foreground p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-border/50">
              <User className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">1. اختر الطالب المستفيد</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {children.length === 0 && (
                <div className="sm:col-span-2 p-6 rounded-lg border border-border/60 bg-muted/20 text-center space-y-1.5">
                  <User className="w-8 h-8 text-muted-foreground mx-auto stroke-1" />
                  <p className="text-xs font-medium text-foreground">لا يوجد أطفال مسجلون</p>
                  <p className="text-[11px] text-muted-foreground">
                    تعذر تحميل قائمة الأبناء المسجلين على حسابك
                  </p>
                </div>
              )}
              {children.map((child) => {
                const isSelected = selectedStudent === child.id;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setSelectedStudent(child.id)}
                    className={`p-3 rounded-lg border text-right transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-primary bg-primary/5 text-foreground shadow-xs"
                        : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        {child.firstName} {child.lastName}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">طالب مسجل</div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border/80"
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Subject Picker */}
          <div className="rounded-xl border border-border/70 bg-card text-card-foreground p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-border/50">
              <BookOpen className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">2. اختر المادة الدراسية</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {subjects.length === 0 && (
                <div className="w-full p-6 rounded-lg border border-border/60 bg-muted/20 text-center space-y-1.5">
                  <BookOpen className="w-8 h-8 text-muted-foreground mx-auto stroke-1" />
                  <p className="text-xs font-medium text-foreground">لا توجد مواد أو باقات متاحة حالياً</p>
                  <p className="text-[11px] text-muted-foreground">
                    لم يتم تحميل أي باقات من الأكاديمية، يرجى المحاولة لاحقاً
                  </p>
                </div>
              )}
              {subjects.map((sub) => {
                const isSelected = selectedSubject === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setSelectedSubject(sub.id);
                      setSelectedPackage("");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border/70 bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {sub.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Packages Grid */}
          <div className="rounded-xl border border-border/70 bg-card text-card-foreground p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-border/50">
              <GraduationCap className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">3. اختر باقة الساعات</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(!currentSubject || !currentSubject.packages || currentSubject.packages.length === 0) && (
                <div className="sm:col-span-3 p-8 rounded-xl border border-border/60 bg-muted/20 text-center space-y-1.5">
                  <GraduationCap className="w-9 h-9 text-muted-foreground mx-auto stroke-1" />
                  <p className="text-xs font-medium text-foreground">لا توجد باقات متاحة للشراء</p>
                  <p className="text-[11px] text-muted-foreground">
                    سيتم عرض الباقات المتاحة فور إتاحتها من الأكاديمية
                  </p>
                </div>
              )}
              {currentSubject?.packages?.map((pkg) => {
                const isSelected = selectedPackage === pkg.id;
                const perHour = pkg.hoursCount > 0 ? Math.round(pkg.price / pkg.hoursCount) : 0;

                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={`p-4 rounded-xl border text-right transition-all flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-xs"
                        : "border-border/60 hover:bg-muted/30"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-foreground">{pkg.name}</div>
                      {pkg.description && (
                        <p className="text-[11px] text-muted-foreground">{pkg.description}</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/40 space-y-1">
                      <div className="text-base font-bold font-mono tabular-nums text-foreground">
                        {priceAfterDiscount(pkg.price).toLocaleString("ar-EG")} ج.م
                        {siblingDiscountRate > 0 && (
                          <span className="mr-1.5 text-[11px] font-normal text-muted-foreground line-through">
                            {pkg.price.toLocaleString("ar-EG")}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {pkg.hoursCount} ساعة{pkg.hoursCount > 0 ? ` • ${perHour} ج.م / س` : ""}
                      </div>
                      {siblingDiscountRate > 0 && (
                        <div className="text-[10px] font-mono text-emerald-600">
                          خصم الأخوات 10% مطبَّق
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 4: Summary & Checkout Card */}
        <div className="rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">ملخص العملية</h2>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">الطالب:</span>
                <span className="font-semibold text-foreground">
                  {children.find((c) => c.id === selectedStudent)?.firstName || "لم يحدد"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">المادة:</span>
                <span className="font-semibold text-foreground">{currentSubject?.name || "لم يحدد"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">الباقة:</span>
                <span className="font-semibold text-foreground">{selectedPkg?.name || "لم تحدد"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">عدد الساعات:</span>
                <span className="font-mono tabular-nums font-semibold text-foreground">
                  {selectedPkg ? `${selectedPkg.hoursCount} ساعة` : "—"}
                </span>
              </div>
              {siblingDiscountRate > 0 && selectedPkg && (
                <div className="flex justify-between py-1.5 border-b border-border/40 text-emerald-600">
                  <span>خصم الأخوات 10%:</span>
                  <span className="font-mono tabular-nums font-semibold">
                    − {(selectedPkg.price - payable).toLocaleString("ar-EG")} ج.م
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 text-sm font-bold">
                <span className="text-foreground">المبلغ الإجمالي:</span>
                <span className="font-mono tabular-nums text-primary">
                  {selectedPkg ? `${payable.toLocaleString("ar-EG")} ج.م` : "—"}
                </span>
              </div>
            </div>

            {selectedPkg && userBalance < payable && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 space-y-1">
                <p className="font-semibold">رصيد المحفظة غير كافٍ</p>
                <p className="text-[11px]">المتبقي المطلوب: {payable - userBalance} ج.م</p>
                <Link to="/parent/wallet" className="text-primary hover:underline font-bold inline-block pt-1">
                  شحن المحفظة الآن ←
                </Link>
              </div>
            )}
          </div>

          <button
            onClick={handlePurchase}
            disabled={!canPurchase || purchasing}
            className="w-full py-2.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            {purchasing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShoppingCart className="w-3.5 h-3.5" />
            )}
            <span>
              {purchasing
                ? "جاري الخصم والتفعيل..."
                : !hasCatalog
                ? "لا توجد باقات متاحة للشراء"
                : "تأكيد شراء الباقة"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParentBuyPackagePage;
