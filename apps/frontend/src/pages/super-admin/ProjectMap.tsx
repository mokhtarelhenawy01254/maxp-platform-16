import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import {
  projectStructure,
  ProjectNode,
  ProjectNodeStatus,
} from "./projectMapData";
import { useAuth } from "../../hooks/useAuthSimple";
import i18n from "../../i18n";

// --- Badges ---
const StatusBadge = ({
  status,
}: {
  status?: ProjectNodeStatus | undefined;
}) => {
  if (!status || status === "stable") return null;

  const styles = {
    beta: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    new: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    maintenance:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
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
      className={`text-[10px] px-2 py-0.5 rounded-full border ${styles[status]} font-medium`}
    >
      {labels[status]}
    </span>
  );
};

// --- Vision Banner Chassis ---
const VisionCard = () => (
  <div className="mb-6 p-5 sm:p-6 rounded-xl border border-border/80 bg-card shadow-2xs">
    <div className="flex flex-col md:flex-row gap-5 items-start sm:items-center">
      <div className="size-11 rounded-lg border border-border/80 bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <Globe className="size-5" />
      </div>
      <div className="space-y-1.5 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-foreground">
            منظومة الأعمال المتكاملة (All-in-One ERP Architecture)
          </h2>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
            Enterprise OS
          </span>
        </div>
        <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm max-w-4xl">
          نظام تشغيل تجاري متكامل يهدف لتقليل التكاليف التشغيلية بنسبة 40% وزيادة المبيعات بنسبة 30% من خلال أتمتة المهام الروتينية، وربط جميع إدارات الشركة (المخازن، الطلبات، المالية، الموارد البشرية) في هيكل تشغيلي موحد.
        </p>
        <div className="pt-2 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/60 text-muted-foreground text-[11px] font-medium">
            <TrendingUp className="size-3 text-emerald-500" />
            <span>نمو تشغيلي مستدام</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/60 text-muted-foreground text-[11px] font-medium">
            <Cpu className="size-3 text-primary" />
            <span>أتمتة ذكية متكاملة</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/60 text-muted-foreground text-[11px] font-medium">
            <BarChart3 className="size-3 text-amber-500" />
            <span>قرارات مبنية على المؤشرات اللحظية</span>
          </span>
        </div>
      </div>
    </div>
  </div>
);

// --- Node Card Component ---
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
      <motion.div
        layout
        onClick={() => !isLocked && node.children && onToggle(node.id)}
        className={`
          relative z-10 p-4 mb-2 rounded-xl cursor-pointer border transition-colors
          ${level === 0 ? "bg-card border-border/80 shadow-2xs hover:border-border" : "bg-muted/20 border-border/50 ml-6"}
        `}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`flex flex-shrink-0 items-center justify-center size-10 rounded-lg text-white mt-0.5 ${node.color || "bg-primary"}`}
          >
            {isLocked ? <Lock className="size-4.5" /> : node.icon}
          </div>

          <div className="flex-grow text-right min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                {node.title}
              </h3>
              <StatusBadge status={node.status} />
            </div>

            <div className="mt-1">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {node.description}
              </p>
              {/* ROI / Business Value Highlight */}
              {node.businessValue && (
                <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  <Sparkles className="size-3" />
                  <span>القيمة التشغيلية: {node.businessValue}</span>
                </div>
              )}
            </div>

            {node.children && !isLocked && (
              <div className="flex justify-end mt-2">
                <span className="text-muted-foreground hover:text-foreground transition-colors">
                  {isExpanded ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isExpanded && node.children && !isLocked && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden relative"
          >
            {/* Connector Line */}
            <div
              className="absolute top-0 right-6 bottom-4 w-px bg-border/80"
              style={{ right: "1.75rem" }}
            />

            <div className="pr-4 space-y-2 pt-1 pb-2">
              {node.children.map((child: any) => (
                <div key={child.id} className="relative pr-8">
                  {/* Horizontal Connector */}
                  <div className="absolute top-6 -right-4 w-6 h-px bg-border/80" />

                  <div className="bg-card p-3.5 rounded-lg border border-border/80 shadow-2xs hover:border-primary/40 transition-colors group">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded-md text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                        {child.icon}
                      </div>
                      <div className="text-right flex-grow min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-xs sm:text-sm text-foreground">
                            {child.title}
                          </h4>
                          <StatusBadge status={child.status} />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          {child.description}
                        </p>

                        {/* Child ROI */}
                        {child.businessValue && (
                          <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <Zap className="size-3" />
                            <span>{child.businessValue}</span>
                          </div>
                        )}

                        {child.details && (
                          <div className="mt-2 flex flex-wrap gap-1.5 justify-end">
                            {child.details.map((detail: string) => (
                              <span
                                key={detail}
                                className="px-2 py-0.5 bg-muted/60 text-muted-foreground text-[10px] rounded font-mono border border-border/50"
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main Component ---
const ProjectMap = () => {
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

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir={i18n.dir()}>
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground shadow-2xs shrink-0">
            <Map className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                خريطة هيكل المشروع (Project Architecture Map)
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                V2.1
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              دليل هيكلي شامل لمنظومة التجارة والخدمات البرمجية، متصل بحالة الخوادم المركزية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground self-end sm:self-auto">
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

      <VisionCard />

      <div className="space-y-3">
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

      <div className="p-4 rounded-xl border border-border/70 bg-card text-center text-xs text-muted-foreground font-mono">
        <span>آخر مزامنة للبنية المعمارية: {new Date().toLocaleDateString("ar-EG")}</span>
      </div>
    </div>
  );
};

export default ProjectMap;
