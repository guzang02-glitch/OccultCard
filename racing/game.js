// =====================================================================
// BRAKE FAILURE - 브레이크가 고장난 자동 가속 레이싱
//  - 속도는 초당 +1km/h 로 계속 올라가며 절대 줄지 않는다
//  - 9차선 도로. 왼쪽 차선일수록 주행 차량이 빠르다
//  - 차량을 피해 최대한 멀리
// =====================================================================

// ---------------------------- 설정 ----------------------------------
const LANES = 9;
// 1차선(왼쪽) ~ 9차선(오른쪽) 주행 속도(km/h)
const LANE_SPEEDS = [200, 180, 160, 145, 130, 115, 100, 85, 70];

const CFG = {
  segmentLength: 200,
  rumbleLength: 3,
  roadWidth: 2000,      // 도로 반폭(월드 단위) -> 전체 4000, 차선폭 444
  drawDistance: 240,
  cameraHeight: 1600,
  fieldOfView: 100,
  fogDensity: 4,
  unitsPerKmh: 58,      // km/h -> 월드 단위/초
  maxSpeed: 420,
  baseAccel: 1.0,       // 초당 +1 km/h (차량 accel 배율 적용)
  centrifugal: 0.02,
  camFollow: 0.6,       // 카메라 좌우 추종 비율(1이면 항상 차가 화면 중앙)
  laneChangeProb: 0.055,  // 트래픽 차량의 초당 차선변경 확률
  laneChangeProbMax: 0.16,
  trafficMin: 30,
  trafficMax: 64,
  sceneStart: 22,       // 첫 씬 유지 시간(초)
  sceneMin: 7,          // 최소 씬 유지 시간(초)
  sceneDecay: 0.9,      // 씬이 바뀔 때마다 유지 시간 x 0.9
  sceneFade: 1.6,
  windowAhead: 62000,
  windowBehind: 18000,
};

const Util = {
  limit: (v, lo, hi) => Math.max(lo, Math.min(v, hi)),
  interpolate: (a, b, p) => a + (b - a) * p,
  percentRemaining: (n, total) => (n % total) / total,
  easeIn: (a, b, p) => a + (b - a) * Math.pow(p, 2),
  easeInOut: (a, b, p) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5),
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  exponentialFog: (d, density) => 1 / Math.pow(Math.E, d * d * density),
};

const laneWidthFrac = 2 / LANES;
const laneCenter = (lane) => -1 + (lane + 0.5) * laneWidthFrac;

// ---------------------------- 트랙 ----------------------------------
let segments = [];
let trackLength = 0;

const ROAD = {
  LENGTH: { SHORT: 25, MEDIUM: 50, LONG: 100 },
  CURVE: { EASY: 2, MEDIUM: 4, HARD: 5.5 },
  HILL: { LOW: 20, MEDIUM: 40, HIGH: 60 },
};

function lastY() {
  return segments.length === 0 ? 0 : segments[segments.length - 1].p2.world.y;
}

function addSegment(curve, y) {
  const n = segments.length;
  segments.push({
    index: n,
    p1: { world: { y: lastY(), z: n * CFG.segmentLength }, camera: {}, screen: {} },
    p2: { world: { y: y, z: (n + 1) * CFG.segmentLength }, camera: {}, screen: {} },
    curve: curve,
    objects: [],
    cars: [],
    dark: Math.floor(n / CFG.rumbleLength) % 2 === 0,
  });
}

function addRoad(enter, hold, leave, curve, y) {
  const startY = lastY();
  const endY = startY + y * CFG.segmentLength / 2;
  const total = enter + hold + leave;
  for (let i = 0; i < enter; i++) addSegment(Util.easeIn(0, curve, i / enter), Util.easeInOut(startY, endY, i / total));
  for (let i = 0; i < hold; i++) addSegment(curve, Util.easeInOut(startY, endY, (enter + i) / total));
  for (let i = 0; i < leave; i++) addSegment(Util.easeInOut(curve, 0, i / leave), Util.easeInOut(startY, endY, (enter + hold + i) / total));
}

function buildTrack() {
  segments = [];
  addRoad(40, 60, 40, 0, 0); // 출발 직선
  const L = [ROAD.LENGTH.SHORT, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.LONG];
  const C = [ROAD.CURVE.EASY, ROAD.CURVE.MEDIUM, ROAD.CURVE.HARD];
  const H = [0, ROAD.HILL.LOW, ROAD.HILL.MEDIUM, ROAD.HILL.HIGH];
  for (let i = 0; i < 46; i++) {
    const len = L[Util.randInt(0, 2)];
    const curve = Math.random() < 0.42 ? 0 : C[Util.randInt(0, 2)] * (Math.random() < 0.5 ? -1 : 1);
    const hill = H[Util.randInt(0, 3)] * (Math.random() < 0.5 ? -1 : 1);
    addRoad(len / 2, len, len / 2, curve, hill);
  }
  addRoad(60, 60, 60, 0, -lastY() / (CFG.segmentLength / 2) / 180); // 마지막에 고도 복귀

  // 도로변 오브젝트 배치 (씬에 따라 실제 그림은 바뀐다)
  for (let n = 20; n < segments.length; n++) {
    if (Math.random() < 0.42) {
      const side = Math.random() < 0.5 ? -1 : 1;
      segments[n].objects.push({
        offset: side * (1.25 + Math.random() * 1.9),
        kind: Math.random() < 0.82 ? Util.randInt(0, 1) : 2,
        scale: 0.75 + Math.random() * 0.6,
      });
    }
    if (n % 260 === 0) {
      segments[n].objects.push({ offset: 1.16, kind: 2, scale: 0.8 });
      segments[n].objects.push({ offset: -1.16, kind: 2, scale: 0.8 });
    }
  }
  trackLength = segments.length * CFG.segmentLength;
}

function findSegment(z) {
  return segments[Math.floor(z / CFG.segmentLength) % segments.length];
}

// 트랙이 순환하므로 상대 거리는 wrap 처리한다
function relZ(z, from) {
  let d = (z - from) % trackLength;
  if (d > trackLength / 2) d -= trackLength;
  if (d < -trackLength / 2) d += trackLength;
  return d;
}

// ---------------------------- 상태 ----------------------------------
const State = {
  mode: "menu", // menu | playing | crashed
  car: CAR_TYPES[1],
  position: 0,
  speed: 100,
  topSpeed: 100,
  offsetX: 0,
  lane: 4,
  targetLane: 4,
  elapsed: 0,
  distance: 0,
  nearMiss: 0,
  combo: 0,
  comboTimer: 0,
  score: 0,
  cars: [],
  shake: 0,
  crashTimer: 0,
  brakeMsg: 0,
  flash: 0,
  // 씬
  biomeA: 0, biomeB: 1, fade: 0, sceneTimer: 0, sceneHold: CFG.sceneStart,
  bgFar: 0, bgNear: 0,
  bestDistance: 0, bestScore: 0,
};

// ---------------------------- 캔버스 --------------------------------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let W = 960, H = 540;
let horizonY = 270; // 지평선 y (세로 화면에서는 위로 올려 도로를 더 보여준다)
let cameraDepth = 1 / Math.tan((CFG.fieldOfView / 2) * Math.PI / 180);
let playerZ = CFG.cameraHeight * cameraDepth;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  W = Math.max(320, Math.round(rect.width));
  H = Math.max(240, Math.round(rect.height));
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  horizonY = Math.round(H * (W / H < 0.95 ? 0.40 : 0.5));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);

// ---------------------------- 트래픽 --------------------------------
function trafficCount() {
  return Math.round(Util.limit(CFG.trafficMin + State.elapsed / 5, CFG.trafficMin, CFG.trafficMax));
}

function laneOccupied(lane, z, gap, ignore) {
  for (const c of State.cars) {
    if (c === ignore) continue;
    if (c.lane !== lane && c.targetLane !== lane) continue;
    if (Math.abs(relZ(c.z, z)) < gap) return true;
  }
  return false;
}

function spawnCar(recycled) {
  const type = TRAFFIC_TYPES[Util.randInt(0, TRAFFIC_TYPES.length - 1)];
  const color = TRAFFIC_COLORS[Util.randInt(0, TRAFFIC_COLORS.length - 1)];
  // 느린 차선일수록 트래픽이 조금 더 많다
  let lane;
  for (let tries = 0; tries < 8; tries++) {
    lane = Util.randInt(0, LANES - 1);
    if (Math.random() < 0.35 + (lane / LANES) * 0.5) break;
  }
  const speed = LANE_SPEEDS[lane] * Util.rand(0.95, 1.06);
  const ahead = speed < State.speed + 4;
  let z;
  for (let tries = 0; tries < 12; tries++) {
    z = State.position + playerZ + (ahead
      ? Util.rand(CFG.windowAhead * 0.32, CFG.windowAhead)
      : Util.rand(-CFG.windowBehind, -CFG.windowBehind * 0.55));
    z = ((z % trackLength) + trackLength) % trackLength;
    if (!laneOccupied(lane, z, type.length * 4 + 1200, recycled)) break;
  }
  const car = recycled || {};
  car.type = type;
  car.color = color;
  car.sprite = getCarSprite(type, color);
  car.lane = lane;
  car.targetLane = lane;
  car.offsetX = laneCenter(lane);
  car.z = z;
  car.speed = speed;
  car.changeTimer = 0;
  car.blink = 0;
  car.prevRel = relZ(z, State.position + playerZ);
  car.scored = false;
  return car;
}

function resetTraffic() {
  State.cars = [];
  for (let i = 0; i < trafficCount(); i++) State.cars.push(spawnCar(null));
  // 출발 직후 정면 충돌 방지: 앞쪽 가까운 차량은 밀어낸다
  for (const c of State.cars) {
    const d = relZ(c.z, State.position + playerZ);
    if (d > -4000 && d < 16000) c.z = ((c.z + 22000) % trackLength + trackLength) % trackLength;
  }
}

function tryLaneChange(car) {
  const dir = Math.random() < 0.5 ? -1 : 1;
  const target = car.lane + dir;
  if (target < 0 || target >= LANES) return;
  const gap = car.type.length * 3.2 + 900;
  if (laneOccupied(target, car.z, gap, car)) return;
  car.targetLane = target;
  car.changeTimer = 0.85;
  car.blink = 0.85;
  // 차선을 옮기면 그 차선의 흐름 속도에 맞춰 간다
  car.speed = LANE_SPEEDS[target] * Util.rand(0.95, 1.06);
}

function updateTraffic(dt) {
  const laneProb = Util.limit(CFG.laneChangeProb + State.elapsed * 0.0008, 0, CFG.laneChangeProbMax);
  const need = trafficCount();
  while (State.cars.length < need) State.cars.push(spawnCar(null));

  const pz = State.position + playerZ;
  for (const car of State.cars) {
    car.z = (car.z + car.speed * CFG.unitsPerKmh * dt) % trackLength;
    if (car.z < 0) car.z += trackLength;

    if (car.changeTimer > 0) {
      car.changeTimer = Math.max(0, car.changeTimer - dt);
      const target = laneCenter(car.targetLane);
      const step = (laneWidthFrac / 0.85) * dt;
      if (Math.abs(target - car.offsetX) <= step) {
        car.offsetX = target;
        car.lane = car.targetLane;
        car.changeTimer = 0;
      } else {
        car.offsetX += Math.sign(target - car.offsetX) * step;
      }
    } else if (Math.random() < laneProb * dt) {
      tryLaneChange(car);
    }
    if (car.blink > 0) car.blink = Math.max(0, car.blink - dt);

    // 화면 밖으로 벗어난 차량 재활용
    const rel = relZ(car.z, pz);
    if (rel > CFG.windowAhead * 1.15 || rel < -CFG.windowBehind * 1.15) {
      spawnCar(car);
      continue;
    }

    // 아슬아슬 통과(니어미스) 판정: 옆을 스쳐 지나가는 순간
    if (!car.scored && Math.sign(rel) !== Math.sign(car.prevRel)) {
      const gap = Math.abs(car.offsetX - State.offsetX);
      const need2 = (car.type.width + State.car.width) / 2 / CFG.roadWidth;
      if (gap < need2 * 2.0) {
        State.nearMiss++;
        State.combo++;
        State.comboTimer = 2.6;
        State.score += 40 * Math.min(State.combo, 10) * State.car.scoreMul;
        State.flash = Math.min(1, State.flash + 0.35);
        car.scored = true;
      }
    }
    car.prevRel = rel;
  }
}

function checkCollision() {
  const pz = State.position + playerZ;
  for (const car of State.cars) {
    const dz = relZ(car.z, pz);
    const zHit = (car.type.length + State.car.length) / 2;
    if (Math.abs(dz) > zHit) continue;
    const xHit = (car.type.width + State.car.width) / 2 / CFG.roadWidth * 0.86;
    if (Math.abs(car.offsetX - State.offsetX) < xHit) return car;
  }
  return null;
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

  const dz = State.speed * CFG.unitsPerKmh * dt;
  State.position = (State.position + dz) % trackLength;
  State.distance += State.speed * dt / 3.6;

  // 차선 이동
  const target = laneCenter(State.targetLane);
  const step2 = State.car.handling * laneWidthFrac * dt;
  if (Math.abs(target - State.offsetX) <= step2) State.offsetX = target;
  else State.offsetX += Math.sign(target - State.offsetX) * step2;
  State.lane = Util.limit(Math.round((State.offsetX + 1) / laneWidthFrac - 0.5), 0, LANES - 1);

  // 커브 원심력 (그립이 낮은 차는 더 밀린다)
  const seg = findSegment(State.position + playerZ);
  const spd = State.speed / 200;
  State.offsetX -= seg.curve * spd * spd * CFG.centrifugal * dt / State.car.grip;
  State.offsetX = Util.limit(State.offsetX, -1 + laneWidthFrac * 0.42, 1 - laneWidthFrac * 0.42);

  updateTraffic(dt);
  updateScene(dt);

  if (State.comboTimer > 0) {
    State.comboTimer -= dt;
    if (State.comboTimer <= 0) State.combo = 0;
  }
  State.score += State.speed * dt / 3.6 * State.car.scoreMul;

  const hit = checkCollision();
  if (hit) crash(hit);
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
function project(p, camX, camY, camZ) {
  p.camera.x = (p.world.x || 0) - camX;
  p.camera.y = (p.world.y || 0) - camY;
  p.camera.z = (p.world.z || 0) - camZ;
  p.screen.scale = cameraDepth / p.camera.z;
  p.screen.x = Math.round(W / 2 + p.screen.scale * p.camera.x * W / 2);
  p.screen.y = Math.round(horizonY - p.screen.scale * p.camera.y * H / 2);
  p.screen.w = Math.round(p.screen.scale * CFG.roadWidth * W / 2);
}

function polygon(x1, y1, x2, y2, x3, y3, x4, y4, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fill();
}

function renderSegment(x1, y1, w1, x2, y2, w2, pal, dark, fog, showLanes) {
  const r1 = w1 / Math.max(6, 2 * LANES), r2 = w2 / Math.max(6, 2 * LANES);
  const l1 = w1 / Math.max(32, 8 * LANES), l2 = w2 / Math.max(32, 8 * LANES);

  ctx.fillStyle = dark ? pal.grass1 : pal.grass2;
  ctx.fillRect(0, y2, W, y1 - y2 + 1);

  const rumble = dark ? pal.rumble1 : pal.rumble2;
  polygon(x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, rumble);
  polygon(x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, rumble);
  polygon(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, dark ? pal.road1 : pal.road2);

  // 왼쪽 고속 차선 경고 틴트
  const tintW1 = (w1 * 2 / LANES) * 3, tintW2 = (w2 * 2 / LANES) * 3;
  ctx.fillStyle = "rgba(255,60,60,0.055)";
  ctx.beginPath();
  ctx.moveTo(x1 - w1, y1); ctx.lineTo(x1 - w1 + tintW1, y1);
  ctx.lineTo(x2 - w2 + tintW2, y2); ctx.lineTo(x2 - w2, y2);
  ctx.closePath();
  ctx.fill();

  if (showLanes && dark) {
    const lw1 = (w1 * 2) / LANES, lw2 = (w2 * 2) / LANES;
    let lx1 = x1 - w1 + lw1, lx2 = x2 - w2 + lw2;
    for (let i = 1; i < LANES; i++, lx1 += lw1, lx2 += lw2) {
      polygon(lx1 - l1 / 2, y1, lx1 + l1 / 2, y1, lx2 + l2 / 2, y2, lx2 - l2 / 2, y2, pal.lane);
    }
  }

  if (fog < 1) {
    ctx.globalAlpha = 1 - fog;
    ctx.fillStyle = pal.fog;
    ctx.fillRect(0, y2, W, y1 - y2 + 1);
    ctx.globalAlpha = 1;
  }
}

function drawSprite(img, scale, destX, destY, offsetX, offsetY, worldW, clipY, alpha) {
  const destW = scale * worldW * W / 2;
  const destH = destW * (img.height / img.width);
  const x = destX + destW * (offsetX || 0);
  const y = destY + destH * (offsetY || 0);
  let clipH = clipY ? Math.max(0, y + destH - clipY) : 0;
  if (clipH >= destH) return;
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  ctx.drawImage(img, 0, 0, img.width, img.height - (img.height * clipH / destH),
    x, y, destW, destH - clipH);
  if (alpha !== undefined) ctx.globalAlpha = 1;
}

function drawLayer(img, offset, y, height, alpha) {
  if (alpha <= 0) return;
  const w = W * 1.7;
  ctx.globalAlpha = alpha;
  let x = -(((offset % 1) + 1) % 1) * w;
  while (x < W) {
    ctx.drawImage(img, x, y, w, height);
    x += w;
  }
  ctx.globalAlpha = 1;
}

function renderBackground(pal, horizon) {
  const A = BIOMES[State.biomeA], B = BIOMES[State.biomeB], t = State.fade;
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, pal.skyTop);
  g.addColorStop(1, pal.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, horizon + 2);

  if (A.starLayer) drawLayer(A.starLayer, State.bgFar * 0.25, 0, horizon, 1 - t);
  if (B.starLayer && t > 0) drawLayer(B.starLayer, State.bgFar * 0.25, 0, horizon, t);

  const sunA = A.sun, sunB = B.sun;
  const drawSun = (s, a) => {
    if (!s || a <= 0) return;
    const r = s.r * H;
    const cx = W * s.x, cy = horizon - r * 0.35;
    const rg = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.6);
    rg.addColorStop(0, s.color);
    const c = hexToRgb(s.color);
    rg.addColorStop(0.35, `rgba(${c[0]},${c[1]},${c[2]},0.45)`);
    rg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalAlpha = a;
    ctx.fillStyle = rg;
    ctx.fillRect(cx - r * 2.6, cy - r * 2.6, r * 5.2, r * 5.2);
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };
  drawSun(sunA, 1 - t);
  drawSun(sunB, t);

  const farH = H * 0.34, nearH = H * 0.24;
  drawLayer(A.farLayer, State.bgFar, horizon - farH, farH, 1 - t);
  if (t > 0) drawLayer(B.farLayer, State.bgFar, horizon - farH, farH, t);
  drawLayer(A.nearLayer, State.bgNear, horizon - nearH, nearH, 1 - t);
  if (t > 0) drawLayer(B.nearLayer, State.bgNear, horizon - nearH, nearH, t);
}

const particles = [];
function initParticles() {
  particles.length = 0;
  for (let i = 0; i < 140; i++) {
    particles.push({ x: Math.random(), y: Math.random(), s: 0.4 + Math.random() * 1.2, r: 1 + Math.random() * 2.4 });
  }
}

function renderParticles(dt, speedPct) {
  const A = BIOMES[State.biomeA], B = BIOMES[State.biomeB];
  const conf = State.fade > 0.5 ? B.particle : A.particle;
  ctx.fillStyle = conf.color;
  const n = Math.min(particles.length, conf.n);
  for (let i = 0; i < n; i++) {
    const p = particles[i];
    p.y += (0.25 + speedPct * 1.9) * p.s * dt;
    const dx = (p.x - 0.5);
    p.x += dx * (0.35 + speedPct * 1.1) * p.s * dt;
    if (p.y > 1.05 || p.x < -0.05 || p.x > 1.05) {
      p.y = 0.42 + Math.random() * 0.1;
      p.x = 0.5 + (Math.random() - 0.5) * 0.5;
    }
    const size = p.r * (0.4 + p.y * 1.6);
    ctx.fillRect(p.x * W, p.y * H, size, size * (1 + speedPct * 5));
  }
}

function renderSpeedLines(speedPct, horizon) {
  if (speedPct < 0.35) return;
  const a = (speedPct - 0.35) * 0.5;
  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${a})`;
  ctx.lineWidth = 1.5;
  const cx = W / 2, cy = horizon;
  for (let i = 0; i < 26; i++) {
    const ang = (i / 26) * Math.PI * 2 + State.elapsed * 0.2;
    const r0 = W * (0.35 + ((i * 37 + Math.floor(State.elapsed * 60 * speedPct * 2 + i * 13)) % 40) / 60);
    const r1 = r0 + W * 0.12 * speedPct;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0 * 0.8);
    ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1 * 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

function render(dt) {
  const pal = State.fade > 0
    ? blendPalette(BIOMES[State.biomeA], BIOMES[State.biomeB], State.fade)
    : BIOMES[State.biomeA];

  const speedPct = Util.limit((State.speed - 80) / (CFG.maxSpeed - 80), 0, 1);
  // 속도가 오를수록 시야각을 넓혀 속도감을 강조
  cameraDepth = 1 / Math.tan(((CFG.fieldOfView + speedPct * 22) / 2) * Math.PI / 180);
  playerZ = CFG.cameraHeight * cameraDepth;

  const baseSegment = findSegment(State.position);
  const basePercent = Util.percentRemaining(State.position, CFG.segmentLength);
  const playerSegment = findSegment(State.position + playerZ);
  const playerPercent = Util.percentRemaining(State.position + playerZ, CFG.segmentLength);
  const playerY = Util.interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);

  ctx.save();
  if (State.shake > 0.001) {
    const s = State.shake * 14;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }

  const horizon = horizonY;
  renderBackground(pal, horizon);
  ctx.fillStyle = pal.fog;
  ctx.fillRect(0, horizon, W, H - horizon);

  let maxy = H;
  let x = 0;
  let dx = -(baseSegment.curve * basePercent);
  const camX = State.offsetX * CFG.roadWidth * CFG.camFollow;

  for (let n = 0; n < CFG.drawDistance; n++) {
    const seg = segments[(baseSegment.index + n) % segments.length];
    seg.looped = seg.index < baseSegment.index;
    seg.fog = Util.exponentialFog(n / CFG.drawDistance, CFG.fogDensity);
    seg.clip = maxy;

    project(seg.p1, camX - x, playerY + CFG.cameraHeight, State.position - (seg.looped ? trackLength : 0));
    project(seg.p2, camX - x - dx, playerY + CFG.cameraHeight, State.position - (seg.looped ? trackLength : 0));
    x += dx;
    dx += seg.curve;

    if (seg.p1.camera.z <= cameraDepth || seg.p2.screen.y >= seg.p1.screen.y || seg.p2.screen.y >= maxy) continue;

    renderSegment(seg.p1.screen.x, seg.p1.screen.y, seg.p1.screen.w,
      seg.p2.screen.x, seg.p2.screen.y, seg.p2.screen.w,
      pal, seg.dark, seg.fog, seg.p1.screen.w > 60);
    maxy = seg.p2.screen.y;
  }

  // 스프라이트: 먼 것부터 그린다
  const biomeObjs = (State.fade > 0.5 ? BIOMES[State.biomeB] : BIOMES[State.biomeA]).objSprites;
  const pz = State.position + playerZ;
  for (let n = CFG.drawDistance - 1; n > 0; n--) {
    const seg = segments[(baseSegment.index + n) % segments.length];
    if (!seg.p1.screen.scale || seg.p1.camera.z <= cameraDepth) continue;

    for (const o of seg.objects) {
      const sp = biomeObjs[o.kind % biomeObjs.length];
      const scale = seg.p1.screen.scale;
      const sx = seg.p1.screen.x + scale * o.offset * CFG.roadWidth * W / 2;
      drawSprite(sp.cv, scale * o.scale, sx, seg.p1.screen.y, o.offset < 0 ? -1 : 0, -1, sp.worldW, seg.clip, seg.fog);
    }

    // 이 세그먼트 구간에 있는 차량
    for (const car of State.cars) {
      const rel = relZ(car.z, State.position);
      if (rel < 0) continue;
      const segIdx = Math.floor(rel / CFG.segmentLength);
      if (segIdx !== n) continue;
      const percent = (rel % CFG.segmentLength) / CFG.segmentLength;
      const scale = Util.interpolate(seg.p1.screen.scale, seg.p2.screen.scale, percent);
      const sy = Util.interpolate(seg.p1.screen.y, seg.p2.screen.y, percent);
      const sx = Util.interpolate(seg.p1.screen.x, seg.p2.screen.x, percent)
        + scale * car.offsetX * CFG.roadWidth * W / 2;
      drawSprite(car.sprite, scale, sx, sy, -0.5, -1, car.type.width, seg.clip, seg.fog);
      // 차선 변경 깜빡이
      if (car.blink > 0 && Math.floor(car.blink * 8) % 2 === 0) {
        const dir = car.targetLane < car.lane ? -1 : 1;
        const w = scale * car.type.width * W / 2;
        ctx.fillStyle = "#ffc400";
        ctx.beginPath();
        ctx.arc(sx + dir * w * 0.62, sy - w * 0.35, Math.max(1.5, w * 0.09), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  renderPlayer(playerSegment, playerPercent, speedPct);
  renderSpeedLines(speedPct, horizon);
  renderParticles(dt, speedPct);

  // 비네트 (속도가 높을수록 시야가 좁아진다)
  const vg = ctx.createRadialGradient(W / 2, H * 0.55, H * (0.55 - speedPct * 0.22), W / 2, H * 0.55, H * 0.95);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, `rgba(0,0,0,${0.35 + speedPct * 0.35})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  if (State.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${State.flash * 0.25})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (State.mode === "crashed") {
    ctx.fillStyle = `rgba(160,0,0,${0.25 + Math.sin(State.crashTimer * 12) * 0.08})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

function renderPlayer(seg, percent, speedPct) {
  const scale = cameraDepth / playerZ;
  const bounce = Math.sin(State.elapsed * 26) * 0.7 * (0.4 + speedPct);
  const steer = (laneCenter(State.targetLane) - State.offsetX) / laneWidthFrac;
  const destW = scale * State.car.width * W / 2;
  const destH = destW * (State.car.sprite.height / State.car.sprite.width);
  const lateral = State.offsetX * CFG.roadWidth * (1 - CFG.camFollow) * scale * W / 2;
  const x = W / 2 - destW / 2 + lateral + steer * destW * 0.14;
  const y = H - destH * 1.06 + bounce;

  ctx.save();
  ctx.translate(x + destW / 2, y + destH / 2);
  ctx.rotate(-steer * 0.05);
  if (State.mode === "crashed") ctx.rotate(Math.sin(State.crashTimer * 9) * 0.16);
  ctx.drawImage(State.car.sprite, -destW / 2, -destH / 2, destW, destH);
  ctx.restore();

  // 배기 열기 / 속도 잔상
  ctx.fillStyle = `rgba(255,255,255,${0.06 + speedPct * 0.10})`;
  for (let i = 1; i <= 3; i++) {
    ctx.fillRect(x - destW * 0.1 * i, y + destH * (0.5 + 0.1 * i), destW * (1 + 0.2 * i), 2);
  }
}

// ---------------------------- 레이더 --------------------------------
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
  const front = 30000, back = 12000;
  const pyRatio = back / (front + back);
  rctx.strokeStyle = "rgba(255,255,255,0.25)";
  rctx.beginPath();
  rctx.moveTo(0, RH * (1 - pyRatio));
  rctx.lineTo(RW, RH * (1 - pyRatio));
  rctx.stroke();

  const pz = State.position + playerZ;
  for (const car of State.cars) {
    const rel = relZ(car.z, pz);
    if (rel > front || rel < -back) continue;
    const y = RH * (1 - (rel + back) / (front + back));
    const cx = ((car.offsetX + 1) / 2) * RW;
    rctx.fillStyle = rel < 0 ? "#ffb347" : "#ff5a5a";
    const h = Math.max(3, (car.type.length / 900) * 8);
    rctx.fillRect(cx - lw * 0.28, y - h / 2, lw * 0.56, h);
  }
  const px = ((State.offsetX + 1) / 2) * RW;
  const py = RH * (1 - pyRatio);
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
  CAR_TYPES.forEach((type, idx) => {
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
        ${statRow("차폭", type.width + "", 1 - (type.width - 150) / 350)}
        ${statRow("배율", "x" + type.scoreMul.toFixed(2), (type.scoreMul - 1) / 1.1)}
      </dl>`;
    const thumb = el.querySelector(".car-thumb");
    const c = makeCanvas(96, 96);
    const cc = c.getContext("2d");
    const h = 96 * (type.aspect || 0.8);
    cc.drawImage(type.sprite, 8, (96 - h) / 2, 80, h * 80 / 96);
    thumb.appendChild(c);
    el.addEventListener("click", () => {
      State.car = type;
      [...carListEl.children].forEach((n) => n.classList.remove("selected"));
      el.classList.add("selected");
    });
    carListEl.appendChild(el);
  });

  // 차선 속도 표
  const tbl = document.getElementById("lane-table");
  tbl.innerHTML = LANE_SPEEDS.map((s, i) =>
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
  const pz = State.position + playerZ;
  for (const car of State.cars) {
    const rel = relZ(car.z, pz);
    if (rel < -200 && rel > -6000 && car.speed > State.speed &&
      Math.abs(car.offsetX - State.offsetX) < laneWidthFrac * 0.8) { warn = true; break; }
  }
  HUD.warn.classList.toggle("show", warn);
}

// ---------------------------- 입력 ----------------------------------
function moveLane(dir) {
  if (State.mode !== "playing") return;
  State.targetLane = Util.limit(State.targetLane + dir, 0, LANES - 1);
}

function brakeFail() {
  State.brakeMsg = 1.4;
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
      if (State.mode === "menu") startGame();
      else if (State.mode === "crashed") startGame();
      break;
    case "Escape":
      if (State.mode === "playing") toMenu();
      break;
  }
});

let touchStartX = null;
canvas.addEventListener("touchstart", (e) => {
  touchStartX = e.touches[0].clientX;
  if (State.mode === "playing") {
    moveLane(e.touches[0].clientX < window.innerWidth / 2 ? -1 : 1);
  }
}, { passive: true });
canvas.addEventListener("touchend", (e) => { touchStartX = null; }, { passive: true });

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
  State.position = 0;
  State.elapsed = 0;
  State.distance = 0;
  State.score = 0;
  State.nearMiss = 0;
  State.combo = 0;
  State.comboTimer = 0;
  State.speed = State.car.startSpeed;
  State.topSpeed = State.car.startSpeed;
  State.lane = State.targetLane = 6; // 7차선(흐름 100km/h)에서 출발
  State.offsetX = laneCenter(State.lane);
  State.shake = 0;
  State.crashTimer = 0;
  State.flash = 0;
  State.biomeA = Util.randInt(0, BIOMES.length - 1);
  State.biomeB = State.biomeA;
  State.fade = 0;
  State.sceneTimer = 0;
  State.sceneHold = CFG.sceneStart;
  State.bgFar = State.bgNear = 0;
  State.car.sprite = getCarSprite(State.car, State.car.colors.body);
  buildTrack();
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
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (State.mode === "playing") {
    acc += dt;
    let guard = 0;
    while (acc >= FIXED && guard++ < 12) {
      step(FIXED);
      acc -= FIXED;
      if (State.mode !== "playing") break;
    }
    Sound.setSpeed(State.speed);
  } else if (State.mode === "crashed") {
    State.crashTimer += dt;
    State.shake = Math.max(0, State.shake - dt * 1.2);
  }

  // 배경 시차 스크롤
  const seg = findSegment(State.position + playerZ);
  const moved = State.speed * CFG.unitsPerKmh * dt / CFG.segmentLength;
  State.bgFar -= seg.curve * moved * 0.0016;
  State.bgNear -= seg.curve * moved * 0.0042;

  State.flash = Math.max(0, State.flash - dt * 2.2);
  if (State.mode === "playing") State.shake = Math.max(0, Math.min(1, (State.speed - 200) / 500));

  render(dt);
  if (State.mode !== "menu") {
    renderRadar();
    updateHUD();
  }
}

// ---------------------------- 시작 ----------------------------------
initScenery();
buildTrack();
resize();
buildMenu();
initParticles();
toMenu();
resetTraffic();
requestAnimationFrame(frame);
