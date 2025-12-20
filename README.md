# FocusFlow

A beautiful, feature-rich task manager and productivity app built with Tauri + React + TypeScript.

## ✨ Features

- **📋 Task Management** - Create, organize, and track tasks with priorities, deadlines, and tags
- **📁 Projects & Folders** - Organize tasks into projects; notes into folders
- **📝 Notes** - Expandable notes with inline editing
- **📅 Calendar View** - Visualize tasks by date
- **💰 Finance Tracker** - Track transactions and debts (in ₽)
- **🔔 Reminders** - Get notified about upcoming tasks
- **☁️ Cloud Sync** - Sync data across devices via Supabase
- **📊 Statistics** - Track your productivity with streaks and completion stats
- **🎯 Focus Mode** - Distraction-free task completion
- **📱 Cross-platform** - Windows, macOS, Linux, Android, iOS

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

### Android Build

```bash
npm run tauri android build
```

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Rust, Tauri 2.0
- **Database**: SQLite (local), Supabase (cloud sync)
- **Icons**: Lucide React

## 📁 Project Structure

```
src/
├── components/     # Reusable UI components
├── hooks/          # React hooks (useDatabase)
├── lib/            # Tauri API wrappers, Supabase client
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── views/          # Page components

src-tauri/
├── src/
│   ├── lib.rs      # Tauri commands
│   ├── database.rs # SQLite operations
│   └── models.rs   # Data models
```

## 📄 License

MIT
