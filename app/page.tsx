"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Lobby from "@/components/Lobby";
import { getSocket } from "@/lib/socket/client";
import { type RoomInfo, type ServerMessage } from "@/lib/game/types";

export default function Home() {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);

  const handleMessage = useCallback(
    (msg: ServerMessage) => {
      switch (msg.type) {
        case "roomCreated":
        case "roomJoined":
          router.push(`/game?roomId=${msg.roomId}&side=${msg.side}`);
          break;
        case "roomList":
          setRooms(msg.rooms);
          break;
        case "error":
          alert(msg.message);
          break;
      }
    },
    [router],
  );

  useEffect(() => {
    const socket = getSocket();

    socket.onConnect(() => setConnected(true));
    socket.onDisconnect(() => setConnected(false));
    const unsub = socket.onMessage(handleMessage);

    socket.connect();

    return () => {
      unsub();
    };
  }, [handleMessage]);

  const handleCreateRoom = () => {
    getSocket().send({ type: "createRoom" });
  };

  const handleJoinRoom = (roomId: string) => {
    getSocket().send({ type: "joinRoom", roomId });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-6 text-center">
        <h1 className="mb-1 font-mono text-3xl font-bold tracking-tight text-yellow-400">
          PIKACHU VOLLEYBALL
        </h1>
        <p className="font-mono text-xs text-gray-600">
          Multiplayer — First to 15 wins
        </p>
      </div>

      <Lobby
        rooms={rooms}
        connected={connected}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
      />
    </main>
  );
}
