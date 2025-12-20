import React, { useMemo, useState } from "react";
import { BarChart3, ClipboardList, Cloud, Download, RefreshCw, RotateCcw, Save, Upload } from "lucide-react";
import type { AppSettings } from "../hooks/useDatabase";
import type { View } from "../types/ui";
import * as sync from "../lib/supabase";

function clampInt(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(v)));
}

export default function SettingsView({
  settings,
  onSave,
  setView,
  tasks,
  projects,
  onImport,
}: {
  settings: AppSettings;
  onSave: (s: AppSettings) => Promise<void>;
  setView: (v: View) => void;
  tasks?: unknown[];
  projects?: unknown[];
  onImport?: (data: { projects: unknown[]; tasks: unknown[]; settings: unknown }) => Promise<void>;
}) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('focusflow_last_sync'));

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(settings), [draft, settings]);

  const setNum =
    (key: keyof AppSettings, min: number, max: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const n = Number(e.target.value);
      setDraft((prev) => ({ ...prev, [key]: clampInt(Number.isFinite(n) ? n : min, min, max) } as AppSettings));
    };

  const setBool = (key: keyof AppSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft((prev) => ({ ...prev, [key]: e.target.checked } as AppSettings));
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave(draft);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setDraft({
      pomodoro_length: 25,
      short_break_length: 5,
      long_break_length: 15,
      pomodoros_until_long_break: 4,
      sound_enabled: true,
      auto_start_breaks: false,
      auto_start_pomodoros: false,
      global_shortcuts_enabled: true,
      start_minimized: false,
      close_to_tray: true,
      reminder_lead_minutes: 30,
    });
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-white">Settings</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
              title="Reset to defaults"
            >
              <RotateCcw size={18} />
            </button>

            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${!isDirty || isSaving ? "bg-slate-800/50 text-slate-500 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 text-white"
                }`}
              title="Save"
            >
              <Save size={16} />
              Save
            </button>
          </div>
        </div>

        {/* Quick Access Section */}
        <section className="bg-[#0f172a]/80 rounded-2xl border border-white/5 p-5">
          <h2 className="text-white font-bold mb-4">Дополнительно</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setView("review")}
              className="flex-1 flex items-center gap-3 bg-slate-900/50 border border-slate-700 hover:border-slate-500 rounded-xl px-4 py-3 text-slate-300 hover:text-white transition-colors"
            >
              <ClipboardList size={20} className="text-indigo-400" />
              <div className="text-left">
                <div className="font-medium">Обзор</div>
                <div className="text-xs text-slate-500">Еженедельный отчёт</div>
              </div>
            </button>
            <button
              onClick={() => setView("stats")}
              className="flex-1 flex items-center gap-3 bg-slate-900/50 border border-slate-700 hover:border-slate-500 rounded-xl px-4 py-3 text-slate-300 hover:text-white transition-colors"
            >
              <BarChart3 size={20} className="text-emerald-400" />
              <div className="text-left">
                <div className="font-medium">Статистика</div>
                <div className="text-xs text-slate-500">Прогресс и достижения</div>
              </div>
            </button>
          </div>
        </section>

        {/* Cloud Sync Section */}
        <section className="bg-[#0f172a]/80 rounded-2xl border border-white/5 p-5">
          <h2 className="text-white font-bold mb-4 flex items-center gap-2">
            <Cloud size={20} className="text-sky-400" />
            Cloud Sync
          </h2>

          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Sync your data across all devices. Push your data to cloud or pull from another device.
            </p>

            {syncStatus && (
              <div className={`text-sm px-3 py-2 rounded-lg ${syncStatus.includes('Error') ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                {syncStatus}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  if (!tasks || !projects) return;
                  setIsSyncing(true);
                  setSyncStatus(null);
                  try {
                    await sync.syncToCloud({ projects, tasks, settings });
                    const now = new Date().toLocaleString('ru-RU');
                    localStorage.setItem('focusflow_last_sync', now);
                    setLastSync(now);
                    setSyncStatus('✓ Данные загружены в облако');
                  } catch (e) {
                    setSyncStatus(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
                  } finally {
                    setIsSyncing(false);
                  }
                }}
                disabled={isSyncing || !tasks || !projects}
                className="flex-1 flex items-center justify-center gap-2 bg-sky-600/20 hover:bg-sky-600/30 disabled:opacity-50 text-sky-400 py-3 rounded-xl transition-colors"
              >
                <Upload size={18} />
                {isSyncing ? 'Загрузка...' : 'Push to Cloud'}
              </button>

              <button
                onClick={async () => {
                  if (!onImport) return;
                  setIsSyncing(true);
                  setSyncStatus(null);
                  try {
                    const data = await sync.pullLatestSync();
                    if (data) {
                      await onImport({
                        projects: data.projects,
                        tasks: data.tasks,
                        settings: data.settings,
                      });
                      const now = new Date().toLocaleString('ru-RU');
                      localStorage.setItem('focusflow_last_sync', now);
                      setLastSync(now);
                      setSyncStatus('✓ Данные загружены с облака');
                    } else {
                      setSyncStatus('No data in cloud yet. Push first!');
                    }
                  } catch (e) {
                    setSyncStatus(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
                  } finally {
                    setIsSyncing(false);
                  }
                }}
                disabled={isSyncing || !onImport}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 disabled:opacity-50 text-indigo-400 py-3 rounded-xl transition-colors"
              >
                <Download size={18} />
                {isSyncing ? 'Загрузка...' : 'Pull from Cloud'}
              </button>
            </div>

            {lastSync && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <RefreshCw size={12} />
                Последняя синхронизация: {lastSync}
              </div>
            )}
          </div>
        </section>

        <section className="bg-[#0f172a]/80 rounded-2xl border border-white/5 p-5">
          <h2 className="text-white font-bold mb-4">Timer</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-2">
              <div className="text-sm text-slate-400">Pomodoro length (minutes)</div>
              <input
                type="number"
                min={5}
                max={180}
                value={draft.pomodoro_length}
                onChange={setNum("pomodoro_length", 5, 180)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
              />
            </label>

            <label className="space-y-2">
              <div className="text-sm text-slate-400">Short break (minutes)</div>
              <input
                type="number"
                min={1}
                max={60}
                value={draft.short_break_length}
                onChange={setNum("short_break_length", 1, 60)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
              />
            </label>

            <label className="space-y-2">
              <div className="text-sm text-slate-400">Long break (minutes)</div>
              <input
                type="number"
                min={1}
                max={180}
                value={draft.long_break_length}
                onChange={setNum("long_break_length", 1, 180)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
              />
            </label>

            <label className="space-y-2">
              <div className="text-sm text-slate-400">Pomodoros until long break</div>
              <input
                type="number"
                min={1}
                max={12}
                value={draft.pomodoros_until_long_break}
                onChange={setNum("pomodoros_until_long_break", 1, 12)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
              />
            </label>
          </div>
        </section>

        <section className="bg-[#0f172a]/80 rounded-2xl border border-white/5 p-5">
          <h2 className="text-white font-bold mb-4">Reminders</h2>

          <label className="space-y-2 block">
            <div className="text-sm text-slate-400">Default reminder lead time (minutes before deadline)</div>
            <input
              type="number"
              min={0}
              max={24 * 60}
              value={draft.reminder_lead_minutes}
              onChange={setNum("reminder_lead_minutes", 0, 24 * 60)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
            />
            <div className="text-xs text-slate-500">
              When you set a deadline, the app schedules a reminder at $deadline - leadTime$ (clamped to “now” if already past).
            </div>
          </label>
        </section>

        <section className="bg-[#0f172a]/80 rounded-2xl border border-white/5 p-5">
          <h2 className="text-white font-bold mb-4">Behavior</h2>

          <div className="space-y-3">
            <ToggleRow label="Sound enabled" checked={draft.sound_enabled} onChange={setBool("sound_enabled")} />
            <ToggleRow label="Auto start breaks" checked={draft.auto_start_breaks} onChange={setBool("auto_start_breaks")} />
            <ToggleRow label="Auto start pomodoros" checked={draft.auto_start_pomodoros} onChange={setBool("auto_start_pomodoros")} />
            <ToggleRow label="Global shortcuts enabled" checked={draft.global_shortcuts_enabled} onChange={setBool("global_shortcuts_enabled")} />
            <ToggleRow label="Start minimized" checked={draft.start_minimized} onChange={setBool("start_minimized")} />
            <ToggleRow label="Close to tray" checked={draft.close_to_tray} onChange={setBool("close_to_tray")} />
          </div>
        </section>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-3">
      <div className="text-sm text-slate-200">{label}</div>
      <input type="checkbox" checked={checked} onChange={onChange} className="h-5 w-5" />
    </label>
  );
}