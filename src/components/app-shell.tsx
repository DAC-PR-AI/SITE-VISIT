import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LayoutDashboard, CalendarClock, ListChecks, Plus, Building2, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { checkSheetConnection } from "@/lib/sheets.functions";

type NavItem = { to: "/" | "/timeline" | "/bookings" | "/new"; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const nav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/timeline", label: "Timeline", icon: CalendarClock },
  { to: "/bookings", label: "All Bookings", icon: ListChecks },
  { to: "/new", label: "New Booking", icon: Plus },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const checkConn = useServerFn(checkSheetConnection);
  const { data: conn } = useQuery({
    queryKey: ["sheet-connection"],
    queryFn: () => checkConn(),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return (
    <div className="flex min-h-screen w-full bg-background font-body text-slate-900">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border/70 bg-white/60 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-6 pt-6 pb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md">
            <img src="/dac-logo.png" alt="DAC Developers" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <p className="font-display text-base font-bold tracking-tight leading-none text-slate-900">DAC Developers</p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
              Site Visits
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
                    : "text-muted-foreground hover:bg-white/60 hover:text-slate-900",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 rounded-xl border border-border/70 bg-white/70 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Sync Status
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                "size-2 rounded-full",
                conn?.configured
                  ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
                  : "bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.15)]",
              )}
            />
            <span className="text-xs font-medium">
              {conn?.configured ? "Google Sheets · live" : "Demo Mode (Mock Data)"}
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top nav */}
        <div className="md:hidden flex items-center gap-2 border-b border-border/70 bg-white/80 px-4 py-3">
          <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-white font-display font-black text-[10px]">
            DAC
          </div>
          <span className="font-display font-bold text-sm">DAC Developers</span>
          <nav className="ml-auto flex gap-1 overflow-x-auto">
            {nav.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap",
                    active ? "bg-primary text-white" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {conn && !conn.configured && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center gap-2">
            <Info className="size-4 text-amber-600 shrink-0" />
            <span>
              <strong>Demo Mode:</strong> {conn.reason} — Please set valid <code>GOOGLE_SHEET_ID</code> & Google credentials in Vercel Settings → Environment Variables.
            </span>
          </div>
        )}

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}