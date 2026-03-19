"use client";

// 점수는 캔버스 내부에서 스프라이트로 렌더링하므로
// 이 컴포넌트는 방 정보와 사이드 표시만 담당
interface ScoreBoardProps {
  roomId: string | null;
  mySide: "left" | "right" | null;
}

export default function ScoreBoard({ roomId, mySide }: ScoreBoardProps) {
  return (
    <div className="flex items-center justify-center gap-4 py-1 text-xs text-gray-500">
      {roomId && (
        <span className="font-mono">Room: {roomId}</span>
      )}
      {mySide && (
        <span>
          You: <span className="font-bold text-yellow-400">{mySide === "left" ? "P1" : "P2"}</span>
        </span>
      )}
    </div>
  );
}
