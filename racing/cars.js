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
// 플레이어 차량 - 빨간 오토바이 고정
//  startSpeed : 시작 속도(km/h)      accel     : 초당 가속 배율
//  handling   : 초당 차선 이동 수
//  width      : 차폭(월드 단위, 도로 전체폭 4000 / 차선폭 444)
//  topAspect  : 위에서 봤을 때 길이/폭 비율
//  scoreMul   : 점수 배율
// ---------------------------------------------------------------------
const PLAYER_CAR = {
  id: "jet", name: "제트 R", tag: "오토바이", kind: "bike",
  desc: "폭이 절반, 조향은 가장 빠르다. 브레이크만 빠졌다.",
  startSpeed: 108, accel: 1.6, handling: 3.8,
  width: 148, topAspect: 2.6, scoreMul: 1.0,
  colors: { body: "#ff2f2f", glass: "#180f14" },
};

// 도로 위 일반 차량 - 크기별로 실루엣이 모두 다르다 (색은 무작위)
//  laneBias : -1(좌측 고속 차선 선호) ~ +1(우측 저속 차선 선호).
//             생략하면 차폭에서 자동 계산한다 (큰 차 = 우측)
const TRAFFIC_TYPES = [
  { id: "kei",     kind: "kei",     width: 236, topAspect: 1.75 },
  { id: "hatch",   kind: "hatch",   width: 262, topAspect: 2.00 },
  { id: "sedan",   kind: "sedan",   width: 288, topAspect: 2.30 },
  { id: "taxi",    kind: "taxi",    width: 288, topAspect: 2.30, color: "#f2c024" },
  { id: "coupe",   kind: "coupe",   width: 292, topAspect: 2.42, laneBias: -0.5 },
  { id: "muscle",  kind: "muscle",  width: 322, topAspect: 2.30, laneBias: -0.4 },
  { id: "wagon",   kind: "wagon",   width: 300, topAspect: 2.55 },
  { id: "suv",     kind: "suv",     width: 332, topAspect: 2.30 },
  { id: "van",     kind: "van",     width: 352, topAspect: 2.40 },
  { id: "pickup",  kind: "pickup",  width: 340, topAspect: 2.65 },
  { id: "cargo",   kind: "cargo",   width: 392, topAspect: 3.10 },
  { id: "boxtruck", kind: "box",    width: 402, topAspect: 3.40 },
  { id: "bus",     kind: "bus",     width: 380, topAspect: 3.90 },
  { id: "semi",    kind: "semi",    width: 404, topAspect: 5.20 },
  { id: "scooter", kind: "scooter", width: 152, topAspect: 2.30, laneBias: 0.85 },
];

// 플레이어(빨강)와 헷갈리지 않도록 붉은 계열은 제외한다
const TRAFFIC_COLORS = [
  "#d8dde3", "#3d4756", "#2f6fb5", "#e0a92c", "#4b8f5c",
  "#8a4fbf", "#20a2a6", "#b5b9c0", "#5a6472", "#c9a227",
];

// ---------------------------------------------------------------------
// 그리기: 모든 차량은 "위에서 본 모습" (앞쪽이 위)
//  차종마다 실루엣(코/어깨/꼬리 폭, 캐빈 위치, 축거)과 고유 장식이 다르다.
// ---------------------------------------------------------------------

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

// 차체 실루엣: 앞/뒤만 좁아지고 측면은 곧게 뻗는다
function bodyPath(ctx, W, H, s) {
  const cx = W / 2;
  const hw = (f) => (W * f) / 2;
  const yN = H * 0.02, yT = H * 0.985;
  const sh = H * (s.sh || 0.15);
  const he = H * (s.he || 0.82);
  ctx.beginPath();
  ctx.moveTo(cx - hw(s.nose), yN + H * 0.012);
  ctx.quadraticCurveTo(cx, yN - H * 0.005, cx + hw(s.nose), yN + H * 0.012);
  ctx.quadraticCurveTo(cx + hw(s.hip), sh * 0.55, cx + hw(s.hip), sh);
  ctx.lineTo(cx + hw(s.hip), he);
  ctx.quadraticCurveTo(cx + hw(s.hip), yT - H * 0.02, cx + hw(s.tail), yT);
  ctx.quadraticCurveTo(cx, yT + H * 0.01, cx - hw(s.tail), yT);
  ctx.quadraticCurveTo(cx - hw(s.hip), yT - H * 0.02, cx - hw(s.hip), he);
  ctx.lineTo(cx - hw(s.hip), sh);
  ctx.quadraticCurveTo(cx - hw(s.hip), sh * 0.55, cx - hw(s.nose), yN + H * 0.012);
  ctx.closePath();
}

// 유리: 위/아래 폭이 다른 사다리꼴
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

function tire(ctx, x, y, w, h) {
  ctx.fillStyle = "#14151a";
  roundRectPath(ctx, x, y, w, h, w * 0.28);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  roundRectPath(ctx, x + w * 0.28, y + h * 0.3, w * 0.44, h * 0.4, w * 0.2);
  ctx.fill();
}

function axlePair(ctx, W, H, hip, y, tw, th) {
  const cx = W / 2;
  tire(ctx, cx - hip - tw * 0.35, y, tw, th);
  tire(ctx, cx + hip - tw * 0.65, y, tw, th);
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

function glossGradient(ctx, body, x0, x1) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0.00, shade(body, -0.45));
  g.addColorStop(0.10, shade(body, -0.12));
  g.addColorStop(0.24, shade(body, 0.26));
  g.addColorStop(0.42, body);
  g.addColorStop(0.62, shade(body, 0.14));
  g.addColorStop(0.86, shade(body, -0.20));
  g.addColorStop(1.00, shade(body, -0.48));
  return g;
}

function tailBar(ctx, W, H, tail, y) {
  const cx = W / 2;
  ctx.save();
  ctx.shadowColor = "rgba(255,50,50,0.95)";
  ctx.shadowBlur = W * 0.14;
  ctx.fillStyle = "#ff2f2f";
  roundRectPath(ctx, cx - W * tail * 0.46, H * y, W * tail * 0.92, H * 0.022, H * 0.011);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(255,190,190,0.9)";
  roundRectPath(ctx, cx - W * tail * 0.44, H * (y + 0.004), W * tail * 0.2, H * 0.012, H * 0.006);
  ctx.fill();
  roundRectPath(ctx, cx + W * tail * 0.24, H * (y + 0.004), W * tail * 0.2, H * 0.012, H * 0.006);
  ctx.fill();
}

function tailLamps(ctx, W, H, tail, y) {
  const cx = W / 2;
  ctx.save();
  ctx.shadowColor = "rgba(255,50,50,0.95)";
  ctx.shadowBlur = W * 0.12;
  ctx.fillStyle = "#ff2f2f";
  [-1, 1].forEach((d) => {
    roundRectPath(ctx, cx + d * W * tail * 0.42 - (d > 0 ? W * 0.15 : 0), H * y, W * 0.15, H * 0.026, W * 0.02);
    ctx.fill();
  });
  ctx.restore();
}

// ---- 유니바디(승용/SUV/밴) 공통 ------------------------------------
//  nose/hip/tail : 폭, sh/he : 최대폭 구간, wsA~rwB : 유리/지붕 위치
//  cab : 캐빈 폭, fa/ra : 앞/뒤 축 위치, wheel : 타이어 크기
const BODY = {
  kei:    { nose: 0.82, hip: 0.86, tail: 0.86, sh: 0.10, he: 0.90, wsA: 0.17, wsB: 0.30, roofB: 0.72, rwB: 0.87, cab: 0.66, fa: 0.10, ra: 0.74, wheel: 0.080, quad: false },
  hatch:  { nose: 0.72, hip: 0.85, tail: 0.83, sh: 0.13, he: 0.86, wsA: 0.25, wsB: 0.40, roofB: 0.70, rwB: 0.88, cab: 0.62, fa: 0.13, ra: 0.70, wheel: 0.082 },
  sedan:  { nose: 0.66, hip: 0.84, tail: 0.78, wsA: 0.30, wsB: 0.46, roofB: 0.66, rwB: 0.80, cab: 0.58, fa: 0.15, ra: 0.70, wheel: 0.085, quad: true, chrome: true },
  taxi:   { nose: 0.66, hip: 0.84, tail: 0.78, wsA: 0.30, wsB: 0.46, roofB: 0.66, rwB: 0.80, cab: 0.58, fa: 0.15, ra: 0.70, wheel: 0.085, quad: true },
  coupe:  { nose: 0.62, hip: 0.86, tail: 0.74, wsA: 0.33, wsB: 0.48, roofB: 0.62, rwB: 0.86, cab: 0.56, fa: 0.16, ra: 0.72, wheel: 0.088 },
  muscle: { nose: 0.72, hip: 0.90, tail: 0.86, sh: 0.12, he: 0.86, wsA: 0.34, wsB: 0.50, roofB: 0.68, rwB: 0.80, cab: 0.60, fa: 0.14, ra: 0.70, wheel: 0.095 },
  wagon:  { nose: 0.68, hip: 0.85, tail: 0.84, sh: 0.14, he: 0.88, wsA: 0.27, wsB: 0.42, roofB: 0.80, rwB: 0.93, cab: 0.60, fa: 0.14, ra: 0.72, wheel: 0.084 },
  suv:    { nose: 0.80, hip: 0.88, tail: 0.86, sh: 0.11, he: 0.89, wsA: 0.22, wsB: 0.38, roofB: 0.78, rwB: 0.91, cab: 0.68, fa: 0.12, ra: 0.72, wheel: 0.105 },
  van:    { nose: 0.86, hip: 0.88, tail: 0.88, sh: 0.07, he: 0.92, wsA: 0.08, wsB: 0.22, roofB: 0.84, rwB: 0.95, cab: 0.74, fa: 0.10, ra: 0.76, wheel: 0.088 },
  sports: { nose: 0.58, hip: 0.88, tail: 0.76, sh: 0.17, he: 0.80, wsA: 0.38, wsB: 0.52, roofB: 0.66, rwB: 0.80, cab: 0.56, fa: 0.17, ra: 0.71, wheel: 0.095 },
};

const EXTRAS = {
  // 지붕 랙 (SUV / 왜건)
  rails(ctx, W, H, sp) {
    const cx = W / 2;
    ctx.fillStyle = "rgba(28,30,36,0.8)";
    [-1, 1].forEach((d) => {
      roundRectPath(ctx, cx + d * W * sp.cab * 0.40 - (d > 0 ? 0 : W * 0.035), H * (sp.wsB + 0.01), W * 0.035, H * (sp.roofB - sp.wsB - 0.02), W * 0.014);
      ctx.fill();
    });
    ctx.fillStyle = "rgba(28,30,36,0.5)";
    [0.28, 0.72].forEach((t) => {
      const y = H * (sp.wsB + (sp.roofB - sp.wsB) * t);
      ctx.fillRect(cx - W * sp.cab * 0.34, y, W * sp.cab * 0.68, H * 0.010);
    });
  },
  // 루프 사인 (택시)
  roofSign(ctx, W, H, sp) {
    const cx = W / 2;
    ctx.save();
    ctx.shadowColor = "rgba(255,220,120,0.9)";
    ctx.shadowBlur = W * 0.12;
    ctx.fillStyle = "#fff3c4";
    roundRectPath(ctx, cx - W * 0.13, H * (sp.wsB + 0.02), W * 0.26, H * 0.045, W * 0.02);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(40,40,46,0.85)";
    roundRectPath(ctx, cx - W * 0.10, H * (sp.wsB + 0.03), W * 0.20, H * 0.02, W * 0.01);
    ctx.fill();
    // 측면 체커
    ctx.fillStyle = "rgba(30,32,38,0.75)";
    for (let i = 0; i < 8; i++) {
      const y = H * (sp.wsB + 0.06 + i * 0.028);
      if (y > H * (sp.rwB - 0.02)) break;
      ctx.fillRect(cx - W * sp.hip * 0.5 + (i % 2 ? 0 : W * 0.03), y, W * 0.03, H * 0.024);
      ctx.fillRect(cx + W * sp.hip * 0.5 - W * 0.06 + (i % 2 ? 0 : W * 0.03), y, W * 0.03, H * 0.024);
    }
  },
  // 보닛 스쿠프 + 레이싱 스트라이프 (머슬)
  scoop(ctx, W, H, sp) {
    const cx = W / 2;
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    [[0.03, sp.wsA - 0.03], [sp.wsB + 0.01, sp.roofB - sp.wsB - 0.02], [sp.rwB + 0.01, 0.92 - sp.rwB]]
      .forEach(([y, h]) => {
        ctx.fillRect(cx - W * 0.115, H * y, W * 0.075, H * h);
        ctx.fillRect(cx + W * 0.04, H * y, W * 0.075, H * h);
      });
    ctx.fillStyle = "#1d1f25";
    roundRectPath(ctx, cx - W * 0.10, H * (sp.wsA - 0.12), W * 0.20, H * 0.09, W * 0.02);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    roundRectPath(ctx, cx - W * 0.08, H * (sp.wsA - 0.11), W * 0.16, H * 0.03, W * 0.015);
    ctx.fill();
  },
  // 리어 스포일러 (쿠페 / 스포츠카)
  spoiler(ctx, W, H, sp) {
    const cx = W / 2;
    ctx.fillStyle = "rgba(24,26,32,0.9)";
    roundRectPath(ctx, cx - W * sp.tail * 0.52, H * 0.895, W * sp.tail * 1.04, H * 0.035, W * 0.02);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(cx - W * sp.tail * 0.5, H * 0.898, W * sp.tail, H * 0.008);
  },
  // 루프 벤트 + 슬라이딩 도어 라인 (밴)
  vanKit(ctx, W, H, sp) {
    const cx = W / 2;
    ctx.fillStyle = "rgba(230,234,240,0.85)";
    roundRectPath(ctx, cx - W * 0.11, H * (sp.wsB + 0.03), W * 0.22, H * 0.07, W * 0.02);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = Math.max(1, W * 0.007);
    [-1, 1].forEach((d) => {
      ctx.beginPath();
      ctx.moveTo(cx + d * W * sp.hip * 0.5, H * 0.42);
      ctx.lineTo(cx + d * W * sp.hip * 0.36, H * 0.42);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + d * W * sp.hip * 0.5, H * 0.66);
      ctx.lineTo(cx + d * W * sp.hip * 0.36, H * 0.66);
      ctx.stroke();
    });
  },
};

function drawUnibody(ctx, W, H, kind, colors) {
  const sp = BODY[kind] || BODY.sedan;
  const body = colors.body;
  const glass = colors.glass || "#16283c";
  const cx = W / 2;
  const hip = (W * sp.hip) / 2;

  softShadow(ctx, W, H, (c) => bodyPath(c, W, H, sp));

  // 바퀴
  const tw = W * sp.wheel, th = H * (kind === "kei" ? 0.13 : 0.15);
  axlePair(ctx, W, H, hip, H * sp.fa, tw, th);
  axlePair(ctx, W, H, hip, H * sp.ra, tw, th * 1.03);

  // 차체
  bodyPath(ctx, W, H, sp);
  ctx.fillStyle = glossGradient(ctx, body, cx - hip, cx + hip);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = Math.max(1, W * 0.008);
  ctx.stroke();

  ctx.save();
  bodyPath(ctx, W, H, sp);
  ctx.clip();
  // 하이라이트 2줄
  [[0.30, 0.055, 0.30], [0.64, 0.03, 0.16]].forEach(([px, pw, a]) => {
    const hg = ctx.createLinearGradient(0, 0, 0, H);
    hg.addColorStop(0, "rgba(255,255,255,0)");
    hg.addColorStop(0.25, `rgba(255,255,255,${a})`);
    hg.addColorStop(0.75, `rgba(255,255,255,${a * 0.7})`);
    hg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hg;
    ctx.fillRect(W * px, 0, W * pw, H);
  });
  // 보닛 크리스 / 도어 라인
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = Math.max(1, W * 0.006);
  [-1, 1].forEach((d) => {
    ctx.beginPath();
    ctx.moveTo(cx + d * W * 0.13, H * 0.05);
    ctx.lineTo(cx + d * W * 0.17, H * (sp.wsA - 0.01));
    ctx.stroke();
    [sp.wsB, sp.roofB].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(cx + d * hip, H * y);
      ctx.lineTo(cx + d * hip * 0.7, H * y);
      ctx.stroke();
    });
  });
  ctx.restore();

  // 루프 패널
  ctx.fillStyle = shade(body, 0.08);
  roundRectPath(ctx, cx - (W * sp.cab) / 2, H * (sp.wsB - 0.012), W * sp.cab, H * (sp.roofB - sp.wsB + 0.024), W * 0.06);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  roundRectPath(ctx, cx - W * sp.cab * 0.40, H * (sp.wsB + 0.004), W * sp.cab * 0.24, H * (sp.roofB - sp.wsB - 0.008), W * 0.03);
  ctx.fill();

  // 앞/뒷유리
  const gl = ctx.createLinearGradient(cx - W * sp.cab * 0.5, 0, cx + W * sp.cab * 0.5, 0);
  gl.addColorStop(0, shade(glass, 0.34));
  gl.addColorStop(0.35, shade(glass, 0.06));
  gl.addColorStop(1, shade(glass, -0.25));
  ctx.fillStyle = gl;
  glassPath(ctx, W, H, sp.wsA, sp.wsB, sp.cab * 0.98, sp.cab * 0.74);
  ctx.fill();
  glassPath(ctx, W, H, sp.roofB, sp.rwB, sp.cab * 0.98, sp.cab * 0.72);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  glassPath(ctx, W, H, sp.wsA + 0.012, sp.wsB - 0.008, sp.cab * 0.34, sp.cab * 0.24);
  ctx.fill();
  ctx.strokeStyle = sp.chrome ? "rgba(236,242,252,0.6)" : "rgba(210,218,232,0.34)";
  ctx.lineWidth = Math.max(1, W * 0.009);
  glassPath(ctx, W, H, sp.wsA, sp.wsB, sp.cab * 0.98, sp.cab * 0.74);
  ctx.stroke();
  glassPath(ctx, W, H, sp.roofB, sp.rwB, sp.cab * 0.98, sp.cab * 0.72);
  ctx.stroke();

  // 사이드미러
  ctx.fillStyle = shade(body, -0.28);
  [-1, 1].forEach((d) => {
    roundRectPath(ctx, cx + d * (hip + W * 0.02) - (d > 0 ? 0 : W * 0.07), H * (sp.wsA + 0.005), W * 0.07, H * 0.032, W * 0.02);
    ctx.fill();
  });

  // 헤드램프 (세단/택시는 얇은 2줄, 나머지는 1줄) + 그릴
  const lw = W * 0.15, lh = H * 0.013;
  [-1, 1].forEach((d) => {
    const x = d < 0 ? cx - W * 0.27 : cx + W * 0.12;
    lampSlash(ctx, x, H * 0.04, lw, lh, "#fff8e2", "rgba(255,240,190,0.9)");
    if (sp.quad) lampSlash(ctx, x + lw * 0.12, H * 0.064, lw * 0.76, lh, "#fff8e2", "rgba(255,240,190,0.7)");
  });
  ctx.fillStyle = "rgba(22,24,30,0.8)";
  roundRectPath(ctx, cx - W * 0.075, H * 0.028, W * 0.15, H * 0.038, W * 0.025);
  ctx.fill();
  ctx.strokeStyle = "rgba(220,225,235,0.5)";
  ctx.lineWidth = Math.max(1, W * 0.006);
  ctx.stroke();

  // 리어
  if (kind === "kei" || kind === "van" || kind === "suv" || kind === "wagon") {
    tailLamps(ctx, W, H, sp.tail, 0.93);
  } else {
    tailBar(ctx, W, H, sp.tail, 0.935);
  }
  ctx.fillStyle = "#2a2d34";
  [-1, 1].forEach((d) => {
    roundRectPath(ctx, cx + d * W * 0.18 - (d > 0 ? 0 : W * 0.09), H * 0.968, W * 0.09, H * 0.016, W * 0.01);
    ctx.fill();
  });

  if (kind === "suv" || kind === "wagon") EXTRAS.rails(ctx, W, H, sp);
  if (kind === "taxi") EXTRAS.roofSign(ctx, W, H, sp);
  if (kind === "muscle") EXTRAS.scoop(ctx, W, H, sp);
  if (kind === "coupe" || kind === "sports") EXTRAS.spoiler(ctx, W, H, sp);
  if (kind === "van") EXTRAS.vanKit(ctx, W, H, sp);
  if (kind !== "kei" && kind !== "van") {
    ctx.fillStyle = shade(body, -0.35);
    roundRectPath(ctx, cx - W * 0.018, H * (sp.roofB - 0.03), W * 0.036, H * 0.05, W * 0.012);
    ctx.fill();   // 샤크핀
  }
}

// ---- 캡 + 적재함 계열 ----------------------------------------------
function truckCab(ctx, W, H, colors, cabHalf, cabEnd, mirrors) {
  const cx = W / 2, body = colors.body, glass = colors.glass || "#101820";
  ctx.fillStyle = glossGradient(ctx, body, cx - cabHalf, cx + cabHalf);
  roundRectPath(ctx, cx - cabHalf, H * 0.012, cabHalf * 2, cabEnd - H * 0.012, W * 0.06);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(1, W * 0.008);
  ctx.stroke();

  const wsTop = H * 0.045, wsBot = cabEnd * 0.55;
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(cx - cabHalf * 0.74, wsBot);
  ctx.lineTo(cx + cabHalf * 0.74, wsBot);
  ctx.lineTo(cx + cabHalf * 0.62, wsTop);
  ctx.lineTo(cx - cabHalf * 0.62, wsTop);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.moveTo(cx - cabHalf * 0.74, wsBot);
  ctx.lineTo(cx - cabHalf * 0.28, wsBot);
  ctx.lineTo(cx - cabHalf * 0.34, wsTop);
  ctx.lineTo(cx - cabHalf * 0.62, wsTop);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(body, 0.12);
  roundRectPath(ctx, cx - cabHalf * 0.7, wsBot + H * 0.006, cabHalf * 1.4, cabEnd - wsBot - H * 0.018, W * 0.04);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  roundRectPath(ctx, cx - cabHalf * 0.6, wsBot + H * 0.012, cabHalf * 0.36, cabEnd - wsBot - H * 0.03, W * 0.03);
  ctx.fill();

  if (mirrors) {
    ctx.fillStyle = "#e8ebef";
    [-1, 1].forEach((d) => {
      roundRectPath(ctx, cx + d * (cabHalf + W * 0.045) - (d > 0 ? 0 : W * 0.09), cabEnd * 0.38, W * 0.09, H * 0.038, W * 0.015);
      ctx.fill();
      ctx.fillStyle = "#2a2d34";
      ctx.fillRect(cx + d * cabHalf - (d > 0 ? 0 : W * 0.05), cabEnd * 0.42, W * 0.05, H * 0.010);
      ctx.fillStyle = "#e8ebef";
    });
  }
  ctx.fillStyle = "#fff6d0";
  roundRectPath(ctx, cx - cabHalf + W * 0.03, H * 0.016, W * 0.15, H * 0.018, 2);
  ctx.fill();
  roundRectPath(ctx, cx + cabHalf - W * 0.18, H * 0.016, W * 0.15, H * 0.018, 2);
  ctx.fill();
}

function metalDeck(ctx, W, H, x, y, w, h, ribs) {
  ctx.fillStyle = "#7c828b";
  roundRectPath(ctx, x, y, w, h, W * 0.03);
  ctx.fill();
  const dg = ctx.createLinearGradient(x, 0, x + w, 0);
  dg.addColorStop(0, "rgba(255,255,255,0.18)");
  dg.addColorStop(0.35, "rgba(255,255,255,0.06)");
  dg.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = dg;
  roundRectPath(ctx, x, y, w, h, W * 0.03);
  ctx.fill();
  ctx.strokeStyle = "rgba(40,44,52,0.45)";
  ctx.lineWidth = Math.max(1, W * 0.007);
  for (let i = 1; i < ribs; i++) {
    const yy = y + (h * i) / ribs;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.04, yy);
    ctx.lineTo(x + w * 0.96, yy);
    ctx.stroke();
  }
}

// 픽업: 캡 + 짧은 적재함
function drawPickup(ctx, W, H, colors) {
  const cx = W / 2, body = colors.body;
  const cabHalf = W * 0.43, bedHalf = W * 0.45, cabEnd = H * 0.42;
  softShadow(ctx, W, H, (c) => roundRectPath(c, cx - bedHalf, H * 0.01, bedHalf * 2, H * 0.98, W * 0.06));
  const tw = W * 0.09;
  axlePair(ctx, W, H, cabHalf, H * 0.12, tw, H * 0.13);
  axlePair(ctx, W, H, bedHalf, H * 0.68, tw, H * 0.14);

  metalDeck(ctx, W, H, cx - bedHalf * 0.86, cabEnd + H * 0.02, bedHalf * 1.72, H * 0.94 - cabEnd, 8);
  ctx.fillStyle = glossGradient(ctx, body, cx - bedHalf, cx + bedHalf);
  const railW = W * 0.085;
  roundRectPath(ctx, cx - bedHalf, cabEnd + H * 0.01, railW, H * 0.96 - cabEnd, W * 0.02);
  ctx.fill();
  roundRectPath(ctx, cx + bedHalf - railW, cabEnd + H * 0.01, railW, H * 0.96 - cabEnd, W * 0.02);
  ctx.fill();
  roundRectPath(ctx, cx - bedHalf, H * 0.915, bedHalf * 2, H * 0.055, W * 0.02);
  ctx.fill();
  truckCab(ctx, W, H, colors, cabHalf, cabEnd, true);
  tailLamps(ctx, W, H, 0.9, 0.925);
}

// 카고 트럭(포터형): 짧은 캡 + 긴 개방형 적재함
function drawCargo(ctx, W, H, colors) {
  const cx = W / 2, body = colors.body;
  const cabHalf = W * 0.44, bedHalf = W * 0.47, cabEnd = H * 0.30;
  softShadow(ctx, W, H, (c) => roundRectPath(c, cx - bedHalf, H * 0.01, bedHalf * 2, H * 0.98, W * 0.05));
  const tw = W * 0.085;
  axlePair(ctx, W, H, cabHalf, H * 0.12, tw, H * 0.12);
  tire(ctx, cx - bedHalf - tw * 0.3, H * 0.66, tw * 1.25, H * 0.14);
  tire(ctx, cx + bedHalf - tw * 0.95, H * 0.66, tw * 1.25, H * 0.14);

  metalDeck(ctx, W, H, cx - bedHalf, cabEnd + H * 0.01, bedHalf * 2, H * 0.965 - cabEnd, 11);
  ctx.fillStyle = glossGradient(ctx, body, cx - bedHalf, cx + bedHalf);
  const railW = W * 0.075;
  roundRectPath(ctx, cx - bedHalf, cabEnd + H * 0.01, railW, H * 0.965 - cabEnd, W * 0.02);
  ctx.fill();
  roundRectPath(ctx, cx + bedHalf - railW, cabEnd + H * 0.01, railW, H * 0.965 - cabEnd, W * 0.02);
  ctx.fill();
  roundRectPath(ctx, cx - bedHalf, H * 0.905, bedHalf * 2, H * 0.06, W * 0.02);
  ctx.fill();
  truckCab(ctx, W, H, colors, cabHalf, cabEnd, true);
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

// 탑차: 캡 + 높은 박스
function drawBoxTruck(ctx, W, H, colors) {
  const cx = W / 2, body = colors.body;
  const cabHalf = W * 0.42, boxHalf = W * 0.47, cabEnd = H * 0.24;
  softShadow(ctx, W, H, (c) => roundRectPath(c, cx - boxHalf, H * 0.01, boxHalf * 2, H * 0.98, W * 0.05));
  const tw = W * 0.085;
  axlePair(ctx, W, H, cabHalf, H * 0.10, tw, H * 0.11);
  tire(ctx, cx - boxHalf - tw * 0.3, H * 0.68, tw * 1.25, H * 0.13);
  tire(ctx, cx + boxHalf - tw * 0.95, H * 0.68, tw * 1.25, H * 0.13);

  // 박스 (밝은 패널 + 리브 + 뒷문)
  const bg = ctx.createLinearGradient(cx - boxHalf, 0, cx + boxHalf, 0);
  bg.addColorStop(0, "#9aa0a8");
  bg.addColorStop(0.25, "#eef1f4");
  bg.addColorStop(0.55, "#dfe3e8");
  bg.addColorStop(1, "#8e949c");
  ctx.fillStyle = bg;
  roundRectPath(ctx, cx - boxHalf, cabEnd + H * 0.008, boxHalf * 2, H * 0.975 - cabEnd, W * 0.03);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = Math.max(1, W * 0.008);
  ctx.stroke();
  ctx.strokeStyle = "rgba(90,96,104,0.35)";
  ctx.lineWidth = Math.max(1, W * 0.006);
  for (let i = 1; i < 12; i++) {
    const y = cabEnd + (H * 0.975 - cabEnd) * (i / 12);
    ctx.beginPath();
    ctx.moveTo(cx - boxHalf * 0.94, y);
    ctx.lineTo(cx + boxHalf * 0.94, y);
    ctx.stroke();
  }
  // 뒷문 + 차체색 띠
  ctx.fillStyle = glossGradient(ctx, body, cx - boxHalf, cx + boxHalf);
  ctx.fillRect(cx - boxHalf, cabEnd + H * 0.02, boxHalf * 2, H * 0.045);
  ctx.fillStyle = "rgba(120,126,134,0.5)";
  ctx.fillRect(cx - boxHalf * 0.9, H * 0.9, boxHalf * 1.8, H * 0.06);
  ctx.strokeStyle = "rgba(60,64,70,0.6)";
  ctx.beginPath();
  ctx.moveTo(cx, H * 0.9);
  ctx.lineTo(cx, H * 0.96);
  ctx.stroke();
  truckCab(ctx, W, H, colors, cabHalf, cabEnd, true);
  tailLamps(ctx, W, H, 0.92, 0.955);
}

// 세미 트레일러: 트랙터 + 연결 간격 + 긴 트레일러
function drawSemi(ctx, W, H, colors) {
  const cx = W / 2, body = colors.body;
  const cabHalf = W * 0.42, trHalf = W * 0.47;
  const cabEnd = H * 0.17, trStart = H * 0.235;
  softShadow(ctx, W, H, (c) => roundRectPath(c, cx - trHalf, H * 0.01, trHalf * 2, H * 0.98, W * 0.04));
  const tw = W * 0.085;
  axlePair(ctx, W, H, cabHalf, H * 0.07, tw, H * 0.075);
  [0.18, 0.80, 0.88].forEach((y) => {
    tire(ctx, cx - trHalf - tw * 0.3, H * y, tw * 1.3, H * 0.085);
    tire(ctx, cx + trHalf - tw, H * y, tw * 1.3, H * 0.085);
  });
  // 트랙터 섀시
  ctx.fillStyle = "#2b2e35";
  ctx.fillRect(cx - W * 0.16, cabEnd, W * 0.32, trStart - cabEnd + H * 0.01);
  ctx.fillStyle = "#494e57";
  ctx.beginPath();
  ctx.arc(cx, trStart, W * 0.07, 0, Math.PI * 2);
  ctx.fill();
  // 트레일러
  const tg = ctx.createLinearGradient(cx - trHalf, 0, cx + trHalf, 0);
  tg.addColorStop(0, "#8f959d");
  tg.addColorStop(0.22, "#e8ebef");
  tg.addColorStop(0.55, "#d5d9de");
  tg.addColorStop(1, "#868c94");
  ctx.fillStyle = tg;
  roundRectPath(ctx, cx - trHalf, trStart, trHalf * 2, H * 0.975 - trStart, W * 0.025);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = Math.max(1, W * 0.007);
  ctx.stroke();
  ctx.strokeStyle = "rgba(95,100,108,0.35)";
  for (let i = 1; i < 18; i++) {
    const y = trStart + (H * 0.975 - trStart) * (i / 18);
    ctx.beginPath();
    ctx.moveTo(cx - trHalf * 0.95, y);
    ctx.lineTo(cx + trHalf * 0.95, y);
    ctx.stroke();
  }
  ctx.fillStyle = glossGradient(ctx, body, cx - trHalf, cx + trHalf);
  ctx.fillRect(cx - trHalf, trStart + H * 0.012, trHalf * 2, H * 0.03);
  // 뒷문
  ctx.fillStyle = "rgba(120,126,134,0.5)";
  ctx.fillRect(cx - trHalf * 0.92, H * 0.925, trHalf * 1.84, H * 0.05);
  truckCab(ctx, W, H, colors, cabHalf, cabEnd, true);
  tailLamps(ctx, W, H, 0.92, 0.965);
}

function drawBus(ctx, W, H, colors) {
  const body = colors.body;
  const glass = colors.glass || "#101820";
  const inset = W * 0.05;
  const bw = W - inset * 2;

  softShadow(ctx, W, H, (c) => roundRectPath(c, inset, H * 0.01, bw, H * 0.98, W * 0.09));
  const tw = W * 0.075;
  [[H * 0.09, 1], [H * 0.78, 1.1]].forEach(([y, sc]) => {
    tire(ctx, inset - tw * 0.5, y, tw, H * 0.10 * sc);
    tire(ctx, inset + bw - tw * 0.5, y, tw, H * 0.10 * sc);
  });
  ctx.fillStyle = glossGradient(ctx, body, inset, inset + bw);
  roundRectPath(ctx, inset, H * 0.01, bw, H * 0.98, W * 0.09);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(1, W * 0.008);
  ctx.stroke();
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
  tailLamps(ctx, W, H, 0.9, 0.96);
}

// ---- 2륜 ------------------------------------------------------------
function drawBike(ctx, W, H, colors) {
  const body = colors.body;
  const cx = W / 2;

  softShadow(ctx, W, H, (c) => roundRectPath(c, W * 0.3, H * 0.06, W * 0.4, H * 0.88, W * 0.18));
  tire(ctx, cx - W * 0.10, H * 0.05, W * 0.20, H * 0.20);
  tire(ctx, cx - W * 0.12, H * 0.66, W * 0.24, H * 0.26);

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
  ctx.fillStyle = shade(body, -0.1);
  roundRectPath(ctx, cx - W * 0.075, H * 0.10, W * 0.15, H * 0.16, W * 0.05);
  ctx.fill();

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
  ctx.fillStyle = "#1a1c22";
  [-1, 1].forEach((d) => {
    roundRectPath(ctx, cx + d * W * 0.30 - (d > 0 ? 0 : W * 0.10), H * 0.36, W * 0.10, H * 0.14, W * 0.03);
    ctx.fill();
  });
  ctx.fillStyle = "rgba(226,238,255,0.42)";
  roundRectPath(ctx, cx - W * 0.15, H * 0.255, W * 0.30, H * 0.10, W * 0.07);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = Math.max(1, W * 0.008);
  ctx.stroke();
  ctx.fillStyle = "#22252c";
  [-1, 1].forEach((d) => {
    ctx.save();
    ctx.translate(cx + d * W * 0.36, H * 0.30);
    ctx.rotate(d * 0.4);
    roundRectPath(ctx, -W * 0.05, -H * 0.018, W * 0.10, H * 0.036, W * 0.02);
    ctx.fill();
    ctx.restore();
  });
  ctx.fillStyle = shade(body, 0.16);
  roundRectPath(ctx, cx - W * 0.16, H * 0.50, W * 0.32, H * 0.16, W * 0.08);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.26)";
  roundRectPath(ctx, cx - W * 0.12, H * 0.515, W * 0.09, H * 0.12, W * 0.04);
  ctx.fill();
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

// 스쿠터: 둥근 전면 실드 + 평평한 발판 + 뒤 배달 박스
function drawScooter(ctx, W, H, colors) {
  const body = colors.body;
  const cx = W / 2;
  softShadow(ctx, W, H, (c) => roundRectPath(c, W * 0.28, H * 0.08, W * 0.44, H * 0.84, W * 0.2));
  tire(ctx, cx - W * 0.10, H * 0.06, W * 0.20, H * 0.17);
  tire(ctx, cx - W * 0.11, H * 0.72, W * 0.22, H * 0.20);

  // 전면 실드
  const fg = ctx.createLinearGradient(cx - W * 0.35, 0, cx + W * 0.35, 0);
  fg.addColorStop(0, shade(body, -0.4));
  fg.addColorStop(0.35, shade(body, 0.3));
  fg.addColorStop(0.65, body);
  fg.addColorStop(1, shade(body, -0.45));
  ctx.fillStyle = fg;
  roundRectPath(ctx, cx - W * 0.30, H * 0.16, W * 0.60, H * 0.24, W * 0.16);
  ctx.fill();
  ctx.fillStyle = "rgba(226,238,255,0.4)";
  roundRectPath(ctx, cx - W * 0.20, H * 0.175, W * 0.40, H * 0.09, W * 0.06);
  ctx.fill();
  ctx.fillStyle = "#fff8e2";
  roundRectPath(ctx, cx - W * 0.09, H * 0.20, W * 0.18, H * 0.03, W * 0.014);
  ctx.fill();
  // 핸들바 + 미러
  ctx.fillStyle = "#2a2d34";
  roundRectPath(ctx, cx - W * 0.42, H * 0.30, W * 0.84, H * 0.035, W * 0.017);
  ctx.fill();
  [-1, 1].forEach((d) => {
    ctx.fillStyle = "#22252c";
    ctx.beginPath();
    ctx.ellipse(cx + d * W * 0.42, H * 0.275, W * 0.05, H * 0.022, d * 0.3, 0, Math.PI * 2);
    ctx.fill();
  });
  // 발판 + 시트
  ctx.fillStyle = shade(body, -0.2);
  roundRectPath(ctx, cx - W * 0.16, H * 0.40, W * 0.32, H * 0.22, W * 0.05);
  ctx.fill();
  ctx.fillStyle = "#1a1d23";
  roundRectPath(ctx, cx - W * 0.15, H * 0.56, W * 0.30, H * 0.16, W * 0.07);
  ctx.fill();
  // 라이더
  ctx.fillStyle = "#20242c";
  roundRectPath(ctx, cx - W * 0.19, H * 0.38, W * 0.38, H * 0.22, W * 0.13);
  ctx.fill();
  ctx.fillStyle = "#0f1116";
  ctx.beginPath();
  ctx.arc(cx, H * 0.40, W * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  roundRectPath(ctx, cx - W * 0.065, H * 0.365, W * 0.13, H * 0.02, W * 0.01);
  ctx.fill();
  // 배달 박스
  ctx.fillStyle = "#d9dde3";
  roundRectPath(ctx, cx - W * 0.19, H * 0.70, W * 0.38, H * 0.20, W * 0.04);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(1, W * 0.01);
  ctx.stroke();
  ctx.fillStyle = shade(body, 0.1);
  ctx.fillRect(cx - W * 0.19, H * 0.735, W * 0.38, H * 0.04);
  ctx.save();
  ctx.shadowColor = "rgba(255,50,50,0.95)";
  ctx.shadowBlur = W * 0.12;
  ctx.fillStyle = "#ff2f2f";
  roundRectPath(ctx, cx - W * 0.06, H * 0.915, W * 0.12, H * 0.018, H * 0.009);
  ctx.fill();
  ctx.restore();
}

function drawCarTop(ctx, W, H, kind, colors) {
  switch (kind) {
    case "bike": return drawBike(ctx, W, H, colors);
    case "scooter": return drawScooter(ctx, W, H, colors);
    case "pickup": return drawPickup(ctx, W, H, colors);
    case "cargo": return drawCargo(ctx, W, H, colors);
    case "box": return drawBoxTruck(ctx, W, H, colors);
    case "semi": return drawSemi(ctx, W, H, colors);
    case "bus": return drawBus(ctx, W, H, colors);
    default: return drawUnibody(ctx, W, H, kind, colors);
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
