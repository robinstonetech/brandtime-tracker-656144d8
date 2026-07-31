import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  getInvitationLink,
  getTeam,
  inviteTeammate,
  resendInvitation,
  revokeInvitation,
  setMemberActive,
  updateMemberRole,
} from "@/lib/team.functions";


export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team | Robinstone Time" },
      { name: "description", content: "Invite teammates, manage roles and control access to your organization." },
      { property: "og:title", content: "Team | Robinstone Time" },
      { property: "og:description", content: "Invite teammates and manage organization roles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamPage,
});

const ROLES = ["owner", "admin", "manager", "member"] as const;

function initials(value: string) {
  return value
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function TeamPage() {
  const { activeMembership } = useWorkspace();
  const organizationId = activeMembership?.organizationId ?? null;
  const queryClient = useQueryClient();

  const fetchTeam = useServerFn(getTeam);
  const invite = useServerFn(inviteTeammate);
  const revoke = useServerFn(revokeInvitation);
  const resend = useServerFn(resendInvitation);
  const fetchLink = useServerFn(getInvitationLink);
  const changeRole = useServerFn(updateMemberRole);
  const setActive = useServerFn(setMemberActive);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("member");
  const [visibleLinks, setVisibleLinks] = useState<Record<string, string>>({});

  const [lastLink, setLastLink] = useState<string | null>(null);

  const teamQuery = useQuery({
    queryKey: ["team", organizationId],
    queryFn: () => fetchTeam({ data: { organizationId: organizationId! } }),
    enabled: Boolean(organizationId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["team", organizationId] });

  const inviteMutation = useMutation({
    mutationFn: () =>
      invite({ data: { organizationId: organizationId!, email: email.trim(), role } }),
    onSuccess: (result) => {
      void invalidate();
      setLastLink(result.inviteUrl);
      setEmail("");
      toast.success(
        result.delivered ? "Invitation email sent" : "Invitation created — share the link below",
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => {
      void invalidate();
      toast.success("Invitation revoked");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => resend({ data: { id } }),
    onSuccess: (result) => {
      void invalidate();
      setLastLink(result.inviteUrl);
      toast.success(
        result.delivered ? "Invitation email resent" : "New link generated — share it below",
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });


  const roleMutation = useMutation({
    mutationFn: (input: { userId: string; role: (typeof ROLES)[number] }) =>
      changeRole({ data: { organizationId: organizationId!, ...input } }),
    onSuccess: () => {
      void invalidate();
      toast.success("Role updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeMutation = useMutation({
    mutationFn: (input: { userId: string; isActive: boolean }) =>
      setActive({ data: { organizationId: organizationId!, ...input } }),
    onSuccess: () => {
      void invalidate();
      toast.success("Member updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!organizationId) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>No organization selected</CardTitle>
          <CardDescription>Create or join an organization first.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const canManage = teamQuery.data?.canManage ?? false;
  const members = teamQuery.data?.members ?? [];
  const invitations = (teamQuery.data?.invitations ?? []).filter((i) => i.status === "pending");
  const currentUserId = teamQuery.data?.currentUserId;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">
            {members.length} member{members.length === 1 ? "" : "s"} · {invitations.length} pending
            invitation{invitations.length === 1 ? "" : "s"}
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 size-4" /> Invite teammate
          </Button>
        ) : null}
      </div>

      {teamQuery.isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>Roles control what each person can see and approve.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.userId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback>{initials(member.name || member.email)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-sm text-muted-foreground">{member.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {canManage && member.userId !== currentUserId ? (
                          <Select
                            value={member.role}
                            onValueChange={(value) =>
                              roleMutation.mutate({
                                userId: member.userId,
                                role: value as (typeof ROLES)[number],
                              })
                            }
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {r}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary">{member.role}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.isActive ? "default" : "outline"}>
                          {member.isActive ? "Active" : "Deactivated"}
                        </Badge>
                      </TableCell>
                      {canManage ? (
                        <TableCell className="text-right">
                          {member.userId !== currentUserId ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                activeMutation.mutate({
                                  userId: member.userId,
                                  isActive: !member.isActive,
                                })
                              }
                            >
                              {member.isActive ? "Deactivate" : "Reactivate"}
                            </Button>
                          ) : null}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {canManage ? (
            <Card>
              <CardHeader>
                <CardTitle>Pending invitations</CardTitle>
                <CardDescription>Invitations expire seven days after they are sent.</CardDescription>
              </CardHeader>
              <CardContent>
                {invitations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending invitations.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map((invitation) => (
                        <TableRow key={invitation.id}>
                          <TableCell className="font-medium">{invitation.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{invitation.role}</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(invitation.expiresAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="mr-2"
                              disabled={
                                resendMutation.isPending &&
                                resendMutation.variables === invitation.id
                              }
                              onClick={() => resendMutation.mutate(invitation.id)}
                            >
                              {resendMutation.isPending &&
                              resendMutation.variables === invitation.id
                                ? "Sending…"
                                : "Resend"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => revokeMutation.mutate(invitation.id)}
                            >
                              Revoke
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>
              They will receive an email with a link to join this organization.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as typeof role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {lastLink ? (
              <div className="space-y-2">
                <Label>Invitation link</Label>
                <div className="flex gap-2">
                  <Input readOnly value={lastLink} />
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Copy invitation link"
                    onClick={() => {
                      void navigator.clipboard.writeText(lastLink);
                      toast.success("Link copied");
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending || !email.trim()}
            >
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
