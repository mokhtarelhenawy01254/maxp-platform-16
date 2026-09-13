import React, { useState, useEffect, useRef } from "react";
import {
  Layers,
  Sparkles,
  Upload,
  Search,
  Check,
  Camera,
  Trash2,
  RefreshCw,
  PlusCircle,
} from "lucide-react";
import type { ProductCategory, SceneLibraryItem } from "./types";

interface CreativeSceneLibraryTabProps {
  productName: string;
  selectedCategory: ProductCategory;
  onSelectScenePreset: (scene: SceneLibraryItem, autoSwapPrompt: string) => void;
  onTriggerGenerateWithPrompt?: (prompt: string) => void;
}

const DEFAULT_SCENE_PRESETS: SceneLibraryItem[] = [
  {
    id: "scene-sneakers-street-walk",
    titleAr: "عارضة ترتدي حذاء في الشارع العصري",
    titleEn: "On-Model Sneakers Street Walk",
    category: "shoes",
    previewUrl:
      "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=800&auto=format&fit=crop&q=80",
    modelPoseDescription: "خطوة مشي طبيعية واثقة لعارضة ترتدي بنطال جينز مع التركيز الكامل على الحذاء وظلال الرصيف الصباحي",
    promptTemplate:
      "Commercial product swap photography: Replace the footwear on the female model with the exact merchant shoes: {productName}. Crisp morning street sidewalk pavement, natural soft sunlight with rim light, photorealistic denim texture, contact shadow on asphalt, ultra-detailed 8k resolution.",
    tags: ["#OnModel", "#Streetwear", "#تبديل_حذاء", "#واقعي"],
  },
  {
    id: "scene-sneakers-gym-motion",
    titleAr: "عارض رياضي يرتدي حذاء في الجيم",
    titleEn: "On-Model Athletic Gym Workout",
    category: "shoes",
    previewUrl:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80",
    modelPoseDescription: "وضعية تمرين قرفصاء / ركض ديناميكية في صالة جيم فخمة تبرز متونة وانسيابية نعل الحذاء",
    promptTemplate:
      "High-energy sports commercial: Seamlessly composite and swap {productName} onto the male athlete's feet during an explosive sprint move in a modern high-end gym. Dramatic directional lighting, polished rubber gym floor reflections, 8k resolution.",
    tags: ["#OnModel", "#رياضة", "#حركة_ديناميكية", "#تبديل_حذاء"],
  },
  {
    id: "scene-perfume-hand-luxury",
    titleAr: "يد فخمة تمسك زجاجة عطر ملكي",
    titleEn: "On-Model Luxury Hand Holding Perfume",
    category: "perfume",
    previewUrl:
      "https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=800&auto=format&fit=crop&q=80",
    modelPoseDescription: "يد رجل / سيدة بأظافر مشذبة وخاتم راقٍ تمسك زجاجة العطر في إضاءة استوديو ليلية ساحرة",
    promptTemplate:
      "Luxury fragrance advertising shoot: A manicured hand gently gripping the perfume bottle of {productName}. Dark moody marble background with soft warm amber bokeh, crystalline liquid refraction, 100mm macro lens focus, flawless commercial lighting.",
    tags: ["#OnModel", "#عطور", "#لقطة_يد", "#فخامة"],
  },
  {
    id: "scene-skincare-face-routine",
    titleAr: "عارضة تضع مستحضر العناية بالبشرة",
    titleEn: "On-Model Skincare Face Routine",
    category: "skincare",
    previewUrl:
      "https://images.unsplash.com/photo-1512290900672-1f55a1532c1c?w=800&auto=format&fit=crop&q=80",
    modelPoseDescription: "عارضة ذات بشرة نضرة تبتسم وتضع لمسة من كريم أو سيروم المنتج مع قطرات ماء رقيقة",
    promptTemplate:
      "Clean beauty cosmetics campaign: Replace the skincare product bottle in the model's hand with {productName}. Bright clean spa bathroom ambiance, glowing dewy skin, gentle water droplets, soft pastel morning lighting, hyper-realistic, 8k.",
    tags: ["#OnModel", "#عناية", "#بشرة_نقية", "#سبا"],
  },
  {
    id: "scene-watch-luxury-wristshot",
    titleAr: "معصم يرتدي ساعة فاخرة بدقة ماكرو",
    titleEn: "On-Model Luxury Watch Wristshot",
    category: "watches",
    previewUrl:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80",
    modelPoseDescription: "معصم شخص يرتدي بدلة إيطالية فاخرة ويعدل زر الكم مبرزاً تفاصيل ميناء الساعة الفاخر",
    promptTemplate:
      "Horology macro commercial: Seamlessly swap the timepiece on the businessman's tailored wrist with {productName}. Fine cashmere suit fabric texture, soft executive lounge daylight, crisp sapphire glass anti-reflective coating, 8k perfection.",
    tags: ["#OnModel", "#ساعات", "#معصم", "#رجال_أعمال"],
  },
  {
    id: "scene-tech-modern-desk",
    titleAr: "مكتب عمل تقني عصري مع شخص منتج",
    titleEn: "On-Model Tech Productivity Desk",
    category: "electronics",
    previewUrl:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80",
    modelPoseDescription: "شخص يعمل بتركيز على مكتب خشب جوز فاخر، ويظهر الجهاز الإلكتروني كعنصر أساسي مريح",
    promptTemplate:
      "Modern tech aesthetic: Professionally integrate {productName} onto a minimalist walnut workspace desk next to a creative professional at work. Warm ambient LED desk lamp, blurred Scandinavian interior, pristine product placement, 8k.",
    tags: ["#OnModel", "#تقنية", "#مكتب_إنتاجي", "#لايف_ستايل"],
  },
  {
    id: "scene-apparel-studio-lookbook",
    titleAr: "عارض أزياء في جلسة تصوير استوديو",
    titleEn: "On-Model Fashion Apparel Lookbook",
    category: "apparel",
    previewUrl:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80",
    modelPoseDescription: "عارض شاب بوقفة أزياء عصرية وخلفية رمادية ناعمة تبرز قصة وخامة قطعة الملابس",
    promptTemplate:
      "Editorial fashion lookbook: Seamlessly replace the model's garment with {productName}, preserving natural body contours, fabric drape, and dynamic folds. High-end cyclorama studio lighting, magazine cover quality, 8k.",
    tags: ["#OnModel", "#أزياء", "#لوك_بوك", "#استوديو"],
  },
  {
    id: "scene-gourmet-table-dining",
    titleAr: "طاولة طعام راقية ومشروب منعش",
    titleEn: "Gourmet Table & Refreshment Dining",
    category: "food",
    previewUrl:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80",
    modelPoseDescription: "يد ترفع كأساً أو تستمتع بوجبة في مطعم ريفي دافئ مع إضاءة شمع وإكسسوارات طعام طازجة",
    promptTemplate:
      "Artisan culinary commercial: Place the merchant's food/beverage product {productName} prominently on a rustic wooden restaurant table with fresh rosemary and soft bokeh candlelight, mouth-watering gourmet atmosphere, 8k.",
    tags: ["#طعام", "#مطاعم", "#أجواء_دافئة", "#طازج"],
  },
];

const STORAGE_KEY = "maxp_creative_custom_scenes_v1";

export const CreativeSceneLibraryTab: React.FC<CreativeSceneLibraryTabProps> = ({
  productName,
  selectedCategory,
  onSelectScenePreset,
  onTriggerGenerateWithPrompt,
}) => {
  const [scenes, setScenes] = useState<SceneLibraryItem[]>([]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<"ALL" | ProductCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSceneId, setAppliedSceneId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // New Custom Scene Form
  const [newTitle, setNewTitle] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newCategory, setNewCategory] = useState<ProductCategory>(selectedCategory || "shoes");
  const [newPreviewUrl, setNewPreviewUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load custom scenes on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const customItems: SceneLibraryItem[] = JSON.parse(saved);
        setScenes([...customItems, ...DEFAULT_SCENE_PRESETS]);
      } else {
        setScenes(DEFAULT_SCENE_PRESETS);
      }
    } catch {
      setScenes(DEFAULT_SCENE_PRESETS);
    }
  }, []);

  const handleSaveCustomScene = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPreviewUrl) return;

    const newScene: SceneLibraryItem = {
      id: `custom-scene-${Date.now()}`,
      titleAr: newTitle.trim(),
      titleEn: newTitle.trim(),
      category: newCategory,
      previewUrl: newPreviewUrl,
      modelPoseDescription: "مشهد مخصص تم رفعه وحفظه بواسطة التاجر",
      promptTemplate:
        newPrompt.trim() ||
        `Commercial advertising placement: Seamlessly integrate {productName} into this custom photography scene with realistic lighting, contact shadows, and 8k perfection.`,
      tags: ["#مشهد_خاص", "#مخصص"],
      isCustom: true,
    };

    const updated = [newScene, ...scenes];
    setScenes(updated);

    try {
      const customOnly = updated.filter((s) => s.isCustom);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));
    } catch (err) {
      console.warn("Failed to persist custom scene:", err);
    }

    setNewTitle("");
    setNewPrompt("");
    setNewPreviewUrl("");
    setShowUploadModal(false);
  };

  const handleDeleteCustomScene = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = scenes.filter((s) => s.id !== id);
    setScenes(updated);
    try {
      const customOnly = updated.filter((s) => s.isCustom);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));
    } catch (err) {
      console.warn("Failed to delete custom scene:", err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setNewPreviewUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleApplySwap = (scene: SceneLibraryItem, autoGenerate: boolean = false) => {
    setAppliedSceneId(scene.id);
    const targetProduct = productName || "المنتج التجاري";
    const resolvedPrompt = scene.promptTemplate.replace(/\{productName\}/g, targetProduct);

    onSelectScenePreset(scene, resolvedPrompt);

    if (autoGenerate && onTriggerGenerateWithPrompt) {
      onTriggerGenerateWithPrompt(resolvedPrompt);
    }
  };

  // Filtered scenes
  const filteredScenes = scenes.filter((scene) => {
    const matchesCategory =
      activeCategoryFilter === "ALL" || scene.category === activeCategoryFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      scene.titleAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scene.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      scene.modelPoseDescription.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">
      {/* Header Bar */}
      <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex-shrink-0 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>مكتبة المشاهد والتبديل (Scene Swap)</span>
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono px-1.5 py-0.2 rounded-full">
                  2026 Engine
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                اختر مشهد موديل جاهز واستبدله بمنتجك بضغطة زر واحدة مع الحفاظ على وضعية الموديل والظلال
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 transition flex items-center gap-1 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>رفع مشهد خاص</span>
          </button>
        </div>

        {/* Search & Category Filter Pills */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، الفئة أو الوسم (#OnModel)..."
              className="w-full pl-3 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: "ALL", label: "الكل" },
              { id: "shoes", label: "أحذية" },
              { id: "perfume", label: "عطور" },
              { id: "skincare", label: "عناية" },
              { id: "watches", label: "ساعات" },
              { id: "electronics", label: "تقنية" },
              { id: "apparel", label: "أزياء" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryFilter(cat.id as any)}
                className={`px-2 py-1 text-[11px] font-bold rounded-md whitespace-nowrap transition cursor-pointer ${
                  activeCategoryFilter === cat.id
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Scenes */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredScenes.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Camera className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-xs text-slate-500">لا توجد مشاهد مطابقة للبحث المحدد</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredScenes.map((scene) => {
              const isApplied = appliedSceneId === scene.id;
              return (
                <div
                  key={scene.id}
                  className={`group relative rounded-xl border transition-all duration-200 flex flex-col overflow-hidden bg-white dark:bg-slate-900/90 shadow-2xs hover:shadow-md ${
                    isApplied
                      ? "border-indigo-500 ring-2 ring-indigo-500/20"
                      : "border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {/* Image Container with Aspect Ratio */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-950">
                    <img
                      src={scene.previewUrl}
                      alt={scene.titleAr}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                      loading="lazy"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

                    {/* Top Badges */}
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-black/60 backdrop-blur-md text-white border border-white/10">
                        {scene.category.toUpperCase()}
                      </span>
                      {scene.isCustom && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/90 text-white">
                          مخصص
                        </span>
                      )}
                    </div>

                    {scene.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustomScene(scene.id, e)}
                        className="absolute top-2 left-2 p-1.5 rounded-md bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-sm transition cursor-pointer"
                        title="حذف هذا المشهد من مكتبتي"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Title Overlay */}
                    <div className="absolute bottom-2 right-2 left-2 pointer-events-none">
                      <h4 className="text-xs font-bold text-white drop-shadow-xs line-clamp-1">
                        {scene.titleAr}
                      </h4>
                      <p className="text-[10px] text-slate-200/90 line-clamp-1">
                        {scene.modelPoseDescription}
                      </p>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between space-y-2">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {scene.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    {/* Action Bar */}
                    <div className="pt-1 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleApplySwap(scene, false)}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          isApplied
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-slate-900 hover:bg-black text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900"
                        }`}
                      >
                        {isApplied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>تم تطبيق المشهد</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>استبدال بمنتجي هنا</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplySwap(scene, true)}
                        className="py-1.5 px-2.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1 cursor-pointer"
                        title="تطبيق المشهد وبدء التوليد فوراً"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>توليد فوراً</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Custom Scene Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>رفع وحفظ مشهد جديد في مكتبتك الخاصة</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomScene} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان المشهد
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: عارضة شابة ترتدي حذاء أبيض في شارع وسط البلد"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  صورة المشهد / الوضعية
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl p-4 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-950/50 transition group"
                >
                  {newPreviewUrl ? (
                    <div className="space-y-2">
                      <img
                        src={newPreviewUrl}
                        alt="Preview"
                        className="h-28 mx-auto object-cover rounded-lg shadow-xs"
                      />
                      <span className="text-[11px] text-indigo-600 font-bold block">
                        انقر لتغيير الصورة
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1.5 py-2">
                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 mx-auto transition" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        انقر لرفع صورة المشهد من جهازك
                      </p>
                      <p className="text-[10px] text-slate-500">JPG, PNG, WEBP (حجم حتى 10MB)</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  برومبت الاستبدال المقترح (اختياري - بالإنجليزية)
                </label>
                <textarea
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  rows={3}
                  placeholder="استخدم {productName} ليشير إلى اسم منتجك تلقائياً..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || !newPreviewUrl}
                  className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50 cursor-pointer"
                >
                  حفظ في مكتبتي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
