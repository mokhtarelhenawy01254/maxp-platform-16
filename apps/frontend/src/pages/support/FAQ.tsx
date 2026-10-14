import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  HelpCircle,
  MessageSquare,
  Plus,
  Loader2,
  FileQuestion,
  Layers,
  Sparkles,
} from "lucide-react";
import supportService, { FAQ as FAQType } from "../../services/supportService";
import { useAuth } from "../../hooks/useAuthSimple";
import { getSafeFaqAnswerHtml } from "./faqHtml";

interface FAQCategory {
  category: string;
  count: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "عام",
  technical: "تقني",
  billing: "فواتير",
  woocommerce: "WooCommerce",
  whatsapp: "WhatsApp",
  facebook_ads: "إعلانات فيسبوك",
};

export const FAQ: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "";

  const [faqs, setFaqs] = useState<{ [key: string]: FAQType[] }>({});
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const supportTicketPath = isAuthenticated ? "/support/tickets/new" : "/auth/login";

  useEffect(() => {
    void fetchFAQs();
    void fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory !== undefined) {
      void fetchFAQs();
    }
  }, [selectedCategory]);

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.append("category", selectedCategory);
      if (searchTerm) params.append("search", searchTerm);
      const data = await supportService.getFAQs(params);
      if (data.success) {
        setFaqs(data.faqs || {});
      }
    } catch (error) {
      console.error("Error fetching FAQs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await supportService.getFAQCategories();
      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const rateFAQ = async (faqId: string, helpful: boolean) => {
    try {
      await supportService.rateFAQ(faqId, helpful);
      void fetchFAQs();
    } catch (error) {
      console.error("Error rating FAQ:", error);
    }
  };

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  const totalQuestions = Object.values(faqs).reduce((acc, curr) => acc + curr.length, 0);

  if (loading && Object.keys(faqs).length === 0) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="mr-2 text-xs font-medium">جاري تحميل قاعدة المعرفة والأسئلة الشائعة...</span>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border/70 rounded-xl p-4 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
              الدعم والمساعدة
            </span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-semibold text-foreground">الأسئلة الشائعة</span>
          </div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            الأسئلة الشائعة وقاعدة المعرفة (FAQ & Knowledge Base)
          </h2>
          <p className="text-xs text-muted-foreground">
            إجابات فورية وحلول موثقة لأكثر المشاكل والاستفسارات شيوعاً في المنصة
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => navigate(supportTicketPath)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-xs transition-colors active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>فتح تذكرة دعم</span>
          </button>
        </div>
      </div>

      {/* Telemetry ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>الأسئلة المتاحة</span>
            <FileQuestion className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-foreground tabular-nums">
              {totalQuestions}
            </span>
            <span className="text-[11px] text-muted-foreground">مقالة موثقة</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>التصنيفات المغطاة</span>
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-foreground tabular-nums">
              {categories.length}
            </span>
            <span className="text-[11px] text-muted-foreground">أقسام رئيسية</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>حل المشكلات الفوري</span>
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">إجابات فورية 24/7</span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">Instant</span>
          </div>
        </div>
      </div>

      {/* Search Bar & Category Filters Strip */}
      <div className="bg-card border border-border/70 rounded-xl p-3.5 space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="ابحث بالكلمات المفتاحية في الأسئلة الشائعة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void fetchFAQs()}
            className="w-full h-9 pr-9 pl-3 text-xs rounded-lg border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Categories Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => setSelectedCategory("")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              !selectedCategory
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            جميع الفئات ({totalQuestions})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.category}
              type="button"
              onClick={() => setSelectedCategory(cat.category)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedCategory === cat.category
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <span>{CATEGORY_LABELS[cat.category] || cat.category}</span>
              <span className="text-[10px] font-mono opacity-80 tabular-nums">({cat.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* FAQs Accordion Cards */}
      {Object.keys(faqs).length === 0 ? (
        <div className="bg-card border border-border/70 rounded-xl p-10 text-center space-y-2">
          <HelpCircle className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <h3 className="text-xs font-semibold text-foreground">لم يتم العثور على نتائج</h3>
          <p className="text-xs text-muted-foreground">جرب البحث بكلمات أخرى أو تواصل مع الدعم الفني مباشرة</p>
          <button
            type="button"
            onClick={() => navigate(supportTicketPath)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>فتح تذكرة دعم</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(faqs).map(([category, categoryFaqs]) => (
            <div key={category} className="bg-card border border-border/70 rounded-xl overflow-hidden divide-y divide-border/60">
              <div className="px-4 py-2.5 bg-muted/20 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  {CATEGORY_LABELS[category] || category}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                  {categoryFaqs.length} أسئلة
                </span>
              </div>

              {categoryFaqs.map((faq) => {
                const isExpanded = expandedFAQ === faq.id;
                return (
                  <div key={faq.id} className="p-3.5 sm:p-4 transition-colors">
                    <button
                      type="button"
                      onClick={() => toggleFAQ(faq.id)}
                      className="w-full text-right flex items-center justify-between gap-3 text-xs font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      <span className="leading-relaxed flex-1">{faq.question}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border/60 space-y-3 text-xs text-muted-foreground animate-in fade-in duration-150">
                        <div
                          className="leading-relaxed text-foreground"
                          dangerouslySetInnerHTML={{
                            __html: getSafeFaqAnswerHtml(faq.answer),
                          }}
                        />

                        {/* Rating row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-[11px]">
                          <div className="flex items-center gap-3">
                            <span>هل كان هذا الحل مفيداً؟</span>
                            <button
                              type="button"
                              onClick={() => void rateFAQ(faq.id, true)}
                              className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                              <span className="font-mono tabular-nums">({faq.helpful})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void rateFAQ(faq.id, false)}
                              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium transition-colors"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                              <span className="font-mono tabular-nums">({faq.notHelpful})</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => navigate(supportTicketPath)}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>تحتاج مساعدة إضافية في هذا السؤال؟</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FAQ;
