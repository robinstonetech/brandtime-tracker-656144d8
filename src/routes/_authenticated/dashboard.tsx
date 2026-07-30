import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Clock, FolderKanban, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/hooks/useWorkspace";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Robinstone Time" },
      { name: "description", content: "Your time tracking overview: hours logged, timesheet status and active projects." },
      { property: "og:title", content: "Dashboard | Robinstone Time" },
      { property: "og:description", content: "Your time tracking overview across projects and timesheets." },
    ],
  }),
  component: DashboardPage,
});

const SUMMARY_CARDS = [
  { label: "Hours this week", value: "—", icon: Clock, hint: "Time entries land here next" },
  { label: "Open timesheets", value: "—", icon: CalendarClock, hint: "Draft and submitted periods" },
  { label: "Active projects", value: "—", icon: FolderKanban, hint: "Projects you are assigned to" },
  { label: "Team members", value: "—", icon: Users, hint: "People in this organization" },
];

function DashboardPage() {
  const { activeMembership, isLoading, memberships } = useWorkspace();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SUMMARY_CARDS.map((card) => (
            <Skeleton key={card.label} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (memberships.length === 0) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Create your organization</CardTitle>
          <CardDescription>
            You are signed in but not a member of any organization yet. Create one to start tracking
            time, or ask an administrator to invite you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/onboarding">Create organization</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {activeMembership?.organizationName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Overview of your time for the current week.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SUMMARY_CARDS.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next steps</CardTitle>
          <CardDescription>
            Auth and the application shell are in place. Time entry, timesheet approval, projects
            and team management build on top of this foundation.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
