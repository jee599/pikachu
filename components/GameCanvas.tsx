"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  type GameState,
  type PlayerSync,
  type BallSync,
  GROUND_WIDTH,
  GROUND_HEIGHT,
} from "@/lib/game/types";
import { render, loadAssets, isAssetsLoaded } from "@/lib/game/renderer";

// 내부 캔버스는 2x 해상도로 그려서 스프라이트 보간을 매끄럽게
const RENDER_SCALE = 2;
const CANVAS_W = GROUND_WIDTH * RENDER_SCALE;
const CANVAS_H = GROUND_HEIGHT * RENDER_SCALE;

interface GameCanvasProps {
  gameState: GameState;
}

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPlayer(a: PlayerSync, b: PlayerSync, t: number): PlayerSync {
  return {
    x: lerpNum(a.x, b.x, t),
    y: lerpNum(a.y, b.y, t),
    state: b.state,
    frameNumber: b.frameNumber,
    isCollisionWithBallHappened: b.isCollisionWithBallHappened,
  };
}

function lerpBall(a: BallSync, b: BallSync, t: number): BallSync {
  return {
    x: lerpNum(a.x, b.x, t),
    y: lerpNum(a.y, b.y, t),
    xVelocity: b.xVelocity,
    yVelocity: b.yVelocity,
    rotation: b.rotation,
    fineRotation: b.fineRotation,
    isPowerHit: b.isPowerHit,
    punchEffectX: b.punchEffectX,
    punchEffectY: b.punchEffectY,
  };
}

export default function GameCanvas({ gameState }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [loaded, setLoaded] = useState(false);
  const [cssScale, setCssScale] = useState(1);

  const prevStateRef = useRef<GameState>(gameState);
  const currStateRef = useRef<GameState>(gameState);
  const lastUpdateTimeRef = useRef<number>(performance.now());
  const SERVER_TICK_MS = 40;

  useEffect(() => {
    prevStateRef.current = currStateRef.current;
    currStateRef.current = gameState;
    lastUpdateTimeRef.current = performance.now();
  }, [gameState]);

  useEffect(() => {
    loadAssets().then(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;
      // CSS 표시 크기: 컨테이너에 맞추되 원본의 최대 2배
      const maxDisplayW = Math.min(container.clientWidth, GROUND_WIDTH * 2);
      setCssScale(maxDisplayW / CANVAS_W);
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isAssetsLoaded()) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    ctx.imageSmoothingEnabled = false;

    const prev = prevStateRef.current;
    const curr = currStateRef.current;
    const elapsed = performance.now() - lastUpdateTimeRef.current;
    const t = Math.min(elapsed / SERVER_TICK_MS, 1);

    let renderState: GameState;
    if (curr.phase === "playing" || curr.phase === "scored" || curr.phase === "gameOver") {
      renderState = {
        ...curr,
        player1: lerpPlayer(prev.player1, curr.player1, t),
        player2: lerpPlayer(prev.player2, curr.player2, t),
        ball: lerpBall(prev.ball, curr.ball, t),
      };
    } else {
      renderState = curr;
    }

    // 2x 스케일로 렌더링
    ctx.save();
    ctx.scale(RENDER_SCALE, RENDER_SCALE);
    render(ctx, renderState);
    ctx.restore();

    rafRef.current = requestAnimationFrame(renderLoop);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    rafRef.current = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loaded, renderLoop]);

  return (
    <div ref={containerRef} className="flex w-full items-center justify-center">
      {!loaded && (
        <div
          style={{ width: CANVAS_W * cssScale, height: CANVAS_H * cssScale }}
          className="flex items-center justify-center bg-black text-gray-500"
        >
          Loading sprites...
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="block"
        style={{
          width: CANVAS_W * cssScale,
          height: CANVAS_H * cssScale,
          imageRendering: "pixelated",
          display: loaded ? "block" : "none",
        }}
      />
    </div>
  );
}
