/**
 * StorefrontEditor — محرر واجهة المتجر (نمط "Pro Studio")
 *
 * أربع لوحات: شريط أدوات + لوحة عناصر/طبقات (يمين) ← الكانفس ← الفاحص (يسار)
 * - سحب وإفلات: إعادة ترتيب الأقسام + إضافة أقسام جديدة بالسحب من اللوحة
 * - معاينة حيّة بمكونات المتجر الفعلية (HeroSection/ProductsSection/...)
 * - حفظ تلقائي + نشر (تفعيل القالب) + تراجع/إعادة
 * المسار: /settings/storefront/editor
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowDownIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowUpIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  CheckIcon,
  ChevronDownIcon,
  CodeBracketIcon,
  Cog6ToothIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PaintBrushIcon,
  PhotoIcon,
  RectangleStackIcon,
  SparklesIcon,
  Squares2X2Icon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  homepageService,
  HomepageContent,
  HomepageSection,
  HomepageTemplate,
} from "../../services/homepageService";
import HeroSection from "../../components/homepage/HeroSection";
import FeaturesSection from "../../components/homepage/FeaturesSection";
import ProductsSection from "../../components/homepage/ProductsSection";
import BannerSection from "../../components/homepage/BannerSection";
import CategoriesSection from "../../components/homepage/CategoriesSection";
import TestimonialsSection from "../../components/homepage/TestimonialsSection";
import CustomSection from "../../components/homepage/CustomSection";

/* ============================== أدوات مساعدة ============================== */

type DeviceType = "desktop" | "tablet" | "mobile";

const HERO_DEMO_BG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%234a3226'/%3E%3Cstop offset='0.55' stop-color='%235f4433'/%3E%3Cstop offset='1' stop-color='%23291e15'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1600' height='900' fill='url(%23g)'/%3E%3C/svg%3E";

const DEVICE_WIDTHS: Record<DeviceType, number | null> = {
  desktop: null, // مرن بعرض المساحة
  tablet: 834,
  mobile: 390,
};

const SECTION_META: Record<
  string,
  { label: string; hint: string; glyph: string }
> = {
  hero: { label: "قسم البطل", hint: "عنوان + وصف + زر", glyph: "🏠" },
  features: { label: "المميزات", hint: "شبكة ميزات المتجر", glyph: "⭐" },
  products: { label: "المنتجات", hint: "شبكة منتجات من المتجر", glyph: "🛍️" },
  banner: { label: "بانر إعلاني", hint: "شريط ترويجي مميز", glyph: "📣" },
  categories: { label: "الفئات", hint: "فئات المتجر", glyph: "🗂️" },
  testimonials: { label: "آراء العملاء", hint: "شهادات وتقييمات", glyph: "💬" },
  custom: { label: "نص / HTML مخصص", hint: "كتلة حرة", glyph: "✏️" },
};

const sectionLabel = (t: string) => SECTION_META[t]?.label || t;

let idCounter = 0;
const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;

const defaultSection = (type: string): HomepageSection => {
  const base: HomepageSection = { id: newId("sec"), type: type as any };
  switch (type) {
    case "hero":
      return {
        ...base,
        title: "عنوان رئيسي جذّاب لمتجرك",
        subtitle: "وصف مختصر يشرح قيمة متجرك في سطر أو سطرين يشجّع الزائر على التسوق.",
        buttonText: "تسوق الآن",
        buttonLink: "/shop",
        height: "medium",
        backgroundImage: HERO_DEMO_BG,
        styles: { paddingY: 0 },
      };
    case "features":
      return { ...base, title: "لماذا تتسوق معنا؟", styles: { paddingY: 32 } };
    case "products":
      return { ...base, title: "منتجات مميزة", count: 4, styles: { paddingY: 32 } };
    case "banner":
      return {
        ...base,
        title: "عرض خاص لفترة محدودة",
        subtitle: "خصم يصل إلى 40% على المجموعة الجديدة.",
        buttonText: "اكتشف العرض",
        styles: { paddingY: 24 },
      };
    case "categories":
      return { ...base, title: "تسوق حسب الفئة", styles: { paddingY: 32 } };
    case "testimonials":
      return { ...base, title: "ماذا قال عملاؤنا؟", styles: { paddingY: 32 } };
    case "custom":
      return {
        ...base,
        title: "قسم مخصص",
        content: {
          html: '<div style="padding:40px;text-align:center;background:#f8fafc;border-radius:12px"><h3 style="font-weight:700;margin-bottom:8px">محتوى HTML مخصص</h3><p style="color:#64748b;font-size:14px">حرّر هذا الجزء من الفاحص على اليسار.</p></div>',
        },
        styles: { paddingY: 24 },
      };
    default:
      return base;
  }
};

const DEMO_CONTENT: HomepageContent = {
  sections: [
    {
      id: newId("sec"),
      type: "hero",
      title: "أناقة تُناسب بيتك",
      subtitle: "مجموعة جديدة من الأثاث والديكور المصنوع بعناية ليضيف دفئًا وأناقة لمساحتك.",
      buttonText: "تسوق المجموعة",
      buttonLink: "/shop",
      height: "medium",
      backgroundImage: HERO_DEMO_BG,
      styles: { paddingY: 0 },
    },
    { id: newId("sec"), type: "categories", title: "تسوق حسب الفئة", styles: { paddingY: 32 } },
    { id: newId("sec"), type: "products", title: "الأكثر مبيعًا", count: 4, styles: { paddingY: 32 } },
    { id: newId("sec"), type: "testimonials", title: "ماذا قال عملاؤنا؟", styles: { paddingY: 32 } },
  ],
  settings: { containerWidth: "full", spacing: "normal", animation: true },
};

const parseContent = (raw: any): HomepageContent => {
  let content = raw;
  if (typeof raw === "string") {
    try {
      content = JSON.parse(raw);
    } catch {
      content = null;
    }
  }
  if (!content || !Array.isArray(content.sections)) {
    return JSON.parse(JSON.stringify(DEMO_CONTENT));
  }
  if (!content.settings) {
    content.settings = { containerWidth: "full", spacing: "normal", animation: true };
  }
  return content;
};

/* ============================== المكوّن الرئيسي ============================== */

const StorefrontEditor: React.FC = () => {
  const navigate = useNavigate();

  /* --------- الحالة العامة --------- */
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<HomepageTemplate | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [hist, setHist] = useState<{
    past: HomepageContent[];
    present: HomepageContent;
    future: HomepageContent[];
  }>(() => ({
    past: [],
    present: JSON.parse(JSON.stringify(DEMO_CONTENT)),
    future: [],
  }));
  const content = hist.present;
  const [templateName, setTemplateName] = useState("الصفحة الرئيسية");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceType>("desktop");
  const [zoom, setZoom] = useState(100);
  const [previewMode, setPreviewMode] = useState(false);

  const [panelMode, setPanelMode] = useState<"elements" | "layers">("elements");
  const [panelOpen, setPanelOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [search, setSearch] = useState("");

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const clip = (c: HomepageContent): HomepageContent =>
    JSON.parse(JSON.stringify(c));

  const commit = useCallback(
    (updater: (prev: HomepageContent) => HomepageContent) => {
      setHist((h) => ({
        past: [...h.past.slice(-49), clip(h.present)],
        present: updater(clip(h.present)),
        future: [],
      }));
      setDirty(true);
    },
    [],
  );

  const undo = useCallback(() => {
    setHist((h) =>
      h.past.length
        ? {
            past: h.past.slice(0, -1),
            present: h.past[h.past.length - 1],
            future: [h.present, ...h.future.slice(0, 49)],
          }
        : h,
    );
    setDirty(true);
  }, []);

  const redo = useCallback(() => {
    setHist((h) =>
      h.future.length
        ? {
            past: [...h.past.slice(-49), h.present],
            present: h.future[0],
            future: h.future.slice(1),
          }
        : h,
    );
    setDirty(true);
  }, []);

  /* --------- السحب والإفلات --------- */
  const dragRef = useRef<
    { kind: "move"; index: number } | { kind: "new"; type: string } | null
  >(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const sections = content.sections;

  const beginMove = (index: number) => {
    dragRef.current = { kind: "move", index };
    setDragActive(true);
  };
  const beginNew = (type: string) => {
    dragRef.current = { kind: "new", type };
    setDragActive(true);
  };
  const endDrag = () => {
    dragRef.current = null;
    setDropIndex(null);
    setDragActive(false);
  };

  const handleDrop = (target: number) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.kind === "move") {
      const from = drag.index;
      if (target !== from && target !== from + 1) {
        commit((prev) => {
          const list = [...prev.sections];
          const [moved] = list.splice(from, 1);
          const to = target > from ? target - 1 : target;
          list.splice(to, 0, moved);
          return { ...prev, sections: list };
        });
      }
    } else {
      const section = defaultSection(drag.type);
      commit((prev) => {
        const list = [...prev.sections];
        list.splice(target, 0, section);
        return { ...prev, sections: list };
      });
      setSelectedId(section.id);
    }
    endDrag();
  };

  const addSection = (type: string) => {
    const section = defaultSection(type);
    commit((prev) => ({ ...prev, sections: [...prev.sections, section] }));
    setSelectedId(section.id);
    toast.success(`تمت إضافة «${sectionLabel(type)}»`);
  };

  /* --------- عمليات على الأقسام --------- */
  const updateSection = (id: string, patch: Record<string, any>) => {
    commit((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const removeSection = (id: string) => {
    commit((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== id),
    }));
    if (selectedId === id) setSelectedId(null);
    toast.success("تم حذف القسم");
  };

  const duplicateSection = (id: string) => {
    const src = sections.find((s) => s.id === id);
    if (!src) return;
    const copy = { ...clip(src as any), id: newId("sec") };
    commit((prev) => {
      const list = [...prev.sections];
      const idx = list.findIndex((s) => s.id === id);
      list.splice(idx + 1, 0, copy);
      return { ...prev, sections: list };
    });
    setSelectedId(copy.id);
  };

  const moveSection = (id: string, dir: -1 | 1) => {
    const idx = sections.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= sections.length) return;
    commit((prev) => {
      const list = [...prev.sections];
      const [m] = list.splice(idx, 1);
      list.splice(target, 0, m);
      return { ...prev, sections: list };
    });
  };

  /* --------- الحفظ والنشر --------- */
  const savingRef = useRef(false);

  const doSave = useCallback(
    async (silent = false): Promise<HomepageTemplate | null> => {
      if (savingRef.current) return null;
      savingRef.current = true;
      setSaving(true);
      try {
        const payload = {
          name: templateName,
          description: template?.description,
          content,
        };
        let saved: HomepageTemplate | null = null;

        if (template && template.id && !template.isSystem && !template.id.startsWith("sys_")) {
          const res = await homepageService.updateTemplate(template.id, payload);
          saved = (res as any)?.data?.data || (res as any)?.data || template;
        } else {
          const res = await homepageService.createTemplate({
            name: template ? `${template.name} (نسخة معدّلة)` : templateName,
            content,
          } as Partial<HomepageTemplate>);
          saved = (res as any)?.data?.data || (res as any)?.data || null;
          if (!silent) toast.success("تم إنشاء قالب جديد وحفظ التعديلات");
        }

        if (saved && saved.id) {
          setTemplate((t) => ({ ...(t || ({} as HomepageTemplate)), ...saved, isSystem: false }));
          setIsDemo(false);
        }
        setDirty(false);
        setLastSavedAt(new Date());
        if (!silent) toast.success("تم الحفظ");
        return saved;
      } catch (e: any) {
        if (!silent) {
          toast.error(
            "تعذّر الحفظ — تأكد من تشغيل الخادم ومن صلاحيات حسابك. " +
              (e?.response?.data?.message || ""),
          );
        }
        return null;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [content, template, templateName],
  );

  const handlePublish = async () => {
    const saved = dirty || !template?.id ? await doSave(true) : template;
    if (!saved?.id) {
      toast.error("احفظ القالب أولًا قبل النشر");
      return;
    }
    try {
      await homepageService.setActiveTemplate(saved.id);
      setTemplate((t) => (t ? { ...t, isActive: true } : t));
      toast.success("تم نشر الواجهة — التغييرات ظاهرة الآن في المتجر");
    } catch {
      toast.error("تعذّر النشر — تأكد من تشغيل الخادم وصلاحياتك");
    }
  };

  /* --------- التحميل الأولي --------- */
  useEffect(() => {
    (async () => {
      try {
        let t: HomepageTemplate | null = null;
        try {
          const res = await homepageService.getActiveTemplate();
          t = (res as any)?.data?.data || (res as any)?.data || null;
        } catch {
          /* لا يوجد قالب نشط */
        }
        if (!t) {
          try {
            const listRes = await homepageService.getTemplates();
            const list: HomepageTemplate[] =
              (listRes as any)?.data?.data || (listRes as any)?.data || [];
            t = list.find((x) => x.isActive) || list[0] || null;
          } catch {
            /* تجاهل */
          }
        }
        if (t && t.content) {
          const parsed = parseContent(t.content);
          setTemplate(t);
          setHist({ past: [], present: parsed.sections.length ? parsed : parseContent(null), future: [] });
          setTemplateName(t.name || "الصفحة الرئيسية");
        } else {
          setIsDemo(true);
        }
      } catch {
        setIsDemo(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* --------- حفظ تلقائي هادئ --------- */
  useEffect(() => {
    if (!dirty || !template?.id || template.isSystem || template.id.startsWith("sys_")) return;
    const t = setTimeout(() => {
      doSave(true);
    }, 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, dirty]);

  /* --------- اختصارات لوحة المفاتيح --------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (meta && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
        e.preventDefault();
        redo();
      } else if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        doSave();
      } else if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, doSave]);

  /* --------- المشتقات --------- */
  const selected = useMemo(
    () => sections.find((s) => s.id === selectedId) || null,
    [sections, selectedId],
  );

  const filteredTiles = useMemo(
    () =>
      Object.entries(SECTION_META).filter(([, m]) =>
        search.trim() ? m.label.includes(search.trim()) : true,
      ),
    [search],
  );

  const renderSection = (section: HomepageSection) => {
    const settings = content.settings;
    switch (section.type) {
      case "hero":
        return <HeroSection section={section} settings={settings} />;
      case "features":
        return <FeaturesSection section={section} settings={settings} />;
      case "products":
        return <ProductsSection section={section} settings={settings} />;
      case "banner":
        return <BannerSection section={section} settings={settings} />;
      case "categories":
        return <CategoriesSection section={section} settings={settings} />;
      case "testimonials":
        return <TestimonialsSection section={section} settings={settings} />;
      case "custom":
        return <CustomSection section={section} settings={settings} />;
      default:
        return (
          <div className="p-10 text-center text-sm text-gray-400 border border-dashed border-gray-300 rounded-xl bg-gray-50">
            نوع القسم «{section.type}» غير مدعوم في المحرر حاليًا — سيظهر كما هو في المتجر.
          </div>
        );
    }
  };

  const frameWidth = DEVICE_WIDTHS[device];

  /* ============================== الواجهة ============================== */
  if (loading) {
    return (
      <div
        dir="rtl"
        className="fixed inset-0 z-[1000] bg-[#101114] flex items-center justify-center"
      >
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400 text-sm">جارِ تحميل محرر الواجهة…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[1000] flex flex-col bg-[#101114] text-white"
      onClick={() => setSelectedId(null)}
    >
      {/* أنماط مساعدة للمحرر */}
      <style>{`
        .maxp-sec-render:empty { min-height: 88px; display: flex; align-items: center; justify-content: center; }
        .maxp-sec-render:empty::before { content: attr(data-empty-label); font-size: 12px; color: #9aa0a8; border: 1px dashed #d6d8dd; border-radius: 10px; padding: 16px 24px; background: #fafbfc; max-width: 90%; text-align: center; }
      `}</style>

      {/* ═══════ الشريط العلوي ═══════ */}
      <header
        className="h-[54px] flex items-center gap-2 px-3 bg-[#17181c] border-b border-black/60 flex-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => navigate("/settings/store")}
          className="h-9 px-3 rounded-lg flex items-center gap-2 text-[13px] text-gray-300 hover:bg-white/5"
          title="رجوع إلى إعدادات المتجر"
        >
          <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
          رجوع
        </button>

        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-sm font-bold">
          م
        </div>

        <div className="text-[13.5px] font-semibold whitespace-nowrap">
          {templateName}
          {isDemo && (
            <span className="mr-2 text-[10px] font-normal text-amber-300/90 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
              وضع تجريبي — لا يوجد قالب نشط
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-sky-300/80 bg-sky-400/10 rounded-lg px-2.5 py-1 mr-1">
          <CheckIcon className="w-3.5 h-3.5" />
          {saving
            ? "جارِ الحفظ…"
            : lastSavedAt
              ? `تم الحفظ ${lastSavedAt.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`
              : "حفظ تلقائي مفعّل"}
        </div>

        <div className="flex-1" />

        {/* مثبّت المقاسات */}
        <div className="flex bg-[#1d1f24] rounded-[10px] p-[3px] gap-0.5">
          {(
            [
              ["desktop", ComputerDesktopIcon, "سطح المكتب"],
              ["tablet", DeviceTabletIcon, "تابلت"],
              ["mobile", DevicePhoneMobileIcon, "جوال"],
            ] as [DeviceType, any, string][]
          ).map(([d, Icon, label]) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              title={label}
              className={`h-[30px] px-3 rounded-lg flex items-center gap-1.5 text-[12px] ${
                device === d ? "bg-[#34383f] text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Icon className="w-[15px] h-[15px]" />
              {d === "desktop" && <span>{label}</span>}
            </button>
          ))}
        </div>

        <select
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="bg-[#1d1f24] border border-[#2c2f35] rounded-lg h-[34px] px-2 text-[12px] text-gray-300"
        >
          <option value={50}>50%</option>
          <option value={75}>75%</option>
          <option value={100}>100%</option>
          <option value={125}>125%</option>
        </select>

        <button
          onClick={undo}
          disabled={!hist.past.length}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-300 hover:bg-white/5 disabled:opacity-30"
          title="تراجع (Ctrl+Z)"
        >
          <ArrowUturnRightIcon className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={!hist.future.length}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-300 hover:bg-white/5 disabled:opacity-30"
          title="إعادة (Ctrl+Y)"
        >
          <ArrowUturnLeftIcon className="w-4 h-4" />
        </button>

        <button
          onClick={() => setPreviewMode((p) => !p)}
          className={`h-8 px-3 rounded-lg flex items-center gap-1.5 text-[12.5px] ${
            previewMode ? "bg-[#34383f] text-white" : "text-gray-300 hover:bg-white/5"
          }`}
        >
          <EyeIcon className="w-4 h-4" />
          معاينة
        </button>

        <button
          onClick={() => doSave()}
          disabled={saving}
          className="h-[34px] px-4 rounded-lg text-[12.5px] border border-[#33363c] text-gray-200 hover:bg-white/5 disabled:opacity-50"
        >
          حفظ
        </button>
        <button
          onClick={handlePublish}
          className="h-[34px] px-5 rounded-lg text-[13px] font-semibold bg-blue-600 hover:bg-blue-500 text-white"
        >
          نشر
        </button>
      </header>

      {/* ═══════ الجسم ═══════ */}
      <div className="flex-1 flex min-h-0">
        {/* شريط الأدوات الأيقوني */}
        {!previewMode && (
          <nav
            className="w-[54px] bg-[#17181c] border-l border-black/60 flex flex-col items-center py-2.5 gap-1 flex-none"
            onClick={(e) => e.stopPropagation()}
          >
            {(
              [
                ["elements", Squares2X2Icon, "إضافة", () => {
                  setPanelMode("elements");
                  setPanelOpen(true);
                }],
                ["layers", RectangleStackIcon, "طبقات", () => {
                  setPanelMode("layers");
                  setPanelOpen(true);
                }],
              ] as [string, any, string, () => void][]
            ).map(([key, Icon, label, act]) => (
              <button
                key={key}
                onClick={act}
                className={`w-10 h-10 rounded-[10px] flex flex-col items-center justify-center gap-0.5 ${
                  panelOpen && panelMode === key
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span className="text-[8.5px]">{label}</span>
              </button>
            ))}
            {(
              [
                [PhotoIcon, "وسائط"],
                [PaintBrushIcon, "أنماط"],
                [CodeBracketIcon, "كود"],
              ] as [any, string][]
            ).map(([Icon, label]) => (
              <button
                key={label}
                onClick={() => toast("🔜 «" + label + "» قادم في تحديث قريب")}
                className="w-10 h-10 rounded-[10px] flex flex-col items-center justify-center gap-0.5 text-gray-500 hover:text-gray-300 hover:bg-white/5"
              >
                <Icon className="w-[18px] h-[18px]" />
                <span className="text-[8.5px]">{label}</span>
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={() => toast("🔜 توليد كامل بالذكاء الاصطناعي — قادم قريبًا")}
              className="w-10 h-10 rounded-[10px] flex flex-col items-center justify-center gap-0.5 text-violet-300 hover:bg-white/5"
            >
              <SparklesIcon className="w-[18px] h-[18px]" />
              <span className="text-[8.5px]">AI</span>
            </button>
            <button
              onClick={() => setInspectorOpen((o) => !o)}
              className="w-10 h-10 rounded-[10px] flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-gray-200 hover:bg-white/5"
              title="إظهار/إخفاء الفاحص"
            >
              <Cog6ToothIcon className="w-[18px] h-[18px]" />
              <span className="text-[8.5px]">إعدادات</span>
            </button>
          </nav>
        )}

        {/* لوحة العناصر / الطبقات */}
        {!previewMode && panelOpen && (
          <aside
            className="w-[252px] bg-[#202226] border-l border-black/60 flex flex-col flex-none"
            onClick={(e) => e.stopPropagation()}
          >
            {panelMode === "elements" ? (
              <>
                <div className="px-3.5 pt-3.5 pb-2.5 text-[13px] font-semibold">إضافة عناصر</div>
                <div className="mx-3.5 mb-3 h-[34px] bg-[#17181c] border border-[#32353b] rounded-lg flex items-center gap-2 px-2.5 text-[12px] text-gray-500">
                  <MagnifyingGlassIcon className="w-4 h-4" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث عن عنصر…"
                    className="bg-transparent outline-none flex-1 text-gray-300 placeholder:text-gray-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 px-3.5 overflow-y-auto">
                  {filteredTiles.map(([type, meta]) => (
                    <button
                      key={type}
                      draggable
                      onDragStart={(e) => {
                        beginNew(type);
                        e.dataTransfer.effectAllowed = "copy";
                        e.dataTransfer.setData("text/plain", `maxp-new:${type}`);
                      }}
                      onDragEnd={endDrag}
                      onClick={() => addSection(type)}
                      className="bg-[#26292f] border border-[#33363c] rounded-[10px] h-[64px] flex flex-col items-center justify-center gap-1 text-[11px] text-gray-300 hover:border-blue-500/60 hover:bg-[#2a2e35] cursor-grab active:cursor-grabbing"
                      title={`${meta.hint} — اسحب إلى الصفحة أو اضغط للإضافة`}
                    >
                      <span className="text-[17px] leading-none">{meta.glyph}</span>
                      {meta.label}
                    </button>
                  ))}
                  <button
                    disabled
                    className="bg-[#202227] border border-dashed border-[#33363c] rounded-[10px] h-[64px] flex flex-col items-center justify-center gap-1 text-[11px] text-gray-500 cursor-not-allowed"
                    title="أقسام متجر إضافية قادمة قريبًا"
                  >
                    <span className="text-[17px] leading-none">🧩</span>
                    المزيد قريبًا
                  </button>
                </div>
                <div className="mt-auto mx-3.5 mb-3 pt-2.5 border-t border-dashed border-[#33363c] text-[10.5px] text-gray-500 text-center">
                  اسحب العنصر إلى مكانه في الصفحة، أو اضغط عليه لإضافته في النهاية
                </div>
              </>
            ) : (
              <>
                <div className="px-3.5 pt-3.5 pb-2.5 text-[13px] font-semibold">
                  طبقات الصفحة ({sections.length})
                </div>
                <div className="px-2 overflow-y-auto">
                  {sections.map((s, i) => (
                    <div key={s.id}>
                      <LayerDropZone index={i} active={dragActive} onDrop={handleDrop} onOver={setDropIndex} dropIndex={dropIndex} />
                      <button
                        draggable
                        onDragStart={() => beginMove(i)}
                        onDragEnd={endDrag}
                        onClick={() => setSelectedId(s.id)}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] mb-0.5 cursor-grab ${
                          selectedId === s.id
                            ? "bg-[#313131] text-white"
                            : "text-gray-300 hover:bg-white/5"
                        }`}
                      >
                        <span className="text-gray-500 text-[10px] tracking-widest">⠿</span>
                        <span className="text-[14px]">{SECTION_META[s.type]?.glyph || "▫️"}</span>
                        <span className="flex-1 text-right truncate">
                          {s.title || sectionLabel(s.type)}
                        </span>
                        <span className="text-[9.5px] text-gray-500">{sectionLabel(s.type)}</span>
                      </button>
                    </div>
                  ))}
                  <LayerDropZone index={sections.length} active={dragActive} onDrop={handleDrop} onOver={setDropIndex} dropIndex={dropIndex} last />
                </div>
              </>
            )}
          </aside>
        )}

        {/* ═══════ الكانفس ═══════ */}
        <div className="flex-1 min-w-0 bg-[#26282d] relative flex flex-col">
          {/* المسطرة */}
          <div
            className="h-[22px] flex-none border-b border-black/50"
            style={{
              backgroundColor: "#1d1f24",
              backgroundImage:
                "repeating-linear-gradient(90deg,#2c2f35 0 1px,transparent 1px 11px)",
            }}
          />

          <div
            className="flex-1 overflow-auto"
            onDragOver={(e) => {
              if (dragRef.current) {
                e.preventDefault();
                if (dropIndex === null) setDropIndex(sections.length);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(dropIndex ?? sections.length);
            }}
          >
            <div className="py-7 px-8 flex justify-center min-h-full">
              <div
                className="bg-white text-gray-900 shadow-[0_26px_60px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-200"
                style={{
                  width: frameWidth ? `${frameWidth}px` : "100%",
                  maxWidth: frameWidth ? undefined : "1160px",
                  ...(zoom !== 100 ? ({ zoom: zoom / 100 } as any) : {}),
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* ترويسة المتجر (عرض فقط) */}
                <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 bg-white">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-700 to-amber-900" />
                    <span className="text-[13px] font-bold">متجرك</span>
                  </div>
                  <div className="flex gap-4 text-[11px] text-gray-500">
                    <span>الرئيسية</span>
                    <span>المتجر</span>
                    <span>العروض</span>
                    <span>تواصل معنا</span>
                  </div>
                  <span className="text-[10.5px] text-gray-400">🛒 0</span>
                </div>

                {/* الأقسام + مناطق الإفلات */}
                {sections.length === 0 && (
                  <div className="p-16 text-center text-gray-400">
                    <p className="text-lg mb-1">الواجهة فارغة</p>
                    <p className="text-[13px]">اسحب عنصرًا من اللوحة الجانبية، أو اضغط عليه للإضافة</p>
                  </div>
                )}
                {sections.map((s, i) => (
                  <React.Fragment key={s.id}>
                    <SectionDropZone
                      index={i}
                      active={dragActive}
                      dropIndex={dropIndex}
                      onOver={setDropIndex}
                      onDrop={handleDrop}
                    />
                    <div
                      onClickCapture={(e) => {
                        const t = e.target as HTMLElement;
                        if (t.closest("[data-editor-ui]")) return;
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedId(s.id);
                      }}
                      className={`relative ${
                        selectedId === s.id ? "ring-2 ring-blue-500 ring-offset-0 z-10" : ""
                      }`}
                      style={{
                        paddingTop: s.styles?.paddingY || 0,
                        paddingBottom: s.styles?.paddingY || 0,
                      }}
                    >
                      {/* شارة التحديد وشريط الأدوات */}
                      {selectedId === s.id && !previewMode && (
                        <>
                          <span
                            data-editor-ui
                            className="absolute top-1.5 right-2 z-30 bg-blue-600 text-white text-[10.5px] font-semibold px-2.5 py-1 rounded-md shadow-lg flex items-center gap-1.5"
                          >
                            <span className="tracking-widest opacity-80">⠿</span>
                            {sectionLabel(s.type)}
                          </span>
                          <span
                            data-editor-ui
                            className="absolute top-1.5 left-2 z-30 flex bg-[#17181c] border border-[#33363c] rounded-lg overflow-hidden shadow-xl"
                          >
                            <button
                              draggable
                              onDragStart={() => beginMove(i)}
                              onDragEnd={endDrag}
                              title="اسحب لإعادة الترتيب"
                              className="w-7 h-7 flex items-center justify-center text-gray-300 hover:bg-white/10 cursor-grab active:cursor-grabbing border-l border-[#2c2f35]"
                            >
                              ⠿
                            </button>
                            <button
                              onClick={() => moveSection(s.id, -1)}
                              disabled={i === 0}
                              title="تحريك للأعلى"
                              className="w-7 h-7 flex items-center justify-center text-gray-300 hover:bg-white/10 disabled:opacity-30 border-l border-[#2c2f35]"
                            >
                              <ArrowUpIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveSection(s.id, 1)}
                              disabled={i === sections.length - 1}
                              title="تحريك للأسفل"
                              className="w-7 h-7 flex items-center justify-center text-gray-300 hover:bg-white/10 disabled:opacity-30 border-l border-[#2c2f35]"
                            >
                              <ArrowDownIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => duplicateSection(s.id)}
                              title="نسخ القسم"
                              className="w-7 h-7 flex items-center justify-center text-gray-300 hover:bg-white/10 border-l border-[#2c2f35]"
                            >
                              <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeSection(s.id)}
                              title="حذف القسم"
                              className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-500/15"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        </>
                      )}

                      <div
                        className="maxp-sec-render"
                        data-empty-label={`قسم «${sectionLabel(s.type)}» جاهز لكن لا توجد بيانات لعرضها الآن — سيظهر في المتجر عند توفّرها`}
                      >
                        {renderSection(s)}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
                <SectionDropZone
                  index={sections.length}
                  active={dragActive}
                  dropIndex={dropIndex}
                  onOver={setDropIndex}
                  onDrop={handleDrop}
                  last
                />

                {/* تذييل مصغّر */}
                <div className="flex items-center justify-between px-6 py-3.5 bg-[#241d15]">
                  <span className="text-[11px] text-amber-50 font-semibold">متجرك</span>
                  <span className="text-[9.5px] text-amber-100/60">
                    الدفع عند الاستلام • شحن لكل المحافظات
                  </span>
                </div>
              </div>
            </div>
          </div>

          {previewMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewMode(false);
              }}
              className="absolute bottom-4 right-1/2 translate-x-1/2 h-9 px-4 rounded-full bg-white text-gray-900 text-[12.5px] font-semibold shadow-2xl flex items-center gap-2"
            >
              <XMarkIcon className="w-4 h-4" /> خروج من المعاينة
            </button>
          )}
        </div>

        {/* ═══════ الفاحص ═══════ */}
        {!previewMode && inspectorOpen && (
          <aside
            className="w-[296px] bg-white text-gray-900 flex flex-col flex-none overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {selected ? (
              <SectionInspector
                section={selected}
                onChange={(patch) => updateSection(selected.id, patch)}
                onDelete={() => removeSection(selected.id)}
              />
            ) : (
              <GeneralInspector
                name={templateName}
                onName={(v) => {
                  setTemplateName(v);
                  setDirty(true);
                }}
                content={content}
                onSettings={(patch) =>
                  commit((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
                }
                sectionCount={sections.length}
              />
            )}
          </aside>
        )}
      </div>

      {/* ═══════ شريط الحالة ═══════ */}
      <footer
        className="h-[32px] flex-none bg-[#17181c] border-t border-black/60 flex items-center gap-4 px-4 text-[11px] text-gray-400"
        onClick={(e) => e.stopPropagation()}
      >
        <span>
          الهيكل ← الرئيسية ←{" "}
          <b className="text-gray-200">{selected ? sectionLabel(selected.type) : "—"}</b>
        </span>
        <span>{sections.length} أقسام</span>
        <span>{device === "desktop" ? "سطح المكتب" : device === "tablet" ? "تابلت 834px" : "جوال 390px"}</span>
        <span className="mr-auto">Ctrl+Z تراجع • Ctrl+S حفظ • Esc إلغاء التحديد</span>
      </footer>
    </div>
  );
};

/* ============================== مناطق الإفلات ============================== */

const SectionDropZone: React.FC<{
  index: number;
  dropIndex: number | null;
  active: boolean;
  last?: boolean;
  onOver: (i: number) => void;
  onDrop: (i: number) => void;
}> = ({ index, dropIndex, active, last, onOver, onDrop }) => {
  const isTarget = active && dropIndex === index;
  return (
    <div
      onDragOver={(e) => {
        if (!active) return;
        e.preventDefault();
        e.stopPropagation();
        onOver(index);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop(index);
      }}
      data-dropzone={index}
      className="relative z-20"
      style={{ height: last ? 18 : 12, marginBottom: last ? 6 : 0, marginTop: index === 0 ? 0 : -6 }}
    >
      {isTarget && (
        <div className="absolute inset-x-2 top-1/2 -translate-y-1/2">
          <div className="h-[3px] bg-blue-500 rounded-full relative">
            <span className="absolute -top-[3.5px] right-[-5px] w-2.5 h-2.5 rounded-full bg-white border-[3px] border-blue-500" />
            <span className="absolute -top-[3.5px] left-[-5px] w-2.5 h-2.5 rounded-full bg-white border-[3px] border-blue-500" />
          </div>
        </div>
      )}
    </div>
  );
};

const LayerDropZone: React.FC<{
  index: number;
  dropIndex: number | null;
  active: boolean;
  last?: boolean;
  onOver: (i: number) => void;
  onDrop: (i: number) => void;
}> = ({ index, dropIndex, active, last, onOver, onDrop }) => {
  const isTarget = active && dropIndex === index;
  return (
    <div
      onDragOver={(e) => {
        if (!active) return;
        e.preventDefault();
        e.stopPropagation();
        onOver(index);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop(index);
      }}
      className={`${last ? "h-[18px]" : "h-[6px]"} -my-[3px] relative z-10`}
    >
      {isTarget && (
        <div className="h-[2px] bg-blue-500 rounded-full mx-2 mt-[2px]" />
      )}
    </div>
  );
};

/* ============================== الفاحص ============================== */

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block mb-3">
    <span className="block text-[11.5px] text-gray-500 mb-1.5">{label}</span>
    {children}
  </label>
);

const inputCls =
  "w-full h-[34px] bg-[#f8f8f9] border border-[#e2e2e4] rounded-[9px] px-2.5 text-[12.5px] text-gray-900 outline-none focus:border-blue-500";

const Seg: React.FC<{
  options: { value: any; label: string }[];
  value: any;
  onChange: (v: any) => void;
}> = ({ options, value, onChange }) => (
  <div className="flex bg-[#f1f1f3] rounded-[9px] p-[3px] gap-0.5">
    {options.map((o) => (
      <button
        key={String(o.value)}
        onClick={() => onChange(o.value)}
        className={`flex-1 text-center text-[11.5px] py-1.5 rounded-[7px] ${
          value === o.value ? "bg-white text-gray-900 font-semibold shadow-sm" : "text-gray-500"
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const SectionInspector: React.FC<{
  section: HomepageSection;
  onChange: (patch: Record<string, any>) => void;
  onDelete: () => void;
}> = ({ section, onChange, onDelete }) => {
  const type = section.type;
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <b className="text-[14px] block">{sectionLabel(type)}</b>
          <span className="text-[11px] text-gray-400"># {section.id.slice(0, 12)}</span>
        </div>
        <span className="text-[10.5px] bg-gray-100 rounded-md px-2 py-1 text-gray-500">
          {SECTION_META[type]?.hint || type}
        </span>
      </div>

      <div className="border-t border-gray-100 pt-3">
        <div className="text-[10.5px] tracking-wider text-gray-400 font-semibold mb-2">المحتوى</div>

        <Field label="العنوان">
          <input
            className={inputCls}
            value={section.title || ""}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={sectionLabel(type)}
          />
        </Field>

        {(type === "hero" || type === "banner") && (
          <>
            <Field label="الوصف">
              <textarea
                className={`${inputCls} h-[64px] py-2 resize-none`}
                value={section.subtitle || ""}
                onChange={(e) => onChange({ subtitle: e.target.value })}
                placeholder="نص توضيحي قصير…"
              />
            </Field>
            <Field label="نص الزر">
              <input
                className={inputCls}
                value={section.buttonText || ""}
                onChange={(e) => onChange({ buttonText: e.target.value })}
                placeholder="تسوق الآن"
              />
            </Field>
            <Field label="رابط الزر">
              <input
                className={inputCls}
                dir="ltr"
                value={section.buttonLink || ""}
                onChange={(e) => onChange({ buttonLink: e.target.value })}
                placeholder="/shop"
              />
            </Field>
          </>
        )}

        {type === "hero" && (
          <Field label="ارتفاع القسم">
            <Seg
              value={section.height || "medium"}
              onChange={(v) => onChange({ height: v })}
              options={[
                { value: "small", label: "عادي" },
                { value: "medium", label: "متوسط" },
                { value: "large", label: "كبير" },
              ]}
            />
          </Field>
        )}

        {type === "products" && (
          <Field label="عدد المنتجات">
            <Seg
              value={section.count || 4}
              onChange={(v) => onChange({ count: v })}
              options={[
                { value: 4, label: "4" },
                { value: 8, label: "8" },
                { value: 12, label: "12" },
              ]}
            />
          </Field>
        )}

        {type === "custom" && (
          <Field label="كود HTML">
            <textarea
              className={`${inputCls} h-[130px] py-2 font-mono text-[11px] resize-none`}
              dir="ltr"
              value={section.content?.html || ""}
              onChange={(e) => onChange({ content: { ...(section.content || {}), html: e.target.value } })}
            />
          </Field>
        )}

        <div className="border-t border-gray-100 pt-3 mt-1">
          <div className="text-[10.5px] tracking-wider text-gray-400 font-semibold mb-2">
            المسافات الرأسية
          </div>
          <Seg
            value={section.styles?.paddingY ?? 0}
            onChange={(v) => onChange({ styles: { ...(section.styles || {}), paddingY: v } })}
            options={[
              { value: 0, label: "بدون" },
              { value: 24, label: "عادي" },
              { value: 48, label: "واسع" },
            ]}
          />
        </div>

        <div className="border-t border-gray-100 pt-3 mt-3 space-y-2">
          <button
            onClick={() => toast("🔜 Responsive AI: توليد نسخ الجوال والتابلت تلقائيًا — قادم قريبًا")}
            className="w-full border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-[11px] p-3 text-right"
          >
            <span className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
                <SparklesIcon className="w-3.5 h-3.5 text-white" />
              </span>
              <b className="text-[12px] text-violet-900">Responsive AI</b>
              <span className="text-[9.5px] text-violet-400 mr-auto">قريبًا</span>
            </span>
            <span className="text-[10.5px] text-violet-700/80 leading-relaxed block">
              توليد نسخة الجوال والتابلت لهذا القسم تلقائيًا بناءً على قواعد التخطيط.
            </span>
          </button>

          <button
            onClick={onDelete}
            className="w-full h-[36px] rounded-[9px] text-[12px] text-red-600 bg-red-50 hover:bg-red-100"
          >
            حذف القسم
          </button>
        </div>
      </div>
    </div>
  );
};

const GeneralInspector: React.FC<{
  name: string;
  onName: (v: string) => void;
  content: HomepageContent;
  onSettings: (patch: Record<string, any>) => void;
  sectionCount: number;
}> = ({ name, onName, content, onSettings, sectionCount }) => (
  <div className="p-4">
    <div className="flex items-center justify-between mb-4">
      <div>
        <b className="text-[14px] block">إعدادات الصفحة</b>
        <span className="text-[11px] text-gray-400">{sectionCount} أقسام</span>
      </div>
    </div>

    <Field label="اسم القالب">
      <input className={inputCls} value={name} onChange={(e) => onName(e.target.value)} />
    </Field>

    <Field label="عرض المحتوى">
      <Seg
        value={content.settings.containerWidth}
        onChange={(v) => onSettings({ containerWidth: v })}
        options={[
          { value: "full", label: "كامل العرض" },
          { value: "contained", label: "محتوى محدود" },
        ]}
      />
    </Field>

    <Field label="التباعد">
      <Seg
        value={content.settings.spacing}
        onChange={(v) => onSettings({ spacing: v })}
        options={[
          { value: "compact", label: "مضغوط" },
          { value: "normal", label: "عادي" },
          { value: "relaxed", label: "مريح" },
        ]}
      />
    </Field>

    <div className="flex items-center justify-between bg-[#f8f8f9] border border-[#ececee] rounded-[9px] px-3 py-2.5 mb-3">
      <span className="text-[12px] text-gray-600">تفعيل الحركات</span>
      <button
        onClick={() => onSettings({ animation: !content.settings.animation })}
        className={`w-[34px] h-5 rounded-full relative transition-colors ${
          content.settings.animation ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
            content.settings.animation ? "left-0.5" : "right-0.5"
          }`}
        />
      </button>
    </div>

    <div className="mt-4 border border-dashed border-gray-200 rounded-[11px] p-3 text-[11px] leading-relaxed text-gray-500">
      💡 اختر قسمًا من الكانفس لتحرير محتواه، أو اسحب عنصرًا جديدًا من لوحة «إضافة عناصر» إلى الصفحة.
    </div>
  </div>
);

export default StorefrontEditor;
