$ErrorActionPreference = "SilentlyContinue"

Write-Host "===== SYSTEM UPTIME & BOOT TIME =====" -ForegroundColor Cyan
$os = Get-CimInstance Win32_OperatingSystem
$boot = $os.LastBootUpTime
$uptime = (Get-Date) - $boot
Write-Host "Boot: $($boot.ToString('yyyy-MM-dd HH:mm:ss')) | Uptime: $($uptime.Days)d $($uptime.Hours)h $($uptime.Minutes)m"

Write-Host "`n===== LOGICAL DISKS =====" -ForegroundColor Cyan
Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 } | Select-Object DeviceID,VolumeName,@{n='SizeGB';e={[math]::Round($_.Size/1GB,1)}},@{n='FreeGB';e={[math]::Round($_.FreeSpace/1GB,1)}},@{n='PctFree';e={[math]::Round(($_.FreeSpace/$_.Size)*100,1)}} | Format-Table -AutoSize

Write-Host "`n===== DISK QUEUE LENGTH (live) =====" -ForegroundColor Cyan
$disk = Get-Counter '\PhysicalDisk(_Total)\% Disk Time','\PhysicalDisk(_Total)\Avg. Disk Queue Length','\PhysicalDisk(_Total)\Disk Reads/sec','\PhysicalDisk(_Total)\Disk Writes/sec','\PhysicalDisk(_Total)\Avg. Disk Read Queue Length','\PhysicalDisk(_Total)\Avg. Disk Write Queue Length','\PhysicalDisk(_Total)\Avg. Disk sec/Read','\PhysicalDisk(_Disk0)\% Disk Time','\PhysicalDisk(_Disk1)\% Disk Time' -SampleInterval 1 -MaxSamples 3
$disk.CounterSamples | ForEach-Object { [PSCustomObject]@{ Path=$_.Path; Sample1=$_.CookedValue } } | Format-Table -AutoSize -Wrap

Write-Host "`n===== TOP DISK I/O BY PROCESS (cumulative) =====" -ForegroundColor Cyan
Get-Process | Sort-Object ReadTransferRate -ErrorAction SilentlyContinue | Select-Object -First 15 Name,Id,@{n='ReadKBs';e={[math]::Round($_.ReadTransferRate/1KB,1)}},@{n='WriteKBs';e={[math]::Round($_.WriteTransferRate/1KB,1)}},Handles,Threads | Format-Table -AutoSize

Write-Host "`n===== APPLICATION EVENT LOG (errors, last 2h) =====" -ForegroundColor Cyan
Get-WinEvent -FilterHashtable @{LogName='Application'; Level=1,2,3; StartTime=(Get-Date).AddHours(-2)} -MaxEvents 15 -ErrorAction SilentlyContinue | Select-Object TimeCreated,ProviderName,Id,LevelDisplayName,Message | Format-List

Write-Host "`n===== SYSTEM EVENT LOG (errors, last 2h) =====" -ForegroundColor Cyan
Get-WinEvent -FilterHashtable @{LogName='System'; Level=1,2,3; StartTime=(Get-Date).AddHours(-2)} -MaxEvents 15 -ErrorAction SilentlyContinue | Select-Object TimeCreated,ProviderName,Id,LevelDisplayName,Message | Format-List

Write-Host "`n===== DEFENDER EVENT (last 24h) =====" -ForegroundColor Cyan
Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Windows Defender/Operational'; StartTime=(Get-Date).AddHours(-24)} -MaxEvents 8 -ErrorAction SilentlyContinue | Select-Object TimeCreated,Id,LevelDisplayName,Message | Format-List

Write-Host "`n===== HARDWARE ERRORS (last 24h) =====" -ForegroundColor Cyan
Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='disk','ntfs','storahci','Disk','spaceport','volmgr','volmgrx','NvAgent','WHEA-Logger','ACPI','Microsoft-Windows-Kernel-Power','Microsoft-Windows-Storage-ClassPnP'; StartTime=(Get-Date).AddHours(-24)} -MaxEvents 12 -ErrorAction SilentlyContinue | Select-Object TimeCreated,ProviderName,Id,LevelDisplayName,Message | Format-List

Write-Host "`n===== PROCESS TREE (resource hogs) =====" -ForegroundColor Cyan
Get-CimInstance Win32_Process -Filter "Name='MsMpEng.exe' or Name='SearchIndexer.exe' or Name='kilo.exe' or Name='firefox.exe' or Name='WhatsApp.Root.exe' or Name='node.exe'" |
    Select-Object Name,ProcessId,ParentProcessId,CommandLine,CreationDate,@{n='MemMB';e={[math]::Round($_.WorkingSetSize/1MB,1)}} | Format-Table -AutoSize -Wrap

Write-Host "`n===== MSI BLOATWARE PROCESSES =====" -ForegroundColor Cyan
Get-Process | Where-Object { $_.Name -match '^MSI' -or $_.Path -like '*\MSI\*' -or $_.Name -match 'Nahimic|CenterApp|MSI\.' } | Select-Object Name,Id,Path,@{n='MemMB';e={[math]::Round($_.WorkingSet/1MB,1)}},CPU | Format-Table -AutoSize -Wrap
