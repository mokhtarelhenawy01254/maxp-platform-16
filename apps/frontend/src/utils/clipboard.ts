/**
 * Universal clipboard utility with automatic fallback for insecure contexts (HTTP),
 * iframes, and browsers blocking the modern Clipboard API.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern Async Clipboard API first (supported in secure contexts: HTTPS or localhost)
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn(
        "[clipboard] navigator.clipboard.writeText failed, attempting execCommand fallback:",
        err,
      );
    }
  }

  // 2. Fallback to document.execCommand('copy') via temporary textarea
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    let textarea: HTMLTextAreaElement | null = null;
    try {
      textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "-9999px";
      textarea.style.width = "2em";
      textarea.style.height = "2em";
      textarea.style.padding = "0";
      textarea.style.border = "none";
      textarea.style.outline = "none";
      textarea.style.boxShadow = "none";
      textarea.style.background = "transparent";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      textarea.style.fontSize = "16px"; // Prevent automatic zoom on iOS Safari

      document.body.appendChild(textarea);

      // Focus and select range for maximum cross-browser compatibility
      try {
        textarea.focus({ preventScroll: true });
      } catch {
        textarea.focus();
      }
      textarea.select();
      textarea.setSelectionRange(0, text.length);

      const successful = document.execCommand("copy");
      return Boolean(successful);
    } catch (fallbackErr) {
      console.error("[clipboard] document.execCommand copy fallback failed:", fallbackErr);
      return false;
    } finally {
      if (textarea && textarea.parentNode) {
        textarea.parentNode.removeChild(textarea);
      }
    }
  }

  return false;
}

export const copyTextToClipboard = copyToClipboard;
