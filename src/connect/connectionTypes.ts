export type Protocol = 'SIMULATOR' | 'MAVLINK' | 'MAVROS';

export interface ConnectionConfig {
  protocol: Protocol;
  mavlinkUrl: string;
  mavrosUrl: string;
  /** MAVProxy'nin çalıştığı makinenin IP adresi (bridge bu adrese bağlanır) */
  bridgeHost: string;
  /** MAVProxy'nin tcpin portu (bridge buraya bağlanır) */
  bridgePort: number;
  autoReconnect: boolean;
  reconnectInterval: number;
}

export interface ConnectionStatus {
  protocol: Protocol;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  latencyMs: number;
  messagesReceived: number;
  lastMessageTime: number;
  bytesReceived: number;
}

export interface MAVLinkMessage {
  id: string;
  timestamp: number;
  type: string;
  data: Record<string, unknown>;
  direction: 'IN' | 'OUT';
  raw?: string;
}

const envMavlinkUrl =
  typeof process !== 'undefined' && typeof process.env.REACT_APP_MAVLINK_URL === 'string'
    ? process.env.REACT_APP_MAVLINK_URL.trim()
    : '';

const envMavrosUrl =
  typeof process !== 'undefined' && typeof process.env.REACT_APP_MAVROS_URL === 'string'
    ? process.env.REACT_APP_MAVROS_URL.trim()
    : '';

export const DEFAULT_CONNECTION_CONFIG: ConnectionConfig = {
  protocol: 'SIMULATOR',
  mavlinkUrl: envMavlinkUrl || 'ws://localhost:14552',
  mavrosUrl: envMavrosUrl || 'ws://127.0.0.1:9090',
  bridgeHost: '192.168.1.100',
  bridgePort: 14551,
  autoReconnect: true,
  reconnectInterval: 3000,
};
