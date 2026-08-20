import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Download, Monitor, Apple, Terminal, ExternalLink, CheckCircle, Shield, Zap, Wifi } from "lucide-react";

const downloads = [
  {
    id: "windows",
    platform: "Windows",
    icon: <Monitor className="w-8 h-8" />,
    version: "1.0.0",
    size: "~10 MB",
    requirements: "Windows 10/11 (64-bit)",
    downloadUrl: "/downloads/MaxP-Tasks-Setup.exe",
    status: "available",
  },
  {
    id: "mac",
    platform: "macOS",
    icon: <Apple className="w-8 h-8" />,
    version: "Coming Soon",
    size: "-",
    requirements: "macOS 12+",
    downloadUrl: "#",
    status: "coming_soon",
  },
  {
    id: "linux",
    platform: "Linux",
    icon: <Terminal className="w-8 h-8" />,
    version: "Coming Soon",
    size: "-",
    requirements: "Ubuntu 20.04+ / Debian 11+",
    downloadUrl: "#",
    status: "coming_soon",
  },
];

const features = [
  { icon: <Zap className="w-5 h-5" />, title: "سريع وخفيف", desc: "بيشتغل على كل الأجهزة بدون تبطي" },
  { icon: <Shield className="w-5 h-5" />, title: "آمن", desc: "التشفير الكامل للبيانات والاتصالات" },
  { icon: <Wifi className="w-5 h-5" />, title: "ibrecessed", desc: "بيشتغل أونلاين وأوفلاين" },
  { icon: <CheckCircle className="w-5 h-5" />, title: "سهل الاستخدام", desc: "واجهة عربية بسيطة وواضحة" },
];

const SuperAdminDownloads = () => {
  const handleDownload = (item: typeof downloads[0]) => {
    if (item.status === "coming_soon") return;
    window.open(item.downloadUrl, "_blank");
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl" dir="rtl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-3">تحميل تطبيق MaxP Tasks</h1>
        <p className="text-muted-foreground text-lg">
          نسّب تطبيق سطح المكتب لإدارة مهام الفريق بسهولة
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {features.map((feat, i) => (
          <Card key={i} className="text-center p-4 hover:shadow-md transition-shadow">
            <CardContent className="pt-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 text-primary">
                {feat.icon}
              </div>
              <h3 className="font-semibold text-sm mb-1">{feat.title}</h3>
              <p className="text-xs text-muted-foreground">{feat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Download Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {downloads.map((item) => (
          <Card key={item.id} className={`relative overflow-hidden ${item.status === "available" ? "border-primary/50 hover:border-primary" : "opacity-60"}`}>
            {item.status === "available" && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-600" />
            )}
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-primary">{item.icon}</span>
              </div>
              <CardTitle className="text-xl">{item.platform}</CardTitle>
              <Badge variant={item.status === "available" ? "default" : "secondary"}>
                {item.version}
              </Badge>
            </CardHeader>
            <CardContent className="text-center">
              <div className="space-y-2 text-sm text-muted-foreground mb-6">
                <p>{item.requirements}</p>
                {item.size !== "-" && <p>الحجم: {item.size}</p>}
              </div>
              <Button
                className="w-full"
                variant={item.status === "available" ? "default" : "outline"}
                disabled={item.status === "coming_soon"}
                onClick={() => handleDownload(item)}
              >
                {item.status === "available" ? (
                  <>
                    <Download className="w-4 h-4 ml-2" />
                    تحميل الآن
                  </>
                ) : (
                  "قريباً"
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Installation Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">دليل التثبيت</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
              <span>حمّل الملف حسب نظام التشغيل بتاعك</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
              <span>افتح الملف واتبع خطوات التثبيت</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
              <span>سجّل دخول بالبريد الإلكتروني وكلمة المرور بتوعك</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
              <span>ابدأ إدارة مهام الفريق!</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDownloads;
