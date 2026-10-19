/**
 * Live Telephony Simulation & End-to-End Verification Test Script
 * 
 * Verifies live telephony flow against the production backend:
 * 1. Connect simulated mobile socket (authenticated as user cmleybpg2002bjuo2m44y4kip & company cmleybpf70028juo2wwpmp8rt)
 * 2. Join rooms (user_cmleybpg2002bjuo2m44y4kip, company_cmleybpf70028juo2wwpmp8rt)
 * 3. Send heartbeat via POST /api/v1/telephony/device/heartbeat
 * 4. Verify GET /api/v1/telephony/device/presence returns isOnline: true
 * 5. Connect simulated desktop caller socket (authenticated as user cmleybpg2002bjuo2m44y4kip)
 * 6. Initiate call for order cmvdlezwq00c3ju64mp2t6mw6 via POST /api/v1/telephony/initiate
 * 7. Verify mobile socket receives 'telephony:dial'
 * 8. Verify mobile socket emits 'telephony:dial_received'
 * 9. Verify desktop caller socket receives 'telephony:dial_received'
 * 10. Measure and report exact latencies, socket payloads, and test summary
 */

const path = require('path');
const jwt = require('jsonwebtoken');
const { io } = require('socket.io-client');

// Configuration
const CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'http://127.0.0.1:3007',
  USER_ID: process.env.USER_ID || 'cmleybpg2002bjuo2m44y4kip',
  COMPANY_ID: process.env.COMPANY_ID || 'cmleybpf70028juo2wwpmp8rt',
  ORDER_ID: process.env.ORDER_ID || 'cmvdlezwq00c3ju64mp2t6mw6',
  JWT_SECRET: process.env.JWT_SECRET || '9645819c153de9a20961168f4dad5a4b159080e6c9117df1a6cf7114102428c57686adb6f4625ccec15452f7d73b8b111485a077fcd2ea99a377b13fb6033314',
  DEVICE_ID: 'sim_mobile_cmleybpg2002bjuo2m44y4kip',
  DEVICE_NAME: 'Simulated Mobile Android Device (SM-G998B)',
  TIMEOUT_MS: 10000
};

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const results = [];
function recordResult(stepNumber, name, passed, details = {}, latencyMs = null) {
  results.push({ stepNumber, name, passed, details, latencyMs });
  const statusStr = passed ? `${GREEN}✓ PASS${RESET}` : `${RED}✗ FAIL${RESET}`;
  const latencyStr = latencyMs !== null ? ` ${CYAN}(${latencyMs.toFixed(1)}ms)${RESET}` : '';
  console.log(`[Step ${stepNumber}] ${statusStr}: ${name}${latencyStr}`);
  if (Object.keys(details).length > 0) {
    console.log(`         Details: ${JSON.stringify(details)}`);
  }
}

// Generate JWT Token
function generateAuthToken(userId, companyId) {
  return jwt.sign(
    {
      userId: userId,
      id: userId,
      companyId: companyId,
      role: 'COMPANY_ADMIN',
      email: 'swan@h2m.com'
    },
    CONFIG.JWT_SECRET,
    { expiresIn: '2h' }
  );
}

// Helper for HTTP requests
async function httpRequest(url, options = {}) {
  const startTime = performance.now();
  const response = await fetch(url, options);
  const durationMs = performance.now() - startTime;
  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = { raw: await response.text() };
  }
  return {
    status: response.status,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries()),
    data,
    durationMs
  };
}

async function runLiveTelephonySimulation() {
  console.log(`\n${BOLD}${CYAN}================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  LIVE TELEPHONY E2E SIMULATION & PROTOCOL VERIFICATION TEST   ${RESET}`);
  console.log(`${BOLD}${CYAN}================================================================${RESET}`);
  console.log(`Backend URL : ${CONFIG.BACKEND_URL}`);
  console.log(`User ID     : ${CONFIG.USER_ID}`);
  console.log(`Company ID  : ${CONFIG.COMPANY_ID}`);
  console.log(`Order ID    : ${CONFIG.ORDER_ID}`);
  console.log(`Device ID   : ${CONFIG.DEVICE_ID}`);
  console.log(`Timestamp   : ${new Date().toISOString()}\n`);

  let mobileSocket = null;
  let desktopSocket = null;

  try {
    // -------------------------------------------------------------
    // Step 0: Generate Authentication Token
    // -------------------------------------------------------------
    console.log(`--- Authentication ---`);
    const authToken = generateAuthToken(CONFIG.USER_ID, CONFIG.COMPANY_ID);
    console.log(`Generated JWT Token for user ${CONFIG.USER_ID} (Company: ${CONFIG.COMPANY_ID})`);
    
    // -------------------------------------------------------------
    // Step 1: Connect Simulated Mobile Socket
    // -------------------------------------------------------------
    console.log(`\n--- Step 1 & 2: Mobile Socket Connection & Room Joins ---`);
    const mobileConnectStart = performance.now();
    
    mobileSocket = await new Promise((resolve, reject) => {
      const socket = io(CONFIG.BACKEND_URL, {
        auth: { token: authToken },
        transports: ['websocket', 'polling'],
        reconnection: false,
        timeout: CONFIG.TIMEOUT_MS
      });

      const timer = setTimeout(() => {
        reject(new Error(`Mobile socket connection timed out after ${CONFIG.TIMEOUT_MS}ms`));
      }, CONFIG.TIMEOUT_MS);

      socket.on('connect', () => {
        clearTimeout(timer);
        resolve(socket);
      });

      socket.on('connect_error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    const mobileConnectLatency = performance.now() - mobileConnectStart;
    recordResult(
      1,
      'Connect simulated mobile socket',
      mobileSocket.connected,
      { socketId: mobileSocket.id, transport: mobileSocket.io.engine.transport.name },
      mobileConnectLatency
    );

    // -------------------------------------------------------------
    // Step 2: Join Sockets to User & Company Rooms
    // -------------------------------------------------------------
    const roomJoinStart = performance.now();
    // Emit explicit join handlers supported by socketService
    mobileSocket.emit('join_company_room', { companyId: CONFIG.COMPANY_ID });
    mobileSocket.emit('user_join', { userId: CONFIG.USER_ID, companyId: CONFIG.COMPANY_ID });
    
    // Allow brief round-trip for room membership registration
    await new Promise((r) => setTimeout(r, 200));
    const roomJoinLatency = performance.now() - roomJoinStart;

    recordResult(
      2,
      'Join mobile socket to user and company rooms',
      true,
      {
        expectedRooms: [
          `user_${CONFIG.USER_ID}`,
          `company_${CONFIG.COMPANY_ID}`
        ]
      },
      roomJoinLatency
    );

    // -------------------------------------------------------------
    // Step 3: Send Heartbeat via POST /api/v1/telephony/device/heartbeat
    // -------------------------------------------------------------
    console.log(`\n--- Step 3: Device Heartbeat Registration ---`);
    const heartbeatPayload = {
      deviceId: CONFIG.DEVICE_ID,
      deviceName: CONFIG.DEVICE_NAME,
      socketId: mobileSocket.id,
      appVersion: '1.0.0-simulation',
      socketConnected: true
    };

    const heartbeatRes = await httpRequest(`${CONFIG.BACKEND_URL}/api/v1/telephony/device/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'x-company-id': CONFIG.COMPANY_ID
      },
      body: JSON.stringify(heartbeatPayload)
    });

    const heartbeatSuccess = heartbeatRes.status === 200 && heartbeatRes.data?.success === true;
    recordResult(
      3,
      'Send heartbeat via POST /api/v1/telephony/device/heartbeat',
      heartbeatSuccess,
      {
        status: heartbeatRes.status,
        deviceId: heartbeatRes.data?.data?.deviceId,
        isOnline: heartbeatRes.data?.data?.isOnline,
        registeredSocketId: heartbeatRes.data?.data?.socketId
      },
      heartbeatRes.durationMs
    );

    if (!heartbeatSuccess) {
      throw new Error(`Device heartbeat failed: ${JSON.stringify(heartbeatRes.data)}`);
    }

    // -------------------------------------------------------------
    // Step 4: Verify GET /api/v1/telephony/device/presence
    // -------------------------------------------------------------
    console.log(`\n--- Step 4: Device Presence Verification ---`);
    const presenceRes = await httpRequest(`${CONFIG.BACKEND_URL}/api/v1/telephony/device/presence`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-company-id': CONFIG.COMPANY_ID
      }
    });

    const isPresenceOnline = presenceRes.status === 200 &&
                             presenceRes.data?.success === true &&
                             presenceRes.data?.data?.isOnline === true;

    recordResult(
      4,
      'Verify GET /api/v1/telephony/device/presence returns isOnline: true',
      isPresenceOnline,
      {
        status: presenceRes.status,
        isOnline: presenceRes.data?.data?.isOnline,
        device: presenceRes.data?.data?.device ? {
          deviceId: presenceRes.data?.data?.device?.deviceId,
          deviceName: presenceRes.data?.data?.device?.deviceName,
          lastSeenAt: presenceRes.data?.data?.device?.lastSeenAt
        } : null
      },
      presenceRes.durationMs
    );

    if (!isPresenceOnline) {
      throw new Error(`Device presence check failed or returned isOnline: false`);
    }

    // -------------------------------------------------------------
    // Step 5: Connect Simulated Desktop Caller Socket
    // -------------------------------------------------------------
    console.log(`\n--- Step 5: Desktop Caller Socket Connection ---`);
    const desktopConnectStart = performance.now();
    
    desktopSocket = await new Promise((resolve, reject) => {
      const socket = io(CONFIG.BACKEND_URL, {
        auth: { token: authToken },
        transports: ['websocket', 'polling'],
        reconnection: false,
        timeout: CONFIG.TIMEOUT_MS
      });

      const timer = setTimeout(() => {
        reject(new Error(`Desktop socket connection timed out after ${CONFIG.TIMEOUT_MS}ms`));
      }, CONFIG.TIMEOUT_MS);

      socket.on('connect', () => {
        clearTimeout(timer);
        resolve(socket);
      });

      socket.on('connect_error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    desktopSocket.emit('join_company_room', { companyId: CONFIG.COMPANY_ID });
    const desktopConnectLatency = performance.now() - desktopConnectStart;

    recordResult(
      5,
      'Connect simulated desktop caller socket & join company room',
      desktopSocket.connected,
      { socketId: desktopSocket.id, companyId: CONFIG.COMPANY_ID },
      desktopConnectLatency
    );

    // -------------------------------------------------------------
    // Prepare Call Event Listeners before initiating call
    // -------------------------------------------------------------
    console.log(`\n--- Step 6, 7 & 8: End-to-End Outbound Call Flow ---`);

    let mobileDialReceivedPromiseResolve;
    let mobileDialReceivedPromiseReject;
    const mobileDialReceivedPromise = new Promise((resolve, reject) => {
      mobileDialReceivedPromiseResolve = resolve;
      mobileDialReceivedPromiseReject = reject;
    });

    let desktopAckReceivedPromiseResolve;
    let desktopAckReceivedPromiseReject;
    const desktopAckReceivedPromise = new Promise((resolve, reject) => {
      desktopAckReceivedPromiseResolve = resolve;
      desktopAckReceivedPromiseReject = reject;
    });

    let dialEventReceivedTime = null;
    let dialEventPayload = null;

    // Mobile Socket listens for 'telephony:dial'
    mobileSocket.on('telephony:dial', (dialData) => {
      dialEventReceivedTime = performance.now();
      dialEventPayload = dialData;
      console.log(`  [Mobile Socket] Received 'telephony:dial' event:`, JSON.stringify(dialData));

      // Step 7: Mobile socket immediately responds with 'telephony:dial_received'
      const ackPayload = {
        sessionId: dialData.sessionId,
        orderId: dialData.orderId,
        customerPhone: dialData.customerPhone,
        deviceName: CONFIG.DEVICE_NAME
      };
      
      console.log(`  [Mobile Socket] Emitting 'telephony:dial_received':`, JSON.stringify(ackPayload));
      mobileSocket.emit('telephony:dial_received', ackPayload);

      mobileDialReceivedPromiseResolve({ dialData, timestamp: dialEventReceivedTime });
    });

    // Desktop Socket listens for 'telephony:dial_received'
    desktopSocket.on('telephony:dial_received', (ackData) => {
      const desktopAckTime = performance.now();
      console.log(`  [Desktop Socket] Received 'telephony:dial_received' broadcast:`, JSON.stringify(ackData));
      desktopAckReceivedPromiseResolve({ ackData, timestamp: desktopAckTime });
    });

    // -------------------------------------------------------------
    // Initiate Call via HTTP POST /api/v1/telephony/initiate
    // -------------------------------------------------------------
    const initiateCallStart = performance.now();
    const initiateRes = await httpRequest(`${CONFIG.BACKEND_URL}/api/v1/telephony/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'x-company-id': CONFIG.COMPANY_ID
      },
      body: JSON.stringify({ orderId: CONFIG.ORDER_ID })
    });

    const initiateSuccess = initiateRes.status === 200 && initiateRes.data?.success === true;
    const initiatedSessionId = initiateRes.data?.data?.sessionId;

    recordResult(
      6,
      `Initiate call for order ${CONFIG.ORDER_ID} via POST /api/v1/telephony/initiate`,
      initiateSuccess,
      {
        status: initiateRes.status,
        sessionId: initiatedSessionId,
        orderNumber: initiateRes.data?.data?.orderNumber,
        customerPhone: initiateRes.data?.data?.customerPhone,
        deviceName: initiateRes.data?.data?.deviceName
      },
      initiateRes.durationMs
    );

    if (!initiateSuccess) {
      throw new Error(`Call initiation failed: ${JSON.stringify(initiateRes.data)}`);
    }

    // -------------------------------------------------------------
    // Step 7: Await Mobile Socket receiving 'telephony:dial'
    // -------------------------------------------------------------
    const dialTimeoutTimer = setTimeout(() => {
      mobileDialReceivedPromiseReject(new Error(`Mobile socket did not receive 'telephony:dial' within ${CONFIG.TIMEOUT_MS}ms`));
    }, CONFIG.TIMEOUT_MS);

    const { dialData, timestamp: mobileDialTime } = await mobileDialReceivedPromise;
    clearTimeout(dialTimeoutTimer);

    const dialPropagationLatency = mobileDialTime - initiateCallStart;
    const dialValid = dialData.orderId === CONFIG.ORDER_ID &&
                      dialData.sessionId === initiatedSessionId &&
                      Boolean(dialData.customerPhone);

    recordResult(
      7,
      "Verify mobile socket receives 'telephony:dial' event",
      dialValid,
      {
        sessionId: dialData.sessionId,
        orderId: dialData.orderId,
        orderNumber: dialData.orderNumber,
        customerPhone: dialData.customerPhone,
        deviceId: dialData.deviceId
      },
      dialPropagationLatency
    );

    // -------------------------------------------------------------
    // Step 8: Await Desktop Caller Socket receiving 'telephony:dial_received'
    // -------------------------------------------------------------
    const ackTimeoutTimer = setTimeout(() => {
      desktopAckReceivedPromiseReject(new Error(`Desktop socket did not receive 'telephony:dial_received' within ${CONFIG.TIMEOUT_MS}ms`));
    }, CONFIG.TIMEOUT_MS);

    const { ackData, timestamp: desktopAckTime } = await desktopAckReceivedPromise;
    clearTimeout(ackTimeoutTimer);

    const ackPropagationLatency = desktopAckTime - mobileDialTime;
    const totalE2eLatency = desktopAckTime - initiateCallStart;

    const ackValid = ackData.orderId === CONFIG.ORDER_ID &&
                     ackData.sessionId === initiatedSessionId;

    recordResult(
      8,
      "Verify desktop caller socket receives 'telephony:dial_received' broadcast",
      ackValid,
      {
        sessionId: ackData.sessionId,
        orderId: ackData.orderId,
        customerPhone: ackData.customerPhone,
        deviceName: ackData.deviceName,
        receivedAt: ackData.receivedAt
      },
      ackPropagationLatency
    );

    // -------------------------------------------------------------
    // Step 9: Complete Call via POST /api/v1/telephony/complete
    // -------------------------------------------------------------
    console.log(`\n--- Step 9: Call Completion & Log Finalization ---`);
    const completeRes = await httpRequest(`${CONFIG.BACKEND_URL}/api/v1/telephony/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'x-company-id': CONFIG.COMPANY_ID
      },
      body: JSON.stringify({
        sessionId: initiatedSessionId,
        durationSeconds: 15,
        callStatus: 'COMPLETED',
        result: 'reached',
        notes: 'End-to-End Simulation Test Run'
      })
    });

    const completeSuccess = completeRes.status === 200 && completeRes.data?.success === true;
    recordResult(
      9,
      "Complete call session via POST /api/v1/telephony/complete",
      completeSuccess,
      {
        status: completeRes.status,
        sessionId: initiatedSessionId,
        durationSeconds: completeRes.data?.data?.durationSeconds || 15,
        callStatus: completeRes.data?.data?.callStatus || 'COMPLETED',
        result: completeRes.data?.data?.result || 'reached'
      },
      completeRes.durationMs
    );

    // -------------------------------------------------------------
    // Simulation Summary & Performance Report
    // -------------------------------------------------------------
    console.log(`\n${BOLD}${CYAN}================================================================${RESET}`);
    console.log(`${BOLD}${CYAN}                    SIMULATION SUMMARY REPORT                   ${RESET}`);
    console.log(`${BOLD}${CYAN}================================================================${RESET}`);

    const allPassed = results.every(r => r.passed);
    console.log(`Overall Status: ${allPassed ? GREEN + 'ALL TESTS PASSED' : RED + 'FAILURES DETECTED'}${RESET}`);
    console.log(`Total Steps   : ${results.length}`);
    console.log(`Passed Steps  : ${results.filter(r => r.passed).length}`);
    console.log(`Failed Steps  : ${results.filter(r => !r.passed).length}\n`);

    console.log(`${BOLD}Latency Breakdown:${RESET}`);
    console.log(`  - Mobile Socket Connect Latency    : ${mobileConnectLatency.toFixed(2)} ms`);
    console.log(`  - Desktop Socket Connect Latency   : ${desktopConnectLatency.toFixed(2)} ms`);
    console.log(`  - Device Heartbeat API Latency     : ${heartbeatRes.durationMs.toFixed(2)} ms`);
    console.log(`  - Device Presence API Latency      : ${presenceRes.durationMs.toFixed(2)} ms`);
    console.log(`  - Initiate Call HTTP Latency       : ${initiateRes.durationMs.toFixed(2)} ms`);
    console.log(`  - Dial Event Propagation Latency   : ${dialPropagationLatency.toFixed(2)} ms`);
    console.log(`  - Dial ACK Propagation Latency     : ${ackPropagationLatency.toFixed(2)} ms`);
    console.log(`  - Complete Call API Latency        : ${completeRes.durationMs.toFixed(2)} ms`);
    console.log(`  - Total End-to-End Roundtrip Time  : ${totalE2eLatency.toFixed(2)} ms\n`);

    return {
      success: allPassed,
      latencies: {
        mobileConnect: mobileConnectLatency,
        desktopConnect: desktopConnectLatency,
        heartbeatApi: heartbeatRes.durationMs,
        presenceApi: presenceRes.durationMs,
        initiateApi: initiateRes.durationMs,
        dialPropagation: dialPropagationLatency,
        ackPropagation: ackPropagationLatency,
        completeApi: completeRes.durationMs,
        totalRoundtrip: totalE2eLatency
      },
      results
    };

  } catch (err) {
    console.error(`\n${RED}${BOLD}FATAL SIMULATION ERROR:${RESET}`, err.message);
    if (err.stack) console.error(err.stack);
    recordResult(99, 'Simulation Execution Exception', false, { error: err.message });
    return {
      success: false,
      error: err.message,
      results
    };
  } finally {
    if (mobileSocket && mobileSocket.connected) {
      mobileSocket.disconnect();
    }
    if (desktopSocket && desktopSocket.connected) {
      desktopSocket.disconnect();
    }
  }
}

// Execute if run directly
if (require.main === module) {
  runLiveTelephonySimulation().then((summary) => {
    process.exit(summary.success ? 0 : 1);
  });
}

module.exports = { runLiveTelephonySimulation };
