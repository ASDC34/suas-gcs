#!/usr/bin/env node
/**
 * MAVLink WebSocket Bridge  —  CLIENT mode
 *
 *  Bridge, uzak MAVProxy'nin tcpin sunucusuna TCP ile bağlanır.
 *  Tarayıcı ise bridge'in WebSocket sunucusuna bağlanır.
 *
 *  MAVProxy  ←─tcpin:14551─  bridge  ←─WS:14552─  Browser GCS
 *
 *  MAVProxy komutu (uzak bilgisayarda):
 *    mavproxy.py --master=COM3 --baudrate=921600 --out=tcpin:0.0.0.0:14551
 *
 *  Kullanım:
 *    Terminal 1 (uzak PC):  mavproxy.py ... --out=tcpin:0.0.0.0:14551
 *    Terminal 2 (bu PC):    npm run bridge
 *    Tarayıcı URL:          ws://localhost:14552
 *
 *  Yapılandırma önceliği (yüksekten düşüğe):
 *    1. GCS'den gelen BRIDGE_CONFIGURE WebSocket mesajı  (anlık + dosyaya kaydeder)
 *    2. Ortam değişkenleri  MAVLINK_TCP_HOST / MAVLINK_TCP_PORT / BRIDGE_WS_PORT
 *    3. bridge.config.json  (proje kökünde)
 *    4. Dahili varsayılanlar
 */

'use strict';

const fs  = require('fs');
const net = require('net');
const path = require('path');
const { WebSocketServer } = require('ws');

// ── Config dosyası ────────────────────────────────────────────────────────────
const CONFIG_PATH = path.resolve(__dirname, '../../bridge.config.json');

function loadFileConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

function saveFileConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
  } catch (err) {
    warn('Config dosyası yazılamadı:', err.message);
  }
}

const fileCfg = loadFileConfig();

// Aktif bağlantı hedefi (runtime'da değiştirilebilir)
const target = {
  host: process.env.MAVLINK_TCP_HOST || fileCfg.mavlinkTcpHost || '192.168.1.100',
  port: parseInt(process.env.MAVLINK_TCP_PORT || String(fileCfg.mavlinkTcpPort ?? 14551), 10),
};
const WS_PORT = parseInt(process.env.BRIDGE_WS_PORT || String(fileCfg.bridgeWsPort ?? 14552), 10);

const RECONNECT_MS = 3000;
const PING_MS      = 5000;

// ── Logging ───────────────────────────────────────────────────────────────────
function ts() { return new Date().toISOString().slice(11, 23); }
function log(...a)  { console.log (`[${ts()}] [bridge]`, ...a); }
function warn(...a) { console.warn(`[${ts()}] [bridge]`, ...a); }

log(`Hedef MAVProxy → tcp://${target.host}:${target.port}`);
log(`WebSocket sunucu → ws://localhost:${WS_PORT}`);

// ── Browser istemci seti ──────────────────────────────────────────────────────
const clients = new Set();

function broadcast(data) {
  for (const ws of clients) {
    try { if (ws.readyState === 1) ws.send(data); } catch (_) {}
  }
}

function broadcastStatus() {
  broadcast(JSON.stringify({
    type: 'BRIDGE_STATUS',
    tcpConnected: !!(tcpSocket && !tcpSocket.destroyed),
    mavHost: target.host,
    mavPort: target.port,
  }));
}

// ── MAVLink frame ayrıştırıcı ─────────────────────────────────────────────────
function makeMavParser() {
  let buf = Buffer.alloc(0);
  return function push(chunk) {
    buf = Buffer.concat([buf, chunk]);
    let pos = 0;
    while (pos < buf.length) {
      const b0 = buf[pos];
      if (b0 === 0xfd) {                              // MAVLink v2
        if (pos + 4 > buf.length) break;
        const flen = 12 + buf[pos + 1];
        if (pos + flen > buf.length) break;
        broadcast(buf.subarray(pos, pos + flen));
        pos += flen; continue;
      }
      if (b0 === 0xfe) {                              // MAVLink v1
        if (pos + 2 > buf.length) break;
        const flen = 8 + buf[pos + 1];
        if (pos + flen > buf.length) break;
        broadcast(buf.subarray(pos, pos + flen));
        pos += flen; continue;
      }
      if (b0 === 0x7b) {                              // JSON satırı
        const end = buf.indexOf(0x0a, pos);
        if (end === -1) break;
        const line = buf.subarray(pos, end).toString('utf8').trim();
        if (line) broadcast(line);
        pos = end + 1; continue;
      }
      pos += 1;                                       // bilinmeyen byte
    }
    buf = pos < buf.length ? buf.subarray(pos) : Buffer.alloc(0);
    if (buf.length > 512 * 1024) { warn('rxBuf taştı'); buf = Buffer.alloc(0); }
  };
}

// ── TCP → MAVProxy bağlantısı (client, otomatik yeniden bağlan) ───────────────
let tcpSocket     = null;
let reconnTimer   = null;
let connecting    = false;
let allowReconn   = true;

function scheduleReconnect() {
  if (reconnTimer || !allowReconn) return;
  log(`${RECONNECT_MS / 1000}s sonra yeniden denenecek…`);
  reconnTimer = setTimeout(() => { reconnTimer = null; connectTcp(); }, RECONNECT_MS);
}

function connectTcp(force = false) {
  if (!force && (connecting || (tcpSocket && !tcpSocket.destroyed))) return;
  connecting = true;

  log(`MAVProxy'ye bağlanılıyor → tcp://${target.host}:${target.port}`);

  const sock = net.createConnection({ host: target.host, port: target.port });
  const push = makeMavParser();

  sock.on('connect', () => {
    connecting = false;
    tcpSocket  = sock;
    log(`✓ MAVProxy bağlandı: ${target.host}:${target.port}`);
    broadcastStatus();
  });

  sock.on('data', push);

  sock.on('close', () => {
    connecting = false;
    if (tcpSocket === sock) tcpSocket = null;
    log('MAVProxy bağlantısı kapandı');
    broadcastStatus();
    scheduleReconnect();
  });

  sock.on('error', (err) => {
    connecting = false;
    if (tcpSocket === sock) tcpSocket = null;
    warn(`TCP hatası (${target.host}:${target.port}):`, err.message);
    broadcastStatus();
    scheduleReconnect();
  });

  sock.setTimeout(10000);
  sock.on('timeout', () => { warn('TCP zaman aşımı'); sock.destroy(); });
}

// ── WebSocket sunucu ──────────────────────────────────────────────────────────
const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  log(`Tarayıcı bağlandı: ${ip}  (toplam: ${wss.clients.size})`);
  clients.add(ws);
  ws._isAlive = true;

  // Mevcut durumu hemen bildir
  ws.send(JSON.stringify({
    type: 'BRIDGE_STATUS',
    tcpConnected: !!(tcpSocket && !tcpSocket.destroyed),
    mavHost: target.host,
    mavPort: target.port,
  }));

  ws.on('pong', () => { ws._isAlive = true; });

  ws.on('message', (data) => {
    // ── BRIDGE_CONFIGURE: GCS'den yeni hedef IP/port ─────────────────────────
    const text = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
    if (text.trimStart().startsWith('{')) {
      let parsed;
      try { parsed = JSON.parse(text); } catch (_) { parsed = null; }

      if (parsed && parsed.type === 'BRIDGE_CONFIGURE') {
        const newHost = typeof parsed.host === 'string' && parsed.host.trim()
          ? parsed.host.trim() : target.host;
        const newPort = Number.isFinite(Number(parsed.port))
          ? Number(parsed.port) : target.port;

        if (newHost !== target.host || newPort !== target.port) {
          log(`BRIDGE_CONFIGURE → yeni hedef: ${newHost}:${newPort}`);
          target.host = newHost;
          target.port = newPort;

          // bridge.config.json'a kaydet
          saveFileConfig({ mavlinkTcpHost: newHost, mavlinkTcpPort: newPort, bridgeWsPort: WS_PORT });

          // Mevcut TCP bağlantısını kapat, yenisini aç
          allowReconn = true;
          if (tcpSocket && !tcpSocket.destroyed) tcpSocket.destroy();
          if (reconnTimer) { clearTimeout(reconnTimer); reconnTimer = null; }
          connectTcp(true);
        } else {
          log(`BRIDGE_CONFIGURE → hedef değişmedi (${newHost}:${newPort})`);
          if (!tcpSocket || tcpSocket.destroyed) connectTcp(true);
        }
        return;
      }
    }

    // ── Normal komut → MAVProxy'ye ilet ──────────────────────────────────────
    if (!tcpSocket || tcpSocket.destroyed) {
      warn('MAVProxy bağlı değil — komut gönderilemedi');
      return;
    }
    try {
      tcpSocket.write(Buffer.isBuffer(data) ? data : Buffer.from(data));
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

wss.on('error', (err) => { warn('WS sunucu hatası:', err.message); });

// ── Heartbeat ─────────────────────────────────────────────────────────────────
setInterval(() => {
  for (const ws of wss.clients) {
    if (ws._isAlive === false) { ws.terminate(); clients.delete(ws); continue; }
    ws._isAlive = false;
    ws.ping();
  }
}, PING_MS);

// ── Başlangıç bağlantısı ──────────────────────────────────────────────────────
connectTcp();

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function shutdown() {
  log('Kapatılıyor…');
  allowReconn = false;
  if (reconnTimer) clearTimeout(reconnTimer);
  if (tcpSocket) tcpSocket.destroy();
  wss.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000);
}
process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);
