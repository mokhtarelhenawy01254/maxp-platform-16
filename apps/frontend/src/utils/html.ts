const fallbackEntityMap: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": "\"",
  "&#39;": "'",
  "&nbsp;": " ",
};

export const decodeHtmlEntities = (value: string): string => {
  if (!value) return "";

  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }

  return value.replace(
    /&(amp|lt|gt|quot|#39|nbsp);/g,
    (match) => fallbackEntityMap[match] ?? match,
  );
};

export const toPlainText = (value: string): string => {
  if (!value) return "";
  const decoded = decodeHtmlEntities(value);
  return decoded
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};
