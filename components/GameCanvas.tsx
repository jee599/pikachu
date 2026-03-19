"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { type GameState, GROUND_WIDTH, GROUND_HEIGHT } from "@/lib/game/types";
import { render, loadAssets, isAssetsLoaded } from "@/lib/game/renderer";

interface GameCanvasProps {
  gameState: GameState;
}

export default function GameCanvas({ gameState }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(gameState);
  const rafRef = useRef<number>(0);
  const [loaded, setLoaded] = useState(false);

  stateRef.current = gameState;

  useEffect(() => {
    loadAssets().then(() => setLoaded(true));
  }, []);

  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isAssetsLoaded()) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    render(ctx, stateRef.current);
    rafRef.current = requestAnimationFrame(renderLoop);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    rafRef.current = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loaded, renderLoop]);

  // CSS 스케일링: 원본 해상도의 2배
  const scale = 2;

  return (
    <div className="flex w-full items-center justify-center">
      {!loaded && (
        <div
          style={{ width: GROUND_WIDTH * scale, height: GROUND_HEIGHT * scale }}
          className="flex items-center justify-center bg-black text-gray-500"
        >
          Loading sprites...
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={GROUND_WIDTH}
        height={GROUND_HEIGHT}
        className="block"
        style={{
          width: GROUND_WIDTH * scale,
          height: GROUND_HEIGHT * scale,
          imageRendering: "pixelated",
          display: loaded ? "block" : "none",
        }}
      />
    </div>
  );
}
