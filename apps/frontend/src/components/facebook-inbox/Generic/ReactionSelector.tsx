import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import { createPortal } from "react-dom";

export interface ReactionSelectorProps {
  onSelect: (reaction: string) => void;
  onClose?: () => void;
  currentReaction?: string;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

const ReactionSelector: React.FC<ReactionSelectorProps> = ({
  onSelect,
  onClose,
  currentReaction,
  triggerRef,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // Position calculation and viewport clamping
  useLayoutEffect(() => {
    const updatePosition = () => {
      const screenWidth =
        window.innerWidth || document.documentElement.clientWidth || 360;
      const screenHeight =
        window.innerHeight || document.documentElement.clientHeight || 640;

      const popupEl = popupRef.current;
      // Default fallback size for 6 emojis + padding
      const popupWidth = popupEl?.offsetWidth || 270;
      const popupHeight = popupEl?.offsetHeight || 52;
      const safeMargin = 10;

      if (triggerRef?.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const triggerCenter = rect.left + rect.width / 2;

        // Horizontally center above the trigger
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
      {/* Backdrop to dismiss on outside tap */}
      <div
        className="fixed inset-0 z-[9998] bg-background/50 backdrop-blur-xs transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
        aria-hidden="true"
      />

      {/* Floating Reactions Bar */}
      <div
        ref={popupRef}
        data-reaction-selector="true"
        role="dialog"
        aria-label="اختر تفاعلاً"
        className="fixed z-[9999] flex items-center gap-1 sm:gap-1.5 rounded-full border border-border/80 bg-card/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-150 touch-manipulation select-none"
        style={{
          top: coords ? `${coords.top}px` : "-9999px",
          left: coords ? `${coords.left}px` : "-9999px",
          visibility: coords ? "visible" : "hidden",
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
              className={`group relative flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-transform duration-150 active:scale-125 hover:scale-120 hover:bg-muted/80 focus:outline-none ${
                isSelected
                  ? "bg-primary/20 ring-2 ring-primary scale-110 shadow-xs"
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
      </div>
    </>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
};

export default ReactionSelector;
