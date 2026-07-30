import React, { useState, useEffect } from "react";
import { MessageSquare, Plus, Star, User, ArrowRight, Filter, Search, TrendingUp, Mail, Navigation as SendIcon, Award, Calendar, MoreVertical, Pencil, Trash2, Reply, CheckCircle2, Clock } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuthSimple";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Feedback {
  id: string;
  type: string;
  category?: string;
  content: string;
  rating?: number;
  isAnonymous: boolean;
  fromUserId: string;
  toUserId?: string;
  status: string;
  adminReply?: string;
  repliedAt?: string;
  repliedById?: string;
  fromEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    avatar?: string;
  };
  toEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    avatar?: string;
  };
  createdAt: string;
}

interface Stats {
  total: number;
  averageRating: number;
  byType: Array<{ type: string; _count: number }>;
}

const Feedback: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const isPrivileged = ["SUPER_ADMIN", "COMPANY_ADMIN", "OWNER", "MANAGER"].includes(
    user?.role || ""
  );

  // Reply state
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);

  useEffect(() => {
    if (user?.companyId) {
      fetchFeedback();
      fetchStats();
    }
  }, [user?.companyId]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const response = await api.get("/hr/feedback");
      if (response.data.success) {
        setFeedback(response.data.feedback || []);
      }
    } catch (error: any) {
      console.error("Error fetching feedback:", error);
      toast.error("فشل في جلب التغذية الراجعة");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/hr/feedback/stats");
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      PEER: "زميل",
      MANAGER: "مدير",
      SUBORDINATE: "مرؤوس",
      SELF: "ذاتي",
      GENERAL: "عام",
      OTHER: "آخر",
    };
    return typeMap[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      PEER: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
      MANAGER:
        "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
      SUBORDINATE:
        "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
      SELF: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
      GENERAL:
        "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
    };
    return (
      colorMap[type] ||
      "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800"
    );
  };

  const filteredFeedback = feedback.filter((item) => {
    const currentUserId = user?.id;

    if (activeTab === "received" && item.toUserId !== currentUserId)
      return false;
    if (activeTab === "sent" && item.fromUserId !== currentUserId) return false;

    const safeStr = (val?: string) => (val ? val.toLowerCase() : "");
    const search = searchQuery.toLowerCase();
    const matchesSearch =
      safeStr(item.content).includes(search) ||
      safeStr(item.toEmployee?.firstName).includes(search) ||
      safeStr(item.toEmployee?.lastName).includes(search) ||
      safeStr(item.fromEmployee?.firstName).includes(search) ||
      safeStr(item.fromEmployee?.lastName).includes(search);

    const matchesRating =
      ratingFilter === "all" || item.rating === ratingFilter;

    return matchesSearch && matchesRating;
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذه التغذية الراجعة؟"))
      return;

    try {
      const response = await api.delete(`/hr/feedback/${id}`);
      if (response.data.success) {
        toast.success("تم حذف التغذية الراجعة بنجاح");
        setFeedback((prev) => prev.filter((item) => item.id !== id));
        fetchStats();
      }
    } catch (error) {
      console.error("Error deleting feedback:", error);
      toast.error("فشل في حذف التغذية الراجعة");
    }
  };

  const handleReply = async () => {
    if (!selectedFeedback || !replyText.trim()) {
      console.warn("⚠️ Cannot send reply: missing feedback or text");
      return;
    }

    try {
      setReplyLoading(true);
      console.log(`📤 Sending reply to feedback ${selectedFeedback.id}:`, replyText);
      const response = await api.post(`/hr/feedback/${selectedFeedback.id}/reply`, {
        reply: replyText,
      });

      if (response.data.success) {
        console.log("✅ Reply sent successfully:", response.data);
        toast.success("تم إرسال الرد بنجاح");
        setFeedback((prev) =>
          prev.map((f) =>
            f.id === selectedFeedback.id
              ? { ...f, adminReply: replyText, status: "RESOLVED", repliedAt: new Date().toISOString() }
              : f
          )
        );
        setIsReplyDialogOpen(false);
        setReplyText("");
      }
    } catch (error: any) {
      console.error("❌ Error replying to feedback:", error);
      toast.error(error.response?.data?.error || "فشل في إرسال الرد");
    } finally {
      setReplyLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3 ml-1" />
            تم الرد
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="h-3 w-3 ml-1" />
            قيد الانتظار
          </Badge>
        );
    }
  };

  if (loading && feedback.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div
      className="p-6 space-y-8 animate-in fade-in duration-500 min-h-screen transition-colors duration-300"
      dir="rtl"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
            التغذية الراجعة 360°
          </h1>
          <p className="text-lg text-muted-foreground">
            نظرة شاملة على الأداء والتفاعل في الشركة
          </p>
        </div>
        <Button
          onClick={() => navigate("/hr/feedback/new")}
          size="lg"
          className="shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Plus className="h-5 w-5 ml-2" />
          تغذية راجعة جديدة
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-900 shadow-md hover:shadow-lg transition-all duration-300 border border-transparent dark:border-blue-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-full">
                الإجمالي
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-bold">{stats?.total || 0}</h3>
              <p className="text-sm text-muted-foreground">تم تلقيها مؤخراً</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-900/20 dark:to-slate-900 shadow-md hover:shadow-lg transition-all duration-300 border border-transparent dark:border-yellow-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-yellow-500/10 rounded-xl">
                <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400 fill-yellow-600 dark:fill-yellow-400" />
              </div>
              <span className="text-sm font-medium text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-1 rounded-full">
                التقييم
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-bold">
                {stats?.averageRating.toFixed(1) || "0.0"}
              </h3>
              <p className="text-sm text-muted-foreground">متوسط الرضا العام</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-900 shadow-md hover:shadow-lg transition-all duration-300 border border-transparent dark:border-purple-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-500/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm font-medium text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-1 rounded-full">
                النشاط
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-bold">
                %{Math.round(((stats?.total || 0) / 50) * 100)}
              </h3>
              <p className="text-sm text-muted-foreground">
                معدل المشاركة الشهري
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-slate-900 shadow-md hover:shadow-lg transition-all duration-300 border border-transparent dark:border-green-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-500/10 rounded-xl">
                <Award className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm font-medium text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-300 px-2 py-1 rounded-full">
                التميز
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-bold">
                {feedback.filter((f) => (f.rating || 0) >= 4).length}
              </h3>
              <p className="text-sm text-muted-foreground">
                تقييمات إيجابية (4-5)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm border-t border-white/10">
        <CardHeader className="bg-muted/50 border-b dark:border-white/5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full lg:w-auto"
            >
              <TabsList className="bg-background/80 p-1 border dark:border-white/10">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
                >
                  الكل
                </TabsTrigger>
                <TabsTrigger
                  value="received"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
                >
                  المستلمة
                </TabsTrigger>
                <TabsTrigger
                  value="sent"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
                >
                  المرسلة
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-72">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث في المحتوى أو الموظفين..."
                  className="pr-10 bg-background/50 border-muted-foreground/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-background/50">
                    <Filter className="h-4 w-4 ml-2" />
                    التقييم:{" "}
                    {ratingFilter === "all" ? "الكل" : `${ratingFilter} نجوم`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setRatingFilter("all")}>
                    الكل
                  </DropdownMenuItem>
                  {[5, 4, 3, 2, 1].map((r) => (
                    <DropdownMenuItem
                      key={r}
                      onClick={() => setRatingFilter(r)}
                      className="flex items-center"
                    >
                      <div className="flex items-center ml-2">
                        {Array.from({ length: r }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-3 w-3 fill-yellow-500 text-yellow-500"
                          />
                        ))}
                      </div>
                      ({r})
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredFeedback.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/20">
              <div className="bg-muted p-6 rounded-full mb-4">
                <Inbox className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                لا توجد تغذية راجعة
              </h3>
              <p className="text-muted-foreground mt-2 mb-6 max-w-xs text-center">
                لم نجد أي بيانات مطابقة لفلاتر البحث الحالية
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setRatingFilter("all");
                }}
              >
                إعادة ضبط الفلاتر
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredFeedback.map((item) => (
                <div
                  key={item.id}
                  className="p-6 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* User Avatars & Rating */}
                    <div className="flex sm:flex-col items-center sm:items-center gap-4 sm:w-32 lg:w-40">
                      <div className="flex -space-x-4 space-x-reverse items-center justify-center">
                        <Avatar className="h-12 w-12 border-2 border-background ring-2 ring-primary/10 shadow-sm">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {item.toEmployee?.firstName?.[0] || ""}
                            {item.toEmployee?.lastName?.[0] || ""}
                          </AvatarFallback>
                        </Avatar>
                        {!item.isAnonymous && (
                          <Avatar className="h-10 w-10 border-2 border-background ring-2 ring-purple-500/20 shadow-sm translate-y-1">
                            <AvatarFallback className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold">
                              {item.fromEmployee.firstName?.[0] || ""}
                              {item.fromEmployee.lastName?.[0] || ""}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>

                      <div className="flex flex-col items-center">
                        {item.rating && (
                          <div className="flex items-center gap-1.5 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20 mt-2">
                            <Star className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 fill-yellow-600 dark:fill-yellow-400" />
                            <span className="text-sm font-black text-yellow-700 dark:text-yellow-400">
                              {item.rating}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                              {item.toEmployee
                                ? `${item.toEmployee.firstName} ${item.toEmployee.lastName}`
                                : "تغذية راجعة عامة"}
                            </h4>
                            <Badge
                              variant="outline"
                              className={`font-medium ${getTypeColor(item.type)}`}
                            >
                              {getTypeLabel(item.type)}
                            </Badge>
                            {getStatusBadge(item.status)}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              {format(
                                new Date(item.createdAt),
                                "dd MMMM yyyy",
                                { locale: ar },
                              )}
                            </span>
                            {item.category && (
                              <>
                                <span className="h-1 w-1 rounded-full bg-muted-foreground/30"></span>
                                <span className="font-medium text-blue-600 dark:text-blue-400">
                                  {item.category}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {isPrivileged && (
                          <div className="flex items-center gap-2">
                            {(!item.toUserId || item.toUserId === "management") && !item.adminReply && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-primary hover:text-primary hover:bg-primary/5 gap-1.5 h-8 px-3"
                                onClick={() => {
                                  setSelectedFeedback(item);
                                  setIsReplyDialogOpen(true);
                                }}
                              >
                                <Reply className="h-4 w-4" />
                                <span className="text-xs font-bold">إضافة رد</span>
                              </Button>
                            )}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem
                                    className="flex items-center gap-2 cursor-pointer"
                                    onClick={() =>
                                      navigate(`/hr/feedback/edit/${item.id}`)
                                    }
                                  >
                                    <Pencil className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <span>تعديل</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                                    onClick={() => handleDelete(item.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span>حذف</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-muted/50 p-4 rounded-2xl border border-border group-hover:border-blue-500/20 group-hover:bg-blue-500/5 transition-all">
                        <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                          {item.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-medium uppercase tracking-wider text-muted-foreground pt-2">
                        <div className="flex items-center gap-1.5 ">
                          {item.isAnonymous ? (
                            <>
                              <User className="h-3 w-3" />
                              <span>مجهول المصدر</span>
                            </>
                          ) : (
                            <>
                              <SendIcon className="h-3 w-3" />
                              <span>
                                من: {item.fromEmployee.firstName}{" "}
                                {item.fromEmployee.lastName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Admin Reply Section */}
                      {item.adminReply && (
                        <div className="mr-8 mt-2 p-4 bg-primary/5 rounded-2xl border border-primary/10 relative">
                          <div className="absolute -right-4 top-4 bottom-4 w-1 bg-primary/30 rounded-full" />
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-primary/20 text-primary border-none text-[10px] h-5">رد الإدارة</Badge>
                            {item.repliedAt && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(item.repliedAt), "dd MMMM yyyy HH:mm", { locale: ar })}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                            {item.adminReply}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Reply className="h-5 w-5 text-primary" />
              الرد على التغذية الراجعة
            </DialogTitle>
            <DialogDescription>
              سيتم إرسال هذا الرد إلى الموظف وسيصل له إشعار بذلك.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-xl border italic text-sm text-foreground/80">
              "{selectedFeedback?.content}"
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">نص الرد</label>
              <Textarea
                placeholder="اكتب ردك هنا..."
                className="min-h-[150px] resize-none"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-row-reverse gap-4 mt-8 pt-4 border-t w-full">
            <Button
              onClick={(e) => {
                e.preventDefault();
                console.log("🚀 SEND BUTTON CLICKED!");
                handleReply();
              }}
              disabled={replyLoading || !replyText.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 text-lg"
            >
              {replyLoading ? "جاري الإرسال..." : "إرسال الرد"}
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                console.log("❌ CANCEL BUTTON CLICKED");
                setIsReplyDialogOpen(false);
              }}
              disabled={replyLoading}
              className="px-6 h-12 font-bold"
            >
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Feedback;
