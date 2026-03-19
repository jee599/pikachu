// 원본 게임 상수 (1997 피카츄 배구)
export const GROUND_WIDTH = 432;
export const GROUND_HEIGHT = 304;
export const GROUND_HALF_WIDTH = 216;

export const PLAYER_LENGTH = 64;
export const PLAYER_HALF_LENGTH = 32;
export const PLAYER_TOUCHING_GROUND_Y = 244;

export const BALL_RADIUS = 20;
export const BALL_TOUCHING_GROUND_Y = 252;

export const NET_PILLAR_HALF_WIDTH = 25;
export const NET_PILLAR_TOP_TOP_Y = 176;
export const NET_PILLAR_TOP_BOTTOM_Y = 192;
export const NET_X = GROUND_HALF_WIDTH; // 216

export const P1_INITIAL_X = 36;
export const P2_INITIAL_X = 396;
export const BALL_INITIAL_X_P1 = 56;
export const BALL_INITIAL_X_P2 = 376;

export const GRAVITY = 1;
export const FPS = 25;
export const PLAYER_WALK_SPEED = 6;
export const PLAYER_JUMP_VELOCITY = -16;

export const WINNING_SCORE = 15;

export type GamePhase = "lobby" | "waiting" | "playing" | "scored" | "gameOver";
export type PlayerSide = "left" | "right";

export interface PlayerSync {
  x: number;
  y: number;
  state: number;
  frameNumber: number;
  isCollisionWithBallHappened: boolean;
}

export interface BallSync {
  x: number;
  y: number;
  xVelocity: number;
  yVelocity: number;
  rotation: number;
  fineRotation: number;
  isPowerHit: boolean;
}

export interface GameStateSync {
  player1: PlayerSync;
  player2: PlayerSync;
  ball: BallSync;
  score: { left: number; right: number };
  phase: GamePhase;
  servingSide: PlayerSide;
}

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  powerHit: boolean;
}

export interface GameState {
  phase: GamePhase;
  player1: PlayerSync;
  player2: PlayerSync;
  ball: BallSync;
  score: { left: number; right: number };
  servingSide: PlayerSide;
  roomId: string | null;
  mySide: PlayerSide | null;
  winner: PlayerSide | null;
}

export interface RoomInfo {
  id: string;
  playerCount: number;
}

// 스프라이트 시트 프레임 정보
export interface SpriteFrame {
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
}

export interface SpriteSheet {
  frames: Record<string, SpriteFrame>;
  animations: Record<string, string[]>;
  meta: {
    image: string;
    size: { w: number; h: number };
  };
}

// WebSocket 메시지 타입
export type ClientMessage =
  | { type: "createRoom" }
  | { type: "joinRoom"; roomId: string }
  | { type: "input"; input: InputState }
  | { type: "ready" };

export type ServerMessage =
  | { type: "roomCreated"; roomId: string; side: PlayerSide }
  | { type: "roomJoined"; roomId: string; side: PlayerSide }
  | { type: "gameStart" }
  | { type: "gameState"; state: GameStateSync }
  | { type: "scored"; scorer: PlayerSide; score: { left: number; right: number } }
  | { type: "gameOver"; winner: PlayerSide; score: { left: number; right: number } }
  | { type: "roomList"; rooms: RoomInfo[] }
  | { type: "opponentDisconnected" }
  | { type: "error"; message: string };
