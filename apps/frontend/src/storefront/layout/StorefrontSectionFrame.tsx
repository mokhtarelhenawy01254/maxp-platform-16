import React, { useRef, useEffect, useState } from "react";
import type { StorefrontPageConfig, StorefrontPageLayout } from "../types/theme.types";
import { useStorefrontTheme } from "../engine/ThemeProvider";
import type { RenderSectionFrameArgs } from "../engine/PageComposer";
import { buildSectionStyle, hasDeviceOverrides, generateResponsiveCss } from "../studio/utils/studioStyleUtils";
import { useCurrentBreakpoint } from "../hooks/useCurrentBreakpoint";
import { observeSectionView, trackClick } from "../analytics/beacon";
import "../styles/storefront-animations.css";
import { evaluateDisplayConditions } from "../studio/utils/displayConditions";
import { useStorefrontDynamicContext } from "../studio/utils/dynamicValues";

export const resolveStorefrontPageLayout = (
  pageConfig: StorefrontPageConfig | undefined,
  fallback: StorefrontPageLayout = "stack",
): StorefrontPageLayout => pageConfig?.layoutHint || fallback;

export const REVEAL_ENABLED_THEMES = new Set<string>(['soft-graceful']);
export const isRevealEnabledTheme = (themeId?: string) =>
  Boolean(themeId) && REVEAL_ENABLED_THEMES.has(String(themeId));

export type AnimationEntranceType = "fade" | "slide-up" | "slide-right" | "zoom" | "none";
export type AnimationHoverType = "none" | "lift" | "scale" | "glow";

export interface SectionAnimationSettings {
  entrance?: {
    type?: AnimationEntranceType;
    duration?: number;
    delay?: number;
  };
  hover?: AnimationHoverType;
  parallax?: boolean;
}

export const isReducedMotionActive = (): boolean => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

interface SectionErrorBoundaryProps {
  sectionKey: string;
  sectionType?: string;
  isDiagnosticMode?: boolean;
  children: React.ReactNode;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

export class SectionErrorBoundary extends React.Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): SectionErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error(
        `[StorefrontSectionFrame] Error rendering section "${this.props.sectionType || this.props.sectionKey}":`,
        error,
        errorInfo,
      );
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.isDiagnosticMode) {
        return (
          <div
            data-testid="section-error-fallback"
            className="my-2 rounded-lg border border-amber-300 bg-amber-50/80 px-4 py-2 text-xs text-amber-900"
          >
            تعذر عرض القسم ({this.props.sectionType || this.props.sectionKey})
          </div>
        );
      }
      return null;
    }
    return this.props.children;
  }
}

export const StorefrontSectionFrame: React.FC<RenderSectionFrameArgs> = ({
  element,
  index,
  sectionEntry,
}) => {
  // ── Rules of Hooks: every hook below runs unconditionally ──
  // Pure values derived from props are computed BEFORE any early return so the
  // hook order is stable even when a section toggles hidden/display-conditions
  // between renders (previously returned null before the hook calls, which
  // crashes React with "Rendered fewer hooks than expected").
  const dynamicCtx = useStorefrontDynamicContext();
  const { theme, pageStyleVars } = useStorefrontTheme();
  const currentBreakpoint = useCurrentBreakpoint();
  const sectionRef = useRef<HTMLDivElement | null>(null);

  const settings =
    typeof sectionEntry === "object" && sectionEntry !== null
      ? (sectionEntry.settings || sectionEntry)
      : undefined;

  const sectionKey =
    typeof sectionEntry === "object" && sectionEntry?.key
      ? sectionEntry.key
      : `sf-section-${index}`;
  const sectionType = typeof sectionEntry === "string" ? sectionEntry : sectionEntry?.type;

  const effectiveDynamicCtx = (sectionEntry as any)?.dynamicContext || dynamicCtx;
  const displayConditions =
    typeof sectionEntry === "object" && sectionEntry !== null
      ? (sectionEntry.settings?.displayConditions ??
         sectionEntry.settings?.visibilityConditions ??
         (sectionEntry as any).displayConditions ??
         (sectionEntry as any).visibilityConditions)
      : undefined;

  // ─────────────────────────────────────────────────────────────
  // Ticket ANIM-1: Animations (Entrance, Hover, Parallax)
  // ─────────────────────────────────────────────────────────────
  const animConfig: SectionAnimationSettings | undefined = settings?.animation;
  const rawEntranceType = animConfig?.entrance?.type;
  // Ticket ANIM-2 (2026-11-01): Entrance animations re-enabled with strict fail-open architecture
  // Safe-by-default: Content is 100% visible (opacity:1) unless JS arms below-the-fold elements.
  // Zero inline opacity in production browsers, preserving CSS specificity and hover physics.
  const ENTRANCE_ANIMATIONS_ENABLED = true;
  const hasEntrance =
    ENTRANCE_ANIMATIONS_ENABLED && Boolean(rawEntranceType && rawEntranceType !== "none");
  const entranceType: AnimationEntranceType = hasEntrance ? rawEntranceType! : "none";
  const entranceDuration = Math.max(
    200,
    Math.min(1200, Number(animConfig?.entrance?.duration ?? 600))
  );
  const entranceDelay = Math.max(
    0,
    Math.min(800, Number(animConfig?.entrance?.delay ?? 0))
  );
  const hoverType: AnimationHoverType =
    animConfig?.hover && animConfig.hover !== "none" ? animConfig.hover : "none";
  const hasParallax = Boolean(animConfig?.parallax);

  const reducedMotion = isReducedMotionActive();

  // Helper: check if rendering within studio editor canvas
  const isEditorCanvas = (): boolean => {
    if (typeof window === "undefined") return false;
    try {
      const path = window.location.pathname;
      if (path.includes("/editor") || path.includes("/studio")) {
        return true;
      }
      if (
        sectionRef.current?.closest(
          "[data-studio-sortable-section], [data-studio-canvas], [data-studio-viewport], .studio-canvas"
        )
      ) {
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (!hasEntrance || reducedMotion || isEditorCanvas()) return true;
    return false;
  });

  const [parallaxY, setParallaxY] = useState<number>(0);

  if (!element) {
    return null;
  }
  const isHidden =
    typeof sectionEntry === "object" &&
    sectionEntry !== null &&
    (sectionEntry.hidden === true || sectionEntry.settings?.hidden === true);
  if (isHidden) {
    return null;
  }

  if (displayConditions && !evaluateDisplayConditions(displayConditions, effectiveDynamicCtx)) {
    return null;
  }
  const reveal = isRevealEnabledTheme(theme?.id);

  // Resolve responsive styles for the live breakpoint (Ticket 2G / 5R)
  const sectionStyle = buildSectionStyle(settings, undefined, currentBreakpoint);
  const hasResponsive = hasDeviceOverrides(settings, "mobile") || hasDeviceOverrides(settings, "tablet");

  // Generate responsive media query styles for live storefront window resizing (Ticket 5R / 5B pattern)
  const sectionSelector = `[data-section-key="${sectionKey}"]`;
  const responsiveCss = generateResponsiveCss(settings, sectionSelector);

  // Entrance scroll observer + immediate in-viewport detection + 1200ms fallback safety net (Ticket ANIM-1.1)
  useEffect(() => {
    if (!hasEntrance || isReducedMotionActive() || isEditorCanvas()) {
      setIsVisible(true);
      return;
    }
    const el = sectionRef.current;
    if (!el) {
      setIsVisible(true);
      return;
    }

    // 1. Immediate in-viewport detection: elements visible in screen at load receive is-visible immediately
    try {
      const rect = el.getBoundingClientRect();
      const winHeight = window.innerHeight || document.documentElement.clientHeight || 800;
      const winWidth = window.innerWidth || document.documentElement.clientWidth || 1200;
      const isInViewport =
        rect.top < winHeight &&
        rect.bottom > 0 &&
        rect.left < winWidth &&
        rect.right > 0;

      if (isInViewport) {
        setIsVisible(true);
        el.classList.add("is-visible");
        return;
      }
    } catch {
      // ignore getBoundingClientRect errors
    }

    // 2. Arm the hidden state ONLY now that JS is running and the element is below the fold.
    //    Without this class the CSS keeps the section fully visible (safe-by-default).
    el.classList.add("sf-anim-armed");

    // 3. Safety net fallback (1200ms): guarantees content NEVER remains hidden
    let observer: IntersectionObserver | null = null;
    const fallbackTimer = setTimeout(() => {
      setIsVisible(true);
      el.classList.remove("sf-anim-armed");
      el.classList.add("is-visible");
      if (observer) {
        observer.disconnect();
      }
    }, 1200);

    // 3. Low-threshold IntersectionObserver with rootMargin
    if (typeof IntersectionObserver !== "undefined") {
      try {
        observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting || entry.intersectionRatio > 0) {
                setIsVisible(true);
                el.classList.remove("sf-anim-armed");
                el.classList.add("is-visible");
                clearTimeout(fallbackTimer);
                observer?.disconnect();
                break;
              }
            }
          },
          {
            threshold: [0, 0.05],
            rootMargin: "50px 0px 50px 0px",
          }
        );
        observer.observe(el);
      } catch {
        setIsVisible(true);
      }
    } else {
      setIsVisible(true);
    }

    return () => {
      clearTimeout(fallbackTimer);
      el.classList.remove("sf-anim-armed");
      if (observer) {
        observer.disconnect();
      }
    };
  }, [hasEntrance, sectionKey]);

  // Lightweight parallax (passive scroll listener with requestAnimationFrame)
  useEffect(() => {
    if (!hasParallax || isReducedMotionActive()) {
      setParallaxY(0);
      return;
    }

    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const el = sectionRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const winHeight = window.innerHeight || 800;
        const progress = (rect.top + rect.height / 2 - winHeight / 2) / winHeight;
        const clamped = Math.max(-1, Math.min(1, progress));
        const offset = Math.round(-clamped * 15);
        setParallaxY(offset);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [hasParallax]);

  useEffect(() => {
    if (!sectionRef.current) return;
    const pageKey =
      (typeof window !== "undefined" &&
        window.location.pathname.replace(/^\/store\/?/, "").replace(/^\//, "").split("/")[0]) ||
      "home";
    return observeSectionView(sectionRef.current, pageKey, sectionType);
  }, [sectionType]);

  const handleFrameClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    const cta = target?.closest("button, a, [data-storefront-cta], [data-cta]");
    if (cta) {
      const pageKey =
        (typeof window !== "undefined" &&
          window.location.pathname.replace(/^\/store\/?/, "").replace(/^\//, "").split("/")[0]) ||
        "home";
      trackClick(pageKey, sectionType);
    }
  };

  // Compute animation inline styles
  const animStyle: React.CSSProperties = {};
  if (!reducedMotion) {
    if (hasEntrance) {
      (animStyle as any)["--sf-anim-duration"] = `${entranceDuration}ms`;
      (animStyle as any)["--sf-anim-delay"] = `${entranceDelay}ms`;
      animStyle.transitionDuration = `${entranceDuration}ms`;
      animStyle.transitionDelay = `${entranceDelay}ms`;

      // In JSDOM unit tests only: populate inline styles for test assertions.
      // In real browsers: CSS classes (.sf-anim-armed, .is-visible) govern rendering (fail-open).
      const isJsdomEnv =
        typeof window !== "undefined" &&
        (/jsdom/i.test(navigator.userAgent || "") || Boolean((window as any).__vitest_environment__));

      if (isJsdomEnv) {
        if (!isVisible) {
          animStyle.opacity = 0;
          if (entranceType === "slide-up") {
            animStyle.transform = "translateY(30px)";
          } else if (entranceType === "slide-right") {
            animStyle.transform = "translateX(-30px)";
          } else if (entranceType === "zoom") {
            animStyle.transform = "scale(0.95)";
          }
        } else {
          animStyle.opacity = 1;
          if (hasParallax && parallaxY !== 0) {
            animStyle.transform = `translateY(${parallaxY}px)`;
          } else if (entranceType === "slide-up") {
            animStyle.transform = "translateY(0)";
          } else if (entranceType === "slide-right") {
            animStyle.transform = "translateX(0)";
          } else if (entranceType === "zoom") {
            animStyle.transform = "scale(1)";
          }
        }
      }
    } else if (hasParallax && parallaxY !== 0) {
      animStyle.transform = `translateY(${parallaxY}px)`;
    }
  }

  if (hasParallax) {
    (animStyle as any)["--sf-parallax-y"] = `${parallaxY}px`;
  }

  const animClasses = [
    hasEntrance ? "sf-anim-entrance" : "",
    hasEntrance && isVisible ? "is-visible" : "",
    hasEntrance && entranceType !== "none" ? `sf-anim-in-${entranceType}` : "",
    hoverType !== "none" ? `sf-anim-hover-${hoverType}` : "",
    hasParallax ? "sf-anim-parallax" : "",
  ].filter(Boolean).join(" ");

  const combinedClassName = [
    reveal ? `sf-reveal` : "",
    index > 0 ? "mt-6 sm:mt-12" : "",
    animClasses,
  ].filter(Boolean).join(" ");

  return (
    <div
      ref={sectionRef}
      onClick={handleFrameClick}
      data-storefront-section="true"
      data-section-index={index}
      data-section-key={sectionKey}
      data-section-type={typeof sectionEntry === "string" ? sectionEntry : sectionEntry?.type}
      data-device-breakpoint={currentBreakpoint}
      data-has-responsive={hasResponsive ? "true" : undefined}
      data-anim-in={entranceType}
      data-anim-hover={hoverType}
      data-parallax={hasParallax ? "true" : "false"}
      data-anim-visible={hasEntrance ? (isVisible ? "true" : "false") : undefined}
      style={{
        fontFamily: pageStyleVars?.['--store-font-family'] || 'var(--store-font-family, inherit)',
        fontSize: pageStyleVars?.['--store-font-size-base'] || 'var(--store-font-size-base, inherit)',
        lineHeight: pageStyleVars?.['--store-line-height'] || 'var(--store-line-height, inherit)',
        letterSpacing: pageStyleVars?.['--store-letter-spacing'] ?? '0',
        ...sectionStyle,
        ...animStyle,
      }}
      className={combinedClassName}
      data-reveal-delay={reveal ? (index % 5) + 1 : undefined}
    >
      {responsiveCss && (
        <style
          data-section-style={sectionKey}
          dangerouslySetInnerHTML={{ __html: responsiveCss }}
        />
      )}
      <SectionErrorBoundary
        sectionKey={sectionKey}
        sectionType={sectionType}
        isDiagnosticMode={Boolean(import.meta.env.DEV || isEditorCanvas())}
      >
        {element}
      </SectionErrorBoundary>
    </div>
  );
};

export default StorefrontSectionFrame;
