"use client";

import { useState } from "react";
import { type RoomInfo } from "@/lib/game/types";

interface LobbyProps {
  rooms: RoomInfo[];
  connected: boolean;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
}

export default function Lobby({
  rooms,
  connected,
  onCreateRoom,
  onJoinRoom,
}: LobbyProps) {
  const [joinCode, setJoinCode] = useState("");

  return (
    <div className="mx-auto max-w-sm space-y-5">
      {/* 연결 상태 */}
      <div className="flex items-center justify-center gap-2 text-xs">
        <span
          className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`}
        />
        <span className={connected ? "text-green-400" : "text-red-400"}>
          {connected ? "Connected" : "Connecting..."}
        </span>
      </div>

      {/* 방 만들기 */}
      <button
        onClick={onCreateRoom}
        disabled={!connected}
        className="retro-btn w-full bg-yellow-500 py-3 text-base font-bold text-black hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        CREATE ROOM
      </button>

      {/* 코드로 참가 */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="ROOM CODE"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          className="flex-1 border-2 border-gray-700 bg-black px-3 py-2 text-center font-mono text-sm text-white placeholder-gray-600 outline-none focus:border-yellow-500"
          maxLength={6}
        />
        <button
          onClick={() => {
            if (joinCode.trim()) onJoinRoom(joinCode.trim());
          }}
          disabled={!connected || !joinCode.trim()}
          className="retro-btn bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          JOIN
        </button>
      </div>

      {/* 방 목록 */}
      {rooms.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">
            Open Rooms
          </h3>
          <div className="space-y-1">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => onJoinRoom(room.id)}
                disabled={!connected}
                className="flex w-full items-center justify-between border border-gray-800 bg-gray-900 px-3 py-2 text-left font-mono text-sm transition hover:border-yellow-500 hover:bg-gray-800 disabled:opacity-50"
              >
                <span className="text-white">{room.id}</span>
                <span className="text-gray-500">{room.playerCount}/2</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 조작법 */}
      <div className="border border-gray-800 bg-gray-900/50 p-3 text-xs">
        <p className="mb-1.5 font-bold text-gray-400">CONTROLS</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-gray-500">
          <span>Move</span>
          <span className="font-mono text-gray-400">Arrow / A,D</span>
          <span>Jump</span>
          <span className="font-mono text-gray-400">Up / W / Space</span>
          <span>Power Hit</span>
          <span className="font-mono text-gray-400">D / Right+Up</span>
        </div>
      </div>
    </div>
  );
}
