import React from 'react';
import { PlayCircleIcon } from '@heroicons/react/24/outline';

export interface VideoElementSettings {
  url?: string;
  poster?: string;
  ratio?: '16:9' | '4:3' | '1:1' | '9:16' | string;
  autoplay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  className?: string;
}

export interface VideoElementProps {
  section?: {
    type?: string;
    variant?: string;
    settings?: VideoElementSettings;
    [key: string]: any;
  };
  settings?: VideoElementSettings;
}

interface ParsedVideoSource {
  type: 'youtube' | 'vimeo' | 'direct';
  src: string;
}

const parseVideoSource = (rawUrl?: string): ParsedVideoSource | null => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }
  const url = rawUrl.trim();
  if (!url) return null;

  // YouTube matchers: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      src: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0`,
    };
  }

  // Vimeo matchers: vimeo.com/ID
  const vimeoMatch = url.match(
    /(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|))(\d+)/i,
  );
  if (vimeoMatch && vimeoMatch[3]) {
    return {
      type: 'vimeo',
      src: `https://player.vimeo.com/video/${vimeoMatch[3]}`,
    };
  }

  // Fallback to direct HTML5 video
  return {
    type: 'direct',
    src: url,
  };
};

const VideoElement: React.FC<VideoElementProps> = ({ section, settings: directSettings }) => {
  const mergedSettings = { ...section?.settings, ...directSettings };
  const rawUrl = mergedSettings?.url;
  const poster = mergedSettings?.poster?.trim();
  const rawRatio = String(mergedSettings?.ratio || '16:9').trim().toLowerCase();
  const controls = mergedSettings?.controls !== false;
  const autoplay = Boolean(mergedSettings?.autoplay);
  const loop = Boolean(mergedSettings?.loop);
  const muted = Boolean(mergedSettings?.muted || autoplay);
  const customClass = mergedSettings?.className || '';

  const parsed = parseVideoSource(rawUrl);

  // Aspect ratio classes
  let aspectClass = 'aspect-[16/9]';
  if (rawRatio === '4:3') {
    aspectClass = 'aspect-[4/3]';
  } else if (rawRatio === '1:1') {
    aspectClass = 'aspect-square';
  } else if (rawRatio === '9:16') {
    aspectClass = 'aspect-[9/16] max-w-sm mx-auto';
  }

  const containerStyle: React.CSSProperties = {
    borderRadius: 'var(--store-radius, 8px)',
  };

  if (!parsed) {
    return (
      <div
        data-storefront-element="video"
        data-element="video"
        className={`storefront-video-wrapper w-full overflow-hidden ${aspectClass} ${customClass}`.trim()}
        style={containerStyle}
      >
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 border border-dashed border-border/70 bg-muted/30 p-6 text-muted-foreground transition-colors hover:bg-muted/40">
          <PlayCircleIcon className="h-10 w-10 opacity-50" aria-hidden="true" />
          <span className="text-xs font-medium">أدخل رابط فيديو (YouTube / Vimeo / MP4)</span>
        </div>
      </div>
    );
  }

  return (
    <div
      data-storefront-element="video"
      data-element="video"
      className={`storefront-video-wrapper w-full overflow-hidden bg-black/90 ${aspectClass} ${customClass}`.trim()}
      style={containerStyle}
    >
      {parsed.type === 'youtube' || parsed.type === 'vimeo' ? (
        <iframe
          src={parsed.src}
          title="فيديو المتجر"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      ) : (
        <video
          src={parsed.src}
          poster={poster}
          controls={controls}
          autoPlay={autoplay}
          loop={loop}
          muted={muted}
          playsInline
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
};

export default VideoElement;
