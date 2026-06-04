export const appendPreviewFlag = (
  url: string,
  previewToken?: string | null,
): string => {
  const normalizedUrl = String(url || "").trim();
  if (!normalizedUrl) {
    return "";
  }
  const normalizedPreviewToken = String(previewToken || "").trim();

  try {
    const parsed = new URL(normalizedUrl);
    parsed.searchParams.set("preview", "1");
    if (normalizedPreviewToken) {
      parsed.searchParams.set("previewToken", normalizedPreviewToken);
    }
    return parsed.toString();
  } catch {
    let nextUrl = normalizedUrl;

    if (/([?&])preview=/.test(nextUrl)) {
      nextUrl = nextUrl.replace(/([?&])preview=[^&#]*/g, "$1preview=1");
    } else {
      const separator = nextUrl.includes("?") ? "&" : "?";
      nextUrl = `${nextUrl}${separator}preview=1`;
    }

    if (normalizedPreviewToken) {
      if (/([?&])previewToken=/.test(nextUrl)) {
        return nextUrl.replace(
          /([?&])previewToken=[^&#]*/g,
          `$1previewToken=${encodeURIComponent(normalizedPreviewToken)}`,
        );
      }

      const separator = nextUrl.includes("?") ? "&" : "?";
      return `${nextUrl}${separator}previewToken=${encodeURIComponent(normalizedPreviewToken)}`;
    }

    return nextUrl;
  }
};
