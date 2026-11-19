/**
 * Full-screen hand-drawn backdrop for the start and form pages (T30), drawn in code (no image file):
 * a sketched street plan with watercolour washes (parks, a river, a warm plaza), a Metro line and a few
 * student doodles (books, coffee, bike, key, cap). Dense at the edges, clear in the middle for the content.
 * Deterministic: a seeded random generator gives the lines their slightly hand-made wobble.
 */
import { memo, useMemo } from 'react';

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

/** Slightly wobbly street from (x1,y1) to (x2,y2): a quadratic curve with a hand-drawn offset. */
function street(rand: () => number, x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2 + (rand() - 0.5) * 26;
  const my = (y1 + y2) / 2 + (rand() - 0.5) * 26;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function Doodle({ x, y, rotate = 0, scale = 2.2, children }: { x: number; y: number; rotate?: number; scale?: number; children: React.ReactNode }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`} fill="none" stroke={INK} strokeWidth={0.75} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </g>
  );
}

export const StudentBackdrop = memo(function StudentBackdrop() {
  const streets = useMemo(() => {
    const rand = seeded(19112026);
    const minor: string[] = [];
    for (let x = -260; x < W + 260; x += 62 + rand() * 30) minor.push(street(rand, x, -120, x + (rand() - 0.5) * 60, H + 120));
    for (let y = -160; y < H + 160; y += 58 + rand() * 32) minor.push(street(rand, -260, y, W + 260, y + (rand() - 0.5) * 60));
    const avenues = [
      street(rand, -100, 860, 1700, 120),
      street(rand, -80, 140, 1680, 900),
      street(rand, 380, -60, 520, 1060),
      street(rand, 1180, -60, 1080, 1060),
    ];
    return { minor, avenues };
  }, []);

  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none"
      viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
      <defs>
        {/* Watercolour: wobble the edges with noise and soften them */}
        <filter id="wc" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="3" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="38" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
          <feColorMatrix values="0 0 0 0 0.55  0 0 0 0 0.47  0 0 0 0 0.38  0 0 0 0.06 0" />
        </filter>
        {/* Keep the centre clean: the drawing fades out towards the middle of the screen */}
        <radialGradient id="fade" cx="50%" cy="46%" r="62%">
          <stop offset="0%" stopColor="black" />
          <stop offset="42%" stopColor="black" />
          <stop offset="78%" stopColor="white" />
        </radialGradient>
        <mask id="edges">
          <rect width={W} height={H} fill="url(#fade)" />
        </mask>
      </defs>

      <rect width={W} height={H} fill="#fbf8f2" />
      <rect width={W} height={H} filter="url(#grain)" />

      <g mask="url(#edges)">
        {/* Watercolour washes */}
        <g filter="url(#wc)" opacity="0.55">
          <ellipse cx="170" cy="150" rx="230" ry="150" fill="#cfe3bf" />
          <ellipse cx="1440" cy="820" rx="250" ry="170" fill="#cfe3bf" />
          <ellipse cx="1470" cy="170" rx="190" ry="120" fill="#f3e3c2" />
          <ellipse cx="210" cy="860" rx="220" ry="140" fill="#f1d5c3" />
          <ellipse cx="820" cy="985" rx="300" ry="70" fill="#f3e3c2" />
          <ellipse cx="760" cy="10" rx="260" ry="60" fill="#dfe9d0" />
        </g>
        {/* River (Manzanares-like) */}
        <path d="M-40 520 C 120 560, 160 700, 300 760 S 520 900, 640 1060" fill="none" stroke="#bcd6ea" strokeWidth="26"
          strokeLinecap="round" filter="url(#wc)" opacity="0.7" />
        <path d="M-40 520 C 120 560, 160 700, 300 760 S 520 900, 640 1060" fill="none" stroke="#8fb5d6" strokeWidth="1.2" opacity="0.7" />

        {/* Street plan */}
        <g fill="none" stroke={INK} strokeLinecap="round">
          {streets.minor.map((d, i) => <path key={i} d={d} strokeWidth="0.8" opacity="0.32" />)}
          {streets.avenues.map((d, i) => <path key={'a' + i} d={d} strokeWidth="2.4" opacity="0.38" />)}
        </g>

        {/* Metro line with stations */}
        <path d="M1240 -40 C 1280 160, 1360 260, 1520 330 S 1640 470, 1660 560" fill="none" stroke="#d7262e" strokeWidth="3" opacity="0.45" strokeLinecap="round" />
        {[[1262, 90], [1352, 248], [1500, 320], [1612, 450]].map(([cx, cy]) => (
          <circle key={cx} cx={cx} cy={cy} r="7" fill="#fbf8f2" stroke="#d7262e" strokeWidth="2.4" opacity="0.6" />
        ))}

        {/* Student doodles */}
        <Doodle x={1335} y={540} rotate={-8}>{/* books */}
          <rect x="0" y="14" width="22" height="5" rx="1" /><rect x="2" y="9" width="19" height="5" rx="1" /><rect x="-1" y="4" width="21" height="5" rx="1" />
          <path d="M4 4v5M7 9v5M5 14v5" />
        </Doodle>
        <Doodle x={110} y={410} rotate={6}>{/* coffee */}
          <path d="M2 8h14v6a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6z" /><path d="M16 10h2a3 3 0 0 1 0 6h-2" /><path d="M6 2c-1 2 1 3 0 5M10 2c-1 2 1 3 0 5" />
        </Doodle>
        <Doodle x={1180} y={880} rotate={-4} scale={2.4}>{/* bike */}
          <circle cx="5" cy="15" r="4.5" /><circle cx="22" cy="15" r="4.5" /><path d="M5 15l6-9h7l4 9M11 6l3 9h-9M16 3h4" />
        </Doodle>
        <Doodle x={300} y={70} rotate={18}>{/* key */}
          <circle cx="5" cy="9" r="4.5" /><path d="M9.5 9H24M19 9v4M22 9v3" />
        </Doodle>
        <Doodle x={1460} y={60} rotate={-12}>{/* graduation cap */}
          <path d="M1 7l11-5 11 5-11 5z" /><path d="M6 9.5v5c3 2.5 9 2.5 12 0v-5M23 7v6" />
        </Doodle>
        <Doodle x={70} y={650} rotate={-10} scale={2}>{/* map pin */}
          <path d="M10 22s7-7 7-12A7 7 0 0 0 3 10c0 5 7 12 7 12z" /><circle cx="10" cy="10" r="2.5" />
        </Doodle>
      </g>
    </svg>
  );
});
