"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useRef, useState } from "react";

import { appConfig } from "@/config/app";

import styles from "./hero.module.css";

const links = [
  { href: "#top", label: "Story" },
  { href: "#work", label: "Work" },
  { href: "#library", label: "Library" },
  { href: "#contact", label: "Contact" },
] as const;

const NAVIGATION_CLOSE_MS = 1050;

export function HeroNavigation() {
  const [open, setOpen] = useState(false);
  const [renderNavigation, setRenderNavigation] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navLinksRef = useRef<HTMLElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const navigateTimerRef = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openNavigation = () => {
    clearCloseTimer();
    setRenderNavigation(true);
    window.requestAnimationFrame(() => setOpen(true));
  };

  const closeNavigation = () => {
    setOpen(false);
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setRenderNavigation(false);
      closeTimerRef.current = null;
    }, NAVIGATION_CLOSE_MS);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) openNavigation();
    else closeNavigation();
  };

  const navigateAfterClose = (href: string) => {
    closeNavigation();
    if (navigateTimerRef.current !== null) {
      window.clearTimeout(navigateTimerRef.current);
    }
    navigateTimerRef.current = window.setTimeout(() => {
      navigateTimerRef.current = null;
      if (window.location.hash === href) {
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      } else {
        window.location.hash = href;
      }
    }, NAVIGATION_CLOSE_MS + 80);
  };

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
      if (navigateTimerRef.current !== null) {
        window.clearTimeout(navigateTimerRef.current);
      }
    },
    [],
  );

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
    <Dialog.Root open={open} onOpenChange={handleOpenChange} modal="trap-focus">
      <header className={styles.header} data-navigation-open={open}>
        <a
          className={styles.brand}
          href="#top"
          aria-label={`${appConfig.name} home`}
          onClick={(event) => {
            if (!open) return;
            event.preventDefault();
            navigateAfterClose("#top");
          }}
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
          onClick={() => {
            if (open) closeNavigation();
            else openNavigation();
          }}
        >
          <span className={styles.hamburger} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </header>

      {renderNavigation ? (
        <div
          className={styles.navGlass}
          data-open={open}
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

      {renderNavigation ? (
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
                      onClick={(event) => {
                        event.preventDefault();
                        navigateAfterClose(link.href);
                      }}
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>

                <div className={styles.navFooter}>
                  <p>Good things begin with an idea.</p>
                  <a
                    href="#contact"
                    onClick={(event) => {
                      event.preventDefault();
                      navigateAfterClose("#contact");
                    }}
                  >
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
