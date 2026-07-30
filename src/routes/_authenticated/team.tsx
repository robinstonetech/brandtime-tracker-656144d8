import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspace } from "@/hooks/useWorkspace";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team | Robinstone Time" },
      { name: "description", content: "Invite teammates and manage organization roles." },
      { property: "og:title", content: "Team | Robinstone Time" },
      { property: "og:description", content: "Invite teammates and manage organization roles." },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const { activeMembership } = useWorkspace();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Your role
            {activeMembership ? (
              <Badge variant="secondary" className="capitalize">
                {activeMembership.role}
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>
            Invitations, role management and deactivation arrive with the membership module.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
