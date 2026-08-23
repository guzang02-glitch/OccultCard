// =====================================================================
// 배경(씬) 리소스 - 탑다운
//  - 도로 양옆 지면 색, 노면 색, 갓길/차선 색, 도로변 오브젝트를 정의한다
//  - 오브젝트는 모두 "위에서 본" 모습으로 캔버스에서 생성한다
//  - 씬은 일정 시간마다 교체되고, 그 간격은 점점 짧아진다
// =====================================================================

function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function topShadow(ctx, drawShape) {
  ctx.save();
  ctx.translate(6, 8);
  ctx.filter = "blur(4px)";
  ctx.fillStyle = "rgba(0,0,0,0.38)";
  drawShape(ctx);
  ctx.restore();
}

// --- 도로변 오브젝트 (탑다운) ----------------------------------------
function objTreeTop(c1, c2) {
  const S = 170, cv = makeCanvas(S, S), ctx = cv.getContext("2d");
  const rng = makeRng(3);
  const blob = (cx, cy, r) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); };
  topShadow(ctx, (c) => { c.beginPath(); c.arc(S / 2, S / 2, S * 0.36, 0, Math.PI * 2); c.fill(); });
  ctx.fillStyle = c2;
  blob(S / 2, S / 2, S * 0.36);
  ctx.fillStyle = c1;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    blob(S / 2 + Math.cos(a) * S * 0.16, S / 2 + Math.sin(a) * S * 0.16, S * (0.13 + rng() * 0.05));
  }
  blob(S * 0.44, S * 0.44, S * 0.15);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  blob(S * 0.42, S * 0.40, S * 0.10);
  return { cv, worldW: 820 };
}

function objPineTop(c1, c2, snow) {
  const S = 160, cv = makeCanvas(S, S), ctx = cv.getContext("2d");
  const star = (ctx2, r1, r2, n) => {
    ctx2.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 ? r2 : r1;
      ctx2.lineTo(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r);
    }
    ctx2.closePath();
    ctx2.fill();
  };
  topShadow(ctx, (c) => { c.beginPath(); c.arc(S / 2, S / 2, S * 0.32, 0, Math.PI * 2); c.fill(); });
  ctx.fillStyle = c2; star(ctx, S * 0.36, S * 0.2, 9);
  ctx.fillStyle = c1; star(ctx, S * 0.24, S * 0.13, 9);
  ctx.fillStyle = snow ? "#ffffff" : "#3a2c1d";
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.06, 0, Math.PI * 2); ctx.fill();
  if (snow) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    star(ctx, S * 0.16, S * 0.09, 9);
  }
  return { cv, worldW: 700 };
}

function objPalmTop(c1, c2) {
  const S = 180, cv = makeCanvas(S, S), ctx = cv.getContext("2d");
  topShadow(ctx, (c) => { c.beginPath(); c.arc(S / 2, S / 2, S * 0.3, 0, Math.PI * 2); c.fill(); });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    ctx.fillStyle = i % 2 ? c2 : c1;
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(S * 0.22, 0, S * 0.22, S * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "#6b5334";
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.055, 0, Math.PI * 2); ctx.fill();
  return { cv, worldW: 880 };
}

function objCactusTop(c1, c2) {
  const S = 120, cv = makeCanvas(S, S), ctx = cv.getContext("2d");
  const arms = (c) => {
    roundRectPath(c, S * 0.42, S * 0.18, S * 0.16, S * 0.64, S * 0.08);
    c.fill();
    roundRectPath(c, S * 0.18, S * 0.42, S * 0.64, S * 0.16, S * 0.08);
    c.fill();
  };
  topShadow(ctx, arms);
  ctx.fillStyle = c1; arms(ctx);
  ctx.fillStyle = c2;
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.11, 0, Math.PI * 2); ctx.fill();
  return { cv, worldW: 420 };
}

function objRockTop(c1, c2) {
  const S = 150, cv = makeCanvas(S, S * 0.8), ctx = cv.getContext("2d");
  const shape = (c) => {
    c.beginPath();
    c.moveTo(S * 0.14, S * 0.46);
    c.lineTo(S * 0.34, S * 0.14);
    c.lineTo(S * 0.72, S * 0.12);
    c.lineTo(S * 0.90, S * 0.44);
    c.lineTo(S * 0.62, S * 0.70);
    c.lineTo(S * 0.26, S * 0.66);
    c.closePath();
    c.fill();
  };
  topShadow(ctx, shape);
  ctx.fillStyle = c1; shape(ctx);
  ctx.fillStyle = c2;
  ctx.beginPath();
  ctx.moveTo(S * 0.34, S * 0.14);
  ctx.lineTo(S * 0.72, S * 0.12);
  ctx.lineTo(S * 0.62, S * 0.42);
  ctx.lineTo(S * 0.36, S * 0.40);
  ctx.closePath();
  ctx.fill();
  return { cv, worldW: 560 };
}

function objBuildingTop(c1, c2, accent) {
  const S = 260, cv = makeCanvas(S, S * 1.15), ctx = cv.getContext("2d");
  const H = S * 1.15;
  const rng = makeRng(17);
  const shape = (c) => { roundRectPath(c, S * 0.08, H * 0.06, S * 0.84, H * 0.86, 6); c.fill(); };
  topShadow(ctx, shape);
  ctx.fillStyle = c1; shape(ctx);
  ctx.fillStyle = c2;
  ctx.fillRect(S * 0.08, H * 0.06, S * 0.84, H * 0.08);       // 옥상 그늘
  ctx.fillRect(S * 0.08, H * 0.06, S * 0.10, H * 0.86);
  // 옥상 설비
  ctx.fillStyle = accent;
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(S * (0.22 + rng() * 0.55), H * (0.24 + rng() * 0.55), S * 0.14, H * 0.10);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 3;
  roundRectPath(ctx, S * 0.12, H * 0.10, S * 0.76, H * 0.78, 4);
  ctx.stroke();
  return { cv, worldW: 1900 };
}

function objLampTop(glow) {
  const S = 110, cv = makeCanvas(S, S), ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S / 2);
  g.addColorStop(0, glow);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#565d68";
  roundRectPath(ctx, S * 0.44, S * 0.30, S * 0.12, S * 0.42, 3);
  ctx.fill();
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(S / 2, S * 0.32, S * 0.10, 0, Math.PI * 2); ctx.fill();
  return { cv, worldW: 300 };
}

function objSignTop(color, text) {
  const S = 110, cv = makeCanvas(S, S), ctx = cv.getContext("2d");
  const shape = (c) => { roundRectPath(c, S * 0.16, S * 0.30, S * 0.68, S * 0.34, 5); c.fill(); };
  topShadow(ctx, shape);
  ctx.fillStyle = "#5a6068";
  ctx.fillRect(S * 0.46, S * 0.58, S * 0.08, S * 0.22);
  ctx.fillStyle = color; shape(ctx);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 3;
  roundRectPath(ctx, S * 0.20, S * 0.34, S * 0.60, S * 0.26, 3);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 22px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, S * 0.5, S * 0.47);
  return { cv, worldW: 330 };
}

function objBushTop(c1, c2) {
  const S = 110, cv = makeCanvas(S, S), ctx = cv.getContext("2d");
  const rng = makeRng(29);
  topShadow(ctx, (c) => { c.beginPath(); c.arc(S / 2, S / 2, S * 0.3, 0, Math.PI * 2); c.fill(); });
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? c2 : c1;
    ctx.beginPath();
    ctx.arc(S / 2 + (rng() - 0.5) * S * 0.32, S / 2 + (rng() - 0.5) * S * 0.32, S * (0.14 + rng() * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }
  return { cv, worldW: 460 };
}

const OBJ_GENS = {
  tree: (b) => objTreeTop(b.o1, b.o2),
  pine: (b) => objPineTop(b.o1, b.o2, false),
  snowpine: (b) => objPineTop(b.o1, b.o2, true),
  palm: (b) => objPalmTop(b.o1, b.o2),
  cactus: (b) => objCactusTop(b.o1, b.o2),
  rock: (b) => objRockTop(b.o1, b.o2),
  building: (b) => objBuildingTop(b.o1, b.o2, b.o3),
  lamp: (b) => objLampTop(b.o3),
  sign: (b) => objSignTop(b.o1, b.signText || "!"),
  bush: (b) => objBushTop(b.o1, b.o2),
};

// --- 바이옴 정의 ------------------------------------------------------
//  ground1/2 : 지면 교차 밴드 색 (스크롤 감각의 핵심)
//  road1/2   : 노면 교차 밴드 색   shoulder : 갓길
//  rumble1/2 : 도로 경계 스트립     lane : 차선 도색
//  overlay   : 화면 전체 색보정
const BIOMES = [
  {
    id: "dawn", name: "여명의 도시",
    ground1: "#4b4260", ground2: "#443a57", detail: "#564a6d",
    road1: "#54545e", road2: "#4c4c56", shoulder: "#63636e",
    rumble1: "#ff5470", rumble2: "#f4f4f4", lane: "#ffffff",
    overlay: "rgba(255,138,90,0.10)",
    objects: ["building", "lamp", "tree"],
    o1: "#4a4468", o2: "#332e4c", o3: "#ffd58a", signText: "60",
  },
  {
    id: "desert", name: "사막 고속도로",
    ground1: "#d9a86c", ground2: "#cfa065", detail: "#e2b783",
    road1: "#6e6559", road2: "#665d52", shoulder: "#8a7c68",
    rumble1: "#e0603c", rumble2: "#f7e6c4", lane: "#fff6df",
    overlay: "rgba(255,208,130,0.10)",
    objects: ["cactus", "rock", "sign"],
    o1: "#4e8a4a", o2: "#3a6b39", o3: "#ffe08a", signText: "SLOW",
  },
  {
    id: "neon", name: "네온 나이트",
    ground1: "#171827", ground2: "#131422", detail: "#22243a",
    road1: "#2c2c3c", road2: "#262635", shoulder: "#3a3a4e",
    rumble1: "#ff2e88", rumble2: "#00e5ff", lane: "#8ef6ff",
    overlay: "rgba(20,10,60,0.34)",
    objects: ["building", "lamp", "sign"],
    o1: "#1b1f42", o2: "#12142c", o3: "#66f7ff", signText: "∞",
  },
  {
    id: "snow", name: "설원 구간",
    ground1: "#eaf2fb", ground2: "#dde8f5", detail: "#ffffff",
    road1: "#586470", road2: "#505c67", shoulder: "#6e7a86",
    rumble1: "#cf4b5a", rumble2: "#ffffff", lane: "#ffffff",
    overlay: "rgba(180,215,255,0.14)",
    objects: ["snowpine", "rock", "bush"],
    o1: "#4a6f66", o2: "#33534c", o3: "#fff2c0", signText: "❄",
  },
  {
    id: "coast", name: "해안 도로",
    ground1: "#ddd3a2", ground2: "#d2c896", detail: "#e9e0b4",
    road1: "#525d66", road2: "#4a555e", shoulder: "#6d7882",
    rumble1: "#ffffff", rumble2: "#2f7fbf", lane: "#ffffff",
    overlay: "rgba(120,215,255,0.10)",
    objects: ["palm", "rock", "bush"],
    o1: "#2f8f5e", o2: "#1f6b45", o3: "#ffe08a", signText: "80",
  },
  {
    id: "forest", name: "황혼의 숲",
    ground1: "#33452f", ground2: "#2c3c29", detail: "#3d5237",
    road1: "#4b4b4b", road2: "#434343", shoulder: "#5c5a54",
    rumble1: "#ffb400", rumble2: "#3a2a2a", lane: "#ffe9c2",
    overlay: "rgba(255,120,60,0.14)",
    objects: ["pine", "tree", "bush"],
    o1: "#2f5a2c", o2: "#1e3a1e", o3: "#ffd58a", signText: "!",
  },
  {
    id: "volcano", name: "화산 지대",
    ground1: "#3a2320", ground2: "#33201d", detail: "#4a2b25",
    road1: "#3f3638", road2: "#382f31", shoulder: "#4d4245",
    rumble1: "#ff3b1f", rumble2: "#ffd08a", lane: "#ffcf9a",
    overlay: "rgba(255,80,20,0.16)",
    objects: ["rock", "sign", "lamp"],
    o1: "#4a2f2a", o2: "#33201d", o3: "#ff8a3d", signText: "▲",
  },
];

function initScenery() {
  BIOMES.forEach((b) => {
    b.objSprites = b.objects.map((k) => OBJ_GENS[k](b));
  });
}

// 색상 보간 (씬 전환 크로스페이드) --------------------------------------
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerpHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
}

const PALETTE_KEYS = ["ground1", "ground2", "detail", "road1", "road2", "shoulder", "rumble1", "rumble2", "lane"];

function blendPalette(a, b, t) {
  const out = {};
  for (const k of PALETTE_KEYS) out[k] = t <= 0 ? a[k] : lerpHex(a[k], b[k], t);
  out.overlay = t < 0.5 ? a.overlay : b.overlay;
  return out;
}
