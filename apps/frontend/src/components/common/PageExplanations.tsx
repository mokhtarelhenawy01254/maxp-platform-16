import { Circle as PlayCircleIcon, X as XMarkIcon } from 'lucide-react';
import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
;
import { apiClient } from "../../services/apiClient";
import DOMPurify from "dompurify";

interface Explanation {
  id: string;
  title: string;
  content: string;
  videoUrl: string | null;
  slug: string;
}

/**
 * Extracts a YouTube embed URL from various YouTube URL formats.
 */
function getYouTubeEmbedUrl(url: string): string | null {
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

const PageExplanations: React.FC = () => {
  const location = useLocation();
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [selectedExp, setSelectedExp] = useState<Explanation | null>(null);

  const fetchExplanations = useCallback(async () => {
    try {
      const route = location.pathname;
      const res = await apiClient.get(
        `/app-explanations/by-route?route=${encodeURIComponent(route)}`
      );
      const data = res.data as any;
      if (data.success) {
        setExplanations(data.explanations);
      }
    } catch (err) {
      // Silently fail — this is a helper, not critical
      console.error("PageExplanations fetch error:", err);
    }
  }, [location.pathname]);

  useEffect(() => {
    fetchExplanations();
  }, [fetchExplanations]);

  if (explanations.length === 0) return null;

  const embedUrl = selectedExp?.videoUrl
    ? getYouTubeEmbedUrl(selectedExp.videoUrl)
    : null;

  return (
    <>
      {/* Buttons in the header */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {explanations.map((exp) => (
          <button
            key={exp.id}
            type="button"
            onClick={() => setSelectedExp(exp)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full
              bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
              text-gray-700 dark:text-gray-200
              hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700
              dark:hover:bg-blue-900/30 dark:hover:border-blue-600 dark:hover:text-blue-300
              transition-all duration-200 cursor-pointer"
          >
            {exp.videoUrl ? (
              <PlayCircleIcon className="h-4 w-4 text-red-500 flex-shrink-0" />
            ) : (
              <svg
                className="h-4 w-4 text-blue-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            )}
            <span>{exp.title}</span>
          </button>
        ))}
      </div>

      {/* Modal */}
      {selectedExp && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedExp(null)}
        >
          <div
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[95vw] max-w-3xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {selectedExp.title}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedExp(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-60px)] p-5">
              {/* Video */}
              {selectedExp.videoUrl && embedUrl && (
                <div className="relative w-full pb-[56.25%] mb-4 rounded-xl overflow-hidden bg-black">
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={embedUrl}
                    title={selectedExp.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {/* If video URL exists but can't be embedded, show link */}
              {selectedExp.videoUrl && !embedUrl && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <a
                    href={selectedExp.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 text-sm font-medium"
                  >
                    <PlayCircleIcon className="h-5 w-5" />
                    شاهد الفيديو التوضيحي
                  </a>
                </div>
              )}

              {/* Text content */}
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedExp.content) }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PageExplanations;
