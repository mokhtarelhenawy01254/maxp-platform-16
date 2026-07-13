import { config } from "../../../config";

const META_MEDIA_REFERENCE_PREFIX = "meta-media:";

const getMediaBaseUrl = () => {
  const configuredBaseUrl =
    config.apiUrl ||
    (typeof window !== "undefined" ? window.location.origin : "");

  return configuredBaseUrl.replace(/\/api\/v1$/, "");
};

export function buildWhatsAppMediaUrl(
  mediaUrl: string | null,
  messageId?: string | null,
) {
  if (!mediaUrl) {
    return "";
  }

  if (mediaUrl.startsWith("http")) {
    return mediaUrl;
  }

  const baseUrl = getMediaBaseUrl();

  if (mediaUrl.startsWith(META_MEDIA_REFERENCE_PREFIX)) {
    if (!messageId) {
      return "";
    }

    return `${baseUrl}/api/v1/proxy-image?whatsAppMessageId=${encodeURIComponent(messageId)}`;
  }

  return `${baseUrl}${mediaUrl}`;
}
