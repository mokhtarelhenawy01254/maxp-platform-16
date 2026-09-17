import React, { useState } from "react";
import {
  Download,
  Copy,
  Check,
  Shield,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  Share2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DownloadPackage } from "./downloadsData";

interface AppDetailsDrawerProps {
  pkg: DownloadPackage | null;
  isOpen: boolean;
  onClose: () => void;
  companyToken?: string;
}

export const AppDetailsDrawer: React.FC<AppDetailsDrawerProps> = ({
  pkg,
  isOpen,
  onClose,
  companyToken,
}) => {
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);

  if (!pkg) return null;

  const Icon = pkg.icon;

  const handleCopyUrl = (fileId: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrlId(fileId);
    toast.success("تم نسخ رابط التحميل المباشر");
    setTimeout(() => setCopiedUrlId(null), 2000);
  };

  const handleCopyToken = () => {
    if (!companyToken) {
      toast.info("سجل الدخول لإظهار معرّف المنشأة");
      return;
    }
    navigator.clipboard.writeText(companyToken);
    setCopiedToken(true);
    toast.success("تم نسخ معرّف المنشأة لربط أجهزة الموظفين");
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCopySha = (sha: string) => {
    navigator.clipboard.writeText(sha);
    setCopiedSha(true);
    toast.success("تم نسخ بصمة التحقق SHA-256");
    setTimeout(() => setCopiedSha(false), 2000);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-lg p-0 flex flex-col h-full bg-background border-r border-border/40"
        dir="rtl"
      >
        {/* Header Strip */}
        <SheetHeader className="p-5 border-b border-border/40 text-start space-y-3 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="size-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <Icon className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <SheetTitle className="text-base font-bold text-foreground tracking-tight text-balance">
                    {pkg.name}
                  </SheetTitle>
                  <Badge variant="outline" className="text-[11px] font-mono font-semibold text-primary border-primary/30 bg-primary/10">
                    {pkg.version}
                  </Badge>
                </div>
                <SheetDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1 font-mono text-pretty">
                  {pkg.nameEn}
                </SheetDescription>
              </div>
            </div>
          </div>

          {/* Quick Platform Tag */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <span className="font-semibold text-foreground">{pkg.platform}</span>
            <span>•</span>
            <span className="font-mono tabular-nums text-[11px]" dir="ltr">{pkg.telemetry.primarySize}</span>
          </div>
        </SheetHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-foreground">
          {/* Overview */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-foreground text-xs">نظرة عامة</h4>
            <p className="text-muted-foreground leading-relaxed text-pretty">
              {pkg.drawerDetails.overview}
            </p>
          </div>

          {/* Core Technical Capabilities */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              <span>المواصفات والإمكانات التقنية</span>
            </h4>
            <ul className="space-y-2 text-muted-foreground">
              {pkg.drawerDetails.features.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="size-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                  <span className="leading-relaxed text-pretty">{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* System Requirements */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
              <Layers className="size-3.5 text-primary" />
              <span>متطلبات التشغيل</span>
            </h4>
            <div className="space-y-2">
              <div className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground block mb-1">الحد الأدنى للنظام:</span>
                <ul className="list-disc list-inside space-y-1 pr-1">
                  {pkg.drawerDetails.minRequirements.map((req, i) => (
                    <li key={i} className="text-pretty">{req}</li>
                  ))}
                </ul>
              </div>

              {pkg.drawerDetails.recommendedSpecs.length > 0 && (
                <div className="text-[11px] text-muted-foreground pt-1">
                  <span className="font-semibold text-foreground block mb-1">المواصفات الموصى بها:</span>
                  <ul className="list-disc list-inside space-y-1 pr-1">
                    {pkg.drawerDetails.recommendedSpecs.map((spec, i) => (
                      <li key={i} className="text-pretty">{spec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Pairing Guide or Company Token */}
          {pkg.drawerDetails.pairingNotes && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <Lock className="size-3.5 text-primary" />
                <span>إرشادات الربط والتوثيق المركزي</span>
              </h4>
              <p className="text-muted-foreground text-[11px] leading-relaxed text-pretty">
                {pkg.drawerDetails.pairingNotes}
              </p>
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/40 border border-border/40">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-muted-foreground block">معرّف المنشأة المرجعي:</span>
                  <code className="font-mono text-xs font-bold text-foreground truncate block" dir="ltr">
                    {companyToken || "يرجى تسجيل الدخول"}
                  </code>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyToken}
                  className="h-8 px-2.5 text-xs text-primary hover:bg-primary/10 shrink-0 gap-1 active:scale-[0.97] transition-transform duration-160 ease-out"
                >
                  {copiedToken ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  <span>{copiedToken ? "تم النسخ" : "نسخ المعرّف"}</span>
                </Button>
              </div>
            </div>
          )}

          {/* iOS Safari Step-by-Step Guide */}
          {pkg.drawerDetails.iosGuide && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <Share2 className="size-3.5 text-primary" />
                <span>طريقة التثبيت على هواتف آيفون (Safari):</span>
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-[11px] pr-1 leading-relaxed">
                <li className="text-pretty">{pkg.drawerDetails.iosGuide.step1}</li>
                <li className="text-pretty">{pkg.drawerDetails.iosGuide.step2}</li>
                <li className="text-pretty">{pkg.drawerDetails.iosGuide.step3}</li>
                <li className="text-pretty">{pkg.drawerDetails.iosGuide.step4}</li>
              </ol>
            </div>
          )}

          {/* Security & Checksum */}
          {pkg.drawerDetails.sha256 && (
            <div className="space-y-1.5 pt-2 border-t border-border/40">
              <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <Shield className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>بصمة التحقق والسلامة (SHA-256)</span>
              </h4>
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/40 border border-border/40">
                <code className="font-mono text-[10px] text-muted-foreground truncate" dir="ltr">
                  {pkg.drawerDetails.sha256}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopySha(pkg.drawerDetails.sha256!)}
                  className="h-7 px-2 text-[11px] text-primary hover:bg-primary/10 shrink-0 gap-1 active:scale-[0.97] transition-transform duration-160 ease-out"
                >
                  {copiedSha ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  <span>{copiedSha ? "تم النسخ" : "نسخ"}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Changelog */}
          {pkg.drawerDetails.changelog.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" />
                <span>سجل التحديثات (Changelog)</span>
              </h4>
              <div className="space-y-3">
                {pkg.drawerDetails.changelog.map((log, i) => (
                  <div key={i} className="text-[11px] space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground">{log.version}</span>
                      <span className="text-muted-foreground font-mono text-[10px]">({log.date})</span>
                    </div>
                    <ul className="list-disc list-inside text-muted-foreground space-y-0.5 pr-1">
                      {log.changes.map((ch, ci) => (
                        <li key={ci} className="text-pretty">{ch}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border/40 bg-card space-y-2 shrink-0">
          <div className="space-y-2">
            {pkg.files.map((file) => (
              <div key={file.id} className="flex items-center gap-2">
                <a
                  href={file.url}
                  download
                  className="flex-1"
                  target={file.url.startsWith("http") && !file.url.includes("/download") ? "_blank" : undefined}
                  rel="noreferrer"
                >
                  <Button
                    variant={file.isPrimary ? "default" : "outline"}
                    className="w-full h-10 rounded-xl text-xs font-bold gap-2 active:scale-[0.97] transition-transform duration-160 ease-out"
                  >
                    <Download className="size-3.5" />
                    <span>{file.label}</span>
                    <span className="font-mono text-[10px] opacity-75 mr-auto" dir="ltr">
                      {file.size}
                    </span>
                  </Button>
                </a>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopyUrl(file.id, file.url)}
                  title="نسخ الرابط المباشر"
                  className="size-10 rounded-xl shrink-0 border-border/60 active:scale-[0.97] transition-transform duration-160 ease-out"
                >
                  {copiedUrlId === file.id ? (
                    <Check className="size-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AppDetailsDrawer;
