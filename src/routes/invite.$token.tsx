import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { acceptInvitation, getInvitationPreview } from "@/lib/team.functions";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [
      { title: "Accept invitation | Robinstone Time" },
      {
        name: "description",
        content: "Set a password to join your team's timesheet workspace on Robinstone Time.",
      },
      { property: "og:title", content: "Accept invitation | Robinstone Time" },
      { property: "og:description", content: "Join your team's timesheet workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvitePage,
});

const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your name").max(120),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const preview = useServerFn(getInvitationPreview);
  const accept = useServerFn(acceptInvitation);

  const invitation = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => preview({ data: { token } }),
    retry: false,
  });

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", password: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof signupSchema>) => {
      const email = invitation.data?.email;
      if (!email) throw new Error("Invitation is not available");

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: values.password,
        options: { data: { full_name: values.fullName } },
      });

      let session = signUpData?.session ?? null;

      if (signUpError || !session) {
        // Already registered (or confirmation required) — try signing in instead.
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: values.password,
        });
        if (signInError) {
          throw new Error(
            signUpError && !signUpError.message.toLowerCase().includes("already")
              ? signUpError.message
              : signInError.message,
          );
        }
        session = signInData.session;
      }

      if (!session) throw new Error("Could not start a session. Please try signing in.");

      return accept({ data: { token } });
    },
    onSuccess: (result) => {
      window.localStorage.setItem("rbs-time.active-organization", result.organizationId);
      toast.success("Welcome aboard!");
      void navigate({ to: "/dashboard", replace: true });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const data = invitation.data;
  const unusable =
    !invitation.isLoading &&
    (!data || data.status !== "pending" || data.expired);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Robinstone Business Suite <span className="text-muted-foreground">— Time</span>
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {invitation.isLoading
                ? "Checking your invitation…"
                : unusable
                  ? "Invitation unavailable"
                  : `Join ${data?.organizationName}`}
            </CardTitle>
            <CardDescription>
              {invitation.isLoading
                ? "One moment while we look up your invitation."
                : unusable
                  ? !data
                    ? "This invitation link is not valid."
                    : data.expired
                      ? "This invitation has expired. Ask an administrator to send a new one."
                      : `This invitation has already been ${data.status}.`
                  : `You've been invited as ${data?.role}. Create a password to finish setting up your account.`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {unusable ? (
              <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/auth" })}>
                Go to sign in
              </Button>
            ) : data ? (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
                  className="space-y-4"
                >
                  <FormItem>
                    <FormLabel>Organization</FormLabel>
                    <FormControl>
                      <Input value={data.organizationName} readOnly disabled />
                    </FormControl>
                  </FormItem>

                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input value={data.email} readOnly disabled />
                    </FormControl>
                  </FormItem>

                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input autoComplete="name" placeholder="Alex Morgan" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="new-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm password</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="new-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? "Joining…" : "Create account & join"}
                  </Button>
                </form>
              </Form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
