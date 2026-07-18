Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-WakaziEnvValues {
  param([string]$EnvPath = (Join-Path (Split-Path $PSScriptRoot -Parent) ".env"))

  $values = @{}
  if (-not (Test-Path -LiteralPath $EnvPath -PathType Leaf)) {
    return $values
  }

  foreach ($line in Get-Content -LiteralPath $EnvPath) {
    if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') { continue }
    $value = $Matches[2].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $values[$Matches[1]] = $value
  }

  return $values
}

function Get-WakaziDatabaseUrl {
  param([string]$EnvPath = (Join-Path (Split-Path $PSScriptRoot -Parent) ".env"))

  if ($env:DATABASE_URL) { return $env:DATABASE_URL }
  $values = Get-WakaziEnvValues -EnvPath $EnvPath
  if (-not $values.ContainsKey("DATABASE_URL") -or -not $values["DATABASE_URL"]) {
    throw "DATABASE_URL est absente de l'environnement et du fichier .env."
  }
  return [string]$values["DATABASE_URL"]
}

function Get-WakaziDatabaseConfig {
  param([Parameter(Mandatory = $true)][string]$DatabaseUrl)

  $uri = [Uri]$DatabaseUrl
  if ($uri.Scheme -notin @("mysql", "mariadb")) {
    throw "DATABASE_URL doit utiliser MySQL ou MariaDB."
  }

  $userParts = $uri.UserInfo.Split(':', 2)
  if ($userParts.Count -lt 1 -or -not $userParts[0]) {
    throw "L'utilisateur MySQL est absent de DATABASE_URL."
  }

  $database = $uri.AbsolutePath.Trim('/')
  if (-not $database -or $database -notmatch '^[A-Za-z0-9_]+$') {
    throw "Le nom de base MySQL est absent ou invalide."
  }

  return [pscustomobject]@{
    Url = $DatabaseUrl
    Host = $uri.Host
    Port = if ($uri.IsDefaultPort) { 3306 } else { $uri.Port }
    User = [Uri]::UnescapeDataString($userParts[0])
    Password = if ($userParts.Count -eq 2) { [Uri]::UnescapeDataString($userParts[1]) } else { "" }
    Database = $database
  }
}

function Get-WakaziDatabaseUrlForName {
  param(
    [Parameter(Mandatory = $true)][string]$DatabaseUrl,
    [Parameter(Mandatory = $true)][string]$DatabaseName
  )

  if ($DatabaseName -notmatch '^[A-Za-z0-9_]+$') { throw "Nom de base MySQL invalide." }
  $builder = [UriBuilder]$DatabaseUrl
  $builder.Path = "/$DatabaseName"
  return $builder.Uri.AbsoluteUri
}

function Find-WakaziMySqlTool {
  param([Parameter(Mandatory = $true)][ValidateSet("mysql", "mysqldump")][string]$Name)

  $command = Get-Command "$Name.exe" -ErrorAction SilentlyContinue
  if (-not $command) { $command = Get-Command $Name -ErrorAction SilentlyContinue }
  if ($command) { return $command.Source }

  $candidates = @(
    "C:\xampp\mysql\bin\$Name.exe",
    "C:\Program Files\MySQL\MySQL Server 8.4\bin\$Name.exe",
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\$Name.exe",
    "C:\Program Files\MariaDB 11.4\bin\$Name.exe"
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
  }

  throw "$Name est introuvable. Installez le client MySQL ou ajoutez son dossier au PATH."
}

function Get-WakaziMySqlConnectionArguments {
  param([Parameter(Mandatory = $true)]$Config)

  return @(
    "--protocol=TCP",
    "--host=$($Config.Host)",
    "--port=$($Config.Port)",
    "--user=$($Config.User)",
    "--default-character-set=utf8mb4"
  )
}

function Invoke-WakaziExternalCommand {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [string]$FailureMessage = "La commande a echoue."
  )

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$FailureMessage (code $LASTEXITCODE)." }
}
