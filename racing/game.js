// =====================================================================
// BRAKE FAILURE - 브레이크가 고장난 자동 가속 레이싱 (탑다운)
//  - 속도는 계속 올라가며 절대 줄지 않는다
//  - 9차선 직선 도로. 왼쪽 차선일수록 주행 차량이 빠르다
//  - 위에서 내려다보는 시점으로 회피에만 집중한다
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

  // 노면 스크롤은 속도에 정직하게 비례한다 (100km/h 당 이만큼)
  scrollK: 0.0032,        // × 화면높이 : 100km/h 에서의 초당 스크롤
  relK: 0.0014,           // × 화면높이 : 트래픽 상대 이동(회피 난이도)

  baseAccel: 4.0,         // 초당 가속(km/h) × 차량 accel 배율
  visRef: 800,            // 시각/청각 효과가 최대에 도달하는 기준 속도 (속도 자체는 무제한)
  zoomMin: 0.58,          // 고속일수록 축소해서 앞을 더 보여준다

  // 충돌 판정은 넉넉하게 (실제 그림보다 작은 히트박스)
  hitX: 0.60,
  hitY: 0.66,

  // 관리 범위가 넓어진 만큼 대수도 함께 늘려 화면상 밀도를 유지한다
  trafficMin: 45,
  trafficMax: 83,
  spawnMargin: 140,       // 화면 밖 이만큼(px) 더 나간 곳에서 생성한다

  aheadWin: 3.2,          // × 화면높이 : 트래픽 관리 범위(앞)
  behindWin: 1.2,         // × 화면높이 : 트래픽 관리 범위(뒤)

  // 눈이 피로하지 않게: 차선은 실선, 노면은 단색, 지면 밴드만 아주 길게
  bandLen: 700,           // 지면 교차 밴드 길이

};

// 배경은 하나로 고정한다. BIOMES 안의 다른 id 로 바꾸면 그 배경으로 달린다.
const SCENE_ID = "dawn";
let scene = null;

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
  car: CAR_TYPES[0],
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
  crashTimer: 0,
  flash: 0,
  bestDistance: 0, bestScore: 0,
};

// ---------------------------- 캔버스 --------------------------------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let W = 960, H = 540;
let playerY = 420;      // 플레이어 화면 y
let roadPxBase = 600;   // zoom 1 기준 도로 폭(px)
let unit = 0.15;        // 월드 단위 -> 기준 px
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
  AHEAD = H * CFG.aheadWin;
  BEHIND = H * CFG.behindWin;
}
window.addEventListener("resize", resize);

function speedPct() {
  return Util.limit((State.speed - 80) / (CFG.visRef - 80), 0, 1);
}
// 속도에 따른 축소율 (빠를수록 멀리 본다 = 고속에서도 피할 수 있다)
// 초반부터 시야를 확보하도록 제곱근 곡선을 쓰고, 기준 속도(800)에서 최소가 된다.
// 최고 속도가 없으므로 그 이후로도 아주 조금씩 계속 축소된다
function zoomOf() {
  const z = 1 - (1 - CFG.zoomMin) * Math.sqrt(speedPct());
  if (State.speed <= CFG.visRef) return z;
  return z * Math.max(0.72, Math.pow(CFG.visRef / State.speed, 0.3));
}
// 초당 노면 스크롤량(기준 px) - 속도에 정비례
function scrollRate(speed) {
  return H * CFG.scrollK * speed;
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
    if (c.lane !== lane) continue;
    if (Math.abs(c.rel - rel) < gap) return true;
  }
  return false;
}

// 차량이 가장 적은 차선을 고른다 (동수면 그중 무작위) - 차선별 밀도를 고르게 유지
function emptiestLane(ignore) {
  const counts = new Array(LANES).fill(0);
  for (const c of State.cars) {
    if (c === ignore) continue;
    counts[c.lane]++;
  }
  let min = Infinity;
  const best = [];
  for (let i = 0; i < LANES; i++) {
    if (counts[i] < min) { min = counts[i]; best.length = 0; best.push(i); }
    else if (counts[i] === min) best.push(i);
  }
  return best[Util.randInt(0, best.length - 1)];
}

function spawnCar(recycled, scatter) {
  const type = TRAFFIC_TYPES[Util.randInt(0, TRAFFIC_TYPES.length - 1)];
  const color = TRAFFIC_COLORS[Util.randInt(0, TRAFFIC_COLORS.length - 1)];
  const lane = emptiestLane(recycled);
  const speed = LANE_SPEEDS[lane] * Util.rand(0.95, 1.06);
  const ahead = speed < State.speed;   // 나보다 느리면 앞쪽에서 다가온다
  const len = carL(type);
  // 화면 위/아래 경계 바깥 (현재 축소율 기준) - 눈앞에서 갑자기 나타나지 않게
  const zoom = zoomOf();
  const offTop = (playerY + CFG.spawnMargin) / zoom;
  const offBottom = (H - playerY + CFG.spawnMargin) / zoom;
  let rel = 0;
  for (let tries = 0; tries < 14; tries++) {
    rel = scatter
      ? Util.rand(-BEHIND * 0.92, AHEAD * 0.92)
      : (ahead ? Util.rand(offTop, AHEAD) : -Util.rand(offBottom, BEHIND));
    if (!laneOccupied(lane, rel, len * 1.6 + 90, recycled)) break;
  }
  const car = recycled || {};
  car.type = type;
  car.sprite = getCarSprite(type, color);
  car.lane = lane;
  car.offX = laneCenter(lane);
  car.rel = rel;
  car.speed = speed;
  car.baseSpeed = speed;
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

function updateTraffic(dt) {
  const relK = H * CFG.relK;
  while (State.cars.length < trafficCount()) State.cars.push(spawnCar(null));

  for (const car of State.cars) {
    car.rel += (car.speed - State.speed) * relK * dt;

    // 관리 범위를 벗어난 차량 재활용
    if (car.rel > AHEAD * 1.15 || car.rel < -BEHIND * 1.15) {
      spawnCar(car);
      continue;
    }

    // 스쳐 지나가는 순간: 바람소리 + 아슬아슬 판정
    if (!car.scored && Math.sign(car.rel) !== Math.sign(car.prevRel)) {
      const gapPx = Math.abs(car.offX - State.offsetX) * roadPxBase / 2;
      const near = (carW(car.type) + carW(State.car)) / 2;
      if (gapPx < near * 5) {
        Sound.whoosh((car.offX - State.offsetX) * 2, Util.limit(1 - gapPx / (near * 5), 0.15, 1)
          * Util.limit(Math.abs(car.speed - State.speed) / 120, 0.2, 1));
      }
      if (gapPx < near * 2.1) {
        State.nearMiss++;
        State.combo++;
        State.comboTimer = 2.6;
        State.score += 40 * Math.min(State.combo, 10) * State.car.scoreMul;
        State.flash = Math.min(1, State.flash + 0.3);
        Sound.blip(Math.min(State.combo, 8));
        car.scored = true;
      }
    }
    car.prevRel = car.rel;
  }
}

// 같은 차선에서 앞차를 따라잡으면 속도를 맞추고, 겹치면 밀어낸다
function applyCarFollowing(dt) {
  for (const car of State.cars) {
    let lead = null, bestGap = Infinity;
    for (const o of State.cars) {
      if (o === car || o.lane !== car.lane) continue;
      const gap = o.rel - car.rel;
      if (gap > 0 && gap < bestGap) { bestGap = gap; lead = o; }
    }
    const minGap = lead ? (carL(car.type) + carL(lead.type)) / 2 * 1.25 + 80 : 0;
    if (lead && bestGap < minGap * 1.7) {
      car.speed = Math.min(car.baseSpeed, lead.speed * 0.99);
      if (bestGap < minGap) car.rel = lead.rel - minGap;   // 겹침 방지
    } else {
      car.speed += (car.baseSpeed - car.speed) * Math.min(1, dt * 2);
    }
  }
}

function checkCollision() {
  const pW = carW(State.car) * CFG.hitX;
  const pL = carL(State.car) * CFG.hitY;
  for (const car of State.cars) {
    if (Math.abs(car.rel) > (pL + carL(car.type) * CFG.hitY) / 2) continue;
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
    State.nextObjS += 60 + Math.random() * 200;
  }
  if (State.objects.length && State.objects[0].s < sBot - 400) {
    State.objects = State.objects.filter((o) => o.s >= sBot - 400);
  }
}

// ---------------------------- 업데이트 ------------------------------
function step(dt) {
  State.elapsed += dt;

  // 브레이크 고장: 속도는 오직 올라가기만 한다 (상한 없음)
  State.speed = State.car.startSpeed + State.car.accel * CFG.baseAccel * State.elapsed;
  State.topSpeed = Math.max(State.topSpeed, State.speed);

  State.scroll += scrollRate(State.speed) * dt;
  State.distance += State.speed * dt / 3.6;

  // 차선 이동
  const target = laneCenter(State.targetLane);
  const stepX = State.car.handling * laneWidthFrac * dt;
  if (Math.abs(target - State.offsetX) <= stepX) State.offsetX = target;
  else State.offsetX += Math.sign(target - State.offsetX) * stepX;
  State.lane = Util.limit(Math.round((State.offsetX + 1) / laneWidthFrac - 0.5), 0, LANES - 1);

  updateTraffic(dt);

  if (State.comboTimer > 0) {
    State.comboTimer -= dt;
    if (State.comboTimer <= 0) State.combo = 0;
  }
  State.score += State.speed * dt / 3.6 * State.car.scoreMul;

  if (checkCollision()) crash();
}

function crash() {
  State.mode = "crashed";
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
const ROW = 14;

function renderGroundAndRoad(pal, zoom) {
  const bandLen = CFG.bandLen * (1 + speedPct() * 0.9);   // 고속에선 더 길게
  const half = roadPxBase * zoom / 2;
  const left = W / 2 - half, right = W / 2 + half;
  const shoulder = half * 0.055;

  ctx.fillStyle = pal.ground1;
  ctx.fillRect(0, 0, W, H);

  // 지면 교차 밴드 (스크롤 감각의 핵심)
  const bandPx = bandLen * zoom;
  const sBot = State.scroll + (playerY - H) / zoom;
  const bandP2 = bandLen * 2;
  ctx.fillStyle = pal.ground2;
  for (let s = Math.floor(sBot / bandP2) * bandP2; yOf(s, zoom) > -bandPx; s += bandP2) {
    const y = yOf(s, zoom);
    ctx.fillRect(0, y - bandPx, W, bandPx);
  }

  // 갓길
  ctx.fillStyle = pal.shoulder;
  ctx.fillRect(left - shoulder, 0, shoulder, H);
  ctx.fillRect(right, 0, shoulder, H);

  // 노면 (단색)
  ctx.fillStyle = pal.road1;
  ctx.fillRect(left, 0, half * 2, H);
}

function renderRoadLines(pal, zoom) {
  const half = roadPxBase * zoom / 2;
  const left = W / 2 - half, right = W / 2 + half;
  const lineW = Math.max(1.6, roadPxBase * zoom * 0.0055);

  // 차선: 끊김 없는 실선 (깜빡임 없음)
  ctx.fillStyle = pal.lane;
  for (let i = 1; i < LANES; i++) {
    ctx.fillRect(left + (i / LANES) * half * 2 - lineW / 2, 0, lineW, H);
  }

  // 도로 경계: 안쪽 흰 실선 + 갓길 색 스트립
  const w = lineW * 1.7;
  ctx.fillStyle = pal.rumble2;
  ctx.fillRect(left, 0, w, H);
  ctx.fillRect(right - w, 0, w, H);
  ctx.fillStyle = pal.rumble1;
  ctx.fillRect(left - w * 2.1, 0, w * 1.4, H);
  ctx.fillRect(right + w * 0.7, 0, w * 1.4, H);
}

// 고속에서 노면 위로 흐르는 속도선
function renderRoadStreaks(zoom, pct) {
  if (pct < 0.2) return;
  const half = roadPxBase * zoom / 2;
  ctx.fillStyle = `rgba(255,255,255,${(pct - 0.2) * 0.16})`;
  const n = 16;
  const len = 120 + pct * 420;
  for (let i = 0; i < n; i++) {
    const seed = (i * 9301 + 49297) % 233280 / 233280;
    const x = W / 2 - half + seed * half * 2;
    const y = ((State.scroll * 1.15 + i * 337) % (H + len + 200)) - len - 100;
    ctx.fillRect(x, y, 2, len);
  }
}

function renderObjects(zoom, blurPx) {
  const sprites = scene.objSprites;
  const half = roadPxBase * zoom / 2;
  // 갓길 바깥으로 이만큼 떨어진 지점부터 그린다 (스프라이트의 안쪽 끝 기준)
  const keepOut = half + half * 0.055 + 10;
  for (const o of State.objects) {
    const y = yOf(o.s, zoom);
    if (y < -260 || y > H + 260) continue;
    const sp = sprites[o.kind % sprites.length];
    const w = sp.worldW * unit * zoom * o.scale;
    const h = w * (sp.cv.height / sp.cv.width);
    // 안쪽 끝을 keepOut 밖에 고정하고, 남는 공간 안에서만 더 밀어낸다.
    // 폭이 커서 공간이 부족하면 화면 밖으로 넘기고 도로는 건드리지 않는다
    const room = Math.max(keepOut, W / 2 - w);
    const off = Util.limit(keepOut + o.out * W, keepOut, room);
    const x = o.side < 0 ? W / 2 - off - w : W / 2 + off;
    if (blurPx > 10) {
      ctx.globalAlpha = 0.14;
      ctx.drawImage(sp.cv, x, y - h / 2 - blurPx * 0.4, w, h);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(sp.cv, x, y - h / 2, w, h);
  }
}

function drawCar(sprite, type, offX, rel, zoom, rot) {
  const half = roadPxBase * zoom / 2;
  const y = playerY - rel * zoom;
  const x = W / 2 + offX * half;
  const w = carW(type) * zoom;
  const h = carL(type) * zoom;

  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
  ctx.restore();
  return { x, y, w, h };
}

function renderCars(zoom) {
  for (const car of State.cars) {
    const y = playerY - car.rel * zoom;
    if (y < -220 || y > H + 220) continue;
    drawCar(car.sprite, car.type, car.offX, car.rel, zoom, 0);
  }
}

function renderPlayer(zoom) {
  const steer = (laneCenter(State.targetLane) - State.offsetX) / laneWidthFrac;
  // 내 차 위치 표시 (탑다운에서 아군 식별)
  const half = roadPxBase * zoom / 2;
  const mx = W / 2 + State.offsetX * half;
  const mr = carW(State.car) * zoom * 1.5;
  const mg = ctx.createRadialGradient(mx, playerY, mr * 0.35, mx, playerY, mr);
  mg.addColorStop(0, "rgba(94,242,255,0.42)");
  mg.addColorStop(1, "rgba(94,242,255,0)");
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(mx, playerY, mr, 0, Math.PI * 2);
  ctx.fill();

  const rot = -steer * 0.16 + (State.mode === "crashed" ? Math.sin(State.crashTimer * 9) * 0.25 : 0);
  const p = drawCar(State.car.sprite, State.car, State.offsetX, 0, zoom, rot);
  ctx.fillStyle = `rgba(255,255,255,${0.05 + speedPct() * 0.10})`;
  ctx.fillRect(p.x - p.w * 0.42, p.y + p.h * 0.5, p.w * 0.84, 2);
}

function renderSpeedLines(pct) {
  if (pct < 0.18) return;
  const a = (pct - 0.18) * 0.26;
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  const n = 18;
  for (let i = 0; i < n; i++) {
    const t = ((i * 37) % 100) / 100;
    const x = i % 2 === 0 ? t * W * 0.14 : W - t * W * 0.14;
    const len = 60 + pct * pct * 190;
    const y = ((State.scroll * 1.5 + i * 311) % (H + len + 200)) - len - 100;
    ctx.fillRect(x, y, 2.5, len);
  }
}

function render(dt) {
  const pal = scene;
  const zoom = zoomOf();
  const pct = speedPct();
  const scrollPx = scrollRate(State.speed) * zoom;   // 초당 화면 이동 px

  ctx.save();
  renderGroundAndRoad(pal, zoom);
  renderRoadLines(pal, zoom);
  renderRoadStreaks(zoom, pct);

  const sBot = State.scroll + (playerY - (H + 40)) / zoom;
  const sTop = State.scroll + (playerY + 40) / zoom;
  updateObjects(sTop, sBot);
  renderObjects(zoom, scrollPx * 0.05);

  renderCars(zoom);
  renderPlayer(zoom);

  renderSpeedLines(pct);

  // 씬 색보정
  ctx.fillStyle = pal.overlay;
  ctx.fillRect(0, 0, W, H);

  // 비네트 (속도가 높을수록 시야가 좁아진다)
  const vg = ctx.createRadialGradient(W / 2, playerY, H * (0.52 - pct * 0.3), W / 2, playerY, H * 0.95);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, `rgba(0,0,0,${0.3 + pct * 0.45})`);
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
  const py = RH * (1 - BEHIND / (AHEAD + BEHIND));
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
  rctx.fillStyle = "#5ef2ff";
  rctx.fillRect(((State.offsetX + 1) / 2) * RW - lw * 0.3, py - 4, lw * 0.6, 8);
}

// ---------------------------- 사운드 --------------------------------
// 엔진음 없이 배경음(신스 루프)과 효과음(추월 / 콤보 / 충돌)만 사용한다
const BPM = 132;
const STEP = 60 / BPM / 4;      // 16분음표 길이(초)
const STEPS = 64;               // 4마디 루프
// A 마이너 진행: Am - F - C - G (A4 = 0 기준 반음 오프셋)
const CHORDS = [
  { bass: -24, arp: [0, 3, 7, 12] },
  { bass: -28, arp: [0, 4, 7, 12] },
  { bass: -21, arp: [0, 4, 7, 12] },
  { bass: -26, arp: [0, 4, 7, 12] },
];
const BASS_STEPS = [0, 3, 6, 8, 11, 14];
const pitch = (n) => 440 * Math.pow(2, n / 12);

const Sound = {
  ctx: null, on: true, ready: false, playing: false,
  step: 0, nextNote: 0, intensity: 0, lastWhoosh: 0,

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    this.ctx = ac;

    const master = ac.createGain();
    master.gain.value = 0;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    master.connect(comp).connect(ac.destination);
    this.master = master;

    this.music = ac.createGain();
    this.music.gain.value = 0.55;
    this.music.connect(master);

    this.sfx = ac.createGain();
    this.sfx.gain.value = 0.9;
    this.sfx.connect(master);

    // 아주 작은 엔진 험: 속도에 따라 음높이만 조금 올라간다
    this.engine = ac.createGain();
    this.engine.gain.value = 0;
    const elp = ac.createBiquadFilter();
    elp.type = "lowpass";
    elp.frequency.value = 220;
    elp.connect(this.engine);
    this.engine.connect(master);
    this.engineOsc = [];
    [["sawtooth", 0.6, 1], ["sine", 0.5, 0.5]].forEach(([type, gain, mul]) => {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = 44 * mul;
      const g = ac.createGain();
      g.gain.value = gain;
      o.connect(g).connect(elp);
      o.start();
      this.engineOsc.push({ o, mul });
    });

    // 퍼커션/효과음용 노이즈
    const len = ac.sampleRate * 2;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;

    this.ready = true;
  },

  start() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();
    this.playing = true;
    this.step = 0;
    this.nextNote = this.ctx.currentTime + 0.12;
    this.music.gain.setTargetAtTime(0.55, this.ctx.currentTime, 0.2);
    this.master.gain.setTargetAtTime(this.on ? 0.6 : 0, this.ctx.currentTime, 0.2);
  },

  stop() {
    this.playing = false;
    if (!this.ctx) return;
    this.engine.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
  },

  // 속도가 오르면 배경음의 필터/리듬과 엔진 험의 음높이가 조금 변한다
  update(speed, pct) {
    this.intensity = pct;
    if (!this.ready || !this.playing) return;
    const t = this.ctx.currentTime;
    for (const { o, mul } of this.engineOsc) {
      o.frequency.setTargetAtTime((40 + speed * 0.05) * mul, t, 0.12);
    }
    this.engine.gain.setTargetAtTime(0.05 + pct * 0.025, t, 0.3);
    if (this.nextNote < t) this.nextNote = t + 0.05;   // 탭 전환 등으로 밀렸을 때 재동기
    while (this.nextNote < t + 0.15) {
      this.scheduleStep(this.step, this.nextNote);
      this.nextNote += STEP;
      this.step = (this.step + 1) % STEPS;
    }
  },

  scheduleStep(i, t) {
    const chord = CHORDS[Math.floor(i / 16) % CHORDS.length];
    const beat = i % 16;
    const k = this.intensity;

    if (beat % 4 === 0) this.kick(t);
    if (beat % 4 === 2) this.snare(t);
    if (beat % 2 === 1 || k > 0.5) this.hat(t, beat % 4 === 3);
    if (BASS_STEPS.includes(beat)) this.bass(t, chord.bass);
    this.arp(t, chord.bass + 24 + chord.arp[i % chord.arp.length]);
    if (k > 0.35 && beat % 2 === 0) this.arp(t, chord.bass + 36 + chord.arp[(i + 2) % chord.arp.length], 0.5);
  },

  kick(t) {
    const ac = this.ctx;
    const o = ac.createOscillator();
    o.frequency.setValueAtTime(135, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g).connect(this.music);
    o.start(t);
    o.stop(t + 0.18);
  },

  hat(t, open) {
    const ac = this.ctx;
    const src = ac.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 7000;
    const g = ac.createGain();
    const dur = open ? 0.09 : 0.035;
    g.gain.setValueAtTime(0.09 + this.intensity * 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    src.connect(f).connect(g).connect(this.music);
    src.start(t);
    src.stop(t + dur + 0.02);
  },

  snare(t) {
    const ac = this.ctx;
    const src = ac.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1900;
    f.Q.value = 0.8;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.1);
    src.connect(f).connect(g).connect(this.music);
    src.start(t);
    src.stop(t + 0.12);
  },

  bass(t, note) {
    const ac = this.ctx;
    const o = ac.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = pitch(note);
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 380 + this.intensity * 520;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.19);
    o.connect(f).connect(g).connect(this.music);
    o.start(t);
    o.stop(t + 0.22);
  },

  arp(t, note, mul) {
    const ac = this.ctx;
    const o = ac.createOscillator();
    o.type = "square";
    o.frequency.value = pitch(note);
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1100 + this.intensity * 3200;
    const g = ac.createGain();
    const peak = 0.075 * (mul || 1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.13);
    o.connect(f).connect(g).connect(this.music);
    o.start(t);
    o.stop(t + 0.15);
  },

  // 옆을 스쳐 지나갈 때 바람 소리
  whoosh(pan, power) {
    if (!this.ready || !this.on || this.ctx.currentTime - this.lastWhoosh < 0.07) return;
    this.lastWhoosh = this.ctx.currentTime;
    const ac = this.ctx, t = ac.currentTime, dur = 0.3;
    const src = ac.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 1.4;
    f.frequency.setValueAtTime(2400, t);
    f.frequency.exponentialRampToValueAtTime(420, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3 * power, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = g;
    if (ac.createStereoPanner) {
      const pn = ac.createStereoPanner();
      pn.pan.value = Util.limit(pan, -1, 1);
      g.connect(pn);
      node = pn;
    }
    src.connect(f).connect(g);
    node.connect(this.sfx);
    src.start(t);
    src.stop(t + dur + 0.05);
  },

  // 아슬아슬 통과 콤보 알림
  blip(combo) {
    if (!this.ready || !this.on) return;
    const ac = this.ctx, t = ac.currentTime;
    const o = ac.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(760 + combo * 90, t);
    o.frequency.exponentialRampToValueAtTime(1180 + combo * 110, t + 0.09);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + 0.18);
  },

  crash() {
    if (!this.ready) return;
    const ac = this.ctx, t = ac.currentTime;
    this.playing = false;

    const src = ac.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(4200, t);
    f.frequency.exponentialRampToValueAtTime(180, t + 0.8);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.75, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t);
    src.stop(t + 0.95);

    const o = ac.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.55);
    const og = ac.createGain();
    og.gain.setValueAtTime(0.4, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(og).connect(this.sfx);
    o.start(t);
    o.stop(t + 0.75);

    this.music.gain.setTargetAtTime(0, t, 0.2);   // 배경음과 엔진 험은 끊는다
    this.engine.gain.setTargetAtTime(0, t, 0.15);
  },

  toggle() {
    this.on = !this.on;
    if (this.ctx) {
      this.master.gain.setTargetAtTime(
        this.on && State.mode === "playing" ? 0.6 : 0, this.ctx.currentTime, 0.1);
    }
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
    const accel = type.accel * CFG.baseAccel;
    el.innerHTML = `
      <div class="car-thumb"></div>
      <div class="car-name">${type.name}<span class="tag">${type.tag}</span></div>
      <div class="car-desc">${type.desc}</div>
      <dl class="car-stats">
        ${statRow("시작", type.startSpeed + " km/h", (type.startSpeed - 80) / 50)}
        ${statRow("가속", "+" + accel.toFixed(1) + " km/h·s", accel / 8)}
        ${statRow("조향", type.handling.toFixed(1), type.handling / 4)}
        ${statRow("차폭", type.width + "", 1 - (type.width - 130) / 300)}
        ${statRow("배율", "x" + type.scoreMul.toFixed(2), (type.scoreMul - 0.9) / 0.8)}
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
  HUD.gauge.style.width = Util.limit((State.speed / CFG.visRef) * 100, 0, 100) + "%";
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
  State.crashTimer = 0;
  State.flash = 0;
  State.objects = [];
  State.nextObjS = -H;
  State.car.sprite = getCarSprite(State.car, State.car.colors.body);
  resetTraffic();
  menuEl.classList.remove("show");
  overEl.classList.remove("show");
  document.body.classList.add("playing");
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
    Sound.update(State.speed, speedPct());
  } else if (State.mode === "crashed") {
    State.crashTimer += dt;
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
scene = BIOMES.find((b) => b.id === SCENE_ID) || BIOMES[0];
HUD.sceneName.textContent = scene.name;
resize();
buildMenu();
State.car.sprite = getCarSprite(State.car, State.car.colors.body);
toMenu();
resetTraffic();
requestAnimationFrame(frame);
