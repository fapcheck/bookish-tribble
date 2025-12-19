import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock, CheckCircle2, CalendarDays, Flame, Trophy } from "lucide-react";
import type { UserStats } from "../hooks/useDatabase";
import * as tauri from "../lib/tauri";

function minutesToHuman(mins: number) {
  if (!Number.isFinite(mins) || mins <= 0) return "0 min";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function parseDay(day: string) {
  // "YYYY-MM-DD" -> local Date at midnight
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

function formatDay(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfWeekMonday(d: Date) {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // Mon=0..Sun=6
  const out = new Date(d);
  out.setDate(d.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function colorClass(count: number) {
  if (count <= 0) return "bg-slate-900/50 border-slate-800";
  if (count === 1) return "bg-emerald-950/40 border-emerald-900/30";
  if (count <= 3) return "bg-emerald-900/50 border-emerald-700/30";
  if (count <= 6) return "bg-emerald-700/60 border-emerald-500/40";
  return "bg-emerald-500/70 border-emerald-300/50";
}

export default function StatsView({ stats, onBack }: { stats: UserStats; onBack: () => void }) {
  const [series, setSeries] = useState<tauri.CompletionDay[]>([]);
  const [daysRange, setDaysRange] = useState(90);

  useEffect(() => {
    tauri
      .get_completion_series(daysRange)
      .then(setSeries)
      .catch((e) => console.error("get_completion_series failed:", e));
  }, [daysRange]);

  const map = useMemo(() => {
    const m = new Map<string, number>();
    for (const item of series) m.set(item.day, item.count);
    return m;
  }, [series]);

  const cells = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(today);
    start.setDate(today.getDate() - (daysRange - 1));

    // align to Monday so we can render weeks as columns
    const gridStart = startOfWeekMonday(start);

    const out: { day: string; date: Date; count: number }[] = [];
    const cur = new Date(gridStart);

    // render full weeks covering the range
    const end = new Date(today);
    end.setDate(today.getDate() + ((7 - ((today.getDay() + 6) % 7) - 1) % 7)); // pad to end-of-week-ish
    // simpler: just render weeks for daysRange + up to 6 padding
    const totalDays = daysRange + 6;

    for (let i = 0; i < totalDays; i++) {
      const day = formatDay(cur);
      const count = map.get(day) ?? 0;
      out.push({ day, date: new Date(cur), count });
      cur.setDate(cur.getDate() + 1);
    }

    return out;
  }, [map, daysRange]);

  // layout: 7 rows (Mon..Sun), N cols (weeks)
  const weeks = useMemo(() => {
    const cols: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
    return cols;
  }, [cells]);

  return (
    <div className="min-h-screen text-slate-200 font-sans flex flex-col h-screen overflow-hidden bg-[#020617]">
      <header className="px-6 py-4 flex justify-between items-center bg-[#020617]/90 backdrop-blur-xl border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold text-white">Stats</h1>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={daysRange}
            onChange={(e) => setDaysRange(Number(e.target.value))}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
            title="Range"
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 180 days</option>
          </select>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card icon={<CheckCircle2 size={18} className="text-emerald-300" />} title="Completed (total)" value={String(stats.completed_tasks)} />
            <Card icon={<Clock size={18} className="text-sky-300" />} title="Focus time (total)" value={minutesToHuman(stats.total_focus_time)} />
            <Card icon={<CalendarDays size={18} className="text-indigo-300" />} title="Completed today" value={String(stats.completed_today)} />
            <Card icon={<CalendarDays size={18} className="text-indigo-300" />} title="Completed last 7 days" value={String(stats.completed_week)} />
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card icon={<Flame size={18} className="text-orange-300" />} title="Current streak (days)" value={String(stats.current_streak)} />
            <Card icon={<Trophy size={18} className="text-amber-300" />} title="Best streak (days)" value={String(stats.best_streak)} />
          </section>

          <section className="bg-[#0f172a]/80 rounded-2xl border border-white/5 p-5">
            <h2 className="text-white font-bold mb-4">Completion heatmap</h2>

            <div className="overflow-x-auto">
              <div className="inline-flex gap-1">
                {weeks.map((col, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    {col.map((c) => {
                      // hide cells outside selected range (padding before the start)
                      const inRange = c.date >= parseDay(formatDay(new Date(Date.now() - (daysRange - 1) * 86400000)));
                      return (
                        <div
                          key={c.day}
                          title={`${c.day}: ${c.count} completed`}
                          className={`w-3.5 h-3.5 rounded border ${inRange ? colorClass(c.count) : "bg-transparent border-transparent"}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
              <span>Less</span>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 4, 8].map((n) => (
                  <div key={n} className={`w-3.5 h-3.5 rounded border ${colorClass(n)}`} />
                ))}
              </div>
              <span>More</span>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Card({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="bg-[#0f172a]/80 rounded-2xl border border-white/5 p-5">
      <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
        {icon}
        <span>{title}</span>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}