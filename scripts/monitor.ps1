# ============================================================
# Zuowen Website - Resource Monitor (Windows)
# Monitor CPU / Memory / Disk / site availability, log when over threshold
# Usage: powershell -ExecutionPolicy Bypass -File monitor.ps1
# Schedule via Task Scheduler every 5 minutes
# ============================================================

$ErrorActionPreference = "SilentlyContinue"
$LogFile = "D:\企业网站\logs\monitor.log"
$AlertLog = "D:\企业网站\logs\monitor-alert.log"
$Now = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$LogDir = Split-Path $LogFile
if (!(Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

# Thresholds
$CpuThreshold = 85
$MemThreshold = 85
$DiskThreshold = 80

# 1. CPU usage
$cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
$cpu = [math]::Round($cpu)

# 2. Memory usage
$os = Get-CimInstance Win32_OperatingSystem
$memPct = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize * 100)

# 3. Disk usage (C drive)
$cDrive = Get-PSDrive C
$diskPct = [math]::Round($cDrive.Used / ($cDrive.Used + $cDrive.Free) * 100)

# 4. Site availability
$siteOk = $false
try {
    $r = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    $siteOk = ($r.StatusCode -eq 200)
} catch {}

# 5. Node process count
$nodeCount = (Get-Process node -ErrorAction SilentlyContinue | Measure-Object).Count

$siteStr = $(if ($siteOk) { "OK" } else { "DOWN" })
$line = "$Now | CPU=${cpu}% | MEM=${memPct}% | DISK=${diskPct}% | SITE=$siteStr | node=$nodeCount"
Add-Content -Path $LogFile -Value $line

# Alerts
$alerts = @()
if ($cpu -gt $CpuThreshold) { $alerts += "CPU ${cpu}% over ${CpuThreshold}%" }
if ($memPct -gt $MemThreshold) { $alerts += "MEM ${memPct}% over ${MemThreshold}%" }
if ($diskPct -gt $DiskThreshold) { $alerts += "DISK ${diskPct}% over ${DiskThreshold}%" }
if (-not $siteOk) { $alerts += "SITE unreachable" }

if ($alerts.Count -gt 0) {
    $alertLine = "$Now [ALERT] " + ($alerts -join "; ")
    Add-Content -Path $AlertLog -Value $alertLine
    Write-Host $alertLine -ForegroundColor Red
} else {
    Write-Host $line -ForegroundColor Green
}
