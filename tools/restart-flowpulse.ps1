param(
    [string]$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [int]$FrontendPort = 8080,
    [int]$BackendPort = 8466,
    [string]$MavenRepo = "E:\repository",
    [switch]$BuildBackend
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Stop-ListenPort {
    param([int]$Port)

    $connections = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique

    foreach ($processId in $processIds) {
        if (-not $processId -or $processId -eq $PID) {
            continue
        }

        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($null -eq $process) {
            continue
        }

        Write-Host "Stopping port $Port process: $($process.ProcessName)($processId)"
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
}

function Stop-ProjectProcess {
    param(
        [string]$Name,
        [string]$Pattern
    )

    $escapedPattern = $Pattern.Replace("\", "\\")
    $processes = Get-CimInstance Win32_Process |
        Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine -match $escapedPattern }

    foreach ($process in $processes) {
        Write-Host "Stopping $Name process: $($process.Name)($($process.ProcessId))"
        Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

function Wait-Port {
    param(
        [int]$Port,
        [int]$TimeoutSeconds = 60
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $client = New-Object System.Net.Sockets.TcpClient
        try {
            $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
            if ($async.AsyncWaitHandle.WaitOne(1000, $false)) {
                $client.EndConnect($async)
                return $true
            }
        } catch {
        } finally {
            $client.Close()
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Clear-LogFile {
    param([string]$Path)
    $directory = Split-Path -Parent $Path
    if (-not (Test-Path $directory)) {
        New-Item -ItemType Directory -Path $directory | Out-Null
    }
    if (Test-Path $Path) {
        Clear-Content $Path
    } else {
        New-Item -ItemType File -Path $Path | Out-Null
    }
}

$frontendDir = Join-Path $RootDir "flow-pulse-fronted"
$serverDir = Join-Path $RootDir "flow-pulse-server"
$webDir = Join-Path $serverDir "flow-pulse-apps\flow-pulse-web"
$targetDir = Join-Path $webDir "target"
$backendMainClass = "com.flowpulse.web.FlowPulseApplication"
$backendPackageDir = Get-ChildItem -LiteralPath $targetDir -Directory -Filter "FlowPulse-V*-all" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
$backendHome = if ($backendPackageDir) { Join-Path $backendPackageDir.FullName "flowpulse-main" } else { $null }

$frontendOut = Join-Path $frontendDir "frontend-start.out.log"
$frontendErr = Join-Path $frontendDir "frontend-start.err.log"
$backendOut = Join-Path $serverDir "backend.out.log"
$backendErr = Join-Path $serverDir "backend.err.log"

Write-Step "Stopping FlowPulse frontend and backend"
Stop-ListenPort -Port $FrontendPort
Stop-ListenPort -Port $BackendPort
Stop-ProjectProcess -Name "FlowPulse backend" -Pattern "com\.flowpulse\.web\.FlowPulseApplication|flow-pulse-web-boot\.jar"
Stop-ProjectProcess -Name "FlowPulse frontend" -Pattern "flow-pulse-fronted.*(npm|everest|node)"
Start-Sleep -Seconds 2

if ($BuildBackend -or -not $backendHome -or -not (Test-Path (Join-Path $backendHome "lib"))) {
    Write-Step "Building backend deploy package"
    Push-Location $serverDir
    try {
        & mvn.cmd -pl flow-pulse-apps/flow-pulse-web -am package -DskipTests "-Dmaven.repo.local=$MavenRepo"
        if ($LASTEXITCODE -ne 0) {
            throw "Maven build failed with exit code $LASTEXITCODE"
        }
    } finally {
        Pop-Location
    }
    $backendPackageDir = Get-ChildItem -LiteralPath $targetDir -Directory -Filter "FlowPulse-V*-all" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    $backendHome = if ($backendPackageDir) { Join-Path $backendPackageDir.FullName "flowpulse-main" } else { $null }
}

if (-not $backendHome -or -not (Test-Path $backendHome)) {
    throw "Backend deploy directory not found. Run with -BuildBackend first."
}

Write-Step "Starting backend on port $BackendPort"
Clear-LogFile -Path $backendOut
Clear-LogFile -Path $backendErr
$backendDataDir = Join-Path $backendHome "data"
if (-not (Test-Path $backendDataDir)) {
    New-Item -ItemType Directory -Path $backendDataDir | Out-Null
}
$backendClasspath = @(
    (Join-Path $backendHome "config"),
    (Join-Path $backendHome "lib\*")
) -join ";"
$backendArgs = @(
    "-Dapp.name=flowpulse",
    "-Dinstall.dir=$backendHome",
    "-Dspring.profiles.active=prod",
    "-Dlogging.config=$(Join-Path $backendHome 'config\logback-spring.xml')",
    "-Dspring.config.location=file:$(Join-Path $backendHome 'config')/",
    "-Duser.dir=$backendHome",
    "-Ddecrypt.host=10.1.53.201",
    "-DFLOWPULSE_DATA_DIR=$backendDataDir",
    "-cp",
    $backendClasspath,
    $backendMainClass
)
Start-Process -FilePath "java.exe" `
    -ArgumentList $backendArgs `
    -WorkingDirectory $backendHome `
    -RedirectStandardOutput $backendOut `
    -RedirectStandardError $backendErr `
    -WindowStyle Hidden | Out-Null

Write-Step "Starting frontend on port $FrontendPort"
Clear-LogFile -Path $frontendOut
Clear-LogFile -Path $frontendErr
Start-Process -FilePath "cmd.exe" `
    -ArgumentList @("/c", "npm start") `
    -WorkingDirectory $frontendDir `
    -RedirectStandardOutput $frontendOut `
    -RedirectStandardError $frontendErr `
    -WindowStyle Hidden | Out-Null

Write-Step "Checking ports"
$backendReady = Wait-Port -Port $BackendPort -TimeoutSeconds 90
$frontendReady = Wait-Port -Port $FrontendPort -TimeoutSeconds 90

Write-Host ""
if ($frontendReady) {
    Write-Host "Frontend ready: http://localhost:$FrontendPort/flowpulse/" -ForegroundColor Green
} else {
    Write-Host "Frontend is not listening on port $FrontendPort. Check $frontendOut and $frontendErr" -ForegroundColor Yellow
}

if ($backendReady) {
    Write-Host "Backend ready:  http://localhost:$BackendPort/flowpulse" -ForegroundColor Green
} else {
    Write-Host "Backend is not listening on port $BackendPort. Check $backendOut and $backendErr" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Logs:"
Write-Host "  Frontend stdout: $frontendOut"
Write-Host "  Frontend stderr: $frontendErr"
Write-Host "  Backend stdout:  $backendOut"
Write-Host "  Backend stderr:  $backendErr"

if (-not ($frontendReady -and $backendReady)) {
    exit 1
}
