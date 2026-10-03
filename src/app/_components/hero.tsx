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
              src="/assets/hero/prometheus-figure.webp"
              alt=""
              width={700}
              height={736}
              sizes="(max-width: 640px) 118vw, (max-width: 1000px) 84vw, 60vw"
              loading="eager"
              draggable={false}
            />
          </div>
        </div>
      </section>
    </>
  );
}
