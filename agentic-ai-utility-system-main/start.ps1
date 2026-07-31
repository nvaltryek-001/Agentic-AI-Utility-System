# Valtryek Startup Script for PowerShell
# This script opens both backend and frontend in separate windows

Write-Host "🚀 Starting Valtryek Application..." -ForegroundColor Cyan
Write-Host ""

# Start backend in new window
Write-Host "📡 Starting Backend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host 'Backend starting...' -ForegroundColor Yellow; npm run dev"

# Wait 2 seconds for backend to initialize
Start-Sleep -Seconds 2

# Start frontend in new window
Write-Host "🎨 Starting Frontend App..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host 'Frontend starting...' -ForegroundColor Yellow; npm run dev"

Write-Host ""
Write-Host "✅ Both services are starting!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access the app at: http://localhost:5173" -ForegroundColor Cyan
Write-Host "📡 Backend API at: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
