import Image from "next/image";

import { HeroNavigation } from "./hero-navigation";
import { HeroParallax } from "./hero-parallax";
import styles from "./hero.module.css";

export function Hero() {
  return (
    <>
      <HeroNavigation />
      <HeroParallax />
      <section
        id="top"
        className={styles.hero}
        aria-label="Prometheus"
        data-viewport-pin="top"
      >
        <div className={styles.stage} data-hero-stage>
          <div className={styles.scene} aria-hidden="true">
            <Image
              className={styles.sky}
              src="/assets/hero/sky-scroll.webp"
              alt=""
              fill
              sizes="100vw"
              preload
              draggable={false}
            />
          </div>

          <div className={styles.figure} aria-hidden="true">
            <Image
              src="/assets/hero/Prometheus in Flight with Flame.png"
              alt=""
              width={1254}
              height={1254}
              sizes="(max-width: 640px) 188vw, (max-width: 1000px) 134vw, 104vw"
              loading="eager"
              unoptimized
              draggable={false}
            />
          </div>

          <div className={styles.editorialShade} aria-hidden="true" />

          <div className={styles.editorial}>
            <p className={styles.editorialKicker}>Prometheus</p>
            <h1 className={styles.editorialTitle}>Where ideas ignite.</h1>
            <p className={styles.editorialBody}>
              We design connected systems around how businesses actually work.
            </p>
            <p className={styles.editorialMeta}>
              <span>Selected work</span>
              <span className={styles.editorialDot} aria-hidden="true" />
              <span>2026</span>
            </p>
          </div>

          <div className={styles.scrollCue} aria-hidden="true">
            <span>Descend into the work</span>
            <span className={styles.scrollRule} />
          </div>
        </div>
      </section>
    </>
  );
}
