import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";

export interface WhatsAppReactionSelectorProps {
  onSelect: (reaction: string) => void;
  onClose?: () => void;
  currentReaction?: string;
  triggerRef?: React.RefObject<HTMLElement | null>;
  onOpenMore?: () => void;
}

// Full reaction set replicating Facebook Inbox + WhatsApp essentials
const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🙏"];

export const WhatsAppReactionSelector: React.FC<WhatsAppReactionSelectorProps> = ({
  onSelect,
  onClose,
  currentReaction,
  triggerRef,
  onOpenMore,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // Position calculation and viewport clamping matching Facebook Inbox
  useLayoutEffect(() => {
    const updatePosition = () => {
      const screenWidth =
        window.innerWidth || document.documentElement.clientWidth || 360;
      const screenHeight =
        window.innerHeight || document.documentElement.clientHeight || 640;

      const popupEl = popupRef.current;
      // Size for 7 emojis (+ optional plus) + padding
      const popupWidth = popupEl?.offsetWidth || 300;
      const popupHeight = popupEl?.offsetHeight || 52;
      const safeMargin = 10;

      if (triggerRef?.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const triggerCenter = rect.left + rect.width / 2;

        // Horizontally center above/below the trigger
        let left = triggerCenter - popupWidth / 2;

        // Clamp securely inside screen boundaries (prevent any overflow on mobile)
        const minLeft = safeMargin;
        const maxLeft = Math.max(safeMargin, screenWidth - popupWidth - safeMargin);
        left = Math.max(minLeft, Math.min(left, maxLeft));

        // Prefer placing above the trigger; flip below if near the top
        let top = rect.top - popupHeight - 8;
        if (top < safeMargin) {
          top = rect.bottom + 8;
        }

        // Keep inside bottom screen bounds
        if (top + popupHeight > screenHeight - safeMargin) {
          top = Math.max(safeMargin, screenHeight - popupHeight - safeMargin);
        }

        setCoords({ top: Math.round(top), left: Math.round(left) });
      } else {
        // Fallback: center in screen horizontally
        const left = Math.max(
          safeMargin,
          Math.round((screenWidth - popupWidth) / 2),
        );
        const top = Math.max(
          safeMargin,
          Math.round(screenHeight / 2 - popupHeight / 2),
        );
        setCoords({ top, left });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition, { passive: true });
    window.addEventListener("scroll", updatePosition, { passive: true, capture: true });

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [triggerRef]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const content = (
    <>
      {/* Semi-transparent backdrop to dismiss on outside tap */}
      <div
        className="fixed inset-0 z-[9998] bg-black/10 dark:bg-black/30 backdrop-blur-[1px] transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
        aria-hidden="true"
      />

      {/* Floating Reactions Bar - Always clamped inside mobile viewport */}
      <div
        ref={popupRef}
        data-reaction-selector="true"
        role="dialog"
        aria-label="اختر تفاعلاً"
        className="business-dropdown-surface fixed z-[9999] flex items-center gap-1 sm:gap-1.5 rounded-full p-1.5 shadow-2xl backdrop-blur-xl border border-white/20 dark:border-white/15 animate-in fade-in-0 zoom-in-95 duration-150 touch-manipulation select-none"
        style={{
          top: coords ? `${coords.top}px` : "-9999px",
          left: coords ? `${coords.left}px` : "-9999px",
          visibility: coords ? "visible" : "hidden",
          background:
            "var(--business-floating-surface, rgba(15, 23, 42, 0.97))",
          boxShadow:
            "0 12px 36px -4px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.12) inset",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {REACTIONS.map((reaction) => {
          const isSelected = currentReaction === reaction;
          return (
            <button
              type="button"
              key={reaction}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(reaction);
              }}
              className={`group relative flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-transform duration-150 active:scale-130 hover:scale-120 hover:bg-white/10 dark:hover:bg-white/15 focus:outline-none ${
                isSelected
                  ? "bg-primary/25 ring-2 ring-primary scale-110 shadow-sm"
                  : ""
              }`}
              title={reaction}
              aria-label={`تفاعل ${reaction}`}
            >
              <span className="text-2xl sm:text-xl leading-none select-none transition-transform duration-150 group-hover:scale-115 pointer-events-none">
                {reaction}
              </span>
            </button>
          );
        })}
        {onOpenMore && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenMore();
            }}
            className="group relative flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-full text-foreground/70 hover:text-foreground hover:bg-white/10 dark:hover:bg-white/15 transition-transform duration-150 active:scale-120 focus:outline-none"
            title="المزيد من التفاعلات"
            aria-label="المزيد من التفاعلات"
          >
            <Plus size={18} strokeWidth={2.4} />
          </button>
        )}
      </div>
    </>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
};

export default WhatsAppReactionSelector;
