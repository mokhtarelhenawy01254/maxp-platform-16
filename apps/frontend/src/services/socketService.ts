import { io, Socket } from "socket.io-client";
import { buildWsUrl } from "../utils/urlHelper";
import { tokenManager } from "../utils/tokenManager";

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type: "text" | "image" | "file" | "voice";
  isFromCustomer: boolean;
  status: "sending" | "sent" | "delivered" | "read" | "error";
  conversationId: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  voiceDuration?: number;
  repliedBy?: string;
}

interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  customerEmail?: string;
  customerPhone?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline?: boolean;
  platform: "facebook" | "whatsapp" | "telegram" | "unknown";
  status: "new" | "active" | "archived" | "important";
  messages: Message[];
  customerOrders?: any[];
  lastRepliedBy?: string;
}

interface SocketEvents {
  connect: () => void;
  disconnect: (reason: string) => void;
  "new_message": (message: Message) => void;
  "message:delivered": (data: {
    messageId: string;
    conversationId: string;
  }) => void;
  "message:read": (data: { messageId: string; conversationId: string }) => void;
  "typing:start": (data: {
    conversationId: string;
    userId: string;
    userName: string;
  }) => void;
  "typing:stop": (data: { conversationId: string; userId: string }) => void;
  "user:online": (data: { userId: string }) => void;
  "user:offline": (data: { userId: string }) => void;
  "conversation:updated": (conversation: Conversation) => void;
  "conversation:new": (conversation: Conversation) => void;
  "notification:new": (data: {
    message: Message;
    conversation: Conversation;
  }) => void;
  turbo_shipment_update: (data: any) => void;
  "order:updated": (data: any) => void;
  "campaign:progress": (data: any) => void;
  // WhatsApp real-time events
  "whatsapp:qr": (data: { sessionId: string; qr: string; companyId?: string; refreshed?: boolean }) => void;
  "whatsapp:pairing_code": (data: { sessionId: string; pairingCode: string; phoneNumber?: string }) => void;
  "whatsapp:connection": (data: { sessionId: string; status: string; phoneNumber?: string; reason?: number }) => void;
  "whatsapp:sessions:status": (data: { sessionId: string; status: string; phoneNumber?: string }) => void;
  "whatsapp:message:new": (data: any) => void;
  "whatsapp:message:sent": (data: any) => void;
  "whatsapp:message:status": (data: any) => void;
  "whatsapp:notification:new": (data: any) => void;
  "whatsapp:history_sync": (data: any) => void;
  "whatsapp:logged_out": (data: any) => void;
  "whatsapp:presence": (data: any) => void;
  "whatsapp:status:new": (data: any) => void;
  "whatsapp:call:update": (data: any) => void;
}

interface SocketEmitEvents {
  "join:conversation": (conversationId: string) => void;
  "leave:conversation": (conversationId: string) => void;
  "message:send": (message: any) => void;
  "typing:start": (data: {
    conversationId: string;
    userId: string;
    userName: string;
  }) => void;
  "typing:stop": (data: { conversationId: string; userId: string }) => void;
  "message:read": (data: { messageId: string; conversationId: string }) => void;
  "message:delivered": (data: {
    messageId: string;
    conversationId: string;
  }) => void;
  user_join: (data: any) => void;
  join_company_room: (data: { companyId: string }) => void;
}

export type OrderSoundPattern = "alarm" | "urgent" | "classic" | "digital" | "smooth";

interface OrderSoundPatternNote {
  freq: number;
  duration: number;
  gap: number;
}

// نغمات صوت الطلبات — كل نغمة بتكوين نوتات مختلف
const ORDER_SOUND_PATTERN_NOTES: Record<
  OrderSoundPattern,
  OrderSoundPatternNote[]
> = {
  alarm: [
    { freq: 1150, duration: 0.19, gap: 0.16 },
    { freq: 800, duration: 0.19, gap: 0.16 },
  ],
  urgent: [
    { freq: 1200, duration: 0.08, gap: 0.04 },
    { freq: 1200, duration: 0.08, gap: 0.04 },
    { freq: 1200, duration: 0.08, gap: 0.16 },
  ],
  classic: [
    { freq: 880, duration: 0.35, gap: 0.05 },
    { freq: 660, duration: 0.45, gap: 0.1 },
  ],
  digital: [
    { freq: 660, duration: 0.09, gap: 0.01 },
    { freq: 880, duration: 0.09, gap: 0.01 },
    { freq: 1100, duration: 0.09, gap: 0.01 },
    { freq: 1320, duration: 0.12, gap: 0.08 },
  ],
  smooth: [
    { freq: 523.25, duration: 0.2, gap: 0.05 },
    { freq: 659.25, duration: 0.2, gap: 0.05 },
    { freq: 783.99, duration: 0.2, gap: 0.05 },
    { freq: 1046.5, duration: 0.35, gap: 0.15 },
  ],
};

// قائمة النغمات المعروضة في الإعدادات
export const ORDER_SOUND_PATTERNS: Array<{
  id: OrderSoundPattern;
  label: string;
  description: string;
}> = [
  { id: "alarm", label: "صفّارة إنذار", description: "صفّارة قوية متقطعة" },
  { id: "urgent", label: "عاجل", description: "صفّقات سريعة متتالية" },
  { id: "classic", label: "كلاسيكي", description: "جرس دينج دونج" },
  { id: "digital", label: "رقمي", description: "نغمة رنين رقمية صاعدة" },
  { id: "smooth", label: "ناعم", description: "نغمة مريحة هادئة" },
];

class SocketService {
  private socket: Socket<SocketEvents, SocketEmitEvents> | null = null;
  private baseURL = buildWsUrl();
  private audioContext: AudioContext | null = null;
  private isAudioInitialized: boolean = false;
  private isConnecting: boolean = false;
  private alarmStopTimer: ReturnType<typeof setTimeout> | null = null;
  private alarmSources: Array<{ stop: () => void }> = [];

  constructor() {
    // تهيئة Audio Context (سيتم تفعيله بعد أول user interaction)
    this.initAudioContext();
    this.setupAudioUnlock();
  }

  // تهيئة Audio Context
  private initAudioContext() {
    try {
      // @ts-ignore - للتوافق مع جميع المتصفحات
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        console.log("🔊 [SOUND] Audio context initialized");
      }
    } catch (error) {
      console.error("❌ [SOUND] Failed to initialize audio context:", error);
    }
  }

  // تشغيل صوت التنبيه باستخدام Web Audio API
  playNotificationSound() {
    try {
      if (!this.audioContext) {
        console.warn("⚠️ [SOUND] Audio context not available");
        return;
      }

      // تفعيل Audio Context إذا كان suspended (بسبب autoplay policy)
      if (this.audioContext.state === "suspended") {
        this.audioContext
          .resume()
          .then(() => {
            console.log("🔊 [SOUND] Audio context resumed");
            this.playSoundInternal();
          })
          .catch((error) => {
            console.warn("⚠️ [SOUND] Could not resume audio context:", error);
          });
      } else {
        this.playSoundInternal();
      }

      this.isAudioInitialized = true;
    } catch (error) {
      console.error("❌ [SOUND] Error playing notification sound:", error);
    }
  }

  // تشغيل الصوت الداخلي
  private playSoundInternal() {
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // صوت تنبيه لطيف (نغمتين متتاليتين)
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(
        600,
        this.audioContext.currentTime + 0.1,
      );

      // مستوى الصوت
      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        this.audioContext.currentTime + 0.3,
      );

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);

      console.log("🔔 [SOUND] Notification sound played successfully");
    } catch (error) {
      console.error("❌ [SOUND] Error in playSoundInternal:", error);
    }
  }

  // تفعيل الصوت (يُستدعى بعد أول user interaction)
  enableSound() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext
        .resume()
        .then(() => {
          console.log("🔊 [SOUND] Audio context enabled by user interaction");
        })
        .catch((error) => {
          console.warn("⚠️ [SOUND] Failed to enable audio context:", error);
        });
    }
  }

  // فتح الصوت مرة واحدة عند أول تفاعل (متطلب المتصفح لسياسة autoplay)
  private setupAudioUnlock() {
    if (typeof window === "undefined") {
      return;
    }

    const unlock = () => {
      this.enableSound();
      this.isAudioInitialized = true;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("click", unlock);
    };

    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock);
    window.addEventListener("click", unlock);
  }

  private getAudioContext(): AudioContext | null {
    if (!this.audioContext) {
      try {
        // @ts-ignore - للتوافق مع جميع المتصفحات
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
        }
      } catch (error) {
        console.error("❌ [SOUND] Failed to create audio context:", error);
        return null;
      }
    }

    return this.audioContext;
  }

  // إنذار عالي لتنبيه أي حد في المكان بأن طلباً جديداً وصل
  playOrderAlarm(options?: {
    volume?: number;
    durationMs?: number;
    pattern?: OrderSoundPattern;
  }) {
    const audioContext = this.getAudioContext();
    if (!audioContext) {
      console.warn("⚠️ [SOUND] Audio context not available");
      return;
    }

    const runAlarm = () => {
      this.stopOrderAlarm();

      const volume = Math.min(1, Math.max(0, options?.volume ?? 1));
      const durationMs = options?.durationMs ?? 7000;
      const pattern = options?.pattern ?? "alarm";

      const masterGain = audioContext.createGain();
      masterGain.gain.setValueAtTime(0.001, audioContext.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(
        0.9 * volume,
        audioContext.currentTime + 0.15,
      );
      masterGain.connect(audioContext.destination);

      const oscillators: OscillatorNode[] = [];

      const stopAll = () => {
        for (const oscillator of oscillators) {
          try {
            oscillator.stop();
            oscillator.disconnect();
          } catch (error) {
            // تجاهل أخطاء الإيقاف
          }
        }
        try {
          masterGain.disconnect();
        } catch (error) {
          // تجاهل
        }
      };

      this.alarmSources.push({ stop: stopAll });

      // بناء نوتات النغمة المختارة وجدولة تشغيلها
      const events = this.buildPatternEvents(
        pattern,
        audioContext.currentTime,
        durationMs / 1000,
      );

      for (const event of events) {
        const oscillator = audioContext.createOscillator();
        oscillator.type = event.waveform;
        oscillator.frequency.setValueAtTime(event.freq, event.start);

        const noteGain = audioContext.createGain();
        const attack = 0.02;
        const release = Math.min(0.12, event.duration / 3);
        noteGain.gain.setValueAtTime(0.0001, event.start);
        noteGain.gain.exponentialRampToValueAtTime(
          0.9 * volume,
          event.start + attack,
        );
        noteGain.gain.setValueAtTime(
          0.9 * volume,
          event.start + Math.max(attack, event.duration - release),
        );
        noteGain.gain.exponentialRampToValueAtTime(
          0.0001,
          event.start + event.duration,
        );

        oscillator.connect(noteGain);
        noteGain.connect(masterGain);
        oscillator.start(event.start);
        oscillator.stop(event.start + event.duration + 0.02);
        oscillators.push(oscillator);
      }

      this.alarmStopTimer = setTimeout(stopAll, durationMs + 300);
      console.log("🚨 [SOUND] Order alarm played (loud)", {
        pattern,
        volume,
        durationMs,
        notes: events.length,
      });
    };

    if (audioContext.state === "suspended") {
      audioContext
        .resume()
        .then(runAlarm)
        .catch((error) => {
          console.warn("⚠️ [SOUND] Could not resume audio context:", error);
        });
    } else {
      runAlarm();
    }
  }

  // توليد نوتات النغمة المختارة حتى نهاية المدة
  private buildPatternEvents(
    pattern: OrderSoundPattern,
    startTime: number,
    durationSeconds: number,
  ): Array<{
    freq: number;
    start: number;
    duration: number;
    waveform: OscillatorType;
  }> {
    const seq = ORDER_SOUND_PATTERN_NOTES[pattern] || ORDER_SOUND_PATTERN_NOTES.alarm;
    const waveform: OscillatorType =
      pattern === "smooth"
        ? "sine"
        : pattern === "classic"
          ? "triangle"
          : "square";

    const events: Array<{
      freq: number;
      start: number;
      duration: number;
      waveform: OscillatorType;
    }> = [];

    const end = startTime + durationSeconds;
    let cursor = startTime;

    while (cursor < end) {
      for (const note of seq) {
        const start = cursor;
        if (start >= end) {
          break;
        }
        events.push({
          freq: note.freq,
          start,
          duration: Math.min(note.duration, end - start),
          waveform,
        });
        cursor += note.duration + note.gap;
      }
    }

    return events;
  }

  // إيقاف الإنذار فوراً
  stopOrderAlarm() {
    if (this.alarmStopTimer) {
      clearTimeout(this.alarmStopTimer);
      this.alarmStopTimer = null;
    }
    for (const source of this.alarmSources) {
      try {
        source.stop();
      } catch (error) {
        // تجاهل
      }
    }
    this.alarmSources = [];
  }

  // اختبار سريع لصوت الطلبات من صفحة الإعدادات
  testOrderSound(volume = 1, pattern: OrderSoundPattern = "alarm") {
    this.playOrderAlarm({ volume, durationMs: 1800, pattern });
  }

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }
    if (this.isConnecting && this.socket) {
      return this.socket;
    }
    if (this.socket) {
      this.disconnect();
    }

    // 🔐 Get authentication token from tokenManager
    const token = tokenManager.getAccessToken();

    // Configure Socket.IO with authentication
    const socketConfig: any = {
      transports: ["websocket", "polling"],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    };

    // Pass token in both auth and query for maximum compatibility
    if (token) {
      socketConfig.auth = { token };
      socketConfig.query = { token };
      console.log("🔐 [SOCKET] Connecting with authentication token");
    } else {
      console.warn(
        "⚠️ [SOCKET] No authentication token found, connecting without auth",
      );
    }

    this.isConnecting = true;
    this.socket = io(this.baseURL, socketConfig);

    this.socket.on("connect", () => {
      this.isConnecting = false;
      console.log("✅ [SOCKET] Connected to server");

      // 🔐 إرسال معلومات المستخدم مع دعم عزل الشركات
      this.sendUserJoinEvent();
    });

    this.socket.on("disconnect", (reason: string) => {
      this.isConnecting = false;
      console.log("🔌 [SOCKET] Disconnected from server:", reason);
    });

    this.socket.on("connect_error", (error: any) => {
      this.isConnecting = false;
      console.error("❌ [SOCKET] Connection error:", error);
    });

    return this.socket;
  }

  private sendUserJoinEvent() {
    const storedUserId = localStorage.getItem("userId");
    const userDataStr = localStorage.getItem("user");

    if (userDataStr && this.socket) {
      try {
        const userData = JSON.parse(userDataStr);
        const userId = storedUserId || userData.id;

        if (!userId) {
          return;
        }

        const userJoinData = {
          userId: userId,
          userName:
            `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
            userData.email ||
            "مستخدم",
          companyId: userData.companyId,
        };

        console.log(
          "🔌 [SOCKET-SERVICE] Sending user_join with company isolation:",
          userJoinData,
        );
        this.socket.emit("user_join", userJoinData);
      } catch (error) {
        console.error("❌ [SOCKET-SERVICE] Error parsing user data:", error);
        // Fallback to basic user_join
        this.socket.emit("user_join", { userId });
      }
    } else {
      // تجاهل التحذير - هذا طبيعي أثناء تحميل بيانات المستخدم أو بعد تسجيل الخروج
      if (import.meta.env.DEV) {
        console.debug(
          "🔍 [SOCKET-SERVICE] User data not yet available for Socket.IO connection",
        );
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinConversation(conversationId: string) {
    if (this.socket) {
      this.socket.emit("join:conversation", conversationId);
    }
  }

  leaveConversation(conversationId: string) {
    if (this.socket) {
      this.socket.emit("leave:conversation", conversationId);
    }
  }

  sendMessage(message: Omit<Message, "id" | "timestamp" | "status">) {
    if (this.socket) {
      this.socket.emit("message:send", message);
    }
  }

  sendTyping(conversationId: string, userId: string, userName: string) {
    if (this.socket) {
      this.socket.emit("typing:start", { conversationId, userId, userName });
    }
  }

  stopTyping(conversationId: string, userId: string) {
    if (this.socket) {
      this.socket.emit("typing:stop", { conversationId, userId });
    }
  }

  markAsRead(messageId: string, conversationId: string) {
    if (this.socket) {
      this.socket.emit("message:read", { messageId, conversationId });
    }
  }

  markAsDelivered(messageId: string, conversationId: string) {
    if (this.socket) {
      this.socket.emit("message:delivered", { messageId, conversationId });
    }
  }

  onMessage(callback: (message: Message) => void) {
    if (this.socket) {
      this.socket.on("new_message", callback);
    }
  }

  onMessageDelivered(
    callback: (data: { messageId: string; conversationId: string }) => void,
  ) {
    if (this.socket) {
      this.socket.on("message:delivered", callback);
    }
  }

  onMessageRead(
    callback: (data: { messageId: string; conversationId: string }) => void,
  ) {
    if (this.socket) {
      this.socket.on("message:read", callback);
    }
  }

  onTypingStart(
    callback: (data: {
      conversationId: string;
      userId: string;
      userName: string;
    }) => void,
  ) {
    if (this.socket) {
      this.socket.on("typing:start", callback);
    }
  }

  onTypingStop(
    callback: (data: { conversationId: string; userId: string }) => void,
  ) {
    if (this.socket) {
      this.socket.on("typing:stop", callback);
    }
  }

  onUserOnline(callback: (data: { userId: string }) => void) {
    if (this.socket) {
      this.socket.on("user:online", callback);
    }
  }

  onUserOffline(callback: (data: { userId: string }) => void) {
    if (this.socket) {
      this.socket.on("user:offline", callback);
    }
  }

  onConversationUpdated(callback: (conversation: Conversation) => void) {
    if (this.socket) {
      this.socket.on("conversation:updated", callback);
    }
  }

  onNewConversation(callback: (conversation: Conversation) => void) {
    if (this.socket) {
      this.socket.on("conversation:new", callback);
    }
  }

  onNotification(
    callback: (data: { message: Message; conversation: Conversation }) => void,
  ) {
    if (this.socket) {
      this.socket.on("notification:new", callback);
    }
  }

  onCampaignProgress(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on("campaign:progress", callback);
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  getSocket() {
    if (!this.socket) {
      this.connect();
    }
    return this.socket;
  }
}

export const socketService = new SocketService();
export default socketService;
export type { Message, Conversation };
