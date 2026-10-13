import React, { useState, useEffect, useMemo } from "react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  Trophy,
  Award,
  Zap,
  Flame,
  Crown,
  Medal,
  RefreshCw,
  User,
  Sparkles,
  TrendingUp,
  ShieldAlert
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
      if (data.success && Array.isArray(data.data)) {
        setLeaderboard(data.data);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalDevs = leaderboard.length;
    const topXP = leaderboard.length > 0 ? Math.max(...leaderboard.map((m) => m.xp)) : 0;
    const avgLevel =
      leaderboard.length > 0
        ? (leaderboard.reduce((acc, m) => acc + (m.level || 1), 0) / leaderboard.length).toFixed(1)
        : "0";
    const totalBadges = leaderboard.reduce((acc, m) => acc + (m.badges?.length || 0), 0);
    return { totalDevs, topXP, avgLevel, totalBadges };
  }, [leaderboard]);

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];
  const others = leaderboard.slice(3);

  return (
    <div dir={i18n.dir()} className="w-full min-h-screen bg-background text-foreground space-y-6 p-4 sm:p-6">
      {/* Top Header Chassis */}
      <header className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center size-8 rounded-lg bg-amber-500/10 text-amber-500">
                <Crown className="size-4" />
              </span>
              <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                Engineering Gamification
              </p>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              لوحة تميز وإنجازات المطورين
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              تقييم الأداء التقني ونقاط الخبرة المكتسبة (XP) ومستويات المساهمة البرمجية عبر المنصة.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={fetchLeaderboard}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>تحديث الترتيب</span>
            </button>
          </div>
        </div>
      </header>

      {/* Telemetry Summary Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">إجمالي المطورين</span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-foreground tabular-nums">
              {stats.totalDevs}
            </div>
          </div>
          <span className="p-2.5 rounded-lg bg-muted text-muted-foreground">
            <User className="size-5" />
          </span>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">أعلى نقاط XP</span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-amber-500 tabular-nums">
              {stats.topXP.toLocaleString()}
            </div>
          </div>
          <span className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
            <Zap className="size-5" />
          </span>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">متوسط المستوى</span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-primary tabular-nums">
              Lv. {stats.avgLevel}
            </div>
          </div>
          <span className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="size-5" />
          </span>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">الشارات الممنوحة</span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {stats.totalBadges}
            </div>
          </div>
          <span className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <Award className="size-5" />
          </span>
        </div>
      </div>

      {/* Top 3 Engineering Podium */}
      {leaderboard.length >= 3 && (
        <section className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/70 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-foreground">منصة التتويج الشرفية</h2>
            </div>
            <span className="text-xs text-muted-foreground font-mono">Top 3 Contributors</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
            {/* 2nd Place */}
            {top2 && (
              <div className="order-2 md:order-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-muted/20 p-5 flex flex-col items-center text-center space-y-3 relative">
                <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <Medal className="size-3" />
                  <span>المركز الثاني</span>
                </div>
                <div className="size-16 rounded-full border-2 border-slate-400 bg-background flex items-center justify-center font-bold text-lg text-foreground shadow-sm">
                  {top2.avatar ? (
                    <img src={top2.avatar} alt={top2.name} className="size-full rounded-full object-cover" />
                  ) : (
                    top2.name.charAt(0)
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{top2.name}</h3>
                  <div className="inline-flex items-center gap-1.5 mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border/50">
                      Lv. {top2.level}
                    </span>
                    <span className="text-xs font-mono font-bold text-foreground tabular-nums">
                      {top2.xp.toLocaleString()} XP
                    </span>
                  </div>
                </div>
                {top2.badges && top2.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center pt-1">
                    {top2.badges.slice(0, 2).map((b, idx) => (
                      <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40">
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 1st Place */}
            {top1 && (
              <div className="order-1 md:order-2 rounded-xl border-2 border-amber-500/60 bg-amber-500/5 p-6 flex flex-col items-center text-center space-y-3 relative shadow-md">
                <div className="absolute -top-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm">
                  <Crown className="size-3.5" />
                  <span>المركز الأول</span>
                </div>
                <div className="size-20 rounded-full border-2 border-amber-500 bg-background flex items-center justify-center font-bold text-xl text-foreground shadow-sm mt-1">
                  {top1.avatar ? (
                    <img src={top1.avatar} alt={top1.name} className="size-full rounded-full object-cover" />
                  ) : (
                    top1.name.charAt(0)
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{top1.name}</h3>
                  <div className="inline-flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      Lv. {top1.level}
                    </span>
                    <span className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      {top1.xp.toLocaleString()} XP
                    </span>
                  </div>
                </div>
                {top1.badges && top1.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center pt-1">
                    {top1.badges.slice(0, 3).map((b, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-medium">
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3rd Place */}
            {top3 && (
              <div className="order-3 md:order-3 rounded-xl border border-amber-700/40 bg-muted/20 p-5 flex flex-col items-center text-center space-y-3 relative">
                <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  <Award className="size-3" />
                  <span>المركز الثالث</span>
                </div>
                <div className="size-16 rounded-full border-2 border-amber-700/60 bg-background flex items-center justify-center font-bold text-lg text-foreground shadow-sm">
                  {top3.avatar ? (
                    <img src={top3.avatar} alt={top3.name} className="size-full rounded-full object-cover" />
                  ) : (
                    top3.name.charAt(0)
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{top3.name}</h3>
                  <div className="inline-flex items-center gap-1.5 mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border/50">
                      Lv. {top3.level}
                    </span>
                    <span className="text-xs font-mono font-bold text-foreground tabular-nums">
                      {top3.xp.toLocaleString()} XP
                    </span>
                  </div>
                </div>
                {top3.badges && top3.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center pt-1">
                    {top3.badges.slice(0, 2).map((b, idx) => (
                      <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40">
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
      <section className="rounded-xl border border-border/70 bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/70 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            <h2 className="text-xs sm:text-sm font-semibold text-foreground">جدول ترتيب المطورين والمساهمين</h2>
          </div>
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {leaderboard.length} مساهم مسجل
          </span>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center gap-3 text-muted-foreground">
            <RefreshCw className="size-5 animate-spin text-primary" />
            <span className="text-xs font-medium">جاري فحص وتحديث قائمة المتصدرين...</span>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-2">
            <Trophy className="size-8 text-muted-foreground/50" />
            <p className="text-xs font-medium">لا توجد بيانات مسجلة في لوحة التميز حتى الآن</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3.5 text-center w-16">الترتيب</th>
                  <th className="px-4 py-3.5">المطور</th>
                  <th className="px-4 py-3.5">المستوى</th>
                  <th className="px-4 py-3.5">الشارات الفخرية</th>
                  <th className="px-4 py-3.5 text-left font-mono">نقاط الخبرة (XP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {leaderboard.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center justify-center size-6 rounded-full font-mono text-xs font-bold ${
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
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {member.avatar ? (
                            <img src={member.avatar} alt="" className="size-full rounded-full object-cover" />
                          ) : (
                            member.name.charAt(0)
                          )}
                        </div>
                        <span className="font-medium text-foreground">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                        Level {member.level}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {member.badges && member.badges.length > 0 ? (
                          member.badges.map((b, idx) => (
                            <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                              {b}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-[11px]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-left font-mono font-bold text-foreground tabular-nums">
                      {member.xp.toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">XP</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default DevLeaderboard;
