import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import type { CategoryRow, OrgPerson, ProjectRow } from "@/lib/projects.functions";
import type { TaskRow } from "@/lib/tasks-types";
import { saveTask } from "@/lib/tasks.functions";

export function TaskDialog({
  organizationId,
  value,
  projects,
  categories,
  people,
  lockedProjectId,
  onClose,
  onSaved,
}: {
  organizationId: string;
  value: TaskRow | "new" | null;
  projects: ProjectRow[];
  categories: CategoryRow[];
  people: OrgPerson[];
  lockedProjectId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const task = value === "new" || value === null ? null : value;
  const save = useServerFn(saveTask);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [status, setStatus] = useState<"open" | "done">("open");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  useEffect(() => {
    if (!value) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setProjectId(task?.projectId ?? lockedProjectId ?? "");
    setCategoryId(task?.categoryId ?? "");
    setDueOn(task?.dueOn ?? "");
    setStatus(task?.status ?? "open");
    setAssigneeIds(task?.assigneeIds ?? []);
  }, [value, task, lockedProjectId]);

  const projectCategories = categories.filter(
    (category) => category.projectId === projectId && category.isActive,
  );

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          organizationId,
          id: task?.id ?? null,
          title: title.trim(),
          description: description.trim() || null,
          projectId,
          categoryId,
          status,
          dueOn: dueOn || null,
          assigneeIds,
        },
      }),
    onSuccess: () => {
      onSaved();
      toast.success(task ? "Task updated" : "Task created");
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const canSave = title.trim().length >= 2 && Boolean(projectId) && Boolean(categoryId);

  return (
    <Dialog open={Boolean(value)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            Tasks belong to a project and one of that project&apos;s categories.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Project</Label>
              {lockedProjectId ? (
                <div className="rounded-md border px-3 py-2 text-sm font-medium">
                  {(() => {
                    const locked = projects.find((p) => p.id === lockedProjectId);
                    return locked
                      ? `${locked.code ? `${locked.code} — ` : ""}${locked.name}`
                      : "Project";
                  })()}
                </div>
              ) : (
                <Select
                  value={projectId}
                  onValueChange={(next) => {
                    setProjectId(next);
                    setCategoryId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.code ? `${project.code} — ` : ""}
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId} disabled={!projectId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={projectId ? "Select a category" : "Choose a project first"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {projectCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueOn}
                onChange={(e) => setDueOn(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(next) => setStatus(next as "open" | "done")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Assigned team members</Label>
            <p className="text-xs text-muted-foreground">
              Leave empty to make this task visible to everyone in the organization.
            </p>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
              {people.map((person) => (
                <label key={person.userId} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={assigneeIds.includes(person.userId)}
                    onCheckedChange={(checked) =>
                      setAssigneeIds((prev) =>
                        checked
                          ? [...prev, person.userId]
                          : prev.filter((id) => id !== person.userId),
                      )
                    }
                  />
                  <span>{person.name || person.email}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSave || mutation.isPending}>
            Save task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
