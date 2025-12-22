import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Inbox,
    Star,
    Calendar,
    Clock,
    Moon,
    Book,
    Plus,
    X,
} from "lucide-react";
import type { View } from "../types/ui";
import type { Project } from "../lib/tauri";

type MobileSection = "inbox" | "today" | "upcoming" | "anytime" | "someday" | "logbook";

interface MobileSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    currentSection: MobileSection;
    onSelectSection: (section: MobileSection) => void;
    projects: Project[];
    onSelectProject: (projectId: string) => void;
    selectedProjectId: string | null;
    onAddProject: () => void;
    setView: (v: View) => void;
}

const sidebarSections: { id: MobileSection; label: string; icon: React.ReactNode; color?: string }[] = [
    { id: "inbox", label: "Inbox", icon: <Inbox size={20} />, color: "#3B82F6" },
    { id: "today", label: "Today", icon: <Star size={20} />, color: "#FBBF24" },
    { id: "upcoming", label: "Upcoming", icon: <Calendar size={20} />, color: "#EF4444" },
    { id: "anytime", label: "Anytime", icon: <Clock size={20} />, color: "#06B6D4" },
    { id: "someday", label: "Someday", icon: <Moon size={20} />, color: "#A78BFA" },
    { id: "logbook", label: "Logbook", icon: <Book size={20} />, color: "#10B981" },
];

export default function MobileSidebar({
    isOpen,
    onClose,
    currentSection,
    onSelectSection,
    projects,
    onSelectProject,
    selectedProjectId,
    onAddProject,
    setView,
}: MobileSidebarProps) {
    const handleSectionClick = (section: MobileSection) => {
        onSelectSection(section);
        setView("main");
        onClose();
    };

    const handleProjectClick = (projectId: string) => {
        onSelectProject(projectId);
        setView("main");
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
                        className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="md:hidden fixed left-0 top-0 bottom-0 w-72 bg-[#1c1c1e] z-[201] flex flex-col shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/5">
                            <span className="text-lg font-semibold text-white">FocusFlow</span>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Sections */}
                        <div className="flex-1 overflow-y-auto py-2">
                            <div className="px-3 mb-4">
                                {sidebarSections.map((section) => (
                                    <button
                                        key={section.id}
                                        onClick={() => handleSectionClick(section.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-1 ${currentSection === section.id && !selectedProjectId
                                                ? "bg-[#007AFF]/20 text-white"
                                                : "text-slate-300 hover:bg-white/5"
                                            }`}
                                    >
                                        <span style={{ color: section.color }}>{section.icon}</span>
                                        <span className="font-medium">{section.label}</span>
                                        {section.id === "today" && (
                                            <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                                                2
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-white/5 mx-4 my-2" />

                            {/* Projects */}
                            <div className="px-3">
                                <div className="text-xs text-slate-500 uppercase tracking-wider px-3 py-2">
                                    Projects
                                </div>
                                {projects.map((project) => (
                                    <button
                                        key={project.id}
                                        onClick={() => handleProjectClick(project.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-1 ${selectedProjectId === project.id
                                                ? "bg-[#007AFF]/20 text-white"
                                                : "text-slate-300 hover:bg-white/5"
                                            }`}
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: project.color }}
                                        />
                                        <span className="font-medium truncate">{project.name}</span>
                                    </button>
                                ))}

                                {/* New List button */}
                                <button
                                    onClick={() => {
                                        onAddProject();
                                        onClose();
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all mt-2"
                                >
                                    <Plus size={16} />
                                    <span className="text-sm">New List</span>
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/5">
                            <button
                                onClick={() => {
                                    setView("settings");
                                    onClose();
                                }}
                                className="w-full text-left text-sm text-slate-500 hover:text-slate-300 px-3 py-2 rounded-lg hover:bg-white/5"
                            >
                                Settings
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export type { MobileSection };
