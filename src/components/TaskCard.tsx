import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Calendar, Check, Clock, Pencil, Tag, Trash2, Zap } from "lucide-react";
import type { Priority } from "../types/ui";
import type { Task } from "../hooks/useDatabase";
import * as tauri from "../lib/tauri";

function addMinutes(ms: number, minutes: number) {
  return ms + minutes * 60_000;
}

function tomorrowAt9LocalMs() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}

export default function TaskCard({
  task,
  onComplete,
  onDelete,
  onEditTitle,
  onUpdatePriority,
  onUpdateDeadline,
  accentColor,
}: {
  task: Task;
  onComplete: () => void;
  onDelete: () => void;
  onEditTitle: (title: string) => void;
  onUpdatePriority: (p: Priority) => void;
  onUpdateDeadline: (d: number | null) => void;
  accentColor?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const [isEditingDate, setIsEditingDate] = useState(false);

  const [reminderOpen, setReminderOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const priorityStyles: Record<Priority, string> = {
    high: "text-red-400 bg-red-950/30 border-red-900/30",
    normal: "text-blue-400 bg-blue-950/30 border-blue-900/30",
    low: "text-emerald-400 bg-emerald-950/30 border-emerald-900/30",
  };

  const pStyle = priorityStyles[(task.priority as Priority) || "normal"];

  const hasReminder = useMemo(() => !!task.remind_at, [task.remind_at]);

  const handleSave = () => {
    if (editValue.trim() && editValue !== task.title) {
      onEditTitle(editValue);
    }
    setIsEditing(false);
  };

  const cyclePriority = () => {
    const next: Priority =
      task.priority === "high" ? "low" : task.priority === "normal" ? "high" : "normal";
    onUpdatePriority(next);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onUpdateDeadline(val ? new Date(val).getTime() : null);
    setIsEditingDate(false);
  };

  const setReminderAt = async (ms: number | null) => {
    try {
      await tauri.set_task_remind_at(task.id, ms);
    } catch (e) {
      console.error("set_task_remind_at failed:", e);
      alert("Failed to set reminder. See console.");
    } finally {
      setReminderOpen(false);
    }
  };

  const snooze = async (minutes: number) => {
    try {
      await tauri.snooze_task_reminder(task.id, minutes);
    } catch (e) {
      console.error("snooze_task_reminder failed:", e);
      alert("Failed to snooze. See console.");
    } finally {
      setReminderOpen(false);
    }
  };

  return (
    <motion.div
      layoutId={task.id}
      className="group bg-[#1e293b] hover:bg-[#283548] p-3 rounded-xl border border-slate-700/50 hover:border-slate-500 transition-all relative overflow-hidden shadow-sm"
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onComplete}
          className="mt-0.5 w-5 h-5 rounded-full border border-slate-500 flex items-center justify-center hover:border-emerald-400 hover:bg-emerald-500/20 transition-all shrink-0 text-slate-900"
        >
          <Check size={12} />
        </button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <textarea
              autoFocus
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white outline-none w-full resize-none mb-1"
              rows={2}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
          ) : (
            <h4 className="text-sm font-medium leading-snug mb-1.5 text-slate-200 break-words">
              {task.title}
            </h4>
          )}

          <div className="flex flex-wrap gap-2 items-center mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                cyclePriority();
              }}
              className={`text-sm px-3 py-1.5 rounded-lg border ${pStyle} font-medium flex items-center gap-2 hover:brightness-110 cursor-pointer transition-all`}
              title="Cycle task priority"
            >
              {task.priority === "high" && <Zap size={16} />}
              {task.priority === "high" ? "High" : task.priority === "normal" ? "Normal" : "Low"}
            </button>

            {task.deadline || isEditingDate ? (
              isEditingDate ? (
                <input
                  autoFocus
                  type="date"
                  className="text-sm bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white outline-none"
                  onBlur={() => setIsEditingDate(false)}
                  onChange={handleDateChange}
                />
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingDate(true);
                  }}
                  className={`text-sm px-3 py-1.5 rounded-lg border flex items-center gap-2 hover:bg-slate-700 cursor-pointer transition-all ${
                    task.deadline && new Date(task.deadline) < new Date()
                      ? "bg-red-900/20 text-red-400 border-red-900/30"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                  title="Edit deadline"
                >
                  <Calendar size={16} />
                  {task.deadline
                    ? new Date(task.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                    : ""}
                </button>
              )
            ) : null}

            {hasReminder ? (
              <span className="text-xs px-2 py-1 rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 flex items-center gap-1">
                <Bell size={12} />
                {task.remind_at ? new Date(task.remind_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "reminder"}
              </span>
            ) : null}

            {task.tags?.map((tag, i) => (
              <span
                key={`${tag}-${i}`}
                className="text-xs px-2 py-1 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-400 flex items-center gap-1"
              >
                <Tag size={12} /> {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative">
          {/* Reminder menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setReminderOpen((v) => !v);
              }}
              className="text-slate-500 hover:text-white transition-all p-1"
              title="Reminder"
            >
              <Bell size={14} className={hasReminder ? "text-indigo-300" : ""} />
            </button>

            {reminderOpen && (
              <div
                className="absolute right-0 top-8 w-48 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl p-2 z-50"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="text-xs text-slate-500 px-2 py-1">Remind</div>

                <MenuBtn onClick={() => setReminderAt(Date.now())} label="Now" />
                <MenuBtn onClick={() => snooze(10)} label="In 10 minutes" />
                <MenuBtn onClick={() => snooze(60)} label="In 1 hour" />
                <MenuBtn onClick={() => setReminderAt(tomorrowAt9LocalMs())} label="Tomorrow 09:00" />

                {task.deadline ? (
                  <MenuBtn
                    onClick={() => {
                      // remind at deadline time
                      setReminderAt(task.deadline ?? Date.now());
                    }}
                    label="At deadline"
                  />
                ) : null}

                <div className="h-px bg-white/10 my-2" />

                <MenuBtn
                  onClick={() => setReminderAt(null)}
                  label="Clear reminder"
                  danger
                />
              </div>
            )}
          </div>

          {!isEditing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditValue(task.title);
                setIsEditing(true);
              }}
              className="text-slate-500 hover:text-white transition-all p-1"
              title="Edit title"
            >
              <Pencil size={14} />
            </button>
          )}

          {!task.deadline && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingDate(true);
              }}
              className="text-slate-500 hover:text-white transition-all p-1"
              title="Set deadline"
            >
              <Clock size={14} />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-slate-500 hover:text-red-400 transition-all p-1"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {accentColor && (
        <div
          className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full opacity-70"
          style={{ backgroundColor: accentColor }}
        />
      )}
    </motion.div>
  );
}

function MenuBtn({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-2 rounded-lg text-sm transition-colors ${
        danger
          ? "text-red-300 hover:bg-red-900/30"
          : "text-slate-200 hover:bg-slate-800"
      }`}
    >
      {label}
    </button>
  );
}