import { Plus, Check } from "lucide-react";
import { parseNaturalLanguage } from "../utils/naturalLanguage";
import { useState } from "react";

export default function AddTaskForm({
  projectId,
  accentColor,
  isActive,
  onOpen,
  onClose,
  onSubmit,
  title,
  setTitle,
}: {
  projectId: string;
  accentColor?: string;
  isActive: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent, projectId: string | null) => void | Promise<void>;
  title: string;
  setTitle: (v: string) => void;
  priority?: string;
  setPriority?: (p: string) => void;
  deadline?: string;
  setDeadline?: (v: string) => void;
  tags?: string;
  setTags?: (v: string) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);

    // Parse natural language from title
    const parsed = parseNaturalLanguage(title);

    // Update title with clean version before submitting
    setTitle(parsed.cleanTitle);

    await onSubmit(e, projectId === "inbox" ? null : projectId);
    setIsSubmitting(false);
    onClose();
  };

  if (!isActive) {
    return (
      <div className="mt-2">
        <button
          onClick={onOpen}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm w-full transition-colors py-2 px-1 rounded-lg hover:bg-white/5"
        >
          <Plus size={16} /> Добавить задачу
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 animate-in fade-in slide-in-from-top-1">
      <form onSubmit={handleSubmit} className="flex items-center gap-3 py-2 px-1">
        {/* Circle checkbox (visual) */}
        <div
          className="w-5 h-5 rounded-full border-2 shrink-0"
          style={{ borderColor: accentColor || "#64748b" }}
        />

        {/* Input */}
        <input
          autoFocus
          className="flex-1 bg-transparent text-[15px] text-white placeholder-slate-500 outline-none"
          placeholder="New To-Do"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onClose();
            }
          }}
        />

        {/* Submit button */}
        <button
          type="submit"
          disabled={!title.trim() || isSubmitting}
          className="p-2 rounded-full bg-[#007AFF] text-white disabled:opacity-30 transition-all active:scale-90"
        >
          <Check size={16} strokeWidth={3} />
        </button>
      </form>

      {/* Hint */}
      <p className="text-[10px] text-slate-600 ml-8 -mt-1">
        Try: "Buy groceries завтра" or "#work !high"
      </p>
    </div>
  );
}