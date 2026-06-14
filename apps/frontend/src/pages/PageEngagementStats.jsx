import React, { useState, useEffect } from "react";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { useAuth } from "../hooks/useAuthSimple";
import { ThumbsUp, MessageSquare, Share2, TrendingUp, Users, Eye, Heart, RefreshCw, ExternalLink } from "lucide-react";

const PageEngagementStats = () => {
  const [loading, setLoading] = useState(true);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [engagementData, setEngagementData] = useState(null);
  const [period, setPeriod] = useState("7");

  useEffect(() => { fetchPagesOverview(); }, []);
  useEffect(() => { if (selectedPage) fetchEngagementStats(selectedPage, period); }, [selectedPage, period]);

  const fetchPagesOverview = async () => { try { setPagesLoading(true); const r = await fetch(buildApiUrl("pages/engagement/overview"), { headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }) }); if (!r.ok) throw new Error("فشل في جلب الصفحات"); const d = await r.json(); if (d.success && d.data.pages.length > 0) { setPages(d.data.pages); setSelectedPage(d.data.pages[0].pageId); } else setPages([]); } catch (err) { setError(err.message); } finally { setPagesLoading(false); } };
  const fetchEngagementStats = async (pageId, selectedPeriod) => { try { setLoading(true); setError(null); const r = await fetch(buildApiUrl(`pages/engagement/${pageId}?period=${selectedPeriod}`), { headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }) }); if (!r.ok) throw new Error("فشل في جلب الإحصائيات"); const d = await r.json(); if (d.success) setEngagementData(d.data); } catch (err) { setError(err.message); } finally { setLoading(false); } };

  const formatNumber = (num) => { if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"; if (num >= 1000) return (num / 1000).toFixed(1) + "K"; return num.toString(); };
  const formatDate = (ds) => new Date(ds).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });

  if (pagesLoading) return <div className="flex justify-center items-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;
  if (pages.length === 0) return <div className="p-3"><Alert><AlertDescription>لا توجد صفحات Facebook متصلة.</AlertDescription></Alert></div>;

  return (
    <div className="p-3 bg-muted/30 min-h-screen">
      <div className="mb-4"><h1 className="text-2xl font-bold text-blue-600 mb-1">📊 إحصائيات التفاعلات - Facebook Pages</h1><p className="text-sm text-muted-foreground">عرض شامل لتفاعلات المتابعين على صفحات Facebook</p></div>

      <Card className="mb-3 p-3"><div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Select value={selectedPage || ""} onValueChange={setSelectedPage}><SelectTrigger><SelectValue placeholder="اختر الصفحة" /></SelectTrigger><SelectContent>{pages.map(p => <SelectItem key={p.pageId} value={p.pageId}>{p.pageName} - {formatNumber(p.fanCount)} متابع</SelectItem>)}</SelectContent></Select>
        <Select value={period} onValueChange={setPeriod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">آخر 24 ساعة</SelectItem><SelectItem value="7">آخر 7 أيام</SelectItem><SelectItem value="14">آخر 14 يوم</SelectItem><SelectItem value="30">آخر 30 يوم</SelectItem></SelectContent></Select>
        <Button variant="outline" onClick={() => fetchEngagementStats(selectedPage, period)} disabled={loading}><RefreshCw className="size-4" /> تحديث</Button>
      </div></Card>

      {error && <Alert variant="destructive" className="mb-3"><AlertDescription>{error}</AlertDescription></Alert>}
      {loading ? <div className="flex justify-center min-h-[400px] items-center"><LoadingSpinner size="lg" /></div> : engagementData && <>
        <Card className="mb-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white"><CardContent className="flex items-center gap-4 p-4">
          <div className="size-16 rounded-full border-2 border-white overflow-hidden shrink-0">{engagementData.page.picture && <img src={engagementData.page.picture} className="size-full object-cover" />}</div>
          <div className="flex-1"><h2 className="text-xl font-bold">{engagementData.page.name}</h2><div className="flex flex-wrap gap-2 mt-1"><Badge className="bg-white/20 text-white border-0"><Users className="size-3" /> {formatNumber(engagementData.page.fanCount)} متابع</Badge><Badge className="bg-white/20 text-white border-0"><Heart className="size-3" /> {formatNumber(engagementData.page.followersCount)} معجب</Badge></div></div>
          <Button variant="ghost" size="icon" className="text-white" onClick={() => window.open(engagementData.page.link, "_blank")}><ExternalLink className="size-5" /></Button>
        </CardContent></Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {[{ l: "إجمالي الإعجابات", v: formatNumber(engagementData.summary.totalLikes), bg: "from-pink-400 to-red-500", icon: <ThumbsUp className="size-12 opacity-30" /> },
            { l: "إجمالي التعليقات", v: formatNumber(engagementData.summary.totalComments), bg: "from-blue-400 to-cyan-400", icon: <MessageSquare className="size-12 opacity-30" /> },
            { l: "إجمالي المشاركات", v: formatNumber(engagementData.summary.totalShares), bg: "from-green-400 to-emerald-400", icon: <Share2 className="size-12 opacity-30" /> },
            { l: "معدل التفاعل", v: `${engagementData.summary.engagementRate}%`, bg: "from-pink-300 to-yellow-300", icon: <TrendingUp className="size-12 opacity-30" /> }].map((c, i) => <Card key={i} className={`bg-gradient-to-br ${c.bg} text-white`}><CardContent><div className="flex justify-between items-center"><div><p className="text-sm opacity-80">{c.l}</p><p className="text-2xl font-bold">{c.v}</p></div>{c.icon}</div></CardContent></Card>)}
        </div>

        <Card><CardHeader><CardTitle>🏆 أفضل المنشورات حسب التفاعل</CardTitle></CardHeader><CardContent>
          <Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>المنشور</TableHead><TableHead className="text-center">التاريخ</TableHead><TableHead className="text-center">إعجابات</TableHead><TableHead className="text-center">تعليقات</TableHead><TableHead className="text-center">مشاركات</TableHead><TableHead className="text-center">إجمالي</TableHead><TableHead className="text-center">الإجراءات</TableHead></TableRow></TableHeader>
          <TableBody>{(engagementData.posts || []).slice(0, 10).map((post, i) => <TableRow key={post.id}><TableCell>{i + 1}</TableCell><TableCell><div className="flex items-center gap-1">{post.picture && <img src={post.picture} className="size-10 rounded object-cover" />}<span className="truncate max-w-[200px]">{post.message || "منشور بدون نص"}</span></div></TableCell><TableCell className="text-center text-xs">{formatDate(post.createdTime)}</TableCell><TableCell className="text-center"><Badge variant="outline">{formatNumber(post.engagement?.likes)}</Badge></TableCell><TableCell className="text-center"><Badge variant="outline">{formatNumber(post.engagement?.comments)}</Badge></TableCell><TableCell className="text-center"><Badge variant="outline">{formatNumber(post.engagement?.shares)}</Badge></TableCell><TableCell className="text-center font-bold">{formatNumber(post.engagement?.total)}</TableCell><TableCell className="text-center"><Button variant="ghost" size="icon" onClick={() => window.open(post.permalinkUrl, "_blank")}><ExternalLink className="size-4" /></Button></TableCell></TableRow>)}</TableBody></Table>
        </CardContent></Card>
      </>}
    </div>
  );
};

export default PageEngagementStats;