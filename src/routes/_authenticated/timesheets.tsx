import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Lock, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EntryDialog } from "@/components/time/EntryDialog";
import { TimerBar } from "@/components/time/TimerBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  deleteTimeEntry,
  getRunningTimer,
  getTimeOptions,
  getWeek,
  submitWeek,
  type TimeEntry,
} from "@/lib/time.functions";
import {
  addDays,
  currentWeekStartISO,
  formatDayLabel,
  formatMinutes,
  formatWeekRange,
  fromISODate,
  toISODate,
  weekDays,
} from "@/lib/time-utils";

export const Route = createFileRoute("/_authenticated/timesheets")({
  head: () => ({
    meta: [
      { title: "Timesheets | Robinstone Time" },
      { name: "description", content: "Track hours with a timer, log time by day and submit your weekly timesheet." },
      { property: "og:title", content: "Timesheets | Robinstone Time" },
      { property: "og:description", content: "Track hours, log time by day and submit weekly timesheets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TimesheetsPage,
});

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Awaiting approval",
  approved: "Approved",
  rejected: "Changes requested",
};

function TimesheetsPage() {
  const { activeMembership } = useWorkspace();
  const organizationId = activeMembership?.organizationId ?? null;
  const queryClient = useQueryClient();

  const [weekStart, setWeekStart] = useState(currentWeekStartISO);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [dialogDate, setDialogDate] = useState(currentWeekStartISO);

  const fetchWeek = useServerFn(getWeek);
  const fetchOptions = useServerFn(getTimeOptions);
  const fetchTimer = useServerFn(getRunningTimer);
  const removeEntry = useServerFn(deleteTimeEntry);
  const submit = useServerFn(submitWeek);

  const weekQuery = useQuery({
    queryKey: ["week", organizationId, weekStart],
    queryFn: () => fetchWeek({ data: { organizationId: organizationId!, weekStart } }),
    enabled: Boolean(organizationId),
  });

  const optionsQuery = useQuery({
    queryKey: ["time-options", organizationId],
    queryFn: () => fetchOptions({ data: { organizationId: organizationId! } }),
    enabled: Boolean(organizationId),
    staleTime: 120_000,
  });

  const timerQuery = useQuery({
    queryKey: ["timer", organizationId],
    queryFn: () => fetchTimer({ data: { organizationId: organizationId! } }),
    enabled: Boolean(organizationId),
    refetchOnWindowFocus: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeEntry({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["week", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", organizationId] });
      toast.success("Entry deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const submitMutation = useMutation({
    mutationFn: () => submit({ data: { organizationId: organizationId!, weekStart } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["week", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", organizationId] });
      toast.success("Timesheet submitted for approval");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!organizationId) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>No organization selected</CardTitle>
          <CardDescription>Join or create an organization to start tracking time.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const days = weekDays(weekStart);
  const entries = weekQuery.data?.entries ?? [];
  const status = weekQuery.data?.timesheet?.status ?? "draft";
  const locked = status === "submitted" || status === "approved";
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);

  const shiftWeek = (weeks: number) =>
    setWeekStart(toISODate(addDays(fromISODate(weekStart), weeks * 7)));

  const openNew = (date: string) => {
    setEditing(null);
    setDialogDate(date);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Timesheets</h1>
          <p className="text-sm text-muted-foreground">{formatWeekRange(weekStart)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftWeek(-1)} aria-label="Previous week">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" onClick={() => setWeekStart(currentWeekStartISO())}>
            This week
          </Button>
          <Button variant="outline" size="icon" onClick={() => shiftWeek(1)} aria-label="Next week">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <TimerBar
        organizationId={organizationId}
        timer={timerQuery.data ?? null}
        projects={optionsQuery.data?.projects ?? []}
        categories={optionsQuery.data?.categories ?? []}
        disabled={optionsQuery.isLoading}
      />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              Week total: {formatMinutes(totalMinutes)}
              <Badge variant={status === "approved" ? "default" : status === "rejected" ? "destructive" : "secondary"}>
                {STATUS_LABELS[status]}
              </Badge>
            </CardTitle>
            <CardDescription>
              {locked
                ? "This week is locked while it awaits approval."
                : "Add entries for each day, then submit the week for approval."}
            </CardDescription>
          </div>
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={locked || totalMinutes === 0 || submitMutation.isPending}
          >
            {locked ? <Lock className="mr-2 size-4" /> : <Send className="mr-2 size-4" />}
            {locked ? "Submitted" : "Submit week"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {weekQuery.data?.timesheet?.reviewNote && status === "rejected" ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <strong>Reviewer note:</strong> {weekQuery.data.timesheet.reviewNote}
            </p>
          ) : null}

          {weekQuery.isLoading ? (
            <div className="space-y-2">
              {days.map((day) => (
                <Skeleton key={day} className="h-16" />
              ))}
            </div>
          ) : (
            days.map((day) => {
              const dayEntries = entries.filter((entry) => entry.entryDate === day);
              const dayTotal = dayEntries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
              return (
                <div key={day} className="rounded-lg border">
                  <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2">
                    <div className="flex items-baseline gap-3">
                      <span className="font-medium">{formatDayLabel(day)}</span>
                      <span className="text-sm text-muted-foreground">{formatMinutes(dayTotal)}</span>
                    </div>
                    {!locked ? (
                      <Button variant="ghost" size="sm" onClick={() => openNew(day)}>
                        <Plus className="mr-1 size-4" /> Add
                      </Button>
                    ) : null}
                  </div>
                  {dayEntries.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted-foreground">No time logged.</p>
                  ) : (
                    <ul className="divide-y">
                      {dayEntries.map((entry) => (
                        <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {entry.projectName ?? "No project"}
                              {entry.categoryName ? ` · ${entry.categoryName}` : ""}
                            </p>
                            <p className="truncate text-sm text-muted-foreground">
                              {entry.description ?? "No description"}
                            </p>
                          </div>
                          {!entry.isBillable ? <Badge variant="outline">Non-billable</Badge> : null}
                          <span className="font-mono text-sm tabular-nums">
                            {formatMinutes(entry.durationMinutes)}
                          </span>
                          {!locked ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Edit entry"
                                onClick={() => {
                                  setEditing(entry);
                                  setDialogDate(entry.entryDate);
                                  setDialogOpen(true);
                                }}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Delete entry"
                                onClick={() => deleteMutation.mutate(entry.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <EntryDialog
        organizationId={organizationId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={editing}
        defaultDate={dialogDate}
        projects={optionsQuery.data?.projects ?? []}
        categories={optionsQuery.data?.categories ?? []}
      />
    </div>
  );
}
