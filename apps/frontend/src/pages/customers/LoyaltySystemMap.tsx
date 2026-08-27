import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import {
  Users,
  Megaphone,
  Calendar,
  Gift,
  GitBranch,
  FolderTree,
  BadgeCheck,
  BarChart3,
  Settings2,
  Filter,
  ListChecks,
  Trophy,
  Bell,
  RefreshCw,
  Loader2,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Cloud,
  Smartphone,
  HelpCircle,
  TrendingUp,
  Target,
  ShoppingBag,
  Award,
  Coins,
  Info,
  BadgePercent,
  Eye,
  Download,
  Zap,
  ExternalLink,
  FileImage,
  History,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

type NodeStatus = "active" | "inactive" | "warning" | "unknown";

interface MapNode {
  id: string;
  label: string;
  route: string;
  icon: React.ElementType;
  status: NodeStatus;
  summary: string;
  chips?: string[];
}

interface StageDef {
  id: string;
  label: string;
  icon: React.ElementType;
  nodeIds: string[];
}

interface EdgeDef {
  from: string;
  to: string;
  label: string;
  loop?: boolean;
}

interface DrawnEdge {
  id: string;
  d: string;
  color: string;
  marker: string;
  label: string;
  lx: number;
  ly: number;
  loop?: boolean;
}

interface RoutingInfo {
  key: "meta" | "wa" | "unknown";
  label: string;
  desc: string;
}

interface ReEngagementLine {
  id: string;
  trigger: string;
  tool: string;
  route: string;
  message: string;
  source: RoutingInfo;
  status: "scheduled" | "sent" | "failed" | "inactive" | "unknown";
  count: number | null;
  enabled: boolean;
  settingsKey?: "occasion" | "inactive" | "points";
}

interface CustomerRow {
  name: string;
  phone: string;
  extra: string;
}

interface CustomerListState {
  id: string;
  title: string;
  loading: boolean;
  rows: CustomerRow[];
}

type DateRangeKey = "today" | "7d" | "30d" | "all";

interface TimelineEvent {
  label: string;
  date?: string;
  route?: string;
}

interface TimelineStage {
  id: string;
  label: string;
  icon: React.ElementType;
  dateLabel: string;
  date: string | null;
  note?: string;
  events: TimelineEvent[];
}

interface NodeDetail {
  count: string;
  lastActivity: string;
  route: string;
}

const STAGES: StageDef[] = [
  {
    id: "entry",
    label: "الاشتراك والطلب",
    icon: ShoppingBag,
    nodeIds: ["customers"],
  },
  {
    id: "collect",
    label: "جمع النقاط والولاء",
    icon: Coins,
    nodeIds: ["postPurchase", "loyaltyPrograms", "loyaltyMembers", "pointsCenter"],
  },
  {
    id: "redeem",
    label: "الاستبدال والكاش باك",
    icon: Award,
    nodeIds: ["analytics", "settings"],
  },
  {
    id: "reengage",
    label: "إعادة الاستهداف",
    icon: Target,
    nodeIds: [
      "segmentation",
      "customerLists",
      "whatsappNotify",
      "occasions",
      "birthdays",
      "customerNotifications",
    ],
  },
];

const EDGES: EdgeDef[] = [
  { from: "customers", to: "postPurchase", label: "بعد كل أوردر" },
  { from: "postPurchase", to: "loyaltyPrograms", label: "أكسب نقاط" },
  { from: "loyaltyPrograms", to: "loyaltyMembers", label: "تسجيل تلقائي" },
  { from: "loyaltyMembers", to: "pointsCenter", label: "استبدال نقاط" },
  { from: "pointsCenter", to: "analytics", label: "تغذية الأرقام" },
  { from: "analytics", to: "settings", label: "توصيات وضبط" },
  { from: "settings", to: "loyaltyPrograms", label: "تفعيل / إيقاف" },
  { from: "loyaltyMembers", to: "segmentation", label: "تحديد الشرائح" },
  { from: "segmentation", to: "customerLists", label: "بناء قوائم" },
  { from: "customerLists", to: "whatsappNotify", label: "إرسال جماعي" },
  { from: "customers", to: "occasions", label: "مناسبة قريبة", loop: true },
  { from: "customers", to: "birthdays", label: "عيد ميلاد", loop: true },
  {
    from: "loyaltyMembers",
    to: "customerNotifications",
    label: "استهداف بالنقاط",
    loop: true,
  },
  {
    from: "postPurchase",
    to: "whatsappNotify",
    label: "متابعة الساكت",
    loop: true,
  },
];

const STATUS_META: Record<
  NodeStatus,
  {
    label: string;
    border: string;
    badge: string;
    dot: string;
    iconBg: string;
    iconFg: string;
  }
> = {
  active: {
    label: "شغالة",
    border: "border-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
    iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
    iconFg: "text-emerald-600 dark:text-emerald-400",
  },
  inactive: {
    label: "مقفولة",
    border: "border-gray-200 dark:border-gray-600",
    badge: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300",
    dot: "bg-gray-300 dark:bg-gray-500",
    iconBg: "bg-gray-100 text-gray-400 dark:bg-gray-700/60 dark:text-gray-400",
    iconFg: "text-gray-400 dark:text-gray-400",
  },
  warning: {
    label: "محتاجة مراجعة",
    border: "border-amber-400 dark:border-amber-500",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    dot: "bg-amber-500",
    iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
    iconFg: "text-amber-600 dark:text-amber-400",
  },
  unknown: {
    label: "غير محدد",
    border: "border-blue-300 dark:border-blue-700",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    dot: "bg-blue-400",
    iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
    iconFg: "text-blue-600 dark:text-blue-400",
  },
};

function fmt(n: number | undefined | null): string {
  return Number(n || 0).toLocaleString("en-US");
}

function normalizeDigits(s: string): string {
  return String(s || "")
    .replace(/[\u0660-\u0669]/g, (d) => String("\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669".indexOf(d)))
    .replace(/[\u06F0-\u06F9]/g, (d) => String("\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9".indexOf(d)));
}

function fmtDate(v?: string | null): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
}

function firstLine(text?: string | null, max = 120): string {
  if (!text) return "";
  const single = String(text).split("\n")[0] || "";
  return single.length > max ? single.slice(0, max) + "…" : single;
}

function resolveRouting(sessions: any[]): RoutingInfo {
  const connected = sessions.filter(
    (s: any) => String(s.status || "").toUpperCase() === "CONNECTED",
  );
  const def = connected.find((s: any) => s.isDefault) || connected[0];
  if (!def) {
    return {
      key: "unknown",
      label: "غير محدد",
      desc: "لا توجد جلسة واتساب متصلة",
    };
  }
  if (def.provider === "META_CLOUD") {
    return {
      key: "meta",
      label: "Meta Cloud API",
      desc: def.name || def.metaDisplayPhoneNumber || def.phoneNumber || "",
    };
  }
  if (def.provider === "BAILEYS") {
    return {
      key: "wa",
      label: "واتساب عادي (Baileys)",
      desc: def.name || def.phoneNumber || "",
    };
  }
  return {
    key: "unknown",
    label: "غير محدد",
    desc: "مصدر الإرسال غير معروف",
  };
}

const LoyaltySystemMap: React.FC = () => {
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [edges, setEdges] = useState<DrawnEdge[]>([]);

  const [pendingToggle, setPendingToggle] = useState<ReEngagementLine | null>(null);
  const [savingToggle, setSavingToggle] = useState(false);
  const [thresholdDraft, setThresholdDraft] = useState<number>(30);
  const [customerList, setCustomerList] = useState<CustomerListState | null>(null);
  const [backfillConfirm, setBackfillConfirm] = useState(false);
  const [backfillBusy, setBackfillBusy] = useState(false);
  const [channelDialog, setChannelDialog] = useState(false);
  const [channelDraft, setChannelDraft] = useState<string>("");
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeKey>("all");
  const [timelineLog, setTimelineLog] = useState<TimelineStage | null>(null);
  const [svgBusy, setSvgBusy] = useState(false);

  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const [programsRes, walletRes, sysRes, cfgRes, sessionsRes, flowsRes, journeysRes, birthdayRes, occasionsRes, campaignsRes, catsRes, listsRes, recordsRes] =
        await Promise.allSettled([
          apiClient.get("/hr/customer-loyalty/programs"),
          apiClient.get("/wallet/stats"),
          apiClient.get("/hr/customer-loyalty/system-analytics"),
          apiClient.get("/hr/customer-loyalty/loyalty-config"),
          apiClient.get("/whatsapp/sessions"),
          apiClient.get("/whatsapp/automation/flows"),
          apiClient.get("/whatsapp-automation/journeys"),
          apiClient.get("/customers/whatsapp-notify/birthday-automation/settings"),
          apiClient.get("/customers/whatsapp-notify/occasions"),
          apiClient.get("/customers/whatsapp-notify/campaigns/history?limit=10"),
          apiClient.get("/whatsapp/lead-categories"),
          apiClient.get("/broadcast/customer-lists"),
          apiClient.get("/hr/customer-loyalty/customers?pageSize=1"),
        ]);

      const get = (r: PromiseSettledResult<any>) =>
        r.status === "fulfilled" ? (r.value as any) : null;

      const programs = get(programsRes)?.data?.data || [];
      const wallet = get(walletRes)?.data?.data || null;
      const systemAnalytics = get(sysRes)?.data?.data || null;
      const loyaltyConfig = get(cfgRes)?.data?.data || null;
      const sessions = get(sessionsRes)?.data?.sessions || [];
      const flows = get(flowsRes)?.data?.data || [];
      const journeys = get(journeysRes)?.data?.data || [];
      const birthdaySettings = get(birthdayRes)?.data?.data || null;
      const occasions = get(occasionsRes)?.data?.data || [];
      const campaigns = get(campaignsRes)?.data?.campaigns || [];
      const leadCategories = get(catsRes)?.data?.data || [];
      const allLists = get(listsRes)?.data?.data || [];
      const recordsData = get(recordsRes)?.data?.data || {};
      const loyaltyRecordsTotal =
        recordsData.total || (Array.isArray(recordsData) ? recordsData.length : 0);

      const customerCounts: Record<string, number> = {};
      const [leadRes, activeRes, inactiveRes, blockedRes] = await Promise.allSettled([
        apiClient.get("/customers?limit=1&status=LEAD"),
        apiClient.get("/customers?limit=1&status=ACTIVE"),
        apiClient.get("/customers?limit=1&status=INACTIVE"),
        apiClient.get("/customers?limit=1&status=BLOCKED"),
      ]);
      const setCount = (r: PromiseSettledResult<any>, key: string) => {
        if (r.status === "fulfilled") {
          customerCounts[key] = Number((r.value as any)?.data?.pagination?.total || 0);
        } else {
          customerCounts[key] = 0;
        }
      };
      setCount(leadRes, "LEAD");
      setCount(activeRes, "ACTIVE");
      setCount(inactiveRes, "INACTIVE");
      setCount(blockedRes, "BLOCKED");

      const enabledFlows = flows.filter((f: any) => f.isEnabled === true);
      let firstEnabledFlowSteps: any[] = [];
      if (enabledFlows[0]) {
        const stepsRes = await apiClient
          .get(`/whatsapp/automation/flows/${enabledFlows[0].id}/steps`)
          .catch(() => ({ data: { data: [] } }));
        firstEnabledFlowSteps = (stepsRes as any)?.data?.data || [];
      }

      const reSettingsRes = await apiClient
        .get("/hr/customer-loyalty/re-engagement/settings")
        .catch(() => ({ data: { data: null } }));
      const reSettings = (reSettingsRes as any)?.data?.data || {
        inactiveDays: 30,
        loops: { occasion: false, inactive: false, points: false },
      };
      const inactiveDays = Number(reSettings.inactiveDays || 30);

      const [countsRes, birthdayCountRes, oldestCustRes, newestCustRes] = await Promise.allSettled([
        apiClient.get(
          `/hr/customer-loyalty/re-engagement/counts?inactiveDays=${inactiveDays}`,
        ),
        apiClient.get("/customers/whatsapp-notify/birthday-automation/upcoming?days=30"),
        apiClient.get("/customers?limit=1&sortBy=createdAt&sortOrder=asc"),
        apiClient.get("/customers?limit=1&sortBy=createdAt&sortOrder=desc"),
      ]);
      const counts = {
        inactive:
          countsRes.status === "fulfilled"
            ? (countsRes.value as any)?.data?.data?.inactive ?? null
            : null,
        points:
          countsRes.status === "fulfilled"
            ? (countsRes.value as any)?.data?.data?.points ?? null
            : null,
        occasion:
          countsRes.status === "fulfilled"
            ? (countsRes.value as any)?.data?.data?.occasion ?? null
            : null,
        birthday:
          birthdayCountRes.status === "fulfilled"
            ? (birthdayCountRes.value as any)?.data?.total ?? null
            : null,
      };
      const upcomingBirthdays =
        birthdayCountRes.status === "fulfilled"
          ? (birthdayCountRes.value as any)?.data?.data || []
          : [];
      const oldestCustomerDate =
        oldestCustRes.status === "fulfilled"
          ? (oldestCustRes.value as any)?.data?.data?.[0]?.createdAt ?? null
          : null;
      const newestCustomerDate =
        newestCustRes.status === "fulfilled"
          ? (newestCustRes.value as any)?.data?.data?.[0]?.createdAt ?? null
          : null;

      setData({
        programs,
        wallet,
        systemAnalytics,
        loyaltyConfig,
        sessions,
        flows,
        enabledFlows,
        firstEnabledFlowSteps,
        journeys,
        birthdaySettings,
        occasions,
        campaigns,
        leadCategories,
        customerLists: allLists,
        loyaltyRecordsTotal,
        customerCounts,
        reSettings,
        counts,
        upcomingBirthdays,
        oldestCustomerDate,
        newestCustomerDate,
      });
      setThresholdDraft(Number(reSettings.inactiveDays || 30));
      setLastUpdated(new Date().toLocaleString("ar-EG"));
    } catch (error) {
      console.error("Error loading loyalty system map:", error);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const inRange = useCallback(
    (v?: string | null): boolean => {
      if (!v) return false;
      if (dateRange === "all") return true;
      const d = new Date(v).getTime();
      if (Number.isNaN(d)) return false;
      const now = Date.now();
      const days = dateRange === "today" ? 1 : dateRange === "7d" ? 7 : 30;
      return d >= now - days * 86400000;
    },
    [dateRange],
  );

  const filteredActivity = useMemo(() => {
    if (!data) return null;
    const d = data as any;
    const campaigns = (d.campaigns || []).filter((c: any) => inRange(c.createdAt));
    const occasions = (d.occasions || []).filter((o: any) => inRange(o.scheduledAt));
    const journeys = (d.journeys || []).filter((j: any) => inRange(j.createdAt));
    return { campaigns, occasions, journeys };
  }, [data, inRange]);

  const hasTemporalData = useMemo(() => {
    if (!data) return false;
    const d = data as any;
    return Boolean(
      (d.campaigns || []).length ||
        (d.occasions || []).length ||
        (d.journeys || []).length ||
        (d.programs || []).length ||
        d.oldestCustomerDate ||
        (d.upcomingBirthdays || []).length,
    );
  }, [data]);

  const nodes = useMemo<MapNode[]>(() => {
    if (!data) return [];
    const {
      programs = [],
      wallet = null,
      loyaltyConfig = null,
      flows = [],
      enabledFlows = [],
      birthdaySettings = null,
      leadCategories = [],
      customerLists = [],
      loyaltyRecordsTotal = 0,
      customerCounts = {},
    } = data as any;

    const campaigns = filteredActivity?.campaigns || [];
    const occasions = filteredActivity?.occasions || [];
    const journeys = filteredActivity?.journeys || [];

    const activeJourneys = journeys.filter(
      (j: any) => String(j.status || "").toUpperCase() === "ACTIVE",
    );

    const totalCustomers = programs.reduce(
      (s: number, p: any) => s + Number(p.customersCount || 0),
      0,
    );
    const totalIssued = programs.reduce(
      (s: number, p: any) => s + Number(p.totalPointsIssued || 0),
      0,
    );
    const totalRedeemed = programs.reduce(
      (s: number, p: any) => s + Number(p.totalPointsRedeemed || 0),
      0,
    );
    const totalCashback = Number(wallet?.totalCashback || 0);
    const redemptionRate =
      totalIssued > 0 ? Math.round((totalRedeemed / totalIssued) * 100) : 0;
    const activePrograms = programs.filter((p: any) => p.status === "ACTIVE");
    const customLists = (customerLists || []).filter((l: any) => !l.isDefault);

    const cfg = loyaltyConfig || {};
    const tiersEnabled = cfg?.tiers?.enabled === true;
    const autoDiscountEnabled = cfg?.autoDiscount?.enabled === true;
    const cashbackEnabled = cfg?.cashback?.enabled === true;

    const onOff = (v: boolean) => (v ? "مفعّلة" : "مقفولة");

    return [
      {
        id: "customers",
        label: "العملاء",
        route: "/customers",
        icon: Users,
        status: "active" as NodeStatus,
        summary: "سجل العملاء بكل حالاته",
        chips: [
          `محتمل ${fmt(customerCounts.LEAD)}`,
          `نشط ${fmt(customerCounts.ACTIVE)}`,
          `غير نشط ${fmt(customerCounts.INACTIVE)}`,
          `محظور ${fmt(customerCounts.BLOCKED)}`,
        ],
      },
      {
        id: "postPurchase",
        label: "سلاسل ما بعد الاستلام",
        route: "/whatsapp/customer-journey",
        icon: GitBranch,
        status:
          enabledFlows.length || activeJourneys.length
            ? ("active" as NodeStatus)
            : ("inactive" as NodeStatus),
        summary:
          enabledFlows.length || activeJourneys.length
            ? `${flows.length} سلسلة (${enabledFlows.length} مفعّلة) · ${activeJourneys.length} رحلة نشطة`
            : "لا توجد سلاسل مفعّلة",
      },
      {
        id: "loyaltyPrograms",
        label: "برامج الولاء",
        route: "/customers/loyalty-programs",
        icon: FolderTree,
        status: activePrograms.length ? ("active" as NodeStatus) : ("inactive" as NodeStatus),
        summary: activePrograms.length
          ? `${activePrograms.length} برنامج نشط · ${fmt(totalCustomers)} مشترك`
          : "لا توجد برامج نشطة",
      },
      {
        id: "loyaltyMembers",
        label: "أعضاء الولاء",
        route: "/customers/loyalty-members",
        icon: BadgeCheck,
        status:
          loyaltyRecordsTotal > 0 || totalCustomers > 0
            ? ("active" as NodeStatus)
            : ("inactive" as NodeStatus),
        summary: `${fmt(loyaltyRecordsTotal || totalCustomers)} عضو مسجّل في برامج الولاء`,
      },
      {
        id: "pointsCenter",
        label: "مركز نقاط العملاء",
        route: "/customers/points-center",
        icon: Trophy,
        status:
          activePrograms.length || totalIssued > 0
            ? ("active" as NodeStatus)
            : ("inactive" as NodeStatus),
        summary: `${fmt(totalIssued)} نقطة مصدرة · ${fmt(totalRedeemed)} مستبدلة`,
      },
      {
        id: "analytics",
        label: "تحليلات الولاء",
        route: "/customers/loyalty-analytics",
        icon: BarChart3,
        status: "warning" as NodeStatus,
        summary: `${fmt(totalCustomers)} مشترك · ${fmt(Math.round((totalIssued - totalRedeemed) / Math.max(1, totalCustomers)))} متوسط نقاط · استبدال ${fmt(redemptionRate)}% · كاش باك ${fmt(totalCashback)}`,
      },
      {
        id: "settings",
        label: "إعدادات",
        route: "/customers/settings",
        icon: Settings2,
        status: "active" as NodeStatus,
        summary: `مستويات: ${onOff(tiersEnabled)} · خصم تلقائي: ${onOff(autoDiscountEnabled)} · كاش باك: ${onOff(cashbackEnabled)}`,
      },
      {
        id: "segmentation",
        label: "مركز التقسيم",
        route: "/customers/segments",
        icon: Filter,
        status: leadCategories.length ? ("active" as NodeStatus) : ("inactive" as NodeStatus),
        summary: leadCategories.length
          ? `${leadCategories.length} تصنيف شرائح`
          : "لا توجد تصنيفات شرائح",
      },
      {
        id: "customerLists",
        label: "قوائم العملاء",
        route: "/customers/lists",
        icon: ListChecks,
        status: customLists.length ? ("active" as NodeStatus) : ("inactive" as NodeStatus),
        summary: customLists.length
          ? `${customLists.length} قائمة مخصصة`
          : "لا توجد قوائم مخصصة",
      },
      {
        id: "whatsappNotify",
        label: "إشعارات واتساب",
        route: "/customers/whatsapp-notify",
        icon: Megaphone,
        status: "active" as NodeStatus,
        summary: campaigns.length
          ? `${campaigns.length} حملة سابقة`
          : "أداة إرسال جماعي للعملاء",
      },
      {
        id: "occasions",
        label: "مناسبات العملاء",
        route: "/customers/occasions-notify",
        icon: Calendar,
        status: occasions.length ? ("active" as NodeStatus) : ("inactive" as NodeStatus),
        summary: occasions.length
          ? `${occasions.length} مناسبة (${occasions.filter((o: any) => String(o.status || "").toUpperCase() === "SCHEDULED").length} مجدولة · ${occasions.filter((o: any) => String(o.status || "").toUpperCase() === "SENT").length} مرسلة)`
          : "لا توجد مناسبات بعد",
      },
      {
        id: "birthdays",
        label: "عيد ميلاد العملاء",
        route: "/customers/birthday-whatsapp-notify",
        icon: Gift,
        status: birthdaySettings?.isEnabled === true
          ? ("active" as NodeStatus)
          : ("inactive" as NodeStatus),
        summary:
          birthdaySettings?.isEnabled === true
            ? `أتمتة يومياً ${birthdaySettings.dailySendTime || "12:00"}`
            : "أتمتة عيد الميلاد مقفولة",
      },
      {
        id: "customerNotifications",
        label: "إشعارات العملاء",
        route: "/customers/customer-notifications",
        icon: Bell,
        status: "active" as NodeStatus,
        summary: "قوالب إشعارات مخصصة للعملاء",
      },
    ];
  }, [data, filteredActivity]);

  const nodeById = useMemo(() => {
    const m: Record<string, MapNode> = {};
    nodes.forEach((n) => {
      m[n.id] = n;
    });
    return m;
  }, [nodes]);

  const nodeDetails = useMemo<Record<string, NodeDetail>>(() => {
    if (!data) return {};
    const d = data as any;
    const programs = d.programs || [];
    const journeys = d.journeys || [];
    const campaigns = d.campaigns || [];
    const occasions = d.occasions || [];
    const customerLists = d.customerLists || [];
    const leadCategories = d.leadCategories || [];
    const cc = d.customerCounts || {};
    const totalCustomers = programs.reduce((s: number, p: any) => s + Number(p.customersCount || 0), 0);
    const activePrograms = programs.filter((p: any) => p.status === "ACTIVE");
    const customLists = (customerLists || []).filter((l: any) => !l.isDefault);

    const latestOf = (arr: any[], key: string): string | null => {
      const withDate = arr
        .map((x) => x?.[key])
        .filter((x) => x)
        .sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime());
      return withDate[0] || null;
    };

    return {
      customers: {
        route: "/customers",
        count: `${fmt(cc.ACTIVE || 0)} نشط`,
        lastActivity: cc.LEAD ? `${fmt(cc.LEAD)} محتمل · ${fmt(cc.INACTIVE || 0)} غير نشط` : "غير محدد",
      },
      postPurchase: {
        route: "/whatsapp/customer-journey",
        count: `${journeys.length} رحلة`,
        lastActivity: fmtDate(latestOf(journeys, "nextSendAt")) || "غير محدد",
      },
      loyaltyPrograms: {
        route: "/customers/loyalty-programs",
        count: `${activePrograms.length} برنامج نشط`,
        lastActivity:
          programs.length && programs[programs.length - 1]?.createdAt
            ? fmtDate(programs[programs.length - 1].createdAt)
            : "غير محدد",
      },
      loyaltyMembers: {
        route: "/customers/loyalty-members",
        count: `${fmt(totalCustomers)} عضو`,
        lastActivity: "غير محدد",
      },
      pointsCenter: {
        route: "/customers/points-center",
        count: `${fmt(programs.reduce((s: number, p: any) => s + Number(p.totalPointsIssued || 0), 0))} نقطة مصدرة`,
        lastActivity: "غير محدد",
      },
      analytics: {
        route: "/customers/loyalty-analytics",
        count: `${fmt(totalCustomers)} مشترك`,
        lastActivity: "إجماليات تراكمية",
      },
      settings: {
        route: "/customers/settings",
        count: "تكوين النظام",
        lastActivity: "غير محدد",
      },
      segmentation: {
        route: "/customers/segments",
        count: `${leadCategories.length} تصنيف`,
        lastActivity: "غير محدد",
      },
      customerLists: {
        route: "/customers/lists",
        count: `${customLists.length} قائمة`,
        lastActivity:
          customLists.length && customLists[0]?.updatedAt
            ? fmtDate(customLists[0].updatedAt)
            : "غير محدد",
      },
      whatsappNotify: {
        route: "/customers/whatsapp-notify",
        count: `${campaigns.length} حملة`,
        lastActivity: fmtDate(latestOf(campaigns, "sentAt") || latestOf(campaigns, "createdAt")) || "غير محدد",
      },
      occasions: {
        route: "/customers/occasions-notify",
        count: `${occasions.length} مناسبة`,
        lastActivity:
          fmtDate(latestOf(occasions, "lastSentAt")) ||
          fmtDate(occasions.length ? occasions[0].scheduledAt : null) ||
          "غير محدد",
      },
      birthdays: {
        route: "/customers/birthday-whatsapp-notify",
        count: "أتمتة يومية",
        lastActivity:
          (d as any).birthdaySettings?.updatedAt
            ? fmtDate((d as any).birthdaySettings.updatedAt)
            : "غير محدد",
      },
      customerNotifications: {
        route: "/customers/customer-notifications",
        count: "قوالب إشعارات",
        lastActivity: "غير محدد",
      },
    };
  }, [data]);

  const timelineStages = useMemo<TimelineStage[]>(() => {
    if (!data) return [];
    const d = data as any;
    const programs = d.programs || [];
    const campaigns = d.campaigns || [];
    const occasions = d.occasions || [];
    const journeys = d.journeys || [];
    const upcoming = d.upcomingBirthdays || [];
    const totalIssued = programs.reduce((s: number, p: any) => s + Number(p.totalPointsIssued || 0), 0);
    const totalRedeemed = programs.reduce((s: number, p: any) => s + Number(p.totalPointsRedeemed || 0), 0);
    const totalCashback = Number(d.wallet?.totalCashback || 0);
    const oldestProgram = programs[programs.length - 1];
    const latestActivity = [
      ...campaigns.map((c: any) => c.sentAt || c.createdAt),
      ...occasions.map((o: any) => o.lastSentAt || o.scheduledAt),
      ...journeys.map((j: any) => j.lastSentAt || j.nextSendAt),
    ]
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime())[0];

    return [
      {
        id: "entry",
        label: "الاشتراك والطلب",
        icon: ShoppingBag,
        dateLabel: "أقدم عميل",
        date: fmtDate(d.oldestCustomerDate) || null,
        note: d.oldestCustomerDate
          ? `أحدث عميل: ${fmtDate(d.newestCustomerDate) || "غير محدد"}`
          : "لا توجد بيانات تاريخية للعملاء",
        events: [
          { label: "أقدم عميل", date: fmtDate(d.oldestCustomerDate) },
          { label: "أحدث عميل", date: fmtDate(d.newestCustomerDate) },
        ],
      },
      {
        id: "collect",
        label: "جمع النقاط والولاء",
        icon: Coins,
        dateLabel: "أول برنامج ولاء",
        date: oldestProgram?.createdAt ? fmtDate(oldestProgram.createdAt) : null,
        note: oldestProgram?.createdAt ? undefined : "لا توجد برامج ولاء بعد",
        events: [
          { label: "أول برنامج ولاء", date: oldestProgram?.createdAt ? fmtDate(oldestProgram.createdAt) : undefined },
          { label: `${fmt(totalIssued)} نقطة مصدرة` },
          { label: `${fmt(totalRedeemed)} نقطة مستبدلة` },
        ],
      },
      {
        id: "redeem",
        label: "الاستبدال والكاش باك",
        icon: Award,
        dateLabel: "آخر استبدال",
        date: null,
        note: "لا يوجد سجل استبدال بتواريخ في الداتا المتاحة",
        events: [
          { label: `إجمالي الكاش باك ${fmt(totalCashback)} ج.م` },
          { label: "لا يوجد سجل استبدال بتاريخ" },
        ],
      },
      {
        id: "reengage",
        label: "إعادة الاستهداف",
        icon: Target,
        dateLabel: "آخر نشاط إعادة استهداف",
        date: fmtDate(latestActivity) || null,
        note: latestActivity ? undefined : "لا توجد أنشطة إعادة استهداف مسجلة",
        events: [
          ...campaigns.slice(0, 5).map((c: any) => ({
            label: c.name || "حملة",
            date: fmtDate(c.sentAt || c.createdAt),
          })),
          ...occasions.slice(0, 3).map((o: any) => ({
            label: `مناسبة: ${o.name || ""}`,
            date: fmtDate(o.scheduledAt),
          })),
          ...upcoming.slice(0, 3).map((b: any) => ({
            label: `عيد ميلاد: ${b.name || ""}`,
            date: b.formattedNextDate,
          })),
        ],
      },
    ];
  }, [data]);

  const measureEdges = useCallback(() => {
    const container = mapRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const drawn: DrawnEdge[] = [];
    for (const def of EDGES) {
      const a = nodeRefs.current[def.from];
      const b = nodeRefs.current[def.to];
      if (!a || !b) continue;
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const x1 = ar.left + ar.width / 2 - rect.left;
      const y1 = ar.top + ar.height / 2 - rect.top;
      const x2 = br.left + br.width / 2 - rect.left;
      const y2 = br.top + br.height / 2 - rect.top;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.max(1, Math.hypot(dx, dy));
      const ux = dx / len;
      const uy = dy / len;
      const trim = 30;
      const tx = x2 - ux * trim;
      const ty = y2 - uy * trim;
      const c1x = x1 + dx * 0.35;
      const c2x = x2 - dx * 0.35;
      const color = def.loop ? "#f59e0b" : "#94a3b8";
      const marker = def.loop
        ? "url(#loyalty-map-arrow-amber)"
        : "url(#loyalty-map-arrow-slate)";
      drawn.push({
        id: `${def.from}--${def.to}`,
        d: `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${tx} ${ty}`,
        color,
        marker,
        label: def.label,
        lx: (x1 + tx) / 2,
        ly: (y1 + ty) / 2,
        loop: def.loop,
      });
    }
    setEdges(drawn);
  }, []);

  useLayoutEffect(() => {
    measureEdges();
    const container = mapRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => measureEdges());
    ro.observe(container);
    window.addEventListener("resize", measureEdges);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measureEdges);
    };
  }, [measureEdges]);

  useEffect(() => {
    const t = window.setTimeout(() => measureEdges(), 0);
    return () => window.clearTimeout(t);
  }, [nodes, measureEdges]);

  const routing = useMemo<RoutingInfo>(
    () => resolveRouting((data as any)?.["sessions"] || []),
    [data],
  );

  const birthdaySource = useMemo<RoutingInfo>(() => {
    const channel = (data as any)?.birthdaySettings?.channel;
    if (channel === "meta_api") {
      return { key: "meta", label: "Meta Cloud API", desc: "قناة عيد الميلاد" };
    }
    if (channel === "whatsapp_session") {
      return {
        key: "wa",
        label: "واتساب عادي (Baileys)",
        desc: "قناة عيد الميلاد",
      };
    }
    return routing;
  }, [data, routing]);

  const reEngagementLines = useMemo<ReEngagementLine[]>(() => {
    if (!data) return [];
    const {
      occasions = [],
      birthdaySettings = null,
      enabledFlows = [],
      firstEnabledFlowSteps = [],
      programs = [],
      journeys = [],
      reSettings = null,
      counts = {},
    } = data as any;

    const loops = reSettings?.loops || {};
    const nextOccasion = occasions[0] || null;
    const defaultRoute = routing;
    const activeJourneys = journeys.filter(
      (j: any) => String(j.status || "").toUpperCase() === "ACTIVE",
    );
    const hasSentOccasion = occasions.some(
      (o: any) => String(o.status || "").toUpperCase() === "SENT",
    );
    const hasScheduledOccasion = occasions.some(
      (o: any) => String(o.status || "").toUpperCase() === "SCHEDULED",
    );

    const firstStep = firstEnabledFlowSteps.find(
      (s: any) => s && typeof s.content === "string" && s.content.trim(),
    );

    return [
      {
        id: "occasion",
        trigger: "العميل ليه مناسبة قريبة (حسب تقويم المناسبات)",
        tool: "مناسبات العملاء",
        route: "/customers/occasions-notify",
        message: nextOccasion?.message
          ? firstLine(nextOccasion.message)
          : "لا يوجد قالب محفوظ للمناسبات",
        source: defaultRoute,
        status: hasSentOccasion
          ? ("sent" as const)
          : hasScheduledOccasion || occasions.length
            ? ("scheduled" as const)
            : ("inactive" as const),
        count: counts.occasion ?? null,
        enabled: loops.occasion === true,
        settingsKey: "occasion" as const,
      },
      {
        id: "birthday",
        trigger: "قرب عيد ميلاد العميل (أتمتة يومية)",
        tool: "عيد ميلاد العملاء",
        route: "/customers/birthday-whatsapp-notify",
        message: birthdaySettings?.messageTemplate
          ? firstLine(birthdaySettings.messageTemplate)
          : "لا يوجد قالب محفوظ لعيد الميلاد",
        source: birthdaySource,
        status: birthdaySettings?.isEnabled === true
          ? ("scheduled" as const)
          : ("inactive" as const),
        count: counts.birthday ?? null,
        enabled: birthdaySettings?.isEnabled === true,
      },
      {
        id: "postPurchase",
        trigger: "عدّى فترة من غير شراء (العميل سكت)",
        tool: "سلاسل ما بعد الاستلام",
        route: "/whatsapp/customer-journey",
        message: firstStep
          ? firstLine(firstStep.content)
          : enabledFlows.length
            ? "لا يوجد محتوى مسجّل في خطوات السلسلة"
            : "لا توجد سلاسل مفعّلة",
        source: defaultRoute,
        status: enabledFlows.length || activeJourneys.length
          ? ("scheduled" as const)
          : ("inactive" as const),
        count: counts.inactive ?? null,
        enabled: loops.inactive === true,
        settingsKey: "inactive" as const,
      },
      {
        id: "points",
        trigger: "العميل عنده نقاط تكفّي مكافأة",
        tool: "برامج الولاء / مركز نقاط العملاء",
        route: "/customers/points-center",
        message:
          "رسالة المكافأة تُدار من قوالب برامج الولاء وإشعارات العملاء",
        source: defaultRoute,
        status: programs.some((p: any) => p.status === "ACTIVE")
          ? ("scheduled" as const)
          : ("inactive" as const),
        count: counts.points ?? null,
        enabled: loops.points === true,
        settingsKey: "points" as const,
      },
    ];
  }, [data, routing, birthdaySource]);

  const sourceBadge = (r: RoutingInfo) => {
    const base =
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold";
    if (r.key === "meta") {
      return (
        <span
          className={`${base} bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300`}
          title={normalizeDigits(r.desc)}
        >
          <Cloud className="h-3 w-3" />
          Meta Cloud API
        </span>
      );
    }
    if (r.key === "wa") {
      return (
        <span
          className={`${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300`}
          title={normalizeDigits(r.desc)}
        >
          <Smartphone className="h-3 w-3" />
          واتساب عادي
        </span>
      );
    }
    return (
      <span
        className={`${base} bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300`}
        title={normalizeDigits(r.desc)}
      >
        <HelpCircle className="h-3 w-3" />
        غير محدد
      </span>
    );
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      scheduled: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300",
      sent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
      failed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
      inactive: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300",
      unknown: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    };
    const icons: Record<string, React.ReactNode> = {
      scheduled: <Clock className="h-3 w-3" />,
      sent: <CheckCircle2 className="h-3 w-3" />,
      failed: <AlertTriangle className="h-3 w-3" />,
      inactive: <HelpCircle className="h-3 w-3" />,
      unknown: <HelpCircle className="h-3 w-3" />,
    };
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[s] || map["unknown"]}`}
      >
        {icons[s] || icons["unknown"]}
        {s === "scheduled" ? "مجدولة" : s === "sent" ? "اتبعتت" : s === "failed" ? "فشلت" : s === "inactive" ? "غير مفعّلة" : "غير محدد"}
      </span>
    );
  };

  const saveLoopToggle = useCallback(
    async (id: string, enabled: boolean) => {
      setSavingToggle(true);
      try {
        if (id === "birthday") {
          const bd = (data as any)?.birthdaySettings || {};
          await apiClient.post("/customers/whatsapp-notify/birthday-automation/settings", {
            isEnabled: enabled,
            dailySendTime: bd.dailySendTime || "12:00",
            channel: bd.channel || "whatsapp_session",
            messageTemplate: bd.messageTemplate || "",
            couponCode: bd.couponCode || "",
            metaTemplateName: bd.metaTemplateName || "birthday_greeting_v1",
          });
        } else {
          const line = reEngagementLines.find((l) => l.id === id);
          if (!line?.settingsKey) return;
          await apiClient.put("/hr/customer-loyalty/re-engagement/settings", {
            loops: { [line.settingsKey]: enabled },
          });
        }
        toast.success(enabled ? "تم تفعيل الحلقة بنجاح" : "تم إيقاف الحلقة");
        setPendingToggle(null);
        await load();
      } catch (e) {
        console.error("Error toggling loop:", e);
        toast.error("فشل حفظ الإعدادات");
      } finally {
        setSavingToggle(false);
      }
    },
    [data, reEngagementLines, load],
  );

  const handleToggle = (line: ReEngagementLine) => {
    if (line.enabled) {
      void saveLoopToggle(line.id, false);
    } else {
      setPendingToggle(line);
    }
  };

  const saveThreshold = useCallback(async () => {
    const days = Math.max(1, Math.min(365, thresholdDraft || 30));
    try {
      await apiClient.put("/hr/customer-loyalty/re-engagement/settings", {
        inactiveDays: days,
      });
      toast.success(`تم حفظ حد السكوت: ${days} يوم`);
      await load();
    } catch (e) {
      console.error("Error saving threshold:", e);
      toast.error("فشل حفظ حد السكوت");
    }
  }, [thresholdDraft, load]);

  const viewCustomers = useCallback(async (id: string) => {
    if (id === "occasion") {
      navigate("/customers/occasions-notify");
      return;
    }
    const titles: Record<string, string> = {
      birthday: "عملاء عيد الميلاد القادم (30 يوم)",
      postPurchase: `عملاء ساكتين (${(data as any)?.reSettings?.inactiveDays || 30} يوم بلا شراء)`,
      points: "أعضاء ولاء برصيد نقاط",
    };
    setCustomerList({ id, title: titles[id] || "العملاء", loading: true, rows: [] });
    try {
      let rows: CustomerRow[] = [];
      if (id === "birthday") {
        const res = await apiClient.get("/customers/whatsapp-notify/birthday-automation/upcoming?days=30");
        rows = ((res.data as any)?.data || []).map((c: any) => ({
          name: c.name || "—",
          phone: c.phone || "",
          extra: c.formattedNextDate || "",
        }));
      } else if (id === "postPurchase") {
        const days = (data as any)?.reSettings?.inactiveDays || 30;
        const res = await apiClient.get(
          `/hr/customer-loyalty/re-engagement/customers?type=inactive&inactiveDays=${days}&limit=50`,
        );
        rows = ((res.data as any)?.data || []).map((c: any) => ({
          name: c.name || "—",
          phone: c.phone || "",
          extra: c.extra || "",
        }));
      } else if (id === "points") {
        const res = await apiClient.get(
          "/hr/customer-loyalty/re-engagement/customers?type=points&limit=50",
        );
        rows = ((res.data as any)?.data || []).map((c: any) => ({
          name: c.name || "—",
          phone: c.phone || "",
          extra: c.extra || "",
        }));
      }
      setCustomerList({ id, title: titles[id] || "العملاء", loading: false, rows });
    } catch (e) {
      console.error("Error loading customers:", e);
      setCustomerList((prev) => (prev ? { ...prev, loading: false, rows: [] } : prev));
      toast.error("فشل جلب العملاء");
    }
  }, [navigate, data]);

  const runBackfill = useCallback(async () => {
    setBackfillBusy(true);
    try {
      const res = await apiClient.post("/hr/customer-loyalty/vouchers/backfill");
      toast.success((res.data as any)?.message || "تم إصدار الكوبونات الناقصة");
      setBackfillConfirm(false);
      await load();
    } catch (e) {
      console.error("Error backfilling vouchers:", e);
      toast.error("فشل إصدار الكوبونات");
    } finally {
      setBackfillBusy(false);
    }
  }, [load]);

  const openChannelDialog = () => {
    setChannelDraft((data as any)?.birthdaySettings?.channel || "whatsapp_session");
    setChannelDialog(true);
  };

  const saveChannel = useCallback(async () => {
    const bd = (data as any)?.birthdaySettings || {};
    try {
      await apiClient.post("/customers/whatsapp-notify/birthday-automation/settings", {
        isEnabled: bd.isEnabled !== false,
        dailySendTime: bd.dailySendTime || "12:00",
        channel: channelDraft,
        messageTemplate: bd.messageTemplate || "",
        couponCode: bd.couponCode || "",
        metaTemplateName: bd.metaTemplateName || "birthday_greeting_v1",
      });
      toast.success("تم تحديث قناة عيد الميلاد");
      setChannelDialog(false);
      await load();
    } catch (e) {
      console.error("Error saving channel:", e);
      toast.error("فشل تحديث القناة");
    }
  }, [data, channelDraft, load]);

  const exportCsv = useCallback(() => {
    const d = (data as any) || {};
    const programs = d.programs || [];
    const totalCustomers = programs.reduce((s: number, p: any) => s + Number(p.customersCount || 0), 0);
    const totalIssued = programs.reduce((s: number, p: any) => s + Number(p.totalPointsIssued || 0), 0);
    const totalRedeemed = programs.reduce((s: number, p: any) => s + Number(p.totalPointsRedeemed || 0), 0);
    const totalCashback = Number(d.wallet?.totalCashback || 0);
    const avgPoints = totalCustomers > 0 ? Math.round((totalIssued - totalRedeemed) / totalCustomers) : 0;
    const redemptionRate = totalIssued > 0 ? Math.round((totalRedeemed / totalIssued) * 100) : 0;
    const statusText = (s: string) =>
      s === "scheduled" ? "مجدولة" : s === "sent" ? "اتبعتت" : s === "failed" ? "فشلت" : s === "inactive" ? "غير مفعّلة" : "غير محدد";

    const lines: string[][] = [];
    lines.push(["العنصر", "القيمة"]);
    lines.push(["العملاء المشتركين", fmt(totalCustomers)]);
    lines.push(["متوسط النقاط للعميل", fmt(avgPoints)]);
    lines.push(["نسبة الاستبدال", `${redemptionRate}%`]);
    lines.push(["إجمالي الكاش باك", `${fmt(totalCashback)} ج.م`]);
    lines.push(["", ""]);
    lines.push(["أداة", "الحالة", "ملخص"]);
    nodes.forEach((n) => lines.push([n.label, STATUS_META[n.status].label, n.summary]));
    lines.push(["", ""]);
    lines.push(["حلقة إعادة استهداف", "المستهدفون", "الحالة"]);
    reEngagementLines.forEach((l) =>
      lines.push([
        l.trigger,
        l.count === null ? "غير محدد" : String(l.count),
        statusText(l.status),
      ]),
    );
    const csv = lines
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "loyalty-system-map.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, reEngagementLines, data]);

  const exportSvg = useCallback(() => {
    const container = mapRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const W = Math.max(container.scrollWidth, Math.ceil(rect.width));
    const H = Math.max(container.scrollHeight, Math.ceil(rect.height));
    const esc = (s: string) =>
      String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const borderColor: Record<NodeStatus, string> = {
      active: "#10b981",
      inactive: "#cbd5e1",
      warning: "#f59e0b",
      unknown: "#93c5fd",
    };

    const parts: string[] = [];
    parts.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Tahoma,Arial,sans-serif"><defs><marker id="arS" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 z" fill="#94a3b8"/></marker><marker id="arA" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 z" fill="#f59e0b"/></marker></defs><rect width="100%" height="100%" fill="#ffffff"/>`,
    );
    for (const e of edges) {
      parts.push(
        `<path d="${e.d}" fill="none" stroke="${e.color}" stroke-width="1.5"${
          e.loop ? ' stroke-dasharray="5 4"' : ""
        } opacity="0.65" marker-end="${e.loop ? "url(#arA)" : "url(#arS)"}"/>`,
      );
      parts.push(
        `<text x="${e.lx}" y="${e.ly - 4}" text-anchor="middle" font-size="10" fill="#64748b">${esc(e.label)}</text>`,
      );
    }
    const ids = Object.keys(nodeById);
    for (const id of ids) {
      const el = nodeRefs.current[id];
      const n = nodeById[id];
      if (!el || !n) continue;
      const r = el.getBoundingClientRect();
      const x = r.left - rect.left;
      const y = r.top - rect.top;
      const w = r.width;
      const h = r.height;
      parts.push(
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#ffffff" stroke="${borderColor[n.status]}" stroke-width="2"/>`,
      );
      parts.push(
        `<text x="${x + w / 2}" y="${y + 24}" text-anchor="middle" font-size="13" font-weight="bold" fill="#111827">${esc(n.label)}</text>`,
      );
      const summary = n.summary.length > 48 ? n.summary.slice(0, 48) + "…" : n.summary;
      parts.push(
        `<text x="${x + w / 2}" y="${y + 42}" text-anchor="middle" font-size="9" fill="#6b7280">${esc(summary)}</text>`,
      );
    }
    parts.push("</svg>");

    const blob = new Blob([parts.join("")], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "loyalty-system-map.svg";
    a.click();
    URL.revokeObjectURL(url);
    setSvgBusy(false);
  }, [edges, nodeById]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <p className="text-sm">جاري تحميل خريطة نظام الولاء...</p>
        </div>
      </div>
    );
  }

  if (loadFailed || !data) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-amber-500" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          تعذر تحميل بيانات النظام
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          حدث خطأ أثناء جلب بيانات الخريطة. أعد المحاولة.
        </p>
        <button
          onClick={load}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
        >
          <RefreshCw className="h-4 w-4" />
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const {
    programs = [],
    wallet = null,
    systemAnalytics = null,
  } = data as any;

  const totalCustomers = programs.reduce(
    (s: number, p: any) => s + Number(p.customersCount || 0),
    0,
  );
  const totalIssued = programs.reduce(
    (s: number, p: any) => s + Number(p.totalPointsIssued || 0),
    0,
  );
  const totalRedeemed = programs.reduce(
    (s: number, p: any) => s + Number(p.totalPointsRedeemed || 0),
    0,
  );
  const totalCashback = Number(wallet?.totalCashback || 0);
  const avgPoints =
    totalCustomers > 0 ? Math.round((totalIssued - totalRedeemed) / totalCustomers) : 0;
  const redemptionRate =
    totalIssued > 0 ? Math.round((totalRedeemed / totalIssued) * 100) : 0;
  const isAutoDiscount = systemAnalytics?.system === "AUTO_DISCOUNT";
  const cashbackConflict =
    totalCashback > 0 && totalRedeemed === 0 && redemptionRate === 0;

  const routingTools = [
    {
      tool: "إشعارات واتساب",
      route: "/customers/whatsapp-notify",
      source: routing,
    },
    {
      tool: "مناسبات العملاء",
      route: "/customers/occasions-notify",
      source: routing,
    },
    {
      tool: "عيد ميلاد العملاء",
      route: "/customers/birthday-whatsapp-notify",
      source: birthdaySource,
      editable: true,
    },
    {
      tool: "سلاسل ما بعد الاستلام",
      route: "/whatsapp/customer-journey",
      source: routing,
    },
    {
      tool: "إشعارات العملاء",
      route: "/customers/customer-notifications",
      source: routing,
    },
  ];

  const kpiCards = [
    {
      label: "العملاء المشتركين",
      value: fmt(totalCustomers),
      icon: Users,
      tone: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
    },
    {
      label: "متوسط النقاط للعميل",
      value: fmt(avgPoints),
      icon: Coins,
      tone: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400",
    },
    {
      label: "نسبة الاستبدال",
      value: `${redemptionRate}%`,
      icon: TrendingUp,
      tone: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
    },
    {
      label: "إجمالي الكاش باك",
      value: `${fmt(totalCashback)} ج.م`,
      icon: Award,
      tone: "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            خريطة نظام الولاء + إعادة الاستهداف
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            خريطة أدوات قسم العملاء، تدفقها الزمني، توجيه الرسائل، وحلقات إعادة الاستهداف
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-gray-400" title={lastUpdated}>
              آخر تحديث {lastUpdated}
            </span>
          )}
          <div
            className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-0.5 dark:border-gray-600 dark:bg-gray-800"
            title={!hasTemporalData ? "لا توجد بيانات تاريخية بعد" : undefined}
          >
            {(
              [
                ["all", "كل الفترات"],
                ["30d", "30 يوم"],
                ["7d", "7 أيام"],
                ["today", "اليوم"],
              ] as [DateRangeKey, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setDateRange(key)}
                disabled={!hasTemporalData}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  dateRange === key
                    ? "bg-fuchsia-600 text-white"
                    : "text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={() => {
              setSvgBusy(true);
              setTimeout(exportSvg, 0);
            }}
            disabled={svgBusy}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <FileImage className="h-4 w-4" />
            SVG
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            تحديث
          </button>
        </div>
      </div>

      {!hasTemporalData ? (
        <p className="flex items-center gap-1.5 text-xs text-gray-400">
          <Info className="h-3.5 w-3.5" />
          لا توجد بيانات تاريخية بعد — الفلتر الزمني بيتفعل لما تبقى فيه حملات/مناسبات/رحلات/برامج مسجلة.
        </p>
      ) : dateRange !== "all" ? (
        <p className="flex items-center gap-1.5 text-xs text-gray-400">
          <Info className="h-3.5 w-3.5" />
          الفلتر بينطبق على الأنشطة التاريخية (الحملات/المناسبات/الرحلات) في الخريطة —
          إجماليات الولاء (المشتركين/النقاط/الكاش باك) تراكمية وملها بُعد تاريخي في
          بيانات التحليلات.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <div
              className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${k.tone}`}
            >
              <k.icon className="h-5 w-5" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{k.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {cashbackConflict && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="text-sm">
            <p className="font-bold text-amber-800 dark:text-amber-200">
              تناقض مؤكد في بيانات الكاش باك
            </p>
            <p className="mt-1 text-amber-700 dark:text-amber-300">
              إجمالي الكاش باك {fmt(totalCashback)} ج.م، لكن صفحة «أداء البرامج التفصيلي»
              تعرض 0 (0 مشترك / 0 نقطة / 0 تحويل كاش باك). عُرض على عقدة «تحليلات الولاء»
              بحالة متضاربة لحين مراجعة المصدرين.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              خريطة الأدوات
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              كل عقدة بحجم متساوٍ — اللون يعبر عن الحالة فقط. الأسهم تمثل التدفق الزمني.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-gray-500">
              <span className="inline-block h-0.5 w-6 rounded bg-slate-400" />
              تدفق زمني
            </span>
            <span className="flex items-center gap-1.5 text-gray-500">
              <span className="inline-block h-0.5 w-6 rounded bg-amber-400" />
              حلقة إعادة استهداف
            </span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div ref={mapRef} className="relative min-w-[960px]">
            <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full">
              <defs>
                <marker
                  id="loyalty-map-arrow-slate"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L7,3 L0,6 z" fill="#94a3b8" />
                </marker>
                <marker
                  id="loyalty-map-arrow-amber"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L7,3 L0,6 z" fill="#f59e0b" />
                </marker>
              </defs>
              {edges.map((e) => (
                <g key={e.id}>
                  <path
                    d={e.d}
                    fill="none"
                    stroke={e.color}
                    strokeWidth="1.5"
                    strokeDasharray={e.loop ? "5 4" : undefined}
                    opacity="0.65"
                    markerEnd={e.marker}
                  />
                  <text
                    x={e.lx}
                    y={e.ly}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#94a3b8"
                  >
                    {e.label}
                  </text>
                </g>
              ))}
            </svg>
            <div className="relative z-10 grid grid-cols-4 gap-x-5">
              {STAGES.map((stage) => {
              const tl = timelineStages.find((t) => t.id === stage.id);
              return (
                <div key={stage.id} className="space-y-3">
                  <div className="rounded-lg border border-dashed border-gray-300 px-2 py-1.5 dark:border-gray-600">
                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                      <stage.icon className="h-3.5 w-3.5" />
                      {stage.label}
                    </div>
                    {tl && (
                      <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                        <span className="truncate">
                          {tl.date ? `${tl.dateLabel}: ${tl.date}` : tl.note || "غير محدد"}
                        </span>
                        <button
                          onClick={() => setTimelineLog(tl)}
                          title="سجل الأحداث"
                          className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                        >
                          <History className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  {stage.nodeIds.map((id) => {
                    const node = nodeById[id];
                    if (!node) return null;
                    const sm = STATUS_META[node.status];
                    return (
                      <div
                        key={node.id}
                        ref={(el) => {
                          nodeRefs.current[node.id] = el;
                        }}
                        className={`h-[132px] cursor-pointer rounded-xl border-2 ${sm.border} bg-white p-3 transition-shadow hover:shadow-md dark:bg-gray-800`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedNode(node)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedNode(node);
                          }
                        }}
                      >
                        <div className="flex h-full flex-col">
                          <div className="flex items-center justify-between">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-lg ${sm.iconBg}`}
                            >
                              <node.icon className={`h-4 w-4 ${sm.iconFg}`} />
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${sm.badge}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${sm.dot}`} />
                              {sm.label}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-bold leading-tight text-gray-900 dark:text-gray-100">
                            {node.label}
                          </p>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-tight text-gray-500 dark:text-gray-400">
                            {node.summary}
                          </p>
                          {node.chips && node.chips.length > 0 ? (
                            <div className="mt-auto flex flex-wrap gap-1">
                              {node.chips.map((c) => (
                                <span
                                  key={c}
                                  className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/40">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
            دليل الحالات:
          </span>
          {(["active", "inactive", "warning", "unknown"] as NodeStatus[]).map((s) => (
            <span
              key={s}
              className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[s].dot}`} />
              {STATUS_META[s].label}
            </span>
          ))}
          <span className="ms-auto flex items-center gap-1.5 text-xs text-gray-400">
            <Info className="h-3.5 w-3.5" />
            كل عقدة = أداة واحدة في قسم العملاء
          </span>
        </div>
      </div>

      {isAutoDiscount && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-800 dark:bg-amber-900/10">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <BadgePercent className="h-5 w-5 text-amber-500" />
            نظام الخصم التلقائي (كوبونات بعد البيع)
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {[
              {
                label: "عملاء عندهم كوبون",
                value: systemAnalytics.appliedCustomers ?? 0,
              },
              {
                label: "كوبونات متاحة",
                value: systemAnalytics.activeVouchers ?? 0,
              },
              {
                label: "كوبونات مستخدمة",
                value: systemAnalytics.usedVouchers ?? 0,
              },
              {
                label: "كوبونات منتهية",
                value: systemAnalytics.expiredVouchers ?? 0,
              },
              {
                label: "أوردرات مستنية كوبون",
                value: systemAnalytics.waitingForDelivery ?? 0,
              },
              {
                label: "إجمالي الأوردرات المسلّمة",
                value: systemAnalytics.totalDeliveredOrders ?? 0,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-amber-200 bg-white p-3 dark:border-amber-800 dark:bg-gray-800/60"
              >
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {fmt(item.value)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                {item.label === "أوردرات مستنية كوبون" && (
                  <button
                    onClick={() => navigate("/customers/auto-discount")}
                    className="mt-2 inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <Eye className="h-3 w-3" />
                    مراجعة
                  </button>
                )}
              </div>
            ))}
          </div>
          {Number(systemAnalytics.preActivationCustomers || 0) > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-100/40 p-3 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="flex flex-1 items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                {fmt(systemAnalytics.preActivationCustomers)} عميل عندهم أوردرات اتسلمت قبل
                تفعيل النظام — مش بياخدوا كوبون خصم تلقائي.
              </p>
              <button
                onClick={() => setBackfillConfirm(true)}
                disabled={backfillBusy}
                className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {backfillBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                إصدار الكوبونات الناقصة
              </button>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">
          توجيه الرسائل (WhatsApp Routing)
        </h3>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          المصدر الحالي للإرسال مأخوذ من جلسات واتساب المتصلة — أي قيمة غير مؤكدة تُعرض
          «غير محدد» ولا تُخمَّن.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              routing.key === "meta"
                ? "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400"
                : routing.key === "wa"
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            }`}
          >
            {routing.key === "meta" ? (
              <Cloud className="h-5 w-5" />
            ) : routing.key === "wa" ? (
              <Smartphone className="h-5 w-5" />
            ) : (
              <HelpCircle className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              المصدر الافتراضي للإرسال: {routing.label}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400" dir="ltr">
              {normalizeDigits(routing.desc) || "لا توجد بيانات"}
            </p>
          </div>
          {routing.key === "unknown" && (
            <span className="ms-auto rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              تحتاج ربط جلسة واتساب من الإعدادات
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-right text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="py-2 pe-4 font-semibold">الأداة</th>
                <th className="py-2 pe-4 font-semibold">المصدر</th>
              </tr>
            </thead>
            <tbody>
              {routingTools.map((row) => (
                <tr
                  key={row.route}
                  className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                >
                  <td className="py-2.5 pe-4">
                    <Link
                      to={row.route}
                      className="font-medium text-gray-800 hover:text-purple-600 dark:text-gray-200"
                    >
                      {row.tool}
                    </Link>
                  </td>
                  <td className="py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {sourceBadge(row.source)}
                      {(row as any).editable && (
                        <button
                          onClick={openChannelDialog}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-0.5 text-[10px] font-semibold text-gray-500 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          <ExternalLink className="h-3 w-3" />
                          تعديل
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
          <Info className="h-3.5 w-3.5" />
          المصدر الافتراضي بيتحدد من جلسة الواتساب المتصلة — عدّله من
          <Link to="/whatsapp/settings" className="ms-1 font-medium text-purple-600 hover:underline dark:text-purple-400">
            إعدادات واتساب
          </Link>
          . قناة عيد الميلاد لها إعداد خاص قابل للتعديل من هنا.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-1 flex items-center gap-2">
          <Target className="h-5 w-5 text-fuchsia-500" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            أداة إعادة الاستهداف (Re-engagement)
          </h3>
        </div>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          العميل اشترى ← النظام يحدد إنه محتاج إعادة استهداف ← تُرسل رسالة إعادة شراء من
          الأداة المناسبة في قسم العملاء.
        </p>

        <div className="space-y-3">
          {reEngagementLines.map((line) => (
            <div
              key={line.id}
              className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Send className="h-4 w-4 text-fuchsia-500" />
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {line.trigger}
                </p>
                <span className="ms-auto">{statusBadge(line.status)}</span>
                <Switch
                  checked={line.enabled}
                  disabled={savingToggle}
                  onCheckedChange={() => handleToggle(line)}
                  aria-label={`تفعيل حلقة ${line.tool}`}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/40">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    العملاء المطابقين:
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {line.count === null ? "غير محدد" : fmt(line.count)}
                  </span>
                </div>
                {line.id === "postPurchase" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      حد السكوت (يوم):
                    </span>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={thresholdDraft}
                      onChange={(e) =>
                        setThresholdDraft(Math.max(1, Math.min(365, Number(e.target.value) || 30)))
                      }
                      className="h-7 w-20 px-2 text-xs"
                    />
                    <button
                      onClick={saveThreshold}
                      className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      حفظ
                    </button>
                  </div>
                )}
                <button
                  onClick={() => viewCustomers(line.id)}
                  className="ms-auto inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Eye className="h-3 w-3" />
                  شوف العملاء
                </button>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-gray-400">
                    الأداة
                  </p>
                  <Link
                    to={line.route}
                    className="mt-1 inline-block text-sm font-medium text-purple-600 hover:underline dark:text-purple-400"
                  >
                    {line.tool}
                  </Link>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-gray-400">
                    الرسالة (قالب)
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                    {line.message}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-gray-400">
                    بتتبعت منين
                  </p>
                  <div className="mt-1">{sourceBadge(line.source)}</div>
                  <p className="mt-1 text-[10px] text-gray-400" dir="ltr">
                    {normalizeDigits(line.source.desc)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!pendingToggle} onOpenChange={(o) => !o && setPendingToggle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تفعيل حلقة إعادة استهداف</DialogTitle>
            <DialogDescription>
              مراجعة الرسالة وعدد المستهدفين قبل تفعيل الحلقة.
            </DialogDescription>
          </DialogHeader>
          {pendingToggle && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
                <p className="text-[10px] font-semibold uppercase text-gray-400">
                  الشرط
                </p>
                <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                  {pendingToggle.trigger}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
                <p className="text-[10px] font-semibold uppercase text-gray-400">
                  الرسالة (قالب)
                </p>
                <p className="mt-1 text-gray-700 dark:text-gray-300">
                  {pendingToggle.message}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
                <p className="text-[10px] font-semibold uppercase text-gray-400">
                  المستهدفون دلوقتي
                </p>
                <p className="mt-1 font-bold text-gray-900 dark:text-gray-100">
                  {pendingToggle.count === null ? "غير محدد" : fmt(pendingToggle.count)}
                </p>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                التفعيل بيخلّي الحلقة «مجدولة» — الرسالة هتتبعت من أداة {pendingToggle.tool}.
              </p>
            </div>
          )}
          <DialogFooter>
            <button
              onClick={() => setPendingToggle(null)}
              disabled={savingToggle}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              إلغاء
            </button>
            <button
              onClick={() => pendingToggle && void saveLoopToggle(pendingToggle.id, true)}
              disabled={savingToggle}
              className="inline-flex items-center gap-1 rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-50"
            >
              {savingToggle && <Loader2 className="h-4 w-4 animate-spin" />}
              تفعيل
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!customerList} onOpenChange={(o) => !o && setCustomerList(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{customerList?.title || "العملاء"}</DialogTitle>
            <DialogDescription>
              {customerList?.loading
                ? "جاري جلب العملاء..."
                : `${fmt(customerList?.rows.length || 0)} عميل معروض من القائمة المطابقة`}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto">
            {customerList?.loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              </div>
            ) : customerList?.rows.length ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {customerList.rows.map((row, i) => (
                  <div key={`${row.name}-${i}`} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{row.name}</p>
                      <p className="text-xs text-gray-400" dir="ltr">{row.phone}</p>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{row.extra}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">لا يوجد عملاء مطابقين حالياً</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={backfillConfirm} onOpenChange={(o) => !o && setBackfillConfirm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إصدار الكوبونات الناقصة</DialogTitle>
            <DialogDescription>
              هتتعمل معالجة Backfill: إصدار كوبون خصم تلقائي للأوردرات المسلّمة اللي اتسلمت قبل
              تفعيل النظام ومأخدتش كوبون ({fmt(systemAnalytics?.preActivationCustomers ?? 0)} عميل).
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            هذه عملية فعلية على بيانات الشركة — تأكد قبل التنفيذ.
          </div>
          <DialogFooter>
            <button
              onClick={() => setBackfillConfirm(false)}
              disabled={backfillBusy}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              إلغاء
            </button>
            <button
              onClick={() => void runBackfill()}
              disabled={backfillBusy}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {backfillBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              {backfillBusy ? "جاري الإصدار..." : "نعم، أصدر الكوبونات"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={channelDialog} onOpenChange={(o) => !o && setChannelDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>قناة عيد ميلاد العملاء</DialogTitle>
            <DialogDescription>
              حدد مصدر إرسال رسائل عيد الميلاد التلقائية.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "whatsapp_session", label: "واتساب عادي (Baileys)", icon: Smartphone },
              { value: "meta_api", label: "Meta Cloud API", icon: Cloud },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setChannelDraft(opt.value)}
                className={`flex items-center gap-2 rounded-lg border-2 p-3 text-sm font-medium ${
                  channelDraft === opt.value
                    ? "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/20 dark:text-fuchsia-300"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                <opt.icon className="h-4 w-4" />
                {opt.label}
              </button>
            ))}
          </div>
          <DialogFooter>
            <button
              onClick={() => setChannelDialog(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              إلغاء
            </button>
            <button
              onClick={() => void saveChannel()}
              className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700"
            >
              حفظ القناة
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selectedNode} onOpenChange={(o) => !o && setSelectedNode(null)}>
        <SheetContent side="right">
          {selectedNode && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${STATUS_META[selectedNode.status].iconBg}`}
                  >
                    <selectedNode.icon className={`h-4 w-4 ${STATUS_META[selectedNode.status].iconFg}`} />
                  </span>
                  {selectedNode.label}
                </SheetTitle>
                <SheetDescription>{selectedNode.summary}</SheetDescription>
              </SheetHeader>

              <div className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_META[selectedNode.status].badge}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[selectedNode.status].dot}`} />
                    {STATUS_META[selectedNode.status].label}
                  </span>
                </div>

                {nodeDetails[selectedNode.id] && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
                      <p className="text-[10px] font-semibold uppercase text-gray-400">
                        العملاء / الحجم
                      </p>
                      <p className="mt-1 text-sm font-bold text-gray-900 dark:text-gray-100">
                        {nodeDetails[selectedNode.id].count}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
                      <p className="text-[10px] font-semibold uppercase text-gray-400">
                        آخر نشاط
                      </p>
                      <p className="mt-1 text-sm font-bold text-gray-900 dark:text-gray-100">
                        {nodeDetails[selectedNode.id].lastActivity}
                      </p>
                    </div>
                  </div>
                )}

                {selectedNode.chips && selectedNode.chips.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.chips.map((c) => (
                      <span
                        key={c}
                        className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <SheetFooter>
                <button
                  onClick={() => {
                    const detail = nodeDetails[selectedNode.id];
                    navigate(detail?.route || selectedNode.route);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  افتح الأداة
                </button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!timelineLog} onOpenChange={(o) => !o && setTimelineLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-fuchsia-500" />
              سجل أحداث — {timelineLog?.label || ""}
            </DialogTitle>
            <DialogDescription>
              الأحداث المسجلة في هذه المرحلة من الداتا المتاحة.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {timelineLog?.events.length ? (
              timelineLog.events.map((ev, i) => (
                <div
                  key={`${ev.label}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900/40"
                >
                  <span className="font-medium text-gray-800 dark:text-gray-200">{ev.label}</span>
                  {ev.date ? (
                    <span className="text-xs text-gray-500" dir="ltr">{ev.date}</span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">
                لا توجد أحداث مسجلة في هذه المرحلة
              </p>
            )}
          </div>
          {timelineLog?.note && (
            <p className="text-xs text-gray-400">{timelineLog.note}</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoyaltySystemMap;