$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
$envPath = Join-Path (Split-Path -Parent $PSScriptRoot) '.env.telegram.local'
$envText = [System.IO.File]::ReadAllText($envPath)
$tokenMatch = [regex]::Match($envText, '(?m)^\s*TELEGRAM_BOT_TOKEN\s*=\s*(.*?)\s*$')
if (-not $tokenMatch.Success) { throw 'Telegram token is not configured.' }
$token = $tokenMatch.Groups[1].Value.Trim().Trim('"', "'")

if ($request.method -eq 'downloadFile') {
  $filePath = [string]$request.parameters.filePath
  if ($filePath -notmatch '^[A-Za-z0-9_./-]+$' -or $filePath.Contains('..')) {
    throw 'Telegram returned an invalid attachment path.'
  }
  $attachmentRoot = [System.IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $PSScriptRoot) '.local-data\attachments'))
  $destination = [System.IO.Path]::GetFullPath([string]$request.parameters.destination)
  if (-not $destination.StartsWith($attachmentRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Attachment destination is outside the private attachment folder.'
  }
  [System.IO.Directory]::CreateDirectory($attachmentRoot) | Out-Null
  $response = Invoke-WebRequest -UseBasicParsing -Uri ("https://api.telegram.org/file/bot{0}/{1}" -f $token, $filePath) -Method Get -TimeoutSec 35 -OutFile $destination
  $savedBytes = if (Test-Path -LiteralPath $destination) { (Get-Item -LiteralPath $destination).Length } else { 0 }
  $body = [ordered]@{ savedBytes = $savedBytes }
} else {
  $allowedMethods = @('getFile', 'getMe', 'getUpdates', 'getChat', 'getChatMember', 'sendMessage', 'answerCallbackQuery', 'setMyCommands')
  if ($request.method -notin $allowedMethods) { throw 'Telegram API method is not allowed by the local receiver.' }
  $jsonBody = $request.parameters | ConvertTo-Json -Depth 30 -Compress
  $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)
  $response = Invoke-WebRequest -UseBasicParsing -Uri ("https://api.telegram.org/bot{0}/{1}" -f $token, $request.method) -Method Post -ContentType 'application/json; charset=utf-8' -Body $jsonBytes -TimeoutSec 35
  try { $body = $response.Content | ConvertFrom-Json } catch { $body = [ordered]@{ ok = $false; description = 'Telegram returned an unreadable response.' } }
}

[ordered]@{ statusCode = [int]$response.StatusCode; body = $body } | ConvertTo-Json -Depth 30 -Compress
