export type Protocol = 'SIMULATOR' | 'MAVLINK' | 'MAVROS';

export interface ConnectionConfig {
  protocol: Protocol;
  mavlinkUrl: string;
  mavrosUrl: string;
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
  mavlinkUrl: envMavlinkUrl || 'ws://192.168.1.100:14551',
  mavrosUrl: envMavrosUrl || 'ws://192.168.1.101:9090',
  autoReconnect: true,
  reconnectInterval: 3000,
};
