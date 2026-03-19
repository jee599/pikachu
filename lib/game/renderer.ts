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
  NET_PILLAR_TOP_TOP_Y,
  NET_PILLAR_TOP_BOTTOM_Y,
  NET_X,
} from "./types";

let spriteSheetImage: HTMLImageElement | null = null;
let spriteSheetData: SpriteSheet | null = null;
let assetsLoaded = false;
let loadingPromise: Promise<void> | null = null;

// 애니메이션 상태
let frameCount = 0;
let cloud1X = 20;
let cloud2X = 170;
let punchEffectTimer = 0;

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
  if (!spriteSheetImage) return;
  const frame = getFrame(key);
  if (!frame) return;

  const { x, y, w, h } = frame.frame;
  ctx.drawImage(spriteSheetImage, x, y, w, h, dx, dy, dw ?? w, dh ?? h);
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

// ─── 배경 ───

const SURFACE_Y = PLAYER_TOUCHING_GROUND_Y + PLAYER_HALF_LENGTH; // 276

function drawSky(ctx: CanvasRenderingContext2D) {
  drawTiled(ctx, "objects/sky_blue.png", 0, 0, GROUND_WIDTH, SURFACE_Y);
}

function drawMountain(ctx: CanvasRenderingContext2D) {
  // 산은 지면 바로 위에 위치 (432x64)
  drawSprite(ctx, "objects/mountain.png", 0, SURFACE_Y - 64);
}

function drawClouds(ctx: CanvasRenderingContext2D) {
  // 구름 2개가 천천히 오른쪽으로 이동
  drawSprite(ctx, "objects/cloud.png", Math.floor(cloud1X), 35);
  drawSprite(ctx, "objects/cloud.png", Math.floor(cloud2X), 60);
}

function drawGround(ctx: CanvasRenderingContext2D) {
  // 바닥 라인 (표면)
  drawSprite(ctx, "objects/ground_line_leftmost.png", 0, SURFACE_Y);
  for (let x = 16; x < GROUND_WIDTH - 16; x += 16) {
    drawSprite(ctx, "objects/ground_line.png", x, SURFACE_Y);
  }
  drawSprite(ctx, "objects/ground_line_rightmost.png", GROUND_WIDTH - 16, SURFACE_Y);

  // 노란색 바닥 (라인 아래 첫 줄)
  drawTiled(ctx, "objects/ground_yellow.png", 0, SURFACE_Y + 16, GROUND_WIDTH, 16);

  // 빨간색 바닥 (나머지)
  const redStartY = SURFACE_Y + 32;
  const redHeight = GROUND_HEIGHT - redStartY;
  if (redHeight > 0) {
    drawTiled(ctx, "objects/ground_red.png", 0, redStartY, GROUND_WIDTH, redHeight);
  }
}


// ─── 네트 ───

function drawNet(ctx: CanvasRenderingContext2D) {
  const pillarX = NET_X - 4;

  // 네트 기둥 상단
  drawSprite(ctx, "objects/net_pillar_top.png", pillarX, NET_PILLAR_TOP_TOP_Y);

  // 네트 기둥 본체 (top_bottom ~ surface)
  for (let y = NET_PILLAR_TOP_TOP_Y + 8; y < SURFACE_Y; y += 8) {
    drawSprite(ctx, "objects/net_pillar.png", pillarX, y);
  }
}

// ─── 피카츄 ───

function getPikachuSpriteKey(state: number, frameNumber: number): string {
  const maxFrames: Record<number, number> = {
    0: 5, 1: 5, 2: 5, 3: 2, 4: 1, 5: 5, 6: 5,
  };
  const max = maxFrames[state] ?? 1;
  const clampedFrame = Math.max(0, Math.min(frameNumber, max - 1));
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
  const dx = player.x - PLAYER_HALF_LENGTH;
  const dy = player.y - PLAYER_LENGTH + PLAYER_HALF_LENGTH;

  ctx.save();

  if (isP2) {
    ctx.translate(player.x, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(spriteSheetImage, sx, sy, sw, sh, -PLAYER_HALF_LENGTH, dy, PLAYER_LENGTH, PLAYER_LENGTH);
  } else {
    ctx.drawImage(spriteSheetImage, sx, sy, sw, sh, dx, dy, PLAYER_LENGTH, PLAYER_LENGTH);
  }

  ctx.restore();
}

function drawShadow(ctx: CanvasRenderingContext2D, x: number) {
  drawSprite(ctx, "objects/shadow.png", x - 16, SURFACE_Y - 4);
}

// ─── 공 ───

function drawBall(ctx: CanvasRenderingContext2D, ball: BallSync) {
  if (!spriteSheetImage) return;

  // 회전 프레임 결정
  let spriteKey: string;
  if (ball.fineRotation === 50) {
    spriteKey = "ball/ball_hyper.png";
  } else {
    const rotFrame = Math.abs(ball.rotation) % 5;
    spriteKey = `ball/ball_${rotFrame}.png`;
  }

  const frame = getFrame(spriteKey);
  if (!frame) return;

  const { x: sx, y: sy, w: sw, h: sh } = frame.frame;

  // 파워히트 잔상 (이전 위치에 반투명으로)
  if (ball.isPowerHit) {
    const trailFrame = getFrame("ball/ball_trail.png");
    if (trailFrame) {
      ctx.globalAlpha = 0.4;
      ctx.drawImage(
        spriteSheetImage,
        trailFrame.frame.x, trailFrame.frame.y,
        trailFrame.frame.w, trailFrame.frame.h,
        ball.x - BALL_RADIUS - ball.xVelocity * 0.5,
        ball.y - BALL_RADIUS - ball.yVelocity * 0.5,
        40, 40,
      );
      ctx.globalAlpha = 1;
    }
  }

  // 공 본체
  ctx.drawImage(spriteSheetImage, sx, sy, sw, sh, ball.x - BALL_RADIUS, ball.y - BALL_RADIUS, 40, 40);

  // 펀치 이펙트 (punchEffectX/Y 좌표에 타이머로 페이드아웃)
  if (ball.isPowerHit && ball.punchEffectX > 0) {
    punchEffectTimer = 12; // 약 0.2초 (60fps 기준)
  }
  if (punchEffectTimer > 0 && ball.punchEffectX > 0) {
    const punchFrame = getFrame("ball/ball_punch.png");
    if (punchFrame) {
      const alpha = punchEffectTimer / 12;
      const scale = 1 + (1 - alpha) * 0.5; // 약간 커지면서 사라짐
      const size = 40 * scale;
      ctx.globalAlpha = alpha;
      ctx.drawImage(
        spriteSheetImage,
        punchFrame.frame.x, punchFrame.frame.y,
        punchFrame.frame.w, punchFrame.frame.h,
        ball.punchEffectX - size / 2,
        ball.punchEffectY - size / 2,
        size, size,
      );
      ctx.globalAlpha = 1;
    }
  }
}

function drawBallShadow(ctx: CanvasRenderingContext2D, ballX: number) {
  drawSprite(ctx, "objects/shadow.png", ballX - 16, SURFACE_Y - 4);
}

// ─── 점수 ───

function drawScoreNumber(ctx: CanvasRenderingContext2D, num: number, x: number, y: number) {
  if (num < 10) {
    drawSprite(ctx, `number/number_${num}.png`, x, y);
  } else {
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    drawSprite(ctx, `number/number_${tens}.png`, x - 16, y);
    drawSprite(ctx, `number/number_${ones}.png`, x + 16, y);
  }
}

function drawScore(ctx: CanvasRenderingContext2D, score: { left: number; right: number }) {
  drawScoreNumber(ctx, score.left, 68, 8);
  drawScoreNumber(ctx, score.right, GROUND_WIDTH - 68 - 32, 8);
}

// ─── 메시지 ───

function drawMessage(ctx: CanvasRenderingContext2D, messageKey: string) {
  const frame = getFrame(messageKey);
  if (!frame || !spriteSheetImage) return;

  const { x: sx, y: sy, w: sw, h: sh } = frame.frame;
  const dx = (GROUND_WIDTH - sw) / 2;
  const dy = (GROUND_HEIGHT - sh) / 2 - 40;

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
  ctx.fillText("Waiting for opponent...", GROUND_WIDTH / 2, GROUND_HEIGHT / 2);
  ctx.restore();
}

function drawGameOverOverlay(ctx: CanvasRenderingContext2D, winner: string) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, GROUND_WIDTH, GROUND_HEIGHT);

  drawMessage(ctx, "messages/common/game_end.png");

  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${winner} WINS!`, GROUND_WIDTH / 2, GROUND_HEIGHT / 2 + 20);

  ctx.font = "10px sans-serif";
  ctx.fillStyle = "#AAA";
  ctx.fillText("Press any key to return", GROUND_WIDTH / 2, GROUND_HEIGHT / 2 + 50);
  ctx.restore();
}

// ─── 메인 렌더 ───

export function render(ctx: CanvasRenderingContext2D, state: GameState) {
  if (!assetsLoaded) return;

  frameCount++;

  // 애니메이션 업데이트
  cloud1X += 0.3;
  cloud2X += 0.15;
  if (cloud1X > GROUND_WIDTH) cloud1X = -48;
  if (cloud2X > GROUND_WIDTH) cloud2X = -48;
  if (punchEffectTimer > 0) punchEffectTimer--;

  ctx.clearRect(0, 0, GROUND_WIDTH, GROUND_HEIGHT);

  // 레이어 순서 (원본 동일): 하늘 → 구름 → 산 → 바닥 → 파도 → 네트
  drawSky(ctx);
  drawClouds(ctx);
  drawMountain(ctx);
  drawGround(ctx);
  drawNet(ctx);

  if (state.phase === "playing" || state.phase === "scored" || state.phase === "gameOver") {
    // 그림자 (캐릭터/공 아래)
    drawShadow(ctx, state.player1.x);
    drawShadow(ctx, state.player2.x);
    drawBallShadow(ctx, state.ball.x);

    // 캐릭터
    drawPlayer(ctx, state.player1, false);
    drawPlayer(ctx, state.player2, true);

    // 공
    drawBall(ctx, state.ball);

    // 점수
    drawScore(ctx, state.score);
  }

  if (state.phase === "waiting") {
    // waiting에서도 피카츄와 공을 그림 (배경 위에)
    drawShadow(ctx, state.player1.x);
    drawShadow(ctx, state.player2.x);
    drawPlayer(ctx, state.player1, false);
    drawPlayer(ctx, state.player2, true);
    drawWaitingText(ctx);
  }

  if (state.phase === "scored") {
    drawMessage(ctx, "messages/common/ready.png");
  }

  if (state.phase === "gameOver" && state.winner) {
    const winnerLabel = state.winner === state.mySide ? "YOU" : "OPPONENT";
    drawGameOverOverlay(ctx, winnerLabel);
  }
}
