param(
  [Parameter(Mandatory = $true)][string]$TargetDatabase
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "mysql-common.ps1")

if ($TargetDatabase -notmatch '^[A-Za-z0-9_]+$') { throw "Nom de base cible invalide." }
$config = Get-WakaziDatabaseConfig -DatabaseUrl (Get-WakaziDatabaseUrl)
$mysql = Find-WakaziMySqlTool -Name mysql
$arguments = (Get-WakaziMySqlConnectionArguments -Config $config) + @(
  "--database=$TargetDatabase",
  "--batch",
  "--skip-column-names",
  "--execute=SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE(); SELECT COUNT(*) FROM Role;"
)
$previousPassword = $env:MYSQL_PWD

try {
  $env:MYSQL_PWD = $config.Password
  $result = @(& $mysql @arguments)
  if ($LASTEXITCODE -ne 0) { throw "La verification de la base restauree a echoue (code $LASTEXITCODE)." }
} finally {
  $env:MYSQL_PWD = $previousPassword
}

if ($result.Count -lt 2) { throw "La verification n'a pas retourne les compteurs attendus." }
$tableCount = [int]$result[0]
$roleCount = [int]$result[1]
if ($tableCount -lt 1) { throw "La base restauree ne contient aucune table." }
if ($roleCount -lt 3) { throw "Les roles obligatoires ne sont pas presents dans la restauration." }

Write-Output "Restauration verifiee: $TargetDatabase ($tableCount tables, $roleCount roles)."
