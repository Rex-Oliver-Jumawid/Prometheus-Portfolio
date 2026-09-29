import type { ReactNode } from "react";

import { appConfig } from "@/config/app";

interface AuthFrameProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthFrame({ title, description, children }: AuthFrameProps) {
  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-2">
      <section className="flex min-h-svh flex-col gap-8 p-6 md:p-10 lg:min-h-0">
        <header>
          <div className="flex items-center gap-2.5 font-medium">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-[0.625rem] font-bold tracking-tight text-primary-foreground">
              {appConfig.logo.mark}
            </span>
            <span className="tracking-tight">{appConfig.name}</span>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-xs">
            <div className="mb-7 flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm leading-6 text-balance text-muted-foreground">
                {description}
              </p>
            </div>

            {children}
          </div>
        </div>
      </section>

      <aside className="hidden bg-[#1d1d1f] lg:block" aria-hidden="true" />
    </main>
  );
}
