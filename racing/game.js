// =====================================================================
// BRAKE FAILURE - 브레이크가 고장난 자동 가속 레이싱 (탑다운)
//  - 속도는 초당 +1km/h 로 계속 올라가며 절대 줄지 않는다
//  - 9차선 도로. 왼쪽 차선일수록 주행 차량이 빠르다
//  - 위에서 내려다보는 시점으로 회피에만 집중한다
//  - 도로는 끊기지 않고 무한히 이어지며 완만하게 굽이친다
// =====================================================================

// ---------------------------- 설정 ----------------------------------
const LANES = 9;
// 1차선(왼쪽) ~ 9차선(오른쪽) 주행 속도(km/h)
const LANE_SPEEDS = [200, 180, 160, 145, 130, 115, 100, 85, 70];

const CFG = {
  roadUnits: 4000,        // 도로 전체 폭(월드 단위) - 차폭 계산 기준
  roadRatio: 0.78,        // 화면 폭 대비 도로 폭
  roadMaxPx: 600,
  playerYRatio: 0.78,     // 플레이어 차량의 화면 세로 위치

  // 스크롤 계수: 화면 높이 1px 기준, km/h 당 초당 이동량
  scrollK: 0.0027,        // 노면/지면/도로변 (절대 속도감)
  relK: 0.0014,           // 트래픽 상대 이동 (회피 난이도)

  baseAccel: 1.0,         // 초당 +1 km/h (차량 accel 배율 적용)
  maxSpeed: 420,
  zoomMin: 0.78,          // 고속일수록 축소해서 앞을 더 보여준다

  // 충돌 판정은 넉넉하게 (실제 그림보다 작은 히트박스)
  hitX: 0.60,
  hitY: 0.66,

  trafficMin: 24,
  trafficMax: 44,
  laneChangeProb: 0.055,
  laneChangeProbMax: 0.16,
  laneChangeTime: 0.85,

  aheadWin: 2.3,          // × 화면높이 : 트래픽 관리 범위(앞)
  behindWin: 1.2,         // × 화면높이 : 트래픽 관리 범위(뒤)

  bandLen: 130,           // 지면 교차 밴드 길이
  roadBandLen: 260,       // 노면 교차 밴드 길이
  dashPeriod: 150,        // 차선 점선 주기
  dashLen: 58,
  centrifugal: 0.55,      // 커브에서 바깥으로 밀리는 정도

  sceneStart: 22,         // 첫 씬 유지 시간(초)
  sceneMin: 7,            // 최소 씬 유지 시간(초)
  sceneDecay: 0.9,        // 씬이 바뀔 때마다 유지 시간 x 0.9
  sceneFade: 1.6,
};

const Util = {
  limit: (v, lo, hi) => Math.max(lo, Math.min(v, hi)),
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
};

const laneWidthFrac = 2 / LANES;
const laneCenter = (lane) => -1 + (lane + 0.5) * laneWidthFrac;

// ---------------------------- 상태 ----------------------------------
const State = {
  mode: "menu", // menu | playing | crashed
  car: CAR_TYPES[1],
  scroll: 0,          // 누적 주행 위치(기준 px) - 도로/지면/오브젝트 공통 좌표
  speed: 100,
  topSpeed: 100,
  offsetX: 0,         // 도로 반폭 대비 -1 ~ 1
  lane: 6,
  targetLane: 6,
  elapsed: 0,
  distance: 0,
  nearMiss: 0,
  combo: 0,
  comboTimer: 0,
  score: 0,
  cars: [],
  objects: [],
  nextObjS: 0,
  shake: 0,
  crashTimer: 0,
  flash: 0,
  biomeA: 0, biomeB: 1, fade: 0, sceneTimer: 0, sceneHold: CFG.sceneStart,
  bestDistance: 0, bestScore: 0,
};

// ---------------------------- 캔버스 --------------------------------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let W = 960, H = 540;
let playerY = 420;      // 플레이어 화면 y
let roadPxBase = 600;   // zoom 1 기준 도로 폭(px)
let unit = 0.15;        // 월드 단위 -> 기준 px
let swayAmp = 100;      // 도로가 좌우로 굽이치는 폭(px)
let AHEAD = 1400, BEHIND = 700;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  W = Math.max(320, Math.round(rect.width));
  H = Math.max(240, Math.round(rect.height));
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  playerY = Math.round(H * CFG.playerYRatio);
  roadPxBase = Math.min(W * CFG.roadRatio, CFG.roadMaxPx);
  unit = roadPxBase / CFG.roadUnits;
  swayAmp = Math.min((W - roadPxBase) / 2 * 0.62, W * 0.16);
  AHEAD = H * CFG.aheadWin;
  BEHIND = H * CFG.behindWin;
}
window.addEventListener("resize", resize);

// 속도에 따른 축소율 (빠를수록 멀리 본다)
function zoomOf() {
  const pct = Util.limit((State.speed - 80) / (CFG.maxSpeed - 80), 0, 1);
  return 1 - (1 - CFG.zoomMin) * pct;
}
function speedPct() {
  return Util.limit((State.speed - 80) / (CFG.maxSpeed - 80), 0, 1);
}

// 도로 중심선: 주행 위치 s(기준 px)에서의 좌우 오프셋
function curveX(s) {
  return swayAmp * (Math.sin(s / 1500) * 0.62 + Math.sin(s / 730 + 2.1) * 0.38);
}
function curveSlope(s) {
  return (curveX(s + 60) - curveX(s - 60)) / 120;
}
// 주행 위치 s -> 화면 y
function yOf(s, zoom) {
  return playerY - (s - State.scroll) * zoom;
}

// 차량 크기(기준 px)
function carW(type) { return type.width * unit; }
function carL(type) { return type.width * unit * type.topAspect; }

// ---------------------------- 트래픽 --------------------------------
function trafficCount() {
  return Math.round(Util.limit(CFG.trafficMin + State.elapsed / 5, CFG.trafficMin, CFG.trafficMax));
}

function laneOccupied(lane, rel, gap, ignore) {
  for (const c of State.cars) {
    if (c === ignore) continue;
    if (c.lane !== lane && c.targetLane !== lane) continue;
    if (Math.abs(c.rel - rel) < gap) return true;
  }
  return false;
}

function spawnCar(recycled, scatter) {
  const type = TRAFFIC_TYPES[Util.randInt(0, TRAFFIC_TYPES.length - 1)];
  const color = TRAFFIC_COLORS[Util.randInt(0, TRAFFIC_COLORS.length - 1)];
  // 느린 차선일수록 트래픽이 조금 더 많다
  let lane = 0;
  for (let tries = 0; tries < 8; tries++) {
    lane = Util.randInt(0, LANES - 1);
    if (Math.random() < 0.55 + (lane / LANES) * 0.3) break;
  }
  const speed = LANE_SPEEDS[lane] * Util.rand(0.95, 1.06);
  const ahead = speed < State.speed;   // 나보다 느리면 앞쪽에서 다가온다
  const len = carL(type);
  let rel = 0;
  for (let tries = 0; tries < 14; tries++) {
    rel = scatter
      ? Util.rand(-BEHIND * 0.92, AHEAD * 0.92)
      : (ahead ? Util.rand(H * 0.95, AHEAD) : -Util.rand(H * 0.45, BEHIND));
    if (!laneOccupied(lane, rel, len * 1.6 + 90, recycled)) break;
  }
  const car = recycled || {};
  car.type = type;
  car.sprite = getCarSprite(type, color);
  car.lane = lane;
  car.targetLane = lane;
  car.offX = laneCenter(lane);
  car.rel = rel;
  car.speed = speed;
  car.baseSpeed = speed;
  car.blocked = false;
  car.changeTimer = 0;
  car.blink = 0;
  car.prevRel = rel;
  car.scored = false;
  return car;
}

function resetTraffic() {
  State.cars = [];
  for (let i = 0; i < trafficCount(); i++) State.cars.push(spawnCar(null, true));
  // 출발 직후 바로 앞뒤에 붙어 있는 차량은 밀어낸다
  for (const c of State.cars) {
    if (Math.abs(c.rel) < H * 0.55) c.rel += H * 0.9 * Math.sign(c.rel || 1);
  }
}

function tryLaneChange(car) {
  const dir = Math.random() < 0.5 ? -1 : 1;
  const target = car.lane + dir;
  if (target < 0 || target >= LANES) return;
  if (laneOccupied(target, car.rel, carL(car.type) * 2.0 + 110, car)) return;
  car.targetLane = target;
  car.changeTimer = CFG.laneChangeTime;
  car.blink = CFG.laneChangeTime;
  // 차선을 옮기면 그 차선의 흐름 속도에 맞춰 간다
  car.baseSpeed = LANE_SPEEDS[target] * Util.rand(0.95, 1.06);
  car.speed = car.baseSpeed;
}

function updateTraffic(dt) {
  const relK = H * CFG.relK;
  const laneProb = Util.limit(CFG.laneChangeProb + State.elapsed * 0.0008, 0, CFG.laneChangeProbMax);
  while (State.cars.length < trafficCount()) State.cars.push(spawnCar(null));

  for (const car of State.cars) {
    car.rel += (car.speed - State.speed) * relK * dt;

    if (car.changeTimer > 0) {
      car.changeTimer = Math.max(0, car.changeTimer - dt);
      const target = laneCenter(car.targetLane);
      const step = (laneWidthFrac / CFG.laneChangeTime) * dt;
      if (Math.abs(target - car.offX) <= step) {
        car.offX = target;
        car.lane = car.targetLane;
        car.changeTimer = 0;
      } else {
        car.offX += Math.sign(target - car.offX) * step;
      }
    } else if (Math.random() < laneProb * (car.blocked ? 3 : 1) * dt) {
      tryLaneChange(car);
    }
    if (car.blink > 0) car.blink = Math.max(0, car.blink - dt);

    // 관리 범위를 벗어난 차량 재활용
    if (car.rel > AHEAD * 1.15 || car.rel < -BEHIND * 1.15) {
      spawnCar(car);
      continue;
    }

    // 아슬아슬 통과(니어미스): 옆을 스쳐 지나가는 순간
    if (!car.scored && Math.sign(car.rel) !== Math.sign(car.prevRel)) {
      const gapPx = Math.abs(car.offX - State.offsetX) * roadPxBase / 2;
      if (gapPx < (carW(car.type) + carW(State.car)) / 2 * 2.1) {
        State.nearMiss++;
        State.combo++;
        State.comboTimer = 2.6;
        State.score += 40 * Math.min(State.combo, 10) * State.car.scoreMul;
        State.flash = Math.min(1, State.flash + 0.3);
        car.scored = true;
      }
    }
    car.prevRel = car.rel;
  }
}

// 같은 차선에서 앞차를 따라잡으면 속도를 맞추고, 겹치면 밀어낸다
function applyCarFollowing(dt) {
  for (const car of State.cars) {
    const lane = car.changeTimer > 0 ? car.targetLane : car.lane;
    let lead = null, bestGap = Infinity;
    for (const o of State.cars) {
      if (o === car) continue;
      const oLane = o.changeTimer > 0 ? o.targetLane : o.lane;
      if (oLane !== lane) continue;
      const gap = o.rel - car.rel;
      if (gap > 0 && gap < bestGap) { bestGap = gap; lead = o; }
    }
    if (!lead) {
      car.blocked = false;
      car.speed += (car.baseSpeed - car.speed) * Math.min(1, dt * 2);
      continue;
    }
    const minGap = (carL(car.type) + carL(lead.type)) / 2 * 1.25 + 80;
    if (bestGap < minGap * 1.7) {
      car.blocked = true;
      car.speed = Math.min(car.baseSpeed, lead.speed * 0.99);
      if (bestGap < minGap) car.rel = lead.rel - minGap;   // 겹침 방지
    } else {
      car.blocked = false;
      car.speed += (car.baseSpeed - car.speed) * Math.min(1, dt * 2);
    }
  }
}

function checkCollision() {
  const pW = carW(State.car) * CFG.hitX;
  const pL = carL(State.car) * CFG.hitY;
  for (const car of State.cars) {
    const dz = Math.abs(car.rel);
    if (dz > (pL + carL(car.type) * CFG.hitY) / 2) continue;
    const dx = Math.abs(car.offX - State.offsetX) * roadPxBase / 2;
    if (dx < (pW + carW(car.type) * CFG.hitX) / 2) return car;
  }
  return null;
}

// ---------------------------- 도로변 오브젝트 ------------------------
function updateObjects(sTop, sBot) {
  while (State.nextObjS < sTop + 300) {
    State.objects.push({
      s: State.nextObjS,
      side: Math.random() < 0.5 ? -1 : 1,
      kind: Util.randInt(0, 2),
      out: 0.04 + Math.random() * 0.17,   // 도로 가장자리에서 떨어진 정도(화면폭 비율)
      scale: 0.75 + Math.random() * 0.6,
    });
    State.nextObjS += 80 + Math.random() * 240;
  }
  if (State.objects.length && State.objects[0].s < sBot - 400) {
    State.objects = State.objects.filter((o) => o.s >= sBot - 400);
  }
}

// ---------------------------- 업데이트 ------------------------------
function updateScene(dt) {
  State.sceneTimer += dt;
  if (State.fade > 0) {
    State.fade = Math.min(1, State.fade + dt / CFG.sceneFade);
    if (State.fade >= 1) {
      State.biomeA = State.biomeB;
      State.fade = 0;
    }
  } else if (State.sceneTimer >= State.sceneHold) {
    State.sceneTimer = 0;
    State.sceneHold = Math.max(CFG.sceneMin, State.sceneHold * CFG.sceneDecay);
    let next = State.biomeA;
    while (next === State.biomeA) next = Util.randInt(0, BIOMES.length - 1);
    State.biomeB = next;
    State.fade = 0.001;
    HUD.sceneName.textContent = BIOMES[next].name;
    HUD.sceneName.classList.remove("pop");
    void HUD.sceneName.offsetWidth;
    HUD.sceneName.classList.add("pop");
  }
}

function step(dt) {
  State.elapsed += dt;

  // 브레이크 고장: 속도는 오직 올라가기만 한다
  State.speed = Math.min(CFG.maxSpeed, State.car.startSpeed + State.car.accel * CFG.baseAccel * State.elapsed);
  State.topSpeed = Math.max(State.topSpeed, State.speed);

  State.scroll += State.speed * H * CFG.scrollK * dt;
  State.distance += State.speed * dt / 3.6;

  // 차선 이동
  const target = laneCenter(State.targetLane);
  const step2 = State.car.handling * laneWidthFrac * dt;
  if (Math.abs(target - State.offsetX) <= step2) State.offsetX = target;
  else State.offsetX += Math.sign(target - State.offsetX) * step2;
  State.lane = Util.limit(Math.round((State.offsetX + 1) / laneWidthFrac - 0.5), 0, LANES - 1);

  // 커브 원심력 (그립이 낮은 차는 더 밀린다)
  const slope = curveSlope(State.scroll);
  const spd = State.speed / 200;
  State.offsetX -= slope * spd * spd * CFG.centrifugal * dt / State.car.grip;
  State.offsetX = Util.limit(State.offsetX, -1 + laneWidthFrac * 0.42, 1 - laneWidthFrac * 0.42);

  updateTraffic(dt);
  updateScene(dt);

  if (State.comboTimer > 0) {
    State.comboTimer -= dt;
    if (State.comboTimer <= 0) State.combo = 0;
  }
  State.score += State.speed * dt / 3.6 * State.car.scoreMul;

  if (checkCollision()) crash();
}

function crash() {
  State.mode = "crashed";
  State.shake = 1;
  State.crashTimer = 0;
  Sound.crash();
  const dist = Math.floor(State.distance);
  const score = Math.floor(State.score);
  const best = loadBest();
  if (dist > best.distance) best.distance = dist;
  if (score > best.score) best.score = score;
  saveBest(best);
  State.bestDistance = best.distance;
  State.bestScore = best.score;
  showGameOver(dist, score);
}

// ---------------------------- 렌더링 --------------------------------
function quad(x1, y1, x2, y2, x3, y3, x4, y4, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fill();
}

const ROW = 12;

function renderGroundAndRoad(pal, zoom) {
  const half = roadPxBase * zoom / 2;
  const shoulder = half * 0.055;

  ctx.fillStyle = pal.ground1;
  ctx.fillRect(0, 0, W, H);

  for (let y = -ROW; y < H + ROW; y += ROW) {
    const sA = State.scroll + (playerY - y) / zoom;
    const sB = State.scroll + (playerY - (y + ROW)) / zoom;
    const sMid = (sA + sB) / 2;
    const cA = W / 2 + curveX(sA);
    const cB = W / 2 + curveX(sB);

    // 지면 교차 밴드 (스크롤 감각)
    if (Math.floor(sMid / CFG.bandLen) % 2 === 0) {
      ctx.fillStyle = pal.ground2;
      ctx.fillRect(0, y, W, ROW + 1);
    }
    // 갓길
    quad(cA - half - shoulder, y, cA - half, y, cB - half, y + ROW, cB - half - shoulder, y + ROW, pal.shoulder);
    quad(cA + half, y, cA + half + shoulder, y, cB + half + shoulder, y + ROW, cB + half, y + ROW, pal.shoulder);
    // 노면
    quad(cA - half, y, cA + half, y, cB + half, y + ROW, cB - half, y + ROW,
      Math.floor(sMid / CFG.roadBandLen) % 2 === 0 ? pal.road1 : pal.road2);
  }
}

function renderRoadLines(pal, zoom) {
  const half = roadPxBase * zoom / 2;
  const sBot = State.scroll + (playerY - (H + 40)) / zoom;
  const sTop = State.scroll + (playerY + 40) / zoom;
  const lineW = Math.max(1.6, roadPxBase * zoom * 0.0055);
  const P = CFG.dashPeriod, D = CFG.dashLen;

  // 차선 점선
  ctx.fillStyle = pal.lane;
  for (let s = Math.floor(sBot / P) * P; s < sTop; s += P) {
    const y1 = yOf(s, zoom), y2 = yOf(s + D, zoom);
    const c1 = W / 2 + curveX(s), c2 = W / 2 + curveX(s + D);
    for (let i = 1; i < LANES; i++) {
      const off = (-1 + i * laneWidthFrac) * half;
      quad(c1 + off - lineW / 2, y1, c1 + off + lineW / 2, y1,
        c2 + off + lineW / 2, y2, c2 + off - lineW / 2, y2, pal.lane);
    }
  }

  // 양쪽 경계 스트립 (럼블)
  const RP = P * 0.55;
  for (let s = Math.floor(sBot / RP) * RP, k = 0; s < sTop; s += RP, k++) {
    const y1 = yOf(s, zoom), y2 = yOf(s + RP, zoom);
    const c1 = W / 2 + curveX(s), c2 = W / 2 + curveX(s + RP);
    const col = (Math.floor(s / RP) % 2 === 0) ? pal.rumble1 : pal.rumble2;
    const w = lineW * 1.5;
    quad(c1 - half - w, y1, c1 - half + w, y1, c2 - half + w, y2, c2 - half - w, y2, col);
    quad(c1 + half - w, y1, c1 + half + w, y1, c2 + half + w, y2, c2 + half - w, y2, col);
  }
}

function renderObjects(zoom, blurPx) {
  const biome = State.fade > 0.5 ? BIOMES[State.biomeB] : BIOMES[State.biomeA];
  const sprites = biome.objSprites;
  const half = roadPxBase * zoom / 2;
  for (const o of State.objects) {
    const y = yOf(o.s, zoom);
    if (y < -260 || y > H + 260) continue;
    const sp = sprites[o.kind % sprites.length];
    const w = sp.worldW * unit * zoom * o.scale;
    const h = w * (sp.cv.height / sp.cv.width);
    const x = W / 2 + curveX(o.s) + o.side * (half + o.out * W) - w / 2;
    // 속도에 따른 잔상
    if (blurPx > 6) {
      ctx.globalAlpha = 0.18;
      ctx.drawImage(sp.cv, x, y - h / 2 - blurPx * 0.5, w, h);
      ctx.globalAlpha = 0.09;
      ctx.drawImage(sp.cv, x, y - h / 2 - blurPx, w, h);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(sp.cv, x, y - h / 2, w, h);
  }
}

function drawCar(sprite, type, offX, rel, zoom, extraRot, ghost) {
  const half = roadPxBase * zoom / 2;
  const s = State.scroll + rel;
  const y = playerY - rel * zoom;
  const x = W / 2 + curveX(s) + offX * half;
  const w = carW(type) * zoom;
  const h = carL(type) * zoom;
  const rot = Math.atan2(curveSlope(s), 1) + extraRot;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (ghost > 2) {
    ctx.globalAlpha = 0.22;
    ctx.drawImage(sprite, -w / 2, -h / 2 - ghost * 0.6, w, h);
    ctx.globalAlpha = 1;
  }
  ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
  ctx.restore();
  return { x, y, w, h };
}

function renderCars(zoom, dt) {
  const relK = H * CFG.relK;
  for (const car of State.cars) {
    const y = playerY - car.rel * zoom;
    if (y < -220 || y > H + 220) continue;
    const drift = (car.speed - State.speed) * relK * zoom;   // 화면상 상대 이동(px/s)
    const rot = (car.changeTimer > 0 ? (car.targetLane < car.lane ? -0.12 : 0.12) : 0);
    const p = drawCar(car.sprite, car.type, car.offX, car.rel, zoom, rot, Math.abs(drift) * 0.05);

    // 차선 변경 깜빡이
    if (car.blink > 0 && Math.floor(car.blink * 8) % 2 === 0) {
      const dir = car.targetLane < car.lane ? -1 : 1;
      ctx.fillStyle = "#ffc400";
      ctx.beginPath();
      ctx.arc(p.x + dir * p.w * 0.6, p.y - p.h * 0.3, Math.max(2, p.w * 0.13), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function renderPlayer(zoom) {
  const steer = (laneCenter(State.targetLane) - State.offsetX) / laneWidthFrac;
  // 내 차 위치 표시 (탑다운에서 아군 식별)
  const half = roadPxBase * zoom / 2;
  const mx = W / 2 + curveX(State.scroll) + State.offsetX * half;
  const mr = carW(State.car) * zoom * 1.5;
  const mg = ctx.createRadialGradient(mx, playerY, mr * 0.35, mx, playerY, mr);
  mg.addColorStop(0, "rgba(94,242,255,0.42)");
  mg.addColorStop(1, "rgba(94,242,255,0)");
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(mx, playerY, mr, 0, Math.PI * 2);
  ctx.fill();
  const rot = -steer * 0.16 + (State.mode === "crashed" ? Math.sin(State.crashTimer * 9) * 0.25 : 0);
  const p = drawCar(State.car.sprite, State.car, State.offsetX, 0, zoom, rot, 0);

  // 진행 방향 표시(속도 잔상)
  ctx.fillStyle = `rgba(255,255,255,${0.05 + speedPct() * 0.10})`;
  ctx.fillRect(p.x - p.w * 0.42, p.y + p.h * 0.5, p.w * 0.84, 2);
}

const particles = [];
function initParticles() {
  particles.length = 0;
  for (let i = 0; i < 140; i++) {
    particles.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() * 1.3, r: 1 + Math.random() * 2.2 });
  }
}

function renderParticles(dt, pct) {
  const conf = (State.fade > 0.5 ? BIOMES[State.biomeB] : BIOMES[State.biomeA]).particle;
  ctx.fillStyle = conf.color;
  const n = Math.min(particles.length, conf.n);
  for (let i = 0; i < n; i++) {
    const p = particles[i];
    p.y += (0.5 + pct * 2.4) * p.s * dt;
    if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
    const len = p.r * (2 + pct * 26);
    ctx.fillRect(p.x * W, p.y * H, p.r, len);
  }
}

function renderSpeedLines(pct) {
  if (pct < 0.25) return;
  const a = (pct - 0.25) * 0.42;
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  const n = 16;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 997 % 1;
    const edge = i % 2 === 0 ? t * W * 0.16 : W - t * W * 0.16;
    const y = ((State.scroll * (1.6 + t) + i * 320) % (H + 400)) - 200;
    ctx.fillRect(edge, y, 2, 60 + pct * 220);
  }
}

function render(dt) {
  const pal = State.fade > 0
    ? blendPalette(BIOMES[State.biomeA], BIOMES[State.biomeB], State.fade)
    : BIOMES[State.biomeA];
  const zoom = zoomOf();
  const pct = speedPct();
  const scrollPx = State.speed * H * CFG.scrollK * zoom;   // 초당 화면 이동 px

  ctx.save();
  if (State.shake > 0.001) {
    const s = State.shake * 12;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }

  renderGroundAndRoad(pal, zoom);
  renderRoadLines(pal, zoom);

  const sBot = State.scroll + (playerY - (H + 40)) / zoom;
  const sTop = State.scroll + (playerY + 40) / zoom;
  updateObjects(sTop, sBot);
  renderObjects(zoom, scrollPx * 0.06);

  renderCars(zoom, dt);
  renderPlayer(zoom);

  renderSpeedLines(pct);
  renderParticles(dt, pct);

  // 씬 색보정
  ctx.fillStyle = pal.overlay;
  ctx.fillRect(0, 0, W, H);

  // 비네트 (속도가 높을수록 시야가 좁아진다)
  const vg = ctx.createRadialGradient(W / 2, playerY, H * (0.5 - pct * 0.2), W / 2, playerY, H * 0.95);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, `rgba(0,0,0,${0.32 + pct * 0.34})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  if (State.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${State.flash * 0.22})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (State.mode === "crashed") {
    ctx.fillStyle = `rgba(170,0,0,${0.24 + Math.sin(State.crashTimer * 12) * 0.08})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

// ---------------------------- 레이더 --------------------------------
// 화면 밖 먼 거리까지 보여줘서 미리 회피 경로를 잡을 수 있게 한다
const radar = document.getElementById("radar");
const rctx = radar.getContext("2d");
function renderRadar() {
  const RW = radar.width, RH = radar.height;
  rctx.clearRect(0, 0, RW, RH);
  rctx.fillStyle = "rgba(8,10,20,0.72)";
  rctx.fillRect(0, 0, RW, RH);
  const lw = RW / LANES;
  for (let i = 0; i < LANES; i++) {
    rctx.fillStyle = `rgba(255,${90 + i * 16},${90 + i * 16},0.10)`;
    rctx.fillRect(i * lw, 0, lw, RH);
    rctx.strokeStyle = "rgba(255,255,255,0.10)";
    rctx.strokeRect(i * lw, 0, lw, RH);
  }
  const pyRatio = BEHIND / (AHEAD + BEHIND);
  const py = RH * (1 - pyRatio);
  rctx.strokeStyle = "rgba(255,255,255,0.25)";
  rctx.beginPath();
  rctx.moveTo(0, py);
  rctx.lineTo(RW, py);
  rctx.stroke();

  for (const car of State.cars) {
    if (car.rel > AHEAD || car.rel < -BEHIND) continue;
    const y = RH * (1 - (car.rel + BEHIND) / (AHEAD + BEHIND));
    const cx = ((car.offX + 1) / 2) * RW;
    rctx.fillStyle = car.rel < 0 ? "#ffb347" : "#ff5a5a";
    const h = Math.max(3, carL(car.type) / 260 * 8);
    rctx.fillRect(cx - lw * 0.28, y - h / 2, lw * 0.56, h);
  }
  const px = ((State.offsetX + 1) / 2) * RW;
  rctx.fillStyle = "#5ef2ff";
  rctx.fillRect(px - lw * 0.3, py - 4, lw * 0.6, 8);
}

// ---------------------------- 사운드 --------------------------------
const Sound = {
  ctx: null, on: true, osc: null, gain: null, noiseGain: null, sub: null,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const master = this.ctx.createGain();
    master.gain.value = 0.0;
    master.connect(this.ctx.destination);
    this.master = master;

    this.osc = this.ctx.createOscillator();
    this.osc.type = "sawtooth";
    this.osc.frequency.value = 70;
    const filt = this.ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 700;
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0.16;
    this.osc.connect(filt).connect(this.gain).connect(master);
    this.osc.start();

    this.sub = this.ctx.createOscillator();
    this.sub.type = "square";
    this.sub.frequency.value = 35;
    const sg = this.ctx.createGain();
    sg.gain.value = 0.07;
    this.sub.connect(sg).connect(master);
    this.sub.start();

    // 바람 소리(노이즈)
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const nf = this.ctx.createBiquadFilter();
    nf.type = "bandpass";
    nf.frequency.value = 900;
    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0.0;
    src.connect(nf).connect(this.noiseGain).connect(master);
    src.start();
  },
  start() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();
    this.master.gain.setTargetAtTime(this.on ? 0.5 : 0, this.ctx.currentTime, 0.2);
  },
  stop() {
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
  },
  setSpeed(kmh) {
    if (!this.ctx || !this.osc) return;
    const t = this.ctx.currentTime;
    this.osc.frequency.setTargetAtTime(58 + kmh * 1.05, t, 0.08);
    this.sub.frequency.setTargetAtTime(28 + kmh * 0.24, t, 0.1);
    this.noiseGain.gain.setTargetAtTime(Math.min(0.14, (kmh - 90) / 900), t, 0.2);
  },
  crash() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.5);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.75);
    this.master.gain.setTargetAtTime(this.on ? 0.35 : 0, t, 0.1);
  },
  toggle() {
    this.on = !this.on;
    if (this.ctx) this.master.gain.setTargetAtTime(this.on && State.mode === "playing" ? 0.5 : 0, this.ctx.currentTime, 0.1);
    return this.on;
  },
};

// ---------------------------- 저장 ----------------------------------
const BEST_KEY = "brakefail_best_v1";
function loadBest() {
  try {
    return Object.assign({ distance: 0, score: 0 }, JSON.parse(localStorage.getItem(BEST_KEY) || "{}"));
  } catch (e) {
    return { distance: 0, score: 0 };
  }
}
function saveBest(b) {
  try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch (e) { /* 무시 */ }
}

// ---------------------------- HUD / 화면 ----------------------------
const HUD = {
  speed: document.getElementById("hud-speed"),
  distance: document.getElementById("hud-distance"),
  best: document.getElementById("hud-best"),
  lane: document.getElementById("hud-lane"),
  laneSpeed: document.getElementById("hud-lane-speed"),
  combo: document.getElementById("hud-combo"),
  sceneName: document.getElementById("scene-name"),
  warn: document.getElementById("warn"),
  brake: document.getElementById("brake-msg"),
  gauge: document.getElementById("gauge-fill"),
};

const menuEl = document.getElementById("menu");
const overEl = document.getElementById("gameover");
const carListEl = document.getElementById("car-list");

function buildMenu() {
  carListEl.innerHTML = "";
  CAR_TYPES.forEach((type) => {
    type.sprite = getCarSprite(type, type.colors.body);
    const el = document.createElement("button");
    el.className = "car-card" + (type === State.car ? " selected" : "");
    el.innerHTML = `
      <div class="car-thumb"></div>
      <div class="car-name">${type.name}<span class="tag">${type.tag}</span></div>
      <div class="car-desc">${type.desc}</div>
      <dl class="car-stats">
        ${statRow("시작", type.startSpeed + " km/h", (type.startSpeed - 80) / 50)}
        ${statRow("가속", type.accel.toFixed(2) + " km/h·s", type.accel / 2)}
        ${statRow("조향", type.handling.toFixed(1), type.handling / 4)}
        ${statRow("차폭", type.width + "", 1 - (type.width - 130) / 300)}
        ${statRow("배율", "x" + type.scoreMul.toFixed(2), (type.scoreMul - 1) / 1.1)}
      </dl>`;
    const c = makeCanvas(104, 104);
    const cc = c.getContext("2d");
    const sh = 96, sw = sh / type.topAspect;
    cc.drawImage(type.sprite, (104 - sw) / 2, 4, sw, sh);
    el.querySelector(".car-thumb").appendChild(c);
    el.addEventListener("click", () => {
      State.car = type;
      [...carListEl.children].forEach((n) => n.classList.remove("selected"));
      el.classList.add("selected");
    });
    carListEl.appendChild(el);
  });

  // 차선 속도 표
  document.getElementById("lane-table").innerHTML = LANE_SPEEDS.map((s, i) =>
    `<div class="lane-row"><b>${i + 1}차선</b><span class="bar"><i style="width:${(s / 200) * 100}%"></i></span><em>${s}</em></div>`
  ).join("");
}

function statRow(label, value, pct) {
  const p = Math.round(Util.limit(pct, 0.05, 1) * 100);
  return `<div class="stat"><dt>${label}</dt><dd><span style="width:${p}%"></span></dd><b>${value}</b></div>`;
}

function showGameOver(dist, score) {
  document.getElementById("over-distance").textContent = dist.toLocaleString() + " m";
  document.getElementById("over-score").textContent = score.toLocaleString();
  document.getElementById("over-top").textContent = Math.round(State.topSpeed) + " km/h";
  document.getElementById("over-near").textContent = State.nearMiss + " 회";
  document.getElementById("over-time").textContent = State.elapsed.toFixed(1) + " 초";
  document.getElementById("over-best").textContent =
    `${State.bestDistance.toLocaleString()} m / ${State.bestScore.toLocaleString()} 점`;
  setTimeout(() => overEl.classList.add("show"), 900);
}

function updateHUD() {
  HUD.speed.textContent = Math.round(State.speed);
  HUD.distance.textContent = Math.floor(State.distance).toLocaleString();
  HUD.best.textContent = State.bestDistance.toLocaleString();
  HUD.lane.textContent = State.lane + 1;
  HUD.laneSpeed.textContent = LANE_SPEEDS[State.lane];
  HUD.gauge.style.width = Util.limit((State.speed / CFG.maxSpeed) * 100, 0, 100) + "%";
  if (State.combo > 1) {
    HUD.combo.textContent = `아슬아슬 x${State.combo}`;
    HUD.combo.classList.add("show");
  } else {
    HUD.combo.classList.remove("show");
  }

  // 뒤에서 접근 중인 차량 경고
  let warn = false;
  for (const car of State.cars) {
    if (car.rel < -H * 0.2 && car.rel > -H * 0.8 && car.speed > State.speed + 2 &&
      Math.abs(car.offX - State.offsetX) < laneWidthFrac * 0.8) { warn = true; break; }
  }
  HUD.warn.classList.toggle("show", warn);
}

// ---------------------------- 입력 ----------------------------------
function moveLane(dir) {
  if (State.mode !== "playing") return;
  State.targetLane = Util.limit(State.targetLane + dir, 0, LANES - 1);
}

function brakeFail() {
  HUD.brake.classList.add("show");
  setTimeout(() => HUD.brake.classList.remove("show"), 1200);
}

window.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowLeft": case "a": case "A":
      moveLane(-1); e.preventDefault(); break;
    case "ArrowRight": case "d": case "D":
      moveLane(1); e.preventDefault(); break;
    case "ArrowDown": case "s": case "S": case " ":
      if (State.mode === "playing") brakeFail();
      e.preventDefault(); break;
    case "Enter":
      if (State.mode === "menu" || State.mode === "crashed") startGame();
      break;
    case "Escape":
      if (State.mode === "playing") toMenu();
      break;
  }
});

canvas.addEventListener("touchstart", (e) => {
  if (State.mode === "playing") {
    moveLane(e.touches[0].clientX < window.innerWidth / 2 ? -1 : 1);
  }
}, { passive: true });

document.getElementById("btn-left").addEventListener("click", () => moveLane(-1));
document.getElementById("btn-right").addEventListener("click", () => moveLane(1));
document.getElementById("btn-start").addEventListener("click", startGame);
document.getElementById("btn-retry").addEventListener("click", startGame);
document.getElementById("btn-menu").addEventListener("click", toMenu);
document.getElementById("btn-sound").addEventListener("click", (e) => {
  e.currentTarget.textContent = Sound.toggle() ? "🔊" : "🔇";
});

// ---------------------------- 게임 흐름 ------------------------------
function startGame() {
  const best = loadBest();
  State.bestDistance = best.distance;
  State.bestScore = best.score;
  State.mode = "playing";
  State.scroll = 0;
  State.elapsed = 0;
  State.distance = 0;
  State.score = 0;
  State.nearMiss = 0;
  State.combo = 0;
  State.comboTimer = 0;
  State.speed = State.car.startSpeed;
  State.topSpeed = State.car.startSpeed;
  State.lane = State.targetLane = 6;   // 7차선(흐름 100km/h)에서 출발
  State.offsetX = laneCenter(State.lane);
  State.shake = 0;
  State.crashTimer = 0;
  State.flash = 0;
  State.objects = [];
  State.nextObjS = -H;
  State.biomeA = Util.randInt(0, BIOMES.length - 1);
  State.biomeB = State.biomeA;
  State.fade = 0;
  State.sceneTimer = 0;
  State.sceneHold = CFG.sceneStart;
  State.car.sprite = getCarSprite(State.car, State.car.colors.body);
  resetTraffic();
  initParticles();
  menuEl.classList.remove("show");
  overEl.classList.remove("show");
  document.body.classList.add("playing");
  HUD.sceneName.textContent = BIOMES[State.biomeA].name;
  brakeFail();
  Sound.start();
}

function toMenu() {
  State.mode = "menu";
  menuEl.classList.add("show");
  overEl.classList.remove("show");
  document.body.classList.remove("playing");
  Sound.stop();
  const best = loadBest();
  document.getElementById("menu-best").textContent =
    `${best.distance.toLocaleString()} m / ${best.score.toLocaleString()} 점`;
}

// ---------------------------- 루프 ----------------------------------
let last = 0;
let acc = 0;
const FIXED = 1 / 120;

function frame(now) {
  requestAnimationFrame(frame);
  if (!last) last = now;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (State.mode === "playing") {
    acc += dt;
    let guard = 0;
    while (acc >= FIXED && guard++ < 12) {
      step(FIXED);
      acc -= FIXED;
      if (State.mode !== "playing") break;
    }
    applyCarFollowing(dt);
    Sound.setSpeed(State.speed);
    State.shake = Util.limit((State.speed - 220) / 500, 0, 1);
  } else if (State.mode === "crashed") {
    State.crashTimer += dt;
    State.shake = Math.max(0, State.shake - dt * 1.2);
  } else {
    // 메뉴에서도 배경이 천천히 흐른다
    State.scroll += 60 * dt;
  }

  State.flash = Math.max(0, State.flash - dt * 2.2);

  render(dt);
  if (State.mode !== "menu") {
    renderRadar();
    updateHUD();
  }
}

// ---------------------------- 시작 ----------------------------------
initScenery();
resize();
buildMenu();
initParticles();
State.car.sprite = getCarSprite(State.car, State.car.colors.body);
toMenu();
resetTraffic();
requestAnimationFrame(frame);
