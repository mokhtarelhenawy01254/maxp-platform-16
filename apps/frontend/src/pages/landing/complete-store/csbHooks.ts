import { useEffect, useRef, useState } from "react";

/** Count-up animation for the receipt totals. Jumps instantly under prefers-reduced-motion. */
export function useCountUp(target: number, durationMs = 900): { ref: React.RefObject<HTMLSpanElement | null>; value: number } {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setValue(target);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started.current) return;
        started.current = true;
        const t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - t0) / durationMs);
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, durationMs]);

  return { ref, value };
}

/** Adds `.csb-in` to elements with `.csb-reveal` once they enter the viewport. CSS handles the transition. */
export function useRevealOnScroll(rootRef: React.RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets = root.querySelectorAll<HTMLElement>(".csb-reveal");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      targets.forEach((t) => t.classList.add("csb-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("csb-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach((t) => io.observe(t));
    // Fallback: مفيش محتوى يفضل مخفي أبدًا لو الـIO فات عنصر (سكرول سريع/قفزات أنكور)
    const fallback = window.setTimeout(() => {
      targets.forEach((t) => t.classList.add("csb-in"));
    }, 4000);
    return () => {
      window.clearTimeout(fallback);
      io.disconnect();
    };
  }, [rootRef]);
}
