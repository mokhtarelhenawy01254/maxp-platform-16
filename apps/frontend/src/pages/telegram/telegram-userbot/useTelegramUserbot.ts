import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth } from "../../../hooks/useAuthSimple";
import { apiClient } from "../../../services/apiClient";
import { toast } from "sonner";
import type {
  Chat,
  Message,
  UserbotSummary,
  ApiEnvelope,
  TelegramStep,
} from "./types";
import { buildChatReferencePayload, buildChatReferenceQuery } from "./helpers";

const sonnerToast = toast;

let _optimisticIdCounter = 0;

export function useTelegramUserbot() {
  const { user } = useAuth();
  const [step, setStep] = useState<TelegramStep>("SELECT");

  // Userbot Selection
  const [userbots, setUserbots] = useState<UserbotSummary[]>([]);
  const [selectedUserbot, setSelectedUserbot] = useState<string | null>(null);

  // Chats & Messages
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredChats = useMemo(() => {
    return chats.filter(
      (chat) =>
        chat.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (chat.lastMessage &&
          chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())),
    );
  }, [chats, searchTerm]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load userbots on mount
  const loadUserbots = useCallback(async () => {
    if (!user?.companyId) return;

    try {
      const response = await apiClient.get<
        { data?: UserbotSummary[] } | UserbotSummary[]
      >("/v1/telegram/userbots");

      const responseData = response.data;
      const userbotsList = Array.isArray(responseData)
        ? responseData
        : responseData.data || [];
      setUserbots(Array.isArray(userbotsList) ? userbotsList : []);

      // Check if any userbot is already logged in (has active session)
      const loggedInUserbot = userbotsList.find(
        (ub: UserbotSummary) => ub.sessionString,
      );

      if (loggedInUserbot) {
        setSelectedUserbot(loggedInUserbot.id);
        setStep("CHATS");
      } else {
        setStep("SELECT");
      }
    } catch (error: any) {
      console.error("Failed to load userbots:", error);
      if (error.response?.status === 404) {
        setUserbots([]);
        setStep("SELECT");
      }
    }
  }, [user?.companyId]);

  useEffect(() => {
    if (user?.companyId) {
      loadUserbots();
    }
  }, [user?.companyId, loadUserbots]);

  // 3. Fetch Chats
  const fetchChats = useCallback(async () => {
    if (!selectedUserbot) {
      console.warn("⚠️ Cannot fetch chats: no userbot selected");
      return;
    }

    try {
      const res = await apiClient.get<ApiEnvelope<Chat[]>>(
        "/userbot/dialogs",
        {
          params: {
            userbotConfigId: selectedUserbot,
          },
        },
      );

      if (res.data?.success) {
        setChats(res.data.data || []);
        setStep("CHATS");
      } else {
        console.error("❌ Failed to fetch chats:", res.data?.error);

        // Check if session expired
        if (
          res.data?.error === "AUTH_KEY_UNREGISTERED" ||
          res.data?.requiresReauth
        ) {
          setStep("SELECT");
          setSelectedUserbot(null);
        }
      }
    } catch (err: any) {
      console.error("❌ Failed to fetch chats:", err);
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Failed to fetch chats";

      if (
        errorMessage.includes("AUTH_KEY_UNREGISTERED") ||
        err.response?.data?.requiresReauth
      ) {
        setStep("SELECT");
        setSelectedUserbot(null);
      } else if (step === "CHATS") {
        setStep("SELECT");
      }
    }
  }, [selectedUserbot, step]);

  // Auto-fetch chats when userbot is selected and step is CHATS
  useEffect(() => {
    if (selectedUserbot && step === "CHATS" && chats.length === 0) {
      fetchChats();
    }
  }, [selectedUserbot, step, chats.length, fetchChats]);

  // 4. Fetch Messages
  useEffect(() => {
    if (!selectedChat || !user?.companyId || !selectedUserbot) return;

    const fetchMessages = async () => {
      try {
        const res = await apiClient.get<ApiEnvelope<Message[]>>(
          "/userbot/messages",
          {
            params: {
              userbotConfigId: selectedUserbot,
              ...buildChatReferenceQuery(selectedChat),
            },
          },
        );
        const sortedMessages = (res.data?.data || []).sort(
          (a: Message, b: Message) => a.date - b.date,
        );
        setMessages(sortedMessages);
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Polling every 3s
    return () => clearInterval(interval);
  }, [selectedChat, user?.companyId, selectedUserbot]);

  // 5. Send Message
  const handleSendMessage = useCallback(async () => {
    if (!selectedChat || !messageText.trim() || !selectedUserbot) return;

    const currentText = messageText;
    try {
      await apiClient.post("/userbot/message", {
        userbotConfigId: selectedUserbot,
        ...buildChatReferencePayload(selectedChat),
        message: currentText,
      });

      // Optimistic update
      const optimisticId = `optimistic-${++_optimisticIdCounter}`;
      const newMessage: Message = {
        id: optimisticId,
        text: currentText,
        date: Math.floor(Date.now() / 1000),
        senderId: "me",
        isOut: true,
        media: false,
      };
      setMessages((prev) => [...prev, newMessage]);
      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }, [selectedChat, messageText, selectedUserbot]);

  // 6. Send File
  const handleSendFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedChat || !e.target.files || e.target.files.length === 0)
        return;
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("userbotConfigId", selectedUserbot || "");
      formData.append("chatId", selectedChat.id);
      if (selectedChat.peerType)
        formData.append("peerType", selectedChat.peerType);
      if (selectedChat.accessHash) {
        formData.append("accessHash", selectedChat.accessHash);
      }
      if (selectedChat.inputPeer) {
        formData.append("inputPeer", JSON.stringify(selectedChat.inputPeer));
      }

      try {
        await apiClient.post("/userbot/message/file", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        // Optimistic Update (Text only placeholder)
        const optimisticId = `optimistic-${++_optimisticIdCounter}`;
        const newMessage: Message = {
          id: optimisticId,
          text: `[File: ${file.name}]`,
          date: Math.floor(Date.now() / 1000),
          senderId: "me",
          isOut: true,
          media: true,
        };
        setMessages((prev) => [...prev, newMessage]);
      } catch (err: any) {
        const errorMsg = "Failed to upload: " + (err?.message || "Unknown error");
        if (typeof sonnerToast.error === "function") {
          sonnerToast.error(errorMsg);
        } else if (typeof sonnerToast === "function") {
          sonnerToast(errorMsg);
        }
      }
    },
    [selectedChat, selectedUserbot],
  );

  return {
    step,
    setStep,
    userbots,
    selectedUserbot,
    setSelectedUserbot,
    chats,
    filteredChats,
    selectedChat,
    setSelectedChat,
    messages,
    messageText,
    setMessageText,
    searchTerm,
    setSearchTerm,
    messagesEndRef,
    loadUserbots,
    fetchChats,
    handleSendMessage,
    handleSendFile,
  };
}
