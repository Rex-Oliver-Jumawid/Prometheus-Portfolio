"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useState } from "react";

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

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className={styles.menuToggle}
        aria-label="Open navigation"
      >
        <span className={styles.menuBars} aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.scrim} />
        <Dialog.Popup className={styles.navPanel}>
          <div className={styles.navHeader}>
            <Dialog.Title className={styles.navTitle}>
              {appConfig.name}
            </Dialog.Title>
            <Dialog.Close
              className={styles.menuClose}
              aria-label="Close navigation"
            >
              <span aria-hidden="true">×</span>
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
