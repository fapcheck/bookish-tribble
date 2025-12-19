import { useMemo, useState } from "react";
import { Coffee, CornerDownLeft, Flame, Inbox, Layers, Play, Plus, Sparkles, Zap, X } from "lucide-react";
import type { Priority } from "../types/ui";
import type { Project, Task } from "../hooks/useDatabase";
import AddTaskForm from "../components/AddTaskForm";
import TaskCard from "../components/TaskCard";
import TrelloColumn from "../components/TrelloColumn";
import { sortTasksForFocus } from "../utils/tasks";

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
  ) => Promise<any>;
  editTaskTitle: (id: string, title: string) => Promise<void>;
  updateTaskPriority: (id: string, priority: Priority) => Promise<void>;
  updateTaskDeadline: (id: string, deadline: number | null) => Promise<void>;
  updateTaskStatus: (id: string, status: "todo" | "doing" | "done") => Promise<void>;
  updateTaskTags: (id: string, tags: string[]) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  addProject: (name: string, color: string, priority: Priority) => Promise<any>;
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

    addProject,
    editProject,
    updateProjectPriority,
    deleteProject,

    onStartFocus,
  } = props;

  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectPriority, setNewProjectPriority] = useState<Priority>("normal");

  const [addingTaskToProject, setAddingTaskToProject] = useState<string | null>(null);

  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddPriority, setQuickAddPriority] = useState<Priority>("normal");

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("normal");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [newTaskTags, setNewTaskTags] = useState("");

  const displayedTasks = useMemo(() => {
    let list = tasks;
    if (filterPriority !== "all") list = list.filter((t) => t.priority === filterPriority);
    if (!showCompleted) list = list.filter((t) => t.status !== "done");
    return list;
  }, [tasks, filterPriority, showCompleted]);

  const inboxTasks = useMemo(() => displayedTasks.filter((t) => !t.project_id), [displayedTasks]);

  const displayedProjects = useMemo(() => {
    if (filterProject !== "all" && filterProject !== "inbox") return projects.filter((p) => p.id === filterProject);
    return projects;
  }, [projects, filterProject]);

  const focusQueue = useMemo(() => {
    let queue = tasks.filter((t) => t.status !== "done");
    if (filterProject !== "all") {
      if (filterProject === "inbox") queue = queue.filter((t) => !t.project_id);
      else queue = queue.filter((t) => t.project_id === filterProject);
    }
    return sortTasksForFocus(queue);
  }, [tasks, filterProject]);

  const currentProjectName = useMemo(() => {
    if (filterProject === "all" || filterProject === "inbox") return "Входящие";
    const p = projects.find((p) => p.id === filterProject);
    return p ? p.name : "Входящие";
  }, [filterProject, projects]);

  const cycleProjectPriority = (p: Priority): Priority => (p === "low" ? "normal" : p === "normal" ? "high" : "low");

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#71717a"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    await addProject(newProjectName, randomColor, newProjectPriority);

    setNewProjectName("");
    setNewProjectPriority("normal");
    setIsAddingProject(false);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTitle.trim()) return;

    let targetProjectId: string | undefined = undefined;
    if (filterProject !== "all" && filterProject !== "inbox") targetProjectId = filterProject;

    await addTask(quickAddTitle, quickAddPriority, undefined, targetProjectId);
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
      <div className="px-6 py-3 border-b border-white/5 flex gap-2 overflow-x-auto bg-[#020617]">
        <button
          onClick={() => setFilterProject("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 border shrink-0 ${
            filterProject === "all"
              ? "bg-indigo-600 border-indigo-500 text-white"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
          }`}
        >
          <Layers size={12} /> Все
        </button>

        <button
          onClick={() => setFilterProject("inbox")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 border shrink-0 ${
            filterProject === "inbox"
              ? "bg-slate-700 border-slate-600 text-white"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
          }`}
        >
          <Inbox size={12} /> Входящие
        </button>

        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => setFilterProject(p.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 border whitespace-nowrap shrink-0 ${
              filterProject === p.id ? "bg-slate-800 text-white border-slate-600" : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
            }`}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
            {p.priority === "high" && <Zap size={10} className="text-red-400" />}
            {p.priority === "normal" && <Sparkles size={10} className="text-blue-400" />}
            {p.priority === "low" && <Coffee size={10} className="text-emerald-400" />}
          </button>
        ))}
      </div>

      <div className="px-6 py-4 bg-[#0f172a]/50 border-b border-white/5">
        <div className="max-w-[1600px] mx-auto">
          <form onSubmit={handleQuickAdd} className="relative flex items-center group">
            <div className="absolute left-4 text-slate-500">
              <Plus size={20} />
            </div>

            <input
              value={quickAddTitle}
              onChange={(e) => setQuickAddTitle(e.target.value)}
              placeholder={`Быстро добавить задачу в ${currentProjectName}...`}
              className="w-full bg-slate-900/80 border border-slate-700 hover:border-slate-600 focus:border-indigo-500 rounded-xl py-3 pl-12 pr-32 text-slate-200 placeholder-slate-500 outline-none transition-all shadow-sm"
            />

            <div className="absolute right-2 flex items-center gap-1">
              {(["low", "normal", "high"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setQuickAddPriority(p)}
                  className={`p-1.5 rounded-lg transition-all ${
                    quickAddPriority === p ? "bg-slate-700 text-white shadow-sm" : "text-slate-600 hover:text-slate-400 hover:bg-slate-800"
                  }`}
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

              <div className="w-px h-4 bg-slate-700 mx-1" />

              <button type="submit" className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">
                <CornerDownLeft size={16} />
              </button>
            </div>
          </form>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
        <div className="max-w-[1600px] mx-auto pb-20 space-y-8">
          {focusQueue.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 rounded-2xl border border-indigo-500/20 p-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                  <Flame size={14} /> Следующая задача
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">{focusQueue[0].title}</h2>
                <p className="text-slate-500 text-sm">и ещё {Math.max(0, focusQueue.length - 1)} в очереди</p>
              </div>
              <button
                onClick={onStartFocus}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
              >
                <Play size={18} /> Фокус
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {(filterProject === "all" || filterProject === "inbox") && (
              <TrelloColumn title="Входящие" count={inboxTasks.length} color="#94a3b8">
                <div className="space-y-2">
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
                    />
                  ))}
                </div>

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
                  <div className="space-y-2">
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
                      />
                    ))}
                  </div>

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
                <button
                  onClick={() => setIsAddingProject(true)}
                  className="w-full py-4 rounded-xl border border-dashed border-slate-800 hover:border-slate-600 hover:bg-slate-900/50 flex items-center justify-center gap-2 text-slate-600 hover:text-slate-300 transition-all"
                >
                  <Plus size={18} /> Создать новый проект
                </button>
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
                          className={`px-3 py-1 text-xs rounded transition-colors ${
                            newProjectPriority === p ? "bg-slate-600 text-white" : "text-slate-500 hover:text-slate-300"
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