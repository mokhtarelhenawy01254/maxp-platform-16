import React, { useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { BookOpen, PlayCircle } from "lucide-react";
import DOMPurify from "dompurify";

interface AppExplanation {
  id: string;
  title: string;
  content: string;
  slug: string;
  order: number;
  videoUrl?: string | null;
}

/**
 * Extracts a YouTube embed URL from various YouTube URL formats.
 */
function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (
      (u.hostname === "www.youtube.com" || u.hostname === "youtube.com") &&
      u.searchParams.get("v")
    ) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.pathname.startsWith("/embed/")) {
      return url;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

/**
 * Self-hosted video file (mp4/webm/ogg/mov/m3u8) — played in a native <video>.
 */
function getDirectVideoUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    if (/\.(mp4|webm|ogg|ogv|mov|m4v|m3u8)(\?|#|$)/i.test(path)) return url;
  } catch {
    // not a valid URL
  }
  return null;
}

const AppExplanationsPage: React.FC = () => {
  const [explanations, setExplanations] = useState<AppExplanation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExplanations = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get("/app-explanations/public");
        const data = res.data as any;
        if (data.success) {
          setExplanations(data.explanations);
        }
      } catch (err) {
        console.error("Failed to load explanations", err);
        setError("تعذر تحميل الشروحات. يرجى المحاولة لاحقاً.");
      } finally {
        setLoading(false);
      }
    };

    fetchExplanations();
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-6 rtl">
      <div className="mb-6 text-center">
        <div className="flex justify-center mb-2">
          <BookOpen className="size-12 text-blue-500" />
        </div>
        <h1 className="text-3xl font-bold mb-2">شرح التطبيقات</h1>
        <p className="text-muted-foreground">دليلك الشامل لاستخدام تطبيقات وخدمات المنصة</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">{error}</div>
      ) : explanations.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-muted-foreground">لا توجد شروحات متاحة حالياً</p>
        </div>
      ) : (
        <div className="space-y-4">
          {explanations.map((exp) => {
            const yt = exp.videoUrl ? getYouTubeEmbedUrl(exp.videoUrl) : null;
            const direct = exp.videoUrl && !yt ? getDirectVideoUrl(exp.videoUrl) : null;

            return (
              <div key={exp.id} id={exp.slug} className="rounded-xl border bg-card overflow-hidden shadow-sm">
                <div className="bg-primary text-primary-foreground p-3 px-4">
                  <h2 className="text-lg font-bold">{exp.title}</h2>
                </div>
                <div className="p-4">
                  {yt ? (
                    <div className="relative w-full pb-[56.25%] mb-4 rounded-xl overflow-hidden bg-black">
                      <iframe
                        className="absolute inset-0 w-full h-full"
                        src={yt}
                        title={exp.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : null}

                  {direct ? (
                    <video
                      className="w-full mb-4 rounded-xl bg-black"
                      src={direct}
                      controls
                      playsInline
                      preload="metadata"
                    />
                  ) : null}

                  {exp.videoUrl && !yt && !direct ? (
                    <a
                      href={exp.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
                    >
                      <PlayCircle className="size-5" />
                      شاهد الفيديو التوضيحي
                    </a>
                  ) : null}

                  <div
                    className="prose prose-sm max-w-none dark:prose-invert [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_p]:leading-relaxed [&_img]:rounded-lg [&_img]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(exp.content) }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AppExplanationsPage;
