import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Task } from "../hooks/useDatabase";

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

export default function CalendarView({ tasks }: { tasks: Task[] }) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.deadline || t.status === "done") continue;
      const d = new Date(t.deadline);
      const key = dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [tasks]);

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

  const formatDeadline = (deadline: number) => {
    const d = new Date(deadline);
    const now = new Date();
    if (sameDay(d, now)) return "Today";
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (sameDay(d, tomorrow)) return "Tomorrow";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="h-full overflow-y-auto bg-[#1c1c1e]">
      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Month Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              {cursor.toLocaleString(undefined, { month: "long" })}
            </h2>
            <span className="text-sm text-slate-500">{cursor.getFullYear()}</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 text-xs text-slate-500 mb-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-center py-1">{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-6">
          {grid.map((d) => {
            const inMonth = d >= monthStart && d <= monthEnd;
            const key = dayKey(d);
            const dayTasks = byDay.get(key) ?? [];
            const count = dayTasks.length;
            const isSel = sameDay(d, selected);
            const isToday = sameDay(d, today);

            return (
              <button
                key={key}
                onClick={() => setSelected(d)}
                className={`
                  aspect-square rounded-xl flex flex-col items-center justify-center transition-all
                  ${inMonth ? "text-white" : "text-slate-600"}
                  ${isSel ? "bg-[#007AFF] text-white" : isToday ? "bg-white/10" : "hover:bg-white/5"}
                `}
              >
                <span className={`text-sm font-medium ${isToday && !isSel ? "text-[#007AFF]" : ""}`}>
                  {d.getDate()}
                </span>
                {count > 0 && (
                  <div className={`w-1 h-1 rounded-full mt-0.5 ${isSel ? "bg-white" : "bg-[#007AFF]"}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Day Tasks */}
        <div className="border-t border-white/5 pt-4">
          <h3 className="text-sm font-medium text-slate-400 mb-3">
            {selected.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </h3>

          {selectedTasks.length === 0 ? (
            <p className="text-slate-600 text-sm py-8 text-center">No tasks</p>
          ) : (
            <div className="space-y-2">
              {selectedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0"
                >
                  <div className="w-5 h-5 rounded-full border-2 border-slate-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] text-white truncate">{task.title}</p>
                    {task.deadline && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatDeadline(task.deadline)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
