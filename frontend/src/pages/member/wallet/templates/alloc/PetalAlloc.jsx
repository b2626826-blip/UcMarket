import { useRef, useEffect } from "react";

// ══════════════════════════════════════════════════════════════════
// 葉片圖(資產配置)· 定版元件   —— 錢包頁區塊3右(<PetalAlloc />)
//   已選定並寫死:配色 B・靛藍鎏金 / 5 片 / 灰葉色 #323232 · 透明度 15%
//                面板底色 #000000 / 邊緣柔化 18 / 各片 100%
//   互動保留:空白拖曳轉圈、拖葉片拉出彈回、hover 放大發光、標籤恆水平
//   (原 usePetalAlloc 拆兩塊 + 配色/片數/色票 控制列已移除)
//   要微調外觀 → 改下方「定版設定」那幾個常數即可。
// ══════════════════════════════════════════════════════════════════

const hex2rgb = (h) => { const x = h.replace("#", ""); return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)]; };
const rgb2hex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]); };
const radialFrom = (base) => `radial-gradient(120% 120% at 60% 28%, ${mix(base, "#ffffff", 0.1)} 0%, ${base} 60%, ${mix(base, "#000000", 0.55)} 100%)`;
const ramp = (anchors, n) => {
  if (n <= 1) return [anchors[0]];
  const out = [];
  for (let k = 0; k < n; k++) { const t = (k / (n - 1)) * (anchors.length - 1); const i = Math.floor(t); const b = Math.min(i + 1, anchors.length - 1); out.push(mix(anchors[i], anchors[b], t - i)); }
  return out;
};

// B・靛藍鎏金 的 8 錨色(定版取這組內插成 5 色)
const B_COLORS = ["#1b2c58", "#2a3d6b", "#43496a", "#6a5a4e", "#8f6f36", "#ab8a42", "#c6a656", "#dcc072"];
// ── 外觀定版(寫死;分類/占比/標題改由 props 傳入)──
const TRACK = "#323232";              // 灰葉顏色
const BG_BASE = "#000000";            // 面板底色
const TRACK_OP = 15;                  // 灰葉透明度(%)
const SOFT = 18;                      // 邊緣柔化(發光半徑)
const DEFAULT_NAMES = ["天氣", "政治", "體育", "時事", "財經"];   // 預設分類(未傳 props 時)
const DEFAULT_FILLS = [10, 24, 20, 14, 32];                       // 預設占比 %

export default function PetalAlloc({ names = DEFAULT_NAMES, fills = DEFAULT_FILLS, title = "各市場資金占比" }) {
  const N = fills.length;             // 片數 = 分類數
  const COLORS = ramp(B_COLORS, N);   // 配色 B → N 色
  const svgRef = useRef(null);
  const petalsRef = useRef(null);
  const labelsRef = useRef(null);
  const st = useRef({
    rot: 0, vel: 0, prevRot: 0, last: 0, hover: false, mode: null,
    held: null, holdX: 0, holdY: 0, startA: 0, rot0: 0,
    ox: Array(N).fill(0), oy: Array(N).fill(0), vx: Array(N).fill(0), vy: Array(N).fill(0),
  });

  const cRad = 108;
  const P = (r, a) => { const rad = (a * Math.PI) / 180; return [220 + r * Math.sin(rad), 220 - r * Math.cos(rad)]; };
  const cursor = (e) => { const r = svgRef.current.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 440, ((e.clientY - r.top) / r.height) * 440]; };
  const angleAt = (e) => { const r = svgRef.current.getBoundingClientRect(); return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI; };

  // 物理動畫(自轉 / hover 停 / 拖葉片拉出彈回 / 鄰片引力)
  useEffect(() => {
    const AUTO = 0.18, FRIC = 0.985, MAXV = 45, Kh = 0.018, Kn = 0.02, Kdrag = 0.14, REPEL = 0.5, RANGE = 74, DAMP = 0.85;
    const stp = 360 / N;
    let raf;
    const loop = (now) => {
      const s = st.current;
      if (!s.last) s.last = now;
      let dt = (now - s.last) / 16.667;
      if (dt > 3) dt = 3; if (dt <= 0) dt = 1;
      s.last = now;

      if (s.mode === "rotate") {
        const inst = Math.max(-MAXV, Math.min(MAXV, (s.rot - s.prevRot) / dt));
        s.vel = s.vel * 0.6 + inst * 0.4;
      } else {
        const target = !s.hover && s.held === null ? AUTO : 0;
        s.vel = target + (s.vel - target) * Math.pow(FRIC, dt);
        s.rot += s.vel * dt;
      }
      s.prevRot = s.rot;

      const hx = [], hy = [], px = [], py = [];
      for (let i = 0; i < N; i++) { const h = P(cRad, i * stp + s.rot); hx[i] = h[0]; hy[i] = h[1]; px[i] = h[0] + s.ox[i]; py[i] = h[1] + s.oy[i]; }

      const petals = petalsRef.current, labels = labelsRef.current;
      for (let i = 0; i < N; i++) {
        let ax = -Kh * s.ox[i], ay = -Kh * s.oy[i];
        const Ln = (i + N - 1) % N, Rn = (i + 1) % N;
        ax += Kn * (s.ox[Ln] + s.ox[Rn] - 2 * s.ox[i]);
        ay += Kn * (s.oy[Ln] + s.oy[Rn] - 2 * s.oy[i]);
        for (let j = 0; j < N; j++) {
          if (j === i) continue;
          const dx = px[i] - px[j], dy = py[i] - py[j], dist = Math.hypot(dx, dy);
          if (dist < RANGE && dist > 0.5) { const fp = (REPEL * (RANGE - dist)) / RANGE / dist; ax += dx * fp; ay += dy * fp; }
        }
        if (i === s.held) { ax += Kdrag * (s.holdX - s.ox[i]); ay += Kdrag * (s.holdY - s.oy[i]); }
        s.vx[i] = Math.max(-45, Math.min(45, (s.vx[i] + ax * dt) * Math.pow(DAMP, dt)));
        s.vy[i] = Math.max(-45, Math.min(45, (s.vy[i] + ay * dt) * Math.pow(DAMP, dt)));
        s.ox[i] += s.vx[i] * dt; s.oy[i] += s.vy[i] * dt;

        const ang = i * stp + s.rot;
        if (petals && petals.children[i]) petals.children[i].setAttribute("transform", `translate(${s.ox[i].toFixed(2)} ${s.oy[i].toFixed(2)}) rotate(${ang.toFixed(3)} 220 220)`);
        if (labels && labels.children[i]) labels.children[i].setAttribute("transform", `translate(${(hx[i] + s.ox[i]).toFixed(2)} ${(hy[i] + s.oy[i]).toFixed(2)})`);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onEnter = () => { st.current.hover = true; };
  const onLeave = () => { st.current.hover = false; };
  const onDown = (e) => {
    const s = st.current, stp = 360 / N, g = e.target.closest("[data-i]");
    if (g) { s.held = +g.getAttribute("data-i"); s.mode = "pull"; const c = cursor(e), h = P(cRad, s.held * stp + s.rot); s.holdX = c[0] - h[0]; s.holdY = c[1] - h[1]; }
    else { s.mode = "rotate"; s.startA = angleAt(e); s.rot0 = s.rot; }
    svgRef.current.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    const s = st.current, stp = 360 / N;
    if (s.mode === "pull" && s.held !== null) { const c = cursor(e), h = P(cRad, s.held * stp + s.rot); s.holdX = c[0] - h[0]; s.holdY = c[1] - h[1]; }
    else if (s.mode === "rotate") { s.rot = s.rot0 + (angleAt(e) - s.startA); }
  };
  const onUp = (e) => { const s = st.current; s.mode = null; s.held = null; try { svgRef.current.releasePointerCapture(e.pointerId); } catch (_) {} };

  // ── 幾何(直線切縫 + 圓弧外緣的花瓣)──
  const C = 220, ro = 180, W = 22, R = 8;
  const half = 180 / N;
  const dirOf = (d) => { const a = (d * Math.PI) / 180; return [Math.sin(a), -Math.cos(a)]; };
  const ptC = (r, d) => { const u = dirOf(d); return [C + r * u[0], C + r * u[1]]; };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
  const nrm = (a) => { const L = Math.hypot(a[0], a[1]) || 1; return [a[0] / L, a[1] / L]; };
  const f = (p) => `${Math.round(p[0] * 10) / 10},${Math.round(p[1] * 10) / 10}`;
  const edge = (bd, cd, d) => {
    const u = dirOf(bd), pp = [u[1], -u[0]], it = nrm(sub(ptC(50, cd), ptC(50, bd)));
    const nn = dot(pp, it) > 0 ? pp : [-pp[0], -pp[1]];
    return { p: [C + d * nn[0], C + d * nn[1]], v: u };
  };
  const xLine = (A, B) => {
    const det = A.v[0] * -B.v[1] - A.v[1] * -B.v[0];
    if (Math.abs(det) < 1e-6) return [C, C];
    const rx = B.p[0] - A.p[0], ry = B.p[1] - A.p[1];
    const s = (rx * -B.v[1] - ry * -B.v[0]) / det;
    return [A.p[0] + s * A.v[0], A.p[1] + s * A.v[1]];
  };
  const xCirc = (L, r) => {
    const fx = L.p[0] - C, fy = L.p[1] - C;
    const a = L.v[0] * L.v[0] + L.v[1] * L.v[1];
    const b = 2 * (fx * L.v[0] + fy * L.v[1]);
    const c = fx * fx + fy * fy - r * r;
    const t = (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
    return [L.p[0] + t * L.v[0], L.p[1] + t * L.v[1]];
  };
  const wedge = (rad) => {
    const d = W / 2, L = edge(-half, 0, d), Rg = edge(half, 0, d);
    const ap = xLine(L, Rg), oL = xCirc(L, rad), oR = xCirc(Rg, rad);
    return `M ${f(ap)} L ${f(oL)} A ${rad} ${rad} 0 0 1 ${f(oR)} Z`;
  };
  const rApexV = (() => { const d = W / 2, L = edge(-half, 0, d), Rg = edge(half, 0, d); const ap = xLine(L, Rg); return Math.hypot(ap[0] - C, ap[1] - C); })();
  const trackD = wedge(ro);
  const maxFill = Math.max(...fills) || 1;   // 相對最大值:占比最大那片 = 滿花瓣,其餘按比例縮(讓圖飽滿)

  return (
    <div className="pa pa-chart" style={{ "--soft": SOFT + "px" }}>
      <style>{`
        .pa{font-family:Inter,system-ui,sans-serif}
        .pa .panel{border:1px solid rgba(255,255,255,.06);border-radius:24px;padding:26px 30px 28px;box-shadow:0 30px 80px rgba(0,0,0,.5)}
        .pa h1{color:#fff;font-size:20px;font-weight:700;margin:0 0 12px}
        .pa .stage{touch-action:none;cursor:grab;margin-top:6px}
        .pa .stage:active{cursor:grabbing}
        .pa .stage svg{width:100%;height:auto;display:block}
        .pa .slice{transform-box:fill-box;transform-origin:center;transition:transform .3s cubic-bezier(.34,1.56,.64,1),filter .25s ease;filter:drop-shadow(0 0 calc(var(--soft) * .45) var(--gc))}
        .pa .slice .hit{fill:transparent;pointer-events:all}
        .pa .slice:hover{transform:scale(1.06);filter:drop-shadow(0 0 calc(var(--soft) * .6) var(--gc)) drop-shadow(0 0 calc(var(--soft) * 1.7) var(--gc))}
        .pa .pName{font-size:13px;font-weight:700;fill:#fff}
        .pa .pPct{font-size:13px;font-weight:700;fill:#fff}
        .pa .lbl{pointer-events:none}
      `}</style>
      <div className="panel glowcard" style={{ background: radialFrom(BG_BASE) }}>
        <h1>{title}</h1>
        <div className="stage" onPointerEnter={onEnter} onPointerLeave={onLeave} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
          <svg ref={svgRef} viewBox="0 0 440 440" role="img" aria-label="等分配置圖:空白拖曳轉圈、拖葉片拉出彈回、葉片間引力互動、標籤恆水平">
            <g ref={petalsRef}>
              {Array.from({ length: N }).map((_, i) => {
                const color = COLORS[i];
                const rF = rApexV + (fills[i] / maxFill) * (ro - rApexV);   // 相對最大值放大
                return (
                  <g className="pos" data-i={i} key={i}>
                    <g className="slice" style={{ "--gc": color }}>
                      {/* 灰葉底(單層實色,透明度 = TRACK_OP)*/}
                      <path d={trackD} fill={TRACK} stroke={TRACK} strokeWidth={R * 2} strokeLinejoin="round" strokeLinecap="round" opacity={TRACK_OP / 100} />
                      {fills[i] > 0 && (
                        <path d={wedge(rF)} fill={color} stroke={color} strokeWidth={R * 2} strokeLinejoin="round" strokeLinecap="round" />
                      )}
                      <path className="hit" d={trackD} />
                    </g>
                  </g>
                );
              })}
            </g>
            <g ref={labelsRef}>
              {Array.from({ length: N }).map((_, i) => (
                <g className="lbl" key={i}>
                  <text x="0" y="-1" textAnchor="middle" className="pName">{names[i]}</text>
                  <text x="0" y="15" textAnchor="middle" className="pPct">{fills[i]}%</text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
