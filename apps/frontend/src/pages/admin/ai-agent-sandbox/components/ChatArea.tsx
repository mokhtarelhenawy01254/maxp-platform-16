import React, { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Bot,
  User,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  Image as ImageIcon,
  X,
  Loader2
} from "lucide-react";
import type { ChatMessage, AgentConfig, ModelConfig, ToolCall } from "../types/sandbox.types";

interface ChatAreaProps {
  messages: ChatMessage[];
  agent: AgentConfig | null;
  model: string;
  providers: ModelConfig[];
  isLoading: boolean;
  isStreaming: boolean;
  canSend: boolean;
  typingStage?: string | null;
  activeToolCalls?: ToolCall[];
  onSendMessage: (message: string, attachments?: Array<{ type: string; url: string }>) => void;
}

const TEST_IMAGES = [
  {
    label: "Classic Watch",
    url: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=400&q=80",
    icon: "⌚",
  },
  {
    label: "Platform Sneakers",
    url: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=400&q=80",
    icon: "👟",
  },
  {
    label: "Linen Shirt",
    url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&q=80",
    icon: "👔",
  },
];

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  agent,
  model,
  providers,
  isLoading,
  isStreaming,
  canSend,
  typingStage,
  activeToolCalls,
  onSendMessage,
}) => {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [showAttachmentPanel, setShowAttachmentPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!agent) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-slate-400">
        <span className="text-sm font-semibold select-none">
          Select an agent to start chatting
        </span>
      </div>
    );
  }

  const handleSend = () => {
    const trimmedInput = input.trim();
    const hasAttachments = Boolean(selectedImageUrl.trim());
    if ((!trimmedInput && !hasAttachments) || isLoading || !canSend) return;

    const attachments = hasAttachments ? [{ type: "image", url: selectedImageUrl.trim() }] : undefined;
    onSendMessage(trimmedInput, attachments);
    setInput("");
    setSelectedImageUrl("");
    setShowAttachmentPanel(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filterChainOfThought = (text: string): string => {
    return text
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('* Role:')) return false;
        if (trimmed.startsWith('* Task:')) return false;
        if (trimmed.startsWith('* Thinking:')) return false;
        if (trimmed.startsWith('[') && trimmed.includes(']') && !trimmed.includes(':')) return false;
        return true;
      })
      .join('\n')
      .trim();
  };

  const parseMessageContent = (content: string) => {
    const mdImageRegex = /!\[(.*?)\]\((.*?)\)/g;
    let match;
    const images: string[] = [];
    while ((match = mdImageRegex.exec(content)) !== null) {
      images.push(match[2]);
    }

    const plainImageRegex = /(https?:\/\/[^\s<>"]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp|ico)(?:\?[^\s<>"]*)?)/gi;
    while ((match = plainImageRegex.exec(content)) !== null) {
      if (!images.includes(match[1])) {
        images.push(match[1]);
      }
    }

    const cleanText = content
      .replace(mdImageRegex, "")
      .replace(plainImageRegex, "")
      .trim();
    return { images, text: filterChainOfThought(cleanText) };
  };

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50/20 dark:bg-slate-905">
      {/* Scrollable Chat Message History */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => {
          const { images, text } = parseMessageContent(msg.content);
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex gap-3 items-start ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div className={`size-8 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 select-none ${
                isUser ? "bg-slate-500" : "bg-indigo-600 dark:bg-indigo-500"
              }`}>
                {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
              </div>

              {/* Message Body */}
              <div className="flex flex-col max-w-[80%] min-w-0">
                <div
                  className={`p-3.5 rounded-2xl relative group shadow-sm text-sm ${
                    isUser
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none"
                  }`}
                >
                  {images.map((imgUrl, idx) => (
                    <img
                      key={idx}
                      src={imgUrl}
                      alt="Attachment"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                      className={`max-w-full max-h-[200px] rounded-lg object-cover shadow-sm transition-transform duration-200 hover:scale-[1.01] ${
                        text ? "mb-3" : "mb-0"
                      }`}
                    />
                  ))}
                  
                  {text && (
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {text}
                    </p>
                  )}

                  {/* Copy Button */}
                  <button
                    onClick={() => copyToClipboard(msg.content, msg.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs"
                    title="Copy message text"
                  >
                    {copiedId === msg.id ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3 text-slate-400 hover:text-slate-650" />
                    )}
                  </button>

                  {/* Message Runtime Info */}
                  {!isUser && msg.runtime && (
                    <div className="mt-2 flex items-center">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                        msg.runtime === "local-nodejs"
                          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50"
                      }`}>
                        {msg.runtime === "local-nodejs" ? "⬡ Node" : "🐍 Python"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Tool Calls Chips */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {msg.toolCalls.map((tc, idx) => (
                      <Badge
                        key={`${tc.id || tc.name}-${idx}`}
                        variant={
                          tc.status === "success"
                            ? "success"
                            : tc.status === "error"
                            ? "destructive"
                            : "outline"
                        }
                        className="text-[10px] py-0 px-2 flex items-center gap-1 font-medium select-none"
                      >
                        {tc.status === "success" ? (
                          <CheckCircle2 className="size-3" />
                        ) : tc.status === "error" ? (
                          <AlertCircle className="size-3" />
                        ) : (
                          <Clock className="size-3" />
                        )}
                        <span>{tc.name}</span>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading / Generating Placeholder */}
        {isLoading && (
          <div className="flex gap-3 items-start">
            <div className="size-8 rounded-full bg-indigo-650 dark:bg-indigo-500 flex items-center justify-center text-white text-xs flex-shrink-0 select-none">
              <Bot className="size-4 animate-pulse" />
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-none p-3.5 shadow-sm text-sm space-y-2 max-w-[80%] min-w-[180px]">
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="size-3.5 animate-spin text-indigo-600" />
                <span className="text-xs font-medium">
                  {typingStage || (isStreaming ? "Generating..." : "Thinking...")}
                </span>
              </div>

              {activeToolCalls && activeToolCalls.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {activeToolCalls.map((tc, idx) => (
                    <Badge
                      key={`${tc.id || tc.name}-${idx}`}
                      variant={
                        tc.status === "success"
                          ? "success"
                          : tc.status === "error"
                          ? "destructive"
                          : "outline"
                      }
                      className="text-[10px] py-0 px-2 flex items-center gap-1 select-none"
                    >
                      {tc.status === "success" ? (
                        <CheckCircle2 className="size-3" />
                      ) : tc.status === "error" ? (
                        <AlertCircle className="size-3" />
                      ) : (
                        <Clock className="size-3" />
                      )}
                      <span>{tc.name}</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Panel */}
      {showAttachmentPanel && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-550 uppercase tracking-wider">
              Image Attachment
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setShowAttachmentPanel(false);
                setSelectedImageUrl("");
              }}
              className="size-6 text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-850"
            >
              <X className="size-4" />
            </Button>
          </div>

          <input
            type="text"
            placeholder="Enter image URL..."
            value={selectedImageUrl}
            onChange={(e) => setSelectedImageUrl(e.target.value)}
            className="w-full text-xs rounded-md border border-slate-200 dark:border-slate-800 bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-650"
          />

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-450 font-medium">Quick Select:</span>
            {TEST_IMAGES.map((img) => (
              <Badge
                key={img.label}
                variant={selectedImageUrl === img.url ? "default" : "outline"}
                onClick={() => setSelectedImageUrl(img.url)}
                className="cursor-pointer text-[10px] py-0.5 px-2 hover:scale-[1.01] transition-transform select-none"
              >
                <span className="mr-1">{img.icon}</span>
                <span>{img.label}</span>
              </Badge>
            ))}
          </div>

          {selectedImageUrl && (
            <div className="relative size-20">
              <img
                src={selectedImageUrl}
                alt="Preview"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1594322436404-5a0526db4d13?auto=format&fit=crop&w=100&q=80";
                }}
                className="w-full h-full rounded-lg object-cover border border-slate-200 dark:border-slate-800"
              />
              <button
                onClick={() => setSelectedImageUrl("")}
                className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-red-500 text-white flex items-center justify-center p-0 hover:bg-red-650 transition-colors shadow-xs"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
        </div>
      )}

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* Message Input Box */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-950 flex items-end gap-2.5">
        <Button
          size="icon"
          variant={showAttachmentPanel || selectedImageUrl ? "default" : "ghost"}
          onClick={() => setShowAttachmentPanel(!showAttachmentPanel)}
          disabled={isLoading || !canSend}
          className="size-9 rounded-xl flex-shrink-0 text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-850"
        >
          <ImageIcon className="size-5" />
        </Button>

        <div className="flex-1 min-w-0 relative">
          <Textarea
            placeholder={canSend ? `Message ${agent.name}...` : "Select a central model to start chatting"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || !canSend}
            rows={1}
            className="w-full min-h-[36px] max-h-[120px] text-sm resize-none rounded-xl dark:bg-slate-955 dark:border-slate-800 pr-10 focus-visible:ring-indigo-650"
          />
          {!canSend && (
            <span className="absolute bottom-1 right-2 text-[9px] text-red-500 font-semibold select-none">
              Configure your API key in the HeaderBar
            </span>
          )}
        </div>

        <Button
          size="icon"
          variant="default"
          onClick={handleSend}
          disabled={(!input.trim() && !selectedImageUrl) || isLoading || !canSend}
          className="size-9 rounded-xl flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
};
