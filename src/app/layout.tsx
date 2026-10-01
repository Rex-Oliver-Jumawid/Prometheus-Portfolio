import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

import { appConfig } from "@/config/app";

import { SmoothScroll } from "./_components/smooth-scroll";

import "lenis/dist/lenis.css";
import "./globals.css";

const instrumentSerif = localFont({
  src: [
    {
      path: "./_fonts/instrument-serif-regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./_fonts/instrument-serif-italic.ttf",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-instrument-serif",
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
      className={instrumentSerif.variable}
    >
      <body>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
