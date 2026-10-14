import { useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Globe,
  Lock,
  Sparkles,
  Cpu,
  BarChart3,
  TrendingUp,
  Zap,
  Map,
  ShieldCheck,
  CheckCircle2,
  Server,
  Layers,
} from "lucide-react";
import {
  projectStructure,
  ProjectNode,
  ProjectNodeStatus,
} from "./projectMapData";
import { useAuth } from "../../hooks/useAuthSimple";
import i18n from "../../i18n";

const StatusBadge = ({
  status,
}: {
  status?: ProjectNodeStatus | undefined;
}) => {
  if (!status || status === "stable") return null;

  const styles = {
    beta: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    new: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    maintenance: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    stable: "",
  };

  const labels = {
    beta: "تجريبي (Beta)",
    new: "جديد (New)",
    maintenance: "صيانة",
    stable: "",
  };

  return (
    <span
      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${styles[status]} font-medium`}
    >
      {labels[status]}
    </span>
  );
};

const NodeCard = ({
  node,
  isExpanded,
  onToggle,
  level = 0,
  isLocked = false,
}: {
  node: ProjectNode;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  level?: number;
  isLocked?: boolean;
}) => {
  return (
    <div className={`relative ${isLocked ? "opacity-60 grayscale" : ""}`}>
      <div
        onClick={() => !isLocked && node.children && onToggle(node.id)}
        className={`
          relative z-10 p-4 mb-2 rounded-xl cursor-pointer border transition-colors shadow-2xs
          ${level === 0 ? "bg-card border-border/80 hover:border-primary/40" : "bg-muted/20 border-border/50 ml-6"}
        `}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`flex flex-shrink-0 items-center justify-center size-9 rounded-lg text-white mt-0.5 shadow-2xs ${node.color || "bg-primary"}`}
          >
            {isLocked ? <Lock className="size-4" /> : node.icon}
          </div>

          <div className="flex-grow text-right min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                {node.title}
              </h3>
              <StatusBadge status={node.status} />
            </div>

            <div className="mt-1">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {node.description}
              </p>
              {node.businessValue && (
                <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  <Zap className="size-3" />
                  <span>القيمة: {node.businessValue}</span>
                </div>
              )}
            </div>

            {node.children && !isLocked && (
              <div className="flex justify-end mt-2">
                <span className="text-muted-foreground hover:text-foreground transition-colors">
                  {isExpanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isExpanded && node.children && !isLocked && (
        <div className="overflow-hidden relative pr-4 space-y-2 pt-1 pb-2">
          {node.children.map((child: any) => (
            <div key={child.id} className="relative pr-6">
              <div className="bg-card p-3 rounded-lg border border-border/70 shadow-2xs hover:border-primary/40 transition-colors group">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-muted/60 rounded-md text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                    {child.icon}
                  </div>
                  <div className="text-right flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-xs text-foreground">
                        {child.title}
                      </h4>
                      <StatusBadge status={child.status} />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {child.description}
                    </p>

                    {child.businessValue && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                        <Zap className="size-3" />
                        <span>{child.businessValue}</span>
                      </div>
                    )}

                    {child.details && (
                      <div className="mt-2 flex flex-wrap gap-1 justify-end font-mono">
                        {child.details.map((detail: string) => (
                          <span
                            key={detail}
                            className="px-1.5 py-0.5 bg-muted/50 text-muted-foreground text-[10px] rounded border border-border/40"
                          >
                            {detail}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ProjectMap: React.FC = () => {
  const { user } = useAuth();
  const [expandedNodes, setExpandedNodes] = useState<string[]>([
    "storefront",
    "dashboard",
  ]);

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id],
    );
  };

  const hasPermission = (node: ProjectNode) => {
    if (!node.requiredRole) return true;
    if (!user) return false;
    if (user.role === "SUPER_ADMIN") return true;
    return node.requiredRole.includes(user.role);
  };

  const totalSections = projectStructure.length;
  const totalSubNodes = useMemo(
    () => projectStructure.reduce((acc, s) => acc + (s.children?.length || 0), 0),
    [],
  );

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto" dir={i18n.dir()}>
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground shadow-2xs">
            <Map className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                خريطة هيكل المشروع (Project Architecture Map)
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                Enterprise OS
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              دليل هيكلي شامل لمنظومة التجارة والخدمات البرمجية، متصل بحالة الخوادم المركزية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground self-end sm:self-auto">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>مستقر</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" />
            <span>تجريبي</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-blue-500" />
            <span>جديد</span>
          </span>
        </div>
      </div>

      {/* Linear Telemetry Strip */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60 font-mono">
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">القطاعات الهيكلية</span>
              <Layers className="size-3.5 text-primary" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {totalSections}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">قطاعات رئيسية</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">الوحدات البرمجية</span>
              <Server className="size-3.5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {totalSubNodes}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">وحدات فرعية نشطة</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">وفر تشغيلي مقدر</span>
              <TrendingUp className="size-3.5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              40%
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">أتمتة العمليات</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">الحالة المعمارية</span>
              <ShieldCheck className="size-3.5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              100%
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">تطابق الهيكل</p>
          </div>
        </div>
      </div>

      {/* Nodes List */}
      <div className="space-y-2.5">
        {projectStructure.map((section) => {
          const canAccess = hasPermission(section);
          return (
            <NodeCard
              key={section.id}
              node={section}
              isExpanded={canAccess && expandedNodes.includes(section.id)}
              onToggle={toggleNode}
              isLocked={!canAccess}
            />
          );
        })}
      </div>

      <div className="p-3 rounded-xl border border-border/70 dark:border-border/60 bg-card text-center text-xs text-muted-foreground font-mono">
        <span>مزامنة معمارية معتمدة · {new Date().toLocaleDateString("ar-EG")}</span>
      </div>
    </div>
  );
};

export default ProjectMap;
