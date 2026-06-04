#!/usr/bin/env node
/**
 * deploy-webhook-server.js
 * Lightweight HTTP server that receives signed deploy triggers from GitHub Actions
 * and runs the local deployment script on the server.
 *
 * Run via PM2:
 *   pm2 start /opt/deploy-webhook/server.js --name maxp-deploy-webhook
 */

'use strict';

const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = process.env.WEBHOOK_PORT || 9001;
const SECRET = process.env.DEPLOY_WEBHOOK_SECRET || '';
const DEPLOY_SCRIPT = process.env.DEPLOY_SCRIPT || '/opt/deploy-webhook/deploy.sh';
const LOG_FILE = process.env.WEBHOOK_LOG || '/var/log/maxp-deploy-webhook.log';

// ── helpers ──────────────────────────────────────────────────────────────────

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  fs.appendFileSync(LOG_FILE, line);
}

function verifySignature(body, signatureHeader) {
  if (!SECRET) return true; // skip verification if no secret configured
  if (!signatureHeader) return false;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', SECRET)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signatureHeader)
  );
}

function runDeploy(res) {
  log('🚀 Starting deployment script: ' + DEPLOY_SCRIPT);

  const child = spawn('bash', [DEPLOY_SCRIPT], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production' }
  });

  res.writeHead(202, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'accepted', pid: child.pid }));

  child.stdout.on('data', d => log('[DEPLOY stdout] ' + d.toString().trim()));
  child.stderr.on('data', d => log('[DEPLOY stderr] ' + d.toString().trim()));

  child.on('close', code => {
    log(code === 0
      ? '✅ Deployment finished successfully'
      : `❌ Deployment finished with exit code ${code}`);
  });

  child.unref();
}

// ── server ────────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const { method, url } = req;

  // Health check
  if (method === 'GET' && url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', service: 'maxp-deploy-webhook' }));
  }

  // Deploy trigger
  if (method === 'POST' && url === '/deploy') {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const sig = req.headers['x-deploy-signature'] || req.headers['x-hub-signature-256'];

      if (!verifySignature(body, sig)) {
        log('❌ Invalid signature – request rejected');
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Unauthorized' }));
      }

      log(`📩 Deploy triggered from ${req.socket.remoteAddress}`);
      runDeploy(res);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  log(`🎯 Deploy webhook server listening on port ${PORT}`);
});

process.on('SIGTERM', () => { log('SIGTERM received, shutting down'); process.exit(0); });
process.on('SIGINT',  () => { log('SIGINT received, shutting down');  process.exit(0); });
