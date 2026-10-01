import Image from "next/image";

import { HeroNavigation } from "./hero-navigation";
import { HeroQuote } from "./hero-quote";
import styles from "./hero.module.css";

export function Hero() {
  return (
    <>
      <HeroNavigation />
      <section id="top" className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.scene} aria-hidden="true">
          <Image
            className={styles.sky}
            src="/assets/hero/sky.webp"
            alt=""
            fill
            sizes="100vw"
            preload
            draggable={false}
          />
        </div>
        <div className={styles.figure} aria-hidden="true">
          <Image
            src="/assets/hero/figure.webp"
            alt=""
            width={986}
            height={718}
            sizes="(max-width: 640px) 140vw, (max-width: 1000px) 95vw, 62vw"
            loading="eager"
            draggable={false}
          />
        </div>

        <div className={styles.content}>
          <div className={styles.copy}>
            <h1 id="hero-title" className={styles.title}>
              <span>Where Ideas</span>{" "}
              <span className={styles.titleLast}>
                Ignite<span className={styles.period}>.</span>
              </span>
            </h1>
            <p className={styles.subtitle}>
              We carry the flame of innovation — transforming bold visions into
              reality.
            </p>
            <p className={styles.eyebrow}>Creative atelier</p>
            <div className={styles.actions}>
              <a className={styles.primary} href="#work">
                See our work <span aria-hidden="true">↗</span>
              </a>
              <a className={styles.secondary} href="#approach">
                Learn more <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          <div className={styles.bottomRow}>
            <HeroQuote />
          </div>
        </div>
      </section>
    </>
  );
}
