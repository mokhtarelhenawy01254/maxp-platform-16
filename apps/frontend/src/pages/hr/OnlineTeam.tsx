import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Users,
  Search,
  Radio,
  RefreshCw,
  WifiOff,
  Briefcase,
  UserCircle2,
} from "lucide-react";
import useSocket from "../../hooks/useSocket";
import api from "../../services/api";
import { toast } from "sonner";
import { OnlineEmployee, OnlineEmployeeCard } from "./OnlineEmployeeCard";

interface OnlineTeamResponse {
  data?: {
    onlineCount?: number;
    totalCount?: number;
    onlineEmployees?: OnlineEmployee[];
    employees?: OnlineEmployee[];
  };
}

type FilterTab = "all" | "online" | "offline";

const AVATAR_BASE = "https://mokhtarelhenawy.online";

const getAvatarSrc = (emp: OnlineEmployee): string => {
  if (emp.avatar) {
    return emp.avatar.startsWith("http") || emp.avatar.startsWith("data:")
      ? emp.avatar
      : `${AVATAR_BASE}${emp.avatar}`;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    `${emp.firstName || ""} ${emp.lastName || ""}`,
  )}&background=random`;
};

const formatSince = (iso: string | null): string => {
  if (!iso) return "";
  const then = new Date(iso);
  const diffMs = Date.now() - then.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
};

export const OnlineTeam: React.FC = () => {
  const { t } = useTranslation();
  const { socket, isConnected } = useSocket();

  const [employees, setEmployees] = useState<OnlineEmployee[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const onlineIdsRef = useRef<Set<string>>(new Set());

  const fetchOnlineTeam = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await api.get<OnlineTeamResponse>("/hr/online-team", {
        params: { limit: 500 },
        _skipErrorToast: true,
      } as any);
      const data = response.data?.data;
      if (data) {
        const ids = new Set((data.onlineEmployees || []).map((e) => e.userId));
        onlineIdsRef.current = ids;
        setOnlineIds(new Set(ids));
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Error fetching online team:", error);
      toast.error(t("onlineTeam.errorLoad"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    const stored = localStorage.getItem("userId");
    if (stored) {
      setCurrentUserId(stored);
    } else {
      try {
        const parsed = localStorage.getItem("user");
        if (parsed) {
          const user = JSON.parse(parsed);
          if (user?.id) setCurrentUserId(user.id);
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    fetchOnlineTeam();
  }, [fetchOnlineTeam]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleUserOnline = (payload: { userId: string }) => {
      if (!payload?.userId) return;
      onlineIdsRef.current.add(payload.userId);
      setOnlineIds(new Set(onlineIdsRef.current));
    };

    const handleUserOffline = (payload: { userId: string }) => {
      if (!payload?.userId) return;
      onlineIdsRef.current.delete(payload.userId);
      setOnlineIds(new Set(onlineIdsRef.current));
    };

    socket.on("user:online", handleUserOnline);
    socket.on("user:offline", handleUserOffline);

    return () => {
      socket.off("user:online", handleUserOnline);
      socket.off("user:offline", handleUserOffline);
    };
  }, [socket, isConnected]);

  const decoratedEmployees = useMemo(() => {
    return (employees || []).map((emp) => ({
      ...emp,
      isOnline: onlineIds.has(emp.userId) || onlineIds.has(emp.id),
    }));
  }, [employees, onlineIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return decoratedEmployees.filter((emp) => {
      const name = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
      const email = (emp.email || "").toLowerCase();
      const dept = emp.department?.name?.toLowerCase() || "";
      const position = emp.position?.title?.toLowerCase() || "";
      const matchesSearch = !q || name.includes(q) || email.includes(q) || dept.includes(q) || position.includes(q);
      if (!matchesSearch) return false;
      if (tab === "online") return emp.isOnline;
      if (tab === "offline") return !emp.isOnline;
      return true;
    });
  }, [decoratedEmployees, search, tab]);

  const onlineCount = useMemo(
    () => decoratedEmployees.filter((e) => e.isOnline).length,
    [decoratedEmployees],
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-background" dir="rtl">
      {/* 1. TOP COMMAND BAR */}
      <header className="h-auto min-h-12 border-b border-border/70 px-3 sm:px-4 py-2 bg-card/95 backdrop-blur-md flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 shrink-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Radio className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-foreground truncate">
              {t("onlineTeam.pageTitle")}
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {t("onlineTeam.pageSubtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{onlineCount} {t("onlineTeam.live")}</span>
          </span>

          <button
            type="button"
            onClick={fetchOnlineTeam}
            disabled={refreshing}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-border/80 bg-card hover:bg-muted text-foreground transition-all active:scale-[0.97] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{t("onlineTeam.refresh")}</span>
          </button>
        </div>
      </header>

      {/* 2. CHASSIS SURFACE BODY */}
      <main className="flex-1 overflow-y-auto min-h-0 bg-background divide-y divide-border/60">
        
        {/* Strip 1: Telemetry Summary Ribbon */}
        <section className="p-3 sm:p-4 grid grid-cols-3 gap-2.5 sm:gap-3 bg-muted/10">
          <div className="p-2.5 sm:p-3 rounded-md border border-border/60 bg-card flex items-center gap-2.5">
            <span className="p-2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Users className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm sm:text-base font-bold font-mono text-foreground tabular-nums">{onlineCount}</p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{t("onlineTeam.onlineEmployees")}</p>
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-md border border-border/60 bg-card flex items-center gap-2.5">
            <span className="p-2 rounded bg-muted text-muted-foreground">
              <WifiOff className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm sm:text-base font-bold font-mono text-foreground tabular-nums">
                {decoratedEmployees.length - onlineCount}
              </p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{t("onlineTeam.offlineEmployees")}</p>
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-md border border-border/60 bg-card flex items-center gap-2.5">
            <span className="p-2 rounded bg-primary/10 text-primary">
              <Briefcase className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm sm:text-base font-bold font-mono text-foreground tabular-nums">
                {decoratedEmployees.length}
              </p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{t("onlineTeam.totalEmployees")}</p>
            </div>
          </div>
        </section>

        {/* Strip 2: Filters & Search */}
        <section className="px-3 sm:px-4 py-2.5 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
            <input
              type="text"
              placeholder={t("onlineTeam.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full ps-8 pe-3 py-1 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-md border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                tab === "all" ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("onlineTeam.allFilter")} ({decoratedEmployees.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("online")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                tab === "online" ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("onlineTeam.onlineFilter")} ({onlineCount})
            </button>
            <button
              type="button"
              onClick={() => setTab("offline")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                tab === "offline" ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("onlineTeam.offlineFilter")} ({decoratedEmployees.length - onlineCount})
            </button>
          </div>
        </section>

        {/* Strip 3: Team Grid */}
        <section className="p-3 sm:p-4">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4 rounded-md border border-border/60 bg-card animate-pulse space-y-2">
                  <div className="h-9 w-9 rounded-full bg-muted" />
                  <div className="h-3 w-28 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border/80 rounded-md">
              <UserCircle2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs font-medium text-foreground">
                {tab === "online" ? t("onlineTeam.noOnlineEmployees") : t("onlineTeam.noEmployees")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((emp) => (
                <OnlineEmployeeCard
                  key={emp.id}
                  emp={emp}
                  isCurrentUser={currentUserId === emp.userId || currentUserId === emp.id}
                  getAvatarSrc={getAvatarSrc}
                  formatSince={formatSince}
                />
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
};

export default OnlineTeam;