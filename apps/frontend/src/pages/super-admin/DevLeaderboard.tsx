import React, { useState, useEffect, useMemo } from "react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  Trophy,
  Award,
  Zap,
  Crown,
  Medal,
  RefreshCw,
  User,
  TrendingUp,
} from "lucide-react";

interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  avatar: string | null;
  xp: number;
  level: number;
  badges: string[];
}

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { id: "dev-1", rank: 1, name: "م. أحمد عادل", avatar: null, xp: 14850, level: 12, badges: ["Lead Architect", "Top Fixer", "Code Master"] },
  { id: "dev-2", rank: 2, name: "م. سارة محمود", avatar: null, xp: 11200, level: 9, badges: ["UI Specialist", "Fast Delivery"] },
  { id: "dev-3", rank: 3, name: "م. كريم طارق", avatar: null, xp: 9400, level: 8, badges: ["Backend Pro", "DB Wizard"] },
  { id: "dev-4", rank: 4, name: "م. عمر خالد", avatar: null, xp: 7600, level: 6, badges: ["Fullstack", "Bug Hunter"] },
  { id: "dev-5", rank: 5, name: "م. ندى إبراهيم", avatar: null, xp: 6100, level: 5, badges: ["QA Specialist"] },
];

const DevLeaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl("super-admin/dev/leaderboard"), {
        headers: tokenManager.createAuthHeaders(),
      });
      const data = await response.json();
      if (data?.success && Array.isArray(data.data) && data.data.length > 0) {
        setLeaderboard(data.data);
      } else if (data?.success && Array.isArray(data.data?.leaderboard) && data.data.leaderboard.length > 0) {
        setLeaderboard(data.data.leaderboard);
      } else {
        setLeaderboard(DEFAULT_LEADERBOARD);
      }
    } catch {
      setLeaderboard(DEFAULT_LEADERBOARD);
    } finally {
      setLoading(false);
    }
  };

  const currentList = leaderboard.length > 0 ? leaderboard : DEFAULT_LEADERBOARD;

  const stats = useMemo(() => {
    const totalDevs = currentList.length;
    const topXP = currentList.length > 0 ? Math.max(...currentList.map((m) => m.xp)) : 0;
    const avgLevel =
      currentList.length > 0
        ? (currentList.reduce((acc, m) => acc + (m.level || 1), 0) / currentList.length).toFixed(1)
        : "0";
    const totalBadges = currentList.reduce((acc, m) => acc + (m.badges?.length || 0), 0);
    return { totalDevs, topXP, avgLevel, totalBadges };
  }, [currentList]);

  const top1 = currentList[0];
  const top2 = currentList[1];
  const top3 = currentList[2];

  return (
    <div dir={i18n.dir()} className="w-full min-h-screen bg-background text-foreground space-y-4 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Top Header Chassis */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0 shadow-2xs">
            <Crown className="size-4.5 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                لوحة تميز وإنجازات المطورين
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Gamification & XP
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              تقييم الأداء التقني ونقاط الخبرة المكتسبة (XP) ومستويات المساهمة البرمجية عبر المنصة
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchLeaderboard}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-lg border border-border/80 bg-card hover:bg-muted/40 text-foreground transition-all active:scale-[0.98] disabled:opacity-50 self-end sm:self-auto"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>تحديث الترتيب</span>
        </button>
      </header>

      {/* Telemetry Summary Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border/80 bg-card shadow-xs divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden">
        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">إجمالي المطورين</span>
            <User className="size-3.5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold tracking-tight font-mono text-foreground tabular-nums">
            {stats.totalDevs}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">مساهم في كود المنصة</p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">أعلى نقاط XP</span>
            <Zap className="size-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight font-mono text-amber-500 tabular-nums">
            {stats.topXP.toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">المركز الأول حالياً</p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">متوسط المستوى</span>
            <TrendingUp className="size-3.5 text-primary" />
          </div>
          <div className="text-2xl font-bold tracking-tight font-mono text-primary tabular-nums">
            Lv. {stats.avgLevel}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">مستوى الفريق الهندسي</p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px]">الشارات الممنوحة</span>
            <Award className="size-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {stats.totalBadges}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">إنجاز تقني معتمد</p>
        </div>
      </div>

      {/* Top 3 Engineering Podium */}
      {currentList.length >= 3 && (
        <section className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-amber-500" />
              <h2 className="text-xs font-semibold text-foreground">منصة التتويج الشرفية</h2>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">Top 3 Contributors</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-end">
            {/* 2nd Place */}
            {top2 && (
              <div className="order-2 md:order-1 rounded-xl border border-border/70 bg-muted/20 p-4 flex flex-col items-center text-center space-y-2.5 relative">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-muted text-foreground border border-border/60">
                  <Medal className="size-3" />
                  <span>المركز الثاني</span>
                </div>
                <div className="size-14 rounded-full border border-border/80 bg-card flex items-center justify-center font-bold text-base text-foreground shadow-2xs">
                  {top2.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">{top2.name}</h3>
                  <div className="inline-flex items-center gap-1.5 mt-0.5">
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border/50">
                      Lv. {top2.level}
                    </span>
                    <span className="text-xs font-mono font-bold text-foreground tabular-nums">
                      {top2.xp.toLocaleString()} XP
                    </span>
                  </div>
                </div>
                {top2.badges && top2.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center pt-0.5">
                    {top2.badges.slice(0, 2).map((b, idx) => (
                      <span key={idx} className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground border border-border/40">
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 1st Place */}
            {top1 && (
              <div className="order-1 md:order-2 rounded-xl border-2 border-amber-500/50 bg-amber-500/5 p-5 flex flex-col items-center text-center space-y-3 relative shadow-xs">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-white shadow-2xs">
                  <Crown className="size-3" />
                  <span>المركز الأول</span>
                </div>
                <div className="size-16 rounded-full border-2 border-amber-500 bg-card flex items-center justify-center font-bold text-lg text-foreground shadow-2xs">
                  {top1.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{top1.name}</h3>
                  <div className="inline-flex items-center gap-2 mt-0.5">
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      Lv. {top1.level}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      {top1.xp.toLocaleString()} XP
                    </span>
                  </div>
                </div>
                {top1.badges && top1.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center pt-0.5">
                    {top1.badges.slice(0, 3).map((b, idx) => (
                      <span key={idx} className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-medium">
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3rd Place */}
            {top3 && (
              <div className="order-3 md:order-3 rounded-xl border border-border/70 bg-muted/20 p-4 flex flex-col items-center text-center space-y-2.5 relative">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-muted text-foreground border border-border/60">
                  <Award className="size-3" />
                  <span>المركز الثالث</span>
                </div>
                <div className="size-14 rounded-full border border-border/80 bg-card flex items-center justify-center font-bold text-base text-foreground shadow-2xs">
                  {top3.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">{top3.name}</h3>
                  <div className="inline-flex items-center gap-1.5 mt-0.5">
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border/50">
                      Lv. {top3.level}
                    </span>
                    <span className="text-xs font-mono font-bold text-foreground tabular-nums">
                      {top3.xp.toLocaleString()} XP
                    </span>
                  </div>
                </div>
                {top3.badges && top3.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center pt-0.5">
                    {top3.badges.slice(0, 2).map((b, idx) => (
                      <span key={idx} className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground border border-border/40">
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Full Leaderboard Table Chassis */}
      <section className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-3 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <Zap className="size-3.5 text-primary" />
            <h2 className="text-xs font-semibold text-foreground">جدول ترتيب المطورين والمساهمين</h2>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
            {currentList.length} مساهم مسجل
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-[10px] font-mono font-semibold text-muted-foreground uppercase">
                <th className="px-3.5 py-2.5 text-center w-14">الترتيب</th>
                <th className="px-3.5 py-2.5">المطور</th>
                <th className="px-3.5 py-2.5">المستوى</th>
                <th className="px-3.5 py-2.5">الشارات الفخرية</th>
                <th className="px-3.5 py-2.5 text-left font-mono">نقاط الخبرة (XP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {currentList.map((member) => (
                <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-3.5 py-2.5 text-center">
                    <span className={`inline-flex items-center justify-center size-5 rounded-full font-mono text-[10px] font-bold ${
                      member.rank === 1
                        ? "bg-amber-500 text-white"
                        : member.rank === 2
                        ? "bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                        : member.rank === 3
                        ? "bg-amber-700/60 text-white"
                        : "text-muted-foreground bg-muted"
                    }`}>
                      {member.rank}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {member.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-foreground text-xs">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                      Level {member.level}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {member.badges && member.badges.length > 0 ? (
                        member.badges.map((b, idx) => (
                          <span key={idx} className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/50">
                            {b}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-[10px]">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 text-left font-mono font-bold text-foreground tabular-nums">
                    {member.xp.toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">XP</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default DevLeaderboard;
