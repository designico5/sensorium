$ErrorActionPreference='SilentlyContinue'
$root = 'C:\Users\Administrator\Videos\sensorium\sensorium-v2\crates'
$files = Get-ChildItem -Path $root -Recurse -Filter Cargo.toml
foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    $original = $content

    # // comments to # comments
    $content = $content -replace '(?m)^\s*//\s*Fact-Forcing Gate Metadata\s*$', '# Fact-Forcing Gate Metadata'

    # /** ... */ block comments to # line comments
    # Remove /** and */
    $content = $content -replace '(?m)^\s*/\*\*\s*$', '#'
    $content = $content -replace '(?m)^\s*\*/\s*$', '#'

    # Lines starting with optional spaces then '* ' become '# ' + rest
    $content = $content -replace '(?m)^(\s*)\*\s+', '${1}# '

    # Lines like '**Importers/Callers**:' or '**Affected API**:' etc.
    $content = $content -replace '(?m)^(\s*)\*\*(.+?)\*\*\s*:\s*$', '${1}# $2:'

    # Any remaining solitary '**' at line start/between spaces
    $content = $content -replace '(?m)^(\s*)\*\*', '${1}# '

    # Blank lines inside comment block should remain blank? keep them as blank to preserve readability.

    if ($content -ne $original) {
        Set-Content -Path $f.FullName -Value $content
        Write-Host "Fixed: $($f.FullName)"
    }
}
Write-Host 'done'