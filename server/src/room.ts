import type { WebSocket } from 'ws';
import { Game } from './game.js';
import type { InputState, PlayerSide, ServerMessage, RoomInfo } from './types.js';
import { TICK_INTERVAL } from './types.js';

interface Player {
  ws: WebSocket;
  side: PlayerSide;
  ready: boolean;
}

interface Room {
  id: string;
  players: Player[];
  game: Game | null;
  tickInterval: ReturnType<typeof setInterval> | null;
}

const rooms = new Map<string, Room>();

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  if (rooms.has(id)) return generateRoomId();
  return id;
}

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(room: Room, msg: ServerMessage): void {
  for (const player of room.players) {
    send(player.ws, msg);
  }
}

function startGameLoop(room: Room): void {
  if (!room.game || room.tickInterval) return;

  let roundOverFrames = 0;

  room.tickInterval = setInterval(() => {
    if (!room.game) return;

    // 라운드 오버 딜레이 중이면 카운트다운
    if (roundOverFrames > 0) {
      roundOverFrames--;
      if (roundOverFrames === 0) {
        room.game.resetRound(room.game.servingSide);
      }
      broadcast(room, { type: 'gameState', state: room.game.getState() });
      return;
    }

    const scoreEvent = room.game.tick();

    if (scoreEvent) {
      const gameOver = room.game.isGameOver();
      if (gameOver) {
        room.game.phase = 'gameOver';
        broadcast(room, {
          type: 'gameOver',
          winner: gameOver.winner,
          score: { ...room.game.score },
        });
        stopGameLoop(room);
        setTimeout(() => destroyRoom(room.id), 5000);
      } else {
        room.game.phase = 'scored';
        room.game.servingSide = scoreEvent.scorer;
        broadcast(room, {
          type: 'scored',
          scorer: scoreEvent.scorer,
          score: { ...room.game.score },
        });
        roundOverFrames = 25; // 1초 대기 (25fps)
      }
      broadcast(room, { type: 'gameState', state: room.game.getState() });
      return;
    }

    broadcast(room, { type: 'gameState', state: room.game.getState() });
  }, TICK_INTERVAL);
}

function stopGameLoop(room: Room): void {
  if (room.tickInterval) {
    clearInterval(room.tickInterval);
    room.tickInterval = null;
  }
}

function destroyRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  stopGameLoop(room);
  rooms.delete(roomId);
}

export function createRoom(ws: WebSocket): void {
  const roomId = generateRoomId();
  const room: Room = {
    id: roomId,
    players: [{ ws, side: 'left', ready: false }],
    game: null,
    tickInterval: null,
  };
  rooms.set(roomId, room);
  send(ws, { type: 'roomCreated', roomId, side: 'left' });
}

export function joinRoom(ws: WebSocket, roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) {
    send(ws, { type: 'error', message: `Room ${roomId} not found` });
    return;
  }
  if (room.players.length >= 2) {
    send(ws, { type: 'error', message: 'Room is full' });
    return;
  }

  room.players.push({ ws, side: 'right', ready: false });
  send(ws, { type: 'roomJoined', roomId, side: 'right' });

  // 두 명 다 들어왔으면 게임 시작
  room.game = new Game();
  broadcast(room, { type: 'gameStart' });
  startGameLoop(room);
}

export function handleInput(ws: WebSocket, input: InputState): void {
  const room = findRoomBySocket(ws);
  if (!room || !room.game) return;

  const player = room.players.find((p) => p.ws === ws);
  if (!player) return;

  room.game.inputs[player.side] = input;
}

export function handleDisconnect(ws: WebSocket): void {
  const room = findRoomBySocket(ws);
  if (!room) return;

  const remaining = room.players.find((p) => p.ws !== ws);
  if (remaining) {
    send(remaining.ws, { type: 'opponentDisconnected' });
  }

  stopGameLoop(room);
  rooms.delete(room.id);
}

function findRoomBySocket(ws: WebSocket): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.ws === ws)) {
      return room;
    }
  }
  return undefined;
}
