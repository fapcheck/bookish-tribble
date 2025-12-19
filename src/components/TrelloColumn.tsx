import React, { useMemo, useState } from "react";
import { Coffee, Pencil, Sparkles, Trash2, Zap } from "lucide-react";
import type { Priority } from "../types/ui";

export default function TrelloColumn({
  title,
  count,
  children,
  color,
  onDelete,
  onEditName,
  priority,
  onCyclePriority,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  color: string;
  onDelete?: () => void;
  onEditName?: (newName: string) => void;
  priority?: Priority;
  onCyclePriority?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);

  const handleSave = () => {
    if (onEditName && editValue.trim() && editValue !== title) {
      onEditName(editValue);
    }
    setIsEditing(false);
  };

  const priorityIcon = useMemo(() => {
    if (priority === "high") return <Zap size={14} className="text-red-400" />;
    if (priority === "low") return <Coffee size={14} className="text-emerald-400" />;
    return <Sparkles size={14} className="text-blue-400" />;
  }, [priority]);

  return (
    <div className="bg-[#0f172a]/80 rounded-2xl border border-white/5 p-4 shadow-xl flex flex-col h-fit">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}40` }}
          />

          {isEditing ? (
            <input
              autoFocus
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white outline-none w-full"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          ) : (
            <>
              <h2 className="font-bold text-lg text-slate-200 truncate">{title}</h2>
              <span className="bg-slate-800 text-slate-500 px-2 py-0.5 rounded text-xs font-mono shrink-0">
                {count}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onCyclePriority && priority && (
            <button
              onClick={onCyclePriority}
              className="text-slate-600 hover:text-white p-1.5 hover:bg-slate-800 rounded transition-colors"
              title="Change project priority"
            >
              {priorityIcon}
            </button>
          )}

          {!isEditing && onEditName && (
            <button
              onClick={() => {
                setEditValue(title);
                setIsEditing(true);
              }}
              className="text-slate-600 hover:text-white p-1.5 hover:bg-slate-800 rounded transition-colors"
              title="Rename project"
            >
              <Pencil size={14} />
            </button>
          )}

          {onDelete && (
            <button
              onClick={onDelete}
              className="text-slate-600 hover:text-red-400 p-1.5 hover:bg-slate-800 rounded transition-colors"
              title="Delete project"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1">{children}</div>
    </div>
  );
}