/**
 * Smoothly animates numeric values (e.g. estimated monthly rent) over 220ms ease-out.
 * Respects prefers-reduced-motion automatically.
 */
import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  formatter: (n: number) => string;
  durationMs?: number;
}

export function AnimatedNumber({
  value,
  formatter,
  durationMs = 220,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || fromRef.current === value) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }

    const startVal = fromRef.current;
    const delta = value - startVal;
    const startTime = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = startVal + delta * eased;
      setDisplay(current);

      if (t < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId);
      fromRef.current = value;
    };
  }, [value, durationMs]);

  return <span className="tabular-nums">{formatter(display)}</span>;
}
