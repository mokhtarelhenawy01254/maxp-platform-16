import React, { useRef, useState } from "react";

export interface VideoReelPlayerProps {
  videoUrl?: string;
  thumbnail?: string;
  caption?: string;
}

export const VideoReelPlayer: React.FC<VideoReelPlayerProps> = ({
  videoUrl,
  thumbnail,
  caption,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  if (!videoUrl) {
    return (
      <div className="pil-reel-card pil-reel-placeholder">
        {thumbnail && <img src={thumbnail} alt="" className="pil-reel-thumb" />}
        <div className="pil-reel-overlay">
          <span className="pil-reel-play-icon">▶</span>
          <p>{caption || "فيديو المنتج على الطبيعة"}</p>
        </div>
      </div>
    );
  }

  const isEmbed =
    videoUrl.includes("youtube.com") ||
    videoUrl.includes("youtu.be") ||
    videoUrl.includes("vimeo");

  if (isEmbed) {
    return (
      <div className="pil-reel-card">
        <iframe
          src={videoUrl}
          title="فيديو تجربة المنتج"
          className="pil-reel-iframe"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        {caption && <p className="pil-reel-caption">{caption}</p>}
      </div>
    );
  }

  return (
    <div className="pil-reel-card">
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnail}
        playsInline
        muted={isMuted}
        autoPlay
        loop
        className="pil-reel-video"
        onClick={togglePlay}
      />
      <div className="pil-reel-controls">
        <button
          type="button"
          onClick={togglePlay}
          className="pil-reel-btn"
          aria-label={isPlaying ? "إيقاف" : "تشغيل"}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>
        <button
          type="button"
          onClick={toggleMute}
          className="pil-reel-btn"
          aria-label={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
      </div>
      {caption && <p className="pil-reel-caption">{caption}</p>}
    </div>
  );
};

export default VideoReelPlayer;
