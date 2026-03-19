import { describe, it, expect, vi } from 'vitest';
import {
  createRoom,
  joinRoom,
  handleInput,
  handleDisconnect,
  listRooms,
} from '../src/room.js';
import type { WebSocket } from 'ws';

function createMockWs(): WebSocket {
  const messages: string[] = [];
  return {
    readyState: 1,
    OPEN: 1,
    send: vi.fn((data: string) => {
      messages.push(data);
    }),
    _messages: messages,
  } as unknown as WebSocket & { _messages: string[] };
}

function getMessages(ws: WebSocket): any[] {
  return (ws as any)._messages.map((m: string) => JSON.parse(m));
}

describe('Room — 방 생성', () => {
  it('createRoom 호출 시 roomCreated 메시지를 보낸다', () => {
    const ws = createMockWs();
    createRoom(ws);
    const msgs = getMessages(ws);
    expect(msgs.some((m) => m.type === 'roomCreated')).toBe(true);
  });

  it('roomCreated 메시지에 side=left가 포함된다', () => {
    const ws = createMockWs();
    createRoom(ws);
    const msgs = getMessages(ws);
    const created = msgs.find((m) => m.type === 'roomCreated');
    expect(created.side).toBe('left');
  });

  it('roomCreated 메시지에 6자리 roomId가 포함된다', () => {
    const ws = createMockWs();
    createRoom(ws);
    const msgs = getMessages(ws);
    const created = msgs.find((m) => m.type === 'roomCreated');
    expect(created.roomId).toMatch(/^[A-Z0-9]{6}$/);
  });
});

describe('Room — 방 참가', () => {
  it('존재하지 않는 방에 참가하면 에러 메시지', () => {
    const ws = createMockWs();
    joinRoom(ws, 'NOROOM');
    const msgs = getMessages(ws);
    expect(msgs.some((m) => m.type === 'error')).toBe(true);
  });

  it('2번째 플레이어 참가 시 gameStart 메시지를 브로드캐스트', () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();
    createRoom(ws1);
    const roomId = getMessages(ws1).find((m) => m.type === 'roomCreated').roomId;

    joinRoom(ws2, roomId);

    const msgs2 = getMessages(ws2);
    expect(msgs2.some((m) => m.type === 'roomJoined')).toBe(true);
    expect(msgs2.some((m) => m.type === 'gameStart')).toBe(true);

    const msgs1 = getMessages(ws1);
    expect(msgs1.some((m) => m.type === 'gameStart')).toBe(true);
  });

  it('2번째 참가자는 side=right를 받는다', () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();
    createRoom(ws1);
    const roomId = getMessages(ws1).find((m) => m.type === 'roomCreated').roomId;

    joinRoom(ws2, roomId);
    const joined = getMessages(ws2).find((m) => m.type === 'roomJoined');
    expect(joined.side).toBe('right');
  });
});

describe('Room — 최대 인원 제한', () => {
  it('이미 2명인 방에 참가하면 에러', () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();
    const ws3 = createMockWs();

    createRoom(ws1);
    const roomId = getMessages(ws1).find((m) => m.type === 'roomCreated').roomId;

    joinRoom(ws2, roomId);
    joinRoom(ws3, roomId);

    const msgs3 = getMessages(ws3);
    const error = msgs3.find((m) => m.type === 'error');
    expect(error).toBeDefined();
    expect(error.message).toContain('full');
  });
});

describe('Room — 연결 해제', () => {
  it('한 플레이어가 나가면 상대에게 opponentDisconnected 메시지', () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();

    createRoom(ws1);
    const roomId = getMessages(ws1).find((m) => m.type === 'roomCreated').roomId;
    joinRoom(ws2, roomId);

    handleDisconnect(ws1);

    const msgs2 = getMessages(ws2);
    expect(msgs2.some((m) => m.type === 'opponentDisconnected')).toBe(true);
  });

  it('연결 해제 후 listRooms에 해당 방이 나오지 않는다', () => {
    const ws1 = createMockWs();
    const wsLister = createMockWs();

    createRoom(ws1);
    const roomId = getMessages(ws1).find((m) => m.type === 'roomCreated').roomId;

    handleDisconnect(ws1);
    listRooms(wsLister);

    const roomList = getMessages(wsLister).find((m) => m.type === 'roomList');
    expect(roomList.rooms.every((r: any) => r.id !== roomId)).toBe(true);
  });
});

describe('Room — 입력 처리', () => {
  it('handleInput은 올바른 플레이어의 입력을 갱신한다', () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();

    createRoom(ws1);
    const roomId = getMessages(ws1).find((m) => m.type === 'roomCreated').roomId;
    joinRoom(ws2, roomId);

    expect(() =>
      handleInput(ws1, { left: true, right: false, jump: false }),
    ).not.toThrow();
    expect(() =>
      handleInput(ws2, { left: false, right: true, jump: true }),
    ).not.toThrow();
  });

  it('방에 없는 소켓의 입력은 무시된다', () => {
    const wsUnknown = createMockWs();
    expect(() =>
      handleInput(wsUnknown, { left: true, right: false, jump: false }),
    ).not.toThrow();
  });
});

describe('Room — 방 목록', () => {
  it('대기 중인 방만 목록에 표시된다', () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();
    const wsLister = createMockWs();

    createRoom(ws1);
    const roomId = getMessages(ws1).find((m) => m.type === 'roomCreated').roomId;

    listRooms(wsLister);
    let roomList = getMessages(wsLister).find((m) => m.type === 'roomList');
    expect(roomList.rooms.some((r: any) => r.id === roomId)).toBe(true);

    joinRoom(ws2, roomId);
    const wsLister2 = createMockWs();
    listRooms(wsLister2);
    roomList = getMessages(wsLister2).find((m) => m.type === 'roomList');
    expect(roomList.rooms.every((r: any) => r.id !== roomId)).toBe(true);
  });
});
