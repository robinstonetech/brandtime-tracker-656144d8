import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Archive, Pencil, Plus, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  archiveProject,
  getProjectsPage,
  saveCategory,
  saveClient,
  saveProject,
  setCategoryActive,
  setClientActive,
  type ClientRow,
  type CategoryRow,
  type OrgPerson,
  type ProjectRow,
} from "@/lib/projects.functions";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { title: "Projects | Robinstone Time" },
      { name: "description", content: "Manage projects, clients and time categories for your organization." },
      { property: "og:title", content: "Projects | Robinstone Time" },
      { property: "og:description", content: "Manage projects, clients and time categories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectsPage,
});

const NONE = "__none__";

function ProjectsPage() {
  const { activeMembership } = useWorkspace();
  const organizationId = activeMembership?.organizationId ?? null;
  const queryClient = useQueryClient();

  const fetchPage = useServerFn(getProjectsPage);
  const [projectDialog, setProjectDialog] = useState<ProjectRow | "new" | null>(null);
  const [clientDialog, setClientDialog] = useState<ClientRow | "new" | null>(null);
  const [categoryDialog, setCategoryDialog] = useState<CategoryRow | "new" | null>(null);

  const pageQuery = useQuery({
    queryKey: ["projects-page", organizationId],
    queryFn: () => fetchPage({ data: { organizationId: organizationId! } }),
    enabled: Boolean(organizationId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["projects-page", organizationId] });

  const archive = useServerFn(archiveProject);
  const archiveMutation = useMutation({
    mutationFn: (input: { id: string; archived: boolean }) =>
      archive({ data: { organizationId: organizationId!, ...input } }),
    onSuccess: () => {
      void invalidate();
      toast.success("Project updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleClient = useServerFn(setClientActive);
  const clientActiveMutation = useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) =>
      toggleClient({ data: { organizationId: organizationId!, ...input } }),
    onSuccess: () => void invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleCategory = useServerFn(setCategoryActive);
  const categoryActiveMutation = useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) =>
      toggleCategory({ data: { organizationId: organizationId!, ...input } }),
    onSuccess: () => void invalidate(),
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

  const canManage = pageQuery.data?.canManage ?? false;
  const projects = pageQuery.data?.projects ?? [];
  const clients = pageQuery.data?.clients ?? [];
  const categories = pageQuery.data?.categories ?? [];
  const people = pageQuery.data?.people ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Projects, clients and categories drive what your team can log time against.
        </p>
      </div>

      {pageQuery.isLoading ? (
        <Skeleton className="h-72" />
      ) : (
        <Tabs defaultValue="projects">
          <TabsList>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>All projects</CardTitle>
                  <CardDescription>{projects.length} project(s)</CardDescription>
                </div>
                {canManage ? (
                  <Button onClick={() => setProjectDialog("new")}>
                    <Plus className="mr-2 size-4" /> New project
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No projects yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Members</TableHead>
                        {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell>
                            <div className="font-medium">
                              {project.code ? `${project.code} — ` : ""}
                              {project.name}
                            </div>
                            {project.description ? (
                              <div className="max-w-sm truncate text-sm text-muted-foreground">
                                {project.description}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell>{project.clientName ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant={project.status === "active" ? "default" : "secondary"}>
                              {project.status.replace("_", " ")}
                            </Badge>
                            {!project.isBillable ? (
                              <Badge variant="outline" className="ml-2">
                                Non-billable
                              </Badge>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {project.memberIds.length === 0 ? "Everyone" : project.memberIds.length}
                          </TableCell>
                          {canManage ? (
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Edit project"
                                onClick={() => setProjectDialog(project)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={
                                  project.status === "archived" ? "Restore project" : "Archive project"
                                }
                                onClick={() =>
                                  archiveMutation.mutate({
                                    id: project.id,
                                    archived: project.status !== "archived",
                                  })
                                }
                              >
                                {project.status === "archived" ? (
                                  <RotateCcw className="size-4" />
                                ) : (
                                  <Archive className="size-4" />
                                )}
                              </Button>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Clients</CardTitle>
                  <CardDescription>Group projects by the organization they bill to.</CardDescription>
                </div>
                {canManage ? (
                  <Button onClick={() => setClientDialog("new")}>
                    <Plus className="mr-2 size-4" /> New client
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                {clients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No clients yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Projects</TableHead>
                        <TableHead>Status</TableHead>
                        {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{client.contactEmail ?? "—"}</TableCell>
                          <TableCell>{client.projectCount}</TableCell>
                          <TableCell>
                            <Badge variant={client.isActive ? "default" : "secondary"}>
                              {client.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          {canManage ? (
                            <TableCell className="space-x-2 text-right">
                              <Button variant="ghost" size="sm" onClick={() => setClientDialog(client)}>
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  clientActiveMutation.mutate({
                                    id: client.id,
                                    isActive: !client.isActive,
                                  })
                                }
                              >
                                {client.isActive ? "Deactivate" : "Activate"}
                              </Button>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Time categories</CardTitle>
                  <CardDescription>Classify time entries, e.g. Development or Meetings.</CardDescription>
                </div>
                {canManage ? (
                  <Button onClick={() => setCategoryDialog("new")}>
                    <Plus className="mr-2 size-4" /> New category
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No categories yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Billable</TableHead>
                        <TableHead>Status</TableHead>
                        {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>{category.isBillable ? "Yes" : "No"}</TableCell>
                          <TableCell>
                            <Badge variant={category.isActive ? "default" : "secondary"}>
                              {category.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          {canManage ? (
                            <TableCell className="space-x-2 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCategoryDialog(category)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  categoryActiveMutation.mutate({
                                    id: category.id,
                                    isActive: !category.isActive,
                                  })
                                }
                              >
                                {category.isActive ? "Deactivate" : "Activate"}
                              </Button>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <ProjectDialog
        organizationId={organizationId}
        value={projectDialog}
        clients={clients}
        people={people}
        onClose={() => setProjectDialog(null)}
        onSaved={() => void invalidate()}
      />
      <ClientDialog
        organizationId={organizationId}
        value={clientDialog}
        onClose={() => setClientDialog(null)}
        onSaved={() => void invalidate()}
      />
      <CategoryDialog
        organizationId={organizationId}
        value={categoryDialog}
        onClose={() => setCategoryDialog(null)}
        onSaved={() => void invalidate()}
      />
    </div>
  );
}

function ProjectDialog({
  organizationId,
  value,
  clients,
  people,
  onClose,
  onSaved,
}: {
  organizationId: string;
  value: ProjectRow | "new" | null;
  clients: ClientRow[];
  people: OrgPerson[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const project = value === "new" || value === null ? null : value;
  const save = useServerFn(saveProject);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState(NONE);
  const [status, setStatus] = useState<"active" | "on_hold" | "archived">("active");
  const [isBillable, setIsBillable] = useState(true);
  const [rate, setRate] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);

  useEffect(() => {
    if (!value) return;
    setName(project?.name ?? "");
    setCode(project?.code ?? "");
    setDescription(project?.description ?? "");
    setClientId(project?.clientId ?? NONE);
    setStatus(project?.status ?? "active");
    setIsBillable(project?.isBillable ?? true);
    setRate(project?.defaultHourlyRate != null ? String(project.defaultHourlyRate) : "");
    setMemberIds(project?.memberIds ?? []);
  }, [value, project]);

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          organizationId,
          id: project?.id ?? null,
          name: name.trim(),
          code: code.trim() || null,
          description: description.trim() || null,
          clientId: clientId === NONE ? null : clientId,
          status,
          isBillable,
          defaultHourlyRate: rate.trim() ? Number(rate) : null,
          memberIds,
        },
      }),
    onSuccess: () => {
      onSaved();
      toast.success(project ? "Project updated" : "Project created");
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={Boolean(value)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            Leave the member list empty to make the project available to everyone.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="project-name">Name</Label>
              <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-code">Code</Label>
              <Input id="project-code" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On hold</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-rate">Hourly rate</Label>
              <Input
                id="project-rate"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="project-billable"
              checked={isBillable}
              onCheckedChange={(v) => setIsBillable(v === true)}
            />
            <Label htmlFor="project-billable" className="font-normal">
              Billable by default
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Assigned members</Label>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
              {people.map((person) => (
                <label key={person.userId} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={memberIds.includes(person.userId)}
                    onCheckedChange={(checked) =>
                      setMemberIds((prev) =>
                        checked === true
                          ? [...prev, person.userId]
                          : prev.filter((id) => id !== person.userId),
                      )
                    }
                  />
                  <span>{person.name}</span>
                  <span className="text-muted-foreground">{person.email}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Save project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClientDialog({
  organizationId,
  value,
  onClose,
  onSaved,
}: {
  organizationId: string;
  value: ClientRow | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const client = value === "new" || value === null ? null : value;
  const save = useServerFn(saveClient);
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  useEffect(() => {
    if (!value) return;
    setName(client?.name ?? "");
    setContactEmail(client?.contactEmail ?? "");
  }, [value, client]);

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          organizationId,
          id: client?.id ?? null,
          name: name.trim(),
          contactEmail: contactEmail.trim(),
        },
      }),
    onSuccess: () => {
      onSaved();
      toast.success(client ? "Client updated" : "Client created");
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={Boolean(value)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{client ? "Edit client" : "New client"}</DialogTitle>
          <DialogDescription>Clients group projects for reporting and billing.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="client-name">Name</Label>
            <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-email">Contact email</Label>
            <Input
              id="client-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Save client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDialog({
  organizationId,
  value,
  onClose,
  onSaved,
}: {
  organizationId: string;
  value: CategoryRow | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const category = value === "new" || value === null ? null : value;
  const save = useServerFn(saveCategory);
  const [name, setName] = useState("");
  const [isBillable, setIsBillable] = useState(true);

  useEffect(() => {
    if (!value) return;
    setName(category?.name ?? "");
    setIsBillable(category?.isBillable ?? true);
  }, [value, category]);

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: { organizationId, id: category?.id ?? null, name: name.trim(), isBillable },
      }),
    onSuccess: () => {
      onSaved();
      toast.success(category ? "Category updated" : "Category created");
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={Boolean(value)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>Categories describe the kind of work performed.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Name</Label>
            <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="category-billable"
              checked={isBillable}
              onCheckedChange={(v) => setIsBillable(v === true)}
            />
            <Label htmlFor="category-billable" className="font-normal">
              Billable by default
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Save category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
