import React, { useEffect, useState } from 'react';
import {
    CheckCircleIcon,
    XMarkIcon,
    ClipboardDocumentIcon,
    ClockIcon,
    UserIcon,
    PhoneIcon,
    MapPinIcon,
    ShoppingBagIcon,
    TruckIcon,
    QrCodeIcon,
    EnvelopeIcon,
    PrinterIcon,
    ArrowPathIcon,
    HeartIcon
} from '@heroicons/react/24/outline';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

interface OrderItem {
    productName: string;
    quantity: number;
    price: number;
    productColor?: string;
    productSize?: string;
    productImage?: string;
}

interface OrderConfirmationProps {
    isOpen: boolean;
    onClose: () => void;
    orderData: {
        id: string;
        orderNumber: string;
        customerName: string;
        customerPhone: string;
        customerAddress?: string;
        governorate?: string;
        items: OrderItem[];
        subtotal: number;
        shippingCost: number;
        discount: number;
        total: number;
        status: string;
        paymentMethod: string;
        createdAt: string;
    } | null;
    onViewDetails?: () => void;
    onPrint?: () => void;
    onNewOrder?: () => void;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
    'PENDING': { label: 'جديد - قيد الانتظار', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: ClockIcon },
    'CONFIRMED': { label: 'تم التأكيد', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: CheckCircleIcon },
    'PROCESSING': { label: 'جاري التجهيز', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: ShoppingBagIcon },
    'SHIPPED': { label: 'تم الشحن', color: 'text-indigo-700', bgColor: 'bg-indigo-100', icon: TruckIcon },
    'OUT_FOR_DELIVERY': { label: 'في الطريق', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: TruckIcon },
    'DELIVERED': { label: 'تم التوصيل', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircleIcon },
};

const paymentMethodLabels: Record<string, string> = {
    'CASH': 'الدفع عند الاستلام',
    'wallet': 'محفظة إلكترونية',
    'insta': 'Instapay',
    'CARD': 'بطاقة ائتمان',
};

export const OrderConfirmationModal: React.FC<OrderConfirmationProps> = ({
    isOpen,
    onClose,
    orderData,
    onViewDetails,
    onPrint,
    onNewOrder
}) => {
    const [copied, setCopied] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowConfetti(true);
            const timer = setTimeout(() => setShowConfetti(false), 3000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [isOpen]);

    if (!isOpen || !orderData) return null;

    const statusInfo = statusConfig[orderData.status] || statusConfig['PENDING'];
    const StatusIcon = statusInfo?.icon || CheckCircleIcon;

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const copyOrderNumber = () => {
        navigator.clipboard.writeText(orderData.orderNumber);
        setCopied(true);
        toast.success('تم نسخ رقم الطلب!');
        setTimeout(() => setCopied(false), 2000);
    };

    const trackingUrl = `${window.location.origin}/track-order/${orderData.orderNumber}`;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* Modal Container */}
            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">

                    {/* Success Header with Gradient */}
                    <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
                        {/* Confetti Animation */}
                        {showConfetti && (
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                {[...Array(20)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="absolute w-2 h-2 bg-white/30 rounded-full animate-ping"
                                        style={{
                                            left: `${Math.random() * 100}%`,
                                            top: `${Math.random() * 100}%`,
                                            animationDelay: `${Math.random() * 0.5}s`,
                                            animationDuration: `${1 + Math.random()}s`
                                        }}
                                    />
                                ))}
                            </div>
                        )}

                        <div className="relative flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                                    <CheckCircleIcon className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold">تم إنشاء الطلب بنجاح!</h2>
                                    <p className="text-green-100 text-sm mt-1">شكراً لاختيارك متجرنا</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <XMarkIcon className="w-6 h-6 text-white" />
                            </button>
                        </div>

                        {/* Order Number Badge */}
                        <div className="mt-4 flex items-center gap-3">
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2">
                                <span className="text-green-100 text-sm">رقم الطلب:</span>
                                <span className="text-white font-bold text-lg" dir="ltr">
                                    #{orderData.orderNumber}
                                </span>
                                <button
                                    onClick={copyOrderNumber}
                                    className="p-1 hover:bg-white/20 rounded transition-colors"
                                    title="نسخ رقم الطلب"
                                >
                                    {copied ? (
                                        <CheckCircleIcon className="w-4 h-4 text-white" />
                                    ) : (
                                        <ClipboardDocumentIcon className="w-4 h-4 text-white" />
                                    )}
                                </button>
                            </div>
                            <div className={`${statusInfo?.bgColor} ${statusInfo?.color} px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1`}>
                                <StatusIcon className="w-4 h-4" />
                                {statusInfo?.label}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">

                        {/* Customer Info Card */}
                        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <UserIcon className="w-5 h-5 text-blue-600" />
                                بيانات العميل
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <UserIcon className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">الاسم الكامل</p>
                                        <p className="font-semibold text-gray-800">{orderData.customerName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                        <PhoneIcon className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">رقم الهاتف</p>
                                        <p className="font-semibold text-gray-800" dir="ltr">{orderData.customerPhone}</p>
                                    </div>
                                </div>
                                {orderData.customerAddress && (
                                    <div className="flex items-center gap-3 md:col-span-2">
                                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                            <MapPinIcon className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">عنوان التوصيل</p>
                                            <p className="font-semibold text-gray-800">
                                                {orderData.governorate} - {orderData.customerAddress}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Order Date & Payment */}
                        <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                                <ClockIcon className="w-4 h-4" />
                                <span>تاريخ الطلب: {formatDate(orderData.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                                <ShoppingBagIcon className="w-4 h-4" />
                                <span>طريقة الدفع: {paymentMethodLabels[orderData.paymentMethod] || orderData.paymentMethod}</span>
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="border rounded-xl overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <ShoppingBagIcon className="w-5 h-5 text-blue-600" />
                                    تفاصيل المنتجات ({orderData.items.length})
                                </h3>
                            </div>
                            <div className="divide-y">
                                {orderData.items.map((item, index) => (
                                    <div key={index} className="p-4 flex items-center gap-4">
                                        {item.productImage ? (
                                            <img
                                                src={item.productImage}
                                                alt={item.productName}
                                                className="w-16 h-16 object-cover rounded-lg"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                                <ShoppingBagIcon className="w-6 h-6 text-gray-400" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-gray-800">{item.productName}</h4>
                                            <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-600">
                                                {item.productColor && (
                                                    <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full text-xs">
                                                        اللون: {item.productColor}
                                                    </span>
                                                )}
                                                {item.productSize && (
                                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                                                        المقاس: {item.productSize}
                                                    </span>
                                                )}
                                                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                                                    الكمية: {item.quantity}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-gray-800">
                                                {(item.price * item.quantity).toLocaleString()} ج.م
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {item.price.toLocaleString()} × {item.quantity}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Price Summary */}
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                            {orderData.shippingCost > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">تكلفة الشحن:</span>
                                    <span className="font-medium">+{orderData.shippingCost.toLocaleString()} ج.م</span>
                                </div>
                            )}
                            {orderData.discount > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>الخصم:</span>
                                    <span className="font-medium">-{orderData.discount.toLocaleString()} ج.م</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-gray-200">
                                <span className="font-bold text-lg">الإجمالي النهائي:</span>
                                <span className="font-bold text-lg text-green-600">{orderData.total.toLocaleString()} ج.م</span>
                            </div>
                        </div>

                        {/* QR Code Section */}
                        <div className="flex flex-col md:flex-row items-center gap-4 bg-blue-50 rounded-xl p-4">
                            <div className="bg-white p-3 rounded-xl shadow-sm">
                                <QRCodeSVG
                                    value={trackingUrl}
                                    size={120}
                                    level="M"
                                    includeMargin={true}
                                />
                            </div>
                            <div className="flex-1 text-center md:text-right">
                                <h4 className="font-bold text-gray-800 flex items-center justify-center md:justify-start gap-2">
                                    <QrCodeIcon className="w-5 h-5 text-blue-600" />
                                    مسح للمتابعة
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">
                                    امسح رمز QR هذا لمتابعة حالة طلبك في أي وقت
                                </p>
                                <button
                                    onClick={() => window.open(trackingUrl, '_blank')}
                                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium underline"
                                >
                                    أو اضغط هنا للمتابعة مباشرة
                                </button>
                            </div>
                        </div>

                        {/* Thank You Message */}
                        <div className="text-center bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4">
                            <div className="flex items-center justify-center gap-2 text-gray-800">
                                <HeartIcon className="w-5 h-5 text-pink-500" />
                                <span className="font-bold">شكراً لك على ثقتك بنا!</span>
                                <HeartIcon className="w-5 h-5 text-pink-500" />
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                                نقدر اختيارك متجرنا ونسعى دائماً لتقديم أفضل خدمة لك
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t">
                            <button
                                onClick={onViewDetails}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                            >
                                <ClipboardDocumentIcon className="w-5 h-5" />
                                تفاصيل الطلب
                            </button>
                            <button
                                onClick={onPrint}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                            >
                                <PrinterIcon className="w-5 h-5" />
                                طباعة
                            </button>
                            <button
                                onClick={() => {
                                    // Share via WhatsApp
                                    const text = `طلب جديد #${orderData.orderNumber}\nالعميل: ${orderData.customerName}\nالهاتف: ${orderData.customerPhone}\nالإجمالي: ${orderData.total.toLocaleString()} ج.م`;
                                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-100 text-green-700 rounded-xl font-medium hover:bg-green-200 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                مشاركة
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        const axios = await import('axios');
                                        await axios.default.post('/api/v1/email/send-order-confirmation', {
                                            orderId: orderData.id,
                                            email: null
                                        });
                                        toast.success('تم إرسال نسخة للبريد الإلكتروني!');
                                    } catch (error: any) {
                                        toast.error(error.response?.data?.error || 'فشل إرسال الإيميل');
                                    }
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-100 text-purple-700 rounded-xl font-medium hover:bg-purple-200 transition-colors"
                            >
                                <EnvelopeIcon className="w-5 h-5" />
                                إرسال للإيميل
                            </button>
                            <button
                                onClick={onNewOrder}
                                className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                            >
                                <ArrowPathIcon className="w-5 h-5" />
                                طلب جديد
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderConfirmationModal;
