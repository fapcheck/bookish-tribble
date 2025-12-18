import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Target, CheckCircle2, Play, 
  Minimize2, X, Trash2, Heart, MoreVertical, Award, 
  Flame, ChevronDown, Folder, FolderPlus,
  Filter, ArrowLeft, Zap, Coffee, Sparkles,
  SkipForward, Check, Calendar, Tag
} from 'lucide-react';
import { useDatabase, Task } from './hooks/useDatabase';

type View = 'main' | 'focus' | 'stats' | 'settings';
type Priority = 'high' | 'normal' | 'low';

export function App() {
  const {
    tasks,
    projects,
    stats,
    isLoaded,
    addTask,
    addProject,
    deleteProject,
    updateTaskStatus,
    deleteTask,
    minimizeWindow,
    toggleWindow,
    refreshTasks,
  } = useDatabase();

  const [currentView, setCurrentView] = useState<View>('main');
  
  // Projects
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  // Task Adding State (Lifted up)
  const [addingTaskToProject, setAddingTaskToProject] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('normal');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskTags, setNewTaskTags] = useState('');
  
  // Filtering
  const [filterPriority, setFilterPriority] = useState<'all' | Priority>('all');
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  const mainTask = getMainFocusTask(tasks);

  // --- Filtering Logic ---
  let filteredTasks = tasks;

  if (filterPriority !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.priority === filterPriority);
  }

  if (!showCompleted) {
    filteredTasks = filteredTasks.filter(t => t.status !== 'done');
  }

  const inboxTasks = filteredTasks.filter(t => !t.project_id);

  // Focus Queue
  const focusQueue = useMemo(() => {
    let queue = tasks.filter(t => t.status !== 'done');
    return queue.sort((a, b) => {
        const priorityWeight = { high: 3, normal: 2, low: 1 };
        return priorityWeight[b.priority as Priority] - priorityWeight[a.priority as Priority];
    });
  }, [tasks]);


  // --- Handlers ---

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#71717a'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      await addProject(newProjectName, randomColor);
      setNewProjectName('');
      setIsAddingProject(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddTask = async (e: React.FormEvent, projectId: string | null) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const tagsArray = newTaskTags.split(',').map(t => t.trim()).filter(Boolean);
      const deadlineTs = newTaskDeadline ? new Date(newTaskDeadline).getTime() : undefined;

      await addTask(
          newTaskTitle, 
          newTaskPriority, 
          undefined, 
          projectId || undefined,
          deadlineTs,
          tagsArray
      );
      
      setNewTaskTitle('');
      setNewTaskPriority('normal');
      setNewTaskDeadline('');
      setNewTaskTags('');
      setAddingTaskToProject(null);
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.7, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} className="text-slate-500">
          <Heart size={40} fill="currentColor" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-200 selection:bg-indigo-500/30 font-sans flex flex-col h-screen overflow-hidden bg-[#020617]">
      
      {/* --- HEADER --- */}
      <header className="px-6 py-4 flex justify-between items-center bg-[#020617]/90 backdrop-blur-xl border-b border-white/5 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center border border-indigo-500/20">
            <Target className="text-indigo-400" size={18} />
          </div>
          <h1 className="text-lg font-bold text-white">FocusFlow</h1>
        </div>
          
        <div className="flex items-center gap-3">
            <button onClick={() => setFilterPriority(prev => prev === 'all' ? 'high' : prev === 'high' ? 'normal' : 'all')} className={`p-2 rounded-lg transition-colors ${filterPriority !== 'all' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-400 hover:bg-slate-900'}`}>
                <Filter size={18} />
            </button>
            <div className="h-4 w-px bg-white/10 mx-1" />
            <div className="flex items-center gap-1">
              <button onClick={minimizeWindow} className="p-2 hover:bg-slate-800 rounded-lg text-slate-600 hover:text-white transition-colors"><Minimize2 size={16} /></button>
              <button onClick={toggleWindow} className="p-2 hover:bg-red-900/30 rounded-lg text-slate-600 hover:text-red-400 transition-colors"><X size={16} /></button>
            </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 custom-scrollbar">
        <div className="max-w-[1600px] mx-auto pb-20 space-y-8">
            <AnimatePresence mode="wait">
            
            {currentView === 'main' && (
                <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-8">
                    
                    {/* FOCUS HERO */}
                    {focusQueue.length > 0 && filterPriority === 'all' && (
                        <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 rounded-2xl border border-indigo-500/20 p-6 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                                    <Flame size={14} fill="currentColor" /> Следующая задача
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-1">{focusQueue[0].title}</h2>
                                <p className="text-slate-500 text-sm">и ещё {focusQueue.length - 1} в очереди</p>
                            </div>
                            <button onClick={() => setCurrentView('focus')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2">
                                <Play size={18} fill="currentColor" /> Фокус
                            </button>
                        </div>
                    )}

                    {/* GRID CONTAINER FOR PROJECTS - UPDATED to lg:grid-cols-3 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">

                        {/* INBOX COLUMN (Always first) */}
                        <TrelloColumn 
                            title="Входящие" 
                            count={inboxTasks.length} 
                            color="#94a3b8"
                        >
                            <div className="space-y-2">
                                {inboxTasks.map(task => (
                                    <TaskCard key={task.id} task={task} onComplete={() => updateTaskStatus(task.id, 'done')} onDelete={() => deleteTask(task.id)} />
                                ))}
                            </div>
                            
                            <AddTaskForm 
                                projectId="inbox"
                                isActive={addingTaskToProject === "inbox"}
                                onOpen={() => { setAddingTaskToProject("inbox"); setNewTaskPriority('normal'); setNewTaskDeadline(''); setNewTaskTags(''); }}
                                onClose={() => setAddingTaskToProject(null)}
                                onSubmit={handleAddTask}
                                title={newTaskTitle} setTitle={setNewTaskTitle}
                                priority={newTaskPriority} setPriority={setNewTaskPriority}
                                deadline={newTaskDeadline} setDeadline={setNewTaskDeadline}
                                tags={newTaskTags} setTags={setNewTaskTags}
                            />
                        </TrelloColumn>

                        {/* PROJECT COLUMNS */}
                        {projects.map(project => {
                            const projTasks = filteredTasks.filter(t => t.project_id === project.id);
                            return (
                                <TrelloColumn 
                                    key={project.id} 
                                    title={project.name} 
                                    count={projTasks.length} 
                                    color={project.color}
                                    onDelete={() => deleteProject(project.id)}
                                >
                                    <div className="space-y-2">
                                        {projTasks.map(task => (
                                            <TaskCard key={task.id} task={task} accentColor={project.color} onComplete={() => updateTaskStatus(task.id, 'done')} onDelete={() => deleteTask(task.id)} />
                                        ))}
                                    </div>
                                    
                                    <AddTaskForm 
                                        projectId={project.id}
                                        accentColor={project.color}
                                        isActive={addingTaskToProject === project.id}
                                        onOpen={() => { setAddingTaskToProject(project.id); setNewTaskPriority('normal'); setNewTaskDeadline(''); setNewTaskTags(''); }}
                                        onClose={() => setAddingTaskToProject(null)}
                                        onSubmit={handleAddTask}
                                        title={newTaskTitle} setTitle={setNewTaskTitle}
                                        priority={newTaskPriority} setPriority={setNewTaskPriority}
                                        deadline={newTaskDeadline} setDeadline={setNewTaskDeadline}
                                        tags={newTaskTags} setTags={setNewTaskTags}
                                    />
                                </TrelloColumn>
                            );
                        })}

                    </div>

                    {/* NEW PROJECT BUTTON */}
                    <div className="pt-4 border-t border-white/5">
                        {!isAddingProject ? (
                            <button onClick={() => setIsAddingProject(true)} className="w-full py-4 rounded-xl border border-dashed border-slate-800 hover:border-slate-600 hover:bg-slate-900/50 flex items-center justify-center gap-2 text-slate-600 hover:text-slate-300 transition-all">
                                <Plus size={18} /> Создать новый проект
                            </button>
                        ) : (
                            <form onSubmit={handleAddProject} className="flex gap-2 items-center bg-[#0f172a] p-4 rounded-xl border border-white/10 animate-in fade-in">
                                <input autoFocus className="flex-1 bg-slate-900 rounded-lg px-4 py-2 text-sm text-white outline-none border border-slate-700 focus:border-slate-500" placeholder="Название проекта" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
                                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">Создать</button>
                                <button type="button" onClick={() => setIsAddingProject(false)} className="p-2 text-slate-500 hover:text-white"><X size={18} /></button>
                            </form>
                        )}
                    </div>

                </motion.div>
            )}

            {currentView === 'focus' && (
                <FocusSessionView queue={focusQueue} onBack={() => setCurrentView('main')} onCompleteTask={(id) => updateTaskStatus(id, 'done')} />
            )}

            </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function AddTaskForm(props: any) {
    const { 
        projectId, accentColor, isActive, onOpen, onClose, onSubmit,
        title, setTitle, priority, setPriority, deadline, setDeadline, tags, setTags
    } = props;

    if (isActive) {
      return (
         <div className="mt-3 p-3 bg-[#020617]/50 rounded-xl border border-slate-700/50 animate-in fade-in slide-in-from-top-1">
           <form onSubmit={(e) => onSubmit(e, projectId === 'inbox' ? null : projectId)}>
             <input 
               autoFocus
               className="w-full bg-[#1e293b] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none border border-slate-700 focus:border-slate-500 transition-colors mb-3"
               style={accentColor ? { borderColor: `${accentColor}40` } : {}}
               placeholder="Что нужно сделать?"
               value={title}
               onChange={e => setTitle(e.target.value)}
             />
             
             <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Priority */}
                    <div className="flex bg-[#1e293b] rounded-md p-0.5 border border-slate-700">
                        {(['low', 'normal', 'high'] as const).map(p => (
                            <button key={p} type="button" onClick={() => setPriority(p)} className={`p-1.5 rounded ${priority === p ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                                {p === 'high' ? <Zap size={14} className="text-red-400" /> : p === 'normal' ? <Sparkles size={14} className="text-blue-400" /> : <Coffee size={14} className="text-emerald-400" />}
                            </button>
                        ))}
                    </div>

                    {/* Deadline */}
                    <div className="relative group">
                        <input 
                            type="date" 
                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                            onChange={(e) => setDeadline(e.target.value)}
                        />
                        <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${deadline ? 'bg-slate-700 border-slate-600 text-white' : 'bg-[#1e293b] border-slate-700 text-slate-500 hover:text-slate-300'}`}>
                            <Calendar size={14} />
                            {deadline && <span className="text-[10px]">{new Date(deadline).toLocaleDateString()}</span>}
                        </div>
                    </div>

                    {/* Tags Input */}
                    <div className="flex items-center gap-2 bg-[#1e293b] px-2 py-1.5 rounded-md border border-slate-700 flex-1 min-w-[100px]">
                        <Tag size={14} className="text-slate-500 shrink-0" />
                        <input 
                            className="bg-transparent outline-none text-xs text-white placeholder-slate-600 w-full"
                            placeholder="Теги..."
                            value={tags}
                            onChange={e => setTags(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-white/5 pt-2">
                  <button type="button" onClick={onClose} className="text-xs text-slate-500 hover:text-white transition-colors px-3 py-1.5">
                    Отмена
                  </button>
                  <button type="submit" className="text-xs px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors shadow-lg shadow-indigo-500/20">
                    Сохранить
                  </button>
                </div>
             </div>
           </form>
         </div>
      );
    }
    return (
       <div className="mt-3 pt-2 border-t border-white/5">
         <button 
           onClick={onOpen} 
           className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm w-full transition-colors py-1.5 px-2 rounded-lg hover:bg-white/5"
         >
           <Plus size={16} /> Добавить задачу
         </button>
       </div>
    );
}

function TrelloColumn({ title, count, children, color, onDelete }: any) {
  return (
    <div className="bg-[#0f172a]/80 rounded-2xl border border-white/5 p-4 shadow-xl flex flex-col h-fit">
       {/* Column Header */}
       <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}40` }} />
             <h2 className="font-bold text-lg text-slate-200">{title}</h2>
             <span className="bg-slate-800 text-slate-500 px-2 py-0.5 rounded text-xs font-mono">{count}</span>
          </div>
          {onDelete && (
             <button onClick={onDelete} className="text-slate-600 hover:text-red-400 p-1.5 hover:bg-slate-800 rounded transition-colors">
                <MoreVertical size={16} />
             </button>
          )}
       </div>
       
       <div className="flex-1">
          {children}
       </div>
    </div>
  );
}

function TaskCard({ task, onComplete, onDelete, accentColor }: any) {
  const priorityStyles = {
    high: 'text-red-400 bg-red-950/30 border-red-900/30',
    normal: 'text-blue-400 bg-blue-950/30 border-blue-900/30',
    low: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/30'
  };
  const pStyle = priorityStyles[task.priority as Priority] || priorityStyles.normal;

  return (
    <motion.div layoutId={task.id} className={`group bg-[#1e293b] hover:bg-[#283548] p-3 rounded-xl border border-slate-700/50 hover:border-slate-500 transition-all relative overflow-hidden shadow-sm`}>
       <div className="flex items-start gap-3">
          <button onClick={onComplete} className="mt-0.5 w-5 h-5 rounded-full border border-slate-500 flex items-center justify-center hover:border-emerald-400 hover:bg-emerald-500/20 transition-all shrink-0 text-slate-900">
            <Check size={12} />
          </button>
          <div className="flex-1 min-w-0">
             <h4 className="text-sm font-medium leading-snug mb-1.5 text-slate-200">{task.title}</h4>
             
             {/* Tags & Meta */}
             <div className="flex flex-wrap gap-2 items-center">
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${pStyle} font-medium flex items-center gap-1`}>
                  {task.priority === 'high' && <Zap size={8} />}
                  {task.priority === 'high' ? 'High' : task.priority === 'normal' ? 'Normal' : 'Low'}
                </span>
                
                {task.deadline && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${new Date(task.deadline) < new Date() ? 'bg-red-900/20 text-red-400 border-red-900/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        <Calendar size={8} />
                        {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                )}

                {task.tags && task.tags.map((tag: string, i: number) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800/50 text-slate-400 flex items-center gap-1">
                        <Tag size={8} /> {tag}
                    </span>
                ))}
             </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1">
             <Trash2 size={14} />
          </button>
       </div>
       {accentColor && <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full opacity-70" style={{ backgroundColor: accentColor }} />}
    </motion.div>
  );
}

function FocusSessionView({ queue, onBack, onCompleteTask }: { queue: Task[], onBack: () => void, onCompleteTask: (id: string) => void }) {
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const currentTask = queue.find(t => !skippedIds.includes(t.id));
  
  const handleSkip = () => currentTask && setSkippedIds([...skippedIds, currentTask.id]);
  if (!currentTask && queue.length > 0 && skippedIds.length > 0) setSkippedIds([]);

  if (queue.length === 0) {
      return (
        <div className="absolute inset-0 z-50 bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
            <CheckCircle2 size={64} className="text-emerald-500 mb-6" />
            <h2 className="text-3xl font-bold text-white mb-2">Всё готово!</h2>
            <button onClick={onBack} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors">Вернуться</button>
        </div>
      )
  }

  return (
    <div className="absolute inset-0 z-50 bg-[#020617] flex flex-col items-center justify-center p-6">
       <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center">
            <button onClick={onBack} className="p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-white transition-colors border border-white/5"><ArrowLeft size={20} /></button>
            <div className="text-slate-500 font-mono text-sm">Осталось: <span className="text-white font-bold">{queue.length}</span></div>
       </div>
       {currentTask && (
           <div className="w-full max-w-xl text-center">
                <div className="mb-12">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-8 border border-indigo-500/20">В ФОКУСЕ</div>
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">{currentTask.title}</h2>
                    <div className="flex items-center justify-center gap-3">
                        {currentTask.deadline && (
                            <div className="flex items-center gap-2 text-red-400 font-mono text-sm bg-red-950/30 px-3 py-1 rounded-full">
                                <Calendar size={14} /> {new Date(currentTask.deadline).toLocaleDateString()}
                            </div>
                        )}
                        {currentTask.tags && currentTask.tags.length > 0 && (
                            <div className="flex items-center gap-2 text-slate-400 font-mono text-sm bg-slate-800 px-3 py-1 rounded-full">
                                <Tag size={14} /> {currentTask.tags.join(', ')}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-4 justify-center items-center">
                    <button onClick={handleSkip} className="px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all font-medium flex items-center gap-2"><SkipForward size={20} /> Пропустить</button>
                    <button onClick={() => onCompleteTask(currentTask.id)} className="px-10 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all font-bold text-lg flex items-center gap-2"><Check size={24} strokeWidth={3} /> Готово</button>
                </div>
           </div>
       )}
    </div>
  );
}

function getMainFocusTask(tasks: Task[]): Task | null {
  const activeTasks = tasks.filter(t => t.status !== 'done');
  if (activeTasks.length === 0) return null;
  activeTasks.sort((a, b) => {
    const priorityWeight = { high: 3, normal: 2, low: 1 };
    return priorityWeight[b.priority as Priority] - priorityWeight[a.priority as Priority];
  });
  return activeTasks[0];
}

export default App;