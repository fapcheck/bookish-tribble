import { Calendar, Coffee, Plus, Sparkles, Tag, Zap } from "lucide-react";
import type { Priority } from "../lib/tauri";

export default function AddTaskForm({
  projectId,
  accentColor,
  isActive,
  onOpen,
  onClose,
  onSubmit,
  title,
  setTitle,
  priority,
  setPriority,
  deadline,
  setDeadline,
  tags,
  setTags,
}: {
  projectId: string;
  accentColor?: string;
  isActive: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent, projectId: string | null) => void | Promise<void>;
  title: string;
  setTitle: (v: string) => void;
  priority: Priority;
  setPriority: (p: Priority) => void;
  deadline: string;
  setDeadline: (v: string) => void;
  tags: string;
  setTags: (v: string) => void;
}) {
  if (!isActive) {
    return (
      <div className="mt-3 pt-2 border-t border-white/5">
        <button
          onClick={onOpen}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm w-full transition-colors py-1.5 px-2 rounded-lg hover:bg-white/5"
        >
          <Plus size={16} /> Добавить задачу
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 bg-[#020617]/50 rounded-xl border border-slate-700/50 animate-in fade-in slide-in-from-top-1">
      <form onSubmit={(e) => onSubmit(e, projectId === "inbox" ? null : projectId)}>
        <input
          autoFocus
          className="w-full bg-[#1e293b] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none border border-slate-700 focus:border-slate-500 transition-colors mb-3"
          style={accentColor ? { borderColor: `${accentColor}40` } : {}}
          placeholder="Что нужно сделать?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-[#1e293b] rounded-md p-0.5 border border-slate-700">
              {(["low", "normal", "high"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`p-1.5 rounded ${priority === p ? "bg-slate-600 text-white" : "text-slate-500 hover:text-slate-300"
                    }`}
                >
                  {p === "high" ? (
                    <Zap size={14} className="text-red-400" />
                  ) : p === "normal" ? (
                    <Sparkles size={14} className="text-blue-400" />
                  ) : (
                    <Coffee size={14} className="text-emerald-400" />
                  )}
                </button>
              ))}
            </div>

            <div className="relative group">
              <input
                type="date"
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                onChange={(e) => setDeadline(e.target.value)}
              />
              <div
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${deadline
                    ? "bg-slate-700 border-slate-600 text-white"
                    : "bg-[#1e293b] border-slate-700 text-slate-500 hover:text-slate-300"
                  }`}
              >
                <Calendar size={14} />
                {deadline && <span className="text-[10px]">{new Date(deadline).toLocaleDateString()}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#1e293b] px-2 py-1.5 rounded-md border border-slate-700 flex-1 min-w-[100px]">
              <Tag size={14} className="text-slate-500 shrink-0" />
              <input
                className="bg-transparent outline-none text-xs text-white placeholder-slate-600 w-full"
                placeholder="Теги..."
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-white/5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-white transition-colors px-3 py-1.5"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="text-xs px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors shadow-lg shadow-indigo-500/20"
            >
              Сохранить
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}