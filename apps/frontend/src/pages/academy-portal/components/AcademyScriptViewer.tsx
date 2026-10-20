import React, { useMemo, useState } from "react";
import {
  Clock,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Search,
  FileText,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface ScriptSection {
  id: string;
  timeRange: string;
  title: string;
  paragraphs: string[];
  keyPoints: string[];
  visualConcept?: string | null;
  isSources?: boolean;
}

/**
 * دالة بنيوية لتنظيف سكريبت الدرس المكتوب للإنتاج وتحويله إلى محتوى تعليمي منظم للطالب:
 * - إزالة علامات المشاهد والتصوير («على الشاشة:»، «[مشهد AI]»، «طبقة صوت:»، «الكاميرا تزوّم...»)
 * - إزالة تعليمات الإخراج الداخلية وملاحظات ما قبل التصوير («ملاحظة المنصة:»، «تحقق قبل التصوير:»)
 * - دمج التكرارات وتنظيف وسوم المعلّق («المعلّق — mm:ss») والأقواس «...»
 * - الحفاظ الكامل على كافة الأفكار التعليمية والأرقام والخطوات والشروح والتطبيقات
 */
export function parseLessonScript(raw: string | null | undefined): ScriptSection[] {
  if (!raw || !raw.trim()) return [];

  const lines = raw.split(/\r?\n/);
  const sections: ScriptSection[] = [];

  let currentSection: ScriptSection = {
    id: "sec-intro",
    timeRange: "",
    title: "مقدمة وفكرة الدرس",
    paragraphs: [],
    keyPoints: [],
    visualConcept: null,
  };

  const timeHeaderRegex = /^(\d+:\d+\s*[–-]\s*\d+:\d+)\s*(.*)$/;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    // رصد العناوين الزمنية للأقسام
    const timeMatch = line.match(timeHeaderRegex);
    if (timeMatch) {
      if (
        currentSection.paragraphs.length > 0 ||
        currentSection.keyPoints.length > 0 ||
        currentSection.visualConcept
      ) {
        sections.push(currentSection);
      }

      let rawTitle = timeMatch[2].trim();
      rawTitle = rawTitle.replace(/الهوك\s*مشهد\s*AI/g, "فكرة ومقدمة الدرس");
      rawTitle = rawTitle.replace(/مشهد\s*AI/g, "");
      rawTitle = rawTitle.replace(/\(قبل أي أداة\)/g, "");
      rawTitle = rawTitle.replace(/—\s*بتسليم وبوابة قابلة للتنفيذ/g, "");
      rawTitle = rawTitle.replace(/سيناريو على الشاشة/g, "");
      rawTitle = rawTitle.replace(/^[\s—–+\-:]+|[\s—–+\-:]+$/g, "").trim();

      currentSection = {
        id: `sec-${sections.length + 1}`,
        timeRange: timeMatch[1].trim(),
        title: rawTitle || "محور الدرس",
        paragraphs: [],
        keyPoints: [],
        visualConcept: null,
      };
      continue;
    }

    // قسم الأرقام والمصادر المعتمدة
    if (line.startsWith("الأرقام المستخدمة في الدرس")) {
      if (
        currentSection.paragraphs.length > 0 ||
        currentSection.keyPoints.length > 0 ||
        currentSection.visualConcept
      ) {
        sections.push(currentSection);
      }
      currentSection = {
        id: `sec-sources`,
        timeRange: "",
        title: "الأرقام والإحصائيات المعتمدة في الدرس",
        paragraphs: [],
        keyPoints: [],
        isSources: true,
      };
      continue;
    }

    // استبعاد الملاحظات الإخراجية والتقنية البحتة لفريق التصوير
    if (
      line.startsWith("ملاحظة المنصة:") ||
      line.startsWith("الغلطة القاتلة / البوابة:") ||
      line.startsWith("تحقق قبل التصوير:")
    ) {
      continue;
    }

    // دمج وتنظيف تكرار "على الشاشة:"
    line = line.replace(/^(على الشاشة:\s*)+/g, "على الشاشة: ");

    // استخلاص السيناريوهات المرئية والرسومات التعليمية مع تنظيف مؤثرات الصوت والكاميرا
    if (line.includes("[مشهد AI]") || line.includes("طبقة صوت:")) {
      let cleanedVisual = line.replace(/^على الشاشة:\s*/g, "");
      cleanedVisual = cleanedVisual.replace(/\[مشهد AI\]/g, "");
      cleanedVisual = cleanedVisual.replace(/طبقة صوت:.*$/g, "");
      cleanedVisual = cleanedVisual.replace(/الكاميرا تتزحلق.*$/g, "");
      cleanedVisual = cleanedVisual.replace(/الكاميرا بتلف.*$/g, "");
      cleanedVisual = cleanedVisual.replace(/الكاميرا تزوّم.*$/g, "");
      cleanedVisual = cleanedVisual.replace(/^[\s—–+\-:]+|[\s—–+\-:]+$/g, "").trim();
      if (cleanedVisual && cleanedVisual.length > 15) {
        currentSection.visualConcept = cleanedVisual;
      }
      continue;
    }

    // نصوص الشاشة والمخططات المكتوبة (مثل الجداول والتسجيلات التعليمية)
    if (line.startsWith("على الشاشة:")) {
      let content = line.replace(/^على الشاشة:\s*/, "").trim();
      content = content.replace(/نص التمرين المصغّر\s*—\s*/g, "");
      content = content.replace(/«|»/g, "");
      if (content.length > 10 && !content.includes("سكرين ريكوردينج")) {
        currentSection.visualConcept = currentSection.visualConcept
          ? `${currentSection.visualConcept} • ${content}`
          : content;
      }
      continue;
    }

    // إزالة وسوم المعلّق مع التوقيت
    if (/^المعلّق(\s*—\s*\d+:\d+|\s*:)?/.test(line)) {
      continue;
    }

    // تنظيف الأقواس والاقتباسات من متن الشرح
    let cleanText = line.replace(/«([^»]+)»/g, "$1").trim();
    cleanText = cleanText.replace(/^[«"]+|[»"]+$/g, "").trim();

    if (!cleanText) continue;

    // تصنيف السطور إلى نقاط رئيسية أو فقرات شرح متصلة
    if (
      cleanText.startsWith("- ") ||
      cleanText.startsWith("• ") ||
      /^(واحد|اتنين|تلاتة|أربعة|خمسة|\d+)\s*[—–-]/.test(cleanText) ||
      cleanText.startsWith("الدايرة ") ||
      cleanText.startsWith("شاف:") ||
      cleanText.startsWith("اهتم:") ||
      cleanText.startsWith("سأل:") ||
      cleanText.startsWith("اشترى:") ||
      cleanText.startsWith("رجع:")
    ) {
      currentSection.keyPoints.push(cleanText.replace(/^[-•]\s*/, ""));
    } else {
      currentSection.paragraphs.push(cleanText);
    }
  }

  if (
    currentSection.paragraphs.length > 0 ||
    currentSection.keyPoints.length > 0 ||
    currentSection.visualConcept
  ) {
    sections.push(currentSection);
  }

  return sections;
}

interface Props {
  scriptText: string | null | undefined;
}

export const AcademyScriptViewer: React.FC<Props> = ({ scriptText }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  const sections = useMemo(() => {
    return parseLessonScript(scriptText);
  }, [scriptText]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.trim().toLowerCase();
    return sections.filter(
      (sec) =>
        sec.title.toLowerCase().includes(q) ||
        sec.paragraphs.some((p) => p.toLowerCase().includes(q)) ||
        sec.keyPoints.some((k) => k.toLowerCase().includes(q)) ||
        (sec.visualConcept && sec.visualConcept.toLowerCase().includes(q))
    );
  }, [sections, searchQuery]);

  const toggleCollapse = (id: string) => {
    setCollapsedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!scriptText || sections.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 text-slate-500 text-xs">
        <FileText className="w-8 h-8 mx-auto mb-2 text-slate-400 stroke-[1.5]" />
        <p className="font-semibold">لا يوجد نص أو سكريبت متاح لهذا الدرس حالياً.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* Search & Overview Top Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في محاور ونقاط الدرس..."
            className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 shrink-0">
          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
          <span>{sections.length} محاور تعليمية</span>
        </div>
      </div>

      {/* Sections List */}
      <div className="space-y-3.5">
        {filteredSections.map((sec, index) => {
          const isCollapsed = collapsedMap[sec.id] || false;

          if (sec.isSources) {
            return (
              <div
                key={sec.id}
                className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    <h4 className="text-xs font-extrabold text-indigo-950">
                      {sec.title}
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200/60 shadow-2xs">
                    مراجع ودراسات موثقة
                  </span>
                </div>
                <div className="space-y-2 text-[11px] text-slate-700 leading-relaxed font-sans">
                  {sec.paragraphs.map((p, pIdx) => (
                    <div
                      key={pIdx}
                      className="p-2.5 rounded-xl bg-white/90 border border-indigo-100/80 shadow-2xs"
                    >
                      {p}
                    </div>
                  ))}
                  {sec.keyPoints.map((k, kIdx) => (
                    <div
                      key={kIdx}
                      className="p-2.5 rounded-xl bg-white/90 border border-indigo-100/80 shadow-2xs"
                    >
                      {k}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div
              key={sec.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs hover:border-slate-300 transition-all"
            >
              {/* Section Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-extrabold text-[11px] flex items-center justify-center shrink-0 border border-indigo-100">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                      {sec.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {sec.timeRange && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60 tabular-nums">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{sec.timeRange}</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleCollapse(sec.id)}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title={isCollapsed ? "توسيع القسم" : "طي القسم"}
                    aria-label="طي/توسيع"
                  >
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <>
                  {/* Visual Concept / Key Scenario (Cleaned) */}
                  {sec.visualConcept && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-700 leading-relaxed space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>مفهوم المشهد والشاشة:</span>
                      </div>
                      <p>{sec.visualConcept}</p>
                    </div>
                  )}

                  {/* Bullet Key Points */}
                  {sec.keyPoints.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {sec.keyPoints.map((point, kIdx) => (
                        <div
                          key={kIdx}
                          className="flex items-start gap-2 text-xs text-slate-800 leading-relaxed font-sans"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Spoken Narration Paragraphs */}
                  {sec.paragraphs.length > 0 && (
                    <div className="space-y-2 pt-1 border-t border-slate-100 text-xs text-slate-700 leading-relaxed font-sans text-pretty">
                      {sec.paragraphs.map((para, pIdx) => (
                        <p key={pIdx}>{para}</p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {filteredSections.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
            لا توجد محاور مطابقة لبحثك: «{searchQuery}»
          </div>
        )}
      </div>
    </div>
  );
};

export default AcademyScriptViewer;
