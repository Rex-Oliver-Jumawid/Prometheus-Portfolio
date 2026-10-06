import { ProjectBookHandoff } from "@/components/portfolio/project-book-handoff/project-book-handoff";
import { ProjectGallerySection } from "@/components/portfolio/project-gallery/project-gallery-section";
import { ProjectLibrarySection } from "@/components/portfolio/project-library/project-library-section";

import { Hero } from "./_components/hero";
import { StickyViewports } from "./_components/sticky-viewports";

export default function Home() {
  return (
    <StickyViewports>
      <Hero />

      <ProjectGallerySection />

      <ProjectLibrarySection />

      <ProjectBookHandoff />

      <section
        className="library-hold"
        data-viewport-flow="true"
        aria-hidden="true"
      />

      <section
        id="contact"
        className="contact-footer"
        aria-labelledby="contact-title"
      >
        <div className="footer-artboard">
          <div className="footer-shell">
            <div className="footer-topline" aria-hidden="true">
              <span>Prometheus</span>
              <span>Contact us</span>
            </div>

            <div className="footer-message">
              <h2 id="contact-title">
                Let&apos;s build a system around how your business actually works.
              </h2>
              <p>
                Tell us where work becomes repetitive, fragmented, or difficult
                to keep track of. We&apos;ll start there.
              </p>
            </div>

            <div className="footer-lower">
              <span className="footer-meeting">Book a 15-minute meeting</span>

              <nav className="footer-links" aria-label="Footer navigation">
                <a href="#top">Story</a>
                <a href="#work">Systems</a>
                <a href="#work">Approach</a>
                <a href="#library">Projects</a>
                <a href="#work">Selected Work</a>
              </nav>
            </div>
          </div>

          <p className="footer-wordmark" aria-hidden="true">
            PROMETHEUS
          </p>
        </div>
      </section>
    </StickyViewports>
  );
}
