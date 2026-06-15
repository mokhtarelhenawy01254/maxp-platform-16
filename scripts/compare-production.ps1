[CmdletBinding()]
param(
    [string]$Server = "root@153.92.223.119",
    [string]$BackendPath = "/var/www/backend2",
    [string]$FrontendDistPath = "/var/www/frontend2/dist",
    [string]$ThemePath = "/var/www/frontend2/src/storefront/themes",
    [string]$SharedPath = "/var/www/shared",
    [switch]$SkipFrontendBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$frontendRoot = Join-Path $repoRoot "frontend"
$frontendDistLocal = Join-Path $frontendRoot "dist"
$script:hasDifferences = $false
$script:hasRuntimeChanges = $false

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "== $Title =="
}

function Normalize-Text {
    param([string]$Text)
    if ($null -eq $Text) {
        return ""
    }

    return ($Text -replace "`r`n", "`n" -replace "`r", "`n")
}

function Quote-Bash {
    param([string]$Value)
    $escaped = $Value.Replace('"', '\"').Replace('$', '\$')
    return '"' + $escaped + '"'
}

function Get-ChangedEntries {
    $lines = & git -C $repoRoot status --porcelain
    if ($LASTEXITCODE -ne 0) {
        throw "Could not read git status."
    }

    $entries = @()
    foreach ($line in $lines) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        $status = $line.Substring(0, 2)
        $pathText = $line.Substring(3)
        if ($pathText -match " -> ") {
            $pathText = ($pathText -split " -> ", 2)[1]
        }

        $entries += [pscustomobject]@{
            Status = $status
            Path   = $pathText.Replace("\", "/")
        }
    }

    return $entries
}

function Get-Category {
    param([string]$RelativePath)

    if (
        $RelativePath -like "memory/*" -or
        $RelativePath -eq "TOOLS.md" -or
        $RelativePath -eq "CHANGELOG.md" -or
        $RelativePath -like "frontend/docs/*" -or
        $RelativePath -like "backend/docs/*"
    ) {
        return "Ignored"
    }

    if ($RelativePath -like "backend/tests/*") {
        return "Ignored"
    }

    if (
        $RelativePath -match "(^|/)(__tests__)/" -or
        $RelativePath -match "\.(test|spec)\.[^/]+$"
    ) {
        return "Ignored"
    }

    if ($RelativePath -like "backend/*") {
        return "Backend"
    }

    if ($RelativePath -like "shared/*") {
        return "Shared"
    }

    if ($RelativePath -like "frontend/src/storefront/themes/*.json") {
        return "Theme"
    }

    if (
        $RelativePath -like "frontend/src/*" -or
        $RelativePath -like "frontend/public/*" -or
        $RelativePath -eq "frontend/package.json" -or
        $RelativePath -eq "frontend/package-lock.json" -or
        $RelativePath -like "frontend/vite.config.*" -or
        $RelativePath -like "frontend/tailwind*.js" -or
        $RelativePath -like "frontend/postcss*.js"
    ) {
        return "FrontendBuild"
    }

    return "Ignored"
}

function Test-RemoteFileExists {
    param(
        [string]$TargetServer,
        [string]$RemotePath
    )

    $quotedPath = Quote-Bash $RemotePath
    & ssh -o BatchMode=yes $TargetServer "test -f $quotedPath"
    return ($LASTEXITCODE -eq 0)
}

function Get-RemoteFileToTemp {
    param(
        [string]$TargetServer,
        [string]$RemotePath
    )

    if (-not (Test-RemoteFileExists -TargetServer $TargetServer -RemotePath $RemotePath)) {
        return $null
    }

    $tempFile = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString() + "-" + [System.IO.Path]::GetFileName($RemotePath))
    $remoteSpec = "${TargetServer}:$RemotePath"
    & scp -q $remoteSpec $tempFile
    if ($LASTEXITCODE -ne 0) {
        throw "Could not copy remote file: $RemotePath"
    }

    return $tempFile
}

function Compare-TextFileAgainstProduction {
    param(
        [string]$RelativePath,
        [string]$RemotePath,
        [string]$StatusLabel
    )

    $script:hasRuntimeChanges = $true

    $localPath = Join-Path $repoRoot $RelativePath
    if (-not (Test-Path $localPath)) {
        if (Test-RemoteFileExists -TargetServer $Server -RemotePath $RemotePath) {
            Write-Host "[DIFF] $RelativePath is deleted locally but still exists on production ($StatusLabel)."
            $script:hasDifferences = $true
        } else {
            Write-Host "[OK] $RelativePath is absent locally and on production ($StatusLabel)."
        }
        return
    }

    $remoteTemp = Get-RemoteFileToTemp -TargetServer $Server -RemotePath $RemotePath
    if ($null -eq $remoteTemp) {
        Write-Host "[DIFF] $RelativePath does not exist on production ($StatusLabel)."
        $script:hasDifferences = $true
        return
    }

    try {
        $localText = Normalize-Text ([System.IO.File]::ReadAllText($localPath))
        $remoteText = Normalize-Text ([System.IO.File]::ReadAllText($remoteTemp))

        if ($localText -eq $remoteText) {
            Write-Host "[OK] $RelativePath matches production ($StatusLabel)."
        } else {
            Write-Host "[DIFF] $RelativePath differs from production ($StatusLabel)."
            $script:hasDifferences = $true
        }
    } finally {
        Remove-Item $remoteTemp -ErrorAction SilentlyContinue
    }
}

function Get-LocalFileHashes {
    param([string]$RootPath)

    $map = @{}
    if (-not (Test-Path $RootPath)) {
        return $map
    }

    Get-ChildItem -Path $RootPath -File -Recurse | ForEach-Object {
        $relative = $_.FullName.Substring($RootPath.Length).TrimStart("\").Replace("\", "/")
        $hash = (Get-FileHash -Algorithm SHA256 -Path $_.FullName).Hash.ToLowerInvariant()
        $map[$relative] = $hash
    }

    return $map
}

function Get-RemoteFileHashes {
    param(
        [string]$TargetServer,
        [string]$RemoteRoot
    )

    $quotedRoot = Quote-Bash $RemoteRoot
    $command = @'
if [ ! -d __ROOT__ ]; then
  exit 2
fi
cd __ROOT__
find . -type f | LC_ALL=C sort | while read -r file; do
  hash=$(sha256sum "$file" | cut -d' ' -f1)
  printf '%s\t%s\n' "${file#./}" "$hash"
done
'@.Replace("__ROOT__", $quotedRoot)

    $lines = & ssh -o BatchMode=yes $TargetServer $command
    if ($LASTEXITCODE -eq 2) {
        throw "Remote directory not found: $RemoteRoot"
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Could not collect remote hashes for: $RemoteRoot"
    }

    $map = @{}
    foreach ($line in $lines) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        $parts = $line -split "`t", 2
        if ($parts.Count -ne 2) {
            continue
        }

        $map[$parts[0]] = $parts[1].ToLowerInvariant()
    }

    return $map
}

function Show-List {
    param(
        [string]$Label,
        [string[]]$Items
    )

    if (-not $Items -or $Items.Count -eq 0) {
        return
    }

    Write-Host "$Label ($($Items.Count)):"
    $Items | Select-Object -First 20 | ForEach-Object { Write-Host "  - $_" }
    if ($Items.Count -gt 20) {
        Write-Host "  - ... and $($Items.Count - 20) more"
    }
}

$entries = Get-ChangedEntries
if (-not $entries -or $entries.Count -eq 0) {
    Write-Host "No local changes were found in git status."
    exit 0
}

$ignored = @()
$frontendBuildTriggers = @()

Write-Section "Direct runtime file comparison"

foreach ($entry in $entries) {
    $category = Get-Category -RelativePath $entry.Path

    switch ($category) {
        "Ignored" {
            $ignored += $entry.Path
        }
        "Backend" {
            $remotePath = ($BackendPath.TrimEnd("/") + "/" + $entry.Path.Substring("backend/".Length))
            Compare-TextFileAgainstProduction -RelativePath $entry.Path -RemotePath $remotePath -StatusLabel "backend"
        }
        "Shared" {
            $remotePath = ($SharedPath.TrimEnd("/") + "/" + $entry.Path.Substring("shared/".Length))
            Compare-TextFileAgainstProduction -RelativePath $entry.Path -RemotePath $remotePath -StatusLabel "shared"
        }
        "Theme" {
            $remotePath = ($ThemePath.TrimEnd("/") + "/" + [System.IO.Path]::GetFileName($entry.Path))
            Compare-TextFileAgainstProduction -RelativePath $entry.Path -RemotePath $remotePath -StatusLabel "theme preset"
        }
        "FrontendBuild" {
            $frontendBuildTriggers += $entry.Path
            $script:hasRuntimeChanges = $true
        }
    }
}

if ($ignored.Count -gt 0) {
    Write-Host ""
    Write-Host "Skipped non-runtime files:"
    $ignored | ForEach-Object { Write-Host "  - $_" }
}

if ($frontendBuildTriggers.Count -gt 0) {
    Write-Section "Frontend dist comparison"
    Write-Host "Frontend runtime source changes detected:"
    $frontendBuildTriggers | ForEach-Object { Write-Host "  - $_" }

    if (-not $SkipFrontendBuild) {
        Write-Host ""
        Write-Host "Building frontend locally before comparing dist..."
        Push-Location $frontendRoot
        try {
            & npm.cmd run build:clean
            if ($LASTEXITCODE -ne 0) {
                throw "Frontend build failed."
            }
        } finally {
            Pop-Location
        }
    } else {
        Write-Host ""
        Write-Host "Skipping local frontend build as requested."
    }

    if (-not (Test-Path $frontendDistLocal)) {
        throw "Local frontend dist folder was not found: $frontendDistLocal"
    }

    $localHashes = Get-LocalFileHashes -RootPath $frontendDistLocal
    $remoteHashes = Get-RemoteFileHashes -TargetServer $Server -RemoteRoot $FrontendDistPath

    $localOnly = @()
    $remoteOnly = @()
    $different = @()

    foreach ($relative in $localHashes.Keys) {
        if (-not $remoteHashes.ContainsKey($relative)) {
            $localOnly += $relative
            continue
        }

        if ($localHashes[$relative] -ne $remoteHashes[$relative]) {
            $different += $relative
        }
    }

    foreach ($relative in $remoteHashes.Keys) {
        if (-not $localHashes.ContainsKey($relative)) {
            $remoteOnly += $relative
        }
    }

    if ($localOnly.Count -eq 0 -and $remoteOnly.Count -eq 0 -and $different.Count -eq 0) {
        Write-Host "[OK] Local frontend dist matches production."
    } else {
        Write-Host "[DIFF] Local frontend dist does not match production."
        Show-List -Label "Only in local dist" -Items ($localOnly | Sort-Object)
        Show-List -Label "Only on production" -Items ($remoteOnly | Sort-Object)
        Show-List -Label "Different content" -Items ($different | Sort-Object)
        $script:hasDifferences = $true
    }
}

if (-not $script:hasRuntimeChanges) {
    Write-Host ""
    Write-Host "No runtime-impacting local files were detected. Only docs, memory, or test files changed."
    exit 0
}

Write-Host ""
if ($script:hasDifferences) {
    Write-Host "Production is missing some local runtime changes."
    exit 1
}

Write-Host "Production already reflects the local runtime changes that were checked."
exit 0
