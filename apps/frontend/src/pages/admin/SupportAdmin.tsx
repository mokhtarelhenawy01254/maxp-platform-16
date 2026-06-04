import React, { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Calendar,
  Tag,
  User,
  BarChart3,
  Plus,
  Eye,
  Edit,
  Trash2,
  Settings,
} from "lucide-react";
import supportService, {
  Ticket,
  FAQ,
  TicketStats,
} from "../../services/supportService";
import ThemeToggle from "../../components/ui/theme-toggle";
import { useAuth } from "../../hooks/useAuthSimple";

const SupportAdmin: React.FC = () => {
  const { user } = useAuth();

  // فحص الصلاحيات - فقط Super Admin يمكنه الوصول
  if (!user || user.role !== "SUPER_ADMIN") {
    return <Navigate to="/support" replace />;
  }

  const [activeTab, setActiveTab] = useState<"tickets" | "faq" | "stats">(
    "tickets",
  );

  // Tickets State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketStats, setTicketStats] = useState<TicketStats[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // FAQ State
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [faqsLoading, setFaqsLoading] = useState(false);
  const [showFAQForm, setShowFAQForm] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [faqFormData, setFaqFormData] = useState({
    question: "",
    answer: "",
    category: "general",
    tags: "",
    order: 0,
  });

  const statusOptions = [
    { value: "", label: "جميع الحالات" },
    { value: "open", label: "مفتوح" },
    { value: "in_progress", label: "قيد المعالجة" },
    { value: "closed", label: "مغلق" },
  ];

  const categoryOptions = [
    { value: "", label: "جميع الأنواع" },
    { value: "technical", label: "تقني" },
    { value: "billing", label: "فواتير" },
    { value: "inquiry", label: "استفسار" },
    { value: "suggestion", label: "اقتراح" },
    { value: "complaint", label: "شكوى" },
  ];

  const faqCategoryOptions = [
    { value: "general", label: "عام" },
    { value: "technical", label: "تقني" },
    { value: "billing", label: "فواتير" },
    { value: "woocommerce", label: "WooCommerce" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "facebook_ads", label: "إعلانات فيسبوك" },
  ];

  useEffect(() => {
    if (activeTab === "tickets") {
      fetchTickets();
    } else if (activeTab === "faq") {
      fetchFAQs();
    }
  }, [activeTab, currentPage, statusFilter, categoryFilter]);

  const fetchTickets = async () => {
    try {
      setTicketsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
      });

      if (statusFilter) params.append("status", statusFilter);
      if (categoryFilter) params.append("category", categoryFilter);
      if (searchTerm) params.append("search", searchTerm);

      const data = await supportService.getAllTickets(params);

      if (data.success) {
        setTickets(data.tickets);
        setTicketStats(data.stats || []);
        setTotalPages(data.pagination.pages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setTicketsLoading(false);
    }
  };

  const fetchFAQs = async () => {
    try {
      setFaqsLoading(true);
      const data = await supportService.getAdminFAQs();

      if (data.success) {
        setFaqs(data.faqs);
      }
    } catch (error) {
      console.error("Error fetching FAQs:", error);
    } finally {
      setFaqsLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const data = await supportService.updateTicketStatus(ticketId, status);

      if (data.success) {
        fetchTickets(); // Refresh tickets
      }
    } catch (error) {
      console.error("Error updating ticket status:", error);
    }
  };

  const handleFAQSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        ...faqFormData,
        tags: faqFormData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
      };

      let responseData;
      if (editingFAQ) {
        responseData = await supportService.updateFAQ(editingFAQ._id, data);
      } else {
        responseData = await supportService.createFAQ(data);
      }

      if (responseData.success) {
        setShowFAQForm(false);
        setEditingFAQ(null);
        setFaqFormData({
          question: "",
          answer: "",
          category: "general",
          tags: "",
          order: 0,
        });
        fetchFAQs();
      }
    } catch (error) {
      console.error("Error saving FAQ:", error);
    }
  };

  const deleteFAQ = async (faqId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا السؤال؟")) return;

    try {
      const data = await supportService.deleteFAQ(faqId);

      if (data.success) {
        fetchFAQs();
      }
    } catch (error) {
      console.error("Error deleting FAQ:", error);
    }
  };

  const editFAQ = (faq: FAQ) => {
    setEditingFAQ(faq);
    setFaqFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      tags: faq.tags?.join(", ") || "",
      order: 0,
    });
    setShowFAQForm(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <Clock className="w-4 h-4 text-orange-500" />;
      case "in_progress":
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case "closed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "open":
        return "مفتوح";
      case "in_progress":
        return "قيد المعالجة";
      case "closed":
        return "مغلق";
      default:
        return status;
    }
  };

  const getCategoryText = (category: string) => {
    const categories: { [key: string]: string } = {
      technical: "تقني",
      billing: "فواتير",
      inquiry: "استفسار",
      suggestion: "اقتراح",
      complaint: "شكوى",
      general: "عام",
      woocommerce: "WooCommerce",
      whatsapp: "WhatsApp",
      facebook_ads: "إعلانات فيسبوك",
    };
    return categories[category] || category;
  };

  const getStatsCount = (status: string) => {
    const stat = ticketStats.find((s) => s._id === status);
    return stat ? stat.count : 0;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                إدارة الدعم الفني
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                إدارة تذاكر الدعم والأسئلة الشائعة
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  مفتوح
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getStatsCount("open")}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  قيد المعالجة
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getStatsCount("in_progress")}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  مغلق
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getStatsCount("closed")}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full">
                <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  الإجمالي
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {total}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 space-x-reverse px-6">
              <button
                onClick={() => setActiveTab("tickets")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "tickets"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <MessageSquare className="w-5 h-5 inline ml-2" />
                التذاكر
              </button>
              <button
                onClick={() => setActiveTab("faq")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "faq"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <Settings className="w-5 h-5 inline ml-2" />
                الأسئلة الشائعة
              </button>
            </nav>
          </div>

          {/* Tickets Tab */}
          {activeTab === "tickets" && (
            <div className="p-6">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="البحث في التذاكر..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && fetchTickets()}
                      className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tickets List */}
              {ticketsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          التذكرة
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          العميل
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          الحالة
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          النوع
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          التاريخ
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          الإجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {tickets.map((ticket) => (
                        <tr
                          key={ticket.ticketId || ticket._id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {ticket.subject}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                #{ticket.ticketId}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-2" />
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {ticket.userId.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {ticket.userId.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getStatusIcon(ticket.status)}
                              <select
                                value={ticket.status}
                                onChange={(e) =>
                                  updateTicketStatus(
                                    ticket.ticketId,
                                    e.target.value,
                                  )
                                }
                                className="mr-2 text-sm border-none bg-transparent dark:bg-gray-800 dark:text-white focus:ring-0"
                              >
                                <option value="open">مفتوح</option>
                                <option value="in_progress">
                                  قيد المعالجة
                                </option>
                                <option value="closed">مغلق</option>
                              </select>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full">
                              {getCategoryText(ticket.category)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(ticket.createdAt).toLocaleDateString(
                              "ar-EG",
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              to={`/support/tickets/${ticket.ticketId}`}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 inline-flex items-center"
                            >
                              <Eye className="w-4 h-4 ml-1" />
                              عرض
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 space-x-reverse mt-6">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    السابق
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}

                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    التالي
                  </button>
                </div>
              )}
            </div>
          )}

          {/* FAQ Tab */}
          {activeTab === "faq" && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  إدارة الأسئلة الشائعة
                </h2>
                <button
                  onClick={() => setShowFAQForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة سؤال
                </button>
              </div>

              {/* FAQ Form */}
              {showFAQForm && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {editingFAQ ? "تعديل السؤال" : "إضافة سؤال جديد"}
                  </h3>
                  <form onSubmit={handleFAQSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        السؤال *
                      </label>
                      <input
                        type="text"
                        value={faqFormData.question}
                        onChange={(e) =>
                          setFaqFormData((prev) => ({
                            ...prev,
                            question: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الإجابة *
                      </label>
                      <textarea
                        value={faqFormData.answer}
                        onChange={(e) =>
                          setFaqFormData((prev) => ({
                            ...prev,
                            answer: e.target.value,
                          }))
                        }
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          الفئة *
                        </label>
                        <select
                          value={faqFormData.category}
                          onChange={(e) =>
                            setFaqFormData((prev) => ({
                              ...prev,
                              category: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        >
                          {faqCategoryOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          الكلمات المفتاحية (مفصولة بفاصلة)
                        </label>
                        <input
                          type="text"
                          value={faqFormData.tags}
                          onChange={(e) =>
                            setFaqFormData((prev) => ({
                              ...prev,
                              tags: e.target.value,
                            }))
                          }
                          placeholder="مثال: واتساب، رسائل، تكامل"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-4 space-x-reverse">
                      <button
                        type="button"
                        onClick={() => {
                          setShowFAQForm(false);
                          setEditingFAQ(null);
                          setFaqFormData({
                            question: "",
                            answer: "",
                            category: "general",
                            tags: "",
                            order: 0,
                          });
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        {editingFAQ ? "تحديث" : "إضافة"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* FAQ List */}
              {faqsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <div
                      key={faq._id || `faq-${index}`}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            {faq.question}
                          </h4>
                          <p className="text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">
                            {faq.answer}
                          </p>
                          <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-500 dark:text-gray-400">
                            <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-2 py-1 rounded">
                              {getCategoryText(faq.category)}
                            </span>
                            <span>👍 {faq.helpful}</span>
                            <span>👎 {faq.notHelpful}</span>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                faq.isActive
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                                  : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                              }`}
                            >
                              {faq.isActive ? "نشط" : "غير نشط"}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2 space-x-reverse mr-4">
                          <button
                            onClick={() => editFAQ(faq)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteFAQ(faq._id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportAdmin;
