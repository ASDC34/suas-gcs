#!/usr/bin/env node
/**
 * MAVLink WebSocket Bridge
 *
 * MAVProxy  ──tcp:127.0.0.1:14551──►  [TCP Server :14551]  this bridge  ──WS:14552──►  Browser GCS
 *
 * Bridge artık TCP SERVER olarak çalışır; MAVProxy ona bağlanır:
 *   mavproxy.py --master=COM3 --baudrate=921600 --out=tcp:127.0.0.1:14551
 *
 * Usage:
 *   Terminal 1: mavproxy.py --master=COM3 --baudrate=921600 --out=tcp:127.0.0.1:14551
 *   Terminal 2: npm run bridge
 *   GCS URL:    ws://localhost:14552
 *
 * Environment overrides:
 *   MAVLINK_TCP_HOST   Bridge'in dinleyeceği IP (default: 0.0.0.0 — tüm arayüzler)
 *   MAVLINK_TCP_PORT   MAVProxy'nin bağlanacağı TCP port (default: 14551)
 *   BRIDGE_WS_PORT     Tarayıcıya açılan WebSocket port (default: 14552)
 */

'use strict';

const net = require('net');
const { WebSocketServer } = require('ws');

const TCP_BIND_HOST = process.env.MAVLINK_TCP_HOST || '0.0.0.0';
const TCP_PORT      = parseInt(process.env.MAVLINK_TCP_PORT || '14551', 10);
const WS_PORT       = parseInt(process.env.BRIDGE_WS_PORT  || '14552', 10);

const PING_MS = 5000;

// ── logging helpers ───────────────────────────────────────────────────────────
function ts() { return new Date().toISOString().slice(11, 23); }
function log(...a)  { console.log (`[${ts()}] [bridge]`, ...a); }
function warn(...a) { console.warn(`[${ts()}] [bridge]`, ...a); }

// ── browser WS clients set ───────────────────────────────────────────────────
const clients = new Set();

function broadcast(data) {
  for (const ws of clients) {
    try {
      if (ws.readyState === 1 /* OPEN */) ws.send(data);
    } catch (_) { /* ignore stale sockets */ }
  }
}

function broadcastStatus(mavConnected) {
  broadcast(JSON.stringify({
    type: 'BRIDGE_STATUS',
    tcpConnected: mavConnected,
    tcpPort: TCP_PORT,
  }));
}

// ── MAVLink frame parser — shared per TCP connection ─────────────────────────
function makeMavParser() {
  let rxBuf = Buffer.alloc(0);

  return function push(chunk) {
    rxBuf = Buffer.concat([rxBuf, chunk]);
    let pos = 0;

    while (pos < rxBuf.length) {
      const b0 = rxBuf[pos];

      // MAVLink v2  STX=0xFD
      if (b0 === 0xfd) {
        if (pos + 4 > rxBuf.length) break;
        const payloadLen = rxBuf[pos + 1];
        const frameLen   = 12 + payloadLen; // 10B header + payload + 2B CRC
        if (pos + frameLen > rxBuf.length) break;
        broadcast(rxBuf.subarray(pos, pos + frameLen));
        pos += frameLen;
        continue;
      }

      // MAVLink v1  STX=0xFE
      if (b0 === 0xfe) {
        if (pos + 2 > rxBuf.length) break;
        const payloadLen = rxBuf[pos + 1];
        const frameLen   = 8 + payloadLen;  // 6B header + payload + 2B CRC
        if (pos + frameLen > rxBuf.length) break;
        broadcast(rxBuf.subarray(pos, pos + frameLen));
        pos += frameLen;
        continue;
      }

      // JSON satır akışı (bazı GCS köprüleri JSON gönderir)
      if (b0 === 0x7b /* '{' */) {
        const end = rxBuf.indexOf(0x0a /* '\n' */, pos);
        if (end === -1) break;
        const line = rxBuf.subarray(pos, end).toString('utf8').trim();
        if (line.length) broadcast(line);
        pos = end + 1;
        continue;
      }

      // Bilinmeyen byte — atla
      pos += 1;
    }

    rxBuf = pos < rxBuf.length ? rxBuf.subarray(pos) : Buffer.alloc(0);

    if (rxBuf.length > 512 * 1024) {
      warn('rxBuf taştı, sıfırlanıyor');
      rxBuf = Buffer.alloc(0);
    }
  };
}

// ── active MAVProxy socket (en fazla 1 bağlantıya izin ver) ──────────────────
let mavSocket = null;

// ── TCP SERVER — MAVProxy bu porta bağlanır ───────────────────────────────────
const tcpServer = net.createServer((sock) => {
  const remote = `${sock.remoteAddress}:${sock.remotePort}`;

  // Zaten bir MAVProxy bağlıysa yeni bağlantıyı reddet
  if (mavSocket && !mavSocket.destroyed) {
    warn(`İkinci TCP bağlantısı reddedildi: ${remote}`);
    sock.destroy();
    return;
  }

  mavSocket = sock;
  log(`✓ MAVProxy bağlandı: ${remote}`);
  broadcastStatus(true);

  const push = makeMavParser();

  sock.on('data', push);

  // Tarayıcıdan gelen komutlar MAVProxy'ye iletilir (ws.on('message') tarafından)
  // mavSocket referansı üzerinden yazma yapılıyor.

  sock.on('close', () => {
    log(`MAVProxy bağlantısı kapandı: ${remote}`);
    if (mavSocket === sock) mavSocket = null;
    broadcastStatus(false);
  });

  sock.on('error', (err) => {
    warn(`MAVProxy TCP hatası (${remote}):`, err.message);
    if (mavSocket === sock) mavSocket = null;
    broadcastStatus(false);
  });
});

tcpServer.on('error', (err) => {
  warn('TCP sunucu hatası:', err.message);
});

tcpServer.listen(TCP_PORT, TCP_BIND_HOST, () => {
  log(`TCP sunucu dinliyor → ${TCP_BIND_HOST}:${TCP_PORT}  (MAVProxy buraya bağlanacak)`);
});

// ── WebSocket SERVER — Tarayıcı buraya bağlanır ───────────────────────────────
const wss = new WebSocketServer({ port: WS_PORT });
log(`WebSocket sunucu dinliyor → ws://localhost:${WS_PORT}  (GCS tarayıcısı)`);

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  log(`Tarayıcı bağlandı: ${ip}  (toplam: ${wss.clients.size})`);
  clients.add(ws);
  ws._isAlive = true;

  // Mevcut TCP durumunu hemen bildir
  ws.send(JSON.stringify({
    type: 'BRIDGE_STATUS',
    tcpConnected: !!(mavSocket && !mavSocket.destroyed),
    tcpPort: TCP_PORT,
  }));

  ws.on('pong', () => { ws._isAlive = true; });

  // Tarayıcı → MAVProxy (komutlar)
  ws.on('message', (data) => {
    if (!mavSocket || mavSocket.destroyed) {
      warn('MAVProxy bağlı değil — komut gönderilemedi');
      return;
    }
    try {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      mavSocket.write(buf);
    } catch (err) {
      warn('TCP write hatası:', err.message);
    }
  });

  ws.on('close', (code, reason) => {
    log(`Tarayıcı ayrıldı: ${ip}  code=${code}  reason=${reason || '-'}`);
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    warn(`WS istemci hatası (${ip}):`, err.message);
    clients.delete(ws);
  });
});

wss.on('error', (err) => {
  warn('WebSocket sunucu hatası:', err.message);
});

// ── heartbeat: kopuk tarayıcı bağlantılarını temizle ─────────────────────────
setInterval(() => {
  for (const ws of wss.clients) {
    if (ws._isAlive === false) {
      ws.terminate();
      clients.delete(ws);
      continue;
    }
    ws._isAlive = false;
    ws.ping();
  }
}, PING_MS);

// ── graceful shutdown ─────────────────────────────────────────────────────────
function shutdown() {
  log('Kapatılıyor…');
  if (mavSocket) mavSocket.destroy();
  tcpServer.close();
  wss.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000);
}

process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);
