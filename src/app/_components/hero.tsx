import Image from "next/image";

import { HeroNavigation } from "./hero-navigation";
import { HeroParallax } from "./hero-parallax";
import { CloudTransition } from "./cloud-transition";
import styles from "./hero.module.css";

export function Hero() {
  return (
    <>
      <HeroNavigation />
      <HeroParallax />
      <CloudTransition />
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
          </div>
        </div>
      </section>
    </>
  );
}
