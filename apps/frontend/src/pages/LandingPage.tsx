import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { marketingSections } from "./landing/marketingLandingData";
import "./landing/platformLanding.css";

const LandingPage: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [activeModule, setActiveModule] = useState<string>("crm");
  const [revenue, setRevenue] = useState(100000);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const savings = useMemo(() => {
    return {
      time: Math.round(revenue * 0.0005), // Arbitrary calc
      money: Math.round(revenue * 0.15)
    };
  }, [revenue]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.6 } }
  };

  return (
    <div className="premium-landing" dir="rtl">
      {/* Ambient background */}
      <div className="ambient-bg" />

      {/* Navigation */}
      <nav className={`premium-nav ${scrolled ? "is-scrolled" : ""}`}>
        <Link to="/" className="premium-brand">
          <div className="brand-badge">MAX P</div>
          <span>BUSINESS OS</span>
        </Link>
        <div className="nav-links">
          <a href="#tools" className="nav-link">الأدوات</a>
          <a href="#modules" className="nav-link">المنصة</a>
          <a href="#industries" className="nav-link">القطاعات</a>
          <a href="#comparison" className="nav-link">لماذا نحن؟</a>
          <a href="#testimonials" className="nav-link">العملاء</a>
          <a href="#faq" className="nav-link">الأسئلة الشائعة</a>
        </div>
        <div className="nav-actions">
          <Link to="/auth/login" className="nav-link ml-6">دخول</Link>
          <Link to="/auth/register" className="btn-primary">ابدأ مجاناً</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="premium-container pt-32">
        <motion.div 
          className="hero-content"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <div className="hero-text">
            <motion.div variants={itemVariants} className="premium-kicker">
              <span>BUSINESS OS — منصة تشغيل متكاملة</span>
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="hero-title">
              كل أدوات إدارة<br />
              <span className="premium-emphasis">شركتك في نظام واحد</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="hero-lead">
              مش محتاج 10 أنظمة منفصلة عشان تدير شركتك. Max P يلمّ المبيعات، المحادثات، المخازن، الموارد البشرية، والتسويق في نظام واحد — باشتراك واحد يبدأ من 299 جنيه/شهر.
            </motion.p>

            <motion.div variants={itemVariants} className="hero-actions">
              <Link to="/auth/register" className="btn-primary px-10">ابدأ التشغيل الآن</Link>
              <a href="#tools" className="btn-secondary">استعرض الأدوات</a>
            </motion.div>
          </div>

          <motion.div variants={itemVariants} className="hero-visual">
            <div className="elite-card relative overflow-hidden p-0 border-white/10 shadow-2xl">
              <div className="bg-slate-900/80 p-6 border-b border-white/5 flex justify-between items-center">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                </div>
                <div className="text-[10px] text-slate-500" style={{fontFamily:'var(--font-english)'}}>Max P Business OS</div>
              </div>
              <div className="p-8 bg-slate-950">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border" style={{background:'rgba(184,26,26,0.1)', borderColor:'rgba(184,26,26,0.2)'}}>
                      <div className="text-[10px] font-bold text-blue-400 mb-2 uppercase">Recent Lead</div>
                      <div className="text-sm font-bold">Mokhtar Elhenawy</div>
                      <div className="text-xs text-slate-500 mt-1">Source: WhatsApp • Status: Hot</div>
                    </div>
                    <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                      <div className="text-[10px] font-bold text-emerald-400 mb-2 uppercase">Live Sale</div>
                      <div className="text-sm font-bold">EGP 12,450.00</div>
                      <div className="text-xs text-slate-500 mt-1">Order #8829 • Verified</div>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                    <div className="text-[10px] font-bold text-slate-400 mb-4 uppercase">Sales Pulse</div>
                    <div className="h-32 flex items-end gap-2">
                      {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                        <motion.div 
                          key={i} 
                          className="flex-1 rounded-t-sm" style={{background:'rgba(184,26,26,0.25)'}} 
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ delay: i * 0.1, duration: 1 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </header>

      {/* Trust Bar */}
      <div className="trust-bar">
        <div className="trust-track">
          {[
            "FACEBOOK", "WHATSAPP", "GOOGLE", "SHOPIFY",
            "STRIPE", "TELEGRAM", "TIKTOK", "INSTAGRAM",
            "FACEBOOK", "WHATSAPP", "GOOGLE", "SHOPIFY",
            "STRIPE", "TELEGRAM", "TIKTOK", "INSTAGRAM"
          ].map((name, i) => (
            <div key={i} className="trust-logo">
              <span className="trust-pill">{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tools Showcase */}
      <motion.section 
        id="tools" 
        className="premium-section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
      >
        <div className="premium-container">
          <div className="section-head text-center">
            <span className="premium-kicker">20 أداة في اشتراك واحد</span>
            <h2 className="section-title">20 أداة — مش 20 اشتراك منفصل</h2>
            <p className="section-lead">كل حاجة في مكان واحد وبتكلم بعضها: مبيعات، مخازن، HR، تسويق، مشاريع، وأتمتة تشغيلية</p>
          </div>

          <div className="tools-grid">
            {[
              { cat: "المبيعات والتواصل", items: [
                { name: "محادثات واتساب", desc: "ردود آلية وتأهيل العملاء" },
                { name: "CRM ومبيعات", desc: "خطوط مبيعات وتذكيرات" },
                { name: "الردود التلقائية", desc: "قواعد رد ومتابعة منظمة" },
                { name: "صندوق وارد موحد", desc: "كل الرسائل في شاشة واحدة" },
              ]},
              { cat: "التشغيل والمخزون", items: [
                { name: "تأكيد الطلبات", desc: "تأكيد وتوزيع آلي للطلبات" },
                { name: "مشتريات وموردين", desc: "فواتير شراء ومديونيات" },
                { name: "تكامل WooCommerce", desc: "ربط متجرك الحالي بالمنصة" },
                { name: "متجر إلكتروني", desc: "واجهة متجر احترافية" },
              ]},
              { cat: "النمو والتسويق", items: [
                { name: "Facebook Ads", desc: "إدارة وأتمتة الحملات الإعلانية" },
                { name: "تليجرام بوت", desc: "أتمتة وبث رسائل جماعية" },
                { name: "أفليت وعمولات", desc: "شبكة مسوقين بالعمولة" },
                { name: "ولاء ومكافآت", desc: "برامج نقاط للعملاء" },
              ]},
              { cat: "المالية والتحليلات", items: [
                { name: "تحليلات وتقارير", desc: "إيرادات وأداء لحظي" },
                { name: "استوديو الصور", desc: "تجهيز صور تسويقية للمنتجات" },
                { name: "التوظيف والتقييم", desc: "نظام توظيف وتقييم أداء متكامل" },
                { name: "المهام والمشاريع", desc: "Kanban ومتابعة فرق عمل" },
              ]},
              { cat: "التوسع والتكامل", items: [
                { name: "API مفتوحة", desc: "ربط ودمج مع أنظمتك الحالية" },
                { name: "محفظة مالية", desc: "تسويات وعمولات آلية" },
                { name: "متجر التطبيقات", desc: "تطبيقات وثيمات جاهزة" },
                { name: "Social Media", desc: "إدارة حسابات مركزية" },
              ]}
            ].map((group, gi) => (
              <div key={gi} className="tool-group">
                <h3 className="tool-group-title">{group.cat}</h3>
                <div className="tool-group-grid">
                  {group.items.map((tool, ti) => (
                    <motion.div
                      key={ti}
                      className="tool-card"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ delay: ti * 0.04, duration: 0.3 }}
                      viewport={{ once: true }}
                    >
                      <div className="tool-accent" />
                      <h4>{tool.name}</h4>
                      <p>{tool.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Module Explorer */}
      <motion.section 
        id="modules" 
        className="premium-section mt-20"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
      >
        <div className="premium-container">
          <div className="section-head text-center">
            <span className="premium-kicker">جولة في المنصة</span>
            <h2 className="section-title">تصفّح أقسام المنصة وشوف بنفسك</h2>
            <p className="section-lead">من أول محادثة واتساب لآخر تقرير مالي — كل قسم بيشتغل مع اللي قبله.</p>
          </div>

          <div className="module-tabs">
            {[
              { id: "crm", label: "المبيعات و CRM" },
              { id: "erp", label: "العمليات و ERP" },
              { id: "growth", label: "الأفليت والنمو" },
              { id: "finance", label: "المالية والمحفظة" },
              { id: "hr", label: "الموظفين و HR" },
              { id: "social", label: "الأتمتة" }
            ].map(tab => (
              <div 
                key={tab.id}
                className={`module-tab ${activeModule === tab.id ? "active" : ""}`}
                onClick={() => setActiveModule(tab.id as any)}
              >
                {tab.label}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div 
              key={activeModule}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="elite-card min-h-[400px] grid grid-cols-2 gap-12 items-center"
            >
              <div>
                {activeModule === "crm" && (
                  <>
                    <h3 className="text-4xl font-black mb-6">تحكم كامل في رحلة العميل</h3>
                    <p className="text-xl text-slate-400 mb-8 leading-relaxed">
                      نظام CRM يجمّع عملاءك من WhatsApp و Messenger في قاعدة بيانات واحدة. تتبع كل تفاعل، ابنِ خطوط مبيعات (Pipelines) مخصصة، وحوّل المحادثات إلى إيرادات.
                    </p>
                    <ul className="space-y-4">
                      <li className="flex items-center gap-3 text-emerald-400 font-bold">✓ تتبع Omnichannel موحد</li>
                      <li className="flex items-center gap-3 text-emerald-400 font-bold">✓ أتمتة الـ Leads الساخنة</li>
                      <li className="flex items-center gap-3 text-emerald-400 font-bold">✓ سجل تاريخي كامل لكل عميل</li>
                    </ul>
                  </>
                )}
                {activeModule === "erp" && (
                  <>
                    <h3 className="text-4xl font-black mb-6">تشغيل موحد لمؤسستك</h3>
                    <p className="text-xl text-slate-400 mb-8 leading-relaxed">
                      أدِر المشتريات، المخازن، والطلبات المعقدة بسلاسة. اربط فروعك ومخازنك في شاشة واحدة مع تقارير مالية دقيقة لكل حركة.
                    </p>
                    <ul className="space-y-4">
                      <li className="flex items-center gap-3 text-blue-400 font-bold">✓ إدارة مشتريات وموردين (Procurement)</li>
                      <li className="flex items-center gap-3 text-blue-400 font-bold">✓ تنبيهات ذكية لنقص المخزون</li>
                      <li className="flex items-center gap-3 text-blue-400 font-bold">✓ تتبع لوجستي متكامل</li>
                    </ul>
                  </>
                )}
                {activeModule === "growth" && (
                  <>
                    <h3 className="text-4xl font-black mb-6">ابنِ جيش مبيعاتك الخاص</h3>
                    <p className="text-xl text-slate-400 mb-8 leading-relaxed">
                      حوّل نظامك إلى منصة نمو (Growth Platform). أدر مئات المسوقين بالعمولة (Affiliates)، تتبع روابطهم ومبيعاتهم، وزع العمولات آلياً، وتوسع في السوق دون تكاليف إعلانية ثابتة.
                    </p>
                    <ul className="space-y-4">
                      <li className="flex items-center gap-3 text-orange-400 font-bold">✓ نظام أفليت متكامل (Affiliate Pro)</li>
                      <li className="flex items-center gap-3 text-orange-400 font-bold">✓ تتبع دقيق للعمولات والتحويلات</li>
                      <li className="flex items-center gap-3 text-orange-400 font-bold">✓ لوحة تحكم مخصصة للشركاء</li>
                    </ul>
                  </>
                )}
                {activeModule === "finance" && (
                  <>
                    <h3 className="text-4xl font-black mb-6">مالية شفافة ومتكاملة</h3>
                    <p className="text-xl text-slate-400 mb-8 leading-relaxed">
                      محفظة إلكترونية داخلية لكل شريك، تسويات مالية فورية، وإدارة كاملة للمدفوعات والعمولات دون تدخل يدوي.
                    </p>
                    <ul className="space-y-4">
                      <li className="flex items-center gap-3 text-amber-400 font-bold">✓ محفظة داخلية (Internal Wallet)</li>
                      <li className="flex items-center gap-3 text-amber-400 font-bold">✓ تسويات مالية آلية بنسبة 100%</li>
                      <li className="flex items-center gap-3 text-amber-400 font-bold">✓ تقارير ربحية وتدفق نقدي لحظي</li>
                    </ul>
                  </>
                )}
                {activeModule === "hr" && (
                  <>
                    <h3 className="text-4xl font-black mb-6">إدارة الأداء والانضباط</h3>
                    <p className="text-xl text-slate-400 mb-8 leading-relaxed">
                      نظام HR يربط الإنتاجية بالتشغيل. تابع الحضور، التأخيرات، والجزاءات آلياً. اربط مهام الفريق بمبيعاتك مباشرة لتعرف من هو العضو الأكثر إنتاجية في مؤسستك.
                    </p>
                    <ul className="space-y-4">
                      <li className="flex items-center gap-3 text-purple-400 font-bold">✓ تتبع الحضور والانصراف والخصومات</li>
                      <li className="flex items-center gap-3 text-purple-400 font-bold">✓ إدارة مهام ومشاريع الفريق</li>
                      <li className="flex items-center gap-3 text-purple-400 font-bold">✓ تقارير أداء KPI لحظية</li>
                    </ul>
                  </>
                )}
                {activeModule === "social" && (
                  <>
                    <h3 className="text-4xl font-black mb-6">أتمتة تشغيلية على طريقتك</h3>
                    <p className="text-xl text-slate-400 mb-8 leading-relaxed">
                      اضبط قواعد الردود والمتابعة حسب طريقة شغلك. أتمتة محادثات، ردود سياقية، وتوزيع واضح للمهام لزيادة المبيعات.
                    </p>
                    <ul className="space-y-4">
                      <li className="flex items-center gap-3 text-pink-400 font-bold">✓ قواعد تشغيل قابلة للتخصيص حسب احتياجك</li>
                      <li className="flex items-center gap-3 text-pink-400 font-bold">✓ ردود ذكية معتمدة على سياق العمل</li>
                      <li className="flex items-center gap-3 text-pink-400 font-bold">✓ أتمتة كاملة لدورة البيع</li>
                    </ul>
                  </>
                )}
              </div>
              <div className="bg-slate-950 rounded-3xl border border-white/5 p-4 h-full overflow-hidden relative">
                 <AnimatePresence mode="wait">
                    {activeModule === "crm" && (
                      <motion.div key="crm-v" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
                        <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                          <div className="text-xs font-bold text-blue-400">PIPELINE: SALES FLOW</div>
                          <div className="flex -space-x-2">
                             {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700" />)}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                           {["New Leads", "Discovery", "Closing"].map(col => (
                             <div key={col} className="bg-white/5 p-3 rounded-xl border border-white/5 min-h-[200px]">
                                <div className="text-[10px] font-bold text-slate-500 mb-4 uppercase">{col}</div>
                                <div className="bg-slate-900 p-2 rounded-lg border border-white/5 text-[10px] mb-2">Lead #129 - Ahmed</div>
                                <div className="bg-slate-900 p-2 rounded-lg border border-white/5 text-[10px]">Lead #130 - Sara</div>
                             </div>
                           ))}
                        </div>
                      </motion.div>
                    )}
                    {activeModule === "erp" && (
                      <motion.div key="erp-v" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
                         <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="text-xs font-bold text-emerald-400 mb-4 uppercase">Stock Inventory</div>
                            <div className="space-y-3">
                               {[
                                 { name: "Product A", qty: 120, status: "In Stock" },
                                 { name: "Product B", qty: 12, status: "Low Stock" },
                                 { name: "Product C", qty: 0, status: "Out of Stock" }
                               ].map((p, i) => (
                                 <div key={i} className="flex justify-between items-center text-[11px] border-b border-white/5 pb-2">
                                    <span>{p.name}</span>
                                    <span className="font-mono">{p.qty} units</span>
                                    <span className={p.qty === 0 ? "text-red-400" : p.qty < 20 ? "text-amber-400" : "text-emerald-400"}>{p.status}</span>
                                 </div>
                               ))}
                            </div>
                         </div>
                      </motion.div>
                    )}
                    {activeModule === "growth" && (
                      <motion.div key="growth-v" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
                         <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="text-xs font-bold text-orange-400 mb-4 uppercase">Affiliate Network</div>
                            <div className="space-y-3">
                               {[
                                 { name: "Influencer A", sales: "EGP 45k", comm: "10%" },
                                 { name: "Partner B", sales: "EGP 12k", comm: "8%" },
                                 { name: "Affiliate C", sales: "EGP 8k", comm: "5%" }
                               ].map((p, i) => (
                                 <div key={i} className="flex justify-between items-center text-[11px] border-b border-white/5 pb-2">
                                    <span>{p.name}</span>
                                    <span className="font-mono text-emerald-400">{p.sales}</span>
                                    <span className="text-slate-500">Comm: {p.comm}</span>
                                 </div>
                               ))}
                            </div>
                         </div>
                         <div className="bg-orange-500/10 p-3 rounded-xl border border-orange-500/20 text-center">
                            <div className="text-[10px] text-orange-400 font-bold uppercase">Total Partner Revenue</div>
                            <div className="text-xl font-black">EGP 65,000.00</div>
                         </div>
                      </motion.div>
                    )}
                    {activeModule === "finance" && (
                      <motion.div key="finance-v" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
                         <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="text-xs font-bold text-amber-400 mb-4 uppercase">Internal Wallet</div>
                            <div className="text-center py-6 border-b border-white/5 mb-4">
                               <div className="text-[10px] text-slate-500 uppercase mb-1">Available Balance</div>
                               <div className="text-3xl font-black">EGP 1,240,500.00</div>
                            </div>
                            <div className="space-y-3">
                               {[
                                 { type: "Payout", to: "Partner A", amount: "-5,200", status: "Completed" },
                                 { type: "Credit", from: "Sale #8821", amount: "+12,450", status: "Verified" }
                               ].map((t, i) => (
                                 <div key={i} className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-400">{t.type} to {t.to || t.from}</span>
                                    <span className={t.amount.startsWith("+") ? "text-emerald-400" : "text-red-400"}>{t.amount}</span>
                                 </div>
                               ))}
                            </div>
                         </div>
                      </motion.div>
                    )}
                    {activeModule === "hr" && (
                      <motion.div key="hr-v" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
                         <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="text-xs font-bold text-purple-400 mb-4 uppercase">Team Attendance</div>
                            <div className="grid grid-cols-2 gap-4">
                               {[
                                 { name: "Mokhtar", status: "Active", time: "09:00 AM" },
                                 { name: "Ahmed", status: "Active", time: "08:45 AM" },
                                 { name: "Sara", status: "Break", time: "---" },
                                 { name: "John", status: "Offline", time: "---" }
                               ].map((p, i) => (
                                 <div key={i} className="flex items-center gap-3 bg-slate-900 p-2 rounded-lg border border-white/5">
                                    <div className={`w-2 h-2 rounded-full ${p.status === "Active" ? "bg-emerald-500" : "bg-slate-500"}`} />
                                    <div className="text-[10px]">
                                       <div className="font-bold">{p.name}</div>
                                       <div className="text-slate-500">{p.time}</div>
                                    </div>
                                 </div>
                               ))}
                            </div>
                         </div>
                      </motion.div>
                    )}
                    {activeModule === "social" && (
                      <motion.div key="social-v" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="p-4">
                         <div className="space-y-6">
                            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                               <div className="text-[10px] text-pink-400 font-bold uppercase mb-3">Automation Rules</div>
                               <div className="flex gap-2">
                                  {["ردود", "توزيع", "متابعة"].map(m => (
                                    <div key={m} className={`flex-1 p-2 rounded-lg border text-center text-[10px] ${m === "ردود" ? "bg-pink-500/20 border-pink-500/50" : "bg-white/5 border-white/10 opacity-50"}`}>
                                       {m}
                                    </div>
                                  ))}
                               </div>
                            </div>
                            <div className="space-y-3">
                               <div className="bg-slate-900 p-2 rounded-xl rounded-tr-none border border-white/5 ml-8 text-[10px]">
                                  مرحباً، أود الاستفسار عن المنتج A
                               </div>
                               <div className="bg-pink-600/20 p-2 rounded-xl rounded-tl-none border border-pink-500/20 mr-8 text-[10px] text-pink-100">
                                  <div className="flex gap-1 items-center mb-1">
                                     <div className="w-1 h-1 rounded-full bg-pink-400 animate-pulse" />
                                      <span className="text-[7px] font-bold uppercase">Auto Reply</span>
                                  </div>
                                  أهلاً بك! المنتج متوفر بخصم 20%. هل تود الحجز؟
                               </div>
                            </div>
                         </div>
                      </motion.div>
                    )}
                 </AnimatePresence>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Platform Power Section */}
      <motion.section 
        className="premium-section bg-slate-950/50"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
      >
        <div className="premium-container">
          <div className="section-head text-center">
            <div className="sovereignty-badge">Business OS — مش مجرد أدوات</div>
            <h2 className="section-title">منصة كاملة مش 16 أداة منفصلة</h2>
            <p className="section-lead">تكاملات خارجية + سوق تطبيقات + نظام متعدد العملاء. مشروعك كله في مكان واحد.</p>
          </div>

          <div className="power-grid">
            <div className="power-card">
              <div className="power-icon-wrap">
                <svg className="power-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5 5 5M12 5v9"/></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">اربط أنظمتك الحالية</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                استورد متجرك بالكامل من <strong className="text-white">WooCommerce</strong>. اربط <strong className="text-white">POS</strong> للمحل الفعلي. حلّل السلوك بـ <strong className="text-white">Microsoft Clarity</strong> و <strong className="text-white">Google Tag Manager</strong>. كل حاجة تشتغل مع بعض.
              </p>
              <div className="power-tags">
                <span>WooCommerce</span><span>POS</span><span>Google</span><span>Clarity</span>
              </div>
            </div>
            <div className="power-card">
              <div className="power-icon-wrap">
                <svg className="power-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">سوق تطبيقات وثيمات</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                تصفّح متجر تطبيقات وثيمات جاهزة. فعّل اللي يناسبك واللي ينفع خطط اشتراكك. وفر فلوس ووقت بدل ما تدفع في 10 أدوات منفصلة — اشتراك واحد يغطي كل حاجة.
              </p>
              <div className="power-tags">
                <span>Apps Marketplace</span><span>Themes</span><span>Bundles</span><span>Subscription</span>
              </div>
            </div>
            <div className="power-card">
              <div className="power-icon-wrap">
                <svg className="power-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">منصة قابلة للتوسع</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                مش بس SaaS. تقدر تشغل أكثر من شركة من نفس الحساب، وتدير فرق منفصلة بصلاحيات مختلفة. كمان تقدر تبيع المنصة كـ <strong className="text-white">white-label</strong> لعملائك وتكسب كشريك.
              </p>
              <div className="power-tags">
                <span>Multi-tenant</span><span>White-label</span><span>Partner Program</span>
              </div>
            </div>
            <div className="power-card">
              <div className="power-icon-wrap">
                <svg className="power-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">أدوات متقدمة</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                استوديو صور للمنتجات. قاعدة معرفة تشغيلية. جرد مخازن فعلي. توظيف و performance reviews. استبيانات تقارير عمل مخصصة. نظام مهام و Kanban متكامل.
              </p>
              <div className="power-tags">
                <span>Image Studio</span><span>Knowledge Base</span><span>Recruitment</span><span>Kanban</span>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Partnership / White-label Section */}
      <motion.section 
        className="premium-section bg-slate-950/50"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
      >
        <div className="premium-container">
          <div className="section-head text-center">
            <span className="premium-kicker">شراكة وعلامة بيضاء</span>
            <h2 className="section-title">المنصة مش ليك بس — تقدر تبيعها لغيرك</h2>
            <p className="section-lead">Max P مش مجرد أداة إدارة. هي منصة كاملة تقدر تعيد بيعها لعملائك وتحقق دخل متكرر.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="elite-card text-center">
              <div className="text-2xl font-black mb-3" style={{color:'var(--lp-accent)'}}>Multi-Tenant</div>
              <p className="text-sm text-slate-400 leading-relaxed">شغل أكثر من شركة من نفس الحساب. كل شركة ببياناتها وفريقها وفواتيرها المستقلة. صلاحيات منفصلة ولوحات تحكم مخصصة.</p>
            </div>
            <div className="elite-card text-center">
              <div className="text-2xl font-black mb-3" style={{color:'var(--lp-accent)'}}>White-Label</div>
              <p className="text-sm text-slate-400 leading-relaxed">بيع المنصة باسمك وعلامتك التجارية. نخصص لك كل حاجة — من الشعار للتطبيق — كأنك بنيتها بنفسك.</p>
            </div>
            <div className="elite-card text-center">
              <div className="text-2xl font-black mb-3" style={{color:'var(--lp-accent)'}}>برنامج الشركاء</div>
              <p className="text-sm text-slate-400 leading-relaxed">عمولات متكررة على كل عميل تجيبه. دعم فني وتسويقي متكامل. تقدر تبدأ بلا رأس مال — بيع الخدمة وحقق أرباح.</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Comparison Section */}
      <motion.section 
        id="comparison" 
        className="premium-section bg-slate-900/20"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
      >
        <div className="premium-container">
          <div className="section-head text-center">
            <h2 className="section-title">لماذا Max P هو الخيار الأفضل؟</h2>
          </div>

          <div className="comparison-grid">
            <div className="comparison-card pain">
              <h3 className="text-2xl font-bold text-red-400 mb-8">بدون Max P: أدوات مبعثرة</h3>
              {[
                "تضطر تشتري 6-10 أنظمة منفصلة (CRM، محاسبة، HR، متجر، تسويق...) بفواتير مختلفة",
                "بيانات العميل متناثرة — جزء في واتساب، جزء في Excel، جزء في ايميل",
                "بتضيع فرص مبيع كتير عشان الردود يدوية وبطيئة",
                "مفيش طريقة تعرف مين في الفريق شغال ومين لأ، والروح المعنوية نازلة",
                "التسوية مع المندوبين والمسوقين يدوية ومضيعة للوقت",
                "أدوات منفصلة = تكاليف مضاعفة + بيانات مش مترابطة"
              ].map((item, i) => (
                <div key={i} className="comparison-item">
                  <div className="text-red-500 mt-1">✕</div>
                  <p className="text-slate-400">{item}</p>
                </div>
              ))}
            </div>
            <div className="comparison-card gain">
              <h3 className="text-2xl font-bold text-emerald-400 mb-8">مع Max P: نظام واحد متكامل</h3>
              {[
                "نظام واحد يغنيك عن CRM + ERP + HR + متجر + تسويق + محادثات — فاتورة واحدة",
                "كل بيانات العميل في مكان واحد — من أول محادثة واتساب لآخر عملية شراء",
                "ردود تلقائية تؤكد الطلبات وتتابع العملاء 24/7",
                "لوحة أداء لحظية — تعرف مين الشغال ومين لأ، وتحفز فريقك بالحوافز",
                "تسويات مالية آلية 100% — للمناديب والمسوقين والموردين بدون تدخل يدوي",
                "أتمتة متكاملة من الإعلان (Facebook Ads) للبيع (متجر) للتوصيل للشحن"
              ].map((item, i) => (
                <div key={i} className="comparison-item">
                  <div className="text-emerald-500 mt-1">✓</div>
                  <p className="text-slate-100 font-bold">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Integrations Strip */}
      <div className="integration-strip">
        <div className="integration-track">
          {[
            "WooCommerce", "POS ← → Shopify", "Google Tag Manager",
            "Microsoft Clarity", "Stripe", "Facebook API",
            "WhatsApp API", "Telegram API", "Webhooks", "CRM",
            "Catalog Sync", "WooCommerce", "POS ← → Shopify", "Google Tag Manager",
            "Microsoft Clarity", "Stripe", "Facebook API",
            "WhatsApp API", "Telegram API", "Webhooks", "CRM", "Catalog Sync"
          ].map((name, i) => (
            <div key={i} className="integration-logo">{name}</div>
          ))}
        </div>
      </div>

      {/* Industries Section */}
      <motion.section 
        id="industries" 
        className="premium-section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
      >
        <div className="premium-container">
          <div className="section-head text-center">
            <span className="premium-kicker">من يستفيد؟</span>
            <h2 className="section-title">مصمم لكل نوع بيزنس</h2>
            <p className="section-lead">سواء كنت متجر إلكتروني أو وكالة تسويق أو شركة خدمية، Max P يتكيف مع احتياجاتك</p>
          </div>

          <div className="industries-grid">
            {[
              { title: "المتاجر الإلكترونية", num: "01", tools: "متجر + واتساب + تأكيد طلبات + شحن", desc: "أدر المنتجات، الطلبات، والشحن مع أتمتة كاملة لتأكيد الطلبات عبر الواتساب." },
              { title: "وكالات التسويق", num: "02", tools: "Facebook Ads + أفليت + تحليلات", desc: "أدر حملات إعلانية، شبكة مسوقين بالعمولة، وتتبع ROI من لوحة واحدة." },
              { title: "شركات الجملة والتوزيع", num: "03", tools: "مشتريات + موردين + مخازن", desc: "نظام مشتريات متكامل مع إدارة الموردين وفواتير الشراء والمديونيات." },
              { title: "البراندات الناشئة", num: "04", tools: "متجر + مراجعات UGC + تحويل", desc: "ابني ثقة العملاء بمراجعات الفيديو وارفع معدل التحويل بأدوات ذكية." },
              { title: "شركات الخدمات", num: "05", tools: "CRM + مهام + HR + محادثات", desc: "تتبع العملاء، وزع المهام على الفريق، وتابع الإنجاز لحظة بلحظة." },
              { title: "شركات العقارات", num: "06", tools: "Leads + تحصيلات + محفظة", desc: "أدر الـ Leads وخطوات البيع والتحصيلات المالية مع محفظة داخلية." }
            ].map((ind, i) => (
              <div key={i} className="industry-card">
                <div className="industry-num">{ind.num}</div>
                <h3 className="text-xl font-bold mb-2">{ind.title}</h3>
                <div className="industry-tools">{ind.tools}</div>
                <p className="text-sm text-slate-400 leading-relaxed">{ind.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Testimonials Section */}
      <motion.section 
        id="testimonials" 
        className="premium-section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
      >
        <div className="premium-container">
          <div className="section-head text-center">
            <span className="premium-kicker">آراء العملاء</span>
            <h2 className="section-title">شركات بتثق في Max P</h2>
          </div>

          <div className="pillar-grid">
            {[
              {
                name: "أحمد منصور",
                role: "مدير شركة اتزان للتسويق",
                stars: 5,
                content: "كنا محتاجين نظام واحد يلم شغلنا من واتساب وفيسبوك والمتجر. Max P وفر علينا 3 أنظمة منفصلة وقلّب شغل الفريق.",
                result: "زيادة المبيعات 40%"
              },
              {
                name: "سارة عبد الله",
                role: "صاحبة متجر روز بوتيك",
                stars: 5,
                content: "أتمتة الواتساب وحدها وفّرت لي 20 ساعة أسبوعياً. دلوقتي النظام بيتابع العملاء ويأكد الطلبات وأنا نايمة.",
                result: "توفير 20 ساعة/أسبوع"
              },
              {
                name: "خالد الحمادي",
                role: "مدير عمليات — مجموعة الفهد التجارية",
                stars: 4,
                content: "التقارير المالية والموحّدة بين الفروع فرق كبير. لسّه بنضبط على بعض الحاجات الصغيرة بس الصورة العامة ممتازة.",
                result: "توفير 180,000 EGP/سنة"
              }
            ].map((test, i) => (
              <div key={i} className="testimonial-card">
                <div className="flex gap-0.5 mb-4">
                  {[1,2,3,4,5].map(s => (
                    <span key={s} className={`text-sm ${s <= test.stars ? "text-amber-400" : "text-slate-600"}`}>★</span>
                  ))}
                </div>
                <p className="text-slate-300 mb-6 leading-relaxed text-sm">"{test.content}"</p>
                <div className="border-t border-white/5 pt-4">
                  <div className="font-bold text-sm">{test.name}</div>
                  <div className="text-xs text-slate-500">{test.role}</div>
                  <div className="mt-3 text-xs font-bold text-emerald-400/90 bg-emerald-500/8 inline-block px-3 py-1 rounded-full">
                    {test.result}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ROI Calculator */}
      <motion.section 
        id="calculator" 
        className="premium-section bg-blue-600/5"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
      >
        <div className="premium-container">
          <div className="max-w-4xl mx-auto elite-card p-12">
            <h2 className="text-3xl font-black mb-8 text-center">احسب وفوراتك مع Max P</h2>
            <div className="grid grid-cols-2 gap-12 items-center">
              <div>
                <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">متوسط الإيراد الشهري (EGP)</label>
                <input 
                  type="range" 
                  min="50000" 
                  max="1000000" 
                  step="50000"
                  value={revenue}
                  onChange={(e) => setRevenue(Number(e.target.value))}
                  className="w-full mt-6 accent-[var(--lp-accent)]"
                />
                <div className="text-3xl font-black mt-4">{revenue.toLocaleString()} EGP</div>
              </div>
              <div className="space-y-6">
                <div className="p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <div className="text-xs text-emerald-400 font-bold uppercase mb-1">وفورات مالية سنوية</div>
                  <div className="text-2xl font-black">{(savings.money * 12).toLocaleString()} EGP</div>
                </div>
                <div className="p-6 rounded-2xl border" style={{background:'rgba(184,26,26,0.08)', borderColor:'rgba(184,26,26,0.15)'}}>
                  <div className="text-xs text-blue-400 font-bold uppercase mb-1">ساعات عمل موفرة</div>
                  <div className="text-2xl font-black">{savings.time} ساعة / شهر</div>
                </div>
              </div>
            </div>
            <div className="mt-6 text-center">
              <div className="text-xs text-slate-500 leading-relaxed max-w-lg mx-auto">
                التوفير يحسب بناءً على توفير تكاليف الاشتراكات المنفصلة (6-10 أنظمة) + زيادة كفاءة التشغيل بالأتمتة. النتائج الفعلية تختلف حسب حجم نشاطك.
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* CTA Final */}
      <section className="premium-section py-32 text-center">
        <div className="premium-container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl font-black mb-8 leading-tight">استنى! لسه بتدفع في 10 أنظمة منفصلة؟<br /><span style={{color: 'var(--lp-accent)'}}>وفّر 60% من تكاليف التشغيل</span></h2>
            <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
              ابدأ مجاناً وجرّب بنفسك. كلم مستشارنا عشان يساعدك تربط أنظمتك الحالية وتشوف الفرق من أول يوم. باقات تبدأ من <span style={{color:'var(--lp-accent)'}}>299 جنيه/شهر</span>.
            </p>
            <div className="flex justify-center gap-6">
              <Link to="/auth/register" className="btn-primary px-12 py-5 text-lg">ابدأ مجاناً</Link>
              <Link to="/contact" className="btn-secondary px-12 py-5 text-lg">كلم مستشار</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <motion.section 
        id="faq" 
        className="premium-section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
      >
        <div className="premium-container">
          <div className="section-head text-center">
            <span className="premium-kicker">الأسئلة الشائعة</span>
            <h2 className="section-title">كل ما يدور في ذهنك</h2>
          </div>

          <div className="faq-grid">
            {[
              {
                q: "هل أحتاج لخبرة تقنية لتشغيل Max P؟",
                a: "إطلاقاً. النظام مصمم ليكون بديهياً جداً. كما نوفر لك فريق دعم فني يساعدك في ربط كل أدواتك وتدريب فريقك."
              },
              {
                q: "كيف يمكنني نقل بياناتي من Excel أو أنظمة أخرى؟",
                a: "لدينا أدوات استيراد ذكية تدعم ملفات Excel و CSV. فريقنا يمكنه مساعدتك في عملية الهجرة لضمان عدم فقدان أي بيان."
              },
              {
                q: "هل يمكنني ربط أكثر من رقم واتساب؟",
                a: "نعم، النظام يدعم ربط عدد غير محدود من أرقام الواتساب وتوزيع المحادثات على الموظفين بشكل آلي."
              },
              {
                q: "ماذا يحدث لو قررت التوقف عن استخدام النظام؟",
                a: "ببساطة يمكنك تصدير كافة بياناتك (العملاء، المبيعات، التقارير) بضغطة زر واحدة. نحن نؤمن بحريتك وسيادتك على بياناتك."
              }
            ].map((item, i) => (
              <div 
                key={i} 
                className={`faq-item ${activeFaq === i ? "active" : ""}`}
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
              >
                <div className="faq-question">
                  <span>{item.q}</span>
                  <span className="faq-icon">+</span>
                </div>
                {activeFaq === i && <div className="faq-answer">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5">
        <div className="premium-container grid grid-cols-4 gap-12 opacity-50">
           <div>
              <div className="font-bold mb-6">المنصة</div>
              <div className="space-y-3 text-sm">
                <div>المبيعات</div>
                <div>العمليات</div>
                <div>الموارد البشرية</div>
                <div>الأتمتة</div>
              </div>
           </div>
           <div>
              <div className="font-bold mb-6">تواصل معنا</div>
              <div className="space-y-3 text-sm">
                <div>info@maxp.online</div>
                <div>+20 11 2308 7745</div>
                <div>القاهرة، مصر</div>
              </div>
           </div>
           <div>
              <div className="font-bold mb-6">الموارد</div>
              <div className="space-y-3 text-sm">
                <div>المدونة</div>
                <div>مركز المساعدة</div>
                <div>واجهة المطورين</div>
              </div>
           </div>
           <div>
              <div className="font-bold mb-6">قانوني</div>
              <div className="space-y-3 text-sm">
                <div>الشروط والأحكام</div>
                <div>سياسة الخصوصية</div>
              </div>
           </div>
        </div>
        <div className="premium-container mt-20 pt-8 border-t border-white/5 text-center text-xs text-slate-600">
           © 2026 MAX P BUSINESS OS. منصة تشغيل متكاملة.
        </div>
      </footer>

      {/* WhatsApp Float Button */}
      <a 
        href="https://wa.me/201123087745" 
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-50 bg-[var(--lp-accent)] hover:bg-[#9e1616] text-white p-4 rounded-full shadow-lg shadow-[rgba(184,26,26,0.3)] transition-all hover:scale-110"
        aria-label="تواصل معنا عبر واتساب"
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </div>
  );
};

export default LandingPage;
