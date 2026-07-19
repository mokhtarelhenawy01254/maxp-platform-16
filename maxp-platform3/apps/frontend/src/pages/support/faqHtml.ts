import DOMPurify from "dompurify";

export const getSafeFaqAnswerHtml = (answer?: string) =>
  DOMPurify.sanitize(answer || "", {
    USE_PROFILES: { html: true },
  }).replace(/\n/g, "<br>");
