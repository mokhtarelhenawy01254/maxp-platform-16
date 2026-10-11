import { getYouTubeEmbedUrl, getDirectVideoUrl } from "../explanationVideo";

describe("explanationVideo utility", () => {
  describe("getYouTubeEmbedUrl", () => {
    it("handles standard youtube.com/watch?v=ID format with nocookie and parameters", () => {
      const url = "https://www.youtube.com/watch?v=wCD3sFrIF5U";
      const embed = getYouTubeEmbedUrl(url);
      expect(embed).toBe(
        "https://www.youtube-nocookie.com/embed/wCD3sFrIF5U?rel=0&modestbranding=1&playsinline=1"
      );
    });

    it("handles youtu.be/ID short format", () => {
      const url = "https://youtu.be/wCD3sFrIF5U";
      const embed = getYouTubeEmbedUrl(url);
      expect(embed).toBe(
        "https://www.youtube-nocookie.com/embed/wCD3sFrIF5U?rel=0&modestbranding=1&playsinline=1"
      );
    });

    it("handles youtube.com/shorts/ID format", () => {
      const url = "https://www.youtube.com/shorts/abc123xyz";
      const embed = getYouTubeEmbedUrl(url);
      expect(embed).toBe(
        "https://www.youtube-nocookie.com/embed/abc123xyz?rel=0&modestbranding=1&playsinline=1"
      );
    });

    it("handles youtube.com/live/ID format", () => {
      const url = "https://youtube.com/live/live999";
      const embed = getYouTubeEmbedUrl(url);
      expect(embed).toBe(
        "https://www.youtube-nocookie.com/embed/live999?rel=0&modestbranding=1&playsinline=1"
      );
    });

    it("returns null for non-youtube URLs", () => {
      expect(getYouTubeEmbedUrl("https://vimeo.com/123456")).toBeNull();
      expect(getYouTubeEmbedUrl("not-a-url")).toBeNull();
    });
  });

  describe("getDirectVideoUrl", () => {
    it("identifies direct video file extensions", () => {
      expect(getDirectVideoUrl("https://example.com/video.mp4")).toBe(
        "https://example.com/video.mp4"
      );
      expect(getDirectVideoUrl("https://example.com/video.webm?v=1")).toBe(
        "https://example.com/video.webm?v=1"
      );
    });

    it("returns null for non-video files", () => {
      expect(getDirectVideoUrl("https://example.com/image.png")).toBeNull();
      expect(getDirectVideoUrl("https://youtube.com/watch?v=123")).toBeNull();
    });
  });
});
