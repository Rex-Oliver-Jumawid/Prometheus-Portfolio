import { ProjectGallerySection } from "@/components/portfolio/project-gallery/project-gallery-section";

import { Hero } from "./_components/hero";

const capabilities = [
  "Product design",
  "Web applications",
  "Internal systems",
  "Workflow automation",
  "Prototypes",
  "Design systems",
] as const;

export default function Home() {
  return (
    <main>
      <Hero />

      <ProjectGallerySection />

      <section id="approach" className="approach-section">
        <div className="section-shell approach-grid">
          <div className="section-intro approach-intro">
            <p className="eyebrow eyebrow-light">How we work</p>
            <h2>Understand the operation first. Build the software second.</h2>
          </div>

          <ol className="approach-list">
            <li>
              <span>01</span>
              <div>
                <h3>Map the real workflow</h3>
                <p>
                  We identify where information starts, where it gets stuck, and
                  what people are doing manually to keep work moving.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Prototype the system</h3>
                <p>
                  We turn that workflow into a focused interface before the
                  implementation grows around the wrong assumptions.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Build in useful slices</h3>
                <p>
                  We ship complete working paths, validate them with the people
                  using the system, and expand from there.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section id="capabilities" className="capabilities-section section-shell">
        <div className="section-intro compact">
          <p className="eyebrow">Capabilities</p>
          <h2>Design and engineering under one roof.</h2>
        </div>
        <div className="capability-marquee" role="list">
          {capabilities.map((capability, index) => (
            <div className="capability-item" role="listitem" key={capability}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {capability}
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="contact-section section-shell">
        <p className="eyebrow">Have something complicated?</p>
        <h2>Tell us what your team is trying to untangle.</h2>
        <p>
          The portfolio foundation is ready. Wire your preferred email, social,
          or booking link here when the public contact channel is finalized.
        </p>
        <a className="text-link" href="#top">
          Back to top <span aria-hidden="true">↑</span>
        </a>
      </section>

      <footer className="site-footer section-shell">
        <span>Prometheus</span>
        <span>Digital systems for growing businesses.</span>
      </footer>
    </main>
  );
}
