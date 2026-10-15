import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { Calendar, CheckCircle2, RotateCw, ArrowRight, AlertCircle } from "lucide-react";
import { BookAppointmentDone } from "./BookAppointmentDone";

interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  genderDays?: { male?: string[]; female?: string[] };
}

interface ServiceCategory {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  basePrice?: number;
  packages?: Array<{ id: string; price: number }>;
  category?: { id: string } | null;
}

interface Slot {
  startTime: string;
  available: boolean;
}

type Step = "form" | "slots" | "done";

const DAY_LABELS: Record<string, string> = {
  sat: "السبت", sun: "الأحد", mon: "الإثنين", tue: "الثلاثاء", wed: "الأربعاء", thu: "الخميس", fri: "الجمعة",
};

const BookAppointmentPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [companyName, setCompanyName] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [bookingResult, setBookingResult] = useState<any>(null);

  const [branchId, setBranchId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGender, setCustomerGender] = useState<"male" | "female" | "">("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [error, setError] = useState("");

  const getPublic = async <T,>(path: string, params: Record<string, unknown>): Promise<T> => {
    const res = await apiClient.get<{ success: boolean; data: T; error?: string }>(path, { params });
    if (!res.data.success) throw new Error(res.data.error || "فشل الطلب");
    return res.data.data;
  };

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      getPublic<{ name: string }>("/public/booking/info", { slug }),
      getPublic<Branch[]>("/public/booking/branches", { slug }),
      getPublic<ServiceCategory[]>("/public/booking/service-categories", { slug }),
    ])
      .then(([info, branchesData, cats]) => {
        setCompanyName(info.name);
        setBranches(branchesData);
        setCategories(cats);
      })
      .catch(() => setError("تعذر تحميل بيانات المركز"))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!branchId || !slug) {
      setServices([]);
      return;
    }
    getPublic<Service[]>("/public/booking/services", { slug, branchId })
      .then(setServices)
      .catch(() => {});
  }, [branchId, slug]);

  useEffect(() => {
    if (!branchId || !selectedDate || !customerGender || !slug) {
      setSlots([]);
      return;
    }
    getPublic<Slot[]>("/public/booking/slots", {
      slug,
      branchId,
      date: selectedDate,
      gender: customerGender,
      serviceId: serviceId || undefined,
    })
      .then(setSlots)
      .catch(() => {});
  }, [branchId, selectedDate, customerGender, serviceId, slug]);

  const filteredServices = useMemo(() => {
    if (!categoryId) return services;
    return services.filter((s) => s.category?.id === categoryId);
  }, [services, categoryId]);

  const handleNextToSlots = () => {
    if (!branchId) return setError("يرجى اختيار الفرع المطلوب");
    if (!customerName.trim()) return setError("يرجى إدخال اسم المستفيد");
    if (!customerPhone.trim()) return setError("يرجى إدخال رقم الهاتف");
    if (!customerGender) return setError("يرجى تحديد الجنس");
    setError("");
    setStep("slots");
  };

  const handleConfirm = async () => {
    if (!selectedSlot) return setError("يرجى اختيار الموعد المناسب");
    setSubmitting(true);
    setError("");
    try {
      const res = await apiClient.post<{ success: boolean; data: any; error?: string }>(
        "/public/booking/appointments",
        {
          slug, branchId, serviceId: serviceId || undefined,
          customerName, customerPhone, customerGender,
          appointmentDate: selectedDate, startTime: selectedSlot,
        },
      );
      if (res.data.success) {
        setBookingResult(res.data.data);
        setStep("done");
      } else {
        setError(res.data.error || "فشل تأكيد الحجز");
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || "حدث خطأ أثناء إتمام الحجز");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep("form");
    setBranchId("");
    setServiceId("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerGender("");
    setSelectedDate("");
    setSelectedSlot("");
    setError("");
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-2.5 text-muted-foreground text-xs font-mono">
          <RotateCw className="h-6 w-6 animate-spin text-primary" />
          <span>جاري تحميل المواعيد...</span>
        </div>
      </div>
    );
  }

  const branch = branches.find((b) => b.id === branchId);
  const genderDays = branch?.genderDays;

  return (
    <div className="min-h-screen bg-background py-8 px-4 text-foreground font-sans" dir="rtl">
      <div className="mx-auto max-w-lg space-y-5">
        <header className="rounded-xl border border-border/70 bg-card p-5 shadow-xs text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
            <Calendar className="h-3.5 w-3.5" />
            <span>حجز موعد طبي</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{companyName || "المركز الطبي"}</h1>
          <p className="text-xs text-muted-foreground">اختر الفرع، الخدمة، والموعد الأنسب لزيارتك</p>
        </header>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === "form" && (
          <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs space-y-4 text-xs">
            <div>
              <label className="mb-1 block font-medium text-muted-foreground">الفرع</label>
              <select
                value={branchId}
                onChange={(e) => { setBranchId(e.target.value); setServiceId(""); }}
                className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">اختر الفرع</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {services.length > 0 && (
              <div className="space-y-3">
                {categories.length > 0 && (
                  <div>
                    <label className="mb-1 block font-medium text-muted-foreground">القسم / التخصص</label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setCategoryId(""); setServiceId(""); }}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${!categoryId ? "bg-primary text-primary-foreground" : "border border-border/70 bg-background text-muted-foreground hover:bg-muted"}`}
                      >
                        الكل
                      </button>
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setCategoryId(c.id); setServiceId(""); }}
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${categoryId === c.id ? "bg-primary text-primary-foreground" : "border border-border/70 bg-background text-muted-foreground hover:bg-muted"}`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1 block font-medium text-muted-foreground">الخدمة المطلوبة</label>
                  <select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">اختر الخدمة</option>
                    {filteredServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.basePrice ? `— ${s.basePrice} ج.م` : s.packages?.[0]?.price ? `— ${s.packages[0].price} ج.م` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block font-medium text-muted-foreground">الاسم بالكامل</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="اسم المستفيد"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-muted-foreground">رقم الهاتف للتأكيد</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                dir="ltr"
                className="w-full rounded-md border border-border/70 bg-background px-3 py-2 font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-right"
                placeholder="01xxxxxxxxx"
              />
            </div>

            {genderDays && (
              <div>
                <label className="mb-1 block font-medium text-muted-foreground">الجنس</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {genderDays.male && genderDays.male.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCustomerGender("male")}
                      className={`rounded-lg border p-2.5 text-right transition-colors ${customerGender === "male" ? "border-primary/40 bg-primary/10 font-bold text-primary" : "border-border/70 bg-background text-muted-foreground hover:bg-muted"}`}
                    >
                      <div>ذكر</div>
                      <div className="mt-0.5 font-mono text-[10px] opacity-75">{genderDays.male.map((d) => DAY_LABELS[d]).join(" - ")}</div>
                    </button>
                  )}
                  {genderDays.female && genderDays.female.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCustomerGender("female")}
                      className={`rounded-lg border p-2.5 text-right transition-colors ${customerGender === "female" ? "border-pink-500/40 bg-pink-500/10 font-bold text-pink-600 dark:text-pink-400" : "border-border/70 bg-background text-muted-foreground hover:bg-muted"}`}
                    >
                      <div>أنثى</div>
                      <div className="mt-0.5 font-mono text-[10px] opacity-75">{genderDays.female.map((d) => DAY_LABELS[d]).join(" - ")}</div>
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleNextToSlots}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
            >
              <span>متابعة لاختيار التاريخ والوقت</span>
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </button>
          </div>
        )}

        {step === "slots" && (
          <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <button
                onClick={() => setStep("form")}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                <span>العودة للبيانات</span>
              </button>
              <span>•</span>
              <span className="font-medium text-foreground">{branch?.name}</span>
            </div>

            <div>
              <label className="mb-1 block font-medium text-muted-foreground">اختر تاريخ الحجز</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(""); }}
                min={new Date().toISOString().split("T")[0]}
                className="w-full rounded-md border border-border/70 bg-background px-3 py-2 font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {selectedDate && (
              <div>
                <label className="mb-1.5 block font-medium text-muted-foreground">المواعيد المتاحة</label>
                {slots.length === 0 ? (
                  <p className="py-6 text-center text-muted-foreground">لا توجد مواعيد متاحة في هذا اليوم</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.filter((s) => s.available).map((slot) => (
                      <button
                        key={slot.startTime}
                        type="button"
                        onClick={() => setSelectedSlot(slot.startTime)}
                        className={`rounded-md border p-2 text-center font-mono text-xs transition-colors ${selectedSlot === slot.startTime ? "border-primary/40 bg-primary/10 text-primary font-bold" : "border-border/70 bg-background text-muted-foreground hover:bg-muted"}`}
                      >
                        {slot.startTime}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedSlot || submitting}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 py-2.5 text-xs font-medium text-white hover:bg-emerald-700 transition-all shadow-xs disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                  <span>جاري تأكيد الموعد...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>تأكيد الحجز النهائي</span>
                </>
              )}
            </button>
          </div>
        )}

        {step === "done" && bookingResult && (
          <BookAppointmentDone bookingResult={bookingResult} onReset={handleReset} />
        )}
      </div>
    </div>
  );
};

export default BookAppointmentPage;
