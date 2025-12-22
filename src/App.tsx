import { useMemo, useState } from "react";
import { useDatabase } from "./hooks/useDatabase";
import type { Priority } from "./lib/tauri";
import type { View } from "./types/ui";

import TopTabs from "./components/TopTabs";
import BottomNav from "./components/BottomNav";
import ReminderToast from "./components/ReminderToast";

import MobileFAB from "./components/MobileFAB";
import MobileAddTaskModal from "./components/MobileAddTaskModal";

import MainView from "./views/MainView";
import CalendarView from "./views/CalendarView";
import StatsView from "./views/StatsView";
import SettingsView from "./views/SettingsView";
import FocusView from "./views/FocusView";
import WeeklyReviewView from "./views/WeeklyReviewView";
import NotesView from "./views/NotesView";
import { WalletView } from "./views/WalletView";

import { sortTasksForFocus } from "./utils/tasks";

export default function App() {
  const {
    tasks,
    projects,
    stats,
    settings,
    isLoaded,

    saveSettings,

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

    importData,

    finance,
    addTransaction,
    deleteTransaction,
    addDebt,
    payDebt,
    deleteDebt,
  } = useDatabase();

  const [view, setView] = useState<View>("main");
  const [showMobileAdd, setShowMobileAdd] = useState(false);

  const [filterPriority, setFilterPriority] = useState<"all" | Priority>("all");
  const [filterProject, setFilterProject] = useState<"all" | "inbox" | string>("all");
  const [showCompleted, setShowCompleted] = useState(false);

  const focusQueue = useMemo(() => {
    let queue = tasks.filter((t) => t.status !== "done");

    if (filterProject !== "all") {
      if (filterProject === "inbox") queue = queue.filter((t) => !t.project_id);
      else queue = queue.filter((t) => t.project_id === filterProject);
    }

    return sortTasksForFocus(queue);
  }, [tasks, filterProject]);

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col h-screen overflow-hidden">
      <ReminderToast onDoneTask={(id) => updateTaskStatus(id, "done")} />

      <TopTabs view={view} setView={setView} streak={stats?.current_streak ?? 0} />

      <div className="flex-1 overflow-hidden pb-[70px] md:pb-0">
        {view === "main" && (
          <MainView
            tasks={tasks}
            projects={projects}
            isLoaded={isLoaded}
            filterPriority={filterPriority}
            setFilterPriority={setFilterPriority}
            filterProject={filterProject}
            setFilterProject={setFilterProject}
            showCompleted={showCompleted}
            setShowCompleted={setShowCompleted}
            addTask={addTask}
            editTaskTitle={editTaskTitle}
            updateTaskPriority={updateTaskPriority}
            updateTaskDeadline={updateTaskDeadline}
            updateTaskStatus={updateTaskStatus}
            updateTaskTags={updateTaskTags}
            deleteTask={deleteTask}
            archiveTask={archiveTask}
            addProject={addProject}
            editProject={editProject}
            updateProjectPriority={updateProjectPriority}
            deleteProject={deleteProject}
            onStartFocus={() => setView("focus")}
          />
        )}

        {view === "calendar" && <CalendarView tasks={tasks} />}

        {view === "stats" && stats && <StatsView stats={stats} />}

        {view === "settings" && settings && <SettingsView settings={settings} onSave={saveSettings} setView={setView} tasks={tasks} projects={projects} onImport={importData} />}

        {view === "review" && <WeeklyReviewView />}

        {view === "notes" && (
          <NotesView
            projects={projects}
            addProject={addProject}
            deleteProject={deleteProject}
            editProject={editProject}
          />
        )}

        {view === "wallet" && (
          <WalletView
            finance={finance}
            addTransaction={addTransaction}
            deleteTransaction={deleteTransaction}
            addDebt={addDebt}
            payDebt={payDebt}
            deleteDebt={deleteDebt}
          />
        )}

        {view === "focus" && (
          <FocusView
            queue={focusQueue}
            onBack={() => setView("main")}
            onCompleteTask={(id) => updateTaskStatus(id, "done")}
          />
        )}
      </div>

      <BottomNav view={view} setView={setView} />

      {/* Mobile Quick Add */}
      {view === "main" && (
        <MobileFAB onClick={() => setShowMobileAdd(true)} />
      )}

      <MobileAddTaskModal
        isOpen={showMobileAdd}
        onClose={() => setShowMobileAdd(false)}
        onAdd={async (title, priority, deadline, tags) => {
          await addTask(title, priority, undefined, undefined, deadline, tags);
        }}
      />
    </div>
  );
}