import React, { useState, useEffect } from "react";
import { MessageSquare, Plus, Star, User, Mail, Navigation as SendIcon, Search, Calendar, AlertTriangle, Clock, CheckCircle2, Eye } from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { useAuth } from "@/hooks/useAuthSimple";
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
        avatar?: string;
    } | null;
    toEmployee?: {
        id: string;
        firstName: string;
        lastName: string;
        avatar?: string;
    } | null;
    createdAt: string;
}

const MyFeedback: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("sent");
    const [searchQuery, setSearchQuery] = useState("");
    const [previewItem, setPreviewItem] = useState<Feedback | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const handleOpenPreview = (item: Feedback) => {
        setPreviewItem(item);
        setIsPreviewOpen(true);
    };

    useEffect(() => {
        if (user?.id) fetchMyFeedback();
    }, [user?.id]);

    const fetchMyFeedback = async () => {
        try {
            setLoading(true);
            const response = await api.get("/hr/feedback", {
                params: { personal: true }
            });
            if (response.data.success) {
                setFeedback(response.data.feedback || []);
            }
        } catch (error: any) {
            console.error("Error fetching feedback:", error);
            toast.error("فشل في جلب البيانات");
        } finally {
            setLoading(false);
        }
    };

    const getTypeLabel = (type: string) => {
        const typeMap: Record<string, string> = {
            SUGGESTION: "اقتراح",
            COMPLAINT: "شكوى",
            INQUIRY: "استفسار",
            PEER: "تقييم زميل",
            MANAGER: "تقييم مدير",
            SUBORDINATE: "تقييم مرؤوس",
            OTHER: "آخر",
        };
        return typeMap[type] || type;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE': return <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none">جديد</Badge>;
            case 'RESOLVED': return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">تم الرد</Badge>;
            case 'ARCHIVED': return <Badge variant="secondary">مؤرشف</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    }

    const filteredFeedback = feedback.filter((item) => {
        const currentUserId = user?.id;

        // Step 1: Filter by tab
        if (currentUserId) {
            if (activeTab === "received") {
                if (item.toUserId !== currentUserId) return false;
            } else if (activeTab === "sent") {
                if (item.fromUserId !== currentUserId) return false;
            }
        }

        // Step 2: Filter by search
        if (searchQuery) {
            const search = searchQuery.toLowerCase();
            const contentMatch = (item.content || "").toLowerCase().includes(search);
            const fromName = item.fromEmployee ? `${item.fromEmployee.firstName} ${item.fromEmployee.lastName}` : "";
            const toName = item.toEmployee ? `${item.toEmployee.firstName} ${item.toEmployee.lastName}` : (item.toUserId ? "" : "الإدارة");

            return contentMatch || fromName.toLowerCase().includes(search) || toName.toLowerCase().includes(search);
        }

        return true;
    });

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 min-h-screen pb-20" dir="rtl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <MessageSquare className="h-8 w-8 text-primary" />
                        الشكاوى والاقتراحات
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        إدارة تواصلك مع الإدارة وتقييمات الزملاء في مكان واحد
                    </p>
                </div>
                <Button onClick={() => navigate("/my-feedback/new")} className="flex items-center gap-2 shadow-lg hover:shadow-primary/20 transition-all">
                    <Plus className="h-5 w-5" />
                    إرسال رسالة جديدة
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background border-indigo-100 dark:border-indigo-900/30 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <Inbox className="h-16 w-16" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                            الرسائل المستلمة
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{feedback.filter(f => f.toUserId === user?.id).length}</div>
                        <p className="text-xs text-muted-foreground mt-1">رسائل وتلقيات من الزملاء</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background border-purple-100 dark:border-purple-900/30 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <SendIcon className="h-16 w-16" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-600 dark:text-purple-400">
                            الرسائل المرسلة
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{feedback.filter(f => f.fromUserId === user?.id).length}</div>
                        <p className="text-xs text-muted-foreground mt-1">شكاوى، اقتراحات، وتقييمات للغير</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background border-amber-100 dark:border-amber-900/30 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <Star className="h-16 w-16" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            متوسط التقييم العام
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {(() => {
                                const rated = feedback.filter(f => f.toUserId === user?.id && f.rating);
                                if (rated.length === 0) return "0.0";
                                const avg = rated.reduce((acc, curr) => acc + (curr.rating || 0), 0) / rated.length;
                                return avg.toFixed(1);
                            })()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">بناءً على التقييمات المسجلة في حسابك</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs List */}
            <Tabs defaultValue="sent" onValueChange={setActiveTab} className="space-y-6">
                <div className="bg-card border rounded-xl p-2 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                    <TabsList className="grid grid-cols-2 w-full md:w-[400px]">
                        <TabsTrigger value="sent" className="flex items-center gap-2">
                            <SendIcon className="h-4 w-4" />
                            الرسائل المرسلة
                        </TabsTrigger>
                        <TabsTrigger value="received" className="flex items-center gap-2">
                            <Inbox className="h-4 w-4" />
                            الرسائل المستلمة
                        </TabsTrigger>
                    </TabsList>

                    <div className="relative w-full md:w-80 px-2">
                        <Search className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="ابحث في المحتوى أو الأسماء..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pr-10 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary"
                        />
                    </div>
                </div>

                <TabsContent value={activeTab} className="mt-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                            <p className="text-muted-foreground animate-pulse">جاري تحميل البيانات...</p>
                        </div>
                    ) : filteredFeedback.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredFeedback.map((item) => (
                                <Card key={item.id} className="group hover:shadow-xl transition-all duration-300 border-t-4 border-t-primary/20 relative">
                                    <CardHeader className="pb-3 border-b bg-muted/5 group-hover:bg-muted/10 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-12 w-12 border-2 border-background shadow-sm hover:scale-105 transition-transform">
                                                    {activeTab === "received" ? (
                                                        item.isAnonymous ? (
                                                            <AvatarFallback className="bg-muted text-muted-foreground"><User className="h-6 w-6" /></AvatarFallback>
                                                        ) : (
                                                            <AvatarImage src={item.fromEmployee?.avatar} />
                                                        )
                                                    ) : (
                                                        item.toUserId ? (
                                                            <AvatarImage src={item.toEmployee?.avatar} />
                                                        ) : (
                                                            <AvatarFallback className="bg-primary/10 text-primary font-bold">HQ</AvatarFallback>
                                                        )
                                                    )}
                                                    <AvatarFallback className="bg-primary/5 text-primary">
                                                        {activeTab === "received"
                                                            ? (item.isAnonymous ? "?" : item.fromEmployee?.firstName?.[0])
                                                            : (item.toUserId ? item.toEmployee?.firstName?.[0] : "H")}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-bold text-foreground">
                                                        {activeTab === "received"
                                                            ? (item.isAnonymous ? "مجهول" : `${item.fromEmployee?.firstName} ${item.fromEmployee?.lastName}`)
                                                            : (item.toUserId ? `${item.toEmployee?.firstName} ${item.toEmployee?.lastName}` : "الإدارة العامة")}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                                                        <Calendar className="h-3 w-3" />
                                                        {format(new Date(item.createdAt), "dd MMMM yyyy", { locale: ar })}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 bg-background shadow-sm">
                                                    {getTypeLabel(item.type)}
                                                </Badge>
                                                {getStatusBadge(item.status)}
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full bg-white text-slate-600 hover:text-primary shadow-sm"
                                                    onClick={() => handleOpenPreview(item)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-6 relative">
                                        {item.rating && (
                                            <div className="flex items-center gap-0.5 mb-4 bg-amber-50 dark:bg-amber-950/20 w-fit px-2 py-1 rounded-full border border-amber-100 dark:border-amber-900/30">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={`h-3.5 w-3.5 ${star <= (item.rating || 0)
                                                            ? "fill-amber-400 text-amber-400"
                                                            : "text-gray-300 dark:text-gray-700"
                                                            }`}
                                                    />
                                                ))}
                                                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 mr-1">{item.rating}</span>
                                            </div>
                                        )}
                                        <div className="relative">
                                            <div className="absolute -right-2 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
                                            <p className="text-sm text-foreground/80 leading-relaxed pr-2 italic font-medium whitespace-pre-wrap">
                                                {item.content}
                                            </p>
                                        </div>
                                        {item.category && (
                                            <div className="mt-4 pt-4 border-t border-dashed flex items-center gap-2">
                                                <Badge variant="secondary" className="text-[10px] text-muted-foreground font-normal">
                                                    #{item.category}
                                                </Badge>
                                            </div>
                                        )}

                                        {/* Admin Reply Section for Employees */}
                                        {item.adminReply && (
                                            <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 relative">
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
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-dashed rounded-3xl shadow-sm">
                            <div className="bg-primary/5 p-6 rounded-full mb-4">
                                <AlertCircle className="h-12 w-12 text-primary/40" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">لا توجد سجلات حالياً</h3>
                            <p className="text-muted-foreground mb-8 max-w-sm">
                                {activeTab === "received"
                                    ? "قسم الرسائل المستلمة فارغ حالياً."
                                    : "لم تقم بإرسال أي شكاوى أو مقترحات حتى هذه اللحظة."}
                            </p>
                            <Button onClick={() => navigate("/my-feedback/new")} variant="outline" className="rounded-full px-8 hover:bg-primary hover:text-white transition-all">
                                ابدأ بكتابة رسالة الآن
                            </Button>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Preview Dialog */}
            <Dialog
                open={isPreviewOpen}
                onOpenChange={(open) => {
                    setIsPreviewOpen(open);
                    if (!open) setPreviewItem(null);
                }}
            >
                <DialogContent className="max-w-2xl" dir="rtl" key={previewItem?.id}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            معاينة الرسالة
                        </DialogTitle>
                        <DialogDescription>
                            عرض سريع للتفاصيل دون فتح البطاقة الكاملة
                        </DialogDescription>
                    </DialogHeader>
                    {previewItem && (
                        <div className="space-y-4 mt-2">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-bold text-lg">
                                        {previewItem.toUserId
                                            ? `${previewItem.toEmployee?.firstName || ""} ${previewItem.toEmployee?.lastName || ""}`.trim() || "موظف"
                                            : "الإدارة العامة"}
                                    </p>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        {format(new Date(previewItem.createdAt), "dd MMMM yyyy HH:mm", { locale: ar })}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Badge variant="outline">{getTypeLabel(previewItem.type)}</Badge>
                                    {getStatusBadge(previewItem.status)}
                                </div>
                            </div>

                            <div className="rounded-xl border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                                {previewItem.content}
                            </div>

                            {previewItem.category && (
                                <Badge variant="secondary" className="text-[11px] w-fit">#{previewItem.category}</Badge>
                            )}

                            {previewItem.adminReply && (
                                <div className="border rounded-xl p-3 bg-primary/5 space-y-2">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        {previewItem.repliedAt
                                            ? format(new Date(previewItem.repliedAt), "dd MMMM yyyy HH:mm", { locale: ar })
                                            : "تم الرد"}
                                    </p>
                                    <p className="text-sm font-medium">{previewItem.adminReply}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MyFeedback;
