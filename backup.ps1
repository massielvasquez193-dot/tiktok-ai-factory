# TikTok AI Factory — Production Backup
# Usage: .\backup.ps1
$Dir = ".\docker-backup"
$TS = Get-Date -Format "yyyyMMdd_HHmmss"
Write-Host "Backing up..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "$Dir\$TS" | Out-Null

# DB
if (Test-Path "apps\server\prisma\dev.db") { Copy-Item "apps\server\prisma\dev.db" "$Dir\$TS\dev.db" }

# Uploads
if ((Test-Path "uploads") -and @(Get-ChildItem "uploads" -Recurse -File -ErrorAction SilentlyContinue).Count -gt 0) {
  Compress-Archive -Path "uploads\*" -DestinationPath "$Dir\$TS\uploads.zip" -Force
}

# Videos
if ((Test-Path "output\videos") -and @(Get-ChildItem "output\videos" -Filter "*.mp4" -ErrorAction SilentlyContinue).Count -gt 0) {
  Compress-Archive -Path "output\videos\*.mp4" -DestinationPath "$Dir\$TS\videos.zip" -Force
}

# Config
if (Test-Path "apps\server\.env") { Copy-Item "apps\server\.env" "$Dir\$TS\.env" }
if (Test-Path ".env.production") { Copy-Item ".env.production" "$Dir\$TS\.env.production" }

# Clean old (keep 7)
Get-ChildItem $Dir -Directory | Sort-Object Name -Descending | Select-Object -Skip 7 | Remove-Item -Recurse -Force

$size = [math]::Round(((Get-ChildItem "$Dir\$TS" -Recurse | Measure-Object -Property Length -Sum).Sum)/1MB, 1)
Write-Host "✅ Backup: $Dir\$TS ($size MB)" -ForegroundColor Green
