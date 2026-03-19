import { WebSocketServer } from 'ws';
import { createRoom, joinRoom, handleInput, handleDisconnect } from './room.js';
import type { ClientMessage } from './types.js';

const PORT = 3001;

const wss = new WebSocketServer({ port: PORT });

console.log(`Pikachu Volleyball server listening on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log(`Client connected (total: ${wss.clients.size})`);

  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    switch (msg.type) {
      case 'createRoom':
        createRoom(ws);
        break;
      case 'joinRoom':
        joinRoom(ws, msg.roomId);
        break;
      case 'input':
        handleInput(ws, msg.input);
        break;
      case 'ready':
        // 클라이언트 준비 완료 — 현재는 joinRoom에서 자동 시작
        break;
      default:
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected (total: ${wss.clients.size})`);
    handleDisconnect(ws);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
    handleDisconnect(ws);
  });
});
