import { Link } from "@tanstack/react-router";
import {
  Building2,
  CalendarClock,
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { BrandingProvider } from "@/components/BrandingProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/timesheets", label: "Timesheets", icon: CalendarClock },
  { to: "/approvals", label: "Approvals", icon: CheckCircle2 },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/team", label: "Team", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;


function initials(value: string): string {
  return value
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { memberships, activeMembership, setActiveOrganization, workspace } = useWorkspace();

  const productName = activeMembership?.branding?.productName ?? "Robinstone Business Suite";
  const displayName = workspace?.profile?.fullName ?? user?.email ?? "Account";

  return (
    <BrandingProvider>
      <div className="flex min-h-screen bg-muted/30">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
          <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
            {activeMembership?.branding?.logoUrl ? (
              <img
                src={activeMembership.branding.logoUrl}
                alt={`${productName} logo`}
                className="h-8 w-8 rounded object-contain"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded bg-primary text-xs font-semibold text-primary-foreground">
                RT
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{productName}</p>
              <p className="truncate text-xs text-muted-foreground">Time</p>
            </div>
          </div>

          <div className="px-3 py-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex min-w-0 items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {activeMembership?.organizationName ?? "No organization"}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Organizations</DropdownMenuLabel>
                {memberships.map((membership) => (
                  <DropdownMenuItem
                    key={membership.organizationId}
                    onSelect={() => setActiveOrganization(membership.organizationId)}
                  >
                    <span className="truncate">{membership.organizationName}</span>
                    <Badge variant="secondary" className="ml-auto capitalize">
                      {membership.role}
                    </Badge>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/onboarding">Create organization</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <nav className="flex-1 space-y-1 px-3 pb-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeProps={{
                  className:
                    "flex items-center gap-3 rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary",
                }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-border bg-background px-4 py-3 md:px-6">
            <nav className="flex gap-1 overflow-x-auto md:hidden">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground"
                  activeProps={{ className: "rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="hidden text-sm text-muted-foreground md:block">
              {activeMembership ? (
                <span className="capitalize">Signed in as {activeMembership.role}</span>
              ) : (
                <span>No active organization</span>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">{initials(displayName)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-40 truncate text-sm md:inline">{displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings">Account settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
        </div>
      </div>
    </BrandingProvider>
  );
}
