import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Users,
  Search,
  Radio,
  RefreshCw,
  Clock,
  Wifi,
  WifiOff,
  Building2,
  Briefcase,
  UserCircle2,
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import useSocket from "../../hooks/useSocket";
import api from "../../services/api";
import { toast } from "sonner";

interface OnlineEmployee {
  id: string;
  userId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  isActive: boolean;
  status: string;
  department: { id: string; name: string; color: string } | null;
  position: { id: string; title: string; level: number } | null;
  role: string | null;
  lastLoginAt: string | null;
  isOnline: boolean;
  onlineSince: string | null;
}

interface OnlineTeamResponse {
  data?: {
    onlineCount: number;
    totalCount: number;
    onlineEmployees: OnlineEmployee[];
    employees: OnlineEmployee[];
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
    `${emp.firstName} ${emp.lastName}`,
  )}&background=random`;
};

const formatSince = (iso: string | null): string => {
  if (!iso) return "";
  const then = new Date(iso);
  const diffMs = Date.now() - then.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "╪º┘ä╪ó┘å";
  if (minutes < 60) return `┘à┘å╪░ ${minutes} ╪»┘é┘è┘é╪⌐`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `┘à┘å╪░ ${hours} ╪│╪º╪╣╪⌐`;
  const days = Math.floor(hours / 24);
  return `┘à┘å╪░ ${days} ┘è┘ê┘à`;
};

const OnlineTeam: React.FC = () => {
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
        const ids = new Set(data.onlineEmployees.map((e) => e.userId));
        onlineIdsRef.current = ids;
        setOnlineIds(new Set(ids));
        setEmployees(data.employees);
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
          setCurrentUserId(user.id || user._id || null);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    fetchOnlineTeam();
  }, [fetchOnlineTeam]);

  // Periodic refresh fallback (in case socket events are missed)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== "hidden") {
        fetchOnlineTeam();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchOnlineTeam]);

  // Live updates from socket
  useEffect(() => {
    if (!socket || !isConnected) return;

    const onOnlineUsers = (data: { users: string[] }) => {
      const ids = new Set((data.users || []).map(String));
      onlineIdsRef.current = ids;
      setOnlineIds(new Set(ids));
    };

    const onUserOnline = (data: { userId: string }) => {
      const id = String(data.userId);
      const next = new Set(onlineIdsRef.current);
      next.add(id);
      onlineIdsRef.current = next;
      setOnlineIds(new Set(next));
    };

    const onUserOffline = (data: { userId: string }) => {
      const id = String(data.userId);
      const next = new Set(onlineIdsRef.current);
      next.delete(id);
      onlineIdsRef.current = next;
      setOnlineIds(new Set(next));
    };

    socket.on("online_users", onOnlineUsers);
    socket.on("online_users_initial", onOnlineUsers);
    socket.on("user_online", onUserOnline);
    socket.on("user_offline", onUserOffline);

    return () => {
      socket.off("online_users", onOnlineUsers);
      socket.off("online_users_initial", onOnlineUsers);
      socket.off("user_online", onUserOnline);
      socket.off("user_offline", onUserOffline);
    };
  }, [socket, isConnected]);

  const decoratedEmployees = useMemo(() => {
    return employees.map((emp) => ({
      ...emp,
      isOnline: onlineIds.has(emp.userId) || onlineIds.has(emp.id),
      onlineSince:
        onlineIds.has(emp.userId) || onlineIds.has(emp.id)
          ? emp.onlineSince
          : null,
    }));
  }, [employees, onlineIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return decoratedEmployees.filter((emp) => {
      const name = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const email = emp.email.toLowerCase();
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

  const roleLabel = (role: string | null): string => {
    const map: Record<string, string> = {
      SUPER_ADMIN: t("sidebar.roleSuperAdmin"),
      COMPANY_ADMIN: t("sidebar.roleCompanyAdmin"),
      OWNER: t("sidebar.roleOwner"),
      MANAGER: t("sidebar.roleManager"),
      AGENT: t("sidebar.roleAgent"),
      AFFILIATE: t("sidebar.roleAffiliate"),
    };
    return role ? map[role] || role : "-";
  };

  return (
    <div
      className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="p-2 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 inline-flex">
              <Radio className="h-7 w-7" />
            </span>
            {t("onlineTeam.pageTitle")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t("onlineTeam.pageSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="px-4 py-2 text-base gap-2 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            {onlineCount} {t("onlineTeam.live")}
          </Badge>
          <Button
            variant="outline"
            onClick={fetchOnlineTeam}
            disabled={refreshing}
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 ml-2 ${refreshing ? "animate-spin" : ""}`} />
            {t("onlineTeam.refresh")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
              <Input
                placeholder={t("onlineTeam.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
              <TabsList className="bg-gray-100 dark:bg-gray-700">
                <TabsTrigger value="all">
                  {t("onlineTeam.allFilter")} ({decoratedEmployees.length})
                </TabsTrigger>
                <TabsTrigger value="online">
                  {t("onlineTeam.onlineFilter")} ({onlineCount})
                </TabsTrigger>
                <TabsTrigger value="offline">
                  {t("onlineTeam.offlineFilter")} ({decoratedEmployees.length - onlineCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-5 flex items-center gap-4">
            <span className="p-3 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
              <Users className="h-6 w-6" />
            </span>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{onlineCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("onlineTeam.onlineEmployees")}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-5 flex items-center gap-4">
            <span className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <WifiOff className="h-6 w-6" />
            </span>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {decoratedEmployees.length - onlineCount}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("onlineTeam.offlineEmployees")}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-5 flex items-center gap-4">
            <span className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              <Briefcase className="h-6 w-6" />
            </span>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {decoratedEmployees.length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("onlineTeam.totalEmployees")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-12 text-center">
            <UserCircle2 className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
              {tab === "online" ? t("onlineTeam.noOnlineEmployees") : t("onlineTeam.noEmployees")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {tab === "online"
                ? t("onlineTeam.noOnlineEmployeesDesc")
                : t("onlineTeam.noEmployeesDesc")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((emp) => {
            const isOnline = emp.isOnline;
            const isCurrentUser = currentUserId === emp.userId || currentUserId === emp.id;
            return (
              <Card
                key={emp.id}
                className={`bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 transition-all hover:shadow-md hover:-translate-y-0.5 ${
                  isOnline
                    ? "ring-1 ring-green-200 dark:ring-green-800"
                    : ""
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar className="h-14 w-14 border-2 border-white dark:border-gray-700 shadow-sm">
                          <AvatarImage src={getAvatarSrc(emp)} alt={`${emp.firstName} ${emp.lastName}`} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                            {emp.firstName?.[0] || ""}
                            {emp.lastName?.[0] || ""}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={`absolute -bottom-0.5 -left-0.5 h-4 w-4 rounded-full border-2 border-white dark:border-gray-800 ${
                            isOnline ? "bg-green-500" : "bg-gray-400"
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate flex items-center gap-2">
                          {emp.firstName} {emp.lastName}
                          {isCurrentUser && (
                            <span className="text-xs font-normal text-blue-600 dark:text-blue-400">
                              (╪ú┘å╪¬)
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate" dir="ltr">
                          {emp.email}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        isOnline
                          ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : "border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
                      }
                    >
                      {isOnline ? (
                        <span className="flex items-center gap-1.5">
                          <Wifi className="h-3.5 w-3.5" />
                          {t("onlineTeam.online")}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <WifiOff className="h-3.5 w-3.5" />
                          {t("onlineTeam.offline")}
                        </span>
                      )}
                    </Badge>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
                      {emp.department && (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          {emp.department.name}
                        </span>
                      )}
                      {emp.position && (
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-4 w-4 text-gray-400" />
                          {emp.position.title}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {isOnline && emp.onlineSince ? (
                        <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                          <Clock className="h-4 w-4" />
                          {t("onlineTeam.onlineSince", { time: formatSince(emp.onlineSince) })}
                        </span>
                      ) : emp.lastLoginAt ? (
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          {t("onlineTeam.lastSeen", {
                            date: new Date(emp.lastLoginAt).toLocaleString("ar-EG"),
                          })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OnlineTeam;
