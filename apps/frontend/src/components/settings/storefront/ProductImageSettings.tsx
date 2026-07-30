import { Circle as ArrowsPointingOutIcon, Circle as MagnifyingGlassPlusIcon, Phone as DevicePhoneMobileIcon, Star as SparklesIcon, Grid as Squares2X2Icon, Image as PhotoIcon, Video as VideoCameraIcon } from 'lucide-react';
import React from "react";
;
import { SettingsSection } from "../SettingsSection";
import {
    ToggleSetting,
    SelectSetting,
    NumberSetting,
    ColorSetting,
} from "../SettingControls";
import { StorefrontSettings } from "../../../services/storefrontSettingsService";

interface ProductImageSettingsValues {
    galleryLayout?: string;
    thumbnailSize?: string;
    mainImageAspectRatio?: string;
    imageBorderRadius?: number;
    imageShadow?: boolean;
    sliderEnabled?: boolean;
    sliderShowArrows?: boolean;
    sliderShowDots?: boolean;
    sliderAutoplay?: boolean;
    sliderAutoplaySpeed?: number;
    sliderTransitionEffect?: string;
    sliderInfiniteLoop?: boolean;
    imageZoomEnabled?: boolean;
    imageZoomType?: string;
    zoomStyle?: string;
    lightboxEnabled?: boolean;
    lightboxShowThumbnails?: boolean;
    lightboxBackgroundColor?: string;
    productVideosEnabled?: boolean;
    videoAutoplay?: boolean;
    videoPosition?: string;
    mobileSwipeEnabled?: boolean;
    mobileGalleryLayout?: string;
}

type ProductImageStorefrontSettings =
    StorefrontSettings & Partial<ProductImageSettingsValues>;

interface ProductImageSettingsProps {
    settings: ProductImageStorefrontSettings;
    updateSetting: <K extends keyof ProductImageSettingsValues>(
        key: K,
        value: ProductImageSettingsValues[K],
    ) => void;
}

export const ProductImageSettings: React.FC<ProductImageSettingsProps> = ({
    settings,
    updateSetting,
}) => {
    if (!settings) return null;

    return (
        <div className="space-y-6">
            {/* 1. Gallery Layout */}
            <SettingsSection title="تخطيط معرض الصور" icon={Squares2X2Icon}>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl mb-6 border border-blue-100 dark:border-blue-800/30 flex items-start gap-3">
                    <SparklesIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                        اختر الموضع الأنسب للصور المصغرة. يفضل استخدام الوضع &quot;يسار&quot; أو &quot;يمين&quot; للشاشات العريضة لتجربة تصفح أفضل.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SelectSetting
                        label="موقع الصور المصغرة"
                        value={settings.galleryLayout || "bottom"}
                        onChange={(val) => updateSetting("galleryLayout", val)}
                        options={[
                            { value: "bottom", label: "أسفل الصورة" },
                            { value: "left", label: "يسار الصورة" },
                            { value: "right", label: "يمين الصورة" },
                            { value: "top", label: "أعلى الصورة" },
                            { value: "grid", label: "شبكة (بدون صور مصغرة)" },
                        ]}
                    />
                    <SelectSetting
                        label="حجم الصور المصغرة"
                        value={settings.thumbnailSize || "medium"}
                        onChange={(val) => updateSetting("thumbnailSize", val)}
                        options={[
                            { value: "small", label: "صغير (60px)" },
                            { value: "medium", label: "متوسط (80px)" },
                            { value: "large", label: "كبير (100px)" },
                        ]}
                    />
                </div>
            </SettingsSection>

            {/* 2. Main Image Style */}
            <SettingsSection title="تنسيق الصورة الأساسية" icon={PhotoIcon}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SelectSetting
                        label="نسبة العرض إلى الارتفاع"
                        value={settings.mainImageAspectRatio || "1:1"}
                        onChange={(val) => updateSetting("mainImageAspectRatio", val)}
                        options={[
                            { value: "1:1", label: "مربع (1:1)" },
                            { value: "4:3", label: "كلاسيك (4:3)" },
                            { value: "3:4", label: "رأسي (3:4)" },
                            { value: "16:9", label: "عريض (16:9)" },
                            { value: "auto", label: "تلقائي" },
                        ]}
                    />
                    <NumberSetting
                        label="انحناء الزوايا (بكسل)"
                        value={settings.imageBorderRadius || 8}
                        onChange={(val) => updateSetting("imageBorderRadius", val)}
                        min={0}
                        max={40}
                    />
                </div>
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                    <ToggleSetting
                        label="إضافة ظل احترافي للصورة"
                        value={settings.imageShadow ?? true}
                        onChange={(val) => updateSetting("imageShadow", val)}
                    />
                </div>
            </SettingsSection>

            {/* 3. Slider & Navigation */}
            <SettingsSection
                title="السلايدر والتنقل"
                icon={ArrowsPointingOutIcon}
                enabled={settings.sliderEnabled}
                onToggle={(enabled) => updateSetting("sliderEnabled", enabled)}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <ToggleSetting
                        label="إظهار أسهم التنقل"
                        value={Boolean(settings.sliderShowArrows)}
                        onChange={(val) => updateSetting("sliderShowArrows", val)}
                        disabled={!settings.sliderEnabled}
                    />
                    <ToggleSetting
                        label="إظهار نقاط الانتقال (Dots)"
                        value={settings.sliderShowDots || false}
                        onChange={(val) => updateSetting("sliderShowDots", val)}
                        disabled={!settings.sliderEnabled}
                    />
                </div>

                {settings.sliderEnabled && (
                    <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <ToggleSetting
                                label="تشغيل تلقائي (Autoplay)"
                                value={settings.sliderAutoplay || false}
                                onChange={(val) => updateSetting("sliderAutoplay", val)}
                            />
                            {settings.sliderAutoplay && (
                                <NumberSetting
                                    label="سرعة التشغيل (ملي ثانية)"
                                    value={settings.sliderAutoplaySpeed || 3000}
                                    onChange={(val) => updateSetting("sliderAutoplaySpeed", val)}
                                    min={1000}
                                    max={10000}
                                />
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-200 dark:border-gray-700/50">
                            <SelectSetting
                                label="تأثير الانتقال"
                                value={settings.sliderTransitionEffect || "slide"}
                                onChange={(val) => updateSetting("sliderTransitionEffect", val)}
                                options={[
                                    { value: "slide", label: "انزلاق (Slide)" },
                                    { value: "fade", label: "تلاشي (Fade)" },
                                    { value: "flip", label: "قلب (Flip)" },
                                    { value: "cube", label: "مكعب (Cube)" },
                                ]}
                            />
                            <ToggleSetting
                                label="تكرار لا نهائي"
                                value={Boolean(settings.sliderInfiniteLoop)}
                                onChange={(val) => updateSetting("sliderInfiniteLoop", val)}
                            />
                        </div>
                    </div>
                )}
            </SettingsSection>

            {/* 4. Zoom & Interactivity */}
            <SettingsSection
                title="التكبير والتفاعل"
                icon={MagnifyingGlassPlusIcon}
                enabled={settings.imageZoomEnabled}
                onToggle={(enabled) => updateSetting("imageZoomEnabled", enabled)}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
                    <SelectSetting
                        label="نوع التفاعل"
                        value={settings.imageZoomType || "hover"}
                        onChange={(val) => updateSetting("imageZoomType", val)}
                        options={[
                            { value: "hover", label: "عند تمرير الماوس" },
                            { value: "click", label: "عند الضغط" },
                            { value: "both", label: "التمرير والضغط" },
                        ]}
                    />
                    <SelectSetting
                        label="طريقة التكبير"
                        value={settings.zoomStyle || "inner"}
                        onChange={(val) => updateSetting("zoomStyle", val)}
                        options={[
                            { value: "inner", label: "تكبير داخلي" },
                            { value: "side", label: "نافذة جانبية" },
                            { value: "fullscreen", label: "ملء الشاشة" },
                        ]}
                    />
                </div>
            </SettingsSection>

            {/* 5. Lightbox */}
            <SettingsSection
                title="العرض الكامل (Lightbox)"
                icon={ArrowsPointingOutIcon}
                enabled={settings.lightboxEnabled}
                onToggle={(enabled) => updateSetting("lightboxEnabled", enabled)}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ToggleSetting
                        label="إظهار الصور المصغرة في العرض الكامل"
                        value={Boolean(settings.lightboxShowThumbnails)}
                        onChange={(val) => updateSetting("lightboxShowThumbnails", val)}
                        disabled={!settings.lightboxEnabled}
                    />
                    <ColorSetting
                        label="لون الخلفية"
                        value={settings.lightboxBackgroundColor || "rgba(0,0,0,0.9)"}
                        onChange={(val) => updateSetting("lightboxBackgroundColor", val)}
                        disabled={!settings.lightboxEnabled}
                    />
                </div>
            </SettingsSection>

            {/* 6. Product Videos */}
            <SettingsSection
                title="فيديوهات المنتجات"
                icon={VideoCameraIcon}
                enabled={settings.productVideosEnabled}
                onToggle={(enabled) => updateSetting("productVideosEnabled", enabled)}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ToggleSetting
                        label="تشغيل تلقائي للفيديو"
                        value={settings.videoAutoplay || false}
                        onChange={(val) => updateSetting("videoAutoplay", val)}
                        disabled={!settings.productVideosEnabled}
                    />
                    <SelectSetting
                        label="موقع الفيديو في المعرض"
                        value={settings.videoPosition || "end"}
                        onChange={(val) => updateSetting("videoPosition", val)}
                        options={[
                            { value: "start", label: "في البداية" },
                            { value: "default", label: "حسب الترتيب الافتراضي" },
                            { value: "end", label: "في النهاية" },
                        ]}
                        disabled={!settings.productVideosEnabled}
                    />
                </div>
            </SettingsSection>

            {/* 7. Mobile Experience */}
            <SettingsSection title="تجربة الموبايل" icon={DevicePhoneMobileIcon}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <ToggleSetting
                        label="تفعيل السحب (Swipe)"
                        value={Boolean(settings.mobileSwipeEnabled)}
                        onChange={(val) => updateSetting("mobileSwipeEnabled", val)}
                    />
                    <SelectSetting
                        label="تخطيط المعرض في الموبايل"
                        value={settings.mobileGalleryLayout || "slider"}
                        onChange={(val) => updateSetting("mobileGalleryLayout", val)}
                        options={[
                            { value: "slider", label: "سلايدر" },
                            { value: "grid", label: "شبكة" },
                        ]}
                    />
                </div>
            </SettingsSection>
        </div>
    );
};
