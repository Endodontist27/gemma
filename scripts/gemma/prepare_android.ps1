$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
python (Join-Path $repoRoot "scripts\gemma\prepare_android.py")
if ($LASTEXITCODE -ne 0) {
  throw "Android model preparation did not complete."
}
