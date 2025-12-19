import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import * as tauri from "../lib/tauri";
import type { Subtask } from "../lib/tauri";

export default function SubtaskList({
    taskId,
    subtasks,
    onUpdate,
}: {
    taskId: string;
    subtasks: Subtask[];
    onUpdate: () => void;
}) {
    const [newTitle, setNewTitle] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    const completedCount = subtasks.filter((s) => s.completed).length;
    const totalCount = subtasks.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const handleAdd = async () => {
        if (!newTitle.trim()) return;
        try {
            await tauri.add_subtask(taskId, newTitle.trim());
            setNewTitle("");
            setIsAdding(false);
            onUpdate();
        } catch (e) {
            console.error("Failed to add subtask:", e);
        }
    };

    const handleToggle = async (id: string) => {
        try {
            await tauri.toggle_subtask(id);
            onUpdate();
        } catch (e) {
            console.error("Failed to toggle subtask:", e);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await tauri.delete_subtask(id);
            onUpdate();
        } catch (e) {
            console.error("Failed to delete subtask:", e);
        }
    };

    if (subtasks.length === 0 && !isAdding) {
        return (
            <button
                onClick={() => setIsAdding(true)}
                className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 mt-2"
            >
                <Plus size={12} /> Добавить подзадачи
            </button>
        );
    }

    return (
        <div className="mt-3 space-y-2">
            {/* Progress bar */}
            {totalCount > 0 && (
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-xs text-slate-500">
                        {completedCount}/{totalCount}
                    </span>
                </div>
            )}

            {/* Subtask list */}
            <div className="space-y-1">
                {subtasks.map((subtask) => (
                    <div
                        key={subtask.id}
                        className="group flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                    >
                        <button
                            onClick={() => handleToggle(subtask.id)}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${subtask.completed
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "border-slate-500 hover:border-emerald-400"
                                }`}
                        >
                            {subtask.completed && <Check size={10} />}
                        </button>
                        <span
                            className={`flex-1 text-xs ${subtask.completed ? "text-slate-500 line-through" : "text-slate-300"
                                }`}
                        >
                            {subtask.title}
                        </span>
                        <button
                            onClick={() => handleDelete(subtask.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Add subtask input */}
            {isAdding ? (
                <div className="flex items-center gap-2">
                    <input
                        autoFocus
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleAdd();
                            if (e.key === "Escape") {
                                setIsAdding(false);
                                setNewTitle("");
                            }
                        }}
                        placeholder="Новая подзадача..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                    />
                    <button
                        onClick={handleAdd}
                        className="text-xs px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                        Добавить
                    </button>
                    <button
                        onClick={() => {
                            setIsAdding(false);
                            setNewTitle("");
                        }}
                        className="text-xs text-slate-500 hover:text-white px-2 py-1"
                    >
                        Отмена
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setIsAdding(true)}
                    className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                >
                    <Plus size={12} /> Добавить подзадачу
                </button>
            )}
        </div>
    );
}
