$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeHome = Join-Path $projectRoot '.tools\node'
$npmPath = Join-Path $nodeHome 'npm.cmd'

if (Test-Path -LiteralPath (Join-Path $nodeHome 'node.exe')) {
  $env:PATH = "$nodeHome;$env:PATH"
}

if (-not (Test-Path -LiteralPath $npmPath)) {
  if (Get-Command npm -ErrorAction SilentlyContinue) {
    $npmPath = (Get-Command npm).Source
  } else {
    throw 'Node.js runtime was not found. Restore the .tools\node folder or install Node.js LTS.'
  }
}

Set-Location $projectRoot
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules\vite'))) {
  & $npmPath install
  if ($LASTEXITCODE -ne 0) { throw 'Installing the project packages failed.' }
}

& $npmPath run dev -- --host 127.0.0.1 --port 5174
if ($LASTEXITCODE -ne 0) { throw 'The local website could not be started.' }
