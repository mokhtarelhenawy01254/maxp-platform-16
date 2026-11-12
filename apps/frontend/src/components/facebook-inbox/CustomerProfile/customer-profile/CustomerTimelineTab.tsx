import React from "react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { Clock, RefreshCw } from "lucide-react";
import { InboxConversation } from "../../../../types/inbox.types";
import { getInboxExternalImageUrl } from "../../../../utils/imageUrl";

interface ActivityItem {
  id: string | number;
  description: string;
  createdAt: string | number | Date;
}

export interface CustomerTimelineTabProps {
  conversation: InboxConversation;
  activities: ActivityItem[];
  syncMessage: string | null;
  syncingMessages: boolean;
  onSyncMessages: () => void;
}

export const CustomerTimelineTab: React.FC<CustomerTimelineTabProps> = ({
  conversation,
  activities,
  syncMessage,
  syncingMessages,
  onSyncMessages,
}) => {
  return (
    <div
      className="relative pl-4 space-y-6 mr-2"
      style={{ borderRight: "2px solid var(--business-muted-line)" }}
    >
      {/* Sync Facebook Messages Button - Only for Facebook conversations */}
      {conversation.platform === "facebook" && (
        <div className="relative pr-6 mb-4">
          <div
            className="absolute -right-[29px] top-1 w-3 h-3 rounded-full border-2"
            style={{
              background: "var(--business-success)",
              borderColor: "var(--business-card-border)",
              boxShadow:
                "0 0 0 4px color-mix(in srgb, var(--business-success) 10%, var(--color-card, #ffffff))",
            }}
          />
          <div
            className="rounded-lg p-3"
            style={{
              background:
                "color-mix(in srgb, var(--business-success) 8%, var(--color-card, #ffffff))",
              border:
                "1px solid color-mix(in srgb, var(--business-success) 18%, transparent)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p
                  className="text-sm font-semibold mb-1"
                  style={{ color: "var(--business-success)" }}
                >
                  جلب الرسائل من Facebook
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--business-success)" }}
                >
                  احضر جميع الرسائل القديمة للمحادثة من Facebook
                </p>
                {syncMessage && (
                  <p
                    className="text-xs mt-2"
                    style={{
                      color: syncMessage.startsWith("تم:")
                        ? "var(--business-success)"
                        : "var(--business-danger)",
                    }}
                  >
                    {syncMessage}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onSyncMessages}
                disabled={syncingMessages}
                className="business-chip-button flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                style={
                  syncingMessages
                    ? {
                        background:
                          "color-mix(in srgb, var(--business-success) 16%, var(--color-card, #ffffff))",
                        color: "var(--business-success)",
                      }
                    : {
                        background: "var(--business-success)",
                        borderColor: "transparent",
                        color: "white",
                      }
                }
              >
                <RefreshCw
                  size={16}
                  className={syncingMessages ? "animate-spin" : ""}
                />
                {syncingMessages ? "جاري الجلب..." : "جلب الرسائل"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Details Section - Show if postId exists */}
      {conversation.postId && (
        <div className="relative pr-6 mb-4">
          <div
            className="absolute -right-[29px] top-1 w-3 h-3 rounded-full border-2"
            style={{
              background: "var(--color-secondary)",
              borderColor: "var(--business-card-border)",
              boxShadow:
                "0 0 0 4px color-mix(in srgb, var(--color-secondary) 10%, var(--color-card, #ffffff))",
            }}
          />
          <div
            className="rounded-lg p-3"
            style={{
              background:
                "color-mix(in srgb, var(--color-secondary) 8%, var(--color-card, #ffffff))",
              border:
                "1px solid color-mix(in srgb, var(--color-secondary) 18%, transparent)",
            }}
          >
            <div className="flex items-start space-x-2 space-x-reverse mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 text-sm mb-1">
                  <span
                    className="font-semibold"
                    style={{ color: "var(--color-secondary)" }}
                  >
                    📌 جاء من منشور
                  </span>
                  {!conversation.postDetails &&
                    !conversation.postDetailsUnavailable && (
                      <span
                        className="text-xs"
                        style={{ color: "var(--color-secondary)" }}
                      >
                        جاري تحميل التفاصيل...
                      </span>
                    )}
                  {conversation.postDetailsUnavailable && (
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-secondary)" }}
                    >
                      تفاصيل المنشور غير متاحة
                    </span>
                  )}
                  {conversation.postDetails?.permalinkUrl && (
                    <a
                      href={conversation.postDetails.permalinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline flex items-center space-x-1"
                      style={{ color: "var(--color-secondary)" }}
                    >
                      <span>عرض المنشور</span>
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                </div>
                {conversation.postDetails?.message && (
                  <p
                    className="text-xs mb-2 line-clamp-3"
                    style={{ color: "var(--color-secondary)" }}
                  >
                    {conversation.postDetails.message}
                  </p>
                )}
                {conversation.postDetails?.hasImages &&
                  conversation.postDetails?.imageUrls &&
                  conversation.postDetails.imageUrls.length > 0 && (
                    <div className="flex space-x-1 space-x-reverse mb-2">
                      {conversation.postDetails.imageUrls
                        .slice(0, 3)
                        .map((imageUrl: string, idx: number) => (
                          <img
                            key={idx}
                            src={getInboxExternalImageUrl(imageUrl)}
                            alt={`Post image ${idx + 1}`}
                            className="w-12 h-12 object-cover rounded border"
                            style={{
                              borderColor:
                                "color-mix(in srgb, var(--color-secondary) 18%, transparent)",
                            }}
                            onError={(e) => {
                              (
                                e.target as HTMLImageElement
                              ).style.display = "none";
                            }}
                          />
                        ))}
                      {conversation.postDetails.imageUrls.length > 3 && (
                        <div
                          className="w-12 h-12 rounded flex items-center justify-center text-xs font-medium"
                          style={{
                            background:
                              "color-mix(in srgb, var(--color-secondary) 10%, var(--color-card, #ffffff))",
                            border:
                              "1px solid color-mix(in srgb, var(--color-secondary) 18%, transparent)",
                            color: "var(--color-secondary)",
                          }}
                        >
                          +{conversation.postDetails.imageUrls.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--color-secondary)" }}
                >
                  Post ID: {conversation.postId.substring(0, 20)}...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activities.length === 0 && !conversation.postId ? (
        <div
          className="text-center py-8 pr-4"
          style={{ color: "var(--color-muted-foreground)" }}
        >
          <Clock size={48} className="mx-auto mb-2 opacity-20" />
          <p>لا يوجد نشاط مسجل</p>
        </div>
      ) : (
        activities.map((activity) => (
          <div key={activity.id} className="relative pr-6">
            <div
              className="absolute -right-[29px] top-1 w-3 h-3 rounded-full border-2"
              style={{
                background: "var(--color-primary)",
                borderColor: "var(--business-card-border)",
                boxShadow:
                  "0 0 0 4px color-mix(in srgb, var(--color-primary) 10%, var(--color-card, #ffffff))",
              }}
            />
            <div>
              <p
                className="text-sm font-medium"
                style={{ color: "var(--color-foreground)" }}
              >
                {activity.description}
              </p>
              <p
                className="text-xs mt-1 tabular-nums"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                {activity.createdAt &&
                !isNaN(new Date(activity.createdAt).getTime())
                  ? format(
                      new Date(activity.createdAt),
                      "dd MMM, HH:mm",
                      { locale: arSA },
                    )
                  : "—"}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
