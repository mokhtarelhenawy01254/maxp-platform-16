// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { openUrlInNewTab } from "../openUrlInNewTab";

describe("openUrlInNewTab", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens a blank tab first and redirects it to the requested URL", () => {
    const replace = vi.fn();
    const openedWindow = {
      opener: window,
      location: {
        replace,
      },
    } as unknown as Window;

    const openSpy = vi.spyOn(window, "open").mockReturnValue(openedWindow);

    expect(openUrlInNewTab("https://example.com/store?previewTheme=demo")).toBe(
      true,
    );
    expect(openSpy).toHaveBeenCalledWith("", "_blank");
    expect(openedWindow.opener).toBeNull();
    expect(replace).toHaveBeenCalledWith(
      "https://example.com/store?previewTheme=demo",
    );
  });

  it("returns false when the browser blocks the new tab", () => {
    vi.spyOn(window, "open").mockReturnValue(null);

    expect(openUrlInNewTab("https://example.com/store")).toBe(false);
  });
});
