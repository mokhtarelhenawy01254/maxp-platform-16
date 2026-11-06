// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyToClipboard, copyTextToClipboard } from "../clipboard";

describe("clipboard utility", () => {
  const originalClipboard = navigator.clipboard;
  const originalExecCommand = document.execCommand;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
    if (originalExecCommand) {
      document.execCommand = originalExecCommand;
    } else {
      delete (document as any).execCommand;
    }
  });

  it("returns false for empty text without doing anything", async () => {
    const res = await copyToClipboard("");
    expect(res).toBe(false);
  });

  it("uses navigator.clipboard.writeText when supported and successful", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const res = await copyToClipboard("https://example.com/invite/123");
    expect(res).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith("https://example.com/invite/123");
  });

  it("falls back to execCommand when navigator.clipboard.writeText throws (e.g. permission denied or insecure context)", async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error("NotAllowedError"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const mockExecCommand = vi.fn().mockReturnValue(true);
    document.execCommand = mockExecCommand;

    const res = await copyToClipboard("https://example.com/invite/fallback");
    expect(res).toBe(true);
    expect(writeTextMock).toHaveBeenCalled();
    expect(mockExecCommand).toHaveBeenCalledWith("copy");
  });

  it("falls back to execCommand when navigator.clipboard is undefined", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const mockExecCommand = vi.fn().mockReturnValue(true);
    document.execCommand = mockExecCommand;

    const res = await copyToClipboard("https://example.com/no-clipboard-api");
    expect(res).toBe(true);
    expect(mockExecCommand).toHaveBeenCalledWith("copy");
  });

  it("returns false when both modern API and execCommand fail", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    document.execCommand = vi.fn().mockReturnValue(false);

    const res = await copyToClipboard("failed-copy");
    expect(res).toBe(false);
  });

  it("exports copyTextToClipboard as an alias", async () => {
    expect(copyTextToClipboard).toBe(copyToClipboard);
  });
});
