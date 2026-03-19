# Pikachu Volleyball — Game Design Document

> Web-based multiplayer remake of the 1997 Pikachu Volleyball
> Tech Stack: TypeScript + Next.js + Canvas + WebSocket

---

## 1. Game Rules

### Scoring
- 첫 번째로 **15점**에 도달한 플레이어가 승리한다.
- 서브권을 가진 플레이어만 점수를 획득할 수 있다 (사이드아웃 방식, 원본과 동일).
- 상대가 실점하면 서브권이 이동한다.

### 실점 조건
- 공이 자기 코트 바닥에 닿으면 실점.
- 공이 코트 밖으로 나가면 마지막으로 터치한 플레이어의 실점.
- 한 플레이어가 연속 3회 이상 터치하면 실점 (더블 터치는 허용하지 않음 — 원본 규칙 따름).

### 서브
- 게임 시작 시 랜덤으로 서브권 결정.
- 서브 플레이어가 공을 위로 던진 후 2초 내에 터치해야 한다. 시간 초과 시 서브권 이동.
- 서브 시 공은 서브 플레이어 머리 위 일정 높이에서 낙하한다.

---

## 2. Physics Engine Spec

원본 1997년 피카츄 배구의 물리 엔진을 기반으로 한다. 모든 값은 432x304 논리 해상도 기준이다.

### Constants

| Parameter | Value | Unit |
|---|---|---|
| GRAVITY | 0.5 | px/frame² |
| BALL_RADIUS | 20 | px |
| BALL_TOUCH_SPEED_X | variable (-5 ~ 5) | px/frame |
| BALL_TOUCH_SPEED_Y | -5 (base upward) | px/frame |
| BALL_TERMINAL_VELOCITY | 15 | px/frame |
| FRICTION (ground) | 0.7 | multiplier |

### Ball Trajectory
- 공은 포물선 궤도를 따른다: `y += vy; vy += GRAVITY`
- 수평 이동은 등속: `x += vx`
- 프레임당 물리 연산 1회 (30fps 논리 틱 기준).

### Collision Detection

#### Ball vs Ground
- `ball.y + BALL_RADIUS >= GROUND_Y`이면 바닥 충돌.
- 바닥 충돌 = 실점 판정. 바운스 없음.

#### Ball vs Net
- 네트는 직사각형 히트박스: 너비 2px, 높이 네트 상단~바닥.
- 측면 충돌: `vx = -vx` (반사). 공이 네트를 통과할 수 없다.
- 상단 충돌: `vy = -vy * 0.7` (감쇄 반사).

#### Ball vs Pikachu
- 원형 vs 원형 충돌: `distance(ball, pikachu_head) < BALL_RADIUS + PIKACHU_HEAD_RADIUS`
- 충돌 각도에 따라 반사 벡터 계산:

```
angle = atan2(ball.y - pikachu.y, ball.x - pikachu.x)
ball.vx = cos(angle) * BALL_BOUNCE_SPEED
ball.vy = sin(angle) * BALL_BOUNCE_SPEED
```

- `BALL_BOUNCE_SPEED`: 거리와 피카츄 속도에 따라 5~10 범위.

#### Ball vs Ceiling / Walls
- 천장: `ball.y - BALL_RADIUS <= 0` → `vy = abs(vy)` (아래로 반사)
- 좌/우 벽: `ball.x` 범위 초과 → `vx = -vx`

---

## 3. Pikachu Movement Spec

### Movement

| Parameter | Value | Unit |
|---|---|---|
| MOVE_SPEED | 6 | px/frame |
| JUMP_VELOCITY | -15 | px/frame |
| GRAVITY (character) | 0.5 | px/frame² |
| MAX_JUMPS | 2 | count (더블 점프) |
| PIKACHU_WIDTH | 64 | px |
| PIKACHU_HEIGHT | 64 | px |
| PIKACHU_HEAD_RADIUS | 32 | px (충돌 판정용) |

### Hitbox
- 이동/벽 충돌: 64x64 직사각형 AABB.
- 공 충돌: 머리 중심 기준 반지름 32px 원형. 중심 좌표는 피카츄 스프라이트 상단 1/3 지점.

### Movement Bounds
- Player 1 (왼쪽): `x` 범위 0 ~ 네트 좌측.
- Player 2 (오른쪽): `x` 범위 네트 우측 ~ 코트 끝.
- 각 플레이어는 자기 코트 절반만 이동 가능하다. 네트를 넘어갈 수 없다.

### Animation States
- `idle` — 정지
- `move` — 좌우 이동
- `jump` — 점프 상승 중
- `fall` — 하강 중
- `dive` — 스파이크 모션 (점프 중 아래 입력)
- `win` — 점수 획득 세레머니
- `lose` — 실점 리액션

---

## 4. Court Dimensions

논리 해상도 **432 x 304** 기준 (원본 동일). 실제 렌더링은 Canvas 크기에 비례 스케일링.

```
┌──────────────────────────────────────────┐
│                  SKY                      │  y=0
│                                          │
│                                          │
│         P1          ║         P2         │
│                     ║                    │
│                     ║ NET                │
├─────────────────────╨────────────────────┤  y=248 (GROUND_Y)
│                 GROUND                   │  y=304
└──────────────────────────────────────────┘
 x=0              x=216              x=432
```

| Element | Spec |
|---|---|
| Court width | 432 px |
| Court height | 304 px |
| Ground Y | 248 px (바닥 라인) |
| Net X (center) | 216 px |
| Net width | 2 px (히트박스) |
| Net height | 네트 상단 y=176, 하단 y=248 (높이 72px) |
| Net pole width | 10 px (시각적, 판정 영향 없음) |
| Sky limit | y=0 |

### Aspect Ratio
- 논리 비율: 432:304 = 약 1.42:1
- 렌더링: Canvas 크기를 `window.innerWidth` 기준으로 비율 유지하며 스케일.
- 최대 렌더 크기: 864 x 608 (2배). 모바일은 축소.

---

## 5. Multiplayer Synchronization

### Architecture: Server-Authoritative with Client Prediction

```
┌──────────┐     WebSocket     ┌──────────┐     WebSocket     ┌──────────┐
│ Client A │ ◄──────────────► │  Server  │ ◄──────────────► │ Client B │
│ (P1)     │   input + state   │ (Auth)   │   input + state   │ (P2)     │
└──────────┘                   └──────────┘                   └──────────┘
```

### Server Authority
- 서버가 물리 연산의 최종 권한을 갖는다.
- 공 위치, 점수, 게임 상태는 서버에서만 변경된다.
- 클라이언트는 입력만 전송한다: `{ left, right, up, down, frame_seq }`

### Client Prediction
- 클라이언트는 자기 피카츄의 이동을 즉시 반영한다 (입력 지연 제거).
- 서버로부터 상태를 받으면 보정: 차이가 threshold(3px) 이상이면 lerp로 보간.
- 공은 예측하지 않는다. 서버 상태를 interpolation으로 표시.

### Tick Rate & Network

| Parameter | Value |
|---|---|
| Server tick rate | 30 Hz |
| Client render rate | 60 fps |
| Input send rate | 30 Hz (tick마다) |
| State broadcast rate | 30 Hz |
| Interpolation buffer | 3 frames (100ms) |

### Packet Format

```typescript
// Client → Server
interface ClientInput {
  seq: number;         // 프레임 시퀀스
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  timestamp: number;
}

// Server → Client
interface GameState {
  seq: number;
  ball: { x: number; y: number; vx: number; vy: number };
  p1: { x: number; y: number; vy: number; score: number };
  p2: { x: number; y: number; vy: number; score: number };
  servingPlayer: 1 | 2;
  phase: GamePhase;
}
```

### Lag Compensation
- 서버는 각 클라이언트의 RTT를 추적한다.
- 입력에 timestamp를 포함하여 서버가 시점 보정.
- RTT > 200ms이면 클라이언트에 경고 UI 표시.
- RTT > 500ms이면 연결 불안정 처리 (일시정지 또는 disconnect).

---

## 6. Game State Machine

```
                    ┌─────────┐
                    │  LOBBY  │
                    └────┬────┘
                         │ 2 players connected
                         ▼
                    ┌─────────┐
              ┌────►│  SERVE  │◄────────────────┐
              │     └────┬────┘                  │
              │          │ ball tossed            │
              │          ▼                        │
              │     ┌─────────┐                  │
              │     │  PLAY   │                  │
              │     └────┬────┘                  │
              │          │ ball hits ground       │
              │          ▼                        │
              │     ┌─────────┐                  │
              │     │  SCORE  │──── score < 15 ──┘
              │     └────┬────┘
              │          │ score >= 15
              │          ▼
              │     ┌──────────┐
              │     │ GAME_OVER│
              │     └────┬─────┘
              │          │ rematch
              └──────────┘
```

### State Definitions

#### LOBBY
- 두 플레이어가 접속할 때까지 대기.
- 접속 시 플레이어 번호(P1/P2) 할당.
- 양쪽 모두 ready 신호를 보내면 SERVE로 전환.

#### SERVE
- 서브 플레이어 결정 (첫 라운드: 랜덤, 이후: 실점한 플레이어).
- 공이 서브 플레이어 머리 위에 위치. 2초 카운트다운 시작.
- 서브 플레이어가 입력하면 공이 토스된다.
- 2초 내 입력 없으면 자동 토스.
- 전환 조건: 공 토스됨 → PLAY.

#### PLAY
- 물리 엔진 활성. 양쪽 플레이어 조작 가능.
- 매 프레임 충돌 판정 수행.
- 전환 조건: 공이 바닥에 닿음 → SCORE.

#### SCORE
- 점수 업데이트. 서브권 결정.
- 2초간 애니메이션 재생 (승자 win, 패자 lose 모션).
- 전환 조건:
  - 어느 한쪽이 15점 이상 → GAME_OVER.
  - 아직 15점 미만 → SERVE.

#### GAME_OVER
- 최종 승자 표시. 승리 애니메이션.
- 3초 후 rematch 버튼 활성화.
- 양쪽 모두 rematch 선택 시 → SERVE (점수 리셋).
- 한쪽이 나가면 → LOBBY.

### State Transition Table

| From | Event | To |
|---|---|---|
| LOBBY | 2 players ready | SERVE |
| SERVE | ball tossed / timeout | PLAY |
| PLAY | ball hits ground | SCORE |
| SCORE | score < 15 | SERVE |
| SCORE | score >= 15 | GAME_OVER |
| GAME_OVER | rematch accepted | SERVE |
| GAME_OVER | player leaves | LOBBY |
| ANY | player disconnected | LOBBY (with timeout grace) |

### Disconnect Handling
- 플레이어 연결 끊김 시 10초 재접속 대기.
- 10초 내 재접속하면 현재 상태 그대로 복귀.
- 10초 초과 시 상대방 자동 승리, GAME_OVER 처리.

---

## Appendix: Original Game Reference

원본 피카츄 배구(1997, SACHI-SOFT / Nintendo)의 핵심 수치를 참고했다. 원본은 정수 연산 기반이며, 이 문서의 값은 원본 디컴파일 분석에서 도출한 근사치다. 구현 중 플레이 테스트를 통해 미세 조정한다.
