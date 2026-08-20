import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { BookingDoctorDetail, STATUS_MAP, api, getAuthHeaders } from "./shared";

const fmtMoney = (n?: number) => (n != null ? `${Number(n).toFixed(2)} ج.م` : "—");

const WEEKDAY_NAMES = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function DoctorDetailPage({ doctorId }: { doctorId?: string }) {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<BookingDoctorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doctorId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(api(`doctors/${doctorId}`), { headers: getAuthHeaders() });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "فشل التحميل");
        if (!cancelled) setDoctor(json.data);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "خطأ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [doctorId]);

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full h-full overflow-y-auto" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/booking/doctors")} className="p-2 border dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" title="رجوع"><ArrowRightIcon className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ملف الطبيب</h1>
            {doctor && <p className="text-sm text-gray-500 dark:text-gray-400">{doctor.title} {doctor.name} · {doctor.specialty}</p>}
          </div>
        </div>
        {doctor && (
          <div className="flex gap-2">
            <button onClick={() => navigate("/admin/booking/doctors")} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">تعديل</button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-center py-16 text-gray-400 dark:text-gray-500">جاري التحميل...</p>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => navigate("/admin/booking/doctors")} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">العودة للأطباء</button>
        </div>
      ) : doctor ? (
        <div className="space-y-6 max-w-5xl">
          {/* Profile card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
            <div className="flex items-center gap-4 md:col-span-1">
              {doctor.avatarUrl ? (
                <img src={doctor.avatarUrl} alt={doctor.name} className="w-20 h-20 rounded-full object-cover border dark:border-gray-600" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-2xl font-bold">
                  {(doctor.name || "؟").charAt(0)}
                </div>
              )}
              <div>
                <p className="text-lg font-bold">{doctor.title} {doctor.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{doctor.specialty || "—"}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${doctor.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>{doctor.isActive ? "نشط" : "غير نشط"}</span>
              </div>
            </div>
            <div className="text-sm space-y-1.5 md:col-span-2">
              <p>🏥 الفرع: {doctor.branchName || "—"}</p>
              {doctor.phone && <p dir="ltr">📞 {doctor.phone}</p>}
              {doctor.email && <p dir="ltr" className="text-xs text-gray-500 dark:text-gray-400">✉️ {doctor.email}</p>}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2"><p className="text-xs text-gray-500 dark:text-gray-400">رسوم الكشف</p><p className="font-semibold">{fmtMoney(doctor.consultationFee)}</p></div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2"><p className="text-xs text-gray-500 dark:text-gray-400">نسبة العمولة</p><p className="font-semibold">{doctor.commissionRate != null ? `${doctor.commissionRate}%` : "—"}</p></div>
              </div>
              {doctor.bio && <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">{doctor.bio}</p>}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">إجمالي المواعيد</p>
              <p className="text-xl font-bold">{doctor.stats?.total ?? 0}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">مواعيد اليوم</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{doctor.stats?.today ?? 0}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">مواعيد قادمة</p>
              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{doctor.stats?.upcoming ?? 0}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">مكتملة</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{doctor.stats?.completed ?? 0}</p>
            </div>
          </div>

          {/* Performance + financial */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
              <h4 className="font-bold mb-3">تحليل الأداء</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>نسبة الحضور</span><span className="font-semibold text-gray-700 dark:text-gray-200">{doctor.stats?.attendanceRate ?? 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, doctor.stats?.attendanceRate ?? 0)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>نسبة عدم الحضور</span><span className="font-semibold text-gray-700 dark:text-gray-200">{doctor.stats?.noShowRate ?? 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, doctor.stats?.noShowRate ?? 0)}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2"><p className="text-xs text-gray-500 dark:text-gray-400">مكتملة</p><p className="font-bold text-green-600 dark:text-green-400">{doctor.stats?.completed ?? 0}</p></div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2"><p className="text-xs text-gray-500 dark:text-gray-400">قيد الانتظار</p><p className="font-bold text-yellow-600 dark:text-yellow-400">{doctor.stats?.pending ?? 0}</p></div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2"><p className="text-xs text-gray-500 dark:text-gray-400">ملغي</p><p className="font-bold text-red-500">{doctor.stats?.cancelled ?? 0}</p></div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2"><p className="text-xs text-gray-500 dark:text-gray-400">لم يحضر</p><p className="font-bold text-gray-500">{doctor.stats?.noShow ?? 0}</p></div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
              <h4 className="font-bold mb-3">الأداء المالي</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><p className="text-xs text-gray-500 dark:text-gray-400">إجمالي المطالب</p><p className="font-bold text-lg">{fmtMoney(doctor.stats?.totalBilled)}</p></div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><p className="text-xs text-gray-500 dark:text-gray-400">المحصل</p><p className="font-bold text-lg text-green-600 dark:text-green-400">{fmtMoney(doctor.stats?.collected)}</p></div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><p className="text-xs text-gray-500 dark:text-gray-400">الخصومات</p><p className="font-bold text-lg text-gray-500">{fmtMoney(doctor.stats?.discounts)}</p></div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><p className="text-xs text-gray-500 dark:text-gray-400">المتبقي</p><p className="font-bold text-lg text-red-600 dark:text-red-400">{fmtMoney(doctor.stats?.outstanding)}</p></div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 col-span-2"><p className="text-xs text-gray-500 dark:text-gray-400">عمولة الطبيب المستحقة ({doctor.commissionRate != null ? `${doctor.commissionRate}%` : "—"})</p><p className="font-bold text-lg text-purple-600 dark:text-purple-400">{fmtMoney(doctor.stats?.commission)}</p></div>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
            <h4 className="font-bold mb-3">الخدمات المقدمة ({doctor.services?.length || 0})</h4>
            {(!doctor.services || doctor.services.length === 0) ? (
              <p className="text-center py-6 text-gray-400 dark:text-gray-500">لا توجد خدمات مرتبطة</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {doctor.services.map(s => (
                  <span key={s.id} className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-lg text-sm border border-purple-100 dark:border-purple-800">
                    {s.name}
                    <span className="text-xs text-purple-400 dark:text-purple-400 mr-1.5">{s.fee != null ? `رسومه: ${fmtMoney(s.fee)}` : (s.basePrice != null ? fmtMoney(s.basePrice) : "")}</span>
                    {s.durationMinutes ? <span className="text-xs text-purple-400 mr-1.5">{s.durationMinutes} د</span> : null}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Availability - weekly table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
            <h4 className="font-bold mb-3">مواعيد العمل</h4>
            {(!doctor.availability || doctor.availability.length === 0) ? (
              <p className="text-center py-6 text-gray-400 dark:text-gray-500">لم يتم ضبط مواعيد العمل — يجب إضافة الأيام والساعات حتى يظهر للطبيب في الحجز</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {WEEKDAY_NAMES.map((dayName, idx) => {
                  const slot = (doctor.availability || []).find(a => a.dayOfWeek === idx && a.isAvailable);
                  return (
                    <div key={idx} className={`rounded-lg border p-2.5 text-center ${slot ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{dayName}</p>
                      {slot ? (
                        <p className="text-sm font-bold text-green-700 dark:text-green-300" dir="ltr">{slot.startTime} - {slot.endTime}</p>
                      ) : (
                        <p className="text-xs text-gray-400">راحة</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Today's appointments */}
          {doctor.todayAppointments && doctor.todayAppointments.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
              <h4 className="font-bold mb-3 text-blue-600 dark:text-blue-400">مواعيد اليوم ({doctor.todayAppointments.length})</h4>
              <div className="space-y-2">
                {doctor.todayAppointments.map(a => (
                  <div key={a.id} className="flex items-center justify-between border dark:border-gray-700 rounded-lg px-3 py-2 text-sm">
                    <span className="font-medium">{a.startTime} — {a.customerName}</span>
                    <span className="text-xs text-gray-500">{a.serviceName || "—"}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_MAP[a.status]?.color || ""}`}>{STATUS_MAP[a.status]?.label || a.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appointments - upcoming & past */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
            <h4 className="font-bold mb-3">المواعيد ({doctor.appointments?.length || 0})</h4>
            {(!doctor.appointments || doctor.appointments.length === 0) ? (
              <p className="text-center py-8 text-gray-400 dark:text-gray-500">لا توجد مواعيد</p>
            ) : (
              <>
                {doctor.upcomingAppointments && doctor.upcomingAppointments.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 mb-2">القادمة</p>
                    <table className="w-full text-sm">
                      <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">{["المريض", "التاريخ", "الوقت", "الفرع", "الخدمة", "الحالة", "الدفع"].map(h => <th key={h} className="text-right py-2.5 px-3">{h}</th>)}</tr></thead>
                      <tbody>{doctor.upcomingAppointments.map(a => (
                        <tr key={a.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="py-2.5 px-3 font-medium">{a.customerName}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{a.appointmentDate}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{a.startTime}</td>
                          <td className="py-2.5 px-3">{a.branchName || "—"}</td>
                          <td className="py-2.5 px-3">{a.serviceName || "—"}</td>
                          <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_MAP[a.status]?.color || ""}`}>{STATUS_MAP[a.status]?.label || a.status}</span></td>
                          <td className="py-2.5 px-3 text-xs">{a.paymentStatus ? (a.paymentStatus === "paid" ? "مدفوع" : a.paymentStatus === "partial" ? "جزئي" : "غير مدفوع") : "—"}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
                {doctor.pastAppointments && doctor.pastAppointments.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-2">السابقة</p>
                    <table className="w-full text-sm">
                      <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">{["المريض", "التاريخ", "الوقت", "الفرع", "الخدمة", "التشخيص", "الحالة", "الدفع"].map(h => <th key={h} className="text-right py-2.5 px-3">{h}</th>)}</tr></thead>
                      <tbody>{doctor.pastAppointments.map(a => (
                        <tr key={a.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="py-2.5 px-3 font-medium">{a.customerName}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{a.appointmentDate}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{a.startTime}</td>
                          <td className="py-2.5 px-3">{a.branchName || "—"}</td>
                          <td className="py-2.5 px-3">{a.serviceName || "—"}</td>
                          <td className="py-2.5 px-3 max-w-[180px] truncate" title={a.diagnosis || ""}>{a.diagnosis || "—"}</td>
                          <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_MAP[a.status]?.color || ""}`}>{STATUS_MAP[a.status]?.label || a.status}</span></td>
                          <td className="py-2.5 px-3 text-xs">{a.paymentStatus ? (a.paymentStatus === "paid" ? "مدفوع" : a.paymentStatus === "partial" ? "جزئي" : "غير مدفوع") : "—"}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
