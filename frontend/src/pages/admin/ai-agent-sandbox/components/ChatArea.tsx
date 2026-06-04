import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Chip,
  CircularProgress,
  Divider,
} from "@mui/material";
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
  Image as ImageIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import type { ChatMessage, AgentConfig, ModelConfig } from "../types/sandbox.types";

interface ChatAreaProps {
  messages: ChatMessage[];
  agent: AgentConfig | null;
  model: string;
  providers: ModelConfig[];
  isLoading: boolean;
  isStreaming: boolean;
  canSend: boolean;
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
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Select an agent to start chatting
        </Typography>
      </Box>
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
    return { images, text: cleanText };
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minWidth: 0,
      }}
    >
      <Box sx={{ flex: 1, overflow: "auto", px: 2, py: 2 }}>
        {messages.map((msg) => {
          const { images, text } = parseMessageContent(msg.content);
          return (
            <Box
              key={msg.id}
              sx={{
                display: "flex",
                gap: 1.5,
                mb: 2,
                alignItems: "flex-start",
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: msg.role === "user" ? "grey.600" : "primary.main",
                  fontSize: 14,
                }}
              >
                {msg.role === "user" ? <PersonIcon sx={{ fontSize: 16 }} /> : <BotIcon sx={{ fontSize: 16 }} />}
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: "12px 12px 12px 2px",
                    bgcolor: msg.role === "user" ? "primary.light" : "background.paper",
                    border: msg.role === "user" ? "none" : "1px solid",
                    color: msg.role === "user" ? "#111827" : undefined,
                    borderColor: "divider",
                    position: "relative",
                    "&:hover .copy-btn": { opacity: 1 },
                  }}
                >
                  {images.map((imgUrl, idx) => (
                    <Box
                      key={idx}
                      component="img"
                      src={imgUrl}
                      alt="Attachment"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                      sx={{
                        maxWidth: "100%",
                        maxHeight: 200,
                        borderRadius: "8px",
                        mb: text ? 1.5 : 0,
                        display: "block",
                        objectFit: "cover",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        transition: "transform 0.2s, box-shadow 0.2s",
                        "&:hover": {
                          transform: "scale(1.02)",
                          boxShadow: "0 8px 24px rgba(25, 118, 210, 0.25)",
                        },
                      }}
                    />
                  ))}
                  {text && (
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6 }}>
                      {text}
                    </Typography>
                  )}

                  <IconButton
                    className="copy-btn"
                    size="small"
                    onClick={() => copyToClipboard(msg.content, msg.id)}
                    sx={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      opacity: 0,
                      transition: "opacity 0.15s",
                      bgcolor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                      "&:hover": { opacity: 1 },
                    }}
                  >
                    {copiedId === msg.id ? (
                      <CheckIcon sx={{ fontSize: 12, color: "success.main" }} />
                    ) : (
                      <CopyIcon sx={{ fontSize: 12 }} />
                    )}
                  </IconButton>
                </Box>

                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {msg.toolCalls.map((tc) => (
                      <Chip
                        key={tc.id}
                        icon={tc.status === "success" ? <SuccessIcon sx={{ fontSize: 12 }} /> : tc.status === "error" ? <ErrorIcon sx={{ fontSize: 12 }} /> : <PendingIcon sx={{ fontSize: 12 }} />}
                        label={tc.name}
                        size="small"
                        color={tc.status === "success" ? "success" : tc.status === "error" ? "error" : "default"}
                        variant="outlined"
                        sx={{ height: 22, fontSize: 10 }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}

        {isLoading && (
          <Box sx={{ display: "flex", gap: 1.5, mb: 2, alignItems: "flex-start" }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
              <BotIcon sx={{ fontSize: 14 }} />
            </Avatar>
            <Box sx={{ p: 1.5, borderRadius: "12px 12px 12px 2px", bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={14} />
                <Typography variant="body2" color="text.secondary" fontSize={13}>
                  {isStreaming ? "Generating..." : "Thinking..."}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {showAttachmentPanel && (
        <Box
          sx={{
            p: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "action.hover",
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ fontWeight: "bold", color: "text.secondary" }}>
              Image Attachment
            </Typography>
            <IconButton size="small" onClick={() => { setShowAttachmentPanel(false); setSelectedImageUrl(""); }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          <TextField
            fullWidth
            placeholder="Enter image URL..."
            value={selectedImageUrl}
            onChange={(e) => setSelectedImageUrl(e.target.value)}
            size="small"
            sx={{ "& .MuiInputBase-root": { fontSize: 12 } }}
          />

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", mr: 1 }}>
              Quick Select:
            </Typography>
            {TEST_IMAGES.map((img) => (
              <Chip
                key={img.label}
                avatar={<Avatar sx={{ bgcolor: "transparent" }}>{img.icon}</Avatar>}
                label={img.label}
                onClick={() => setSelectedImageUrl(img.url)}
                variant={selectedImageUrl === img.url ? "filled" : "outlined"}
                color={selectedImageUrl === img.url ? "primary" : "default"}
                size="small"
                sx={{
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": { transform: "translateY(-1px)", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" },
                }}
              />
            ))}
          </Box>

          {selectedImageUrl && (
            <Box sx={{ position: "relative", width: 80, height: 80, mt: 0.5 }}>
              <Box
                component="img"
                src={selectedImageUrl}
                alt="Preview"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1594322436404-5a0526db4d13?auto=format&fit=crop&w=100&q=80";
                }}
                sx={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "8px",
                  objectFit: "cover",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              />
              <IconButton
                size="small"
                onClick={() => setSelectedImageUrl("")}
                sx={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  bgcolor: "error.main",
                  color: "white",
                  padding: "2px",
                  "&:hover": { bgcolor: "error.dark" },
                }}
              >
                <CloseIcon sx={{ fontSize: 10 }} />
              </IconButton>
            </Box>
          )}
        </Box>
      )}

      <Divider />

      <Box sx={{ p: 2, bgcolor: "background.paper" }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <IconButton
            color={showAttachmentPanel || selectedImageUrl ? "primary" : "default"}
            onClick={() => setShowAttachmentPanel(!showAttachmentPanel)}
            disabled={isLoading || !canSend}
          >
            <ImageIcon />
          </IconButton>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder={canSend ? `Message ${agent.name}...` : "Select a central model to start chatting"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || !canSend}
            size="small"
            helperText={!canSend ? "Go to HeaderBar to configure your central API key" : ""}
            error={!canSend}
            sx={{
              "& .MuiInputBase-root": { fontSize: 13 },
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImageUrl) || isLoading || !canSend}
            sx={{ alignSelf: "flex-end" }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};
