param(
  [string]$TestDatabase
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "mysql-common.ps1")

$root = Split-Path $PSScriptRoot -Parent
$sourceUrl = Get-WakaziDatabaseUrl
$config = Get-WakaziDatabaseConfig -DatabaseUrl $sourceUrl
if (-not $TestDatabase) { $TestDatabase = "$($config.Database)_e2e" }
if ($TestDatabase -notmatch '^[A-Za-z0-9_]+_e2e$') {
  throw "Par securite, la base de test doit se terminer par _e2e."
}

$mysql = Find-WakaziMySqlTool -Name mysql
$arguments = Get-WakaziMySqlConnectionArguments -Config $config
$previousPassword = $env:MYSQL_PWD
$previousDatabaseUrl = $env:DATABASE_URL
$previousNodeEnv = $env:NODE_ENV
$previousE2e = $env:RUN_MYSQL_E2E

try {
  $env:MYSQL_PWD = $config.Password
  Invoke-WakaziExternalCommand -Command $mysql -Arguments ($arguments + @("--execute=DROP DATABASE IF EXISTS ``$TestDatabase``; CREATE DATABASE ``$TestDatabase`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")) -FailureMessage "Impossible de preparer la base E2E"

  $env:DATABASE_URL = Get-WakaziDatabaseUrlForName -DatabaseUrl $sourceUrl -DatabaseName $TestDatabase
  $env:NODE_ENV = "test"
  $env:RUN_MYSQL_E2E = "1"

  Push-Location $root
  try {
    Invoke-WakaziExternalCommand -Command "npx.cmd" -Arguments @("prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma") -FailureMessage "Les migrations E2E ont echoue"
    Invoke-WakaziExternalCommand -Command "npx.cmd" -Arguments @("prisma", "db", "seed") -FailureMessage "Le seed E2E a echoue"
    Invoke-WakaziExternalCommand -Command "npm.cmd" -Arguments @("run", "build") -FailureMessage "Le build E2E a echoue"
    Invoke-WakaziExternalCommand -Command "node.exe" -Arguments @("--test", "tests/mysql-e2e.test.js") -FailureMessage "Le parcours E2E MySQL a echoue"
  } finally {
    Pop-Location
  }
} finally {
  $env:MYSQL_PWD = $previousPassword
  $env:DATABASE_URL = $previousDatabaseUrl
  $env:NODE_ENV = $previousNodeEnv
  $env:RUN_MYSQL_E2E = $previousE2e
}
