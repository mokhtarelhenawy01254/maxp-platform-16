import React from "react";

interface TikTokEmbedProps {
  videoId: string;
  className?: string;
  autoplay?: boolean;
}

const buildEmbedUrl = (videoId: string, autoplay: boolean) =>
  `https://www.tiktok.com/player/v1/${videoId}?autoplay=${autoplay ? 1 : 0}&controls=1&music=1`;

const TikTokEmbed: React.FC<TikTokEmbedProps> = ({
  videoId,
  className = "",
  autoplay = false,
}) => {
  return (
    <div className={`relative w-full overflow-hidden rounded-lg bg-black ${className}`}>
      <iframe
        src={buildEmbedUrl(videoId, autoplay)}
        title="TikTok video"
        className="absolute inset-0 h-full w-full"
        frameBorder="0"
        allow="autoplay; fullscreen"
        allowFullScreen
        scrolling="no"
      />
    </div>
  );
};

export default TikTokEmbed;
