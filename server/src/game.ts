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
  normalStatusArmSwingDirection: number; // 원본: idle ping-pong 방향
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
      normalStatusArmSwingDirection: 1,
    };
  }

  private createBall(servingSide: PlayerSide): InternalBall {
    return {
      x: servingSide === 'left' ? BALL_P1_SERVE_X : BALL_P2_SERVE_X,
      y: 0, // 원본: y=0에서 시작
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

  // 원본 실행 순서: 공 회전→공 월드충돌→플레이어→공-플레이어 충돌→바닥 판정
  tick(): { scorer: PlayerSide } | null {
    const ball = this.ball;

    // 1) 공 회전 (이전 프레임의 xVelocity로 계산 — 원본 순서)
    ball.fineRotation += Math.floor(ball.xVelocity / 2);
    if (ball.fineRotation < 0) ball.fineRotation += 50;
    if (ball.fineRotation > 50) ball.fineRotation -= 50; // 원본: >50 (===50은 hyper ball)
    ball.rotation = Math.floor(ball.fineRotation / 10);

    // 2) 공 월드 충돌 + 위치 업데이트 (미래 위치 예측 방식 — 원본)
    const scored = this.processBallWorldCollision();
    if (scored) return scored;

    // 3) 플레이어 처리
    this.processPlayer(this.player1, this.inputs.left, 'left');
    this.processPlayer(this.player2, this.inputs.right, 'right');

    // 4) 공-플레이어 충돌
    this.handlePlayerBallCollision(this.player1, this.inputs.left);
    this.handlePlayerBallCollision(this.player2, this.inputs.right);

    return null;
  }

  isGameOver(): { winner: PlayerSide } | null {
    if (this.score.left >= WINNING_SCORE) return { winner: 'left' };
    if (this.score.right >= WINNING_SCORE) return { winner: 'right' };
    return null;
  }

  setWinLoseState(winner: PlayerSide): void {
    this.gameEnded = true;
    // 원본: state===0일 때만 전환. 여기선 서버에서 즉시 마킹하되
    // processPlayer에서 착지 시 gameEnded 체크
    const winPlayer = winner === 'left' ? this.player1 : this.player2;
    const losePlayer = winner === 'left' ? this.player2 : this.player1;
    // 이미 지상이면 즉시 전환
    if (winPlayer.state === PlayerState.IDLE) {
      winPlayer.state = PlayerState.WIN_CELEBRATION;
      winPlayer.frameNumber = 0;
      winPlayer.delayBeforeNextFrame = 0;
    }
    if (losePlayer.state === PlayerState.IDLE) {
      losePlayer.state = PlayerState.LOSING;
      losePlayer.frameNumber = 0;
      losePlayer.delayBeforeNextFrame = 0;
    }
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

  // 원본 방식: 미래 위치 예측 → 충돌 판정 → 실제 위치 반영
  private processBallWorldCollision(): { scorer: PlayerSide } | null {
    const ball = this.ball;
    const futureX = ball.x + ball.xVelocity;
    const futureY = ball.y + ball.yVelocity;

    // 왼쪽 벽
    if (futureX < BALL_RADIUS) {
      ball.xVelocity = -ball.xVelocity;
    }
    // 오른쪽 벽 (비대칭: x > 432, 원본 그대로)
    if (futureX > GROUND_WIDTH) {
      ball.xVelocity = -ball.xVelocity;
    }
    // 천장 (y 클램핑 안 함 — 원본)
    if (futureY < 0) {
      ball.yVelocity = 1;
    }

    // 네트 충돌
    if (Math.abs(futureX - GROUND_HALF_WIDTH) < NET_PILLAR_HALF_WIDTH) {
      // 네트 꼭대기 (y > 176 && y <= 192 — 원본: > not >=)
      if (futureY > NET_PILLAR_TOP_TOP_Y && futureY <= NET_PILLAR_TOP_BOTTOM_Y) {
        if (ball.yVelocity > 0) {
          ball.yVelocity = -ball.yVelocity;
        }
      }
      // 네트 옆면
      else if (futureY > NET_PILLAR_TOP_BOTTOM_Y) {
        if (ball.x < GROUND_HALF_WIDTH) {
          ball.xVelocity = -Math.abs(ball.xVelocity);
        } else {
          ball.xVelocity = Math.abs(ball.xVelocity);
        }
      }
    }

    // 바닥 충돌 → 공 반사 + 득점 (원본: 반사 후 return true)
    if (futureY > BALL_TOUCHING_GROUND_Y) {
      ball.yVelocity = -ball.yVelocity;
      ball.punchEffectX = ball.x;
      ball.punchEffectY = BALL_TOUCHING_GROUND_Y + BALL_RADIUS;

      // 위치 반영 (반사된 속도로)
      ball.x += ball.xVelocity;
      ball.y = BALL_TOUCHING_GROUND_Y;
      ball.yVelocity += GRAVITY;

      const scorer: PlayerSide = ball.x < GROUND_HALF_WIDTH ? 'right' : 'left';
      this.score[scorer]++;
      return { scorer };
    }

    // 위치 반영 + 중력
    ball.x += ball.xVelocity;
    ball.y += ball.yVelocity;
    ball.yVelocity += GRAVITY;

    return null;
  }

  private processPlayer(player: InternalPlayer, input: InputState, side: PlayerSide): void {
    const xMin = side === 'left' ? PLAYER1_X_MIN : PLAYER2_X_MIN;
    const xMax = side === 'left' ? PLAYER1_X_MAX : PLAYER2_X_MAX;

    const powerHitJustPressed = input.powerHit && !player.prevPowerHitInput;
    player.prevPowerHitInput = input.powerHit;

    // state 4 (누워있기)
    if (player.state === PlayerState.LYING_DOWN) {
      player.lyingDownDurationLeft--;
      if (player.lyingDownDurationLeft < -1) {
        player.state = PlayerState.IDLE;
        // 원본: frameNumber 리셋 안 함
      }
      return;
    }

    // state 5, 6 (승리/패배): 프레임만
    if (player.state >= PlayerState.WIN_CELEBRATION) {
      if (player.delayBeforeNextFrame < 4) { // 원본: > 4에서 진행 = 5틱 대기
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

    // 중력 + 착지 (원본: y < 244일 때만 중력)
    const futureY = player.y + player.yVelocity;
    if (futureY < PLAYER_TOUCHING_GROUND_Y) {
      player.yVelocity += GRAVITY;
      player.y += player.yVelocity;
    } else if (futureY > PLAYER_TOUCHING_GROUND_Y) {
      // 착지
      player.y = PLAYER_TOUCHING_GROUND_Y;
      player.yVelocity = 0;

      if (player.state === PlayerState.DIVING) {
        player.state = PlayerState.LYING_DOWN;
        player.frameNumber = 0;
        player.lyingDownDurationLeft = 3;
      } else {
        player.state = PlayerState.IDLE;
        player.frameNumber = 0;
      }
    }
    // futureY === 244이면 아무것도 안 함 (원본 동일)

    // 파워히트/다이빙 (착지 후에 체크 — 원본 순서)
    if (powerHitJustPressed && player.state === PlayerState.JUMPING) {
      player.state = PlayerState.JUMPING_POWER_HIT;
      player.frameNumber = 0;
      player.delayBeforeNextFrame = 5;
    }

    if (powerHitJustPressed &&
        player.state === PlayerState.IDLE &&
        input.xDirection !== 0) {
      player.state = PlayerState.DIVING;
      player.frameNumber = 0;
      player.divingDirection = input.xDirection;
      player.yVelocity = PLAYER_DIVE_VELOCITY;
    }

    // gameEnded 시 착지 후 승리/패배 전환 (원본: state===0일 때만)
    if (this.gameEnded && player.state === PlayerState.IDLE) {
      const isWinner = (side === 'left' && this.score.left > this.score.right) ||
                       (side === 'right' && this.score.right > this.score.left);
      player.state = isWinner ? PlayerState.WIN_CELEBRATION : PlayerState.LOSING;
      player.frameNumber = 0;
      player.delayBeforeNextFrame = 0;
    }

    // 프레임 애니메이션
    this.updatePlayerFrame(player);
  }

  private updatePlayerFrame(player: InternalPlayer): void {
    switch (player.state) {
      case PlayerState.IDLE: {
        // 원본: ping-pong 0→1→2→3→4→3→2→1→0, 4틱 대기
        if (player.delayBeforeNextFrame < 3) { // 원본: > 3에서 진행 = 4틱
          player.delayBeforeNextFrame++;
        } else {
          player.delayBeforeNextFrame = 0;
          player.frameNumber += player.normalStatusArmSwingDirection;
          if (player.frameNumber >= 4) {
            player.normalStatusArmSwingDirection = -1;
          } else if (player.frameNumber <= 0) {
            player.normalStatusArmSwingDirection = 1;
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
          if (player.frameNumber > 4) {
            // 원본: frameNumber > 4이면 복귀 (5에 도달해야)
            player.state = PlayerState.JUMPING;
            player.frameNumber = 0;
          } else {
            player.frameNumber++;
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

        // 원본: 일반 히트를 먼저 계산, 파워히트면 덮어씀
        // 일반 히트
        if (ball.x < player.x) {
          ball.xVelocity = -(Math.abs(ball.x - player.x) / 3) | 0;
        } else if (ball.x > player.x) {
          ball.xVelocity = (Math.abs(ball.x - player.x) / 3) | 0;
        }

        if (ball.xVelocity === 0) {
          ball.xVelocity = (Math.floor(Math.random() * 3)) - 1;
        }

        ball.yVelocity = -Math.max(Math.abs(ball.yVelocity), 15);
        ball.isPowerHit = false;

        // 파워 히트면 덮어씀
        if (player.state === PlayerState.JUMPING_POWER_HIT) {
          if (ball.x < GROUND_HALF_WIDTH) {
            ball.xVelocity = (Math.abs(input.xDirection) + 1) * 10;
          } else {
            ball.xVelocity = -(Math.abs(input.xDirection) + 1) * 10;
          }
          ball.yVelocity = Math.abs(ball.yVelocity) * input.yDirection * 2;
          ball.isPowerHit = true;
          ball.punchEffectX = ball.x;
          ball.punchEffectY = ball.y;
        }
      }
    } else {
      player.isCollisionWithBallHappened = false;
    }
  }
}
