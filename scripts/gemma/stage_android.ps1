$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
python (Join-Path $repoRoot "scripts\gemma\stage_android.py")
if ($LASTEXITCODE -ne 0) {
  throw "Android model staging failed."
}
