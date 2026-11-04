$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$nodeExecutable = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$privateDirectory = Join-Path $projectDirectory '.local-data'
New-Item -ItemType Directory -Path $privateDirectory -Force | Out-Null
$mutex = New-Object System.Threading.Mutex($false, 'Local\ArcpolTelegramReceiver')
if (-not $mutex.WaitOne(0)) { exit 0 }
try {
  Set-Location -LiteralPath $projectDirectory
  while ($true) {
    try {
      $ErrorActionPreference = 'Continue'
      & $nodeExecutable (Join-Path $PSScriptRoot 'telegram-group-bot.mjs') *>> (Join-Path $privateDirectory 'telegram-receiver.log')
      $ErrorActionPreference = 'Stop'
    } catch {
      ('Receiver stopped at ' + (Get-Date).ToString('o') + '; retrying.') | Add-Content (Join-Path $privateDirectory 'telegram-receiver.log')
    }
    Start-Sleep -Seconds 15
  }
} finally { $mutex.ReleaseMutex(); $mutex.Dispose() }
