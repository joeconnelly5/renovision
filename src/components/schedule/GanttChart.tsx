"use client";

import React, { useMemo, useRef, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatDate } from "@/lib/utils/format";
import type {
  ScheduleTask,
  WorkPackage,
  Contractor,
  ScheduleTaskStatus,
} from "@/types";

// --------------- Constants ---------------

const DAY_WIDTH = 3; // pixels per day
const ROW_HEIGHT = 40; // pixels per task row
const HEADER_HEIGHT = 52; // month labels + day ticks
const LABEL_COL_WIDTH = 260; // fixed left column

const STATUS_COLORS: Record<ScheduleTaskStatus, string> = {
  scheduled: "bg-blue-500",
  in_progress: "bg-orange-500",
  delayed: "bg-red-500",
  complete: "bg-green-500",
};

const STATUS_BORDER_COLORS: Record<ScheduleTaskStatus, string> = {
  scheduled: "border-blue-600",
  in_progress: "border-orange-600",
  delayed: "border-red-600",
  complete: "border-green-600",
};

const STATUS_LABEL: Record<ScheduleTaskStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  delayed: "Delayed",
  complete: "Complete",
};

// --------------- Helpers ---------------

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function getMonthLabel(d: Date): string {
  return d.toLocaleDateString("en-CA", { month: "short", year: "numeric" });
}

// --------------- Props ---------------

interface GanttChartProps {
  tasks: ScheduleTask[];
  workPackages: WorkPackage[];
  contractors: Contractor[];
  onTaskClick?: (task: ScheduleTask) => void;
}

// --------------- Component ---------------

export default function GanttChart({
  tasks,
  workPackages,
  contractors,
  onTaskClick,
}: GanttChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  // Build lookup maps
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

  // Compute timeline range
  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    if (tasks.length === 0) {
      const today = startOfDay(new Date());
      return {
        timelineStart: addDays(today, -7),
        timelineEnd: addDays(today, 60),
        totalDays: 67,
      };
    }

    let earliest = new Date(tasks[0].start_date);
    let latest = new Date(tasks[0].end_date);

    tasks.forEach((t) => {
      const s = new Date(t.start_date);
      const e = new Date(t.end_date);
      if (s < earliest) earliest = s;
      if (e > latest) latest = e;
    });

    const start = startOfDay(addDays(earliest, -7));
    const end = startOfDay(addDays(latest, 7));
    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: daysBetween(start, end),
    };
  }, [tasks]);

  // Generate month spans for header
  const monthSpans = useMemo(() => {
    const spans: { label: string; startDay: number; days: number }[] = [];
    let cursor = new Date(timelineStart);

    while (cursor <= timelineEnd) {
      const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);

      const spanStart = cursor < timelineStart ? timelineStart : cursor;
      const spanEnd = monthEnd > timelineEnd ? timelineEnd : monthEnd;

      const startDay = daysBetween(timelineStart, spanStart);
      const days = daysBetween(spanStart, spanEnd) + 1;

      spans.push({
        label: getMonthLabel(spanStart),
        startDay,
        days: Math.min(days, totalDays - startDay),
      });

      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    return spans;
  }, [timelineStart, timelineEnd, totalDays]);

  // Generate day tick marks (every 7th day)
  const dayTicks = useMemo(() => {
    const ticks: { day: number; label: string }[] = [];
    for (let i = 0; i <= totalDays; i += 7) {
      const d = addDays(timelineStart, i);
      ticks.push({ day: i, label: d.getDate().toString() });
    }
    return ticks;
  }, [timelineStart, totalDays]);

  // Today line position
  const todayOffset = useMemo(() => {
    const today = startOfDay(new Date());
    const offset = daysBetween(timelineStart, today);
    if (offset < 0 || offset > totalDays) return null;
    return offset;
  }, [timelineStart, totalDays]);

  // Build a task index map for dependency arrows
  const taskIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    tasks.forEach((t, i) => m.set(t.id, i));
    return m;
  }, [tasks]);

  // Compute bar positions for each task
  const taskBars = useMemo(() => {
    return tasks.map((t) => {
      const startOffset = daysBetween(
        timelineStart,
        startOfDay(new Date(t.start_date))
      );
      const duration = daysBetween(
        startOfDay(new Date(t.start_date)),
        startOfDay(new Date(t.end_date))
      );
      return {
        task: t,
        left: startOffset * DAY_WIDTH,
        width: Math.max(duration * DAY_WIDTH, DAY_WIDTH),
      };
    });
  }, [tasks, timelineStart]);

  // Compute dependency arrows
  const dependencyArrows = useMemo(() => {
    const arrows: {
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }[] = [];

    tasks.forEach((task, targetIdx) => {
      if (!task.depends_on || task.depends_on.length === 0) return;

      task.depends_on.forEach((depId) => {
        const sourceIdx = taskIndexMap.get(depId);
        if (sourceIdx === undefined) return;

        const sourceTask = tasks[sourceIdx];
        const sourceEnd =
          daysBetween(
            timelineStart,
            startOfDay(new Date(sourceTask.end_date))
          ) * DAY_WIDTH;
        const targetStart =
          daysBetween(
            timelineStart,
            startOfDay(new Date(task.start_date))
          ) * DAY_WIDTH;

        arrows.push({
          id: `${depId}-${task.id}`,
          x1: sourceEnd,
          y1: sourceIdx * ROW_HEIGHT + ROW_HEIGHT / 2,
          x2: targetStart,
          y2: targetIdx * ROW_HEIGHT + ROW_HEIGHT / 2,
        });
      });
    });

    return arrows;
  }, [tasks, taskIndexMap, timelineStart]);

  const chartWidth = totalDays * DAY_WIDTH;
  const chartHeight = tasks.length * ROW_HEIGHT;

  const handleTaskClick = useCallback(
    (task: ScheduleTask) => {
      onTaskClick?.(task);
    },
    [onTaskClick]
  );

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground border rounded-lg">
        No tasks scheduled yet. Add a task to see the Gantt chart.
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="border rounded-lg overflow-hidden bg-background">
        {/* Outer container: labels + scrollable chart */}
        <div className="flex">
          {/* Fixed left column: task labels */}
          <div
            className="flex-shrink-0 border-r bg-background z-10"
            style={{ width: LABEL_COL_WIDTH }}
          >
            {/* Header placeholder for labels column */}
            <div
              className="border-b bg-muted/50 px-3 flex items-end pb-1"
              style={{ height: HEADER_HEIGHT }}
            >
              <span className="text-xs font-medium text-muted-foreground">
                Task
              </span>
            </div>

            {/* Task label rows */}
            {tasks.map((task) => {
              const wp = task.work_package_id
                ? wpMap.get(task.work_package_id)
                : null;
              const contractor = task.contractor_id
                ? contractorMap.get(task.contractor_id)
                : null;

              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-2 px-3 border-b cursor-pointer hover:bg-muted/30 transition-colors",
                    hoveredTaskId === task.id && "bg-muted/30"
                  )}
                  style={{ height: ROW_HEIGHT }}
                  onClick={() => handleTaskClick(task)}
                  onMouseEnter={() => setHoveredTaskId(task.id)}
                  onMouseLeave={() => setHoveredTaskId(null)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate max-w-[120px]">
                        {task.name}
                      </span>
                      {task.is_milestone && (
                        <span className="text-[10px] text-amber-600 font-bold">
                          &#9670;
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {wp && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 h-3.5 leading-none"
                        >
                          WP{wp.number}
                        </Badge>
                      )}
                      {contractor && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                          {contractor.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      "text-[9px] px-1.5 py-0 h-4 leading-none text-white border-0 flex-shrink-0",
                      STATUS_COLORS[task.status]
                    )}
                  >
                    {STATUS_LABEL[task.status]}
                  </Badge>
                </div>
              );
            })}
          </div>

          {/* Scrollable chart area */}
          <div className="flex-1 overflow-x-auto" ref={scrollRef}>
            <div style={{ width: chartWidth, minWidth: "100%" }}>
              {/* Header: month labels + day ticks */}
              <div
                className="border-b bg-muted/50 relative"
                style={{ height: HEADER_HEIGHT }}
              >
                {/* Month labels */}
                <div className="flex h-7 border-b border-border/50">
                  {monthSpans.map((span) => (
                    <div
                      key={span.label + span.startDay}
                      className="border-r border-border/30 flex items-center justify-center text-[10px] font-medium text-muted-foreground"
                      style={{
                        position: "absolute",
                        left: span.startDay * DAY_WIDTH,
                        width: span.days * DAY_WIDTH,
                        height: 28,
                      }}
                    >
                      {span.days * DAY_WIDTH > 40 ? span.label : ""}
                    </div>
                  ))}
                </div>

                {/* Day ticks */}
                <div className="relative" style={{ height: 24 }}>
                  {dayTicks.map((tick) => (
                    <div
                      key={tick.day}
                      className="absolute flex flex-col items-center"
                      style={{ left: tick.day * DAY_WIDTH }}
                    >
                      <div className="w-px h-2 bg-border" />
                      <span className="text-[9px] text-muted-foreground mt-0.5">
                        {tick.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart body */}
              <div className="relative" style={{ height: chartHeight }}>
                {/* Row backgrounds with alternating stripes */}
                {tasks.map((task, idx) => (
                  <div
                    key={`row-bg-${task.id}`}
                    className={cn(
                      "absolute w-full border-b",
                      idx % 2 === 1 ? "bg-muted/20" : "",
                      hoveredTaskId === task.id && "bg-muted/30"
                    )}
                    style={{
                      top: idx * ROW_HEIGHT,
                      height: ROW_HEIGHT,
                    }}
                    onMouseEnter={() => setHoveredTaskId(task.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                  />
                ))}

                {/* Today line */}
                {todayOffset !== null && (
                  <div
                    className="absolute top-0 w-px border-l-2 border-dashed border-red-400 z-20 pointer-events-none"
                    style={{
                      left: todayOffset * DAY_WIDTH,
                      height: chartHeight,
                    }}
                  >
                    <div className="absolute -top-0 -left-[14px] text-[8px] bg-red-400 text-white px-1 rounded-b">
                      Today
                    </div>
                  </div>
                )}

                {/* SVG overlay for dependency arrows */}
                <svg
                  className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
                  style={{ width: chartWidth, height: chartHeight }}
                >
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="8"
                      markerHeight="6"
                      refX="8"
                      refY="3"
                      orient="auto"
                    >
                      <polygon
                        points="0 0, 8 3, 0 6"
                        fill="currentColor"
                        className="text-muted-foreground/60"
                      />
                    </marker>
                  </defs>
                  {dependencyArrows.map((arrow) => {
                    // Route: go right from source end, then down/up, then right to target start
                    const midX = (arrow.x1 + arrow.x2) / 2;
                    return (
                      <path
                        key={arrow.id}
                        d={`M ${arrow.x1} ${arrow.y1} C ${midX} ${arrow.y1}, ${midX} ${arrow.y2}, ${arrow.x2} ${arrow.y2}`}
                        fill="none"
                        stroke="currentColor"
                        className="text-muted-foreground/40"
                        strokeWidth={1.5}
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  })}
                </svg>

                {/* Task bars / milestone diamonds */}
                {taskBars.map(({ task, left, width }, idx) => {
                  const wp = task.work_package_id
                    ? wpMap.get(task.work_package_id)
                    : null;
                  const contractor = task.contractor_id
                    ? contractorMap.get(task.contractor_id)
                    : null;

                  const topOffset = idx * ROW_HEIGHT + (ROW_HEIGHT - 16) / 2;

                  if (task.is_milestone) {
                    // Diamond marker for milestones
                    return (
                      <Tooltip key={task.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "absolute z-10 cursor-pointer transition-transform hover:scale-125",
                              STATUS_COLORS[task.status]
                            )}
                            style={{
                              left: left - 6,
                              top: idx * ROW_HEIGHT + (ROW_HEIGHT - 12) / 2,
                              width: 12,
                              height: 12,
                              transform: "rotate(45deg)",
                              borderRadius: 2,
                            }}
                            onClick={() => handleTaskClick(task)}
                            onMouseEnter={() => setHoveredTaskId(task.id)}
                            onMouseLeave={() => setHoveredTaskId(null)}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <TaskTooltipContent
                            task={task}
                            wp={wp}
                            contractor={contractor}
                          />
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  // Regular bar
                  return (
                    <Tooltip key={task.id}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute z-10 rounded-sm cursor-pointer transition-all hover:brightness-110 hover:shadow-sm border",
                            STATUS_COLORS[task.status],
                            STATUS_BORDER_COLORS[task.status]
                          )}
                          style={{
                            left,
                            top: topOffset,
                            width: Math.max(width, 4),
                            height: 16,
                          }}
                          onClick={() => handleTaskClick(task)}
                          onMouseEnter={() => setHoveredTaskId(task.id)}
                          onMouseLeave={() => setHoveredTaskId(null)}
                        >
                          {width > 50 && (
                            <span className="text-[8px] text-white px-1 truncate block leading-[16px]">
                              {task.name}
                            </span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <TaskTooltipContent
                          task={task}
                          wp={wp}
                          contractor={contractor}
                        />
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// --------------- Tooltip Inner Content ---------------

function TaskTooltipContent({
  task,
  wp,
  contractor,
}: {
  task: ScheduleTask;
  wp: WorkPackage | null | undefined;
  contractor: Contractor | null | undefined;
}) {
  return (
    <div className="space-y-1 text-xs">
      <p className="font-semibold text-sm">{task.name}</p>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Status:</span>
        <Badge
          className={cn(
            "text-[9px] px-1.5 py-0 h-4 text-white border-0",
            STATUS_COLORS[task.status]
          )}
        >
          {STATUS_LABEL[task.status]}
        </Badge>
      </div>
      <p>
        <span className="text-muted-foreground">Dates:</span>{" "}
        {formatDate(task.start_date)} &mdash; {formatDate(task.end_date)}
      </p>
      {wp && (
        <p>
          <span className="text-muted-foreground">Work Package:</span> WP
          {wp.number} &mdash; {wp.name}
        </p>
      )}
      {contractor && (
        <p>
          <span className="text-muted-foreground">Contractor:</span>{" "}
          {contractor.name}
          {contractor.company ? ` (${contractor.company})` : ""}
        </p>
      )}
      {task.is_milestone && (
        <p className="text-amber-600 font-medium">&#9670; Milestone</p>
      )}
      {task.notes && (
        <p className="text-muted-foreground italic mt-1">{task.notes}</p>
      )}
    </div>
  );
}
