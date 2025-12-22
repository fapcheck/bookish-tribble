import React from "react";
import { Calendar, ListChecks, Settings, StickyNote, Wallet } from "lucide-react";
import type { View } from "../types/ui";

export default function BottomNav({
    view,
    setView,
}: {
    view: View;
    setView: (v: View) => void;
}) {
    // Focus is a special full-screen mode; don't show tabs there.
    if (view === "focus") return null;

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#020617]/90 backdrop-blur-xl border-t border-white/5 pb-safe pb-6 pt-2 px-6 flex justify-between items-center z-50">
            <NavButton
                active={view === "main"}
                onClick={() => setView("main")}
                icon={<ListChecks size={24} />}
                label="Задачи"
            />
            <NavButton
                active={view === "calendar"}
                onClick={() => setView("calendar")}
                icon={<Calendar size={24} />}
                label="Календарь"
            />
            <NavButton
                active={view === "notes"}
                onClick={() => setView("notes")}
                icon={<StickyNote size={24} />}
                label="Заметки"
            />
            <NavButton
                active={view === "wallet"}
                onClick={() => setView("wallet")}
                icon={<Wallet size={24} />}
                label="Финансы"
            />
            <NavButton
                active={view === "settings"}
                onClick={() => setView("settings")}
                icon={<Settings size={24} />}
                label="Настройки"
            />
        </nav>
    );
}

function NavButton({
    active,
    onClick,
    icon,
    label,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-1 transition-colors ${active ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
                }`}
        >
            {icon}
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    );
}
