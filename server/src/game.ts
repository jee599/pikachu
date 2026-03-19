import {
  type InputState,
  type GameStateSync,
  type PlayerSide,
  GROUND_WIDTH,
  GROUND_HALF_WIDTH,
  PLAYER_HALF_LENGTH,
  PLAYER_TOUCHING_GROUND_Y,
  BALL_RADIUS,
  BALL_TOUCHING_GROUND_Y,
  NET_PILLAR_HALF_WIDTH,
  NET_PILLAR_TOP_TOP_Y,
  NET_PILLAR_TOP_BOTTOM_Y,
  PLAYER1_INITIAL_X,
  PLAYER2_INITIAL_X,
  BALL_INITIAL_Y,
  BALL_P1_SERVE_X,
  BALL_P2_SERVE_X,
  PLAYER1_X_MIN,
  PLAYER1_X_MAX,
  PLAYER2_X_MIN,
  PLAYER2_X_MAX,
  PLAYER_WALK_SPEED,
  PLAYER_JUMP_VELOCITY,
  GRAVITY,
  WINNING_SCORE,
  PlayerState,
} from './types.js';

// 내부 플레이어 상태 (서버 전용)
interface InternalPlayer {
  x: number;
  y: number;
  yVelocity: number;
  state: number;
  frameNumber: number;
  isCollisionWithBallHappened: boolean;
  lyingDownDurationLeft: number;
  divingDirection: number;
}

// 내부 공 상태 (서버 전용)
interface InternalBall {
  x: number;
  y: number;
  xVelocity: number;
  yVelocity: number;
  rotation: number;
  fineRotation: number;
  isPowerHit: boolean;
}

export class Game {
  player1: InternalPlayer;
  player2: InternalPlayer;
  ball: InternalBall;
  score: { left: number; right: number };
  phase: GameStateSync['phase'];
  servingSide: PlayerSide;
  inputs: { left: InputState; right: InputState };

  constructor() {
    this.score = { left: 0, right: 0 };
    this.servingSide = 'left';
    this.phase = 'playing';
    this.player1 = this.createPlayer('left');
    this.player2 = this.createPlayer('right');
    this.ball = this.createBall('left');
    this.inputs = {
      left: { left: false, right: false, jump: false, powerHit: false },
      right: { left: false, right: false, jump: false, powerHit: false },
    };
  }

  private createPlayer(side: PlayerSide): InternalPlayer {
    return {
      x: side === 'left' ? PLAYER1_INITIAL_X : PLAYER2_INITIAL_X,
      y: PLAYER_TOUCHING_GROUND_Y,
      yVelocity: 0,
      state: PlayerState.IDLE,
      frameNumber: 0,
      isCollisionWithBallHappened: false,
      lyingDownDurationLeft: 0,
      divingDirection: 0,
    };
  }

  private createBall(servingSide: PlayerSide): InternalBall {
    return {
      x: servingSide === 'left' ? BALL_P1_SERVE_X : BALL_P2_SERVE_X,
      y: BALL_INITIAL_Y,
      xVelocity: 0,
      yVelocity: 0,
      rotation: 0,
      fineRotation: 0,
      isPowerHit: false,
    };
  }

  resetRound(servingSide: PlayerSide): void {
    this.servingSide = servingSide;
    this.phase = 'playing';
    this.player1 = this.createPlayer('left');
    this.player2 = this.createPlayer('right');
    this.ball = this.createBall(servingSide);
    this.inputs = {
      left: { left: false, right: false, jump: false, powerHit: false },
      right: { left: false, right: false, jump: false, powerHit: false },
    };
  }

  tick(): { scorer: PlayerSide } | null {
    this.updatePlayer(this.player1, this.inputs.left, 'left');
    this.updatePlayer(this.player2, this.inputs.right, 'right');
    this.updateBall();

    // 공-플레이어 충돌
    this.handlePlayerBallCollision(this.player1);
    this.handlePlayerBallCollision(this.player2);

    // 공-월드 충돌
    this.handleBallWorldCollision();

    // 공 회전
    this.ball.fineRotation += Math.floor(this.ball.xVelocity / 2);
    this.ball.rotation = Math.floor(this.ball.fineRotation / 10) % 5;
    if (this.ball.rotation < 0) this.ball.rotation += 5;

    // 바닥 충돌 → 득점 판정
    if (this.ball.y > BALL_TOUCHING_GROUND_Y) {
      const scorer: PlayerSide = this.ball.x < GROUND_HALF_WIDTH ? 'right' : 'left';
      this.score[scorer]++;
      return { scorer };
    }

    return null;
  }

  isGameOver(): { winner: PlayerSide } | null {
    if (this.score.left >= WINNING_SCORE) return { winner: 'left' };
    if (this.score.right >= WINNING_SCORE) return { winner: 'right' };
    return null;
  }

  getState(): GameStateSync {
    return {
      player1: {
        x: this.player1.x,
        y: this.player1.y,
        state: this.player1.state,
        frameNumber: this.player1.frameNumber,
        isCollisionWithBallHappened: this.player1.isCollisionWithBallHappened,
      },
      player2: {
        x: this.player2.x,
        y: this.player2.y,
        state: this.player2.state,
        frameNumber: this.player2.frameNumber,
        isCollisionWithBallHappened: this.player2.isCollisionWithBallHappened,
      },
      ball: {
        x: this.ball.x,
        y: this.ball.y,
        xVelocity: this.ball.xVelocity,
        yVelocity: this.ball.yVelocity,
        rotation: this.ball.rotation,
        fineRotation: this.ball.fineRotation,
        isPowerHit: this.ball.isPowerHit,
      },
      score: { ...this.score },
      phase: this.phase,
      servingSide: this.servingSide,
    };
  }

  private updatePlayer(
    player: InternalPlayer,
    input: InputState,
    side: PlayerSide,
  ): void {
    const xMin = side === 'left' ? PLAYER1_X_MIN : PLAYER2_X_MIN;
    const xMax = side === 'left' ? PLAYER1_X_MAX : PLAYER2_X_MAX;

    // 누워있는 상태 처리
    if (player.state === PlayerState.LYING_DOWN) {
      player.lyingDownDurationLeft--;
      if (player.lyingDownDurationLeft <= 0) {
        player.state = PlayerState.IDLE;
        player.frameNumber = 0;
      }
      return;
    }

    // 다이빙 상태 처리
    if (player.state === PlayerState.DIVING) {
      player.x += player.divingDirection * PLAYER_WALK_SPEED * 2;
      player.yVelocity += GRAVITY;
      player.y += player.yVelocity;

      if (player.y >= PLAYER_TOUCHING_GROUND_Y) {
        player.y = PLAYER_TOUCHING_GROUND_Y;
        player.yVelocity = 0;
        player.state = PlayerState.LYING_DOWN;
        player.lyingDownDurationLeft = 3;
      }

      player.x = Math.max(xMin, Math.min(xMax, player.x));
      return;
    }

    // 지상에 있을 때
    if (player.y >= PLAYER_TOUCHING_GROUND_Y) {
      // 걷기
      if (input.left) player.x -= PLAYER_WALK_SPEED;
      if (input.right) player.x += PLAYER_WALK_SPEED;

      // 점프
      if (input.jump) {
        player.yVelocity = PLAYER_JUMP_VELOCITY;
        player.state = PlayerState.JUMPING;
        player.frameNumber = 0;
      } else {
        player.state = PlayerState.IDLE;
      }
    } else {
      // 공중에서
      player.yVelocity += GRAVITY;
      player.y += player.yVelocity;

      // 공중에서 좌우 이동
      if (input.left) player.x -= PLAYER_WALK_SPEED;
      if (input.right) player.x += PLAYER_WALK_SPEED;

      // 파워 히트 (점프 중 다시 점프 버튼 → 다이빙)
      if (input.powerHit && player.state === PlayerState.JUMPING) {
        player.state = PlayerState.JUMPING_POWER_HIT;
        player.frameNumber = 0;
      }

      // 다이빙 트리거
      if (input.powerHit && player.state === PlayerState.JUMPING_POWER_HIT) {
        if (input.left) {
          player.state = PlayerState.DIVING;
          player.divingDirection = -1;
        } else if (input.right) {
          player.state = PlayerState.DIVING;
          player.divingDirection = 1;
        }
      }

      // 착지
      if (player.y >= PLAYER_TOUCHING_GROUND_Y) {
        player.y = PLAYER_TOUCHING_GROUND_Y;
        player.yVelocity = 0;
        player.state = PlayerState.IDLE;
        player.frameNumber = 0;
      }
    }

    // 프레임 넘버 증가 (애니메이션)
    player.frameNumber++;

    // X 경계 제한
    player.x = Math.max(xMin, Math.min(xMax, player.x));
  }

  private handlePlayerBallCollision(player: InternalPlayer): void {
    const ball = this.ball;
    const dx = Math.abs(ball.x - player.x);
    const dy = Math.abs(ball.y - player.y);

    // BOX 기반 충돌 판정 (원본 게임과 동일)
    if (dx <= PLAYER_HALF_LENGTH && dy <= PLAYER_HALF_LENGTH) {
      if (!player.isCollisionWithBallHappened) {
        player.isCollisionWithBallHappened = true;

        // X 방향 속도
        if (ball.x < player.x) {
          ball.xVelocity = -Math.floor(Math.abs(ball.x - player.x) / 3);
        } else if (ball.x > player.x) {
          ball.xVelocity = Math.floor(Math.abs(ball.x - player.x) / 3);
        } else {
          // xVelocity == 0이면 랜덤
          ball.xVelocity = [-1, 0, 1][Math.floor(Math.random() * 3)];
        }

        if (ball.xVelocity === 0) {
          ball.xVelocity = [-1, 0, 1][Math.floor(Math.random() * 3)];
        }

        // Y 방향 속도
        ball.yVelocity = -Math.max(Math.abs(ball.yVelocity), 15);

        // 파워 히트 판정
        if (
          player.state === PlayerState.JUMPING_POWER_HIT ||
          player.state === PlayerState.DIVING
        ) {
          ball.isPowerHit = true;
          // 파워 히트 시 더 강한 X 속도
          ball.xVelocity = ball.x < player.x ? -10 : 10;
          ball.yVelocity = -Math.max(Math.abs(ball.yVelocity), 18);
        } else {
          ball.isPowerHit = false;
        }
      }
    } else {
      // 충돌 영역을 벗어나면 플래그 리셋
      player.isCollisionWithBallHappened = false;
    }
  }

  private updateBall(): void {
    const ball = this.ball;

    // 중력
    ball.yVelocity += GRAVITY;

    // 위치 업데이트
    ball.x += ball.xVelocity;
    ball.y += ball.yVelocity;
  }

  private handleBallWorldCollision(): void {
    const ball = this.ball;

    // 왼쪽 벽
    if (ball.x < BALL_RADIUS) {
      ball.x = BALL_RADIUS;
      ball.xVelocity = -ball.xVelocity;
    }

    // 오른쪽 벽
    if (ball.x > GROUND_WIDTH) {
      ball.x = GROUND_WIDTH;
      ball.xVelocity = -ball.xVelocity;
    }

    // 천장
    if (ball.y < 0) {
      ball.y = 0;
      ball.yVelocity = 1;
    }

    // 네트 꼭대기 (y: 176~192, |x - 216| < 25)
    const distFromNet = Math.abs(ball.x - GROUND_HALF_WIDTH);
    if (distFromNet < NET_PILLAR_HALF_WIDTH) {
      if (
        ball.y >= NET_PILLAR_TOP_TOP_Y &&
        ball.y <= NET_PILLAR_TOP_BOTTOM_Y
      ) {
        // 위에서 떨어지는 중이면 바운스
        if (ball.yVelocity > 0) {
          ball.yVelocity = -ball.yVelocity;
          ball.y = NET_PILLAR_TOP_TOP_Y;
        }
      }

      // 네트 옆면 (y > 192)
      if (ball.y > NET_PILLAR_TOP_BOTTOM_Y) {
        if (ball.x < GROUND_HALF_WIDTH) {
          ball.x = GROUND_HALF_WIDTH - NET_PILLAR_HALF_WIDTH;
          ball.xVelocity = -Math.abs(ball.xVelocity);
        } else {
          ball.x = GROUND_HALF_WIDTH + NET_PILLAR_HALF_WIDTH;
          ball.xVelocity = Math.abs(ball.xVelocity);
        }
      }
    }
  }
}
