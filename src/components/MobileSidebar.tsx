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
    Wallet,
    Zap,
    StickyNote,
    Settings,
    CalendarDays,
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
    currentView: View;
}

const taskSections: { id: MobileSection; label: string; icon: React.ReactNode; color: string }[] = [
    { id: "inbox", label: "Inbox", icon: <Inbox size={20} />, color: "#3B82F6" },
    { id: "today", label: "Today", icon: <Star size={20} />, color: "#FBBF24" },
    { id: "upcoming", label: "Upcoming", icon: <Calendar size={20} />, color: "#EF4444" },
    { id: "anytime", label: "Anytime", icon: <Clock size={20} />, color: "#06B6D4" },
    { id: "someday", label: "Someday", icon: <Moon size={20} />, color: "#A78BFA" },
    { id: "logbook", label: "Logbook", icon: <Book size={20} />, color: "#10B981" },
];

const toolSections: { id: View; label: string; icon: React.ReactNode; color: string }[] = [
    { id: "calendar", label: "Calendar", icon: <CalendarDays size={20} />, color: "#EF4444" },
    { id: "focus", label: "Focus Mode", icon: <Zap size={20} />, color: "#F97316" },
    { id: "notes", label: "Notes", icon: <StickyNote size={20} />, color: "#FBBF24" },
    { id: "wallet", label: "Finance", icon: <Wallet size={20} />, color: "#22C55E" },
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
    currentView,
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

    const handleToolClick = (view: View) => {
        setView(view);
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
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <Zap size={18} className="text-white" />
                                </div>
                                <span className="text-lg font-bold text-white">FocusFlow</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable content */}
                        <div className="flex-1 overflow-y-auto py-3">
                            {/* Task Sections */}
                            <div className="px-3 mb-2">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider px-3 py-1 mb-1">
                                    Tasks
                                </div>
                                {taskSections.map((section) => (
                                    <button
                                        key={section.id}
                                        onClick={() => handleSectionClick(section.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-0.5 ${currentSection === section.id && currentView === "main" && !selectedProjectId
                                                ? "bg-white/10 text-white"
                                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                                            }`}
                                    >
                                        <span style={{ color: section.color }}>{section.icon}</span>
                                        <span className="font-medium text-sm">{section.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-white/5 mx-4 my-3" />

                            {/* Projects */}
                            <div className="px-3 mb-2">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider px-3 py-1 mb-1">
                                    Lists
                                </div>
                                {projects.map((project) => (
                                    <button
                                        key={project.id}
                                        onClick={() => handleProjectClick(project.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-0.5 ${selectedProjectId === project.id && currentView === "main"
                                                ? "bg-white/10 text-white"
                                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                                            }`}
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: project.color }}
                                        />
                                        <span className="font-medium text-sm truncate">{project.name}</span>
                                    </button>
                                ))}

                                {/* New List button */}
                                <button
                                    onClick={() => {
                                        onAddProject();
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-slate-500 hover:text-white hover:bg-white/5 transition-all mt-1"
                                >
                                    <Plus size={16} />
                                    <span className="text-sm">New List</span>
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-white/5 mx-4 my-3" />

                            {/* Tools Section */}
                            <div className="px-3">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider px-3 py-1 mb-1">
                                    Tools
                                </div>
                                {toolSections.map((tool) => (
                                    <button
                                        key={tool.id}
                                        onClick={() => handleToolClick(tool.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-0.5 ${currentView === tool.id
                                                ? "bg-white/10 text-white"
                                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                                            }`}
                                    >
                                        <span style={{ color: tool.color }}>{tool.icon}</span>
                                        <span className="font-medium text-sm">{tool.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer - Settings */}
                        <div className="p-3 border-t border-white/5">
                            <button
                                onClick={() => {
                                    setView("settings");
                                    onClose();
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${currentView === "settings"
                                        ? "bg-white/10 text-white"
                                        : "text-slate-500 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <Settings size={18} />
                                <span className="text-sm font-medium">Settings</span>
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export type { MobileSection };
