/** Reveal in-flow content from its trigger without moving the surrounding layout abruptly. */
import type { ReactNode } from 'react';
import { AnimatePresence, m, useIsPresent, useReducedMotion } from 'motion/react';

function ExpandableBody({ children }: { children: ReactNode }) {
  const present = useIsPresent();
  const reduced = useReducedMotion();
  return (
    <m.div
      data-ui-motion="disclosure"
      aria-hidden={!present || undefined}
      ref={(element) => { if (element) element.inert = !present; }}
      initial={reduced ? false : { height: 0, opacity: 0, overflow: 'hidden' }}
      animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
      exit={{ height: 0, opacity: 0, overflow: 'hidden', transition: { duration: reduced ? 0 : 0.15 } }}
      transition={{ duration: reduced ? 0 : 0.22, ease: [0.2, 0.65, 0.25, 1] }}
    >
      <div className="flow-root">{children}</div>
    </m.div>
  );
}

export function Expandable({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && <ExpandableBody>{children}</ExpandableBody>}
    </AnimatePresence>
  );
}
