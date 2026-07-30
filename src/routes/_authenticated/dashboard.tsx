import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Clock, FolderKanban, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/hooks/useWorkspace";
import { getDashboard } from "@/lib/dashboard.functions";
import { currentWeekStartISO, formatDayLabel, formatMinutes, formatWeekRange } from "@/lib/time-utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Robinstone Time" },
      { name: "description", content: "Your time tracking overview: hours logged, timesheet status and active projects." },
      { property: "og:title", content: "Dashboard | Robinstone Time" },
      { property: "og:description", content: "Your time tracking overview across projects and timesheets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Awaiting approval",
  approved: "Approved",
  rejected: "Changes requested",
};

function DashboardPage() {
  const { activeMembership, isLoading, memberships } = useWorkspace();
  const organizationId = activeMembership?.organizationId ?? null;
  const weekStart = currentWeekStartISO();

  const fetchDashboard = useServerFn(getDashboard);
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", organizationId, weekStart],
    queryFn: () => fetchDashboard({ data: { organizationId: organizationId!, weekStart } }),
    enabled: Boolean(organizationId),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-28" />
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

  const data = dashboardQuery.data;
  const isReviewer = ["owner", "admin", "manager"].includes(activeMembership?.role ?? "");
  const cards = [
    {
      label: "Hours this week",
      value: data ? formatMinutes(data.weekMinutes) : "—",
      icon: Clock,
      hint: data ? `${formatMinutes(data.billableMinutes)} billable` : "Logged across all projects",
    },
    {
      label: "This week's timesheet",
      value: data ? STATUS_LABELS[data.weekStatus] : "—",
      icon: CalendarClock,
      hint: formatWeekRange(weekStart),
    },
    {
      label: "Active projects",
      value: data ? String(data.activeProjects) : "—",
      icon: FolderKanban,
      hint: "Available for time entry",
    },
    {
      label: isReviewer ? "Awaiting approval" : "Team members",
      value: data ? String(isReviewer ? data.pendingApprovals : data.teamSize) : "—",
      icon: Users,
      hint: isReviewer ? "Timesheets you can review" : "People in this organization",
    },
  ];

  const maxDayMinutes = Math.max(1, ...(data?.perDay.map((day) => day.minutes) ?? [1]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{formatWeekRange(weekStart)}</p>
        </div>
        <Button asChild>
          <Link to="/timesheets">Log time</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hours by day</CardTitle>
            <CardDescription>Your logged time for the current week.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardQuery.isLoading ? (
              <Skeleton className="h-32" />
            ) : data && data.perDay.length > 0 ? (
              data.perDay.map((day) => (
                <div key={day.date} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{formatDayLabel(day.date)}</span>
                    <span className="font-mono tabular-nums">{formatMinutes(day.minutes)}</span>
                  </div>
                  <Progress value={(day.minutes / maxDayMinutes) * 100} />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No time logged this week yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top projects</CardTitle>
            <CardDescription>Where your week went.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardQuery.isLoading ? (
              <Skeleton className="h-32" />
            ) : data && data.topProjects.length > 0 ? (
              data.topProjects.map((project) => (
                <div key={project.name} className="flex items-center justify-between">
                  <span className="truncate text-sm">{project.name}</span>
                  <Badge variant="secondary" className="font-mono tabular-nums">
                    {formatMinutes(project.minutes)}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nothing logged against a project yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
