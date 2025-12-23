import { useMemo, useState } from "react";
import { useDatabase } from "./hooks/useDatabase";
import type { Priority } from "./lib/tauri";
import type { View } from "./types/ui";

import TopTabs from "./components/TopTabs";
import MobileHeader from "./components/MobileHeader";
import SwipeHandler from "./components/SwipeHandler";
import ReminderToast from "./components/ReminderToast";

import MobileFAB from "./components/MobileFAB";
import MobileAddTaskModal from "./components/MobileAddTaskModal";
import MobileAddProjectModal from "./components/MobileAddProjectModal";
import MobileSidebar, { type MobileSection } from "./components/MobileSidebar";

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
  const [showMobileAddProject, setShowMobileAddProject] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<MobileSection>("today");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [filterPriority, setFilterPriority] = useState<"all" | Priority>("all");
  const [filterProject, setFilterProject] = useState<"all" | "inbox" | string>("all");
  const [showCompleted, setShowCompleted] = useState(false);

  // Sync mobileSection with filterProject
  const handleSelectSection = (section: MobileSection) => {
    setMobileSection(section);
    setSelectedProjectId(null);
    if (section === "inbox") {
      setFilterProject("inbox");
    } else if (section === "logbook") {
      setShowCompleted(true);
      setFilterProject("all");
    } else {
      setShowCompleted(false);
      setFilterProject("all");
    }
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setFilterProject(projectId);
  };

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
    <div className="min-h-screen bg-[#1c1c1e] text-slate-200 flex flex-col h-screen overflow-hidden">
      <ReminderToast onDoneTask={(id) => updateTaskStatus(id, "done")} />

      <TopTabs view={view} setView={setView} streak={stats?.current_streak ?? 0} />

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentSection={mobileSection}
        onSelectSection={handleSelectSection}
        projects={projects}
        onSelectProject={handleSelectProject}
        selectedProjectId={selectedProjectId}
        onAddProject={() => {
          setSidebarOpen(false);
          setShowMobileAddProject(true);
        }}
        setView={setView}
        currentView={view}
      />

      {/* Mobile Header */}
      <MobileHeader
        title={view === "main" ? (selectedProjectId ? projects.find(p => p.id === selectedProjectId)?.name ?? "Tasks" : mobileSection === "today" ? "Today" : mobileSection === "inbox" ? "Inbox" : mobileSection === "upcoming" ? "Upcoming" : mobileSection === "logbook" ? "Logbook" : "Tasks") : view === "calendar" ? "Calendar" : view === "notes" ? "Notes" : view === "wallet" ? "Finance" : view === "settings" ? "Settings" : "Tasks"}
        onOpenSidebar={() => setSidebarOpen(true)}
        view={view}
      />

      <SwipeHandler onSwipeRight={() => setSidebarOpen(true)}>
        <div className="flex-1 overflow-hidden">
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
              mobileSection={mobileSection}
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
      </SwipeHandler>

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

      <MobileAddProjectModal
        isOpen={showMobileAddProject}
        onClose={() => setShowMobileAddProject(false)}
        onAdd={async (name, color) => {
          await addProject(name, color, "normal");
        }}
      />
    </div>
  );
}
