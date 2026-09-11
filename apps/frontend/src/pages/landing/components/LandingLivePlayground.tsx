import React, { useState } from "react";
import {
  Sparkles,
  MessageCircle,
  Truck,
  Barcode,
  Send,
  Printer,
  Check,
  RotateCcw,
  ArrowLeft,
  Store,
} from "lucide-react";
import { Link } from "react-router-dom";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";

export const LandingLivePlayground: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"whatsapp" | "bosta" | "barcode">("whatsapp");

  // WhatsApp simulation state
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  const WHATSAPP_PROMPTS = [
    {
      q: "مساء الخير، متاح كوتشي أسود مقاس 43؟",
      reply: "أهلاً بحضرتك يا فندم! نعم متاح 15 قطعة مقاس 43 أسود جلد طبيعي بسعر 850 ج.م وجاهز للشحن الفوري. تحب نسجل الأوردر مع بوسطة بـ 45 ج؟",
    },
    {
      q: "الشحن لمصر الجديدة بياخد قد إيه؟ ومتاح معاينة؟",
      reply: "التوصيل لمصر الجديدة خلال 24 ساعة فقط، ومتاح المعاينة والقياس مع مندوب بوسطة قبل الدفع بالكامل لضمان راحة حضرتك.",
    },
    {
      q: "لو طلبت قطعتين في خصم ولا شحن مجاني؟",
      reply: "لحضرتك خصم 10% فوري مع شحن مجاني تماماً لو طلبت قطعتين اليوم! إجمالي الحساب 1,530 ج.م بدلاً من 1,790 ج.م. أسجل لحضرتك؟",
    },
  ];

  const handleSelectQuestion = (idx: number) => {
    setSelectedQuestion(idx);
    setIsTyping(true);
    setAiAnswer(null);

    setTimeout(() => {
      setIsTyping(false);
      setAiAnswer(WHATSAPP_PROMPTS[idx].reply);
    }, 900);
  };

  // Bosta Waybill simulation state
  const [isGeneratingWaybill, setIsGeneratingWaybill] = useState(false);
  const [waybillIssued, setWaybillIssued] = useState(false);

  const handleGenerateWaybill = () => {
    setIsGeneratingWaybill(true);
    setTimeout(() => {
      setIsGeneratingWaybill(false);
      setWaybillIssued(true);
    }, 800);
  };

  // Barcode simulation state
  const [stockItem, setStockItem] = useState({
    nasrCity: 14,
    mainWarehouse: 62,
    onlineStore: 14,
    scansCount: 0,
  });

  const handleScanBarcode = () => {
    if (stockItem.nasrCity <= 1) return;
    setStockItem((prev) => ({
      nasrCity: prev.nasrCity - 1,
      mainWarehouse: prev.mainWarehouse,
      onlineStore: prev.nasrCity - 1,
      scansCount: prev.scansCount + 1,
    }));
  };

  const handleResetScan = () => {
    setStockItem({
      nasrCity: 14,
      mainWarehouse: 62,
      onlineStore: 14,
      scansCount: 0,
    });
  };

  return (
    <section id="playground" className="relative py-24 sm:py-32 border-t border-white/[0.06] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Open Section Header */}
        <div className="max-w-3xl mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">
            <Sparkles className="w-4 h-4" />
            <span>ملعب التجربة الحية • Interactive Playground</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            لا تصدق الكلام الإنشائي...
            <br />
            <span className="text-zinc-400 font-normal">جرّب قوة النظام بيدك الآن.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
            اختر واحدة من التجارب التفاعلية أدناه وشاهد كيف ينفذ MaxP المهام الحقيقية في ثوانٍ معدودة.
          </p>
        </div>

        {/* Playground Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none border-b border-white/[0.06]">
          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "whatsapp"
                ? "bg-white text-black shadow-lg shadow-white/10"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <MessageCircle className="w-4 h-4 text-emerald-500" />
            <span>1. رد الواتساب الذكي</span>
          </button>

          <button
            onClick={() => setActiveTab("bosta")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "bosta"
                ? "bg-white text-black shadow-lg shadow-white/10"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <Truck className="w-4 h-4 text-red-500" />
            <span>2. إصدار بوليصة بوسطة</span>
          </button>

          <button
            onClick={() => setActiveTab("barcode")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "barcode"
                ? "bg-white text-black shadow-lg shadow-white/10"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <Barcode className="w-4 h-4 text-amber-500" />
            <span>3. جرد الباركود متعدد الفروع</span>
          </button>
        </div>

        {/* Playground Stage (Single Depth Surface) */}
        <div className="p-6 sm:p-10 rounded-2xl bg-[#09090b] border border-white/[0.08] relative">
          
          {/* TAB 1: WhatsApp AI Agent Simulation */}
          {activeTab === "whatsapp" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5 space-y-4">
                <span className="text-xs font-mono text-emerald-400 block">
                  جرّب سؤالاً من أسئلة العملاء اليومية:
                </span>
                <div className="space-y-2.5">
                  {WHATSAPP_PROMPTS.map((p, idx) => (
                    <button
                      key={p.q}
                      onClick={() => handleSelectQuestion(idx)}
                      className={`w-full text-right p-3.5 rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                        selectedQuestion === idx
                          ? "bg-emerald-950/40 border-emerald-500 text-white"
                          : "bg-white/[0.02] border-white/[0.06] text-zinc-300 hover:border-white/20"
                      }`}
                    >
                      <span>💬 "{p.q}"</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-500">
                  * اضغط على أي استفسار لرؤية رد الذكاء الاصطناعي الفعلي في ثوانٍ.
                </p>
              </div>

              {/* Chat Output Window */}
              <div className="lg:col-span-7 p-5 rounded-xl bg-zinc-950 border border-white/[0.06] min-h-[260px] flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] text-xs">
                    <span className="text-zinc-400 font-mono">واتساب بيزنس رسمي (Cloud API)</span>
                    <span className="text-emerald-400 font-bold">متصل لايف</span>
                  </div>

                  {selectedQuestion !== null ? (
                    <>
                      {/* Customer Message */}
                      <div className="p-3 rounded-lg bg-zinc-900 text-zinc-200 text-xs w-max max-w-[85%]">
                        {WHATSAPP_PROMPTS[selectedQuestion].q}
                      </div>

                      {/* AI Typing or Response */}
                      {isTyping && (
                        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs w-max flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                          <span>الـ AI يفحص المخزن ويجهز الرد...</span>
                        </div>
                      )}

                      {aiAnswer && (
                        <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-zinc-100 text-xs sm:text-sm leading-relaxed max-w-[95%]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-emerald-400 text-xs">MaxP AI Agent</span>
                            <span className="text-[10px] text-zinc-400 font-mono">تم الرد في 1.6s</span>
                          </div>
                          <p>{aiAnswer}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-12 text-center text-zinc-500 text-xs">
                      اختر استفساراً من القائمة الجانبية لبدء المحاكاة الحية.
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400">
                  <span>يفحص المقاسات والأسعار من قاعدة البيانات مباشرة</span>
                  <span className="text-emerald-400 font-mono font-bold">0 شيتات إكسيل</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Bosta Waybill Instant Generation */}
          {activeTab === "bosta" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="text-xs font-mono text-red-400 block">
                  إصدار بوالص الشحن بنقرة واحدة (Turbo)
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  لا مزيد من النسخ واللصق في مواقع شركات الشحن
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  بمجرد تأكيد الأوردر، ضغطة زر واحدة تنشئ البوليصة مع بوسطة، وتطبع الباركود، وترسل رقم التتبع للعميل على الواتساب تلقائياً.
                </p>

                <button
                  onClick={handleGenerateWaybill}
                  disabled={isGeneratingWaybill}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isGeneratingWaybill ? "جارٍ إصدار البوليصة مع بوسطة..." : "إصدار بوليصة شحن تجريبية"}</span>
                </button>
              </div>

              {/* Waybill Render View */}
              <div className="lg:col-span-7 p-6 rounded-xl bg-zinc-950 border border-white/[0.08] relative">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-red-600 text-white font-black text-xs">BOSTA</span>
                    <span className="text-xs text-zinc-400 font-mono">Bosta Shipping Gateway</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">
                    {waybillIssued ? "تم إصدار البوليصة بنجاح ✓" : "في انتظار الضغط"}
                  </span>
                </div>

                {waybillIssued ? (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-zinc-900 border border-white/[0.05]">
                      <div>
                        <span className="text-zinc-500 block text-[10px]">رقم التتبع Tracking #</span>
                        <span className="text-white font-bold">BST-89240182</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px]">التحصيل عند الاستلام (COD)</span>
                        <span className="text-emerald-400 font-bold">850.00 ج.م</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-900 border border-white/[0.05]">
                      <span className="text-zinc-500 block text-[10px] mb-1">العميل والعنوان</span>
                      <span className="text-white block font-sans font-bold">أحمد سامي — 01029384756</span>
                      <span className="text-zinc-400 text-[11px] font-sans">القاهرة • مدينة نصر • شارع مكرم عبيد</span>
                    </div>

                    <div className="p-2.5 rounded bg-white text-black text-center font-bold tracking-widest text-sm">
                      ||| | |||| | ||| ||||| | |||
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-zinc-500 text-xs">
                    اضغط على زر "إصدار بوليصة شحن تجريبية" لترى كيف يولد MaxP البوليصة في 0.8 ثانية.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Multi-Branch Barcode Inventory Sync */}
          {activeTab === "barcode" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="text-xs font-mono text-amber-400 block">
                  جرد الباركود اللحظي متعدد الفروع (Zero Overselling)
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  بيع من المحل... ينخصم من المتجر في نفس اللحظة
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  اضغط على زر "مسح باركود وبيعه من الفرع" وشاهد كيف ينخصم الرصيد تلقائياً من فرع مدينة نصر ويتحدث المتجر الإلكتروني فوراً لمنع بيع نفس القطعة مرتين.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleScanBarcode}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs sm:text-sm transition-all cursor-pointer"
                  >
                    <Barcode className="w-4 h-4" />
                    <span>مسح باركود (بيع قطعة من الفرع)</span>
                  </button>

                  <button
                    onClick={handleResetScan}
                    aria-label="إعادة تعيين الرصيد"
                    className="w-10 h-10 rounded-full border border-white/10 hover:border-white/30 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stock Dashboard Sync */}
              <div className="lg:col-span-7 p-6 rounded-xl bg-zinc-950 border border-white/[0.08]">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
                  <span className="text-xs font-bold text-white">موديل: SH-BLK-43 (كوتشي جلد أسود)</span>
                  <span className="text-xs font-mono text-zinc-400">مرات البيع: {stockItem.scansCount}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-zinc-900 border border-amber-500/30 text-center">
                    <span className="text-[10px] text-zinc-400 block mb-1">فرع مدينة نصر (محل)</span>
                    <span className="text-2xl font-black font-mono text-amber-400">{stockItem.nasrCity}</span>
                    <span className="text-[10px] text-zinc-500 block mt-1">كاشير POS مباشر</span>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900 border border-white/[0.06] text-center">
                    <span className="text-[10px] text-zinc-400 block mb-1">المتجر الإلكتروني لايف</span>
                    <span className="text-2xl font-black font-mono text-blue-400">{stockItem.onlineStore}</span>
                    <span className="text-[10px] text-zinc-500 block mt-1">متزامن بالثانية</span>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900 border border-white/[0.06] text-center">
                    <span className="text-[10px] text-zinc-400 block mb-1">المخزن الرئيسي (العبور)</span>
                    <span className="text-2xl font-black font-mono text-emerald-400">{stockItem.mainWarehouse}</span>
                    <span className="text-[10px] text-zinc-500 block mt-1">جاهز لأوامر التحويل</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
                  <span>تم التزامن عبر بروتوكول MaxP Cloud Broker</span>
                  <span className="text-emerald-400 font-mono">0 ثوانٍ تأخير</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
};

export default LandingLivePlayground;
