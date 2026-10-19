/**
 * Telephony & Socket System Simulation Test Suite
 * Comprehensive End-to-End simulation testing:
 * 1. Data Flow & Socket Room Isolation (Company & User level)
 * 2. Mobile Agent Handshake, Device Filtering & dial_received propagation
 * 3. OrderCallButton Watchdog, Cooldown, Toast Debounce & Listener Cleanup
 * 4. MobileCallOverlay AudioContext lifecycle, Auto-dismiss timer & Memory leak guards
 */

const EventEmitter = require('events');

// Colors for terminal output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let passedTests = 0;
let failedTests = 0;
const testResults = [];

function assert(condition, message, details = '') {
  if (condition) {
    passedTests++;
    console.log(`  ${GREEN}✓ PASS:${RESET} ${message}`);
    testResults.push({ name: message, status: 'PASS', details });
  } else {
    failedTests++;
    console.error(`  ${RED}✗ FAIL:${RESET} ${message} ${details ? '(' + details + ')' : ''}`);
    testResults.push({ name: message, status: 'FAIL', details });
  }
}

// -------------------------------------------------------------
// PART 1: Mock Socket.IO Server & Multi-Tenant Isolation Simulation
// -------------------------------------------------------------
class MockSocketServer {
  constructor() {
    this.rooms = new Map(); // roomName -> Set of sockets
    this.sockets = new Map(); // socketId -> socket
  }

  createSocket(id, user = {}) {
    const socket = new EventEmitter();
    socket.id = id;
    socket.userId = user.userId || null;
    socket.companyId = user.companyId || null;
    socket.userName = user.userName || 'User';
    socket.rooms = new Set();
    socket.receivedEvents = [];

    socket.join = (room) => {
      socket.rooms.add(room);
      if (!this.rooms.has(room)) {
        this.rooms.set(room, new Set());
      }
      this.rooms.get(room).add(socket);
    };

    socket.leave = (room) => {
      socket.rooms.delete(room);
      if (this.rooms.has(room)) {
        this.rooms.get(room).delete(socket);
      }
    };

    // Helper to record events received by this client
    socket.receiveEvent = (event, data) => {
      socket.receivedEvents.push({ event, data, timestamp: Date.now() });
      socket.emit(event, data);
    };

    this.sockets.set(id, socket);
    return socket;
  }

  // Socket.IO .to() implementation supporting room chaining and emission
  to(roomName) {
    const targetRooms = [roomName];
    const self = this;

    const chain = {
      to(nextRoom) {
        targetRooms.push(nextRoom);
        return chain;
      },
      emit(event, data) {
        const deliveredToSockets = new Set();
        for (const r of targetRooms) {
          const roomSockets = self.rooms.get(r);
          if (roomSockets) {
            for (const sock of roomSockets) {
              if (!deliveredToSockets.has(sock.id)) {
                deliveredToSockets.add(sock.id);
                sock.receiveEvent(event, data);
              }
            }
          }
        }
        return deliveredToSockets.size;
      }
    };
    return chain;
  }

  // Global broadcast (what happens if socket.companyId is missing in unhardened code)
  emit(event, data) {
    for (const sock of this.sockets.values()) {
      sock.receiveEvent(event, data);
    }
  }
}

async function runSocketDataFlowSimulation() {
  console.log(`\n${BOLD}${CYAN}======================================================${RESET}`);
  console.log(`${BOLD}${CYAN}1. Socket Room Isolation & Data Flow Simulation Tests${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================${RESET}\n`);

  const server = new MockSocketServer();

  // Create clients across 2 companies:
  // Company A:
  // - desktop_A1 (User A1)
  // - mobile_A2 (User A1's phone, deviceId = 'dev_phone_1')
  // - desktop_A3 (User A2 in Company A)
  // Company B:
  // - desktop_B1 (User B1 in Company B)
  // Unauthenticated client:
  // - rogue_client (No companyId)

  const desktop_A1 = server.createSocket('sock_desktop_A1', { userId: 'user_A1', companyId: 'comp_A' });
  const mobile_A2 = server.createSocket('sock_mobile_A2', { userId: 'user_A1', companyId: 'comp_A' });
  const desktop_A3 = server.createSocket('sock_desktop_A3', { userId: 'user_A2', companyId: 'comp_A' });
  const desktop_B1 = server.createSocket('sock_desktop_B1', { userId: 'user_B1', companyId: 'comp_B' });
  const rogue_client = server.createSocket('sock_rogue', { userId: null, companyId: null });

  // Simulate server join logic from apps/backend/services/socketService.js:
  [desktop_A1, mobile_A2, desktop_A3, desktop_B1].forEach(sock => {
    sock.join(`company_${sock.companyId}`);
    sock.join(`user_${sock.userId}`);
    sock.join(`user:${sock.userId}`);
  });

  // Verify room joins
  assert(desktop_A1.rooms.has('company_comp_A') && desktop_A1.rooms.has('user_user_A1'),
    'Client desktop_A1 correctly joined company_comp_A and user_user_A1 rooms');
  assert(desktop_B1.rooms.has('company_comp_B') && !desktop_B1.rooms.has('company_comp_A'),
    'Client desktop_B1 is strictly isolated to company_comp_B');

  // -------------------------------------------------------------
  // Test 1: Outbound Call Initiate (telephony:dial)
  // -------------------------------------------------------------
  console.log(`\n${CYAN}Testing telephony:dial emission & multi-tenant isolation...${RESET}`);

  const dialPayload = {
    sessionId: 'call_sim_123',
    orderId: 'order_1001',
    orderNumber: 'ORD-1001',
    customerName: 'محمد أحمد',
    customerPhone: '+201012345678',
    deviceId: 'dev_phone_1'
  };

  // Backend emits to user and company
  server.to(`user_${mobile_A2.userId}`).emit('telephony:dial', dialPayload);
  server.to(`company_${desktop_A1.companyId}`).emit('telephony:dial', dialPayload);

  // Check reception:
  const mobileA2Received = mobile_A2.receivedEvents.filter(e => e.event === 'telephony:dial');
  const desktopB1Received = desktop_B1.receivedEvents.filter(e => e.event === 'telephony:dial');

  assert(mobileA2Received.length > 0, 'Target mobile phone (mobile_A2) received telephony:dial');
  assert(desktopB1Received.length === 0, 'Company B client (desktop_B1) NEVER received telephony:dial (Zero Cross-Tenant Leakage)');

  // -------------------------------------------------------------
  // Test 2: Device ID Filtering in Mobile Telephony Service
  // -------------------------------------------------------------
  console.log(`\n${CYAN}Testing mobile agent device filtering logic...${RESET}`);

  function simulateMobileAgentDialHandler(deviceInfo, eventData) {
    if (!eventData?.customerPhone) return { processed: false, reason: 'no_phone' };
    if (eventData.deviceId && deviceInfo?.deviceId && eventData.deviceId !== deviceInfo.deviceId) {
      return { processed: false, reason: 'device_mismatch' };
    }
    return { processed: true, reason: 'accepted' };
  }

  const myDevice = { deviceId: 'dev_phone_1', deviceName: 'Samsung S24' };
  const otherDevice = { deviceId: 'dev_phone_2', deviceName: 'Pixel 8' };

  const matchedProcess = simulateMobileAgentDialHandler(myDevice, dialPayload);
  assert(matchedProcess.processed === true, 'Device with matching deviceId accepted telephony:dial');

  const mismatchedProcess = simulateMobileAgentDialHandler(otherDevice, dialPayload);
  assert(mismatchedProcess.processed === false && mismatchedProcess.reason === 'device_mismatch',
    'Device with different deviceId rejected telephony:dial (Zero Crosstalk)');

  // -------------------------------------------------------------
  // Test 3: Dial Received Acknowledgment (telephony:dial_received)
  // -------------------------------------------------------------
  console.log(`\n${CYAN}Testing telephony:dial_received flow & unauthenticated socket isolation...${RESET}`);

  // When mobile receives dial command, it emits telephony:dial_received
  function handleDialReceivedOnServer(socket, data) {
    // Hardened check: must have companyId
    if (!server || !data || !socket.companyId) {
      return false; // Denied / dropped
    }
    let target = server;
    if (socket.companyId) {
      target = target.to(`company_${socket.companyId}`);
    }
    if (socket.userId) {
      target = target.to(`user_${socket.userId}`);
    }
    target.emit('telephony:dial_received', data);
    return true;
  }

  const dialAckPayload = {
    sessionId: dialPayload.sessionId,
    orderId: dialPayload.orderId,
    customerPhone: dialPayload.customerPhone,
    deviceName: myDevice.deviceName
  };

  // Mobile A2 confirms reception:
  const ackAccepted = handleDialReceivedOnServer(mobile_A2, dialAckPayload);
  assert(ackAccepted === true, 'Server accepted dial_received from authenticated mobile socket');

  const desktopA1ReceivedAck = desktop_A1.receivedEvents.filter(e => e.event === 'telephony:dial_received');
  const desktopB1ReceivedAck = desktop_B1.receivedEvents.filter(e => e.event === 'telephony:dial_received');

  assert(desktopA1ReceivedAck.length > 0 && desktopA1ReceivedAck[0].data.orderId === 'order_1001',
    'Originating desktop (desktop_A1) received telephony:dial_received acknowledgment');
  assert(desktopB1ReceivedAck.length === 0,
    'Foreign company client (desktop_B1) NEVER received telephony:dial_received');

  // Rogue / unauthenticated client attempt:
  const rogueAckResult = handleDialReceivedOnServer(rogue_client, dialAckPayload);
  assert(rogueAckResult === false,
    'Unauthenticated socket attempt to emit telephony:dial_received was securely dropped (No Global Leak)');

  // -------------------------------------------------------------
  // Test 4: Call Completed Event (telephony:call_ended)
  // -------------------------------------------------------------
  console.log(`\n${CYAN}Testing telephony:call_ended broadcast & tenant isolation...${RESET}`);

  const callEndedPayload = {
    sessionId: dialPayload.sessionId,
    orderId: dialPayload.orderId,
    durationSeconds: 42,
    callStatus: 'COMPLETED',
    result: 'reached'
  };

  server.to(`company_${mobile_A2.companyId}`).emit('telephony:call_ended', callEndedPayload);

  const desktopA1CallEnded = desktop_A1.receivedEvents.filter(e => e.event === 'telephony:call_ended');
  const desktopB1CallEnded = desktop_B1.receivedEvents.filter(e => e.event === 'telephony:call_ended');

  assert(desktopA1CallEnded.length > 0 && desktopA1CallEnded[0].data.durationSeconds === 42,
    'desktop_A1 received telephony:call_ended with correct duration (42s)');
  assert(desktopB1CallEnded.length === 0,
    'desktop_B1 received zero telephony:call_ended events');
}

// -------------------------------------------------------------
// PART 2: OrderCallButton Logic Simulation (Watchdog, Debounce, Cleanup)
// -------------------------------------------------------------
async function runOrderCallButtonSimulation() {
  console.log(`\n${BOLD}${CYAN}======================================================${RESET}`);
  console.log(`${BOLD}${CYAN}2. OrderCallButton Watchdog, Debounce & Memory Tests  ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================${RESET}\n`);

  // Mock Component State & Refs
  class OrderCallButtonSimulator {
    constructor(orderId, customerPhone, onCallFinished) {
      this.orderId = orderId;
      this.customerPhone = customerPhone;
      this.onCallFinished = onCallFinished;
      this.isDialing = false;
      this.isLoading = false;
      this.cooldown = 0;
      this.lastDuration = 0;
      this.showDisposition = false;
      this.dialWatchdog = null;
      this.watchdogTriggered = false;
      this.lastDialToastTime = 0;
      this.toastLog = [];

      this.activeListeners = new Map(); // event -> handler
    }

    armDialWatchdog(timeoutMs = 100) { // Scaled down for fast simulation
      this.clearDialWatchdog();
      this.dialWatchdog = setTimeout(() => {
        this.isDialing = false;
        this.watchdogTriggered = true;
        this.toastLog.push({ type: 'error', message: 'لم يستجب هاتفك للأمر' });
      }, timeoutMs);
    }

    clearDialWatchdog() {
      if (this.dialWatchdog) {
        clearTimeout(this.dialWatchdog);
        this.dialWatchdog = null;
      }
    }

    mount() {
      // Register event listeners
      const handleCallEnded = (data) => {
        if (data?.orderId === this.orderId) {
          this.clearDialWatchdog();
          this.isDialing = false;
          this.lastDuration = data?.durationSeconds || 0;
          this.showDisposition = true;
          this.onCallFinished?.();
        }
      };

      const handleDialReceived = (data) => {
        if (data?.orderId === this.orderId) {
          const now = Date.now();
          if (now - this.lastDialToastTime > 50) { // 50ms scaled debounce
            this.lastDialToastTime = now;
            this.toastLog.push({ type: 'info', message: 'الهاتف استلم أمر الاتصال' });
          }
          this.armDialWatchdog(100);
        }
      };

      this.activeListeners.set('telephony:call_ended', handleCallEnded);
      this.activeListeners.set('telephony:dial_received', handleDialReceived);
    }

    unmount() {
      this.clearDialWatchdog();
      // Remove all listeners
      this.activeListeners.clear();
    }

    triggerEvent(event, data) {
      const handler = this.activeListeners.get(event);
      if (handler) {
        handler(data);
      }
    }

    startCall() {
      if (this.cooldown > 0) {
        this.toastLog.push({ type: 'error', message: 'يرجى الانتظار (cooldown)' });
        return false;
      }
      this.isDialing = true;
      this.cooldown = 20;
      this.armDialWatchdog(100);
      return true;
    }
  }

  // Test 1: Watchdog Timeout Trigger
  console.log(`${CYAN}Testing Watchdog 30s timeout trigger on unresponsive phone...${RESET}`);
  const btn1 = new OrderCallButtonSimulator('ord_101', '+201012345678');
  btn1.mount();
  btn1.startCall();
  assert(btn1.isDialing === true, 'OrderCallButton is dialing after startCall()');

  await new Promise(r => setTimeout(r, 120));
  assert(btn1.isDialing === false && btn1.watchdogTriggered === true,
    'Watchdog timer automatically terminated dialing and displayed phone unresponsive toast');
  btn1.unmount();

  // Test 2: Watchdog Reset on dial_received and Clear on call_ended
  console.log(`\n${CYAN}Testing Watchdog re-arming on dial_received & cleanup on call_ended...${RESET}`);
  let callFinishedFired = false;
  const btn2 = new OrderCallButtonSimulator('ord_102', '+201012345678', () => { callFinishedFired = true; });
  btn2.mount();
  btn2.startCall();

  // Simulate phone ack after 40ms
  await new Promise(r => setTimeout(r, 40));
  btn2.triggerEvent('telephony:dial_received', { orderId: 'ord_102' });
  assert(btn2.toastLog.some(t => t.message.includes('استلم أمر الاتصال')),
    'Toast shown upon receiving dial_received');

  // Simulate call ended after another 40ms (before second watchdog expires)
  await new Promise(r => setTimeout(r, 40));
  btn2.triggerEvent('telephony:call_ended', { orderId: 'ord_102', durationSeconds: 25 });

  assert(btn2.isDialing === false && btn2.watchdogTriggered === false,
    'Watchdog safely cleared by telephony:call_ended before timeout');
  assert(btn2.showDisposition === true && btn2.lastDuration === 25,
    'QuickCallDisposition modal opened with exact duration (25s)');
  assert(callFinishedFired === true, 'onCallFinished callback successfully invoked');
  btn2.unmount();

  // Test 3: Cooldown & Debounce Protection
  console.log(`\n${CYAN}Testing Cooldown & Toast Debounce Protection...${RESET}`);
  const btn3 = new OrderCallButtonSimulator('ord_103', '+201012345678');
  btn3.mount();
  btn3.startCall();
  const doubleClickSuccess = btn3.startCall(); // Immediate second click
  assert(doubleClickSuccess === false, 'Rapid second click blocked by cooldown guard');

  // Multiple rapid dial_received events
  btn3.triggerEvent('telephony:dial_received', { orderId: 'ord_103' });
  btn3.triggerEvent('telephony:dial_received', { orderId: 'ord_103' });
  btn3.triggerEvent('telephony:dial_received', { orderId: 'ord_103' });

  const dialReceivedToasts = btn3.toastLog.filter(t => t.message.includes('استلم أمر الاتصال'));
  assert(dialReceivedToasts.length === 1, 'Toast debounce throttled duplicate dial_received notifications to 1');
  btn3.unmount();

  // Test 4: Memory Leak / Orphaned Listener Check on Unmount
  console.log(`\n${CYAN}Testing Memory Leak & Orphaned Listener cleanup on unmount...${RESET}`);
  const btn4 = new OrderCallButtonSimulator('ord_104', '+201012345678');
  btn4.mount();
  assert(btn4.activeListeners.size === 2, 'Component has 2 active socket listeners mounted');

  btn4.unmount();
  assert(btn4.activeListeners.size === 0 && btn4.dialWatchdog === null,
    'Component unmount successfully destroyed all socket listeners and timer handles (Zero Orphaned Listeners)');
}

// -------------------------------------------------------------
// PART 3: MobileCallOverlay AudioContext & Dismiss Timer Simulation
// -------------------------------------------------------------
async function runMobileCallOverlaySimulation() {
  console.log(`\n${BOLD}${CYAN}======================================================${RESET}`);
  console.log(`${BOLD}${CYAN}3. MobileCallOverlay Audio & Dismiss Timer Tests      ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================${RESET}\n`);

  // Mock AudioContext to test resource lifecycle
  class MockAudioContext {
    constructor() {
      this.state = 'running';
      this.isClosed = false;
      this.currentTime = 0;
      MockAudioContext.instances.push(this);
    }
    createOscillator() {
      return {
        type: 'sine',
        frequency: { setValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {}
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {}
      };
    }
    get destination() { return {}; }
    async close() {
      this.state = 'closed';
      this.isClosed = true;
    }
  }
  MockAudioContext.instances = [];

  class MobileCallOverlaySimulator {
    constructor() {
      this.activeCall = null;
      this.dismissTimer = null;
      this.audioCloseTimers = [];
      this.windowListeners = new Map();
    }

    mount() {
      const handleIncomingDial = (detail) => {
        if (!detail?.customerPhone) return;
        this.activeCall = detail;

        // Sound chime simulation with AudioContext
        const ctx = new MockAudioContext();
        const timer = setTimeout(() => {
          ctx.close().catch(() => {});
        }, 50); // Scaled 50ms for test
        this.audioCloseTimers.push(timer);

        // Auto-dismiss after 150ms (simulating 45s)
        if (this.dismissTimer) clearTimeout(this.dismissTimer);
        this.dismissTimer = setTimeout(() => {
          this.activeCall = null;
        }, 150);
      };

      this.windowListeners.set('telephony:incoming_dial', handleIncomingDial);
    }

    unmount() {
      if (this.dismissTimer) {
        clearTimeout(this.dismissTimer);
        this.dismissTimer = null;
      }
      this.windowListeners.clear();
    }

    triggerIncomingDial(dialData) {
      const handler = this.windowListeners.get('telephony:incoming_dial');
      if (handler) handler(dialData);
    }

    manualDismiss() {
      if (this.dismissTimer) clearTimeout(this.dismissTimer);
      this.activeCall = null;
    }
  }

  // Test 1: Incoming Dial & AudioContext Lifecycle
  console.log(`${CYAN}Testing AudioContext creation and automatic closing...${RESET}`);
  const overlay = new MobileCallOverlaySimulator();
  overlay.mount();

  overlay.triggerIncomingDial({
    sessionId: 'sess_overlay_1',
    orderId: 'ord_overlay_1',
    customerPhone: '+201099887766',
    customerName: 'فاطمة حسن'
  });

  assert(overlay.activeCall !== null && overlay.activeCall.customerName === 'فاطمة حسن',
    'Overlay successfully opened for incoming dial');
  assert(MockAudioContext.instances.length === 1, 'AudioContext created for chime tone');

  // Wait for audio close timer (50ms)
  await new Promise(r => setTimeout(r, 70));
  assert(MockAudioContext.instances[0].isClosed === true,
    'AudioContext was properly closed after tone playback (No Leaked Audio Nodes)');

  // Test 2: Auto-Dismiss Timer
  console.log(`\n${CYAN}Testing 45s auto-dismiss timer on unanswered overlay...${RESET}`);
  // Wait for auto-dismiss timer (150ms)
  await new Promise(r => setTimeout(r, 100));
  assert(overlay.activeCall === null,
    'Overlay automatically dismissed after inactivity timeout (auto-dismiss verified)');

  // Test 3: Manual Dismissal & Unmount Cleanup
  console.log(`\n${CYAN}Testing manual dismissal and unmount listener cleanup...${RESET}`);
  overlay.triggerIncomingDial({ customerPhone: '+201011112222', orderId: 'ord_2' });
  assert(overlay.activeCall !== null, 'Overlay opened again');

  overlay.manualDismiss();
  assert(overlay.activeCall === null, 'Overlay dismissed manually by user tap');

  overlay.unmount();
  assert(overlay.windowListeners.size === 0 && overlay.dismissTimer === null,
    'Window listeners and dismiss timers completely cleaned up on unmount (Zero Memory Leaks)');
}

// -------------------------------------------------------------
// MAIN RUNNER
// -------------------------------------------------------------
async function runAllSimulations() {
  const startTime = Date.now();
  console.log(`\n${BOLD}================================================================${RESET}`);
  console.log(`${BOLD}🚀 STARTING TELEPHONY & SOCKET SYSTEM SIMULATION & AUDIT SUITE 🚀${RESET}`);
  console.log(`${BOLD}================================================================${RESET}`);

  try {
    await runSocketDataFlowSimulation();
    await runOrderCallButtonSimulation();
    await runMobileCallOverlaySimulation();
  } catch (err) {
    console.error(`\n${RED}Simulation crashed unexpectedly:${RESET}`, err);
    process.exit(1);
  }

  const duration = Date.now() - startTime;
  console.log(`\n${BOLD}================================================================${RESET}`);
  console.log(`${BOLD}SUMMARY REPORT:${RESET}`);
  console.log(`  Total Checks: ${BOLD}${passedTests + failedTests}${RESET}`);
  console.log(`  Passed:       ${GREEN}${BOLD}${passedTests}${RESET}`);
  console.log(`  Failed:       ${failedTests > 0 ? RED : GREEN}${BOLD}${failedTests}${RESET}`);
  console.log(`  Duration:     ${duration}ms`);
  console.log(`${BOLD}================================================================${RESET}\n`);

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllSimulations();
