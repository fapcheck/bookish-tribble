import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Calendar, Check, SkipForward, Tag } from "lucide-react";
import type { Task } from "../hooks/useDatabase";
import * as tauri from "../lib/tauri";

function msToClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function FocusView({
  queue,
  onBack,
  onCompleteTask,
}: {
  queue: Task[];
  onBack: () => void;
  onCompleteTask: (id: string) => void | Promise<void>;
}) {
  const [skippedIds, setSkippedIds] = useState<string[]>([]);

  const currentTask = useMemo(() => queue.find((t) => !skippedIds.includes(t.id)), [queue, skippedIds]);

  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Start a focus session for the current task
  useEffect(() => {
    let timer: number | null = null;
    let cancelled = false;

    const start = async () => {
      if (!currentTask) return;

      // If we already have a session for this task, do nothing
      if (sessionIdRef.current) return;

      const sid = await tauri.start_focus_session(currentTask.id);
      if (cancelled) return;

      sessionIdRef.current = sid;
      startedAtRef.current = Date.now();
      setElapsedMs(0);

      timer = window.setInterval(() => {
        if (startedAtRef.current) setElapsedMs(Date.now() - startedAtRef.current);
      }, 250);
    };

    start().catch((e) => console.error("start_focus_session failed:", e));

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [currentTask?.id]); // start when task changes

  // When we skip/reset to a new task, cancel previous session cleanly
  const cancelCurrentSession = async () => {
    const sid = sessionIdRef.current;
    const startedAt = startedAtRef.current;
    if (!sid || !startedAt) return;

    const durationMinutes = Math.max(0, Math.round((Date.now() - startedAt) / 60000));
    sessionIdRef.current = null;
    startedAtRef.current = null;
    setElapsedMs(0);

    await tauri.cancel_focus_session(sid, durationMinutes);
  };

  const completeCurrentSession = async () => {
    const sid = sessionIdRef.current;
    const startedAt = startedAtRef.current;
    if (!sid || !startedAt) return;

    const durationMinutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    sessionIdRef.current = null;
    startedAtRef.current = null;

    await tauri.complete_focus_session(sid, durationMinutes);
  };

  useEffect(() => {
    // If we skipped everything but queue still has tasks, reset skips
    if (!currentTask && queue.length > 0 && skippedIds.length > 0) {
      setSkippedIds([]);
    }
  }, [currentTask, queue.length, skippedIds.length]);

  const handleSkip = async () => {
    if (!currentTask) return;
    try {
      await cancelCurrentSession();
    } catch (e) {
      console.error("cancel_focus_session failed:", e);
    }
    setSkippedIds((prev) => [...prev, currentTask.id]);
  };

  const handleBack = async () => {
    try {
      await cancelCurrentSession();
    } catch (e) {
      console.error("cancel_focus_session failed:", e);
    }
    onBack();
  };

  const handleDone = async () => {
    if (!currentTask) return;
    try {
      await completeCurrentSession();
    } catch (e) {
      console.error("complete_focus_session failed:", e);
    }
    await onCompleteTask(currentTask.id);
  };

  if (queue.length === 0) {
    return (
      <div className="absolute inset-0 z-50 bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
        <div className="text-3xl font-bold text-white mb-2">Всё готово!</div>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
        >
          Вернуться
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 bg-[#020617] flex flex-col items-center justify-center p-6">
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center">
        <button
          onClick={handleBack}
          className="p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-white transition-colors border border-white/5"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="text-slate-500 font-mono text-sm">
          Осталось: <span className="text-white font-bold">{queue.length}</span>
        </div>
      </div>

      {currentTask && (
        <div className="w-full max-w-xl text-center">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-6 border border-indigo-500/20">
              В ФОКУСЕ • {msToClock(elapsedMs)}
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">
              {currentTask.title}
            </h2>

            <div className="flex items-center justify-center gap-3">
              {currentTask.deadline && (
                <div className="flex items-center gap-2 text-red-400 font-mono text-sm bg-red-950/30 px-3 py-1 rounded-full">
                  <Calendar size={14} /> {new Date(currentTask.deadline).toLocaleDateString()}
                </div>
              )}
              {currentTask.tags && currentTask.tags.length > 0 && (
                <div className="flex items-center gap-2 text-slate-400 font-mono text-sm bg-slate-800 px-3 py-1 rounded-full">
                  <Tag size={14} /> {currentTask.tags.join(", ")}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 justify-center items-center">
            <button
              onClick={handleSkip}
              className="px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all font-medium flex items-center gap-2"
            >
              <SkipForward size={20} /> Пропустить
            </button>

            <button
              onClick={handleDone}
              className="px-10 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all font-bold text-lg flex items-center gap-2"
            >
              <Check size={24} strokeWidth={3} /> Готово
            </button>
          </div>
        </div>
      )}
    </div>
  );
}