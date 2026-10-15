import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Search,
  MessageSquare,
  Send,
  Sparkles,
} from "lucide-react";
import { apiService, SavedReply } from "../../services/apiService";

interface SavedRepliesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReply: (reply: SavedReply) => void;
}

const CATEGORIES: Array<{
  key: string;
  label: string;
  badgeClass: string;
}> = [
  { key: "all", label: "الكل", badgeClass: "bg-muted text-foreground" },
  {
    key: "welcome",
    label: "ترحيب",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  {
    key: "thanks",
    label: "شكر",
    badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  },
  {
    key: "apology",
    label: "اعتذار",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  {
    key: "followup",
    label: "متابعة",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  {
    key: "closing",
    label: "ختام",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  {
    key: "custom",
    label: "مخصص",
    badgeClass: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
  },
];

const SavedReplies: React.FC<SavedRepliesProps> = ({
  isOpen,
  onClose,
  onSelectReply,
}) => {
  const [replies, setReplies] = useState<SavedReply[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newReply, setNewReply] = useState({
    title: "",
    content: "",
    category: "custom" as SavedReply["category"],
  });

  const loadReplies = async () => {
    try {
      const savedReplies = await apiService.getSavedReplies();
      setReplies(savedReplies || []);
    } catch (error) {
      console.error("Error loading saved replies:", error);
    }
  };

  const createReply = async () => {
    if (!newReply.title.trim() || !newReply.content.trim()) return;

    try {
      await apiService.createSavedReply(newReply);
      await loadReplies();
      setNewReply({ title: "", content: "", category: "custom" });
      setIsCreating(false);
    } catch (error) {
      console.error("Error creating reply:", error);
    }
  };

  const deleteReply = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiService.deleteSavedReply(id);
      await loadReplies();
    } catch (error) {
      console.error("Error deleting reply:", error);
    }
  };

  const filteredReplies = replies.filter((reply) => {
    const matchesCategory =
      selectedCategory === "all" || reply.category === selectedCategory;
    const matchesSearch =
      reply.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reply.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    if (isOpen) {
      loadReplies();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="bg-card border border-border/70 text-card-foreground shadow-2xl rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                الردود الجاهزة المحفوظة
              </h2>
              <p className="text-xs text-muted-foreground tabular-nums">
                {filteredReplies.length} رد متوفر للاستخدام السريع
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search and Category Filter */}
        <div className="p-4 border-b border-border/60 bg-muted/10 space-y-2.5">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="البحث في الردود بالعنوان أو النص..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-4 py-2 text-sm bg-background border border-border/70 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors border ${
                    isActive
                      ? "bg-foreground text-background border-foreground shadow-sm"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground border-border/50 hover:bg-muted"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Create Form Section */}
        {isCreating && (
          <div className="p-4 border-b border-border/60 bg-muted/15 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                إضافة قالب رد جديد
              </span>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewReply({ title: "", content: "", category: "custom" });
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                إلغاء
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="عنوان الرد (مثال: شكر العميل)"
                value={newReply.title}
                onChange={(e) =>
                  setNewReply({ ...newReply, title: e.target.value })
                }
                className="sm:col-span-2 px-3 py-1.5 text-xs bg-background border border-border/70 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <select
                value={newReply.category}
                onChange={(e) =>
                  setNewReply({
                    ...newReply,
                    category: e.target.value as SavedReply["category"],
                  })
                }
                className="px-2.5 py-1.5 text-xs bg-background border border-border/70 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              >
                {CATEGORIES.filter((c) => c.key !== "all").map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              placeholder="نص الرد الكامل الجاهز للإرسال..."
              value={newReply.content}
              onChange={(e) =>
                setNewReply({ ...newReply, content: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 text-xs bg-background border border-border/70 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewReply({ title: "", content: "", category: "custom" });
                }}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/60 rounded-lg hover:bg-muted/40 transition-colors"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={createReply}
                disabled={!newReply.title.trim() || !newReply.content.trim()}
                className="px-3.5 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                حفظ القالب
              </button>
            </div>
          </div>
        )}

        {/* Replies List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full mb-1 py-2 px-3 text-xs font-medium text-foreground bg-muted/40 hover:bg-muted border border-dashed border-border/80 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-primary" />
              إنشاء رد جديد
            </button>
          )}

          {filteredReplies.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto opacity-20 mb-2" />
              <p className="text-xs">لا توجد ردود محفوظة تطابق البحث</p>
            </div>
          ) : (
            filteredReplies.map((reply) => {
              const catMeta = CATEGORIES.find((c) => c.key === reply.category);
              return (
                <div
                  key={reply.id}
                  onClick={() => onSelectReply(reply)}
                  className="group relative p-3.5 rounded-xl border border-border/60 hover:border-primary/40 bg-card hover:bg-muted/20 transition-all cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        {reply.title}
                      </h4>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${
                          catMeta?.badgeClass || "bg-muted text-muted-foreground"
                        }`}
                      >
                        {catMeta?.label || reply.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => deleteReply(reply.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-all"
                        title="حذف الرد"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {reply.content}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-primary/80 group-hover:text-primary flex items-center gap-1 font-medium">
                      <Send className="w-3 h-3" />
                      استخدام هذا الرد
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedReplies;
