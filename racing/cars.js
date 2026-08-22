// =====================================================================
// 자동차 리소스
// 외부 이미지 파일 없이 Canvas 2D로 차량 스프라이트를 "생성"한다.
// (GitHub Pages 정적 배포 - 외부 리소스 의존성 0, 로딩 실패 없음)
// =====================================================================

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amount >= 0) {
    r += (255 - r) * amount; g += (255 - g) * amount; b += (255 - b) * amount;
  } else {
    r *= 1 + amount; g *= 1 + amount; b *= 1 + amount;
  }
  return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
}

// ---------------------------------------------------------------------
// 차량 타입 (플레이어 선택 + 트래픽 공용)
//  startSpeed : 시작 속도(km/h)         accel    : 초당 가속(km/h)
//  handling   : 초당 차선 이동 수        grip     : 커브 원심력 저항
//  width      : 차폭(월드 단위, 차선폭 444)
//  scoreMul   : 점수 배율 (느리고 둔한 차일수록 보상이 크다)
// ---------------------------------------------------------------------
const CAR_TYPES = [
  {
    id: "kei", name: "코코 K", tag: "경차", kind: "car",
    desc: "가볍고 좁다. 틈새를 파고드는 생존형.",
    startSpeed: 95, accel: 0.9, handling: 3.1, grip: 1.15,
    width: 285, length: 420, scoreMul: 1.05, aspect: 0.86,
    colors: { body: "#63d2ff", glass: "#12283f" },
    prop: { roofW: 0.54, roofY: 0.20, bodyY: 0.42, wheel: 0.10 },
  },
  {
    id: "sedan", name: "노바 S", tag: "세단", kind: "car",
    desc: "무난한 기본기. 처음이라면 이 차.",
    startSpeed: 100, accel: 1.0, handling: 2.5, grip: 1.0,
    width: 330, length: 470, scoreMul: 1.15, aspect: 0.82,
    colors: { body: "#e8eaee", glass: "#16283c" },
    prop: { roofW: 0.52, roofY: 0.17, bodyY: 0.44, wheel: 0.09 },
  },
  {
    id: "sports", name: "팔콘 GT", tag: "스포츠", kind: "car",
    desc: "낮고 빠르다. 가속이 붙으면 곧 지옥.",
    startSpeed: 112, accel: 1.45, handling: 2.9, grip: 1.1,
    width: 340, length: 470, scoreMul: 1.35, aspect: 0.72,
    colors: { body: "#ff3b3b", glass: "#160f1c" },
    prop: { roofW: 0.58, roofY: 0.24, bodyY: 0.50, wheel: 0.11 },
  },
  {
    id: "muscle", name: "브루트 V8", tag: "머슬", kind: "car",
    desc: "묵직한 가속, 굼뜬 핸들. 배짱이 필요.",
    startSpeed: 105, accel: 1.25, handling: 1.9, grip: 0.85,
    width: 375, length: 520, scoreMul: 1.4, aspect: 0.78,
    colors: { body: "#ff9f1c", glass: "#1a1410" },
    prop: { roofW: 0.55, roofY: 0.20, bodyY: 0.46, wheel: 0.12 },
  },
  {
    id: "bike", name: "제트 R", tag: "바이크", kind: "bike",
    desc: "폭이 절반. 대신 실수 한 번이면 끝.",
    startSpeed: 108, accel: 1.6, handling: 3.8, grip: 0.9,
    width: 170, length: 330, scoreMul: 1.7, aspect: 1.25,
    colors: { body: "#7cff6b", glass: "#101a12" },
    prop: {},
  },
  {
    id: "van", name: "캐리어 밴", tag: "밴", kind: "van",
    desc: "덩치가 크고 굼뜨다. 점수 보상은 두둑.",
    startSpeed: 92, accel: 0.8, handling: 1.7, grip: 1.0,
    width: 410, length: 580, scoreMul: 1.6, aspect: 1.05,
    colors: { body: "#4dd0a7", glass: "#12222b" },
    prop: { roofW: 0.82, roofY: 0.08, bodyY: 0.38, wheel: 0.09 },
  },
  {
    id: "truck", name: "타이탄 T", tag: "트럭", kind: "truck",
    desc: "차선 하나를 거의 다 먹는다. 최고 배율.",
    startSpeed: 86, accel: 0.62, handling: 1.25, grip: 1.2,
    width: 455, length: 760, scoreMul: 2.0, aspect: 1.2,
    colors: { body: "#d94f6a", glass: "#101820" },
    prop: {},
  },
  {
    id: "hyper", name: "하이퍼 X", tag: "하이퍼카", kind: "car",
    desc: "시작부터 미쳐 있다. 가속이 폭력적.",
    startSpeed: 120, accel: 1.95, handling: 3.0, grip: 1.05,
    width: 350, length: 480, scoreMul: 1.5, aspect: 0.68,
    colors: { body: "#b06bff", glass: "#12091f" },
    prop: { roofW: 0.62, roofY: 0.28, bodyY: 0.54, wheel: 0.12 },
  },
];

// 트래픽 전용 추가 차량 (플레이어는 선택 불가)
const TRAFFIC_EXTRA = [
  { id: "bus", kind: "bus", width: 440, length: 900, aspect: 1.45, prop: {} },
  { id: "wagon", kind: "van", width: 360, length: 520, aspect: 0.95,
    prop: { roofW: 0.72, roofY: 0.12, bodyY: 0.42, wheel: 0.09 } },
];

const TRAFFIC_COLORS = [
  "#d8dde3", "#3d4756", "#c8443c", "#2f6fb5", "#e0a92c",
  "#4b8f5c", "#8a4fbf", "#e07a3f", "#20a2a6", "#b5b9c0",
];

// ---------------------------------------------------------------------
// 그리기: 모든 차량은 "뒤에서 본 모습"으로 그린다.
// ---------------------------------------------------------------------
function drawWheels(ctx, W, H, out, top, h) {
  ctx.fillStyle = "#15161a";
  ctx.fillRect(W * out, top, W * 0.10, h);
  ctx.fillRect(W * (1 - out - 0.10), top, W * 0.10, h);
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(W * out, top, W * 0.10, h * 0.18);
  ctx.fillRect(W * (1 - out - 0.10), top, W * 0.10, h * 0.18);
}

function drawTailLight(ctx, x, y, w, h, glow) {
  ctx.save();
  ctx.shadowColor = "rgba(255,40,40,0.95)";
  ctx.shadowBlur = glow;
  ctx.fillStyle = "#ff2f2f";
  roundRectPath(ctx, x, y, w, h, h * 0.4);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(255,190,190,0.85)";
  roundRectPath(ctx, x + w * 0.12, y + h * 0.2, w * 0.4, h * 0.35, h * 0.2);
  ctx.fill();
}

function drawCarArt(ctx, W, H, kind, colors, prop) {
  const body = colors.body;
  const glass = colors.glass || "#141d2b";

  // 바닥 그림자
  const sg = ctx.createRadialGradient(W / 2, H * 0.96, 1, W / 2, H * 0.96, W * 0.55);
  sg.addColorStop(0, "rgba(0,0,0,0.55)");
  sg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sg;
  ctx.fillRect(0, H * 0.82, W, H * 0.18);

  if (kind === "bike") {
    ctx.fillStyle = "#15161a";
    roundRectPath(ctx, W * 0.34, H * 0.55, W * 0.32, H * 0.42, W * 0.08);
    ctx.fill();
    // 라이더
    ctx.fillStyle = shade(body, -0.55);
    roundRectPath(ctx, W * 0.24, H * 0.30, W * 0.52, H * 0.42, W * 0.16);
    ctx.fill();
    ctx.fillStyle = body;
    roundRectPath(ctx, W * 0.30, H * 0.36, W * 0.40, H * 0.26, W * 0.12);
    ctx.fill();
    ctx.fillStyle = "#0e1116";
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H * 0.17, W * 0.17, H * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H * 0.14, W * 0.12, H * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    drawTailLight(ctx, W * 0.42, H * 0.66, W * 0.16, H * 0.06, 14);
    return;
  }

  if (kind === "truck" || kind === "bus") {
    const top = kind === "bus" ? H * 0.06 : H * 0.04;
    const botY = H * 0.86;
    // 화물칸 / 차체
    const g = ctx.createLinearGradient(0, top, 0, botY);
    g.addColorStop(0, shade(body, 0.28));
    g.addColorStop(0.5, body);
    g.addColorStop(1, shade(body, -0.35));
    ctx.fillStyle = g;
    roundRectPath(ctx, W * 0.05, top, W * 0.90, botY - top, W * 0.05);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = Math.max(1, W * 0.008);
    ctx.stroke();

    if (kind === "bus") {
      ctx.fillStyle = glass;
      roundRectPath(ctx, W * 0.12, top + H * 0.06, W * 0.76, H * 0.26, W * 0.03);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      roundRectPath(ctx, W * 0.12, top + H * 0.06, W * 0.76, H * 0.09, W * 0.03);
      ctx.fill();
    } else {
      // 뒷문 라인
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.moveTo(W * 0.5, top + H * 0.04);
      ctx.lineTo(W * 0.5, botY - H * 0.05);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(W * 0.10, top + H * 0.10, W * 0.80, H * 0.05);
    }
    // 반사 테이프
    ctx.fillStyle = "rgba(255,220,90,0.8)";
    ctx.fillRect(W * 0.08, botY - H * 0.10, W * 0.84, H * 0.025);
    drawWheels(ctx, W, H, 0.06, botY - H * 0.02, H * 0.14);
    drawTailLight(ctx, W * 0.10, botY - H * 0.06, W * 0.14, H * 0.05, 12);
    drawTailLight(ctx, W * 0.76, botY - H * 0.06, W * 0.14, H * 0.05, 12);
    return;
  }

  // 일반 승용차 / 밴
  const p = Object.assign({ roofW: 0.54, roofY: 0.18, bodyY: 0.44, wheel: 0.09 }, prop);
  const bodyTop = H * p.bodyY;
  const bodyBot = H * 0.88;
  const roofTop = H * p.roofY;
  const halfRoof = (W * p.roofW) / 2;

  // 캐빈
  ctx.fillStyle = shade(body, -0.18);
  ctx.beginPath();
  ctx.moveTo(W * 0.5 - halfRoof, roofTop);
  ctx.lineTo(W * 0.5 + halfRoof, roofTop);
  ctx.lineTo(W * 0.86, bodyTop + H * 0.04);
  ctx.lineTo(W * 0.14, bodyTop + H * 0.04);
  ctx.closePath();
  ctx.fill();

  // 뒷유리
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(W * 0.5 - halfRoof * 0.82, roofTop + H * 0.035);
  ctx.lineTo(W * 0.5 + halfRoof * 0.82, roofTop + H * 0.035);
  ctx.lineTo(W * 0.78, bodyTop - H * 0.005);
  ctx.lineTo(W * 0.22, bodyTop - H * 0.005);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.moveTo(W * 0.5 - halfRoof * 0.82, roofTop + H * 0.035);
  ctx.lineTo(W * 0.5 + halfRoof * 0.3, roofTop + H * 0.035);
  ctx.lineTo(W * 0.30, bodyTop - H * 0.005);
  ctx.lineTo(W * 0.22, bodyTop - H * 0.005);
  ctx.closePath();
  ctx.fill();

  // 바퀴
  drawWheels(ctx, W, H, p.wheel * 0.55, bodyBot - H * 0.10, H * 0.12);

  // 차체
  const g = ctx.createLinearGradient(0, bodyTop, 0, bodyBot);
  g.addColorStop(0, shade(body, 0.3));
  g.addColorStop(0.45, body);
  g.addColorStop(1, shade(body, -0.4));
  ctx.fillStyle = g;
  roundRectPath(ctx, W * 0.06, bodyTop, W * 0.88, bodyBot - bodyTop, W * 0.09);
  ctx.fill();

  // 하이라이트 / 범퍼
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  roundRectPath(ctx, W * 0.09, bodyTop + H * 0.015, W * 0.82, H * 0.03, W * 0.02);
  ctx.fill();
  ctx.fillStyle = shade(body, -0.55);
  roundRectPath(ctx, W * 0.06, bodyBot - H * 0.10, W * 0.88, H * 0.08, W * 0.03);
  ctx.fill();

  // 번호판
  ctx.fillStyle = "#f3f3e8";
  roundRectPath(ctx, W * 0.42, bodyBot - H * 0.085, W * 0.16, H * 0.05, W * 0.01);
  ctx.fill();

  // 테일램프
  const lampY = bodyTop + (bodyBot - bodyTop) * 0.22;
  const lampH = (bodyBot - bodyTop) * 0.26;
  drawTailLight(ctx, W * 0.09, lampY, W * 0.19, lampH, 16);
  drawTailLight(ctx, W * 0.72, lampY, W * 0.19, lampH, 16);
}

// 스프라이트 캐시 -------------------------------------------------------
const spriteCache = new Map();

function getCarSprite(type, bodyColor) {
  const key = `${type.kind}|${type.id}|${bodyColor}`;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const W = 256;
  const H = Math.round(W * (type.aspect || 0.8));
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext("2d");
  drawCarArt(ctx, W, H, type.kind, { body: bodyColor, glass: type.colors ? type.colors.glass : "#141d2b" }, type.prop);
  spriteCache.set(key, cv);
  return cv;
}

// 트래픽 차량 풀: 타입 x 색상 조합
const TRAFFIC_TYPES = CAR_TYPES.filter((t) => t.id !== "hyper").concat(TRAFFIC_EXTRA);
