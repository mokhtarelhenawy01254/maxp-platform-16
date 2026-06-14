import React, { useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { BookOpen } from "lucide-react";

interface AppExplanation {
  id: string;
  title: string;
  content: string;
  slug: string;
  order: number;
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
          {explanations.map((exp) => (
            <div key={exp.id} id={exp.slug} className="rounded-xl border bg-card overflow-hidden shadow-sm">
              <div className="bg-primary text-primary-foreground p-3 px-4">
                <h2 className="text-lg font-bold">{exp.title}</h2>
              </div>
              <div className="p-4">
                <div
                  className="prose prose-sm max-w-none dark:prose-invert [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_p]:leading-relaxed [&_img]:rounded-lg [&_img]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: exp.content }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppExplanationsPage;