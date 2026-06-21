$ErrorActionPreference = "SilentlyContinue"

# Wait 3 seconds then check Defender scan status more carefully
Write-Host "===== DEFENDER PROCESS DETAIL (subprocesses) =====" -ForegroundColor Cyan
$proc = Get-Process MsMpEng -ErrorAction SilentlyContinue
if ($proc) {
    $proc | Select-Object Id,CPU,@{n='MemMB';e={[math]::Round($_.WorkingSet/1MB,1)}},StartTime,Path,Handles,Threads,Modules | Format-List
    Write-Host "--- MpCmdRun / MpEngine / related processes ---"
    Get-Process | Where-Object { $_.Name -match 'Mp' -or $_.Path -match 'Defender' } | Select-Object Name,Id,Path,@{n='MemMB';e={[math]::Round($_.WorkingSet/1MB,1)}},CPU | Format-Table -AutoSize
}

# What is Defender currently scanning? Check recent file scans in event log
Write-Host "`n===== DEFENDER FILE SCAN EVENTS (last 30 min) =====" -ForegroundColor Cyan
Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Windows Defender/Operational'; StartTime=(Get-Date).AddMinutes(-30)} -MaxEvents 15 -ErrorAction SilentlyContinue | Select-Object TimeCreated,Id,LevelDisplayName,Message | Format-List

# Check Defender process tree - which scan is running?
Write-Host "`n===== DEFENDER CMDLINE & SCAN TYPE =====" -ForegroundColor Cyan
$wmi = Get-CimInstance Win32_Process -Filter "Name='MsMpEng.exe'"
$wmi | Select-Object Name,ProcessId,CommandLine,ParentProcessId,CreationDate | Format-List

Write-Host "`n===== TASK SCHEDULER (running now) =====" -ForegroundColor Cyan
schtasks /query /fo TABLE /v 2>&1 | Select-String -Pattern "Running|Status: Running|\"Running\"" | Select-Object -First 25

Write-Host "`n===== RUNNING TASKS DETAIL (Executing state) =====" -ForegroundColor Cyan
Get-ScheduledTask | Get-ScheduledTaskInfo -ErrorAction SilentlyContinue | Where-Object { $_.LastTaskResult -ne 267011 -or $_.NextRunTime -lt (Get-Date).AddHours(1) } | Select-Object -First 20 | Format-Table -AutoSize

# Look for currently executing scheduled tasks
$running = Get-ScheduledTask | ForEach-Object {
    $info = $_ | Get-ScheduledTaskInfo -ErrorAction SilentlyContinue
    if ($_.State -eq 'Running') {
        [PSCustomObject]{
            Name = $_.TaskName
            Path = $_.TaskPath
            State = $_.State
        }
    }
}
if ($running) {
    Write-Host "Currently RUNNING scheduled tasks:" -ForegroundColor Yellow
    $running | Format-Table -AutoSize -Wrap
} else {
    Write-Host "No scheduled tasks in 'Running' state" -ForegroundColor Green
}

Write-Host "`n===== C:\ DRIVE TYPE & HEALTH =====" -ForegroundColor Cyan
Get-PhysicalDisk | Select-Object FriendlyName,MediaType,BusType,HealthStatus,OperationalStatus,Size,@{n='Temp';e={$_.Temperature}} | Format-Table -AutoSize -Wrap
Get-Disk | Select-Object Number,FriendlyName,OperationalStatus,HealthStatus,PartitionStyle,@{n='SizeGB';e={[math]::Round($_.Size/1GB,1)}},@{n='AllocGB';e={[math]::Round(($_.AllocatedSize/1GB),1)}},@{n='FreeGB';e={[math]::Round((($_.Size-$_.AllocatedSize)/1GB),1)}} | Format-Table -AutoSize

Write-Host "`n===== DISK LATENCY PER DRIVE (live, 3 sec) =====" -ForegroundColor Cyan
Get-Counter '\PhysicalDisk(_Disk0)\Avg. Disk sec/Read','\PhysicalDisk(_Disk0)\Avg. Disk sec/Write','\PhysicalDisk(_Disk1)\Avg. Disk sec/Read','\PhysicalDisk(_Disk1)\Avg. Disk sec/Write' -SampleInterval 1 -MaxSamples 3 | ForEach-Object { $_.CounterSamples | ForEach-Object { [PSCustomObject]@{ Path=$_.Path; Sample=[math]::Round($_.CookedValue*1000,2); LatencyMs=$([math]::Round($_.CookedValue*1000,2)) } } } | Format-Table -AutoSize

Write-Host "`n===== NETWORK ACTIVITY (top by bytes) =====" -ForegroundColor Cyan
Get-NetAdapterStatistics | Sort-Object ReceivedBytes -Descending -ErrorAction SilentlyContinue | Select-Object -First 5 Name,ReceivedBytes,SentBytes,@{n='RxMB';e={[math]::Round($_.ReceivedBytes/1MB,1)}},@{n='TxMB';e={[math]::Round($_.SentBytes/1MB,1)}} | Format-Table -AutoSize

# Per-process network I/O from Win32_Process
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        $io = $_.GetOwner()
    } catch {}
} | Out-Null
$procIO = Get-Counter '\Process(*)\IO Read Bytes/sec','\Process(*)\IO Write Bytes/sec' -SampleInterval 1 -MaxSamples 2
$readIO = $procIO.CounterSamples | Where-Object { $_.Path -match 'IO Read' } | Group-Object InstanceName | ForEach-Object {
    $avg = ($_.Group | Measure-Object CookedValue -Average).Average
    [PSCustomObject]@{ Process=$_.Name; ReadKBs=[math]::Round($avg/1KB,1) }
} | Sort-Object ReadKBs -Descending | Select-Object -First 10
$writeIO = $procIO.CounterSamples | Where-Object { $_.Path -match 'IO Write' } | Group-Object InstanceName | ForEach-Object {
    $avg = ($_.Group | Measure-Object CookedValue -Average).Average
    [PSCustomObject]@{ Process=$_.Name; WriteKBs=[math]::Round($avg/1KB,1) }
} | Sort-Object WriteKBs -Descending | Select-Object -First 10
Write-Host "Top I/O READ (KB/s):"
$readIO | Format-Table -AutoSize
Write-Host "Top I/O WRITE (KB/s):"
$writeIO | Format-Table -AutoSize

Write-Host "`n===== C:\ BIG FOLDERS (suspect areas) =====" -ForegroundColor Cyan
Get-ChildItem C:\ -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -notmatch '^\$|^PerfLogs|^Users' } | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
    [PSCustomObject]@{ Folder=$_.Name; SizeGB=[math]::Round($size/1GB,2) }
} | Sort-Object SizeGB -Descending | Select-Object -First 8 | Format-Table -AutoSize
