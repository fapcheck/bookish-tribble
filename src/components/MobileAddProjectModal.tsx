import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const PROJECT_COLORS = [
    "#EF4444", "#F97316", "#FBBF24", "#22C55E", "#06B6D4",
    "#3B82F6", "#6366F1", "#A855F7", "#EC4899", "#71717A"
];

export default function MobileAddProjectModal({
    isOpen,
    onClose,
    onAdd,
}: {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (name: string, color: string) => Promise<unknown>;
}) {
    const [name, setName] = useState("");
    const [color, setColor] = useState(PROJECT_COLORS[5]); // Default blue

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        await onAdd(name.trim(), color);
        setName("");
        setColor(PROJECT_COLORS[5]);
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] md:hidden"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-[#1c1c1e] rounded-t-2xl z-[301] p-4 pb-8 border-t border-white/10 md:hidden shadow-2xl"
                    >
                        {/* Handle bar */}
                        <div className="flex justify-center mb-3">
                            <div className="w-10 h-1 bg-slate-600 rounded-full" />
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            {/* Header */}
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-white">New List</h3>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-1.5 text-slate-500 hover:text-white rounded-full"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Name input */}
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-6 h-6 rounded-full shrink-0"
                                    style={{ backgroundColor: color }}
                                />
                                <input
                                    autoFocus
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="List name"
                                    className="flex-1 bg-transparent text-lg text-white placeholder-slate-500 outline-none"
                                />
                            </div>

                            {/* Color picker */}
                            <div className="flex gap-2 flex-wrap">
                                {PROJECT_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={`w-8 h-8 rounded-full transition-all ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#1c1c1e]" : ""
                                            }`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>

                            {/* Submit button */}
                            <button
                                type="submit"
                                disabled={!name.trim()}
                                className="w-full bg-[#007AFF] hover:bg-[#0066CC] disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl mt-2 transition-all active:scale-[0.98]"
                            >
                                Create
                            </button>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
