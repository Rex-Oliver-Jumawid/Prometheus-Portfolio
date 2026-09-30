"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./hero.module.css";

const cards = [
  {
    caption: "THE FIRST SPARK",
    title: "We want to bring ideas to life.",
    description: "Thoughtful design and technology, from vision to reality.",
  },
  {
    caption: "CONNECTED SYSTEMS",
    title: "Your business. One connected system.",
    description: "A focused workspace that puts the pieces together.",
  },
  {
    caption: "LESS FRICTION",
    title: "Bring tools together. Simplify repetitive work.",
    description: "Make room for the work that matters most.",
  },
  {
    caption: "BUILT AROUND YOU",
    title: "Build around the way your team actually works.",
    description: "Digital products shaped around real people and workflows.",
  },
] as const;

const states = ["active", "next", "third", "exit"] as const;
const rotationDelay = 8000;

export function HeroQuote() {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(true);
  const stackRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!stackRef.current || typeof IntersectionObserver === "undefined")
      return;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
    });
    observer.observe(stackRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (hovered || focused || !inView) return;

    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout> | undefined;

    function schedule() {
      clearTimeout(timer);
      if (!motion?.matches && !document.hidden) {
        timer = setTimeout(() => {
          setIndex((current) => (current + 1) % cards.length);
        }, rotationDelay);
      }
    }

    motion?.addEventListener("change", schedule);
    document.addEventListener("visibilitychange", schedule);
    schedule();

    return () => {
      clearTimeout(timer);
      motion?.removeEventListener("change", schedule);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [index, hovered, focused, inView]);

  return (
    <aside
      ref={stackRef}
      className={styles.quoteStack}
      aria-label="From Prometheus"
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <div className={styles.toastList} aria-live="off">
        {cards.map((card, cardIndex) => {
          const state =
            states[(cardIndex - index + cards.length) % cards.length];
          const active = state === "active";

          return (
            <article
              key={card.caption}
              className={styles.quoteCard}
              data-state={state}
              aria-hidden={!active}
              inert={!active}
            >
              <p className={styles.quoteCaption}>{card.caption}</p>
              <h2 className={styles.quoteText}>{card.title}</h2>
              <p className={styles.quoteDescription}>{card.description}</p>
            </article>
          );
        })}
      </div>
    </aside>
  );
}
