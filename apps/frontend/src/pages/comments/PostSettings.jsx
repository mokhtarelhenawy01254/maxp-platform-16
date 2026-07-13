import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import CommentService from "../../services/commentService";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { cn } from "../../lib/utils";
import {
  ArrowRight,
  Settings2,
  MessageSquareText,
  Smartphone,
  Sparkles,
  Save,
  CheckCircle2,
  Eye,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  Lightbulb,
  Repeat2,
  Clock,
  ArrowLeft,
  MessageCircle,
} from "lucide-react";

function SectionCard({ icon: Icon, title, description, gradient, children, className }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/20 dark:border-white/[0.06] bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl shadow-lg dark:shadow-2xl transition-all duration-300", className)}>
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", gradient || "from-blue-500 to-indigo-500")} />
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          {Icon && (
            <div className="relative shrink-0">
              <div className={cn("absolute inset-0 rounded-lg blur-md opacity-40", gradient ? gradient.replace("from-", "bg-").replace("to-", "").replace(" via-", " ") : "bg-blue-500")} />
              <div className={cn("relative p-2 rounded-lg bg-gradient-to-br shadow-lg", gradient || "from-blue-500 to-indigo-500")}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
          )}
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-white">{title}</h3>
            {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function MethodCard({ selected, onClick, icon: Icon, title, description, accent }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]",
        selected
          ? cn("shadow-lg", accent === "green" ? "border-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/30" : "border-amber-400 bg-amber-50/80 dark:bg-amber-950/30")
          : "border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/30 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md"
      )}
    >
      {selected && (
        <div className="absolute -top-2 -right-2">
          <div className={cn("p-1 rounded-full", accent === "green" ? "bg-emerald-500" : "bg-amber-500")}>
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 mb-2">
        <div className={cn("p-2 rounded-lg", selected ? (accent === "green" ? "bg-emerald-100 dark:bg-emerald-900/50" : "bg-amber-100 dark:bg-amber-900/50") : "bg-gray-100 dark:bg-gray-800")}>
          <Icon className={cn("w-5 h-5", selected ? (accent === "green" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400") : "text-gray-500")} />
        </div>
        <span className={cn("font-semibold text-sm", selected ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300")}>{title}</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed pr-11">{description}</p>
    </div>
  );
}

const PostSettings = () => {
  const { t } = useTranslation();
  const { postId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [postSettings, setPostSettings] = useState({
    responseMethod: "manual",
    commentMessages: [""],
    fixedMessengerMessage: "",
  });
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  const fetchPostSettings = async () => {
    try {
      const response = await CommentService.getPostResponseMethod(postId);
      if (response.success && response.data) {
        const responseMethod = response.data.responseMethod === "fixed" ? "fixed" : "manual";
        setPostSettings({
          responseMethod,
          commentMessages: response.data.commentMessages ? JSON.parse(response.data.commentMessages) : [""],
          fixedMessengerMessage: response.data.fixedMessengerMessage || "",
        });
        if (response.data.updatedAt && !response.data.id) {
          setIsFallbackMode(true);
        }
      }
    } catch (error) {
      toast.error(t("pageComments.saveError"));
    } finally {
      setLoading(false);
    }
  };

  const savePostSettings = async () => {
    if (postSettings.responseMethod === "fixed" && (!postSettings.commentMessages || postSettings.commentMessages.length === 0 || !postSettings.commentMessages[0].trim())) {
      toast.warning(t("postsManagement.note"));
      return;
    }

    setSaving(true);
    try {
      const response = await CommentService.setPostResponseMethod(postId, postSettings);
      if (response.success) {
        toast.success(response.message || t("pageComments.savedSuccessfully"));
        if (response.message && response.message.includes("fallback")) {
          setIsFallbackMode(true);
        }
      }
    } catch (error) {
      toast.error(t("pageComments.saveError") + ": " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const applyResponseMethod = async () => {
    if (isFallbackMode) {
      toast.warning(t("postSettings.applyResponseDisabled"));
      return;
    }

    if (!window.confirm("هل أنت متأكد من تطبيق طريقة الرد على جميع التعليقات المعلقة في هذا المنشور؟")) {
      return;
    }

    try {
      const response = await CommentService.applyPostResponseMethod(postId);
      if (response.success) {
        toast.success(`تمت معالجة ${response.data.processedComments} تعليق`);
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء تطبيق طريقة الرد: " + error.message);
    }
  };

  useEffect(() => {
    fetchPostSettings();
  }, [postId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-30 animate-pulse" />
            <div className="relative inline-block animate-spin rounded-full h-14 w-14 border-[3px] border-blue-500 border-t-transparent" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-semibold">{t("postSettings.loadingPostSettings")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/posts")} className="group">
            <ArrowRight className="w-4 h-4 ml-1.5 group-hover:-translate-x-0.5 transition-transform" />
            {t("postSettings.backToPosts")}
          </Button>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 sm:p-8 shadow-2xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-purple-300/20 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-white/20 backdrop-blur rounded-xl shadow-lg">
                <Settings2 className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white drop-shadow-sm">
                {t("postSettings.pageTitle")}
              </h1>
            </div>
            <p className="text-white/80 text-sm flex items-center gap-2">
              <span className="opacity-60">{t("postSettings.postIdLabel")}:</span>
              <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-xs">{postId}</span>
            </p>
            {isFallbackMode && (
              <div className="mt-4 inline-flex items-center gap-2 bg-amber-500/20 backdrop-blur border border-amber-400/30 text-amber-200 px-4 py-2 rounded-xl text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {t("postSettings.fallbackWarning")}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SectionCard
              icon={MessageSquareText}
              title={t("postSettings.autoResponseMethodTitle")}
              description={t("postSettings.chooseResponseMethod")}
              gradient="from-emerald-500 to-teal-500"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MethodCard
                  selected={postSettings.responseMethod === "fixed"}
                  onClick={() => setPostSettings((prev) => ({ ...prev, responseMethod: "fixed" }))}
                  icon={Sparkles}
                  title={t("postSettings.fixed")}
                  description={t("postSettings.fixedDesc")}
                  accent="green"
                />
                <MethodCard
                  selected={postSettings.responseMethod === "manual"}
                  onClick={() => setPostSettings((prev) => ({ ...prev, responseMethod: "manual" }))}
                  icon={MessageCircle}
                  title={t("postSettings.manual")}
                  description={t("postSettings.manualDesc")}
                  accent="amber"
                />
              </div>

              <AnimatePresence>
                {postSettings.responseMethod === "fixed" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <Separator className="my-5" />
                    <div className="space-y-5">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <MessageSquareText className="w-4 h-4 text-emerald-500" />
                            {t("postSettings.fixedCommentVariations")}
                          </label>
                          <Badge variant="outline" className="text-xs">
                            {postSettings.commentMessages.length}
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          {postSettings.commentMessages.map((msg, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex gap-2 items-start group"
                            >
                              <div className="relative flex-1">
                                <div className="absolute right-3 top-3 text-[0.65rem] font-bold text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                  #{index + 1}
                                </div>
                                <Textarea
                                  className="min-h-[70px] pt-2 pl-9 text-sm"
                                  value={msg}
                                  onChange={(e) => {
                                    const newMessages = [...postSettings.commentMessages];
                                    newMessages[index] = e.target.value;
                                    setPostSettings((prev) => ({ ...prev, commentMessages: newMessages }));
                                  }}
                                  placeholder={`${t("unifiedComments.reply")} ${index + 1}...`}
                                />
                              </div>
                              {postSettings.commentMessages.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const newMessages = postSettings.commentMessages.filter((_, i) => i !== index);
                                    setPostSettings((prev) => ({ ...prev, commentMessages: newMessages }));
                                  }}
                                  className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </motion.div>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPostSettings((prev) => ({ ...prev, commentMessages: [...prev.commentMessages, ""] }));
                          }}
                          className="mt-3"
                        >
                          <Plus className="w-4 h-4 ml-1.5" />
                          {t("postsManagement.addReply")}
                        </Button>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-3">
                          <Smartphone className="w-4 h-4 text-indigo-500" />
                          {t("postSettings.fixedMessengerMessage")}
                        </label>
                        <Textarea
                          className="min-h-[80px] text-sm"
                          value={postSettings.fixedMessengerMessage}
                          onChange={(e) => setPostSettings((prev) => ({ ...prev, fixedMessengerMessage: e.target.value }))}
                          placeholder={t("postSettings.fixedMessengerPlaceholder")}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </SectionCard>

            <div className="flex flex-wrap gap-3">
              <Button onClick={savePostSettings} disabled={saving} size="lg" className="shadow-lg hover:shadow-xl transition-shadow">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    {t("postSettings.saving")}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    {t("postSettings.saveSettings")}
                  </>
                )}
              </Button>

              {postSettings.responseMethod !== "manual" && !isFallbackMode && (
                <Button onClick={applyResponseMethod} variant="secondary" size="lg">
                  <Repeat2 className="w-4 h-4 ml-2" />
                  {t("postSettings.applyResponse")}
                </Button>
              )}

              <Button variant="outline" size="lg" onClick={() => navigate(`/posts/${postId}/comments`)}>
                <Eye className="w-4 h-4 ml-2" />
                {t("postSettings.viewPostComments")}
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <SectionCard
              icon={Lightbulb}
              title={t("postSettings.howToUse")}
              gradient="from-amber-500 to-orange-500"
            >
              <div className="space-y-4">
                <div className="relative pr-4 border-r-2 border-emerald-400 dark:border-emerald-600">
                  <div className="absolute right-0 top-0 -mr-[5px] w-2 h-2 rounded-full bg-emerald-400 dark:bg-emerald-600" />
                  <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">{t("postSettings.fixedTitle")}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{t("postSettings.fixedHow")}</p>
                </div>
                <div className="relative pr-4 border-r-2 border-amber-400 dark:border-amber-600">
                  <div className="absolute right-0 top-0 -mr-[5px] w-2 h-2 rounded-full bg-amber-400 dark:border-amber-600" />
                  <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">{t("postSettings.manualTitle")}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{t("postSettings.manualHow")}</p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    {t("postSettings.tipsTitle")}
                  </h4>
                  <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-2">
                    {[
                      t("postSettings.tipChangeAnyTime"),
                      t("postSettings.tipAffectsPendingOnly"),
                      t("postSettings.tipAlreadyRepliedUnaffected"),
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                    {isFallbackMode && (
                      <li className="flex items-start gap-2 text-amber-600 dark:text-amber-400 font-medium">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{t("postSettings.tipFallbackCached")}</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </SectionCard>

            <div className="relative overflow-hidden rounded-2xl border border-white/20 dark:border-white/[0.06] bg-gradient-to-br from-purple-600/10 to-blue-600/10 dark:from-purple-900/20 dark:to-blue-900/20 backdrop-blur-xl p-5 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg shrink-0">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-1">تلميحات سريعة</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    يمكنك تغيير طريقة الرد في أي وقت. تطبيق الطريقة يؤثر فقط على التعليقات المعلقة، بينما التعليقات التي تم الرد عليها مسبقًا لن تتأثر.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostSettings;
