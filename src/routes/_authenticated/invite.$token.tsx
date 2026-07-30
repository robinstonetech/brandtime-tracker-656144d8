import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { acceptInvitation } from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/invite/$token")({
  head: () => ({
    meta: [
      { title: "Accept invitation | Robinstone Time" },
      { name: "description", content: "Accept your invitation to join an organization on Robinstone Time." },
      { property: "og:title", content: "Accept invitation | Robinstone Time" },
      { property: "og:description", content: "Join your team's timesheet workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { token } = Route.useParams();
  const { user } = useAuth();
  const { refetch, setActiveOrganization } = useWorkspace();
  const navigate = useNavigate();
  const accept = useServerFn(acceptInvitation);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => accept({ data: { token } }),
    onSuccess: (result) => {
      setActiveOrganization(result.organizationId);
      refetch();
      toast.success("Invitation accepted");
      void navigate({ to: "/dashboard" });
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  useEffect(() => {
    if (user && mutation.isIdle) mutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>{errorMessage ? "Invitation problem" : "Joining organization…"}</CardTitle>
        <CardDescription>
          {errorMessage ??
            "We're accepting your invitation and setting up your workspace access."}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Signed in as {user?.email ?? "…"}. Invitations must be accepted with the email address they
        were sent to.
      </CardContent>
      {errorMessage ? (
        <CardFooter className="gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
            Go to dashboard
          </Button>
          <Button
            onClick={() => {
              setErrorMessage(null);
              mutation.mutate();
            }}
          >
            Try again
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
