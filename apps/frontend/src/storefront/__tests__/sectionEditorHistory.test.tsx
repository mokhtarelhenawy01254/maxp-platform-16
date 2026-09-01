// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import StorefrontPageSectionsEditor from "../../components/store/StorefrontPageSectionsEditor";
import {
  useDesignTokensHistory,
  useDesignTokensHistoryShortcuts,
} from "../../components/store/useDesignTokensHistory";
import { getStorefrontPageOverridesFromDesignTokens } from "../utils/pageOverrides";

vi.mock("../../services/imageGalleryService", () => ({
  default: {
    listImages: vi.fn().mockResolvedValue([]),
    uploadImage: vi.fn(),
  },
  imageGalleryService: {
    listImages: vi.fn().mockResolvedValue([]),
    uploadImage: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
});

describe("useDesignTokensHistory", () => {
  it("commits states and walks back and forward", () => {
    const { result } = renderHook(() =>
      useDesignTokensHistory<Record<string, unknown>>({ step: 0 }),
    );

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    act(() => result.current.commit({ step: 1 }));
    act(() => result.current.commit({ step: 2 }));

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    let restored: Record<string, unknown> | null = null;
    act(() => {
      restored = result.current.undo();
    });
    expect(restored).toEqual({ step: 1 });
    expect(result.current.canRedo).toBe(true);

    act(() => {
      restored = result.current.undo();
    });
    expect(restored).toEqual({ step: 0 });
    expect(result.current.canUndo).toBe(false);

    act(() => {
      restored = result.current.redo();
    });
    expect(restored).toEqual({ step: 1 });
    expect(result.current.canUndo).toBe(true);

    act(() => {
      restored = result.current.redo();
    });
    expect(restored).toEqual({ step: 2 });
    expect(result.current.canRedo).toBe(false);
  });

  it("clears the redo stack when a new state is committed", () => {
    const { result } = renderHook(() =>
      useDesignTokensHistory<Record<string, unknown>>({ step: 0 }),
    );

    act(() => result.current.commit({ step: 1 }));
    act(() => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.commit({ step: 7 }));
    expect(result.current.canRedo).toBe(false);

    let restored: Record<string, unknown> | null = null;
    act(() => {
      restored = result.current.undo();
    });
    expect(restored).toEqual({ step: 0 });
  });

  it("ignores a commit of the same reference", () => {
    const { result } = renderHook(() =>
      useDesignTokensHistory<Record<string, unknown>>({ step: 0 }),
    );

    const same = { step: 1 };
    act(() => result.current.commit(same));
    act(() => result.current.commit(same));

    let restored: Record<string, unknown> | null = null;
    act(() => {
      restored = result.current.undo();
    });
    expect(restored).toEqual({ step: 0 });
    expect(result.current.canUndo).toBe(false);
  });

  it("caps the undo stack at 50 entries", () => {
    const { result } = renderHook(() =>
      useDesignTokensHistory<Record<string, unknown>>({ step: 0 }),
    );

    act(() => {
      for (let index = 1; index <= 60; index += 1) {
        result.current.commit({ step: index });
      }
    });

    let undoCount = 0;
    act(() => {
      while (result.current.undo() !== null) {
        undoCount += 1;
      }
    });

    expect(undoCount).toBe(50);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it("rebases and drops history when an external state arrives", () => {
    const initialProps = { incoming: { step: 0 } };
    const { result, rerender } = renderHook(
      ({ incoming }) => useDesignTokensHistory<Record<string, unknown>>(incoming),
      { initialProps },
    );

    act(() => result.current.commit({ step: 1 }));
    expect(result.current.canUndo).toBe(true);

    rerender({ incoming: { step: 99 } });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    let restored: Record<string, unknown> | null = null;
    act(() => {
      restored = result.current.undo();
    });
    expect(restored).toBeNull();
  });

  it("keeps history when the parent re-emits the state we produced", () => {
    const initialProps = { incoming: { step: 0 } as Record<string, unknown> };
    const { result, rerender } = renderHook(
      ({ incoming }) => useDesignTokensHistory<Record<string, unknown>>(incoming),
      { initialProps },
    );

    const emitted = { step: 1 };
    act(() => result.current.commit(emitted));
    // Parent stores the emitted object as-is (same reference).
    rerender({ incoming: emitted });

    expect(result.current.canUndo).toBe(true);
  });
});

describe("useDesignTokensHistoryShortcuts", () => {
  it("undoes on Ctrl+Z and redoes on Ctrl+Shift+Z outside editable fields", () => {
    const { result } = renderHook(() =>
      useDesignTokensHistory<Record<string, unknown>>({ step: 0 }),
    );

    const applied: Array<Record<string, unknown>> = [];
    function Harness() {
      useDesignTokensHistoryShortcuts(historyApi, (restored) => {
        applied.push(restored);
      });
      return null;
    }

    const historyApi = result.current;
    render(<Harness />);

    act(() => result.current.commit({ step: 1 }));

    const event = new KeyboardEvent("keydown", {
      key: "z",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(applied).toEqual([{ step: 1 }]);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe("StorefrontPageSectionsEditor undo/redo", () => {
  const StatefulEditor = () => {
    const [designTokens, setDesignTokens] = React.useState<Record<string, unknown>>({
      themeId: "modern-minimal",
    });

    return (
      <>
        <StorefrontPageSectionsEditor
          themeId="modern-minimal"
          designTokens={designTokens}
          onChange={setDesignTokens}
        />
        <pre data-testid="design-tokens">{JSON.stringify(designTokens)}</pre>
      </>
    );
  };

  const readDesignTokens = (): Record<string, unknown> =>
    JSON.parse(screen.getByTestId("design-tokens").textContent || "{}");

  const applyShopVariantChange = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: /المتجر/i }));
    const shopGridSection = screen
      .getByText("منتجات التصنيف")
      .closest(".rounded-xl")!;
    await user.selectOptions(
      within(shopGridSection as HTMLElement).getByLabelText("النسخة البصرية"),
      "overlay-card",
    );
  };

  it("starts with undo/redo disabled", () => {
    render(<StatefulEditor />);

    expect(
      screen.getByRole("button", { name: "تراجع عن آخر تعديل" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "إعادة آخر تعديل" }),
    ).toBeDisabled();
  });

  it("reverts a section change with the undo button and re-applies it with redo", async () => {
    const user = userEvent.setup();
    render(<StatefulEditor />);

    const before = readDesignTokens();

    await applyShopVariantChange(user);

    const changed = readDesignTokens();
    expect(changed).not.toEqual(before);
    expect(
      getStorefrontPageOverridesFromDesignTokens(changed).shop,
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "تراجع عن آخر تعديل" }));

    expect(readDesignTokens()).toEqual(before);
    expect(
      screen.getByRole("button", { name: "تراجع عن آخر تعديل" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "إعادة آخر تعديل" }),
    ).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "إعادة آخر تعديل" }));

    expect(readDesignTokens()).toEqual(changed);
  });

  it("supports Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts", async () => {
    const user = userEvent.setup();
    render(<StatefulEditor />);

    await applyShopVariantChange(user);

    const changed = readDesignTokens();

    // Move focus out of the select so the editor shortcut applies.
    await user.click(screen.getByText("محرر الصفحات والأقسام"));

    await user.keyboard("{Control>}z{/Control}");
    expect(readDesignTokens()).toEqual({ themeId: "modern-minimal" });

    await user.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
    expect(readDesignTokens()).toEqual(changed);
  });
});