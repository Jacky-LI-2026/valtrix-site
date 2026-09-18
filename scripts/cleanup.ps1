# ============================================================
# 左文科技企业官网 - 日志与临时文件清理脚本（Windows 本地开发）
# 用法：PowerShell 执行本文件
#   右键 -> 使用 PowerShell 运行  或
#   powershell -ExecutionPolicy Bypass -File cleanup.ps1
# 可配合「任务计划程序」每日自动执行
# ============================================================

$ErrorActionPreference = "SilentlyContinue"
$ProjectDir = "D:\企业网站"
$KeepDays = 14
$TmpKeepDays = 3
$KeepBackups = 10

Write-Host "===== 清理开始 $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') =====" -ForegroundColor Cyan

# 1. Next.js 构建缓存
$nextCache = Join-Path $ProjectDir ".next\cache"
if (Test-Path $nextCache) {
    Remove-Item -Recurse -Force $nextCache
    Write-Host "[OK] 已清理 .next/cache"
}

# 2. 项目日志（dev_server.log 等）
$logCutoff = (Get-Date).AddDays(-$KeepDays)
Get-ChildItem $ProjectDir -Recurse -Filter "*.log" -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt $logCutoff -and $_.FullName -notlike "*node_modules*" } |
    Remove-Item -Force -ErrorAction SilentlyContinue
Write-Host "[OK] 已删除 $KeepDays 天前的 *.log"

# 3. 临时上传文件
$tmpDir = Join-Path $ProjectDir "tmp"
if (Test-Path $tmpDir) {
    $tmpCutoff = (Get-Date).AddDays(-$TmpKeepDays)
    Get-ChildItem $tmpDir -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $tmpCutoff } |
        Remove-Item -Force -ErrorAction SilentlyContinue
    # deploy-uploads 清理
    $dup = Join-Path $tmpDir "deploy-uploads"
    if (Test-Path $dup) { Remove-Item -Recurse -Force $dup }
    Write-Host "[OK] 已清理临时文件"
}

# 4. 备份只保留最近 N 份
$backupDir = Join-Path $ProjectDir "backups"
if (Test-Path $backupDir) {
    Get-ChildItem $backupDir -Filter "full_backup_*.zip" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip $KeepBackups |
        Remove-Item -Force -ErrorAction SilentlyContinue
    Get-ChildItem $backupDir -Filter "backup-*.json" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip ($KeepBackups*3) |
        Remove-Item -Force -ErrorAction SilentlyContinue
    Get-ChildItem $backupDir -Filter "pre-upgrade-*.json" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip ($KeepBackups*3) |
        Remove-Item -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] 备份已清理，保留最近 $KeepBackups 份"
}

Write-Host "===== 清理完成 $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') =====" -ForegroundColor Green
