import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/hooks/useWorkspace";
import { createOrganization } from "@/lib/workspace.functions";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Create organization | Robinstone Time" },
      { name: "description", content: "Set up a new organization workspace for timesheet tracking." },
      { property: "og:title", content: "Create organization | Robinstone Time" },
      { property: "og:description", content: "Set up a new organization workspace for timesheet tracking." },
    ],
  }),
  component: OnboardingPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters").max(120),
  timezone: z.string().trim().min(1, "Timezone is required").max(64),
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { refetch, setActiveOrganization } = useWorkspace();
  const create = useServerFn(createOrganization);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      timezone:
        typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
    },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    setIsSubmitting(true);
    try {
      const result = await create({ data: values });
      setActiveOrganization(result.organizationId);
      refetch();
      toast.success("Organization created");
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the organization");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Create an organization</CardTitle>
        <CardDescription>
          You become the owner and can invite teammates once it exists.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization name</FormLabel>
                  <FormControl>
                    <Input placeholder="Robinstone Consulting" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default timezone</FormLabel>
                  <FormControl>
                    <Input placeholder="Europe/London" {...field} />
                  </FormControl>
                  <FormDescription>Used for week boundaries and reporting.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create organization"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
