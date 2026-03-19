import {
  type GameState,
  type SpriteSheet,
  type SpriteFrame,
  type PlayerSync,
  type BallSync,
  GROUND_WIDTH,
  GROUND_HEIGHT,
  GROUND_HALF_WIDTH,
  PLAYER_LENGTH,
  PLAYER_HALF_LENGTH,
  PLAYER_TOUCHING_GROUND_Y,
  BALL_RADIUS,
  NET_PILLAR_HALF_WIDTH,
  NET_PILLAR_TOP_TOP_Y,
  NET_PILLAR_TOP_BOTTOM_Y,
  NET_X,
} from "./types";

let spriteSheetImage: HTMLImageElement | null = null;
let spriteSheetData: SpriteSheet | null = null;
let assetsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export function isAssetsLoaded(): boolean {
  return assetsLoaded;
}

export async function loadAssets(): Promise<void> {
  if (assetsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const [jsonRes, img] = await Promise.all([
      fetch("/assets/sprite_sheet.json").then((r) => r.json()),
      new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = "/assets/sprite_sheet.png";
      }),
    ]);

    spriteSheetData = jsonRes as SpriteSheet;
    spriteSheetImage = img;
    assetsLoaded = true;
  })();

  return loadingPromise;
}

function getFrame(key: string): SpriteFrame | null {
  if (!spriteSheetData) return null;
  return spriteSheetData.frames[key] ?? null;
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  key: string,
  dx: number,
  dy: number,
  dw?: number,
  dh?: number,
) {
  if (!spriteSheetImage || !spriteSheetData) return;
  const frame = getFrame(key);
  if (!frame) return;

  const { x, y, w, h } = frame.frame;
  ctx.drawImage(
    spriteSheetImage,
    x,
    y,
    w,
    h,
    dx,
    dy,
    dw ?? w,
    dh ?? h,
  );
}

function drawTiled(
  ctx: CanvasRenderingContext2D,
  key: string,
  startX: number,
  startY: number,
  areaW: number,
  areaH: number,
) {
  const frame = getFrame(key);
  if (!frame || !spriteSheetImage) return;

  const { x: sx, y: sy, w: sw, h: sh } = frame.frame;

  for (let tx = startX; tx < startX + areaW; tx += sw) {
    for (let ty = startY; ty < startY + areaH; ty += sh) {
      const drawW = Math.min(sw, startX + areaW - tx);
      const drawH = Math.min(sh, startY + areaH - ty);
      ctx.drawImage(spriteSheetImage, sx, sy, drawW, drawH, tx, ty, drawW, drawH);
    }
  }
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  // 하늘 (sky_blue 타일)
  drawTiled(ctx, "objects/sky_blue.png", 0, 0, GROUND_WIDTH, GROUND_HEIGHT);

  // 산
  drawSprite(ctx, "objects/mountain.png", 0, PLAYER_TOUCHING_GROUND_Y - 64);

  // 바닥 — 노란색 타일 (위쪽 줄)
  const groundStartY = PLAYER_TOUCHING_GROUND_Y + PLAYER_HALF_LENGTH;
  drawTiled(
    ctx,
    "objects/ground_yellow.png",
    0,
    groundStartY,
    GROUND_WIDTH,
    16,
  );

  // 바닥 — 빨간색 타일 (아래쪽)
  drawTiled(
    ctx,
    "objects/ground_red.png",
    0,
    groundStartY + 16,
    GROUND_WIDTH,
    GROUND_HEIGHT - groundStartY - 16,
  );

  // 바닥 라인
  drawSprite(ctx, "objects/ground_line_leftmost.png", 0, groundStartY);
  for (let x = 16; x < GROUND_WIDTH - 16; x += 16) {
    drawSprite(ctx, "objects/ground_line.png", x, groundStartY);
  }
  drawSprite(
    ctx,
    "objects/ground_line_rightmost.png",
    GROUND_WIDTH - 16,
    groundStartY,
  );
}

function drawNet(ctx: CanvasRenderingContext2D) {
  const pillarX = NET_X - 4; // 네트 기둥 위치 (8px 너비의 중심)
  const groundStartY = PLAYER_TOUCHING_GROUND_Y + PLAYER_HALF_LENGTH;

  // 네트 기둥 (위에서 아래로 타일)
  drawSprite(ctx, "objects/net_pillar_top.png", pillarX, NET_PILLAR_TOP_TOP_Y);
  for (let y = NET_PILLAR_TOP_BOTTOM_Y; y < groundStartY; y += 8) {
    drawSprite(ctx, "objects/net_pillar.png", pillarX, y);
  }
}

function getPikachuSpriteKey(state: number, frameNumber: number): string {
  // 프레임 수 제한
  const maxFrames: Record<number, number> = {
    0: 5,
    1: 5,
    2: 5,
    3: 2,
    4: 1,
    5: 5,
    6: 5,
  };
  const max = maxFrames[state] ?? 1;
  const clampedFrame = Math.min(frameNumber, max - 1);
  return `pikachu/pikachu_${state}_${clampedFrame}.png`;
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: PlayerSync,
  isP2: boolean,
) {
  const spriteKey = getPikachuSpriteKey(player.state, player.frameNumber);
  const frame = getFrame(spriteKey);
  if (!frame || !spriteSheetImage) return;

  const { x: sx, y: sy, w: sw, h: sh } = frame.frame;

  // 피카츄의 중심 좌표에서 그리기 위치 계산
  const dx = player.x - PLAYER_HALF_LENGTH;
  const dy = player.y - PLAYER_LENGTH + PLAYER_HALF_LENGTH;

  ctx.save();

  if (isP2) {
    // P2는 좌우 반전
    ctx.translate(player.x, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(
      spriteSheetImage,
      sx,
      sy,
      sw,
      sh,
      -PLAYER_HALF_LENGTH,
      dy,
      PLAYER_LENGTH,
      PLAYER_LENGTH,
    );
  } else {
    ctx.drawImage(
      spriteSheetImage,
      sx,
      sy,
      sw,
      sh,
      dx,
      dy,
      PLAYER_LENGTH,
      PLAYER_LENGTH,
    );
  }

  ctx.restore();
}

function drawShadow(ctx: CanvasRenderingContext2D, x: number) {
  const groundY = PLAYER_TOUCHING_GROUND_Y + PLAYER_HALF_LENGTH;
  drawSprite(ctx, "objects/shadow.png", x - 16, groundY - 4);
}

function drawBall(ctx: CanvasRenderingContext2D, ball: BallSync) {
  if (!spriteSheetImage) return;

  let spriteKey: string;

  if (ball.fineRotation === 50) {
    // 하이퍼볼
    spriteKey = "ball/ball_hyper.png";
  } else {
    // 일반 회전 (0~4)
    const rotFrame = Math.abs(ball.rotation) % 5;
    spriteKey = `ball/ball_${rotFrame}.png`;
  }

  const frame = getFrame(spriteKey);
  if (!frame) return;

  const { x: sx, y: sy, w: sw, h: sh } = frame.frame;

  // 파워히트 잔상
  if (ball.isPowerHit) {
    const trailFrame = getFrame("ball/ball_trail.png");
    if (trailFrame) {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(
        spriteSheetImage,
        trailFrame.frame.x,
        trailFrame.frame.y,
        trailFrame.frame.w,
        trailFrame.frame.h,
        ball.x - BALL_RADIUS - ball.xVelocity,
        ball.y - BALL_RADIUS - ball.yVelocity,
        40,
        40,
      );
      ctx.globalAlpha = 1;
    }
  }

  ctx.drawImage(
    spriteSheetImage,
    sx,
    sy,
    sw,
    sh,
    ball.x - BALL_RADIUS,
    ball.y - BALL_RADIUS,
    40,
    40,
  );

  // 파워히트 이펙트
  if (ball.isPowerHit) {
    const punchFrame = getFrame("ball/ball_punch.png");
    if (punchFrame) {
      ctx.drawImage(
        spriteSheetImage,
        punchFrame.frame.x,
        punchFrame.frame.y,
        punchFrame.frame.w,
        punchFrame.frame.h,
        ball.x - BALL_RADIUS,
        ball.y - BALL_RADIUS,
        40,
        40,
      );
    }
  }
}

function drawBallShadow(ctx: CanvasRenderingContext2D, ballX: number) {
  const groundY = PLAYER_TOUCHING_GROUND_Y + PLAYER_HALF_LENGTH;
  drawSprite(ctx, "objects/shadow.png", ballX - 16, groundY - 4);
}

function drawScoreNumber(
  ctx: CanvasRenderingContext2D,
  num: number,
  x: number,
  y: number,
) {
  if (num < 10) {
    drawSprite(ctx, `number/number_${num}.png`, x, y);
  } else {
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    drawSprite(ctx, `number/number_${tens}.png`, x - 16, y);
    drawSprite(ctx, `number/number_${ones}.png`, x + 16, y);
  }
}

function drawScore(
  ctx: CanvasRenderingContext2D,
  score: { left: number; right: number },
) {
  // P1 스코어 — 왼쪽 상단
  drawScoreNumber(ctx, score.left, 68, 8);
  // P2 스코어 — 오른쪽 상단
  drawScoreNumber(ctx, score.right, GROUND_WIDTH - 68 - 32, 8);
}

function drawMessage(
  ctx: CanvasRenderingContext2D,
  messageKey: string,
) {
  const frame = getFrame(messageKey);
  if (!frame || !spriteSheetImage) return;

  const { x: sx, y: sy, w: sw, h: sh } = frame.frame;
  const dx = (GROUND_WIDTH - sw) / 2;
  const dy = (GROUND_HEIGHT - sh) / 2 - 20;

  ctx.drawImage(spriteSheetImage, sx, sy, sw, sh, dx, dy, sw, sh);
}

function drawWaitingText(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, GROUND_WIDTH, GROUND_HEIGHT);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    "Waiting for opponent...",
    GROUND_WIDTH / 2,
    GROUND_HEIGHT / 2,
  );
  ctx.restore();
}

function drawGameOverOverlay(
  ctx: CanvasRenderingContext2D,
  winner: string,
  score: { left: number; right: number },
) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, GROUND_WIDTH, GROUND_HEIGHT);

  // "GAME END" 메시지 (스프라이트)
  drawMessage(ctx, "messages/common/game_end.png");

  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `${winner} WINS!`,
    GROUND_WIDTH / 2,
    GROUND_HEIGHT / 2 + 20,
  );

  ctx.font = "10px sans-serif";
  ctx.fillStyle = "#AAA";
  ctx.fillText(
    "Press any key to return",
    GROUND_WIDTH / 2,
    GROUND_HEIGHT / 2 + 50,
  );
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, state: GameState) {
  if (!assetsLoaded) return;

  ctx.clearRect(0, 0, GROUND_WIDTH, GROUND_HEIGHT);

  // 배경
  drawBackground(ctx);

  // 네트
  drawNet(ctx);

  if (
    state.phase === "playing" ||
    state.phase === "scored" ||
    state.phase === "gameOver"
  ) {
    // 그림자
    drawShadow(ctx, state.player1.x);
    drawShadow(ctx, state.player2.x);
    drawBallShadow(ctx, state.ball.x);

    // 피카츄
    drawPlayer(ctx, state.player1, false);
    drawPlayer(ctx, state.player2, true);

    // 공
    drawBall(ctx, state.ball);

    // 점수
    drawScore(ctx, state.score);
  }

  if (state.phase === "waiting") {
    drawWaitingText(ctx);
  }

  if (state.phase === "scored") {
    // "READY" 메시지 표시
    drawMessage(ctx, "messages/common/ready.png");
  }

  if (state.phase === "gameOver" && state.winner) {
    const winnerLabel = state.winner === state.mySide ? "YOU" : "OPPONENT";
    drawGameOverOverlay(ctx, winnerLabel, state.score);
  }
}
