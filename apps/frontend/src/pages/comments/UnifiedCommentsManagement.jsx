import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import CommentService from "../../services/commentService";
import {
  MessageSquare,
  CheckCircle,
  Clock,
  Search,
  RefreshCw,
  Edit3,
  Trash2,
  Settings,
  ArrowLeft,
  TrendingUp,
  Users,
  BarChart3,
  Sparkles,
} from "lucide-react";

const UnifiedCommentsManagement = () => {
  const { postId: urlPostId } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const dateFt = useMemo(() => new Intl.DateTimeFormat(i18n.language), [i18n.language]);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activePostId, setActivePostId] = useState(urlPostId || null);
  const [selectedComments, setSelectedComments] = useState([]); // For bulk operations
  const [postSettings, setPostSettings] = useState(null); // To store post response settings
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: "",
    status: "all",
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
  });
  const [replyCommentId, setReplyCommentId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 300);
  const [confirmState, setConfirmState] = useState(null);
  const executeDelete = useCallback((commentId) => {
    CommentService.deleteFacebookComment(commentId).then((result) => {
      if (result.success && activePostId) fetchComments(activePostId);
    }).catch((error) => {
      console.error("Error deleting comment:", error);
      tToast.error("unifiedComments.failed_delete_c894");
    });
  }, [activePostId]);
  const executeBulkDelete = useCallback(() => {
    CommentService.bulkDeleteFacebookComments(selectedComments).then((result) => {
      if (result.success) {
        if (activePostId) fetchComments(activePostId);
        setSelectedComments([]);
        tToast.success("unifiedComments.success_delete_a35c");
      }
    }).catch((error) => {
      console.error("Error deleting comments:", error);
      toast.error(i18n.t("unifiedComments.msg_f647", { error: error.message }));
    });
  }, [selectedComments, activePostId]);

  // Fetch posts
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await CommentService.getFacebookPosts(filters);
      if (response.success) {
        setPosts(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      tToast.error("unifiedComments.failed_load_c6bd");
    } finally {
      setLoading(false);
    }
  };

  // Fetch comments for a specific post
  const fetchComments = async (postId) => {
    setLoading(true);
    try {
      const response = await CommentService.getCommentsByPostId(postId, {
        status: filters.status,
      });
      if (response.success) {
        setComments(response.data);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
      tToast.error("unifiedComments.failed_load_5aa6");
    } finally {
      setLoading(false);
    }
  };

  // Fetch post response settings
  const fetchPostSettings = async (postId) => {
    try {
      const response = await CommentService.getPostResponseMethod(postId);
      if (response.success) {
        setPostSettings(response.data);
      }
    } catch (error) {
      console.error("Error fetching post settings:", error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleUpdateResponse = async (commentId, response) => {
    if (!response || !response.trim()) {
      tToast.warning("unifiedComments.msg_91bc");
      return;
    }

    try {
      const result = await CommentService.sendManualResponseToFacebook(
        commentId,
        response,
      );
      if (result.success) {
        if (activePostId) {
          fetchComments(activePostId);
        }
        tToast.success("unifiedComments.success_save_8822");
      }
    } catch (error) {
      toast.error(i18n.t("unifiedComments.msg_0b87", { error: error.message }));
    }
  };

  const handleDeleteComment = (commentId) => {
    setConfirmState({
      title: "تأكيد الحذف",
      content: "هل أنت متأكد من حذف هذا التعليق؟",
      onConfirm: () => executeDelete(commentId),
    });
  };

  const handleViewComments = (postId) => {
    setActivePostId(postId);
    fetchComments(postId);
    fetchPostSettings(postId); // Fetch post settings when viewing comments
    // Update URL without page reload
    window.history.pushState({}, "", `/unified-comments/${postId}`);
  };

  const handleBackToPosts = () => {
    setActivePostId(null);
    // Update URL without page reload
    window.history.pushState({}, "", "/unified-comments");
  };

  const handleBulkDelete = () => {
    if (selectedComments.length === 0) {
      tToast.warning("unifiedComments.msg_2f31");
      return;
    }

    setConfirmState({
      title: "تأكيد الحذف الجماعي",
      content: `هل أنت متأكد من حذف ${selectedComments.length} تعليق؟`,
      confirmColor: "error",
      onConfirm: () => executeBulkDelete(),
    });
  };

  // Handle select/deselect comment
  const toggleCommentSelection = (commentId) => {
    setSelectedComments((prev) => {
      if (prev.includes(commentId)) {
        return prev.filter((id) => id !== commentId);
      } else {
        return [...prev, commentId];
      }
    });
  };

  // Handle select all comments
  const toggleSelectAll = () => {
    if (selectedComments.length === comments.length) {
      // Deselect all
      setSelectedComments([]);
    } else {
      // Select all
      setSelectedComments(comments.map((comment) => comment.id));
    }
  };

  const getResponseMethodLabel = (method) => {
    switch (method) {
      case "ai":
        return "رد تلقائي";
      case "fixed":
        return "رد محدد مسبقًا";
      case "manual":
        return "رد يدوي";
      default:
        return "غير محدد";
    }
  };

  const getResponseMethodColor = (method) => {
    switch (method) {
      case "ai":
        return "bg-blue-100 text-blue-800";
      case "fixed":
        return "bg-green-100 text-green-800";
      case "manual":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  useEffect(() => {
    if (activePostId) {
      fetchComments(activePostId);
    } else {
      fetchPosts();
    }
  }, [filters, activePostId]);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters((prev) => ({ ...prev, search: debouncedSearch }));
    }
  }, [debouncedSearch]);

  useEffect(() => {
    const handlePop = () => {
      const match = window.location.pathname.match(/^\/unified-comments\/(.+)/);
      setActivePostId(match ? match[1] : null);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  // If we're viewing comments for a specific post
  if (activePostId) {
    return (
      <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8">
        <div className="w-full">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center gap-4 mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
                <div className="relative p-4 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  تعليقات المنشور
                </h1>
                <p className="text-slate-600 dark:text-gray-300 mt-2 text-lg font-medium">
                  إدارة والرد على تعليقات المنشور بكل سهولة
                </p>
              </div>
            </div>
          </div>

          {/* Back Button and Post Info */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 mb-8 border border-white/30 dark:border-gray-700/30 hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50 transition-all duration-300">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={handleBackToPosts}
                className="group flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-gray-700 dark:to-gray-600 rounded-xl hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-300 shadow-md hover:shadow-lg font-semibold text-slate-700 dark:text-gray-200"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
                العودة إلى المنشورات
              </button>

              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white truncate">
                  معرف المنشور: {activePostId}
                </h2>
                {postSettings && (
                  <div className="mt-1">
                    <span
                      className={`px-2 py-1 text-xs font-bold rounded-full ${getResponseMethodColor(postSettings.responseMethod)}`}
                    >
                      طريقة الرد:{" "}
                      {getResponseMethodLabel(postSettings.responseMethod)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/posts/${activePostId}/settings`)}
                  className="group flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold"
                >
                  <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                  إعدادات الرد
                </button>
                {selectedComments.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="group flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold animate-bounce-subtle"
                  >
                    <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                    حذف ({selectedComments.length})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 mb-8 border border-white/30 dark:border-gray-700/30">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  فلتر حسب الحالة
                </label>
                <select
                  className="w-full px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-gray-700 dark:to-gray-600 border-2 border-slate-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 dark:text-white transition-all text-right font-semibold shadow-sm"
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                >
                  <option value="all">📊 كل التعليقات</option>
                  <option value="responded">✅ تم الرد عليها</option>
                  <option value="pending">⏳ قيد الانتظار</option>
                </select>
              </div>

              <div>
                <button
                  className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2 font-semibold"
                  onClick={() => fetchComments(activePostId)}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`w-5 h-5 ${loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`}
                  />
                  تحديث
                </button>
              </div>
            </div>
          </div>

          {/* Comments List */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden border border-white/20 dark:border-gray-700/20">
            {loading ? (
              <div className="p-16 text-center">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
                  <div className="relative inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                </div>
                <p className="mt-6 text-slate-600 dark:text-gray-300 font-bold text-lg">
                  جاري تحميل التعليقات...
                </p>
                <p className="mt-2 text-slate-500 dark:text-gray-400 text-sm">
                  الرجاء الانتظار
                </p>
              </div>
            ) : comments.length === 0 ? (
              <div className="p-16 text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-blue-200 rounded-full blur-2xl opacity-20"></div>
                  <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-3xl border-2 border-dashed border-blue-200 dark:border-blue-700">
                    <MessageSquare className="w-20 h-20 text-blue-400 mx-auto" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  لا توجد تعليقات
                </h3>
                <p className="text-slate-500 dark:text-gray-400 text-lg">
                  لا توجد تعليقات لهذا المنشور حتى الآن.
                </p>
              </div>
            ) : (
              <>
                {/* Bulk Actions Bar */}
                {selectedComments.length > 0 && (
                  <div className="bg-blue-50 border-b border-blue-100 px-6 py-3 flex items-center justify-between">
                    <div className="text-sm text-blue-800">
                      تم اختيار {selectedComments.length} تعليق
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        حذف الكل
                      </button>
                      <button
                        onClick={() => setSelectedComments([])}
                        className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                      >
                        إلغاء الاختيار
                      </button>
                    </div>
                  </div>
                )}

                <div className="divide-y divide-slate-200 dark:divide-gray-700">
                  {comments.map((comment, index) => (
                    <div
                      key={comment.id}
                      className="p-6 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 dark:hover:bg-gray-700/50 transition-all duration-300 border-r-4 border-transparent hover:border-blue-500 animate-fade-in"
                      style={{ animationDelay: `${Math.min(index, 20) * 0.05}s` }}
                    >
                      <div className="flex justify-between">
                        <div className="flex items-start gap-3">
                          <div className="pt-1">
                            <input
                              type="checkbox"
                              checked={selectedComments.includes(comment.id)}
                              onChange={() =>
                                toggleCommentSelection(comment.id)
                              }
                              className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                          </div>
                          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                                {comment.senderName}
                              </h4>
                              <span className="text-xs text-slate-500">
                                {comment.senderId}
                              </span>
                            </div>
                              <p className="text-sm text-slate-500 mt-1">
                                {dateFt.format(new Date(comment.createdTime))}
                              </p>
                          </div>
                        </div>
                        <div>
                          {comment.respondedAt ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3" />
                              تم الرد
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3" />
                              قيد الانتظار
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 mr-3">
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-700 dark:to-gray-600 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-600">
                          <p className="text-slate-800 dark:text-gray-100 leading-relaxed">
                            {comment.message}
                          </p>
                        </div>

                        {comment.response && (
                          <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-2xl border-2 border-blue-200 dark:border-blue-700 shadow-md">
                            <div className="flex items-start gap-2 mb-2">
                              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-slate-800 dark:text-gray-100 leading-relaxed font-medium">
                                  {comment.response}
                                </p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-3 font-semibold">
                                  ✓ تم الرد في:{" "}
                                  {dateFt.format(new Date(comment.respondedAt))}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-3">
                          {!comment.respondedAt && (
                            <button
                              onClick={() =>
                                setReplyCommentId(
                                  replyCommentId === comment.id
                                    ? null
                                    : comment.id,
                                )
                              }
                              className="group inline-flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 font-semibold"
                            >
                              <Edit3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              {replyCommentId === comment.id
                                ? "إلغاء"
                                : "رد على التعليق"}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="group inline-flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 font-semibold"
                          >
                            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            حذف
                          </button>
                        </div>
                        {replyCommentId === comment.id && (
                          <div className="mt-3">
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="اكتب ردك هنا..."
                              className="w-full px-4 py-3 border-2 border-blue-200 dark:border-blue-700 rounded-xl text-right bg-white dark:bg-gray-700 text-sm"
                              rows={2}
                            />
                            <div className="flex gap-2 mt-2 justify-end">
                              <button
                                onClick={() => {
                                  setReplyCommentId(null);
                                  setReplyText("");
                                }}
                                className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold"
                              >
                                إلغاء
                              </button>
                              <button
                                onClick={() => {
                                  handleUpdateResponse(comment.id, replyText);
                                  setReplyCommentId(null);
                                  setReplyText("");
                                }}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl font-semibold"
                              >
                                إرسال
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {confirmState && (
        <ConfirmDialog
          open={true}
          title={confirmState.title}
          content={confirmState.content}
          confirmColor={confirmState.confirmColor || "primary"}
          onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </>
    );
  }

  // Default view: Show posts list
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
                <div className="relative p-4 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  إدارة منشورات فيسبوك
                </h1>
                <p className="text-slate-600 dark:text-gray-300 mt-2 text-lg font-medium">
                  إدارة ومتابعة التعليقات بكل احترافية
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-gray-400 font-medium">
                      إجمالي المنشورات
                    </p>
                    <p className="text-2xl font-black text-blue-600">
                      {pagination.totalCount || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 mb-8 border border-white/30 dark:border-gray-700/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600" />
                بحث في المنشورات
              </label>
              <div className="relative">
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  className="w-full pr-12 pl-4 py-3.5 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-gray-700 dark:to-gray-600 border-2 border-slate-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all text-right font-medium shadow-sm"
                  placeholder="ابحث هنا..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                فلتر الحالة
              </label>
              <select
                className="w-full px-4 py-3.5 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-gray-700 dark:to-gray-600 border-2 border-slate-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 dark:text-white transition-all text-right font-semibold shadow-sm"
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                <option value="all">📊 كل المنشورات</option>
                <option value="responded">✅ تم الرد عليها</option>
                <option value="pending">⏳ قيد الانتظار</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                عدد النتائج
              </label>
              <select
                className="w-full px-4 py-3.5 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-gray-700 dark:to-gray-600 border-2 border-slate-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 dark:text-white transition-all text-right font-semibold shadow-sm"
                value={filters.limit}
                onChange={(e) =>
                  handleFilterChange("limit", parseInt(e.target.value))
                }
              >
                <option value="10">10 منشورات</option>
                <option value="20">20 منشور</option>
                <option value="50">50 منشور</option>
                <option value="100">100 منشور</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                className="group w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2 font-bold"
                onClick={() => fetchPosts()}
                disabled={loading}
              >
                <RefreshCw
                  className={`w-5 h-5 ${loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`}
                />
                تحديث البيانات
              </button>
            </div>
          </div>
        </div>

        {/* Posts Table */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/30 dark:border-gray-700/30 hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50 transition-all duration-300">
          {loading ? (
            <div className="p-16 text-center">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
                <div className="relative inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
              </div>
              <p className="mt-6 text-slate-600 dark:text-gray-300 font-bold text-lg">
                جاري تحميل المنشورات...
              </p>
              <p className="mt-2 text-slate-500 dark:text-gray-400 text-sm">
                الرجاء الانتظار
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                        معرف المنشور
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                        آخر تعليق
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                        التعليقات
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                        الردود
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                        طريقة الرد
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-slate-100 dark:divide-gray-700">
                    {posts.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="relative inline-block mb-6">
                              <div className="absolute inset-0 bg-blue-200 rounded-full blur-2xl opacity-20"></div>
                              <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-8 rounded-3xl border-2 border-dashed border-blue-200 dark:border-blue-700">
                                <MessageSquare className="w-24 h-24 text-blue-400" />
                              </div>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                              لا يوجد منشورات
                            </h3>
                            <p className="text-slate-500 dark:text-gray-400 text-lg">
                              لم يتم العثور على أي منشورات حتى الآن
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      posts.map((post) => (
                        <tr
                          key={post.postId}
                          className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 dark:hover:bg-gray-700/50 transition-all duration-300 border-l-4 border-transparent hover:border-blue-500"
                        >
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-slate-900 font-mono">
                              {post.postId.substring(0, 10)}...
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {dateFt.format(new Date(
                                post.firstCommentTime,
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {post.latestComment ? (
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {post.latestComment.senderName}
                                </div>
                                <div
                                  className="text-xs text-slate-500 mt-1 max-w-xs truncate"
                                  title={post.latestComment.message}
                                >
                                  {post.latestComment.message}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-slate-500">
                                لا توجد تعليقات
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                                {post.totalComments}
                              </span>
                              <div className="flex gap-1">
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  {post.respondedComments}
                                </span>
                                <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {post.pendingComments}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${post.responseRate}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {post.responseRate}%
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1.5 inline-flex items-center gap-1 text-xs leading-5 font-bold rounded-full ${getResponseMethodColor(post.responseMethod)}`}
                            >
                              {getResponseMethodLabel(post.responseMethod)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleViewComments(post.postId)}
                                className="group px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 flex items-center gap-2"
                              >
                                <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                عرض التعليقات
                              </button>
                              <button
                                onClick={() =>
                                  navigate(`/posts/${post.postId}/settings`)
                                }
                                className="group px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 flex items-center gap-2"
                              >
                                <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                                إعدادات
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 flex items-center justify-between border-t border-slate-200 relative z-20 mb-8 sm:mb-6">
                  <div className="flex-1 flex justify-between sm:hidden relative z-20">
                    <button
                      onClick={() =>
                        handlePageChange(pagination.currentPage - 1)
                      }
                      disabled={pagination.currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border-2 border-slate-300 text-sm font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      السابق
                    </button>
                    <button
                      onClick={() =>
                        handlePageChange(pagination.currentPage + 1)
                      }
                      disabled={
                        pagination.currentPage === pagination.totalPages
                      }
                      className="mr-3 relative inline-flex items-center px-4 py-2 border-2 border-slate-300 text-sm font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      التالي
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-700 font-medium">
                        عرض{" "}
                        <span className="font-bold text-blue-600">
                          {(pagination.currentPage - 1) * filters.limit + 1}
                        </span>{" "}
                        إلى{" "}
                        <span className="font-bold text-blue-600">
                          {Math.min(
                            pagination.currentPage * filters.limit,
                            pagination.totalCount,
                          )}
                        </span>{" "}
                        من{" "}
                        <span className="font-bold text-blue-600">
                          {pagination.totalCount}
                        </span>{" "}
                        نتيجة
                      </p>
                    </div>
                    <div>
                      <nav
                        className="relative z-20 inline-flex rounded-xl shadow-sm gap-1"
                        aria-label="Pagination"
                      >
                        <button
                          onClick={() =>
                            handlePageChange(pagination.currentPage - 1)
                          }
                          disabled={pagination.currentPage === 1}
                          className="relative inline-flex items-center px-3 py-2 rounded-lg bg-white border-2 border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          السابق
                        </button>
                        {[...Array(Math.min(pagination.totalPages, 7))].map(
                          (_, i) => {
                            let page;
                            if (pagination.totalPages <= 7) {
                              page = i + 1;
                            } else if (pagination.currentPage <= 4) {
                              page = i + 1;
                            } else if (
                              pagination.currentPage >=
                              pagination.totalPages - 3
                            ) {
                              page = pagination.totalPages - 6 + i;
                            } else {
                              page = pagination.currentPage - 3 + i;
                            }

                            return (
                              <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`relative inline-flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${page === pagination.currentPage
                                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105"
                                    : "bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50"
                                  }`}
                              >
                                {page}
                              </button>
                            );
                          },
                        )}
                        <button
                          onClick={() =>
                            handlePageChange(pagination.currentPage + 1)
                          }
                          disabled={
                            pagination.currentPage === pagination.totalPages
                          }
                          className="relative inline-flex items-center px-3 py-2 rounded-lg bg-white border-2 border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          التالي
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {confirmState && (
        <ConfirmDialog
          open={true}
          title={confirmState.title}
          content={confirmState.content}
          confirmColor={confirmState.confirmColor || "primary"}
          onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
};

export default UnifiedCommentsManagement;
