import { motion, useReducedMotion } from 'framer-motion';
import { Children, type ReactNode } from 'react';

type RevealTag = 'div' | 'section' | 'li' | 'aside' | 'header';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: RevealTag;
  id?: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Fade + small slide-up the first time the element scrolls into view.
 * Uses transform/opacity only, so there is no layout shift. Framer clears the
 * transform once it settles, so fixed or sticky children are unaffected.
 * Reduced motion: the StorefrontLayout's MotionConfig drops the slide, and
 * this skips the fade too.
 */
export function Reveal({ children, delay = 0, className, as = 'div', id }: RevealProps) {
  const reduce = useReducedMotion();
  const Component = motion[as];
  return (
    <Component
      id={id}
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </Component>
  );
}

/**
 * Reveals each direct child on its own as it scrolls into view, with a small
 * stagger for children that enter together. For stacked page content (headings,
 * paragraphs, tables, panels); not for grid children, which change layout.
 */
export function RevealStack({ children, step = 0.06, className }: { children: ReactNode; step?: number; className?: string }) {
  return (
    <>
      {Children.toArray(children).map((child, i) => (
        <Reveal key={i} delay={Math.min(i, 4) * step} className={className}>
          {child}
        </Reveal>
      ))}
    </>
  );
}
