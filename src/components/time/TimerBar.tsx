import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Play, Square, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cancelTimer, startTimer, stopTimer, type PickerOption, type TimerState } from "@/lib/time.functions";
import { formatElapsed } from "@/lib/time-utils";

const NONE = "__none__";

type Props = {
  organizationId: string;
  timer: TimerState;
  projects: PickerOption[];
  categories: PickerOption[];
  disabled?: boolean;
};

export function TimerBar({ organizationId, timer, projects, categories, disabled }: Props) {
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState<string>(NONE);
  const [categoryId, setCategoryId] = useState<string>(NONE);
  const [description, setDescription] = useState("");
  const [elapsed, setElapsed] = useState("0:00:00");

  const start = useServerFn(startTimer);
  const stop = useServerFn(stopTimer);
  const cancel = useServerFn(cancelTimer);

  // Categories either belong to the selected project or apply to every project.
  const availableCategories = categories.filter(
    (category) =>
      category.projectId == null ||
      (projectId !== NONE && category.projectId === projectId),
  );

  useEffect(() => {
    if (categoryId === NONE) return;
    if (!availableCategories.some((category) => category.id === categoryId)) {
      setCategoryId(NONE);
    }
  }, [availableCategories, categoryId]);

  useEffect(() => {
    if (!timer) return;
    setElapsed(formatElapsed(timer.startedAt));
    const id = window.setInterval(() => setElapsed(formatElapsed(timer.startedAt)), 1000);
    return () => window.clearInterval(id);
  }, [timer]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["timer", organizationId] });
    void queryClient.invalidateQueries({ queryKey: ["week", organizationId] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard", organizationId] });
  };

  const startMutation = useMutation({
    mutationFn: () =>
      start({
        data: {
          organizationId,
          projectId: projectId === NONE ? null : projectId,
          categoryId: categoryId === NONE ? null : categoryId,
          description: description.trim() || null,
        },
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Timer started");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const stopMutation = useMutation({
    mutationFn: () => stop({ data: { organizationId } }),
    onSuccess: (result) => {
      invalidate();
      setDescription("");
      toast.success(`Logged ${result.minutes} minute${result.minutes === 1 ? "" : "s"}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancel(),
    onSuccess: () => {
      invalidate();
      toast.info("Timer discarded");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const projectLabel = timer?.projectId
    ? (projects.find((p) => p.id === timer.projectId)?.name ?? "Project")
    : "No project";

  if (timer) {
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex-1 min-w-[12rem]">
          <p className="font-mono text-2xl font-semibold tabular-nums">{elapsed}</p>
          <p className="text-sm text-muted-foreground">
            {projectLabel}
            {timer.description ? ` · ${timer.description}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => stopMutation.mutate()} disabled={stopMutation.isPending}>
            <Square className="mr-2 size-4" /> Stop &amp; log
          </Button>
          <Button
            variant="ghost"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            aria-label="Discard timer"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
      <div className="min-w-[14rem] flex-1">
        <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="timer-note">
          What are you working on?
        </label>
        <Input
          id="timer-note"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description (optional)"
          disabled={disabled}
        />
      </div>
      <div className="w-48">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Project</label>
        <Select value={projectId} onValueChange={setProjectId} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="No project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No project</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-44">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
        <Select value={categoryId} onValueChange={setCategoryId} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>None</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={() => startMutation.mutate()} disabled={disabled || startMutation.isPending}>
        <Play className="mr-2 size-4" /> Start timer
      </Button>
    </div>
  );
}
