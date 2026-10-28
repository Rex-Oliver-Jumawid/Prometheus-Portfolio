import Image from "next/image";
import { ArrowDownRight, ArrowRight, ArrowUpRight, MoveUpRight } from "lucide-react";

import styles from "./studio.module.css";

const services = [
  {
    title: "Websites",
    items: ["Landing pages", "Business websites", "Responsive interfaces", "Product showcases", "Website redesign"],
  },
  {
    title: "Design",
    items: ["Product strategy", "UI/UX design", "Interface systems", "Digital experiences", "Prototyping"],
  },
  {
    title: "Development",
    items: ["Custom web apps", "Management systems", "ERP platforms", "Full digital solutions", "Mobile applications"],
  },
] as const;

const specializations = [
  { title: "Retail & commerce", tags: ["Quotations", "Sales", "Inventory", "Deliveries"] },
  { title: "Service businesses", tags: ["Bookings", "Staff", "Schedules", "Customers"] },
  { title: "AI & automation", tags: ["On-device AI", "Workflows", "Assistants"] },
  { title: "Mobility", tags: ["Parking", "Local discovery", "Maps"] },
] as const;

function ArrowButton({ children, href, light = false }: { children: React.ReactNode; href: string; light?: boolean }) {
  return (
    <a className={light ? styles.arrowButtonLight : styles.arrowButton} href={href}>
      <span className={styles.arrowButtonIcon}><ArrowDownRight size={21} strokeWidth={1.8} aria-hidden="true" /></span>
      <span className={styles.arrowButtonLabel}>{children}</span>
    </a>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className={styles.sectionLabel}>{children}</p>;
}

function BrowserFrame({ variant }: { variant: "dashboard" | "site" | "calendar" }) {
  return (
    <div className={styles.browserFrame}>
      <div className={styles.browserBar}>
        <span className={styles.browserDots}><i /><i /><i /></span>
        <span>{variant === "dashboard" ? "Furniture Odyssey / Overview" : variant === "calendar" ? "Piercing Corner / Schedule" : "Project website"}</span>
        <span className={styles.browserBarMark}>↗</span>
      </div>
      {variant === "dashboard" ? (
        <div className={styles.dashboardLayout}>
          <aside className={styles.dashboardSidebar}>
            <strong>FO<span>●</span></strong>
            <span className={styles.sideSelected}>Overview</span>
            <span>Products</span><span>Quotations</span><span>Orders</span><span>Payments</span><span>Deliveries</span>
          </aside>
          <div className={styles.dashboardMain}>
            <span className={styles.microLabel}>BUSINESS OPERATIONS</span>
            <h4>Sales overview</h4>
            <div className={styles.metricGrid}>
              <div><span>Total sales</span><strong>₱84,200</strong><em>Sample data</em></div>
              <div><span>Open orders</span><strong>32</strong><em>Sample data</em></div>
              <div><span>Customers</span><strong>184</strong><em>Sample data</em></div>
            </div>
            <div className={styles.chartPanel}>
              <span>Revenue performance / illustrative</span>
              <div className={styles.chartBars} aria-hidden="true">
                {[38, 54, 48, 69, 56, 78, 67, 89, 75, 100].map((height, index) => (
                  <i key={index} style={{ height: height + "%" }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : variant === "calendar" ? (
        <div className={styles.scheduleMock}>
          <div className={styles.scheduleMockHeading}><span>PIERCING CORNER</span><b>Studio schedule</b></div>
          <div className={styles.scheduleGrid}>
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
            {Array.from({ length: 28 }, (_, i) => <span key={i + 7} className={i === 17 ? styles.scheduleSelected : ""}>{i + 1}</span>)}
          </div>
          <div className={styles.scheduleBooked}>Appointments and availability</div>
        </div>
      ) : (
        <div className={styles.publicSiteMock}>
          <div className={styles.publicSiteCopy}>
            <span>HANDMADE EXPERIENCES</span>
            <h4>Good design.<br />Good business.</h4>
            <p>A seamless experience for visitors and the people behind the business.</p>
            <span className={styles.mockButton}>Explore services ↗</span>
          </div>
          <div className={styles.publicSiteArt} aria-hidden="true"><span>✳</span></div>
        </div>
      )}
    </div>
  );
}

function ProjectCase({ name, description, tags, type, number }: {
  name: string;
  description: string;
  tags: readonly string[];
  type: "furniture" | "piercing";
  number: string;
}) {
  return (
    <article className={styles.caseStudy}>
      <div className={styles.caseText}>
        <span className={styles.caseNumber}>{number} / SELECTED CLIENT WORK</span>
        <div className={styles.pills}>{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        <h3>{name}</h3>
        <p>{description}</p>
        <div className={styles.caseFoot}>
          <span>Website + custom management system</span>
          <ArrowUpRight size={23} aria-hidden="true" />
        </div>
      </div>
      <div className={type === "furniture" ? styles.caseVisualFurniture : styles.caseVisualPiercing}>
        <div className={styles.caseVisualLead}>
          {type === "furniture" ? (
            <div className={styles.furnitureLead}>
              <div className={styles.furnitureCaption}>FURNITURE ODYSSEY<span>01 / COMMERCE SYSTEM</span></div>
              <div className={styles.furnitureChair} aria-hidden="true"><div className={styles.chairBack} /><div className={styles.chairSeat} /><div className={styles.chairLegs} /></div>
              <span className={styles.bigProjectName}>Made for the way<br />business moves.</span>
            </div>
          ) : (
            <div className={styles.piercingLead}>
              <p>PIERCING CORNER</p>
              <div className={styles.piercingRings} aria-hidden="true"><i /><i /><i /></div>
              <h4>Promise<br /><i>Hindi Masakit.</i></h4>
            </div>
          )}
        </div>
        <div className={styles.caseVisualSecondary}>
          <BrowserFrame variant={type === "furniture" ? "dashboard" : "calendar"} />
        </div>
        <div className={styles.caseVisualTertiary}>
          {type === "furniture" ? (
            <div className={styles.dashboardReal}>
              <Image src="/assets/furniture-gallery/dashboard.jpeg" alt="Furniture Odyssey management dashboard project screenshot" fill sizes="(max-width: 800px) 92vw, 54vw" />
            </div>
          ) : (
            <div className={styles.piercingFeature}>
              <span>DESIGNED FOR<br />REAL WORKFLOWS</span>
              <strong>One studio.<br />One connected system.</strong>
              <span className={styles.piercingFeatureOrb} aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function StudioPage() {
  return (
    <main id="top" className={styles.studio}>
      <div className={styles.heroSurface}>
        <header className={styles.navigation}>
          <a href="#top" className={styles.wordmark} aria-label="Prometheus home">
            <span className={styles.wordmarkSymbol}>✳</span>prometheus<span className={styles.wordmarkDot}>.</span>
          </a>
          <nav className={styles.desktopNav} aria-label="Main navigation">
            <a href="#work">Our work</a>
            <a href="#services">Services</a>
            <a href="#products">Products</a>
            <a href="#about">About</a>
          </nav>
          <a className={styles.navContact} href="#contact">Contact us <span><ArrowUpRight size={18} /></span></a>
          <details className={styles.mobileMenu}>
            <summary aria-label="Toggle navigation"><span /><span /></summary>
            <nav aria-label="Mobile navigation">
              <a href="#work">Our work</a>
              <a href="#services">Services</a>
              <a href="#products">Products</a>
              <a href="#about">About</a>
              <a href="#contact">Contact</a>
            </nav>
          </details>
        </header>

        <section className={styles.hero} aria-labelledby="studio-hero-title">
          <p className={styles.heroEyebrow}>Digital product design & development studio</p>
          <h1 id="studio-hero-title" className={styles.heroHeading}>
            <span className={styles.heroLine}>Your design & dev partner that</span>
            <span className={styles.heroLine}>unites <em>websites,</em> <em>systems,</em> <em>products</em></span>
            <span className={styles.heroLine}><span className={styles.videoChip} aria-hidden="true"><span>▶</span></span> into one <em>experience</em></span>
          </h1>
          <div className={styles.heroDetails}>
            <div className={styles.heroNote}><span className={styles.noteGlyph} aria-hidden="true">{"{ / }"}</span><p>We design meaningful experiences for people and the businesses that serve them.</p></div>
            <div className={styles.heroNote}><span className={styles.noteGlyph} aria-hidden="true">{"{ / }"}</span><p>From striking public websites to the systems that make everything work.</p></div>
            <div className={styles.heroAction}><ArrowButton href="#contact">Let&apos;s talk</ArrowButton></div>
          </div>
          <div className={styles.heroTags}><span>WEB</span><span>AI</span><span>ERP</span></div>
          <div className={styles.clients}>
            <span className={styles.clientsOverline}>The businesses behind our work</span>
            <div className={styles.clientNames}>
              <span>Furniture <i>Odyssey</i></span>
              <span>PIERCING <b>CORNER</b></span>
            </div>
          </div>
        </section>
      </div>

      <section className={styles.results} aria-labelledby="approach-title">
        <SectionLabel>Our approach</SectionLabel>
        <div className={styles.resultsHeading}>
          <h2 id="approach-title">We make complex work feel <em>simple.</em></h2>
          <div className={styles.approachPoints}><span>↗ Thoughtful design for actual users</span><span>↗ Connected workflows, not scattered tools</span><span>↗ Software shaped around your business</span></div>
        </div>
        <div className={styles.resultGrid}>
          {[
            { number: "01", title: "Understand", copy: "Learn how the business operates before deciding what to build." },
            { number: "02", title: "Design", copy: "Turn complexity into intuitive journeys and purposeful interfaces." },
            { number: "03", title: "Engineer", copy: "Build maintainable products that make everyday work easier." },
          ].map((item) => <article key={item.number} className={styles.resultCard}><span>{item.number} / OUR PROCESS</span><strong>{item.title}</strong><p>{item.copy}</p><ArrowUpRight size={26} strokeWidth={1.5} aria-hidden="true" /></article>)}
        </div>
      </section>

      <section id="services" className={styles.services} aria-labelledby="services-title">
        <div className={styles.sectionIntro}><SectionLabel>Services</SectionLabel><h2 id="services-title">Digital experiences & <em>systems we build.</em></h2></div>
        <div className={styles.servicesPanel}>
          {services.map((group) => <div className={styles.serviceColumn} key={group.title}>
            <h3>{group.title}</h3>
            <ul>{group.items.map((item) => <li key={item}><span>{item}</span><ArrowDownRight size={21} strokeWidth={1.5} aria-hidden="true" /></li>)}</ul>
          </div>)}
        </div>
        <div className={styles.servicesCTA}><span className={styles.servicesMark} aria-hidden="true">✳</span><strong>Built for your business.<br />Designed for your people.</strong><ArrowButton href="#contact">Start a project</ArrowButton></div>
      </section>

      <section id="work" className={styles.work} aria-labelledby="work-title">
        <SectionLabel>Our cases</SectionLabel><h2 id="work-title" className={styles.srOnly}>Selected client case studies</h2>
        <ProjectCase number="01" name="Furniture Odyssey" type="furniture" tags={["Business systems", "ERP", "Web"]} description="From product catalog to quotations, orders, payments and deliveries. A connected digital platform for furniture operations." />
        <ProjectCase number="02" name="Piercing Corner" type="piercing" tags={["Studio operations", "Web", "Booking"]} description="A branded customer experience and a management system designed around piercers, services, customers and schedules." />
      </section>

      <section id="products" className={styles.products} aria-labelledby="products-title">
        <div className={styles.sectionIntro}><SectionLabel>Our products</SectionLabel><h2 id="products-title">Ideas we bring<br /><em>into the world.</em></h2></div>
        <div className={styles.productCards}>
          <article className={styles.parkeyCard}>
            <div className={styles.productTop}><span>01 / PRODUCT CONCEPT</span><ArrowUpRight size={23} /></div>
            <h3>Parkey<span>®</span></h3><p>Discover places to park, with the details that matter before you arrive.</p>
            <div className={styles.parkeyMap} aria-label="Illustrative parking map interface"><span className={styles.mapRoadA} /><span className={styles.mapRoadB} /><span className={styles.mapRoadC} /><b className={styles.parkingPin}>P</b><b className={styles.parkingPinTwo}>P</b><b className={styles.parkingPinThree}>P</b></div>
          </article>
          <article className={styles.screenlyCard}>
            <div className={styles.productTop}><span>02 / EXPERIMENTAL PRODUCT</span><ArrowUpRight size={23} /></div>
            <h3>Screenly<span>®</span></h3><p>Offline assistance that helps people understand and navigate their Android screens.</p>
            <div className={styles.screenlyDevice}><span className={styles.screenlyOrb} /><strong>How can I help?</strong><span>Explain this screen</span><span>Guide me through</span><span>Summarize what I see</span></div>
          </article>
        </div>
      </section>

      <section id="about" className={styles.about} aria-labelledby="about-title">
        <div className={styles.sectionIntro}><SectionLabel>About us</SectionLabel><h2 id="about-title">A studio that connects <em>design thinking</em> with working software.</h2></div>
        <div className={styles.aboutLayout}>
          <div className={styles.aboutVisual} aria-hidden="true"><span className={styles.aboutAsterisk}>✳</span><span className={styles.aboutOrbit} /><span className={styles.aboutCaption}>DESIGN + ENGINEERING</span></div>
          <div className={styles.aboutCopy}><p>We believe exceptional digital products should be beautiful to use and practical to operate. Our work spans customer-facing websites, internal systems and new product ideas.</p><p>Based in the Philippines. Building with curiosity, care and a bias for usefulness.</p><a href="#contact">Meet the studio <ArrowUpRight size={19} /></a></div>
        </div>
      </section>

      <section className={styles.industries} aria-labelledby="industries-title">
        <div className={styles.sectionIntro}><SectionLabel>Industries</SectionLabel><h2 id="industries-title">Built around how <em>your world works.</em></h2></div>
        <div className={styles.industryList}>{specializations.map((item, i) => <div className={styles.industryRow} key={item.title}><span>0{i + 1}</span><h3>{item.title}</h3><div>{item.tags.map(tag => <span key={tag}>{tag}</span>)}</div><ArrowUpRight size={23} aria-hidden="true" /></div>)}</div>
      </section>

      <section id="contact" className={styles.contact} aria-labelledby="contact-title">
        <div className={styles.contactPanel}>
          <h2 id="contact-title">Ready to build<br /><em>something better?</em></h2>
          <p>Tell us about the challenge, the workflow, or the product you&apos;ve been imagining.</p>
          <ArrowButton href="mailto:hello@prometheus.studio?subject=Project%20inquiry" light>Get in touch</ArrowButton>
          <span className={styles.contactNote}>Contact address is provisional. Replace before publishing.</span>
        </div>
      </section>
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div><a href="#top" className={styles.wordmark}>✳ prometheus.</a><p>Design-led software for<br />people who build things.</p></div>
          <div><strong>Explore</strong><a href="#work">Our work</a><a href="#products">Products</a><a href="#about">About</a></div>
          <div><strong>Services</strong><a href="#services">Landing pages</a><a href="#services">Management systems</a><a href="#services">Custom solutions</a></div>
          <div><strong>Let&apos;s talk</strong><a href="#contact">Start a project <MoveUpRight size={15} aria-hidden="true" /></a><span>Philippines</span></div>
        </div>
        <div className={styles.footerBottom}><span>© 2026 Prometheus Studio. Concept preview.</span><a href="#top">Back to top <ArrowRight size={15} /></a></div>
      </footer>
    </main>
  );
}
