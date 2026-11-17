export const PROTOCOL_VERSION = 4;

export const HEARTBEAT_INTERVAL_MS = 250; // 4 Hz state heartbeat
export const EVENT_RESEND_INTERVAL_MS = 150; // Resend event every 150 ms until ack
export const EVENT_MAX_RETRIES = 5; // Max 5 resends before showing warning

export const DEAD_ZONE_RATIO = 0.15; // 15% stick dead zone
export const DIRECTION_STEP_DEG = 22.5; // 16 directions, 22.5° each

export const PING_INTERVAL_MS = 1000; // 1 Hz ping
export const PONG_TIMEOUT_MS = 2000; // Disconnected if no pong for 2 s
export const RECONNECT_INTERVAL_MS = 1000; // Auto-reconnect every 1 s

export const SPEED_MIN = 80;
export const SPEED_MAX = 255;
export const SPEED_DEFAULT = 200;

