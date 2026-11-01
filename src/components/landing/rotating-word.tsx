// src/components/landing/rotating-word.tsx
"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const words = [
  { text: "customers", dot: "var(--pen)", tint: "var(--pen-soft)" },
  { text: "boss", dot: "var(--degraded)", tint: "var(--degraded-soft)" },
  { text: "users", dot: "var(--up)", tint: "var(--up-soft)" },
  { text: "clients", dot: "var(--down)", tint: "var(--down-soft)" },
];

/** The one word in the headline that changes, set in a soft tinted chip that resizes smoothly. */
export function RotatingWord() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % words.length), 2400);
    return () => clearInterval(timer);
  }, [reduce]);

  const word = words[index];
  return (
    <motion.span
      layout
      animate={{ backgroundColor: word.tint }}
      transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
      className="inline-flex items-center gap-[0.18em] overflow-hidden whitespace-nowrap rounded-[0.3em] px-[0.26em] align-bottom leading-[1.15]"
    >
      <motion.span layout="position" animate={{ backgroundColor: word.dot }} className="size-[0.3em] shrink-0 rounded-full" aria-hidden />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={word.text}
          layout="position"
          initial={reduce ? false : { y: "0.6em", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-0.6em", opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
        >
          {word.text}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}
