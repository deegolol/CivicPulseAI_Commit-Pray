/**
 * Full-screen hand-drawn backdrop for the start and form pages (T30), drawn in code (no image file).
 * A watercolour city plan: painted blocks, parks with trees, a river and a pond, two Metro lines, sketched
 * buildings and student doodles (books, coffee, laptop, backpack, bike, key, cap, plant, bulb, calendar).
 * Dense around the edges, clear in the middle for the content. A seeded random generator gives the lines their
 * slightly hand-made wobble, so the drawing is identical on every visit.
 *
 * Performance: SVG watercolour filters are expensive and the browser re-applies them whenever anything above them
 * repaints (typing, hovering, clicking). So we draw the SVG once, turn it into an <img> (rasterised and cached by the
 * browser) and drop the live SVG. After the first frame the backdrop costs nothing.
 */
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

function seeded(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 1600;
const H = 1000;
const INK = '#8a7a66';
const WASHES = ['#cfe3bf', '#f3e3c2', '#f1d5c3', '#d7e5f1', '#e6dcef', '#dfe9d0'];
const BLOCK_TINTS = ['#efe2cf', '#f3d9cc', '#e3ead6', '#dfe6ef', '#f4e8cf'];

/** Distance from the centre of the screen, 0 (centre) … ~1 (corners), to keep the middle empty. */
const edge = (x: number, y: number) => Math.hypot((x - W / 2) / (W / 2), (y - H * 0.46) / (H / 2));

function street(rand: () => number, x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2 + (rand() - 0.5) * 26;
  const my = (y1 + y2) / 2 + (rand() - 0.5) * 26;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function Doodle({ x, y, rotate = 0, scale = 2.2, children }: { x: number; y: number; rotate?: number; scale?: number; children: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`} fill="none" stroke={INK} strokeWidth={0.75} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </g>
  );
}

const DOODLES: { x: number; y: number; r: number; s?: number; d: ReactNode }[] = [
  { x: 1335, y: 560, r: -8, d: <><rect x="0" y="14" width="22" height="5" rx="1" /><rect x="2" y="9" width="19" height="5" rx="1" /><rect x="-1" y="4" width="21" height="5" rx="1" /><path d="M4 4v5M7 9v5M5 14v5" /></> },
  { x: 95, y: 420, r: 6, d: <><path d="M2 8h14v6a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6z" /><path d="M16 10h2a3 3 0 0 1 0 6h-2" /><path d="M6 2c-1 2 1 3 0 5M10 2c-1 2 1 3 0 5" /></> },
  { x: 1190, y: 890, r: -4, s: 2.4, d: <><circle cx="5" cy="15" r="4.5" /><circle cx="22" cy="15" r="4.5" /><path d="M5 15l6-9h7l4 9M11 6l3 9h-9M16 3h4" /></> },
  { x: 300, y: 70, r: 18, d: <><circle cx="5" cy="9" r="4.5" /><path d="M9.5 9H24M19 9v4M22 9v3" /></> },
  { x: 1470, y: 60, r: -12, d: <><path d="M1 7l11-5 11 5-11 5z" /><path d="M6 9.5v5c3 2.5 9 2.5 12 0v-5M23 7v6" /></> },
  { x: 60, y: 660, r: -10, s: 2, d: <><path d="M10 22s7-7 7-12A7 7 0 0 0 3 10c0 5 7 12 7 12z" /><circle cx="10" cy="10" r="2.5" /></> },
  { x: 1500, y: 700, r: 5, d: <><rect x="3" y="3" width="18" height="12" rx="1.5" /><path d="M1 18h22l-2 2H3z" /></> },
  { x: 210, y: 930, r: -6, d: <><path d="M5 8a7 7 0 0 1 14 0v12H5z" /><path d="M9 4V2h6v2M5 13h14M10 13v3h4v-3" /></> },
  { x: 900, y: 925, r: 3, s: 2, d: <><path d="M8 22h8l1-6H7z" /><path d="M12 16V9M12 12c-3 0-5-2-5-5 3 0 5 2 5 5zM12 10c2.5 0 4-1.6 4-4-2.5 0-4 1.6-4 4z" /></> },
  { x: 640, y: 40, r: -8, s: 2, d: <><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></> },
  { x: 1050, y: 40, r: 6, s: 2, d: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2" /></> },
];

const BUILDINGS: { x: number; y: number; s: number; d: string }[] = [
  // generic dome + colonnade
  { x: 1300, y: 300, s: 1, d: 'M0 70h120M10 70V40h100v30M20 70V40M40 70V40M60 70V40M80 70V40M100 70V40M5 40h110M30 40c0-22 60-22 60 0M60 18v-8M56 10h8' },
  // tower cluster
  { x: 120, y: 230, s: 1, d: 'M0 110h150M10 110V30h22v80M40 110V10h24v100M72 110V40h20v70M100 110V22h26v88M14 44h14M14 58h14M14 72h14M44 26h16M44 42h16M44 58h16M104 38h18M104 54h18' },
  // arch
  { x: 1340, y: 960, s: 1, d: 'M0 0V-60h120V0M20 0v-36a20 20 0 0 1 40 0V0M60 0v-36a20 20 0 0 1 40 0M0 -60h120M-4 -66h128' },
];

let cachedUrl: string | null = null; // shared across pages: the drawing never changes

export const StudentBackdrop = memo(function StudentBackdrop() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [url, setUrl] = useState<string | null>(cachedUrl);
  useEffect(() => {
    if (url || !svgRef.current) return;
    const markup = new XMLSerializer().serializeToString(svgRef.current);
    cachedUrl = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
    setUrl(cachedUrl);
  }, [url]);

  if (url) {
    return <img src={url} alt="" aria-hidden="true" decoding="async"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover select-none" />;
  }
  return <BackdropSvg svgRef={svgRef} />;
});

function BackdropSvg({ svgRef }: { svgRef: React.RefObject<SVGSVGElement> }) {
  const art = useMemo(() => {
    const rand = seeded(19112026);
    const minor: string[] = [];
    for (let x = -260; x < W + 260; x += 62 + rand() * 30) minor.push(street(rand, x, -120, x + (rand() - 0.5) * 60, H + 120));
    for (let y = -160; y < H + 160; y += 58 + rand() * 32) minor.push(street(rand, -260, y, W + 260, y + (rand() - 0.5) * 60));
    const avenues = [
      street(rand, -100, 860, 1700, 120), street(rand, -80, 140, 1680, 900),
      street(rand, 380, -60, 520, 1060), street(rand, 1180, -60, 1080, 1060),
    ];
    // painted city blocks, only towards the edges
    const blocks: { x: number; y: number; w: number; h: number; r: number; fill: string }[] = [];
    for (let i = 0; i < 140; i++) {
      const x = rand() * W;
      const y = rand() * H;
      if (edge(x, y) < 0.72) continue;
      blocks.push({ x, y, w: 26 + rand() * 46, h: 20 + rand() * 34, r: -14 + (rand() - 0.5) * 8, fill: BLOCK_TINTS[Math.floor(rand() * BLOCK_TINTS.length)] });
    }
    // trees in the parks
    const trees: { x: number; y: number; r: number }[] = [];
    for (const [cx, cy, rx, ry] of [[170, 150, 210, 130], [1440, 820, 230, 150], [760, 15, 240, 50], [1500, 470, 90, 90]]) {
      for (let i = 0; i < 26; i++) {
        const a = rand() * Math.PI * 2;
        const d = Math.sqrt(rand());
        trees.push({ x: cx + Math.cos(a) * rx * d, y: cy + Math.sin(a) * ry * d, r: 5 + rand() * 6 });
      }
    }
    return { minor, avenues, blocks, trees };
  }, []);

  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none"
      width={W} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <filter id="wc" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="3" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="38" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <filter id="wc-small" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="11" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
          <feColorMatrix values="0 0 0 0 0.55  0 0 0 0 0.47  0 0 0 0 0.38  0 0 0 0.06 0" />
        </filter>
        <radialGradient id="fade" cx="50%" cy="46%" r="62%">
          <stop offset="0%" stopColor="black" />
          <stop offset="40%" stopColor="black" />
          <stop offset="74%" stopColor="white" />
        </radialGradient>
        <mask id="edges"><rect width={W} height={H} fill="url(#fade)" /></mask>
      </defs>

      <rect width={W} height={H} fill="#fbf8f2" />
      <rect width={W} height={H} filter="url(#grain)" />

      <g mask="url(#edges)">
        {/* Big watercolour washes: parks, plazas, a pond */}
        <g filter="url(#wc)" opacity="0.55">
          <ellipse cx="170" cy="150" rx="230" ry="150" fill={WASHES[0]} />
          <ellipse cx="1440" cy="820" rx="250" ry="170" fill={WASHES[0]} />
          <ellipse cx="1470" cy="170" rx="190" ry="120" fill={WASHES[1]} />
          <ellipse cx="210" cy="860" rx="220" ry="140" fill={WASHES[2]} />
          <ellipse cx="820" cy="985" rx="300" ry="70" fill={WASHES[1]} />
          <ellipse cx="760" cy="10" rx="260" ry="60" fill={WASHES[5]} />
          <ellipse cx="1520" cy="470" rx="110" ry="100" fill={WASHES[4]} />
          <ellipse cx="60" cy="560" rx="120" ry="90" fill={WASHES[4]} />
          <ellipse cx="1180" cy="60" rx="70" ry="38" fill={WASHES[3]} />
        </g>

        {/* Painted blocks */}
        <g filter="url(#wc-small)" opacity="0.75">
          {art.blocks.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="3" fill={b.fill}
              transform={`rotate(${b.r.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)})`} />
          ))}
        </g>

        {/* River + pond */}
        <path d="M-40 520 C 120 560, 160 700, 300 760 S 520 900, 640 1060" fill="none" stroke="#bcd6ea" strokeWidth="26"
          strokeLinecap="round" filter="url(#wc)" opacity="0.7" />
        <path d="M-40 520 C 120 560, 160 700, 300 760 S 520 900, 640 1060" fill="none" stroke="#8fb5d6" strokeWidth="1.2" opacity="0.7" />
        <ellipse cx="1180" cy="60" rx="46" ry="22" fill="#cfe0ee" filter="url(#wc-small)" opacity="0.9" />

        {/* Street plan */}
        <g fill="none" stroke={INK} strokeLinecap="round">
          {art.minor.map((d, i) => <path key={i} d={d} strokeWidth="0.8" opacity="0.3" />)}
          {art.avenues.map((d, i) => <path key={'a' + i} d={d} strokeWidth="2.4" opacity="0.36" />)}
        </g>

        {/* Trees */}
        <g filter="url(#wc-small)">
          {art.trees.map((t, i) => <circle key={i} cx={t.x} cy={t.y} r={t.r} fill="#a9cf98" opacity="0.6" />)}
        </g>

        {/* Two Metro lines with stations */}
        <path d="M1240 -40 C 1280 160, 1360 260, 1520 330 S 1640 470, 1660 560" fill="none" stroke="#d7262e" strokeWidth="3" opacity="0.4" strokeLinecap="round" />
        {[[1262, 90], [1352, 248], [1500, 320], [1612, 450]].map(([cx, cy]) => (
          <circle key={'r' + cx} cx={cx} cy={cy} r="7" fill="#fbf8f2" stroke="#d7262e" strokeWidth="2.4" opacity="0.55" />
        ))}
        <path d="M-40 300 C 120 280, 220 360, 330 330 S 470 230, 560 -40" fill="none" stroke="#4d7cc8" strokeWidth="3" opacity="0.35" strokeLinecap="round" />
        {[[60, 292], [205, 330], [345, 324], [470, 190]].map(([cx, cy]) => (
          <circle key={'b' + cx} cx={cx} cy={cy} r="7" fill="#fbf8f2" stroke="#4d7cc8" strokeWidth="2.4" opacity="0.5" />
        ))}

        {/* Sketched buildings */}
        <g fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.55">
          {BUILDINGS.map((b, i) => <path key={i} d={b.d} transform={`translate(${b.x} ${b.y}) scale(${b.s})`} />)}
        </g>

        {/* Student doodles */}
        {DOODLES.map((d, i) => (
          <Doodle key={i} x={d.x} y={d.y} rotate={d.r} scale={d.s ?? 2.2}>{d.d}</Doodle>
        ))}
      </g>
    </svg>
  );
}
