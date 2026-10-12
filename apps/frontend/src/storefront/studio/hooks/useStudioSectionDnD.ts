import React, { useState, useRef, useCallback, useEffect } from "react";

export interface StudioDragPayload {
  source: "rail" | "canvas";
  index: number;
  sectionKey: string;
  label: string;
  type: string;
}

export interface StudioDropTarget {
  zone: "rail" | "canvas";
  slot: number;
}

export function reorderSections<T>(list: T[], fromIndex: number, targetSlot: number): T[] {
  if (fromIndex < 0 || fromIndex >= list.length) return list;
  if (targetSlot < 0 || targetSlot > list.length) return list;
  // If dropping right before or right after the item itself, the order does not change
  if (targetSlot === fromIndex || targetSlot === fromIndex + 1) {
    return list;
  }
  const next = [...list];
  const item = next.splice(fromIndex, 1)[0];
  if (item === undefined) return list;
  const insertIndex = targetSlot > fromIndex ? targetSlot - 1 : targetSlot;
  next.splice(insertIndex, 0, item);
  return next;
}

interface UseStudioSectionDnDOptions {
  sections: any[];
  onReorder: (fromIndex: number, targetSlot: number) => void;
}

export function useStudioSectionDnD({
  sections,
  onReorder,
}: UseStudioSectionDnDOptions) {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activePayload, setActivePayload] = useState<StudioDragPayload | null>(null);
  const [dropTarget, setDropTarget] = useState<StudioDropTarget | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const dragSessionRef = useRef<{
    x0: number;
    y0: number;
    payload: StudioDragPayload;
    active: boolean;
  } | null>(null);

  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  // Find drop target slot inside a dropzone element based on Y coordinate
  const computeDropTarget = useCallback((clientX: number, clientY: number): StudioDropTarget | null => {
    const elements = document.elementsFromPoint(clientX, clientY);

    for (const el of elements) {
      const dropzone = (el as HTMLElement).closest<HTMLElement>("[data-studio-dropzone]");
      if (!dropzone || dropzone.offsetParent === null) continue;

      const zone = dropzone.dataset["studioDropzone"] as "rail" | "canvas" | undefined;
      if (zone !== "rail" && zone !== "canvas") continue;

      const itemSelector = zone === "rail" ? "[data-studio-rail-item]" : "[data-studio-canvas-item]";
      const items = Array.from(dropzone.querySelectorAll<HTMLElement>(itemSelector));

      if (items.length === 0) {
        return { zone, slot: 0 };
      }

      // Find drop slot by comparing clientY to each item's vertical center
      let targetSlot = items.length;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        const rect = item.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        if (clientY < midpoint) {
          targetSlot = i;
          break;
        }
      }

      return { zone, slot: targetSlot };
    }

    return null;
  }, []);

  // Auto-scroll containers when dragging near top/bottom edges
  const autoScroll = useCallback((clientX: number, clientY: number) => {
    const elements = document.elementsFromPoint(clientX, clientY);
    for (const el of elements) {
      const scrollable = (el as HTMLElement).closest<HTMLElement>(
        "[data-studio-dropzone], [data-studio-scrollable], .overflow-y-auto"
      );
      if (scrollable && scrollable.offsetParent !== null) {
        const rect = scrollable.getBoundingClientRect();
        const threshold = 60;
        const scrollSpeed = 12;

        if (clientY - rect.top < threshold && clientY >= rect.top) {
          scrollable.scrollTop -= scrollSpeed;
        } else if (rect.bottom - clientY < threshold && clientY <= rect.bottom) {
          scrollable.scrollTop += scrollSpeed;
        }
      }
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const session = dragSessionRef.current;
      if (!session) return;

      const dx = e.clientX - session.x0;
      const dy = e.clientY - session.y0;

      if (!session.active) {
        // Drag threshold check (~6px)
        if (Math.hypot(dx, dy) < 6) return;

        session.active = true;
        setIsDragging(true);
        setActivePayload(session.payload);
        document.body.classList.add("select-none");
        document.body.style.cursor = "grabbing";
      }

      e.preventDefault();
      setPointerPos({ x: e.clientX, y: e.clientY });
      autoScroll(e.clientX, e.clientY);

      const target = computeDropTarget(e.clientX, e.clientY);
      setDropTarget(target);
    },
    [autoScroll, computeDropTarget]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      const session = dragSessionRef.current;
      dragSessionRef.current = null;

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);

      document.body.classList.remove("select-none");
      document.body.style.cursor = "";

      if (!session) return;

      if (session.active) {
        const finalDrop = computeDropTarget(e.clientX, e.clientY);
        if (finalDrop && typeof finalDrop.slot === "number") {
          onReorderRef.current(session.payload.index, finalDrop.slot);
        }
      }

      setIsDragging(false);
      setActivePayload(null);
      setDropTarget(null);
    },
    [handlePointerMove, computeDropTarget]
  );

  const startDrag = useCallback(
    (e: React.PointerEvent, payload: StudioDragPayload) => {
      // Primary mouse button or touch only
      if (e.pointerType === "mouse" && e.button !== 0) return;

      dragSessionRef.current = {
        x0: e.clientX,
        y0: e.clientY,
        payload,
        active: false,
      };

      setPointerPos({ x: e.clientX, y: e.clientY });

      window.addEventListener("pointermove", handlePointerMove, { passive: false });
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [handlePointerMove, handlePointerUp]
  );

  // Clean up global listeners if unmounted mid-drag
  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      document.body.classList.remove("select-none");
      document.body.style.cursor = "";
    };
  }, [handlePointerMove, handlePointerUp]);

  return {
    isDragging,
    activePayload,
    dropTarget,
    pointerPos,
    startDrag,
  };
}
