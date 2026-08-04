import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";

interface Branch {
  id: string; name: string; address?: string; phone?: string;
  genderDays?: { male?: string[]; female?: string[] };
  workingDays?: Record<string, string>;
}

interface ServiceCategory {
  id: string; name: string; color?: string; icon?: string; serviceCount?: number;
}

interface DoctorBrief {
  id: string; name: string; title?: string; specialty?: string; fee?: number;
}

interface Service {
  id: string; name: string; description?: string;
  hasPackages?: boolean; packages?: any[]; requiresConsultation?: boolean;
  basePrice?: number; durationMinutes?: number;
  category?: { id: string; name: string; color?: string; icon?: string } | null;
  doctors?: DoctorBrief[];
}

interface Slot {
  startTime: string; available: boolean;
}

type Step = "form" | "slots" | "confirm" | "done";

const DAY_LABELS: Record<string, string> = {
  sat: "السبت", sun: "الأحد", mon: "الإثنين", tue: "الثلاثاء",
  wed: "الأربعاء", thu: "الخميس", fri: "الجمعة"
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
  const [doctorId, setDoctorId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGender, setCustomerGender] = useState<"male" | "female" | "">("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [error, setError] = useState("");

  interface ApiResponse<T> { success: boolean; data: T; error?: string; }
  const getPublic = async <T,>(path: string, params: Record<string, unknown>): Promise<T> => {
    const res = await apiClient.get<ApiResponse<T>>(path, { params });
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
    ]).then(([info, branchesData, cats]) => {
      setCompanyName(info.name);
      setBranches(branchesData);
      setCategories(cats);
    }).catch(() => setError("تعذر تحميل بيانات المركز")).finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!branchId || !slug) { setServices([]); return; }
    getPublic<Service[]>("/public/booking/services", { slug, branchId })
      .then(setServices)
      .catch(() => {});
  }, [branchId, slug]);

  useEffect(() => {
    if (!branchId || !selectedDate || !customerGender || !slug) { setSlots([]); return; }
    getPublic<Slot[]>("/public/booking/slots", { slug, branchId, date: selectedDate, gender: customerGender, serviceId: serviceId || undefined })
      .then(setSlots)
      .catch(() => {});
  }, [branchId, selectedDate, customerGender, serviceId, slug]);

  const filteredServices = useMemo(() => {
    if (!categoryId) return services;
    return services.filter(s => s.category?.id === categoryId);
  }, [services, categoryId]);

  const selectedService = services.find(s => s.id === serviceId);
  const selectedServiceDoctors = selectedService?.doctors || [];
  const servicePrice = selectedService?.basePrice || selectedService?.packages?.[0]?.price;

  const handleNextToSlots = () => {
    if (!branchId) { setError("اختر الفرع"); return; }
    if (!customerName.trim()) { setError("أدخل الاسم"); return; }
    if (!customerPhone.trim()) { setError("أدخل رقم الجوال"); return; }
    if (!customerGender) { setError("اختر الجنس"); return; }
    if (doctorId && selectedServiceDoctors.length > 0 && !selectedServiceDoctors.some(d => d.id === doctorId)) {
      setError("هذا الطبيب لا يقدم هذه الخدمة"); return;
    }
    setError(""); setStep("slots");
  };

  const handleConfirm = async () => {
    if (!selectedSlot) { setError("اختر الوقت"); return; }
    setSubmitting(true); setError("");
    try {
      const res = await apiClient.post<ApiResponse<any>>("/public/booking/appointments", {
        slug, branchId, serviceId: serviceId || undefined, doctorId: doctorId || undefined,
        customerName, customerPhone, customerGender,
        appointmentDate: selectedDate, startTime: selectedSlot,
      });
      if (res.data.success) {
        setBookingResult(res.data.data);
        setStep("done");
      } else {
        setError(res.data.error || "فشل الحجز");
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || "حدث خطأ في الحجز");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  const branch = branches.find(b => b.id === branchId);
  const genderDays = branch?.genderDays;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50" dir="rtl">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">{companyName || "النظام الطبي"}</h1>
          <p className="text-gray-500 mt-1">حجز موعد</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
        )}

        {step === "form" && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">الفرع</label>
              <select value={branchId} onChange={e => { setBranchId(e.target.value); setServiceId(""); }}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">اختر الفرع</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {services.length > 0 && (
              <div className="space-y-4">
                {categories.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">القسم</label>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => { setCategoryId(""); setServiceId(""); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!categoryId ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                        الكل
                      </button>
                      {categories.map(c => (
                        <button key={c.id} type="button" onClick={() => { setCategoryId(c.id); setServiceId(""); }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${categoryId === c.id ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                          {c.icon && <span className="ml-1">{c.icon}</span>}{c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">الخدمة</label>
                  <select value={serviceId} onChange={e => { setServiceId(e.target.value); setDoctorId(""); }}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="">اختر الخدمة</option>
                    {filteredServices.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.basePrice ? ` — ${s.basePrice} ج.م` : (s.packages?.[0]?.price ? ` — ${s.packages[0].price} ج.م` : "")}
                      </option>
                    ))}
                  </select>
                  {selectedService && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {servicePrice != null && servicePrice > 0 && (
                        <span className="bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-1 font-medium">السعر: {servicePrice} ج.م</span>
                      )}
                      {selectedService.durationMinutes && (
                        <span className="bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">المدة: {selectedService.durationMinutes} دقيقة</span>
                      )}
                      {selectedService.requiresConsultation && (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-1">يتطلب استشارة</span>
                      )}
                    </div>
                  )}
                </div>

                {selectedService && selectedServiceDoctors.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">الطبيب</label>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setDoctorId("")}
                        className={`px-3 py-2 rounded-xl border-2 text-sm transition-colors ${!doctorId ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                        أي طبيب
                      </button>
                      {selectedServiceDoctors.map(d => (
                        <button key={d.id} type="button" onClick={() => setDoctorId(d.id)}
                          className={`px-3 py-2 rounded-xl border-2 text-sm transition-colors ${doctorId === d.id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                          {d.title && <span className="ml-1">{d.title}</span>}{d.name}
                          {d.specialty && <div className="text-xs mt-0.5 text-gray-400">{d.specialty}</div>}
                          {d.fee ? <div className="text-xs mt-0.5 text-green-600">{d.fee} ج.م</div> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم</label>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="الاسم الكامل" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الجوال</label>
              <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="05xxxxxxxx" />
            </div>

            {genderDays && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">الجنس</label>
                <div className="grid grid-cols-2 gap-3">
                  {genderDays.male && genderDays.male.length > 0 && (
                    <button type="button" onClick={() => setCustomerGender("male")}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${customerGender === "male" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                      ذكر
                      <div className="text-xs mt-1 text-gray-400">{genderDays.male.map(d => DAY_LABELS[d]).join(" - ")}</div>
                    </button>
                  )}
                  {genderDays.female && genderDays.female.length > 0 && (
                    <button type="button" onClick={() => setCustomerGender("female")}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${customerGender === "female" ? "border-pink-500 bg-pink-50 text-pink-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                      أنثى
                      <div className="text-xs mt-1 text-gray-400">{genderDays.female.map(d => DAY_LABELS[d]).join(" - ")}</div>
                    </button>
                  )}
                </div>
              </div>
            )}

            <button type="button" onClick={handleNextToSlots}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
              اختيار الوقت
            </button>
          </div>
        )}

        {step === "slots" && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <button onClick={() => setStep("form")} className="text-blue-600 hover:underline">&larr; رجوع</button>
              <span>/</span>
              <span>{branch?.name}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">اختر التاريخ</label>
              <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(""); }}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>

            {selectedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الأوقات المتاحة</label>
                {slots.length === 0 ? (
                  <p className="text-gray-400 text-sm py-4 text-center">لا توجد مواعيد متاحة في هذا اليوم</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.filter(s => s.available).map(slot => (
                      <button key={slot.startTime} type="button" onClick={() => setSelectedSlot(slot.startTime)}
                        className={`p-2.5 rounded-xl border text-sm font-medium transition-all ${selectedSlot === slot.startTime ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                        {slot.startTime}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button type="button" onClick={handleConfirm} disabled={!selectedSlot || submitting}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? "جاري الحجز..." : "تأكيد الحجز"}
            </button>
          </div>
        )}

        {step === "done" && bookingResult && (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">تم الحجز بنجاح</h2>
            <div className="bg-gray-50 rounded-xl p-4 text-right space-y-2 text-sm">
              <p><span className="text-gray-500">الاسم:</span> {bookingResult.customerName}</p>
              <p><span className="text-gray-500">الجوال:</span> {bookingResult.customerPhone}</p>
              <p><span className="text-gray-500">الفرع:</span> {bookingResult.branchName}</p>
              {bookingResult.serviceName && <p><span className="text-gray-500">الخدمة:</span> {bookingResult.serviceName}</p>}
              {bookingResult.doctorName && <p><span className="text-gray-500">الطبيب:</span> {bookingResult.doctorName}</p>}
              <p><span className="text-gray-500">التاريخ:</span> {bookingResult.appointmentDate}</p>
              <p><span className="text-gray-500">الوقت:</span> {bookingResult.startTime}</p>
            </div>
            <p className="text-xs text-gray-400">سيتم التواصل معك لتأكيد الموعد</p>
            <button type="button" onClick={() => {
              setStep("form"); setBranchId(""); setServiceId(""); setCustomerName(""); setCustomerPhone("");
              setCustomerGender(""); setSelectedDate(""); setSelectedSlot(""); setError("");
            }}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
              حجز موعد آخر
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookAppointmentPage;
