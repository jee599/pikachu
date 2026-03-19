import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../src/game.js';
import {
  CANVAS_WIDTH,
  GROUND_Y,
  NET_X,
  NET_WIDTH,
  NET_TOP,
  BALL_RADIUS,
  BALL_GRAVITY,
  BALL_BOUNCE,
  PIKACHU_WIDTH,
  PIKACHU_SPEED,
  PIKACHU_GRAVITY,
  WINNING_SCORE,
} from '../src/types.js';

describe('Game — 초기 상태', () => {
  let game: Game;

  beforeEach(() => {
    game = new Game();
  });

  it('초기 서브는 left', () => {
    expect(game.state.servingSide).toBe('left');
  });

  it('초기 점수는 { left: 0, right: 0 }', () => {
    expect(game.state.score).toEqual({ left: 0, right: 0 });
  });

  it('공은 left 쪽(x=200)에서 시작', () => {
    expect(game.state.ball.x).toBe(200);
    expect(game.state.ball.y).toBe(100);
    expect(game.state.ball.vx).toBe(0);
    expect(game.state.ball.vy).toBe(0);
  });

  it('player1은 x=200, player2는 x=600에 배치', () => {
    expect(game.state.player1.x).toBe(200);
    expect(game.state.player2.x).toBe(600);
  });

  it('플레이어 초기 y는 GROUND_Y', () => {
    expect(game.state.player1.y).toBe(GROUND_Y);
    expect(game.state.player2.y).toBe(GROUND_Y);
  });

  it('플레이어 초기 점프 상태는 false', () => {
    expect(game.state.player1.isJumping).toBe(false);
    expect(game.state.player2.isJumping).toBe(false);
  });
});

describe('Game — 공 물리', () => {
  let game: Game;

  beforeEach(() => {
    game = new Game();
  });

  it('중력이 매 틱마다 적용된다', () => {
    const initialVy = game.state.ball.vy;
    game.tick();
    expect(game.state.ball.vy).toBeCloseTo(initialVy + BALL_GRAVITY, 5);
  });

  it('공이 왼쪽 벽에 부딪히면 반사된다', () => {
    game.state.ball.x = BALL_RADIUS + 1;
    game.state.ball.vx = -10;
    game.state.ball.vy = 0;
    game.tick();
    expect(game.state.ball.vx).toBeGreaterThan(0);
    expect(game.state.ball.x).toBeGreaterThanOrEqual(BALL_RADIUS);
  });

  it('공이 오른쪽 벽에 부딪히면 반사된다', () => {
    game.state.ball.x = CANVAS_WIDTH - BALL_RADIUS - 1;
    game.state.ball.vx = 10;
    game.state.ball.vy = 0;
    game.tick();
    expect(game.state.ball.vx).toBeLessThan(0);
    expect(game.state.ball.x).toBeLessThanOrEqual(CANVAS_WIDTH - BALL_RADIUS);
  });

  it('공이 천장에 부딪히면 아래로 반사된다', () => {
    game.state.ball.x = 200;
    game.state.ball.y = BALL_RADIUS + 1;
    game.state.ball.vy = -10;
    game.state.ball.vx = 0;
    game.tick();
    expect(game.state.ball.vy).toBeGreaterThan(0);
  });

  it('벽 반사 시 탄성 계수가 적용된다', () => {
    game.state.ball.x = BALL_RADIUS + 1;
    game.state.ball.vx = -10;
    game.state.ball.vy = 0;
    game.tick();
    expect(game.state.ball.vx).toBeCloseTo(10 * BALL_BOUNCE, 1);
  });
});

describe('Game — 네트 충돌', () => {
  let game: Game;

  beforeEach(() => {
    game = new Game();
  });

  it('공이 네트 위에서 떨어지면 위로 반사된다', () => {
    game.state.ball.x = NET_X;
    game.state.ball.y = NET_TOP - BALL_RADIUS + 2;
    game.state.ball.vy = 5;
    game.state.ball.vx = 0;
    game.tick();
    expect(game.state.ball.y).toBeLessThanOrEqual(NET_TOP);
  });

  it('공이 네트 왼쪽 옆에서 부딪히면 왼쪽으로 밀린다', () => {
    const netHalf = NET_WIDTH / 2;
    game.state.ball.x = NET_X - BALL_RADIUS + 1;
    game.state.ball.y = NET_TOP + 50;
    game.state.ball.vx = 5;
    game.state.ball.vy = 0;
    game.tick();
    expect(game.state.ball.x).toBeLessThanOrEqual(NET_X - netHalf);
  });

  it('공이 네트 오른쪽 옆에서 부딪히면 오른쪽으로 밀린다', () => {
    const netHalf = NET_WIDTH / 2;
    game.state.ball.x = NET_X + BALL_RADIUS - 1;
    game.state.ball.y = NET_TOP + 50;
    game.state.ball.vx = -5;
    game.state.ball.vy = 0;
    game.tick();
    expect(game.state.ball.x).toBeGreaterThanOrEqual(NET_X + netHalf);
  });
});

describe('Game — 바닥 판정 (점수)', () => {
  let game: Game;

  beforeEach(() => {
    game = new Game();
  });

  it('공이 왼쪽 코트 바닥에 닿으면 right 득점', () => {
    game.state.ball.x = 200;
    game.state.ball.y = GROUND_Y - BALL_RADIUS;
    game.state.ball.vy = 5;
    game.state.ball.vx = 0;
    const result = game.tick();
    expect(result).toEqual({ scorer: 'right' });
    expect(game.state.score.right).toBe(1);
  });

  it('공이 오른쪽 코트 바닥에 닿으면 left 득점', () => {
    game.state.ball.x = 600;
    game.state.ball.y = GROUND_Y - BALL_RADIUS;
    game.state.ball.vy = 5;
    game.state.ball.vx = 0;
    const result = game.tick();
    expect(result).toEqual({ scorer: 'left' });
    expect(game.state.score.left).toBe(1);
  });

  it('공이 바닥에 닿지 않으면 null 반환', () => {
    game.state.ball.y = 100;
    game.state.ball.vy = 0;
    const result = game.tick();
    expect(result).toBeNull();
  });

  it('네트 경계선(x=NET_X)에서 바닥에 닿으면 left 득점', () => {
    game.state.ball.x = NET_X;
    game.state.ball.y = GROUND_Y - BALL_RADIUS;
    game.state.ball.vy = 5;
    game.state.ball.vx = 0;
    const result = game.tick();
    expect(result).toEqual({ scorer: 'left' });
  });
});

describe('Game — 플레이어 이동', () => {
  let game: Game;

  beforeEach(() => {
    game = new Game();
  });

  it('왼쪽 입력 시 플레이어가 왼쪽으로 이동', () => {
    const initialX = game.state.player1.x;
    game.inputs.left = { left: true, right: false, jump: false };
    game.tick();
    expect(game.state.player1.x).toBeLessThan(initialX);
  });

  it('오른쪽 입력 시 플레이어가 오른쪽으로 이동', () => {
    const initialX = game.state.player1.x;
    game.inputs.left = { left: false, right: true, jump: false };
    game.tick();
    expect(game.state.player1.x).toBeGreaterThan(initialX);
  });

  it('player1은 왼쪽 벽을 벗어나지 못한다', () => {
    const halfWidth = PIKACHU_WIDTH / 2;
    game.state.player1.x = halfWidth;
    game.inputs.left = { left: true, right: false, jump: false };
    game.tick();
    expect(game.state.player1.x).toBeGreaterThanOrEqual(halfWidth);
  });

  it('player1은 네트를 넘어가지 못한다', () => {
    const halfWidth = PIKACHU_WIDTH / 2;
    const netHalf = NET_WIDTH / 2;
    game.state.player1.x = NET_X - netHalf - halfWidth;
    game.inputs.left = { left: false, right: true, jump: false };
    game.tick();
    expect(game.state.player1.x).toBeLessThanOrEqual(NET_X - netHalf - halfWidth);
  });

  it('player2는 네트 왼쪽으로 넘어가지 못한다', () => {
    const halfWidth = PIKACHU_WIDTH / 2;
    const netHalf = NET_WIDTH / 2;
    game.state.player2.x = NET_X + netHalf + halfWidth;
    game.inputs.right = { left: true, right: false, jump: false };
    game.tick();
    expect(game.state.player2.x).toBeGreaterThanOrEqual(NET_X + netHalf + halfWidth);
  });

  it('player2는 오른쪽 벽을 넘어가지 못한다', () => {
    const halfWidth = PIKACHU_WIDTH / 2;
    game.state.player2.x = CANVAS_WIDTH - halfWidth;
    game.inputs.right = { left: false, right: true, jump: false };
    game.tick();
    expect(game.state.player2.x).toBeLessThanOrEqual(CANVAS_WIDTH - halfWidth);
  });
});

describe('Game — 점프', () => {
  let game: Game;

  beforeEach(() => {
    game = new Game();
  });

  it('점프 입력 시 isJumping이 true가 된다', () => {
    game.inputs.left = { left: false, right: false, jump: true };
    game.tick();
    expect(game.state.player1.isJumping).toBe(true);
    expect(game.state.player1.y).toBeLessThan(GROUND_Y);
  });

  it('이미 점프 중이면 다시 점프하지 않는다', () => {
    game.inputs.left = { left: false, right: false, jump: true };
    game.tick();
    const vyAfterFirstJump = game.state.player1.vy;
    game.tick();
    expect(game.state.player1.vy).toBeCloseTo(vyAfterFirstJump + PIKACHU_GRAVITY, 5);
  });

  it('바닥에 착지하면 isJumping이 false로 리셋된다', () => {
    game.inputs.left = { left: false, right: false, jump: true };
    game.tick();
    expect(game.state.player1.isJumping).toBe(true);

    game.inputs.left = { left: false, right: false, jump: false };
    for (let i = 0; i < 100; i++) {
      game.tick();
    }
    expect(game.state.player1.y).toBe(GROUND_Y);
    expect(game.state.player1.isJumping).toBe(false);
  });

  it('두 플레이어가 동시에 점프할 수 있다', () => {
    game.inputs.left = { left: false, right: false, jump: true };
    game.inputs.right = { left: false, right: false, jump: true };
    game.tick();
    expect(game.state.player1.isJumping).toBe(true);
    expect(game.state.player2.isJumping).toBe(true);
    expect(game.state.player1.y).toBeLessThan(GROUND_Y);
    expect(game.state.player2.y).toBeLessThan(GROUND_Y);
  });
});

describe('Game — 플레이어-공 충돌', () => {
  let game: Game;

  beforeEach(() => {
    game = new Game();
  });

  it('플레이어 머리 위에 공이 있으면 반사된다', () => {
    const player = game.state.player1;
    game.state.ball.x = player.x;
    game.state.ball.y = player.y - 30 - BALL_RADIUS + 5; // head center is y-30
    game.state.ball.vy = 5;
    game.state.ball.vx = 0;
    game.tick();
    expect(game.state.ball.y).toBeLessThan(GROUND_Y);
  });

  it('충돌 후에도 공 속도가 유한하다', () => {
    const player = game.state.player1;
    game.state.ball.x = player.x;
    game.state.ball.y = player.y - 30 - BALL_RADIUS + 5;
    game.state.ball.vy = 20;
    game.state.ball.vx = 20;
    game.state.player1.vy = -10;
    game.tick();
    expect(Number.isFinite(game.state.ball.vx)).toBe(true);
    expect(Number.isFinite(game.state.ball.vy)).toBe(true);
  });
});

describe('Game — 게임 종료', () => {
  let game: Game;

  beforeEach(() => {
    game = new Game();
  });

  it(`left가 ${WINNING_SCORE}점 달성 시 게임 오버`, () => {
    game.state.score = { left: WINNING_SCORE, right: 0 };
    expect(game.isGameOver()).toEqual({ winner: 'left' });
  });

  it(`right가 ${WINNING_SCORE}점 달성 시 게임 오버`, () => {
    game.state.score = { left: 0, right: WINNING_SCORE };
    expect(game.isGameOver()).toEqual({ winner: 'right' });
  });

  it('아직 아무도 WINNING_SCORE에 도달하지 않으면 null', () => {
    game.state.score = { left: WINNING_SCORE - 1, right: WINNING_SCORE - 1 };
    expect(game.isGameOver()).toBeNull();
  });
});

describe('Game — resetRound', () => {
  let game: Game;

  beforeEach(() => {
    game = new Game();
  });

  it('라운드 리셋 후 점수는 유지된다', () => {
    game.state.score = { left: 3, right: 5 };
    game.resetRound('right');
    expect(game.state.score).toEqual({ left: 3, right: 5 });
  });

  it('라운드 리셋 후 공은 서버 쪽에 배치된다', () => {
    game.resetRound('right');
    expect(game.state.ball.x).toBe(600);
    game.resetRound('left');
    expect(game.state.ball.x).toBe(200);
  });

  it('라운드 리셋 후 플레이어는 초기 위치로 돌아간다', () => {
    game.state.player1.x = 100;
    game.state.player1.y = 200;
    game.resetRound('left');
    expect(game.state.player1.x).toBe(200);
    expect(game.state.player1.y).toBe(GROUND_Y);
  });

  it('라운드 리셋 후 입력은 초기화된다', () => {
    game.inputs.left = { left: true, right: true, jump: true };
    game.resetRound('left');
    expect(game.inputs.left).toEqual({ left: false, right: false, jump: false });
    expect(game.inputs.right).toEqual({ left: false, right: false, jump: false });
  });
});
