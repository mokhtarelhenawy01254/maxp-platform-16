import { Zap as BoltIcon } from 'lucide-react';
import React, { useState, useEffect, useRef } from "react";
;

export interface QuickReply {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category?: string;
}

interface QuickReplyDropdownProps {
  inputValue: string;
  onSelectReply: (reply: QuickReply) => void;
  onClose: () => void;
}

const categoryBadgeStyle: React.CSSProperties = {
  background: "color-mix(in srgb, var(--color-secondary) 10%, white)",
  borderColor: "color-mix(in srgb, var(--color-secondary) 18%, transparent)",
  color: "var(--color-secondary)",
};

// Mock quick replies (في التطبيق الحقيقي: جلب من API)
const QUICK_REPLIES: QuickReply[] = [
  {
    id: "1",
    shortcut: "/hello",
    title: "ترحيب",
    content: "مرحباً {{name}}! كيف يمكنني مساعدتك اليوم؟ 😊",
    category: "عام",
  },
  {
    id: "2",
    shortcut: "/thanks",
    title: "شكر",
    content: "شكراً لتواصلك معنا! نقدر ثقتك بنا 🙏",
    category: "عام",
  },
  {
    id: "3",
    shortcut: "/order",
    title: "حالة الطلب",
    content:
      "طلبك رقم #{{order_id}} في طريقه إليك! الوصول المتوقع خلال 2-3 أيام 📦",
    category: "طلبات",
  },
  {
    id: "4",
    shortcut: "/price",
    title: "السعر",
    content:
      "سعر المنتج هو {{price}} ريال. التوصيل مجاني للطلبات فوق 100 ريال 💰",
    category: "مبيعات",
  },
  {
    id: "5",
    shortcut: "/shipping",
    title: "الشحن",
    content: "نقوم بالتوصيل لجميع مناطق المملكة خلال 2-5 أيام عمل 🚚",
    category: "شحن",
  },
  {
    id: "6",
    shortcut: "/payment",
    title: "طرق الدفع",
    content:
      "نستقبل: الدفع عند الاستلام، بطاقات الائتمان، مدى، STC Pay، Apple Pay 💳",
    category: "دفع",
  },
  {
    id: "7",
    shortcut: "/hours",
    title: "ساعات العمل",
    content: "🕐 ساعات العمل: السبت-الخميس 9ص-6م\nالجمعة: عطلة",
    category: "عام",
  },
  {
    id: "8",
    shortcut: "/contact",
    title: "معلومات التواصل",
    content:
      "📱 واتساب: 0501234567\n📧 البريد: info@company.com\n🌐 الموقع: www.company.com",
    category: "معلومات",
  },
];

const QuickReplyDropdown: React.FC<QuickReplyDropdownProps> = ({
  inputValue,
  onSelectReply,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter replies based on input
  const filteredReplies = inputValue.startsWith("/")
    ? QUICK_REPLIES.filter(
        (reply) =>
          reply.shortcut.toLowerCase().includes(inputValue.toLowerCase()) ||
          reply.title.toLowerCase().includes(inputValue.slice(1).toLowerCase()),
      )
    : [];

  useEffect(() => {
    setSelectedIndex(0);
  }, [inputValue]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredReplies.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredReplies.length - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          {
            const selectedReply = filteredReplies[selectedIndex];
            if (selectedReply) {
              onSelectReply(selectedReply);
            }
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredReplies, selectedIndex, onSelectReply, onClose]);

  if (filteredReplies.length === 0) return null;

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div
        ref={dropdownRef}
        className="business-dropdown-surface absolute bottom-full left-0 z-20 mb-2 max-h-80 w-96 overflow-y-auto p-2"
      >
        <div>
          <div
            className="flex items-center gap-2 px-3 py-2 text-xs"
            style={{
              color: "var(--color-muted-foreground)",
              borderBottom: "1px solid var(--business-muted-line)",
            }}
          >
            <BoltIcon className="w-4 h-4" />
            <span>الردود السريعة ({filteredReplies.length})</span>
          </div>

          <div className="mt-2">
            {filteredReplies.map((reply, index) => (
              <button
                type="button"
                key={reply.id}
                onClick={() => onSelectReply(reply)}
                className="business-dropdown-option"
                data-active={index === selectedIndex}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--color-foreground)" }}
                      >
                        {reply.title}
                      </span>
                      {reply.category && (
                        <span
                          className="rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                          style={categoryBadgeStyle}
                        >
                          {reply.category}
                        </span>
                      )}
                    </div>
                    <p
                      className="truncate text-xs"
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      {reply.content.slice(0, 60)}...
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <code className="business-inline-code-chip">
                      {reply.shortcut}
                    </code>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div
            className="mt-2 px-3 py-2 text-xs"
            style={{
              color: "var(--color-muted-foreground)",
              borderTop: "1px solid var(--business-muted-line)",
            }}
          >
            💡 استخدم ↑ ↓ للتنقل، Enter للاختيار، Esc للإغلاق
          </div>
        </div>
      </div>
    </>
  );
};

export default QuickReplyDropdown;
