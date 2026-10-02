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

      <div
        className={styles.navGlass}
        data-open={open}
        data-navigation-glass
        aria-hidden="true"
      />

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
              <nav className={styles.navLinks} aria-label="Primary navigation">
                {links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
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
    </Dialog.Root>
  );
}
