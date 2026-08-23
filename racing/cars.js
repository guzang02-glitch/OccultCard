// =====================================================================
// 자동차 리소스 (탑다운 뷰)
// 외부 이미지 파일 없이 Canvas 2D로 "위에서 본" 차량 스프라이트를 생성한다.
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
// 플레이어가 선택하는 차량 (2종, 둘 다 빨강)
//  startSpeed : 시작 속도(km/h)      accel     : 초당 가속 배율
//  handling   : 초당 차선 이동 수
//  width      : 차폭(월드 단위, 도로 전체폭 4000 / 차선폭 444)
//  topAspect  : 위에서 봤을 때 길이/폭 비율
//  scoreMul   : 점수 배율
// ---------------------------------------------------------------------
const PLAYER_RED = { body: "#ff2f2f", glass: "#180f14" };

const CAR_TYPES = [
  {
    id: "sports", name: "팔콘 GT", tag: "스포츠카", kind: "sports",
    desc: "차폭이 넓어 빠져나갈 틈이 좁다. 대신 점수 배율이 높다.",
    startSpeed: 112, accel: 1.45, handling: 2.9,
    width: 292, topAspect: 2.35, scoreMul: 1.5,
    colors: PLAYER_RED,
  },
  {
    id: "bike", name: "제트 R", tag: "오토바이", kind: "bike",
    desc: "폭이 절반, 조향도 가장 빠르다. 가장 무난한 선택.",
    startSpeed: 108, accel: 1.6, handling: 3.8,
    width: 148, topAspect: 2.6, scoreMul: 1.0,
    colors: PLAYER_RED,
  },
];

// 도로 위 일반 차량 (플레이어는 선택 불가, 색은 무작위)
const TRAFFIC_TYPES = [
  { id: "kei", kind: "car", width: 248, topAspect: 1.95 },
  { id: "sedan", kind: "car", width: 286, topAspect: 2.25 },
  { id: "coupe", kind: "sports", width: 292, topAspect: 2.35 },
  { id: "muscle", kind: "sports", width: 322, topAspect: 2.30 },
  { id: "wagon", kind: "van", width: 310, topAspect: 2.50 },
  { id: "van", kind: "van", width: 352, topAspect: 2.35 },
  { id: "truck", kind: "truck", width: 392, topAspect: 3.10 },
  { id: "bus", kind: "bus", width: 380, topAspect: 3.90 },
  { id: "scooter", kind: "bike", width: 148, topAspect: 2.60 },
];

// 플레이어(빨강)와 헷갈리지 않도록 붉은 계열은 제외한다
const TRAFFIC_COLORS = [
  "#d8dde3", "#3d4756", "#2f6fb5", "#e0a92c", "#4b8f5c",
  "#8a4fbf", "#20a2a6", "#b5b9c0", "#5a6472", "#c9a227",
];

// ---------------------------------------------------------------------
// 그리기: 모든 차량은 "위에서 본 모습" (앞쪽이 위)
// ---------------------------------------------------------------------
function carShadow(ctx, W, H, inset) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.filter = "blur(3px)";
  roundRectPath(ctx, inset + W * 0.05, H * 0.03 + H * 0.02, W - inset * 2, H * 0.95, W * 0.16);
  ctx.fill();
  ctx.restore();
}

function drawCarTop(ctx, W, H, kind, colors) {
  const body = colors.body;
  const glass = colors.glass || "#16283c";
  const inset = W * 0.06;
  const bw = W - inset * 2;

  carShadow(ctx, W, H, inset);

  if (kind === "bike") {
    ctx.fillStyle = "#15161a";
    roundRectPath(ctx, W * 0.34, H * 0.04, W * 0.32, H * 0.92, W * 0.16);
    ctx.fill();
    ctx.fillStyle = body;
    roundRectPath(ctx, W * 0.28, H * 0.26, W * 0.44, H * 0.42, W * 0.2);
    ctx.fill();
    ctx.fillStyle = shade(body, -0.5);
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H * 0.44, W * 0.19, H * 0.12, 0, 0, Math.PI * 2);
    ctx.fill(); // 라이더 어깨
    ctx.fillStyle = "#20242c";
    ctx.beginPath();
    ctx.arc(W * 0.5, H * 0.3, W * 0.15, 0, Math.PI * 2);
    ctx.fill(); // 헬멧
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(W * 0.5, H * 0.27, W * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff8dc";
    roundRectPath(ctx, W * 0.44, H * 0.03, W * 0.12, H * 0.03, W * 0.02);
    ctx.fill();
    ctx.fillStyle = "#ff2f2f";
    roundRectPath(ctx, W * 0.42, H * 0.94, W * 0.16, H * 0.03, W * 0.02);
    ctx.fill();
    return;
  }

  // 차체
  const g = ctx.createLinearGradient(inset, 0, inset + bw, 0);
  g.addColorStop(0, shade(body, -0.34));
  g.addColorStop(0.24, body);
  g.addColorStop(0.5, shade(body, 0.22));
  g.addColorStop(0.78, body);
  g.addColorStop(1, shade(body, -0.34));
  ctx.fillStyle = g;

  const nose = kind === "truck" || kind === "bus" || kind === "van" ? 0.10 : 0.22;
  roundRectPath(ctx, inset, H * 0.01, bw, H * 0.98, W * (kind === "sports" ? 0.20 : 0.16));
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = Math.max(1, W * 0.012);
  ctx.stroke();

  if (kind === "truck" || kind === "bus") {
    // 캡 / 화물칸 분리선
    const cabEnd = kind === "bus" ? H * 0.22 : H * 0.26;
    ctx.fillStyle = shade(body, -0.22);
    roundRectPath(ctx, inset, cabEnd, bw, H * 0.98 - cabEnd, W * 0.06);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.moveTo(inset, cabEnd);
    ctx.lineTo(inset + bw, cabEnd);
    ctx.stroke();
    // 앞유리
    ctx.fillStyle = glass;
    roundRectPath(ctx, inset + bw * 0.10, H * 0.05, bw * 0.80, cabEnd - H * 0.10, W * 0.05);
    ctx.fill();
    if (kind === "bus") {
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      for (let i = 0; i < 6; i++) {
        const y = cabEnd + (H * 0.98 - cabEnd) * (0.08 + i * 0.15);
        ctx.fillRect(inset + bw * 0.02, y, bw * 0.1, H * 0.07);
        ctx.fillRect(inset + bw * 0.88, y, bw * 0.1, H * 0.07);
      }
    } else {
      // 컨테이너 리브
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      for (let i = 1; i < 7; i++) {
        const y = cabEnd + (H * 0.98 - cabEnd) * (i / 7);
        ctx.beginPath();
        ctx.moveTo(inset + bw * 0.06, y);
        ctx.lineTo(inset + bw * 0.94, y);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "#fff6d0";
    roundRectPath(ctx, inset + bw * 0.04, H * 0.012, bw * 0.16, H * 0.022, 2);
    ctx.fill();
    roundRectPath(ctx, inset + bw * 0.80, H * 0.012, bw * 0.16, H * 0.022, 2);
    ctx.fill();
    ctx.fillStyle = "#ff3131";
    roundRectPath(ctx, inset + bw * 0.04, H * 0.965, bw * 0.16, H * 0.022, 2);
    ctx.fill();
    roundRectPath(ctx, inset + bw * 0.80, H * 0.965, bw * 0.16, H * 0.022, 2);
    ctx.fill();
    return;
  }

  // 지붕 (승용차 / 밴)
  const roofTop = H * (kind === "van" ? 0.20 : 0.30);
  const roofBot = H * (kind === "van" ? 0.86 : 0.74);
  ctx.fillStyle = shade(body, 0.1);
  roundRectPath(ctx, inset + bw * 0.09, roofTop, bw * 0.82, roofBot - roofTop, W * 0.10);
  ctx.fill();

  // 앞유리 / 뒷유리
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(inset + bw * 0.16, roofTop);
  ctx.lineTo(inset + bw * 0.84, roofTop);
  ctx.lineTo(inset + bw * 0.90, H * nose);
  ctx.lineTo(inset + bw * 0.10, H * nose);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(inset + bw * 0.16, roofBot);
  ctx.lineTo(inset + bw * 0.84, roofBot);
  ctx.lineTo(inset + bw * 0.90, H * (1 - nose * 0.62));
  ctx.lineTo(inset + bw * 0.10, H * (1 - nose * 0.62));
  ctx.closePath();
  ctx.fill();
  // 유리 하이라이트
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.moveTo(inset + bw * 0.16, roofTop);
  ctx.lineTo(inset + bw * 0.42, roofTop);
  ctx.lineTo(inset + bw * 0.34, H * nose);
  ctx.lineTo(inset + bw * 0.10, H * nose);
  ctx.closePath();
  ctx.fill();

  // 사이드미러
  ctx.fillStyle = shade(body, -0.25);
  roundRectPath(ctx, inset - W * 0.045, H * (nose + 0.02), W * 0.06, H * 0.035, 2);
  ctx.fill();
  roundRectPath(ctx, inset + bw - W * 0.015, H * (nose + 0.02), W * 0.06, H * 0.035, 2);
  ctx.fill();

  // 헤드라이트 / 테일램프
  ctx.save();
  ctx.shadowColor = "rgba(255,240,180,0.9)";
  ctx.shadowBlur = W * 0.12;
  ctx.fillStyle = "#fff6d0";
  roundRectPath(ctx, inset + bw * 0.08, H * 0.015, bw * 0.20, H * 0.028, 3);
  ctx.fill();
  roundRectPath(ctx, inset + bw * 0.72, H * 0.015, bw * 0.20, H * 0.028, 3);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.shadowColor = "rgba(255,50,50,0.95)";
  ctx.shadowBlur = W * 0.16;
  ctx.fillStyle = "#ff3131";
  roundRectPath(ctx, inset + bw * 0.06, H * 0.955, bw * 0.22, H * 0.03, 3);
  ctx.fill();
  roundRectPath(ctx, inset + bw * 0.72, H * 0.955, bw * 0.22, H * 0.03, 3);
  ctx.fill();
  ctx.restore();

  if (kind === "sports") {
    // 보닛 스트라이프
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(inset + bw * 0.44, H * 0.05, bw * 0.12, H * 0.9);
  }
}

// 스프라이트 캐시 -------------------------------------------------------
const spriteCache = new Map();

function getCarSprite(type, bodyColor) {
  const key = `${type.kind}|${type.id}|${bodyColor}`;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const W = 148;
  const H = Math.round(W * type.topAspect);
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext("2d");
  drawCarTop(ctx, W, H, type.kind, {
    body: bodyColor,
    glass: type.colors ? type.colors.glass : "#16283c",
  });
  spriteCache.set(key, cv);
  return cv;
}
