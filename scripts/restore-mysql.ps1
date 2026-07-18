param(
  [Parameter(Mandatory = $true)][string]$BackupPath,
  [Parameter(Mandatory = $true)][string]$TargetDatabase,
  [Parameter(Mandatory = $true)][string]$ConfirmDatabaseName,
  [switch]$RecreateDatabase
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "mysql-common.ps1")

if ($TargetDatabase -notmatch '^[A-Za-z0-9_]+$') { throw "Nom de base cible invalide." }
if ($ConfirmDatabaseName -cne $TargetDatabase) { throw "Confirmation refusee: ConfirmDatabaseName doit correspondre exactement a TargetDatabase." }

$verifyScript = Join-Path $PSScriptRoot "verify-backup.ps1"
& $verifyScript -BackupPath $BackupPath

$resolvedBackup = [IO.Path]::GetFullPath($BackupPath)
$config = Get-WakaziDatabaseConfig -DatabaseUrl (Get-WakaziDatabaseUrl)
$mysql = Find-WakaziMySqlTool -Name mysql
$arguments = Get-WakaziMySqlConnectionArguments -Config $config
$previousPassword = $env:MYSQL_PWD

try {
  $env:MYSQL_PWD = $config.Password
  if ($RecreateDatabase) {
    Invoke-WakaziExternalCommand -Command $mysql -Arguments ($arguments + @("--execute=DROP DATABASE IF EXISTS ``$TargetDatabase``; CREATE DATABASE ``$TargetDatabase`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")) -FailureMessage "Impossible de recreer la base cible"
  }

  $process = Start-Process -FilePath $mysql -ArgumentList ($arguments + @($TargetDatabase)) -NoNewWindow -Wait -PassThru -RedirectStandardInput $resolvedBackup
  if ($process.ExitCode -ne 0) { throw "La restauration MySQL a echoue (code $($process.ExitCode))." }
} finally {
  $env:MYSQL_PWD = $previousPassword
}

Write-Output "Restauration terminee dans la base: $TargetDatabase"
