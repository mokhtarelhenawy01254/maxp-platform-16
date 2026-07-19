import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CommentService from "../../services/commentService";
import {
  MessageSquare,
  Search,
  Settings,
  Layers,
  Rss,
  Eye,
  MessageCircle,
  Clock,
  ChevronDown,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const PostsManagement = ({ embedded = false }) => {
  const navigate = useNavigate();

  const [pages, setPages] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [pageSettings, setPageSettings] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingPages, setLoadingPages] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);

  const [pagesSearch, setPagesSearch] = useState("");
  const [postsSearch, setPostsSearch] = useState("");

  const [enableDelayReply, setEnableDelayReply] = useState(true);
  const [showMobilePages, setShowMobilePages] = useState(false);

  useEffect(() => {
    fetchPages();
  }, []);

  useEffect(() => {
    if (selectedPage) {
      fetchPosts();
      fetchPageSettings();
      setShowMobilePages(false);
    } else {
      setPosts([]);
      setPageSettings(null);
    }
  }, [selectedPage]);

  const fetchPages = async () => {
    setLoadingPages(true);
    setError(null);
    try {
      const response = await CommentService.getFacebookPages();
      if (response.success && response.data) {
        setPages(response.data);
        if (response.data.length > 0 && !selectedPage) {
          setSelectedPage(response.data[0].pageId);
        }
      }
    } catch (error) {
      console.error("Error fetching pages:", error);
      setError("فشل تحميل الصفحات. يرجى المحاولة مرة أخرى.");
      setErrorType("pages");
    } finally {
      setLoadingPages(false);
    }
  };

  const fetchPosts = async () => {
    if (!selectedPage) return;
    setLoading(true);
    setError(null);
    try {
      const response = await CommentService.getPostsByPageId(selectedPage);
      if (response.success) {
        setPosts(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      setError("فشل تحميل المنشورات. يرجى المحاولة مرة أخرى.");
      setErrorType("posts");
    } finally {
      setLoading(false);
    }
  };

  const fetchPageSettings = async () => {
    if (!selectedPage) return;
    try {
      const response = await CommentService.getPageResponseMethod(selectedPage);
      if (response.success && response.data) {
        setPageSettings(response.data);
        if (response.data.delayReply !== undefined) {
          setEnableDelayReply(response.data.delayReply);
        }
      }
    } catch (error) {
      console.error("Error fetching page settings:", error);
    }
  };

  const toggleDelayReply = async () => {
    const newValue = !enableDelayReply;
    setEnableDelayReply(newValue);
    setSavingSettings(true);
    try {
      await CommentService.setPageResponseMethod(selectedPage, {
        ...pageSettings,
        delayReply: newValue,
      });
    } catch (error) {
      setEnableDelayReply(!newValue);
      console.error("Error saving delay reply setting:", error);
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredPages = useMemo(() => {
    if (!pagesSearch.trim()) return pages;
    const q = pagesSearch.toLowerCase();
    return pages.filter(
      (p) =>
        p.pageName?.toLowerCase().includes(q) || p.pageId?.includes(q),
    );
  }, [pages, pagesSearch]);

  const filteredPosts = useMemo(() => {
    if (!postsSearch.trim()) return posts;
    const q = postsSearch.toLowerCase();
    return posts.filter(
      (p) =>
        (p.message && p.message.toLowerCase().includes(q)) ||
        p.postId?.includes(q),
    );
  }, [posts, postsSearch]);

  const selectedPageObj = pages.find((p) => p.pageId === selectedPage);

  const timeAgo = (date) => {
    if (!date) return "";
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = [
      { s: 31536000, l: "سنة", p: "سنوات" },
      { s: 2592000, l: "شهر", p: "أشهر" },
      { s: 86400, l: "يوم", p: "أيام" },
      { s: 3600, l: "ساعة", p: "ساعات" },
      { s: 60, l: "دقيقة", p: "دقائق" },
    ];
    for (const i of intervals) {
      const c = seconds / i.s;
      if (c >= 2) return `${Math.floor(c)} ${i.p} مضت`;
      if (c >= 1) return `${Math.floor(c)} ${i.l} مضت`;
    }
    return "منذ لحظات";
  };

  const getResponseMethodLabel = (method) => {
    switch (method) {
      case "ai":
        return "رد تلقائي";
      case "fixed":
        return "رد محدد";
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

  const imgErrorHandler = (e, name) => {
    e.target.src =
      "https://ui-avatars.com/api/?name=" +
      encodeURIComponent(name || "Page") +
      "&background=random";
  };

  return (
    <div
      className={`flex flex-col ${embedded ? "h-full" : "h-screen"} bg-[#f3f4f6] overflow-hidden`}
    >
      {/* Top Header */}
      <div className="bg-white m-2 md:m-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 py-3 md:py-4 flex-shrink-0 gap-2">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-[#6b52a3] flex-shrink-0" />
          <h1 className="text-base md:text-xl font-bold text-[#6b52a3]">
            حملة أتمتة تعليقات فيسبوك
          </h1>
        </div>
        <div className="text-[10px] md:text-xs text-blue-400 font-medium flex gap-1 md:gap-2 items-center">
          <span className="hover:underline cursor-pointer">
            أدوات نمو التعليقات
          </span>
          <span className="text-gray-400">/</span>
          <span className="text-[#6b52a3] whitespace-nowrap">
            حملة أتمتة تعليقات فيسبوك
          </span>
        </div>
      </div>

      {/* Settings Bar (replaces middle column - moved to top) */}
      {selectedPageObj && (
        <div className="bg-white mx-2 md:mx-4 mb-2 md:mb-4 rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 flex-shrink-0">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                <img
                  src={`https://graph.facebook.com/${selectedPageObj.pageId}/picture?type=small`}
                  alt={selectedPageObj.pageName}
                  onError={(e) =>
                    imgErrorHandler(e, selectedPageObj.pageName)
                  }
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div>
                <h2 className="font-bold text-sm md:text-base text-gray-800">
                  {selectedPageObj.pageName}
                </h2>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getResponseMethodColor(pageSettings?.responseMethod)}`}
                >
                  {getResponseMethodLabel(pageSettings?.responseMethod)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 md:gap-6 w-full md:w-auto">
              {/* Delay Reply Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-bold text-gray-600 whitespace-nowrap">
                  تأخير الرد
                </span>
                <button
                  onClick={toggleDelayReply}
                  disabled={savingSettings}
                  className={`w-10 h-5 md:w-12 md:h-6 rounded-full relative transition-colors ${enableDelayReply ? "bg-[#6b52a3]" : "bg-gray-300"} ${savingSettings ? "opacity-50" : ""}`}
                >
                  <span
                    className={`absolute top-0.5 md:top-1 w-3.5 h-3.5 md:w-4 md:h-4 bg-white rounded-full transition-all ${enableDelayReply ? "right-0.5 md:right-1" : "right-5 md:right-7"}`}
                  ></span>
                </button>
                <span className="text-[10px] md:text-xs font-bold text-gray-500">
                  {enableDelayReply ? "تشغيل" : "إيقاف"}
                </span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-2 md:gap-4">
                <div className="flex items-center gap-1.5 bg-[#f8f9fa] px-2.5 py-1.5 rounded-lg border border-gray-100">
                  <MessageCircle className="w-3.5 h-3.5 text-[#6b52a3]" />
                  <span className="text-[10px] md:text-xs font-bold text-gray-700 whitespace-nowrap">
                    الرد التلقائي
                  </span>
                  <span className="bg-gray-200 text-gray-600 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {posts.filter(
                      (p) =>
                        p.responseMethod === "ai" ||
                        p.responseMethod === "fixed",
                    ).length}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#eef8fc] px-2.5 py-1.5 rounded-lg border border-gray-100">
                  <MessageSquare className="w-3.5 h-3.5 text-[#3bb0d9]" />
                  <span className="text-[10px] md:text-xs font-bold text-gray-700 whitespace-nowrap">
                    التعليقات
                  </span>
                  <span className="bg-gray-200 text-gray-600 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {posts.reduce((sum, p) => sum + (p.totalComments || 0), 0)}
                  </span>
                </div>
              </div>

              <Button variant="outline" size="sm" className="text-[#6b52a3] font-bold text-[10px] md:text-xs shadow-sm gap-1.5">
                <Eye className="w-3 h-3 md:w-3.5 md:h-3.5" />
                تقارير الحملة ▾
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mx-2 md:mx-4 mb-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-red-700 text-sm flex-shrink-0">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => errorType === "pages" ? fetchPages() : fetchPosts()}
            className="text-red-600 hover:text-red-800 font-bold ml-2 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            إعادة المحاولة
          </button>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 font-bold text-lg"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Content: 2 Columns (Pages | Posts) */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-2 md:gap-4 px-2 md:px-4 pb-2 md:pb-4 min-h-0">
        {/* Mobile: Pages Dropdown */}
        <div className="md:hidden flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <button
              onClick={() => setShowMobilePages(!showMobilePages)}
              className="w-full flex items-center justify-between px-4 py-3 text-[#6b52a3] font-bold"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                <span>الصفحات ({filteredPages.length})</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showMobilePages ? "rotate-180" : ""}`}
              />
            </button>
            {showMobilePages && (
              <div className="border-t border-gray-100 max-h-48 overflow-y-auto">
                {loadingPages ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent"></div>
                  </div>
                ) : (
                  filteredPages.map((page) => (
                    <div
                      key={page.pageId}
                      onClick={() => setSelectedPage(page.pageId)}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-r-4 ${
                        selectedPage === page.pageId
                          ? "bg-[#6b52a3] text-white border-transparent"
                          : "hover:bg-gray-50 text-gray-700 border-transparent"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        <img
                          src={`https://graph.facebook.com/${page.pageId}/picture?type=small`}
                          alt={page.pageName}
                          onError={(e) => imgErrorHandler(e, page.pageName)}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <h3 className="font-bold text-sm truncate">
                          {page.pageName}
                        </h3>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Left Column: Pages (desktop) */}
        <div className="hidden md:flex w-[260px] lg:w-[300px] bg-white rounded-xl shadow-sm border border-gray-100 flex-col flex-shrink-0">
          <div className="p-3 md:p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-[#6b52a3] text-sm md:text-base">
              <Layers className="w-4 h-4 md:w-5 md:h-5" />
              <span>الصفحات</span>
            </div>
            <div className="relative w-24 md:w-32">
              <Search className="w-3 h-3 md:w-3.5 md:h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="بحث..."
                className="w-full text-[10px] md:text-xs pl-6 md:pl-7 pr-1.5 md:pr-2 py-1 md:py-1.5 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={pagesSearch}
                onChange={(e) => setPagesSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingPages ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
              </div>
            ) : filteredPages.length === 0 ? (
              <div className="text-center py-10 text-gray-400 font-medium text-sm">
                لا توجد صفحات
              </div>
            ) : (
              filteredPages.map((page) => (
                <div
                  key={page.pageId}
                  onClick={() => setSelectedPage(page.pageId)}
                  className={`flex items-center gap-3 p-3 md:p-4 cursor-pointer transition-colors border-l-4 ${
                    selectedPage === page.pageId
                      ? "bg-[#6b52a3] text-white border-transparent"
                      : "hover:bg-gray-50 text-gray-700 border-transparent"
                  }`}
                >
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    <img
                      src={`https://graph.facebook.com/${page.pageId}/picture?type=small`}
                      alt={page.pageName}
                      onError={(e) => imgErrorHandler(e, page.pageName)}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <h3 className="font-bold text-xs md:text-sm truncate">
                      {page.pageName}
                    </h3>
                    <p
                      className={`text-[9px] md:text-[10px] mt-0.5 ${selectedPage === page.pageId ? "text-indigo-100" : "text-gray-500"}`}
                    >
                      {page.pageId}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Latest Posts */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col min-w-0 overflow-hidden">
          <div className="bg-gradient-to-r from-[#6b52a3] via-[#ab5498] to-[#e84b5c] rounded-t-xl flex items-center justify-between px-3 md:px-6 py-2 md:py-3 flex-shrink-0">
            <div className="flex items-center gap-1.5 md:gap-2 text-white font-bold text-sm md:text-lg">
              <Rss className="w-4 h-4 md:w-5 md:h-5" />
              <span>آخر المنشورات</span>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <button className="hidden md:inline-flex bg-white hover:bg-gray-50 text-[#e84b5c] text-[10px] md:text-sm font-bold px-3 md:px-5 py-1 md:py-1.5 rounded-full shadow-sm transition-colors whitespace-nowrap">
                تعيين حملة بالمعرف
              </button>
              <input
                type="text"
                placeholder="بحث..."
                className="w-28 md:w-56 text-[10px] md:text-sm px-2 md:px-4 py-1 md:py-1.5 rounded-full bg-white text-gray-700 focus:outline-none shadow-sm"
                value={postsSearch}
                onChange={(e) => setPostsSearch(e.target.value)}
              />
              <button
                onClick={() => fetchPosts()}
                className="p-1.5 md:p-2 text-white/80 hover:text-white transition-colors"
                title="تحديث"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 md:p-6">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
              </div>
            ) : !selectedPage ? (
              <div className="text-center py-10 text-gray-400 font-medium text-sm">
                اختر صفحة من القائمة لعرض المنشورات
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-10 text-gray-500 font-medium text-sm">
                {posts.length > 0 ? "لا توجد نتائج مطابقة للبحث" : "لا توجد منشورات"}
              </div>
            ) : (
              <div className="flex flex-col gap-4 md:gap-6">
                {filteredPosts.map((post) => (
                  <div
                    key={post.postId}
                    className="flex flex-col md:flex-row gap-3 md:gap-4 p-3 md:p-0 bg-gray-50 md:bg-transparent rounded-xl md:rounded-none"
                  >
                    <div className="flex items-center gap-3 md:block">
                      <div className="relative w-12 h-12 md:w-[80px] md:h-[80px] flex-shrink-0">
                        <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 border-2 border-white shadow-md">
                          {post.pictureUrl ? (
                            <img
                              src={post.pictureUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <MessageSquare className="w-4 h-4 md:w-6 md:h-6" />
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() =>
                            navigate(`/posts/${post.postId}/settings`)
                          }
                          className="absolute -bottom-1 -left-1 md:bottom-0 md:right-0 bg-white rounded-full p-0.5 md:p-1 shadow-md border border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="w-3 h-3 md:w-4 md:h-4 text-blue-500" />
                        </button>
                      </div>
                      {post.responseMethod && (
                        <span
                          className={`md:hidden px-1.5 py-0.5 text-[9px] font-bold rounded-full ${getResponseMethodColor(post.responseMethod)}`}
                        >
                          {getResponseMethodLabel(post.responseMethod)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] md:text-[13px] font-bold text-gray-800 line-clamp-2 leading-relaxed">
                        {post.message || "بدون نص"}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mt-2">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <div className="text-[10px] md:text-[11px] font-bold text-[#145d8b] flex items-center gap-1">
                            <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            {timeAgo(
                              post.firstCommentTime || post.lastCommentTime,
                            )}
                          </div>
                          <div className="hidden md:flex items-center gap-1 text-[10px] md:text-[11px] font-bold bg-[#1877f2] text-white px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md shadow-sm">
                            <span>POST</span>
                            <span>{post.postId?.substring(0, 8)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {post.responseMethod && (
                            <span
                              className={`hidden md:inline-flex px-1.5 py-0.5 text-[9px] md:text-[10px] font-bold rounded-full ${getResponseMethodColor(post.responseMethod)}`}
                            >
                              {getResponseMethodLabel(post.responseMethod)}
                            </span>
                          )}
                          <button
                            onClick={() =>
                              navigate(`/posts/${post.postId}/comments`)
                            }
                            className="px-2 md:px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] md:text-xs rounded-lg font-medium transition-colors"
                          >
                            التعليقات
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostsManagement;
