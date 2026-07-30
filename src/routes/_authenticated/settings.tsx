import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings | Robinstone Time" },
      { name: "description", content: "Account, organization and branding settings." },
      { property: "og:title", content: "Settings | Robinstone Time" },
      { property: "og:description", content: "Account, organization and branding settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const { workspace, activeMembership } = useWorkspace();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Details from your profile record.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name: </span>
            {workspace?.profile?.fullName ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Email: </span>
            {user?.email ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Timezone: </span>
            {workspace?.profile?.timezone ?? "—"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Branding and policy editing arrive with the admin module.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Organization: </span>
            {activeMembership?.organizationName ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Role: </span>
            <span className="capitalize">{activeMembership?.role ?? "—"}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
