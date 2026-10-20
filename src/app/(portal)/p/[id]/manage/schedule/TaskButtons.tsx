"use client";

import { useTransition } from "react";
import { setTaskStatus, deleteTask } from "../actions";
import type { TaskStatus } from "@/lib/types";

/** One-click status changes for a task row, plus delete. */
export function TaskButtons({ projectId, taskId, status }: { projectId: string; taskId: string; status: TaskStatus }) {
  const [pending, start] = useTransition();
  const set = (s: TaskStatus) => start(async () => { await setTaskStatus(projectId, taskId, s); });
  return (
    <span className="btns" style={{ gap: 4 }}>
      {status !== "in_progress" && <button type="button" className="btn ghost sm" disabled={pending} onClick={() => set("in_progress")}>Start</button>}
      {status !== "complete" && <button type="button" className="btn sm" disabled={pending} onClick={() => set("complete")}>Done</button>}
      {status !== "planned" && <button type="button" className="btn ghost sm" disabled={pending} onClick={() => set("planned")}>Reset</button>}
      <button type="button" className="btn danger sm" disabled={pending} onClick={() => { if (confirm("Delete this task?")) start(async () => { await deleteTask(projectId, taskId); }); }}>Delete</button>
    </span>
  );
}
