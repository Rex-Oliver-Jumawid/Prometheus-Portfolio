import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

import { appConfig } from "@/config/app";

import { SmoothScroll } from "./_components/smooth-scroll";

import "lenis/dist/lenis.css";
import "./globals.css";

const bosch = localFont({
  src: "./_fonts/bosch.woff2",
  weight: "400",
  style: "normal",
  variable: "--font-bosch",
  display: "swap",
});

const casta = localFont({
  src: "./_fonts/casta-thin.woff2",
  weight: "100",
  style: "normal",
  variable: "--font-casta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: appConfig.name,
    template: `%s | ${appConfig.name}`,
  },
  description: appConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${bosch.variable} ${casta.variable}`}
    >
      <body>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
