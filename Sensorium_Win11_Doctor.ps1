$ErrorActionPreference = 'Stop'

Write-Host 'Sensorium Windows Read-Only Readiness Check' -ForegroundColor Cyan
Write-Host 'No settings, firewall rules, Defender exclusions, power plans, drivers, or packages will be changed.'

function Resolve-CommandPath([string]$Name) {
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($null -ne $command) { return $command.Source }
    return $null
}

$checks = [ordered]@{
    PowerShell = $PSVersionTable.PSVersion.ToString()
    Node       = (Resolve-CommandPath 'node')
    Npm        = (Resolve-CommandPath 'npm')
    Git        = (Resolve-CommandPath 'git')
}

$checks.GetEnumerator() | ForEach-Object {
    $state = if ($_.Value) { $_.Value } else { 'NOT FOUND' }
    Write-Host ("{0,-12} {1}" -f $_.Key, $state)
}

Write-Host ''
Write-Host 'Listening Sensorium-related ports (read-only):'
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object LocalPort -In 3000, 5125, 5126, 5127, 8000, 9000 |
    Select-Object LocalAddress, LocalPort, OwningProcess |
    Format-Table -AutoSize

Write-Host 'Check complete. No remediation was applied.' -ForegroundColor Yellow
