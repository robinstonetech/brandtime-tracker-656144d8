import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Clock, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Robinstone Business Suite — Time | Enterprise Timesheets" },
      {
        name: "description",
        content:
          "Multi-tenant enterprise timesheet management: track time, approve timesheets and report on billable hours across clients and projects.",
      },
      { property: "og:title", content: "Robinstone Business Suite — Time" },
      {
        property: "og:description",
        content: "Enterprise timesheet management for multi-team organizations.",
      },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  {
    icon: Clock,
    title: "Effortless time capture",
    body: "One running timer per person, weekly grids and billable categories that match how your teams actually work.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise-grade isolation",
    body: "Every organization is isolated at the database level with role-based access for owners, admins, managers and members.",
  },
  {
    icon: BarChart3,
    title: "Approvals and insight",
    body: "Submit, review and approve timesheets, then report on utilisation across clients and projects.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-sm font-semibold tracking-tight">
          Robinstone Business Suite <span className="text-muted-foreground">— Time</span>
        </span>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Enterprise timesheet management, without the friction
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Track hours, approve timesheets and report on billable work across every client,
            project and team — in one multi-tenant workspace.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-6 pb-24 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-border bg-card p-6">
              <feature.icon className="h-6 w-6 text-primary" />
              <h2 className="mt-4 text-base font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Robinstone Business Suite — Time
      </footer>
    </div>
  );
}
