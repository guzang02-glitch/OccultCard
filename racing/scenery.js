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
  ctx.shadowColor = "rgba(0,0,0,0.42)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 7;
  ctx.shadowOffsetY = 9;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
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

// 항공 시점 건물 -----------------------------------------------------
// 옥상면 + 오른쪽/아래 벽면(창문 격자) + 길게 드리운 그림자.
// 빛 방향을 우하단으로 통일해서 여러 건물이 같은 시각에 찍힌 사진처럼 보이게 한다.
function extrudedBuilding(W, H, roofCol, winCol, ex, ey, grid, roofDetail) {
  const cv = makeCanvas(W, H), ctx = cv.getContext("2d");
  const x = W * 0.05, y = H * 0.05;
  const w = W * 0.95 - ex - x, h = H * 0.95 - ey - y;
  const sx = ex * 2.1, sy = ey * 2.1;

  // 드리운 그림자
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + sx, y + h + sy);
  ctx.lineTo(x + w + sx, y + h + sy);
  ctx.lineTo(x + w + sx, y + sy);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  // 벽면 + 창문 격자 (단위 사각형을 평행사변형으로 변환해서 그린다)
  const wall = (m, fill, cols, rows) => {
    ctx.save();
    ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = winCol;
    const px = 0.30 / cols, py = 0.34 / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        ctx.fillRect(i / cols + px, j / rows + py, 1 / cols - px * 2, 1 / rows - py * 2);
      }
    }
    ctx.restore();
  };
  wall([ex, ey, 0, h, x + w, y], shade(roofCol, -0.42), grid.side, grid.floors);
  wall([w, 0, ex, ey, x, y + h], shade(roofCol, -0.55), grid.front, grid.floors);

  // 옥상면
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, shade(roofCol, 0.16));
  g.addColorStop(0.55, roofCol);
  g.addColorStop(1, shade(roofCol, -0.14));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // 파라펫
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = Math.max(2, W * 0.016);
  ctx.strokeRect(x + W * 0.012, y + W * 0.012, w - W * 0.024, h - W * 0.024);

  roofDetail(ctx, x, y, w, h);
  return { cv };
}

function objTowerTop(c1, c2, accent) {
  const W = 330, H = 390;
  const r = extrudedBuilding(W, H, c1, accent, W * 0.20, H * 0.17,
    { side: 5, floors: 9, front: 4 }, (ctx, x, y, w, h) => {
      const rng = makeRng(101);
      // 유리 옥상 반사
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, "rgba(255,255,255,0.20)");
      g.addColorStop(0.5, "rgba(255,255,255,0.03)");
      g.addColorStop(1, "rgba(0,0,0,0.18)");
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      // 기계실
      ctx.fillStyle = shade(c1, -0.32);
      ctx.fillRect(x + w * 0.26, y + h * 0.30, w * 0.44, h * 0.34);
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.fillRect(x + w * 0.26, y + h * 0.30, w * 0.44, h * 0.07);
      // 실외기
      ctx.fillStyle = shade(c1, -0.5);
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(x + w * (0.08 + rng() * 0.74), y + h * (0.06 + rng() * 0.82), w * 0.11, h * 0.07);
      }
      // 헬리패드
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x + w * 0.5, y + h * 0.82, w * 0.13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(x + w * 0.44, y + h * 0.76, w * 0.03, h * 0.12);
      ctx.fillRect(x + w * 0.53, y + h * 0.76, w * 0.03, h * 0.12);
      ctx.fillRect(x + w * 0.44, y + h * 0.815, w * 0.12, h * 0.02);
      // 항공장애등
      ctx.fillStyle = "#ff4d4d";
      [[0.06, 0.06], [0.94, 0.06], [0.06, 0.94], [0.94, 0.94]].forEach(([u, v]) => {
        ctx.beginPath();
        ctx.arc(x + w * u, y + h * v, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  return { cv: r.cv, worldW: 2500 };
}

function objBlockTop(c1, c2, accent) {
  const W = 290, H = 310;
  const r = extrudedBuilding(W, H, shade(c1, -0.12), accent, W * 0.11, H * 0.09,
    { side: 4, floors: 4, front: 3 }, (ctx, x, y, w, h) => {
      const rng = makeRng(211);
      // 옥상 자갈
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      for (let i = 0; i < 300; i++) ctx.fillRect(x + rng() * w, y + rng() * h, 2, 2);
      // 계단실
      ctx.fillStyle = shade(c1, -0.42);
      ctx.fillRect(x + w * 0.10, y + h * 0.12, w * 0.26, h * 0.22);
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(x + w * 0.10, y + h * 0.12, w * 0.26, h * 0.05);
      // 실외기 / 환기구
      ctx.fillStyle = shade(c1, -0.55);
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(x + w * (0.42 + rng() * 0.44), y + h * (0.08 + rng() * 0.76), w * 0.12, h * 0.08);
      }
      // 물탱크 (다리 + 원통)
      const wx = x + w * 0.70, wy = y + h * 0.74, wr = w * 0.14;
      ctx.strokeStyle = "rgba(40,32,26,0.6)";
      ctx.lineWidth = 4;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.lineTo(wx + a * wr * 0.9, wy + b * wr * 0.9);
        ctx.stroke();
      });
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.arc(wx + 6, wy + 7, wr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7d5c3d";
      ctx.beginPath();
      ctx.arc(wx, wy, wr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#96714a";
      ctx.beginPath();
      ctx.arc(wx - wr * 0.22, wy - wr * 0.22, wr * 0.6, 0, Math.PI * 2);
      ctx.fill();
    });
  return { cv: r.cv, worldW: 1900 };
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
  tower: (b) => objTowerTop(b.o1, b.o2, b.o3),
  block: (b) => objBlockTop(b.o1, b.o2, b.o3),
  lamp: (b) => objLampTop(b.o3),
  sign: (b) => objSignTop(b.o1, b.signText || "!"),
  bush: (b) => objBushTop(b.o1, b.o2),
};

// --- 바이옴 정의 ------------------------------------------------------
//  ground1/2 : 지면 교차 밴드 색 (스크롤 감각의 핵심)
//  road      : 노면 단색           shoulder : 갓길   walk : 인도
//  rumble1/2 : 도로 경계 스트립     lane : 차선 도색
//  overlay   : 화면 전체 색보정
const BIOMES = [
  {
    id: "dawn", walk: "#7b7b92", name: "여명의 도시",
    ground1: "#4b4260", ground2: "#443a57",
    road1: "#54545e", shoulder: "#63636e",
    rumble1: "#ff5470", rumble2: "#f4f4f4", lane: "#ffffff",
    overlay: "rgba(255,138,90,0.10)",
    objects: ["tower", "block", "lamp"],
    o1: "#6b6b82", o2: "#3c3c52", o3: "#ffe3ac", signText: "60",
  },
  {
    id: "desert", walk: "#c9b48c", name: "사막 고속도로",
    ground1: "#d9a86c", ground2: "#cfa065",
    road1: "#6e6559", shoulder: "#8a7c68",
    rumble1: "#e0603c", rumble2: "#f7e6c4", lane: "#fff6df",
    overlay: "rgba(255,208,130,0.10)",
    objects: ["cactus", "rock", "sign"],
    o1: "#4e8a4a", o2: "#3a6b39", o3: "#ffe08a", signText: "SLOW",
  },
  {
    id: "neon", walk: "#2b3050", name: "네온 나이트",
    ground1: "#171827", ground2: "#131422",
    road1: "#2c2c3c", shoulder: "#3a3a4e",
    rumble1: "#ff2e88", rumble2: "#00e5ff", lane: "#8ef6ff",
    overlay: "rgba(20,10,60,0.34)",
    objects: ["tower", "block", "lamp"],
    o1: "#252b55", o2: "#141833", o3: "#7df3ff", signText: "∞",
  },
  {
    id: "snow", walk: "#cfd9e6", name: "설원 구간",
    ground1: "#eaf2fb", ground2: "#dde8f5",
    road1: "#586470", shoulder: "#6e7a86",
    rumble1: "#cf4b5a", rumble2: "#ffffff", lane: "#ffffff",
    overlay: "rgba(180,215,255,0.14)",
    objects: ["snowpine", "rock", "bush"],
    o1: "#4a6f66", o2: "#33534c", o3: "#fff2c0", signText: "❄",
  },
  {
    id: "coast", walk: "#c8c2a4", name: "해안 도로",
    ground1: "#ddd3a2", ground2: "#d2c896",
    road1: "#525d66", shoulder: "#6d7882",
    rumble1: "#ffffff", rumble2: "#2f7fbf", lane: "#ffffff",
    overlay: "rgba(120,215,255,0.10)",
    objects: ["palm", "rock", "bush"],
    o1: "#2f8f5e", o2: "#1f6b45", o3: "#ffe08a", signText: "80",
  },
  {
    id: "forest", walk: "#6b6a62", name: "황혼의 숲",
    ground1: "#33452f", ground2: "#2c3c29",
    road1: "#4b4b4b", shoulder: "#5c5a54",
    rumble1: "#ffb400", rumble2: "#3a2a2a", lane: "#ffe9c2",
    overlay: "rgba(255,120,60,0.14)",
    objects: ["pine", "tree", "bush"],
    o1: "#2f5a2c", o2: "#1e3a1e", o3: "#ffd58a", signText: "!",
  },
  {
    id: "volcano", walk: "#584a48", name: "화산 지대",
    ground1: "#3a2320", ground2: "#33201d",
    road1: "#3f3638", shoulder: "#4d4245",
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
