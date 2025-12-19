import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Calendar, Check, Clock, Pencil, Repeat, Tag, Trash2, Zap } from "lucide-react";
import type { Priority } from "../types/ui";
import type { Task } from "../hooks/useDatabase";
import * as tauri from "../lib/tauri";

const WEEKDAYS = [
  { key: "Mon", label: "Mon", bit: 1 },
  { key: "Tue", label: "Tue", bit: 2 },
  { key: "Wed", label: "Wed", bit: 4 },
  { key: "Thu", label: "Thu", bit: 8 },
  { key: "Fri", label: "Fri", bit: 16 },
  { key: "Sat", label: "Sat", bit: 32 },
  { key: "Sun", label: "Sun", bit: 64 },
] as const;

const WEEKDAYS_MASK = 1 | 2 | 4 | 8 | 16; // Mon-Fri

function tomorrowAt9LocalMs() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}

function formatDeadlineChip(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function toDateInputValue(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function TaskCard({
  task,
  onComplete,
  onDelete,
  onEditTitle,
  onUpdatePriority,
  onUpdateDeadline,
  onUpdateTags,
  onUpdateRepeat,
  accentColor,
}: {
  task: Task;
  onComplete: () => void;
  onDelete: () => void;
  onEditTitle: (title: string) => void;
  onUpdatePriority: (p: Priority) => void;
  onUpdateDeadline: (d: number | null) => void;
  onUpdateTags: (tags: string[]) => void;
  onUpdateRepeat: (repeatMode: "daily" | "weekdays" | "custom" | null, repeatDaysMask: number | null) => void;
  accentColor?: string;
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(task.title);

  const [isEditingDate, setIsEditingDate] = useState(false);

  const [reminderOpen, setReminderOpen] = useState(false);
  
  // Refs for closing menus on outside click
  const cardRef = useRef<HTMLDivElement | null>(null);
  const reminderMenuRef = useRef<HTMLDivElement | null>(null);
  const repeatMenuRef = useRef<HTMLDivElement | null>(null);

  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagsDraft, setTagsDraft] = useState<string>("");

  const [repeatOpen, setRepeatOpen] = useState(false);
  const [repeatDraftMode, setRepeatDraftMode] = useState<"daily" | "weekdays" | "custom" | null>(
    (task.repeat_mode as any) ?? null
  );
  const [repeatDraftMask, setRepeatDraftMask] = useState<number>(
    typeof task.repeat_days_mask === "number" ? task.repeat_days_mask : WEEKDAYS_MASK
  );

  useEffect(() => {
    setRepeatDraftMode((task.repeat_mode as any) ?? null);
    setRepeatDraftMask(typeof task.repeat_days_mask === "number" ? task.repeat_days_mask : WEEKDAYS_MASK);
  }, [task.repeat_mode, task.repeat_days_mask]);

  // Handle click outside components
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      // If click is inside either menu, ignore
      if (reminderMenuRef.current?.contains(target)) return;
      if (repeatMenuRef.current?.contains(target)) return;

      // If click is inside the card but NOT inside a menu, or outside entirely, close menus
      setReminderOpen(false);
      setRepeatOpen(false);
      setIsEditingTags(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const priorityStyles: Record<Priority, string> = {
    high: "text-red-400 bg-red-950/30 border-red-900/30",
    normal: "text-blue-400 bg-blue-950/30 border-blue-900/30",
    low: "text-emerald-400 bg-emerald-950/30 border-emerald-900/30",
  };
  const pStyle = priorityStyles[(task.priority as Priority) || "normal"];

  const hasReminder = useMemo(() => !!task.remind_at, [task.remind_at]);

  const elevated = reminderOpen || isEditingTags || isEditingDate || isEditingTitle || repeatOpen;

  const handleSaveTitle = () => {
    const next = editTitleValue.trim();
    if (next && next !== task.title) onEditTitle(next);
    setIsEditingTitle(false);
  };

  const cyclePriority = () => {
    const next: Priority = task.priority === "high" ? "low" : task.priority === "normal" ? "high" : "normal";
    onUpdatePriority(next);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      onUpdateDeadline(null);
      setIsEditingDate(false);
      return;
    }
    const base = task.deadline ? new Date(task.deadline) : new Date();
    const picked = new Date(val);
    const out = new Date(picked.getFullYear(), picked.getMonth(), picked.getDate(), base.getHours() || 9, base.getMinutes() || 0, 0, 0);
    onUpdateDeadline(out.getTime());
    setIsEditingDate(false);
  };

  const openTagsEditor = () => {
    setTagsDraft((task.tags ?? []).join(", "));
    setIsEditingTags(true);
  };

  const saveTags = () => {
    const parsed = tagsDraft.split(",").map((t) => t.trim()).filter(Boolean);
    onUpdateTags(parsed);
    setIsEditingTags(false);
  };

  const setReminderAt = async (ms: number | null) => {
    try {
      await tauri.set_task_remind_at(task.id, ms);
    } finally {
      setReminderOpen(false);
    }
  };

  const snooze = async (minutes: number) => {
    try {
      await tauri.snooze_task_reminder(task.id, minutes);
    } finally {
      setReminderOpen(false);
    }
  };

  return (
    <motion.div
      ref={cardRef}
      layoutId={task.id}
      className={[
        "group bg-[#1e293b] hover:bg-[#283548] p-3 rounded-xl border border-slate-700/50 hover:border-slate-500 transition-all relative shadow-sm",
        "overflow-visible",
        elevated ? "z-50" : "z-0",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onComplete}
          className="mt-0.5 w-5 h-5 rounded-full border border-slate-500 flex items-center justify-center hover:border-emerald-400 hover:bg-emerald-500/20 transition-all shrink-0 text-slate-900"
          title="Complete"
        >
          <Check size={12} />
        </button>

        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <textarea
              autoFocus
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white outline-none w-full resize-none mb-1"
              rows={2}
              value={editTitleValue}
              onChange={(e) => setEditTitleValue(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveTitle();
                }
                if (e.key === "Escape") {
                  setIsEditingTitle(false);
                  setEditTitleValue(task.title);
                }
              }}
            />
          ) : (
            <h4 className="text-sm font-medium leading-snug mb-1.5 text-slate-200 break-words">{task.title}</h4>
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

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRepeatOpen((v) => !v);
                }}
                className={`text-xs px-2 py-1 rounded-lg border flex items-center gap-1 transition-colors ${
                  task.repeat_mode
                    ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-200"
                    : "bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-700"
                }`}
                title="Repeat settings"
              >
                <Repeat size={12} />
                {task.repeat_mode ? (task.repeat_mode === "weekdays" ? "Weekdays" : task.repeat_mode === "custom" ? "Custom" : "Daily") : "Repeat"}
              </button>

              {repeatOpen && (
                <div
                  ref={repeatMenuRef}
                  className="absolute z-[9999] mt-2 w-64 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl p-2"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="text-xs text-slate-500 px-2 py-1">Repeat</div>

                  <MenuBtn
                    label="Off"
                    onClick={() => {
                      onUpdateRepeat(null, null);
                      setRepeatOpen(false);
                    }}
                  />
                  <MenuBtn
                    label="Daily"
                    onClick={() => {
                      onUpdateRepeat("daily", null);
                      setRepeatOpen(false);
                    }}
                  />
                  <MenuBtn
                    label="Weekdays (Mon–Fri)"
                    onClick={() => {
                      onUpdateRepeat("weekdays", null);
                      setRepeatOpen(false);
                    }}
                  />
                  <MenuBtn
                    label="Custom…"
                    onClick={() => {
                      setRepeatDraftMode("custom");
                    }}
                  />

                  {repeatDraftMode === "custom" && (
                    <div className="mt-2 px-1">
                      <div className="text-[11px] text-slate-500 px-2 py-1">Select days</div>

                      <div className="grid grid-cols-7 gap-1 px-1">
                        {WEEKDAYS.map((d) => {
                          const active = (repeatDraftMask & d.bit) !== 0;
                          return (
                            <button
                              key={d.key}
                              type="button"
                              onClick={() => {
                                setRepeatDraftMask((prev) => (active ? prev & ~d.bit : prev | d.bit));
                              }}
                              className={`px-2 py-1 rounded-md text-[11px] border transition-colors ${
                                active
                                  ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-200"
                                  : "bg-slate-900/30 border-slate-800 text-slate-400 hover:bg-slate-800"
                              }`}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex justify-end gap-2 mt-2 px-1">
                        <button
                          type="button"
                          onClick={() => setRepeatOpen(false)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-slate-900/30 border border-slate-800 text-slate-300 hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const mask = repeatDraftMask;
                            if (!mask) return;
                            onUpdateRepeat("custom", mask);
                            setRepeatOpen(false);
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {task.deadline || isEditingDate ? (
              isEditingDate ? (
                <input
                  autoFocus
                  type="date"
                  defaultValue={task.deadline ? toDateInputValue(task.deadline) : undefined}
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
                    task.deadline && new Date(task.deadline) < new Date() && task.status !== "done"
                      ? "bg-red-900/20 text-red-400 border-red-900/30"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                  title="Edit deadline"
                >
                  <Calendar size={16} />
                  {task.deadline ? formatDeadlineChip(task.deadline) : ""}
                </button>
              )
            ) : null}

            {hasReminder ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setReminderOpen((v) => !v);
                }}
                className="text-xs px-2 py-1 rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 flex items-center gap-1 hover:bg-indigo-500/15 transition-colors"
                title="Edit reminder"
              >
                <Bell size={12} />
                {task.remind_at ? new Date(task.remind_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "reminder"}
              </button>
            ) : null}

            {(task.tags ?? []).map((tag, i) => (
              <button
                key={`${tag}-${i}`}
                onClick={(e) => {
                  e.stopPropagation();
                  openTagsEditor();
                }}
                className="text-xs px-2 py-1 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-400 flex items-center gap-1 hover:bg-slate-700 transition-colors"
                title="Edit tags"
              >
                <Tag size={12} /> {tag}
              </button>
            ))}

            <button
              onClick={(e) => {
                e.stopPropagation();
                openTagsEditor();
              }}
              className="text-xs px-2 py-1 rounded-lg border border-slate-700 bg-slate-800/30 text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-1"
              title="Edit tags"
            >
              <Tag size={12} /> Tags
            </button>
          </div>

          {isEditingTags && (
            <div className="mt-3 bg-slate-900/40 border border-slate-800 rounded-xl p-3" onMouseDown={(e) => e.stopPropagation()}>
              <div className="text-xs text-slate-500 mb-2">Tags (comma separated)</div>
              <input
                autoFocus
                value={tagsDraft}
                onChange={(e) => setTagsDraft(e.target.value)}
                onBlur={saveTags}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveTags();
                  }
                  if (e.key === "Escape") {
                    setIsEditingTags(false);
                    setTagsDraft((task.tags ?? []).join(", "));
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                placeholder="work, urgent, personal"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative">
          <div className="relative">
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
                ref={reminderMenuRef}
                className="absolute right-0 top-8 w-52 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl p-2 z-[9999]"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="text-xs text-slate-500 px-2 py-1">Remind</div>
                <MenuBtn onClick={() => setReminderAt(Date.now())} label="Now" />
                <MenuBtn onClick={() => snooze(10)} label="In 10 minutes" />
                <MenuBtn onClick={() => snooze(60)} label="In 1 hour" />
                <MenuBtn onClick={() => setReminderAt(tomorrowAt9LocalMs())} label="Tomorrow 09:00" />
                {task.deadline ? <MenuBtn onClick={() => setReminderAt(task.deadline ?? Date.now())} label="At deadline" /> : null}
                <div className="h-px bg-white/10 my-2" />
                <MenuBtn onClick={() => setReminderAt(null)} label="Clear reminder" danger />
              </div>
            )}
          </div>

          {!isEditingTitle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditTitleValue(task.title);
                setIsEditingTitle(true);
              }}
              className="text-slate-500 hover:text-white transition-all p-1"
              title="Edit title"
            >
              <Pencil size={14} />
            </button>
          )}

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

      {accentColor && <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full opacity-70 pointer-events-none" style={{ backgroundColor: accentColor }} />}
    </motion.div>
  );
}

function MenuBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-2 rounded-lg text-sm transition-colors ${
        danger ? "text-red-300 hover:bg-red-900/30" : "text-slate-200 hover:bg-slate-800"
      }`}
    >
      {label}
    </button>
  );
}