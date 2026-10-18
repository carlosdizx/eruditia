<#
.SYNOPSIS
    Script en PowerShell para realizar backup de la base de datos PostgreSQL de Eruditia.
.DESCRIPTION
    Detecta automáticamente las variables de entorno de apps/api/.env y realiza el volcado
    usando pg_dump (si está disponible localmente) o a través del contenedor Docker 'ops_postgres'.
.EXAMPLE
    .\scripts\backup.ps1
    .\scripts\backup.ps1 -Format custom
    .\scripts\backup.ps1 -DbName eruditia -Clean
#>

[CmdletBinding()]
param (
    [string]$EnvFile = "",
    [string]$OutputDir = "",
    [string]$ContainerName = "",
    [string]$DbName = "",
    [ValidateSet("sql", "custom")]
    [string]$Format = "sql",
    [switch]$Clean,
    [switch]$SchemaOnly,
    [switch]$DataOnly
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $scriptDir) { $scriptDir = (Get-Location).Path }
$projectRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path

if (-not $EnvFile) { $EnvFile = Join-Path $projectRoot "apps\api\.env" }
if (-not $OutputDir) { $OutputDir = Join-Path $projectRoot "backups" }

# Cargar variables de entorno desde .env si existe
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $key = $parts[0].Trim()
            $val = $parts[1].Trim().Trim('"').Trim("'")
            if (-not [System.Environment]::GetEnvironmentVariable($key)) {
                [System.Environment]::SetEnvironmentVariable($key, $val)
            }
        }
    }
}

$dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$dbPort = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$dbUser = if ($env:DB_USERNAME) { $env:DB_USERNAME } else { "postgres" }
$dbPass = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "postgres" }
$dbTarget = if ($DbName) { $DbName } elseif ($env:DB_NAME) { $env:DB_NAME } else { "eruditia" }
$dockerTarget = if ($ContainerName) { $ContainerName } elseif ($env:DB_DOCKER_CONTAINER) { $env:DB_DOCKER_CONTAINER } else { "ops_postgres" }

# Asegurar carpeta de backups
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$ext = if ($Format -eq "custom") { "dump" } else { "sql" }
$fileName = "${dbTarget}_backup_${timestamp}.${ext}"
$targetPath = Join-Path $OutputDir $fileName

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "       ERUDITIA - DATABASE BACKUP (PS1)      " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Base de datos:  $dbTarget"
Write-Host "Usuario:        $dbUser"
Write-Host "Host:           ${dbHost}:${dbPort}"
Write-Host "Formato:        $Format"
Write-Host "Destino:        $targetPath"
Write-Host "---------------------------------------------"

$hasLocalPgDump = (Get-Command pg_dump -ErrorAction SilentlyContinue) -ne $null
$useDocker = $false

if ($hasLocalPgDump) {
    Write-Host "[INFO] Herramienta nativa pg_dump detectada en PATH." -ForegroundColor Green
} else {
    Write-Host "[INFO] pg_dump no encontrado en PATH. Verificando Docker..." -ForegroundColor Yellow
    $dockerContainers = docker ps --format "{{.Names}}" 2>$null
    if ($dockerContainers -contains $dockerTarget) {
        $useDocker = $true
        Write-Host "[INFO] Contenedor Docker '$dockerTarget' detectado y activo." -ForegroundColor Green
    } else {
        $fallbackPg = docker ps --filter "ancestor=postgres" --format "{{.Names}}" 2>$null | Select-Object -First 1
        if ($fallbackPg) {
            $useDocker = $true
            $dockerTarget = $fallbackPg
            Write-Host "[INFO] Contenedor Docker Postgres '$dockerTarget' detectado." -ForegroundColor Green
        } else {
            Write-Error "No se encontró pg_dump en el PATH ni un contenedor Docker de Postgres activo."
            exit 1
        }
    }
}

$extraFlags = @()
if ($Format -eq "custom") { $extraFlags += @("-F", "c") } else { $extraFlags += @("-F", "p") }
if ($Clean) { $extraFlags += @("--clean", "--if-exists") }
if ($SchemaOnly) { $extraFlags += "--schema-only" }
if ($DataOnly) { $extraFlags += "--data-only" }

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

try {
    if ($useDocker) {
        # Ejecución vía Docker
        $cmdArgs = @("exec", "-i", "-e", "PGPASSWORD=$dbPass", $dockerTarget, "pg_dump", "-U", $dbUser, "-d", $dbTarget) + $extraFlags
        & docker @cmdArgs > $targetPath
        if ($LASTEXITCODE -ne 0) {
            throw "Error ejecutando docker pg_dump (código: $LASTEXITCODE)"
        }
    } else {
        # Ejecución local nativa
        $env:PGPASSWORD = $dbPass
        $cmdArgs = @("-h", $dbHost, "-p", $dbPort, "-U", $dbUser, "-d", $dbTarget, "-f", $targetPath) + $extraFlags
        & pg_dump @cmdArgs
        if ($LASTEXITCODE -ne 0) {
            throw "Error ejecutando pg_dump nativo (código: $LASTEXITCODE)"
        }
    }
    $stopwatch.Stop()
    $fileItem = Get-Item $targetPath
    $fileSizeKb = [math]::Round($fileItem.Length / 1KB, 2)

    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "       BACKUP COMPLETADO CON EXITO           " -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "Archivo:        $fileName"
    Write-Host "Tamano:         $fileSizeKb KB"
    Write-Host "Duracion:       $($stopwatch.Elapsed.TotalSeconds.ToString('F2')) s"
    Write-Host "Ubicacion:      $targetPath"
    Write-Host "=============================================" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    if (Test-Path $targetPath) { Remove-Item $targetPath -Force }
    exit 1
}
