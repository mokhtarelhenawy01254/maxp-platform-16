import { useEffect } from 'react';

const REVEAL_SELECTOR = '.sf-reveal';

const activateObserver = (): IntersectionObserver =>
  new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('sf-reveal-in');
          (entry.target as Element & { __sfObserved?: boolean }).__sfObserved = true;
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px',
    },
  );

/**
 * useScrollReveal
 * Adds the Soft Graceful-style fade + rise to elements with `.sf-reveal`
 * as they scroll into view. Re-scans on DOM mutations so lazily-rendered
 * sections animate after they mount, and re-arms on route changes.
 */
export const useScrollReveal = (): void => {
  useEffect(() => {
    let observer: IntersectionObserver | null = null;

    const armObserver = () => {
      if (!observer) {
        observer = activateObserver();
      }
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR),
      ).filter((el) => !el.classList.contains('sf-reveal-in'));
      elements.forEach((el) => observer?.observe(el));
    };

    armObserver();
    const mutationObserver = new MutationObserver(armObserver);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer?.disconnect();
      mutationObserver.disconnect();
    };
  }, []);
};

export const markForReveal = (element: HTMLElement | null): void => {
  if (element && !element.classList.contains('sf-reveal')) {
    element.classList.add('sf-reveal');
  }
};
