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
//  - 실차 비율을 참고했다. 앞이 좁고 뒷 휀더가 넓은 실루엣,
//    보닛 크리스, 크롬 윈도우 트림, 길게 흐르는 글로스 하이라이트,
//    가로로 얇게 두 줄 들어가는 헤드램프 / 리어 램프 바.
// ---------------------------------------------------------------------

// 차종별 비율 (W 대비 폭, H 대비 위치)
//  nose/hip/tail : 앞·어깨·뒤 폭      ws : 앞유리 구간
//  roofB / rwB   : 지붕 끝 / 뒷유리 끝  cab : 캐빈 폭 비율
const CAR_SHAPE = {
  car:    { nose: 0.66, hip: 0.84, tail: 0.78, wsA: 0.30, wsB: 0.46, roofB: 0.66, rwB: 0.80, cab: 0.58 },
  sports: { nose: 0.60, hip: 0.86, tail: 0.74, wsA: 0.35, wsB: 0.51, roofB: 0.67, rwB: 0.80, cab: 0.60 },
  van:    { nose: 0.80, hip: 0.86, tail: 0.84, wsA: 0.13, wsB: 0.27, roofB: 0.80, rwB: 0.92, cab: 0.72 },
};

function softShadow(ctx, W, H, drawShape) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = W * 0.10;
  ctx.shadowOffsetX = W * 0.04;
  ctx.shadowOffsetY = H * 0.012;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  drawShape(ctx);
  ctx.restore();
}

// 차체 실루엣: 앞/뒤만 좁아지고 측면은 곧게 뻗는다 (실차 비율)
function bodyPath(ctx, W, H, s) {
  const cx = W / 2;
  const hw = (f) => (W * f) / 2;
  const yN = H * 0.02, yT = H * 0.985;
  const shoulder = H * 0.15;    // 여기서부터 최대폭
  const hipEnd = H * 0.82;      // 여기까지 최대폭 유지
  ctx.beginPath();
  ctx.moveTo(cx - hw(s.nose), yN + H * 0.012);
  ctx.quadraticCurveTo(cx, yN - H * 0.005, cx + hw(s.nose), yN + H * 0.012);
  ctx.quadraticCurveTo(cx + hw(s.hip), shoulder * 0.55, cx + hw(s.hip), shoulder);
  ctx.lineTo(cx + hw(s.hip), hipEnd);
  ctx.quadraticCurveTo(cx + hw(s.hip), yT - H * 0.02, cx + hw(s.tail), yT);
  ctx.quadraticCurveTo(cx, yT + H * 0.01, cx - hw(s.tail), yT);
  ctx.quadraticCurveTo(cx - hw(s.hip), yT - H * 0.02, cx - hw(s.hip), hipEnd);
  ctx.lineTo(cx - hw(s.hip), shoulder);
  ctx.quadraticCurveTo(cx - hw(s.hip), shoulder * 0.55, cx - hw(s.nose), yN + H * 0.012);
  ctx.closePath();
}

// 유리: 아래가 넓은 사다리꼴
function glassPath(ctx, W, H, topY, botY, topW, botW) {
  const cx = W / 2;
  ctx.beginPath();
  ctx.moveTo(cx - (W * topW) / 2, H * topY);
  ctx.lineTo(cx + (W * topW) / 2, H * topY);
  ctx.quadraticCurveTo(cx + (W * botW) / 2, H * (topY + botY) / 2, cx + (W * botW) / 2, H * botY);
  ctx.lineTo(cx - (W * botW) / 2, H * botY);
  ctx.quadraticCurveTo(cx - (W * botW) / 2, H * (topY + botY) / 2, cx - (W * topW) / 2, H * topY);
  ctx.closePath();
}

function tire(ctx, W, H, x, y, w, h) {
  ctx.fillStyle = "#14151a";
  roundRectPath(ctx, x, y, w, h, w * 0.28);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.16)";   // 림 반사
  roundRectPath(ctx, x + w * 0.28, y + h * 0.3, w * 0.44, h * 0.4, w * 0.2);
  ctx.fill();
}

function lampSlash(ctx, x, y, w, h, color, glow) {
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = h * 3.2;
  ctx.fillStyle = color;
  roundRectPath(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fill();
  ctx.restore();
}

function drawSedan(ctx, W, H, kind, colors) {
  const s = CAR_SHAPE[kind === "van" ? "van" : kind === "sports" ? "sports" : "car"];
  const body = colors.body;
  const glass = colors.glass || "#16283c";
  const cx = W / 2;
  const hip = (W * s.hip) / 2;

  softShadow(ctx, W, H, (c) => bodyPath(c, W, H, s));

  // 바퀴 (차체 밖으로 살짝 나온다)
  const tw = W * 0.085, th = H * 0.15;
  tire(ctx, W, H, cx - hip - tw * 0.35, H * 0.15, tw, th);
  tire(ctx, W, H, cx + hip - tw * 0.65, H * 0.15, tw, th);
  tire(ctx, W, H, cx - hip - tw * 0.35, H * 0.70, tw, th * 1.05);
  tire(ctx, W, H, cx + hip - tw * 0.65, H * 0.70, tw, th * 1.05);

  // 차체 (좌우 그라디언트로 광택)
  const g = ctx.createLinearGradient(cx - hip, 0, cx + hip, 0);
  g.addColorStop(0.00, shade(body, -0.45));
  g.addColorStop(0.10, shade(body, -0.12));
  g.addColorStop(0.24, shade(body, 0.26));
  g.addColorStop(0.42, body);
  g.addColorStop(0.62, shade(body, 0.14));
  g.addColorStop(0.86, shade(body, -0.20));
  g.addColorStop(1.00, shade(body, -0.48));
  bodyPath(ctx, W, H, s);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = Math.max(1, W * 0.008);
  ctx.stroke();

  ctx.save();
  bodyPath(ctx, W, H, s);
  ctx.clip();

  // 길게 흐르는 하이라이트 2줄
  [[0.30, 0.055, 0.30], [0.64, 0.03, 0.16]].forEach(([px, pw, a]) => {
    const hg = ctx.createLinearGradient(0, 0, 0, H);
    hg.addColorStop(0, `rgba(255,255,255,0)`);
    hg.addColorStop(0.25, `rgba(255,255,255,${a})`);
    hg.addColorStop(0.75, `rgba(255,255,255,${a * 0.7})`);
    hg.addColorStop(1, `rgba(255,255,255,0)`);
    ctx.fillStyle = hg;
    ctx.fillRect(W * px, 0, W * pw, H);
  });

  // 보닛 크리스 / 도어 라인
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = Math.max(1, W * 0.006);
  [-1, 1].forEach((d) => {
    ctx.beginPath();
    ctx.moveTo(cx + d * W * 0.13, H * 0.06);
    ctx.lineTo(cx + d * W * 0.17, H * (s.wsA - 0.01));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + d * hip, H * s.wsB);
    ctx.lineTo(cx + d * hip * 0.72, H * s.wsB);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + d * hip, H * s.roofB);
    ctx.lineTo(cx + d * hip * 0.72, H * s.roofB);
    ctx.stroke();
  });
  ctx.restore();

  // 루프 패널 (차체보다 좁게 -> 위에서 보면 양옆으로 차체가 보인다)
  const cab = s.cab;
  ctx.fillStyle = shade(body, 0.08);
  roundRectPath(ctx, cx - (W * cab) / 2, H * (s.wsB - 0.012), W * cab, H * (s.roofB - s.wsB + 0.024), W * 0.06);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  roundRectPath(ctx, cx - W * cab * 0.40, H * (s.wsB + 0.004), W * cab * 0.24, H * (s.roofB - s.wsB - 0.008), W * 0.03);
  ctx.fill();

  // 앞유리 / 뒷유리
  const gl = ctx.createLinearGradient(cx - W * cab * 0.5, 0, cx + W * cab * 0.5, 0);
  gl.addColorStop(0, shade(glass, 0.34));
  gl.addColorStop(0.35, shade(glass, 0.06));
  gl.addColorStop(1, shade(glass, -0.25));
  ctx.fillStyle = gl;
  glassPath(ctx, W, H, s.wsA, s.wsB, cab * 0.98, cab * 0.74);
  ctx.fill();
  glassPath(ctx, W, H, s.roofB, s.rwB, cab * 0.98, cab * 0.72);
  ctx.fill();
  // 유리 반사 (한쪽만 비스듬히)
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  glassPath(ctx, W, H, s.wsA + 0.012, s.wsB - 0.008, cab * 0.34, cab * 0.24);
  ctx.fill();

  // 크롬 윈도우 트림
  ctx.strokeStyle = "rgba(232,238,248,0.5)";
  ctx.lineWidth = Math.max(1, W * 0.009);
  glassPath(ctx, W, H, s.wsA, s.wsB, cab * 0.98, cab * 0.74);
  ctx.stroke();
  glassPath(ctx, W, H, s.roofB, s.rwB, cab * 0.98, cab * 0.72);
  ctx.stroke();

  // 사이드미러
  ctx.fillStyle = shade(body, -0.28);
  [-1, 1].forEach((d) => {
    roundRectPath(ctx, cx + d * (hip + W * 0.02) - (d > 0 ? 0 : W * 0.07), H * (s.wsA + 0.005), W * 0.07, H * 0.035, W * 0.02);
    ctx.fill();
  });

  // 헤드램프: 얇은 두 줄 + 그릴
  const lw = W * 0.15, lh = H * 0.013;
  [-1, 1].forEach((d) => {
    const x = d < 0 ? cx - W * 0.27 : cx + W * 0.12;
    lampSlash(ctx, x, H * 0.042, lw, lh, "#fff8e2", "rgba(255,240,190,0.9)");
    lampSlash(ctx, x + lw * 0.12, H * 0.066, lw * 0.76, lh, "#fff8e2", "rgba(255,240,190,0.7)");
  });
  ctx.fillStyle = "rgba(22,24,30,0.8)";
  roundRectPath(ctx, cx - W * 0.075, H * 0.03, W * 0.15, H * 0.038, W * 0.025);
  ctx.fill();
  ctx.strokeStyle = "rgba(220,225,235,0.5)";
  ctx.lineWidth = Math.max(1, W * 0.006);
  ctx.stroke();

  // 리어 램프 바 + 머플러
  ctx.save();
  ctx.shadowColor = "rgba(255,50,50,0.95)";
  ctx.shadowBlur = W * 0.14;
  ctx.fillStyle = "#ff2f2f";
  roundRectPath(ctx, cx - W * s.tail * 0.46, H * 0.935, W * s.tail * 0.92, H * 0.022, H * 0.011);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(255,190,190,0.9)";
  roundRectPath(ctx, cx - W * s.tail * 0.44, H * 0.939, W * s.tail * 0.2, H * 0.012, H * 0.006);
  ctx.fill();
  roundRectPath(ctx, cx + W * s.tail * 0.24, H * 0.939, W * s.tail * 0.2, H * 0.012, H * 0.006);
  ctx.fill();
  ctx.fillStyle = "#2a2d34";
  [-1, 1].forEach((d) => {
    roundRectPath(ctx, cx + d * W * 0.18 - (d > 0 ? 0 : W * 0.09), H * 0.968, W * 0.09, H * 0.016, W * 0.01);
    ctx.fill();
  });

  // 샤크핀 안테나
  ctx.fillStyle = shade(body, -0.35);
  roundRectPath(ctx, cx - W * 0.018, H * (s.roofB - 0.03), W * 0.036, H * 0.05, W * 0.012);
  ctx.fill();
}

// 소형 카고 트럭: 짧은 캡 + 개방형 적재함 (실차 포터형 참고)
function drawFlatbed(ctx, W, H, colors) {
  const body = colors.body;
  const glass = colors.glass || "#101820";
  const cx = W / 2;
  const cabEnd = H * 0.30;
  const cabHalf = W * 0.44;
  const bedHalf = W * 0.47;

  softShadow(ctx, W, H, (c) => roundRectPath(c, cx - bedHalf, H * 0.01, bedHalf * 2, H * 0.98, W * 0.05));

  // 바퀴 (뒤는 복륜)
  const tw = W * 0.085;
  tire(ctx, W, H, cx - cabHalf - tw * 0.4, H * 0.12, tw, H * 0.12);
  tire(ctx, W, H, cx + cabHalf - tw * 0.6, H * 0.12, tw, H * 0.12);
  tire(ctx, W, H, cx - bedHalf - tw * 0.3, H * 0.66, tw * 1.25, H * 0.14);
  tire(ctx, W, H, cx + bedHalf - tw * 0.95, H * 0.66, tw * 1.25, H * 0.14);

  // 적재함 바닥 (금속 데크)
  ctx.fillStyle = "#7c828b";
  roundRectPath(ctx, cx - bedHalf, cabEnd + H * 0.01, bedHalf * 2, H * 0.965 - cabEnd, W * 0.03);
  ctx.fill();
  const dg = ctx.createLinearGradient(cx - bedHalf, 0, cx + bedHalf, 0);
  dg.addColorStop(0, "rgba(255,255,255,0.18)");
  dg.addColorStop(0.35, "rgba(255,255,255,0.06)");
  dg.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = dg;
  roundRectPath(ctx, cx - bedHalf, cabEnd + H * 0.01, bedHalf * 2, H * 0.965 - cabEnd, W * 0.03);
  ctx.fill();
  // 데크 리브
  ctx.strokeStyle = "rgba(40,44,52,0.45)";
  ctx.lineWidth = Math.max(1, W * 0.007);
  for (let i = 1; i < 11; i++) {
    const y = cabEnd + H * 0.01 + (H * 0.955 - cabEnd) * (i / 11);
    ctx.beginPath();
    ctx.moveTo(cx - bedHalf * 0.94, y);
    ctx.lineTo(cx + bedHalf * 0.94, y);
    ctx.stroke();
  }

  // 적재함 측면 게이트 (차체색)
  const rg = ctx.createLinearGradient(cx - bedHalf, 0, cx + bedHalf, 0);
  rg.addColorStop(0, shade(body, -0.4));
  rg.addColorStop(0.3, shade(body, 0.24));
  rg.addColorStop(0.6, body);
  rg.addColorStop(1, shade(body, -0.42));
  ctx.fillStyle = rg;
  const railW = W * 0.075;
  roundRectPath(ctx, cx - bedHalf, cabEnd + H * 0.01, railW, H * 0.965 - cabEnd, W * 0.02);
  ctx.fill();
  roundRectPath(ctx, cx + bedHalf - railW, cabEnd + H * 0.01, railW, H * 0.965 - cabEnd, W * 0.02);
  ctx.fill();
  // 뒷 게이트
  roundRectPath(ctx, cx - bedHalf, H * 0.905, bedHalf * 2, H * 0.06, W * 0.02);
  ctx.fill();

  // 캡
  const cg = ctx.createLinearGradient(cx - cabHalf, 0, cx + cabHalf, 0);
  cg.addColorStop(0, shade(body, -0.45));
  cg.addColorStop(0.22, shade(body, 0.28));
  cg.addColorStop(0.5, body);
  cg.addColorStop(0.82, shade(body, -0.18));
  cg.addColorStop(1, shade(body, -0.48));
  ctx.fillStyle = cg;
  roundRectPath(ctx, cx - cabHalf, H * 0.012, cabHalf * 2, cabEnd - H * 0.012, W * 0.06);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(1, W * 0.008);
  ctx.stroke();

  // 앞유리 + 루프
  ctx.fillStyle = glass;
  glassPath(ctx, W, H, 0.155, 0.055, 0.66, 0.78);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.33, H * 0.055);
  ctx.lineTo(cx - W * 0.10, H * 0.055);
  ctx.lineTo(cx - W * 0.19, H * 0.155);
  ctx.lineTo(cx - W * 0.28, H * 0.155);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(body, 0.12);
  roundRectPath(ctx, cx - W * 0.30, H * 0.16, W * 0.60, H * 0.125, W * 0.04);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  roundRectPath(ctx, cx - W * 0.26, H * 0.175, W * 0.16, H * 0.10, W * 0.03);
  ctx.fill();

  // 넓게 튀어나온 사이드미러
  ctx.fillStyle = "#e8ebef";
  [-1, 1].forEach((d) => {
    roundRectPath(ctx, cx + d * (cabHalf + W * 0.045) - (d > 0 ? 0 : W * 0.09), H * 0.115, W * 0.09, H * 0.042, W * 0.015);
    ctx.fill();
    ctx.fillStyle = "#2a2d34";
    ctx.fillRect(cx + d * cabHalf - (d > 0 ? 0 : W * 0.05), H * 0.128, W * 0.05, H * 0.012);
    ctx.fillStyle = "#e8ebef";
  });

  // 램프 / 반사 테이프
  ctx.fillStyle = "#fff6d0";
  roundRectPath(ctx, cx - cabHalf + W * 0.03, H * 0.018, W * 0.16, H * 0.02, 2);
  ctx.fill();
  roundRectPath(ctx, cx + cabHalf - W * 0.19, H * 0.018, W * 0.16, H * 0.02, 2);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = "rgba(255,50,50,0.9)";
  ctx.shadowBlur = W * 0.1;
  ctx.fillStyle = "#ff3131";
  roundRectPath(ctx, cx - bedHalf + W * 0.03, H * 0.94, W * 0.15, H * 0.02, 2);
  ctx.fill();
  roundRectPath(ctx, cx + bedHalf - W * 0.18, H * 0.94, W * 0.15, H * 0.02, 2);
  ctx.fill();
  ctx.restore();
}

function drawBus(ctx, W, H, colors) {
  const body = colors.body;
  const glass = colors.glass || "#101820";
  const inset = W * 0.05;
  const bw = W - inset * 2;

  softShadow(ctx, W, H, (c) => roundRectPath(c, inset, H * 0.01, bw, H * 0.98, W * 0.09));

  const tw = W * 0.075;
  [[H * 0.09, 1], [H * 0.78, 1.1]].forEach(([y, sc]) => {
    tire(ctx, W, H, inset - tw * 0.5, y, tw, H * 0.10 * sc);
    tire(ctx, W, H, inset + bw - tw * 0.5, y, tw, H * 0.10 * sc);
  });

  const g = ctx.createLinearGradient(inset, 0, inset + bw, 0);
  g.addColorStop(0, shade(body, -0.48));
  g.addColorStop(0.2, shade(body, 0.22));
  g.addColorStop(0.45, body);
  g.addColorStop(0.78, shade(body, -0.2));
  g.addColorStop(1, shade(body, -0.5));
  ctx.fillStyle = g;
  roundRectPath(ctx, inset, H * 0.01, bw, H * 0.98, W * 0.09);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(1, W * 0.008);
  ctx.stroke();

  // 앞유리 + 측면 창 + 루프 해치
  ctx.fillStyle = glass;
  roundRectPath(ctx, inset + bw * 0.08, H * 0.035, bw * 0.84, H * 0.10, W * 0.04);
  ctx.fill();
  for (let i = 0; i < 7; i++) {
    const y = H * (0.17 + i * 0.107);
    roundRectPath(ctx, inset + bw * 0.005, y, bw * 0.10, H * 0.072, W * 0.012);
    ctx.fill();
    roundRectPath(ctx, inset + bw * 0.895, y, bw * 0.10, H * 0.072, W * 0.012);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  roundRectPath(ctx, inset + bw * 0.3, H * 0.20, bw * 0.4, H * 0.14, W * 0.03);
  ctx.fill();
  roundRectPath(ctx, inset + bw * 0.3, H * 0.62, bw * 0.4, H * 0.14, W * 0.03);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.20)";
  ctx.fillRect(inset + bw * 0.24, H * 0.02, bw * 0.08, H * 0.96);

  ctx.fillStyle = "#fff6d0";
  roundRectPath(ctx, inset + bw * 0.05, H * 0.015, bw * 0.16, H * 0.014, 2);
  ctx.fill();
  roundRectPath(ctx, inset + bw * 0.79, H * 0.015, bw * 0.16, H * 0.014, 2);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = "rgba(255,50,50,0.9)";
  ctx.shadowBlur = W * 0.1;
  ctx.fillStyle = "#ff3131";
  roundRectPath(ctx, inset + bw * 0.05, H * 0.968, bw * 0.16, H * 0.014, 2);
  ctx.fill();
  roundRectPath(ctx, inset + bw * 0.79, H * 0.968, bw * 0.16, H * 0.014, 2);
  ctx.fill();
  ctx.restore();
}

function drawBike(ctx, W, H, colors) {
  const body = colors.body;
  const cx = W / 2;

  softShadow(ctx, W, H, (c) => roundRectPath(c, W * 0.3, H * 0.06, W * 0.4, H * 0.88, W * 0.18));

  // 앞/뒤 타이어
  tire(ctx, W, H, cx - W * 0.10, H * 0.05, W * 0.20, H * 0.20);
  tire(ctx, W, H, cx - W * 0.12, H * 0.66, W * 0.24, H * 0.26);

  // 앞 포크 (금색) + 브레이크 디스크
  ctx.fillStyle = "#d8a93a";
  [-1, 1].forEach((d) => {
    roundRectPath(ctx, cx + d * W * 0.12 - (d > 0 ? 0 : W * 0.05), H * 0.20, W * 0.05, H * 0.10, W * 0.02);
    ctx.fill();
  });
  ctx.fillStyle = "rgba(210,215,225,0.75)";
  [-1, 1].forEach((d) => {
    ctx.beginPath();
    ctx.ellipse(cx + d * W * 0.135, H * 0.15, W * 0.035, H * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // 앞 펜더
  ctx.fillStyle = shade(body, -0.1);
  roundRectPath(ctx, cx - W * 0.075, H * 0.10, W * 0.15, H * 0.16, W * 0.05);
  ctx.fill();

  // 페어링 (앞이 넓고 허리로 갈수록 좁아진다)
  const fg = ctx.createLinearGradient(cx - W * 0.44, 0, cx + W * 0.44, 0);
  fg.addColorStop(0, shade(body, -0.42));
  fg.addColorStop(0.2, shade(body, 0.1));
  fg.addColorStop(0.42, shade(body, 0.34));
  fg.addColorStop(0.6, body);
  fg.addColorStop(0.85, shade(body, -0.22));
  fg.addColorStop(1, shade(body, -0.5));
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.16, H * 0.24);
  ctx.quadraticCurveTo(cx, H * 0.205, cx + W * 0.16, H * 0.24);
  ctx.bezierCurveTo(cx + W * 0.44, H * 0.32, cx + W * 0.42, H * 0.46, cx + W * 0.26, H * 0.58);
  ctx.quadraticCurveTo(cx, H * 0.63, cx - W * 0.26, H * 0.58);
  ctx.bezierCurveTo(cx - W * 0.42, H * 0.46, cx - W * 0.44, H * 0.32, cx - W * 0.16, H * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(1, W * 0.01);
  ctx.stroke();

  // 에어 인테이크 (검정)
  ctx.fillStyle = "#1a1c22";
  [-1, 1].forEach((d) => {
    roundRectPath(ctx, cx + d * W * 0.30 - (d > 0 ? 0 : W * 0.10), H * 0.36, W * 0.10, H * 0.14, W * 0.03);
    ctx.fill();
  });

  // 윈드스크린 (반투명)
  ctx.fillStyle = "rgba(226,238,255,0.42)";
  roundRectPath(ctx, cx - W * 0.15, H * 0.255, W * 0.30, H * 0.10, W * 0.07);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = Math.max(1, W * 0.008);
  ctx.stroke();

  // 미러
  ctx.fillStyle = "#22252c";
  [-1, 1].forEach((d) => {
    ctx.save();
    ctx.translate(cx + d * W * 0.36, H * 0.30);
    ctx.rotate(d * 0.4);
    roundRectPath(ctx, -W * 0.05, -H * 0.018, W * 0.10, H * 0.036, W * 0.02);
    ctx.fill();
    ctx.restore();
  });

  // 탱크 + 하이라이트
  ctx.fillStyle = shade(body, 0.16);
  roundRectPath(ctx, cx - W * 0.16, H * 0.50, W * 0.32, H * 0.16, W * 0.08);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.26)";
  roundRectPath(ctx, cx - W * 0.12, H * 0.515, W * 0.09, H * 0.12, W * 0.04);
  ctx.fill();

  // 라이더 (검정 슈트 + 헬멧)
  ctx.fillStyle = "#191b21";
  roundRectPath(ctx, cx - W * 0.20, H * 0.44, W * 0.40, H * 0.24, W * 0.14);
  ctx.fill();
  ctx.fillStyle = "#0f1116";
  ctx.beginPath();
  ctx.arc(cx, H * 0.44, W * 0.145, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(body, 0.1);
  ctx.beginPath();
  ctx.arc(cx, H * 0.435, W * 0.115, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  roundRectPath(ctx, cx - W * 0.07, H * 0.40, W * 0.14, H * 0.022, W * 0.01);
  ctx.fill();

  // 시트 + 테일
  ctx.fillStyle = "#171a20";
  roundRectPath(ctx, cx - W * 0.15, H * 0.64, W * 0.30, H * 0.14, W * 0.07);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.15, H * 0.72);
  ctx.lineTo(cx + W * 0.15, H * 0.72);
  ctx.quadraticCurveTo(cx + W * 0.07, H * 0.94, cx, H * 0.95);
  ctx.quadraticCurveTo(cx - W * 0.07, H * 0.94, cx - W * 0.15, H * 0.72);
  ctx.closePath();
  ctx.fill();

  // 배기 + 테일램프
  ctx.fillStyle = "#2b2e35";
  roundRectPath(ctx, cx - W * 0.06, H * 0.86, W * 0.12, H * 0.07, W * 0.03);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = "rgba(255,50,50,0.95)";
  ctx.shadowBlur = W * 0.14;
  ctx.fillStyle = "#ff2f2f";
  roundRectPath(ctx, cx - W * 0.05, H * 0.925, W * 0.10, H * 0.018, H * 0.009);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#fff8e2";
  roundRectPath(ctx, cx - W * 0.045, H * 0.045, W * 0.09, H * 0.016, H * 0.008);
  ctx.fill();
}

function drawCarTop(ctx, W, H, kind, colors) {
  if (kind === "bike") return drawBike(ctx, W, H, colors);
  if (kind === "truck") return drawFlatbed(ctx, W, H, colors);
  if (kind === "bus") return drawBus(ctx, W, H, colors);
  return drawSedan(ctx, W, H, kind, colors);
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
