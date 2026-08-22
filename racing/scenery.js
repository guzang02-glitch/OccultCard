// =====================================================================
// 배경(씬) 리소스
//  - 하늘 / 원경 / 근경 / 도로변 오브젝트 / 파티클을 모두 캔버스로 생성
//  - 씬(바이옴)은 일정 시간마다 교체되고, 그 간격은 점점 짧아진다
// =====================================================================

function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const LAYER_W = 1600;
const LAYER_H = 420;

// --- 레이어 생성기 ----------------------------------------------------
function layerMountain(colors, opt) {
  const cv = makeCanvas(LAYER_W, LAYER_H);
  const ctx = cv.getContext("2d");
  const rng = makeRng(opt.seed);
  const rows = colors.length;
  for (let r = 0; r < rows; r++) {
    const base = LAYER_H * (0.72 + r * 0.09);
    const amp = LAYER_H * (opt.amp || 0.42) * (1 - r * 0.28);
    ctx.fillStyle = colors[r];
    ctx.beginPath();
    ctx.moveTo(0, LAYER_H);
    let x = 0;
    let y = base - rng() * amp;
    ctx.lineTo(0, y);
    while (x < LAYER_W) {
      const w = 60 + rng() * (opt.jag || 180);
      const peak = base - (0.25 + rng() * 0.75) * amp;
      ctx.lineTo(x + w / 2, peak);
      x += w;
      y = base - rng() * amp * 0.5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(LAYER_W, LAYER_H);
    ctx.closePath();
    ctx.fill();
    if (opt.snow && r === 0) {
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(0, 0, LAYER_W, base - amp * 0.35);
      ctx.restore();
    }
  }
  return cv;
}

function layerSkyline(colors, opt) {
  const cv = makeCanvas(LAYER_W, LAYER_H);
  const ctx = cv.getContext("2d");
  const rng = makeRng(opt.seed);
  for (let r = 0; r < colors.length; r++) {
    ctx.fillStyle = colors[r];
    let x = -20;
    const baseY = LAYER_H * (0.86 + r * 0.06);
    while (x < LAYER_W) {
      const w = 40 + rng() * 90;
      const h = (0.20 + rng() * 0.62) * LAYER_H * (1 - r * 0.22);
      const top = baseY - h;
      ctx.fillRect(x, top, w, h + 20);
      if (rng() > 0.72) ctx.fillRect(x + w * 0.35, top - 40 * rng(), w * 0.3, 40);
      if (opt.neon) {
        ctx.fillStyle = opt.window || "rgba(255,220,140,0.85)";
        for (let wy = top + 10; wy < baseY - 8; wy += 14) {
          for (let wx = x + 6; wx < x + w - 8; wx += 12) {
            if (rng() > 0.55) ctx.fillRect(wx, wy, 4, 6);
          }
        }
        ctx.fillStyle = colors[r];
      }
      x += w + 6 + rng() * 26;
    }
  }
  return cv;
}

function layerMesa(colors, opt) {
  const cv = makeCanvas(LAYER_W, LAYER_H);
  const ctx = cv.getContext("2d");
  const rng = makeRng(opt.seed);
  for (let r = 0; r < colors.length; r++) {
    ctx.fillStyle = colors[r];
    let x = -40;
    const baseY = LAYER_H * (0.88 + r * 0.05);
    while (x < LAYER_W) {
      const w = 120 + rng() * 260;
      const h = (0.15 + rng() * 0.4) * LAYER_H * (1 - r * 0.25);
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + w * 0.12, baseY - h);
      ctx.lineTo(x + w * 0.88, baseY - h * (0.85 + rng() * 0.2));
      ctx.lineTo(x + w, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x, baseY - 4, w, 30);
      x += w * (0.6 + rng() * 0.5);
    }
  }
  return cv;
}

function layerPines(colors, opt) {
  const cv = makeCanvas(LAYER_W, LAYER_H);
  const ctx = cv.getContext("2d");
  const rng = makeRng(opt.seed);
  for (let r = 0; r < colors.length; r++) {
    ctx.fillStyle = colors[r];
    const baseY = LAYER_H * (0.9 + r * 0.05);
    let x = -20;
    while (x < LAYER_W) {
      const w = 26 + rng() * 34;
      const h = (0.18 + rng() * 0.3) * LAYER_H * (1 - r * 0.3);
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + w / 2, baseY - h);
      ctx.lineTo(x + w, baseY);
      ctx.closePath();
      ctx.fill();
      x += w * (0.55 + rng() * 0.5);
    }
    ctx.fillRect(0, baseY - 6, LAYER_W, 40);
  }
  return cv;
}

function layerHills(colors, opt) {
  const cv = makeCanvas(LAYER_W, LAYER_H);
  const ctx = cv.getContext("2d");
  const rng = makeRng(opt.seed);
  for (let r = 0; r < colors.length; r++) {
    ctx.fillStyle = colors[r];
    ctx.beginPath();
    ctx.moveTo(0, LAYER_H);
    const base = LAYER_H * (0.8 + r * 0.08);
    const amp = LAYER_H * 0.22 * (1 - r * 0.3);
    const step = 40;
    const ph = rng() * 10;
    for (let x = 0; x <= LAYER_W; x += step) {
      const y = base - (Math.sin(x / 190 + ph) * 0.5 + Math.sin(x / 70 + ph * 2) * 0.25 + 0.6) * amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(LAYER_W, LAYER_H);
    ctx.closePath();
    ctx.fill();
  }
  return cv;
}

function layerSea(colors, opt) {
  const cv = makeCanvas(LAYER_W, LAYER_H);
  const ctx = cv.getContext("2d");
  const rng = makeRng(opt.seed);
  const g = ctx.createLinearGradient(0, LAYER_H * 0.55, 0, LAYER_H);
  g.addColorStop(0, colors[0]);
  g.addColorStop(1, colors[1] || colors[0]);
  ctx.fillStyle = g;
  ctx.fillRect(0, LAYER_H * 0.55, LAYER_W, LAYER_H * 0.45);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 260; i++) {
    const y = LAYER_H * (0.58 + rng() * 0.4);
    ctx.fillRect(rng() * LAYER_W, y, 6 + rng() * 22, 1.5);
  }
  return cv;
}

const LAYER_GENS = {
  mountain: layerMountain, skyline: layerSkyline, mesa: layerMesa,
  pines: layerPines, hills: layerHills, sea: layerSea,
};

// --- 도로변 오브젝트 --------------------------------------------------
function objTree(color, dark) {
  const cv = makeCanvas(160, 220);
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#4a3524";
  ctx.fillRect(70, 130, 20, 90);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(80, 100, 62, 66, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(102, 118, 40, 44, 0, 0, Math.PI * 2);
  ctx.fill();
  return { cv, worldW: 900 };
}

function objPine(color, dark, snow) {
  const cv = makeCanvas(140, 260);
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#3d2c1e";
  ctx.fillRect(62, 200, 16, 60);
  for (let i = 0; i < 4; i++) {
    const y = 40 + i * 45;
    const w = 26 + i * 20;
    ctx.fillStyle = i % 2 ? dark : color;
    ctx.beginPath();
    ctx.moveTo(70, y - 55);
    ctx.lineTo(70 + w, y + 30);
    ctx.lineTo(70 - w, y + 30);
    ctx.closePath();
    ctx.fill();
    if (snow) {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.moveTo(70, y - 55);
      ctx.lineTo(70 + w * 0.55, y - 8);
      ctx.lineTo(70 - w * 0.55, y - 8);
      ctx.closePath();
      ctx.fill();
    }
  }
  return { cv, worldW: 820 };
}

function objPalm(color, dark) {
  const cv = makeCanvas(180, 260);
  const ctx = cv.getContext("2d");
  ctx.strokeStyle = "#6b5334";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(96, 260);
  ctx.quadraticCurveTo(80, 160, 90, 80);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    ctx.fillStyle = i % 2 ? dark : color;
    ctx.beginPath();
    ctx.ellipse(90 + Math.cos(a) * 42, 74 + Math.sin(a) * 26, 46, 15, a, 0, Math.PI * 2);
    ctx.fill();
  }
  return { cv, worldW: 900 };
}

function objCactus(color, dark) {
  const cv = makeCanvas(140, 220);
  const ctx = cv.getContext("2d");
  ctx.fillStyle = color;
  roundRectPath(ctx, 56, 40, 30, 180, 15);
  ctx.fill();
  roundRectPath(ctx, 20, 90, 26, 70, 13);
  ctx.fill();
  roundRectPath(ctx, 20, 140, 66, 22, 11);
  ctx.fill();
  roundRectPath(ctx, 96, 70, 24, 60, 12);
  ctx.fill();
  roundRectPath(ctx, 70, 118, 50, 20, 10);
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.fillRect(76, 40, 10, 180);
  return { cv, worldW: 620 };
}

function objRock(color, dark) {
  const cv = makeCanvas(180, 130);
  const ctx = cv.getContext("2d");
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(10, 130);
  ctx.lineTo(46, 40);
  ctx.lineTo(96, 14);
  ctx.lineTo(150, 56);
  ctx.lineTo(172, 130);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(96, 14);
  ctx.lineTo(150, 56);
  ctx.lineTo(172, 130);
  ctx.lineTo(110, 130);
  ctx.closePath();
  ctx.fill();
  return { cv, worldW: 700 };
}

function objBuilding(color, dark, win) {
  const cv = makeCanvas(220, 420);
  const ctx = cv.getContext("2d");
  const rng = makeRng(7);
  ctx.fillStyle = color;
  ctx.fillRect(20, 30, 180, 390);
  ctx.fillStyle = dark;
  ctx.fillRect(150, 30, 50, 390);
  ctx.fillStyle = win;
  for (let y = 50; y < 400; y += 34) {
    for (let x = 34; x < 190; x += 28) {
      if (rng() > 0.35) ctx.fillRect(x, y, 16, 20);
    }
  }
  return { cv, worldW: 2100 };
}

function objLamp(color) {
  const cv = makeCanvas(120, 360);
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#4b5058";
  ctx.fillRect(52, 60, 14, 300);
  ctx.beginPath();
  ctx.moveTo(58, 66);
  ctx.quadraticCurveTo(58, 24, 104, 26);
  ctx.lineWidth = 12;
  ctx.strokeStyle = "#4b5058";
  ctx.stroke();
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 26;
  ctx.fillStyle = color;
  roundRectPath(ctx, 86, 22, 34, 12, 6);
  ctx.fill();
  ctx.restore();
  return { cv, worldW: 340 };
}

function objSign(color, text) {
  const cv = makeCanvas(200, 260);
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#5a6068";
  ctx.fillRect(70, 120, 12, 140);
  ctx.fillStyle = color;
  roundRectPath(ctx, 10, 20, 180, 110, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 6;
  roundRectPath(ctx, 20, 30, 160, 90, 8);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 52px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 100, 76);
  return { cv, worldW: 430 };
}

const OBJ_GENS = {
  tree: (b) => objTree(b.o1, b.o2),
  pine: (b) => objPine(b.o1, b.o2, false),
  snowpine: (b) => objPine(b.o1, b.o2, true),
  palm: (b) => objPalm(b.o1, b.o2),
  cactus: (b) => objCactus(b.o1, b.o2),
  rock: (b) => objRock(b.o1, b.o2),
  building: (b) => objBuilding(b.o1, b.o2, b.o3),
  lamp: (b) => objLamp(b.o3),
  sign: (b) => objSign(b.o1, b.signText || "!"),
};

// --- 바이옴 정의 ------------------------------------------------------
const BIOMES = [
  {
    id: "dawn", name: "여명의 도시",
    skyTop: "#241a45", skyBottom: "#ff9a63", fog: "#ffab7a",
    grass1: "#4b4260", grass2: "#443a57", road1: "#57575f", road2: "#4f4f57",
    rumble1: "#ff5470", rumble2: "#f4f4f4", lane: "#ffffff",
    sun: { color: "#ffe0a8", x: 0.62, r: 0.10 }, stars: 0,
    far: { gen: "skyline", colors: ["#2b2450", "#3a3268"], opt: { seed: 11 } },
    near: { gen: "hills", colors: ["#3b3352", "#332c48"], opt: { seed: 21 } },
    objects: ["building", "lamp", "sign"],
    o1: "#3f3a5c", o2: "#2e2a45", o3: "#ffd58a", signText: "60",
    particle: { color: "rgba(255,255,255,0.35)", n: 40 },
  },
  {
    id: "desert", name: "사막 고속도로",
    skyTop: "#5fbdf5", skyBottom: "#ffd9a0", fog: "#f7d9ab",
    grass1: "#d9a86c", grass2: "#cfa065", road1: "#6e6559", road2: "#665d52",
    rumble1: "#e0603c", rumble2: "#f7e6c4", lane: "#fff6df",
    sun: { color: "#fff1c4", x: 0.4, r: 0.09 }, stars: 0,
    far: { gen: "mesa", colors: ["#b2724a", "#c8875a"], opt: { seed: 33 } },
    near: { gen: "hills", colors: ["#e0b177", "#d6a469"], opt: { seed: 41 } },
    objects: ["cactus", "rock", "sign"],
    o1: "#4e8a4a", o2: "#3a6b39", o3: "#ffe08a", signText: "SLOW",
    particle: { color: "rgba(255,225,170,0.5)", n: 60 },
  },
  {
    id: "neon", name: "네온 나이트",
    skyTop: "#04050f", skyBottom: "#221046", fog: "#1d1140",
    grass1: "#16172b", grass2: "#131426", road1: "#2c2c3c", road2: "#262635",
    rumble1: "#ff2e88", rumble2: "#00e5ff", lane: "#8ef6ff",
    sun: { color: "#f2f4ff", x: 0.78, r: 0.055 }, stars: 120,
    far: { gen: "skyline", colors: ["#0e1230", "#151a45"], opt: { seed: 55, neon: true, window: "rgba(120,240,255,0.9)" } },
    near: { gen: "skyline", colors: ["#0a0c22"], opt: { seed: 65, neon: true, window: "rgba(255,80,180,0.85)" } },
    objects: ["building", "lamp", "sign"],
    o1: "#171a3a", o2: "#0f1129", o3: "#66f7ff", signText: "∞",
    particle: { color: "rgba(140,240,255,0.55)", n: 70 },
  },
  {
    id: "snow", name: "설원 구간",
    skyTop: "#8fbfe4", skyBottom: "#e9f4ff", fog: "#e6f2ff",
    grass1: "#eaf2fb", grass2: "#dfe9f5", road1: "#586470", road2: "#505c67",
    rumble1: "#cf4b5a", rumble2: "#ffffff", lane: "#ffffff",
    sun: null, stars: 0,
    far: { gen: "mountain", colors: ["#a9c1d4", "#bcd0e0"], opt: { seed: 77, snow: true, amp: 0.5, jag: 220 } },
    near: { gen: "pines", colors: ["#43605f", "#37504f"], opt: { seed: 87 } },
    objects: ["snowpine", "rock", "sign"],
    o1: "#3f6b5a", o2: "#2e5043", o3: "#fff2c0", signText: "❄",
    particle: { color: "rgba(255,255,255,0.9)", n: 110 },
  },
  {
    id: "coast", name: "해안 도로",
    skyTop: "#2aa2e0", skyBottom: "#c7f0ff", fog: "#cfeeff",
    grass1: "#d8cfa0", grass2: "#cec596", road1: "#525d66", road2: "#4a555e",
    rumble1: "#ffffff", rumble2: "#2f7fbf", lane: "#ffffff",
    sun: { color: "#fff8d8", x: 0.28, r: 0.075 }, stars: 0,
    far: { gen: "sea", colors: ["#2f8fc7", "#1f6ea3"], opt: { seed: 99 } },
    near: { gen: "hills", colors: ["#2f7a5a", "#276648"], opt: { seed: 109 } },
    objects: ["palm", "rock", "sign"],
    o1: "#2f8f5e", o2: "#1f6b45", o3: "#ffe08a", signText: "80",
    particle: { color: "rgba(255,255,255,0.4)", n: 45 },
  },
  {
    id: "forest", name: "황혼의 숲",
    skyTop: "#3b2a58", skyBottom: "#ff8a5c", fog: "#e88f66",
    grass1: "#334536", grass2: "#2c3c2f", road1: "#4b4b4b", road2: "#434343",
    rumble1: "#ffb400", rumble2: "#3a2a2a", lane: "#ffe9c2",
    sun: { color: "#ffcf8f", x: 0.5, r: 0.11 }, stars: 20,
    far: { gen: "mountain", colors: ["#4a3760", "#5b4573"], opt: { seed: 121, amp: 0.38 } },
    near: { gen: "pines", colors: ["#22301d", "#1a2617"], opt: { seed: 131 } },
    objects: ["pine", "tree", "lamp"],
    o1: "#2f4a2a", o2: "#20331d", o3: "#ffd58a", signText: "!",
    particle: { color: "rgba(255,190,120,0.5)", n: 55 },
  },
  {
    id: "volcano", name: "화산 지대",
    skyTop: "#170707", skyBottom: "#ff5f22", fog: "#ff7f47",
    grass1: "#3a2320", grass2: "#33201d", road1: "#3f3638", road2: "#382f31",
    rumble1: "#ff3b1f", rumble2: "#ffd08a", lane: "#ffcf9a",
    sun: { color: "#ffb45e", x: 0.55, r: 0.13 }, stars: 0,
    far: { gen: "mountain", colors: ["#3c1c1a", "#552724"], opt: { seed: 143, amp: 0.55, jag: 260 } },
    near: { gen: "hills", colors: ["#2a1a18", "#221413"], opt: { seed: 153 } },
    objects: ["rock", "sign", "lamp"],
    o1: "#4a2f2a", o2: "#33201d", o3: "#ff8a3d", signText: "▲",
    particle: { color: "rgba(255,140,60,0.85)", n: 90 },
  },
];

function initScenery() {
  BIOMES.forEach((b) => {
    b.farLayer = LAYER_GENS[b.far.gen](b.far.colors, b.far.opt || {});
    b.nearLayer = LAYER_GENS[b.near.gen](b.near.colors, b.near.opt || {});
    b.objSprites = b.objects.map((k) => OBJ_GENS[k](b));
    if (b.stars) {
      const cv = makeCanvas(LAYER_W, LAYER_H);
      const ctx = cv.getContext("2d");
      const rng = makeRng(b.stars * 13);
      for (let i = 0; i < b.stars; i++) {
        const a = 0.35 + rng() * 0.65;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        const r = rng() * 1.6 + 0.5;
        ctx.fillRect(rng() * LAYER_W, rng() * LAYER_H * 0.8, r, r);
      }
      b.starLayer = cv;
    }
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

const PALETTE_KEYS = ["skyTop", "skyBottom", "fog", "grass1", "grass2", "road1", "road2", "rumble1", "rumble2", "lane"];

function blendPalette(a, b, t) {
  const out = {};
  for (const k of PALETTE_KEYS) out[k] = t <= 0 ? a[k] : lerpHex(a[k], b[k], t);
  return out;
}
