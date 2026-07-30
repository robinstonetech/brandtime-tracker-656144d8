import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/timesheets")({
  head: () => ({
    meta: [
      { title: "Timesheets | Robinstone Time" },
      { name: "description", content: "Review, submit and approve weekly timesheets." },
      { property: "og:title", content: "Timesheets | Robinstone Time" },
      { property: "og:description", content: "Review, submit and approve weekly timesheets." },
    ],
  }),
  component: () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Timesheets</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming next</CardTitle>
          <CardDescription>
            Weekly grid entry, running timer, submission and approval workflow build on this shell.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  ),
});
