import {
  type InputState,
  type GameStateSync,
  type PlayerSide,
  GROUND_WIDTH,
  GROUND_HALF_WIDTH,
  PLAYER_HALF_LENGTH,
  PLAYER_TOUCHING_GROUND_Y,
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
  PLAYER_DIVE_SPEED,
  PLAYER_JUMP_VELOCITY,
  PLAYER_DIVE_VELOCITY,
  GRAVITY,
  WINNING_SCORE,
  BALL_RADIUS,
  PlayerState,
} from './types.js';

interface InternalPlayer {
  x: number;
  y: number;
  yVelocity: number;
  state: number;
  frameNumber: number;
  delayBeforeNextFrame: number;
  divingDirection: number;
  lyingDownDurationLeft: number;
  isCollisionWithBallHappened: boolean;
  prevPowerHitInput: boolean;
}

interface InternalBall {
  x: number;
  y: number;
  xVelocity: number;
  yVelocity: number;
  rotation: number;
  fineRotation: number;
  isPowerHit: boolean;
  punchEffectX: number;
  punchEffectY: number;
}

const DEFAULT_INPUT: InputState = { xDirection: 0, yDirection: 0, powerHit: false };

export class Game {
  player1: InternalPlayer;
  player2: InternalPlayer;
  ball: InternalBall;
  score: { left: number; right: number };
  phase: GameStateSync['phase'];
  servingSide: PlayerSide;
  inputs: { left: InputState; right: InputState };
  gameEnded: boolean;

  constructor() {
    this.score = { left: 0, right: 0 };
    this.servingSide = 'left';
    this.phase = 'playing';
    this.gameEnded = false;
    this.player1 = this.createPlayer('left');
    this.player2 = this.createPlayer('right');
    this.ball = this.createBall('left');
    this.inputs = { left: { ...DEFAULT_INPUT }, right: { ...DEFAULT_INPUT } };
  }

  private createPlayer(side: PlayerSide): InternalPlayer {
    return {
      x: side === 'left' ? PLAYER1_INITIAL_X : PLAYER2_INITIAL_X,
      y: PLAYER_TOUCHING_GROUND_Y,
      yVelocity: 0,
      state: PlayerState.IDLE,
      frameNumber: 0,
      delayBeforeNextFrame: 0,
      divingDirection: 0,
      lyingDownDurationLeft: 0,
      isCollisionWithBallHappened: false,
      prevPowerHitInput: false,
    };
  }

  private createBall(servingSide: PlayerSide): InternalBall {
    return {
      x: servingSide === 'left' ? BALL_P1_SERVE_X : BALL_P2_SERVE_X,
      y: BALL_INITIAL_Y,
      xVelocity: 0,
      yVelocity: 1,
      rotation: 0,
      fineRotation: 0,
      isPowerHit: false,
      punchEffectX: 0,
      punchEffectY: 0,
    };
  }

  resetRound(servingSide: PlayerSide): void {
    this.servingSide = servingSide;
    this.phase = 'playing';
    this.gameEnded = false;
    this.player1 = this.createPlayer('left');
    this.player2 = this.createPlayer('right');
    this.ball = this.createBall(servingSide);
    this.inputs = { left: { ...DEFAULT_INPUT }, right: { ...DEFAULT_INPUT } };
  }

  tick(): { scorer: PlayerSide } | null {
    this.processPlayer(this.player1, this.inputs.left, 'left');
    this.processPlayer(this.player2, this.inputs.right, 'right');

    // 공 물리
    this.ball.yVelocity += GRAVITY;
    this.ball.x += this.ball.xVelocity;
    this.ball.y += this.ball.yVelocity;

    // 공-월드 충돌
    this.handleBallWorldCollision();

    // 공-플레이어 충돌
    this.handlePlayerBallCollision(this.player1, this.inputs.left);
    this.handlePlayerBallCollision(this.player2, this.inputs.right);

    // 공 회전
    this.ball.fineRotation += Math.floor(this.ball.xVelocity / 2);
    if (this.ball.fineRotation < 0) this.ball.fineRotation += 50;
    if (this.ball.fineRotation >= 50) this.ball.fineRotation -= 50;
    this.ball.rotation = Math.floor(this.ball.fineRotation / 10);

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

  setWinLoseState(winner: PlayerSide): void {
    this.gameEnded = true;
    const winPlayer = winner === 'left' ? this.player1 : this.player2;
    const losePlayer = winner === 'left' ? this.player2 : this.player1;
    winPlayer.state = PlayerState.WIN_CELEBRATION;
    winPlayer.frameNumber = 0;
    losePlayer.state = PlayerState.LOSING;
    losePlayer.frameNumber = 0;
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
        punchEffectX: this.ball.punchEffectX,
        punchEffectY: this.ball.punchEffectY,
      },
      score: { ...this.score },
      phase: this.phase,
      servingSide: this.servingSide,
    };
  }

  private processPlayer(player: InternalPlayer, input: InputState, side: PlayerSide): void {
    const xMin = side === 'left' ? PLAYER1_X_MIN : PLAYER2_X_MIN;
    const xMax = side === 'left' ? PLAYER1_X_MAX : PLAYER2_X_MAX;

    // powerHit edge detection (서버에서 처리)
    const powerHitJustPressed = input.powerHit && !player.prevPowerHitInput;
    player.prevPowerHitInput = input.powerHit;

    // state 4 (누워있기): 아무것도 안 함, 카운트다운만
    if (player.state === PlayerState.LYING_DOWN) {
      player.lyingDownDurationLeft--;
      if (player.lyingDownDurationLeft < -1) {
        player.state = PlayerState.IDLE;
        player.frameNumber = 0;
      }
      return;
    }

    // state 5, 6 (승리/패배): 프레임 애니메이션만
    if (player.state >= PlayerState.WIN_CELEBRATION) {
      if (player.delayBeforeNextFrame < 4) {
        player.delayBeforeNextFrame++;
      } else {
        player.delayBeforeNextFrame = 0;
        if (player.frameNumber < 4) player.frameNumber++;
      }
      return;
    }

    // 이동 (state < 3)
    if (player.state < PlayerState.DIVING) {
      player.x += input.xDirection * PLAYER_WALK_SPEED;
    } else if (player.state === PlayerState.DIVING) {
      player.x += player.divingDirection * PLAYER_DIVE_SPEED;
    }

    // 경계 제한
    player.x = Math.max(xMin, Math.min(xMax, player.x));

    // 점프: state < 3 + yDirection == -1 + 지상
    if (player.state < PlayerState.DIVING &&
        input.yDirection === -1 &&
        player.y === PLAYER_TOUCHING_GROUND_Y) {
      player.yVelocity = PLAYER_JUMP_VELOCITY;
      player.state = PlayerState.JUMPING;
      player.frameNumber = 0;
    }

    // 파워히트: 점프 중(state 1) + powerHit 새로 누름
    if (powerHitJustPressed && player.state === PlayerState.JUMPING) {
      player.state = PlayerState.JUMPING_POWER_HIT;
      player.frameNumber = 0;
      player.delayBeforeNextFrame = 5;
    }

    // 다이빙: 지상(state 0) + powerHit 새로 누름 + 방향 입력
    if (powerHitJustPressed &&
        player.state === PlayerState.IDLE &&
        input.xDirection !== 0) {
      player.state = PlayerState.DIVING;
      player.frameNumber = 0;
      player.divingDirection = input.xDirection;
      player.yVelocity = PLAYER_DIVE_VELOCITY;
    }

    // 중력 + y이동 (매 프레임 무조건 적용 — 원본 동일)
    player.yVelocity += GRAVITY;
    player.y += player.yVelocity;

    // 착지 판정
    if (player.y > PLAYER_TOUCHING_GROUND_Y) {
      player.y = PLAYER_TOUCHING_GROUND_Y;
      player.yVelocity = 0;

      if (player.state === PlayerState.DIVING) {
        player.state = PlayerState.LYING_DOWN;
        player.frameNumber = 0;
        player.lyingDownDurationLeft = 3;
      } else if (player.state !== PlayerState.IDLE) {
        player.state = PlayerState.IDLE;
        player.frameNumber = 0;
      }
    }

    // 프레임 애니메이션
    this.updatePlayerFrame(player);
  }

  private updatePlayerFrame(player: InternalPlayer): void {
    switch (player.state) {
      case PlayerState.IDLE: {
        if (player.delayBeforeNextFrame < 3) {
          player.delayBeforeNextFrame++;
        } else {
          player.delayBeforeNextFrame = 0;
          // ping-pong 0→4→0
          if (player.frameNumber < 4) {
            player.frameNumber++;
          } else {
            player.frameNumber = 0;
          }
        }
        break;
      }
      case PlayerState.JUMPING:
        player.frameNumber = (player.frameNumber + 1) % 3;
        break;
      case PlayerState.JUMPING_POWER_HIT:
        if (player.delayBeforeNextFrame > 0) {
          player.delayBeforeNextFrame--;
        } else {
          if (player.frameNumber < 4) {
            player.frameNumber++;
          } else {
            // 파워히트 애니메이션 끝 → 점프로 복귀
            player.state = PlayerState.JUMPING;
            player.frameNumber = 0;
          }
        }
        break;
      case PlayerState.DIVING:
        player.frameNumber = (player.frameNumber + 1) % 2;
        break;
      case PlayerState.LYING_DOWN:
        player.frameNumber = 0;
        break;
    }
  }

  private handlePlayerBallCollision(player: InternalPlayer, input: InputState): void {
    const ball = this.ball;
    const dx = Math.abs(ball.x - player.x);
    const dy = Math.abs(ball.y - player.y);

    if (dx <= PLAYER_HALF_LENGTH && dy <= PLAYER_HALF_LENGTH) {
      if (!player.isCollisionWithBallHappened) {
        player.isCollisionWithBallHappened = true;

        if (player.state === PlayerState.JUMPING_POWER_HIT) {
          // 파워 히트 충돌
          // x방향: 공이 코트 왼쪽이면 오른쪽으로, 오른쪽이면 왼쪽으로
          // abs(xDirection)+1 → 방향키 없으면 10, 있으면 20
          if (ball.x < GROUND_HALF_WIDTH) {
            ball.xVelocity = (Math.abs(input.xDirection) + 1) * 10;
          } else {
            ball.xVelocity = -(Math.abs(input.xDirection) + 1) * 10;
          }
          // y방향: yDirection으로 각도 조절
          // -1=위로, 0=수평, 1=아래로
          ball.yVelocity = Math.abs(ball.yVelocity) * input.yDirection * 2;

          ball.isPowerHit = true;
          ball.punchEffectX = ball.x;
          ball.punchEffectY = ball.y;
        } else {
          // 일반 히트
          if (ball.x < player.x) {
            ball.xVelocity = -Math.floor(Math.abs(ball.x - player.x) / 3);
          } else if (ball.x > player.x) {
            ball.xVelocity = Math.floor(Math.abs(ball.x - player.x) / 3);
          } else {
            ball.xVelocity = [-1, 0, 1][Math.floor(Math.random() * 3)];
          }

          if (ball.xVelocity === 0) {
            ball.xVelocity = [-1, 0, 1][Math.floor(Math.random() * 3)];
          }

          // y속도: 최소 15 보장, 위로 반사
          ball.yVelocity = -Math.max(Math.abs(ball.yVelocity), 15);
          ball.isPowerHit = false;
        }
      }
    } else {
      player.isCollisionWithBallHappened = false;
    }
  }

  private handleBallWorldCollision(): void {
    const ball = this.ball;

    // 왼쪽 벽 (x < 20)
    if (ball.x < BALL_RADIUS) {
      ball.x = BALL_RADIUS;
      ball.xVelocity = -ball.xVelocity;
    }
    // 오른쪽 벽 (x > 432, 비대칭 — 원본 그대로)
    if (ball.x > GROUND_WIDTH) {
      ball.x = GROUND_WIDTH;
      ball.xVelocity = -ball.xVelocity;
    }
    // 천장
    if (ball.y < 0) {
      ball.y = 0;
      ball.yVelocity = 1;
    }

    // 네트 충돌
    const distFromNet = Math.abs(ball.x - GROUND_HALF_WIDTH);
    if (distFromNet < NET_PILLAR_HALF_WIDTH) {
      // 네트 꼭대기 (y: 176~192)
      if (ball.y >= NET_PILLAR_TOP_TOP_Y && ball.y <= NET_PILLAR_TOP_BOTTOM_Y) {
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
