"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  Filter,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Diamond,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils/format";
import { createClient } from "@/lib/supabase/client";
import GanttChart from "@/components/schedule/GanttChart";
import type {
  ScheduleTask,
  ScheduleTaskInsert,
  ScheduleTaskStatus,
  WorkPackage,
  Contractor,
} from "@/types";

// --------------- Status config ---------------

const STATUS_OPTIONS: { value: ScheduleTaskStatus; label: string; color: string }[] = [
  { value: "scheduled", label: "Scheduled", color: "bg-blue-500" },
  { value: "in_progress", label: "In Progress", color: "bg-orange-500" },
  { value: "delayed", label: "Delayed", color: "bg-red-500" },
  { value: "complete", label: "Complete", color: "bg-green-500" },
];

// --------------- Empty form state ---------------

interface TaskFormState {
  name: string;
  work_package_id: string;
  start_date: string;
  end_date: string;
  contractor_id: string;
  is_milestone: boolean;
  depends_on: string[];
  notes: string;
  status: ScheduleTaskStatus;
}

const EMPTY_FORM: TaskFormState = {
  name: "",
  work_package_id: "",
  start_date: "",
  end_date: "",
  contractor_id: "",
  is_milestone: false,
  depends_on: [],
  notes: "",
  status: "scheduled",
};

// --------------- Page Component ---------------

export default function SchedulePage() {
  const supabase = useMemo(() => createClient(), []);

  // Data state
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduleTask | null>(null);
  const [form, setForm] = useState<TaskFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<ScheduleTask | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [filterWP, setFilterWP] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Export
  const [exporting, setExporting] = useState(false);

  // --------------- Fetch data ---------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, wpRes, conRes] = await Promise.all([
        supabase
          .from("schedule_tasks")
          .select("*")
          .order("start_date", { ascending: true }),
        supabase
          .from("work_packages")
          .select("*")
          .order("number", { ascending: true }),
        supabase.from("contractors").select("*").order("name"),
      ]);

      if (tasksRes.data) setTasks(tasksRes.data as ScheduleTask[]);
      if (wpRes.data) setWorkPackages(wpRes.data as WorkPackage[]);
      if (conRes.data) setContractors(conRes.data as Contractor[]);
    } catch (err) {
      console.error("Failed to fetch schedule data:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --------------- Filtered tasks ---------------

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterWP !== "all" && t.work_package_id !== filterWP) return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      return true;
    });
  }, [tasks, filterWP, filterStatus]);

  // --------------- Task CRUD ---------------

  const openAddDialog = useCallback(() => {
    setEditingTask(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((task: ScheduleTask) => {
    setEditingTask(task);
    setForm({
      name: task.name,
      work_package_id: task.work_package_id || "",
      start_date: task.start_date,
      end_date: task.end_date,
      contractor_id: task.contractor_id || "",
      is_milestone: task.is_milestone,
      depends_on: task.depends_on || [],
      notes: task.notes || "",
      status: task.status,
    });
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name || !form.start_date || !form.end_date) return;
    setSaving(true);

    try {
      const payload: Partial<ScheduleTaskInsert> & { status: ScheduleTaskStatus } = {
        name: form.name,
        work_package_id: form.work_package_id || null,
        start_date: form.start_date,
        end_date: form.end_date,
        contractor_id: form.contractor_id || null,
        is_milestone: form.is_milestone,
        depends_on: form.depends_on,
        notes: form.notes || null,
        status: form.status,
      };

      if (editingTask) {
        // Update
        const { error } = await supabase
          .from("schedule_tasks")
          .update(payload)
          .eq("id", editingTask.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from("schedule_tasks")
          .insert(payload as ScheduleTaskInsert);
        if (error) throw error;
      }

      setDialogOpen(false);
      await fetchData();
    } catch (err) {
      console.error("Failed to save task:", err);
    } finally {
      setSaving(false);
    }
  }, [form, editingTask, supabase, fetchData]);

  const handleDelete = useCallback(async () => {
    if (!deletingTask) return;
    setDeleting(true);

    try {
      const { error } = await supabase
        .from("schedule_tasks")
        .delete()
        .eq("id", deletingTask.id);
      if (error) throw error;

      setDeleteDialogOpen(false);
      setDeletingTask(null);
      await fetchData();
    } catch (err) {
      console.error("Failed to delete task:", err);
    } finally {
      setDeleting(false);
    }
  }, [deletingTask, supabase, fetchData]);

  const handleQuickStatusChange = useCallback(
    async (taskId: string, newStatus: ScheduleTaskStatus) => {
      try {
        const { error } = await supabase
          .from("schedule_tasks")
          .update({ status: newStatus })
          .eq("id", taskId);
        if (error) throw error;

        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
      } catch (err) {
        console.error("Failed to update status:", err);
      }
    },
    [supabase]
  );

  // --------------- Calendar export ---------------

  const handleExportCalendar = useCallback(async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/export/calendar");
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "renovision-schedule.ics";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Calendar export failed:", err);
    } finally {
      setExporting(false);
    }
  }, []);

  // --------------- Depends-on toggle ---------------

  const toggleDependency = useCallback(
    (taskId: string) => {
      setForm((prev) => ({
        ...prev,
        depends_on: prev.depends_on.includes(taskId)
          ? prev.depends_on.filter((id) => id !== taskId)
          : [...prev.depends_on, taskId],
      }));
    },
    []
  );

  // --------------- Lookup helpers ---------------

  const wpMap = useMemo(() => {
    const m = new Map<string, WorkPackage>();
    workPackages.forEach((wp) => m.set(wp.id, wp));
    return m;
  }, [workPackages]);

  const contractorMap = useMemo(() => {
    const m = new Map<string, Contractor>();
    contractors.forEach((c) => m.set(c.id, c));
    return m;
  }, [contractors]);

  // --------------- Render ---------------

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-44" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-lg" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Schedule &amp; Timeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} scheduled
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCalendar} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export Calendar
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <Select value={filterWP} onValueChange={setFilterWP}>
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue placeholder="Work Package" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Work Packages</SelectItem>
            {workPackages.map((wp) => (
              <SelectItem key={wp.id} value={wp.id}>
                WP{wp.number} &mdash; {wp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterWP !== "all" || filterStatus !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterWP("all");
              setFilterStatus("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {STATUS_OPTIONS.map((s) => (
          <div key={s.value} className="flex items-center gap-1.5">
            <div className={cn("w-3 h-3 rounded-sm", s.color)} />
            <span>{s.label}</span>
          </div>
        ))}
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-1.5">
          <Diamond className="h-3 w-3 text-amber-600" />
          <span>Milestone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0 border-t-2 border-dashed border-red-400" />
          <span>Today</span>
        </div>
      </div>

      {/* Gantt Chart */}
      <GanttChart
        tasks={filteredTasks}
        workPackages={workPackages}
        contractors={contractors}
        onTaskClick={openEditDialog}
      />

      {/* Task list (supplemental table below chart) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Task Details</CardTitle>
          <CardDescription>
            Click a task row in the chart or use the actions below to manage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Task</th>
                    <th className="px-3 py-2 text-left font-medium">Work Package</th>
                    <th className="px-3 py-2 text-left font-medium">Contractor</th>
                    <th className="px-3 py-2 text-left font-medium">Start</th>
                    <th className="px-3 py-2 text-left font-medium">End</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                        No tasks match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => {
                      const wp = task.work_package_id
                        ? wpMap.get(task.work_package_id)
                        : null;
                      const contractor = task.contractor_id
                        ? contractorMap.get(task.contractor_id)
                        : null;

                      return (
                        <tr key={task.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium">
                            <div className="flex items-center gap-1.5">
                              {task.is_milestone && (
                                <Diamond className="h-3 w-3 text-amber-600 flex-shrink-0" />
                              )}
                              {task.name}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {wp ? (
                              <Badge variant="outline" className="text-xs">
                                WP{wp.number}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">&mdash;</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {contractor ? contractor.name : (
                              <span className="text-muted-foreground">&mdash;</span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {formatDate(task.start_date)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {formatDate(task.end_date)}
                          </td>
                          <td className="px-3 py-2">
                            <Select
                              value={task.status}
                              onValueChange={(val) =>
                                handleQuickStatusChange(
                                  task.id,
                                  val as ScheduleTaskStatus
                                )
                              }
                            >
                              <SelectTrigger className="h-7 w-[130px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    <div className="flex items-center gap-1.5">
                                      <div
                                        className={cn(
                                          "w-2 h-2 rounded-full",
                                          s.color
                                        )}
                                      />
                                      {s.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEditDialog(task)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setDeletingTask(task);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "Edit Task" : "Add Task"}
            </DialogTitle>
            <DialogDescription>
              {editingTask
                ? "Update the task details below."
                : "Fill in the details to create a new schedule task."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="task-name">Task Name *</Label>
              <Input
                id="task-name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Install kitchen cabinets"
              />
            </div>

            {/* Work Package */}
            <div className="grid gap-2">
              <Label>Work Package</Label>
              <Select
                value={form.work_package_id || "none"}
                onValueChange={(val) =>
                  setForm((prev) => ({
                    ...prev,
                    work_package_id: val === "none" ? "" : val,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select work package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {workPackages.map((wp) => (
                    <SelectItem key={wp.id} value={wp.id}>
                      WP{wp.number} &mdash; {wp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start-date">Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, start_date: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end-date">End Date *</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, end_date: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Contractor */}
            <div className="grid gap-2">
              <Label>Contractor</Label>
              <Select
                value={form.contractor_id || "none"}
                onValueChange={(val) =>
                  setForm((prev) => ({
                    ...prev,
                    contractor_id: val === "none" ? "" : val,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contractor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {contractors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.company ? ` (${c.company})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status (only for edit) */}
            {editingTask && (
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      status: val as ScheduleTaskStatus,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", s.color)} />
                          {s.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Milestone */}
            <div className="flex items-center gap-2">
              <input
                id="is-milestone"
                type="checkbox"
                className="rounded border-input h-4 w-4 accent-primary"
                checked={form.is_milestone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, is_milestone: e.target.checked }))
                }
              />
              <Label htmlFor="is-milestone" className="cursor-pointer">
                Mark as milestone (shown as diamond on chart)
              </Label>
            </div>

            {/* Dependencies (multi-select) */}
            <div className="grid gap-2">
              <Label>Dependencies</Label>
              <p className="text-xs text-muted-foreground">
                Select tasks this one depends on. Click to toggle.
              </p>
              <div className="max-h-36 overflow-y-auto border rounded-md p-2 space-y-1">
                {tasks
                  .filter((t) => t.id !== editingTask?.id)
                  .map((t) => {
                    const isSelected = form.depends_on.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleDependency(t.id)}
                        className={cn(
                          "w-full text-left text-xs px-2 py-1.5 rounded-sm transition-colors",
                          isSelected
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-3 h-3 rounded-sm border flex items-center justify-center",
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-input"
                            )}
                          >
                            {isSelected && (
                              <svg
                                className="w-2 h-2 text-primary-foreground"
                                viewBox="0 0 12 12"
                              >
                                <path
                                  d="M10 3L4.5 8.5L2 6"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  fill="none"
                                />
                              </svg>
                            )}
                          </div>
                          {t.name}
                        </div>
                      </button>
                    );
                  })}
                {tasks.filter((t) => t.id !== editingTask?.id).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No other tasks available.
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="task-notes">Notes</Label>
              <Textarea
                id="task-notes"
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Optional notes about this task..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name || !form.start_date || !form.end_date}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTask ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingTask?.name}&rdquo;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
