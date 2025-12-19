param(
  [switch]$ResetDb = $false
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "== FocusFlow dev reset =="

# Kill common locked processes
Write-Host "Killing running processes..."
taskkill /F /IM focusflow-tauri.exe | Out-Null
taskkill /F /IM tauri.exe | Out-Null
taskkill /F /IM cargo.exe | Out-Null
taskkill /F /IM node.exe | Out-Null

Start-Sleep -Milliseconds 300

# Optional: delete DB (we know your path from db_health output, but keep it generic)
# We'll search typical Tauri app data paths for com.focusflow.app\focusflow.db
if ($ResetDb) {
  Write-Host "ResetDb enabled: deleting focusflow.db if found..."
  $candidates = @(
    "$env:APPDATA\com.focusflow.app\focusflow.db",
    "$env:LOCALAPPDATA\com.focusflow.app\focusflow.db"
  )

  foreach ($p in $candidates) {
    if (Test-Path $p) {
      Write-Host "Deleting: $p"
      Remove-Item -Force $p
    }
  }
}

Write-Host "Cleaning Rust target..."
Push-Location "$PSScriptRoot\..\src-tauri"
cargo clean
Pop-Location

Write-Host "Starting dev..."
npm run dev