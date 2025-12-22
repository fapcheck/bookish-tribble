import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import type { Task } from "../hooks/useDatabase";

function formatDeadlineTag(ms: number): { text: string; color: string } {
    const now = new Date();
    const deadline = new Date(ms);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const deadlineDay = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());

    const diffDays = Math.ceil((deadlineDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: "overdue", color: "#EF4444" };
    if (diffDays === 0) return { text: "today", color: "#EF4444" };
    if (diffDays === 1) return { text: "tomorrow", color: "#F97316" };
    if (diffDays <= 7) return { text: `${diffDays} days left`, color: "#FBBF24" };
    return { text: deadline.toLocaleDateString(undefined, { month: "short", day: "numeric" }), color: "#94A3B8" };
}

export default function Things3TaskRow({
    task,
    onComplete,
    projectColor,
}: {
    task: Task;
    onComplete: () => void;
    projectColor?: string;
}) {
    const [isCompleting, setIsCompleting] = useState(false);

    const deadlineTag = useMemo(() => {
        if (!task.deadline) return null;
        return formatDeadlineTag(task.deadline);
    }, [task.deadline]);

    const handleComplete = () => {
        if (isCompleting) return;
        setIsCompleting(true);
        setTimeout(() => {
            onComplete();
        }, 400);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 1 }}
            animate={{ opacity: isCompleting ? 0.5 : 1 }}
            exit={{ opacity: 0, x: -20, transition: { duration: 0.3 } }}
            className="flex items-center gap-3 py-3.5 px-1 border-b border-white/5 last:border-0"
        >
            {/* Circle Checkbox */}
            <button
                onClick={handleComplete}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isCompleting
                        ? "border-[#007AFF] bg-[#007AFF]"
                        : "border-slate-500 hover:border-[#007AFF]"
                    }`}
            >
                <AnimatePresence>
                    {isCompleting && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                        >
                            <Check size={14} className="text-white" strokeWidth={3} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </button>

            {/* Task Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span
                        className={`text-[15px] leading-snug ${isCompleting ? "line-through text-slate-500" : "text-white"
                            }`}
                    >
                        {task.title}
                    </span>
                </div>

                {/* Tags row */}
                <div className="flex items-center gap-2 mt-1">
                    {projectColor && (
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: projectColor }}
                        />
                    )}
                    {deadlineTag && (
                        <span
                            className="text-xs font-medium"
                            style={{ color: deadlineTag.color }}
                        >
                            {deadlineTag.text}
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
