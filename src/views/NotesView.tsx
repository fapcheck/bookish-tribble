import { useState, useRef, useEffect } from "react";
import {
    Folder, FolderPlus, FileText, Plus, X, ChevronRight,
    Trash2, Edit3, MoreHorizontal, Hash
} from "lucide-react";
import type { Project } from "../hooks/useDatabase";
import type { Priority } from "../lib/tauri";

type NotesViewProps = {
    projects: Project[];
    addProject: (name: string, color: string, priority: Priority, parentId?: string | null, isFolder?: boolean) => Promise<any>;
    deleteProject: (id: string) => Promise<void>;
    editProject: (id: string, name: string) => Promise<void>;
};


// Context menu for items
function ItemMenu({
    onDelete,
    onRename,
    onDuplicate,
    showDuplicate = false,
    renameLabel = "Переименовать"
}: {
    onDelete: () => void;
    onRename?: () => void;
    onDuplicate?: () => void;
    showDuplicate?: boolean;
    renameLabel?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, [isOpen]);

    return (
        <div ref={menuRef} className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            >
                <MoreHorizontal size={14} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-1 bg-[#1e293b] border border-slate-700/50 rounded-xl shadow-2xl py-1.5 z-50 min-w-[160px] backdrop-blur-xl">
                    {onRename && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRename(); setIsOpen(false); }}
                            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 flex items-center gap-3 transition-colors"
                        >
                            <Edit3 size={14} className="text-slate-500" /> {renameLabel}
                        </button>
                    )}

                    {showDuplicate && onDuplicate && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDuplicate(); setIsOpen(false); }}
                            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 flex items-center gap-3 transition-colors"
                        >
                            <Plus size={14} className="text-slate-500" /> Дублировать
                        </button>
                    )}

                    <div className="border-t border-slate-700/50 my-1" />

                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); setIsOpen(false); }}
                        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                    >
                        <Trash2 size={14} /> Удалить
                    </button>
                </div>
            )}
        </div>
    );
}

// Beautiful note item with expand/collapse functionality
function NoteItem({
    note,
    onDelete,
    onEdit
}: {
    note: Project;
    onDelete: () => void;
    onEdit: (name: string) => void;
}) {

    const [isExpanded, setIsExpanded] = useState(false);
    const [editedContent, setEditedContent] = useState(note.name);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea when content changes
    useEffect(() => {
        if (textareaRef.current && isExpanded) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [editedContent, isExpanded]);

    // Sync editedContent with note.name when it changes externally
    useEffect(() => {
        setEditedContent(note.name);
    }, [note.name]);

    const handleSave = () => {
        if (editedContent.trim() !== note.name) {
            onEdit(editedContent.trim());
        }
    };

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isExpanded) {
            handleSave();
        }
        setIsExpanded(!isExpanded);
    };

    return (
        <div className={`group rounded-2xl transition-all border ${isExpanded ? 'bg-slate-800/60 border-slate-700/70' : 'hover:bg-slate-800/40 border-transparent hover:border-slate-700/50'}`}>
            {/* Header row - only when collapsed */}
            {!isExpanded && (
                <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                    onClick={toggleExpand}
                >
                    {/* Expand/Collapse chevron */}
                    <button
                        onClick={toggleExpand}
                        className="text-slate-600 hover:text-slate-400 transition-colors"
                    >
                        <div className="transform transition-transform duration-200">
                            <ChevronRight size={16} />
                        </div>
                    </button>

                    {/* Note icon with accent */}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-slate-700 to-slate-800">
                        <FileText size={22} className="text-slate-400" />
                    </div>

                    {/* Note preview/title */}
                    <div className="flex-1 min-w-0">
                        <div className="text-base font-medium text-slate-200 px-2 py-1.5 border border-transparent truncate">
                            {note.name}
                        </div>

                        {/* Creation date */}
                        <div className="text-sm text-slate-500 mt-1 px-2">
                            {new Date(note.created_at).toLocaleDateString("ru-RU", {
                                day: "numeric",
                                month: "long",
                                year: note.created_at < Date.now() - 365 * 24 * 60 * 60 * 1000 ? "numeric" : undefined
                            })}
                        </div>
                    </div>

                    {/* Actions */}
                    <ItemMenu onDelete={onDelete} onRename={() => setIsExpanded(true)} renameLabel="Редактировать" />
                </div>
            )}

            {/* Expanded content - editable textarea with collapse button */}
            {isExpanded && (
                <div className="px-5 py-4">
                    <div className="flex items-start gap-3 mb-3">
                        {/* Collapse chevron */}
                        <button
                            onClick={toggleExpand}
                            className="text-slate-500 hover:text-slate-300 transition-colors mt-1"
                        >
                            <div className="transform rotate-90 transition-transform duration-200">
                                <ChevronRight size={16} />
                            </div>
                        </button>

                        {/* Note icon */}
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-indigo-600 to-indigo-700 shrink-0">
                            <FileText size={18} className="text-white" />
                        </div>

                        {/* Date and actions row */}
                        <div className="flex-1 flex items-center justify-between">
                            <div className="text-sm text-slate-500">
                                {new Date(note.created_at).toLocaleDateString("ru-RU", {
                                    day: "numeric",
                                    month: "long",
                                    year: note.created_at < Date.now() - 365 * 24 * 60 * 60 * 1000 ? "numeric" : undefined
                                })}
                            </div>
                            <ItemMenu onDelete={onDelete} />
                        </div>
                    </div>

                    {/* Full editable content */}
                    <div className="ml-[52px]">
                        <textarea
                            ref={textareaRef}
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            onBlur={handleSave}
                            placeholder="Введите содержимое заметки..."
                            className="w-full bg-slate-900/50 rounded-xl px-4 py-3 text-base text-slate-200 outline-none border border-slate-700/50 focus:border-indigo-500/50 resize-none min-h-[120px] placeholder-slate-600 leading-relaxed"
                            style={{ height: 'auto' }}
                        />
                        <div className="flex items-center justify-between mt-2 text-xs text-slate-600">
                            <span>{editedContent.length} символов</span>
                            <span className="text-slate-700">Изменения сохраняются автоматически</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Folder with children (recursive)
function FolderBlock({
    folder,
    allFolders,
    notes,
    expandedFolders,
    toggleFolder,
    addProject,
    deleteProject,
    editProject,
    depth = 0,
}: {
    folder: Project;
    allFolders: Project[];
    notes: Project[];
    expandedFolders: Set<string>;
    toggleFolder: (id: string) => void;
    addProject: (name: string, color: string, priority: Priority, parentId?: string | null, isFolder?: boolean) => Promise<any>;
    deleteProject: (id: string) => Promise<void>;
    editProject: (id: string, name: string) => Promise<void>;
    depth?: number;
}) {
    const [isAddingItem, setIsAddingItem] = useState<"folder" | "note" | null>(null);
    const [newItemName, setNewItemName] = useState("");
    const [isRenaming, setIsRenaming] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const isExpanded = expandedFolders.has(folder.id);
    const childFolders = allFolders.filter((f) => f.parent_id === folder.id);
    const childNotes = notes.filter((n) => n.parent_id === folder.id);
    const itemCount = childFolders.length + childNotes.length;

    useEffect(() => {
        if (isAddingItem && inputRef.current) inputRef.current.focus();
    }, [isAddingItem]);

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim()) return;

        if (isAddingItem === "folder") {
            await addProject(newItemName, "#f59e0b", "normal", folder.id, true);
        } else {
            await addProject(newItemName, "#64748b", "normal", folder.id, false);
        }

        setNewItemName("");
        setIsAddingItem(null);
    };

    return (
        <div className={depth > 0 ? "ml-6" : ""}>
            {/* Folder header */}
            <div
                className="group flex items-center gap-2 px-3 py-2.5 hover:bg-slate-800/30 rounded-xl cursor-pointer transition-all"
                onClick={() => toggleFolder(folder.id)}
            >
                {/* Chevron */}
                <button className="text-slate-600 hover:text-slate-400 transition-colors">
                    <div className={`transform transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}>
                        <ChevronRight size={16} />
                    </div>
                </button>

                {/* Folder icon */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isExpanded ? "bg-amber-500/20" : "bg-slate-800"
                    }`}>
                    <Folder size={14} className={isExpanded ? "text-amber-400" : "text-slate-500"} />
                </div>

                {/* Folder name */}
                <div className="flex-1 min-w-0">
                    {isRenaming ? (
                        <input
                            autoFocus
                            defaultValue={folder.name}
                            onBlur={(e) => { editProject(folder.id, e.target.value); setIsRenaming(false); }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") { editProject(folder.id, e.currentTarget.value); setIsRenaming(false); }
                                if (e.key === "Escape") setIsRenaming(false);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-slate-800 rounded px-2 py-1 text-sm text-white outline-none border border-slate-600 focus:border-amber-500"
                        />
                    ) : (
                        <span className="text-sm font-medium text-white truncate block px-2 py-1 border border-transparent">{folder.name}</span>
                    )}
                </div>

                {/* Item count badge */}
                {itemCount > 0 && (
                    <span className="text-xs text-slate-600 bg-slate-800/50 px-2 py-0.5 rounded-full">
                        {itemCount}
                    </span>
                )}

                {/* Quick actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsAddingItem("folder"); setNewItemName(""); }}
                        className="p-1.5 text-slate-600 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Новая папка"
                    >
                        <FolderPlus size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsAddingItem("note"); setNewItemName(""); }}
                        className="p-1.5 text-slate-600 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Новая заметка"
                    >
                        <Plus size={14} />
                    </button>
                </div>

                {/* Menu */}
                <ItemMenu onDelete={() => deleteProject(folder.id)} onRename={() => setIsRenaming(true)} />
            </div>

            {/* Expanded content */}
            {isExpanded && (
                <div className="mt-1 ml-4 pl-4 border-l-2 border-slate-800/50 space-y-0.5">
                    {/* Add item form */}
                    {isAddingItem && (
                        <form onSubmit={handleAddItem} className="flex items-center gap-2 py-2 px-2">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isAddingItem === "folder" ? "bg-amber-500/20" : "bg-slate-800"
                                }`}>
                                {isAddingItem === "folder" ? (
                                    <Folder size={12} className="text-amber-400" />
                                ) : (
                                    <FileText size={12} className="text-slate-400" />
                                )}
                            </div>
                            <input
                                ref={inputRef}
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                onKeyDown={(e) => e.key === "Escape" && setIsAddingItem(null)}
                                placeholder={isAddingItem === "folder" ? "Название папки..." : "Название заметки..."}
                                className="flex-1 bg-transparent text-sm text-white outline-none placeholder-slate-600"
                            />
                            <button type="submit" className="text-xs text-slate-500 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors">
                                ⏎
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsAddingItem(null)}
                                className="text-slate-600 hover:text-slate-300 p-1 rounded hover:bg-slate-800 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </form>
                    )}

                    {/* Child folders */}
                    {childFolders.map((childFolder) => (
                        <FolderBlock
                            key={childFolder.id}
                            folder={childFolder}
                            allFolders={allFolders}
                            notes={notes}
                            expandedFolders={expandedFolders}
                            toggleFolder={toggleFolder}
                            addProject={addProject}
                            deleteProject={deleteProject}
                            editProject={editProject}
                            depth={depth + 1}
                        />
                    ))}

                    {/* Child notes */}
                    {childNotes.map((note) => (
                        <NoteItem
                            key={note.id}
                            note={note}
                            onDelete={() => deleteProject(note.id)}
                            onEdit={(name) => editProject(note.id, name)}
                        />
                    ))}

                    {/* Empty state */}
                    {childFolders.length === 0 && childNotes.length === 0 && !isAddingItem && (
                        <div
                            className="py-6 text-center text-slate-700 text-xs cursor-pointer hover:text-slate-500 transition-colors"
                            onClick={() => setIsAddingItem("note")}
                        >
                            Нажмите + или кликните сюда, чтобы добавить заметку
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function NotesView({ projects, addProject, deleteProject, editProject }: NotesViewProps) {
    const [isAddingRootFolder, setIsAddingRootFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    const allFolders = projects.filter((p) => p.is_folder);
    const allNotes = projects.filter((p) => !p.is_folder && p.parent_id);
    const rootFolders = allFolders.filter((f) => !f.parent_id);

    const toggleFolder = (folderId: string) => {
        setExpandedFolders((prev) => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    };

    const handleAddRootFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        await addProject(newFolderName, "#f59e0b", "normal", null, true);
        setNewFolderName("");
        setIsAddingRootFolder(false);
    };

    // Expand all on first render if there are folders
    useEffect(() => {
        if (rootFolders.length > 0 && expandedFolders.size === 0) {
            setExpandedFolders(new Set(rootFolders.map((f) => f.id)));
        }
    }, [rootFolders.length]);

    return (
        <div className="h-full overflow-y-auto">
            <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-4 md:space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2 md:gap-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                                <Hash size={16} className="md:w-5 md:h-5 text-white" />
                            </div>
                            Заметки
                        </h1>
                        <p className="text-slate-600 text-xs md:text-sm mt-1 ml-[42px] md:ml-[52px]">
                            {allFolders.length} папок · {allNotes.length} заметок
                        </p>
                    </div>

                    <button
                        onClick={() => setIsAddingRootFolder(true)}
                        className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all text-xs md:text-sm font-medium border border-slate-700 hover:border-slate-600"
                    >
                        <FolderPlus size={16} />
                        <span className="hidden md:inline">Новая папка</span>
                        <span className="md:hidden">Папка</span>
                    </button>
                </div>

                {/* Add root folder form */}
                {isAddingRootFolder && (
                    <form
                        onSubmit={handleAddRootFolder}
                        className="flex items-center gap-2 md:gap-3 bg-slate-900/50 backdrop-blur-sm p-3 md:p-4 rounded-2xl border border-amber-500/20"
                    >
                        <div className="hidden md:flex w-10 h-10 rounded-xl bg-amber-500/20 items-center justify-center shrink-0">
                            <Folder size={18} className="text-amber-400" />
                        </div>
                        <input
                            autoFocus
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === "Escape" && setIsAddingRootFolder(false)}
                            placeholder="Название папки..."
                            className="flex-1 bg-transparent text-white outline-none text-base md:text-lg placeholder-slate-600 min-w-0"
                        />
                        <button
                            type="submit"
                            disabled={!newFolderName.trim()}
                            className="px-3 md:px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors shrink-0"
                        >
                            <span className="hidden md:inline">Создать</span>
                            <span className="md:hidden"><ChevronRight size={18} /></span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsAddingRootFolder(false)}
                            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                        >
                            <X size={18} />
                        </button>
                    </form>
                )}

                {/* Folders container */}
                <div className="bg-[#0c1222] rounded-2xl border border-slate-800/50 overflow-hidden">
                    {rootFolders.length === 0 && !isAddingRootFolder ? (
                        <div className="py-20 text-center">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
                                <Folder size={28} className="text-slate-600" />
                            </div>
                            <p className="text-slate-500 text-lg mb-2">Пока нет папок</p>
                            <p className="text-slate-600 text-sm mb-6">Создайте первую папку для организации заметок</p>
                            <button
                                onClick={() => setIsAddingRootFolder(true)}
                                className="px-5 py-2.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2"
                            >
                                <FolderPlus size={16} /> Создать папку
                            </button>
                        </div>
                    ) : (
                        <div className="p-3 space-y-1">
                            {rootFolders.map((folder) => (
                                <FolderBlock
                                    key={folder.id}
                                    folder={folder}
                                    allFolders={allFolders}
                                    notes={allNotes}
                                    expandedFolders={expandedFolders}
                                    toggleFolder={toggleFolder}
                                    addProject={addProject}
                                    deleteProject={deleteProject}
                                    editProject={editProject}
                                    depth={0}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
