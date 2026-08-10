import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Archive, ChevronDown, ChevronRight, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/hooks/useWorkspace";
import { formatMinutes } from "@/lib/time-utils";
import {
  archiveProject,
  deleteCategory,
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
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { deleteTask, getTasks, setTaskStatus } from "@/lib/tasks.functions";
import type { TaskRow } from "@/lib/tasks-types";

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
const NEW_CLIENT = "__new_client__";

function ProjectsPage() {
  const { activeMembership } = useWorkspace();
  const organizationId = activeMembership?.organizationId ?? null;
  const queryClient = useQueryClient();

  const fetchPage = useServerFn(getProjectsPage);
  const [projectDialog, setProjectDialog] = useState<ProjectRow | "new" | null>(null);
  const [clientDialog, setClientDialog] = useState<ClientRow | "new" | null>(null);
  const [manageClientsOpen, setManageClientsOpen] = useState(false);
  const [categoryDialog, setCategoryDialog] = useState<{ row: CategoryRow | "new"; projectId: string } | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryRow | null>(null);
  const [taskDialog, setTaskDialog] = useState<{ row: TaskRow | "new"; projectId: string } | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskRow | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  const removeCategory = useServerFn(deleteCategory);
  const categoryDeleteMutation = useMutation({
    mutationFn: (input: { id: string }) =>
      removeCategory({ data: { organizationId: organizationId!, id: input.id } }),
    onSuccess: () => {
      setCategoryToDelete(null);
      void invalidate();
      toast.success("Category deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const fetchTasks = useServerFn(getTasks);
  const tasksQuery = useQuery({
    queryKey: ["tasks", organizationId],
    queryFn: () => fetchTasks({ data: { organizationId: organizationId! } }),
    enabled: Boolean(organizationId),
  });
  const invalidateTasks = () => queryClient.invalidateQueries({ queryKey: ["tasks"] });

  const updateTaskStatus = useServerFn(setTaskStatus);
  const taskStatusMutation = useMutation({
    mutationFn: (input: { id: string; status: "open" | "done" }) =>
      updateTaskStatus({ data: { organizationId: organizationId!, ...input } }),
    onSuccess: () => void invalidateTasks(),
    onError: (error: Error) => toast.error(error.message),
  });

  const removeTask = useServerFn(deleteTask);
  const taskDeleteMutation = useMutation({
    mutationFn: (input: { id: string }) =>
      removeTask({ data: { organizationId: organizationId!, id: input.id } }),
    onSuccess: () => {
      setTaskToDelete(null);
      void invalidateTasks();
      toast.success("Task deleted");
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

  const canManage = pageQuery.data?.canManage ?? false;
  const projects = pageQuery.data?.projects ?? [];
  const clients = pageQuery.data?.clients ?? [];
  const categories = pageQuery.data?.categories ?? [];
  const people = pageQuery.data?.people ?? [];
  const tasks = tasksQuery.data ?? [];

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const projectName = (id: string) =>
    projects.find((p) => p.id === id)?.name ?? "Unknown project";

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between space-y-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Projects contain their categories and tasks. Expand a project to manage them.
          </p>
        </div>
        {canManage ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setManageClientsOpen(true)}>
              Manage clients
            </Button>
            <Button onClick={() => setProjectDialog("new")}>
              <Plus className="mr-2 size-4" /> New project
            </Button>
          </div>
        ) : null}
      </div>

      {pageQuery.isLoading ? (
        <Skeleton className="h-72" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All projects</CardTitle>
            <CardDescription>{projects.length} project(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Members</TableHead>
                    {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => {
                    const isOpen = expanded.has(project.id);
                    const projectCategories = categories.filter(
                      (c) => c.projectId === project.id,
                    );
                    const projectTasks = tasks.filter((t) => t.projectId === project.id);
                    return (
                      <ProjectRowGroup
                        key={project.id}
                        project={project}
                        isOpen={isOpen}
                        onToggle={() => toggleExpand(project.id)}
                        canManage={canManage}
                        categories={projectCategories}
                        tasks={projectTasks}
                        people={people}
                        onEditProject={() => setProjectDialog(project)}
                        onArchive={() =>
                          archiveMutation.mutate({
                            id: project.id,
                            archived: project.status !== "archived",
                          })
                        }
                        onEditCategory={(row) =>
                          setCategoryDialog({ row, projectId: project.id })
                        }
                        onToggleCategory={(row) =>
                          categoryActiveMutation.mutate({
                            id: row.id,
                            isActive: !row.isActive,
                          })
                        }
                        onDeleteCategory={(row) => setCategoryToDelete(row)}
                        onEditTask={(row) =>
                          setTaskDialog({ row, projectId: project.id })
                        }
                        onToggleTaskStatus={(row) =>
                          taskStatusMutation.mutate({
                            id: row.id,
                            status: row.status === "done" ? "open" : "done",
                          })
                        }
                        onDeleteTask={(row) => setTaskToDelete(row)}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog
        open={categoryToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setCategoryToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{categoryToDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the category from{" "}
              {categoryToDelete?.projectName ?? "its project"}. Time already logged keeps its
              hours but loses this category. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={categoryDeleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={categoryDeleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (categoryToDelete) categoryDeleteMutation.mutate({ id: categoryToDelete.id });
              }}
            >
              {categoryDeleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={taskToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setTaskToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{taskToDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Time already logged against this task keeps its hours but loses the task link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={taskDeleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={taskDeleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (taskToDelete) taskDeleteMutation.mutate({ id: taskToDelete.id });
              }}
            >
              {taskDeleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {taskDialog ? (
        <TaskDialog
          organizationId={organizationId}
          value={taskDialog.row}
          projects={projects}
          categories={categories}
          people={people}
          lockedProjectId={taskDialog.projectId}
          onClose={() => setTaskDialog(null)}
          onSaved={() => void invalidateTasks()}
        />
      ) : null}

      <ProjectDialog
        organizationId={organizationId}
        value={projectDialog}
        clients={clients}
        people={people}
        onClose={() => setProjectDialog(null)}
        onSaved={() => void invalidate()}
        onRequestNewClient={() => setClientDialog("new")}
      />

      <ClientDialog
        organizationId={organizationId}
        value={clientDialog}
        clients={clients}
        onClose={() => setClientDialog(null)}
        onSaved={() => void invalidate()}
      />

      {categoryDialog ? (
        <CategoryDialog
          organizationId={organizationId}
          value={categoryDialog.row}
          lockedProjectId={categoryDialog.projectId}
          lockedProjectName={projectName(categoryDialog.projectId)}
          onClose={() => setCategoryDialog(null)}
          onSaved={() => void invalidate()}
        />
      ) : null}

      <ManageClientsDialog
        open={manageClientsOpen}
        onOpenChange={setManageClientsOpen}
        clients={clients}
        canManage={canManage}
        onEdit={(client) => setClientDialog(client)}
        onToggleActive={(client) =>
          clientActiveMutation.mutate({ id: client.id, isActive: !client.isActive })
        }
      />
    </div>
  );
}

function ProjectRowGroup({
  project,
  isOpen,
  onToggle,
  canManage,
  categories,
  tasks,
  people,
  onEditProject,
  onArchive,
  onEditCategory,
  onToggleCategory,
  onDeleteCategory,
  onEditTask,
  onToggleTaskStatus,
  onDeleteTask,
}: {
  project: ProjectRow;
  isOpen: boolean;
  onToggle: () => void;
  canManage: boolean;
  categories: CategoryRow[];
  tasks: TaskRow[];
  people: OrgPerson[];
  onEditProject: () => void;
  onArchive: () => void;
  onEditCategory: (row: CategoryRow | "new") => void;
  onToggleCategory: (row: CategoryRow) => void;
  onDeleteCategory: (row: CategoryRow) => void;
  onEditTask: (row: TaskRow | "new") => void;
  onToggleTaskStatus: (row: TaskRow) => void;
  onDeleteTask: (row: TaskRow) => void;
}) {
  const colSpan = canManage ? 6 : 5;
  return (
    <>
      <TableRow className={project.status === "archived" ? "opacity-60" : undefined}>
        <TableCell>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={isOpen ? "Collapse project" : "Expand project"}
            onClick={onToggle}
          >
            {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </Button>
        </TableCell>
        <TableCell>
          <button
            type="button"
            className="text-left font-medium"
            onClick={onToggle}
          >
            {project.code ? `${project.code} — ` : ""}
            {project.name}
          </button>
          {project.description ? (
            <div className="max-w-sm truncate text-sm text-muted-foreground">
              {project.description}
            </div>
          ) : null}
        </TableCell>
        <TableCell>{project.clientName ?? "—"}</TableCell>
        <TableCell>
          <Badge variant="secondary">{project.status.replace("_", " ")}</Badge>
          {!project.isBillable ? (
            <Badge variant="outline" className="ml-2">Non-billable</Badge>
          ) : null}
        </TableCell>
        <TableCell>
          {project.memberIds.length === 0 ? "Everyone" : project.memberIds.length}
        </TableCell>
        {canManage ? (
          <TableCell className="text-right">
            <Button variant="ghost" size="icon" aria-label="Edit project" onClick={onEditProject}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={project.status === "archived" ? "Restore project" : "Archive project"}
              onClick={onArchive}
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
      {isOpen ? (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={colSpan} className="p-0">
            <div className="grid gap-4 p-4 pl-12">
              {/* Categories sub-section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Categories</h3>
                  {canManage ? (
                    <Button size="sm" variant="outline" onClick={() => onEditCategory("new")}>
                      <Plus className="mr-2 size-4" /> New category
                    </Button>
                  ) : null}
                </div>
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No categories for this project. Add one to start logging time.
                  </p>
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
                            <Badge variant="secondary">
                              {category.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          {canManage ? (
                            <TableCell>
                              <div className="flex items-start justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => onEditCategory(category)}>
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onToggleCategory(category)}
                                >
                                  {category.isActive ? "Deactivate" : "Activate"}
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-soft-red text-soft-red-foreground hover:bg-soft-red/90"
                                  onClick={() => onDeleteCategory(category)}
                                >
                                  <Trash2 className="mr-2 size-4" /> Delete
                                </Button>
                              </div>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Tasks sub-section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Tasks</h3>
                  {canManage ? (
                    <Button size="sm" variant="outline" onClick={() => onEditTask("new")}>
                      <Plus className="mr-2 size-4" /> New task
                    </Button>
                  ) : null}
                </div>
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No tasks for this project. Add one to assign work to team members.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead>Logged</TableHead>
                        <TableHead>Status</TableHead>
                        {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div className="font-medium">{task.title}</div>
                            {task.dueOn ? (
                              <div className="text-xs text-muted-foreground">Due {task.dueOn}</div>
                            ) : null}
                          </TableCell>
                          <TableCell>{task.categoryName}</TableCell>
                          <TableCell>
                            {task.assigneeIds.length === 0 ? (
                              <span className="text-muted-foreground">Unassigned</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {task.assigneeIds.map((userId) => {
                                  const person = people.find((item) => item.userId === userId);
                                  return (
                                    <Badge key={userId} variant="outline">
                                      {person?.name || person?.email || "Member"}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono tabular-nums">
                            {formatMinutes(task.loggedMinutes)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {task.status === "done" ? "Done" : "Open"}
                            </Badge>
                          </TableCell>
                          {canManage ? (
                            <TableCell>
                              <div className="flex items-start justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => onEditTask(task)}>
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onToggleTaskStatus(task)}
                                >
                                  {task.status === "done" ? "Reopen" : "Mark done"}
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-soft-red text-soft-red-foreground hover:bg-soft-red/90"
                                  onClick={() => onDeleteTask(task)}
                                >
                                  <Trash2 className="mr-2 size-4" /> Delete
                                </Button>
                              </div>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

function ProjectDialog({
  organizationId,
  value,
  clients,
  people,
  onClose,
  onSaved,
  onRequestNewClient,
}: {
  organizationId: string;
  value: ProjectRow | "new" | null;
  clients: ClientRow[];
  people: OrgPerson[];
  onClose: () => void;
  onSaved: () => void;
  onRequestNewClient: () => void;
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
              <Select
                value={clientId}
                onValueChange={(v) => {
                  if (v === NEW_CLIENT) {
                    onRequestNewClient();
                    return;
                  }
                  setClientId(v);
                }}
              >
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
                  {canManagePlaceholder(clients)}
                  <SelectItem value={NEW_CLIENT}>+ New client…</SelectItem>
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

/** placeholder helper so the SelectContent stays valid even with no clients */
function canManagePlaceholder(_clients: ClientRow[]) {
  return null;
}

function ClientDialog({
  organizationId,
  value,
  clients,
  onClose,
  onSaved,
}: {
  organizationId: string;
  value: ClientRow | "new" | null;
  clients: ClientRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const client = value === "new" || value === null ? null : value;
  const save = useServerFn(saveClient);
  const toggleClient = useServerFn(setClientActive);
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!value) return;
    setName(client?.name ?? "");
    setContactEmail(client?.contactEmail ?? "");
    setIsActive(client?.isActive ?? true);
  }, [value, client]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { clientId } = await save({
        data: {
          organizationId,
          id: client?.id ?? null,
          name: name.trim(),
          contactEmail: contactEmail.trim(),
        },
      });
      if (client) {
        await toggleClient({
          data: { organizationId, id: client.id, isActive },
        });
      }
      return clientId;
    },
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
          {client ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="client-active"
                checked={isActive}
                onCheckedChange={(v) => setIsActive(v === true)}
              />
              <Label htmlFor="client-active" className="font-normal">
                Active
              </Label>
            </div>
          ) : null}
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

function ManageClientsDialog({
  open,
  onOpenChange,
  clients,
  canManage,
  onEdit,
  onToggleActive,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientRow[];
  canManage: boolean;
  onEdit: (client: ClientRow) => void;
  onToggleActive: (client: ClientRow) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Clients</DialogTitle>
          <DialogDescription>
            Group projects by the organization they bill to. Click a client to edit it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clients yet.</p>
          ) : (
            clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <div className="font-medium">{client.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {client.contactEmail ?? "No contact"} · {client.projectCount} project(s)
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={client.isActive ? "default" : "secondary"}>
                    {client.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {canManage ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => onEdit(client)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleActive(client)}
                      >
                        {client.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDialog({
  organizationId,
  value,
  lockedProjectId,
  lockedProjectName,
  onClose,
  onSaved,
}: {
  organizationId: string;
  value: CategoryRow | "new";
  lockedProjectId: string;
  lockedProjectName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const category = value === "new" ? null : value;
  const save = useServerFn(saveCategory);
  const [name, setName] = useState("");
  const [isBillable, setIsBillable] = useState(true);

  useEffect(() => {
    setName(category?.name ?? "");
    setIsBillable(category?.isBillable ?? true);
  }, [value, category]);

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          organizationId,
          id: category?.id ?? null,
          name: name.trim(),
          isBillable,
          projectId: lockedProjectId,
        },
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
          <div className="space-y-2">
            <Label>Project</Label>
            <div className="rounded-md border px-3 py-2 text-sm font-medium">
              {lockedProjectName}
            </div>
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
