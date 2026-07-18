param(
  [switch]$SkipTests
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "mysql-common.ps1")

$root = Split-Path $PSScriptRoot -Parent
$databaseUrl = Get-WakaziDatabaseUrl
$null = Get-WakaziDatabaseConfig -DatabaseUrl $databaseUrl
$values = Get-WakaziEnvValues
$nodeEnv = if ($env:NODE_ENV) { $env:NODE_ENV } elseif ($values.ContainsKey("NODE_ENV")) { $values["NODE_ENV"] } else { "development" }
$jwtSecret = if ($env:JWT_SECRET) { $env:JWT_SECRET } elseif ($values.ContainsKey("JWT_SECRET")) { $values["JWT_SECRET"] } else { "" }

if (-not $jwtSecret) { throw "JWT_SECRET est obligatoire." }
if ($nodeEnv -eq "production" -and $jwtSecret.Length -lt 32) { throw "JWT_SECRET doit contenir au moins 32 caracteres en production." }
if ($jwtSecret -match '^(change_me|replace_me)') { throw "JWT_SECRET utilise une valeur d'exemple interdite." }

Push-Location $root
try {
  Invoke-WakaziExternalCommand -Command "node.exe" -Arguments @("--version") -FailureMessage "Node.js est indisponible"
  Invoke-WakaziExternalCommand -Command "npx.cmd" -Arguments @("prisma", "validate", "--schema", "prisma/schema.prisma") -FailureMessage "Le schema Prisma est invalide"
  Invoke-WakaziExternalCommand -Command "npx.cmd" -Arguments @("prisma", "migrate", "status", "--schema", "prisma/schema.prisma") -FailureMessage "Les migrations ne sont pas a jour"
  if (-not $SkipTests) {
    Invoke-WakaziExternalCommand -Command "npm.cmd" -Arguments @("run", "check") -FailureMessage "Les controles backend ont echoue"
  }
  Invoke-WakaziExternalCommand -Command "npm.cmd" -Arguments @("audit", "--omit=dev", "--audit-level=high") -FailureMessage "Une vulnerabilite de production importante est detectee"
} finally {
  Pop-Location
}

Write-Output "Preflight backend valide pour l'environnement: $nodeEnv"
