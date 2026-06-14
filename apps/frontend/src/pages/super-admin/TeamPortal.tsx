import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { apiClient } from "../../services/apiClient";
import { Bug, Code, HelpCircle, FileText, RefreshCw, GitBranch } from "lucide-react";

const TeamPortal: React.FC = () => {
  const muiTheme = { palette: { mode: "dark" } };
  const isDark = true;
  const [structureContent, setStructureContent] = useState<string>("");
  const [syncContent, setSyncContent] = useState({ dailyNotes: "جاري التحميل...", currentFocus: "جاري التحميل...", prevention: "جاري التحميل..." });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mermaidRefs = useRef<HTMLDivElement[]>([]);

  const cardStyle = "rounded-xl border bg-card backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-lg";

  const parseSyncContent = (content: string) => {
    const sections = { dailyNotes: "", currentFocus: "", prevention: "" };
    const dm = content.match(/## 📝 ملاحظات اليوم \(Daily Notes\)\s*([\s\S]*?)(?=##|$)/);
    const cm = content.match(/## 🚀 ما الذي نفعله الآن؟ \(Current Focus\)\s*([\s\S]*?)(?=##|$)/);
    const pm = content.match(/## 🛠️ كيف نتفادى الأخطاء؟ \(Prevention Guide\)\s*([\s\S]*?)(?=##|$)/);
    if (dm) sections.dailyNotes = dm[1].trim();
    if (cm) sections.currentFocus = cm[1].trim();
    if (pm) sections.prevention = pm[1].trim();
    return sections;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [structRes, syncRes] = await Promise.all([apiClient.get("/super-admin/docs/Structure.md"), apiClient.get("/super-admin/docs/TEAM_SYNC.md")]);
        if (structRes.data.success) setStructureContent(structRes.data.content);
        if (syncRes.data.success) setSyncContent(parseSyncContent(syncRes.data.content));
      } catch (err: any) {
        console.error("Error fetching documentation:", err);
        setError(err.response?.data?.message || "Failed to load documentation");
        setSyncContent({ dailyNotes: "• يرجى مراجعة ملف Bugs.md قبل رفع أي إصلاح جديد.\n• التوثيق أصبح إلزامياً الآن.", currentFocus: "• تطوير واجهة بوابة الفريق.\n• التحقق من المزامنة النهائية على السيرفر.", prevention: "1. اقرأ Structure.md\n2. سجل الحل في Bugs.md\n3. تواصل بوضوح." });
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const extractMermaidBlocks = (content: string): string[] => {
    const regex = /```mermaid\n([\s\S]*?)```/g;
    const blocks: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) blocks.push(match[1].trim());
    return blocks;
  };

  const mermaidBlocks = extractMermaidBlocks(structureContent);

  return (
    <div className="p-4">
      <div className="mb-4 text-right"><h1 className="text-2xl font-bold mb-1">🤝 بوابة فريق العمل</h1><p className="text-sm text-muted-foreground">المنصة المركزية لتنسيق الجهود وتفادي الأخطاء التقنية بناءً على البيانات الحقيقية.</p></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Card className={cardStyle}>
            <CardContent>
              <div className="flex items-center gap-2 mb-3 flex-row-reverse"><RefreshCw className="size-8 text-blue-500" /><h2 className="text-base font-bold">تنسيق الفريق (TEAM_SYNC.md)</h2></div>
              <hr className="mb-3" />
              <div className="rtl">
                <div className="mb-4"><p className="text-sm font-bold text-blue-500 mb-1">🔹 ملاحظات اليوم</p><p className="text-sm whitespace-pre-line leading-relaxed">{syncContent.dailyNotes}</p></div>
                <div className="mb-4"><p className="text-sm font-bold text-green-500 mb-1">🚀 التركيز الحالي</p><p className="text-sm whitespace-pre-line leading-relaxed">{syncContent.currentFocus}</p></div>
              </div>
              <Button variant="outline" onClick={() => window.open("/api/v1/super-admin/docs/TEAM_SYNC.md", "_blank")}><FileText className="size-4" /> تحميل ملف التنسيق الكامل</Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <Card className={cardStyle}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 cursor-pointer rounded-lg p-2 hover:bg-muted/50" onClick={() => window.open("/api/v1/super-admin/docs/Bugs.md", "_blank")}><Bug className="size-5 text-red-500" /><div><p className="font-bold text-sm">سجل الأخطاء (Bugs.md)</p><p className="text-xs text-muted-foreground">آخر التحديثات والإصلاحات</p></div></div>
              <hr className="my-2" />
              <div className="flex items-center gap-2 cursor-pointer rounded-lg p-2 hover:bg-muted/50" onClick={() => window.open("/api/v1/super-admin/docs/Structure.md", "_blank")}><GitBranch className="size-5 text-purple-500" /><div><p className="font-bold text-sm">هيكلة المشروع (Structure.md)</p><p className="text-xs text-muted-foreground">مسارات البيانات والوظائف</p></div></div>
            </CardContent>
          </Card>
          <Card className={`${cardStyle} bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800`}>
            <CardContent>
              <div className="flex items-center gap-1 mb-2 flex-row-reverse"><HelpCircle className="size-5 text-yellow-500" /><p className="text-sm font-bold">كيف نتفادى الأخطاء؟</p></div>
              <p className="text-xs whitespace-pre-line">{syncContent.prevention}</p>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-1 md:col-span-3">
          <Card className={cardStyle}>
            <CardContent>
              <h2 className="font-bold mb-3">🗺️ خريطة مسارات النظام (Structure.md)</h2>
              {loading ? <div className="flex justify-center min-h-[200px] items-center"><LoadingSpinner /></div> : error ? <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg text-center"><p className="text-sm text-red-500">{error}</p></div> : mermaidBlocks.length > 0 ? <div className="ltr">{mermaidBlocks.map((_, index) => <div key={index} ref={(el) => { if (el) mermaidRefs.current[index] = el; }} className="mb-3 p-3 bg-muted/30 rounded-lg border" />)}</div> : <div className="p-4 bg-muted/30 rounded-lg border-2 border-dashed flex justify-center items-center min-h-[200px]"><p className="text-sm text-muted-foreground">[ لا توجد رسوم توضيحية متاحة حالياً في Structure.md ]</p></div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeamPortal;