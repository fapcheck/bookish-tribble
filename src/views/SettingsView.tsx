import React, { useMemo, useState } from "react";
import { ArrowLeft, Save, RotateCcw } from "lucide-react";
import type { AppSettings } from "../hooks/useDatabase";

function clampInt(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(v)));
}

export default function SettingsView({
  settings,
  onBack,
  onSave,
}: {
  settings: AppSettings;
  onBack: () => void;
  onSave: (s: AppSettings) => Promise<void>;
}) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);

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
          <h1 className="text-lg font-bold text-white">Settings</h1>
        </div>

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
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              !isDirty || isSaving
                ? "bg-slate-800/50 text-slate-500 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
            title="Save"
          >
            <Save size={16} />
            Save
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
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
      </main>
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