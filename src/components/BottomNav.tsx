import { Menu } from "lucide-react";
import type { View } from "../types/ui";

export default function BottomNav({
    view,
    onOpenSidebar,
}: {
    view: View;
    onOpenSidebar: () => void;
}) {
    // Focus is a special full-screen mode; don't show tabs there.
    if (view === "focus") return null;

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1c1c1e]/95 backdrop-blur-xl border-t border-white/5 pb-safe pb-8 pt-3 px-6 z-50">
            <div className="flex justify-start">
                <button
                    onClick={onOpenSidebar}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors p-2 -ml-2 rounded-xl hover:bg-white/5"
                >
                    <Menu size={24} />
                    <span className="text-sm font-medium">Menu</span>
                </button>
            </div>
        </nav>
    );
}
