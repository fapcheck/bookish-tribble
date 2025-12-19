import React from "react";
import { BarChart3, Calendar, ClipboardList, ListChecks, Settings } from "lucide-react";
import type { View } from "../types/ui";
import ExportBackupButton from "./ExportBackupButton";
import ImportBackupButton from "./ImportBackupButton";

export default function TopTabs({
  view,
  setView,
}: {
  view: View;
  setView: (v: View) => void;
}) {
  // Focus is a special full-screen mode; don't show tabs there.
  if (view === "focus") return null;

  return (
    <header className="px-6 py-4 flex justify-between items-center bg-[#020617]/90 backdrop-blur-xl border-b border-white/5 shrink-0 z-50">
      <div className="flex items-center gap-2">
        <TabButton
          active={view === "main"}
          onClick={() => setView("main")}
          icon={<ListChecks size={18} />}
          label="Задачи"
        />
        <TabButton
          active={view === "calendar"}
          onClick={() => setView("calendar")}
          icon={<Calendar size={18} />}
          label="Календарь"
        />
        <TabButton
          active={view === "review"}
          onClick={() => setView("review")}
          icon={<ClipboardList size={18} />}
          label="Обзор"
        />
        <TabButton
          active={view === "stats"}
          onClick={() => setView("stats")}
          icon={<BarChart3 size={18} />}
          label="Статистика"
        />
        <TabButton
          active={view === "settings"}
          onClick={() => setView("settings")}
          icon={<Settings size={18} />}
          label="Настройки"
        />
      </div>

      <div className="flex items-center gap-1">
        <ImportBackupButton />
        <ExportBackupButton />
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
      className={`px-3 py-2 rounded-xl border transition-colors flex items-center gap-2 text-sm font-medium ${active
        ? "bg-slate-800 border-slate-600 text-white"
        : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        }`}
    >
      {icon}
      {label}
    </button>
  );
}