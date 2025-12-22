import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Tag, Zap, X } from "lucide-react";
import type { Priority } from "../lib/tauri";
import { parseNaturalLanguage } from "../utils/naturalLanguage";

export default function MobileAddTaskModal({
    isOpen,
    onClose,
    onAdd,
}: {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (
        title: string,
        priority: Priority,
        deadline?: number,
        tags?: string[]
    ) => Promise<unknown>;
}) {
    const [title, setTitle] = useState("");
    const [priority, setPriority] = useState<Priority>("normal");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        const parsed = parseNaturalLanguage(title);
        await onAdd(
            parsed.cleanTitle,
            parsed.priority || priority,
            parsed.deadline,
            parsed.tags
        );

        setTitle("");
        setPriority("normal");
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-[#0f172a] rounded-t-3xl z-[101] p-5 pb-8 border-t border-white/10 md:hidden shadow-2xl"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Новая задача</h3>
                            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <input
                                autoFocus
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Что нужно сделать?"
                                className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 text-lg text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 transition-colors"
                            />

                            <div className="flex gap-2 overflow-x-auto py-1">
                                <button
                                    type="button"
                                    onClick={() => setPriority("high")}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${priority === "high"
                                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                            : "bg-slate-800/50 text-slate-400 border border-transparent"
                                        }`}
                                >
                                    <Zap size={14} /> Срочно
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPriority("normal")}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${priority === "normal"
                                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                            : "bg-slate-800/50 text-slate-400 border border-transparent"
                                        }`}
                                >
                                    <Zap size={14} /> Обычно
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPriority("low")}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${priority === "low"
                                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                            : "bg-slate-800/50 text-slate-400 border border-transparent"
                                        }`}
                                >
                                    <Zap size={14} /> Не к спеху
                                </button>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500 px-1">
                                <span className="flex items-center gap-1"><Calendar size={12} /> Natural language supported</span>
                            </div>

                            <button
                                type="submit"
                                disabled={!title.trim()}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl mt-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]"
                            >
                                Создать задачу
                            </button>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
