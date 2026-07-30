import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  getApprovalDetail,
  getApprovals,
  reviewTimesheet,
  type ApprovalRow,
} from "@/lib/approvals.functions";
import { formatMinutes, formatWeekRange } from "@/lib/time-utils";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals | Robinstone Time" },
      { name: "description", content: "Review, approve or return submitted weekly timesheets for your team." },
      { property: "og:title", content: "Approvals | Robinstone Time" },
      { property: "og:description", content: "Review and approve submitted team timesheets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApprovalsPage,
});

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  submitted: "secondary",
  approved: "default",
  rejected: "destructive",
  draft: "outline",
};

function ApprovalsPage() {
  const { activeMembership } = useWorkspace();
  const organizationId = activeMembership?.organizationId ?? null;
  const canReview = ["owner", "admin", "manager"].includes(activeMembership?.role ?? "");
  const queryClient = useQueryClient();

  const fetchApprovals = useServerFn(getApprovals);
  const fetchDetail = useServerFn(getApprovalDetail);
  const review = useServerFn(reviewTimesheet);

  const [selected, setSelected] = useState<ApprovalRow | null>(null);
  const [note, setNote] = useState("");

  const approvalsQuery = useQuery({
    queryKey: ["approvals", organizationId],
    queryFn: () => fetchApprovals({ data: { organizationId: organizationId! } }),
    enabled: Boolean(organizationId) && canReview,
  });

  const detailQuery = useQuery({
    queryKey: ["approval-detail", selected?.id],
    queryFn: () => fetchDetail({ data: { timesheetId: selected!.id } }),
    enabled: Boolean(selected),
  });

  const reviewMutation = useMutation({
    mutationFn: (decision: "approved" | "rejected") =>
      review({ data: { timesheetId: selected!.id, decision, note: note.trim() || undefined } }),
    onSuccess: (_result, decision) => {
      void queryClient.invalidateQueries({ queryKey: ["approvals", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", organizationId] });
      toast.success(decision === "approved" ? "Timesheet approved" : "Timesheet returned");
      setSelected(null);
      setNote("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!canReview) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Approvals are for managers</CardTitle>
          <CardDescription>
            Ask an administrator for the manager role if you need to review team timesheets.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const rows = approvalsQuery.data?.timesheets ?? [];
  const pending = rows.filter((row) => row.status === "submitted");
  const reviewed = rows.filter((row) => row.status !== "submitted");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-sm text-muted-foreground">
          {pending.length} timesheet{pending.length === 1 ? "" : "s"} awaiting review
        </p>
      </div>

      {approvalsQuery.isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <ApprovalTable
            title="Awaiting review"
            description="Submitted timesheets that need a decision."
            rows={pending}
            emptyText="Nothing to review right now."
            onSelect={(row) => {
              setSelected(row);
              setNote("");
            }}
          />
          <ApprovalTable
            title="Recently reviewed"
            description="Approved and returned timesheets."
            rows={reviewed}
            emptyText="No reviewed timesheets yet."
            onSelect={(row) => {
              setSelected(row);
              setNote(row.reviewNote ?? "");
            }}
          />
        </>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.memberName}</DialogTitle>
            <DialogDescription>
              {selected ? formatWeekRange(selected.periodStart) : ""} ·{" "}
              {formatMinutes(selected?.totalMinutes ?? 0)}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-72 overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(detailQuery.data ?? []).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">{entry.entryDate}</TableCell>
                    <TableCell>{entry.projectName ?? "—"}</TableCell>
                    <TableCell className="max-w-[16rem] truncate">
                      {entry.description ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatMinutes(entry.durationMinutes)}
                    </TableCell>
                  </TableRow>
                ))}
                {detailQuery.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No entries attached to this timesheet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          {selected?.status === "submitted" ? (
            <div className="space-y-2">
              <Label htmlFor="review-note">Note (required when returning)</Label>
              <Textarea
                id="review-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Explain what needs changing…"
              />
            </div>
          ) : selected?.reviewNote ? (
            <p className="rounded-lg border bg-muted/40 p-3 text-sm">{selected.reviewNote}</p>
          ) : null}

          <DialogFooter>
            {selected?.status === "submitted" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => reviewMutation.mutate("rejected")}
                  disabled={reviewMutation.isPending}
                >
                  <X className="mr-2 size-4" /> Return for changes
                </Button>
                <Button
                  onClick={() => reviewMutation.mutate("approved")}
                  disabled={reviewMutation.isPending}
                >
                  <Check className="mr-2 size-4" /> Approve
                </Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApprovalTable({
  title,
  description,
  rows,
  emptyText,
  onSelect,
}: {
  title: string;
  description: string;
  rows: ApprovalRow[];
  emptyText: string;
  onSelect: (row: ApprovalRow) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Week</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.memberName}</div>
                    <div className="text-sm text-muted-foreground">{row.memberEmail}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatWeekRange(row.periodStart)}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {formatMinutes(row.totalMinutes)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => onSelect(row)}>
                      {row.status === "submitted" ? "Review" : "View"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
