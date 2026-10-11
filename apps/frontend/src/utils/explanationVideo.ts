/**
 * Shared video-URL helpers for the app-explanations feature
 * (header popover modal + public «كل الشروحات» page).
 */

/**
 * Extracts a privacy-friendly YouTube embed URL from various YouTube URL formats.
 * Uses youtube-nocookie.com with modestbranding and playsinline flags.
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();

    // youtube.com, www.youtube.com, m.youtube.com
    if (host.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) {
        return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v)}?rel=0&modestbranding=1&playsinline=1`;
      }
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/")[2];
        if (id) {
          return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1&playsinline=1`;
        }
      }
      if (u.pathname.startsWith("/embed/")) {
        const id = u.pathname.split("/")[2];
        if (id) {
          return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1&playsinline=1`;
        }
        return url;
      }
      if (u.pathname.startsWith("/live/")) {
        const id = u.pathname.split("/")[2];
        if (id) {
          return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1&playsinline=1`;
        }
      }
    }

    // youtu.be/ID
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\/+/, "").split("/")[0];
      if (id) {
        return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1&playsinline=1`;
      }
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
