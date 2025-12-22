import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Coffee, CornerDownLeft, Folder, FolderPlus, Inbox, Layers, Plus, Search, Sparkles, Zap, X } from "lucide-react";
import type { Priority } from "../lib/tauri";
import type { Project, Task } from "../hooks/useDatabase";
import type { TaskFilter } from "../lib/tauri";
import AddTaskForm from "../components/AddTaskForm";
import TaskCard from "../components/TaskCard";
import TrelloColumn from "../components/TrelloColumn";


import { parseNaturalLanguage } from "../utils/naturalLanguage";

export default function MainView(props: {
  tasks: Task[];
  projects: Project[];
  isLoaded: boolean;

  filterPriority: "all" | Priority;
  setFilterPriority: React.Dispatch<React.SetStateAction<"all" | Priority>>;
  filterProject: "all" | "inbox" | string;
  setFilterProject: React.Dispatch<React.SetStateAction<"all" | "inbox" | string>>;
  showCompleted: boolean;
  setShowCompleted: React.Dispatch<React.SetStateAction<boolean>>;

  addTask: (
    title: string,
    priority?: Priority,
    description?: string,
    projectId?: string,
    deadline?: number,
    tags?: string[]
  ) => Promise<Task>;
  editTaskTitle: (id: string, title: string) => Promise<void>;
  updateTaskPriority: (id: string, priority: Priority) => Promise<void>;
  updateTaskDeadline: (id: string, deadline: number | null) => Promise<void>;
  updateTaskStatus: (id: string, status: "todo" | "doing" | "done") => Promise<void>;
  updateTaskTags: (id: string, tags: string[]) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  archiveTask: (id: string) => Promise<void>;

  addProject: (name: string, color: string, priority: Priority, parentId?: string | null, isFolder?: boolean) => Promise<Project>;
  editProject: (id: string, name: string) => Promise<void>;
  updateProjectPriority: (id: string, priority: Priority) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  onStartFocus: () => void;
}) {
  const {
    tasks,
    projects,
    isLoaded,

    filterPriority,
    filterProject,
    setFilterProject,
    showCompleted,

    addTask,
    editTaskTitle,
    updateTaskPriority,
    updateTaskDeadline,
    updateTaskStatus,
    updateTaskTags,
    deleteTask,
    archiveTask,

    addProject,
    editProject,
    updateProjectPriority,
    deleteProject,

    onStartFocus,
  } = props;

  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectPriority, setNewProjectPriority] = useState<Priority>("normal");
  const [isNewProjectFolder, setIsNewProjectFolder] = useState(false);

  const [addingTaskToProject, setAddingTaskToProject] = useState<string | null>(null);

  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddPriority, setQuickAddPriority] = useState<Priority>("normal");

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("normal");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [newTaskTags, setNewTaskTags] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");

  const displayedTasks = useMemo(() => {
    let list = tasks;

    // Apply filter
    if (taskFilter === "archived") {
      list = list.filter((t) => t.is_archived);
    } else {
      // Hide archived by default
      list = list.filter((t) => !t.is_archived);

      if (taskFilter === "due_today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        list = list.filter((t) => t.deadline && t.deadline >= today.getTime() && t.deadline < tomorrow.getTime());
      } else if (taskFilter === "overdue") {
        const now = Date.now();
        list = list.filter((t) => t.deadline && t.deadline < now && t.status !== "done");
      }
    }

    // Apply priority filter
    if (filterPriority !== "all") list = list.filter((t) => t.priority === filterPriority);

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
      );
    }

    // Hide completed unless showCompleted
    if (!showCompleted) list = list.filter((t) => t.status !== "done");

    return list;
  }, [tasks, filterPriority, showCompleted, searchQuery, taskFilter]);

  const inboxTasks = useMemo(() => displayedTasks.filter((t) => !t.project_id), [displayedTasks]);

  const displayedProjects = useMemo(() => {
    // If a specific project is selected, always show it
    if (filterProject !== "all" && filterProject !== "inbox") {
      return projects.filter((p) => p.id === filterProject);
    }
    // In 'all' view, only show projects that have visible tasks (avoid empty columns)
    return projects.filter((p) => displayedTasks.some((t) => t.project_id === p.id));
  }, [projects, filterProject, displayedTasks]);



  const cycleProjectPriority = (p: Priority): Priority => (p === "low" ? "normal" : p === "normal" ? "high" : "low");

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#71717a"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    await addProject(newProjectName, randomColor, newProjectPriority, null, isNewProjectFolder);

    setNewProjectName("");
    setNewProjectPriority("normal");
    setIsAddingProject(false);
    setIsNewProjectFolder(false);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTitle.trim()) return;

    // Parse natural language
    const parsed = parseNaturalLanguage(quickAddTitle);

    let targetProjectId: string | undefined = undefined;
    if (filterProject !== "all" && filterProject !== "inbox") targetProjectId = filterProject;

    await addTask(
      parsed.cleanTitle,
      parsed.priority || quickAddPriority,
      undefined,
      targetProjectId,
      parsed.deadline,
      parsed.tags
    );
    setQuickAddTitle("");
    setQuickAddPriority("normal");
  };

  const handleColumnAddTask = async (e: React.FormEvent, projectId: string | null) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const tagsArray = newTaskTags.split(",").map((t) => t.trim()).filter(Boolean);
    const deadlineTs = newTaskDeadline ? new Date(newTaskDeadline).getTime() : undefined;

    await addTask(newTaskTitle, newTaskPriority, undefined, projectId || undefined, deadlineTs, tagsArray);

    setNewTaskTitle("");
    setNewTaskPriority("normal");
    setNewTaskDeadline("");
    setNewTaskTags("");
    setAddingTaskToProject(null);
  };

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3 overflow-x-auto bg-[#020617] no-scrollbar">
        {/* Project filters */}
        <button
          onClick={() => { setFilterProject("all"); setTaskFilter("all"); }}
          className={`px-5 py-3 rounded-2xl text-[15px] font-medium transition-colors flex items-center gap-2.5 shrink-0 ${filterProject === "all" && taskFilter === "all"
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
            : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
        >
          <Layers size={18} /> Всё
        </button>

        <button
          onClick={() => { setFilterProject("inbox"); setTaskFilter("all"); }}
          className={`px-5 py-3 rounded-2xl text-[15px] font-medium transition-colors flex items-center gap-2.5 shrink-0 ${filterProject === "inbox" && taskFilter === "all"
            ? "bg-slate-700 text-white shadow-lg shadow-black/20"
            : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
        >
          <Inbox size={18} /> Входящие
        </button>

        {/* Folder separator for projects */}
        {projects.length > 0 && (
          <>
            <div className="w-px h-8 bg-slate-800 mx-1 shrink-0" />
            <div className="flex items-center gap-1 text-slate-600 shrink-0">
              <Folder size={18} />
            </div>
          </>
        )}

        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => { setFilterProject(p.id); setTaskFilter("all"); }}
            className={`px-5 py-3 rounded-2xl text-[15px] font-medium transition-colors flex items-center gap-2.5 whitespace-nowrap shrink-0 ${filterProject === p.id ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
          >
            <div className="w-3 h-3 rounded-full ring-2 ring-white/10" style={{ backgroundColor: p.color }} />
            {p.name}
          </button>
        ))}

        {/* Divider */}
        <div className="w-px h-6 bg-slate-800 mx-1 shrink-0" />

        {/* Mobile Focus Filters (integrated into scroll) */}
        <div className="md:hidden flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => { props.setFilterPriority("high"); onStartFocus(); }}
            className="w-7 h-7 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20 active:bg-red-500/30 transition-colors"
          >
            <Zap size={14} />
          </button>
          <button
            onClick={() => { props.setFilterPriority("normal"); onStartFocus(); }}
            className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20 active:bg-indigo-500/30 transition-colors"
          >
            <Sparkles size={14} />
          </button>
          <button
            onClick={() => { props.setFilterPriority("low"); onStartFocus(); }}
            className="w-7 h-7 rounded-full bg-teal-500/10 text-teal-500 flex items-center justify-center border border-teal-500/20 active:bg-teal-500/30 transition-colors"
          >
            <Coffee size={14} />
          </button>
          <div className="w-px h-4 bg-slate-800 mx-1" />
        </div>

        {/* Status filters */}
        <button
          onClick={() => setTaskFilter("due_today")}
          className={`px-2.5 py-1 rounded-md text-xs transition-colors shrink-0 ${taskFilter === "due_today"
            ? "bg-amber-600/20 text-amber-400"
            : "text-slate-600 hover:text-slate-400"
            }`}
        >
          Сегодня
        </button>

        <button
          onClick={() => setTaskFilter("overdue")}
          className={`px-2.5 py-1 rounded-md text-xs transition-colors shrink-0 ${taskFilter === "overdue"
            ? "bg-red-600/20 text-red-400"
            : "text-slate-600 hover:text-slate-400"
            }`}
        >
          Просрочено
        </button>

        <button
          onClick={() => setTaskFilter("archived")}
          className={`px-2.5 py-1 rounded-md text-xs transition-colors shrink-0 ${taskFilter === "archived"
            ? "bg-slate-600/20 text-slate-400"
            : "text-slate-600 hover:text-slate-400"
            }`}
        >
          Архив
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search input */}
        <div className="relative shrink-0">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск..."
            className="w-32 bg-slate-900/50 border border-slate-800 rounded-lg pl-7 pr-2 py-1 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-slate-600 focus:w-48 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Quick Add Bar */}
      <div className="hidden md:block px-4 md:px-6 py-3 md:py-4 bg-[#0f172a]/50 border-b border-white/5">
        <div className="max-w-[1600px] mx-auto">
          <form onSubmit={handleQuickAdd} className="relative flex items-center group">
            <div className="absolute left-3 md:left-4 text-slate-500 pointer-events-none">
              <Plus size={18} className="md:w-5 md:h-5" />
            </div>

            <input
              value={quickAddTitle}
              onChange={(e) => setQuickAddTitle(e.target.value)}
              placeholder="Добавить задачу..."
              className="w-full bg-slate-900/80 border border-slate-700 hover:border-slate-600 focus:border-indigo-500 rounded-xl py-2.5 md:py-3 pl-10 md:pl-12 pr-32 md:pr-40 text-sm md:text-base text-slate-200 placeholder-slate-500 outline-none transition-all shadow-sm"
            />

            <div className="absolute right-1.5 md:right-2 flex items-center gap-1">
              {(["low", "normal", "high"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setQuickAddPriority(p)}
                  className={`p-1.5 rounded-lg transition-all ${quickAddPriority === p ? "bg-slate-700 text-white shadow-sm" : "text-slate-600 hover:text-slate-400 hover:bg-slate-800"
                    }`}
                  title={p === "high" ? "Высокий" : p === "normal" ? "Обычный" : "Низкий"}
                >
                  {p === "high" ? (
                    <Zap size={16} className={quickAddPriority === p ? "text-red-400" : ""} />
                  ) : p === "normal" ? (
                    <Sparkles size={16} className={quickAddPriority === p ? "text-blue-400" : ""} />
                  ) : (
                    <Coffee size={16} className={quickAddPriority === p ? "text-emerald-400" : ""} />
                  )}
                </button>
              ))}

              <div className="hidden md:block w-px h-4 bg-slate-700 mx-1" />

              <button
                type="submit"
                disabled={!quickAddTitle.trim()}
                className="hidden md:flex p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                <CornerDownLeft size={16} />
              </button>
            </div>
          </form>
        </div>
      </div>


      <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6">
        <div className="max-w-[1600px] mx-auto pb-20 space-y-4 md:space-y-8">
          {/* Priority Focus Cards */}
          {/* Focus filters */}
          <div className="md:hidden w-px h-6 bg-slate-800 mx-2 shrink-0" />
          <button
            onClick={() => { props.setFilterPriority("high"); onStartFocus(); }}
            className={`hidden md:flex flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0 ${filterPriority === "high"
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "text-slate-500 hover:text-red-400 hover:bg-slate-900"
              }`}
          >
            <Zap size={16} /> Срочно
          </button>
          <button
            onClick={() => { props.setFilterPriority("normal"); onStartFocus(); }}
            className={`hidden md:flex flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0 ${filterPriority === "normal"
              ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
              : "text-slate-500 hover:text-indigo-400 hover:bg-slate-900"
              }`}
          >
            <Sparkles size={16} /> Обычный
          </button>
          <button
            onClick={() => { props.setFilterPriority("low"); onStartFocus(); }}
            className={`hidden md:flex flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0 ${filterPriority === "low"
              ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
              : "text-slate-500 hover:text-teal-400 hover:bg-slate-900"
              }`}
          >
            <Coffee size={16} /> Глубокий
          </button>

          <div className="flex flex-wrap gap-4 md:gap-6 items-start [&>*]:flex-1 [&>*]:min-w-full md:[&>*]:min-w-[350px] [&>*]:max-w-full">
            {(filterProject === "all" || filterProject === "inbox") && (
              <TrelloColumn title="Входящие" count={inboxTasks.length} color="#94a3b8">
                <AnimatePresence mode="popLayout">
                  {inboxTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={() => updateTaskStatus(task.id, "done")}
                      onDelete={() => deleteTask(task.id)}
                      onEditTitle={(t) => editTaskTitle(task.id, t)}
                      onUpdatePriority={(p) => updateTaskPriority(task.id, p)}
                      onUpdateDeadline={(d) => updateTaskDeadline(task.id, d)}
                      onUpdateTags={(tags) => updateTaskTags(task.id, tags)}
                      onArchive={() => archiveTask(task.id)}
                    />
                  ))}
                </AnimatePresence>

                <AddTaskForm
                  projectId="inbox"
                  isActive={addingTaskToProject === "inbox"}
                  onOpen={() => {
                    setAddingTaskToProject("inbox");
                    setNewTaskPriority("normal");
                    setNewTaskDeadline("");
                    setNewTaskTags("");
                  }}
                  onClose={() => setAddingTaskToProject(null)}
                  onSubmit={handleColumnAddTask}
                  title={newTaskTitle}
                  setTitle={setNewTaskTitle}
                  priority={newTaskPriority}
                  setPriority={setNewTaskPriority}
                  deadline={newTaskDeadline}
                  setDeadline={setNewTaskDeadline}
                  tags={newTaskTags}
                  setTags={setNewTaskTags}
                />
              </TrelloColumn>
            )}

            {displayedProjects.map((project) => {
              const projTasks = displayedTasks.filter((t) => t.project_id === project.id);

              return (
                <TrelloColumn
                  key={project.id}
                  title={project.name}
                  count={projTasks.length}
                  color={project.color}
                  priority={project.priority}
                  onCyclePriority={() => updateProjectPriority(project.id, cycleProjectPriority(project.priority))}
                  onDelete={() => deleteProject(project.id)}
                  onEditName={(name) => editProject(project.id, name)}
                >
                  <AnimatePresence mode="popLayout">
                    {projTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        accentColor={project.color}
                        onComplete={() => updateTaskStatus(task.id, "done")}
                        onDelete={() => deleteTask(task.id)}
                        onEditTitle={(t) => editTaskTitle(task.id, t)}
                        onUpdatePriority={(p) => updateTaskPriority(task.id, p)}
                        onUpdateDeadline={(d) => updateTaskDeadline(task.id, d)}
                        onUpdateTags={(tags) => updateTaskTags(task.id, tags)}
                        onArchive={() => archiveTask(task.id)}
                      />
                    ))}
                  </AnimatePresence>

                  <AddTaskForm
                    projectId={project.id}
                    accentColor={project.color}
                    isActive={addingTaskToProject === project.id}
                    onOpen={() => {
                      setAddingTaskToProject(project.id);
                      setNewTaskPriority("normal");
                      setNewTaskDeadline("");
                      setNewTaskTags("");
                    }}
                    onClose={() => setAddingTaskToProject(null)}
                    onSubmit={handleColumnAddTask}
                    title={newTaskTitle}
                    setTitle={setNewTaskTitle}
                    priority={newTaskPriority}
                    setPriority={setNewTaskPriority}
                    deadline={newTaskDeadline}
                    setDeadline={setNewTaskDeadline}
                    tags={newTaskTags}
                    setTags={setNewTaskTags}
                  />
                </TrelloColumn>
              );
            })}
          </div>

          {filterProject === "all" && (
            <div className="pt-4 border-t border-white/5">
              {!isAddingProject ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setIsAddingProject(true); setIsNewProjectFolder(false); }}
                    className="flex-1 py-4 rounded-xl border border-dashed border-slate-800 hover:border-slate-600 hover:bg-slate-900/50 flex items-center justify-center gap-2 text-slate-600 hover:text-slate-300 transition-all"
                  >
                    <Plus size={18} /> Новый проект
                  </button>
                  <button
                    onClick={() => { setIsAddingProject(true); setIsNewProjectFolder(true); }}
                    className="py-4 px-6 rounded-xl border border-dashed border-slate-800 hover:border-amber-700 hover:bg-amber-900/20 flex items-center justify-center gap-2 text-slate-600 hover:text-amber-400 transition-all"
                  >
                    <FolderPlus size={18} /> Папка
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAddProject} className="flex flex-col gap-4 bg-[#0f172a] p-4 rounded-xl border border-white/10">
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      className="flex-1 bg-slate-900 rounded-lg px-4 py-2 text-sm text-white outline-none border border-slate-700 focus:border-slate-500"
                      placeholder="Название проекта"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                    />
                    <button type="button" onClick={() => setIsAddingProject(false)} className="p-2 text-slate-500 hover:text-white">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-mono">Приоритет:</span>
                    <div className="flex bg-[#1e293b] rounded-md p-0.5 border border-slate-700">
                      {(["low", "normal", "high"] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewProjectPriority(p)}
                          className={`px-3 py-1 text-xs rounded transition-colors ${newProjectPriority === p ? "bg-slate-600 text-white" : "text-slate-500 hover:text-slate-300"
                            }`}
                        >
                          {p === "high" ? "Высокий" : p === "normal" ? "Обычный" : "Низкий"}
                        </button>
                      ))}
                    </div>

                    <div className="flex-1" />

                    <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
                      Создать
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}