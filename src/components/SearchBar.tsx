import { useState } from "react";
import { Search, Filter, Calendar, AlertTriangle, Archive, X } from "lucide-react";
import type { TaskFilter } from "../lib/tauri";

export default function SearchBar({
    searchQuery,
    setSearchQuery,
    filter,
    setFilter,
}: {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    filter: TaskFilter;
    setFilter: (f: TaskFilter) => void;
}) {
    const [showFilters, setShowFilters] = useState(false);

    const filters: { id: TaskFilter; label: string; icon: React.ReactNode }[] = [
        { id: "all", label: "Все", icon: null },
        { id: "due_today", label: "Сегодня", icon: <Calendar size={14} /> },
        { id: "overdue", label: "Просрочено", icon: <AlertTriangle size={14} /> },
        { id: "archived", label: "Архив", icon: <Archive size={14} /> },
    ];

    return (
        <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                    type="text"
                    placeholder="Поиск задач..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            <div className="relative">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2.5 rounded-xl border transition-colors flex items-center gap-2 ${filter !== "all"
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-slate-900/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
                        }`}
                >
                    <Filter size={16} />
                </button>

                {showFilters && (
                    <div className="absolute right-0 top-12 w-48 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl p-2 z-50">
                        {filters.map((f) => (
                            <button
                                key={f.id}
                                onClick={() => {
                                    setFilter(f.id);
                                    setShowFilters(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${filter === f.id
                                    ? "bg-indigo-600 text-white"
                                    : "text-slate-300 hover:bg-slate-800"
                                    }`}
                            >
                                {f.icon}
                                {f.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
