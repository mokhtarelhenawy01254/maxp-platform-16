import React, { useState } from 'react';
import { CheckCircle2, Sparkles, Send, Box, ShieldCheck, Truck, FileText, Stethoscope } from 'lucide-react';

interface DentalSampleKitProps {
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
  };
}

export const DentalSampleKit: React.FC<DentalSampleKitProps> = ({ settings }) => {
  const [formData, setFormData] = useState({
    doctorName: '',
    clinicName: '',
    phone: '',
    city: '',
    scannerType: '3Shape TRIOS',
    primaryInterest: 'زيركون متعدد الطبقات 5Y-PSZ',
  });

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doctorName || !formData.phone) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 700);
  };

  return (
    <section id="dental-kit" className="relative py-20 px-4 sm:px-6 bg-[#040711] overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 -left-48 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-24 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="mx-auto max-w-6xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left / Info Column */}
          <div className="lg:col-span-6 space-y-6 text-right" dir="rtl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1.5 text-xs font-semibold text-cyan-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>{settings?.badge || 'خدمة مخصصة لعيادات وأطباء الأسنان'}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              {settings?.title || 'طلب كيت عينات مجاني للعيادة'}
            </h2>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {settings?.subtitle ||
                'نرسل لعيادتك كيت متكامل يحتوي على نماذج حقيقية لمواد الزيركون خماسي الطبقات 5Y-PSZ، وعدسات الإيماكس، ومسار التواصل الرقمي المباشر بدون أي تكلفة لشحن الكيت.'}
            </p>

            {/* Feature Bullets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 backdrop-blur-sm">
                <Box className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-white">نماذج زيركون وإيماكس حقيقية</h4>
                  <p className="text-xs text-slate-400 mt-0.5">لمس الحواف ومعاينة الشفافية والصلابة سريرياً</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 backdrop-blur-sm">
                <ShieldCheck className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-white">شهادات مطابقة ISO 13485</h4>
                  <p className="text-xs text-slate-400 mt-0.5">ضمان استبدال وإعادة تصنيع 5 سنوات معتمد</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 backdrop-blur-sm">
                <FileText className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-white">دليل إعداد مسحات STL/PLY</h4>
                  <p className="text-xs text-slate-400 mt-0.5">بروتوكول تحضير الحواف لتقليل جلسات التعديل</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 backdrop-blur-sm">
                <Truck className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-white">شحن طبي معقم وسريع</h4>
                  <p className="text-xs text-slate-400 mt-0.5">توصيل للعيادة خلال 24-48 ساعة لجميع المحافظات</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right / Interactive Form */}
          <div className="lg:col-span-6" dir="rtl">
            <div className="relative rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-[#091122]/90 to-[#050814]/95 p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(6,182,212,0.2)] backdrop-blur-xl">
              {submitted ? (
                <div className="text-center py-10 space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-400 animate-bounce">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-white">تم استلام طلب الكيت بنجاح!</h3>
                  <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                    شكراً د. <span className="text-cyan-300 font-bold">{formData.doctorName}</span>. سيتواصل معك ممثل العلاقات السريرية لتأكيد عنوان العيادة وترتيب شحن كيت العينات مجاناً.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-4 inline-flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-semibold"
                  >
                    تقديم طلب آخر لفرع عيادة ثانٍ
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="border-b border-slate-800 pb-3 mb-2">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-cyan-400" />
                      <span>بيانات الطبيب والعيادة لاستلام الكيت</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      الكيت مجاني 100% ويصلكم في تغليف طبي معقم
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        اسم الطبيب *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="د. أحمد الشناوي"
                        value={formData.doctorName}
                        onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        اسم العيادة / المركز
                      </label>
                      <input
                        type="text"
                        placeholder="مركز النخبة لطب الأسنان"
                        value={formData.clinicName}
                        onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        رقم الهاتف / واتساب *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="01012345678"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        المدينة / المحافظة
                      </label>
                      <input
                        type="text"
                        placeholder="القاهرة - التجمع الخامس"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        نوع الماسح الرقمي (Scanner)
                      </label>
                      <select
                        value={formData.scannerType}
                        onChange={(e) => setFormData({ ...formData, scannerType: e.target.value })}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/90 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                      >
                        <option value="3Shape TRIOS">3Shape TRIOS</option>
                        <option value="Medit i700 / i600">Medit i700 / i600</option>
                        <option value="iTero Element">iTero Element</option>
                        <option value="CEREC Primescan">CEREC Primescan</option>
                        <option value="Carestream / Shining3D">Carestream / Shining3D</option>
                        <option value="لا يوجد - مقاسات سيليكون تقليدية">لا يوجد - مقاسات سيليكون تقليدية</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        الحالات الأكثر اهتماماً بها
                      </label>
                      <select
                        value={formData.primaryInterest}
                        onChange={(e) => setFormData({ ...formData, primaryInterest: e.target.value })}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/90 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                      >
                        <option value="زيركون متعدد الطبقات 5Y-PSZ">زيركون متعدد الطبقات 5Y-PSZ</option>
                        <option value="عدسات وفينير IPS e.max">عدسات وفينير IPS e.max</option>
                        <option value="دعامات زراعة مخصصة Titanium">دعامات زراعة مخصصة Titanium</option>
                        <option value="أطقم هجينة All-on-4 / All-on-6">أطقم هجينة All-on-4 / All-on-6</option>
                        <option value="أدلة جراحية Surgical Guides">أدلة جراحية Surgical Guides</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-3 inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 py-3.5 px-6 font-bold text-slate-950 shadow-[0_12px_30px_-8px_rgba(6,182,212,0.5)] transition-all hover:scale-[1.01] hover:shadow-[0_16px_36px_-6px_rgba(6,182,212,0.6)] active:scale-[0.99] disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="text-sm">جاري تسجيل طلب الكيت...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span className="text-sm">تأكيد إرسال الكيت المجاني للعيادة</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DentalSampleKit;
