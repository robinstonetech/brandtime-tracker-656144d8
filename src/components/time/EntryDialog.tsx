import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  createTimeEntry,
  updateTimeEntry,
  type PickerOption,
  type TimeEntry,
} from "@/lib/time.functions";
import { formatMinutes, parseDurationToMinutes } from "@/lib/time-utils";

const NONE = "__none__";

type Props = {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: TimeEntry | null;
  defaultDate: string;
  projects: PickerOption[];
  categories: PickerOption[];
};

export function EntryDialog({
  organizationId,
  open,
  onOpenChange,
  entry,
  defaultDate,
  projects,
  categories,
}: Props) {
  const queryClient = useQueryClient();
  const create = useServerFn(createTimeEntry);
  const update = useServerFn(updateTimeEntry);

  const [entryDate, setEntryDate] = useState(defaultDate);
  const [duration, setDuration] = useState("");
  const [projectId, setProjectId] = useState(NONE);
  const [categoryId, setCategoryId] = useState(NONE);
  const [description, setDescription] = useState("");
  const [isBillable, setIsBillable] = useState(true);

  useEffect(() => {
    if (!open) return;
    setEntryDate(entry?.entryDate ?? defaultDate);
    setDuration(entry ? formatMinutes(entry.durationMinutes) : "");
    setProjectId(entry?.projectId ?? NONE);
    setCategoryId(entry?.categoryId ?? NONE);
    setDescription(entry?.description ?? "");
    setIsBillable(entry?.isBillable ?? true);
  }, [open, entry, defaultDate]);

  // Categories are project-specific.
  const availableCategories =
    projectId === NONE
      ? []
      : categories.filter((category) => category.projectId === projectId);

  useEffect(() => {
    if (categoryId === NONE) return;
    if (!availableCategories.some((category) => category.id === categoryId)) {
      setCategoryId(NONE);
    }
  }, [availableCategories, categoryId]);

  const mutation = useMutation({
    mutationFn: async () => {
      const minutes = parseDurationToMinutes(duration);
      if (minutes === null) throw new Error("Enter a duration like 1h 30m, 1.5 or 90");
      if (projectId === NONE) throw new Error("Select a project");
      if (categoryId === NONE) throw new Error("Select a category");
      const payload = {
        organizationId,
        entryDate,
        durationMinutes: minutes,
        projectId,
        categoryId,
        description: description.trim() || null,
        isBillable,
      };
      return entry ? update({ data: { ...payload, id: entry.id } }) : create({ data: payload });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["week", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", organizationId] });
      toast.success(entry ? "Entry updated" : "Time logged");
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit time entry" : "Log time"}</DialogTitle>
          <DialogDescription>
            Durations accept formats like <code>1h 30m</code>, <code>1.5</code> or <code>90</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry-date">Date</Label>
              <Input
                id="entry-date"
                type="date"
                value={entryDate}
                onChange={(event) => setEntryDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry-duration">Duration</Label>
              <Input
                id="entry-duration"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                placeholder="1h 30m"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={categoryId}
                onValueChange={setCategoryId}
                disabled={projectId === NONE}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={projectId === NONE ? "Select a project first" : "Select a category"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>


          <div className="space-y-2">
            <Label htmlFor="entry-description">Description</Label>
            <Textarea
              id="entry-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="What did you work on?"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="entry-billable"
              checked={isBillable}
              onCheckedChange={(value) => setIsBillable(value === true)}
            />
            <Label htmlFor="entry-billable" className="font-normal">
              Billable
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {entry ? "Save changes" : "Log time"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
