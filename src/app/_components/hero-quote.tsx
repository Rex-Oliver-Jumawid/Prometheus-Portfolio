"use client";

import { useEffect, useRef, useState } from "react";

import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { appConfig } from "@/config/app";

import styles from "./hero.module.css";

const cards = [
  {
    title: "We want to bring ideas to life.",
  },
  {
    title: "Your business. One connected system.",
  },
  {
    title: "Bring tools together. Simplify repetitive work.",
  },
  {
    title: "Build around the way your team actually works.",
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
              key={card.title}
              className={styles.quoteCard}
              data-state={state}
              aria-hidden={!active}
              inert={!active}
            >
              <LiquidGlassCard
                className={styles.quoteMaterial}
                contentClassName={styles.quoteContent}
              >
                <span className={styles.quoteAvatar} aria-hidden="true">
                  <span className={styles.mark} />
                </span>
                <div className={styles.quoteIdentity}>
                  <p className={styles.quoteAuthor}>{appConfig.name}</p>
                  <p className={styles.quoteUsername}>@prometheus.team</p>
                </div>
                <h2 className={styles.quoteText}>{card.title}</h2>
              </LiquidGlassCard>
            </article>
          );
        })}
      </div>
    </aside>
  );
}
