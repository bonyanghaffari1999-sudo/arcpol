$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$siteUrl = 'http://127.0.0.1:5174/'
$viteEntry = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'

function Get-RunningArcpolSite {
  try {
    $response = Invoke-WebRequest -Uri $siteUrl -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200 -and $response.Content -match '(?i)<html[^>]+dir="rtl"') {
      return $true
    }
  } catch { }
  return $false
}

if (Get-RunningArcpolSite) {
  Write-Host "سایت از قبل روشن است: $siteUrl#/building"
  return
}

$portOwner = Get-NetTCPConnection -State Listen -LocalPort 5174 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($portOwner) {
  throw "پورت ۵۱۷۴ دست برنامهٔ دیگری است (PID $($portOwner.OwningProcess)). آن برنامه را ببندید و دوباره start.ps1 را اجرا کنید."
}

$bundledNode = Join-Path $projectRoot '.tools\node\node.exe'
if (Test-Path -LiteralPath $bundledNode) {
  $nodePath = $bundledNode
  $env:Path = "$(Split-Path -Parent $bundledNode);$env:Path"
} else {
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if (-not $nodeCommand) { throw 'Node.js پیدا نشد. .tools\node را برگردانید یا Node.js را نصب کنید.' }
  $nodePath = $nodeCommand.Source
}

if (-not (Test-Path -LiteralPath $viteEntry)) {
  $npmPath = Join-Path (Split-Path -Parent $nodePath) 'npm.cmd'
  if (-not (Test-Path -LiteralPath $npmPath)) {
    $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $npmCommand) { throw 'بسته‌های سایت نصب نیستند و npm نیز پیدا نشد.' }
    $npmPath = $npmCommand.Source
  }
  Write-Host 'برای اجرای نخست، بسته‌های سایت نصب می‌شوند…'
  & $npmPath install
  if ($LASTEXITCODE -ne 0) { throw 'نصب بسته‌های سایت ناموفق بود.' }
  if (-not (Test-Path -LiteralPath $viteEntry)) { throw 'پس از نصب، Vite پیدا نشد.' }
}

$stdoutPath = Join-Path $projectRoot '.local-server.log'
$stderrPath = Join-Path $projectRoot '.local-server-error.log'
$serverProcess = Start-Process -FilePath $nodePath `
  -ArgumentList @($viteEntry, '--host', '127.0.0.1', '--port', '5174', '--strictPort') `
  -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath

for ($attempt = 0; $attempt -lt 40; $attempt++) {
  if (Get-RunningArcpolSite) {
    $pidPath = Join-Path $projectRoot '.local-server.pid'
    Set-Content -LiteralPath $pidPath -Value $serverProcess.Id -Encoding ascii
    Write-Host "سایت روشن شد و با بستن پنجرهٔ ترمینال خاموش نمی‌شود: $siteUrl#/building"
    return
  }
  $serverProcess.Refresh()
  if ($serverProcess.HasExited) {
    $details = (Get-Content -LiteralPath $stderrPath -Tail 12 -ErrorAction SilentlyContinue) -join "`n"
    throw "سرور اجرا نشد. گزارش خطا: $stderrPath`n$details"
  }
  Start-Sleep -Milliseconds 250
}

$details = (Get-Content -LiteralPath $stderrPath -Tail 12 -ErrorAction SilentlyContinue) -join "`n"
throw "سایت در زمان مقرر پاسخ نداد. گزارش خطا: $stderrPath`n$details"
