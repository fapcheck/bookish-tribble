import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import type { Task } from "../hooks/useDatabase";
import * as tauri from "../lib/tauri";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function startOfWeekMonday(d: Date) {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const out = new Date(d);
  out.setDate(d.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function dayKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toDateInputValue(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CalendarView({ tasks }: { tasks: Task[] }) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [onlyPending, setOnlyPending] = useState(true);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.deadline) continue;
      if (onlyPending && t.status === "done") continue;
      const d = new Date(t.deadline);
      const key = dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => (a.deadline ?? 0) - (b.deadline ?? 0));
      map.set(k, arr);
    }
    return map;
  }, [tasks, onlyPending]);

  const grid = useMemo(() => {
    const start = startOfWeekMonday(monthStart);
    const days: Date[] = [];
    const cur = new Date(start);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [monthStart]);

  const selectedKey = useMemo(
    () => dayKey(new Date(selected.getFullYear(), selected.getMonth(), selected.getDate())),
    [selected]
  );

  const selectedTasks = useMemo(() => {
    return byDay.get(selectedKey) ?? [];
  }, [byDay, selectedKey]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthSummary = useMemo(() => {
    let total = 0;
    let overdue = 0;
    const now = Date.now();
    for (const d of grid) {
      if (d < monthStart || d > monthEnd) continue;
      const key = dayKey(d);
      const arr = byDay.get(key) ?? [];
      total += arr.length;
      overdue += arr.filter((t) => (t.deadline ?? 0) < now && t.status !== "done").length;
    }
    return { total, overdue };
  }, [byDay, grid, monthStart, monthEnd]);

  const setReminderAtDeadline = async (task: Task) => {
    if (!task.deadline) return;
    try {
      await tauri.set_task_remind_at(task.id, task.deadline);
    } catch (e) {
      console.error(e);
      alert("Failed to set reminder.");
    }
  };

  const clearReminder = async (task: Task) => {
    try {
      await tauri.set_task_remind_at(task.id, null);
    } catch (e) {
      console.error(e);
      alert("Failed to clear reminder.");
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0f172a]/80 rounded-2xl border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="min-w-0">
              <div className="text-white font-bold">
                {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {monthSummary.total} deadlines • {monthSummary.overdue} overdue
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 flex items-center gap-2 bg-slate-900/40 border border-slate-800 rounded-xl px-3 py-2">
                <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
                Hide completed
              </label>
              <button onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-2 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-white transition-colors">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-2 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-white transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 md:gap-2 text-[10px] md:text-xs text-slate-500 mb-2 md:mb-3">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (<div key={d} className="text-center">{d}</div>))}
          </div>
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {grid.map((d) => {
              const inMonth = d >= monthStart && d <= monthEnd;
              const key = dayKey(d);
              const dayTasks = byDay.get(key) ?? [];
              const count = dayTasks.length;
              const isSel = sameDay(d, selected);
              const isToday = sameDay(d, today);
              const hasOverdue = dayTasks.some((t) => (t.deadline ?? 0) < Date.now() && t.status !== "done");
              return (
                <button key={key} onClick={() => setSelected(d)} className={["rounded-lg md:rounded-xl border p-1 md:p-2 text-left h-16 md:h-[92px] transition-colors flex flex-col justify-between", inMonth ? "bg-slate-900/40 border-slate-800 hover:bg-slate-900/70" : "bg-transparent border-transparent opacity-50", isSel ? "ring-1 md:ring-2 ring-indigo-500/50" : ""].join(" ")}>
                  <div className="flex items-center justify-between w-full">
                    <div className={["text-xs md:text-sm font-semibold", isToday ? "text-indigo-300" : inMonth ? "text-slate-200" : "text-slate-600"].join(" ")}>{d.getDate()}</div>
                    {count > 0 && (
                      <div className={["text-[9px] md:text-[10px] px-1 md:px-2 py-0.5 rounded-full border", hasOverdue ? "bg-red-500/10 border-red-500/20 text-red-300" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"].join(" ")}>{count}</div>
                    )}
                  </div>
                  {count > 0 && (
                    <div className="hidden md:block mt-1 space-y-1">
                      {dayTasks.slice(0, 2).map((t) => (<div key={t.id} className="text-[11px] text-slate-400 truncate">{t.title}</div>))}
                      {count > 2 && (<div className="text-[10px] text-slate-500">+{count - 2} more</div>)}
                    </div>
                  )}
                  {count > 0 && (
                    <div className="md:hidden flex gap-0.5 mt-auto">
                      {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                        <div key={i} className={`w-1 h-1 rounded-full ${hasOverdue ? "bg-red-400" : "bg-indigo-400"}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="bg-[#0f172a]/80 rounded-2xl border border-white/5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-white font-bold">{selected.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
              <div className="text-xs text-slate-500 mt-1">Deadlines: {selectedTasks.length}</div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {selectedTasks.length === 0 ? (<div className="text-sm text-slate-500">No deadlines.</div>) : (
              selectedTasks.map((t) => {
                const overdue = (t.deadline ?? 0) < Date.now() && t.status !== "done";
                return (
                  <div key={t.id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm text-white font-semibold truncate">{t.title}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span className={["inline-flex items-center gap-1", overdue ? "text-red-300" : "text-slate-400"].join(" ")}>
                            <Clock size={12} />{t.deadline ? new Date(t.deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button onClick={() => setReminderAtDeadline(t)} disabled={!t.deadline} className={`px-3 py-2 rounded-xl text-xs border ${t.deadline ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-200" : "bg-slate-900/40 text-slate-600 cursor-not-allowed"}`}>Remind</button>
                      <button onClick={() => clearReminder(t)} className="px-3 py-2 rounded-xl text-xs border bg-slate-900/40 border-slate-800 text-slate-300">Clear</button>
                      <input type="date" defaultValue={t.deadline ? toDateInputValue(t.deadline) : toDateInputValue(selected.getTime())} onChange={(e) => {
                        const val = e.target.value; if (!val) return;
                        const d = new Date(val); const current = t.deadline ? new Date(t.deadline) : new Date(selected);
                        const out = new Date(d.getFullYear(), d.getMonth(), d.getDate(), current.getHours() || 9, current.getMinutes() || 0, 0, 0);
                        tauri.update_task_deadline(t.id, out.getTime());
                      }} className="ml-auto bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}