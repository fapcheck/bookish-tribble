import { useState, useRef } from "react";
import { Upload, Check, AlertCircle } from "lucide-react";
import * as tauri from "../lib/tauri";

type ImportStatus = "idle" | "busy" | "success" | "error";

export default function ImportBackupButton() {
    const [status, setStatus] = useState<ImportStatus>("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || status === "busy") return;

        setStatus("busy");
        setErrorMessage("");

        try {
            const text = await file.text();

            // Basic validation - check if it's valid JSON with expected structure
            const parsed = JSON.parse(text);
            if (!parsed.version || !Array.isArray(parsed.projects) || !Array.isArray(parsed.tasks)) {
                throw new Error("Invalid backup file format");
            }

            await tauri.import_data(text);
            setStatus("success");

            // Reset to idle after 3 seconds
            setTimeout(() => setStatus("idle"), 3000);
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : "Unknown error");
            setStatus("error");

            // Reset to idle after 5 seconds
            setTimeout(() => {
                setStatus("idle");
                setErrorMessage("");
            }, 5000);
        } finally {
            // Reset file input so the same file can be selected again
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <div className="relative">
            <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
            />
            <button
                onClick={handleClick}
                disabled={status === "busy"}
                className={`p-2 rounded-lg transition-colors ${status === "busy" ? "opacity-50 cursor-not-allowed" :
                        status === "success" ? "text-green-400 bg-green-900/30" :
                            status === "error" ? "text-red-400 bg-red-900/30" :
                                "text-slate-600 hover:text-slate-400 hover:bg-slate-900"
                    }`}
                title={
                    status === "success" ? "Backup imported successfully!" :
                        status === "error" ? `Import failed: ${errorMessage}` :
                            "Import backup (JSON)"
                }
            >
                {status === "success" ? <Check size={18} /> :
                    status === "error" ? <AlertCircle size={18} /> :
                        <Upload size={18} />}
            </button>

            {/* Tooltip for error */}
            {status === "error" && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-red-900/90 text-red-200 text-xs rounded-lg whitespace-nowrap z-50 border border-red-700">
                    {errorMessage || "Import failed"}
                </div>
            )}

            {/* Tooltip for success */}
            {status === "success" && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-green-900/90 text-green-200 text-xs rounded-lg whitespace-nowrap z-50 border border-green-700">
                    Backup imported!
                </div>
            )}
        </div>
    );
}
