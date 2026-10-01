"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useRef, useState } from "react";

import { appConfig } from "@/config/app";

import styles from "./hero.module.css";

const links = [
  { href: "#work", label: "Work" },
  { href: "#approach", label: "Approach" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#contact", label: "Contact" },
] as const;

export function HeroNavigation() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
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
        <Dialog.Trigger
          className={styles.menuToggle}
          aria-label="Open navigation"
        >
          <span className={styles.hamburger} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </Dialog.Trigger>
      </header>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.scrim} />
        <Dialog.Popup className={styles.navPanel} initialFocus={closeRef}>
          <div className={styles.navHeader}>
            <Dialog.Title className={styles.srOnly}>
              {appConfig.name}
            </Dialog.Title>
            <Dialog.Close
              ref={closeRef}
              className={styles.menuClose}
              aria-label="Close navigation"
            >
              <span className={styles.closeIcon} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description className={styles.navDescription}>
            Creative technology. Thoughtful digital systems.
          </Dialog.Description>
          <nav className={styles.navLinks} aria-label="Primary navigation">
            {links.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
              >
                <span className={styles.navNumber} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {link.label}
                <span className={styles.navArrow} aria-hidden="true">
                  ↗
                </span>
              </a>
            ))}
          </nav>
          <div className={styles.navFooter}>
            <p>Good things begin with an idea.</p>
            <a href="#contact" onClick={() => setOpen(false)}>
              Start a conversation <span aria-hidden="true">→</span>
            </a>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
