"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useRef, useState } from "react";

import { appConfig } from "@/config/app";

import styles from "./hero.module.css";

const links = [
  { href: "#top", label: "Story" },
  { href: "#work", label: "Work" },
  { href: "#library", label: "Library" },
  { href: "#contact", label: "Contact" },
] as const;

export function HeroNavigation() {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navLinksRef = useRef<HTMLElement>(null);

  const moveNavIndicator = (target: HTMLAnchorElement) => {
    const navigation = navLinksRef.current;
    if (!navigation) return;

    navigation.style.setProperty(
      "--nav-indicator-offset",
      `${target.offsetTop}px`,
    );
    navigation.style.setProperty(
      "--nav-indicator-height",
      `${target.offsetHeight}px`,
    );
    navigation.dataset.indicatorActive = "true";
  };

  const hideNavIndicator = () => {
    navLinksRef.current?.removeAttribute("data-indicator-active");
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen} modal="trap-focus">
      <header className={styles.header} data-navigation-open={open}>
        <a
          className={styles.brand}
          href="#top"
          aria-label={`${appConfig.name} home`}
          onClick={() => setOpen(false)}
        >
          <span className={styles.ribbon} aria-hidden="true">
            <span className={styles.mark} />
          </span>
        </a>
        <button
          ref={menuButtonRef}
          type="button"
          className={styles.menuToggle}
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="primary-navigation-dialog"
          onClick={() => setOpen((current) => !current)}
        >
          <span className={styles.hamburger} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </header>

      {open ? (
        <div
          className={styles.navGlass}
          data-open="true"
          data-navigation-glass
          aria-hidden="true"
        >
          <div
            className={styles.navGlassBackdrop}
            data-navigation-glass-backdrop
          >
            <span className={styles.navGlassSky} />
            <span className={styles.navGlassFigure} />
          </div>
          <span className={styles.navGlassTint} />
        </div>
      ) : null}

      {open ? (
        <Dialog.Portal>
          <Dialog.Backdrop className={styles.scrim} />
          <Dialog.Popup
            id="primary-navigation-dialog"
            className={styles.navPanel}
            finalFocus={menuButtonRef}
          >
            <Dialog.Title className={styles.srOnly}>
              {appConfig.name}
            </Dialog.Title>

            <div className={styles.navLayout}>
              <div className={styles.navBlank} aria-hidden="true" />
              <div className={styles.navContent}>
                <nav
                  ref={navLinksRef}
                  className={styles.navLinks}
                  aria-label="Primary navigation"
                  onPointerLeave={hideNavIndicator}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      hideNavIndicator();
                    }
                  }}
                >
                  {links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onPointerEnter={(event) =>
                        moveNavIndicator(event.currentTarget)
                      }
                      onFocus={(event) => moveNavIndicator(event.currentTarget)}
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>

                <div className={styles.navFooter}>
                  <p>Good things begin with an idea.</p>
                  <a href="#contact" onClick={() => setOpen(false)}>
                    Start a conversation
                  </a>
                </div>
              </div>
            </div>

            <Dialog.Close
              className={styles.srOnly}
              aria-label="Dismiss navigation panel"
            >
              Close navigation
            </Dialog.Close>
          </Dialog.Popup>
        </Dialog.Portal>
      ) : null}
    </Dialog.Root>
  );
}
