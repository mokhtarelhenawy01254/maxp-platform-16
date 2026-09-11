import React from "react";
import { Star, Quote, TrendingUp, Building, ShieldCheck } from "lucide-react";

export const LandingTestimonials: React.FC = () => {
  const testimonials = [
    {
      name: "م/ أحمد عبد الرحمن",
      role: "مؤسس براند كوتشي ستور (تجارة إلكترونية)",
      location: "القاهرة، مصر",
      avatar: "أ",
      stars: 5,
      metric: "+42% زيادة في تأكيد الطلبات",
      metricColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      content:
        "كنا بنضيع كمية أوردرات غير طبيعية بسبب تأخر موظفي خدمة العملاء في الرد على الواتساب بالليل. بعد تفعيل MaxP، البوت بيأكد الأوردر والعنوان فوراً وبدون أي غلطة، وفرق جداً في كفاءة الشحن.",
    },
    {
      name: "د/ ريهام الشناوي",
      role: "المدير التنفيذي — مراكز النخبة الطبية",
      location: "الإسكندرية، مصر",
      avatar: "ر",
      stars: 5,
      metric: "توفير 22 ساعة عمل أسبوعياً",
      metricColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      content:
        "المنظومة ربطت حجوزات المرضى من الإعلانات مباشرة بجدول الأطباء واستقبال العيادات. وفرنا اشتراك برنامج الـ CRM وبرنامج المحاسبة، وبقى عندنا تقرير لحظي لكل فرع بدون مجهود.",
    },
    {
      name: "أ/ محمود الصيرفي",
      role: "مدير شركة الصيرفي للتوزيع وتجارة الجملة",
      location: "المنصورة، مصر",
      avatar: "م",
      stars: 5,
      metric: "صفر عجز في جرد المخازن",
      metricColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      content:
        "المخازن والموردين كانوا صداع يومي. الربط بين فواتير الشراء والمديونيات وجرد الباركود أنهى مشاكل سرقة البضاعة والعجز اللي كنا بنكتشفه في نهاية كل سنة.",
    },
  ];

  return (
    <section id="testimonials" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>قصص نجاح وإثبات واقعي</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
            شركات رائدة تعتمد على Max P
            <br />
            <span className="bg-gradient-to-r from-red-500 to-amber-400 bg-clip-text text-transparent">
              في إدارة وتشغيل أعمالها يومياً
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-300">
            شاهد كيف تحول تشغيل هذه الشركات من الفوضى اليدوية إلى النمو المؤتمت والمستقر.
          </p>
        </div>

        {/* Testimonials 3-Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="rounded-3xl bg-slate-900/80 border border-white/10 hover:border-white/20 p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50"
            >
              <div>
                {/* Metric Badge */}
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mb-5 ${t.metricColor}`}>
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{t.metric}</span>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-1 mb-4 text-amber-400">
                  {[...Array(t.stars)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>

                {/* Quote Text */}
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
                  "{t.content}"
                </p>
              </div>

              {/* Author Info */}
              <div className="flex items-center gap-3 pt-5 border-t border-white/10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-600 to-amber-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {t.avatar}
                </div>
                <div>
                  <div className="font-bold text-white text-xs sm:text-sm">{t.name}</div>
                  <div className="text-[11px] text-slate-400">{t.role}</div>
                  <div className="text-[10px] text-slate-500">{t.location}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
