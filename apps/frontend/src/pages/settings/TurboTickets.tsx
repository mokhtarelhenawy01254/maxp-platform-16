import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import i18n from "../../i18n";
import { tToast } from "../../utils/i18n-toast";
import {
    TicketIcon,
    PlusCircleIcon,
    ChevronRightIcon,
    ArrowPathIcon,
    PaperAirplaneIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";

const TurboTickets: React.FC = () => {
    const navigate = useNavigate();

    // --- List state ---
    const [tickets, setTickets] = useState<any[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [ticketsPage, setTicketsPage] = useState(1);
    const ticketsPerPage = 10;
    const [ticketsTotal, setTicketsTotal] = useState(0);

    // --- New ticket form state ---
    const [showForm, setShowForm] = useState(false);
    const [ticketDescription, setTicketDescription] = useState("");
    const [inquiryTypeId, setInquiryTypeId] = useState<number | "">("");
    const [sendingTicket, setSendingTicket] = useState(false);
    const [inquiriesTypes, setInquiriesTypes] = useState<any[]>([]);
    const [loadingTypes, setLoadingTypes] = useState(false);

    const loadTickets = async () => {
        try {
            setLoadingTickets(true);
            const response = await apiClient.get(
                `/turbo/tickets?page=${ticketsPage}&per_page=${ticketsPerPage}`
            );
            if (response.data.success) {
                const ticketsData = response.data.data?.tickets || response.data.data || [];
                const paginationData = response.data.data?.pagination || {};
                setTickets(Array.isArray(ticketsData) ? ticketsData : []);
                setTicketsTotal(paginationData.total || 0);
            } else {
                setTickets([]);
                setTicketsTotal(0);
            }
        } catch (error) {
            console.error("Error loading tickets:", error);
            tToast.error("settings_TurboTickets.failed_load_c772");
            setTickets([]);
        } finally {
            setLoadingTickets(false);
        }
    };

    const loadInquiriesTypes = async () => {
        try {
            setLoadingTypes(true);
            const response = await apiClient.get("/turbo/inquiries-types");
            if (response.data.success) {
                const types =
                    response.data.data?.types ||
                    response.data.data?.inquiriesTypes ||
                    [];
                setInquiriesTypes(Array.isArray(types) ? types : []);
            }
        } catch (error) {
            console.error("Error loading inquiry types:", error);
            // Silently fail — form still works with manual input
        } finally {
            setLoadingTypes(false);
        }
    };

    useEffect(() => {
        loadTickets();
    }, [ticketsPage]);

    useEffect(() => {
        if (showForm && inquiriesTypes.length === 0) {
            loadInquiriesTypes();
        }
    }, [showForm]);

    const handleViewTicket = (ticketId: number) => {
        navigate(`/settings/turbo/ticket/${ticketId}`);
    };

    const handleSendTicket = async () => {
        if (!ticketDescription.trim()) {
            tToast.error("settings_TurboTickets.msg_1e25");
            return;
        }
        if (!inquiryTypeId) {
            tToast.error("settings_TurboTickets.msg_4493");
            return;
        }
        try {
            setSendingTicket(true);
            const response = await apiClient.post("/turbo/tickets", {
                description: ticketDescription.trim(),
                content: ticketDescription.trim(),
                type: Number(inquiryTypeId),
                inquiryTypeId: Number(inquiryTypeId),
                categoryId: Number(inquiryTypeId),
            });
            if (response.data.success) {
                tToast.success("settings_TurboTickets.success_send_9cde");
                setTicketDescription("");
                setInquiryTypeId("");
                setShowForm(false);
                loadTickets(); // refresh the list
            } else {
                toast.error(response.data.message || i18n.t("settings_TurboTickets.failed_send_e199"));
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || "حدث خطأ أثناء إرسال التذكرة");
            console.error("Error sending ticket:", error);
        } finally {
            setSendingTicket(false);
        }
    };

    const getStatusLabel = (status: number) => {
        switch (status) {
            case 0: return { label: "جديد", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" };
            case 1: return { label: "قيد المعالجة", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" };
            case 2: return { label: "مغلق", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" };
            default: return { label: "غير محدد", className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400" };
        }
    };

    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 dark:bg-gray-900 min-h-screen">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <TicketIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                        تذاكر دعم تربو
                    </h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                        إنشاء وتتبع تذاكر الدعم الخاصة بشحنات Turbo
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <PlusCircleIcon className="h-5 w-5" />
                    تذكرة جديدة
                </button>
            </div>

            {/* New Ticket Form */}
            {showForm && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6 border border-indigo-200 dark:border-indigo-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <PaperAirplaneIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            إرسال تذكرة دعم جديدة
                        </h3>
                        <button
                            onClick={() => { setShowForm(false); setTicketDescription(""); setInquiryTypeId(""); }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Inquiry Type Selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                نوع الاستفسار / الشكوى <span className="text-red-500">*</span>
                            </label>
                            {loadingTypes ? (
                                <div className="w-full px-3 py-2 text-sm text-gray-500 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700">
                                    جاري تحميل الأنواع...
                                </div>
                            ) : inquiriesTypes.length > 0 ? (
                                <select
                                    value={inquiryTypeId}
                                    onChange={(e) => setInquiryTypeId(Number(e.target.value) as any)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                                >
                                    <option value="">-- اختر النوع --</option>
                                    {inquiriesTypes.map((type: any) => (
                                        <option key={type.id} value={type.id}>
                                            {type.name_ar || type.name || type.title || `نوع ${type.id}`}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <select
                                    value={inquiryTypeId}
                                    onChange={(e) => setInquiryTypeId(Number(e.target.value) as any)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                                >
                                    <option value="">-- اختر النوع --</option>
                                    <option value={1}>استفسار عام</option>
                                    <option value={2}>شكوى</option>
                                    <option value={3}>طلب متابعة شحنة</option>
                                </select>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                تفاصيل التذكرة <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={ticketDescription}
                                onChange={(e) => setTicketDescription(e.target.value)}
                                rows={4}
                                placeholder="اكتب تفاصيل المشكلة أو الاستفسار..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                            />
                            <p className="text-xs text-gray-400 mt-1">{ticketDescription.length} / 500 حرف</p>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => { setShowForm(false); setTicketDescription(""); setInquiryTypeId(""); }}
                                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleSendTicket}
                                disabled={sendingTicket || !ticketDescription.trim() || !inquiryTypeId}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <PaperAirplaneIcon className="h-4 w-4" />
                                {sendingTicket ? "جاري الإرسال..." : "إرسال التذكرة"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tickets List */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        قائمة التذاكر
                        {ticketsTotal > 0 && (
                            <span className="mr-2 text-sm text-gray-500 dark:text-gray-400">({ticketsTotal} تذكرة)</span>
                        )}
                    </h3>
                    <button
                        onClick={loadTickets}
                        disabled={loadingTickets}
                        className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:opacity-50 transition-colors"
                    >
                        <ArrowPathIcon className={`h-4 w-4 ${loadingTickets ? "animate-spin" : ""}`} />
                        {loadingTickets ? "جاري التحديث..." : "تحديث"}
                    </button>
                </div>

                {loadingTickets ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
                        جاري تحميل التذاكر...
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-14 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                        <TicketIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                        <h3 className="mt-3 text-sm font-medium text-gray-900 dark:text-white">لا توجد تذاكر حتى الآن</h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">اضغط على "تذكرة جديدة" لإرسال أول تذكرة</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {tickets.map((ticket: any) => {
                            const statusInfo = getStatusLabel(ticket.status);
                            return (
                                <div
                                    key={ticket.id}
                                    className="py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors px-2 rounded"
                                    onClick={() => handleViewTicket(ticket.id)}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-indigo-600 dark:text-indigo-400 text-sm">
                                                تذكرة #{ticket.id}
                                            </span>
                                            {ticket.trackingNumber && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    — شحنة {ticket.trackingNumber}
                                                </span>
                                            )}
                                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusInfo.className}`}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xl">
                                            {ticket.description || ticket.content || "لا يوجد وصف"}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {new Date(ticket.created_at || ticket.createdAt).toLocaleDateString("ar-EG", {
                                                year: "numeric", month: "long", day: "numeric",
                                            })}
                                        </p>
                                    </div>
                                    <ChevronRightIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2 flex-shrink-0" />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {ticketsTotal > ticketsPerPage && (
                    <div className="flex justify-center items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                        <button
                            onClick={() => setTicketsPage((p) => Math.max(1, p - 1))}
                            disabled={ticketsPage === 1}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm disabled:opacity-50 transition-colors"
                        >
                            السابق
                        </button>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            صفحة {ticketsPage} من {Math.ceil(ticketsTotal / ticketsPerPage)}
                        </span>
                        <button
                            onClick={() => setTicketsPage((p) => p + 1)}
                            disabled={ticketsPage >= Math.ceil(ticketsTotal / ticketsPerPage)}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm disabled:opacity-50 transition-colors"
                        >
                            التالي
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TurboTickets;
