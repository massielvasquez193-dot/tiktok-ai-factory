# ╔══════════════════════════════════════════════════════════════╗
# ║     TikTok AI Factory — Full Migration Restore Script        ║
# ║     GitHub + FULL-BACKUP -> Brand New Windows Machine        ║
# ╚══════════════════════════════════════════════════════════════╝
#
# Usage:
#   .\restore.ps1                    # Full restore from current directory
#   .\restore.ps1 -BackupPath PATH   # Specify FULL-BACKUP directory path
#   .\restore.ps1 -Mode Docker       # Force Docker production mode
#   .\restore.ps1 -Mode Local        # Force local dev mode (no Docker)
#   .\restore.ps1 -DryRun            # Validate prerequisites only
#   .\restore.ps1 -WhatIf            # Preview without executing

param(
    [ValidateSet("Auto", "Docker", "Local")]
    [string]$Mode = "Auto",

    [string]$BackupPath = "",

    [switch]$DryRun,
    [switch]$WhatIf,
    [switch]$SkipVerify
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# ── Configuration ────────────────────────────────────────────────────
$REPO_URL    = "https://github.com/massielvasquez193-dot/tiktok-ai-factory.git"
$BRANCH      = "main"
$HEALTH_URL  = "http://localhost:4000/api/health"
$WEB_URL     = "http://localhost:3000"
$PROJECT_DIR = Get-Location

# ── Helpers ───────────────────────────────────────────────────────────
function Write-Banner {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║     TikTok AI Factory — Migration Restore                   ║" -ForegroundColor Cyan
    Write-Host "║     massielvasquez193-dot/tiktok-ai-factory                 ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Message, [int]$StepNumber)
    Write-Host "[$StepNumber/10] " -ForegroundColor DarkGray -NoNewline
    Write-Host $Message -ForegroundColor Yellow
}

function Write-OK   { param([string]$M) Write-Host "   + $M" -ForegroundColor Green }
function Write-Warn { param([string]$M) Write-Host "   ! $M" -ForegroundColor Yellow }
function Write-Fail { param([string]$M) Write-Host "   X $M" -ForegroundColor Red }
function Write-Info { param([string]$M) Write-Host "   i $M" -ForegroundColor DarkCyan }

# ── Prerequisites ─────────────────────────────────────────────────────
function Test-Prerequisites {
    Write-Host ""
    Write-Host "--- Prerequisite Check ---" -ForegroundColor Cyan
    Write-Host ""

    $allOk = $true

    # Git
    $gitFound = Get-Command git -ErrorAction SilentlyContinue
    if ($gitFound) {
        $ver = git --version 2>&1 | Select-Object -First 1
        Write-OK "Git: $ver"
    } else {
        Write-Fail "Git: NOT INSTALLED"
        $allOk = $false
    }

    # Node.js
    $nodeFound = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeFound) {
        $ver = node --version 2>&1
        Write-OK "Node.js: $ver"
        try {
            $nodeVer = [Version]($ver -replace 'v','')
            if ($nodeVer -lt [Version]"22.0.0") {
                Write-Fail "Node.js $nodeVer is too old — need 22.0.0+"
                Write-Info "Download: https://nodejs.org/en/download"
                $allOk = $false
            }
        } catch { }
    } else {
        Write-Fail "Node.js: NOT INSTALLED"
        $allOk = $false
    }

    # npm
    $npmFound = Get-Command npm -ErrorAction SilentlyContinue
    if ($npmFound) {
        $ver = npm --version 2>&1
        Write-OK "npm: v$ver"
    } else {
        Write-Fail "npm: NOT INSTALLED"
        $allOk = $false
    }

    # Docker (optional)
    $dockerFound = Get-Command docker -ErrorAction SilentlyContinue
    if ($dockerFound) {
        $ver = docker --version 2>&1
        Write-OK "Docker: $ver"
        $composeVer = docker compose version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-OK "Docker Compose: available"
        }
    } else {
        Write-Warn "Docker: not installed (Docker mode unavailable)"
    }

    # Python (optional)
    $pyFound = Get-Command python3 -ErrorAction SilentlyContinue
    if (-not $pyFound) { $pyFound = Get-Command python -ErrorAction SilentlyContinue }
    if ($pyFound) {
        $ver = & $pyFound.Source --version 2>&1
        Write-OK "Python: $ver"
    } else {
        Write-Info "Python: not installed (AI media features disabled)"
    }

    Write-Host ""
    if (-not $allOk) {
        Write-Fail "Missing required dependencies. Install first:"
        Write-Host "  Git:      https://git-scm.com/download/win"
        Write-Host "  Node.js:  https://nodejs.org/en/download"
        Write-Host "  Docker:   https://www.docker.com/products/docker-desktop"
        Write-Host ""
        exit 1
    }
    Write-OK "All prerequisites satisfied."
    Write-Host ""
}

# ── Main Restore Pipeline ─────────────────────────────────────────────
function Invoke-Restore {
    Write-Banner
    Test-Prerequisites

    if ($DryRun) {
        Write-OK "Dry run complete. System ready for migration."
        Write-Host ""
        Write-Host "Next: Place FULL-BACKUP/ in this directory and run: .\restore.ps1"
        exit 0
    }

    if ($WhatIf) { $WhatIfPreference = $true }

    # Determine mode
    $useDocker = $false
    $hasDocker = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)
    switch ($Mode) {
        "Docker" {
            if (-not $hasDocker) { Write-Fail "Docker mode requested but Docker is not installed."; exit 1 }
            $useDocker = $true
        }
        "Local"  { $useDocker = $false }
        "Auto"   { $useDocker = $hasDocker }
    }

    Write-Info "Mode: $(if ($useDocker) { 'Docker Production' } else { 'Local Dev (no Docker)' })"
    Write-Info "Project: $PROJECT_DIR"
    Write-Host ""

    # ═══ Step 1: Clone ═══════════════════════════════════════════════════
    Write-Step "Clone repository from GitHub" 1
    if (Test-Path ".git") {
        Write-OK "Git repository already exists"
        if (-not $WhatIf) {
            Write-Info "Pulling latest changes..."
            git pull origin $BRANCH 2>&1 | Select-Object -Last 2 | ForEach-Object { Write-Info $_ }
        }
    } else {
        Write-Warn "Not a git repository. Clone manually first:"
        Write-Host "  git clone $REPO_URL ."
        Write-Host "  Then re-run: .\restore.ps1"
        Write-Host ""
        Write-Host "Or continue without git (offline mode)..."
        $continue = Read-Host "  Continue anyway? [y/N]"
        if ($continue -ne 'y') { exit 0 }
    }

    # ═══ Step 2: Locate FULL-BACKUP ══════════════════════════════════════
    Write-Step "Locate FULL-BACKUP directory" 2
    $backup = $BackupPath
    if (-not $backup) {
        $searchPaths = @(
            (Join-Path $PROJECT_DIR "FULL-BACKUP"),
            (Join-Path (Split-Path $PROJECT_DIR -Parent) "FULL-BACKUP"),
            (Join-Path $PROJECT_DIR "migration-backup")
        )
        foreach ($p in $searchPaths) {
            if (Test-Path $p) {
                $backup = $p
                break
            }
        }
    }
    if ($backup -and (Test-Path $backup)) {
        Write-OK "FULL-BACKUP found: $backup"
    } else {
        Write-Warn "FULL-BACKUP not found. Enter path (or press Enter to skip):"
        $custom = Read-Host "  Path"
        if ($custom -and (Test-Path $custom)) { $backup = $custom }
    }
    if ($backup) { Write-OK "Backup source: $backup" }
    else { Write-Warn "No backup — will start with fresh database" }

    # ═══ Step 3: Install Dependencies ═════════════════════════════════════
    Write-Step "Install npm dependencies" 3
    if (-not $WhatIf) {
        npm install 2>&1 | Select-Object -Last 3 | ForEach-Object { Write-Info $_ }
    }
    Write-OK "Dependencies installed"

    # ═══ Step 4: Generate Prisma Client ═══════════════════════════════════
    Write-Step "Generate Prisma client" 4
    Push-Location (Join-Path $PROJECT_DIR "apps" "server")
    if (-not $WhatIf) {
        npx prisma generate 2>&1 | Select-Object -Last 2 | ForEach-Object { Write-Info $_ }
    }
    Pop-Location
    Write-OK "Prisma client generated"

    # ═══ Step 5: Restore .env Config ══════════════════════════════════════
    Write-Step "Restore environment configuration" 5
    if ($backup) {
        $envBackup = Join-Path $backup ".env"
        $envProd   = Join-Path $backup ".env.production"

        # Server .env
        if (Test-Path $envBackup) {
            if (-not $WhatIf) {
                Copy-Item $envBackup (Join-Path $PROJECT_DIR ".env") -Force
                Copy-Item $envBackup (Join-Path $PROJECT_DIR "apps" "server" ".env") -Force
            }
            Write-OK ".env restored from FULL-BACKUP"
        } else {
            Write-Warn ".env not in backup — copying from .env.example"
            if ((Test-Path ".env.example") -and -not $WhatIf) {
                Copy-Item ".env.example" ".env" -Force
                Copy-Item ".env.example" "apps\server\.env" -Force
            }
        }

        # Production .env
        if (Test-Path $envProd) {
            if (-not $WhatIf) {
                Copy-Item $envProd (Join-Path $PROJECT_DIR ".env.production") -Force
            }
            Write-OK ".env.production restored"
        }

        # Fix: ensure local dev uses SQLite
        $serverEnv = Join-Path $PROJECT_DIR "apps" "server" ".env"
        if ((Test-Path $serverEnv) -and (-not $useDocker)) {
            $envContent = Get-Content $serverEnv -Raw
            if ($envContent -match 'DATABASE_URL.*postgresql') {
                Write-Warn "DATABASE_URL points to PostgreSQL — fixing for SQLite local dev"
                if (-not $WhatIf) {
                    $envContent = $envContent -replace 'DATABASE_URL=.*', 'DATABASE_URL="file:./dev.db"'
                    Set-Content -Path $serverEnv -Value $envContent
                }
            }
        }
    } else {
        if ((Test-Path ".env.example") -and -not $WhatIf) {
            Copy-Item ".env.example" ".env" -Force
            Copy-Item ".env.example" "apps\server\.env" -Force
            Write-OK ".env created from .env.example"
        }
    }

    # ═══ Step 6: Restore Database ═════════════════════════════════════════
    Write-Step "Restore SQLite database (dev.db)" 6
    $dbTarget = Join-Path $PROJECT_DIR "apps" "server" "prisma" "dev.db"

    if ($backup) {
        $dbBackup = Join-Path $backup "dev.db"
        if (Test-Path $dbBackup) {
            $dbSizeKB = [math]::Round((Get-Item $dbBackup).Length / 1KB, 1)
            if (-not $WhatIf) {
                New-Item -ItemType Directory -Force -Path (Split-Path $dbTarget) | Out-Null
                Copy-Item $dbBackup $dbTarget -Force
            }
            Write-OK "Database restored — $dbSizeKB KB"
        } else {
            Write-Warn "dev.db not found in backup"
        }
    }

    # Create fresh DB if needed
    if ((-not (Test-Path $dbTarget)) -and (-not $WhatIf)) {
        Write-Warn "No dev.db available — creating fresh database"
        Push-Location (Join-Path $PROJECT_DIR "apps" "server")
        npx prisma db push --skip-generate 2>&1 | Select-Object -Last 2 | ForEach-Object { Write-Info $_ }
        Pop-Location
    }

    # ═══ Step 7: Restore Uploads ══════════════════════════════════════════
    Write-Step "Restore uploads" 7
    if ($backup) {
        $uploadZip = Join-Path $backup "uploads.zip"
        $uploadDir = Join-Path $PROJECT_DIR "uploads"

        if (Test-Path $uploadZip) {
            if (-not $WhatIf) {
                New-Item -ItemType Directory -Force -Path $uploadDir | Out-Null
                Remove-Item "$uploadDir\*" -Recurse -Force -ErrorAction SilentlyContinue
                Expand-Archive -Path $uploadZip -DestinationPath $uploadDir -Force
            }
            $fileCount = @(Get-ChildItem $uploadDir -Recurse -File -ErrorAction SilentlyContinue).Count
            Write-OK "Uploads restored — $fileCount files"
        } else {
            Write-Warn "uploads.zip not found in backup"
        }
    }

    # ═══ Step 8: Restore Videos ═══════════════════════════════════════════
    Write-Step "Restore generated videos" 8
    if ($backup) {
        $videoZip = Join-Path $backup "videos.zip"
        $videoDir = Join-Path $PROJECT_DIR "output" "videos"

        if (Test-Path $videoZip) {
            if (-not $WhatIf) {
                New-Item -ItemType Directory -Force -Path $videoDir | Out-Null
                Remove-Item "$videoDir\*" -Recurse -Force -ErrorAction SilentlyContinue
                Expand-Archive -Path $videoZip -DestinationPath $videoDir -Force
            }
            $videoCount = @(Get-ChildItem $videoDir -Filter "*.mp4" -ErrorAction SilentlyContinue).Count
            Write-OK "Videos restored — $videoCount MP4 files"
        } else {
            Write-Warn "videos.zip not found in backup"
        }
    }

    # ═══ Step 9: Launch Application ═══════════════════════════════════════
    Write-Step "Launch TikTok AI Factory" 9

    if ($useDocker) {
        Write-Info "Building and starting Docker production stack..."
        Push-Location $PROJECT_DIR
        if (-not $WhatIf) {
            docker compose -f docker-compose.prod.yml build 2>&1 | Select-Object -Last 3 | ForEach-Object { Write-Info $_ }
            docker compose -f docker-compose.prod.yml up -d 2>&1 | Out-Null
        }
        Pop-Location
        Write-OK "Docker services starting..."
        Write-Info "PostgreSQL initialization takes ~10 seconds"
        if (-not $WhatIf) { Start-Sleep -Seconds 10 }
    } else {
        Write-Info "Starting local dev mode..."
        Push-Location $PROJECT_DIR
        if (-not $WhatIf) {
            Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "dev"
        }
        Pop-Location
        Write-OK "Dev server launching..."

        if (-not $SkipVerify -and -not $WhatIf) {
            Write-Info "Waiting for server (max 30s)..."
            $ready = $false
            for ($i = 0; $i -lt 30; $i++) {
                try {
                    $response = Invoke-WebRequest -Uri $HEALTH_URL -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
                    if ($response.StatusCode -eq 200) {
                        $ready = $true
                        break
                    }
                } catch { }
                Start-Sleep -Seconds 1
                if ($i -eq 9)  { Write-Host "   Still waiting... (10s)" -ForegroundColor DarkGray }
                if ($i -eq 19) { Write-Host "   Still waiting... (20s)" -ForegroundColor DarkGray }
            }
            if ($ready) { Write-OK "Server is ready!" }
            else { Write-Warn "Server may still be starting — check manually" }
        }
    }

    # ═══ Step 10: Verify Services ═════════════════════════════════════════
    if (-not $SkipVerify -and -not $WhatIf) {
        Write-Step "Verify services" 10
        Write-Host ""

        $checks = @(
            @{Label="API Health";  Url="http://localhost:4000/api/health"},
            @{Label="Products";    Url="http://localhost:4000/api/products"},
            @{Label="Scripts";     Url="http://localhost:4000/api/scripts"},
            @{Label="Videos";      Url="http://localhost:4000/api/videos"},
            @{Label="Research";    Url="http://localhost:4000/api/research"},
            @{Label="Campaigns";   Url="http://localhost:4000/api/campaigns"},
            @{Label="Web UI";      Url="http://localhost:3000"}
        )

        foreach ($c in $checks) {
            try {
                $response = Invoke-WebRequest -Uri $c.Url -TimeoutSec 5 -UseBasicParsing
                if ($response.StatusCode -eq 200) {
                    Write-OK "$($c.Label): HTTP 200"
                } else {
                    Write-Warn "$($c.Label): HTTP $($response.StatusCode)"
                }
            } catch {
                Write-Warn "$($c.Label): not reachable yet — retry manually"
            }
        }

        # Uploads / Videos on disk
        Write-Host ""
        $uDir = Join-Path $PROJECT_DIR "uploads"
        $vDir = Join-Path $PROJECT_DIR "output" "videos"
        if (Test-Path $uDir) {
            $uCnt = @(Get-ChildItem $uDir -Recurse -File -ErrorAction SilentlyContinue).Count
            Write-Info "Uploads on disk: $uCnt files"
        }
        if (Test-Path $vDir) {
            $vCnt = @(Get-ChildItem $vDir -Filter "*.mp4" -ErrorAction SilentlyContinue).Count
            Write-Info "Videos on disk:  $vCnt MP4 files"
        }
    }

    # ── Final Report ──────────────────────────────────────────────────
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║           MIGRATION COMPLETE!                               ║" -ForegroundColor Green
    Write-Host "╠══════════════════════════════════════════════════════════════╣" -ForegroundColor Green
    Write-Host "║                                                            ║" -ForegroundColor Green
    Write-Host "║  Web UI:     http://localhost:3000                         ║" -ForegroundColor Cyan
    Write-Host "║  API Health: http://localhost:4000/api/health              ║" -ForegroundColor Cyan
    Write-Host "║  Products:   http://localhost:4000/api/products            ║" -ForegroundColor Cyan
    Write-Host "║  Scripts:    http://localhost:4000/api/scripts             ║" -ForegroundColor Cyan
    Write-Host "║  Videos:     http://localhost:4000/api/videos              ║" -ForegroundColor Cyan
    Write-Host "║                                                            ║" -ForegroundColor Green
    $dirInfo = "║  Project:    $PROJECT_DIR"
    Write-Host $dirInfo.PadRight(63) + "║" -ForegroundColor DarkGray
    if ($useDocker) {
        Write-Host "║  PostgreSQL: localhost:5432                                 ║" -ForegroundColor DarkGray
        Write-Host "║  Redis:      localhost:6379                                 ║" -ForegroundColor DarkGray
    }
    Write-Host "║                                                            ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""

    # Save restore report
    $reportPath = Join-Path $PROJECT_DIR "RESTORE_REPORT.txt"
    if (-not $WhatIf) {
        $reportContent = @"
TikTok AI Factory — Restore Report
===================================
Date:       $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Mode:       $(if ($useDocker) { 'Docker Production' } else { 'Local Dev' })
Hostname:   $env:COMPUTERNAME
User:       $env:USERNAME

Repository
  URL:      $REPO_URL
  Branch:   $BRANCH
  Path:     $PROJECT_DIR

Backup Source: $(if ($backup) { $backup } else { 'N/A (fresh start)' })

Database: $(if (Test-Path (Join-Path $PROJECT_DIR 'apps' 'server' 'prisma' 'dev.db')) { 'Restored' } else { 'Fresh' })
Uploads:  $(if (Test-Path (Join-Path $PROJECT_DIR 'uploads')) { 'Restored' } else { 'None' })
Videos:   $(if (Test-Path (Join-Path $PROJECT_DIR 'output' 'videos')) { 'Restored' } else { 'None' })

Services
  Web UI:   http://localhost:3000
  API:      http://localhost:4000/api/health

Next Steps
  1. Open http://localhost:3000 in your browser
  2. Configure API keys in apps/server/.env
  3. For daily backups, schedule: .\backup.ps1
  4. See MIGRATION_GUIDE.md for detailed documentation
"@
        Set-Content -Path $reportPath -Value $reportContent -Encoding UTF8
        Write-Info "Report saved: $reportPath"
    }
}

# ── Entry Point ───────────────────────────────────────────────────────
try {
    Invoke-Restore
} catch {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  RESTORE FAILED                                             ║" -ForegroundColor Red
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor White
    Write-Host "  1. Check internet connection (for npm install)"
    Write-Host "  2. Ensure Git, Node.js 22+, and npm are installed"
    Write-Host "  3. Run with -DryRun to check prerequisites"
    Write-Host "  4. Place FULL-BACKUP/ directory in this folder"
    Write-Host "  5. See MIGRATION_GUIDE.md for detailed manual steps"
    Write-Host ""
    exit 1
}
