import { describe, it, expect } from 'vitest';
import {
  createInitialBall,
  createInitialPlayer,
  createInitialGameState,
} from '../lib/game/engine';
import {
  P1_INITIAL_X,
  P2_INITIAL_X,
  BALL_INITIAL_X_P1,
  BALL_INITIAL_X_P2,
  PLAYER_TOUCHING_GROUND_Y,
  WINNING_SCORE,
  type GameState,
} from '../lib/game/types';

describe('createInitialPlayer', () => {
  it('왼쪽 플레이어 초기 위치', () => {
    const p = createInitialPlayer('left');
    expect(p.x).toBe(P1_INITIAL_X);
    expect(p.y).toBe(PLAYER_TOUCHING_GROUND_Y);
    expect(p.state).toBe(0);
    expect(p.frameNumber).toBe(0);
  });

  it('오른쪽 플레이어 초기 위치', () => {
    const p = createInitialPlayer('right');
    expect(p.x).toBe(P2_INITIAL_X);
    expect(p.y).toBe(PLAYER_TOUCHING_GROUND_Y);
  });
});

describe('createInitialBall', () => {
  it('왼쪽 서브 시 공 위치', () => {
    const ball = createInitialBall('left');
    expect(ball.x).toBe(BALL_INITIAL_X_P1);
    expect(ball.xVelocity).toBe(0);
    expect(ball.yVelocity).toBe(0);
    expect(ball.rotation).toBe(0);
    expect(ball.isPowerHit).toBe(false);
  });

  it('오른쪽 서브 시 공 위치', () => {
    const ball = createInitialBall('right');
    expect(ball.x).toBe(BALL_INITIAL_X_P2);
  });
});

describe('createInitialGameState', () => {
  it('기본 상태가 올바르다', () => {
    const state = createInitialGameState();
    expect(state.phase).toBe('lobby');
    expect(state.score).toEqual({ left: 0, right: 0 });
    expect(state.servingSide).toBe('left');
    expect(state.roomId).toBeNull();
    expect(state.mySide).toBeNull();
    expect(state.winner).toBeNull();
  });

  it('플레이어 초기 위치가 설정된다', () => {
    const state = createInitialGameState();
    expect(state.player1.x).toBe(P1_INITIAL_X);
    expect(state.player2.x).toBe(P2_INITIAL_X);
  });

  it('공 초기 위치가 설정된다', () => {
    const state = createInitialGameState();
    expect(state.ball.x).toBe(BALL_INITIAL_X_P1);
  });
});

describe('WINNING_SCORE', () => {
  it('15점 선승', () => {
    expect(WINNING_SCORE).toBe(15);
  });
});
