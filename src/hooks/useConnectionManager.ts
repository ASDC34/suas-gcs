import { useCallback, useEffect, useRef, useState } from 'react';
import ReconnectingWebSocket from 'reconnecting-websocket';
import type {
  ConnectionConfig,
  ConnectionStatus,
  MAVLinkMessage,
} from '../connect/connectionTypes';
import type { FlightMode } from '../store/telemetryStore';
import { useConnectionStore } from '../store/connectionStore';
import { useTelemetryStore } from '../store/telemetryStore';
import { MavlinkWsBinaryAccumulator } from '../utils/mavlinkBinaryWs';
import { handleMAVLinkMessage } from './useMAVLinkConnection';

export type { Protocol, ConnectionConfig, ConnectionStatus, MAVLinkMessage } from '../connect/connectionTypes';
export { DEFAULT_CONNECTION_CONFIG } from '../connect/connectionTypes';

export interface ConnectionManagerApi {
  status: ConnectionStatus;
  messageLog: MAVLinkMessage[];
  connect: () => void;
  disconnect: () => void;
  sendCommand: (command: object) => boolean;
}

function handleMAVROSMessage(
  msg: Record<string, unknown>,
  updateTelemetry: ReturnType<typeof useTelemetryStore.getState>['updateTelemetry']
) {
  const topic = typeof msg.topic === 'string' ? msg.topic : undefined;
  const inner = msg.msg;
  if (!topic || inner === null || typeof inner !== 'object') return;
  const payload = inner as Record<string, unknown>;

  const MAVROS_MODES: Record<string, string> = {
    'AUTO.MISSION': 'AUTO',
    'AUTO.RTL': 'RTL',
    'AUTO.LAND': 'LAND',
    STABILIZE: 'STABILIZE',
    LOITER: 'LOITER',
    GUIDED: 'GUIDED',
  };

  switch (topic) {
    case '/mavros/global_position/global': {
      const navStatus = payload.status;
      let st = -1;
      if (typeof navStatus === 'number') st = navStatus;
      else if (navStatus && typeof navStatus === 'object' && 'status' in navStatus) {
        st = Number((navStatus as { status: unknown }).status);
      }
      updateTelemetry({
        lat: Number(payload.latitude),
        lon: Number(payload.longitude),
        altitudeMSL: Number(payload.altitude) * 3.28084,
        gpsFixType:
          st >= 2 ? 'RTK_FIXED' : st >= 0 ? 'FIX_3D' : 'NO_FIX',
      });
      break;
    }
    case '/mavros/global_position/rel_alt':
      updateTelemetry({
        altitudeAGL: Number(payload.data) * 3.28084,
      });
      break;
    case '/mavros/vfr_hud':
      updateTelemetry({
        groundSpeedMs: Number(payload.groundspeed),
        groundSpeedKnots: Number(payload.groundspeed) * 1.94384,
        airspeedMs: Number(payload.airspeed),
        climbRate: Number(payload.climb) * 3.28084,
        heading: Number(payload.heading),
      });
      break;
    case '/mavros/battery': {
      const pctRaw = payload.percentage;
      const pct =
        typeof pctRaw === 'number' && pctRaw <= 1 && pctRaw >= 0
          ? Math.round(pctRaw * 100)
          : typeof pctRaw === 'number'
            ? Math.round(pctRaw)
            : undefined;
      updateTelemetry({
        batteryVoltage: Number(payload.voltage),
        batteryCurrent: Number(payload.current),
        ...(pct !== undefined ? { batteryPercent: pct } : {}),
      });
      break;
    }
    case '/mavros/state': {
      const modeStr = String(payload.mode ?? '');
      const fmRaw = MAVROS_MODES[modeStr] ?? modeStr;
      const fm: FlightMode =
        fmRaw === 'AUTO' ||
        fmRaw === 'RTL' ||
        fmRaw === 'LAND' ||
        fmRaw === 'STABILIZE' ||
        fmRaw === 'LOITER' ||
        fmRaw === 'GUIDED'
          ? fmRaw
          : 'STABILIZE';
      updateTelemetry({
        armed: Boolean(payload.armed),
        inFlight: Boolean(payload.armed),
        flightMode: fm,
      });
      break;
    }
    case '/mavros/wind_estimation': {
      const linear =
        payload.linear && typeof payload.linear === 'object'
          ? (payload.linear as Record<string, unknown>)
          : undefined;
      const wx = Number(payload.wind_x ?? linear?.x ?? 0);
      const wy = Number(payload.wind_y ?? linear?.y ?? 0);
      updateTelemetry({
        windSpeedMs: Math.sqrt(wx ** 2 + wy ** 2),
        windDirectionDeg: ((Math.atan2(wx, wy) * 180) / Math.PI + 360) % 360,
        windSource: 'SENSOR',
      });
      break;
    }
    default:
      break;
  }
}

/** Tam MAVLink / MAVROS WebSocket bağlantı yönetimi — Aşama 8 */
export function useConnectionManager(config: ConnectionConfig) {
  const updateTelemetry = useTelemetryStore((s) => s.updateTelemetry);

  const [status, setStatus] = useState<ConnectionStatus>({
    protocol: config.protocol,
    connected: false,
    connecting: false,
    error: null,
    latencyMs: 0,
    messagesReceived: 0,
    lastMessageTime: 0,
    bytesReceived: 0,
  });

  const [messageLog, setMessageLog] = useState<MAVLinkMessage[]>([]);

  const configRef = useRef(config);
  configRef.current = config;

  const wsRef = useRef<WebSocket | ReconnectingWebSocket | null>(null);
  const usedReconnectingRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pingStartRef = useRef<number>(0);
  const msgCounterRef = useRef(0);
  /** Kullanıcı KES dediğinde düz WebSocket yeniden bağlanmasın */
  const allowReconnectRef = useRef(true);
  const mavlinkAccRef = useRef(new MavlinkWsBinaryAccumulator());

  const addToLog = useCallback((entry: MAVLinkMessage) => {
    setMessageLog((prev) => [entry, ...prev].slice(0, 100));
  }, []);

  const stopPing = useCallback(() => {
    if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    pingTimerRef.current = null;
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
  }, []);

  const teardownSocketOnly = useCallback(() => {
    stopPing();
    clearReconnectTimer();
    mavlinkAccRef.current.reset();
    if (wsRef.current) {
      try {
        wsRef.current.close(1000, 'teardown');
      } finally {
        wsRef.current = null;
      }
    }
    usedReconnectingRef.current = false;
  }, [clearReconnectTimer, stopPing]);

  const disconnect = useCallback(() => {
    allowReconnectRef.current = false;
    teardownSocketOnly();
    useConnectionStore.getState().setLiveLinkActive(false);
    setStatus((s) => ({
      ...s,
      connected: false,
      connecting: false,
      error: null,
    }));
    updateTelemetry({ telemetryConnected: false });
  }, [teardownSocketOnly, updateTelemetry]);

  const connect = useCallback(() => {
    const cfg = configRef.current;
    if (cfg.protocol === 'SIMULATOR') return;

    allowReconnectRef.current = true;
    teardownSocketOnly();
    mavlinkAccRef.current.reset();

    const url = cfg.protocol === 'MAVLINK' ? cfg.mavlinkUrl : cfg.mavrosUrl;
    setStatus((s) => ({
      ...s,
      connecting: true,
      error: null,
      protocol: cfg.protocol,
    }));

    try {
      // eslint-disable-next-line no-console
      console.log(`[ConnectionManager] ${cfg.protocol} bağlanıyor: ${url}`);

      const ws = cfg.autoReconnect
        ? new ReconnectingWebSocket(url, [], {
            minReconnectionDelay: cfg.reconnectInterval,
            maxReconnectionDelay: cfg.reconnectInterval,
            reconnectionDelayGrowFactor: 1,
          })
        : new WebSocket(url);

      usedReconnectingRef.current = cfg.autoReconnect;
      wsRef.current = ws;

      ws.onopen = () => {
        // eslint-disable-next-line no-console
        console.log(`[ConnectionManager] ✓ Bağlandı: ${url}`);
        setStatus((s) => ({
          ...s,
          connected: true,
          connecting: false,
          error: null,
          protocol: cfg.protocol,
        }));
        updateTelemetry({ telemetryConnected: true, rcConnected: true });
        if (cfg.protocol === 'MAVLINK' || cfg.protocol === 'MAVROS') {
          useConnectionStore.getState().setLiveLinkActive(true);
        }

        stopPing();

        if (cfg.protocol === 'MAVLINK') {
          // Bridge'e MAVProxy hedefini bildir (uzak IP/port)
          ws.send(JSON.stringify({
            type: 'BRIDGE_CONFIGURE',
            host: cfg.bridgeHost,
            port: cfg.bridgePort,
          }));

          pingTimerRef.current = setInterval(() => {
            if (ws.readyState !== WebSocket.OPEN) return;
            pingStartRef.current = performance.now();
            ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
          }, 2000);
        }

        if (cfg.protocol === 'MAVROS') {
          const subscriptions = [
            {
              op: 'subscribe',
              topic: '/mavros/global_position/global',
              type: 'sensor_msgs/NavSatFix',
            },
            {
              op: 'subscribe',
              topic: '/mavros/global_position/rel_alt',
              type: 'std_msgs/msg/Float64',
            },
            { op: 'subscribe', topic: '/mavros/vfr_hud', type: 'mavros_msgs/msg/VFR_HUD' },
            {
              op: 'subscribe',
              topic: '/mavros/battery',
              type: 'sensor_msgs/msg/BatteryState',
            },
            { op: 'subscribe', topic: '/mavros/state', type: 'mavros_msgs/msg/State' },
            { op: 'subscribe', topic: '/mavros/imu/data', type: 'sensor_msgs/msg/Imu' },
            {
              op: 'subscribe',
              topic: '/mavros/wind_estimation',
              type: 'geometry_msgs/msg/TwistStamped',
            },
          ];
          subscriptions.forEach((sub) => ws.send(JSON.stringify(sub)));
        }
      };

      ws.onmessage = (event: MessageEvent<string | Blob | ArrayBuffer>) => {
        const cfgNow = configRef.current;
        const raw = event.data;

        const applyInboundJson = (parsed: Record<string, unknown>, byteApprox: number) => {
          if (parsed.type === 'PONG' || parsed.op === 'pong') {
            const latency = Math.round(performance.now() - pingStartRef.current);
            setStatus((s) => ({ ...s, latencyMs: latency }));
            return;
          }

          // Bridge'in dahili durum mesajlarını telemetri olarak işleme
          if (parsed.type === 'BRIDGE_STATUS' || parsed.type === 'BRIDGE_CONFIGURE') {
            return;
          }

          msgCounterRef.current += 1;
          setStatus((s) => ({
            ...s,
            messagesReceived: s.messagesReceived + 1,
            lastMessageTime: Date.now(),
            bytesReceived: s.bytesReceived + byteApprox,
          }));

          addToLog({
            id: `${Date.now()}-${msgCounterRef.current}`,
            timestamp: Date.now(),
            type: String(parsed.type ?? parsed.op ?? parsed.topic ?? 'UNKNOWN'),
            data: parsed,
            direction: 'IN',
          });

          if (cfgNow.protocol === 'MAVLINK') {
            handleMAVLinkMessage(updateTelemetry, parsed);
          } else if (cfgNow.protocol === 'MAVROS') {
            handleMAVROSMessage(parsed, updateTelemetry);
          }
        };

        if (typeof raw === 'string') {
          const parts = raw
            .split(/\n/)
            .map((l) => l.trim())
            .filter(Boolean);
          for (const seg of parts) {
            try {
              const parsed = JSON.parse(seg) as Record<string, unknown>;
              const byteApprox = new Blob([seg]).size;
              applyInboundJson(parsed, byteApprox);
            } catch {
              // eslint-disable-next-line no-console
              console.warn('[ConnectionManager] JSON ayrıştırılamadı:', seg.slice(0, 120));
            }
          }
          return;
        }

        if (cfgNow.protocol !== 'MAVLINK') return;

        const decodeBinary = async () => {
          let u8: Uint8Array;
          if (raw instanceof ArrayBuffer) u8 = new Uint8Array(raw);
          else if (raw instanceof Blob) u8 = new Uint8Array(await raw.arrayBuffer());
          else if (ArrayBuffer.isView(raw)) {
            const view = raw as ArrayBufferView;
            u8 = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
          }
          else return;

          const records = mavlinkAccRef.current.push(u8);
          const per = records.length
            ? Math.max(1, Math.floor(u8.byteLength / records.length))
            : u8.byteLength;
          for (const parsed of records) {
            applyInboundJson(parsed, per);
          }
        };

        void decodeBinary().catch(() => {
          // eslint-disable-next-line no-console
          console.warn('[ConnectionManager] İkili mesaj işlenemedi');
        });
      };

      ws.onclose = (event: CloseEvent) => {
        // eslint-disable-next-line no-console
        console.log(`[ConnectionManager] Bağlantı kapandı: code=${event.code}`);
        stopPing();

        setStatus((s) => ({
          ...s,
          connected: false,
          connecting: false,
          error: event.code !== 1000 ? `Bağlantı kapandı (${event.code})` : null,
        }));
        updateTelemetry({ telemetryConnected: false });
        useConnectionStore.getState().setLiveLinkActive(false);

        // ReconnectingWebSocket aynı örnek üzerinden yeniden bağlanır; ref'i silme.
        if (!usedReconnectingRef.current) {
          wsRef.current = null;
        }

        const reopen =
          cfg.autoReconnect &&
          event.code !== 1000 &&
          allowReconnectRef.current &&
          !usedReconnectingRef.current;

        if (reopen) {
          reconnectTimerRef.current = setTimeout(() => connect(), cfg.reconnectInterval);
        }
      };

      ws.onerror = () => {
        setStatus((s) => ({
          ...s,
          error: 'WebSocket bağlantı hatası — IP adresi doğru mu?',
          connecting: false,
        }));
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus((s) => ({
        ...s,
        error: msg,
        connecting: false,
      }));
    }
  }, [addToLog, stopPing, teardownSocketOnly, updateTelemetry]);

  const sendCommand = useCallback(
    (command: object): boolean => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        // eslint-disable-next-line no-console
        console.warn('[ConnectionManager] Bağlantı yok — komut gönderilemedi');
        return false;
      }
      ws.send(JSON.stringify(command));
      addToLog({
        id: `${Date.now()}-out`,
        timestamp: Date.now(),
        type: String((command as { type?: string }).type ?? 'CMD'),
        data: command as Record<string, unknown>,
        direction: 'OUT',
      });
      return true;
    },
    [addToLog]
  );

  useEffect(() => {
    teardownSocketOnly();
    useConnectionStore.getState().setLiveLinkActive(false);
    setStatus({
      protocol: config.protocol,
      connected: false,
      connecting: false,
      error: null,
      latencyMs: 0,
      messagesReceived: 0,
      lastMessageTime: 0,
      bytesReceived: 0,
    });
  }, [config.protocol, teardownSocketOnly]);

  useEffect(() => () => teardownSocketOnly(), [teardownSocketOnly]);

  const api: ConnectionManagerApi = { status, messageLog, connect, disconnect, sendCommand };
  return api;
}