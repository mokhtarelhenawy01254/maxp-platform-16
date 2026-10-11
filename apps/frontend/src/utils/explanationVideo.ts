/**
 * Shared video-URL helpers for the app-explanations feature
 * (header popover modal + public «كل الشروحات» page).
 */

/**
 * Extracts a YouTube embed URL from various YouTube URL formats.
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // youtube.com/watch?v=ID
    if (
      (u.hostname === "www.youtube.com" || u.hostname === "youtube.com") &&
      u.searchParams.get("v")
    ) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    // youtu.be/ID
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    // Already an embed URL
    if (u.pathname.startsWith("/embed/")) {
      return url;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

/**
 * Detects a self-hosted video file (mp4/webm/ogg/mov/m3u8) that can play in a native <video>.
 */
export function getDirectVideoUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    if (/\.(mp4|webm|ogg|ogv|mov|m4v|m3u8)(\?|#|$)/i.test(path)) return url;
  } catch {
    // not a valid URL
  }
  return null;
}
