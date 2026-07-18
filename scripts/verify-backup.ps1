param(
  [string]$BackupPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path $PSScriptRoot -Parent
if (-not $BackupPath) {
  $latest = Get-ChildItem -LiteralPath (Join-Path $root "backups") -Filter "*.sql" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if (-not $latest) { throw "Aucune sauvegarde SQL trouvee dans backups/." }
  $BackupPath = $latest.FullName
}

$resolved = [IO.Path]::GetFullPath($BackupPath)
if (-not (Test-Path -LiteralPath $resolved -PathType Leaf)) { throw "Sauvegarde introuvable: $resolved" }
if ((Get-Item -LiteralPath $resolved).Length -lt 100) { throw "La sauvegarde est vide ou incomplete." }
if (-not (Select-String -LiteralPath $resolved -Pattern "CREATE TABLE" -SimpleMatch -Quiet)) {
  throw "La sauvegarde ne contient aucune structure de table."
}

$hashPath = "$resolved.sha256"
if (-not (Test-Path -LiteralPath $hashPath -PathType Leaf)) { throw "Le fichier SHA256 associe est absent." }
$expected = ((Get-Content -LiteralPath $hashPath -Raw).Trim() -split '\s+')[0].ToLowerInvariant()
$actual = (Get-FileHash -LiteralPath $resolved -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) { throw "Echec d'integrite SHA256: la sauvegarde a ete modifiee ou corrompue." }

Write-Output "Sauvegarde verifiee: $resolved"
Write-Output "SHA256: $actual"
