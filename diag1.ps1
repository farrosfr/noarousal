$ErrorActionPreference = "SilentlyContinue"

# Top CPU usage over a 5-second sample
Write-Host "===== LIVE CPU SAMPLE (5 sec) =====" -ForegroundColor Cyan
$samples = Get-Counter '\Process(*)\% Processor Time' -SampleInterval 1 -MaxSamples 5
$avg = $samples.CounterSamples | Group-Object {$_.InstanceName} | ForEach-Object {
    $avgVal = ($_.Group | Measure-Object CookedValue -Average).Average
    [PSCustomObject]@{ Name=$_.Name; AvgCPU=[math]::Round($avgVal,2) }
} | Where-Object { $_.AvgCPU -gt 0.5 } | Sort-Object AvgCPU -Descending | Select-Object -First 20
$avg | Format-Table -AutoSize

Write-Host "`n===== DISK I/O TOP PROCESSES =====" -ForegroundColor Cyan
Get-Process | Sort-Object ReadTransferRate -Descending -ErrorAction SilentlyContinue | Select-Object -First 10 Name,Id,ReadTransferRate,WriteTransferRate | Format-Table -AutoSize
Get-Process | Sort-Object WriteTransferRate -Descending -ErrorAction SilentlyContinue | Select-Object -First 10 Name,Id,ReadTransferRate,WriteTransferRate | Format-Table -AutoSize

Write-Host "`n===== ANTIVIRUS / DEFENDER STATUS =====" -ForegroundColor Cyan
$av = Get-MpComputerStatus
$av | Select-Object AntivirusEnabled,RealTimeProtectionEnabled,QuickScanAge,FullScanAge,AntivirusSignatureLastUpdated,QuickScanStartTime,FullScanStartTime,NisEnabled,IsTamperProtected,AMEngineVersion,AMProductVersion | Format-List

Write-Host "`n===== CURRENT THREATS (Last 14 days) =====" -ForegroundColor Cyan
Get-MpThreatDetection -ErrorAction SilentlyContinue | Select-Object -First 10 ThreatID,ActionSuccess,InitialDetectionTime,LastThreatStatusChangeTime,ProcessName,Resources | Format-List

Write-Host "`n===== DEFENDER CURRENT SCAN? =====" -ForegroundColor Cyan
try { Get-MpScan -ErrorAction Stop | Select-Object ScanType,StartTime,EndTime,Status,ThreatsDetected,ThreatsTotal,FilesScanned | Format-List } catch { Write-Host "No active scan (Get-MpScan failed: $($_.Exception.Message))" }

Write-Host "`n===== WINDOWS UPDATE STATE =====" -ForegroundColor Cyan
$wu = New-Object -ComObject Microsoft.Update.Session
$searcher = $wu.CreateUpdateSearcher()
try {
    $result = $searcher.Search("IsInstalled=0")
    Write-Host "Pending updates: $($result.Updates.Count)"
    $result.Updates | Select-Object -First 8 Title,IsDownloaded,IsMandatory | Format-Table -AutoSize
} catch { Write-Host "WU search failed: $($_.Exception.Message)" }

Write-Host "`n===== AUTO-RUN STARTUP (Registry) =====" -ForegroundColor Cyan
$paths = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Run"
)
foreach ($p in $paths) {
    if (Test-Path $p) {
        Write-Host "--- $p ---" -ForegroundColor Yellow
        Get-ItemProperty $p | ForEach-Object {
            $_.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' -and $_.Value -and $_.Name -ne '(default)' } | ForEach-Object {
                [PSCustomObject]@{ Name=$_.Name; Value=$_.Value } | Format-Table -AutoSize -Wrap
            }
        }
    }
}

Write-Host "`n===== SCHEDULED TASKS (User-initiated, last hour) =====" -ForegroundColor Cyan
Get-ScheduledTask | Where-Object { $_.State -ne 'Disabled' -and $_.TaskPath -notmatch 'Microsoft' } | Select-Object -First 25 TaskName,TaskPath,State | Format-Table -AutoSize -Wrap

Write-Host "`n===== RUNNING SERVICES (non-Microsoft) =====" -ForegroundColor Cyan
Get-Service | Where-Object { $_.Status -eq 'Running' -and $_.Name -notmatch '^Wd|^Win|^Msiserver|^Eventlog|^Schedule|^BITS|^RpcSs|^Themes|^Wcmsvc|^Spooler|^LanmanWorkstation' } | Select-Object -First 40 Name,DisplayName,Status,StartType | Format-Table -AutoSize -Wrap
