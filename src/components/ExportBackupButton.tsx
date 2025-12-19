import { useState } from "react";
import { Download } from "lucide-react";
import * as tauri from "../lib/tauri";

function safeStamp(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(
    d.getMinutes()
  )}-${pad(d.getSeconds())}`;
}

export default function ExportBackupButton() {
  const [isBusy, setIsBusy] = useState(false);

  const onExport = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const bundle = await tauri.export_data();
      const json = JSON.stringify(bundle, null, 2);

      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `focusflow-backup-${safeStamp(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
      alert("Export failed. Check DevTools console for details.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <button
      onClick={onExport}
      disabled={isBusy}
      className={`p-2 rounded-lg transition-colors ${
        isBusy ? "opacity-50 cursor-not-allowed" : "text-slate-600 hover:text-slate-400 hover:bg-slate-900"
      }`}
      title="Export backup (JSON)"
    >
      <Download size={18} />
    </button>
  );
}