// 원본 피카츄 배구(1997) 상수 — reverse-engineered

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

export const PLAYER1_INITIAL_X = 36;
export const PLAYER2_INITIAL_X = 396;
export const BALL_INITIAL_Y = 10;
export const BALL_P1_SERVE_X = 56;
export const BALL_P2_SERVE_X = 376;

export const PLAYER1_X_MIN = 32;
export const PLAYER1_X_MAX = 184;
export const PLAYER2_X_MIN = 248;
export const PLAYER2_X_MAX = 400;

export const PLAYER_WALK_SPEED = 6;
export const PLAYER_JUMP_VELOCITY = -16;
export const GRAVITY = 1;

export const WINNING_SCORE = 15;
export const FPS = 25;
export const TICK_INTERVAL = 1000 / FPS; // 40ms

export type PlayerSide = 'left' | 'right';
export type GamePhase = 'waiting' | 'playing' | 'scored' | 'gameOver';

// 피카츄 애니메이션 상태
export const enum PlayerState {
  IDLE = 0,
  JUMPING = 1,
  JUMPING_POWER_HIT = 2,
  DIVING = 3,
  LYING_DOWN = 4,
  WIN_CELEBRATION = 5,
  LOSING = 6,
}

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

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  powerHit: boolean;
}

export interface GameStateSync {
  player1: PlayerSync;
  player2: PlayerSync;
  ball: BallSync;
  score: { left: number; right: number };
  phase: GamePhase;
  servingSide: PlayerSide;
}

// Client → Server
export type ClientMessage =
  | { type: 'createRoom' }
  | { type: 'joinRoom'; roomId: string }
  | { type: 'input'; input: InputState }
  | { type: 'ready' };

// Server → Client
export type ServerMessage =
  | { type: 'roomCreated'; roomId: string; side: PlayerSide }
  | { type: 'roomJoined'; roomId: string; side: PlayerSide }
  | { type: 'gameStart' }
  | { type: 'gameState'; state: GameStateSync }
  | { type: 'scored'; scorer: PlayerSide; score: { left: number; right: number } }
  | { type: 'gameOver'; winner: PlayerSide; score: { left: number; right: number } }
  | { type: 'opponentDisconnected' }
  | { type: 'error'; message: string };

export interface RoomInfo {
  id: string;
  playerCount: number;
}
