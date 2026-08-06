import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { activeBrowserEnvironment } from "@/integrations/supabase/client";
import { projectRefFromUrl } from "@/integrations/supabase/environments";
import { getEnvironmentStatus, type EnvironmentHealth } from "@/lib/environment.functions";

export const Route = createFileRoute("/admin/environment")({
  head: () => ({
    meta: [
      { title: "Environment — Robinstone Business Suite Time" },
      {
        name: "description",
        content:
          "Check which Supabase project the timesheet app is connected to and verify connection health.",
      },
      { property: "og:title", content: "Environment — Robinstone Business Suite Time" },
      {
        property: "og:description",
        content:
          "Check which Supabase project the timesheet app is connected to and verify connection health.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EnvironmentPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">Could not load environment status: {error.message}</div>
  ),
});


function HealthRow({ label, health }: { label: string; health: EnvironmentHealth }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${health.ok ? "bg-emerald-500" : "bg-destructive"}`}
          aria-hidden
        />
        <span>
          {health.message}
          {health.status ? ` (${health.status})` : ""}
        </span>
      </span>
    </div>
  );
}

function EnvironmentPage() {
  const fetchStatus = useServerFn(getEnvironmentStatus);
  const [switching, setSwitching] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["environment-status"],
    queryFn: () => fetchStatus(),
    refetchOnWindowFocus: false,
  });

  const isProduction = activeBrowserEnvironment.name === "production";
  const canSwitch = !isProduction;

  async function switchTo(name: SupabaseEnvironmentName) {
    if (!canSwitch || !isEnvironmentConfigured(name)) return;
    setSwitching(true);
    // Sessions are project-bound: sign out before repointing.
    await supabase.auth.signOut().catch(() => undefined);
    setEnvironmentOverride(name === "development" ? null : name);
    window.location.reload();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Environment</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Which Supabase project this app is talking to right now.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Active connection</CardTitle>
            <CardDescription>Resolved from the host serving this page.</CardDescription>
          </div>
          <Badge variant={isProduction ? "default" : "secondary"} className="uppercase">
            {activeBrowserEnvironment.label}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between gap-4 py-1">
            <span className="text-muted-foreground">Project ref</span>
            <span className="font-mono text-xs">
              {projectRefFromUrl(activeBrowserEnvironment.url) || "—"}
            </span>
          </div>
          <div className="flex justify-between gap-4 py-1">
            <span className="text-muted-foreground">API URL</span>
            <span className="font-mono text-xs break-all">
              {activeBrowserEnvironment.url || "—"}
            </span>
          </div>
          <Separator className="my-3" />
          {isLoading && <p className="text-muted-foreground">Checking connection…</p>}
          {error && <p className="text-destructive">{(error as Error).message}</p>}
          {data && (
            <>
              <HealthRow label="Publishable key" health={data.restHealth} />
              <HealthRow label="Auth service" health={data.authHealth} />
              <HealthRow label="Data API (service role)" health={data.serviceRoleHealth} />
              {!data.serviceRoleConfigured && (
                <p className="pt-2 text-xs text-muted-foreground">
                  Service-role secret <code>{data.serviceRoleEnvVar}</code> is not set for this
                  environment.
                </p>
              )}
              <p className="pt-2 text-xs text-muted-foreground">
                Server resolved host: <code>{data.host || "—"}</code> → {data.label}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Switch database</CardTitle>
          <CardDescription>
            {canSwitch
              ? "Development builds only. Switching signs you out, because sessions belong to a single Supabase project."
              : "Disabled in production. The live site is permanently bound to the production project."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {(Object.keys(SUPABASE_ENVIRONMENTS) as SupabaseEnvironmentName[]).map((name) => {
            const env = SUPABASE_ENVIRONMENTS[name];
            const configured = isEnvironmentConfigured(name);
            const active = activeBrowserEnvironment.name === name;
            return (
              <Button
                key={name}
                variant={active ? "default" : "outline"}
                disabled={!canSwitch || !configured || active || switching}
                onClick={() => switchTo(name)}
              >
                {env.label}
                {!configured ? " (not configured)" : active ? " (active)" : ""}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Promotion workflow</CardTitle>
          <CardDescription>Keep both projects identical by only ever moving forward.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Build and test in the Lovable preview — always the development project.</li>
            <li>
              Add migrations to <code>supabase/migrations/</code>, apply to dev with{" "}
              <code>supabase db push</code>, then regenerate types.
            </li>
            <li>
              Promote by linking the production ref and pushing the same files — never hand-run SQL
              in the production editor.
            </li>
            <li>Publish the app; myTimesheets.app resolves to production automatically.</li>
            <li>Verify here: the badge must read Production and all checks green.</li>
            <li>Roll back with a new forward migration; never edit an applied file.</li>
          </ol>
        </CardContent>
      </Card>
    </main>
  );
}
