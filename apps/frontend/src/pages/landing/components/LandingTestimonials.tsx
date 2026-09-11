import React from "react";
import { Star, Check } from "lucide-react";

export const LandingTestimonials: React.FC = () => {
  const testimonials = [
    {
      name: "أحمد عبد الرحمن",
      role: "مؤسس براند ملابس وأحذية (D2C E-commerce)",
      location: "القاهرة، مصر",
      result: "زيادة 38% في تأكيد أوردرات الواتساب",
      content:
        "كنا بنضيع كمية أوردرات كبيرة عشان خدمة العملاء بتتأخر في الرد على الواتساب بالليل. الربط والتأكيد التلقائي للعنوان فرق جداً في سرعة الشحن ونسبة التسليم مع شركة بوسطة.",
    },
    {
      name: "محمود الصيرفي",
      role: "مدير شركة الصيرفي للتوزيع وتجارة الجملة",
      location: "المنصورة، مصر",
      result: "القضاء التام على عجز جرد المخازن",
      content:
        "المخزن كان مشكلتنا الأزلية بين فروع المحلات والمخزن الرئيسي. الجرد اللحظي بالباركود أنهى مشكلة بيع أصناف غير متوفرة فعلياً ووفر ساعات طويلة في مراجعة الفواتير.",
    },
    {
      name: "د/ ريهام الشناوي",
      role: "المدير التنفيذي — مراكز النخبة الطبية",
      location: "الإسكندرية، مصر",
      result: "توفير 18 ساعة عمل تشغيلي أسبوعياً",
      content:
        "استغنينا عن اشتراكين منفصلين لبرنامج الحسابات والـ CRM. كل حجوزات العيادات وإيرادات الفروع أصبحت في شاشة مركزية واحدة بتقرير يومي يصل للإدارة تلقائياً.",
    },
  ];

  return (
    <section id="testimonials" className="relative py-24 sm:py-36">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Section Heading */}
        <div className="max-w-2xl mb-16 text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-400 text-[11px] font-mono mb-4">
            <span>تجارب حقيقية من السوق</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15] mb-4">
            تجار وشركات يعتمدون
            <br />
            <span className="text-zinc-400 font-normal">على Max P في تشغيل يومهم.</span>
          </h2>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
            كيف تحول التشغيل اليومي في هذه الأنشطة من التشتت والضغط إلى الاستقرار والنمو المنظم.
          </p>
        </div>

        {/* 3-Cards Grid with Double-Bezel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="p-1 rounded-[2.25rem] bg-white/[0.03] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] hover:border-white/20 transition-all duration-500 flex flex-col justify-between"
            >
              <div className="rounded-[calc(2.25rem-0.25rem)] bg-zinc-950 p-6 sm:p-7 h-full flex flex-col justify-between space-y-6">
                <div>
                  {/* Result Metric */}
                  <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 rounded-full mb-6">
                    <Check className="w-3.5 h-3.5" />
                    <span>{t.result}</span>
                  </div>

                  {/* Body Quote */}
                  <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed mb-6 font-sans">
                    "{t.content}"
                  </p>
                </div>

                {/* Author Info */}
                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                  <div>
                    <div className="font-bold text-white font-sans text-sm">{t.name}</div>
                    <div className="text-[11px] text-zinc-400">{t.role}</div>
                  </div>
                  <div className="text-[10px] text-zinc-400">{t.location}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
