import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Bell, Check, X } from "lucide-react";
import * as tauri from "../lib/tauri";

type ReminderPayload = {
  task_id: string;
  title: string;
  deadline?: number | null;
};

export default function ReminderToast({
  onDoneTask,
}: {
  onDoneTask: (taskId: string) => Promise<void> | void;
}) {
  const [queue, setQueue] = useState<ReminderPayload[]>([]);
  const current = queue[0];

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    (async () => {
      unlisten = await listen<ReminderPayload>("reminder:due", (event) => {
        setQueue((prev) => [...prev, event.payload]);
      });
    })();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  if (!current) return null;

  const close = () => setQueue((prev) => prev.slice(1));

  const snooze = async () => {
    try {
      await tauri.snooze_task_reminder(current.task_id, 10);
    } finally {
      close();
    }
  };

  const done = async () => {
    try {
      await onDoneTask(current.task_id);
    } finally {
      close();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] w-[360px]">
      <div className="bg-[#0f172a]/95 border border-white/10 rounded-2xl shadow-2xl p-4 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
              <Bell size={18} className="text-indigo-300" />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-slate-400">Reminder</div>
              <div className="text-white font-semibold truncate">{current.title}</div>
              {current.deadline ? (
                <div className="text-xs text-slate-500 mt-1">
                  Deadline: {new Date(current.deadline).toLocaleString()}
                </div>
              ) : null}
            </div>
          </div>

          <button onClick={close} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={snooze}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 transition-colors text-sm"
          >
            Snooze 10m
          </button>
          <button
            onClick={done}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors text-sm flex items-center gap-2"
          >
            <Check size={16} /> Done
          </button>
        </div>
      </div>
    </div>
  );
}