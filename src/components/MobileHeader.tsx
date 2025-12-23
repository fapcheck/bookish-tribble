import { Menu } from "lucide-react";
import type { View } from "../types/ui";

interface MobileHeaderProps {
    title: string;
    onOpenSidebar: () => void;
    view: View;
}

export default function MobileHeader({ title, onOpenSidebar, view }: MobileHeaderProps) {
    // Focus mode has its own header
    if (view === "focus") return null;

    return (
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#1c1c1e] border-b border-white/5 sticky top-0 z-40">
            <button
                onClick={onOpenSidebar}
                className="p-2 -ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
                <Menu size={22} />
            </button>
            <h1 className="text-lg font-semibold text-white">{title}</h1>
        </header>
    );
}
