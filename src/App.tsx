import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Target, Clock, CheckCircle2, Play, Pause, Square,
  Settings, BarChart3, Flame, Award, Minimize2, X, Zap
} from 'lucide-react';
import { useDatabase, Task } from './hooks/useDatabase';

type View = 'main' | 'focus' | 'stats' | 'settings';

export function App() {
  const {
    tasks,
    stats,
    isLoaded,
    addTask,
    updateTaskStatus,
    deleteTask,
    startFocusSession,
    completeFocusSession,
    toggleWindow,
    minimizeWindow,
  } = useDatabase();

  const [currentView, setCurrentView] = useState<View>('main');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [newTaskDescription, setNewTaskDescription] = useState('');

  const mainTask = getMainFocusTask(tasks);
  const upcomingTasks = getUpcomingTasks(tasks, 4);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      await addTask(newTaskTitle, newTaskPriority, newTaskDescription || undefined);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskPriority('normal');
      setShowAddTask(false);
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-blue-400"
        >
          <Clock size={32} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Заголовок */}
      <header className="p-6 border-b border-gray-700/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Target className="text-blue-400" size={20} />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              FocusFlow
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {stats && (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700">
                <Award className="text-yellow-400" size={16} />
                <span className="text-sm font-medium">{stats.level}</span>
              </div>
            )}
            
            <button 
              onClick={() => setCurrentView('stats')}
              className="p-2 glass hover:bg-white/10 rounded-lg transition-colors"
            >
              <BarChart3 size={20} />
            </button>
            
            <button 
              onClick={() => setCurrentView('settings')}
              className="p-2 glass hover:bg-white/10 rounded-lg transition-colors"
            >
              <Settings size={20} />
            </button>
            
            <button 
              onClick={minimizeWindow}
              className="p-2 glass hover:bg-white/10 rounded-lg transition-colors"
            >
              <Minimize2 size={20} />
            </button>
            
            <button 
              onClick={toggleWindow}
              className="p-2 glass hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {currentView === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Главная задача */}
              {mainTask ? (
                <div className="relative">
                  <button
                    onClick={() => setCurrentView('focus')}
                    className="w-full group"
                  >
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-8 rounded-2xl border-2 border-blue-500/30 backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-blue-400">
                          <Flame size={20} />
                          <span className="text-sm font-medium uppercase tracking-wider">
                            Главная задача
                          </span>
                        </div>
                        <Play className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
                      </div>
                      
                      <h2 className="text-3xl font-bold mb-2">{mainTask.title}</h2>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-300">
                        <span className={`px-2 py-1 rounded ${
                          mainTask.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                          mainTask.priority === 'normal' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {mainTask.priority === 'high' ? 'Высокий' : 
                           mainTask.priority === 'normal' ? 'Обычный' : 'Низкий'}
                        </span>
                        
                        {mainTask.description && (
                          <span className="text-gray-400">
                            {mainTask.description}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  </button>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-12 rounded-2xl border border-green-500/30 backdrop-blur-sm text-center">
                  <CheckCircle2 className="mx-auto text-green-400 mb-4" size={48} />
                  <h2 className="text-2xl font-bold mb-2">Все задачи выполнены!</h2>
                  <p className="text-gray-300">Отличная работа. Можете отдохнуть или добавить новые задачи.</p>
                </div>
              )}

              {/* Быстрое добавление задачи */}
              <div className="relative">
                {!showAddTask ? (
                  <button
                    onClick={() => setShowAddTask(true)}
                    className="w-full glass p-4 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 transition-colors text-gray-300 hover:text-white border border-white/10"
                  >
                    <Plus size={20} />
                    <span>Добавить задачу</span>
                  </button>
                ) : (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleAddTask}
                    className="glass p-6 rounded-xl border border-white/10 backdrop-blur-sm"
                  >
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Что нужно сделать?"
                      className="w-full bg-transparent text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 outline-none mb-4 placeholder-gray-400"
                      autoFocus
                    />
                    
                    <textarea
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      placeholder="Описание (необязательно)"
                      className="w-full bg-transparent text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 outline-none resize-none mb-4 placeholder-gray-400"
                      rows={2}
                    />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setNewTaskPriority('high')}
                          className={`p-2 rounded-lg transition-colors ${
                            newTaskPriority === 'high' 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                              : 'hover:bg-white/10 text-gray-400'
                          }`}
                        >
                          <Zap size={16} className="mr-1" />
                          Высокий
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setNewTaskPriority('normal')}
                          className={`p-2 rounded-lg transition-colors ${
                            newTaskPriority === 'normal' 
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                              : 'hover:bg-white/10 text-gray-400'
                          }`}
                        >
                          Обычный
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setNewTaskPriority('low')}
                          className={`p-2 rounded-lg transition-colors ${
                            newTaskPriority === 'low' 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                              : 'hover:bg-white/10 text-gray-400'
                          }`}
                        >
                          Низкий
                        </button>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddTask(false);
                            setNewTaskTitle('');
                            setNewTaskDescription('');
                            setNewTaskPriority('normal');
                          }}
                          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        >
                          Отмена
                        </button>
                        <button
                          type="submit"
                          disabled={!newTaskTitle.trim()}
                          className="px-6 py-2 bg-blue-500/20 hover:bg-blue-500 text-blue-400 rounded-lg transition-colors disabled:opacity-50 border border-blue-500/30"
                        >
                          Добавить
                        </button>
                      </div>
                    </div>
                  </motion.form>
                )}
              </div>

              {/* Список задач */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Активные задачи</h3>
                <div className="space-y-2">
                  {upcomingTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="glass p-4 rounded-xl flex items-center gap-4 group hover:bg-white/5 transition-colors border border-white/10 backdrop-blur-sm"
                    >
                      <button
                        onClick={() => updateTaskStatus(task.id, 'done')}
                        className="w-6 h-6 rounded-full border-2 border-gray-500 flex items-center justify-center hover:border-green-400 hover:bg-green-400/10 transition-colors"
                      >
                        {task.status === 'done' && <CheckCircle2 className="text-green-400" size={14} />}
                      </button>
                      
                      <div className="flex-1">
                        <h4 className={`font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-white'}`}>
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-gray-400 text-sm mt-1">{task.description}</p>
                        )}
                      </div>
                      
                      <div className={`px-2 py-1 rounded text-xs ${
                        task.priority === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        task.priority === 'normal' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        'bg-green-500/20 text-green-400 border border-green-500/30'
                      }`}>
                        {task.priority === 'high' ? 'Высокий' : 
                         task.priority === 'normal' ? 'Обычный' : 'Низкий'}
                      </div>
                      
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-opacity p-2"
                      >
                        <X size={16} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Статистика */}
              {stats && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="glass p-4 rounded-xl text-center border border-white/10 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-blue-400">{stats.completed_tasks}</div>
                    <div className="text-sm text-gray-400">Выполнено сегодня</div>
                  </div>
                  <div className="glass p-4 rounded-xl text-center border border-white/10 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-green-400">{stats.current_streak}</div>
                    <div className="text-sm text-gray-400">Дней подряд</div>
                  </div>
                  <div className="glass p-4 rounded-xl text-center border border-white/10 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-yellow-400">{stats.points}</div>
                    <div className="text-sm text-gray-400">Очков</div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentView === 'focus' && (
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold mb-4">Режим фокуса</h2>
              <p className="text-gray-400 mb-8">Скоро будет реализован</p>
              <button
                onClick={() => setCurrentView('main')}
                className="glass px-6 py-3 rounded-lg hover:bg-white/10 transition-colors border border-white/10"
              >
                Вернуться назад
              </button>
            </div>
          )}

          {currentView === 'stats' && (
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold mb-4">Статистика</h2>
              <p className="text-gray-400 mb-8">Скоро будет реализована</p>
              <button
                onClick={() => setCurrentView('main')}
                className="glass px-6 py-3 rounded-lg hover:bg-white/10 transition-colors border border-white/10"
              >
                Вернуться назад
              </button>
            </div>
          )}

          {currentView === 'settings' && (
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold mb-4">Настройки</h2>
              <p className="text-gray-400 mb-8">Скоро будут реализованы</p>
              <button
                onClick={() => setCurrentView('main')}
                className="glass px-6 py-3 rounded-lg hover:bg-white/10 transition-colors border border-white/10"
              >
                Вернуться назад
              </button>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Вспомогательные функции
function getMainFocusTask(tasks: Task[]): Task | null {
  const activeTasks = tasks.filter(t => t.status !== 'done');
  
  if (activeTasks.length === 0) return null;
  
  // Сортируем по приоритету
  activeTasks.sort((a, b) => {
    const priorityWeight = { high: 3, normal: 2, low: 1 };
    return priorityWeight[b.priority] - priorityWeight[a.priority];
  });
  
  return activeTasks[0];
}

function getUpcomingTasks(tasks: Task[], limit: number = 5): Task[] {
  const activeTasks = tasks.filter(t => t.status !== 'done');
  
  return activeTasks
    .sort((a, b) => {
      const priorityWeight = { high: 3, normal: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    })
    .slice(0, limit);
}

export default App;