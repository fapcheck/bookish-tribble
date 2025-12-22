import React from "react";
import { Calendar, Flame, ListChecks, Settings, StickyNote, Wallet } from "lucide-react";
import type { View } from "../types/ui";
import ExportBackupButton from "./ExportBackupButton";
import ImportBackupButton from "./ImportBackupButton";

export default function TopTabs({
  view,
  setView,
  streak = 0,
}: {
  view: View;
  setView: (v: View) => void;
  streak?: number;
}) {
  // Focus is a special full-screen mode; don't show tabs there.
  if (view === "focus") return null;

  return (
    <header className="hidden md:flex px-4 md:px-6 py-3 md:py-4 justify-between items-center bg-[#020617]/90 backdrop-blur-xl border-b border-white/5 shrink-0 z-50 gap-4">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mask-linear-fade flex-1">
        <TabButton
          active={view === "main"}
          onClick={() => setView("main")}
          icon={<ListChecks size={20} />}
          label="Задачи"
        />
        <TabButton
          active={view === "calendar"}
          onClick={() => setView("calendar")}
          icon={<Calendar size={20} />}
          label="Календарь"
        />
        <TabButton
          active={view === "notes"}
          onClick={() => setView("notes")}
          icon={<StickyNote size={20} />}
          label="Заметки"
        />
        <TabButton
          active={view === "wallet"}
          onClick={() => setView("wallet")}
          icon={<Wallet size={20} />}
          label="Финансы"
        />
        <TabButton
          active={view === "settings"}
          onClick={() => setView("settings")}
          icon={<Settings size={20} />}
          label="Настройки"
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Streak Flame Indicator */}
        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 rounded-xl">
            <Flame size={18} className="text-orange-400 animate-flame" />
            <span className="text-sm font-bold text-orange-300">{streak}</span>
            <span className="text-xs text-orange-400/70 hidden md:inline">день</span>
          </div>
        )}

        <div className="hidden md:flex items-center gap-1">
          <ImportBackupButton />
          <ExportBackupButton />
        </div>
      </div>
    </header>
  );
}

function TabButton({
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
      className={`px-3 md:px-4 py-2 md:py-2.5 rounded-xl border transition-all flex items-center gap-2 text-sm font-medium shrink-0 ${active
        ? "bg-slate-800 border-slate-600 text-white shadow-sm shadow-slate-900/50"
        : "bg-slate-900/50 border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        }`}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
      {/* On mobile, standard size is larger for touch targets, but we hide label */}
    </button>
  );
}