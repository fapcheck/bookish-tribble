import { useState, useRef, useEffect } from "react";
import { Folder, FolderPlus, FileText, Plus, X, ChevronRight, Trash2 } from "lucide-react";
import type { Project } from "../hooks/useDatabase";
import type { Priority } from "../lib/tauri";

type NotesViewProps = {
    projects: Project[];
    addProject: (name: string, color: string, priority: Priority, parentId?: string | null, isFolder?: boolean) => Promise<Project>;
    deleteProject: (id: string) => Promise<void>;
    editProject: (id: string, name: string) => Promise<void>;
};

export default function NotesView({ projects, addProject, deleteProject }: NotesViewProps) {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [addingNoteTo, setAddingNoteTo] = useState<string | null>(null);
    const [newNoteName, setNewNoteName] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const allFolders = projects.filter((p) => p.is_folder);
    const allNotes = projects.filter((p) => !p.is_folder && p.parent_id);
    const rootFolders = allFolders.filter((f) => !f.parent_id);

    // Auto-expand first folder on mount
    useEffect(() => {
        if (rootFolders.length > 0 && expandedFolders.size === 0) {
            setExpandedFolders(new Set([rootFolders[0].id]));
        }
    }, [rootFolders.length]);

    const toggleFolder = (id: string) => {
        setExpandedFolders((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleAddFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        await addProject(newFolderName, "#f59e0b", "normal", null, true);
        setNewFolderName("");
        setIsAddingFolder(false);
    };

    const handleAddNote = async (e: React.FormEvent, folderId: string) => {
        e.preventDefault();
        if (!newNoteName.trim()) return;
        await addProject(newNoteName, "#64748b", "normal", folderId, false);
        setNewNoteName("");
        setAddingNoteTo(null);
    };

    useEffect(() => {
        if ((isAddingFolder || addingNoteTo) && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isAddingFolder, addingNoteTo]);

    return (
        <div className="h-full overflow-y-auto bg-[#1c1c1e]">
            <div className="max-w-lg mx-auto px-4 py-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-sm text-slate-500">
                            {allFolders.length} folders · {allNotes.length} notes
                        </p>
                    </div>
                    <button
                        onClick={() => setIsAddingFolder(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        <FolderPlus size={16} />
                        <span>Folder</span>
                    </button>
                </div>

                {/* Add Folder Form */}
                {isAddingFolder && (
                    <form onSubmit={handleAddFolder} className="flex items-center gap-2 mb-4 bg-white/5 rounded-xl p-3">
                        <Folder size={18} className="text-amber-400 shrink-0" />
                        <input
                            ref={inputRef}
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === "Escape" && setIsAddingFolder(false)}
                            placeholder="Folder name..."
                            className="flex-1 bg-transparent text-white outline-none placeholder-slate-500"
                        />
                        <button type="submit" className="text-[#007AFF] text-sm font-medium">
                            Add
                        </button>
                        <button type="button" onClick={() => setIsAddingFolder(false)} className="text-slate-500">
                            <X size={16} />
                        </button>
                    </form>
                )}

                {/* Empty State */}
                {rootFolders.length === 0 && !isAddingFolder && (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                            <Folder size={28} className="text-slate-600" />
                        </div>
                        <p className="text-slate-500 mb-4">No folders yet</p>
                        <button
                            onClick={() => setIsAddingFolder(true)}
                            className="text-[#007AFF] text-sm font-medium"
                        >
                            Create first folder
                        </button>
                    </div>
                )}

                {/* Folders List */}
                <div className="space-y-1">
                    {rootFolders.map((folder) => {
                        const isExpanded = expandedFolders.has(folder.id);
                        const childNotes = allNotes.filter((n) => n.parent_id === folder.id);

                        return (
                            <div key={folder.id}>
                                {/* Folder Header */}
                                <button
                                    onClick={() => toggleFolder(folder.id)}
                                    className="w-full flex items-center gap-3 py-3 px-2 rounded-xl hover:bg-white/5 transition-colors group"
                                >
                                    <ChevronRight
                                        size={16}
                                        className={`text-slate-500 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                    />
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                        <Folder size={16} className="text-amber-400" />
                                    </div>
                                    <span className="flex-1 text-left text-[15px] text-white font-medium truncate">
                                        {folder.name}
                                    </span>
                                    <span className="text-xs text-slate-600 bg-white/5 px-2 py-0.5 rounded-full">
                                        {childNotes.length}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setAddingNoteTo(folder.id);
                                            setExpandedFolders((prev) => new Set([...prev, folder.id]));
                                        }}
                                        className="p-1.5 text-slate-600 hover:text-[#007AFF] opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </button>

                                {/* Folder Content */}
                                {isExpanded && (
                                    <div className="ml-8 pl-4 border-l border-white/5 space-y-0.5 pb-2">
                                        {/* Add Note Form */}
                                        {addingNoteTo === folder.id && (
                                            <form
                                                onSubmit={(e) => handleAddNote(e, folder.id)}
                                                className="flex items-center gap-2 py-2"
                                            >
                                                <FileText size={14} className="text-slate-500" />
                                                <input
                                                    ref={inputRef}
                                                    value={newNoteName}
                                                    onChange={(e) => setNewNoteName(e.target.value)}
                                                    onKeyDown={(e) => e.key === "Escape" && setAddingNoteTo(null)}
                                                    placeholder="Note title..."
                                                    className="flex-1 bg-transparent text-sm text-white outline-none placeholder-slate-500"
                                                />
                                                <button type="submit" className="text-[#007AFF] text-xs font-medium">
                                                    Add
                                                </button>
                                            </form>
                                        )}

                                        {/* Notes */}
                                        {childNotes.map((note) => (
                                            <div
                                                key={note.id}
                                                className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-white/5 group"
                                            >
                                                <FileText size={16} className="text-slate-500 shrink-0" />
                                                <span className="flex-1 text-sm text-slate-300 truncate">{note.name}</span>
                                                <span className="text-[10px] text-slate-600">
                                                    {new Date(note.created_at).toLocaleDateString('ru-RU', {
                                                        day: 'numeric',
                                                        month: 'short'
                                                    })}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        if (confirm("Delete this note?")) deleteProject(note.id);
                                                    }}
                                                    className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}

                                        {/* Empty folder */}
                                        {childNotes.length === 0 && addingNoteTo !== folder.id && (
                                            <button
                                                onClick={() => setAddingNoteTo(folder.id)}
                                                className="w-full py-4 text-center text-xs text-slate-600 hover:text-slate-400 transition-colors"
                                            >
                                                + Add note
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
