import React, { useMemo, useState } from "react";
import { useDatabase } from "./hooks/useDatabase";
import type { Priority, View } from "./types/ui";

import TopTabs from "./components/TopTabs";
import ReminderToast from "./components/ReminderToast";

import MainView from "./views/MainView";
import CalendarView from "./views/CalendarView";
import StatsView from "./views/StatsView";
import SettingsView from "./views/SettingsView";
import FocusView from "./views/FocusView";

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
    deleteTask,

    addProject,
    editProject,
    updateProjectPriority,
    deleteProject,

    minimizeWindow,
    toggleWindow,
  } = useDatabase();

  const [view, setView] = useState<View>("main");

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

      <TopTabs view={view} setView={setView} minimizeWindow={minimizeWindow} toggleWindow={toggleWindow} />

      {/* Content */}
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
            deleteTask={deleteTask}
            addProject={addProject}
            editProject={editProject}
            updateProjectPriority={updateProjectPriority}
            deleteProject={deleteProject}
            onStartFocus={() => setView("focus")}
          />
        )}

        {view === "calendar" && <CalendarView tasks={tasks} />}

        {view === "stats" && (stats ? <StatsView stats={stats} /> : null)}

        {view === "settings" && (settings ? <SettingsView settings={settings} onSave={saveSettings} /> : null)}

        {view === "focus" && (
          <FocusView
            queue={focusQueue}
            onBack={() => setView("main")}
            onCompleteTask={(id) => updateTaskStatus(id, "done")}
          />
        )}
      </div>
    </div>
  );
}