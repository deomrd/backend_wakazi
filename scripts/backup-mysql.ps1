param(
  [string]$OutputDirectory = (Join-Path (Split-Path $PSScriptRoot -Parent) "backups"),
  [ValidateRange(1, 3650)][int]$RetentionDays = 30
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "mysql-common.ps1")

$config = Get-WakaziDatabaseConfig -DatabaseUrl (Get-WakaziDatabaseUrl)
$dump = Find-WakaziMySqlTool -Name mysqldump
$resolvedOutput = [IO.Path]::GetFullPath($OutputDirectory)
[IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $resolvedOutput "$($config.Database)-$timestamp.sql"
$hashPath = "$backupPath.sha256"
$arguments = (Get-WakaziMySqlConnectionArguments -Config $config) + @(
  "--single-transaction",
  "--quick",
  "--routines",
  "--triggers",
  "--events",
  "--hex-blob",
  $config.Database
)

$previousPassword = $env:MYSQL_PWD
try {
  $env:MYSQL_PWD = $config.Password
  $process = Start-Process -FilePath $dump -ArgumentList $arguments -NoNewWindow -Wait -PassThru -RedirectStandardOutput $backupPath
  if ($process.ExitCode -ne 0) { throw "mysqldump a echoue (code $($process.ExitCode))." }
} finally {
  $env:MYSQL_PWD = $previousPassword
}

if (-not (Test-Path -LiteralPath $backupPath -PathType Leaf) -or (Get-Item -LiteralPath $backupPath).Length -lt 100) {
  throw "La sauvegarde produite est vide ou incomplete."
}
$contentCheck = Select-String -LiteralPath $backupPath -Pattern "CREATE TABLE" -SimpleMatch -Quiet
if (-not $contentCheck) { throw "La sauvegarde ne contient aucune structure de table." }

$hash = (Get-FileHash -LiteralPath $backupPath -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath $hashPath -Value "$hash  $([IO.Path]::GetFileName($backupPath))" -Encoding ascii

$limit = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -LiteralPath $resolvedOutput -Filter "$($config.Database)-*.sql" -File |
  Where-Object { $_.LastWriteTime -lt $limit } |
  ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Force
    $oldHash = "$($_.FullName).sha256"
    if (Test-Path -LiteralPath $oldHash -PathType Leaf) { Remove-Item -LiteralPath $oldHash -Force }
  }

Write-Output "Sauvegarde valide: $backupPath"
Write-Output "SHA256: $hash"
