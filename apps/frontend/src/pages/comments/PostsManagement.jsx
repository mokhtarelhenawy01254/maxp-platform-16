import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CommentService from "../../services/commentService";
import {
  MessageSquare,
  Search,
  Settings,
  Layers,
  Facebook,
  Rss,
  Eye,
  MessageCircle,
  Clock
} from "lucide-react";

const PostsManagement = ({ embedded = false, defaultPlatform = null }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [pages, setPages] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingPages, setLoadingPages] = useState(true);
  
  const [pagesSearch, setPagesSearch] = useState("");
  const [postsSearch, setPostsSearch] = useState("");
  
  const [enableDelayReply, setEnableDelayReply] = useState(true);

  useEffect(() => {
    fetchPages();
  }, []);

  useEffect(() => {
    if (selectedPage) {
      fetchPosts();
    } else {
      setPosts([]);
    }
  }, [selectedPage]);

  const fetchPages = async () => {
    setLoadingPages(true);
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
    } finally {
      setLoadingPages(false);
    }
  };

  const fetchPosts = async () => {
    if (!selectedPage) return;
    setLoading(true);
    try {
      const response = await CommentService.getPostsByPageId(selectedPage);
      if (response.success) {
        setPosts(response.data);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPages = useMemo(() => {
    if (!pagesSearch.trim()) return pages;
    return pages.filter((p) => 
      p.pageName.toLowerCase().includes(pagesSearch.toLowerCase()) || 
      p.pageId.includes(pagesSearch)
    );
  }, [pages, pagesSearch]);

  const filteredPosts = useMemo(() => {
    if (!postsSearch.trim()) return posts;
    return posts.filter((p) => 
      (p.message && p.message.toLowerCase().includes(postsSearch.toLowerCase())) || 
      p.postId.includes(postsSearch)
    );
  }, [posts, postsSearch]);

  const selectedPageObj = pages.find((p) => p.pageId === selectedPage);

  // Time ago formatter (e.g. 4 Years Ago)
  const timeAgo = (date) => {
    if (!date) return "";
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " Years Ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " Months Ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " Days Ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " Hours Ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " Minutes Ago";
    return Math.floor(seconds) + " Seconds Ago";
  };

  return (
    <div className={`flex flex-col ${embedded ? 'h-full' : 'h-[calc(100vh-64px)]'} bg-[#f3f4f6]`}>
      {/* Top Header */}
      <div className="bg-white m-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-[#6b52a3]" />
          <h1 className="text-xl font-bold text-[#6b52a3]">Facebook comment automation campaign</h1>
        </div>
        <div className="text-xs text-blue-400 font-medium flex gap-2 items-center">
          <span className="hover:underline cursor-pointer">Comment growth tools</span>
          <span className="text-gray-400">/</span>
          <span className="text-[#6b52a3]">Facebook comment automation campaign</span>
        </div>
      </div>

      {/* Main 3 Columns */}
      <div className="flex-1 overflow-hidden flex gap-4 px-4 pb-4">
        
        {/* Left Column: Pages */}
        <div className="w-[300px] bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-[#6b52a3]">
              <Layers className="w-5 h-5" />
              <span>Pages</span>
            </div>
            <div className="relative w-32">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search pages..." 
                className="w-full text-xs pl-7 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
            ) : (
              filteredPages.map((page) => (
                <div 
                  key={page.pageId}
                  onClick={() => setSelectedPage(page.pageId)}
                  className={`flex items-center gap-3 p-4 cursor-pointer transition-colors border-l-4 ${
                    selectedPage === page.pageId 
                      ? "bg-[#6b52a3] text-white border-transparent" 
                      : "hover:bg-gray-50 text-gray-700 border-transparent"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    <img src={`https://graph.facebook.com/${page.pageId}/picture?type=small`} alt={page.pageName} onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(page.pageName) + '&background=random'; }} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <h3 className="font-bold text-sm truncate">{page.pageName}</h3>
                    <p className={`text-[10px] mt-1 ${selectedPage === page.pageId ? 'text-indigo-100' : 'text-gray-500'}`}>{page.pageId}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Middle Column: Page Details */}
        <div className="w-[350px] bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-shrink-0">
          {selectedPageObj ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex items-center gap-2 text-[#6b52a3]">
                <div className="bg-[#6b52a3] p-1.5 rounded-md text-white">
                   <Facebook className="w-5 h-5 fill-current" />
                </div>
                <h2 className="font-bold text-lg">{selectedPageObj.pageName}</h2>
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                {/* Toggle */}
                <div className="flex items-center justify-between mb-8 text-[#6b52a3]">
                  <span className="font-bold">Enable Delay Reply</span>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setEnableDelayReply(!enableDelayReply)}
                      className={`w-12 h-6 rounded-full relative transition-colors ${enableDelayReply ? 'bg-[#6b52a3]' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${enableDelayReply ? 'right-1' : 'right-7'}`}></span>
                    </button>
                    <span className="font-bold">{enableDelayReply ? 'On' : 'Off'}</span>
                  </div>
                </div>
                
                {/* Stats Boxes */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl bg-[#f8f9fa] relative">
                    <div className="bg-[#eef2fc] p-3 rounded-lg text-[#6b52a3]">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-gray-700">Auto reply enabled posts</h4>
                      <p className="text-xs text-gray-400 mt-1">Response : 0 • Not replied yet</p>
                    </div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-200 text-gray-600 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">1</div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl bg-[#eef8fc] relative">
                    <div className="bg-[#dcf0f9] p-3 rounded-lg text-[#3bb0d9]">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-gray-700">Auto comment enabled posts</h4>
                      <p className="text-xs text-gray-400 mt-1">Comments : 0 • Not commented yet</p>
                    </div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-200 text-gray-600 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">0</div>
                  </div>
                </div>
                
                <div className="mt-auto pt-6 flex justify-center">
                  <button className="px-6 py-2 bg-white border border-gray-200 text-[#6b52a3] font-bold text-sm rounded-lg shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    See campaign reports ▾
                  </button>
                </div>
              </div>
            </>
          ) : (
             <div className="flex items-center justify-center h-full text-gray-400 font-medium">
               Select a page
             </div>
          )}
        </div>

        {/* Right Column: Latest Posts */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col min-w-0">
          <div className="h-[60px] bg-gradient-to-r from-[#6b52a3] via-[#ab5498] to-[#e84b5c] rounded-t-xl flex items-center justify-between px-6 flex-shrink-0">
             <div className="flex items-center gap-2 text-white font-bold text-lg">
                <Rss className="w-5 h-5" />
                <span>Latest posts</span>
             </div>
             <div className="flex items-center gap-4">
               <button className="bg-white hover:bg-gray-50 text-[#e84b5c] text-sm font-bold px-5 py-1.5 rounded-full shadow-sm transition-colors">
                 Set campaign by ID
               </button>
               <input 
                  type="text" 
                  placeholder="Search..." 
                  className="w-56 text-sm px-4 py-1.5 rounded-full bg-white text-gray-700 focus:outline-none shadow-sm"
                  value={postsSearch}
                  onChange={(e) => setPostsSearch(e.target.value)}
               />
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
             {loading ? (
               <div className="flex justify-center py-10">
                 <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
               </div>
             ) : (
               <div className="flex flex-col gap-6">
                   {!selectedPage ? (
                     <div className="text-center py-10 text-gray-400 font-medium">
                       اختر صفحة من القائمة لعرض المنشورات
                     </div>
                   ) : filteredPosts.length === 0 ? (
                     <div className="text-center py-10 text-gray-500 font-medium">No posts found</div>
                   ) : (
                    filteredPosts.map((post) => (
                      <div key={post.postId} className="flex gap-4">
                        <div className="relative w-[80px] h-[80px] flex-shrink-0">
                           <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 border-2 border-white shadow-md">
                             {post.pictureUrl ? (
                               <img src={post.pictureUrl} alt="Post" className="w-full h-full object-cover" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center text-gray-400">
                                 <MessageSquare className="w-6 h-6" />
                               </div>
                             )}
                           </div>
                           <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md border border-gray-100">
                             <Settings className="w-4 h-4 text-blue-500" />
                           </div>
                        </div>
                        <div className="flex-1 pt-1" style={{ direction: 'rtl' }}>
                           <p className="text-[13px] font-bold text-gray-800 line-clamp-2 leading-relaxed">
                             {post.message || 'بدون نص'}
                           </p>
                           <div className="flex items-center justify-end gap-2 mt-3" style={{ direction: 'ltr' }}>
                              <div className="text-[11px] font-bold text-[#145d8b] flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {timeAgo(post.firstCommentTime || post.lastCommentTime)} : 
                              </div>
                              <div className="flex items-center gap-1 text-[11px] font-bold bg-[#1877f2] text-white px-2.5 py-1 rounded-md shadow-sm">
                                <span>POST</span>
                                <span>{post.postId}</span>
                              </div>
                           </div>
                        </div>
                      </div>
                    ))
                  )}
               </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PostsManagement;
