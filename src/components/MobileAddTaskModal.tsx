import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        const parsed = parseNaturalLanguage(title);
        await onAdd(
            parsed.cleanTitle,
            parsed.priority || "normal",
            parsed.deadline,
            parsed.tags
        );

        setTitle("");
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

                    {/* Modal - Things 3 style */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-[#1c1c1e] rounded-t-2xl z-[101] p-4 pb-8 border-t border-white/10 md:hidden shadow-2xl"
                    >
                        {/* Handle bar */}
                        <div className="flex justify-center mb-3">
                            <div className="w-10 h-1 bg-slate-600 rounded-full" />
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                            {/* Simple text input like Things 3 */}
                            <div className="flex items-center gap-3">
                                {/* Circle checkbox (visual only) */}
                                <div className="w-6 h-6 rounded-full border-2 border-slate-500 shrink-0" />

                                <input
                                    autoFocus
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="New To-Do"
                                    className="flex-1 bg-transparent text-lg text-white placeholder-slate-500 outline-none"
                                />

                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-1.5 text-slate-500 hover:text-white rounded-full"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Hint */}
                            <p className="text-xs text-slate-500 ml-9">
                                Try: "Buy groceries завтра" or "Meeting #work !high"
                            </p>

                            {/* Submit button */}
                            <button
                                type="submit"
                                disabled={!title.trim()}
                                className="w-full bg-[#007AFF] hover:bg-[#0066CC] disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl mt-2 transition-all active:scale-[0.98]"
                            >
                                Add
                            </button>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
