import { useEffect, useState } from "react";
import { CalendarCheck, TrendingUp, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import * as tauri from "../lib/tauri";
import type { Task, UserStats } from "../lib/tauri";

function getWeekRange(offset: number = 0) {
    const now = new Date();
    const day = now.getDay();
    const diff = (day + 6) % 7; // Monday = 0

    const monday = new Date(now);
    monday.setDate(now.getDate() - diff + offset * 7);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { start: monday, end: sunday };
}

function formatWeekRange(start: Date, end: Date) {
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    return `${start.toLocaleDateString("ru-RU", opts)} — ${end.toLocaleDateString("ru-RU", opts)}`;
}

function getDayName(date: Date): string {
    return date.toLocaleDateString("ru-RU", { weekday: "short" });
}

export default function WeeklyReviewView() {
    const [weekOffset, setWeekOffset] = useState(0);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);

    const { start, end } = getWeekRange(weekOffset);
    const isCurrentWeek = weekOffset === 0;

    useEffect(() => {
        tauri.get_stats().then(setStats).catch(console.error);
        tauri.get_tasks({}).then(setTasks).catch(console.error);
    }, [weekOffset]);

    // Filter tasks completed in the selected week
    const weekTasks = tasks.filter((t) => {
        if (!t.completed_at) return false;
        const completedDate = new Date(t.completed_at);
        return completedDate >= start && completedDate <= end;
    });

    // Group by day
    const groupedByDay: Record<string, Task[]> = {};
    for (const task of weekTasks) {
        const day = new Date(task.completed_at!).toISOString().split("T")[0];
        if (!groupedByDay[day]) groupedByDay[day] = [];
        groupedByDay[day].push(task);
    }

    const sortedDays = Object.keys(groupedByDay).sort();

    // Tasks due next week
    const nextWeek = getWeekRange(weekOffset + 1);
    const upcomingTasks = tasks.filter((t) => {
        if (t.status === "done" || !t.deadline) return false;
        const deadline = new Date(t.deadline);
        return deadline >= nextWeek.start && deadline <= nextWeek.end;
    });

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-bold text-white">Недельный обзор</h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setWeekOffset((w) => w - 1)}
                            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-sm text-slate-300 min-w-[160px] text-center">
                            {formatWeekRange(start, end)}
                        </span>
                        <button
                            onClick={() => setWeekOffset((w) => w + 1)}
                            disabled={isCurrentWeek}
                            className={`p-2 rounded-lg transition-colors ${isCurrentWeek
                                ? "text-slate-600 cursor-not-allowed"
                                : "hover:bg-slate-800 text-slate-400 hover:text-white"
                                }`}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card
                        icon={<CalendarCheck size={18} className="text-emerald-400" />}
                        title="Выполнено"
                        value={weekTasks.length.toString()}
                        subtitle="задач за неделю"
                    />
                    <Card
                        icon={<Clock size={18} className="text-indigo-400" />}
                        title="Фокус время"
                        value={stats ? `${Math.round(stats.total_focus_time / 60)}ч` : "0ч"}
                        subtitle="всего"
                    />
                    <Card
                        icon={<TrendingUp size={18} className="text-amber-400" />}
                        title="Streak"
                        value={stats?.current_streak.toString() ?? "0"}
                        subtitle="дней подряд"
                    />
                </div>

                {/* Daily breakdown */}
                <section className="bg-[#0f172a]/80 rounded-2xl border border-white/5 p-5">
                    <h2 className="text-white font-bold mb-4">По дням</h2>
                    {sortedDays.length === 0 ? (
                        <p className="text-slate-500 text-sm">Нет выполненных задач за эту неделю</p>
                    ) : (
                        <div className="space-y-4">
                            {sortedDays.map((day) => (
                                <div key={day}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-slate-300">
                                            {getDayName(new Date(day))}{" "}
                                            {new Date(day).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                                        </span>
                                        <span className="text-xs text-slate-500">{groupedByDay[day].length} задач</span>
                                    </div>
                                    <div className="space-y-1 pl-4 border-l border-slate-700">
                                        {groupedByDay[day].map((task) => (
                                            <div key={task.id} className="text-sm text-slate-400 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                {task.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Upcoming next week */}
                {isCurrentWeek && upcomingTasks.length > 0 && (
                    <section className="bg-[#0f172a]/80 rounded-2xl border border-white/5 p-5">
                        <h2 className="text-white font-bold mb-4">На следующей неделе</h2>
                        <div className="space-y-2">
                            {upcomingTasks.slice(0, 10).map((task) => (
                                <div
                                    key={task.id}
                                    className="flex items-center justify-between py-2 px-3 bg-slate-900/50 rounded-lg"
                                >
                                    <span className="text-sm text-slate-300">{task.title}</span>
                                    {task.deadline && (
                                        <span className="text-xs text-slate-500">
                                            {new Date(task.deadline).toLocaleDateString("ru-RU", {
                                                weekday: "short",
                                                day: "numeric",
                                            })}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

function Card({
    icon,
    title,
    value,
    subtitle,
}: {
    icon: React.ReactNode;
    title: string;
    value: string;
    subtitle: string;
}) {
    return (
        <div className="bg-[#0f172a]/80 rounded-2xl border border-white/5 p-5">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                {icon}
                <span>{title}</span>
            </div>
            <div className="text-3xl font-bold text-white">{value}</div>
            <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
        </div>
    );
}
