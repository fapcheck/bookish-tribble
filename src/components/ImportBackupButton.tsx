import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import * as tauri from "../lib/tauri";

export default function ImportBackupButton() {
    const [isBusy, setIsBusy] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || isBusy) return;

        setIsBusy(true);
        try {
            const text = await file.text();

            // Basic validation - check if it's valid JSON with expected structure
            const parsed = JSON.parse(text);
            if (!parsed.version || !Array.isArray(parsed.projects) || !Array.isArray(parsed.tasks)) {
                throw new Error("Invalid backup file format");
            }

            await tauri.import_data(text);
            alert("Backup imported successfully!");
        } catch (err) {
            console.error("Import failed:", err);
            alert(`Import failed: ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
            setIsBusy(false);
            // Reset file input so the same file can be selected again
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
            />
            <button
                onClick={handleClick}
                disabled={isBusy}
                className={`p-2 rounded-lg transition-colors ${isBusy ? "opacity-50 cursor-not-allowed" : "text-slate-600 hover:text-slate-400 hover:bg-slate-900"
                    }`}
                title="Import backup (JSON)"
            >
                <Upload size={18} />
            </button>
        </>
    );
}
