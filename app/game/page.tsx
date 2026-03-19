"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import GameCanvas from "@/components/GameCanvas";
import ScoreBoard from "@/components/ScoreBoard";
import { getSocket } from "@/lib/socket/client";
import { InputManager } from "@/lib/game/input";
import { createInitialGameState } from "@/lib/game/engine";
import {
  type GameState,
  type PlayerSide,
  type ServerMessage,
} from "@/lib/game/types";

function GameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = searchParams.get("roomId");
  const side = searchParams.get("side") as PlayerSide | null;

  const [gameState, setGameState] = useState<GameState>(() => {
    const state = createInitialGameState();
    state.roomId = roomId;
    state.mySide = side;
    state.phase = "waiting";
    return state;
  });

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const inputManagerRef = useRef<InputManager | null>(null);
  const inputTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastInputRef = useRef<string>("");

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case "gameStart":
        setGameState((prev) => ({ ...prev, phase: "playing" }));
        break;

      case "gameState":
        // 서버에서 받은 상태를 그대로 반영 (로컬 예측 불필요)
        setGameState((prev) => ({
          ...prev,
          player1: msg.state.player1,
          player2: msg.state.player2,
          ball: msg.state.ball,
          score: msg.state.score,
          phase: msg.state.phase,
          servingSide: msg.state.servingSide,
        }));
        break;

      case "scored":
        setGameState((prev) => ({
          ...prev,
          score: msg.score,
          servingSide: msg.scorer,
          phase: "scored",
        }));
        break;

      case "gameOver":
        setGameState((prev) => ({
          ...prev,
          score: msg.score,
          winner: msg.winner,
          phase: "gameOver",
        }));
        break;

      case "opponentDisconnected":
        setGameState((prev) => ({ ...prev, phase: "waiting" }));
        break;
    }
  }, []);

  useEffect(() => {
    if (!roomId || !side) {
      router.push("/");
      return;
    }

    const socket = getSocket();
    const unsub = socket.onMessage(handleMessage);

    socket.send({ type: "ready" });

    const inputManager = new InputManager();
    inputManager.attach();
    inputManagerRef.current = inputManager;

    // 입력을 서버 FPS(25fps = 40ms)에 맞춰 전송
    inputTickRef.current = setInterval(() => {
      const currentState = gameStateRef.current;
      if (currentState.phase !== "playing") return;

      const input = inputManager.getInput();
      const inputKey = `${input.left}${input.right}${input.jump}${input.powerHit}`;

      if (inputKey !== lastInputRef.current) {
        socket.send({ type: "input", input });
        lastInputRef.current = inputKey;
      }
    }, 40);

    return () => {
      unsub();
      inputManager.detach();
      if (inputTickRef.current) clearInterval(inputTickRef.current);
    };
  }, [roomId, side, router, handleMessage]);

  // 게임오버 시 아무 키로 로비 복귀
  useEffect(() => {
    if (gameState.phase !== "gameOver") return;

    const handleKey = () => {
      router.push("/");
    };

    // 살짝 딜레이를 주어 즉시 복귀 방지
    const timer = setTimeout(() => {
      window.addEventListener("keydown", handleKey, { once: true });
    }, 1000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKey);
    };
  }, [gameState.phase, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-4">
      <h1 className="font-mono text-lg font-bold tracking-tight text-yellow-400">
        PIKACHU VOLLEYBALL
      </h1>

      <ScoreBoard roomId={gameState.roomId} mySide={gameState.mySide} />

      <GameCanvas gameState={gameState} />

      {gameState.phase === "waiting" && (
        <p className="animate-pulse font-mono text-xs text-gray-500">
          Waiting for opponent...
        </p>
      )}

      {gameState.phase === "playing" && (
        <p className="font-mono text-[10px] text-gray-700">
          Arrows/WASD: move | Up/W/Space: jump | D: power hit
        </p>
      )}
    </main>
  );
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <p className="text-gray-500">Loading...</p>
        </main>
      }
    >
      <GameContent />
    </Suspense>
  );
}
