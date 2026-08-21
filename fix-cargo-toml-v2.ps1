$ErrorActionPreference='SilentlyContinue'
$root = 'C:\Users\Administrator\Videos\sensorium\sensorium-v2\crates'
$files = Get-ChildItem -Path $root -Recurse -Filter Cargo.toml
foreach ($f in $files) {
    $lines = Get-Content $f.FullName
    $out = @()
    $skip = $false
    foreach ($line in $lines) {
        if ($line -match '# Fact-Forcing Gate Metadata') {
            $skip = $true
            break
        }
        $out += $line
    }
    if ($skip) {
        # Remove trailing empty lines
        while ($out.Count -gt 0 -and $out[-1] -match '^\s*$') {
            $out = $out[0..($out.Count-2)]
        }
        Set-Content -Path $f.FullName -Value ($out -join "`r`n")
        Write-Host "Stripped metadata block: $($f.FullName)"
    }
}
Write-Host 'done'