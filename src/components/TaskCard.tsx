import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Archive, Bell, Calendar, Check, Clock, Pencil, Tag, Trash2, Zap } from "lucide-react";
import type { Priority } from "../lib/tauri";
import type { Task } from "../hooks/useDatabase";
import type { Subtask } from "../lib/tauri";
import * as tauri from "../lib/tauri";
import SubtaskList from "./SubtaskList";
import { ConfettiBurst } from "./Confetti";

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
  onArchive,
  accentColor,
}: {
  task: Task;
  onComplete: () => void;
  onDelete: () => void;
  onEditTitle: (title: string) => void;
  onUpdatePriority: (p: Priority) => void;
  onUpdateDeadline: (d: number | null) => void;
  onUpdateTags: (tags: string[]) => void;
  onArchive: () => void;
  accentColor?: string;
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(task.title);

  const [isEditingDate, setIsEditingDate] = useState(false);

  const [reminderOpen, setReminderOpen] = useState(false);
  const reminderMenuRef = useRef<HTMLDivElement | null>(null);

  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagsDraft, setTagsDraft] = useState<string>("");

  const [cardRefEl, setCardRefEl] = useState<HTMLDivElement | null>(null);

  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtasksVersion, setSubtasksVersion] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

  const priorityStyles: Record<Priority, string> = {
    high: "text-red-400 bg-red-950/30 border-red-900/30",
    normal: "text-blue-400 bg-blue-950/30 border-blue-900/30",
    low: "text-emerald-400 bg-emerald-950/30 border-emerald-900/30",
  };
  const pStyle = priorityStyles[(task.priority as Priority) || "normal"];

  const hasReminder = useMemo(() => !!task.remind_at, [task.remind_at]);

  const elevated = reminderOpen || isEditingTags || isEditingDate || isEditingTitle;

  // Fetch subtasks with cleanup to prevent memory leaks
  useEffect(() => {
    let mounted = true;
    tauri.get_subtasks(task.id)
      .then((data) => {
        if (mounted) setSubtasks(data);
      })
      .catch(console.error);
    return () => { mounted = false; };
  }, [task.id, subtasksVersion]);

  const refreshSubtasks = () => setSubtasksVersion((v) => v + 1);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      if (reminderMenuRef.current?.contains(target)) return;

      if (cardRefEl?.contains(target)) {
        setReminderOpen(false);
        return;
      }

      setReminderOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [cardRefEl]);

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
    const out = new Date(
      picked.getFullYear(),
      picked.getMonth(),
      picked.getDate(),
      base.getHours() || 9,
      base.getMinutes() || 0,
      0,
      0
    );

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
      ref={setCardRefEl as any}
      layout
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeOut" } }}
      className={[
        "group relative transition-all duration-200",
        // Desktop: keep card look but cleaner
        "md:bg-[#1e293b] md:hover:bg-[#283548] md:p-3 md:rounded-xl md:border md:border-slate-700/50 md:shadow-sm",
        // Mobile: minimal list item look
        "py-3 border-b border-white/5 last:border-0",
        elevated ? "z-50" : "z-0",
        celebrating ? "animate-success-flash" : "",
      ].join(" ")}
      style={{ overflow: "visible" }}
    >
      <ConfettiBurst active={celebrating} />
      <div className="flex items-start gap-3" style={{ overflow: "visible" }}>
        {/* Checkbox - Simple circle on mobile, fire on desktop */}
        <div className="relative" style={{ overflow: "visible" }}>
          <motion.button
            onClick={() => {
              if (celebrating) return;
              setCelebrating(true);
              setTimeout(() => {
                onComplete();
              }, 900);
              setTimeout(() => setCelebrating(false), 1000);
            }}
            className="relative w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0"
            style={{
              borderColor: celebrating ? "#007AFF" : "#64748b",
              backgroundColor: celebrating ? "#007AFF" : "transparent",
              overflow: "visible",
            }}
            whileHover={{ scale: 1.1, borderColor: "#007AFF" }}
            whileTap={{ scale: 0.85 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            title="Complete"
          >
            {/* Checkmark on complete */}
            <AnimatePresence>
              {celebrating && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-white"
                >
                  <Check size={14} strokeWidth={3} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
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
            <h4 className="text-[15px] font-medium leading-snug mb-1 text-white break-words">{task.title}</h4>
          )}

          {/* Mobile: Minimal deadline tag only */}
          <div className="md:hidden flex items-center gap-2 mt-1">
            {task.deadline && (
              <span
                className="text-xs font-medium"
                style={{
                  color:
                    new Date(task.deadline) < new Date() && task.status !== "done"
                      ? "#EF4444"
                      : new Date(task.deadline).toDateString() === new Date().toDateString()
                        ? "#EF4444"
                        : "#94A3B8",
                }}
              >
                {formatDeadlineChip(task.deadline)}
              </span>
            )}
            {accentColor && (
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
            )}
          </div>

          {/* Desktop: Full buttons/tags */}
          <div className="hidden md:flex flex-wrap gap-2 items-center mt-2">
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
                  className={`text-sm px-3 py-1.5 rounded-lg border flex items-center gap-2 hover:bg-slate-700 cursor-pointer transition-all ${task.deadline && new Date(task.deadline) < new Date() && task.status !== "done"
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

            {/* Reminder chip */}
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
                {task.remind_at
                  ? new Date(task.remind_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "reminder"}
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setReminderOpen(true);
                }}
                className="text-xs px-2 py-1 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-400 flex items-center gap-1 hover:bg-slate-700 transition-colors"
                title="Add reminder"
              >
                <Bell size={12} /> Remind
              </button>
            )}

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
            <div className="mt-3 bg-slate-900/40 border border-slate-800 rounded-xl p-3">
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

          {/* Subtasks */}
          <SubtaskList taskId={task.id} subtasks={subtasks} onUpdate={refreshSubtasks} />
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
              onArchive();
            }}
            className="text-slate-500 hover:text-amber-400 transition-all p-1"
            title="Архивировать"
          >
            <Archive size={14} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm("Удалить задачу? Это действие нельзя отменить.")) {
                onDelete();
              }
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
          className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full opacity-70 pointer-events-none md:block hidden"
          style={{ backgroundColor: accentColor }}
        />
      )}
    </motion.div>
  );
}

function MenuBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-2 rounded-lg text-sm transition-colors ${danger ? "text-red-300 hover:bg-red-900/30" : "text-slate-200 hover:bg-slate-800"
        }`}
    >
      {label}
    </button>
  );
}