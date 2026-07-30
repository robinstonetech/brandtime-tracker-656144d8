import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { title: "Projects | Robinstone Time" },
      { name: "description", content: "Manage clients, projects, categories and billability." },
      { property: "og:title", content: "Projects | Robinstone Time" },
      { property: "og:description", content: "Manage clients, projects, categories and billability." },
    ],
  }),
  component: () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming next</CardTitle>
          <CardDescription>
            Clients, projects, project members and per-project branding overrides.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  ),
});
