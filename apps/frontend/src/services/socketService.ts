import { io, Socket } from "socket.io-client";
import { buildWsUrl } from "../utils/urlHelper";
import { tokenManager } from "../utils/tokenManager";
import { getDeviceFingerprint, isPersonalDevice } from "../utils/deviceFingerprint";
import {
  buildPatternEvents,
  getOrderSoundAudioUrl,
  type OrderSoundPattern,
} from "./orderSoundPatterns";

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
  "order:incomplete:new": (data: any) => void;
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

export type { OrderSoundPattern } from "./orderSoundPatterns";
export { ORDER_SOUND_PATTERNS } from "./orderSoundPatterns";

class SocketService {
  private socket: Socket<SocketEvents, SocketEmitEvents> | null = null;
  private baseURL = buildWsUrl();
  private audioContext: AudioContext | null = null;
  private isAudioInitialized: boolean = false;
  private isConnecting: boolean = false;
  private alarmStopTimer: ReturnType<typeof setTimeout> | null = null;
  private alarmSources: Array<{ stop: () => void }> = [];
  private audioBufferCache: Map<string, AudioBuffer> = new Map();

  constructor() {
    // Audio Context is initialized lazily on connect() or alarm playback,
    // preventing main-thread lag for unauthenticated storefront visitors.
  }

  public ensureAudioSetup() {
    if (!this.isAudioInitialized && typeof window !== "undefined") {
      this.initAudioContext();
      this.setupAudioUnlock();
    }
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
    // 🖥️ [DEVICE-ISOLATION] Mute noisy notification chime on personal devices
    if (isPersonalDevice()) {
      return;
    }

    this.ensureAudioSetup();
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
    loop?: boolean;
    boost?: boolean;
  }) {
    // 🖥️ [DEVICE-ISOLATION] Mute noisy order alarms on personal devices
    if (isPersonalDevice()) {
      return;
    }

    const audioContext = this.getAudioContext();
    if (!audioContext) {
      console.warn("⚠️ [SOUND] Audio context not available");
      return;
    }


    const runAlarm = () => {
      this.stopOrderAlarm();

      const boost = options?.boost ?? false;
      const volume = Math.min(2, Math.max(0, options?.volume ?? 1));
      const durationMs = options?.durationMs ?? 7000;
      const pattern = options?.pattern ?? "alarm";
      const loop = options?.loop ?? true;
      const audioUrl = getOrderSoundAudioUrl(pattern);

      // Dynamics Compressor لتعظيم قوة الصوت (Loudness Maximizer) ومنع التشويش عند رفع الصوت لأقصى حد
      let compressorNode: DynamicsCompressorNode | null = null;
      try {
        compressorNode = audioContext.createDynamicsCompressor();
        compressorNode.threshold.setValueAtTime(-18, audioContext.currentTime);
        compressorNode.knee.setValueAtTime(10, audioContext.currentTime);
        compressorNode.ratio.setValueAtTime(12, audioContext.currentTime);
        compressorNode.attack.setValueAtTime(0.002, audioContext.currentTime);
        compressorNode.release.setValueAtTime(0.2, audioContext.currentTime);
        compressorNode.connect(audioContext.destination);
      } catch {
        // Fallback إذا كان المتصفح لا يدعم Compressor
      }

      const targetGain = boost ? 1.6 * volume : 0.95 * volume;

      const masterGain = audioContext.createGain();
      masterGain.gain.setValueAtTime(0.001, audioContext.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(
        targetGain,
        audioContext.currentTime + 0.1,
      );

      if (compressorNode) {
        masterGain.connect(compressorNode);
      } else {
        masterGain.connect(audioContext.destination);
      }

      const activeSources: Array<{ stop: () => void }> = [];

      const stopAll = () => {
        for (const source of activeSources) {
          try {
            source.stop();
          } catch (error) {
            // تجاهل أخطاء الإيقاف
          }
        }
        try {
          masterGain.disconnect();
        } catch (error) {
          // تجاهل
        }
        if (compressorNode) {
          try {
            compressorNode.disconnect();
          } catch (error) {
            // تجاهل
          }
        }
      };

      this.alarmSources.push({ stop: stopAll });

      if (audioUrl) {
        // نغمة مبنية على ملف صوت حقيقي (كاشير / عملات)
        this.playOrderSoundFile(audioUrl, {
          audioContext,
          masterGain,
          volume: boost ? volume * 1.3 : volume,
          durationMs,
          pattern,
          loop,
          registerSource: (stop) => activeSources.push({ stop }),
        });
      } else {
        // نغمة مولّدة بـ Web Audio (الأنماط القديمة)
        this.playSynthesizedOrderSound({
          audioContext,
          masterGain,
          volume,
          durationMs,
          pattern,
          registerSource: (stop) => activeSources.push({ stop }),
          boost,
        });
      }

      this.alarmStopTimer = setTimeout(stopAll, durationMs + 300);
      console.log("🚨 [SOUND] Order alarm played", {
        pattern,
        volume,
        durationMs,
        loop,
        boost,
        audioFile: audioUrl ?? null,
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

  // تشغيل نغمة من ملف صوتي حقيقي مع Fade-in/Fade-out
  private playOrderSoundFile(
    url: string,
    options: {
      audioContext: AudioContext;
      masterGain: GainNode;
      volume: number;
      durationMs: number;
      pattern: OrderSoundPattern;
      registerSource: (stop: () => void) => void;
      loop?: boolean;
    },
  ) {
    const {
      audioContext,
      masterGain,
      volume,
      durationMs,
      pattern,
      registerSource,
      loop = true,
    } = options;
    const startTime = audioContext.currentTime;

    const sourceGain = audioContext.createGain();
    sourceGain.gain.setValueAtTime(0.0001, startTime);
    sourceGain.gain.exponentialRampToValueAtTime(1, startTime + 0.15);
    const fadeOutAt = startTime + Math.max(0.2, durationMs / 1000 - 0.3);
    sourceGain.gain.setValueAtTime(1, fadeOutAt);
    sourceGain.gain.exponentialRampToValueAtTime(0.0001, fadeOutAt + 0.3);
    sourceGain.connect(masterGain);

    const source = audioContext.createBufferSource();
    source.loop = loop;
    source.connect(sourceGain);

    const stopSource = () => {
      try {
        source.stop();
      } catch (error) {
        // تجاهل
      }
      try {
        source.disconnect();
      } catch (error) {
        // تجاهل
      }
      try {
        sourceGain.disconnect();
      } catch (error) {
        // تجاهل
      }
    };
    registerSource(stopSource);

    const startBuffer = (buffer: AudioBuffer) => {
      source.buffer = buffer;
      source.start(audioContext.currentTime);
    };

    const cached = this.audioBufferCache.get(url);
    if (cached) {
      startBuffer(cached);
      return;
    }

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
      .then((buffer) => {
        this.audioBufferCache.set(url, buffer);
        startBuffer(buffer);
      })
      .catch((error) => {
        console.error(
          "❌ [SOUND] Failed to load order sound file, falling back to synthesized tone:",
          url,
          error,
        );
        // الرجوع للنغمة المولّدة حتى لو فشل تحميل الملف يفضل في صوت
        stopSource();
        this.playSynthesizedOrderSound({
          audioContext,
          masterGain,
          volume,
          durationMs,
          pattern: "alarm",
          registerSource,
        });
      });
  }

  // توليد نغمة الطلب عبر Web Audio (الأنماط القديمة: إنذار/عاجل/كلاسيكي...)
  private playSynthesizedOrderSound(options: {
    audioContext: AudioContext;
    masterGain: GainNode;
    volume: number;
    durationMs: number;
    pattern: OrderSoundPattern;
    registerSource: (stop: () => void) => void;
    boost?: boolean;
  }) {
    const {
      audioContext,
      masterGain,
      volume,
      durationMs,
      pattern,
      registerSource,
      boost = false,
    } = options;

    const oscillators: OscillatorNode[] = [];
    registerSource(() => {
      for (const oscillator of oscillators) {
        try {
          oscillator.stop();
          oscillator.disconnect();
        } catch (error) {
          // تجاهل أخطاء الإيقاف
        }
      }
    });

    // بناء نوتات النغمة المختارة وجدولة تشغيلها
    const events = buildPatternEvents(
      pattern,
      audioContext.currentTime,
      durationMs / 1000,
    );

    const peakGain = boost ? 1.3 * volume : 0.9 * volume;

    for (const event of events) {
      const oscillator = audioContext.createOscillator();
      oscillator.type = event.waveform;
      oscillator.frequency.setValueAtTime(event.freq, event.start);

      const noteGain = audioContext.createGain();
      const attack = 0.02;
      const release = Math.min(0.12, event.duration / 3);
      noteGain.gain.setValueAtTime(0.0001, event.start);
      noteGain.gain.exponentialRampToValueAtTime(
        peakGain,
        event.start + attack,
      );
      noteGain.gain.setValueAtTime(
        peakGain,
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

      // مضاعفة وتضخيم ترددات إنذار الطلبات (Harmonic Reinforcement) عند تفعيل boost لصوت عالي جداً وقاطع
      if (boost && pattern === "alarm") {
        const subOsc = audioContext.createOscillator();
        subOsc.type = "square";
        subOsc.frequency.setValueAtTime(event.freq * 0.5, event.start);
        const subGain = audioContext.createGain();
        subGain.gain.setValueAtTime(0.0001, event.start);
        subGain.gain.exponentialRampToValueAtTime(
          0.5 * volume,
          event.start + attack,
        );
        subGain.gain.setValueAtTime(
          0.5 * volume,
          event.start + Math.max(attack, event.duration - release),
        );
        subGain.gain.exponentialRampToValueAtTime(
          0.0001,
          event.start + event.duration,
        );
        subOsc.connect(subGain);
        subGain.connect(masterGain);
        subOsc.start(event.start);
        subOsc.stop(event.start + event.duration + 0.02);
        oscillators.push(subOsc);
      }
    }
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
    this.ensureAudioSetup();
    if (this.socket?.connected) {
      return this.socket;
    }
    if (this.isConnecting && this.socket) {
      return this.socket;
    }
    if (this.socket) {
      this.disconnect();
    }

    // Configure Socket.IO with authentication
    const socketConfig: any = {
      transports: ["websocket", "polling"],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    };

    // 🔐 Use a function for auth so each reconnection gets a fresh token
    socketConfig.auth = (cb: (data: { token: string | null; deviceFingerprint?: string }) => void) => {
      const freshToken = tokenManager.getAccessToken();
      const deviceFingerprint = getDeviceFingerprint();
      if (freshToken) {
        console.log("🔐 [SOCKET] Connecting with authentication token & device fingerprint");
      } else {
        console.warn(
          "⚠️ [SOCKET] No authentication token found, connecting without auth",
        );
      }
      cb({ token: freshToken, deviceFingerprint });
    };


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
        if (storedUserId) {
          this.socket.emit("user_join", { userId: storedUserId });
        }
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
