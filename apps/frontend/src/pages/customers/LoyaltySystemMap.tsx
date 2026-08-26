import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
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
} from "lucide-react";

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
      });
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

  const nodes = useMemo<MapNode[]>(() => {
    if (!data) return [];
    const {
      programs = [],
      wallet = null,
      loyaltyConfig = null,
      flows = [],
      enabledFlows = [],
      campaigns = [],
      journeys = [],
      birthdaySettings = null,
      occasions = [],
      leadCategories = [],
      customerLists = [],
      loyaltyRecordsTotal = 0,
      customerCounts = {},
    } = data as any;

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
          ? `${occasions.length} مناسبة مجدولة`
          : "لا توجد مناسبات مجدولة",
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
  }, [data]);

  const nodeById = useMemo(() => {
    const m: Record<string, MapNode> = {};
    nodes.forEach((n) => {
      m[n.id] = n;
    });
    return m;
  }, [nodes]);

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
    } = data as any;

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
          title={r.desc}
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
          title={r.desc}
        >
          <Smartphone className="h-3 w-3" />
          واتساب عادي
        </span>
      );
    }
    return (
      <span
        className={`${base} bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300`}
        title={r.desc}
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
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-gray-400" title={lastUpdated}>
              آخر تحديث {lastUpdated}
            </span>
          )}
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
              {STAGES.map((stage) => (
                <div key={stage.id} className="space-y-3">
                  <div className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2 py-1.5 text-[11px] font-bold text-gray-500 dark:border-gray-600 dark:text-gray-400">
                    <stage.icon className="h-3.5 w-3.5" />
                    {stage.label}
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
                        className={`h-[132px] rounded-xl border-2 ${sm.border} bg-white p-3 transition-shadow hover:shadow-md dark:bg-gray-800`}
                      >
                        <Link to={node.route} className="flex h-full flex-col">
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
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ))}
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
              </div>
            ))}
          </div>
          {Number(systemAnalytics.preActivationCustomers || 0) > 0 && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              {fmt(systemAnalytics.preActivationCustomers)} عميل عندهم أوردرات اتسلمت قبل
              تفعيل النظام — مش بياخدوا كوبون خصم تلقائي.
            </p>
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
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {routing.desc || "لا توجد بيانات"}
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
                  <td className="py-2.5">{sourceBadge(row.source)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                  <p className="mt-1 text-[10px] text-gray-400">{line.source.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoyaltySystemMap;