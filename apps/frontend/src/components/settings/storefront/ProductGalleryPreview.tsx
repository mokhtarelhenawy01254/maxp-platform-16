import { Circle as MagnifyingGlassPlusIcon, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Circle as PlayIcon } from 'lucide-react';
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StorefrontSettings } from "../../../services/storefrontSettingsService";
;

interface ProductGalleryPreviewProps {
    settings: StorefrontSettings;
}

export const ProductGalleryPreview: React.FC<ProductGalleryPreviewProps> = ({ settings }) => {
    const [activeIndex, setActiveIndex] = React.useState(0);
    const [isZoomed, setIsZoomed] = React.useState(false);

    // Mock images for preview
    const images = [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&q=80&w=800"
    ];

    const galleryLayout = settings.galleryLayout || "bottom";
    const aspectRatio = settings.mainImageAspectRatio || "1:1";
    const borderRadius = settings.imageBorderRadius || 8;
    const shadow = settings.imageShadow;
    const thumbnailSize = settings.thumbnailSize === "small" ? 60 : settings.thumbnailSize === "large" ? 100 : 80;

    const getAspectRatioClass = () => {
        switch (aspectRatio) {
            case "1:1": return "aspect-square";
            case "4:3": return "aspect-[4/3]";
            case "3:4": return "aspect-[3/4]";
            case "16:9": return "aspect-video";
            default: return "";
        }
    };

    const renderThumbnails = () => {
        const thumbClass = `relative cursor-pointer overflow-hidden border-2 transition-all duration-200`;
        const activeThumbClass = `border-indigo-600 dark:border-indigo-400 ring-2 ring-indigo-500/20 scale-105`;
        const inactiveThumbClass = `border-transparent hover:border-gray-200 dark:hover:border-gray-700`;

        return (
            <div
                className={`flex gap-3 ${galleryLayout === "left" || galleryLayout === "right"
                        ? "flex-col"
                        : "flex-row"
                    } p-2`}
                style={{
                    padding: `${settings.thumbnailSpacing || 8}px`
                }}
            >
                {images.map((img, idx) => (
                    <div
                        key={idx}
                        onClick={() => setActiveIndex(idx)}
                        className={`${thumbClass} ${activeIndex === idx ? activeThumbClass : inactiveThumbClass}`}
                        style={{
                            width: `${thumbnailSize}px`,
                            height: `${thumbnailSize}px`,
                            borderRadius: `${settings.thumbnailBorderRadius || 8}px`
                        }}
                    >
                        <img src={img} className="w-full h-full object-cover" alt="thumbnail" />
                        {idx === images.length - 1 && settings.productVideosEnabled && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <PlayIcon className="h-6 w-6 text-white" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Live Preview</span>
                <div className="flex gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-400"></div>
                    <div className="h-2 w-2 rounded-full bg-amber-400"></div>
                    <div className="h-2 w-2 rounded-full bg-green-400"></div>
                </div>
            </div>

            <div
                className={`flex-1 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 overflow-hidden flex ${galleryLayout === "left" ? "flex-row" :
                        galleryLayout === "right" ? "flex-row-reverse" :
                            galleryLayout === "top" ? "flex-col" : "flex-col-reverse"
                    } gap-6`}
            >
                {/* Thumbnails */}
                {galleryLayout !== "grid" && (
                    <div className="flex-shrink-0">
                        {renderThumbnails()}
                    </div>
                )}

                {/* Main Image Container */}
                <div className="relative flex-1 group">
                    <div
                        className={`relative w-full overflow-hidden ${getAspectRatioClass()} transition-all duration-500`}
                        style={{
                            borderRadius: `${borderRadius}px`,
                            boxShadow: shadow ? "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" : "none"
                        }}
                    >
                        <AnimatePresence mode="wait">
                            <motion.img
                                key={activeIndex}
                                initial={{ opacity: 0, scale: 1.05 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                src={images[activeIndex]}
                                className="w-full h-full object-cover"
                                onMouseEnter={() => settings.imageZoomEnabled && settings.imageZoomType !== "click" && setIsZoomed(true)}
                                onMouseLeave={() => setIsZoomed(false)}
                            />
                        </AnimatePresence>

                        {/* Zoom Overlay */}
                        {isZoomed && settings.imageZoomEnabled && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 pointer-events-none bg-black/5 flex items-center justify-center"
                            >
                                <div className="p-3 bg-white/90 backdrop-blur rounded-full shadow-lg">
                                    <MagnifyingGlassPlusIcon className="h-6 w-6 text-indigo-600" />
                                </div>
                            </motion.div>
                        )}

                        {/* Slider Nav */}
                        {settings.sliderEnabled && settings.sliderShowArrows && (
                            <>
                                <button className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-full shadow-md text-gray-700 dark:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronRightIcon className="h-5 w-5" />
                                </button>
                                <button className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-full shadow-md text-gray-700 dark:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronLeftIcon className="h-5 w-5" />
                                </button>
                            </>
                        )}

                        {/* Pagination Dots */}
                        {settings.sliderEnabled && settings.sliderShowDots && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                {images.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`h-1.5 rounded-full transition-all ${activeIndex === idx ? "w-4 bg-indigo-600" : "w-1.5 bg-gray-300 dark:bg-gray-600"}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Status Footer */}
            <div className="mt-6 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30">
                <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                    {galleryLayout === "bottom" ? "Thumbnails are positioned below the main image." :
                        galleryLayout === "left" ? "Thumbnails are vertically stacked on the left side." :
                            galleryLayout === "right" ? "Thumbnails are vertically stacked on the right side." :
                                "Thumbnails are positioned above the main image."}
                </p>
            </div>
        </div>
    );
};
