"use client";

import {
  HomeIcon,
  IdCardIcon,
  SettingsIcon,
  type HomeIconHandle,
} from "lucide-animated";
import { ChevronUp, LogOut, Menu, Settings } from "lucide-react";
import { useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useRef,
  type ForwardRefExoticComponent,
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { appConfig } from "@/config/app";
import { signOutAction } from "@/features/auth/actions";
import type { CurrentUser } from "@/features/auth/queries";
import { cn } from "@/lib/utils";

type AnimatedIconHandle = HomeIconHandle;

type AnimatedIconComponent = ForwardRefExoticComponent<
  HTMLAttributes<HTMLDivElement> & {
    size?: number;
    animateOnHover?: boolean;
  } & RefAttributes<AnimatedIconHandle>
>;

type NavigationItem = {
  label: string;
  href: string;
  icon: AnimatedIconComponent;
};

const navigation: ReadonlyArray<NavigationItem> = [
  { label: "Overview", href: "/dashboard", icon: HomeIcon },
  { label: "Customers", href: "/customers", icon: IdCardIcon },
  {
    label: "Profile settings",
    href: "/settings/profile",
    icon: SettingsIcon,
  },
];

interface AppShellProps {
  user: CurrentUser;
  children: ReactNode;
}

function Brand() {
  return (
    <Link
      href="/dashboard"
      className="flex min-w-0 items-center gap-2.5 text-sidebar-foreground"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-[0.65rem] font-bold tracking-tight text-sidebar-primary-foreground">
        {appConfig.logo.mark}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold tracking-tight">
          {appConfig.name}
        </span>
        <span className="block text-xs text-sidebar-foreground/60">
          Workspace
        </span>
      </span>
    </Link>
  );
}

function Navigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="space-y-1">
      {navigation.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return <NavigationLink key={item.href} {...item} active={active} />;
      })}
    </nav>
  );
}

function NavigationLink({
  label,
  href,
  icon: Icon,
  active,
}: {
  label: string;
  href: string;
  icon: AnimatedIconComponent;
  active: boolean;
}) {
  const iconRef = useRef<AnimatedIconHandle>(null);
  const prefersReducedMotion = useReducedMotion();

  function startIconAnimation() {
    if (!prefersReducedMotion) iconRef.current?.startAnimation();
  }

  function stopIconAnimation() {
    iconRef.current?.stopAnimation();
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/65 transition-[background-color,color,transform] duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        active &&
          "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm shadow-black/[0.03]",
      )}
      onPointerEnter={startIconAnimation}
      onPointerLeave={stopIconAnimation}
      onFocus={(event) => {
        if (event.currentTarget.matches(":focus-visible")) {
          startIconAnimation();
        }
      }}
      onBlur={stopIconAnimation}
    >
      <Icon
        ref={iconRef}
        aria-hidden="true"
        animateOnHover={false}
        size={16}
        className={cn(
          "shrink-0 transition-colors group-hover:text-sidebar-primary",
          active && "text-sidebar-primary",
        )}
      />
      {label}
    </Link>
  );
}
function getInitials(fullName: string) {
  return fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function UserSummary({
  user,
  showChevron = false,
}: {
  user: CurrentUser;
  showChevron?: boolean;
}) {
  const initials = getInitials(user.fullName);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/10 text-xs font-semibold text-sidebar-primary ring-1 ring-sidebar-primary/15">
        {initials}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-medium text-sidebar-foreground">
          {user.fullName}
        </span>
        <span className="block truncate text-xs text-sidebar-foreground/60 capitalize">
          {user.role} account
        </span>
      </span>
      {showChevron ? (
        <ChevronUp className="size-4 shrink-0 text-sidebar-foreground/45 transition-transform group-open:rotate-180" />
      ) : null}
    </div>
  );
}

function AccountCard({ user }: { user: CurrentUser }) {
  return (
    <Card className="w-full overflow-hidden border-sidebar-border bg-popover text-popover-foreground shadow-lg shadow-black/8">
      <CardContent className="p-2 sm:p-2">
        <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {getInitials(user.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          <Badge className="capitalize" variant="secondary">
            {user.role}
          </Badge>
        </div>
        <AccountLinks />
      </CardContent>
    </Card>
  );
}

function AccountLinks() {
  return (
    <div className="mt-1 grid gap-0.5">
      <Link
        href="/settings/profile"
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Settings className="size-4 text-muted-foreground" /> Profile settings
      </Link>
      <form action={signOutAction}>
        <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
          <LogOut className="size-4 text-muted-foreground" /> Sign out
        </button>
      </form>
    </div>
  );
}

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="min-h-svh bg-sidebar lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-svh bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
        <div className="flex h-20 items-center px-5">
          <Brand />
        </div>
        <div className="flex-1 px-3 pb-5">
          <p className="mb-2 px-3 text-[0.65rem] font-semibold tracking-[0.14em] text-sidebar-foreground/40 uppercase">
            Workspace
          </p>
          <Navigation />
        </div>
        <div className="p-3 pb-4">
          <details className="group relative">
            <summary
              aria-label="Open account menu"
              className="list-none rounded-xl p-2 transition-colors hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring [&::-webkit-details-marker]:hidden"
            >
              <UserSummary user={user} showChevron />
            </summary>
            <div className="absolute right-0 bottom-[calc(100%+0.5rem)] left-0 z-40">
              <AccountCard user={user} />
            </div>
          </details>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-sidebar/95 px-4 text-sidebar-foreground backdrop-blur-md lg:hidden">
          <Brand />
          <details className="group relative">
            <summary className="flex size-9 list-none items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground transition-colors hover:bg-sidebar-accent/80 [&::-webkit-details-marker]:hidden">
              <span className="sr-only">Open navigation</span>
              <Menu className="size-4" />
            </summary>
            <div className="absolute top-[calc(100%+0.75rem)] right-0 w-72">
              <Card className="border-sidebar-border bg-popover p-2 text-popover-foreground shadow-xl shadow-black/10">
                <div className="mb-2 px-2 py-1">
                  <UserSummary user={user} />
                </div>
                <Navigation />
                <AccountLinks />
              </Card>
            </div>
          </details>
        </header>
        <main className="min-w-0 bg-background lg:my-2 lg:mr-2 lg:min-h-[calc(100svh-1rem)] lg:rounded-[1.25rem] lg:ring-1 lg:ring-black/[0.04]">
          {children}
        </main>
      </div>
    </div>
  );
}
