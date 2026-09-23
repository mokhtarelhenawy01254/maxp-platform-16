import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  BoltIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../../services/apiClient";

export interface QuickReply {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category?: string;
  imageUrls?: string[];
  isPinned?: boolean;
  platforms?: string[];
  text?: string;
}

interface QuickReplyDropdownProps {
  inputValue?: string;
  onSelectReply?: (reply: QuickReply) => void;
  onDirectSend?: (reply: QuickReply) => void;
  onClose: () => void;
  conversation?: any;
  user?: any;
  filter?: string;
  searchQuery?: string;
  onSelect?: (reply: QuickReply) => void;
  isOpen?: boolean;
}

// Fallback default quick replies (Egyptian commerce tailored)
const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  {
    id: "def-welcome",
    shortcut: "/ترحيب",
    title: "ترحيب بالعميل",
    content: "🌸 أهلاً وسهلاً بحضرتك يا فندم ❤️\nمنورانا وشرف لينا تواصلك معنا ✨\nكيف نقدر نساعدك اليوم؟",
    category: "عام",
  },
  {
    id: "def-order-confirm",
    shortcut: "/تأكيد",
    title: "تأكيد بيانات الطلب",
    content: "تمام يا فندم استأذن حضرتك تزويدنا بالبيانات دي لتأكيد الاوردر 🥰:\n▫️ الاسم:\n▫️ العنوان بالتفصيل:\n▫️ رقم التليفون:\n▫️ رقم احتياطي (لو متاح):",
    category: "طلبات",
  },
  {
    id: "def-thanks",
    shortcut: "/شكر",
    title: "شكر وتقدير",
    content: "شكراً جزيلاً لتواصلك معنا! نقدر ثقتك الغالية ونتمنى لك يوماً سعيداً دائماً 🙏❤️",
    category: "عام",
  },
  {
    id: "def-shipping",
    shortcut: "/شحن",
    title: "الشحن والتوصيل",
    content: "التوصيل متاح لجميع المحافظات خلال 2-4 أيام عمل، مع إمكانية المعاينة قبل الاستلام 🚚📦",
    category: "شحن",
  },
  {
    id: "def-payment",
    shortcut: "/دفع",
    title: "طرق الدفع",
    content: "متاح لدينا: الدفع عند الاستلام كاش بعد المعاينة، أو الدفع عبر المحافظ الإلكترونية والبطاقات البنكية 💳💵",
    category: "دفع",
  },
  {
    id: "def-order-status",
    shortcut: "/متابعة",
    title: "متابعة حالة الطلب",
    content: "طلبك رقم #{{order_id}} قيد المتابعة مع شركة الشحن وسيصلك قريباً جداً 📦🚚",
    category: "طلبات",
  },
  {
    id: "def-price",
    shortcut: "/سعر",
    title: "العروض والأسعار",
    content: "سعر المنتج {{price}} جنيه، ومتاح عروض وخصومات مميزة على الكميات 🛍️",
    category: "مبيعات",
  },
  {
    id: "def-store",
    shortcut: "/متجر",
    title: "رابط المتجر",
    content: "تفضلي بزيارة متجرنا للاطلاع على جميع الموديلات والتفاصيل:\n🌐 {{website}}",
    category: "مبيعات",
  },
];

// Module-level cache for quick replies
let cachedQuickReplies: QuickReply[] | null = null;
let lastFetchTime = 0;

const QuickReplyDropdown: React.FC<QuickReplyDropdownProps> = ({
  inputValue = "",
  filter = "",
  searchQuery = "",
  onSelectReply,
  onSelect,
  onDirectSend,
  onClose,
}) => {
  const [replies, setReplies] = useState<QuickReply[]>(
    cachedQuickReplies || DEFAULT_QUICK_REPLIES,
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("الكل");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(!cachedQuickReplies);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);
  const isSelectingRef = useRef(false);

  const handleItemSelect = useCallback(
    (e: React.UIEvent, reply: QuickReply) => {
      e.stopPropagation();
      if (isSelectingRef.current) return;
      isSelectingRef.current = true;
      if (onSelectReply) {
        onSelectReply(reply);
      } else if (onSelect) {
        onSelect(reply);
      }
      setTimeout(() => {
        isSelectingRef.current = false;
      }, 300);
    },
    [onSelectReply, onSelect],
  );

  const handleDirectSendClick = useCallback(
    (e: React.UIEvent, reply: QuickReply) => {
      e.stopPropagation();
      if (isSelectingRef.current) return;
      isSelectingRef.current = true;
      onDirectSend?.(reply);
      setTimeout(() => {
        isSelectingRef.current = false;
      }, 300);
    },
    [onDirectSend],
  );

  // Fetch quick replies & saved texts from API
  useEffect(() => {
    let isMounted = true;
    const now = Date.now();

    // Cache valid for 30 seconds
    if (cachedQuickReplies && now - lastFetchTime < 30000) {
      setReplies(cachedQuickReplies);
      setLoading(false);
      return;
    }

    const fetchReplies = async () => {
      try {
        const [qrRes, galleryRes, smartRepliesRes] = await Promise.all([
          apiClient.get<{ success?: boolean; data?: any[] }>(
            "/unified-inbox/quick-replies",
          ).catch(() => null),
          apiClient.get<{ success?: boolean; texts?: any[] }>(
            "/user/text-gallery",
          ).catch(() => null),
          apiClient.get<{ success?: boolean; data?: any }>(
            "/smart-replies/rule-responses",
          ).catch(() => null),
        ]);

        if (!isMounted) return;

        let combined: QuickReply[] = [];

        // Add smart replies templates from /settings/smart-replies
        if (
          smartRepliesRes?.data?.success &&
          Array.isArray(smartRepliesRes.data.data?.customRuleResponses?.templates)
        ) {
          const templates = smartRepliesRes.data.data.customRuleResponses.templates;
          templates.forEach((t: any) => {
            const templateName = t.name || "قالب رد";
            const firstKw =
              Array.isArray(t.keywords) && t.keywords.length > 0
                ? t.keywords[0]
                : templateName;
            const cleanShortcut = `/${firstKw.trim().replace(/[\s\/\\]+/g, "_")}`;
            const responses = Array.isArray(t.responses) ? t.responses : [];
            responses.forEach((respText: string, rIdx: number) => {
              if (!respText || !respText.trim()) return;
              combined.push({
                id: `smart-reply-${t.id}-${rIdx}`,
                shortcut: cleanShortcut,
                title: responses.length > 1 ? `${templateName} (${rIdx + 1})` : templateName,
                content: respText.trim(),
                category: "قوالب الردود",
                isPinned: true,
              });
            });
          });
        }

        // Add unified/WA quick replies
        if (qrRes?.data?.success && Array.isArray(qrRes.data.data)) {
          combined.push(
            ...qrRes.data.data.map((r: any) => ({
              id: String(r.id),
              shortcut: r.shortcut?.startsWith("/") ? r.shortcut : `/${r.shortcut}`,
              title: r.title || "رد سريع",
              content: r.content || "",
              category: r.category || "عام",
              imageUrls: r.imageUrls || (r.mediaUrl ? [r.mediaUrl] : undefined),
              isPinned: !!r.isPinned,
            })),
          );
        }

        // Add user text gallery items
        if (galleryRes?.data?.success && Array.isArray(galleryRes.data.texts)) {
          const galleryItems: QuickReply[] = galleryRes.data.texts.map((t: any) => {
            const cleanTitle = (t.title || "رد_محفوظ")
              .trim()
              .replace(/[\s\/\\]+/g, "_");
            return {
              id: `gallery-${t.id}`,
              shortcut: `/${cleanTitle}`,
              title: t.title || "نص محفوظ",
              content: t.content || "",
              category: "نصوص محفوظة",
              imageUrls: Array.isArray(t.imageUrls) ? t.imageUrls : undefined,
              isPinned: !!t.isPinned,
            };
          });

          // Avoid duplicates by title/content
          const existingIds = new Set(combined.map((c) => c.id));
          galleryItems.forEach((item) => {
            if (!existingIds.has(item.id)) {
              combined.push(item);
            }
          });
        }

        // If no items returned from API, fallback to localized defaults
        if (combined.length === 0) {
          combined = DEFAULT_QUICK_REPLIES;
        }

        cachedQuickReplies = combined;
        lastFetchTime = Date.now();
        setReplies(combined);
      } catch (err) {
        console.warn("Could not load quick replies from API:", err);
        if (isMounted && (!cachedQuickReplies || cachedQuickReplies.length === 0)) {
          setReplies(DEFAULT_QUICK_REPLIES);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchReplies();

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    cats.add("الكل");
    replies.forEach((r) => {
      if (r.category) cats.add(r.category);
    });
    return Array.from(cats);
  }, [replies]);

  // Filter replies based on input, filter prop, searchQuery and category
  const filteredReplies = useMemo(() => {
    const rawSearch = (searchQuery || filter || inputValue || "").trim();
    let term = rawSearch;
    const lastSlash = term.lastIndexOf("/");
    if (lastSlash !== -1) {
      term = term.slice(lastSlash + 1).trim().toLowerCase();
    } else {
      term = term.toLowerCase();
    }

    return replies.filter((reply) => {
      // Category filter
      if (selectedCategory !== "الكل" && reply.category !== selectedCategory) {
        return false;
      }

      // If no search term, return all in category
      if (!term) return true;

      const shortcutClean = reply.shortcut.replace(/^\//, "").toLowerCase();
      const titleClean = reply.title.toLowerCase();
      const contentClean = reply.content.toLowerCase();

      return (
        shortcutClean.includes(term) ||
        titleClean.includes(term) ||
        contentClean.includes(term)
      );
    });
  }, [replies, inputValue, filter, searchQuery, selectedCategory]);

  // Reset selected index on filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [inputValue, filter, searchQuery, selectedCategory]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredReplies.length === 0) {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredReplies.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredReplies.length - 1,
          );
          break;
        case "Enter":
        case "Tab":
          e.preventDefault();
          e.stopPropagation();
          {
            const selectedReply = filteredReplies[selectedIndex];
            if (selectedReply) {
              onSelectReply(selectedReply);
            }
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [filteredReplies, selectedIndex, onSelectReply, onClose]);

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
      />

      {/* Dropdown Floating Surface */}
      <div
        ref={dropdownRef}
        dir="rtl"
        className="absolute bottom-full mb-1.5 inset-x-1 sm:inset-x-auto sm:start-0 sm:end-auto sm:w-[480px] sm:mb-2 z-40 max-h-[42vh] sm:max-h-[420px] flex flex-col rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-opacity duration-150 text-foreground"
        style={{
          boxShadow:
            "0 20px 45px -15px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/75 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BoltIcon className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                الردود السريعة
              </span>
              <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {filteredReplies.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {loading && (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
              title="إغلاق"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        {categories.length > 1 && (
          <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto no-scrollbar border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/30">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}

        {/* List of Replies */}
        <div
          ref={listRef}
          className="overflow-y-auto p-2 space-y-1.5 flex-1 min-h-0"
        >
          {filteredReplies.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <SparklesIcon className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                لا توجد ردود تطابق البحث
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                اكتب نصاً مختلفاً أو اختر تصنيفاً آخر
              </p>
            </div>
          ) : (
            filteredReplies.map((reply, index) => {
              const isActive = index === selectedIndex;
              return (
                <div
                  key={reply.id}
                  ref={isActive ? selectedItemRef : null}
                  role="button"
                  tabIndex={0}
                  className={`group relative flex items-start justify-between gap-2.5 rounded-xl p-2.5 text-start transition-all cursor-pointer border select-none ${
                    isActive
                      ? "bg-primary/10 dark:bg-primary/20 border-primary/40 dark:border-primary/50 shadow-sm"
                      : "bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60"
                  }`}
                  onClick={(e) => handleItemSelect(e, reply)}
                >
                  {/* Left content block */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {reply.title}
                      </span>

                      {reply.category && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                          {reply.category}
                        </span>
                      )}

                      {reply.imageUrls && reply.imageUrls.length > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          <PhotoIcon className="w-3 h-3" />
                          <span>{reply.imageUrls.length}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed whitespace-pre-line">
                      {reply.content}
                    </p>
                  </div>

                  {/* Right actions: Shortcut chip + Direct Send */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 self-center">
                    <span
                      dir="ltr"
                      className="text-[11px] font-mono font-bold px-2 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-primary dark:text-blue-400 border border-slate-300/80 dark:border-slate-700"
                      style={{ unicodeBidi: "isolate" }}
                    >
                      {reply.shortcut}
                    </span>

                    {onDirectSend && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDirectSendClick(e, reply);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 hover:bg-primary text-primary hover:text-white dark:bg-primary/25 dark:hover:bg-primary dark:text-blue-300 dark:hover:text-white transition-colors shadow-xs"
                        title="إرسال مباشر للعميل فوراً"
                      >
                        <PaperAirplaneIcon className="w-3.5 h-3.5 rtl:-scale-x-100" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hint & Settings Link */}
        <div className="flex items-center justify-between px-3.5 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[11px] text-slate-500 dark:text-slate-400 gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <span>💡</span>
            <span className="hidden sm:inline">
              استخدم ↑ ↓ للتنقل، Enter أو Tab للاختيار، Esc للإغلاق
            </span>
            <span className="sm:hidden truncate">
              اضغط على الرد لاختياره، أو على السهم للإرسال الفوري
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href="/settings/smart-replies"
              onClick={() => onClose()}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              title="الانتقال إلى شاشة الردود التلقائية لتعديل القوالب"
            >
              <span>⚙️ تعديل القوالب</span>
            </a>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
              / للردود
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuickReplyDropdown;
