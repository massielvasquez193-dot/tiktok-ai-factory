# ===============================
# TikTok AI Factory Restore Script
# ===============================

Set-ExecutionPolicy Bypass -Scope Process -Force

# 恢复数据库
if (Test-Path "FULL-BACKUP\dev.db") {
    Copy-Item "FULL-BACKUP\dev.db" "apps\server\prisma\dev.db" -Force
}

# 恢复 uploads
if (Test-Path "FULL-BACKUP\uploads.zip") {
    Expand-Archive "FULL-BACKUP\uploads.zip" "uploads" -Force
}

# 恢复 videos
if (Test-Path "FULL-BACKUP\videos.zip") {
    Expand-Archive "FULL-BACKUP\videos.zip" "output\videos" -Force
}

# 恢复环境文件
Copy-Item "FULL-BACKUP\.env" ".env" -Force
Copy-Item "FULL-BACKUP\.env.production" ".env.production" -Force

# 启动容器
docker-compose -f docker-compose.prod.yml up -d

Write-Host "System restore completed!" -ForegroundColor Cyan
