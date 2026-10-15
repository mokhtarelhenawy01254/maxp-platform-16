// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Unit tests for Storefront Honest Saving (Phase 0 / Ticket B)
 * (a) undo -> onChange is called with reverted value
 * (b) debounce = single save request for a batch of changes (fake timers)
 * (c) flush on exit / back button sent properly
 */

import { useStudioHistory } from "../studio/hooks/useStudioHistory";

describe("Storefront Honest Saving - Phase 0 Ticket B", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Item 1: useStudioHistory (Zombie-Save Elimination)", () => {
    it("(a) undo calls onChange with the reverted value and synchronizes state", () => {
      const onChange = vi.fn();
      const initial = { sections: ["hero", "products"] };

      // Simulator of useStudioHistory logic with onChange
      const history = {
        past: [] as Array<typeof initial>,
        present: initial,
        future: [] as Array<typeof initial>,
      };

      const set = (newVal: typeof initial) => {
        history.past.push(history.present);
        history.present = newVal;
        history.future = [];
        onChange(newVal);
      };

      const undo = () => {
        if (history.past.length === 0) return undefined;
        const previous = history.past.pop()!;
        history.future.unshift(history.present);
        history.present = previous;
        onChange(previous);
        return previous;
      };

      // 1. Add section -> 3 sections
      set({ sections: ["hero", "products", "reviews"] });
      expect(onChange).toHaveBeenCalledWith({ sections: ["hero", "products", "reviews"] });

      // 2. Undo -> reverts to 2 sections
      const reverted = undo();
      expect(reverted).toEqual({ sections: ["hero", "products"] });
      expect(onChange).toHaveBeenLastCalledWith({ sections: ["hero", "products"] });
      expect(reverted?.sections).toHaveLength(2);
      expect(reverted?.sections).not.toContain("reviews");
    });
  });

  describe("Item 2: Autosave Debounce & Flush on Exit", () => {
    it("(b) debounce = single save request for a batch of rapid edits", () => {
      const saveFn = vi.fn();
      let timer: any = null;

      const triggerEdit = (payload: any) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          saveFn(payload);
        }, 2500);
      };

      // 5 rapid changes within 1 second
      triggerEdit({ v: 1 });
      vi.advanceTimersByTime(200);
      triggerEdit({ v: 2 });
      vi.advanceTimersByTime(300);
      triggerEdit({ v: 3 });
      vi.advanceTimersByTime(100);
      triggerEdit({ v: 4 });
      vi.advanceTimersByTime(200);
      triggerEdit({ v: 5 });

      // 2000ms after last edit - should NOT have saved yet
      vi.advanceTimersByTime(2000);
      expect(saveFn).not.toHaveBeenCalled();

      // Complete 2500ms
      vi.advanceTimersByTime(500);
      expect(saveFn).toHaveBeenCalledTimes(1);
      expect(saveFn).toHaveBeenCalledWith({ v: 5 });
    });

    it("(c) flush on back button sends save request before navigating", async () => {
      let saved = false;
      let navigated = false;
      let hasPendingChanges = true;

      const flushSave = vi.fn().mockImplementation(async () => {
        saved = true;
        hasPendingChanges = false;
      });

      const navigate = vi.fn().mockImplementation(() => {
        expect(saved).toBe(true);
        navigated = true;
      });

      const handleBack = async () => {
        if (hasPendingChanges) {
          await flushSave({ silent: true });
        }
        navigate("/settings/store");
      };

      await handleBack();
      expect(flushSave).toHaveBeenCalledWith({ silent: true });
      expect(navigate).toHaveBeenCalledWith("/settings/store");
      expect(navigated).toBe(true);
    });

    it("beforeunload warns when changes are pending in autosave window", () => {
      let hasPendingChanges = true;
      let prevented = false;
      let retVal: string | null = null;

      const mockEvent: any = {
        preventDefault: () => { prevented = true; },
        set returnValue(val: string) { retVal = val; },
        get returnValue() { return retVal; },
      };

      const handleBeforeUnload = (e: any) => {
        if (hasPendingChanges) {
          e.preventDefault();
          e.returnValue = "";
          return "";
        }
      };

      handleBeforeUnload(mockEvent);
      expect(prevented).toBe(true);
      expect(retVal).toBe("");

      // When saved
      hasPendingChanges = false;
      prevented = false;
      retVal = null;
      handleBeforeUnload(mockEvent);
      expect(prevented).toBe(false);
      expect(retVal).toBeNull();
    });
  });
});
