import { type ClientMessage, type ServerMessage } from "@/lib/game/types";

const WS_URL = "ws://localhost:3001";

export type MessageHandler = (message: ServerMessage) => void;
export type ConnectionHandler = () => void;

export class GameSocket {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private onConnectHandler: ConnectionHandler | null = null;
  private onDisconnectHandler: ConnectionHandler | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        this.onConnectHandler?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ServerMessage;
          this.messageHandlers.forEach((handler) => handler(message));
        } catch {
          // 파싱 실패는 무시
        }
      };

      this.ws.onclose = () => {
        this.onDisconnectHandler?.();
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onConnect(handler: ConnectionHandler) {
    this.onConnectHandler = handler;
  }

  onDisconnect(handler: ConnectionHandler) {
    this.onDisconnectHandler = handler;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// 싱글턴
let socketInstance: GameSocket | null = null;

export function getSocket(): GameSocket {
  if (!socketInstance) {
    socketInstance = new GameSocket();
  }
  return socketInstance;
}
