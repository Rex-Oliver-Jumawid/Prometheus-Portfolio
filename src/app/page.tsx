const projects = [
  {
    number: "01",
    category: "Commerce operations",
    title: "Furniture operations system",
    description:
      "A connected workspace for products, quotations, orders, records, and day-to-day coordination.",
    tags: ["Orders", "Quotations", "Records"],
  },
  {
    number: "02",
    category: "Retail systems",
    title: "Hardware store platform",
    description:
      "A practical digital system designed around the real flow of inventory, customers, and operations.",
    tags: ["Inventory", "Customers", "Workflow"],
  },
  {
    number: "03",
    category: "Service experience",
    title: "Nail studio platform",
    description:
      "A customer-facing experience and operating system shaped around bookings, services, and repeat visits.",
    tags: ["Bookings", "Services", "Experience"],
  },
] as const;

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
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Prometheus home">
          <span className="brand-mark">P</span>
          <span>Prometheus</span>
        </a>
        <nav className="site-nav" aria-label="Primary navigation">
          <a href="#work">Work</a>
          <a href="#approach">Approach</a>
          <a href="#capabilities">Capabilities</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <section id="top" className="hero section-shell">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="signal-dot" />
            Digital systems studio
          </p>
          <h1>We build systems that make complicated work feel simple.</h1>
          <p className="hero-lede">
            Prometheus turns scattered tools, repetitive work, and disconnected
            information into focused digital products built around how a
            business actually operates.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#work">
              See selected work
            </a>
            <a className="button button-ghost" href="#contact">
              Start a project
            </a>
          </div>
        </div>

        <div className="system-stage" aria-hidden="true">
          <div className="stage-label">ONE CONNECTED SYSTEM</div>
          <div className="stage-grid">
            <span className="stage-cell cell-red" />
            <span className="stage-cell cell-blue" />
            <span className="stage-cell cell-ink" />
            <span className="stage-cell cell-cream" />
            <span className="stage-cell cell-outline" />
          </div>
          <div className="stage-note note-top">INPUT</div>
          <div className="stage-note note-bottom">OUTPUT</div>
          <div className="stage-axis axis-x" />
          <div className="stage-axis axis-y" />
        </div>
      </section>

      <section id="work" className="work-section section-shell">
        <div className="section-intro">
          <p className="eyebrow">Selected work</p>
          <h2>Systems shaped around the work, not the other way around.</h2>
        </div>

        <div className="project-grid">
          {projects.map((project) => (
            <article className="project-card" key={project.number}>
              <div className="project-card-top">
                <span className="project-number">{project.number}</span>
                <span className="project-category">{project.category}</span>
              </div>
              <div className="project-card-copy">
                <h3>{project.title}</h3>
                <p>{project.description}</p>
              </div>
              <ul className="tag-list" aria-label={project.title + " topics"}>
                {project.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

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
